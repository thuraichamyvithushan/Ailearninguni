import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { firebaseAuth, mode } from "../config/firebase.js";
import { store } from "../services/store.js";
import { assert, asyncRoute } from "../utils/errors.js";
export const demoSecret =
  process.env.DEMO_JWT_SECRET || randomBytes(48).toString("hex");
export const authenticate = asyncRoute(async (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  assert(token, 401, "Please sign in to continue.");
  let claims;
  try {
    claims =
      mode === "firebase"
        ? await firebaseAuth.verifyIdToken(token, true)
        : jwt.verify(token, demoSecret, {
            algorithms: ["HS256"],
            issuer: "ai-atlas-local",
            audience: "ai-atlas",
          });
  } catch {
    assert(false, 401, "Your session has expired. Please sign in again.");
  }
  const uid = claims.uid || claims.sub;
  const profile = await store.get("users", uid);
  assert(
    !profile || profile.status !== "suspended",
    403,
    "This account is suspended. Contact support.",
  );
  // Only trusted Firebase custom claims (or a signed local token) determine access.
  req.user = {
    uid,
    email: claims.email,
    role: claims.role || "student",
    name: claims.name || claims.email?.split("@")[0] || "Learner",
  };
  if (mode === "demo" && profile)
    assert(
      profile.role === req.user.role,
      401,
      "Your role changed. Please sign in again.",
    );
  req.profile = profile;
  req.claims = claims;
  next();
});
export const roles =
  (...allowed) =>
  (req, _res, next) => {
    try {
      assert(
        allowed.includes(req.user.role),
        403,
        "You do not have permission for this action.",
      );
      next();
    } catch (e) {
      next(e);
    }
  };
export const studentOnly = roles("student");
export const adminOnly = roles("admin", "superadmin");
