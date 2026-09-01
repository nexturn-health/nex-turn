import {
    BrowserRouter,
    Routes,
    Route,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";

// Admin
import AdminDashboard from "../pages/admin/AdminDashboard";

// // Reception
// import ReceptionDashboard from "../pages/reception/ReceptionDashboard";

// // Doctor
// import DoctorDashboard from "../pages/doctor/DoctorDashboard";
import Departments from "../pages/admin/Departments";
import Doctors from "../pages/admin/Doctors";

const AppRoutes = () => {
    return (
        <BrowserRouter>

            <Routes>

                {/* ============================== */}
                {/* PUBLIC ROUTES */}
                {/* ============================== */}

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />


                {/* ============================== */}
                {/* ADMIN ROUTES */}
                {/* ============================== */}

                <Route
                    element={
                        <ProtectedRoute
                            allowedRoles={["HOSPITAL_ADMIN"]}
                        />
                    }
                >
                    <Route
                        path="/admin/dashboard"
                        element={<AdminDashboard />}
                    />
                </Route>
                <Route
                    path="/admin/departments"
                    element={<Departments />}
                />
                <Route
                    path="/admin/doctors"
                    element={<Doctors />}
                />


                {/* ============================== */}
                {/* RECEPTION ROUTES */}
                {/* ============================== */}

                <Route
                    element={
                        <ProtectedRoute
                            allowedRoles={["RECEPTIONIST"]}
                        />
                    }
                >
                    <Route
                        path="/reception/dashboard"
                    // element={<ReceptionDashboard />}
                    />
                </Route>


                {/* ============================== */}
                {/* DOCTOR ROUTES */}
                {/* ============================== */}

                <Route
                    element={
                        <ProtectedRoute
                            allowedRoles={["DOCTOR"]}
                        />
                    }
                >
                    <Route
                        path="/doctor/dashboard"
                    // element={<DoctorDashboard />}
                    />
                </Route>


                {/* ============================== */}
                {/* DEFAULT */}
                {/* ============================== */}

                <Route
                    path="*"
                    element={<Login />}
                />

            </Routes>

        </BrowserRouter>
    );
};

export default AppRoutes;