import { firebaseAuth, mode } from "../config/firebase.js";
const [uid, role] = process.argv.slice(2);
if (
  mode !== "firebase" ||
  !uid ||
  !["student", "instructor", "admin", "superadmin"].includes(role)
)
  throw new Error(
    "In Firebase mode, run: npm run set-role -- USER_UID student|instructor|admin|superadmin",
  );
const user = await firebaseAuth.getUser(uid);
await firebaseAuth.setCustomUserClaims(uid, { ...user.customClaims, role });
await firebaseAuth.revokeRefreshTokens(uid);
console.log(`Role set to ${role}. The user must sign in again.`);
