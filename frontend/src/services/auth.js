import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
} from "@firebase/auth";
import { api } from "./api";
import { authMode, firebaseAuth } from "./firebase";
function requireFirebase() {
  if (!firebaseAuth)
    throw new Error(
      "Add your Firebase configuration to enable authentication.",
    );
}
export async function login(email, password) {
  if (authMode === "demo") {
    const { data } = await api.post("/auth/login", { email, password });
    sessionStorage.setItem("atlas-demo-token", data.token);
    return data.user;
  }
  requireFirebase();
  await signInWithEmailAndPassword(firebaseAuth, email, password);
  return (await api.get("/me")).data;
}
export async function register(name, email, password) {
  if (authMode === "demo") {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
    });
    sessionStorage.setItem("atlas-demo-token", data.token);
    return data.user;
  }
  requireFirebase();
  const result = await createUserWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  );
  await updateProfile(result.user, { displayName: name });
  await api.get("/me");
  return (await api.put("/me", { name })).data;
}
export async function resetPassword(email) {
  requireFirebase();
  await sendPasswordResetEmail(firebaseAuth, email);
}
export async function logout() {
  sessionStorage.removeItem("atlas-demo-token");
  if (firebaseAuth) await signOut(firebaseAuth);
}
