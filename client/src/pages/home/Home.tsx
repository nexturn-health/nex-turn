import {
    Activity,
    ArrowRight,
    BarChart3,
    Bell,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock3,
    Globe2,
    LayoutDashboard,
    Mail,
    MapPin,
    Menu,
    MessageSquare,
    Monitor,
    Radio,
    ShieldCheck,
    Smartphone,
    Stethoscope,
    Tv,
    UserRound,
    Users,
    X,
    Zap,
} from "lucide-react";

import {
    useEffect,
    useRef,
    useState,
    type PointerEvent,
    type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

/* =========================================================
   HOME
========================================================= */

const Home = () => {
    const navigate = useNavigate();

    const [mobileMenu, setMobileMenu] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });

        setMobileMenu(false);
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">

            {/* =====================================================
                GLOBAL ANIMATIONS
            ===================================================== */}

            <style>
                {`
                @keyframes floatSlow {
                    0%, 100% {
                        transform: translate3d(0, 0, 0);
                    }

                    50% {
                        transform: translate3d(0, -16px, 0);
                    }
                }

                @keyframes floatReverse {
                    0%, 100% {
                        transform: translate3d(0, 0, 0);
                    }

                    50% {
                        transform: translate3d(0, 14px, 0);
                    }
                }

                @keyframes pulseGlow {
                    0%, 100% {
                        opacity: .22;
                        transform: scale(1);
                    }

                    50% {
                        opacity: .42;
                        transform: scale(1.08);
                    }
                }

                @keyframes notificationFloat {
                    0%, 100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-6px);
                    }
                }

                @keyframes shine {
                    0% {
                        transform: translateX(-140%);
                    }

                    100% {
                        transform: translateX(140%);
                    }
                }

                @keyframes queueProgress {
                    0% {
                        transform: translateX(-100%);
                    }

                    100% {
                        transform: translateX(400%);
                    }
                }

                @keyframes displayScan {
                    0% {
                        transform: translateY(-120%);
                    }

                    100% {
                        transform: translateY(500%);
                    }
                }

                @keyframes displayGlow {
                    0%, 100% {
                        opacity: .25;
                    }

                    50% {
                        opacity: .55;
                    }
                }

                @keyframes displayPulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }

                    50% {
                        transform: scale(1.15);
                        opacity: .65;
                    }
                }

                @keyframes ticker {
                    0% {
                        transform: translateX(0);
                    }

                    100% {
                        transform: translateX(-12px);
                    }
                }

                @keyframes revealUp {
                    from {
                        opacity: 0;
                        transform: translateY(25px);
                    }

                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-float-slow {
                    animation: floatSlow 6s ease-in-out infinite;
                }

                .animate-float-reverse {
                    animation: floatReverse 7s ease-in-out infinite;
                }

                .animate-pulse-glow {
                    animation: pulseGlow 5s ease-in-out infinite;
                }

                .animate-notification {
                    animation: notificationFloat 3s ease-in-out infinite;
                }

                .animate-blink {
                    animation: displayPulse 2s ease-in-out infinite;
                }

                .animate-reveal {
                    animation: revealUp .8s ease-out both;
                }

                .phone-shine {
                    animation: shine 4s ease-in-out infinite;
                }

                .queue-progress {
                    animation: queueProgress 3.5s linear infinite;
                }

                .display-scan {
                    animation: displayScan 5s linear infinite;
                }

                .display-glow {
                    animation: displayGlow 4s ease-in-out infinite;
                }

                .display-ticker {
                    animation: ticker 2s ease-in-out infinite alternate;
                }

                html {
                    scroll-behavior: smooth;
                }
                `}
            </style>

            {/* =====================================================
                NAVBAR
            ===================================================== */}

            <header
                className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled
                    ? "border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl"
                    : "bg-white/80 backdrop-blur-xl"
                    }`}
            >
                <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">

                    {/* LOGO */}

                    <button
                        type="button"
                        onClick={() =>
                            window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                            })
                        }
                        className="group flex items-center"
                    >
                        <img
                            src="/nexturn.png"
                            alt="NexTurn Smart OPD"
                            className="h-10 w-auto max-w-[170px] object-contain transition duration-300 group-hover:scale-[1.03]"
                        />
                    </button>

                    {/* DESKTOP NAV */}

                    <nav className="hidden items-center gap-7 lg:flex">

                        <NavButton onClick={() => scrollTo("features")}>
                            Platform
                        </NavButton>

                        <NavButton onClick={() => scrollTo("display")}>
                            Display
                        </NavButton>

                        <NavButton onClick={() => scrollTo("how-it-works")}>
                            How It Works
                        </NavButton>

                        <NavButton onClick={() => scrollTo("solutions")}>
                            Solutions
                        </NavButton>

                        <NavButton onClick={() => scrollTo("team")}>
                            Team
                        </NavButton>

                        <NavButton onClick={() => scrollTo("pricing")}>
                            Pricing
                        </NavButton>

                        <NavButton onClick={() => scrollTo("faq")}>
                            FAQ
                        </NavButton>

                    </nav>

                    {/* ACTIONS */}

                    <div className="hidden items-center gap-2 md:flex">

                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                            Login
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                            className="group flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-300"
                        >
                            Get Started

                            <ArrowRight
                                size={16}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </button>

                    </div>

                    {/* MOBILE */}

                    <button
                        type="button"
                        onClick={() => setMobileMenu((value) => !value)}
                        className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
                        aria-label="Toggle menu"
                    >
                        {mobileMenu ? (
                            <X size={24} />
                        ) : (
                            <Menu size={24} />
                        )}
                    </button>

                </div>

                {mobileMenu && (
                    <div className="border-t border-slate-200 bg-white px-5 py-4 shadow-xl md:hidden">

                        <div className="space-y-1">

                            <MobileNavButton onClick={() => scrollTo("features")}>
                                Platform
                            </MobileNavButton>

                            <MobileNavButton onClick={() => scrollTo("display")}>
                                Display
                            </MobileNavButton>

                            <MobileNavButton onClick={() => scrollTo("how-it-works")}>
                                How It Works
                            </MobileNavButton>

                            <MobileNavButton onClick={() => scrollTo("solutions")}>
                                Solutions
                            </MobileNavButton>

                            <MobileNavButton onClick={() => scrollTo("team")}>
                                Team
                            </MobileNavButton>

                            <MobileNavButton onClick={() => scrollTo("pricing")}>
                                Pricing
                            </MobileNavButton>

                            <MobileNavButton onClick={() => scrollTo("faq")}>
                                FAQ
                            </MobileNavButton>

                            <div className="my-3 border-t border-slate-100" />

                            <button
                                type="button"
                                onClick={() => {
                                    setMobileMenu(false);
                                    navigate("/login");
                                }}
                                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Login
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setMobileMenu(false);
                                    navigate("/register");
                                }}
                                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
                            >
                                Get Started
                            </button>

                        </div>

                    </div>
                )}

            </header>

            {/* =====================================================
                HERO
            ===================================================== */}

            <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/80 via-white to-white pt-[76px]">

                <div className="pointer-events-none absolute inset-0">

                    <div className="absolute -left-40 top-24 h-[500px] w-[500px] rounded-full bg-blue-200/40 blur-[120px] animate-pulse-glow" />

                    <div className="absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-cyan-200/30 blur-[120px] animate-pulse-glow" />

                    <div
                        className="absolute inset-0 opacity-[0.035]"
                        style={{
                            backgroundImage:
                                "linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)",
                            backgroundSize: "40px 40px",
                        }}
                    />

                </div>

                <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[.95fr_1.05fr] lg:gap-16 lg:px-8 lg:py-24">

                    <div className="animate-reveal">

                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-2 text-[11px] font-bold text-blue-700 shadow-sm">

                            <span className="relative flex h-2 w-2">

                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />

                            </span>

                            SMART OPD QUEUE MANAGEMENT

                        </div>

                        <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[62px]">

                            Run your OPD.

                            <span className="block text-blue-600">
                                Smarter. Faster.
                            </span>

                            Better for patients.

                        </h1>

                        <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                            NexTurn connects reception, doctors and patients
                            through one intelligent queue management platform.
                            Reduce waiting-room congestion and make every
                            consultation more predictable.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                            <button
                                type="button"
                                onClick={() => navigate("/register")}
                                className="group flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-200 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
                            >
                                Start Free

                                <ArrowRight
                                    size={17}
                                    className="transition-transform group-hover:translate-x-1"
                                />
                            </button>

                            <button
                                type="button"
                                onClick={() => scrollTo("display")}
                                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                            >
                                <Monitor size={15} />
                                View Live Display
                            </button>

                        </div>

                        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">

                            <HeroBenefit text="No patient app required" />

                            <HeroBenefit text="Real-time queue tracking" />

                            <HeroBenefit text="Fast deployment" />

                        </div>

                    </div>

                    <div className="relative flex min-h-[580px] items-center justify-center sm:min-h-[650px]">

                        <div className="absolute h-[390px] w-[390px] rounded-full bg-blue-200/50 blur-[100px] animate-pulse-glow" />

                        <div className="absolute left-[4%] top-[12%] h-16 w-16 rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100 animate-float-slow" />

                        <div className="absolute right-[4%] top-[22%] h-12 w-12 rounded-full bg-blue-100 animate-float-reverse" />

                        <div className="absolute bottom-[12%] left-[8%] h-10 w-10 rounded-full bg-cyan-100 animate-float-reverse" />

                        <PhoneMockup />

                    </div>

                </div>

            </section>

            {/* =====================================================
                TRUST STRIP
            ===================================================== */}

            <section className="border-y border-slate-100 bg-white">

                <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">

                    <TrustItem
                        icon={<Zap size={19} />}
                        title="Real-Time"
                        description="Live queue updates"
                    />

                    <TrustItem
                        icon={<ShieldCheck size={19} />}
                        title="Secure"
                        description="Protected access"
                    />

                    <TrustItem
                        icon={<Smartphone size={19} />}
                        title="No App"
                        description="Browser-based tracking"
                    />

                    <TrustItem
                        icon={<Tv size={19} />}
                        title="Smart Display"
                        description="TV-ready queue screen"
                    />

                </div>

            </section>

            {/* =====================================================
                DISPLAY
            ===================================================== */}

            <section
                id="display"
                className="relative scroll-mt-20 overflow-hidden bg-slate-950 py-24 sm:py-28"
            >

                <div className="pointer-events-none absolute inset-0">

                    <div className="absolute left-[-15%] top-[-20%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[140px]" />

                    <div className="absolute right-[-15%] bottom-[-25%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[140px]" />

                    <div
                        className="absolute inset-0 opacity-[0.06]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
                            backgroundSize: "44px 44px",
                        }}
                    />

                </div>

                <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    <div className="mx-auto max-w-3xl text-center">

                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">

                            <Radio size={13} />

                            Live OPD Display

                        </div>

                        <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">

                            Turn any screen into a

                            <span className="block text-blue-400">
                                smart hospital queue.
                            </span>

                        </h2>

                        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                            Connect NexTurn to a TV, monitor or reception display
                            and keep patients informed without requiring them
                            to stand at the reception desk.
                        </p>

                    </div>

                    <div className="relative mt-14">

                        <div className="display-glow absolute -inset-10 rounded-[50px] bg-blue-500/20 blur-3xl" />

                        <div className="absolute -left-2 top-[18%] z-20 hidden rounded-2xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl lg:block xl:-left-8">

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                                    <Radio size={18} />
                                </div>

                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                        System
                                    </p>

                                    <p className="mt-0.5 text-xs font-black text-white">
                                        Live & Connected
                                    </p>
                                </div>

                            </div>

                        </div>

                        <div className="absolute -right-2 bottom-[18%] z-20 hidden rounded-2xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl lg:block xl:-right-8">

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                                    <Bell size={18} />
                                </div>

                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                        Queue
                                    </p>

                                    <p className="mt-0.5 text-xs font-black text-white">
                                        Automatically Updated
                                    </p>
                                </div>

                            </div>

                        </div>

                        <div className="relative rounded-[28px] border border-white/10 bg-slate-900 p-2 shadow-[0_40px_100px_rgba(0,0,0,0.45)] sm:rounded-[34px] sm:p-3">

                            <div className="relative overflow-hidden rounded-[21px] border border-blue-400/10 bg-[#10266d] sm:rounded-[27px]">

                                <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-transparent via-white/[0.035] to-transparent display-scan" />

                                <div
                                    className="pointer-events-none absolute inset-0 opacity-[0.055]"
                                    style={{
                                        backgroundImage:
                                            "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
                                        backgroundSize: "32px 32px",
                                    }}
                                />

                                <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-[#1a337c]/80 px-5 py-4 backdrop-blur-md sm:px-8 sm:py-5">

                                    <div className="flex items-center gap-3 sm:gap-4">

                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-lg sm:h-12 sm:w-12">
                                            <span className="text-xl font-black">
                                                N
                                            </span>
                                        </div>

                                        <div>
                                            <p className="text-base font-black text-white sm:text-lg">
                                                NexTurn Hospital
                                            </p>

                                            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-200 sm:text-[10px]">
                                                Smart OPD Queue
                                            </p>
                                        </div>

                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3">

                                        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[9px] font-bold text-white sm:flex">

                                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                                            LIVE

                                        </div>

                                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[9px] font-bold text-white">

                                            <span className="hidden text-blue-200 sm:inline">
                                                Dr. Aman Singh
                                            </span>

                                            <span className="text-emerald-300">
                                                Online
                                            </span>

                                        </div>

                                        <div className="hidden text-right sm:block">

                                            <p className="text-xl font-black text-white">
                                                06:38 pm
                                            </p>

                                            <p className="text-[9px] text-blue-200">
                                                Wednesday, 02 Sept 2026
                                            </p>

                                        </div>

                                    </div>

                                </div>

                                <div className="relative z-10 grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_330px] lg:gap-6 lg:p-7">

                                    <div className="space-y-4">

                                        <div className="rounded-[22px] border border-white/10 bg-white p-5 shadow-2xl sm:rounded-[26px] sm:p-7 lg:p-8">

                                            <div className="flex items-center justify-between">

                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 sm:text-xs">
                                                    Now Serving
                                                </p>

                                                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-600">

                                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                                                    LIVE

                                                </div>

                                            </div>

                                            <div className="mt-5 flex min-h-[250px] flex-col items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-50 via-cyan-50 to-white px-4 py-7 text-center sm:min-h-[300px] lg:min-h-[330px]">

                                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-400">
                                                    Current Token
                                                </p>

                                                <p className="mt-2 text-[70px] font-black leading-none tracking-[-0.07em] text-blue-600 sm:text-[100px] lg:text-[118px]">
                                                    H-010
                                                </p>

                                                <div className="mt-4">

                                                    <p className="text-xl font-black text-slate-900 sm:text-2xl">
                                                        Hematology
                                                    </p>

                                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                                        Dr. Aman Singh
                                                    </p>

                                                </div>

                                            </div>

                                        </div>

                                        <div className="rounded-[22px] border border-white/10 bg-white p-5 shadow-xl sm:p-6">

                                            <div className="flex items-center justify-between">

                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                                                        Waiting
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        Patients currently in queue
                                                    </p>
                                                </div>

                                                <div className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-600">
                                                    2 Patients
                                                </div>

                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">

                                                <DisplayWaitingToken token="H-011" />
                                                <DisplayWaitingToken token="H-012" />
                                                <DisplayWaitingToken token="H-013" muted />
                                                <DisplayWaitingToken token="H-014" muted />

                                            </div>

                                        </div>

                                    </div>

                                    <div className="rounded-[22px] border border-white/10 bg-white p-5 shadow-2xl sm:p-6">

                                        <div className="flex items-center justify-between">

                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                                                Up Next
                                            </p>

                                            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-50 px-2 text-[10px] font-black text-blue-600">
                                                2
                                            </span>

                                        </div>

                                        <div className="mt-5 divide-y divide-slate-100">

                                            <DisplayNextToken
                                                token="H-011"
                                                department="Hematology"
                                            />

                                            <DisplayNextToken
                                                token="H-012"
                                                department="Hematology"
                                            />

                                        </div>

                                        <div className="mt-8 rounded-2xl bg-slate-50 p-4">

                                            <div className="flex items-center gap-3">

                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                                    <Clock3 size={18} />
                                                </div>

                                                <div>

                                                    <p className="text-xs font-black text-slate-900">
                                                        Please stay alert
                                                    </p>

                                                    <p className="mt-1 text-[9px] leading-4 text-slate-500">
                                                        Your token will appear here
                                                        when it is called.
                                                    </p>

                                                </div>

                                            </div>

                                        </div>

                                        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">

                                            <div className="flex items-center gap-2">

                                                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                                                    Queue Live
                                                </p>

                                            </div>

                                            <p className="mt-2 text-xs leading-5 text-blue-700/70">
                                                Display automatically refreshes
                                                when the doctor calls the next
                                                patient.
                                            </p>

                                        </div>

                                    </div>

                                </div>

                                <div className="relative z-10 flex flex-col gap-2 border-t border-white/10 bg-[#132d75]/90 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">

                                    <div className="flex items-center gap-2 text-[9px] font-semibold text-blue-100 sm:text-[10px]">

                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                                        Please listen for your token number.

                                    </div>

                                    <div className="display-ticker text-[9px] font-bold text-blue-200 sm:text-[10px]">
                                        2 patients are currently waiting.
                                    </div>

                                    <div className="text-[9px] font-semibold text-blue-300 sm:text-[10px]">
                                        NexTurn Smart Hospital Queue
                                    </div>

                                </div>

                            </div>

                        </div>

                        <div className="mx-auto hidden h-8 w-32 rounded-b-3xl bg-gradient-to-b from-slate-800 to-slate-950 shadow-xl sm:block" />

                        <div className="mx-auto hidden h-2 w-52 rounded-full bg-slate-800/80 blur-sm sm:block" />

                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                        <DisplayBenefit
                            icon={<Tv size={18} />}
                            title="Any Screen"
                            text="TV, monitor or reception display."
                        />

                        <DisplayBenefit
                            icon={<Radio size={18} />}
                            title="Real-Time"
                            text="Queue updates appear instantly."
                        />

                        <DisplayBenefit
                            icon={<Users size={18} />}
                            title="Less Crowding"
                            text="Patients can clearly see their turn."
                        />

                        <DisplayBenefit
                            icon={<Zap size={18} />}
                            title="Zero Effort"
                            text="No manual screen refreshing."
                        />

                    </div>

                </div>

            </section>

            {/* =====================================================
                PROBLEM
            ===================================================== */}

            <section className="bg-white py-20 sm:py-24">

                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    <SectionHeading
                        eyebrow="THE PROBLEM"
                        title="Healthcare should not feel like waiting in the dark."
                        description="Manual queues create unnecessary pressure for patients, reception teams and doctors."
                    />

                    <div className="mt-12 grid gap-5 md:grid-cols-3">

                        <ProblemCard
                            icon={<Users size={22} />}
                            title="Crowded Waiting Rooms"
                            description="Patients remain inside the hospital because they have no visibility into their actual turn."
                        />

                        <ProblemCard
                            icon={<Clock3 size={22} />}
                            title="Unpredictable Waiting"
                            description="Static token systems cannot accurately communicate queue movement or estimated waiting time."
                        />

                        <ProblemCard
                            icon={<MessageSquare size={22} />}
                            title="Constant Enquiries"
                            description="Reception staff repeatedly answer the same questions about token positions and waiting time."
                        />

                    </div>

                </div>

            </section>

            {/* =====================================================
                SOLUTIONS
            ===================================================== */}

            <section
                id="solutions"
                className="scroll-mt-20 bg-slate-50 py-20 sm:py-24"
            >

                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    <SectionHeading
                        eyebrow="ONE CONNECTED WORKFLOW"
                        title="Everyone sees the same queue."
                        description="NexTurn gives every role the right information at the right time."
                        centered
                    />

                    <div className="mt-12 grid gap-5 lg:grid-cols-3">

                        <SolutionCard
                            icon={<Users size={21} />}
                            title="Reception"
                            description="Control the front desk."
                            items={[
                                "Register patients",
                                "Generate tokens",
                                "Manage departments",
                                "Monitor live queues",
                            ]}
                        />

                        <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/40">

                            <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-blue-50 blur-3xl" />

                            <div className="relative">

                                <div className="flex items-center justify-between">

                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                                        <Activity size={28} />
                                    </div>

                                    <span className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600">

                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                                        ONLINE

                                    </span>

                                </div>

                                <h3 className="mt-7 text-2xl font-black text-slate-950">
                                    NexTurn
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    The central queue infrastructure
                                    connecting your entire OPD.
                                </p>

                                <div className="mt-7 space-y-3">

                                    <MiniConnection
                                        label="Reception"
                                        icon={<Users size={15} />}
                                    />

                                    <MiniConnection
                                        label="Doctor"
                                        icon={<Stethoscope size={15} />}
                                    />

                                    <MiniConnection
                                        label="Patient"
                                        icon={<Smartphone size={15} />}
                                    />

                                    <MiniConnection
                                        label="Display"
                                        icon={<Monitor size={15} />}
                                    />

                                </div>

                            </div>

                        </div>

                        <SolutionCard
                            icon={<Stethoscope size={21} />}
                            title="Doctors"
                            description="Keep consultations moving."
                            items={[
                                "View waiting patients",
                                "Call next patient",
                                "Start consultation",
                                "Complete or skip token",
                            ]}
                        />

                    </div>

                    <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                        <div className="grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto]">

                            <div>

                                <div className="flex items-center gap-3">

                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                        <Smartphone size={24} />
                                    </div>

                                    <div>

                                        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                                            Patient Experience
                                        </p>

                                        <h3 className="mt-1 text-xl font-black text-slate-950">
                                            No app. No confusion. Just a live queue.
                                        </h3>

                                    </div>

                                </div>

                                <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-500">
                                    Patients receive a secure tracking link after
                                    getting their token. They can see their queue
                                    position, current serving token and estimated
                                    waiting time from any phone.
                                </p>

                                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">

                                    <SmallCheck text="Live token position" />
                                    <SmallCheck text="Estimated wait" />
                                    <SmallCheck text="Current serving token" />
                                    <SmallCheck text="Turn notifications" />

                                </div>

                            </div>

                            <div className="hidden rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:block">

                                <div className="text-center">

                                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400">
                                        Patient Token
                                    </p>

                                    <p className="mt-1 text-4xl font-black text-blue-600">
                                        H-012
                                    </p>

                                    <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600">

                                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                                        Live

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>

            {/* =====================================================
                PLATFORM
            ===================================================== */}

            <section
                id="features"
                className="scroll-mt-20 bg-white py-24 sm:py-28"
            >

                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">

                        <div>

                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                                THE NEXTURN PLATFORM
                            </span>

                            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                                Your complete OPD command center.
                            </h2>

                            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                                Everything your hospital needs to manage patient
                                flow, monitor queues and deliver a better
                                consultation experience.
                            </p>

                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                            Explore NexTurn

                            <ArrowRight
                                size={16}
                                className="transition-transform group-hover:translate-x-1"
                            />

                        </button>

                    </div>

                    <div className="mt-14 grid gap-5 lg:grid-cols-12">

                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 lg:col-span-7">

                            <div className="border-b border-slate-200 bg-white px-6 py-5">

                                <div className="flex items-center justify-between">

                                    <div>

                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            Hospital Dashboard
                                        </p>

                                        <h3 className="mt-1 text-lg font-black text-slate-950">
                                            Today's OPD
                                        </h3>

                                    </div>

                                    <span className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600">

                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                                        LIVE

                                    </span>

                                </div>

                            </div>

                            <div className="p-5">

                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                                    <LightStat label="Patients" value="124" />
                                    <LightStat label="Waiting" value="18" />
                                    <LightStat label="Serving" value="04" />
                                    <LightStat label="Completed" value="102" />

                                </div>

                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

                                    <div className="flex items-center justify-between">

                                        <div>

                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                                LIVE QUEUE
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                General OPD
                                            </p>

                                        </div>

                                        <span className="text-xs font-semibold text-slate-400">
                                            18 waiting
                                        </span>

                                    </div>

                                    <div className="mt-4 space-y-2">

                                        <LightQueueRow
                                            token="A-38"
                                            patient="Rahul Singh"
                                            status="Serving"
                                        />

                                        <LightQueueRow
                                            token="A-39"
                                            patient="Priya Sharma"
                                            status="Waiting"
                                        />

                                        <LightQueueRow
                                            token="A-40"
                                            patient="Amit Kumar"
                                            status="Waiting"
                                        />

                                        <LightQueueRow
                                            token="A-41"
                                            patient="Neha Verma"
                                            status="Waiting"
                                        />

                                    </div>

                                </div>

                            </div>

                        </div>

                        <div className="grid gap-5 lg:col-span-5">

                            <PlatformFeatureLarge
                                icon={<Activity size={23} />}
                                title="Real-time Queue Engine"
                                description="Queue changes are reflected instantly across reception, doctors and patient tracking."
                            />

                            <PlatformFeatureLarge
                                icon={<Bell size={23} />}
                                title="Smart Notifications"
                                description="Keep patients informed with timely SMS, WhatsApp and email notifications."
                            />

                            <PlatformFeatureLarge
                                icon={<BarChart3 size={23} />}
                                title="Operational Analytics"
                                description="Understand patient volume, waiting times and daily queue performance."
                            />

                        </div>

                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                        <LightFeature
                            icon={<LayoutDashboard />}
                            title="Role Dashboards"
                            text="Separate experiences for admins, doctors and receptionists."
                        />

                        <LightFeature
                            icon={<Smartphone />}
                            title="Patient Tracking"
                            text="Live browser-based tracking without app installation."
                        />

                        <LightFeature
                            icon={<ShieldCheck />}
                            title="Access Control"
                            text="Role-based permissions keep operations organized."
                        />

                        <LightFeature
                            icon={<Globe2 />}
                            title="Multi-Hospital"
                            text="Built to support departments, branches and hospital networks."
                        />

                    </div>

                </div>

            </section>

            {/* =====================================================
                HOW IT WORKS
            ===================================================== */}

            <section
                id="how-it-works"
                className="scroll-mt-20 bg-slate-50 py-24 sm:py-28"
            >

                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    <SectionHeading
                        eyebrow="HOW IT WORKS"
                        title="A smoother patient journey in five steps."
                        description="From registration to consultation, NexTurn keeps every step connected."
                        centered
                    />

                    <div className="relative mt-14">

                        <div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-blue-100 lg:block" />

                        <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-5">

                            <Step
                                number="01"
                                icon={<UserRound size={20} />}
                                title="Register"
                                text="Reception registers the patient."
                            />

                            <Step
                                number="02"
                                icon={<Activity size={20} />}
                                title="Generate Token"
                                text="Select department and create a token."
                            />

                            <Step
                                number="03"
                                icon={<Smartphone size={20} />}
                                title="Track"
                                text="Patient receives a live tracking link."
                            />

                            <Step
                                number="04"
                                icon={<Bell size={20} />}
                                title="Notify"
                                text="Patient receives important queue updates."
                            />

                            <Step
                                number="05"
                                icon={<Stethoscope size={20} />}
                                title="Consult"
                                text="Doctor calls and serves the patient."
                            />

                        </div>

                    </div>

                </div>

            </section>

            {/* =====================================================
                OPERATIONS
            ===================================================== */}

            <section className="bg-white py-24 sm:py-28">

                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    <div className="grid items-center gap-14 lg:grid-cols-2">

                        <div>

                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                                BUILT FOR DAILY OPERATIONS
                            </span>

                            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">

                                Less administration.

                                <span className="block text-blue-600">
                                    More patient care.
                                </span>

                            </h2>

                            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                                NexTurn reduces the manual work around queue
                                management so your staff can focus on keeping
                                the OPD moving.
                            </p>

                            <div className="mt-8 space-y-5">

                                <DashboardBenefit
                                    title="Reception Dashboard"
                                    text="Register patients, generate tokens and monitor queues."
                                />

                                <DashboardBenefit
                                    title="Doctor Queue"
                                    text="Call, serve and complete patients with a clear workflow."
                                />

                                <DashboardBenefit
                                    title="Hospital Analytics"
                                    text="Understand patient volume and queue performance."
                                />

                                <DashboardBenefit
                                    title="Public Display"
                                    text="Keep patients informed through a live TV queue display."
                                />

                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/register")}
                                className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                            >
                                Start Using NexTurn

                                <ArrowRight
                                    size={16}
                                    className="transition-transform group-hover:translate-x-1"
                                />

                            </button>

                        </div>

                        <OperationsPreview />

                    </div>

                </div>

            </section>

            {/* =====================================================
                SECURITY
            ===================================================== */}

            <section className="bg-slate-50 py-20 sm:py-24">

                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    <div className="rounded-[32px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-8 shadow-sm sm:p-12">

                        <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">

                            <div>

                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                                    SECURITY & INFRASTRUCTURE
                                </span>

                                <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                    Built for modern healthcare operations.
                                </h2>

                                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                    NexTurn is designed around controlled access,
                                    secure authentication and scalable cloud
                                    infrastructure for healthcare teams.
                                </p>

                            </div>

                            <div className="grid grid-cols-2 gap-3">

                                <LightSecurityBadge
                                    icon={<ShieldCheck size={20} />}
                                    title="Secure"
                                    text="Access"
                                />

                                <LightSecurityBadge
                                    icon={<Zap size={20} />}
                                    title="Fast"
                                    text="Updates"
                                />

                                <LightSecurityBadge
                                    icon={<Users size={20} />}
                                    title="Role"
                                    text="Control"
                                />

                                <LightSecurityBadge
                                    icon={<Globe2 size={20} />}
                                    title="Cloud"
                                    text="Ready"
                                />

                            </div>

                        </div>

                    </div>

                </div>

            </section>

            {/* =====================================================
                PRICING
            ===================================================== */}

            <section
                id="pricing"
                className="scroll-mt-20 bg-white py-24 sm:py-28"
            >

                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    <SectionHeading
                        eyebrow="PRICING"
                        title="Simple plans. No complicated packages."
                        description="Start small and scale NexTurn as your clinic or hospital grows."
                        centered
                    />

                    <div className="mt-14 grid gap-5 lg:grid-cols-3">

                        <PricingCard
                            name="Starter"
                            price="₹999"
                            description="For small clinics and single-doctor OPDs."
                            features={[
                                "1 Hospital",
                                "Queue Management",
                                "Reception Dashboard",
                                "Doctor Dashboard",
                                "Patient Tracking",
                                "Basic Analytics",
                            ]}
                            onClick={() => navigate("/register")}
                        />

                        <PricingCard
                            popular
                            name="Professional"
                            price="₹2,499"
                            description="For growing clinics and multi-doctor OPDs."
                            features={[
                                "Everything in Starter",
                                "Multiple Doctors",
                                "Multiple Departments",
                                "Advanced Analytics",
                                "SMS Notifications",
                                "WhatsApp Notifications",
                                "Priority Support",
                            ]}
                            onClick={() => navigate("/register")}
                        />

                        <PricingCard
                            name="Enterprise"
                            price="Custom"
                            description="For hospitals and healthcare networks."
                            features={[
                                "Everything in Professional",
                                "Multiple Hospitals",
                                "Central Admin Dashboard",
                                "Advanced Reports",
                                "Custom Integrations",
                                "Dedicated Support",
                                "Custom Deployment",
                            ]}
                            onClick={() => scrollTo("contact")}
                        />

                    </div>

                </div>

            </section>

            {/* =====================================================
                FAQ
            ===================================================== */}

            <section
                id="faq"
                className="scroll-mt-20 bg-slate-50 py-24 sm:py-28"
            >

                <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">

                    <SectionHeading
                        eyebrow="FAQ"
                        title="Questions, answered."
                        description="Everything you need to know before getting started."
                        centered
                    />

                    <div className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 shadow-sm sm:px-8">

                        <FAQ
                            question="Do patients need to install an app?"
                            answer="No. Patients can open their secure NexTurn tracking link directly from their phone browser."
                        />

                        <FAQ
                            question="Can multiple doctors use NexTurn?"
                            answer="Yes. NexTurn can support multiple doctors and departments within a hospital or clinic."
                        />

                        <FAQ
                            question="Can patients see their queue position?"
                            answer="Yes. The patient tracking experience can show the token, current serving token, patients ahead and estimated waiting time."
                        />

                        <FAQ
                            question="Can NexTurn send notifications?"
                            answer="Yes. The platform can be connected with SMS, WhatsApp and email notification services."
                        />

                        <FAQ
                            question="Can one hospital have multiple departments?"
                            answer="Yes. Departments can have their own queues and token prefixes."
                        />

                        <FAQ
                            question="Can NexTurn work on a hospital TV?"
                            answer="Yes. NexTurn can provide a browser-based public display that can be opened on a TV, monitor or reception screen."
                        />

                    </div>

                </div>

            </section>

            {/* =====================================================
                TEAM / FOUNDERS
            ===================================================== */}

            <section
                id="team"
                className="scroll-mt-20 relative overflow-hidden bg-white py-24 sm:py-28"
            >
                {/* BACKGROUND */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-blue-100/50 blur-[120px]" />

                    <div className="absolute -right-40 bottom-10 h-[420px] w-[420px] rounded-full bg-cyan-100/40 blur-[120px]" />

                    <div
                        className="absolute inset-0 opacity-[0.025]"
                        style={{
                            backgroundImage:
                                "linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)",
                            backgroundSize: "44px 44px",
                        }}
                    />
                </div>

                <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                    {/* SECTION HEADING */}
                    <div className="mx-auto max-w-3xl text-center">

                        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                            <Users size={13} />
                            The Team
                        </span>

                        <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                            Meet the person behind
                            <span className="block text-blue-600">
                                NexTurn.
                            </span>
                        </h2>

                        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                            NexTurn is built with a simple mission — make healthcare
                            operations more predictable, connected and human for everyone
                            involved.
                        </p>

                    </div>

                    {/* FOUNDER LABEL */}
                    <div className="mt-14 flex items-center gap-4">

                        <div className="h-px flex-1 bg-slate-200" />

                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            Founder
                        </span>

                        <div className="h-px flex-1 bg-slate-200" />

                    </div>

                    {/* FOUNDER */}
                    <div className="mx-auto mt-8 max-w-4xl">

                        <FounderCard
                            image="/founder.jpeg"
                            name="Atul Singh"
                            role="Founder & CEO"
                            shortBio="Building NexTurn to make OPD management simpler, faster and more patient-friendly."
                            description="Focused on product vision, healthcare operations and building a technology platform that connects hospitals, doctors, reception teams and patients."
                            linkedin="https://www.linkedin.com/"
                            email="mailto:support@nexturn.in"
                        />

                    </div>

                    {/* BOTTOM MESSAGE */}
                    <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 text-center sm:p-8">

                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                            <Activity size={21} />
                        </div>

                        <h3 className="mt-4 text-lg font-black text-slate-950 sm:text-xl">
                            Building better healthcare experiences.
                        </h3>

                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            We believe technology should remove unnecessary waiting and
                            complexity — not add another layer to healthcare.
                        </p>

                    </div>

                </div>
            </section>

            {/* =====================================================
                CTA
            ===================================================== */}

            <section
                id="contact"
                className="relative overflow-hidden bg-gray-200 py-24 sm:py-28"
            >

                <div className="absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full bg-white/60 blur-3xl" />

                <div className="absolute -bottom-48 -right-32 h-[500px] w-[500px] rounded-full bg-blue-200/40 blur-3xl" />

                <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-300 bg-white text-blue-600 shadow-sm">
                        <Activity size={30} />
                    </div>

                    <h2 className="mt-7 text-3xl font-black tracking-tight text-gray-900 sm:text-5xl">

                        Give your patients

                        <span className="block text-blue-600">
                            their time back.
                        </span>

                    </h2>

                    <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                        Make your OPD more predictable for patients and easier
                        to manage for your staff with NexTurn.
                    </p>

                    <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                            className="group flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
                        >
                            Get Started

                            <ArrowRight
                                size={17}
                                className="transition-transform group-hover:translate-x-1"
                            />

                        </button>

                        <button
                            type="button"
                            onClick={() => scrollTo("display")}
                            className="rounded-xl border border-gray-300 bg-white px-7 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                            View Display
                        </button>

                    </div>

                </div>

            </section>

            {/* =====================================================
                FOOTER
            ===================================================== */}

            <footer className="border-t border-slate-200 bg-white">

                <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-16">

                    <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">

                        {/* BRAND */}

                        <div>

                            <button
                                type="button"
                                onClick={() =>
                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    })
                                }
                                className="group flex items-center"
                            >

                                <img
                                    src="/nexturn.png"
                                    alt="NexTurn Smart OPD"
                                    className="h-10 w-auto max-w-[175px] object-contain transition duration-300 group-hover:scale-[1.03]"
                                />

                            </button>

                            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
                                Smart OPD queue management for modern clinics
                                and hospitals. Reduce waiting, improve patient
                                flow and create a better healthcare experience.
                            </p>

                            <div className="mt-6 space-y-3">

                                <FooterContact
                                    icon={<Mail size={15} />}
                                    text="support@nexturn.in"
                                />

                                <FooterContact
                                    icon={<MapPin size={15} />}
                                    text="India"
                                />

                            </div>

                            <div className="mt-7 flex items-center gap-3">

                                <a
                                    href="https://www.linkedin.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="NexTurn on LinkedIn"
                                    className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-600 hover:text-white"
                                >
                                    <svg
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M20.447 20.452H16.893V14.883C16.893 13.555 16.866 11.848 15.041 11.848C13.188 11.848 12.905 13.291 12.905 14.78V20.452H9.351V9H12.761V10.561H12.808C13.283 9.661 14.443 8.711 16.175 8.711C19.776 8.711 20.448 11.081 20.448 14.166V20.452H20.447ZM5.337 7.433C4.193 7.433 3.271 6.507 3.271 5.368C3.271 4.229 4.193 3.303 5.337 3.303C6.477 3.303 7.404 4.229 7.404 5.368C7.404 6.507 6.477 7.433 5.337 7.433ZM7.119 20.452H3.555V9H7.119V20.452ZM22.225 0H1.771C0.792 0 0 0.774 0 1.729V22.271C0 23.228 0.792 24 1.771 24H22.222C23.2 24 24 23.228 24 22.271V1.729C24 0.774 23.2 0 22.225 0Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </a>

                                <a
                                    href="https://www.instagram.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="NexTurn on Instagram"
                                    className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-pink-200 hover:bg-pink-500 hover:text-white"
                                >
                                    <InstagramIcon />
                                </a>

                            </div>

                        </div>

                        <FooterColumn
                            title="Platform"
                            links={[
                                ["Features", "features"],
                                ["Display", "display"],
                                ["How It Works", "how-it-works"],
                                ["Pricing", "pricing"],
                            ]}
                            scrollTo={scrollTo}
                        />

                        <FooterColumn
                            title="Solutions"
                            links={[
                                ["For Clinics", "solutions"],
                                ["For Hospitals", "solutions"],
                                ["Doctors", "solutions"],
                                ["Reception Teams", "solutions"],
                                ["Patients", "solutions"],
                            ]}
                            scrollTo={scrollTo}
                        />

                        <FooterColumn
                            title="Company"
                            links={[
                                ["About NexTurn", "team"],
                                ["Founders", "team"],
                                ["Contact", "contact"],
                                ["FAQ", "faq"],
                                ["Privacy", "contact"],
                                ["Terms", "contact"],
                            ]}
                            scrollTo={scrollTo}
                        />

                    </div>

                    <div className="my-12 h-px bg-slate-200" />

                    <div className="grid gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-7">

                        <div>

                            <p className="text-sm font-bold text-slate-900">
                                Stay updated with NexTurn
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                Product updates, healthcare technology and
                                queue management insights.
                            </p>

                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">

                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

                                <Mail
                                    size={16}
                                    className="text-slate-400"
                                />

                                <input
                                    type="email"
                                    placeholder="Your email address"
                                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:w-56"
                                />

                            </div>

                            <button
                                type="button"
                                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                                Subscribe
                            </button>

                        </div>

                    </div>

                    <div className="mt-10 flex flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">

                        <p className="text-slate-500">
                            © {new Date().getFullYear()} NexTurn. All rights reserved.
                        </p>

                        <div className="flex flex-wrap items-center gap-5 text-slate-500">

                            <button
                                type="button"
                                onClick={() => scrollTo("contact")}
                                className="transition hover:text-slate-900"
                            >
                                Privacy Policy
                            </button>

                            <button
                                type="button"
                                onClick={() => scrollTo("contact")}
                                className="transition hover:text-slate-900"
                            >
                                Terms of Service
                            </button>

                            <span className="hidden h-3 w-px bg-slate-300 sm:block" />

                            <span className="flex items-center gap-1.5">

                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                System Online

                            </span>

                        </div>

                    </div>

                </div>

            </footer>

        </div>
    );
};

/* =========================================================
   PHONE MOCKUP
========================================================= */

const PhoneMockup = () => {

    const phoneRef = useRef<HTMLDivElement>(null);

    const [transform, setTransform] = useState(
        "perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(-2deg)"
    );

    const handlePointerMove = (
        event: PointerEvent<HTMLDivElement>
    ) => {

        const element = phoneRef.current;

        if (!element) return;

        const rect = element.getBoundingClientRect();

        const x =
            (event.clientX - rect.left) / rect.width;

        const y =
            (event.clientY - rect.top) / rect.height;

        const rotateY = (x - 0.5) * 15;
        const rotateX = (0.5 - y) * 15;

        setTransform(
            `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(-2deg)`
        );
    };

    const resetPhone = () => {
        setTransform(
            "perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(-2deg)"
        );
    };

    return (
        <div
            ref={phoneRef}
            className="relative z-10 cursor-pointer select-none"
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPhone}
            onPointerCancel={resetPhone}
            style={{
                transform,
                transition: "transform 180ms ease-out",
            }}
        >

            <div className="absolute -bottom-10 left-1/2 h-20 w-[260px] -translate-x-1/2 rounded-full bg-blue-200/50 blur-2xl" />

            <div className="relative h-[590px] w-[292px] rounded-[42px] border-[7px] border-slate-900 bg-slate-900 p-[5px] shadow-[0_35px_80px_rgba(15,23,42,0.25)] sm:h-[650px] sm:w-[320px]">

                <div className="absolute -left-[10px] top-28 h-14 w-1 rounded-l-full bg-slate-700" />

                <div className="absolute -left-[10px] top-44 h-20 w-1 rounded-l-full bg-slate-700" />

                <div className="absolute -right-[10px] top-36 h-20 w-1 rounded-r-full bg-slate-700" />

                <div className="relative h-full overflow-hidden rounded-[34px] bg-slate-50">

                    <div className="phone-shine pointer-events-none absolute inset-y-0 left-0 z-30 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="absolute left-1/2 top-2 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-slate-950">

                        <div className="absolute right-3 top-2 h-2 w-2 rounded-full bg-slate-700" />

                    </div>

                    <div className="border-b border-slate-200 bg-white px-4 pb-4 pt-10">

                        <div className="flex items-center justify-between">

                            <div className="flex items-center gap-2.5">

                                <img
                                    src="/nexturn.png"
                                    alt="NexTurn"
                                    className="h-9 w-9 rounded-lg object-contain"
                                />

                                <div>

                                    <p className="text-sm font-black text-slate-950">
                                        NexTurn
                                    </p>

                                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                        Smart OPD
                                    </p>

                                </div>

                            </div>

                            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-600">

                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                                Live

                            </div>

                        </div>

                    </div>

                    <div className="h-full overflow-hidden px-3 pb-10 pt-3">

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">

                            <div className="flex gap-2.5">

                                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />

                                <div>

                                    <p className="text-[11px] font-black leading-4 text-emerald-800">
                                        Dr. Aman Singh is online
                                    </p>

                                    <p className="mt-1 text-[9px] leading-4 text-emerald-700">
                                        Your queue will update automatically.
                                    </p>

                                </div>

                            </div>

                        </div>

                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">

                            <p className="text-[9px] font-medium text-slate-400">
                                Hello,
                            </p>

                            <p className="mt-0.5 text-lg font-black text-slate-950">
                                Peter
                            </p>

                            <p className="mt-1 text-[9px] text-slate-500">
                                Your appointment with{" "}
                                <span className="font-bold text-slate-900">
                                    Dr. Aman Singh
                                </span>
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2">

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

                                    <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                                        Department
                                    </p>

                                    <p className="mt-2 text-xs font-black text-slate-900">
                                        Hematology
                                    </p>

                                </div>

                                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">

                                    <p className="text-[8px] font-bold uppercase tracking-wide text-blue-500">
                                        Token
                                    </p>

                                    <p className="mt-1 text-[25px] font-black tracking-tight text-blue-600">
                                        H-012
                                    </p>

                                </div>

                            </div>

                            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-200">

                                <Activity
                                    size={15}
                                    className="animate-spin"
                                />

                                Refresh Queue

                            </div>

                        </div>

                        <div className="mt-3 rounded-2xl bg-blue-600 px-4 py-5 text-center text-white shadow-lg shadow-blue-200">

                            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-100">
                                Currently Serving
                            </p>

                            <p className="mt-2 text-3xl font-black">
                                H-009
                            </p>

                            <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] text-blue-100">

                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />

                                Live doctor queue

                            </div>

                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">

                            <MiniPhoneStat
                                icon={<Users size={16} />}
                                label="Patients Ahead"
                                value="3"
                            />

                            <MiniPhoneStat
                                icon={<Clock3 size={16} />}
                                label="Estimated Wait"
                                value="9 min"
                            />

                        </div>

                        <div className="animate-notification mt-3 rounded-2xl border border-blue-100 bg-white p-4 text-center shadow-sm">

                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <Clock3 size={19} />
                            </div>

                            <p className="mt-3 text-sm font-black text-slate-950">
                                You Are In The Queue
                            </p>

                            <p className="mt-1 text-[9px] leading-4 text-slate-500">
                                Please wait for your turn.
                            </p>

                        </div>

                    </div>

                </div>

            </div>

            <div className="absolute -right-16 top-[25%] hidden w-48 animate-notification rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:block">

                <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Bell size={17} />
                    </div>

                    <div>

                        <p className="text-[10px] font-black text-slate-900">
                            Queue Updated
                        </p>

                        <p className="mt-0.5 text-[9px] text-slate-500">
                            3 patients ahead
                        </p>

                    </div>

                </div>

            </div>

            <div className="absolute -left-14 bottom-[18%] hidden animate-float-slow rounded-2xl border border-blue-100 bg-white p-3 shadow-xl sm:block">

                <p className="text-[9px] font-semibold text-slate-400">
                    YOUR TOKEN
                </p>

                <p className="mt-1 text-xl font-black text-blue-600">
                    H-012
                </p>

            </div>

        </div>
    );
};

/* =========================================================
   FOUNDER CARD
========================================================= */

const FounderCard = ({
    image,
    name,
    role,
    shortBio,
    description,
    linkedin,
    email,
}: {
    image: string;
    name: string;
    role: string;
    shortBio: string;
    description: string;
    linkedin: string;
    email: string;
}) => {
    return (
        <article className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100/60">

            {/* IMAGE */}

            <div className="relative aspect-[4/4.3] overflow-hidden bg-slate-100">

                <img
                    src={image}
                    alt={name}
                    className="h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-105"
                    onError={(event) => {
                        event.currentTarget.src =
                            "/founder-placeholder.svg";
                    }}
                />

                {/* NORMAL GRADIENT */}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-100 transition duration-500 group-hover:opacity-0" />

                {/* HOVER OVERLAY */}

                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-blue-950/95 via-blue-900/85 to-blue-700/30 p-6 opacity-0 transition-all duration-500 group-hover:opacity-100 sm:p-7">

                    <div className="translate-y-5 transition duration-500 group-hover:translate-y-0">

                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-blue-100 backdrop-blur-md">

                            <Activity size={12} />

                            Founder

                        </div>

                        <h3 className="text-2xl font-black text-white sm:text-3xl">
                            {name}
                        </h3>

                        <p className="mt-1 text-sm font-bold text-blue-200">
                            {role}
                        </p>

                        <p className="mt-4 text-xs leading-6 text-blue-50/85 sm:text-sm">
                            {description}
                        </p>

                        <div className="mt-6 flex items-center gap-2">

                            <a
                                href={linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${name} LinkedIn`}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white hover:text-blue-700"
                            >
                                <svg
                                    width="17"
                                    height="17"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M20.447 20.452H16.893V14.883C16.893 13.555 16.866 11.848 15.041 11.848C13.188 11.848 12.905 13.291 12.905 14.78V20.452H9.351V9H12.761V10.561H12.808C13.283 9.661 14.443 8.711 16.175 8.711C19.776 8.711 20.448 11.081 20.448 14.166V20.452H20.447ZM5.337 7.433C4.193 7.433 3.271 6.507 3.271 5.368C3.271 4.229 4.193 3.303 5.337 3.303C6.477 3.303 7.404 4.229 7.404 5.368C7.404 6.507 6.477 7.433 5.337 7.433ZM7.119 20.452H3.555V9H7.119V20.452ZM22.225 0H1.771C0.792 0 0 0.774 0 1.729V22.271C0 23.228 0.792 24 1.771 24H22.222C23.2 24 24 23.228 24 22.271V1.729C24 0.774 23.2 0 22.225 0Z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </a>

                            <a
                                href={email}
                                aria-label={`Email ${name}`}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white hover:text-blue-700"
                            >
                                <Mail size={17} />
                            </a>

                        </div>

                    </div>

                </div>

                {/* ROLE BADGE */}

                <div className="absolute bottom-5 left-5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md transition duration-500 group-hover:opacity-0">

                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-100">
                        {role}
                    </p>

                </div>

            </div>

            {/* MOBILE / DEFAULT DETAILS */}

            <div className="p-6 sm:p-7">

                <div className="flex items-start justify-between gap-4">

                    <div>

                        <h3 className="text-xl font-black text-slate-950">
                            {name}
                        </h3>

                        <p className="mt-1 text-xs font-bold text-blue-600">
                            {role}
                        </p>

                    </div>

                    <div className="flex shrink-0 items-center gap-2">

                        <a
                            href={linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${name} LinkedIn`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                            <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M20.447 20.452H16.893V14.883C16.893 13.555 16.866 11.848 15.041 11.848C13.188 11.848 12.905 13.291 12.905 14.78V20.452H9.351V9H12.761V10.561H12.808C13.283 9.661 14.443 8.711 16.175 8.711C19.776 8.711 20.448 11.081 20.448 14.166V20.452H20.447ZM5.337 7.433C4.193 7.433 3.271 6.507 3.271 5.368C3.271 4.229 4.193 3.303 5.337 3.303C6.477 3.303 7.404 4.229 7.404 5.368C7.404 6.507 6.477 7.433 5.337 7.433ZM7.119 20.452H3.555V9H7.119V20.452ZM22.225 0H1.771C0.792 0 0 0.774 0 1.729V22.271C0 23.228 0.792 24 1.771 24H22.222C23.2 24 24 23.228 24 22.271V1.729C24 0.774 23.2 0 22.225 0Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </a>

                        <a
                            href={email}
                            aria-label={`Email ${name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                            <Mail size={15} />
                        </a>

                    </div>

                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                    {shortBio}
                </p>

                <div className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">

                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                    Building NexTurn

                </div>

            </div>

        </article>
    );
};

