import { createApiClient } from "./apiClient";
import { firebaseAuth, authMode } from "./firebase";
import { getFrontendApiUrl } from "../../../deployment.config.js";
export const api = createApiClient({
  baseURL: getFrontendApiUrl({
    production: import.meta.env.PROD,
    override: import.meta.env.VITE_API_URL,
  }),
});
api.interceptors.request.use(async (config) => {
  const token =
    authMode === "firebase"
      ? await firebaseAuth?.currentUser?.getIdToken()
      : sessionStorage.getItem("atlas-demo-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.message =
      error.response?.data?.error ||
      (error.code === "ERR_NETWORK" ||
      [502, 503, 504].includes(error.response?.status) ||
      (error.response?.status === 500 && !error.response?.data)
        ? "The learning service is unavailable. Please try again."
        : error.message);
    if (error.response?.status === 401)
      window.dispatchEvent(new Event("atlas-session-expired"));
    return Promise.reject(error);
  },
);
export async function download(url, filename) {
  const { data } = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
