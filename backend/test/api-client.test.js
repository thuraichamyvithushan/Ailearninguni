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
    if (req.url.startsWith("/api/")) {
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ url: req.url }));
    }
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

test("separately hosted API keeps upload and certificate URLs on the backend", async () => {
  for (const suffix of ["/api", "/api/"]) {
    const remote = createApiClient({
      baseURL: client.defaults.baseURL + suffix,
      proxy: false,
    });
    assert.equal((await remote.get("/courses")).data.url, "/api/courses");
    assert.equal(
      (await remote.get("/api/uploads/resource?download=1")).data.url,
      "/api/uploads/resource?download=1",
    );
    assert.equal(
      (await remote.get("/certificates/example/pdf")).data.url,
      "/api/certificates/example/pdf",
    );
  }
});