/* =========================================================
   DISPLAY WAITING TOKEN
========================================================= */

const DisplayWaitingToken = ({
    token,
    muted = false,
}: {
    token: string;
    muted?: boolean;
}) => (
    <div
        className={`rounded-xl border px-4 py-2.5 text-xs font-black ${muted
            ? "border-slate-100 bg-slate-50 text-slate-400"
            : "border-blue-100 bg-blue-50 text-blue-600"
            }`}
    >
        {token}
    </div>
);

/* =========================================================
   DISPLAY NEXT TOKEN
========================================================= */

const DisplayNextToken = ({
    token,
    department,
}: {
    token: string;
    department: string;
}) => (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">

        <div>

            <p className="text-2xl font-black tracking-tight text-blue-600">
                {token}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
                {department}
            </p>

        </div>

        <ChevronRight
            size={18}
            className="text-slate-300"
        />

    </div>
);

/* =========================================================
   DISPLAY BENEFIT
========================================================= */

const DisplayBenefit = ({
    icon,
    title,
    text,
}: {
    icon: ReactNode;
    title: string;
    text: string;
}) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
            {icon}
        </div>

        <h3 className="mt-4 text-sm font-bold text-white">
            {title}
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-500">
            {text}
        </p>

    </div>
);

/* =========================================================
   OPERATIONS PREVIEW
========================================================= */

