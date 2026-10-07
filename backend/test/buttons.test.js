import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transform } from "esbuild";

test("a submit button stays disabled throughout saving even when form validation allows submission", async () => {
  const source = await readFile(
    new URL("../../frontend/src/components/ui/index.jsx", import.meta.url),
    "utf8",
  );
  const compiled = await transform(source, {
    loader: "jsx",
    jsx: "automatic",
    format: "esm",
  });
  const code = compiled.code.replace(
    /from "([^"]+)"/g,
    (_match, specifier) => `from "${import.meta.resolve(specifier)}"`,
  );
  const { Button } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
  const saving = renderToStaticMarkup(
    createElement(
      Button,
      { type: "submit", busy: true, disabled: false },
      "Save",
    ),
  );
  assert.match(saving, /disabled=""/);
  const ready = renderToStaticMarkup(
    createElement(
      Button,
      { type: "submit", busy: false, disabled: false },
      "Save",
    ),
  );
  assert.doesNotMatch(ready, /disabled=/);
});
