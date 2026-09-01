import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import Login from "./pages/auth/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import ProtectedRoute from "../src/routes/ProtectedRoute";
import PatientTracking from "./pages/patient/PatientTracking";
import { useAuthStore } from "./store/authStore";
import DisplayBoard from "./pages/display/DisplayBoard";


function App() {
    const loadAuth =
        useAuthStore(
            (state) => state.loadAuth,
        );


    useEffect(() => {

        loadAuth();

    }, [loadAuth]);
    return (
        <>
            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                    duration: 3000,
                }}
            />
            <BrowserRouter>

                <Routes>

                    {/* ============================== */}
                    {/* DEFAULT ROUTE */}
                    {/* ============================== */}

                    <Route
                        path="/"
                        element={
                            <Navigate
                                to="/login"
                                replace
                            />
                        }
                    />

                    {/* ============================== */}
                    {/* LOGIN */}
                    {/* ============================== */}

                    <Route
                        path="/login"
                        element={<Login />}
                    />

                    {/* ============================== */}
                    {/* ADMIN PROTECTED ROUTE */}
                    {/* ============================== */}

                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "HOSPITAL_ADMIN",
                                ]}
                            />
                        }
                    >
                        <Route
                            path="/admin/dashboard"
                            element={<AdminDashboard />}
                        />
                    </Route>

                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "SUPER_ADMIN",
                                ]}
                            />
                        }
                    >
                        <Route
                            path="/super-admin/dashboard"
                            element={<SuperAdminDashboard />}
                        />
                    </Route>

                    {/* ============================== */}
                    {/* RECEPTIONIST PROTECTED ROUTE */}
                    {/* ============================== */}
                    <Route
                        path="/track/:trackingToken"
                        element={<PatientTracking />}
                    />

                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "RECEPTIONIST",
                                ]}
                            />
                        }
                    >
                        <Route
                            path="/reception/dashboard"
                            element={<AdminDashboard />}
                        />
                    </Route>

                    {/* ============================== */}
                    {/* DOCTOR PROTECTED ROUTE */}
                    {/* ============================== */}

                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "DOCTOR",
                                ]}
                            />
                        }
                    >
                        <Route
                            path="/doctor/dashboard"
                            element={<AdminDashboard />}
                        />
                    </Route>
                    {/* ============================== */}
                    {/* INVALID ROUTES */}
                    {/* ============================== */}

                    <Route
                        path="*"
                        element={
                            <Navigate
                                to="/login"
                                replace
                            />
                        }
                    />

                    <Route
                        path="/display/:displayKey"
                        element={
                            <DisplayBoard />
                        }
                    />

                </Routes>


            </BrowserRouter>
        </>
    );
}

export default App;