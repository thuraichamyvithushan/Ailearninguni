import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes/api.js";
import { clientOrigins } from "./config/deployment.js";
export const app = express();
// Vercel forwards requests through its HTTPS proxy.
if (process.env.VERCEL === "1") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: clientOrigins,
  }),
);
app.use(express.json({ limit: "512kb" }));
app.get("/", (_req, res) =>
  res.json({
    service: "Ai Learning Uni API",
    status: "ok",
    health: "/api/health",
  }),
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 250,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a moment." },
  }),
  router,
);
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));
app.use((error, _req, res, _next) => {
  const status = error.status || (error.code === "LIMIT_FILE_SIZE" ? 400 : 500);
  if (status === 500) console.error(error);
  res.status(status).json({
    error:
      status === 500
        ? "Something went wrong. Please try again."
        : error.message,
  });
});
// Vercel's Express preset detects this entry point; local server.js reuses it.
export default app;
