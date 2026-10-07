import { app } from "./app.js";
import { mode } from "./config/firebase.js";
import { seed } from "./utils/seed.js";
import { deploymentConfig } from "../../deployment.config.js";
if (mode === "demo") await seed();
const port = Number(
  process.env.PORT || new URL(deploymentConfig.local.backendUrl).port,
);
const production = process.env.NODE_ENV === "production";
const host = production ? "0.0.0.0" : "localhost";
app.listen(port, host, () =>
  console.log(
    `AI Atlas API ready at ${production ? `port ${port}` : `http://localhost:${port}`} (${mode} mode)`,
  ),
);
