import {
    Navigate,
    Outlet,
    useLocation,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

const ProtectedRoute = ({
    allowedRoles,
}: ProtectedRouteProps) => {
    const {
        isAuthenticated,
        user,
    } = useAuth();

    const location = useLocation();

    // ==========================================
    // NOT AUTHENTICATED
    // ==========================================

    if (!isAuthenticated || !user) {
        console.log(
            "🔴 PROTECTED ROUTE: NOT AUTHENTICATED",
        );

        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from: location,
                }}
            />
        );
    }

    // ==========================================
    // ROLE CHECK
    // ==========================================

    if (
        allowedRoles &&
        !allowedRoles.includes(user.role)
    ) {
        console.log(
            "🔴 PROTECTED ROUTE: ROLE NOT ALLOWED",
        );

        console.log(
            "USER ROLE:",
            user.role,
        );

        console.log(
            "ALLOWED ROLES:",
            allowedRoles,
        );

        switch (user.role) {
            case "SUPER_ADMIN":
                return (
                    <Navigate
                        to="/super-admin/dashboard"
                        replace
                    />
                );

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

            case "LAB_TECHNICIAN":
                return (
                    <Navigate
                        to="/lab/dashboard"
                        replace
                    />
                );

            case "PATIENT":
                return (
                    <Navigate
                        to="/"
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

    // ==========================================
    // ACCESS GRANTED
    // ==========================================

    console.log(
        "🟢 PROTECTED ROUTE: ACCESS GRANTED",
    );

    console.log(
        "ROLE:",
        user.role,
    );

    console.log(
        "PATH:",
        location.pathname,
    );

    return <Outlet />;
};

export default ProtectedRoute;