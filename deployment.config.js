// Public URLs only. Firebase credentials belong in environment variables.
export const deploymentConfig = {
  local: {
    frontendUrl: "http://localhost:5173",
    backendUrl: "http://localhost:4000",
    previewUrl: "http://localhost:4173",
  },
  vercel: {
    frontendUrl: "https://ailearninguni.vercel.app",
    backendUrl: "https://ailearninguni-api.vercel.app",
  },
};

export function getFrontendApiUrl({ production = false, override = "" } = {}) {
  const configured = override.trim().replace(/\/+$/, "");
  // /api is the local proxy shorthand; production uses the separate backend.
  if (!configured || configured === "/api") {
    return production ? `${deploymentConfig.vercel.backendUrl}/api` : "/api";
  }
  // Accept a backend domain with or without the API path.
  if (/^https?:\/\//.test(configured) && new URL(configured).pathname === "/") {
    return `${configured}/api`;
  }
  return configured;
}

export function getAllowedOrigins(additionalOrigins = "") {
  return [
    ...new Set([
      deploymentConfig.local.frontendUrl,
      deploymentConfig.local.previewUrl,
      "http://127.0.0.1:5173",
      "http://127.0.0.1:4173",
      deploymentConfig.vercel.frontendUrl,
      ...additionalOrigins
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ]),
  ];
}

export function getPublicAppUrl({ production = false, override = "" } = {}) {
  return (
    override.trim().replace(/\/+$/, "") ||
    (production
      ? deploymentConfig.vercel.frontendUrl
      : deploymentConfig.local.frontendUrl)
  );
}
