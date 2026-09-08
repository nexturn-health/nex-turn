import { Moon, Sun, Activity, ArrowRight, BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Globe2, LayoutDashboard, Menu, MessageSquare, Monitor, ShieldCheck, Smartphone, Stethoscope, Tv, UserRound, Users, X, Zap } from "lucide-react";
import {
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
const Home = () => {
    const navigate = useNavigate();
    const [mobileMenu, setMobileMenu] = useState(false);
    // Remember the chosen theme; use the device preference on the first visit.
    const [nightMode, setNightMode] = useState(() => {
        if (typeof window === "undefined") return false;
        try { const theme = localStorage.getItem("nextsynq-home-theme"); if (theme) return theme === "dark"; } catch { /* Storage can be unavailable. */ }
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });
    useEffect(() => {
        try { localStorage.setItem("nextsynq-home-theme", nightMode ? "dark" : "light"); } catch { /* Theme still works without storage. */ }
    }, [nightMode]);
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
    useEffect(() => {
        if (!mobileMenu) return;
        const previousOverflow = document.body.style.overflow;
        const desktop = window.matchMedia("(min-width: 1280px)");
        const closeOnDesktop = () => { if (desktop.matches) setMobileMenu(false); };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMobileMenu(false);
                document.querySelector<HTMLButtonElement>(".nt-menu-toggle")?.focus();
            }
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        desktop.addEventListener("change", closeOnDesktop);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
            desktop.removeEventListener("change", closeOnDesktop);
        };
    }, [mobileMenu]);
    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start",
        });
        setMobileMenu(false);
    };
    return (
        <div className="nt-home min-h-screen bg-white text-slate-900" data-theme={nightMode ? "dark" : "light"}>
            <HomeDesignStyles /><NextSynqUpdates /><MobileHomeStyles /><BookingFirstStyles />
            <header
                className={`nt-header fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled
                    ? "border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl"
                    : "bg-white/80 backdrop-blur-xl"
                    }`}
            >
                <div className="nt-header-inner mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
                    {/* LOGO */}
                    <button
                        type="button"
                        onClick={() =>
                            window.scrollTo({
                                top: 0,
                                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                            })
                        }
                        className="group flex items-center"
                    >
                        <span className="ns-wordmark"><span><Activity size={23} /></span><strong>NextSynq<small>HEALTH</small></strong></span>
                    </button>
                    {/* DESKTOP NAV */}
                    <nav className="nt-desktop-nav hidden items-center gap-7 lg:flex">
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
                        
                        <NavButton onClick={() => scrollTo("pricing")}>
                            Pricing
                        </NavButton>
                        <NavButton onClick={() => scrollTo("faq")}>
                            FAQ
                        </NavButton>
                    </nav>
                    {/* ACTIONS */}
                    <div className="nt-header-actions hidden items-center gap-2 md:flex">
                        <button
                            type="button"
                            onClick={() => navigate("/book-appointment")}
                            className="group flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-700 transition duration-300 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-100"
                        >
                            <CalendarDays
                                size={16}
                            />
                            Book Appointment
                        </button>
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
                            className="group flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-200 transition duration-300 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-teal-300"
                        >
                            Get Started
                            <ArrowRight
                                size={16}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </button>
                    </div>
                    <button type="button" className="ns-theme-toggle" onClick={() => setNightMode(value => !value)} aria-label={nightMode ? "Switch to day mode" : "Switch to night mode"} title={nightMode ? "Day mode" : "Night mode"} aria-pressed={nightMode}>{nightMode ? <Sun size={19} /> : <Moon size={19} />}</button>
                    {/* Booking stays visible without opening the mobile menu. */}
                    <button type="button" className="ns-mobile-book" onClick={() => { setMobileMenu(false); navigate("/book-appointment"); }}><CalendarDays size={16} /><span>Book appointment</span></button>
                    {/* MOBILE */}
                    <button
                        type="button"
                        onClick={() => setMobileMenu((value) => !value)}
                        className="nt-menu-toggle rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 lg:hidden"
                        aria-label={mobileMenu ? "Close navigation" : "Open navigation"}
                        aria-expanded={mobileMenu}
                        aria-controls="nt-mobile-navigation"
                    >
                        {mobileMenu ? (
                            <X size={24} />
                        ) : (
                            <Menu size={24} />
                        )}
                    </button>
                </div>
                {mobileMenu && (
                    <div id="nt-mobile-navigation" className="nt-mobile-menu border-t border-slate-200 bg-white px-5 py-4 shadow-xl lg:hidden">
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
                            
                            <MobileNavButton onClick={() => scrollTo("pricing")}>
                                Pricing
                            </MobileNavButton>
                            <MobileNavButton onClick={() => scrollTo("faq")}>
                                FAQ
                            </MobileNavButton>
                            <div className="my-3 border-t border-slate-100" />
                            <button type="button" className="ns-menu-book" onClick={() => { setMobileMenu(false); navigate("/book-appointment"); }}><CalendarDays size={17} />Book appointment</button>
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
                                className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                )}
            </header>
            <AppointmentBookingSection onBook={() => navigate("/book-appointment")} />

            <section className="nt-trust border-y border-slate-100 bg-white">
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
            {/* Replace your existing <section id="display"> with this entire section.
    This is a homepage sample, not the live display route. Styles are included. */}
<section id="display" className="ns-tv-section">
  <style>{`
    .ns-tv-section { padding: 76px 24px; background: #123d39; color: #fff; scroll-margin-top: 80px; }
    .ns-tv-section *, .ns-tv-section *::before, .ns-tv-section *::after { box-sizing: border-box; }
    .ns-tv-intro { max-width: 690px; margin: 0 auto 38px; text-align: center; }
    .ns-tv-intro > span { display: inline-block; color: #b0c99e; font-size: 10px; font-weight: 600; letter-spacing: 1.6px; }
    .ns-tv-intro h2 { color: #fff; margin: 16px 0; font-size: clamp(29px, 4vw, 44px); font-weight: 550; line-height: 1.15; letter-spacing: -1px; }
    .ns-tv-intro p { color: #aec6b7; font-size: 14px; line-height: 1.8; }
    .ns-tv-frame { max-width: 1200px; margin: auto; padding: 9px; border: 1px solid #57706a; border-radius: 23px; background: #172520; box-shadow: 0 24px 65px #061d2255; }
    .ns-tv-screen { container-type: inline-size; background: #f5f6ef; border-radius: 15px; overflow: hidden; color: #173d39; font-family: Arial, sans-serif; }
    .ns-tv-screen h3, .ns-tv-screen h4, .ns-tv-screen p { margin: 0; }
    .ns-tv-board { padding: 1.6cqw; display: grid; gap: .8cqw; }
    .ns-tv-top { display: flex; align-items: center; gap: 1.4cqw; padding-bottom: .2cqw; }
    .ns-tv-mark { flex-shrink: 0; display: grid; place-items: center; width: 4.5cqw; height: 4.5cqw; border: 1px solid #d6e1ce; border-radius: 1.1cqw; background: white; font-size: 2.5cqw; font-weight: 700; }
    .ns-tv-hospital { min-width: 0; flex: 1; }
    .ns-tv-hospital h3 { font-size: 2.15cqw; font-weight: 700; line-height: 1.3; color: #173d39; }
    .ns-tv-hospital p { margin-top: .5cqw; color: #596d51; font-size: 1.3cqw; }
    .ns-tv-clock { text-align: right; }
    .ns-tv-clock strong { display: block; font-size: 2.35cqw; line-height: 1.3; letter-spacing: -.05cqw; }
    .ns-tv-clock span { display: block; margin-top: .5cqw; font-size: 1.2cqw; color: #596d51; }
    .ns-tv-control { display: inline-block; flex-shrink: 0; padding: 1cqw 1.1cqw; border: 1px solid #cddcc2; border-radius: .65cqw; background: white; color: #173d39; font-size: 1.08cqw; line-height: 1.2; white-space: nowrap; }
    .ns-tv-info { display: flex; align-items: center; justify-content: space-between; gap: 1cqw; background: #e5eddf; border-radius: .8cqw; padding: .75cqw 1.4cqw; min-height: 4.9cqw; font-size: 1.25cqw; }
    .ns-tv-info strong { font-weight: 700; }
    .ns-tv-columns { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr); gap: 1.5cqw; }
    .ns-tv-serving { min-height: 35.7cqw; display: flex; flex-direction: column; padding: 1.65cqw; border-radius: 1.4cqw; background: #173d39; color: white; }
    .ns-tv-serving h4, .ns-tv-next h4 { font-size: 2.2cqw; line-height: 1.2; font-weight: 700; }
    .ns-tv-serving h4 { color: white; }
    .ns-tv-current { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center; padding: 1.5cqw 0; }
    .ns-tv-current > strong { font-size: 9cqw; font-weight: 700; line-height: 1.1; letter-spacing: -.4cqw; }
    .ns-tv-current > p { font-size: 2.15cqw; line-height: 1.4; margin-top: 1.6cqw; color: white; }
    .ns-tv-current > span { color: #c7dbce; font-size: 1.45cqw; margin-top: .6cqw; }
    .ns-tv-instruction { border-top: 1px solid #ffffff22; padding-top: 1.2cqw; margin-top: .6cqw !important; text-align: center; color: #c6d9cd; font-size: 1.25cqw; line-height: 1.5; }
    .ns-tv-next { padding: 1.65cqw; background: white; border: 1px solid #d7e1ce; border-radius: 1.4cqw; }
    .ns-tv-next h4 { color: #173d39; margin-bottom: 1.5cqw; }
    .ns-tv-next-list { padding: 0; margin: 0; list-style: none; }
    .ns-tv-next-list li { display: flex; align-items: center; justify-content: space-between; gap: 1cqw; padding: .8cqw 0; border-bottom: 1px solid #e1e8d9; }
    .ns-tv-next-list li:last-child { border: 0; }
    .ns-tv-next-list strong { font-size: 3.15cqw; font-weight: 700; line-height: 1.1; letter-spacing: -.1cqw; }
    .ns-tv-next-list span { font-size: 1.4cqw; color: #596d51; }
    .ns-tv-waiting { display: flex; align-items: center; gap: .7cqw; border: 1px solid #d6e3c8; border-radius: 1cqw; padding: .75cqw 1.4cqw; background: #e8efdf; }
    .ns-tv-waiting > strong { font-size: 1.65cqw; margin-right: 1cqw; }
    .ns-tv-waiting > span { background: white; padding: .55cqw .85cqw; border-radius: .7cqw; font-size: 1.9cqw; font-weight: 700; line-height: 1.1; }
    .ns-tv-bottom { display: flex; align-items: center; justify-content: space-between; gap: 1cqw; color: #596d51; font-size: 1.2cqw; padding-top: .1cqw; }
    .ns-tv-stand { width: 12%; max-width: 140px; height: 25px; margin: auto; background: linear-gradient(#233831, #152a23); }
    .ns-tv-base { width: 25%; max-width: 290px; height: 8px; margin: auto; background: #263d34; border-radius: 50%; }
    .ns-tv-caption { text-align: center; font-size: 11px; color: #9ebaaa; margin: 18px auto 0; line-height: 1.6; }
    @media (max-width: 639px) { .ns-tv-section { padding: 42px 12px; } .ns-tv-intro { padding: 0 8px; margin-bottom: 26px; } .ns-tv-intro p { font-size: 13px; } .ns-tv-frame { padding: 4px; border-radius: 10px; } .ns-tv-screen { border-radius: 6px; } .ns-tv-stand { height: 15px; } .ns-tv-base { height: 5px; } }
  `}</style>

  <div className="ns-tv-intro">
    <span>WAITING-ROOM DISPLAY</span>
    <h2>A clear view of every turn.</h2>
    <p>Open NextSynq on a TV or monitor so patients can see the current token, upcoming patients and waiting queue.</p>
  </div>

  {/* A responsive scale model of the supplied display screenshot. */}
  <div className="ns-tv-frame">
    <div className="ns-tv-screen" role="img" aria-label="Sample NextSynq hospital TV display. Now serving H-008, Hematology, Dr. Atul Singh. Up next: C-001 and C-002 in Cardiology, H-009 and H-010 in Hematology. Four patients waiting.">
      <div className="ns-tv-board" aria-hidden="true">
        <div className="ns-tv-top">
          <div className="ns-tv-mark">N</div>
          <div className="ns-tv-hospital"><h3>NextSynq Hospital</h3><p>Surya Hospital</p></div>
          <div className="ns-tv-clock"><strong>03:13 am</strong><span>Tue, 08 Sept</span></div>
          <span className="ns-tv-control">▸ Settings</span>
        </div>
        <div className="ns-tv-info"><strong>Dr. Atul Singh · Online</strong><span>Queue updates automatically</span><span className="ns-tv-control">Enable sound</span></div>
        <div className="ns-tv-columns">
          <div className="ns-tv-serving">
            <h4>Now serving</h4>
            <div className="ns-tv-current"><strong>H-008</strong><p>Hematology</p><span>Dr. Atul Singh</span></div>
            <p className="ns-tv-instruction">When your token appears, proceed to the department shown.</p>
          </div>
          <div className="ns-tv-next"><h4>Up next</h4><ol className="ns-tv-next-list">
            <li><strong>C-001</strong><span>Cardiology</span></li>
            <li><strong>C-002</strong><span>Cardiology</span></li>
            <li><strong>H-009</strong><span>Hematology</span></li>
            <li><strong>H-010</strong><span>Hematology</span></li>
          </ol></div>
        </div>
        <div className="ns-tv-waiting"><strong>Waiting&nbsp; 4</strong><span>C-001</span><span>C-002</span><span>H-009</span><span>H-010</span></div>
        <div className="ns-tv-bottom"><span>Please keep your token ready. Emergency cases may be prioritised.</span><span>NextSynq Health</span></div>
      </div>
    </div>
  </div>
  <div className="ns-tv-stand" aria-hidden="true" /><div className="ns-tv-base" aria-hidden="true" />
  <p className="ns-tv-caption">Illustrative display · Sample tokens and time · TV controls shown for preview</p>
</section>
            <PatientTrackingSection />

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
            <section
                id="solutions"
                className="scroll-mt-20 bg-slate-50 py-20 sm:py-24"
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                    <SectionHeading
                        eyebrow="ONE CONNECTED WORKFLOW"
                        title="Everyone sees the same queue."
                        description="NextSynq gives every role the right information at the right time."
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
                        <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-white p-8 shadow-xl shadow-teal-100/40">
                            <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-teal-50 blur-3xl" />
                            <div className="relative">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200">
                                        <Activity size={28} />
                                    </div>
                                    <span className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                        ONLINE
                                    </span>
                                </div>
                                <h3 className="mt-7 text-2xl font-semibold text-slate-950">
                                    NextSynq
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
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-teal-600">
                                            Patient Experience
                                        </p>
                                        <h3 className="mt-1 text-xl font-semibold text-slate-950">
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
                            <div className="hidden rounded-2xl border border-teal-100 bg-teal-50/60 p-5 sm:block">
                                <div className="text-center">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400">
                                        Patient Token
                                    </p>
                                    <p className="mt-1 text-4xl font-semibold text-teal-600">
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
            <section
                id="features"
                className="scroll-mt-20 bg-white py-24 sm:py-28"
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                    <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">
                                THE NextSynq PLATFORM
                            </span>
                            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
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
                            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                        >
                            Explore NextSynq
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
                                        <h3 className="mt-1 text-lg font-semibold text-slate-950">
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
            <section
                id="how-it-works"
                className="scroll-mt-20 bg-slate-50 py-24 sm:py-28"
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                    <SectionHeading
                        eyebrow="HOW IT WORKS"
                        title="A smoother patient journey in five steps."
                        description="From registration to consultation, NextSynq keeps every step connected."
                        centered
                    />
                    <div className="relative mt-14">
                        <div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-teal-100 lg:block" />
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
            <section className="bg-white py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                    <div className="grid items-center gap-14 lg:grid-cols-2">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">
                                BUILT FOR DAILY OPERATIONS
                            </span>
                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                                Less administration.
                                <span className="block text-teal-600">
                                    More patient care.
                                </span>
                            </h2>
                            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                                NextSynq reduces the manual work around queue
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
                                className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-200 transition hover:bg-teal-700"
                            >
                                Start Using NextSynq
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
            <section className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                    <div className="rounded-[32px] border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-8 shadow-sm sm:p-12">
                        <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">
                                    SECURITY & INFRASTRUCTURE
                                </span>
                                <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                                    Built for modern healthcare operations.
                                </h2>
                                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                    NextSynq is designed around controlled access,
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
            {/* Premium connects the patient's clinical, laboratory and pharmacy journey. */}
            <section className="ns-connected"><div><p className="ns-eyebrow">PREMIUM · CONNECTED CARE</p><h2>Every department.<br />One clearer patient journey.</h2><p>Patients can follow their laboratory and medicine progress as your hospital team updates each stage.</p><div className="ns-connected-grid"><article><Stethoscope size={25} /><h3>Consultation & clinical records</h3><p>Consultation records, diagnosis and prescriptions, supported by AI transcription and clinical analysis.</p></article><article><Activity size={25} /><h3>Laboratory & reports</h3><p>Manage lab tests, orders, technicians and reports. Keep patients informed with laboratory tracking.</p></article><article><CheckCircle2 size={25} /><h3>Pharmacy & medicines</h3><p>Connect your pharmacy department and let patients track medicine progress through collection.</p></article></div></div></section>
            <section
                id="pricing"
                className="scroll-mt-20 bg-white py-24 sm:py-28"
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                    <SectionHeading
                        eyebrow="PRICING"
                        title="Simple plans. No complicated packages."
                        description="Choose Basic or Premium. Both include a 14-day free trial; monthly pricing applies after the trial."
                        centered
                    />
                    <div className="ns-two-plans mt-14 grid gap-5 lg:grid-cols-2">
                        <PricingCard name="Basic" price="₹999" description="The essentials for a smooth OPD and informed patients." features={["Patient registration", "Live patient queue tracking", "Doctor status updates for every patient", "Reception and doctor queue management", "14-day free trial"]} onClick={() => navigate("/register")} />
                        <PricingCard popular name="Premium" price="₹2,499" description="Connect the complete patient journey across your hospital." features={["Everything in Basic", "Consultation records", "Diagnosis and prescriptions", "Lab tests and lab orders", "Lab technicians and reports", "AI transcription and clinical analysis", "Patient laboratory tracking", "Pharmacy department and medicine tracking", "14-day free trial"]} onClick={() => navigate("/register")} />
                    </div>
                </div>
            </section>
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
                        <FAQ question="Is there a free trial?" answer="Yes. Basic and Premium include a 14-day free trial. Choose the plan that fits your hospital workflow." />
                        <FAQ question="Can patients track laboratory tests and medicines?" answer="Yes. Premium includes patient laboratory tracking and pharmacy medicine tracking, alongside clinical records, prescriptions, lab orders and reports." />
                        <FAQ
                            question="Do patients need to install an app?"
                            answer="No. Patients can open their secure NextSynq tracking link directly from their phone browser."
                        />
                        <FAQ
                            question="Can multiple doctors use NextSynq?"
                            answer="Yes. NextSynq can support multiple doctors and departments within a hospital or clinic."
                        />
                        <FAQ
                            question="Can patients see their queue position?"
                            answer="Yes. The patient tracking experience can show the token, current serving token, patients ahead and estimated waiting time."
                        />
                        <FAQ
                            question="Can NextSynq send notifications?"
                            answer="Yes. The platform can be connected with SMS, WhatsApp and email notification services."
                        />
                        <FAQ
                            question="Can one hospital have multiple departments?"
                            answer="Yes. Departments can have their own queues and token prefixes."
                        />
                        <FAQ
                            question="Can NextSynq work on a hospital TV?"
                            answer="Yes. NextSynq can provide a browser-based public display that can be opened on a TV, monitor or reception screen."
                        />
                    </div>
                </div>
            </section>
            
            <section
                id="contact"
                className="relative overflow-hidden bg-gray-200 py-24 sm:py-28"
            >
                <div className="absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full bg-white/60 blur-3xl" />
                <div className="absolute -bottom-48 -right-32 h-[500px] w-[500px] rounded-full bg-teal-200/40 blur-3xl" />
                <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-300 bg-white text-teal-600 shadow-sm">
                        <Activity size={30} />
                    </div>
                    <h2 className="mt-7 text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                        Give your patients
                        <span className="block text-teal-600">
                            their time back.
                        </span>
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                        Make your OPD more predictable for patients and easier
                        to manage for your staff with NextSynq.
                    </p>
                    <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                            className="group flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700"
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
                            className="rounded-xl border border-gray-300 bg-white px-7 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                        >
                            View Display
                        </button>
                    </div>
                </div>
            </section>
            <footer className="ns-small-footer"><div><a href="#" className="ns-footer-brand"><Activity size={19} />NextSynq Health</a><nav aria-label="Footer navigation"><button type="button" onClick={() => scrollTo("pricing")}>Plans</button><button type="button" onClick={() => scrollTo("faq")}>FAQs</button><button type="button" onClick={() => navigate("/login")}>Log in</button></nav><small>© {new Date().getFullYear()} NextSynq Health</small></div></footer>
        </div>
    );
};
const QueuePhoneMockup = () => (
    <div className="nt-preview-card">
        <div className="nt-preview-top"><div className="nt-preview-brand"><Stethoscope size={20} /><span>NextSynq <small>Patient experience</small></span></div><span className="nt-example">Example preview</span></div>
        <div className="nt-preview-body">
            <div className="nt-preview-greeting"><span>Your visit, at a glance</span><h3>Hello, Ayushi.</h3><p>Dr. Aman Singh <span>·</span> Hematology</p></div>
            <div className="nt-preview-ticket"><div><span>YOUR TOKEN</span><strong>H-012</strong><p>You are in the queue</p></div><div className="nt-preview-ticket-icon"><UserRound size={28} strokeWidth={1.5} /></div></div>
            <div className="nt-preview-serving"><span><i /> Currently serving</span><strong>H-009</strong></div>
            <div className="nt-preview-stats"><MiniPhoneStat icon={<Users size={17} />} label="Patients ahead" value="3" /><MiniPhoneStat icon={<Clock3 size={17} />} label="Estimated wait" value="9 min" /></div>
            <div className="nt-preview-note"><Bell size={17} /><p>Know your place in the queue.<br /><strong>Right from your phone browser.</strong></p><CheckCircle2 size={20} /></div>
        </div>
        <div className="nt-preview-caption"><ShieldCheck size={14} /> No patient app required</div>
    </div>
);

