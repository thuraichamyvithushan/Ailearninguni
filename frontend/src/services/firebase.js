import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
export const authMode =
  import.meta.env.VITE_AUTH_MODE ||
  (import.meta.env.PROD ? "firebase" : "demo");
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const firebaseConfigured = Object.values(config).every(Boolean);
export const firebaseAuth =
  authMode === "firebase" && firebaseConfigured
    ? getAuth(initializeApp(config))
    : null;
