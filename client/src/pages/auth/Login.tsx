import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    Eye,
    EyeOff,
    Lock,
    Mail,
    Loader2,
    Users,
    Clock3,
    ArrowUpRight,
    ShieldCheck,
    HeartPulse,
} from "lucide-react";

import { loginUser } from "../../services/auth.api";
import { useAuthStore } from "../../store/authStore";
import type {
    SubscriptionInfo,
} from "../../types/subscription";

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

            const subscription =
                (
                    response.data as typeof response.data & {
                        subscription?:
                            SubscriptionInfo | null;
                    }
                ).subscription ??
                null;

            // =================================================
            // SAVE AUTH
            // =================================================

            setAuth(
                token,
                user,
                subscription ?? null,
            );
            console.log("LOGIN USER:", user);
            console.log("LOGIN ROLE:", user.role);
            console.log(
                "LOGIN SUBSCRIPTION:",
                subscription,
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
                    navigate("/patient/queue", {
                        replace: true,
                    });
                    break;

                case "LAB_TECHNICIAN":
                    console.log("🚀 Navigating Lab Technician...");

                    window.location.replace("/lab/dashboard");

                    break;
                    console.log("✅ AFTER NAVIGATE");

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
        <main className="nt-login">
            <LoginDesignStyles />
            <section className="nt-login-story" aria-label="NexTurn hospital workspace">
                <div className="nt-login-story-brand"><img src="/nexturn.png" alt="NexTurn" /><span>HOSPITAL WORKSPACE</span></div>
                <div className="nt-login-story-content">
                    <span className="nt-login-eyebrow">MORE TIME FOR CARE</span>
                    <h1>A calmer day.<br /><span>A connected hospital.</span></h1>
                    <p>Bring your team, patient queues and daily operations together in one workspace.</p>
                    <div className="nt-login-care-card">
                        <div className="nt-login-care-icon"><HeartPulse size={26} strokeWidth={1.5} /></div>
                        <div><h2>Every visit, better connected.</h2><p>From the reception desk to the consultation room.</p></div>
                    </div>
                    <div className="nt-login-benefits">
                        <div><Users size={18} /><span>One workspace for your team</span></div>
                        <div><Clock3 size={18} /><span>Clearer patient queues</span></div>
                        <div><ShieldCheck size={18} /><span>Access for every hospital role</span></div>
                    </div>
                </div>
                <p className="nt-login-story-footer">NexTurn <span>Built around better patient flow.</span></p>
            </section>
            <section className="nt-login-main" aria-labelledby="login-title">
                <div className="nt-login-container">
                    <div className="nt-login-mobile-brand"><img src="/nexturn.png" alt="NexTurn" /><span>Hospital workspace</span></div>
                    <div className="nt-login-card">
                        <div className="nt-login-welcome-icon"><Lock size={23} strokeWidth={1.6} /></div>
                        <p className="nt-login-kicker">WELCOME BACK</p>
                        <h2 id="login-title">Your workspace awaits.</h2>
                        <p className="nt-login-description">Sign in with your hospital account to continue.</p>
                        {error && (
                            <div id="login-error" className="nt-login-error" role="alert">
                                <span aria-hidden="true">!</span><p>{error}</p>
                            </div>
                        )}
<form
                                onSubmit={handleSubmit}
                                className="nt-login-form space-y-5" aria-busy={loading}
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
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-teal-600"
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
                                            placeholder="you@hospital.com"
                                            autoComplete="email"
                                            inputMode="email"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                            aria-describedby={error ? "login-error" : undefined}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
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
                                            className="text-xs font-semibold text-teal-600 transition hover:text-teal-700"
                                        >
                                            Forgot password?
                                        </button>

                                    </div>


                                    <div className="group relative">

                                        <Lock
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-teal-600"
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
                                            aria-describedby={error ? "login-error" : undefined}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                                        />


                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (value) =>
                                                        !value
                                                )
                                            }
                                            className="nt-password-toggle absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                                            aria-pressed={showPassword}
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
                                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 py-4 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition duration-200 hover:-translate-y-0.5 hover:from-teal-700 hover:to-teal-800 hover:shadow-xl hover:shadow-teal-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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

                                            Sign in

                                            <ArrowUpRight
                                                size={17}
                                                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                            />

                                        </>

                                    )}

                                </button>

                            </form>
                        <div className="nt-login-card-footer"><ShieldCheck size={15} /><span>Your hospital. Your dedicated workspace.</span></div>
                    </div>
                    <p className="nt-login-help">Use the account provided by your hospital administrator.</p>
                </div>
            </section>
        </main>
    );
};