const OperationsPreview = () => (
    <div className="relative">

        <div className="absolute -inset-8 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="relative rounded-[28px] border border-slate-200 bg-white p-3 shadow-2xl">

            <div className="rounded-[22px] bg-slate-50 p-5 sm:p-6">

                <div className="flex items-center justify-between">

                    <div>

                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Live Operations
                        </p>

                        <p className="mt-1 text-lg font-black text-slate-950">
                            OPD Queue Monitor
                        </p>

                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-500 shadow-sm">
                        Today
                    </div>

                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">

                    <OperationStat label="Waiting" value="18" />
                    <OperationStat label="Serving" value="04" />
                    <OperationStat label="Done" value="102" />

                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-[10px] font-bold text-slate-500">
                            Queue Progress
                        </span>

                        <span className="text-[10px] font-bold text-emerald-600">
                            82%
                        </span>

                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">

                        <div className="relative h-full w-[82%] overflow-hidden rounded-full bg-blue-500">

                            <div className="queue-progress absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                        </div>

                    </div>

                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">

                    <MiniDoctorCard
                        doctor="Dr. Aman Singh"
                        department="Hematology"
                        serving="H-009"
                    />

                    <MiniDoctorCard
                        doctor="Dr. Priya Sharma"
                        department="General OPD"
                        serving="G-018"
                    />

                </div>

            </div>

        </div>

    </div>
);