// const DisplayWaitingToken = ({
//     token,
//     muted = false,
// }: {
//     token: string;
//     muted?: boolean;
// }) => (
//     <div
//         className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${muted
//             ? "border-slate-100 bg-slate-50 text-slate-400"
//             : "border-teal-100 bg-teal-50 text-teal-600"
//             }`}
//     >
//         {token}
//     </div>
// );
// const DisplayNextToken = ({
//     token,
//     department,
// }: {
//     token: string;
//     department: string;
// }) => (
//     <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
//         <div>
//             <p className="text-2xl font-semibold tracking-tight text-teal-600">
//                 {token}
//             </p>
//             <p className="mt-1 text-xs font-medium text-slate-500">
//                 {department}
//             </p>
//         </div>
//         <ChevronRight
//             size={18}
//             className="text-slate-300"
//         />
//     </div>
// );
// const DisplayBenefit = ({
//     icon,
//     title,
//     text,
// }: {
//     icon: ReactNode;
//     title: string;
//     text: string;
// }) => (
//     <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
//         <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
//             {icon}
//         </div>
//         <h3 className="mt-4 text-sm font-bold text-white">
//             {title}
//         </h3>
//         <p className="mt-2 text-xs leading-5 text-slate-500">
//             {text}
//         </p>
//     </div>
// );
const OperationsPreview = () => (
    <div className="relative">
        <div className="absolute -inset-8 rounded-full bg-teal-100/60 blur-3xl" />
        <div className="relative rounded-[28px] border border-slate-200 bg-white p-3 shadow-2xl">
            <div className="rounded-[22px] bg-slate-50 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Live Operations
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">
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
                        <div className="relative h-full w-[82%] overflow-hidden rounded-full bg-teal-500">
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
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
            <span className="text-sm font-semibold text-teal-600">
                {serving}
            </span>
        </div>
    </div>
);
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
        <p className="mt-2 text-2xl font-semibold text-slate-950">
            {value}
        </p>
    </div>
);
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
        <p className="mt-1 text-xl font-semibold text-slate-950">
            {value}
        </p>
    </div>
);
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-[10px] font-semibold text-teal-600">
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
                : "bg-teal-50 text-teal-600"
                }`}
        >
            {status.toUpperCase()}
        </span>
    </div>
);
const PlatformFeatureLarge = ({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) => (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-teal-100 hover:shadow-xl">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-teal-50 blur-3xl transition group-hover:bg-teal-100" />
        <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition group-hover:scale-110">
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
const LightFeature = ({
    icon,
    title,
    text,
}: {
    icon: ReactNode;
    title: string;
    text: string;
}) => (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-teal-100 hover:shadow-lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition group-hover:scale-110">
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
const MiniConnection = ({
    icon,
    label,
}: {
    icon: ReactNode;
    label: string;
}) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-teal-600 shadow-sm">
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            {icon}
        </div>
        <p className="mt-2 text-[8px] font-bold uppercase tracking-wide text-slate-400">
            {label}
        </p>
        <p className="mt-1 text-xl font-semibold text-slate-950">
            {value}
        </p>
    </div>
);
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
        className="text-sm font-semibold text-slate-600 transition hover:text-teal-600"
    >
        {children}
    </button>
);
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
        className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-teal-600"
    >
        {children}
    </button>
);

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
        className={`nt-section-heading ${centered ? "mx-auto text-center" : ""} max-w-2xl`}
    >
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">
            {eyebrow}
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
            {description}
        </p>
    </div>
);
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
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
const ProblemCard = ({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) => (
    <div className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-teal-100 hover:shadow-xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition group-hover:scale-110">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-slate-950">
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
        <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-200 transition duration-300 group-hover:scale-110">
            {icon}
        </div>
        <div className="mt-5 text-xs font-semibold tracking-widest text-teal-600">
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
const LightSecurityBadge = ({
    icon,
    title,
    text,
}: {
    icon: ReactNode;
    title: string;
    text: string;
}) => (
    <div className="rounded-2xl border border-teal-100 bg-white/80 p-4">
        <div className="text-teal-600">
            {icon}
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-900">
            {title}
        </p>
        <p className="text-[9px] text-slate-400">
            {text}
        </p>
    </div>
);
// Mobile shows the main benefits first; all plan features remain available.
const PricingCard = ({ name, price, description, features, popular = false, onClick }: {
    name: string; price: string; description: string; features: string[]; popular?: boolean; onClick: () => void;
}) => {
    const benefits = features.filter(feature => feature !== "14-day free trial");
    const preview = popular
        ? ["Everything in Basic", "Clinical records, prescriptions & AI", "Laboratory & pharmacy tracking"]
        : benefits.slice(0, 3);
    const renderFeature = (feature: string) => <li key={feature}><Check size={15} aria-hidden="true" /><span>{feature}</span></li>;
    return <article className="ns-plan" data-featured={popular}>
        <div className="ns-plan-heading"><h3>{name}</h3>{popular && <span>Most popular</span>}</div>
        <p className="ns-plan-description">{description}</p>
        <div className="ns-plan-price"><strong>{price}</strong><span>/ month</span></div>
        <p className="ns-plan-trial">14 days free · Monthly pricing after trial</p>
        <ul className="ns-plan-desktop">{benefits.map(renderFeature)}</ul>
        <div className="ns-plan-mobile"><ul>{preview.map(renderFeature)}</ul><details><summary>View all {name} features</summary><ul>{benefits.map(renderFeature)}</ul></details></div>
        <button type="button" onClick={onClick}>Start 14-day free trial <ArrowRight size={16} /></button>
    </article>;
};
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
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-5 py-5 text-left"
            >
                <span className="text-sm font-bold text-slate-900 sm:text-base">
                    {question}
                </span>
                <ChevronDown
                    size={19}
                    className={`shrink-0 text-slate-400 transition duration-300 ${open
                        ? "rotate-180 text-teal-600"
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
// const FooterColumn = ({
//     title,
//     links,
//     scrollTo,
// }: {
//     title: string;
//     links: [string, string][];
//     scrollTo: (id: string) => void;
// }) => (
//     <div>
//         <h3 className="text-sm font-bold text-slate-900">
//             {title}
//         </h3>
//         <div className="mt-5 space-y-3.5">
//             {links.map(([label, target]) => (
//                 <button
//                     key={`${label}-${target}`}
//                     type="button"
//                     onClick={() => scrollTo(target)}
//                     className="group flex items-center gap-1 text-left text-sm text-slate-500 transition hover:text-teal-600"
//                 >
//                     {label}
//                     <ChevronRight
//                         size={12}
//                         className="opacity-0 transition duration-200 group-hover:translate-x-1 group-hover:opacity-100"
//                     />
//                 </button>
//             ))}
//         </div>
//     </div>
// );
// const FooterContact = ({
//     icon,
//     text,
// }: {
//     icon: ReactNode;
//     text: string;
// }) => (
//     <div className="flex items-center gap-3 text-sm text-slate-500">
//         <div className="text-slate-400">
//             {icon}
//         </div>
//         {text}
//     </div>
// );
// const InstagramIcon = () => (
//     <svg
//         viewBox="0 0 24 24"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="1.8"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//         className="h-[18px] w-[18px]"
//     >
//         <rect
//             x="3"
//             y="3"
//             width="18"
//             height="18"
//             rx="5"
//         />
//         <circle
//             cx="12"
//             cy="12"
//             r="4"
//         />
//         <circle
//             cx="17.5"
//             cy="6.5"
//             r="1"
//             fill="currentColor"
//             stroke="none"
//         />
//     </svg>
// );
const HomeDesignStyles = () => (
    <style>{`
        .nt-home { --nt-ink: #173d39; --nt-green: #176957; --nt-muted: #66776b; background: #f7f8f3; color: var(--nt-ink); font-family: "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; overflow-x: clip; }
        .nt-home *, .nt-home *::before, .nt-home *::after { box-sizing: border-box; }
        .nt-home button, .nt-home a { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .nt-home button { cursor: pointer; }
        .nt-home button:focus-visible, .nt-home a:focus-visible, .nt-home summary:focus-visible { outline: 3px solid #3cac88; outline-offset: 4px; }
        .nt-home section[id] { scroll-margin-top: 90px; }
        .nt-home > section:not(.nt-hero):not(.nt-trust) { padding-top: 80px; padding-bottom: 80px; }
        .nt-home .max-w-7xl { max-width: 1180px; }
        .nt-home h1, .nt-home h2, .nt-home h3 { text-wrap: balance; }
        .nt-home p { text-wrap: pretty; }
        .nt-home [class~="bg-slate-50"] { background-color: #f4f6ef; }
        .nt-home [class~="border-slate-200"] { border-color: #dfe5d9; }
        .nt-home [class~="text-slate-950"], .nt-home [class~="text-slate-900"] { color: #203e34; }
        .nt-home [class~="text-slate-500"], .nt-home [class~="text-slate-600"] { color: #69776a; }
        .nt-home [class~="bg-teal-600"] { background-color: #176957; }
        .nt-home button[class~="bg-teal-600"] { box-shadow: 0 3px 10px #173d390f; }
        .nt-home button[class~="bg-teal-600"]:hover { background-color: #104e40; transform: none; }
        .nt-home [class~="text-teal-600"], .nt-home [class~="text-teal-700"] { color: #376c51; }
        .nt-home [class~="bg-teal-50"] { background-color: #edf4e8; }
        .nt-home [class~="bg-teal-100"] { background-color: #e0edd9; }
        .nt-home [class~="shadow-2xl"], .nt-home [class~="shadow-xl"] { box-shadow: 0 12px 36px #173d3910; }
        .nt-header { background: #fafbf7f5; border-bottom: 1px solid #dfe6d9; backdrop-filter: blur(16px); }
        .nt-header-inner { gap: 16px; height: 76px; }
        .nt-desktop-nav { gap: 18px; }
        .nt-desktop-nav button { font-size: 12px; min-height: 44px; white-space: nowrap; }
        .nt-header-actions button { min-height: 44px; font-size: 12px; padding-left: 14px; padding-right: 14px; }
        .nt-header img { max-width: 140px; height: 36px; }
        .nt-menu-toggle { min-width: 44px; min-height: 44px; }
        .nt-mobile-menu { max-height: calc(100dvh - 76px); overflow-y: auto; overscroll-behavior: contain; padding: 16px 20px 24px; background: #fafbf7; }
        .nt-mobile-menu button { min-height: 48px; border-radius: 10px; }
        .nt-mobile-menu > div { max-width: 620px; margin: auto; }
        .nt-hero { background: linear-gradient(120deg, #f2f5e9, #f7f8f1 55%, #e5efdf); }
        .nt-hero > div:first-child { display: none; }
        .nt-hero-grid { gap: 56px; padding-top: 76px; padding-bottom: 76px; }
        .nt-hero h1 { font-size: clamp(40px, 4.8vw, 62px); font-weight: 600; line-height: 1.09; letter-spacing: -2.8px; color: #173d39; }
        .nt-hero h1 > span { color: #6d916d; }
        .nt-hero h1 + p { font-size: 16px; line-height: 1.85; color: #647568; max-width: 450px; }
        .nt-hero button { min-height: 48px; border-radius: 11px; }
        .nt-hero-preview { width: 100%; min-width: 0; min-height: 0; padding: 16px; }
        .nt-hero-preview > div:not(.nt-preview-card) { display: none; }
        .nt-preview-card { width: 100%; max-width: 432px; position: relative; border: 1px solid #cedcc8; background: #fff; border-radius: 22px; box-shadow: 0 24px 70px #2d51321a, 0 0 0 12px #ffffff55; overflow: hidden; }
        .nt-preview-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 20px; background: #173d39; color: #e4f0df; }
        .nt-preview-brand { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; }
        .nt-preview-brand small { display: block; font-size: 10px; font-weight: 400; color: #b1c9b9; margin-top: 2px; }
        .nt-example { font-size: 9px; border: 1px solid #ffffff26; padding: 5px 8px; border-radius: 20px; white-space: nowrap; color: #c1d4c4; }
        .nt-preview-body { padding: 22px; }
        .nt-preview-greeting > span { color: #7b8777; font-size: 11px; }
        .nt-preview-greeting h3 { font-size: 25px; font-weight: 600; letter-spacing: -.6px; margin: 3px 0; }
        .nt-preview-greeting p { font-size: 12px; color: #71806e; }
        .nt-preview-greeting p span { padding: 0 4px; }
        .nt-preview-ticket { display: flex; align-items: center; justify-content: space-between; padding: 20px; margin-top: 20px; border-radius: 14px; background: #eaf1e2; border: 1px solid #dae5d2; }
        .nt-preview-ticket span { display: block; font-size: 9px; font-weight: 700; letter-spacing: 1.6px; color: #6e8767; }
        .nt-preview-ticket strong { display: block; font-size: 40px; line-height: 1.3; font-weight: 600; letter-spacing: -1.5px; color: #2c563d; font-variant-numeric: tabular-nums; }
        .nt-preview-ticket p { color: #6e8366; font-size: 11px; }
        .nt-preview-ticket-icon { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 50%; border: 1px solid #c8d9bf; background: #f3f7ed; color: #6d8b65; }
        .nt-preview-serving { display: flex; align-items: center; justify-content: space-between; padding: 15px 2px; border-bottom: 1px solid #edf0e7; font-size: 12px; color: #72816c; }
        .nt-preview-serving > span { display: flex; align-items: center; gap: 8px; }
        .nt-preview-serving i { width: 6px; height: 6px; background: #7b9e6c; border-radius: 50%; }
        .nt-preview-serving strong { color: #315c40; font-size: 16px; }
        .nt-preview-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
        .nt-preview-stats > div { box-shadow: none; background: #fafbf7; padding: 14px; border-color: #e6ebdf; }
        .nt-preview-stats p { font-size: 11px; }
        .nt-preview-note { display: flex; align-items: center; gap: 12px; padding-top: 18px; color: #708d68; }
        .nt-preview-note > svg { flex-shrink: 0; }
        .nt-preview-note > svg:last-child { margin-left: auto; }
        .nt-preview-note p { font-size: 11px; line-height: 1.7; color: #7b8676; }
        .nt-preview-note strong { font-weight: 500; color: #426448; }
        .nt-preview-caption { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 11px; font-size: 10px; color: #7b8874; background: #fafbf7; border-top: 1px solid #edf0e7; }
        .nt-trust { background: #fff; border-color: #e1e7da; }
        .nt-trust > div > div { padding-top: 24px; padding-bottom: 24px; }
        .nt-section-heading h2 { font-weight: 600; font-size: clamp(28px, 3.3vw, 40px); line-height: 1.18; letter-spacing: -1.2px; }
        .nt-section-heading > span { font-size: 10px; letter-spacing: 2px; color: #749268; }
        .nt-section-heading > p { color: #72806d; font-size: 15px; line-height: 1.8; }
        .nt-home #display { background: #123d39; }
        .nt-home #display > div:first-child { display: none; }
        .nt-home #display h2 { font-weight: 500; letter-spacing: -1px; }
        .nt-home #display [class~="text-teal-400"], .nt-home #display [class~="text-teal-300"] { color: #bed6ab; }
        .nt-home #display [class~="text-slate-400"], .nt-home #display [class~="text-slate-500"] { color: #a4bfb0; }
        .nt-home #display [class~="bg-slate-900"] { background: #0e302b; }
        .nt-home #display [class~="text-teal-200"], .nt-home #display [class~="text-teal-100"] { color: #b8cfbc; }
        .nt-home #display [class~="bg-teal-600"] { background: #397b5f; }
        .nt-home #display [class~="bg-white"] [class~="text-slate-400"], .nt-home #display [class~="bg-white"] [class~="text-slate-500"] { color: #66776b; }
        .nt-home #display [class~="bg-white"] [class~="text-teal-400"] { color: #628254; }
        .nt-home #pricing { background: #f7f8f3; }
        .nt-price-card { border-radius: 18px; padding: 28px; box-shadow: none; }
        .nt-price-card:hover { transform: none; box-shadow: 0 8px 24px #173d3908; }
        .nt-price-card[data-featured="true"] { border: 2px solid #62885e; background: #f1f6ea; box-shadow: 0 10px 30px #173d3908; }
        .nt-price-card > h3 { padding-right: 100px; font-size: 20px; }
        .nt-price-card > div:first-child { font-size: 8px; }
        .nt-price-card button { min-height: 48px; }
        .nt-founder { border-radius: 18px; box-shadow: none; }
        .nt-founder:hover { transform: none; box-shadow: 0 8px 28px #173d3910; }
        .nt-founder-image { aspect-ratio: 4 / 3; }
        .nt-founder-overlay { display: none; }
        .nt-founder a { min-width: 44px; min-height: 44px; }
        .nt-founder-more { margin-top: 16px; }
        .nt-founder-more summary { color: #4e7350; font-size: 12px; cursor: pointer; }
        .nt-founder-more p { padding-top: 10px; font-size: 13px; line-height: 1.8; color: #71816c; }
        .nt-footer { background: #edf2e7; border-color: #dce5d4; }
        .nt-home .animate-float-slow, .nt-home .animate-float-reverse, .nt-home .animate-pulse-glow, .nt-home .animate-notification, .nt-home .animate-ping, .nt-home .animate-blink, .nt-home .animate-spin, .nt-home .animate-pulse { animation: none; }
        .nt-home .display-scan, .nt-home .display-glow, .nt-home .phone-shine { display: none; }
        @media (max-width: 1100px) and (min-width: 1024px) { .nt-desktop-nav { gap: 10px; } .nt-header-inner { gap: 10px; } .nt-header img { max-width: 120px; } }
        @media (max-width: 1023px) { .nt-hero-grid { max-width: 720px; padding-top: 48px; padding-bottom: 48px; gap: 36px; } .nt-header-actions { margin-left: auto; } .nt-hero h1 { max-width: 580px; } .nt-hero-preview { padding: 12px; } .nt-preview-card { max-width: 480px; } }
        @media (max-width: 639px) {
            .nt-header-inner { height: 68px; padding-left: 20px; padding-right: 16px; }
            .nt-mobile-menu { max-height: calc(100dvh - 68px); }
            .nt-hero { padding-top: 68px; }
            .nt-hero-grid { padding: 36px 20px 40px; gap: 30px; }
            .nt-hero h1 { font-size: clamp(34px, 10vw, 44px); letter-spacing: -1.6px; line-height: 1.12; margin-top: 20px; }
            .nt-hero h1 + p { font-size: 14px; line-height: 1.8; margin-top: 18px; }
            .nt-hero button { width: 100%; min-height: 48px; }
            .nt-hero .mt-8 { margin-top: 22px; }
            .nt-hero-preview { padding: 6px; }
            .nt-preview-card { border-radius: 17px; box-shadow: 0 12px 30px #173d390e, 0 0 0 6px #ffffff70; }
            .nt-preview-top { padding: 16px; }
            .nt-preview-body { padding: 18px; }
            .nt-preview-ticket { padding: 16px; margin-top: 16px; }
            .nt-preview-ticket strong { font-size: 34px; }
            .nt-home > section:not(.nt-hero):not(.nt-trust) { padding-top: 48px; padding-bottom: 48px; }
            .nt-home .mt-14, .nt-home .mt-16 { margin-top: 30px; }
            .nt-home .mt-12 { margin-top: 26px; }
            .nt-section-heading h2 { font-size: 28px; letter-spacing: -.8px; }
            .nt-section-heading > p { font-size: 14px; }
            .nt-trust > div > div { padding: 20px 12px; }
            .nt-home #display h2 { font-size: 30px; }
            .nt-home #display [class~="text-[9px]"] { font-size: 10px; }
            .nt-price-card { padding: 24px; }
            .nt-price-card > h3 { padding-right: 95px; }
            .nt-home #faq button { min-height: 56px; }
            .nt-home #team .gap-8 { gap: 20px; }
            .nt-home #contact button { min-height: 48px; }
            .nt-footer button { min-height: 40px; }
        }
        @media (prefers-reduced-motion: reduce) { .nt-home *, .nt-home *::before, .nt-home *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
    `}</style>
);
export default Home;
// Preview uses illustrative stages only; it does not fetch patient records.
function PhoneMockup() {
 const [view, setView] = useState("Queue");
 return <div className="nt-preview-card"><div className="ns-preview-tabs" role="group" aria-label="Sample patient tracking views">{["Queue", "Laboratory", "Pharmacy"].map(item => <button type="button" key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}</div>{view === "Queue" ? <QueuePhoneMockup /> : <div className="ns-track-sample"><span className="ns-eyebrow">ILLUSTRATIVE PREVIEW · PREMIUM</span><h3>{view === "Laboratory" ? "Your laboratory progress" : "Your medicine status"}</h3><p>Follow the next step in your visit.</p><ol>{(view === "Laboratory" ? ["Lab order received", "Sample collected", "Testing in progress", "Report available"] : ["Prescription received", "Medicines being prepared", "Ready for collection"]).map((label,index) => <li key={label}><span>{index + 1}</span>{label}</li>)}</ol><small>Example stages, not a live patient record.</small></div>}</div>;
}
function NextSynqUpdates() {
 return <style>{`
 .ns-wordmark { display:flex; align-items:center; gap:10px; color:#173d39; }
 .ns-wordmark > span { display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#173d39;color:#eaf1df; }
 .ns-wordmark strong { font-size:24px;letter-spacing:-.7px;line-height:1.1; }
 .ns-wordmark small { display:block;font-size:8px;letter-spacing:2.5px;margin-top:5px;color:#748568; }
 .ns-two-plans { max-width:950px;margin-left:auto;margin-right:auto; }
 .ns-connected { padding:65px 24px;background:#173d39;color:#edf5e6; }
 .ns-connected > div { max-width:1120px;margin:auto; }
 .ns-eyebrow { font-size:10px;letter-spacing:1.6px;color:#94b584;margin-bottom:14px; }
 .ns-connected h2 { font-size:clamp(30px,4vw,44px);line-height:1.2;letter-spacing:-1px;font-weight:500; }
 .ns-connected > div > p:not(.ns-eyebrow) { max-width:650px;line-height:1.8;font-size:14px;margin-top:18px;color:#aec7b5; }
 .ns-connected-grid { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:34px; }
 .ns-connected article { border:1px solid #ffffff24;border-radius:15px;padding:24px;background:#ffffff05; }
 .ns-connected article svg { color:#a2c18e; }
 .ns-connected h3 { font-size:18px;font-weight:500;margin:20px 0 10px; }
 .ns-connected article p { color:#a7c1af;font-size:13px;line-height:1.8; }
 .ns-small-footer { background:#edf2e7;border-top:1px solid #dae4d1;padding:14px 24px; }
 .ns-small-footer > div { max-width:1180px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap; }
 .ns-footer-brand { display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#173d39; }
 .ns-small-footer nav { display:flex;gap:20px; }
 .ns-small-footer button { min-height:44px;background:none;border:0;font-size:12px;color:#637d54; }
 .ns-small-footer small { color:#788e69;font-size:10px; }
 .ns-preview-tabs { display:flex;gap:4px;padding:6px;background:#eaf0e1; }
 .ns-preview-tabs button { flex:1;min-height:44px;border:0;border-radius:8px;padding:9px 6px;font-size:11px;color:#6a815e;background:transparent; }
 .ns-preview-tabs button[aria-pressed="true"] { background:white;color:#176957;font-weight:600; }
 .nt-preview-card > .nt-preview-card { border:0;border-radius:0;box-shadow:none; }
 .ns-track-sample { padding:24px;min-height:380px;background:#fafcf7;animation:ns-soft-in .35s ease; }
 .ns-track-sample h3 { font-size:23px;font-weight:600;color:#173d39;line-height:1.3; }
 .ns-track-sample > p { font-size:12px;color:#788c6b;margin-top:9px; }
 .ns-track-sample ol { padding:0;list-style:none;margin:22px 0; }
 .ns-track-sample li { display:flex;align-items:center;gap:12px;border-bottom:1px solid #e2e9d8;padding:13px 0;font-size:13px;color:#58744a; }
 .ns-track-sample li span { display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#e8f0df;font-size:11px; }
 .ns-track-sample small { font-size:10px;color:#819574; }
 @keyframes ns-soft-in { from { opacity:0;transform:translateY(12px); } to { opacity:1;transform:translateY(0); } }
 .nt-home .animate-reveal { animation:ns-soft-in .65s ease both; }
 .nt-home .nt-hero-preview { animation:ns-soft-in .8s ease both; }
 .nt-home button { transition:background .2s,box-shadow .2s,transform .2s; }
 .nt-home button:focus-visible { outline:3px solid #3baf94;outline-offset:3px; }
 @media(max-width:639px) { .ns-connected { padding:42px 20px; } .ns-connected-grid { grid-template-columns:1fr;gap:14px; } .ns-connected article { padding:20px; } .ns-small-footer { padding:12px 20px; } .ns-small-footer small { width:100%; } .ns-wordmark strong { font-size:22px; } .ns-wordmark > span { width:34px;height:34px; } .ns-track-sample { padding:20px; } }
 @media(prefers-reduced-motion:reduce) { .nt-home *, .ns-track-sample { animation:none!important;transition:none!important; } }
 `}</style>;
}

// Final responsive overrides keep the header and plan comparison compact.
function MobileHomeStyles() {
 return <style>{`
 .nt-home { overflow-x:clip; }
 .nt-home *, .nt-home *::before, .nt-home *::after { box-sizing:border-box; }
 .nt-home img { max-width:100%; }
 .ns-mobile-book { display:none; }
 .ns-menu-book { display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:#eaf0e1;color:#173d39;font-size:13px;font-weight:650;margin:10px 0; }
 .ns-plan { display:flex;flex-direction:column;min-width:0;padding:28px;border:1px solid #dce5d6;border-radius:20px;background:#fff;color:#173d39; }
 .ns-plan[data-featured=true] { border-color:#83a68c;background:#f4f8ef; }
 .ns-plan-heading { display:flex;align-items:center;justify-content:space-between;gap:10px; }
 .ns-plan-heading h3 { margin:0;font-size:22px;font-weight:650;letter-spacing:-.5px; }
 .ns-plan-heading>span { font-size:10px;background:#e3eddb;color:#476742;border-radius:20px;padding:5px 9px;white-space:nowrap; }
 .ns-plan-description { font-size:13px;line-height:1.65;color:#71806a;margin:12px 0 0;max-width:340px; }
 .ns-plan-price { display:flex;align-items:baseline;gap:7px;margin-top:20px; }
 .ns-plan-price strong { font-size:36px;letter-spacing:-1px;line-height:1.2;font-weight:650; }
 .ns-plan-price>span { font-size:12px;color:#71806a; }
 .ns-plan-trial { margin:8px 0 0;color:#587748;font-size:11px; }
 .ns-plan ul { list-style:none;margin:22px 0;padding:0;display:grid;gap:11px; }
 .ns-plan li { display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1.5;color:#596d50; }
 .ns-plan li svg { flex-shrink:0;margin-top:2px;color:#176957; }
 .ns-plan>button { display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;margin-top:auto;border:1px solid #c8d9bf;border-radius:11px;background:#fff;color:#173d39;font-size:13px;font-weight:650;padding:11px; }
 .ns-plan[data-featured=true]>button { background:#176957;border-color:#176957;color:#fff; }
 .ns-plan>button:hover { box-shadow:0 3px 12px #173d3915; }
 .ns-plan-mobile { display:none; }
 @media(max-width:1279px) {
  .nt-home .nt-desktop-nav { display:none; }
  .nt-home .nt-menu-toggle { display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;flex-shrink:0; }
  .nt-home .nt-mobile-menu { display:block; }
  .nt-header-inner { gap:12px; }
 }
 @media(max-width:1023px) {
  .nt-home .nt-header-actions { display:none; }
  .ns-mobile-book { display:flex;align-items:center;justify-content:center;gap:6px;margin-left:auto;min-height:44px;padding:10px 12px;background:#176957;color:#fff;border:0;border-radius:11px;font-size:12px;font-weight:650;white-space:nowrap; }
  .nt-home .ns-two-plans { grid-template-columns:repeat(2,minmax(0,1fr)); }
 }
 @media(max-width:639px) {
  .nt-home .nt-header-inner { height:68px;padding:0 12px;gap:7px; }
  .nt-home .ns-wordmark { gap:6px; }
  .nt-home .ns-wordmark strong { font-size:18px; }
  .nt-home .ns-wordmark small { font-size:7px;letter-spacing:1.8px; }
  .nt-home .ns-wordmark>span { width:30px;height:32px;border-radius:9px; }
  .nt-home .ns-wordmark>span svg { width:19px; }
  .nt-home .ns-mobile-book { font-size:11px;padding:9px;gap:5px; }
  .nt-home .nt-menu-toggle { padding:7px;min-width:40px; }
  .nt-home .nt-hero-grid { padding:28px 16px 32px;gap:24px; }
  .nt-home .nt-hero h1 { font-size:clamp(30px,8.6vw,39px);line-height:1.12;letter-spacing:-1.2px; }
  .nt-home .nt-hero h1+p { font-size:13px;line-height:1.7; }
  .nt-home >section:not(.nt-hero):not(.nt-trust) { padding-top:36px;padding-bottom:36px; }
  .nt-home .nt-section-heading h2 { font-size:clamp(24px,6.8vw,29px);line-height:1.2; }
  .nt-home .nt-section-heading>p { font-size:13px;line-height:1.65; }
  .nt-home #pricing>div { padding-left:16px;padding-right:16px; }
  .nt-home .ns-two-plans { grid-template-columns:1fr;gap:12px;margin-top:22px; }
  .ns-plan { padding:18px;border-radius:15px; }
  .ns-plan-heading h3 { font-size:19px; }
  .ns-plan-description { margin-top:7px;font-size:12px;line-height:1.5;max-width:none; }
  .ns-plan-price { margin-top:13px; }
  .ns-plan-price strong { font-size:29px; }
  .ns-plan-trial { margin-top:5px;font-size:10px;line-height:1.5; }
  .ns-plan .ns-plan-desktop { display:none; }
  .ns-plan-mobile { display:block; }
  .ns-plan-mobile ul { margin:15px 0 10px;gap:7px; }
  .ns-plan li { font-size:12px;line-height:1.5; }
  .ns-plan-mobile details { border-top:1px solid #e0e8da;margin:12px 0; }
  .ns-plan-mobile summary { cursor:pointer;min-height:44px;padding:12px 0;font-size:11px;color:#176957;font-weight:650; }
  .ns-plan-mobile summary:focus-visible { outline:3px solid #3baf94;outline-offset:2px; }
  .ns-plan-mobile details ul { margin:0 0 12px; }
  .ns-plan>button { min-height:44px;font-size:12px; }
  .nt-home .ns-connected { padding-left:16px;padding-right:16px; }
  .nt-home .ns-connected article { padding:17px; }
  .nt-home .ns-connected h3 { font-size:17px;margin-top:13px; }
  .nt-home .ns-connected article p { font-size:12px;line-height:1.65; }
  .nt-home .ns-small-footer { padding:12px 16px; }
  .nt-home .ns-small-footer>div { gap:8px 14px; }
  .nt-home .ns-small-footer nav { gap:16px; }
 }
 @media(max-width:359px) { .nt-home .ns-wordmark>span { display:none; } .nt-home .ns-wordmark strong { font-size:17px; } }
 `}</style>;
}

// Booking showcase uses sample content. Every booking CTA opens the real booking page.
function AppointmentBookingSection({ onBook }: { onBook: () => void }) {
    const [step, setStep] = useState(0);
    const steps = [
        { title: "Find your hospital", description: "Choose your location and find a hospital accepting appointments.", short: "Hospital" },
        { title: "Choose your doctor & time", description: "Pick a department, doctor, and an available appointment time.", short: "Doctor & time" },
        { title: "Add your details", description: "Enter the patient’s details and review the appointment before confirming.", short: "Your details" },
    ];
    return <section id="appointments" className="ns-booking" aria-labelledby="ns-booking-title">
        <style>{bookingStyles}</style>
        <div className="ns-booking-layout">
            <div className="ns-booking-copy">
                <span className="ns-booking-eyebrow"><CalendarDays size={15} /> FOR PATIENTS</span>
                <h1 id="ns-booking-title">Book your next appointment.<br /><span>Right from your phone.</span></h1>
                <p>Find your hospital, choose a doctor, and book a time that works for you. Start your visit before you leave home.</p>
                <ol className="ns-booking-steps" aria-label="Explore the booking steps">
                    {steps.map((item, index) => <li key={item.short}><button type="button" aria-pressed={step === index} aria-controls="ns-booking-preview" onClick={() => setStep(index)}><span className="ns-booking-number">{index + 1}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><ChevronRight size={17} /></button></li>)}
                </ol>
                <button type="button" className="ns-booking-cta" onClick={onBook}><CalendarDays size={18} /> Book an appointment <ArrowRight size={17} /></button>
                <p className="ns-booking-note"><Smartphone size={15} /> Book in your browser. No app to install.</p>
            </div>

            {/* Recreated in JSX so the preview stays crisp without screenshot assets. */}
            <div className="ns-booking-visual">
                <div className="ns-booking-phone" id="ns-booking-preview" aria-label="Illustrative appointment booking preview">
                    <div className="ns-booking-phone-brand"><Activity size={20} /><strong>NextSynq Health</strong><span>Preview</span></div>
                    <div className="ns-booking-screen">
                        <div className="ns-booking-banner"><small>CARE, AT YOUR CONVENIENCE</small><h3>{steps[step].title}</h3><p>{step === 0 ? "Find care near you." : step === 1 ? "Plan a visit that fits your day." : "One step closer to your visit."}</p></div>
                        <div className="ns-booking-progress" aria-label="Preview step navigation">{steps.map((item, index) => <button key={item.short} type="button" aria-pressed={step === index} onClick={() => setStep(index)}><span>{index < step ? <Check size={12} /> : index + 1}</span>{item.short}</button>)}</div>
                        <div className="ns-booking-sample" aria-live="polite">
                            {step === 0 ? <>
                                <div className="ns-booking-field"><small>State</small><div>Uttar Pradesh <ChevronDown size={14} /></div></div>
                                <div className="ns-booking-field"><small>District / city</small><div>Varanasi <ChevronDown size={14} /></div></div>
                                <div className="ns-booking-hospital"><span><Stethoscope size={21} /></span><div><strong>Example Hospital</strong><small>Varanasi, Uttar Pradesh</small></div><ChevronRight size={16} /></div>
                            </> : step === 1 ? <>
                                <div className="ns-booking-mini-hospital"><Stethoscope size={16} /> Example Hospital</div>
                                <div className="ns-booking-field"><small>Department</small><div>Hematology <ChevronDown size={14} /></div></div>
                                <div className="ns-booking-doctor"><UserRound size={22} /><div><strong>Dr. Aman Singh</strong><small>Hematology · Sample doctor</small></div><CheckCircle2 size={17} /></div>
                                <div className="ns-booking-field"><small>Example appointment times</small><div className="ns-booking-times"><span className="ns-booking-time-selected"><strong>11:00</strong><small>to 11:15</small></span><span><strong>11:30</strong><small>to 11:45</small></span></div></div>
                            </> : <>
                                <div className="ns-booking-mini-hospital"><CalendarDays size={17} /><span>Example Hospital<small>Dr. Aman Singh · 11:00</small></span></div>
                                <div className="ns-booking-field"><small>Patient name</small><div className="ns-booking-placeholder">Full name</div></div>
                                <div className="ns-booking-field"><small>Mobile number</small><div className="ns-booking-placeholder">10-digit mobile number</div></div>
                                <p className="ns-booking-preview-note">Enter your details on the booking page to continue.</p>
                            </>}
                        </div>
                        <button className="ns-booking-phone-next" type="button" onClick={step < 2 ? () => setStep(value => value + 1) : onBook}>{step < 2 ? "Next preview" : "Start your booking"}<ArrowRight size={15} /></button>
                        <p className="ns-booking-caption">Illustrative preview · Availability is shown when booking.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>;
}

// Scoped booking styles: stacked on phones, side-by-side on larger screens.
const bookingStyles = `
.nt-home .ns-booking { background:#f5f7f0;padding:70px 24px;scroll-margin-top:90px; }
.ns-booking-layout { display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:70px;max-width:1100px;margin:auto; }
.ns-booking-copy { min-width:0; }
.ns-booking-eyebrow { display:inline-flex;align-items:center;gap:8px;font-size:10px;font-weight:650;letter-spacing:1.5px;color:#608451; }
.ns-booking-copy h1 { font-size:clamp(30px,3.7vw,45px);line-height:1.15;letter-spacing:-1.5px;color:#173d39;font-weight:600;margin:17px 0; }
.ns-booking-copy h1>span { color:#176957; }
.ns-booking-copy>p:not(.ns-booking-note) { font-size:14px;line-height:1.8;color:#75836e;max-width:460px; }
.ns-booking-steps { list-style:none;padding:0;margin:25px 0;display:grid;gap:8px; }
.ns-booking-steps button { display:flex;align-items:center;gap:13px;width:100%;text-align:left;padding:13px;border:1px solid transparent;border-radius:13px;background:transparent;color:#173d39; }
.ns-booking-steps button[aria-pressed=true] { background:#fff;border-color:#dce5d4; }
.ns-booking-number { display:grid;place-items:center;flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#e6eddf;color:#658253;font-size:12px;font-weight:650; }
.ns-booking-steps button[aria-pressed=true] .ns-booking-number { background:#176957;color:white; }
.ns-booking-steps button>span:nth-child(2) { flex:1; }
.ns-booking-steps strong { display:block;font-size:13px;font-weight:650; }
.ns-booking-steps small { display:block;font-size:11px;line-height:1.65;color:#7b8a72;margin-top:4px; }
.ns-booking-steps svg { flex-shrink:0; }
.ns-booking-cta { display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:13px 20px;border:0;border-radius:12px;background:#176957;color:white;font-size:13px;font-weight:650; }
.ns-booking-note { display:flex;align-items:center;gap:7px;color:#76866a;font-size:11px;margin-top:12px; }
.ns-booking-visual { min-width:0;display:flex;justify-content:center;position:relative;padding:20px;background:radial-gradient(ellipse at center,#dfead5,transparent 70%); }
.ns-booking-phone { width:100%;max-width:350px;min-width:0;border:5px solid #214841;border-radius:30px;overflow:hidden;background:#f6f8f2;box-shadow:0 22px 45px #173d3918; }
.ns-booking-phone-brand { display:flex;align-items:center;gap:8px;padding:17px 16px;border-bottom:1px solid #dde6d5;color:#173d39;background:#fafbf7; }
.ns-booking-phone-brand strong { font-size:13px;font-weight:650; }
.ns-booking-phone-brand>span { font-size:9px;color:#879578;margin-left:auto; }
.ns-booking-screen { padding:15px; }
.ns-booking-banner { padding:17px;background:linear-gradient(120deg,#edf3e2,#e0eddf);border:1px solid #dae5d1;border-radius:14px; }
.ns-booking-banner>small { font-size:8px;letter-spacing:1.3px;color:#779361;font-weight:650; }
.ns-booking-banner h3 { font-size:21px;font-weight:650;letter-spacing:-.6px;color:#173d39;margin:9px 0;line-height:1.25; }
.ns-booking-banner p { font-size:11px;color:#7a8d6b;line-height:1.6;margin:0; }
.ns-booking-progress { display:flex;gap:3px;justify-content:space-between;margin:13px 0; }
.ns-booking-progress button { display:flex;align-items:center;gap:4px;font-size:8px;border:0;background:transparent;color:#839575;min-height:40px;padding:0; }
.ns-booking-progress button>span { display:grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#e6eddd;font-size:9px; }
.ns-booking-progress button[aria-pressed=true] { color:#176957;font-weight:650; }
.ns-booking-progress button[aria-pressed=true]>span { background:#176957;color:#fff; }
.ns-booking-sample { padding:15px;border:1px solid #dde6d4;border-radius:13px;background:#fff;min-height:282px; }
.ns-booking-field { margin-bottom:14px; }
.ns-booking-field>small { display:block;font-size:10px;color:#607b4f;font-weight:600;margin-bottom:7px; }
.ns-booking-field>div:not(.ns-booking-times) { display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid #dce5d3;border-radius:9px;font-size:12px;color:#476c51;background:#fafbf7;min-height:42px; }
.ns-booking-hospital,.ns-booking-doctor { display:flex;align-items:center;gap:9px;padding:13px 10px;border:1px solid #dce5d3;border-radius:11px;color:#436849; }
.ns-booking-hospital>span { background:#edf3e4;border-radius:9px;padding:8px; }
.ns-booking-hospital>div,.ns-booking-doctor>div { flex:1;min-width:0; }
.ns-booking-hospital strong,.ns-booking-doctor strong { display:block;font-size:11px; }
.ns-booking-hospital small,.ns-booking-doctor small { display:block;font-size:9px;line-height:1.5;color:#869873;margin-top:5px; }
.ns-booking-mini-hospital { display:flex;align-items:center;gap:8px;padding:10px;border-radius:9px;background:#edf3e3;color:#456a4d;font-size:10px;font-weight:600;margin-bottom:13px; }
.ns-booking-mini-hospital small { display:block;font-size:9px;font-weight:400;margin-top:4px; }
.ns-booking-doctor { background:#eef5e6;border-color:#9cb789;margin-bottom:14px; }
.ns-booking-times { display:grid;grid-template-columns:1fr 1fr;gap:9px; }
.ns-booking-times>span { border:1px solid #dce5d3;border-radius:9px;padding:10px;text-align:center;color:#4e7254; }
.ns-booking-times strong { display:block;font-size:12px; }
.ns-booking-times small { display:block;font-size:9px;margin-top:4px; }
.ns-booking-times .ns-booking-time-selected { background:#176957;color:white;border-color:#176957; }
.ns-booking-field .ns-booking-placeholder { color:#97a58a!important; }
.ns-booking-preview-note { font-size:10px;line-height:1.6;color:#809171; }
.ns-booking-phone-next { display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;background:#176957;color:white;border:0;border-radius:10px;margin-top:12px;font-size:11px;font-weight:650; }
.ns-booking-caption { font-size:8px;line-height:1.5;text-align:center;color:#839477;margin:9px 0 0; }
@media(max-width:900px) { .ns-booking-layout { gap:28px;grid-template-columns:1fr 1fr; } .ns-booking-visual { padding:5px; } }
@media(max-width:639px) {
 .nt-home .ns-booking { padding:34px 16px; }
 .ns-booking-layout { grid-template-columns:1fr;gap:24px; }
 .ns-booking-copy h1 { font-size:29px;line-height:1.18;letter-spacing:-.9px;margin:12px 0; }
 .ns-booking-copy>p:not(.ns-booking-note) { font-size:13px;line-height:1.7; }
 .ns-booking-steps { grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:18px 0; }
 .ns-booking-steps button { flex-direction:column;align-items:flex-start;padding:10px 7px;gap:8px;height:100%;border-color:#e0e7d8; }
 .ns-booking-steps strong { font-size:10px;line-height:1.4; }
 .ns-booking-steps small,.ns-booking-steps button>svg { display:none; }
 .ns-booking-number { height:25px;width:25px;font-size:10px; }
 .ns-booking-cta { width:100%;min-height:46px;font-size:12px; }
 .ns-booking-note { justify-content:center;font-size:10px; }
 .ns-booking-visual { padding:4px 10px; }
 .ns-booking-phone { max-width:330px;border-width:4px;border-radius:24px; }
}
@media(prefers-reduced-motion:reduce) { .ns-booking * { animation:none!important;transition:none!important; } }
`;

// The mobile tracking experience follows the hospital TV showcase.
function PatientTrackingSection() {
    return <section id="patient-tracking" className="ns-patient-tracking" aria-labelledby="ns-tracking-title"><div className="ns-tracking-layout"><div><span className="ns-booking-eyebrow"><Smartphone size={15} /> FOLLOW YOUR VISIT</span><h2 id="ns-tracking-title">From the waiting room.<br /><span>To the palm of your hand.</span></h2><p>See your token and queue progress on your phone. Follow laboratory and medicine updates as your hospital moves your visit forward.</p><ul><li><CheckCircle2 size={18} />Queue position and estimated waiting time</li><li><CheckCircle2 size={18} />Laboratory progress and report status</li><li><CheckCircle2 size={18} />Medicine preparation and collection updates</li></ul><small>Open the tracking link provided by your hospital. Laboratory and pharmacy tracking are included in Premium.</small></div><div className="ns-tracking-phone"><PhoneMockup /></div></div></section>;
}

// Theme rules are scoped to Home; booking and other routes keep their own themes.
function BookingFirstStyles() {
    return <style>{`
    .nt-home .ns-booking { padding-top:130px!important;padding-bottom:64px; }
    .ns-theme-toggle { display:flex;align-items:center;justify-content:center;flex-shrink:0;width:42px;height:44px;border:1px solid #dce5d4;border-radius:11px;background:#f2f6ec;color:#173d39; }
    .ns-patient-tracking { background:#fafcf7;padding:70px 24px; }
    .ns-tracking-layout { display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:65px;max-width:1100px;margin:auto; }
    .ns-tracking-layout>div { min-width:0; }
    .ns-tracking-layout h2 { font-size:clamp(29px,3.8vw,44px);font-weight:600;letter-spacing:-1px;line-height:1.2;color:#173d39;margin:17px 0; }
    .ns-tracking-layout h2 span { color:#176957; }
    .ns-tracking-layout p { font-size:14px;line-height:1.8;color:#748469; }
    .ns-tracking-layout ul { list-style:none;padding:0;margin:24px 0;display:grid;gap:15px; }
    .ns-tracking-layout li { display:flex;align-items:center;gap:9px;color:#557247;font-size:13px; }
    .ns-tracking-layout li svg { flex-shrink:0; }
    .ns-tracking-layout>div>small { color:#829376;font-size:11px;line-height:1.7;display:block; }
    .ns-tracking-phone { max-width:410px;width:100%;justify-self:center; }
    .nt-home[data-theme=dark] { color-scheme:dark;background:#0d1916;color:#e5eee3; }
    .nt-home[data-theme=dark] section,.nt-home[data-theme=dark] footer { background-color:#101e19;background-image:none; }
    .nt-home[data-theme=dark] .nt-header { background:#101e19f5!important;border-color:#304639; }
    .nt-home[data-theme=dark] .nt-mobile-menu { background:#14241d!important;border-color:#304639; }
    .nt-home[data-theme=dark] [class~="bg-white"],.nt-home[data-theme=dark] [class~="bg-slate-50"],.nt-home[data-theme=dark] [class~="bg-teal-50"],.nt-home[data-theme=dark] [class~="bg-gray-200"],.nt-home[data-theme=dark] [class~="bg-slate-100"] { background:#192b22!important; }
    .nt-home[data-theme=dark] [class*="text-slate-9"],.nt-home[data-theme=dark] [class*="text-gray-9"],.nt-home[data-theme=dark] [class*="text-slate-7"],.nt-home[data-theme=dark] [class*="text-slate-8"] { color:#e3eddf!important; }
    .nt-home[data-theme=dark] [class*="text-slate-4"],.nt-home[data-theme=dark] [class*="text-slate-5"],.nt-home[data-theme=dark] [class*="text-slate-6"],.nt-home[data-theme=dark] [class*="text-gray-6"] { color:#b2c1aa!important; }
    .nt-home[data-theme=dark] [class*="text-teal-"],.nt-home[data-theme=dark] [class*="text-emerald-"] { color:#93c8ac!important; }
    .nt-home[data-theme=dark] [class*="border-slate-"],.nt-home[data-theme=dark] [class*="border-teal-"],.nt-home[data-theme=dark] [class*="border-gray-"] { border-color:#344a3b!important; }
    .nt-home[data-theme=dark] .ns-wordmark,.nt-home[data-theme=dark] .ns-footer-brand { color:#e2efdc; }
    .nt-home[data-theme=dark] .ns-wordmark small { color:#adc49f; }
    .nt-home[data-theme=dark] .ns-theme-toggle { background:#233a2c;border-color:#3d5845;color:#d6e6a8; }
    .nt-home[data-theme=dark] .ns-booking,.nt-home[data-theme=dark] .ns-patient-tracking { background:#101e19; }
    .nt-home[data-theme=dark] .ns-booking-copy h1,.nt-home[data-theme=dark] .ns-tracking-layout h2 { color:#edf4e6; }
    .nt-home[data-theme=dark] .ns-booking-copy h1 span,.nt-home[data-theme=dark] .ns-tracking-layout h2 span { color:#9bcbae; }
    .nt-home[data-theme=dark] .ns-booking-copy>p,.nt-home[data-theme=dark] .ns-booking-note,.nt-home[data-theme=dark] .ns-tracking-layout p,.nt-home[data-theme=dark] .ns-tracking-layout li,.nt-home[data-theme=dark] .ns-tracking-layout>div>small { color:#b0c2a6!important; }
    .nt-home[data-theme=dark] .ns-booking-steps button { color:#e0ecd8;border-color:#354a3a; }
    .nt-home[data-theme=dark] .ns-booking-steps button[aria-pressed=true] { background:#213729;border-color:#5a7860; }
    .nt-home[data-theme=dark] .ns-booking-steps small { color:#acbf9f; }
    .nt-home[data-theme=dark] .ns-booking-number { background:#304936;color:#c5dcb6; }
    .nt-home[data-theme=dark] .ns-booking-visual { background:radial-gradient(ellipse at center,#244b33,transparent 70%); }
    /* The sample phone and TV remain light, like the actual patient displays. */
    .nt-home[data-theme=dark] .ns-booking-phone,.nt-home[data-theme=dark] .ns-tv-screen,.nt-home[data-theme=dark] .nt-preview-card { color-scheme:light; }
    .nt-home[data-theme=dark] .ns-plan { background:#192b21;color:#e2edda;border-color:#3a5140; }
    .nt-home[data-theme=dark] .ns-plan[data-featured=true] { background:#223a2a;border-color:#6a926e; }
    .nt-home[data-theme=dark] .ns-plan-heading>span { background:#3a5433;color:#d4e5c4; }
    .nt-home[data-theme=dark] .ns-plan-description,.nt-home[data-theme=dark] .ns-plan li,.nt-home[data-theme=dark] .ns-plan-price>span { color:#b5c5ab; }
    .nt-home[data-theme=dark] .ns-plan-trial,.nt-home[data-theme=dark] .ns-plan-mobile summary { color:#b5d2a3; }
    .nt-home[data-theme=dark] .ns-plan-mobile details { border-color:#3a5140; }
    .nt-home[data-theme=dark] .ns-plan>button { background:#2b4531;color:#e9f1e0;border-color:#54724b; }
    .nt-home[data-theme=dark] .ns-plan[data-featured=true]>button { background:#176957;color:white; }
    .nt-home[data-theme=dark] .ns-small-footer { background:#13241b;border-color:#344a38; }
    .nt-home[data-theme=dark] .ns-small-footer button,.nt-home[data-theme=dark] .ns-small-footer small { color:#aebe9f; }
    .nt-home[data-theme=dark] .ns-menu-book { background:#254936;color:#e7f2dc; }
    @media(max-width:1023px) { .ns-tracking-layout { gap:30px; } .nt-header-inner { gap:8px; } }
    @media(max-width:639px) {
      .nt-home .ns-booking { padding-top:96px!important;padding-bottom:32px; }
      .ns-tracking-layout { grid-template-columns:1fr;gap:24px; }
      .nt-home .ns-patient-tracking { padding:34px 16px; }
      .ns-tracking-layout h2 { font-size:29px; }
      .ns-tracking-layout p { font-size:13px; }
      .ns-tracking-layout li { font-size:12px; }
      .ns-theme-toggle { width:36px;min-width:36px;height:44px; }
      .nt-home .nt-header-inner { gap:5px;padding:0 10px; }
      .nt-home .ns-wordmark>span { display:none; }
      .nt-home .ns-wordmark strong { font-size:17px; }
      .nt-home .ns-mobile-book { font-size:10px;padding:8px;gap:4px; }
      .nt-home .nt-menu-toggle { min-width:36px;padding:6px; }
    }
    `}</style>;
}
