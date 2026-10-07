import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/ui";
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
export function RoleProtectedRoute({ allowed }) {
  const { user } = useAuth();
  return allowed.includes(user?.role) ? (
    <Outlet />
  ) : (
    <Navigate
      to={
        user?.role === "student"
          ? "/student/dashboard"
          : user?.role === "instructor"
            ? "/instructor"
            : "/admin"
      }
      replace
    />
  );
}
