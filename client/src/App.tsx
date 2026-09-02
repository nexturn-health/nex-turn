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

import ProtectedRoute from "./routes/ProtectedRoute";

import PatientTracking from "./pages/patient/PatientTracking";

import DisplayBoard from "./pages/display/DisplayBoard";

import { useAuthStore } from "./store/authStore";
import Home from "./pages/home/Home";


function App() {

    const loadAuth = useAuthStore(
        (state) => state.loadAuth,
    );


    useEffect(() => {

        loadAuth();

    }, [loadAuth]);


    return (
        <BrowserRouter>

            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                    duration: 3000,
                }}
            />


            <Routes>

                {/* ================================= */}
                {/* DEFAULT */}
                {/* ================================= */}

                {/* <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                /> */}

                <Route
                    path="/"
                    element={<Home />}
                />


                {/* ================================= */}
                {/* PUBLIC LOGIN */}
                {/* ================================= */}

                <Route
                    path="/login"
                    element={<Login />}
                />


                {/* ================================= */}
                {/* PUBLIC PATIENT TRACKING */}
                {/* ================================= */}

                <Route
                    path="/track/:trackingToken"
                    element={<PatientTracking />}
                />


                {/* ================================= */}
                {/* PUBLIC DISPLAY BOARD */}
                {/* ================================= */}

                <Route
                    path="/display/:displayKey"
                    element={<DisplayBoard />}
                />


                {/* ================================= */}
                {/* HOSPITAL ADMIN */}
                {/* ================================= */}

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


                {/* ================================= */}
                {/* SUPER ADMIN */}
                {/* ================================= */}

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


                {/* ================================= */}
                {/* RECEPTIONIST */}
                {/* ================================= */}

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


                {/* ================================= */}
                {/* DOCTOR */}
                {/* ================================= */}

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


                {/* ================================= */}
                {/* INVALID ROUTES */}
                {/* ================================= */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

            </Routes>

        </BrowserRouter>
    );
}


export default App;