/* =========================================================
   MINI DOCTOR CARD
========================================================= */

const MiniDoctorCard = ({
    doctor,
    department,
    serving,
}: {
    doctor: string;
    department: string;
    serving: string;
}) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">

        <div className="flex items-center gap-2">

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Stethoscope size={15} />
            </div>

            <div className="min-w-0">

                <p className="truncate text-[9px] font-bold text-slate-900">
                    {doctor}
                </p>

                <p className="truncate text-[8px] text-slate-400">
                    {department}
                </p>

            </div>

        </div>

        <div className="mt-3 flex items-center justify-between">

            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Serving
            </span>

            <span className="text-sm font-black text-blue-600">
                {serving}
            </span>

        </div>

    </div>
);

/* =========================================================
   OPERATION STAT
========================================================= */

const OperationStat = ({
    label,
    value,
}: {
    label: string;
    value: string;
}) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">

        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
        </p>

        <p className="mt-2 text-2xl font-black text-slate-950">
            {value}
        </p>

    </div>
);

/* =========================================================
   LIGHT STAT
========================================================= */

const LightStat = ({
    label,
    value,
}: {
    label: string;
    value: string;
}) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">

        <p className="text-[9px] font-semibold text-slate-400">
            {label}
        </p>

        <p className="mt-1 text-xl font-black text-slate-950">
            {value}
        </p>

    </div>
);

