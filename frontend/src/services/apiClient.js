import axios from "axios";

export function createApiClient({ retryDelayMs = 750, ...options } = {}) {
  const client = axios.create({ timeout: 30000, ...options });
  client.interceptors.request.use((config) => {
    // Stored upload links include /api; baseURL already supplies that prefix.
    if (
      /\/api\/?$/.test(config.baseURL || "") &&
      /^\/api(?:\/|$)/.test(config.url || "")
    ) {
      config.url = config.url.slice(4) || "/";
    }
    return config;
  });
  client.interceptors.response.use(undefined, async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const data = error.response?.data;
    // Vite returns an empty 500 when its connection to the API is interrupted.
    const unavailable =
      [502, 503, 504].includes(status) ||
      (status === 500 && (data === "" || data == null));
    if (
      config?.method === "get" &&
      unavailable &&
      !config.signal?.aborted &&
      (config.unavailableRetries || 0) < 2
    ) {
      config.unavailableRetries = (config.unavailableRetries || 0) + 1;
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelayMs * config.unavailableRetries),
      );
      return client.request(config);
    }
    throw error;
  });
  return client;
}
