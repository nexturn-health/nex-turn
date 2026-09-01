import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({
  allowedRoles,
}: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  const location = useLocation();

  // ==============================
  // NOT LOGGED IN
  // ==============================

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // ==============================
  // ROLE CHECK
  // ==============================

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    // User is authenticated but
    // doesn't have permission.

    switch (user.role) {
      case "HOSPITAL_ADMIN":
        return (
          <Navigate
            to="/admin/dashboard"
            replace
          />
        );

      case "RECEPTIONIST":
        return (
          <Navigate
            to="/reception/dashboard"
            replace
          />
        );

      case "DOCTOR":
        return (
          <Navigate
            to="/doctor/dashboard"
            replace
          />
        );

      default:
        return (
          <Navigate
            to="/login"
            replace
          />
        );
    }
  }

  // ==============================
  // AUTHORIZED
  // ==============================

  return <Outlet />;
};

export default ProtectedRoute;