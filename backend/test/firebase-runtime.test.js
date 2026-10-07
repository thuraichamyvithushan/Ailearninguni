import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Firebase loads and JWKS verification works without require(ESM) support", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-experimental-require-module",
      "--input-type=commonjs",
      "-e",
      `
        const assert = require("node:assert/strict");
        const { generateKeyPairSync } = require("node:crypto");
        const { getAuth } = require("firebase-admin/auth");
        const jwksRsa = require("jwks-rsa");
        const jwt = require("jsonwebtoken");
        assert.equal(typeof getAuth, "function");

        (async () => {
          const { privateKey, publicKey } = generateKeyPairSync("rsa", {
            modulusLength: 2048,
          });
          const jwk = {
            ...publicKey.export({ format: "jwk" }),
            kid: "runtime-test-key",
            use: "sig",
            alg: "RS256",
          };
          const client = jwksRsa({
            jwksUri: "https://runtime-test.invalid/jwks",
            fetcher: async () => ({ keys: [jwk] }),
          });
          const key = await client.getSigningKey(jwk.kid);
          const token = jwt.sign({ sub: "test-user" }, privateKey, {
            algorithm: "RS256",
            keyid: jwk.kid,
          });
          assert.equal(
            jwt.verify(token, key.getPublicKey(), { algorithms: ["RS256"] }).sub,
            "test-user",
          );
          const [, payload, signature] = token.split(".");
          const header = token.split(".")[0];
          const forgedPayload = Buffer.from(JSON.stringify({
            ...JSON.parse(Buffer.from(payload, "base64url")),
            sub: "forged-user",
          })).toString("base64url");
          assert.throws(
            () => jwt.verify(header + "." + forgedPayload + "." + signature,
              key.getPublicKey(), { algorithms: ["RS256"] }),
            /invalid signature/,
          );
        })().catch((error) => {
          console.error(error);
          process.exitCode = 1;
        });
      `,
    ],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
      timeout: 15000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
