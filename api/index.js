import { app } from "../backend/src/app.js";

// Vercel terminates HTTPS and forwards requests through its proxy.
if (process.env.VERCEL === "1") app.set("trust proxy", 1);

// Reuse Express without starting a persistent server or seeding demo data.
export default app;