const LoginDesignStyles = () => (
    <style>{`
        .nt-login { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); min-height: 100dvh; background: #f5f6f0; color: #173d39; font-family: "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
        .nt-login *, .nt-login *::before, .nt-login *::after { box-sizing: border-box; }
        .nt-login-story { position: relative; display: flex; flex-direction: column; overflow: hidden; padding: 42px clamp(32px, 5vw, 76px); background: #123d39; }
        .nt-login-story::after { content: "+"; position: absolute; right: -35px; bottom: 30px; font-size: 340px; line-height: 1; font-weight: 200; color: #aac89b08; pointer-events: none; }
        .nt-login-story-brand { display: flex; align-items: center; gap: 16px; }
        .nt-login-story-brand img { width: 118px; height: 43px; object-fit: contain; background: #fff; padding: 6px 9px; border-radius: 9px; }
        .nt-login-story-brand > span { font-size: 9px; letter-spacing: 1.8px; color: #a3bfa9; }
        .nt-login-story-content { position: relative; z-index: 1; margin: auto 0; padding: 60px 0; max-width: 470px; }
        .nt-login-eyebrow { display: block; font-size: 10px; font-weight: 600; letter-spacing: 2px; color: #b4cca3; margin-bottom: 20px; }
        .nt-login-story h1 { color: #f7f9f2; font-size: clamp(36px, 3.5vw, 52px); line-height: 1.15; letter-spacing: -1.8px; font-weight: 500; text-wrap: balance; }
        .nt-login-story h1 span { color: #bed3ac; }
        .nt-login-story-content > p { color: #afc4b6; font-size: 14px; line-height: 1.9; margin: 24px 0 30px; max-width: 375px; }
        .nt-login-care-card { display: flex; gap: 15px; align-items: center; border: 1px solid #ffffff1c; background: #ffffff06; border-radius: 16px; padding: 20px; }
        .nt-login-care-icon { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 13px; background: #c3d5ae; color: #244b35; flex-shrink: 0; }
        .nt-login-care-card h2 { font-size: 13px; font-weight: 600; color: #e6efe0; }
        .nt-login-care-card p { font-size: 11px; line-height: 1.7; color: #9fbba7; margin-top: 5px; }
        .nt-login-benefits { display: grid; gap: 17px; margin-top: 30px; }
        .nt-login-benefits > div { display: flex; align-items: center; gap: 12px; color: #bfd0bd; font-size: 12px; }
        .nt-login-benefits svg { color: #94b28f; }
        .nt-login-story-footer { position: relative; z-index: 1; display: flex; gap: 16px; align-items: center; color: #b1c6ad; font-size: 12px; font-weight: 500; }
        .nt-login-story-footer span { color: #8aa992; font-size: 10px; font-weight: 400; }
        .nt-login-main { display: flex; align-items: center; justify-content: center; padding: 48px 28px; background: radial-gradient(ellipse at top right, #e9efdf, transparent 65%), #f5f6f0; min-width: 0; }
        .nt-login-container { width: 100%; max-width: 440px; }
        .nt-login-mobile-brand { display: none; }
        .nt-login-card { padding: 36px; border: 1px solid #dfe6d7; border-radius: 22px; background: #fff; box-shadow: 0 12px 40px #23462f06; }
        .nt-login-welcome-icon { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 15px; background: #edf3e6; color: #67805a; margin-bottom: 26px; }
        .nt-login-kicker { font-size: 9px; font-weight: 700; letter-spacing: 1.8px; color: #819277; margin-bottom: 8px; }
        .nt-login-card h2 { font-size: 28px; font-weight: 600; line-height: 1.25; letter-spacing: -.9px; color: #234633; }
        .nt-login-description { font-size: 13px; line-height: 1.7; color: #788471; margin-top: 10px; margin-bottom: 28px; }
        .nt-login-form label { text-transform: none; letter-spacing: normal; font-size: 12px; font-weight: 600; color: #465b40; }
        .nt-login-form input { min-height: 52px; border: 1px solid #dce3d6; background: #fafbf7; border-radius: 11px; color: #294332; font-size: 16px; box-shadow: none; }
        .nt-login-form input::placeholder { color: #9aa390; font-size: 14px; }
        .nt-login-form input:hover { border-color: #b7c7ab; }
        .nt-login-form input:focus { background: #fff; border-color: #7fa06c; box-shadow: 0 0 0 3px #eef4e7; outline: none; }
        .nt-login-form button { cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .nt-login-form button:focus-visible { outline: 3px solid #79a16b; outline-offset: 3px; }
        .nt-login-form button[type="submit"] { min-height: 52px; margin-top: 26px; border-radius: 11px; background: #176957; background-image: none; box-shadow: 0 3px 10px #173d390b; font-size: 14px; font-weight: 600; }
        .nt-login-form button[type="submit"]:hover:not(:disabled) { background: #104e40; transform: none; }
        .nt-login-form button[type="submit"]:disabled { cursor: not-allowed; }
        .nt-login-form button[type="submit"] > span { display: none; }
        .nt-login-form button[type="button"] { color: #658459; }
        .nt-login-form label + button { min-height: 44px; margin: -10px 0; }
        .nt-login-form .nt-password-toggle { display: grid; place-items: center; min-height: 44px; width: 44px; right: 5px; color: #819177; }
        .nt-login-card-footer { display: flex; align-items: center; justify-content: center; gap: 7px; border-top: 1px solid #edf0e6; margin-top: 26px; padding-top: 21px; color: #8b967f; font-size: 10px; }
        .nt-login-card-footer svg { flex-shrink: 0; }
        .nt-login-help { margin: 22px auto 0; color: #8b967f; text-align: center; font-size: 11px; line-height: 1.7; max-width: 310px; }
        .nt-login-error { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 22px; padding: 12px 14px; border: 1px solid #f1d3cc; background: #fcf2ee; border-radius: 10px; color: #a44c3f; }
        .nt-login-error > span { flex-shrink: 0; display: grid; place-items: center; width: 18px; height: 18px; font-size: 11px; font-weight: 700; border: 1px solid #d79d91; border-radius: 50%; margin-top: 1px; }
        .nt-login-error p { font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
        @media (max-width: 1023px) {
            .nt-login { display: block; }
            .nt-login-story { display: none; }
            .nt-login-main { min-height: 100dvh; padding: 36px 24px; }
            .nt-login-mobile-brand { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 26px; }
            .nt-login-mobile-brand img { width: 130px; height: 42px; object-fit: contain; }
            .nt-login-mobile-brand span { font-size: 10px; letter-spacing: .6px; color: #87947b; }
        }
        @media (max-width: 479px) {
            .nt-login-main { padding: 28px 18px max(24px, env(safe-area-inset-bottom)); }
            .nt-login-card { padding: 26px 22px; border-radius: 18px; }
            .nt-login-card h2 { font-size: 25px; }
            .nt-login-description { font-size: 12px; }
            .nt-login-welcome-icon { margin-bottom: 20px; }
            .nt-login-mobile-brand { margin-bottom: 22px; }
        }
        @media (max-height: 700px) and (max-width: 1023px) { .nt-login-main { align-items: flex-start; } .nt-login-mobile-brand { margin-bottom: 18px; } }
        @media (prefers-reduced-motion: reduce) { .nt-login *, .nt-login *::before, .nt-login *::after { animation: none !important; transition: none !important; } }
    `}</style>
);

export default Login;
