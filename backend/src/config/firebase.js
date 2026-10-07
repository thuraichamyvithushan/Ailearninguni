import "./env.js";
import {
  initializeApp,
  applicationDefault,
  cert,
  getApps,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
export const mode =
  process.env.AUTH_MODE ||
  (process.env.NODE_ENV === "production" ? "firebase" : "demo");
if (!["firebase", "demo"].includes(mode))
  throw new Error("AUTH_MODE must be firebase or demo");
if (mode === "demo" && process.env.NODE_ENV === "production")
  throw new Error("Demo authentication is disabled in production");
if (mode === "firebase" && !getApps().length) {
  // Hosted environments can supply credentials without a local JSON file.
  const account = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  let credential;
  if (account) {
    try {
      credential = cert(JSON.parse(account));
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Make sure it's valid JSON.");
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = applicationDefault();
  } else if (process.env.NODE_ENV !== "production") {
    // Fallback for local development if gcloud CLI is configured
    credential = applicationDefault();
  } else {
    throw new Error("Missing Firebase credentials. Please set FIREBASE_SERVICE_ACCOUNT_JSON environment variable in Vercel.");
  }

  initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}
export const firebaseAuth = mode === "firebase" ? getAuth() : null;
export const firestore = mode === "firebase" ? getFirestore() : null;
export const bucket =
  mode === "firebase" && process.env.FIREBASE_STORAGE_BUCKET
    ? getStorage().bucket()
    : null;
