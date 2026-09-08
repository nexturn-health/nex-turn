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
    TestTube2,
    UserCog,
    Crown,
    LockKeyhole,
    AlertTriangle,
    Monitor,
} from "lucide-react";
import {
    useState,
    useEffect,
    useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import Departments from "./Departments";
import Doctors from "./Doctors";
import Receptionists from "./Receptionists";
import Appointments from "./Appointments";
import LabOrders from "./LabOrders";
import LabTechnicians from "./LabTechnicians";
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
import { useAuthStore } from "../../store/authStore";
import LabTechnicianDashboard from "../lab/LabTechnicianDashboard";
import LabTests from "./LabTests";
import DisplaySettings from "../display/DisplaySettings";
import DoctorAvailability from "./DoctorAvailability";
import DoctorAppointments from "../doctor/DoctorAppointments";

type DashboardPage =
    | "dashboard"
    | "departments"
    | "doctors"
    | "doctorAppointments"
    | "doctorAvailability"
    | "receptionists"
    | "appointments"
    | "patients"
    | "queue"
    | "generate-token"
    | "doctorQueue"
    | "labTests"
    | "labTechnician"
    | "labOrders"
    | "labTechnicians"
    | "display";
/*
    IMPORTANT:
    labTechnician
        = Lab Technician's own dashboard
    labTechnicians
        = Hospital Admin's technician management page
*/
const AdminDashboard = () => {
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const subscription =
        useAuthStore(
            (state) =>
                state.subscription,
        );
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] =
        useState(false);
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
    const [premiumNotice, setPremiumNotice] =
        useState(false);
    const isPremium =
        subscription?.plan ===
        "PREMIUM";
    const isTrial =
        subscription?.status ===
        "TRIAL";
    const isActiveSubscription =
        subscription?.status ===
        "ACTIVE";
    const subscriptionExpiry =
        isTrial
            ? subscription?.trialEndsAt
            : isActiveSubscription
                ? subscription?.subscriptionEndsAt
                : null;
    const remainingDays =
        subscriptionExpiry
            ? Math.max(
                0,
                Math.ceil(
                    (
                        new Date(
                            subscriptionExpiry,
                        ).getTime() -
                        Date.now()
                    ) /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    ),
                ),
            )
            : 0;
    const subscriptionExpired =
        subscription?.status ===
        "EXPIRED" ||
        (
            !!subscriptionExpiry &&
            new Date(
                subscriptionExpiry,
            ).getTime() <=
            Date.now()
        );
    const premiumPages:
        DashboardPage[] = [
            "labTests",
            "labTechnician",
            "labOrders",
            "labTechnicians",
        ];
    const isAdmin =
        user?.role === "HOSPITAL_ADMIN";
    const isDoctor =
        user?.role === "DOCTOR";
    const isReceptionist =
        user?.role === "RECEPTIONIST";
    const isLabTechnician =
        user?.role === "LAB_TECHNICIAN";
    const [activePage, setActivePage] =
        useState<DashboardPage>(() => {
            if (isLabTechnician) {
                return "labTechnician";
            }
            return "dashboard";
        });
    const roleLabel =
        user?.role === "HOSPITAL_ADMIN"
            ? "Hospital Admin"
            : user?.role === "DOCTOR"
                ? "Doctor"
                : user?.role === "RECEPTIONIST"
                    ? "Receptionist"
                    : user?.role === "LAB_TECHNICIAN"
                        ? "Lab Technician"
                        : "User";
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
        labTests: "Lab Tests",
        labOrders: "Lab Orders",
        labTechnician: "Lab Dashboard",
        labTechnicians: "Lab Technicians",
        display: "Display Settings",
        doctorAvailability: "Doctor Availability",
        doctorAppointments: "Doctor Appointments",
    };
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
        labTests:
            "Manage laboratory tests and pricing",
        labOrders:
            "Review lab orders and confirm patient payments",
        labTechnician:
            "Manage your assigned laboratory work",
        labTechnicians:
            "Create and manage laboratory technicians",

        display: "Configure and manage display settings for queue and token information",

        doctorAvailability: "Set OPD timing, breaks and appointment availability",

        doctorAppointments: "View and manage your appointments",
    };
    const handlePageChange = (
        page: DashboardPage,
    ) => {
        if (
            premiumPages.includes(
                page,
            ) &&
            !isPremium
        ) {
            setPremiumNotice(true);
            setSidebarOpen(false);
            return;
        }
        setActivePage(page);
        setSidebarOpen(false);
    };
    const handleLogout = () => {
        logout();
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
    useEffect(() => {
        if (!user?.hospitalId) {
            return;
        }
        loadDashboardStats();
    }, [
        user?.hospitalId,
        loadDashboardStats,
    ]);
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
            if (!user?.hospitalId) {
                return;
            }
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
        const hour =
            new Date().getHours();
        if (hour < 12) {
            return "Good morning";
        }
        if (hour < 17) {
            return "Good afternoon";
        }
        return "Good evening";
    };
    if (
        subscriptionExpired &&
        user?.role !== "SUPER_ADMIN"
    ) {
        return (
            <SubscriptionExpiredView
                plan={
                    subscription?.plan ??
                    "BASIC"
                }
                onLogout={
                    handleLogout
                }
            />
        );
    }
    return (
        <div className="hospital-workspace min-h-screen bg-slate-100">
            <HospitalDesignStyles />
            {premiumNotice && (
                <PremiumRequiredModal
                    onClose={() =>
                        setPremiumNotice(
                            false,
                        )
                    }
                />
            )}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={() =>
                        setSidebarOpen(false)
                    }
                />
            )}
            <aside
                className={`
                    hospital-sidebar fixed left-0 top-0 z-50
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
                <div className="hospital-brand flex h-20 items-center gap-3 border-b border-slate-200 px-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-xl">
                        <Stethoscope size={25} strokeWidth={1.8} />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900">
                            NexTurn
                        </h1>
                        <p className="text-xs text-slate-500">
                            Hospital workspace
                        </p>
                    </div>
                </div>
                <nav aria-label="Hospital navigation" className="hospital-navigation space-y-1 p-4">
                    <p className="hospital-nav-caption">WORKSPACE</p>
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
                                    <Clock3 size={19} />
                                }
                                label="Doctor Availability"
                                active={
                                    activePage ===
                                    "doctorAvailability"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "doctorAvailability",
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
                                    <Monitor size={19} />
                                }
                                label="Display Board"
                                active={
                                    activePage ===
                                    "display"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "display",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <TestTube2 size={19} />
                                }
                                label="Lab Tests"
                                locked={
                                    !isPremium
                                }
                                active={
                                    activePage ===
                                    "labTests"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "labTests",
                                    )
                                }
                            />

                            <NavItem
                                icon={
                                    <UserCog size={19} />
                                }
                                label="Lab Technicians"
                                locked={
                                    !isPremium
                                }
                                active={
                                    activePage ===
                                    "labTechnicians"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "labTechnicians",
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
                                    "doctorAppointments"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "doctorAppointments",
                                    )
                                }
                            />
                        </>
                    )}
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
                                    <TestTube2 size={19} />
                                }
                                label="Lab Orders"
                                locked={
                                    !isPremium
                                }
                                active={
                                    activePage ===
                                    "labOrders"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "labOrders",
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
                    {isLabTechnician && (
                        <>
                            <NavItem
                                icon={
                                    <Activity size={19} />
                                }
                                label="Dashboard"
                                locked={
                                    !isPremium
                                }
                                active={
                                    activePage ===
                                    "labTechnician"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "labTechnician",
                                    )
                                }
                            />
                            <NavItem
                                icon={
                                    <TestTube2 size={19} />
                                }
                                label="Lab Work"
                                locked={
                                    !isPremium
                                }
                                active={
                                    activePage ===
                                    "labOrders"
                                }
                                onClick={() =>
                                    handlePageChange(
                                        "labOrders",
                                    )
                                }
                            />
                        </>
                    )}
                </nav>
                <div className="hospital-sidebar-footer border-t border-slate-200 p-4">
                    <button
                        type="button"
                        onClick={
                            handleLogout
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50"
                    >
                        <LogOut size={19} />
                        Logout
                    </button>
                </div>
            </aside>
            <div className="hospital-main lg:ml-64">
                <header className="hospital-header sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() =>
                                setSidebarOpen(
                                    true,
                                )
                            }
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                        >
                            <Menu size={22} />
                        </button>
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
                    <div className="flex items-center gap-3">
                        {subscription && (
                            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
                                {isPremium ? (
                                    <Crown
                                        size={15}
                                        className="text-amber-500"
                                    />
                                ) : (
                                    <ShieldPlanIcon />
                                )}
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        {
                                            subscription.plan
                                        }{" "}
                                        {isTrial
                                            ? "Trial"
                                            : "Plan"}
                                    </p>
                                    <p className="text-xs font-semibold text-slate-700">
                                        {isTrial
                                            ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} left`
                                            : isActiveSubscription
                                                ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} left`
                                                : subscription.status}
                                    </p>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
                        >
                            <Bell size={20} />
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                        </button>
                        <div className="relative border-l border-slate-200 pl-3 sm:pl-4">
                            {profileMenuOpen && (
                                <button
                                    type="button"
                                    aria-label="Close profile menu"
                                    tabIndex={-1}
                                    onClick={() => setProfileMenuOpen(false)}
                                    className="fixed inset-0 z-40 cursor-default"
                                />
                            )}

                            <button
                                type="button"
                                aria-label="Account options"
                                aria-expanded={profileMenuOpen}
                                aria-controls="profile-options"
                                onClick={() => setProfileMenuOpen((open) => !open)}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        setProfileMenuOpen(false);
                                    }
                                }}
                                className="relative z-50 flex items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700">
                                    {user?.name?.charAt(0).toUpperCase() || "U"}
                                </div>

                                <div className="hidden lg:block">
                                    <p className="max-w-40 truncate text-sm font-semibold text-slate-900">
                                        {user?.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {roleLabel}
                                    </p>
                                </div>

                                <ChevronDown
                                    size={17}
                                    className={`text-slate-400 transition-transform ${profileMenuOpen ? "rotate-180" : ""
                                        }`}
                                />
                            </button>

                            {profileMenuOpen && (
                                <div
                                    id="profile-options"
                                    onKeyDown={(event) => {
                                        if (event.key === "Escape") {
                                            setProfileMenuOpen(false);
                                            event.currentTarget.parentElement
                                                ?.querySelector<HTMLButtonElement>(
                                                    '[aria-controls="profile-options"]'
                                                )
                                                ?.focus();
                                        }
                                    }}
                                    className="absolute right-0 top-full z-50 mt-3 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-xl"
                                >
                                    <div className="border-b border-slate-100 bg-teal-50/50 px-4 py-3">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {user?.name}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {roleLabel}
                                        </p>
                                    </div>

                                    <div className="p-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProfileMenuOpen(false);
                                                handleLogout();
                                            }}
                                            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                        >
                                            <LogOut size={17} />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="hospital-content p-4 sm:p-6 lg:p-8">
                    {activePage ===
                        "dashboard" && (
                            <>
                                <div className="hospital-welcome mb-8">
                                    <span className="hospital-eyebrow">CARE STARTS HERE</span>
                                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                                        {getGreeting()}
                                        {", "}
                                        {
                                            user?.name?.split(
                                                " ",
                                            )[0]
                                        }
                                    </h1>
                                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                                        A clear view of your hospital. More time for your patients.
                                    </p>
                                </div>
                                {isAdmin && (
                                    <>
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
                                                    <Users size={22} />
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
                                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
                                                <p className="text-sm font-medium text-teal-700">
                                                    Called
                                                </p>
                                                <p className="mt-2 text-3xl font-bold text-teal-900">
                                                    {
                                                        dashboardStats.calledPatients
                                                    }
                                                </p>
                                                <p className="mt-1 text-xs text-teal-600">
                                                    Patients called
                                                    by doctors
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                                                <p className="text-sm font-medium text-orange-700">
                                                    Serving
                                                </p>
                                                <p className="mt-2 text-3xl font-bold text-orange-900">
                                                    {
                                                        dashboardStats.servingPatients
                                                    }
                                                </p>
                                                <p className="mt-1 text-xs text-orange-600">
                                                    Patients currently being served
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                                                <p className="text-sm font-medium text-emerald-700">
                                                    Completed
                                                </p>
                                                <p className="mt-2 text-3xl font-bold text-emerald-900">
                                                    {
                                                        dashboardStats.completedPatients
                                                    }
                                                </p>
                                                <p className="mt-1 text-xs text-emerald-600">
                                                    Consultations
                                                    completed today
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-8 grid gap-6 xl:grid-cols-3">
                                            <div className="hospital-panel rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h2 className="font-bold text-slate-900">
                                                            Today's Queue
                                                        </h2>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            Live hospital
                                                            queue overview
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600">
                                                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                                        Live
                                                    </div>
                                                </div>
                                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                                    <QueueStat
                                                        label="Waiting"
                                                        value={
                                                            dashboardStats.waitingPatients
                                                        }
                                                    />
                                                    <QueueStat
                                                        label="Called"
                                                        value={
                                                            dashboardStats.calledPatients
                                                        }
                                                    />
                                                    <QueueStat
                                                        label="Serving"
                                                        value={
                                                            dashboardStats.servingPatients
                                                        }
                                                    />
                                                    <QueueStat
                                                        label="Completed"
                                                        value={
                                                            dashboardStats.completedPatients
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="hospital-panel rounded-2xl border border-slate-200 bg-white p-6">
                                                <h2 className="font-bold text-slate-900">
                                                    Quick Actions
                                                </h2>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Manage your
                                                    hospital
                                                </p>
                                                <div className="mt-6 space-y-3">
                                                    <QuickAction
                                                        icon={
                                                            <Building2
                                                                size={
                                                                    19
                                                                }
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
                                                            <Clock3
                                                                size={
                                                                    19
                                                                }
                                                            />
                                                        }
                                                        label="Doctor Availability"
                                                        onClick={() =>
                                                            handlePageChange(
                                                                "doctorAvailability",
                                                            )
                                                        }
                                                    />
                                                    <QuickAction
                                                        icon={
                                                            <Users
                                                                size={
                                                                    19
                                                                }
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
                                                            <UserCog
                                                                size={
                                                                    19
                                                                }
                                                            />
                                                        }
                                                        label="Manage Lab Technicians"
                                                        locked={
                                                            !isPremium
                                                        }
                                                        onClick={() =>
                                                            handlePageChange(
                                                                "labTechnicians",
                                                            )
                                                        }
                                                    />
                                                    <QuickAction
                                                        icon={
                                                            <CalendarDays
                                                                size={
                                                                    19
                                                                }
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
                                {isDoctor && (
                                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                                        <StatCard
                                            title="Serving"
                                            value={
                                                dashboardLoading
                                                    ? "..."
                                                    : String(
                                                        dashboardStats.servingPatients,
                                                    )
                                            }
                                            description="Patients currently being served"
                                            icon={
                                                <Stethoscope size={22} />
                                            }
                                        />
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
                                                <CheckCircle2
                                                    size={22}
                                                />
                                            }
                                        />
                                        <div className="hospital-panel rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2 xl:col-span-3">
                                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h2 className="font-bold text-slate-900">
                                                        My Queue
                                                    </h2>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Manage and serve
                                                        your patients.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                                    Live Queue
                                                </div>
                                            </div>
                                            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                                <QueueStat
                                                    label="Waiting"
                                                    value={
                                                        dashboardStats.waitingPatients
                                                    }
                                                />
                                                <QueueStat
                                                    label="Serving"
                                                    value={
                                                        dashboardStats.servingPatients
                                                    }
                                                />
                                                <QueueStat
                                                    label="Completed"
                                                    value={
                                                        dashboardStats.completedPatients
                                                    }
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handlePageChange(
                                                        "doctorQueue",
                                                    )
                                                }
                                                className="mt-6 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                                            >
                                                Open My Queue
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {isReceptionist && (
                                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
                                                <Stethoscope
                                                    size={22}
                                                />
                                            }
                                        />
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
                                                <CheckCircle2
                                                    size={22}
                                                />
                                            }
                                        />
                                        <div className="hospital-panel rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2 xl:col-span-4">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h2 className="font-bold text-slate-900">
                                                        Queue Overview
                                                    </h2>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Live hospital
                                                        queue status.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                                    Live
                                                </div>
                                            </div>
                                            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                <QueueStat
                                                    label="Waiting"
                                                    value={
                                                        dashboardStats.waitingPatients
                                                    }
                                                />
                                                <QueueStat
                                                    label="Called"
                                                    value={
                                                        dashboardStats.calledPatients
                                                    }
                                                />
                                                <QueueStat
                                                    label="Serving"
                                                    value={
                                                        dashboardStats.servingPatients
                                                    }
                                                />
                                                <QueueStat
                                                    label="Completed"
                                                    value={
                                                        dashboardStats.completedPatients
                                                    }
                                                />
                                            </div>
                                            <div className="mt-6">
                                                <div className="flex flex-col gap-4 rounded-2xl border border-teal-100 bg-teal-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900">
                                                            Generate Patient
                                                            Token
                                                        </h3>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            Register a new
                                                            patient or select
                                                            an existing patient
                                                            and generate their
                                                            queue token.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handlePageChange(
                                                                "generate-token",
                                                            )
                                                        }
                                                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
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
                        "doctorAvailability" && (
                            <DoctorAvailability />
                        )}
                    {isAdmin &&
                        activePage ===
                        "receptionists" && (
                            <Receptionists />
                        )}


                    {isAdmin && activePage ===
                        "display" && (
                            <DisplaySettings />
                        )}
                    {isAdmin &&
                        isPremium &&
                        activePage ===
                        "labTests" && (
                            <LabTests />
                        )}
                    {isAdmin &&
                        isPremium &&
                        activePage ===
                        "labTechnicians" && (
                            <LabTechnicians />
                        )}
                    {(isAdmin ||
                        isDoctor ||
                        isReceptionist) &&
                        activePage ===
                        "appointments" && (
                            <Appointments />
                        )}
                    {isReceptionist &&
                        activePage ===
                        "patients" && (
                            <Patients />
                        )}
                    {isReceptionist &&
                        activePage ===
                        "queue" && (
                            <Queue />
                        )}
                    {isReceptionist &&
                        activePage ===
                        "generate-token" && (
                            <GenerateToken />
                        )}
                    {isReceptionist &&
                        isPremium &&
                        activePage ===
                        "labOrders" && (
                            <LabOrders />
                        )}
                    {isLabTechnician &&
                        isPremium &&
                        activePage ===
                        "labTechnician" && (
                            <LabTechnicianDashboard />
                        )}
                    {isLabTechnician &&
                        isPremium &&
                        activePage ===
                        "labOrders" && (
                            <LabTests />
                        )}
                    {isDoctor &&
                        activePage ===
                        "doctorQueue" && (
                            <DoctorQueue />
                        )}

                    {isDoctor &&
                        activePage ===
                        "doctorAppointments" && (
                            <DoctorAppointments />
                        )}
                </main>
            </div>
        </div>
    );
};
interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    locked?: boolean;
    onClick?: () => void;
}
const NavItem = ({
    icon,
    label,
    active = false,
    locked = false,
    onClick,
}: NavItemProps) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                hospital-nav-item flex w-full items-center gap-3
                rounded-xl px-4 py-3
                text-sm font-medium transition
                ${active
                    ? "hospital-nav-active bg-teal-50 text-teal-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
            `}
        >
            {icon}
            <span className="flex-1 text-left">
                {label}
            </span>
            {locked && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                    <LockKeyhole
                        size={10}
                    />
                    Pro
                </span>
            )}
        </button>
    );
};
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
        <div className="hospital-stat rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
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
interface QueueStatProps {
    label: string;
    value: number;
}
const QueueStat = ({
    label,
    value,
}: QueueStatProps) => {
    return (
        <div data-queue-status={label} className="hospital-queue-stat rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
                {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
                {value}
            </p>
        </div>
    );
};
interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    locked?: boolean;
    onClick?: () => void;
}
const QuickAction = ({
    icon,
    label,
    locked = false,
    onClick,
}: QuickActionProps) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="
                hospital-quick-action flex w-full items-center gap-3
                rounded-xl border border-slate-200
                p-3 text-left text-sm font-medium
                text-slate-700 transition
                hover:border-teal-200
                hover:bg-teal-50
                hover:text-teal-600
            "
        >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                {icon}
            </div>
            <span className="flex-1">
                {label}
            </span>
            {locked && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase text-amber-700">
                    <LockKeyhole
                        size={10}
                    />
                    Premium
                </span>
            )}
        </button>
    );
};
const ShieldPlanIcon = () => {
    return (
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-100 text-[9px] font-bold text-teal-700">
            B
        </div>
    );
};
interface PremiumRequiredModalProps {
    onClose: () => void;
}
const PremiumRequiredModal = ({
    onClose,
}: PremiumRequiredModalProps) => {
    return (
        <div className="hospital-workspace hospital-modal fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                        <Crown size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600">
                            Premium feature
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-slate-900">
                            Upgrade to NexTurn Premium
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Laboratory management, consultation records,
                            clinical features and AI tools are available
                            only on the Premium plan.
                        </p>
                    </div>
                </div>
                <div className="mt-6 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <div>✓ Consultation records</div>
                    <div>✓ Diagnosis and prescriptions</div>
                    <div>✓ Lab tests and lab orders</div>
                    <div>✓ Lab technicians and reports</div>
                    <div>✓ AI transcription and clinical analysis</div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};
interface SubscriptionExpiredViewProps {
    plan: string;
    onLogout: () => void;
}
const SubscriptionExpiredView = ({
    plan,
    onLogout,
}: SubscriptionExpiredViewProps) => {
    return (
        <main className="hospital-workspace hospital-expired flex min-h-screen items-center justify-center bg-slate-100 p-5">
            <HospitalDesignStyles />
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl sm:p-9">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <AlertTriangle
                        size={30}
                    />
                </div>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-red-600">
                    Subscription expired
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">
                    NexTurn access needs renewal
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                    Your {plan} subscription is no longer active.
                    Your hospital data remains stored, but operational
                    features are unavailable until the subscription
                    is renewed by NexTurn Super Admin.
                </p>
                <button
                    type="button"
                    onClick={onLogout}
                    className="mt-7 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    Logout
                </button>
            </div>
        </main>
    );
};
const HospitalDesignStyles = () => (
    <style>{`
        .hospital-workspace {
            --hospital-ink: #173d3b;
            --hospital-teal: #087f73;
            background: #f5f6f2;
            color: var(--hospital-ink);
            font-family: "Inter", "Segoe UI", sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .hospital-workspace *, .hospital-workspace *::before,
        .hospital-workspace *::after { box-sizing: border-box; }
        .hospital-workspace button { cursor: pointer; }
        .hospital-workspace button:focus-visible {
            outline: 3px solid #38bdb0; outline-offset: 4px;
        }
        .hospital-sidebar {
            display: flex; flex-direction: column; width: 264px;
            height: 100dvh; background: #123d39; border: 0;
            box-shadow: 8px 0 32px #173d3b08;
        }
        .hospital-brand { height: 104px; flex-shrink: 0; border-color: #ffffff14; }
        .hospital-brand > div:first-child {
            background: #b9e9d5; color: #123d39;
            border-radius: 15px; box-shadow: 0 0 0 5px #ffffff06;
        }
        .hospital-brand h1 { color: #fff; font-size: 22px; letter-spacing: -.8px; }
        .hospital-brand p { color: #acccc4; font-size: 11px; letter-spacing: .6px; }
        .hospital-navigation { flex: 1; overflow-y: auto; padding: 24px 16px; }
        .hospital-nav-caption {
            color: #8aafa5; font-size: 10px; font-weight: 700;
            letter-spacing: 2px; padding: 0 16px 16px;
        }
        .hospital-nav-item {
            min-height: 48px; margin-bottom: 5px; color: #c5d8d3;
            border: 1px solid transparent; border-radius: 10px;
            transition: background .18s, color .18s;
        }
        .hospital-nav-item:hover { background: #ffffff0d; color: #fff; }
        .hospital-nav-item.hospital-nav-active {
            background: #d7efe3; color: #163f37; font-weight: 700;
            box-shadow: 0 4px 16px #071e2420;
        }
        .hospital-nav-item > svg { flex-shrink: 0; }
        .hospital-nav-item > span:last-child:not(:first-of-type) {
            background: #ffffff12; color: #ebd5a2;
        }
        .hospital-sidebar-footer { flex-shrink: 0; border-color: #ffffff14; }
        .hospital-sidebar-footer button { color: #e1bdb4; }
        .hospital-sidebar-footer button:hover { background: #ffffff0d; color: #fff; }
        .hospital-header {
            height: 88px; background: #fafbf8ed;
            border-color: #dfe6de; backdrop-filter: blur(16px);
        }
        .hospital-header h2 { font-size: 18px; letter-spacing: -.4px; }
        .hospital-header p { font-size: 12px; }
        .hospital-content { max-width: 1600px; margin: 0 auto; }
        .hospital-welcome {
            position: relative; overflow: hidden; padding: 30px 32px;
            border: 1px solid #dbe5d7; border-radius: 20px;
            background: linear-gradient(110deg, #eaf0e1 0%, #eef4e9 58%, #d6e8dc 100%);
        }
        .hospital-welcome::after {
            content: "+"; position: absolute; right: 30px; top: -50px;
            font-size: 240px; font-weight: 300; line-height: 1;
            color: #8bb49c25; pointer-events: none;
        }
        .hospital-welcome > * { position: relative; z-index: 1; }
        .hospital-eyebrow {
            display: block; margin-bottom: 12px; color: #4e7662;
            font-size: 10px; font-weight: 800; letter-spacing: 2px;
        }
        .hospital-welcome h1 { color: #204638; font-weight: 600; letter-spacing: -1px; }
        .hospital-welcome p { max-width: 550px; color: #5c7167; font-size: 14px; }
        .hospital-stat {
            position: relative; overflow: hidden; border-color: #e0e7df;
            padding: 24px; border-radius: 16px;
            box-shadow: 0 4px 20px #173d3b03;
        }
        .hospital-stat::before {
            content: ""; position: absolute; top: 0; left: 24px;
            width: 36px; height: 3px; border-radius: 0 0 5px 5px; background: #7bb7a6;
        }
        .hospital-stat:nth-child(2)::before { background: #9daed4; }
        .hospital-stat:nth-child(3)::before { background: #c8b185; }
        .hospital-stat:nth-child(4)::before { background: #cc9b89; }
        .hospital-stat > div:first-child > div { background: #edf4ef; color: #357a66; border-radius: 14px; }
        .hospital-stat:nth-child(2) > div:first-child > div { background: #eef0f8; color: #657ba7; }
        .hospital-stat:nth-child(3) > div:first-child > div { background: #f7f1e6; color: #957840; }
        .hospital-stat:nth-child(4) > div:first-child > div { background: #fbefe8; color: #b17659; }
        .hospital-stat h3 { color: #203e37; font-size: 38px; line-height: 1.2; letter-spacing: -1.5px; font-variant-numeric: tabular-nums; }
        .hospital-stat > p:last-child { padding-top: 12px; border-top: 1px solid #eef1eb; margin-top: 16px; }
        .hospital-panel { border-color: #e0e7df; border-radius: 18px; box-shadow: 0 4px 24px #173d3b03; }
        .hospital-panel h2 { font-size: 16px; letter-spacing: -.3px; color: #23463c; }
        .hospital-queue-stat {
            position: relative; padding: 18px 20px 18px 25px;
            border: 1px solid #e7e9df; background: #fafaf5; border-radius: 12px;
        }
        .hospital-queue-stat::before {
            content: ""; position: absolute; left: 0; top: 20px; bottom: 20px;
            width: 3px; border-radius: 0 3px 3px 0; background: #c39a48;
        }
        .hospital-queue-stat[data-queue-status="Called"] { background: #f0f5f8; border-color: #e1eaf0; }
        .hospital-queue-stat[data-queue-status="Called"]::before { background: #729aba; }
        .hospital-queue-stat[data-queue-status="Serving"] { background: #f8f0eb; border-color: #f0e4da; }
        .hospital-queue-stat[data-queue-status="Serving"]::before { background: #bf8b68; }
        .hospital-queue-stat[data-queue-status="Completed"] { background: #edf6ef; border-color: #deebdf; }
        .hospital-queue-stat[data-queue-status="Completed"]::before { background: #5a9a76; }
        .hospital-queue-stat p:first-child { color: #596e66; font-weight: 600; }
        .hospital-queue-stat p:last-child { color: #244638; font-size: 28px; font-variant-numeric: tabular-nums; }
        .hospital-quick-action { border-color: #e4e9e1; border-radius: 12px; padding: 12px; font-size: 13px; }
        .hospital-quick-action > div { background: #eef3ee; color: #58806e; }
        .hospital-quick-action:hover { background: #f0f6ef; border-color: #a8c7b3; color: #215e46; }
        .hospital-modal { background: #102c2866; }
        .hospital-expired { background: radial-gradient(ellipse at top, #deece0, #f5f6f2 70%); }
        @media (min-width: 1024px) {
            .hospital-main { margin-left: 264px; }
            .hospital-content { padding: 32px 36px; }
        }
        @media (max-width: 639px) {
            .hospital-header { height: 76px; gap: 8px; }
            .hospital-welcome { padding: 24px 20px; border-radius: 16px; }
            .hospital-welcome h1 { font-size: 25px; }
            .hospital-welcome::after { right: -10px; opacity: .5; }
            .hospital-stat { padding: 20px; }
            .hospital-panel { padding: 20px; }
        }
        @media (prefers-reduced-motion: reduce) {
            .hospital-workspace *, .hospital-workspace *::before, .hospital-workspace *::after {
                animation: none !important; transition: none !important;
            }
        }
    `}</style>
);
export default AdminDashboard;