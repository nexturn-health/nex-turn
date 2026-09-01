import {
    Activity,
    Bell,
    Building2,
    CalendarDays,
    ChevronDown,
    Clock3,
    LogOut,
    Menu,
    Stethoscope,
    Users,
    UserRoundPlus,
    Ticket,
    CheckCircle2,
} from "lucide-react";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Departments from "./Departments";
import Doctors from "./Doctors";
import Receptionists from "./Receptionists";
import Appointments from "./Appointments";
import GenerateToken from "../../pages/reception/GenerateToken";
import Patients from "../../pages/reception/Patients";
import Queue from "../../pages/reception/Queue";
import DoctorQueue from "../../pages/doctor/DoctorQueue";
import {
    getDashboardStats,
    type DashboardStats,
} from "../../services/dashboard.api";

import { socket } from "../../socket/socket";

import { useAuth } from "../../hooks/useAuth";

/* ============================== */
/* TYPES */
/* ============================== */

type DashboardPage =
    | "dashboard"
    | "departments"
    | "doctors"
    | "receptionists"
    | "appointments"
    | "patients"
    | "queue"
    | "generate-token"
    | "doctorQueue";


/* ============================== */
/* DASHBOARD */
/* ============================== */

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] =
        useState(false);

    const [activePage, setActivePage] =
        useState<DashboardPage>("dashboard");

    const [dashboardStats, setDashboardStats] =
        useState<DashboardStats>({
            patientsToday: 0,
            doctors: 0,
            departments: 0,
            waitingPatients: 0,
            calledPatients: 0,
            servingPatients: 0,
            completedPatients: 0,
        });

    const [dashboardLoading, setDashboardLoading] =
        useState(true);

    /* ============================== */
    /* ROLE CHECK */
    /* ============================== */

    const isAdmin =
        user?.role === "HOSPITAL_ADMIN";

    const isDoctor =
        user?.role === "DOCTOR";

    const isReceptionist =
        user?.role === "RECEPTIONIST";

    /* ============================== */
    /* ROLE LABEL */
    /* ============================== */

    const roleLabel =
        user?.role === "HOSPITAL_ADMIN"
            ? "Hospital Admin"
            : user?.role === "DOCTOR"
                ? "Doctor"
                : user?.role === "RECEPTIONIST"
                    ? "Receptionist"
                    : "User";

    /* ============================== */
    /* PAGE TITLES */
    /* ============================== */

    const pageTitles: Record<
        DashboardPage,
        string
    > = {
        dashboard: "Dashboard",
        departments: "Departments",
        doctors: "Doctors",
        receptionists: "Receptionists",
        appointments: "Appointments",
        patients: "Patients",
        queue: "Queue & Tokens",
        "generate-token": "Generate Token",
        doctorQueue: "My Queue",
    };

    /* ============================== */
    /* PAGE DESCRIPTIONS */
    /* ============================== */
    const pageDescriptions: Record<
        DashboardPage,
        string
    > = {
        dashboard:
            "Hospital overview",

        departments:
            "Manage hospital departments",

        doctors:
            "Manage hospital doctors",

        receptionists:
            "Manage reception staff",

        appointments:
            "Manage appointments",

        patients:
            "Register and manage patients",

        queue:
            "Generate and manage patient tokens",

        "generate-token":
            "Generate a queue token for a patient",

        doctorQueue:
            "Manage your patient queue",
    };

    /* ============================== */
    /* CHANGE PAGE */
    /* ============================== */

    const handlePageChange = (
        page: DashboardPage,
    ) => {
        setActivePage(page);

        // Close sidebar on mobile
        setSidebarOpen(false);
    };


    /* ============================== */
    /* LOGOUT */
    /* ============================== */

    const handleLogout = () => {
        logout();

        // Redirect to login page
        navigate("/login", {
            replace: true,
        });
    };

    const loadDashboardStats =
        useCallback(async () => {
            try {
                setDashboardLoading(true);

                const data =
                    await getDashboardStats();

                setDashboardStats(data);
            } catch (error) {
                console.error(
                    "Dashboard stats error:",
                    error,
                );
            } finally {
                setDashboardLoading(false);
            }
        }, []);


    // =====================================
    // INITIAL DASHBOARD LOAD
    // =====================================

    useEffect(() => {
        if (!user?.hospitalId) {
            return;
        }

        loadDashboardStats();
    }, [
        user?.hospitalId,
        loadDashboardStats,
    ]);


    // =====================================
    // REAL-TIME DASHBOARD
    // =====================================

    useEffect(() => {
        if (
            !user?.hospitalId ||
            activePage !== "dashboard"
        ) {
            return;
        }

        if (!socket.connected) {
            socket.connect();
        }

        const joinHospital = () => {
            socket.emit(
                "join:hospital",
                user.hospitalId,
            );
        };

        if (socket.connected) {
            joinHospital();
        }

        socket.on(
            "connect",
            joinHospital,
        );

        // =================================
        // QUEUE EVENTS
        // =================================

        const refreshDashboard = () => {
            console.log(
                "Dashboard refresh triggered",
            );

            loadDashboardStats();
        };

        socket.on(
            "queue:created",
            refreshDashboard,
        );

        socket.on(
            "queue:called",
            refreshDashboard,
        );

        socket.on(
            "queue:serving",
            refreshDashboard,
        );

        socket.on(
            "queue:completed",
            refreshDashboard,
        );

        socket.on(
            "queue:skipped",
            refreshDashboard,
        );

        return () => {
            socket.off(
                "connect",
                joinHospital,
            );

            socket.off(
                "queue:created",
                refreshDashboard,
            );

            socket.off(
                "queue:called",
                refreshDashboard,
            );

            socket.off(
                "queue:serving",
                refreshDashboard,
            );

            socket.off(
                "queue:completed",
                refreshDashboard,
            );

            socket.off(
                "queue:skipped",
                refreshDashboard,
            );
        };
    }, [
        user?.hospitalId,
        activePage,
        loadDashboardStats,
    ]);

    const getGreeting = () => {
        const hour = new Date().getHours();

        if (hour < 12) {
            return "Good morning";
        }

        if (hour < 17) {
            return "Good afternoon";
        }

        return "Good evening";
    };

    console.log("CURRENT USER:", user);
    console.log("CURRENT ROLE:", user?.role);
    console.log("ACTIVE PAGE:", activePage);

    return (
        <div className="min-h-screen bg-slate-100">

            {/* ============================== */}
            {/* MOBILE OVERLAY */}
            {/* ============================== */}

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={() =>
                        setSidebarOpen(false)
                    }
                />
            )}

            {/* ============================== */}
            {/* SIDEBAR */}
            {/* ============================== */}

            <aside
                className={`
                    fixed left-0 top-0 z-50
                    h-screen w-64
                    border-r border-slate-200
                    bg-white
                    transition-transform duration-300
                    lg:translate-x-0

                    ${sidebarOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                    }
                `}
            >

                {/* ============================== */}
                {/* LOGO */}
                {/* ============================== */}

                <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl">
                        🏥
                    </div>

                    <div>
                        <h1 className="font-bold text-slate-900">
                            NexTurn
                        </h1>

                        <p className="text-xs text-slate-500">
                            Queue Management
                        </p>
                    </div>

                </div>

                {/* ============================== */}
                {/* NAVIGATION */}
                {/* ============================== */}

                <nav className="space-y-1 p-4">

                    {/* ============================== */}
                    {/* ADMIN NAVIGATION */}
                    {/* ============================== */}

                    {isAdmin && (
                        <>
                            <NavItem
                                icon={
                                    <Activity size={19} />
                                }
                                label="Dashboard"
                                active={
                                    activePage ===
                                    "dashboard"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "dashboard",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <Building2 size={19} />
                                }
                                label="Departments"
                                active={
                                    activePage ===
                                    "departments"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "departments",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <Stethoscope size={19} />
                                }
                                label="Doctors"
                                active={
                                    activePage ===
                                    "doctors"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "doctors",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <Users size={19} />
                                }
                                label="Receptionists"
                                active={
                                    activePage ===
                                    "receptionists"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "receptionists",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <CalendarDays size={19} />
                                }
                                label="Appointments"
                                active={
                                    activePage ===
                                    "appointments"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "appointments",
                                    )
                                }
                            />
                        </>
                    )}

                    {/* ============================== */}
                    {/* DOCTOR NAVIGATION */}
                    {/* ============================== */}

                    {isDoctor && (
                        <>
                            <NavItem
                                icon={
                                    <Activity size={19} />
                                }
                                label="Dashboard"
                                active={
                                    activePage ===
                                    "dashboard"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "dashboard",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <Ticket size={19} />
                                }
                                label="My Queue"
                                active={
                                    activePage ===
                                    "doctorQueue"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "doctorQueue",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <CalendarDays size={19} />
                                }
                                label="Appointments"
                                active={
                                    activePage ===
                                    "appointments"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "appointments",
                                    )
                                }
                            />
                        </>
                    )}

                    {/* ============================== */}
                    {/* RECEPTIONIST NAVIGATION */}
                    {/* ============================== */}

                    {isReceptionist && (
                        <>
                            <NavItem
                                icon={
                                    <Activity size={19} />
                                }
                                label="Dashboard"
                                active={
                                    activePage ===
                                    "dashboard"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "dashboard",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <UserRoundPlus
                                        size={19}
                                    />
                                }
                                label="Patients"
                                active={
                                    activePage ===
                                    "patients"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "patients",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <Ticket size={19} />
                                }
                                label="Queue & Tokens"
                                active={
                                    activePage ===
                                    "queue"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "queue",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <CalendarDays size={19} />
                                }
                                label="Appointments"
                                active={
                                    activePage ===
                                    "appointments"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "appointments",
                                    )
                                }
                                
                            />
                        </>
                    )}

                </nav>

                {/* ============================== */}
                {/* LOGOUT */}
                {/* ============================== */}

                <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">

                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50"
                    >
                        <LogOut size={19} />

                        Logout
                    </button>

                </div>

            </aside>

            {/* ============================== */}
            {/* MAIN AREA */}
            {/* ============================== */}

            <div className="lg:ml-64">

                {/* ============================== */}
                {/* HEADER */}
                {/* ============================== */}

                <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">

                    {/* LEFT */}

                    <div className="flex items-center gap-3">

                        {/* MOBILE MENU */}

                        <button
                            onClick={() =>
                                setSidebarOpen(true)
                            }
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                        >
                            <Menu size={22} />
                        </button>

                        {/* PAGE TITLE */}

                        <div>

                            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">

                                {
                                    pageTitles[
                                    activePage
                                    ]
                                }

                            </h2>

                            <p className="hidden text-sm text-slate-500 sm:block">

                                {
                                    pageDescriptions[
                                    activePage
                                    ]
                                }

                            </p>

                        </div>

                    </div>

                    {/* RIGHT */}

                    <div className="flex items-center gap-3">

                        {/* NOTIFICATION */}

                        <button className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100">

                            <Bell size={20} />

                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />

                        </button>

                        {/* USER */}

                        <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 sm:flex">

                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">

                                {user?.name
                                    ?.charAt(0)
                                    .toUpperCase()}

                            </div>

                            <div className="hidden lg:block">

                                <p className="text-sm font-semibold text-slate-900">

                                    {user?.name}

                                </p>

                                <p className="text-xs text-slate-500">

                                    {roleLabel}

                                </p>

                            </div>

                            <ChevronDown
                                size={17}
                                className="text-slate-400"
                            />

                        </div>

                    </div>

                </header>

                {/* ============================== */}
                {/* CONTENT */}
                {/* ============================== */}

                <main className="p-4 sm:p-6 lg:p-8">

                    {/* ============================== */}
                    {/* DASHBOARD */}
                    {/* ============================== */}

                    {activePage === "dashboard" && (

                        <>
                            {/* WELCOME */}

                            <div className="mb-8">

                                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                                    {getGreeting()},{" "}
                                    {user?.name?.split(" ")[0]}
                                </h1>

                                <p className="mt-2 text-sm text-slate-500 sm:text-base">

                                    Welcome to your NexTurn dashboard.

                                </p>

                            </div>

                            {/* ============================== */}
                            {/* ADMIN DASHBOARD */}
                            {/* ============================== */}

                            {isAdmin && (
                                <>
                                    {/* ================================= */}
                                    {/* ADMIN STATISTICS */}
                                    {/* ================================= */}

                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                                        <StatCard
                                            title="Patients Today"
                                            value={
                                                dashboardLoading
                                                    ? "..."
                                                    : String(
                                                        dashboardStats.patientsToday,
                                                    )
                                            }
                                            description="Registered today"
                                            icon={
                                                <Users
                                                    size={22}
                                                />
                                            }
                                        />

                                        <StatCard
                                            title="Doctors"
                                            value={
                                                dashboardLoading
                                                    ? "..."
                                                    : String(
                                                        dashboardStats.doctors,
                                                    )
                                            }
                                            description="Active doctors"
                                            icon={
                                                <Stethoscope
                                                    size={22}
                                                />
                                            }
                                        />

                                        <StatCard
                                            title="Departments"
                                            value={
                                                dashboardLoading
                                                    ? "..."
                                                    : String(
                                                        dashboardStats.departments,
                                                    )
                                            }
                                            description="Active departments"
                                            icon={
                                                <Building2
                                                    size={22}
                                                />
                                            }
                                        />

                                        <StatCard
                                            title="Waiting Patients"
                                            value={
                                                dashboardLoading
                                                    ? "..."
                                                    : String(
                                                        dashboardStats.waitingPatients,
                                                    )
                                            }
                                            description="Currently waiting"
                                            icon={
                                                <Clock3
                                                    size={22}
                                                />
                                            }
                                        />

                                    </div>

                                    {/* ================================= */}
                                    {/* QUEUE SUMMARY */}
                                    {/* ================================= */}

                                    <div className="mt-6 grid gap-4 sm:grid-cols-3">

                                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">

                                            <p className="text-sm font-medium text-blue-700">
                                                Called
                                            </p>

                                            <p className="mt-2 text-3xl font-bold text-blue-900">
                                                {dashboardStats.calledPatients}
                                            </p>

                                            <p className="mt-1 text-xs text-blue-600">
                                                Patients called by doctors
                                            </p>

                                        </div>

                                        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">

                                            <p className="text-sm font-medium text-orange-700">
                                                In Consultation
                                            </p>

                                            <p className="mt-2 text-3xl font-bold text-orange-900">
                                                {dashboardStats.servingPatients}
                                            </p>

                                            <p className="mt-1 text-xs text-orange-600">
                                                Currently being served
                                            </p>

                                        </div>

                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">

                                            <p className="text-sm font-medium text-emerald-700">
                                                Completed
                                            </p>

                                            <p className="mt-2 text-3xl font-bold text-emerald-900">
                                                {dashboardStats.completedPatients}
                                            </p>

                                            <p className="mt-1 text-xs text-emerald-600">
                                                Consultations completed today
                                            </p>

                                        </div>

                                    </div>

                                    {/* ================================= */}
                                    {/* TODAY'S QUEUE */}
                                    {/* ================================= */}

                                    <div className="mt-8 grid gap-6 xl:grid-cols-3">

                                        <div className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">

                                            <div className="flex items-center justify-between">

                                                <div>
                                                    <h2 className="font-bold text-slate-900">
                                                        Today's Queue
                                                    </h2>

                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Live hospital queue overview
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600">

                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                                                    Live

                                                </div>

                                            </div>

                                            <div className="mt-6 grid gap-3 sm:grid-cols-2">

                                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                                                    <p className="text-xs text-slate-500">
                                                        Waiting
                                                    </p>

                                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                                        {dashboardStats.waitingPatients}
                                                    </p>

                                                </div>

                                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                                                    <p className="text-xs text-slate-500">
                                                        Called
                                                    </p>

                                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                                        {dashboardStats.calledPatients}
                                                    </p>

                                                </div>

                                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                                                    <p className="text-xs text-slate-500">
                                                        Serving
                                                    </p>

                                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                                        {dashboardStats.servingPatients}
                                                    </p>

                                                </div>

                                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                                                    <p className="text-xs text-slate-500">
                                                        Completed
                                                    </p>

                                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                                        {dashboardStats.completedPatients}
                                                    </p>

                                                </div>

                                            </div>

                                        </div>

                                        {/* ================================= */}
                                        {/* QUICK ACTIONS */}
                                        {/* ================================= */}

                                        <div className="rounded-2xl border border-slate-200 bg-white p-6">

                                            <h2 className="font-bold text-slate-900">
                                                Quick Actions
                                            </h2>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Manage your hospital
                                            </p>

                                            <div className="mt-6 space-y-3">

                                                <QuickAction
                                                    icon={
                                                        <Building2
                                                            size={19}
                                                        />
                                                    }
                                                    label="Manage Departments"
                                                    onClick={() =>
                                                        handlePageChange(
                                                            "departments",
                                                        )
                                                    }
                                                />

                                                <QuickAction
                                                    icon={
                                                        <Stethoscope
                                                            size={19}
                                                        />
                                                    }
                                                    label="Manage Doctors"
                                                    onClick={() =>
                                                        handlePageChange(
                                                            "doctors",
                                                        )
                                                    }
                                                />

                                                <QuickAction
                                                    icon={
                                                        <Users
                                                            size={19}
                                                        />
                                                    }
                                                    label="Manage Receptionists"
                                                    onClick={() =>
                                                        handlePageChange(
                                                            "receptionists",
                                                        )
                                                    }
                                                />

                                                <QuickAction
                                                    icon={
                                                        <CalendarDays
                                                            size={19}
                                                        />
                                                    }
                                                    label="View Appointments"
                                                    onClick={() =>
                                                        handlePageChange(
                                                            "appointments",
                                                        )
                                                    }
                                                />

                                            </div>

                                        </div>

                                    </div>
                                </>
                            )}

                            {/* ============================== */}
                            {/* DOCTOR DASHBOARD */}
                            {/* ============================== */}

                            {isDoctor && (
                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                                    {/* WAITING PATIENTS */}

                                    <StatCard
                                        title="Waiting Patients"
                                        value={
                                            dashboardLoading
                                                ? "..."
                                                : String(
                                                    dashboardStats.waitingPatients,
                                                )
                                        }
                                        description="Patients waiting for you"
                                        icon={
                                            <Users size={22} />
                                        }
                                    />

                                    {/* CURRENT PATIENT */}

                                    <StatCard
                                        title="Current Patient"
                                        value={
                                            dashboardStats.servingPatients > 0
                                                ? `${dashboardStats.servingPatients}`
                                                : "-"
                                        }
                                        description={
                                            dashboardStats.servingPatients > 0
                                                ? "Patient currently being served"
                                                : "No patient currently serving"
                                        }
                                        icon={
                                            <Stethoscope size={22} />
                                        }
                                    />

                                    {/* COMPLETED TODAY */}

                                    <StatCard
                                        title="Completed Today"
                                        value={
                                            dashboardLoading
                                                ? "..."
                                                : String(
                                                    dashboardStats.completedPatients,
                                                )
                                        }
                                        description="Patients completed today"
                                        icon={
                                            <CheckCircle2 size={22} />
                                        }
                                    />

                                    {/* CURRENT QUEUE STATUS */}

                                    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2 xl:col-span-3">

                                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                                            <div>
                                                <h2 className="font-bold text-slate-900">
                                                    My Queue
                                                </h2>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Manage and serve your patients.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                                                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                                                Live Queue
                                            </div>

                                        </div>

                                        {/* QUEUE SUMMARY */}

                                        <div className="mt-6 grid gap-4 sm:grid-cols-3">

                                            {/* WAITING */}

                                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

                                                <p className="text-xs font-medium text-blue-600">
                                                    Waiting
                                                </p>

                                                <p className="mt-2 text-3xl font-bold text-blue-900">
                                                    {dashboardStats.waitingPatients}
                                                </p>

                                                <p className="mt-1 text-xs text-blue-600">
                                                    Patients waiting
                                                </p>

                                            </div>

                                            {/* SERVING */}

                                            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">

                                                <p className="text-xs font-medium text-orange-600">
                                                    In Consultation
                                                </p>

                                                <p className="mt-2 text-3xl font-bold text-orange-900">
                                                    {dashboardStats.servingPatients}
                                                </p>

                                                <p className="mt-1 text-xs text-orange-600">
                                                    Currently serving
                                                </p>

                                            </div>

                                            {/* COMPLETED */}

                                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">

                                                <p className="text-xs font-medium text-emerald-600">
                                                    Completed
                                                </p>

                                                <p className="mt-2 text-3xl font-bold text-emerald-900">
                                                    {dashboardStats.completedPatients}
                                                </p>

                                                <p className="mt-1 text-xs text-emerald-600">
                                                    Completed today
                                                </p>

                                            </div>

                                        </div>

                                        {/* ACTION */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handlePageChange(
                                                    "doctorQueue",
                                                )
                                            }
                                            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                                        >
                                            Open My Queue
                                        </button>

                                    </div>

                                </div>
                            )}

                            {/* ============================== */}
                            {/* RECEPTIONIST DASHBOARD */}
                            {/* ============================== */}

                            {isReceptionist && (
                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

                                    {/* PATIENTS TODAY */}

                                    <StatCard
                                        title="Patients Today"
                                        value={
                                            dashboardLoading
                                                ? "..."
                                                : String(
                                                    dashboardStats.patientsToday,
                                                )
                                        }
                                        description="Registered today"
                                        icon={
                                            <Users size={22} />
                                        }
                                    />

                                    {/* WAITING */}

                                    <StatCard
                                        title="Waiting Patients"
                                        value={
                                            dashboardLoading
                                                ? "..."
                                                : String(
                                                    dashboardStats.waitingPatients,
                                                )
                                        }
                                        description="Currently in queue"
                                        icon={
                                            <Clock3 size={22} />
                                        }
                                    />

                                    {/* SERVING */}

                                    <StatCard
                                        title="In Consultation"
                                        value={
                                            dashboardLoading
                                                ? "..."
                                                : String(
                                                    dashboardStats.servingPatients,
                                                )
                                        }
                                        description="Currently being served"
                                        icon={
                                            <Stethoscope size={22} />
                                        }
                                    />

                                    {/* COMPLETED */}

                                    <StatCard
                                        title="Completed Today"
                                        value={
                                            dashboardLoading
                                                ? "..."
                                                : String(
                                                    dashboardStats.completedPatients,
                                                )
                                        }
                                        description="Consultations completed"
                                        icon={
                                            <CheckCircle2 size={22} />
                                        }
                                    />

                                    {/* ============================== */}
                                    {/* QUEUE OVERVIEW */}
                                    {/* ============================== */}

                                    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2 xl:col-span-4">

                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                            <div>
                                                <h2 className="font-bold text-slate-900">
                                                    Queue Overview
                                                </h2>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Live hospital queue status.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">

                                                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                                                Live

                                            </div>

                                        </div>

                                        {/* QUEUE STATS */}

                                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                                            {/* WAITING */}

                                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">

                                                <p className="text-xs font-medium text-blue-600">
                                                    Waiting
                                                </p>

                                                <p className="mt-2 text-3xl font-bold text-blue-900">
                                                    {dashboardStats.waitingPatients}
                                                </p>

                                                <p className="mt-1 text-xs text-blue-600">
                                                    Waiting patients
                                                </p>

                                            </div>

                                            {/* CALLED */}

                                            <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">

                                                <p className="text-xs font-medium text-purple-600">
                                                    Called
                                                </p>

                                                <p className="mt-2 text-3xl font-bold text-purple-900">
                                                    {dashboardStats.calledPatients}
                                                </p>

                                                <p className="mt-1 text-xs text-purple-600">
                                                    Patients called
                                                </p>

                                            </div>

                                            {/* SERVING */}

                                            <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">

                                                <p className="text-xs font-medium text-orange-600">
                                                    Serving
                                                </p>

                                                <p className="mt-2 text-3xl font-bold text-orange-900">
                                                    {dashboardStats.servingPatients}
                                                </p>

                                                <p className="mt-1 text-xs text-orange-600">
                                                    In consultation
                                                </p>

                                            </div>

                                            {/* COMPLETED */}

                                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">

                                                <p className="text-xs font-medium text-emerald-600">
                                                    Completed
                                                </p>

                                                <p className="mt-2 text-3xl font-bold text-emerald-900">
                                                    {dashboardStats.completedPatients}
                                                </p>

                                                <p className="mt-1 text-xs text-emerald-600">
                                                    Completed today
                                                </p>

                                            </div>

                                        </div>

                                        {/* ============================== */}
                                        {/* QUICK ACTION */}
                                        {/* ============================== */}

                                        <div className="mt-6">

                                            <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">

                                                <div>

                                                    <h3 className="text-sm font-bold text-slate-900">
                                                        Generate Patient Token
                                                    </h3>

                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Register a new patient or select an existing
                                                        patient and generate their queue token.
                                                    </p>

                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handlePageChange("generate-token")
                                                    }
                                                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                                >
                                                    <Ticket size={18} />

                                                    Generate Token
                                                </button>

                                            </div>

                                        </div>

                                    </div>

                                </div>
                            )}
                        </>
                    )}

                    {/* ============================== */}
                    {/* ADMIN PAGES */}
                    {/* ============================== */}

                    {isAdmin &&
                        activePage ===
                        "departments" && (
                            <Departments />
                        )}

                    {isAdmin &&
                        activePage ===
                        "doctors" && (
                            <Doctors />
                        )}

                    {isAdmin &&
                        activePage ===
                        "receptionists" && (
                            <Receptionists />
                        )}

                    {/* ============================== */}
                    {/* APPOINTMENTS */}
                    {/* ADMIN / DOCTOR / RECEPTIONIST */}
                    {/* ============================== */}

                    {activePage ===
                        "appointments" && (
                            <Appointments />
                        )}

                    {/* ============================== */}
                    {/* RECEPTIONIST - PATIENTS */}
                    {/* ============================== */}

                    {isReceptionist &&
                        activePage === "patients" && (
                            <Patients />
                        )}


                    {/* ============================== */}
                    {/* RECEPTIONIST - QUEUE */}
                    {/* ============================== */}

                    {isReceptionist &&
                        activePage === "queue" && (
                            <PlaceholderPage
                                title="Queue & Tokens"
                                description="Generate patient tokens and manage today's queue here."
                            />
                        )}


                    {/* ============================== */}
                    {/* RECEPTIONIST - GENERATE TOKEN */}
                    {/* ============================== */}


                    {isReceptionist &&
                        activePage === "queue" && (
                            <Queue />
                        )}
                    {isReceptionist &&
                        activePage === "generate-token" && (
                            <GenerateToken />
                        )}


                    {/* ============================== */}
                    {/* DOCTOR - QUEUE */}
                    {/* ============================== */}

                    {isDoctor &&
                        activePage === "doctorQueue" && (
                            <DoctorQueue />
                        )}

                </main>

            </div>

        </div>
    );
};

