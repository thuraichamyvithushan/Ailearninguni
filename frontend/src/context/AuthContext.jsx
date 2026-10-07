import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "@firebase/auth";
import { api } from "../services/api";
import { firebaseAuth, authMode } from "../services/firebase";
import * as auth from "../services/auth";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    const { data } = await api.get("/me");
    setUser(data);
    return data;
  }
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get("/me");
        if (active) setUser(data);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    let unsubscribe;
    if (authMode === "firebase" && firebaseAuth)
      unsubscribe = onAuthStateChanged(firebaseAuth, (current) => {
        if (current) load();
        else {
          setUser(null);
          setLoading(false);
        }
      });
    else if (sessionStorage.getItem("atlas-demo-token")) load();
    else setLoading(false);
    const expire = () => {
      setUser(null);
      sessionStorage.removeItem("atlas-demo-token");
    };
    window.addEventListener("atlas-session-expired", expire);
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener("atlas-session-expired", expire);
    };
  }, []);
  const value = {
    user,
    loading,
    refresh,
    login: async (...args) => {
      const user = await auth.login(...args);
      setUser(user);
      return user;
    },
    register: async (...args) => {
      const user = await auth.register(...args);
      setUser(user);
      return user;
    },
    logout: async () => {
      await auth.logout();
      setUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