/* =========================================================
   LIGHT QUEUE ROW
========================================================= */

const LightQueueRow = ({
    token,
    patient,
    status,
}: {
    token: string;
    patient: string;
    status: "Serving" | "Waiting";
}) => (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50">

        <div className="flex items-center gap-3">

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-black text-blue-600">
                {token.replace("A-", "")}
            </div>

            <div>

                <p className="text-xs font-bold text-slate-700">
                    {patient}
                </p>

                <p className="text-[9px] text-slate-400">
                    Token {token}
                </p>

            </div>

        </div>

        <span
            className={`rounded-full px-2 py-1 text-[8px] font-bold ${status === "Serving"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-blue-50 text-blue-600"
                }`}
        >
            {status.toUpperCase()}
        </span>

    </div>
);

/* =========================================================
   PLATFORM FEATURE
========================================================= */

const PlatformFeatureLarge = ({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) => (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl">

        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-50 blur-3xl transition group-hover:bg-blue-100" />

        <div className="relative">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-110">
                {icon}
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-950">
                {title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
                {description}
            </p>

        </div>

    </div>
);

/* =========================================================
   LIGHT FEATURE
========================================================= */

const LightFeature = ({
    icon,
    title,
    text,
}: {
    icon: ReactNode;
    title: string;
    text: string;
}) => (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-110">
            {icon}
        </div>

        <h3 className="mt-4 text-sm font-bold text-slate-950">
            {title}
        </h3>

        <p className="mt-2 text-xs leading-6 text-slate-500">
            {text}
        </p>

    </div>
);

/* =========================================================
   MINI CONNECTION
========================================================= */

const MiniConnection = ({
    icon,
    label,
}: {
    icon: ReactNode;
    label: string;
}) => (
    <div className="flex items-center justify-between">

        <div className="flex items-center gap-2">

            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                {icon}
            </div>

            <span className="text-xs font-bold text-slate-700">
                {label}
            </span>

        </div>

        <CheckCircle2
            size={15}
            className="text-emerald-500"
        />

    </div>
);

/* =========================================================
   MINI PHONE STAT
========================================================= */

const MiniPhoneStat = ({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3">

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            {icon}
        </div>

        <p className="mt-2 text-[8px] font-bold uppercase tracking-wide text-slate-400">
            {label}
        </p>

        <p className="mt-1 text-xl font-black text-slate-950">
            {value}
        </p>

    </div>
);

/* =========================================================
   NAV BUTTON
========================================================= */

const NavButton = ({
    children,
    onClick,
}: {
    children: ReactNode;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="text-sm font-semibold text-slate-600 transition hover:text-blue-600"
    >
        {children}
    </button>
);

/* =========================================================
   MOBILE NAV
========================================================= */

const MobileNavButton = ({
    children,
    onClick,
}: {
    children: ReactNode;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
    >
        {children}
    </button>
);

/* =========================================================
   HERO BENEFIT
========================================================= */

const HeroBenefit = ({
    text,
}: {
    text: string;
}) => (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">

        <Check
            size={15}
            className="text-emerald-500"
            strokeWidth={2.5}
        />

        {text}

    </div>
);

/* =========================================================
   SECTION HEADING
========================================================= */

const SectionHeading = ({
    eyebrow,
    title,
    description,
    centered = false,
}: {
    eyebrow: string;
    title: string;
    description: string;
    centered?: boolean;
}) => (
    <div
        className={`${centered ? "mx-auto text-center" : ""} max-w-2xl`}
    >

        <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            {eyebrow}
        </span>

        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {title}
        </h2>

        <p className="mt-4 text-base leading-7 text-slate-600">
            {description}
        </p>

    </div>
);

/* =========================================================
   TRUST ITEM
========================================================= */

const TrustItem = ({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) => (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 md:border-b-0 md:px-7">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            {icon}
        </div>

        <div>

            <p className="text-xs font-bold text-slate-900 sm:text-sm">
                {title}
            </p>

            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                {description}
            </p>

        </div>

    </div>
);

/* =========================================================
   PROBLEM CARD
========================================================= */

const ProblemCard = ({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) => (
    <div className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-110">
            {icon}
        </div>

        <h3 className="mt-5 text-lg font-bold text-slate-950">
            {title}
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-500">
            {description}
        </p>

    </div>
);

/* =========================================================
   SOLUTION CARD
========================================================= */

const SolutionCard = ({
    icon,
    title,
    description,
    items,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    items: string[];
}) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

        <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {icon}
            </div>

            <div>

                <h3 className="font-black text-slate-950">
                    {title}
                </h3>

                <p className="text-xs text-slate-400">
                    {description}
                </p>

            </div>

        </div>

        <div className="mt-5 space-y-3">

            {items.map((item) => (

                <div
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-slate-600"
                >

                    <CheckCircle2
                        size={16}
                        className="shrink-0 text-emerald-500"
                    />

                    {item}

                </div>

            ))}

        </div>

    </div>
);

/* =========================================================
   SMALL CHECK
========================================================= */

const SmallCheck = ({
    text,
}: {
    text: string;
}) => (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">

        <Check
            size={14}
            className="text-emerald-500"
            strokeWidth={2.5}
        />

        {text}

    </div>
);

/* =========================================================
   STEP
========================================================= */

const Step = ({
    number,
    icon,
    title,
    text,
}: {
    number: string;
    icon: ReactNode;
    title: string;
    text: string;
}) => (
    <div className="group relative z-10 text-center">

        <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 transition duration-300 group-hover:scale-110">
            {icon}
        </div>

        <div className="mt-5 text-xs font-black tracking-widest text-blue-600">
            {number}
        </div>

        <h3 className="mt-2 text-base font-bold text-slate-950">
            {title}
        </h3>

        <p className="mt-2 text-xs leading-6 text-slate-500">
            {text}
        </p>

    </div>
);

/* =========================================================
   DASHBOARD BENEFIT
========================================================= */

const DashboardBenefit = ({
    title,
    text,
}: {
    title: string;
    text: string;
}) => (
    <div className="flex gap-3">

        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Check size={15} />
        </div>

        <div>

            <p className="text-sm font-bold text-slate-900">
                {title}
            </p>

            <p className="mt-1 text-sm text-slate-500">
                {text}
            </p>

        </div>

    </div>
);

/* =========================================================
   LIGHT SECURITY BADGE
========================================================= */

const LightSecurityBadge = ({
    icon,
    title,
    text,
}: {
    icon: ReactNode;
    title: string;
    text: string;
}) => (
    <div className="rounded-2xl border border-blue-100 bg-white/80 p-4">

        <div className="text-blue-600">
            {icon}
        </div>

        <p className="mt-2 text-xs font-black text-slate-900">
            {title}
        </p>

        <p className="text-[9px] text-slate-400">
            {text}
        </p>

    </div>
);

/* =========================================================
   PRICING CARD
========================================================= */

const PricingCard = ({
    name,
    price,
    description,
    features,
    popular = false,
    onClick,
}: {
    name: string;
    price: string;
    description: string;
    features: string[];
    popular?: boolean;
    onClick: () => void;
}) => (
    <div
        className={`relative flex flex-col rounded-3xl border bg-white p-6 transition duration-300 hover:-translate-y-1 sm:p-8 ${popular
            ? "border-blue-500 shadow-2xl shadow-blue-100"
            : "border-slate-200 shadow-sm hover:shadow-xl"
            }`}
    >

        {popular && (
            <div className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-[9px] font-black tracking-wide text-white">
                MOST POPULAR
            </div>
        )}

        <h3 className="text-xl font-black text-slate-950">
            {name}
        </h3>

        <p className="mt-3 min-h-[42px] max-w-xs text-sm leading-6 text-slate-500">
            {description}
        </p>

        <div className="mt-7">

            {price === "Custom" ? (
                <span className="text-4xl font-black tracking-tight text-slate-950">
                    Custom
                </span>
            ) : (
                <>
                    <span className="text-4xl font-black tracking-tight text-slate-950">
                        {price}
                    </span>

                    <span className="ml-2 text-xs text-slate-400">
                        / month
                    </span>
                </>
            )}

        </div>

        <button
            type="button"
            onClick={onClick}
            className={`mt-7 rounded-xl px-5 py-3.5 text-sm font-bold transition ${popular
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                : "border border-slate-300 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
        >
            {price === "Custom"
                ? "Contact Sales"
                : "Start Free"}
        </button>

        <div className="mt-7 border-t border-slate-100 pt-6">

            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Includes
            </p>

            <div className="space-y-3.5">

                {features.map((feature) => (

                    <div
                        key={feature}
                        className="flex items-start gap-2.5"
                    >

                        <Check
                            size={16}
                            className="mt-0.5 shrink-0 text-emerald-500"
                            strokeWidth={2.5}
                        />

                        <span className="text-sm text-slate-600">
                            {feature}
                        </span>

                    </div>

                ))}

            </div>

        </div>

    </div>
);

/* =========================================================
   FAQ
========================================================= */

const FAQ = ({
    question,
    answer,
}: {
    question: string;
    answer: string;
}) => {

    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-slate-200 last:border-b-0">

            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-5 py-5 text-left"
            >

                <span className="text-sm font-bold text-slate-900 sm:text-base">
                    {question}
                </span>

                <ChevronDown
                    size={19}
                    className={`shrink-0 text-slate-400 transition duration-300 ${open
                        ? "rotate-180 text-blue-600"
                        : ""
                        }`}
                />

            </button>

            <div
                className={`grid transition-all duration-300 ${open
                    ? "grid-rows-[1fr] pb-5 opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                    }`}
            >

                <div className="overflow-hidden">

                    <p className="max-w-3xl text-sm leading-7 text-slate-500">
                        {answer}
                    </p>

                </div>

            </div>

        </div>
    );
};

/* =========================================================
   FOOTER COLUMN
========================================================= */

const FooterColumn = ({
    title,
    links,
    scrollTo,
}: {
    title: string;
    links: [string, string][];
    scrollTo: (id: string) => void;
}) => (
    <div>

        <h3 className="text-sm font-bold text-slate-900">
            {title}
        </h3>

        <div className="mt-5 space-y-3.5">

            {links.map(([label, target]) => (

                <button
                    key={`${label}-${target}`}
                    type="button"
                    onClick={() => scrollTo(target)}
                    className="group flex items-center gap-1 text-left text-sm text-slate-500 transition hover:text-blue-600"
                >

                    {label}

                    <ChevronRight
                        size={12}
                        className="opacity-0 transition duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                    />

                </button>

            ))}

        </div>

    </div>
);

/* =========================================================
   FOOTER CONTACT
========================================================= */

const FooterContact = ({
    icon,
    text,
}: {
    icon: ReactNode;
    text: string;
}) => (
    <div className="flex items-center gap-3 text-sm text-slate-500">

        <div className="text-slate-400">
            {icon}
        </div>

        {text}

    </div>
);

/* =========================================================
   INSTAGRAM ICON
========================================================= */

const InstagramIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px]"
    >
        <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
        />

        <circle
            cx="12"
            cy="12"
            r="4"
        />

        <circle
            cx="17.5"
            cy="6.5"
            r="1"
            fill="currentColor"
            stroke="none"
        />
    </svg>
);

export default Home;