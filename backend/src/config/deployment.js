import "./env.js";
import {
  getAllowedOrigins,
  getPublicAppUrl,
} from "../../../deployment.config.js";

export const clientOrigins = getAllowedOrigins(process.env.CLIENT_ORIGIN);
export const publicAppUrl = getPublicAppUrl({
  production:
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
  override: process.env.PUBLIC_APP_URL,
});
