import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

import {
    Suspense,
    lazy,
} from "react";

import { Toaster } from "react-hot-toast";

import ProtectedRoute from "./routes/ProtectedRoute";

// ============================================================
// LAZY LOADED PAGES
// ============================================================

const Login = lazy(
    () => import("./pages/auth/Login"),
);

const AdminDashboard = lazy(
    () => import("./pages/admin/AdminDashboard"),
);

const DoctorAvailability = lazy(
    () => import("./pages/admin/DoctorAvailability"),
);

const SuperAdminDashboard = lazy(
    () => import("./pages/super-admin/SuperAdminDashboard"),
);

const PatientTracking = lazy(
    () => import("./pages/patient/PatientTracking"),
);

const DisplayBoard = lazy(
    () => import("./pages/display/DisplayBoard"),
);

const Home = lazy(
    () => import("./pages/home/Home"),
);

const PatientBookAppointment = lazy(
    () => import("./pages/patient/PatientBookAppointment"),
);

const AppointmentStatus =
    lazy(
        () =>
            import(
                "./pages/patient/PatientBookAppointment"
            ),
    );

// ============================================================
// PAGE LOADER
// ============================================================

const PageLoader = () => {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />

                <p className="mt-4 text-sm font-semibold text-slate-600">
                    Loading...
                </p>
            </div>
        </div>
    );
};

// ============================================================
// APP
// ============================================================

function App() {
    return (
        <BrowserRouter>
            {/* ================================================= */}
            {/* TOASTER */}
            {/* ================================================= */}

            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                    duration: 3000,
                }}
            />

            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* ================================================= */}
                    {/* HOME */}
                    {/* ================================================= */}

                    <Route
                        path="/"
                        element={<Home />}
                    />

                    {/* ================================================= */}
                    {/* PUBLIC LOGIN */}
                    {/* ================================================= */}

                    <Route
                        path="/login"
                        element={<Login />}
                    />

                    {/* ================================================= */}
                    {/* PUBLIC BOOK APPOINTMENT */}
                    {/* ================================================= */}

                    <Route
                        path="/book-appointment"
                        element={<PatientBookAppointment />}
                    />

                    <Route
                        path="/appointment-status/:appointmentCode"
                        element={<AppointmentStatus />}
                    />

                    {/* ================================================= */}
                    {/* PUBLIC PATIENT TRACKING */}
                    {/* ================================================= */}

                    <Route
                        path="/track/:trackingToken"
                        element={<PatientTracking />}
                    />

                    {/* ================================================= */}
                    {/* PUBLIC DISPLAY BOARD */}
                    {/* ================================================= */}

                    <Route
                        path="/display/:displayKey"
                        element={<DisplayBoard />}
                    />

                    {/* ================================================= */}
                    {/* HOSPITAL ADMIN */}
                    {/* ================================================= */}

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

                        <Route
                            path="/admin/doctor-availability"
                            element={<DoctorAvailability />}
                        />
                    </Route>

                    {/* ================================================= */}
                    {/* SUPER ADMIN */}
                    {/* ================================================= */}

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

                    {/* ================================================= */}
                    {/* RECEPTIONIST */}
                    {/* ================================================= */}

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

                    {/* ================================================= */}
                    {/* DOCTOR */}
                    {/* ================================================= */}

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

                    {/* ================================================= */}
                    {/* LAB TECHNICIAN */}
                    {/* ================================================= */}

                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "LAB_TECHNICIAN",
                                ]}
                            />
                        }
                    >
                        <Route
                            path="/lab/dashboard"
                            element={<AdminDashboard />}
                        />
                    </Route>

                    {/* ================================================= */}
                    {/* INVALID ROUTES */}
                    {/* ================================================= */}

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
            </Suspense>
        </BrowserRouter>
    );
}

export default App;