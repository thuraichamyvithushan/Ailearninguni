import "./env.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const backendRoot = fileURLToPath(new URL("../../", import.meta.url));
export const uploadsDirectory = resolve(
  backendRoot,
  process.env.UPLOADS_DIR || "uploads",
);
