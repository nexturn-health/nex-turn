import { useCallback, useEffect, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Hospital,
  LogOut,
  Menu,
  Network,
  RefreshCw,
  Settings,
  ShieldCheck,
  Stethoscope,
  Ticket,
  UserCog,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { getSuperAdminDashboard, type SuperAdminDashboardData } from "../../services/superAdmin.api";
import { useAuthStore } from "../../store/authStore";
import SuperAdminHospitals from "./SuperAdminHospitals";
import SuperHospitalAdmin from "./SuperHospitalAdmin";
import SuperDoctors from "./SuperDoctors";

// =============================================================================
// Types
// =============================================================================

type SuperAdminPage =
  | "dashboard"
  | "hospitals"
  | "admins"
  | "doctors"
  | "receptionists"
  | "patients"
  | "departments"
  | "queue"
  | "reports"
  | "settings";

interface NavConfig {
  page: SuperAdminPage;
  label: string;
  icon: LucideIcon;
}

// =============================================================================
// Static config
// =============================================================================

const PAGE_TITLES: Record<SuperAdminPage, string> = {
  dashboard: "Super Admin Dashboard",
  hospitals: "Hospitals",
  admins: "Hospital Admins",
  doctors: "Doctors",
  receptionists: "Receptionists",
  patients: "Patients",
  departments: "Departments",
  queue: "Queue Monitoring",
  reports: "Reports",
  settings: "Settings",
};

const PAGE_DESCRIPTIONS: Record<SuperAdminPage, string> = {
  dashboard: "Monitor the entire NextSynq platform",
  hospitals: "Manage hospitals registered on NextSynq",
  admins: "Manage hospital administrators",
  doctors: "Monitor doctors across hospitals",
  receptionists: "Monitor reception staff",
  patients: "View platform patient statistics",
  departments: "Monitor hospital departments",
  queue: "Monitor queues across all hospitals",
  reports: "Platform reports and analytics",
  settings: "Manage Super Admin settings",
};

const PAGE_ICONS: Record<SuperAdminPage, LucideIcon> = {
  dashboard: Activity,
  hospitals: Building2,
  admins: UserCog,
  doctors: Stethoscope,
  receptionists: Users,
  patients: Users,
  departments: Network,
  queue: Ticket,
  reports: Activity,
  settings: Settings,
};

const NAV_ITEMS: NavConfig[] = [
  { page: "dashboard", label: "Dashboard", icon: Activity },
  { page: "hospitals", label: "Hospitals", icon: Building2 },
  { page: "admins", label: "Hospital Admins", icon: UserCog },
  { page: "doctors", label: "Doctors", icon: Stethoscope },
  { page: "receptionists", label: "Receptionists", icon: Users },
  { page: "patients", label: "Patients", icon: Users },
  { page: "departments", label: "Departments", icon: Network },
  { page: "queue", label: "Queue Monitoring", icon: Ticket },
  { page: "reports", label: "Reports", icon: Activity },
  { page: "settings", label: "Settings", icon: Settings },
];

const IMPLEMENTED_PAGES: Partial<Record<SuperAdminPage, ComponentType>> = {
  hospitals: SuperAdminHospitals,
  admins: SuperHospitalAdmin,
  doctors: SuperDoctors,
};

// =============================================================================
// Helpers
// =============================================================================

function toSafeNumber(value?: number | null): number {
  return typeof value === "number" ? value : 0;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || fallback;
}

// =============================================================================
// Hook: dashboard data
// =============================================================================

function useSuperAdminDashboard() {
  const [dashboard, setDashboard] = useState<SuperAdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getSuperAdminDashboard();
      if (!response?.success) {
        throw new Error(response?.message || "Unable to load dashboard");
      }

      setDashboard(response.data);
    } catch (err) {
      console.error("SUPER ADMIN DASHBOARD ERROR:", err);

      // A 401 is best handled by the auth interceptor / route guard; we just
      // surface a clearer message here rather than redirecting ourselves.
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 401
          ? "Your session has expired. Please login again."
          : getErrorMessage(err, "Unable to load dashboard"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { dashboard, loading, error, reload: load };
}

// =============================================================================
// Root component
// =============================================================================

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const { dashboard, loading, error, reload } = useSuperAdminDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState<SuperAdminPage>("dashboard");

  const goTo = (page: SuperAdminPage) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (loading && !dashboard) return <DashboardLoading />;
  if (error && !dashboard) return <DashboardError message={error} onRetry={reload} onLogout={handleLogout} />;
  if (!dashboard) return null;

  const PageComponent = IMPLEMENTED_PAGES[activePage];

  return (
    <div className="sa-design min-h-screen bg-slate-100">
      <SuperAdminStyles />
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar open={sidebarOpen} activePage={activePage} onNavigate={goTo} onLogout={handleLogout} />

      <div className="sa-main lg:ml-64">
        <DashboardHeader
          title={PAGE_TITLES[activePage]}
          description={PAGE_DESCRIPTIONS[activePage]}
          user={user}
          loading={loading}
          onRefresh={reload}
          onLogout={handleLogout}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="sa-content p-4 sm:p-6 lg:p-8">
          {activePage === "dashboard" ? (
            <DashboardContent dashboard={dashboard} />
          ) : PageComponent ? (
            <PageComponent />
          ) : (
            <PlaceholderPage page={activePage} title={PAGE_TITLES[activePage]} description={PAGE_DESCRIPTIONS[activePage]} />
          )}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;

// =============================================================================
// Loading / error states
// =============================================================================

function DashboardLoading() {
  return (
    <div className="sa-design sa-state flex min-h-screen items-center justify-center bg-slate-100">
      <div className="text-center">
        <SuperAdminStyles />
        <RefreshCw size={34} className="mx-auto animate-spin text-teal-600" />
        <p className="mt-4 text-sm text-slate-600">Loading Super Admin dashboard...</p>
      </div>
    </div>
  );
}

function DashboardError({
  message,
  onRetry,
  onLogout,
}: {
  message: string;
  onRetry: () => void;
  onLogout: () => void;
}) {
  const isSessionError = message.includes("session");

  return (
    <div className="sa-design sa-state flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <SuperAdminStyles />
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <XCircle size={28} className="text-red-600" />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-900">Unable to load dashboard</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <RefreshCw size={17} />
          Try Again
        </button>

        {isSessionError && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 block w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Sidebar / header
// =============================================================================

function Sidebar({
  open,
  activePage,
  onNavigate,
  onLogout,
}: {
  open: boolean;
  activePage: SuperAdminPage;
  onNavigate: (page: SuperAdminPage) => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className={`sa-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="sa-brand flex h-20 shrink-0 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-xl"><Hospital size={24} strokeWidth={1.7} /></div>
        <div>
          <h1 className="font-bold text-slate-900">NextSynq</h1>
          <p className="text-xs text-slate-500">Super Admin</p>
        </div>
      </div>

      <nav aria-label="Platform navigation" className="sa-navigation flex-1 space-y-1 overflow-y-auto p-4">
        <p className="sa-nav-caption">PLATFORM WORKSPACE</p>
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
          <NavItem
            key={page}
            icon={<Icon size={19} />}
            label={label}
            active={activePage === page}
            onClick={() => onNavigate(page)}
          />
        ))}
      </nav>

      <div className="sa-sidebar-footer shrink-0 border-t border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50"
        >
          <LogOut size={19} />
          Logout
        </button>
      </div>
    </aside>
  );
}

function DashboardHeader({
  title,
  description,
  user,
  loading,
  onRefresh,
  onOpenSidebar,
  onLogout,
}: {
  title: string;
  description: string;
  user: { name?: string } | null | undefined;
  loading: boolean;
  onRefresh: () => void;
  onOpenSidebar: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sa-header sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onOpenSidebar} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
          <Menu size={22} />
        </button>

        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
          <p className="hidden text-sm text-slate-500 sm:block">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh dashboard"
          className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw size={19} className={loading ? "animate-spin" : ""} />
        </button>

        <button type="button" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100">
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <details className="sa-account" onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }} onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false;
        }}>
          <summary aria-label="Account options">
            <span className="sa-avatar">{(user?.name || "S").charAt(0).toUpperCase()}</span>
            <span className="sa-account-name"><strong>{user?.name || "Super Admin"}</strong><small>Super Admin</small></span>
            <ChevronDown size={16} />
          </summary>
          <div className="sa-account-menu">
            <p>{user?.name || "Super Admin"}<small>Platform administrator</small></p>
            <button type="button" onClick={onLogout}><LogOut size={17} /> Logout</button>
          </div>
        </details>
      </div>
    </header>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`sa-nav-item flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
        active ? "bg-teal-50 text-teal-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// =============================================================================
// Dashboard content
// =============================================================================

const QUEUE_TONES = {
  blue: { background: "bg-teal-50", iconBackground: "bg-teal-100", text: "text-teal-600" },
  purple: { background: "bg-purple-50", iconBackground: "bg-purple-100", text: "text-purple-600" },
  orange: { background: "bg-orange-50", iconBackground: "bg-orange-100", text: "text-orange-600" },
  emerald: { background: "bg-emerald-50", iconBackground: "bg-emerald-100", text: "text-emerald-600" },
  red: { background: "bg-red-50", iconBackground: "bg-red-100", text: "text-red-600" },
  slate: { background: "bg-slate-50", iconBackground: "bg-slate-100", text: "text-slate-600" },
} as const;

function DashboardContent({ dashboard }: { dashboard: SuperAdminDashboardData }) {
  const { hospitals, users, patients, departments, queues } = dashboard;

  return (
    <>
      <div className="sa-welcome mb-8">
        <p className="sa-eyebrow">YOUR HOSPITAL NETWORK</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">A clear view of your platform</h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Monitor all hospitals, users, patients and queues from one place.
            </p>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Platform Live
          </div>
        </div>
      </div>

      <div className="sa-metrics grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Hospitals" value={hospitals.total} description={`${hospitals.active} active hospitals`} icon={<Building2 size={22} />} />
        <StatCard title="Total Doctors" value={users.totalDoctors} description="Doctors registered" icon={<Stethoscope size={22} />} />
        <StatCard title="Total Patients" value={patients.total} description={`${patients.today} registered today`} icon={<Users size={22} />} />
        <StatCard title="Today's Tokens" value={queues.totalTokensToday} description={`${queues.waiting} currently waiting`} icon={<Ticket size={22} />} />
      </div>

      <section className="mt-8">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">Platform Users</h2>
          <p className="mt-1 text-sm text-slate-500">Complete user statistics across all hospitals.</p>
        </div>

        <div className="sa-users grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MiniStat label="Hospital Admins" value={users.totalAdmins} />
          <MiniStat label="Doctors" value={users.totalDoctors} />
          <MiniStat label="Receptionists" value={users.totalReceptionists} />
          <MiniStat label="Super Admins" value={users.totalSuperAdmins} />
          <MiniStat label="Total Users" value={users.total} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">Today's Queue Overview</h2>
          <p className="mt-1 text-sm text-slate-500">Live queue activity across all hospitals.</p>
        </div>

        <div className="sa-queues grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <QueueCard title="Waiting" value={queues.waiting} icon={<Clock3 size={21} />} tone="blue" />
          <QueueCard title="Called" value={queues.called} icon={<Activity size={21} />} tone="purple" />
          <QueueCard title="Serving" value={queues.serving} icon={<Stethoscope size={21} />} tone="orange" />
          <QueueCard title="Completed" value={queues.completed} icon={<CheckCircle2 size={21} />} tone="emerald" />
          <QueueCard title="Skipped" value={queues.skipped} icon={<XCircle size={21} />} tone="red" />
          <QueueCard title="Total Tokens" value={queues.totalTokensToday} icon={<Ticket size={21} />} tone="slate" />
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="sa-panel rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Hospital Status</h2>
              <p className="mt-1 text-sm text-slate-500">Current hospital availability.</p>
            </div>
            <Hospital size={22} className="text-teal-600" />
          </div>

          <div className="mt-6 space-y-5">
            <StatusRow label="Active Hospitals" value={hospitals.active} total={hospitals.total} active />
            <StatusRow label="Inactive Hospitals" value={hospitals.inactive} total={hospitals.total} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <p className="text-xs font-medium text-emerald-700">Active</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-900">{toSafeNumber(hospitals.active)}</p>
            </div>

            <div className="rounded-xl bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-600" />
                <p className="text-xs font-medium text-red-700">Inactive</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-900">{toSafeNumber(hospitals.inactive)}</p>
            </div>
          </div>
        </div>

        <div className="sa-panel rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Department Overview</h2>
              <p className="mt-1 text-sm text-slate-500">Departments across all hospitals.</p>
            </div>
            <Network size={22} className="text-teal-600" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <MiniStat label="Total" value={departments.total} />
            <MiniStat label="Active" value={departments.active} />
            <MiniStat label="Inactive" value={departments.inactive} />
          </div>

          <div className="mt-6">
            <StatusRow label="Active Departments" value={departments.active} total={departments.total} active />
          </div>
        </div>
      </div>

      <div className="sa-summary mt-8 rounded-2xl bg-teal-600 p-6 text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} />
              <p className="text-sm font-medium text-teal-100">NextSynq Platform</p>
            </div>
            <h2 className="mt-2 text-xl font-bold">Platform Summary</h2>
            <p className="mt-1 text-sm text-teal-100">Overall system statistics.</p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <SummaryItem value={hospitals.total} label="Hospitals" />
            <SummaryItem value={users.total} label="Users" />
            <SummaryItem value={patients.total} label="Patients" />
            <SummaryItem value={departments.total} label="Departments" />
          </div>
        </div>
      </div>

      {dashboard.generatedAt && (
        <div className="mt-4 text-right">
          <p className="text-xs text-slate-400">Last updated: {new Date(dashboard.generatedAt).toLocaleString()}</p>
        </div>
      )}
    </>
  );
}

// =============================================================================
// Shared UI primitives
// =============================================================================

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value?: number | null;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="sa-stat rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">{icon}</div>
      <p className="mt-5 text-sm text-slate-500">{title}</p>
      <h3 className="mt-1 text-3xl font-bold text-slate-900">{toSafeNumber(value).toLocaleString()}</h3>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function QueueCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value?: number | null;
  icon: React.ReactNode;
  tone: keyof typeof QUEUE_TONES;
}) {
  const t = QUEUE_TONES[tone];

  return (
    <div data-status={title} className={`sa-queue rounded-2xl border border-slate-200 p-5 ${t.background}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.iconBackground} ${t.text}`}>{icon}</div>
        <p className={`text-sm font-medium ${t.text}`}>{title}</p>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{toSafeNumber(value).toLocaleString()}</p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  total,
  active = false,
}: {
  label: string;
  value?: number | null;
  total?: number | null;
  active?: boolean;
}) {
  const safeValue = toSafeNumber(value);
  const safeTotal = toSafeNumber(total);
  const percentage = safeTotal > 0 ? Math.round((safeValue / safeTotal) * 100) : 0;
  const tone = active ? "bg-emerald-500" : "bg-red-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-900">{safeValue}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="sa-mini rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{toSafeNumber(value).toLocaleString()}</p>
    </div>
  );
}

function SummaryItem({ value, label }: { value?: number | null; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold">{toSafeNumber(value).toLocaleString()}</p>
      <p className="text-xs text-teal-100">{label}</p>
    </div>
  );
}

function PlaceholderPage({ page, title, description }: { page: SuperAdminPage; title: string; description: string }) {
  const Icon = PAGE_ICONS[page];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <Icon size={23} />
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <p className="text-sm text-slate-500">This module is ready for implementation.</p>
      </div>
    </div>
  );
}
function SuperAdminStyles() {
  return <style>{`
    .sa-design { background: #f5f6f2; color: #173d39; font-family: "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
    .sa-design *, .sa-design *::before, .sa-design *::after { box-sizing: border-box; }
    .sa-design button { cursor: pointer; touch-action: manipulation; }
    .sa-design button:disabled { cursor: not-allowed; }
    .sa-design button:focus-visible, .sa-design summary:focus-visible { outline: 3px solid #38bdb0; outline-offset: 3px; }
    .sa-sidebar { width: 264px; height: 100dvh; background: #123d39; border: 0; }
    .sa-brand { height: 100px; border-color: #ffffff14; }
    .sa-brand > div:first-child { background: #d7e9c7; color: #234633; border-radius: 14px; }
    .sa-brand h1 { color: #fff; font-size: 22px; letter-spacing: -.7px; }
    .sa-brand p { color: #abc5b2; font-size: 11px; }
    .sa-navigation { padding: 24px 16px; }
    .sa-nav-caption { padding: 0 14px 16px; color: #8daa98; font-size: 9px; font-weight: 700; letter-spacing: 1.8px; }
    .sa-nav-item { min-height: 46px; border-radius: 10px; color: #bcd1c4; margin-bottom: 4px; font-size: 13px; }
    .sa-nav-item svg { flex-shrink: 0; }
    .sa-nav-item:hover { background: #ffffff0c; color: #fff; }
    .sa-nav-item[aria-current="page"] { background: #d7e9cc; color: #234633; font-weight: 600; }
    .sa-sidebar-footer { background: #123d39; border-color: #ffffff14; }
    .sa-sidebar-footer button { color: #ddbeb1; }
    .sa-sidebar-footer button:hover { background: #ffffff0b; }
    .sa-header { height: 88px; background: #fafbf8ef; border-color: #dfe6d9; backdrop-filter: blur(16px); gap: 12px; }
    .sa-header > div:first-child { min-width: 0; }
    .sa-header > div:last-child { flex-shrink: 0; }
    .sa-header h2 { font-size: 17px; letter-spacing: -.4px; color: #294633; }
    .sa-header p { font-size: 12px; }
    .sa-header button { min-width: 44px; min-height: 44px; }
    .sa-content { max-width: 1600px; margin: auto; }
    .sa-welcome { position: relative; padding: 28px 30px; border: 1px solid #dbe5d7; border-radius: 20px; background: linear-gradient(110deg, #eaf0e1, #eef4e9 58%, #d6e8dc); }
    .sa-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 1.8px; color: #6d8763; margin-bottom: 12px; }
    .sa-welcome h1 { color: #234633; font-weight: 600; letter-spacing: -.9px; }
    .sa-welcome p:not(.sa-eyebrow) { font-size: 13px; color: #6f8067; line-height: 1.7; }
    .sa-stat { position: relative; border-color: #dfe6d8; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px #173d3903; min-width: 0; }
    .sa-stat::before { content: ""; position: absolute; top: 0; left: 24px; width: 36px; height: 3px; border-radius: 0 0 4px 4px; background: #80a77a; }
    .sa-stat > div:first-child { background: #edf3e6; color: #5b7d50; border-radius: 13px; }
    .sa-stat:nth-child(2)::before { background: #9baaca; }
    .sa-stat:nth-child(2) > div:first-child { background: #eef0f6; color: #778aaa; }
    .sa-stat:nth-child(3)::before { background: #c4ac80; }
    .sa-stat:nth-child(3) > div:first-child { background: #f8f1e5; color: #a58853; }
    .sa-stat:nth-child(4)::before { background: #c09680; }
    .sa-stat:nth-child(4) > div:first-child { background: #f8eee7; color: #ac7c60; }
    .sa-stat h3 { font-size: 36px; letter-spacing: -1.2px; color: #294633; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .sa-stat > p:last-child { padding-top: 13px; margin-top: 16px; border-top: 1px solid #edf0e7; font-size: 11px; }
    .sa-mini { min-width: 0; background: #fafbf7; border: 1px solid #e4eadc; border-radius: 12px; }
    .sa-mini p:last-child { color: #365239; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .sa-panel { border-color: #dfe6d8; border-radius: 18px; }
    .sa-panel h2 { color: #294633; font-size: 15px; }
    .sa-panel p { line-height: 1.5; }
    .sa-queue { min-width: 0; border-color: #e2e7dc; border-radius: 14px; padding: 18px; }
    .sa-queue > div { flex-direction: column; align-items: flex-start; gap: 12px; }
    .sa-queue > p { font-size: 28px; color: #294633; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .sa-queue[data-status="Waiting"] { background: #faf5e8; border-color: #ede3ca; }
    .sa-queue[data-status="Waiting"] > div > div { background: #f4ead2; color: #977a38; }
    .sa-queue[data-status="Waiting"] > div > p { color: #947537; }
    .sa-queue[data-status="Called"] { background: #edf3f8; border-color: #dfe9ef; }
    .sa-queue[data-status="Called"] > div > div { background: #e0eaf3; color: #61829c; }
    .sa-queue[data-status="Called"] > div > p { color: #61829c; }
    .sa-queue[data-status="Serving"] { background: #faf0e9; }
    .sa-queue[data-status="Completed"] { background: #edf6eb; }
    .sa-queue[data-status="Skipped"] { background: #fbefec; }
    .sa-summary { background: #123d39; border-radius: 18px; }
    .sa-summary p[class*="teal-100"] { color: #b6cbb4; }
    .sa-state { background: radial-gradient(ellipse at top, #e5eddc, #f5f6f2 65%); }
    .sa-account { position: relative; border-left: 1px solid #dfe6d9; padding-left: 12px; }
    .sa-account summary { display: flex; align-items: center; gap: 10px; list-style: none; cursor: pointer; padding: 4px; border-radius: 10px; }
    .sa-account summary::-webkit-details-marker { display: none; }
    .sa-avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: #e4eedc; color: #4b7046; font-size: 14px; font-weight: 600; }
    .sa-account-name strong { display: block; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }
    .sa-account-name small { display: block; color: #859078; font-size: 10px; margin-top: 2px; }
    .sa-account[open] summary > svg { transform: rotate(180deg); }
    .sa-account-menu { position: absolute; right: 0; top: calc(100% + 12px); width: 220px; max-width: calc(100vw - 32px); padding: 8px; border: 1px solid #dce6d4; background: #fff; border-radius: 14px; box-shadow: 0 16px 36px #173d3918; }
    .sa-account-menu p { background: #f3f7ed; color: #345330; border-radius: 9px; padding: 12px; overflow-wrap: anywhere; font-weight: 600; }
    .sa-account-menu small { display: block; font-size: 10px; color: #7a8a70; margin-top: 4px; font-weight: 400; }
    .sa-account-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px; border-radius: 9px; margin-top: 6px; color: #ae5241; font-size: 13px; }
    .sa-account-menu button:hover { background: #fcf1ed; }
    @media (min-width: 1024px) { .sa-main { margin-left: 264px; } .sa-content { padding: 32px 36px; } }
    @media (max-width: 1199px) { .sa-account-name { display: none; } }
    @media (max-width: 639px) {
      .sa-header { height: 76px; padding: 0 12px; gap: 6px; }
      .sa-header h2 { font-size: 13px; line-height: 1.4; }
      .sa-header > div:first-child { gap: 4px; }
      .sa-header > div:last-child { gap: 2px; }
      .sa-header button:has(.lucide-bell) { display: none; }
      .sa-account { padding-left: 6px; }
      .sa-account summary { gap: 3px; }
      .sa-welcome { padding: 22px 20px; }
      .sa-welcome h1 { font-size: 24px; }
      .sa-metrics, .sa-users, .sa-queues { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .sa-stat { padding: 18px 14px; }
      .sa-stat h3 { font-size: 28px; }
      .sa-stat > p { font-size: 12px; }
      .sa-stat::before { left: 14px; }
      .sa-mini { padding: 12px; }
      .sa-queue { padding: 16px; }
      .sa-panel { padding: 20px; }
      .sa-panel .grid-cols-3 { gap: 8px; }
      .sa-panel .grid-cols-3 .sa-mini { padding: 10px 8px; }
    }
    @media (prefers-reduced-motion: reduce) { .sa-design *, .sa-design *::before, .sa-design *::after { animation: none !important; transition: none !important; } }
  `}</style>;
}