/* ============================== */
/* NAV ITEM */
/* ============================== */

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const NavItem = ({
    icon,
    label,
    active = false,
    onClick,
}: NavItemProps) => {
    return (
        <button
            onClick={onClick}
            className={`
                flex w-full items-center gap-3
                rounded-xl px-4 py-3
                text-sm font-medium transition

                ${active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
            `}
        >
            {icon}

            {label}
        </button>
    );
};

/* ============================== */
/* STAT CARD */
/* ============================== */

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
}

const StatCard = ({
    title,
    value,
    description,
    icon,
}: StatCardProps) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">

            <div className="flex items-center justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    {icon}
                </div>

            </div>

            <p className="mt-5 text-sm text-slate-500">
                {title}
            </p>

            <h3 className="mt-1 text-3xl font-bold text-slate-900">
                {value}
            </h3>

            <p className="mt-2 text-xs text-slate-500">
                {description}
            </p>

        </div>
    );
};

/* ============================== */
/* QUEUE ROW */
/* ============================== */

interface QueueRowProps {
    department: string;
    doctor: string;
    waiting: number;
    color: string;
}

const QueueRow = ({
    department,
    doctor,
    waiting,
    color,
}: QueueRowProps) => {
    return (
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

            <div className="flex items-center gap-3">

                <div
                    className={`
                        flex h-10 w-10
                        items-center justify-center
                        rounded-xl
                        ${color}
                    `}
                >
                    <Activity size={19} />
                </div>

                <div>

                    <p className="text-sm font-semibold text-slate-900">
                        {department}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        {doctor}
                    </p>

                </div>

            </div>

            <div className="text-right">

                <p className="text-lg font-bold text-slate-900">
                    {waiting}
                </p>

                <p className="text-xs text-slate-500">
                    waiting
                </p>

            </div>

        </div>
    );
};

/* ============================== */
/* QUICK ACTION */
/* ============================== */

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}

const QuickAction = ({
    icon,
    label,
    onClick,
}: QuickActionProps) => {
    return (
        <button
            onClick={onClick}
            className="
                flex w-full items-center gap-3
                rounded-xl border border-slate-200
                p-3 text-left text-sm font-medium
                text-slate-700 transition
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-600
            "
        >

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                {icon}
            </div>

            {label}

        </button>
    );
};

/* ============================== */
/* PLACEHOLDER PAGE */
/* ============================== */

interface PlaceholderPageProps {
    title: string;
    description: string;
}

const PlaceholderPage = ({
    title,
    description,
}: PlaceholderPageProps) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">

            <h2 className="text-xl font-bold text-slate-900">
                {title}
            </h2>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
                {description}
            </p>

        </div>
    );
};

export default AdminDashboard;