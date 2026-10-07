import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getAllowedOrigins,
  getFrontendApiUrl,
  getPublicAppUrl,
} from "../../deployment.config.js";

test("local proxy settings do not send production requests to the frontend", () => {
  assert.equal(getFrontendApiUrl({ override: "/api" }), "/api");
  assert.equal(
    getFrontendApiUrl({ production: true, override: "/api" }),
    "https://ailearninguni-api.vercel.app/api",
  );
  assert.equal(
    getFrontendApiUrl({ override: " https://custom-api.example/ " }),
    "https://custom-api.example/api",
  );
  assert.equal(
    getFrontendApiUrl({ override: "https://custom-api.example/api/" }),
    "https://custom-api.example/api",
  );
});

test("custom origins extend local and Vercel access without duplicates", () => {
  const origins = getAllowedOrigins(
    " https://custom.example/, https://ailearninguni.vercel.app ",
  );
  assert.ok(origins.includes("http://localhost:5173"));
  assert.ok(origins.includes("https://ailearninguni.vercel.app"));
  assert.ok(origins.includes("https://custom.example"));
  assert.equal(origins.length, new Set(origins).size);
  assert.ok(!origins.includes("*"));
});

test("certificate links use the current frontend and normalize URL overrides", () => {
  assert.equal(getPublicAppUrl(), "http://localhost:5173");
  assert.equal(
    getPublicAppUrl({ production: true }),
    "https://ailearninguni.vercel.app",
  );
  assert.equal(
    getPublicAppUrl({
      production: true,
      override: " https://custom.example/ ",
    }),
    "https://custom.example",
  );
});
