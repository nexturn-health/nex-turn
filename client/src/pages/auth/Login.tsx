import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    Eye,
    EyeOff,
    Lock,
    Mail,
    Loader2,
    Users,
    Activity,
    Clock3,
    CheckCircle2,
    ArrowUpRight,
    ShieldCheck,
    HeartPulse,
    Wifi,
    CircleCheck,
} from "lucide-react";

import { loginUser } from "../../services/auth.api";
import { useAuthStore } from "../../store/authStore";

import {
    connectSocket,
} from "../../socket/socket";

const Login = () => {

    const navigate = useNavigate();

    const setAuth = useAuthStore(
        (state) => state.setAuth
    );

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    // =====================================================
    // LOGIN
    // =====================================================

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {

        event.preventDefault();

        setError("");

        if (!email || !password) {

            setError(
                "Please enter email and password"
            );

            return;
        }

        try {

            setLoading(true);

            const response =
                await loginUser({
                    email,
                    password,
                });

            if (!response.success) {

                setError(
                    response.message
                );

                return;
            }

            const {
                user,
                token,
            } = response.data;

            // =================================================
            // SAVE AUTH
            // =================================================

            setAuth(
                token,
                user
            );

            // =================================================
            // DOCTOR SOCKET
            // =================================================

            if (
                user.role === "DOCTOR"
            ) {

                if (
                    user?.id &&
                    user?.hospitalId
                ) {
                    connectSocket(
                        user.id,
                        user.hospitalId,
                    );
                }
            }

            // =================================================
            // ROLE NAVIGATION
            // =================================================

            switch (user.role) {

                case "SUPER_ADMIN":

                    navigate(
                        "/super-admin/dashboard",
                        {
                            replace: true,
                        }
                    );

                    break;

                case "HOSPITAL_ADMIN":

                    navigate(
                        "/admin/dashboard",
                        {
                            replace: true,
                        }
                    );

                    break;

                case "RECEPTIONIST":

                    navigate(
                        "/reception/dashboard",
                        {
                            replace: true,
                        }
                    );

                    break;

                case "DOCTOR":

                    navigate(
                        "/doctor/dashboard",
                        {
                            replace: true,
                        }
                    );

                    break;

                case "PATIENT":

                    navigate(
                        "/patient/queue",
                        {
                            replace: true,
                        }
                    );

                    break;

                default:

                    console.error(
                        "Unknown role:",
                        user.role
                    );
            }

        } catch (error: any) {

            console.error(
                "Login error:",
                error
            );

            const message =
                error?.response?.data?.message ||
                "Unable to login. Please try again.";

            setError(message);

        } finally {

            setLoading(false);

        }
    };

    // =====================================================
    // UI
    // =====================================================

    return (

        <main className="min-h-screen bg-slate-100">

            <div className="relative grid min-h-screen lg:grid-cols-2">

                {/* ================================================= */}
                {/* LEFT BLUE PRODUCT SECTION */}
                {/* ================================================= */}

                <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 lg:flex lg:flex-col">

                    {/* Background */}

                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />

                    <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-cyan-300/10 blur-3xl" />

                    <div className="absolute right-20 top-20 h-32 w-32 rounded-full border border-white/10" />

                    <div className="absolute right-32 top-32 h-16 w-16 rounded-full border border-white/10" />

                    {/* Header */}

                    <div className="relative z-10 flex items-center justify-between px-12 pt-10">

                        <div className="flex items-center gap-3">

                            <div className="flex h-14 w-36 items-center justify-center bg-white">
                                <img
                                    src="/nexturn.png"
                                    alt="NexTurn"
                                    className="h-full w-full object-contain"
                                />
                            </div>

                        </div>

                        {/* Live */}

                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-md">

                            <span className="relative flex h-2.5 w-2.5">

                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />

                            </span>

                            <span className="text-xs font-medium text-white">
                                System Online
                            </span>

                        </div>

                    </div>

                    {/* Main */}

                    <div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-10">

                        <div className="max-w-xl">

                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/10 px-4 py-2 backdrop-blur-md">

                                <Activity
                                    size={15}
                                    className="text-cyan-300"
                                />

                                <span className="text-xs font-medium text-blue-100">
                                    Smart Healthcare Operations
                                </span>

                            </div>

                            <h2 className="text-5xl font-bold leading-[1.08] tracking-tight text-white">

                                Smarter queues.

                                <br />

                                <span className="text-cyan-300">
                                    Happier patients.
                                </span>

                            </h2>

                            <p className="mt-6 max-w-lg text-base leading-7 text-blue-100">

                                NexTurn helps hospitals manage patient
                                queues, doctors, departments and real-time
                                patient flow from one powerful platform.

                            </p>

                            {/* Dashboard */}

                            <div className="relative mt-10 max-w-lg">

                                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">

                                    <div className="flex items-center justify-between">

                                        <div>

                                            <p className="text-xs text-blue-200">
                                                Today's OPD Queue
                                            </p>

                                            <div className="mt-1 flex items-center gap-2">

                                                <h3 className="text-2xl font-bold text-white">
                                                    128
                                                </h3>

                                                <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                                                    +12%
                                                </span>

                                            </div>

                                        </div>

                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">

                                            <Users
                                                size={19}
                                                className="text-blue-200"
                                            />

                                        </div>

                                    </div>

                                    <div className="mt-6">

                                        <div className="mb-2 flex justify-between">

                                            <span className="text-[11px] text-blue-200">
                                                Queue progress
                                            </span>

                                            <span className="text-[11px] font-medium text-white">
                                                72%
                                            </span>

                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-white/10">

                                            <div className="h-full w-[72%] rounded-full bg-cyan-300" />

                                        </div>

                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-3">

                                        <div className="rounded-2xl bg-white/5 p-3">

                                            <div className="flex items-center gap-2">

                                                <Clock3
                                                    size={14}
                                                    className="text-amber-300"
                                                />

                                                <span className="text-[10px] text-blue-200">
                                                    Waiting
                                                </span>

                                            </div>

                                            <p className="mt-2 text-xl font-bold text-white">
                                                24
                                            </p>

                                        </div>

                                        <div className="rounded-2xl bg-white/5 p-3">

                                            <div className="flex items-center gap-2">

                                                <Activity
                                                    size={14}
                                                    className="text-cyan-300"
                                                />

                                                <span className="text-[10px] text-blue-200">
                                                    Serving
                                                </span>

                                            </div>

                                            <p className="mt-2 text-xl font-bold text-white">
                                                08
                                            </p>

                                        </div>

                                        <div className="rounded-2xl bg-white/5 p-3">

                                            <div className="flex items-center gap-2">

                                                <CheckCircle2
                                                    size={14}
                                                    className="text-emerald-300"
                                                />

                                                <span className="text-[10px] text-blue-200">
                                                    Done
                                                </span>

                                            </div>

                                            <p className="mt-2 text-xl font-bold text-white">
                                                96
                                            </p>

                                        </div>

                                    </div>

                                </div>

                                {/* Floating token */}

                                <div className="absolute -right-8 -top-7 rounded-2xl border border-white/10 bg-white p-4 shadow-2xl">

                                    <div className="flex items-center gap-3">

                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">

                                            <span className="text-sm font-bold text-blue-700">
                                                A24
                                            </span>

                                        </div>

                                        <div>

                                            <p className="text-[10px] text-slate-400">
                                                Now serving
                                            </p>

                                            <p className="text-sm font-bold text-slate-900">
                                                Token A24
                                            </p>

                                        </div>

                                        <ArrowUpRight
                                            size={15}
                                            className="text-blue-600"
                                        />

                                    </div>

                                </div>

                                {/* Floating wait */}

                                <div className="absolute -bottom-7 -left-8 rounded-2xl border border-white/10 bg-white p-4 shadow-2xl">

                                    <div className="flex items-center gap-3">

                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">

                                            <CheckCircle2
                                                size={17}
                                                className="text-emerald-600"
                                            />

                                        </div>

                                        <div>

                                            <p className="text-[10px] text-slate-400">
                                                Average wait
                                            </p>

                                            <p className="text-sm font-bold text-slate-900">
                                                18 minutes
                                            </p>

                                        </div>

                                    </div>

                                </div>

                            </div>

                            {/* Features */}

                            <div className="mt-12 grid max-w-lg grid-cols-3 gap-6">

                                <div>

                                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">

                                        <Activity
                                            size={15}
                                            className="text-cyan-300"
                                        />

                                    </div>

                                    <p className="text-xs font-semibold text-white">
                                        Live Tracking
                                    </p>

                                    <p className="mt-1 text-[10px] leading-4 text-blue-200">
                                        Real-time queue updates
                                    </p>

                                </div>

                                <div>

                                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">

                                        <Users
                                            size={15}
                                            className="text-cyan-300"
                                        />

                                    </div>

                                    <p className="text-xs font-semibold text-white">
                                        Patient Flow
                                    </p>

                                    <p className="mt-1 text-[10px] leading-4 text-blue-200">
                                        Reduce waiting time
                                    </p>

                                </div>

                                <div>

                                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">

                                        <Clock3
                                            size={15}
                                            className="text-cyan-300"
                                        />

                                    </div>

                                    <p className="text-xs font-semibold text-white">
                                        Smart Queue
                                    </p>

                                    <p className="mt-1 text-[10px] leading-4 text-blue-200">
                                        Better OPD efficiency
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                    {/* Footer */}

                    <div className="relative z-10 px-12 pb-8">

                        <div className="flex items-center justify-between border-t border-white/10 pt-5">

                            <p className="text-xs text-blue-200">
                                © 2026 NexTurn Healthcare
                            </p>

                            <p className="text-xs text-blue-300">
                                Built for modern hospitals
                            </p>

                        </div>

                    </div>

                </section>


                {/* ================================================= */}
                {/* ZIGZAG DIVIDER */}
                {/* ================================================= */}

                <div
                    className="pointer-events-none absolute left-1/2 top-0 z-30 hidden h-full w-10 -translate-x-1/2 lg:block"
                    aria-hidden="true"
                >

                    <svg
                        viewBox="0 0 40 100"
                        preserveAspectRatio="none"
                        className="h-full w-full"
                    >

                        <polygon
                            points="
                                20,0
                                0,2
                                20,4
                                0,6
                                20,8
                                0,10
                                20,12
                                0,14
                                20,16
                                0,18
                                20,20
                                0,22
                                20,24
                                0,26
                                20,28
                                0,30
                                20,32
                                0,34
                                20,36
                                0,38
                                20,40
                                0,42
                                20,44
                                0,46
                                20,48
                                0,50
                                20,52
                                0,54
                                20,56
                                0,58
                                20,60
                                0,62
                                20,64
                                0,66
                                20,68
                                0,70
                                20,72
                                0,74
                                20,76
                                0,78
                                20,80
                                0,82
                                20,84
                                0,86
                                20,88
                                0,90
                                20,92
                                0,94
                                20,96
                                0,98
                                20,100
                                40,100
                                40,0
                            "
                            fill="white"
                        />

                    </svg>

                </div>


                {/* ================================================= */}
                {/* RIGHT LOGIN SECTION - NEW DESIGN */}
                {/* ================================================= */}

                <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-8 sm:px-10">

                    {/* ================================================= */}
                    {/* BACKGROUND DECORATION */}
                    {/* ================================================= */}

                    <div className="pointer-events-none absolute inset-0 overflow-hidden">

                        {/* Blue glow */}

                        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />

                        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-100/50 blur-3xl" />

                        {/* Grid */}

                        <div
                            className="absolute inset-0 opacity-[0.035]"
                            style={{
                                backgroundImage:
                                    "linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)",
                                backgroundSize:
                                    "32px 32px",
                            }}
                        />

                    </div>


                    <div className="relative z-10 w-full max-w-[470px]">
                        <div className="mb-6">
                        </div>
                        <div className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                                        <HeartPulse
                                            size={18}
                                            className="text-blue-600"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">
                                            NexTurn Network
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            Live hospital infrastructure
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">

                                    <span className="relative flex h-2 w-2">

                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                                        <span className="relative h-2 w-2 rounded-full bg-emerald-500" />

                                    </span>

                                    <span className="text-[10px] font-bold text-emerald-600">
                                        Operational
                                    </span>

                                </div>

                            </div>

                        </div>


                        {/* ================================================= */}
                        {/* LOGIN CARD */}
                        {/* ================================================= */}

                        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] sm:p-8">

                            {/* Card header */}

                            <div className="mb-7 flex items-start justify-between">

                                <div>

                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">
                                        Secure Login
                                    </p>

                                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                                        Access your workspace
                                    </h3>

                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">

                                    <Lock
                                        size={18}
                                        className="text-slate-500"
                                    />

                                </div>

                            </div>


                            {/* ERROR */}

                            {error && (

                                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">

                                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />

                                    <p className="text-xs leading-5 text-red-600">
                                        {error}
                                    </p>

                                </div>

                            )}


                            {/* FORM */}

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >

                                {/* EMAIL */}

                                <div>

                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600"
                                    >
                                        Email Address
                                    </label>

                                    <div className="group relative">

                                        <Mail
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600"
                                        />

                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(event) =>
                                                setEmail(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="admin@hospital.com"
                                            autoComplete="email"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                        />

                                    </div>

                                </div>


                                {/* PASSWORD */}

                                <div>

                                    <div className="mb-2 flex items-center justify-between">

                                        <label
                                            htmlFor="password"
                                            className="block text-xs font-bold uppercase tracking-wide text-slate-600"
                                        >
                                            Password
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    "/forgot-password"
                                                )
                                            }
                                            className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                                        >
                                            Forgot password?
                                        </button>

                                    </div>


                                    <div className="group relative">

                                        <Lock
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600"
                                        />

                                        <input
                                            id="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                        />


                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (value) =>
                                                        !value
                                                )
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >

                                            {showPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}

                                        </button>

                                    </div>

                                </div>


                                {/* LOGIN BUTTON */}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                                >

                                    {/* shine */}

                                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                                    {loading ? (

                                        <>

                                            <Loader2
                                                size={18}
                                                className="animate-spin"
                                            />

                                            Signing in...

                                        </>

                                    ) : (

                                        <>

                                            Sign in to NexTurn

                                            <ArrowUpRight
                                                size={17}
                                                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                            />

                                        </>

                                    )}

                                </button>

                            </form>


                            {/* ================================================= */}
                            {/* SECURITY STRIP */}
                            {/* ================================================= */}

                            <div className="mt-7 border-t border-slate-100 pt-5">

                                <div className="grid grid-cols-3 gap-2">

                                    <div className="flex flex-col items-center gap-1.5 text-center">

                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">

                                            <ShieldCheck
                                                size={15}
                                                className="text-emerald-600"
                                            />

                                        </div>

                                        <span className="text-[9px] font-semibold text-slate-400">
                                            Secure
                                        </span>

                                    </div>


                                    <div className="flex flex-col items-center gap-1.5 text-center">

                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">

                                            <Wifi
                                                size={15}
                                                className="text-blue-600"
                                            />

                                        </div>

                                        <span className="text-[9px] font-semibold text-slate-400">
                                            Real-time
                                        </span>

                                    </div>


                                    <div className="flex flex-col items-center gap-1.5 text-center">

                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50">

                                            <CircleCheck
                                                size={15}
                                                className="text-cyan-600"
                                            />

                                        </div>

                                        <span className="text-[9px] font-semibold text-slate-400">
                                            Reliable
                                        </span>

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* ================================================= */}
                        {/* MOBILE TRUST */}
                        {/* ================================================= */}

                        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-400">

                            <Lock size={12} />

                            <span>
                                Protected hospital access
                            </span>

                            <span className="text-slate-300">
                                •
                            </span>

                            <span>
                                NexTurn Healthcare
                            </span>

                        </div>

                    </div>

                </section>

            </div>

        </main>
    );
};

export default Login;
