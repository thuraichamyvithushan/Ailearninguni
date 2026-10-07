import { after, before, test } from "node:test";
import { createServer } from "node:http";
import assert from "node:assert/strict";
import { createApiClient } from "../../frontend/src/services/apiClient.js";

let server, client;
const requests = new Map();
before(async () => {
  server = createServer((req, res) => {
    const count = (requests.get(req.url) || 0) + 1;
    requests.set(req.url, count);
    if (req.url === "/recover" && count > 1) {
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify([{ id: "course" }]));
    }
    if (req.url === "/conflict" || req.url === "/api-error") {
      res.statusCode = req.url === "/conflict" ? 409 : 500;
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ error: "Action failed." }));
    }
    res.statusCode = 500;
    res.end();
  });
  server.listen(0, "localhost");
  await new Promise((resolve) => server.once("listening", resolve));
  client = createApiClient({
    baseURL: `http://localhost:${server.address().port}`,
    retryDelayMs: 0,
    proxy: false,
  });
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("catalog reads recover after an empty development proxy error", async () => {
  assert.deepEqual((await client.get("/recover")).data, [{ id: "course" }]);
  assert.equal(requests.get("/recover"), 2);
});
test("unavailable reads stop after two retries", async () => {
  await assert.rejects(client.get("/unavailable"));
  assert.equal(requests.get("/unavailable"), 3);
});
test("course writes, conflicts, and API errors are not retried", async () => {
  await assert.rejects(client.put("/write", { title: "Course" }));
  await assert.rejects(client.get("/conflict"));
  await assert.rejects(client.get("/api-error"));
  assert.equal(requests.get("/write"), 1);
  assert.equal(requests.get("/conflict"), 1);
  assert.equal(requests.get("/api-error"), 1);
});
