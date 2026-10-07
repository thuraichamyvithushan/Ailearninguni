import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { mode, firebaseAuth } from "../config/firebase.js";
import { store } from "../services/store.js";
import { demoSecret } from "../middleware/auth.js";
import { assert } from "../utils/errors.js";
export function publicUser(user) {
  const { passwordHash, ...profile } = user;
  return profile;
}
export async function demoLogin(req, res) {
  assert(mode === "demo", 404, "Use Firebase Authentication to sign in.");
  const user = (await store.list("users")).find(
    (u) => u.email.toLowerCase() === req.body.email.toLowerCase(),
  );
  assert(
    user && (await bcrypt.compare(req.body.password, user.passwordHash || "")),
    401,
    "Email or password is incorrect.",
  );
  assert(user.status !== "suspended", 403, "Your account is suspended.");
  const token = jwt.sign(
    { uid: user.id, email: user.email, name: user.name, role: user.role },
    demoSecret,
    {
      expiresIn: "8h",
      issuer: "ai-atlas-local",
      audience: "ai-atlas",
      algorithm: "HS256",
    },
  );
  res.json({ token, user: publicUser(user) });
}
export async function demoRegister(req, res) {
  assert(mode === "demo", 404, "Use Firebase Authentication to register.");
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const id = randomUUID();
  const user = await store.transaction(async (db) => {
    assert(
      !(await db.list("users")).some(
        (u) => u.email.toLowerCase() === req.body.email.toLowerCase(),
      ),
      409,
      "This email is already registered.",
    );
    const user = {
      id,
      name: req.body.name || "Learner",
      email: req.body.email.toLowerCase(),
      role: "student",
      status: "active",
      onboardingCompleted: false,
      passwordHash,
    };
    await db.put("users", id, user);
    return user;
  });
  const token = jwt.sign(
    { uid: id, email: user.email, name: user.name, role: "student" },
    demoSecret,
    { expiresIn: "8h", issuer: "ai-atlas-local", audience: "ai-atlas" },
  );
  res.status(201).json({ token, user: publicUser(user) });
}
export async function me(req, res) {
  if (mode === "firebase" && !req.claims.role) {
    const record = await firebaseAuth.getUser(req.user.uid);
    if (!record.customClaims?.role)
      await firebaseAuth.setCustomUserClaims(req.user.uid, {
        ...record.customClaims,
        role: "student",
      });
  }
  const profile = await store.transaction(async (db) => {
    const current = await db.get("users", req.user.uid);
    const profile = {
      ...(current || {
        name: req.user.name,
        email: req.user.email,
        onboardingCompleted: false,
        status: "active",
      }),
      role: req.user.role,
      lastActivityAt: new Date().toISOString(),
    };
    await db.put("users", req.user.uid, profile);
    return { ...profile, id: req.user.uid };
  });
  res.json(publicUser(profile));
}
