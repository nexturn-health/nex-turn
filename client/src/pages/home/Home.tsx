import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    ArrowRight,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronRight,
    Clock3,
    FlaskConical,
    Heart,
    LayoutDashboard,
    Menu,
    Moon,
    Phone,
    ShieldCheck,
    Smartphone,
    Stethoscope,
    Sun,
    Ticket,
    Users,
    X,
    Zap,
} from "lucide-react";

// Image stored in your public folder.
const HERO_IMAGE = "/hero1.png";

// File location: public/nexturn.png
const LOGO_IMAGE = "/nexturn.png";

// Instagram is active. Add your LinkedIn URL later to enable its button.
const SOCIAL_LINKS = {
    instagram: "https://www.instagram.com/nextsynqhealth/",
    linkedin: "",
};

/* ------------------------------------------------------------------
   PAGE CONTENT
------------------------------------------------------------------ */

const navigation = [
    { label: "Home", id: "home" },
    { label: "Features", id: "features" },
    { label: "Display", id: "display" },
    { label: "Pricing", id: "pricing" },
    { label: "For Doctors", id: "doctor-choice" },
    { label: "Workflow", id: "workflow" },
    { label: "FAQ", id: "faq" },
];

const benefits = [
    {
        icon: Zap,
        title: "Smoother OPD flow",
        text: "Manage registrations, tokens and consultations in one place.",
    },
    {
        icon: CalendarDays,
        title: "Online appointment slots",
        text: "Accept patient bookings for available doctor time slots.",
    },
    {
        icon: Smartphone,
        title: "Live patient tracking",
        text: "Share queue position and visit updates directly on mobile.",
    },
    {
        icon: Users,
        title: "Doctor queue control",
        text: "Call, start, skip and complete visits from one workspace.",
    },
    {
        icon: Phone,
        title: "Clear reception updates",
        text: "Give patients a tracking link to follow their progress.",
    },
    {
        icon: Heart,
        title: "Doctor-led AI assistance",
        text: "AI helps with drafts. The doctor chooses the final prescription.",
    },
    {
        icon: LayoutDashboard,
        title: "Hospital display boards",
        text: "Show current and upcoming tokens in your waiting room.",
    },
    {
        icon: FlaskConical,
        title: "Premium laboratory workflow",
        text: "Connect doctor orders, laboratory teams and reports.",
    },
];

const hospitalTeams = [
    { label: "Hospitals", icon: LayoutDashboard },
    { label: "Doctors", icon: Stethoscope },
    { label: "Reception", icon: Users },
    { label: "Laboratories", icon: FlaskConical },
    { label: "OPD teams", icon: Heart },
];

const basicFeatures = [
    "Patient registration and tokens",
    "Live patient queue tracking",
    "Online appointment booking with slots",
    "Doctor queue and break updates",
    "Reception workflow",
    "Hospital display board",
];

const premiumFeatures = [
    "Everything in Basic",
    "Consultation records and prescriptions",
    "AI transcription and clinical assistance",
    "Lab tests and doctor lab orders",
    "Lab technicians and reports",
    "Laboratory and medicine tracking",
];

const workflowSteps = [
    {
        icon: Users,
        title: "Reception",
        text: "Patient registration and check-in",
    },
    {
        icon: Ticket,
        title: "Token / appointment",
        text: "Walk-in token or booked slot",
    },
    {
        icon: Stethoscope,
        title: "Doctor",
        text: "Queue, consultation and review",
    },
    {
        icon: FlaskConical,
        title: "Laboratory",
        text: "Test orders and reports",
    },
    {
        icon: Smartphone,
        title: "Patient tracking",
        text: "Live mobile and display updates",
    },
];

const faqItems = [
    {
        question: "What is NextSynq Health?",
        answer:
            "NextSynq Health is an OPD management platform for hospitals and clinics. It helps manage patient registration, token generation, appointments, doctor queues, live patient tracking and waiting-room display from one place.",
    },
    {
        question: "Who is this platform built for?",
        answer:
            "It is built mainly for hospital owners, clinic owners, doctors, reception teams, OPD teams, laboratory teams and administrators. Patients use the tracking link, but the main product is for hospital teams.",
    },
    {
        question: "Is appointment booking included in the Basic Plan?",
        answer:
            "Yes. The Basic Plan includes online appointment booking with available doctor slots, patient registration, OPD token generation, live patient tracking, doctor queue control and TV display board.",
    },
    {
        question: "What is the price of the Basic Plan?",
        answer:
            "The Basic Plan is ₹1,499 per month after the 14-day free trial. It is best for hospitals that want OPD token management, appointment booking and live patient tracking.",
    },
    {
        question: "What is included in the Premium Plan?",
        answer:
            "Premium includes everything in Basic, plus consultation records, prescription workflow, AI transcription or clinical assistance, lab tests, lab orders, lab technician dashboard, reports and advanced analytics.",
    },
    {
        question: "What is the price of the Premium Plan?",
        answer:
            "The Premium Plan is ₹3,499 per month after the 14-day free trial. It is best for hospitals that want a complete clinical, lab and analytics workflow.",
    },
    {
        question: "Do patients need to install a mobile app?",
        answer:
            "No. Patients can open the secure tracking link directly in their mobile browser. They can see token status, patients ahead, estimated wait time, current serving token and doctor status.",
    },
    {
        question: "Can doctors manage their own queue?",
        answer:
            "Yes. Doctors get a dedicated queue screen where they can call the next patient, start serving, complete consultation, skip patients and update break status.",
    },
    {
        question: "What happens when a doctor goes on break?",
        answer:
            "When a doctor marks break status, the patient tracking page and hospital TV display can show that the doctor is on break. When the doctor resumes, the queue updates again automatically.",
    },
    {
        question: "Can the hospital show live tokens on a TV display?",
        answer:
            "Yes. The hospital can use a waiting-room TV display board to show the current token, next tokens, department name, doctor status and emergency priority.",
    },
];


/* ------------------------------------------------------------------
   HOME PAGE
------------------------------------------------------------------ */

export default function Home() {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);

    const [nightMode, setNightMode] = useState<boolean>(() => {
        if (typeof window === "undefined") {
            return false;
        }

        try {
            const savedTheme = window.localStorage.getItem(
                "nextsynq-home-theme",
            );

            if (savedTheme) {
                return savedTheme === "dark";
            }
        } catch {
            // The theme still works if browser storage is unavailable.
        }

        return window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches;
    });

    // Save the selected theme.
    useEffect(() => {
        try {
            window.localStorage.setItem(
                "nextsynq-home-theme",
                nightMode ? "dark" : "light",
            );
        } catch {
            // Saving this preference is optional.
        }
    }, [nightMode]);

    // Close mobile navigation with Escape or when switching to desktop.
    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMenuOpen(false);

                document
                    .querySelector<HTMLButtonElement>(".nx-menu")
                    ?.focus();
            }
        };

        const desktopQuery = window.matchMedia(
            "(min-width: 1024px)",
        );

        const handleDesktopChange = () => {
            if (desktopQuery.matches) {
                setMenuOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        desktopQuery.addEventListener(
            "change",
            handleDesktopChange,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );

            desktopQuery.removeEventListener(
                "change",
                handleDesktopChange,
            );
        };
    }, [menuOpen]);

    function scrollToSection(id: string) {
        setMenuOpen(false);

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        document.getElementById(id)?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });
    }

    function startTrial() {
        setMenuOpen(false);
        navigate("/register");
    }

    function bookAppointment() {
        setMenuOpen(false);
        navigate("/book-appointment");
    }

    return (
        <div
            className="nx-home"
            data-theme={nightMode ? "dark" : "light"}
        >
            <HomeStyles />





            <header className="nx-header">
                <div className="nx-container nx-header-row">
                    <button
                        type="button"
                        className="nx-brand"
                        onClick={() => scrollToSection("home")}
                        aria-label="NextSynq Health home"
                    >
                        <img className="nx-brand-image" src={LOGO_IMAGE}
                                    alt="NextSynq Health" width={2048} height={768} />
                    </button>

                    <nav
                        className="nx-desktop-nav"
                        aria-label="Main navigation"
                    >
                        {navigation.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => scrollToSection(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="nx-header-actions">
                        <button
                            type="button"
                            className="nx-theme-button"
                            onClick={() => setNightMode((previous) => !previous)}
                            aria-label={
                                nightMode
                                    ? "Switch to day mode"
                                    : "Switch to night mode"
                            }
                            aria-pressed={nightMode}
                            title={nightMode ? "Day mode" : "Night mode"}
                        >
                            {nightMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button
                            type="button"
                            className="nx-book-button"
                            onClick={bookAppointment}
                        >
                            <CalendarDays size={16} />
                            <span>Book Appointment</span>
                        </button>

                        <button
                            type="button"
                            className="nx-login-button"
                            onClick={() => navigate("/login")}
                        >
                            Log in
                        </button>

                        <button
                            type="button"
                            className="nx-button nx-header-trial"
                            onClick={startTrial}
                        >
                            Start Free Trial
                        </button>

                        <button
                            type="button"
                            className="nx-menu"
                            onClick={() => setMenuOpen((previous) => !previous)}
                            aria-label={
                                menuOpen
                                    ? "Close navigation"
                                    : "Open navigation"
                            }
                            aria-expanded={menuOpen}
                            aria-controls="nx-mobile-navigation"
                        >
                            {menuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {menuOpen && (
                    <nav
                        id="nx-mobile-navigation"
                        className="nx-mobile-nav"
                        aria-label="Mobile navigation"
                    >
                        {navigation.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => scrollToSection(item.id)}
                            >
                                {item.label}
                                <ChevronRight size={16} />
                            </button>
                        ))}

                        <div className="nx-mobile-actions">
                            <button
                                type="button"
                                className="nx-login-button"
                                onClick={() => navigate("/login")}
                            >
                                Log in
                            </button>

                            <button
                                type="button"
                                className="nx-button"
                                onClick={startTrial}
                            >
                                Start Free Trial
                            </button>
                        </div>
                    </nav>
                )}
            </header>

            <main>
                {/* HERO */}
                <section id="home" className="nx-hero">
                    <img
                        className="nx-hero-image"
                        src={HERO_IMAGE}
                        alt="Doctor in a bright hospital reception"
                    />

                    <div className="nx-container nx-hero-grid">
                        <div className="nx-hero-copy">
                            <div className="nx-hero-topline">
                                <span className="nx-kicker">
                                    All-in-one OPD management for hospitals
                                </span>
</div>

                            <h1>
                                Smarter OPD,
                                <br />
                                <em>
                                    Appointments, Tracking,
                                    <br />
                                    Lab & Display — All in One
                                </em>
                            </h1>

                            <p>
                                Manage walk-in patients, online appointments,
                                doctor queues, patient tracking, display boards
                                and lab workflows in one easy-to-use platform.
                            </p>

                            <div className="nx-hero-actions">
                                <button
                                    type="button"
                                    className="nx-button"
                                    onClick={startTrial}
                                >
                                    Start Free Trial
                                    <ArrowRight size={18} />
                                </button>

                                <button
                                    type="button"
                                    className="nx-button nx-button-outline"
                                    onClick={() => scrollToSection("display")}
                                >
                                    <LayoutDashboard size={18} />
                                    See It in Action
                                </button>
                            </div>

                            <div className="nx-assurances">
                                <span>
                                    <Check size={14} />
                                    14-day free trial
                                </span>
                                <span>
                                    <Check size={14} />
                                    Browser-based
                                </span>
                                <span>
                                    <Check size={14} />
                                    Built for your team
                                </span>
                            </div>
                        </div>

                        <div className="nx-hero-preview">
                            <span className="nx-handwritten">
                                Better care.
                                <br />
                                A more connected day. ♡
                            </span>

                            <DashboardPreview />
                        </div>
                    </div>
                </section>

                {/* HOSPITAL TEAM STRIP */}
                <div className="nx-team-strip">
                    <div className="nx-container nx-team-strip-inner">
                        <small>DESIGNED FOR HOSPITAL TEAMS</small>

                        {hospitalTeams.map(({ label, icon: Icon }) => (
                            <span key={label}>
                                <Icon size={23} />
                                {label}
                            </span>
                        ))}

                        <small className="nx-team-note">
                            One platform. Connected care.
                        </small>
                    </div>
                </div>

                {/* FEATURES */}
                <section
                    id="features"
                    className="nx-section nx-container"
                >
                    <SectionHeading
                        eyebrow="BUILT FOR HOSPITALS & DOCTORS"
                        title="Real tools for a smoother hospital day."
                        description="Bring your people and processes together—from registration to reports."
                    />

                    <div className="nx-benefit-grid">
                        {benefits.map(({ icon: Icon, title, text }) => (
                            <article key={title} className="nx-benefit">
                                <span className="nx-feature-icon">
                                    <Icon size={24} />
                                </span>

                                <div>
                                    <h3>{title}</h3>
                                    <p>{text}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {/* DESKTOP, TV AND MOBILE PREVIEWS */}
                <section id="display" className="nx-section nx-showcase">
                    <div className="nx-container">
                        <SectionHeading
                            eyebrow="SEE IT IN ACTION"
                            title="Complete OPD experience — on screen & on mobile"
                            description="The same visit. A clearer view for every team."
                        />

                        <p className="nx-section-description">
                            Patients, doctors and staff stay connected as your
                            team updates the visit.
                        </p>

                        <div className="nx-device-grid">
                            <div className="nx-tv-column">
                                <h3 className="nx-device-label">
                                    TV DISPLAY BOARD · HOSPITAL
                                </h3>
                                <TVPreview />
                            </div>

                            <div className="nx-phone-column">
                                <h3 className="nx-device-label">
                                    MOBILE PATIENT TRACKING
                                </h3>
                                <PhonePreview />
                            </div>

                            <div className="nx-doctor-column">
                                <h3 className="nx-device-label">
                                    DOCTOR / ADMIN WORKSPACE
                                </h3>
                                <DoctorPreview />
                            </div>
                        </div>

                        <p className="nx-example-note">
                            Illustrative previews with sample data. Waiting
                            times are estimates.
                        </p>
                    </div>
                </section>

                {/* PRICING */}
                <section
                    id="pricing"
                    className="nx-section nx-container"
                >
                    <SectionHeading
                        eyebrow="CHOOSE WHAT FITS YOUR HOSPITAL"
                        title="Simple, transparent pricing"
                        description="Start with a 14-day free trial. Monthly pricing applies after the trial."
                    />

                    <div className="nx-pricing-grid">
                        <PricingCard
                            title="Basic Plan"
                            price="₹1,499"
                            description="The essentials for your daily OPD."
                            features={basicFeatures}
                            onChoose={startTrial}
                        />

                        <PricingCard
                            premium
                            title="Premium Plan"
                            price="₹3,499"
                            description="Connect your clinical and lab workflows."
                            features={premiumFeatures}
                            onChoose={startTrial}
                        />

                        <aside
                            id="doctor-choice"
                            className="nx-doctor-choice"
                        >
                            <div className="nx-care-image">
                                <img
                                    src={HERO_IMAGE}
                                    alt="Doctor"
                                    loading="lazy"
                                />
                                <span>DOCTOR-LED CARE</span>
                            </div>

                            <div className="nx-care-content">
                                <h3>
                                    AI assists.
                                    <br />
                                    The doctor decides.
                                </h3>

                                <p>
                                    Review transcripts, notes and prescription
                                    suggestions. The treating doctor chooses
                                    the final prescription and can order lab
                                    tests.
                                </p>

                                <strong>
                                    <ShieldCheck size={18} />
                                    Final clinical decisions stay with the doctor.
                                </strong>
                            </div>

                            <div className="nx-care-steps">
                                <span>
                                    <b>Record</b>
                                    Consultation
                                </span>
                                <span>
                                    <b>Review</b>
                                    AI drafts
                                </span>
                                <span>
                                    <b>Complete</b>
                                    Doctor-led
                                </span>
                            </div>
                        </aside>
                    </div>
                </section>

                {/* WORKFLOW */}
                <section
                    id="workflow"
                    className="nx-section nx-workflow"
                >
                    <div className="nx-container">
                        <SectionHeading
                            eyebrow="A SIMPLE WORKFLOW. A MORE CONNECTED DAY."
                            title="From reception to reports — all connected"
                            description="One platform. A clearer patient journey."
                        />

                        <ol className="nx-workflow-list">
                            {workflowSteps.map(
                                ({ icon: Icon, title, text }, index) => (
                                    <li key={title}>
                                        <span className="nx-feature-icon">
                                            <Icon size={24} />
                                        </span>

                                        <div>
                                            <h3>{title}</h3>
                                            <p>{text}</p>
                                        </div>

                                        {index < workflowSteps.length - 1 && (
                                            <ChevronRight
                                                className="nx-step-arrow"
                                                size={18}
                                            />
                                        )}
                                    </li>
                                ),
                            )}
                        </ol>
                    </div>
                </section>

                {/* Compact categories and a single open answer keep FAQs easy to scan. */}
                <FAQSection />
            </main>

            {/* FOOTER */}
            <footer className="nx-footer">
                <div className="nx-container">
                    <div className="nx-footer-grid">
                        <div>
                            <a href="#home" className="nx-brand">
                                <img className="nx-brand-image" src={LOGO_IMAGE}
                                    alt="NextSynq Health" width={2048} height={768} />
                            </a>

                            <p>
                                Smarter workflows.
                                <br />
                                More connected hospital teams.
                            </p>
                        </div>

                        <div>
                            <h3>Product</h3>
                            <button
                                type="button"
                                onClick={() => scrollToSection("features")}
                            >
                                Features
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToSection("pricing")}
                            >
                                Pricing
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToSection("display")}
                            >
                                Live previews
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToSection("faq")}
                            >
                                FAQ
                            </button>
                        </div>

                        <div>
                            <h3>For your team</h3>
                            <button
                                type="button"
                                onClick={() => scrollToSection("features")}
                            >
                                Hospitals
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToSection("doctor-choice")}
                            >
                                Doctors
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToSection("workflow")}
                            >
                                Reception & labs
                            </button>
                        </div>

                        <div>
                            <h3>Get started</h3>
                            <button type="button" onClick={bookAppointment}>
                                Book Appointment
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                            >
                                Log in
                            </button>
                            <button type="button" onClick={startTrial}>
                                Create your account
                            </button>
                        </div>

                        <div className="nx-footer-cta">
                            <h3>Bring your hospital together</h3>
                            <p>Explore NextSynq Health with your team.</p>
                            <button
                                type="button"
                                className="nx-button"
                                onClick={startTrial}
                            >
                                Start your 14-day trial
                                <ArrowRight size={17} />
                            </button>
                        </div>
                    </div>

                    <div className="nx-footer-bottom">
                        <small>
                            © {new Date().getFullYear()} NextSynq Health.
                            All rights reserved.
                        </small>
                        <div className="nx-social-links" aria-label="Social media">
                            {[
                                { label: "Instagram", url: SOCIAL_LINKS.instagram, Icon: Instagram },
                                { label: "LinkedIn", url: SOCIAL_LINKS.linkedin, Icon: Linkedin },
                            ].map(({ label, url, Icon }) => (
                                url ? (
                                    <a key={label} href={url} target="_blank"
                                        rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}>
                                        <Icon size={18} aria-hidden="true" />
                                        {label}
                                    </a>
                                ) : (
                                    <button key={label} type="button" disabled
                                        title={`${label} profile coming soon`}>
                                        <Icon size={18} aria-hidden="true" />
                                        {label}
                                    </button>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/* ------------------------------------------------------------------
   SMALL REUSABLE COMPONENTS
------------------------------------------------------------------ */

interface SectionHeadingProps {
    eyebrow: string;
    title: string;
    description: string;
}

function SectionHeading({
    eyebrow,
    title,
    description,
}: SectionHeadingProps) {
    return (
        <div className="nx-section-heading">
            <div>
                <span>{eyebrow}</span>
                <h2>{title}</h2>
            </div>
            <p>{description}</p>
        </div>
    );
}

function SmallLogo() {
    return (
        <span className="nx-small-logo">
            <img src={LOGO_IMAGE} alt="NextSynq Health" width={2048} height={768} />
        </span>
    );
}

/* ------------------------------------------------------------------
   ILLUSTRATIVE DASHBOARD
------------------------------------------------------------------ */

function DashboardPreview() {
    const statistics = [
        { label: "Patients today", value: "124" },
        { label: "Appointments", value: "48" },
        { label: "Consultations", value: "96" },
        { label: "Lab tests", value: "32" },
    ];

    const sidebarItems = [
        "Dashboard",
        "OPD",
        "Appointments",
        "Patients",
        "Doctors",
        "Lab",
        "Display board",
    ];

    const doctors = [
        "Dr. Sharma",
        "Dr. Anand",
        "Dr. Mehta",
        "Dr. Roy",
        "Dr. Rao",
    ];

    return (
        <div className="nx-monitor">
            <div className="nx-window-header">
                <SmallLogo />
                <span>Hospital overview · Example</span>
            </div>

            <div className="nx-dashboard-layout">
                <aside className="nx-preview-sidebar">
                    {sidebarItems.map((label, index) => (
                        <span key={label} data-active={index === 0}>
                            <LayoutDashboard size={10} />
                            {label}
                        </span>
                    ))}
                </aside>

                <div className="nx-dashboard-content">
                    <div className="nx-dashboard-stats">
                        {statistics.map(({ label, value }) => (
                            <div key={label}>
                                <small>{label}</small>
                                <strong>{value}</strong>
                            </div>
                        ))}
                    </div>

                    <div className="nx-dashboard-bottom">
                        <div>
                            <h4>Live OPD queue</h4>

                            <div className="nx-preview-table">
                                {doctors.map((doctor, index) => (
                                    <div key={doctor}>
                                        <b>{102 - index}</b>
                                        <span>{doctor}</span>
                                        <small>
                                            {index === 0
                                                ? "Serving"
                                                : "Waiting"}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="nx-chart">
                            <h4>Today’s overview</h4>

                            <div
                                className="nx-chart-bars"
                                aria-label="Illustrative activity chart"
                            >
                                {[36, 60, 48, 75, 92, 65, 85].map(
                                    (height, index) => (
                                        <span key={index}>
                                            <i
                                                style={{
                                                    height: `${height}%`,
                                                }}
                                            />
                                            <i
                                                style={{
                                                    height: `${height * 0.72}%`,
                                                }}
                                            />
                                        </span>
                                    ),
                                )}
                            </div>

                            <small>Illustrative activity</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TVPreview() {
    return (
        <div className="nx-tv">
            <div className="nx-tv-screen">
                <div className="nx-tv-header">
                    <SmallLogo />
                    <span>Hospital OPD</span>
                </div>

                <div className="nx-tv-grid">
                    <div className="nx-tv-current">
                        <small>Now serving</small>
                        <strong>102</strong>

                        <span>
                            <Stethoscope size={16} />
                            Dr. Sharma
                        </span>

                        <small>General medicine</small>
                    </div>

                    <div className="nx-tv-next">
                        <small>Next tokens</small>

                        {[103, 104, 105, 106].map((token) => (
                            <div key={token}>
                                <b>{token}</b>
                                <span>Dr. Sharma</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="nx-tv-footer">
                    <span>Keep your token ready</span>
                    <SmallLogo />
                </div>
            </div>

            <div className="nx-tv-feet" aria-hidden="true" />
        </div>
    );
}

function PhonePreview() {
    return (
        <div className="nx-phone">
            <div className="nx-phone-notch" aria-hidden="true" />

            <div className="nx-phone-header">
                <SmallLogo />
                <ShieldCheck size={13} />
            </div>

            <div className="nx-phone-token">
                <small>Your token number</small>
                <strong>105</strong>
                <span>You’re in the queue</span>
            </div>

            <div className="nx-phone-doctor">
                <span>
                    <Stethoscope size={21} />
                </span>
                <div>
                    <b>Dr. Sharma</b>
                    <small>General medicine</small>
                </div>
            </div>

            <div className="nx-phone-detail">
                <Clock3 size={16} />
                <span>
                    Estimated wait
                    <b>~15 minutes</b>
                </span>
            </div>

            <div className="nx-phone-detail">
                <Users size={16} />
                <span>
                    Patients ahead
                    <b>2</b>
                </span>
            </div>

            <div className="nx-phone-detail">
                <Activity size={16} />
                <span>
                    Doctor status
                    <b>Available</b>
                </span>
            </div>

            <div className="nx-phone-timing">
                <span>Doctor timing</span>
                <b>9:00 AM – 1:00 PM</b>
            </div>

            <small className="nx-phone-note">
                Your queue updates automatically.
            </small>
        </div>
    );
}

function DoctorPreview() {
    return (
        <div className="nx-monitor nx-doctor-monitor">
            <div className="nx-window-header">
                <SmallLogo />
                <span>Example</span>
            </div>

            <div className="nx-doctor-content">
                <h4>
                    Doctor queue
                    <span>● Online</span>
                </h4>

                <div className="nx-doctor-select">
                    Dr. Sharma · General medicine
                </div>

                <div className="nx-doctor-tabs">
                    <b>Waiting (5)</b>
                    <span>Completed (12)</span>
                </div>

                <div className="nx-preview-table">
                    {[102, 101, 100, 99, 98].map((token, index) => (
                        <div key={token}>
                            <b>{token}</b>
                            <span>Sample patient {index + 1}</span>
                            <small>Waiting</small>
                        </div>
                    ))}
                </div>

                {/* Labels illustrate controls; they do not change real data. */}
                <div
                    className="nx-preview-actions"
                    aria-label="Example doctor actions"
                >
                    <span>Call next</span>
                    <span>Start visit</span>
                    <span>Complete</span>
                </div>
            </div>
        </div>
    );
}

interface PricingCardProps {
    title: string;
    price: string;
    description: string;
    features: string[];
    premium?: boolean;
    onChoose: () => void;
}

function PricingCard({
    title,
    price,
    description,
    features,
    premium = false,
    onChoose,
}: PricingCardProps) {
    return (
        <article className="nx-plan" data-premium={premium}>
            {premium && (
                <span className="nx-plan-badge">PREMIUM WORKFLOW</span>
            )}

            <div className="nx-plan-heading">
                <span className="nx-feature-icon">
                    {premium ? (
                        <ShieldCheck size={26} />
                    ) : (
                        <Users size={26} />
                    )}
                </span>

                <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>
            </div>

            <div className="nx-price">
                <strong>{price}</strong>
                <span>/ month</span>
            </div>

            <ul>
                {features.map((feature) => (
                    <li key={feature}>
                        <Check size={16} />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <p className="nx-trial-note">
                14 days free · Monthly pricing after trial
            </p>

            <button
                type="button"
                className="nx-button"
                onClick={onChoose}
            >
                Choose {premium ? "Premium" : "Basic"}
                <ArrowRight size={17} />
            </button>
        </article>
    );
}


// Inline social icons keep this file compatible with Lucide versions without brand icons.
function Instagram({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

function Linkedin({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.5 9h3v12h-3V9ZM9 9h3v1.6c.8-1.2 2-1.9 3.6-1.9 3.5 0 4.9 2.1 4.9 5.4V21h-3v-6.2c0-2-.5-3.2-2.4-3.2-2 0-3.1 1.3-3.1 3.5V21H9V9Z" />
        </svg>
    );
}

// These categories use the original FAQ order; answers remain unchanged.
const faqCategories = ["All questions", "Getting started", "Plans & pricing", "Daily workflow"];
const faqCategoryByIndex = [1, 1, 2, 2, 2, 2, 3, 3, 3, 3];

function FAQSection() {
    const [category, setCategory] = useState(0);
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    function selectCategory(index: number) {
        setCategory(index);
        // Open the first answer in the chosen category.
        setOpenIndex(index === 0 ? 0 : faqCategoryByIndex.indexOf(index));
    }

    return (
        <section id="faq" className="nx-section nx-container nx-faq-section"
            aria-labelledby="nx-faq-title">
            <div className="nx-faq-layout">
                <div className="nx-faq-intro">
                    <span className="nx-faq-eyebrow">GOOD TO KNOW</span>
                    <h2 id="nx-faq-title">A clearer start for your hospital.</h2>
                    <p>Plans, appointments and daily workflows. Find the answers you need.</p>
                    <a className="nx-faq-plan-link" href="#pricing">
                        Compare plans <ArrowRight size={17} aria-hidden="true" />
                    </a>
                    <div className="nx-faq-trial">
                        <ShieldCheck size={22} aria-hidden="true" />
                        <div><strong>14-day free trial</strong><span>Explore with your hospital team.</span></div>
                    </div>
                </div>

                <div className="nx-faq-content">
                    <div className="nx-faq-filters" role="group" aria-label="Filter questions">
                        {faqCategories.map((label, index) => (
                            <button key={label} type="button" aria-pressed={category === index}
                                onClick={() => selectCategory(index)}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="nx-faq-list">
                        {faqItems.map((item, index) => (
                            (category === 0 || faqCategoryByIndex[index] === category) && (
                                <FAQItem key={item.question} question={item.question}
                                    answer={item.answer} index={index} open={openIndex === index}
                                    onToggle={() => setOpenIndex(openIndex === index ? null : index)} />
                            )
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

interface FAQItemProps {
    question: string;
    answer: string;
    index: number;
    open: boolean;
    onToggle: () => void;
}

function FAQItem({ question, answer, index, open, onToggle }: FAQItemProps) {
    const questionId = `nx-faq-question-${index}`;
    const answerId = `nx-faq-answer-${index}`;

    return (
        <article className="nx-faq-item" data-open={open}>
            <h3>
                <button id={questionId} type="button" aria-expanded={open}
                    aria-controls={answerId} onClick={onToggle}>
                    <span>{question}</span>
                    <ChevronDown size={19} aria-hidden="true" />
                </button>
            </h3>
            {/* Hidden answers are also removed from keyboard/screen-reader navigation. */}
            <div id={answerId} className="nx-faq-panel" role="region"
                aria-labelledby={questionId} hidden={!open}>
                <p>{answer}</p>
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------
   STYLES
   Scoped to this page to avoid changing other application screens.
------------------------------------------------------------------ */

function HomeStyles() {
    return (
        <style>{`
            .nx-home {
                --ink: #173d39;
                --green: #176957;
                --muted: #64775c;
                --line: #dce5d4;
                --surface: #ffffff;
                --soft: #edf3e4;
                --paper: #fafbf7;

                background: var(--paper);
                color: var(--ink);
                font-family: inherit;
                line-height: 1.5;
                overflow-x: clip;
            }

            .nx-home * {
                box-sizing: border-box;
            }

            .nx-home h1,
            .nx-home h2,
            .nx-home h3,
            .nx-home h4,
            .nx-home p {
                margin: 0;
            }

            .nx-home button,
            .nx-home a {
                font: inherit;
            }

            .nx-home button {
                cursor: pointer;
            }

            .nx-home a {
                color: inherit;
                text-decoration: none;
            }

            .nx-home button:focus-visible,
            .nx-home a:focus-visible {
                outline: 3px solid #80ac89;
                outline-offset: 4px;
            }

            .nx-home section[id],
            .nx-home aside[id] {
                scroll-margin-top: 88px;
            }

            /* Every section spans the desktop screen. */
            .nx-container {
                width: 100%;
                max-width: none;
                margin: 0;
                padding-left: 24px;
                padding-right: 24px;
            }

            /* Theme switch now lives inside the hero section, not the header. */
            .nx-hero-topline {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                width: min(100%, 660px);
            }

            .nx-hero-theme-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 40px;
                padding: 8px 12px;
                border: 1px solid var(--line);
                border-radius: 999px;
                background: color-mix(in srgb, var(--surface) 92%, transparent);
                color: var(--ink);
                box-shadow: 0 3px 12px #173d3914;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
            }

            .nx-hero-theme-button:hover {
                border-color: var(--green);
                background: var(--soft);
            }

            .nx-theme-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                width: 44px;
                height: 44px;
                padding: 0;
                border: 1px solid var(--line);
                border-radius: 999px;
                background: var(--soft);
                color: var(--ink);
                box-shadow: 0 3px 12px #173d3910;
            }

            .nx-theme-button:hover {
                border-color: var(--green);
                background: var(--surface);
                color: var(--green);
            }

.nx-theme-button:hover {
                background: var(--soft);
            }

            .nx-header {
                position: sticky;
                top: 0;
                z-index: 50;
                background: var(--surface);
                border-bottom: 1px solid var(--line);
            }

            .nx-header-row {
                display: flex;
                align-items: center;
                gap: 22px;
                min-height: 72px;
                padding-left:   24px;
                padding-right: 24px;
            }

            .nx-brand {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
                padding: 0;
                border: 0;
                background: none;
                color: var(--ink);
                text-align: left;
            }

            .nx-brand-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 35px;
                height: 38px;
                border-radius: 10px;
                background: #173d39;
                color: #ecf3df;
            }

            .nx-brand strong {
                display: block;
                font-size: 23px;
                font-weight: 750;
                letter-spacing: -0.9px;
                line-height: 1.1;
            }

            .nx-brand small {
                display: block;
                margin-top: 4px;
                color: var(--muted);
                font-size: 8px;
                font-weight: 650;
                letter-spacing: 3px;
            }

            .nx-desktop-nav {
                display: flex;
                align-items: center;
                gap: 22px;
                margin-left: auto;
            }

            .nx-desktop-nav button {
                min-height: 44px;
                padding: 8px 0;
                border: 0;
                background: none;
                color: var(--ink);
                font-size: 12px;
                white-space: nowrap;
            }

            .nx-desktop-nav button:hover {
                color: var(--green);
            }

            /* Space between Book Appointment, Login and Trial. */
            .nx-header-actions {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-left: auto;
            }

            .nx-button,
            .nx-book-button,
            .nx-login-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 44px;
                border-radius: 8px;
                font-size: 12px !important;
                font-weight: 650 !important;
                white-space: nowrap;
            }

            .nx-button {
                padding: 11px 20px;
                border: 1px solid #176957;
                background: #176957;
                color: #ffffff;
                transition: background 0.2s ease;
            }

            .nx-button:hover {
                background: #125546;
            }

            .nx-button-outline {
                background: var(--surface);
                border-color: var(--green);
                color: var(--green);
            }

            .nx-button-outline:hover {
                background: var(--soft);
            }

            .nx-book-button {
                padding: 9px 13px;
                border: 1px solid var(--line);
                background: var(--soft);
                color: var(--green);
            }

            .nx-login-button {
                padding: 9px 19px;
                border: 1px solid var(--line);
                background: var(--surface);
                color: var(--ink);
            }

            .nx-login-button:hover {
                border-color: var(--green);
                background: var(--soft);
            }

            .nx-menu {
                display:  none;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 44px;
                flex-shrink: 0;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: var(--surface);
                color: var(--ink);
            }

            .nx-mobile-nav {
                max-height: 70dvh;
                overflow-y: auto;
                padding: 12px 20px 20px;
                border-top: 1px solid var(--line);
                background: var(--surface);
            }

            .nx-mobile-nav > button {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                min-height: 44px;
                padding: 9px 0;
                border: 0;
                background: none;
                color: var(--ink);
                text-align: left;
            }

            .nx-mobile-actions {
                display: flex;
                gap: 14px;
                padding-top: 14px;
            }

            /* Hero */
            .nx-hero {
                position: relative;
                overflow: hidden;
                background: var(--paper);
            }

            .nx-hero-image {
                position: absolute;
                top: 0;
                right: 0;
                width: 76%;
                height: 100%;
                object-fit: cover;
                object-position: center 20%;
                opacity: 0.88;
            }

            .nx-hero::after {
                position: absolute;
                inset: 0;
                content: "";
                pointer-events: none;
                background: linear-gradient(
                    90deg,
                    var(--paper) 0%,
                    var(--paper) 25%,
                    transparent 80%
                );
            }

            .nx-hero-grid {
                position: relative;
                z-index: 1;
                display: grid;
                grid-template-columns: minmax(0, 1.08fr) minmax(0, 1.25fr);
                align-items: center;
                gap: 36px;
                min-height: 530px;
                padding-top: 40px;
                padding-bottom: 36px;
            }

            .nx-hero-copy {
                min-width: 0;
                max-width: none;
            }

            .nx-kicker {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 16px;
                background: #e3eee0;
                color: #285c48;
                font-size: 11px;
                font-weight: 650;
            }

            .nx-hero h1 {
                margin: 15px 0;
                font-size: clamp(34px, 3.4vw, 56px);
                font-weight: 750;
                line-height: 1.1;
                letter-spacing: -1.4px;
            }

            .nx-hero em {
                color: var(--green);
                font-style: normal;
            }

            .nx-hero-copy > p {
                max-width: 650px;
                font-size: 16px;
                line-height: 1.7;
            }

            .nx-hero-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 14px;
                margin-top: 24px;
            }

            .nx-assurances {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                margin-top: 22px;
            }

            .nx-assurances span {
                display: flex;
                align-items: center;
                gap: 5px;
                color: var(--green);
                font-size: 10px;
            }

            .nx-assurances svg {
                border-radius: 50%;
                background: #e1efde;
            }

            .nx-hero-preview {
                position: relative;
                align-self: end;
                min-width: 0;
                width: 100%;
                padding-top: 130px;
            }

            .nx-handwritten {
                position: absolute;
                top: 6px;
                right: 12px;
                color: #285f4d;
                font-family: cursive;
                font-size: 21px;
                font-style: italic;
                line-height: 1.5;
                transform: rotate(-8deg);
                text-shadow: 0 1px 5px #ffffff;
            }

            /* Dashboard preview */
            .nx-monitor {
                min-width: 0;
                overflow: hidden;
                border: 6px solid #203d34;
                border-radius: 14px 14px 5px 5px;
                background: var(--surface);
                box-shadow: 0 12px 30px #173d3920;
            }

            .nx-window-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 10px 12px;
                border-bottom: 1px solid var(--line);
                background: var(--soft);
            }

            .nx-window-header > span:last-child {
                color: var(--muted);
                font-size: 9px;
            }

            .nx-small-logo {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 750;
                white-space: nowrap;
            }

            .nx-small-logo svg {
                flex-shrink: 0;
                color: var(--green);
            }

            .nx-dashboard-layout {
                display: grid;
                grid-template-columns: 95px minmax(0, 1fr);
            }

            .nx-preview-sidebar {
                padding: 8px 4px;
                background: var(--soft);
                color: var(--muted);
                font-size: 8px;
            }

            .nx-preview-sidebar > span {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 9px 5px;
                border-radius: 4px;
            }

            .nx-preview-sidebar > span[data-active="true"] {
                background: #176957;
                color: #ffffff;
            }

            .nx-dashboard-content {
                min-width: 0;
                padding: 14px;
            }

            .nx-dashboard-stats {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 9px;
            }

            .nx-dashboard-stats > div {
                padding: 12px 9px;
                border: 1px solid var(--line);
                border-radius: 7px;
                background: var(--paper);
            }

            .nx-dashboard-stats small {
                display: block;
                color: var(--muted);
                font-size: 8px;
            }

            .nx-dashboard-stats strong {
                display: block;
                margin-top: 5px;
                font-size: 24px;
            }

            .nx-dashboard-bottom {
                display: grid;
                grid-template-columns: 1.25fr 1fr;
                gap: 16px;
                margin-top: 18px;
            }

            .nx-monitor h4 {
                font-size: 12px;
                font-weight: 700;
            }

            .nx-preview-table > div {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                padding: 10px 4px;
                border-bottom: 1px solid var(--line);
                font-size: 10px;
            }

            .nx-preview-table small {
                padding: 3px 6px;
                border-radius: 6px;
                background: var(--soft);
                color: var(--green);
                font-size: 8px;
            }

            .nx-chart-bars {
                display: flex;
                align-items: flex-end;
                gap: 8px;
                height: 125px;
                margin-top: 15px;
                border-bottom: 1px solid var(--line);
            }

            .nx-chart-bars > span {
                display: flex;
                align-items: flex-end;
                flex: 1;
                gap: 3px;
                height: 100%;
            }

            .nx-chart-bars i {
                display: block;
                width: 50%;
                background: #176957;
            }

            .nx-chart-bars i + i {
                background: #a3ccb0;
            }

            .nx-chart > small {
                display: block;
                margin-top: 6px;
                color: var(--muted);
                font-size: 8px;
            }

            /* Team strip and section headings */
            .nx-team-strip {
                border-top: 1px solid var(--line);
                border-bottom: 1px solid var(--line);
                background: var(--soft);
            }

            .nx-team-strip-inner {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 22px;
                padding-top: 19px;
                padding-bottom: 19px;
            }

            .nx-team-strip small {
                color: var(--muted);
                font-size: 9px;
                font-weight: 650;
            }

            .nx-team-strip-inner > span {
                display: flex;
                align-items: center;
                gap: 7px;
                color: var(--green);
                font-size: 17px;
                font-weight: 700;
            }

            .nx-section {
                padding-top: 42px;
                padding-bottom: 42px;
            }

            .nx-section-heading {
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: 30px;
                margin-bottom: 23px;
            }

            .nx-section-heading > div > span {
                display: block;
                margin-bottom: 5px;
                color: var(--green);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 1.2px;
            }

            .nx-section-heading h2 {
                font-size: clamp(25px, 2.3vw, 35px);
                font-weight: 700;
                line-height: 1.2;
                letter-spacing: -0.7px;
            }

            .nx-section-heading > p {
                max-width: 350px;
                color: var(--muted);
                font-size: 12px;
                line-height: 1.65;
            }

            .nx-benefit-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 15px;
            }

            .nx-benefit {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 20px 17px;
                border: 1px solid var(--line);
                border-radius: 12px;
                background: var(--surface);
            }

            .nx-feature-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background: var(--soft);
                color: var(--green);
            }

            .nx-benefit h3 {
                margin-bottom: 6px;
                font-size: 14px;
                font-weight: 700;
                line-height: 1.4;
            }

            .nx-benefit p {
                color: var(--muted);
                font-size: 12px;
                line-height: 1.6;
            }

            /* Three-device display section */
            .nx-showcase {
                background: var(--soft);
            }

            .nx-section-description {
                margin-top: -12px !important;
                margin-bottom: 25px !important;
                color: var(--muted);
                font-size: 13px;
            }

            .nx-device-grid {
                display: grid;
                grid-template-columns: 1.13fr 0.5fr 1.1fr;
                align-items: center;
                gap: 30px;
            }

            .nx-device-grid > div {
                min-width: 0;
            }

            .nx-device-label {
                margin-bottom: 15px !important;
                font-size: 11px;
                font-weight: 650;
                letter-spacing: 1px;
                text-align: center;
            }

            .nx-tv {
                position: relative;
                padding-bottom: 16px;
            }

            .nx-tv-screen {
                padding: 17px;
                border: 6px solid #213b33;
                border-radius: 4px;
                background: #173d39;
                color: #e9f1e3;
                box-shadow: 0 10px 18px #173d3920;
            }

            .nx-tv-header,
            .nx-tv-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }

            .nx-tv-header {
                margin-bottom: 17px;
                font-size: 10px;
            }

            .nx-tv .nx-small-logo svg {
                color: #a7d1b4;
            }

            .nx-tv-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }

            .nx-tv-current,
            .nx-tv-next {
                padding: 15px 11px;
                border: 1px solid #78a08c;
                border-radius: 9px;
            }

            .nx-tv-current {
                text-align: center;
            }

            .nx-tv-current > small {
                display: block;
                font-size: 12px;
            }

            .nx-tv-current > strong {
                display: block;
                margin: 16px 0;
                font-size: clamp(45px, 5vw, 78px);
                line-height: 1.15;
            }

            .nx-tv-current > span {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 14px;
            }

            .nx-tv-current > small:last-child {
                margin-top: 7px;
                font-size: 10px;
            }

            .nx-tv-next > small {
                font-size: 11px;
            }

            .nx-tv-next > div {
                display: flex;
                align-items: center;
                gap: 9px;
                margin-top: 6px;
                padding: 11px 6px;
                border-radius: 5px;
                background: #ffffff09;
            }

            .nx-tv-next b {
                font-size: 20px;
            }

            .nx-tv-next span {
                font-size: 10px;
            }

            .nx-tv-footer {
                margin-top: 16px;
                color: #bed8c3;
                font-size: 9px;
            }

            .nx-tv-feet::before,
            .nx-tv-feet::after {
                position: absolute;
                bottom: 0;
                left: 8%;
                width: 8px;
                height: 18px;
                content: "";
                background: #213b33;
                transform: skew(-23deg);
            }

            .nx-tv-feet::after {
                right: 8%;
                left: auto;
                transform: skew(23deg);
            }

            .nx-phone {
                position: relative;
                max-width: 245px;
                margin: auto;
                padding: 13px 11px 16px;
                border: 6px solid #233c32;
                border-radius: 26px;
                background: var(--surface);
                box-shadow: 0 8px 19px #173d3920;
            }

            .nx-phone-notch {
                position: absolute;
                top: 0;
                left: 27.5%;
                width: 45%;
                height: 8px;
                border-radius: 0 0 9px 9px;
                background: #233c32;
            }

            .nx-phone-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 5px;
                padding: 7px 0 12px;
            }

            .nx-phone-token {
                padding: 14px 7px;
                border-radius: 8px;
                background: #176957;
                color: #ffffff;
                text-align: center;
            }

            .nx-phone-token small {
                font-size: 10px;
            }

            .nx-phone-token strong {
                display: block;
                font-size: 42px;
                line-height: 1.2;
            }

            .nx-phone-token > span {
                display: block;
                margin-top: 4px;
                font-size: 9px;
            }

            .nx-phone-doctor {
                display: flex;
                align-items: center;
                gap: 7px;
                margin: 12px 0;
            }

            .nx-phone-doctor > span {
                display: flex;
                padding: 7px;
                border-radius: 50%;
                background: var(--soft);
                color: var(--green);
            }

            .nx-phone-doctor b,
            .nx-phone-doctor small {
                display: block;
                font-size: 10px;
            }

            .nx-phone-doctor small {
                color: var(--muted);
                font-size: 8px;
            }

            .nx-phone-detail {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 7px;
                padding: 10px 8px;
                border: 1px solid var(--line);
                border-radius: 7px;
                color: var(--green);
            }

            .nx-phone-detail span {
                color: var(--muted);
                font-size: 9px;
            }

            .nx-phone-detail b {
                display: block;
                color: var(--ink);
                font-size: 11px;
            }

            .nx-phone-timing {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-top: 11px;
                color: var(--muted);
                font-size: 9px;
            }

            .nx-phone-timing b {
                color: var(--ink);
            }

            .nx-phone-note {
                display: block;
                margin-top: 12px;
                color: var(--muted);
                font-size: 8px;
                text-align: center;
            }

            .nx-doctor-monitor {
                border-radius: 8px;
            }

            .nx-doctor-content {
                padding: 17px;
            }

            .nx-doctor-content h4 {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 17px;
            }

            .nx-doctor-content h4 > span {
                color: var(--green);
                font-size: 10px;
            }

            .nx-doctor-select {
                margin-top: 12px;
                padding: 10px;
                border: 1px solid var(--line);
                border-radius: 6px;
                color: var(--muted);
                font-size: 11px;
            }

            .nx-doctor-tabs {
                display: flex;
                gap: 17px;
                padding: 15px 0;
                color: var(--muted);
                font-size: 10px;
            }

            .nx-doctor-tabs b {
                color: var(--green);
            }

            .nx-doctor-content .nx-preview-table > div {
                padding: 12px 6px;
                font-size: 11px;
            }

            .nx-doctor-content .nx-preview-table > div:first-child {
                background: var(--soft);
            }

            .nx-preview-actions {
                display: flex;
                gap: 7px;
                padding-top: 15px;
            }

            .nx-preview-actions > span {
                flex: 1;
                padding: 9px 4px;
                border: 1px solid var(--green);
                border-radius: 5px;
                color: var(--green);
                font-size: 10px;
                text-align: center;
            }

            .nx-preview-actions > span:first-child {
                background: #176957;
                color: #ffffff;
            }

            .nx-example-note {
                margin-top: 21px !important;
                color: var(--muted);
                font-size: 10px;
                text-align: center;
            }

            /* Pricing */
            .nx-pricing-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1.04fr;
                align-items: stretch;
                gap: 22px;
            }

            .nx-plan {
                position: relative;
                display: flex;
                flex-direction: column;
                padding: 25px;
                border: 1px solid var(--line);
                border-radius: 13px;
                background: var(--surface);
            }

            .nx-plan[data-premium="true"] {
                border-color: #338d70;
            }

            .nx-plan-badge {
                position: absolute;
                top: -11px;
                left: 50%;
                padding: 4px 12px;
                border-radius: 12px;
                background: #176957;
                color: #ffffff;
                font-size: 9px;
                white-space: nowrap;
                transform: translateX(-50%);
            }

            .nx-plan-heading {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .nx-plan h3 {
                font-size: 21px;
                font-weight: 700;
            }

            .nx-plan-heading p {
                color: var(--muted);
                font-size: 12px;
                line-height: 1.5;
            }

            .nx-price {
                display: flex;
                align-items: baseline;
                gap: 10px;
                margin: 18px 0 13px;
            }

            .nx-price strong {
                font-size: 40px;
                letter-spacing: -1px;
            }

            .nx-price span {
                color: var(--muted);
                font-size: 13px;
            }

            .nx-plan[data-premium="true"] .nx-price strong {
                color: var(--green);
            }

            .nx-plan ul {
                display: grid;
                gap: 9px;
                margin: 0 0 18px;
                padding: 0;
                list-style: none;
            }

            .nx-plan li {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                font-size: 13px;
                line-height: 1.5;
            }

            .nx-plan li svg {
                flex-shrink: 0;
                margin-top: 2px;
                color: var(--green);
            }

            .nx-trial-note {
                margin-top: auto !important;
                margin-bottom: 11px !important;
                color: var(--muted);
                font-size: 10px;
            }

            .nx-plan > .nx-button {
                width: 100%;
            }

            .nx-doctor-choice {
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid var(--line);
                border-radius: 13px;
                background: var(--soft);
            }

            .nx-care-image {
                position: relative;
                height: 160px;
                overflow: hidden;
            }

            .nx-care-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: 78% 28%;
            }

            .nx-care-image > span {
                position: absolute;
                bottom: 12px;
                left: 14px;
                padding: 5px 8px;
                border-radius: 5px;
                background: #eef4e8ed;
                color: #173d39;
                font-size: 9px;
                font-weight: 750;
            }

            .nx-care-content {
                padding: 20px;
            }

            .nx-care-content h3 {
                font-size: 26px;
                font-weight: 650;
                line-height: 1.2;
            }

            .nx-care-content p {
                margin: 10px 0;
                color: var(--muted);
                font-size: 12px;
                line-height: 1.7;
            }

            .nx-care-content > strong {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                color: var(--green);
                font-size: 11px;
                line-height: 1.6;
            }

            .nx-care-content > strong svg {
                flex-shrink: 0;
            }

            .nx-care-steps {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                margin-top: auto;
                padding: 14px 7px;
                background: var(--surface);
            }

            .nx-care-steps span {
                color: var(--muted);
                font-size: 9px;
                text-align: center;
            }

            .nx-care-steps span + span {
                border-left: 1px solid var(--line);
            }

            .nx-care-steps b {
                display: block;
                margin-bottom: 4px;
                color: var(--green);
                font-size: 16px;
            }

            /* Workflow and footer */
            .nx-workflow {
                background: var(--soft);
            }

            .nx-workflow-list {
                display: grid;
                grid-template-columns: repeat(5, minmax(0, 1fr));
                margin: 0;
                padding: 22px;
                border: 1px solid var(--line);
                border-radius: 13px;
                background: var(--surface);
                list-style: none;
            }

            .nx-workflow-list li {
                position: relative;
                display: flex;
                align-items: center;
                gap: 11px;
                padding-right: 19px;
            }

            .nx-workflow-list h3 {
                margin-bottom: 5px;
                font-size: 12px;
                font-weight: 750;
            }

            .nx-workflow-list p {
                color: var(--muted);
                font-size: 10px;
                line-height: 1.5;
            }

            .nx-step-arrow {
                position: absolute;
                right: 4px;
                color: var(--green);
            }


            /* FAQ section */
            .nx-faq-section {
                background:
                    radial-gradient(circle at 12% 10%, #e5efdf 0, transparent 26%),
                    var(--paper);
            }

            .nx-faq-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 14px;
                max-width: 1180px;
                margin: 0 auto;
            }

            .nx-faq-item {
                overflow: hidden;
                border: 1px solid var(--line);
                border-radius: 14px;
                background: var(--surface);
                box-shadow: 0 8px 20px #173d3908;
            }

            .nx-faq-item button {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                width: 100%;
                min-height: 66px;
                padding: 17px 18px;
                border: 0;
                background: transparent;
                color: var(--ink);
                text-align: left;
            }

            .nx-faq-item button span {
                font-size: 14px;
                font-weight: 750;
                line-height: 1.45;
            }

            .nx-faq-item button svg {
                flex-shrink: 0;
                color: var(--green);
                transition: transform 0.22s ease;
            }

            .nx-faq-item[data-open="true"] button svg {
                transform: rotate(180deg);
            }

            .nx-faq-answer {
                display: grid;
                grid-template-rows: 0fr;
                transition: grid-template-rows 0.22s ease;
            }

            .nx-faq-item[data-open="true"] .nx-faq-answer {
                grid-template-rows: 1fr;
            }

            .nx-faq-answer > p {
                min-height: 0;
                overflow: hidden;
                padding: 0 18px;
                color: var(--muted);
                font-size: 13px;
                line-height: 1.75;
            }

            .nx-faq-item[data-open="true"] .nx-faq-answer > p {
                padding-bottom: 18px;
            }


            .nx-footer {
                padding: 35px 0 23px;
                background: #173d39;
                color: #e5eedf;
            }

            .nx-footer-grid {
                display: grid;
                grid-template-columns: 1.2fr 0.7fr 0.8fr 0.85fr 1.6fr;
                gap: 30px;
            }

            .nx-footer .nx-brand {
                color: #edf5e5;
            }

            .nx-footer .nx-brand-icon {
                background: #276351;
            }

            .nx-footer .nx-brand small {
                color: #b9ceb4;
            }

            .nx-footer h3 {
                margin-bottom: 12px;
                font-size: 14px;
                font-weight: 650;
            }

            .nx-footer p {
                margin-top: 11px;
                color: #c3d1bc;
                font-size: 12px;
                line-height: 1.7;
            }

            .nx-footer-grid > div > button:not(.nx-button) {
                display: block;
                min-height: 32px;
                padding: 4px 0;
                border: 0;
                background: none;
                color: #d2dfcb;
                font-size: 12px;
                text-align: left;
            }

            .nx-footer-cta > .nx-button {
                margin-top: 16px;
                border-color: #3a8b6d;
                background: #26775d;
            }

            .nx-footer-bottom {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                margin-top: 34px;
                color: #c3d1bc;
            }

            .nx-footer-bottom small {
                font-size: 10px;
            }

            .nx-footer-bottom > span {
                font-family: cursive;
                font-size: 18px;
                font-style: italic;
            }

            /* Night mode preserves the teal and sage colour family. */
            .nx-home[data-theme="dark"] {
                --ink: #e5eee0;
                --green: #98c8ac;
                --muted: #b2c2a9;
                --line: #344d3c;
                --surface: #182a21;
                --soft: #22392b;
                --paper: #101e19;
            }

            .nx-home[data-theme="dark"] .nx-hero-image {
                opacity: 0.25;
            }

            .nx-home[data-theme="dark"] .nx-handwritten {
                color: #d1e3c9;
                text-shadow: none;
            }

            .nx-home[data-theme="dark"] .nx-kicker {
                background: #284634;
                color: #d2e7c7;
            }

            .nx-home[data-theme="dark"] .nx-assurances svg {
                background: #294633;
            }

            .nx-home[data-theme="dark"] .nx-care-image img {
                filter: brightness(0.75);
            }

            /* Keep hamburger hidden on desktop. It appears only on tablet/mobile. */
            @media (max-width: 1023px) {
                .nx-desktop-nav {
                    display: none;
                }

                .nx-menu {
                    display: flex;
                }
            }

            @media (max-width: 1099px) {
                .nx-header-trial {
                    display: none;
                }

                .nx-hero-grid {
                    gap: 24px;
                }

                .nx-hero h1 {
                    font-size: 35px;
                }

                .nx-hero-copy > p {
                    font-size: 14px;
                }

                .nx-dashboard-layout {
                    grid-template-columns: 70px minmax(0, 1fr);
                }

                .nx-preview-sidebar {
                    font-size: 7px;
                }

                .nx-dashboard-content {
                    padding: 9px;
                }

                .nx-dashboard-stats {
                    gap: 5px;
                }

                .nx-dashboard-stats > div {
                    padding: 9px 5px;
                }

                .nx-dashboard-stats strong {
                    font-size: 20px;
                }

                .nx-dashboard-bottom {
                    gap: 9px;
                }

                .nx-preview-table > div {
                    font-size: 8px;
                }

                .nx-benefit {
                    padding: 16px 12px;
                    gap: 10px;
                }

                .nx-benefit .nx-feature-icon {
                    width: 35px;
                    height: 35px;
                }

                .nx-benefit h3 {
                    font-size: 12px;
                }

                .nx-benefit p {
                    font-size: 11px;
                }

                .nx-device-grid {
                    gap: 18px;
                }

                .nx-tv-screen {
                    padding: 11px;
                }

                .nx-tv-current,
                .nx-tv-next {
                    padding: 11px 7px;
                }

                .nx-tv-next span {
                    font-size: 8px;
                }

                .nx-device-label {
                    font-size: 9px;
                }

                .nx-pricing-grid {
                    gap: 15px;
                }

                .nx-plan {
                    padding: 19px;
                }

                .nx-workflow-list {
                    padding: 17px 13px;
                }

                .nx-workflow-list li {
                    gap: 7px;
                }

                .nx-workflow-list .nx-feature-icon {
                    width: 33px;
                    height: 33px;
                }
            }

            /* Mobile layout */
            @media (max-width: 760px) {
                .nx-container {
                    padding-left: 20px;
                    padding-right: 20px;
                }

                .nx-header-row {
                    min-height: 66px;
                    padding-left: 20px;
                    padding-right: 20px;
                    gap: 10px;
                }

                .nx-hero-topline {
                    width: 100%;
                }

                .nx-header-actions {
                    gap: 10px;
                }

                .nx-header-actions > .nx-login-button {
                    display: none;
                }

                .nx-hero-grid {
                    grid-template-columns: 1fr;
                    min-height: 0;
                    gap: 0;
                    padding-top: 30px;
                    padding-bottom: 30px;
                }

                .nx-hero-image {
                    width: 100%;
                    opacity: 0.23;
                    object-position: 70% center;
                }

                .nx-hero::after {
                    background: linear-gradient(
                        90deg,
                        var(--paper),
                        transparent
                    );
                }

                .nx-hero h1 {
                    font-size: 38px;
                }

                .nx-hero-copy > p {
                    font-size: 14px;
                }

                .nx-hero-preview {
                    padding-top: 28px;
                }

                .nx-handwritten {
                    display: none;
                }

                .nx-dashboard-layout {
                    grid-template-columns: 80px minmax(0, 1fr);
                }

                .nx-team-strip-inner {
                    justify-content: center;
                    gap: 16px;
                }

                .nx-team-strip-inner > small:first-child {
                    width: 100%;
                    text-align: center;
                }

                .nx-team-strip-inner > span {
                    font-size: 13px;
                }

                .nx-team-note {
                    display: none;
                }

                .nx-section-heading {
                    display: block;
                }

                .nx-section-heading h2 {
                    font-size: 27px;
                }

                .nx-section-heading > p {
                    max-width: none;
                    margin-top: 9px;
                    font-size: 12px;
                }

                .nx-benefit-grid {
                    grid-template-columns: 1fr 1fr;
                }

                .nx-device-grid {
                    grid-template-columns: 1fr 1fr;
                    gap: 25px;
                }

                .nx-tv-column {
                    grid-column: 1;
                }

                .nx-phone-column {
                    grid-column: 2;
                    grid-row: 1 / 3;
                }

                .nx-doctor-column {
                    grid-column: 1;
                }

                .nx-phone {
                    max-width: 235px;
                }

                .nx-tv-current > strong {
                    font-size: 43px;
                }

                .nx-tv-current > span {
                    font-size: 10px;
                }

                .nx-tv-footer {
                    font-size: 7px;
                }

                .nx-tv-footer .nx-small-logo {
                    font-size: 9px;
                }

                .nx-doctor-content {
                    padding: 10px;
                }

                .nx-doctor-content h4 {
                    font-size: 14px;
                }

                .nx-doctor-content .nx-preview-table > div {
                    padding: 10px 4px;
                    font-size: 9px;
                }

                .nx-preview-actions > span {
                    font-size: 8px;
                }

                .nx-pricing-grid {
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                }

                .nx-doctor-choice {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: 0.9fr 1.1fr;
                }

                .nx-care-image {
                    height: 100%;
                    min-height: 230px;
                }

                .nx-care-steps {
                    grid-column: 1 / -1;
                }

                .nx-workflow-list {
                    grid-template-columns: 1fr;
                    padding: 0 18px;
                }

                .nx-workflow-list li {
                    gap: 14px;
                    padding: 17px 20px 17px 0;
                }

                .nx-workflow-list li + li {
                    border-top: 1px solid var(--line);
                }

                .nx-workflow-list h3 {
                    font-size: 14px;
                }

                .nx-workflow-list p {
                    font-size: 12px;
                }

                .nx-workflow-list .nx-feature-icon {
                    width: 43px;
                    height: 43px;
                }

                .nx-step-arrow {
                    right: 0;
                    transform: rotate(90deg);
                }

                .nx-footer-grid {
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 25px 15px;
                }

                .nx-footer-grid > div:first-child,
                .nx-footer-cta {
                    grid-column: 1 / -1;
                }

                .nx-footer-grid > div > button:not(.nx-button) {
                    min-height: 38px;
                    font-size: 11px;
                }
            }

            @media (max-width: 480px) {
                .nx-header-row {
                    padding-left: 12px;
                    padding-right: 10px;
                    gap: 7px;
                }

                .nx-hero-topline {
                    align-items: flex-start;
                    flex-direction: column;
                    gap: 10px;
                }

                .nx-hero-theme-button {
                    min-height: 38px;
                    padding: 8px 11px;
                    font-size: 10px;
                }

                .nx-header-row .nx-brand-icon {
                    display: none;
                }

                .nx-brand strong {
                    font-size: 19px;
                }

                .nx-brand small {
                    font-size: 7px;
                    letter-spacing: 2px;
                }

                .nx-header-actions {
                    gap: 8px;
                }

                .nx-book-button {
                    min-height: 44px;
                    padding: 7px 8px;
                    font-size: 10px !important;
                }

                .nx-book-button svg {
                    display: none;
                }

                .nx-menu {
                    width: 34px;
                }

                .nx-hero h1 {
                    font-size: 32px;
                    letter-spacing: -0.9px;
                }

                .nx-hero-actions {
                    gap: 9px;
                }

                .nx-hero-actions .nx-button {
                    padding: 10px 13px;
                    font-size: 11px !important;
                }

                .nx-assurances {
                    gap: 9px;
                }

                .nx-assurances span {
                    font-size: 9px;
                }

                .nx-dashboard-layout {
                    grid-template-columns: 65px minmax(0, 1fr);
                }

                .nx-dashboard-content {
                    padding: 8px;
                }

                .nx-dashboard-stats small {
                    font-size: 7px;
                }

                .nx-dashboard-stats strong {
                    font-size: 17px;
                }

                .nx-dashboard-bottom {
                    grid-template-columns: 1fr;
                }

                .nx-chart-bars {
                    height: 85px;
                }

                .nx-benefit {
                    display: block;
                    padding: 15px;
                }

                .nx-benefit .nx-feature-icon {
                    width: 39px;
                    height: 39px;
                    margin-bottom: 11px;
                }

                .nx-device-grid {
                    grid-template-columns: 1fr;
                    gap: 29px;
                }

                .nx-tv-column,
                .nx-phone-column,
                .nx-doctor-column {
                    grid-column: auto;
                    grid-row: auto;
                }

                .nx-phone-column {
                    width: 100%;
                    max-width: 255px;
                    justify-self: center;
                }

                .nx-device-label {
                    font-size: 10px;
                }

                .nx-tv-screen {
                    padding: 14px;
                }

                .nx-tv-current > strong {
                    font-size: 54px;
                }

                .nx-tv-next span {
                    font-size: 9px;
                }

                .nx-pricing-grid {
                    grid-template-columns: 1fr;
                }

                .nx-plan {
                    padding: 23px;
                }

                .nx-plan h3 {
                    font-size: 21px;
                }

                .nx-plan li {
                    font-size: 13px;
                }

                .nx-doctor-choice {
                    grid-column: auto;
                    display: flex;
                }

                .nx-care-image {
                    height: 165px;
                    min-height: 0;
                }

                .nx-footer-bottom {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }

                .nx-section {
                    padding-top: 32px;
                    padding-bottom: 32px;
                }
            }

            @media (max-width: 350px) {
                .nx-header-row {
                    padding-left: 10px;
                    padding-right: 8px;
                }

                .nx-header-row .nx-brand strong {
                    font-size: 16px;
                }

                .nx-book-button {
                    padding: 7px 5px;
                    font-size: 9px !important;
                }

                .nx-header-actions {
                    gap: 5px;
                }
            }

            @media (min-width: 1024px) {
                .nx-menu {
                    display: none !important;
                }

                .nx-mobile-nav {
                    display: none !important;
                }
            }


            /* FAQ: spacious desktop columns, compact stacked layout on phones. */
            .nx-faq-layout { display:grid; grid-template-columns:minmax(240px, .8fr) minmax(0, 1.5fr); gap:clamp(28px, 5vw, 90px); align-items:start; }
            .nx-faq-intro { max-width:440px; }
            .nx-faq-eyebrow { color:var(--green); font-size:11px; font-weight:800; letter-spacing:.15em; }
            .nx-faq-intro h2 { margin:14px 0; font-size:clamp(27px, 3vw, 42px); line-height:1.15; letter-spacing:-.035em; }
            .nx-faq-intro p { color:var(--muted); font-size:15px; line-height:1.7; }
            .nx-faq-plan-link { display:inline-flex; align-items:center; gap:10px; min-height:44px; margin-top:14px; color:var(--green); font-weight:700; text-decoration:none; }
            .nx-faq-trial { display:flex; align-items:center; gap:12px; padding:18px; margin-top:24px; border:1px solid var(--line); background:var(--soft); border-radius:16px; }
            .nx-faq-trial svg { flex-shrink:0; }
            .nx-faq-trial strong,.nx-faq-trial span { display:block; font-size:13px; }
            .nx-faq-trial span { color:var(--muted); margin-top:3px; }
            .nx-faq-content { min-width:0; }
            .nx-faq-filters { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; }
            .nx-faq-filters button { min-height:44px; padding:10px 14px; border:1px solid var(--line); border-radius:12px; background:var(--surface); color:var(--muted); font-size:12px; font-weight:700; cursor:pointer; }
            .nx-faq-filters button[aria-pressed="true"] { background:var(--ink); color:var(--paper); border-color:var(--ink); }
            .nx-faq-list { display:grid; gap:10px; }
            .nx-faq-list .nx-faq-item { box-shadow:none; transition:border-color .2s; }
            .nx-faq-list .nx-faq-item[data-open="true"] { border-color:var(--green); }
            .nx-faq-list .nx-faq-item button { min-height:64px; text-align:left; }
            .nx-faq-list .nx-faq-item button svg { flex-shrink:0; }
            .nx-faq-panel { padding:0 18px 20px; color:var(--muted); font-size:14px; line-height:1.75; }
            .nx-faq-panel[hidden] { display:none; }
            .nx-faq-section button:focus-visible,.nx-faq-section a:focus-visible,.nx-social-links a:focus-visible { outline:3px solid var(--green); outline-offset:4px; }
            .nx-footer .nx-social-links { display:flex; flex-wrap:wrap; gap:10px; }
            .nx-footer .nx-social-links a,.nx-footer .nx-social-links button { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:10px 14px; margin:0; border:1px solid rgba(220,229,212,.35); border-radius:10px; background:rgba(255,255,255,.06); color:#edf3e4; text-decoration:none; font-size:13px; }
            .nx-footer .nx-social-links a:hover { background:rgba(255,255,255,.14); }
            .nx-footer .nx-social-links button:disabled { opacity:.65; cursor:not-allowed; }
            @media (max-width: 800px) {
                .nx-faq-layout { grid-template-columns:1fr; gap:24px; }
                .nx-faq-intro { max-width:600px; }
                .nx-faq-trial { margin-top:12px; padding:12px 14px; }
                .nx-faq-filters { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
                .nx-faq-filters button { padding:10px 8px; }
                .nx-faq-list .nx-faq-item button { padding:16px; gap:12px; }
                .nx-faq-panel { padding:0 16px 16px; font-size:13px; }
                .nx-footer-bottom { align-items:flex-start; gap:16px; }
            }


            /* Preserve the full logo proportions. The white background also
               keeps the original dark wordmark readable in night mode. */
            .nx-brand .nx-brand-image {
                display: block;
                width: clamp(140px, 13vw, 200px);
                height: auto;
                object-fit: contain;
                background: #fff;
                border-radius: 8px;
            }
            .nx-small-logo img {
                display: block;
                width: 94px;
                height: auto;
                object-fit: contain;
                background: #fff;
                border-radius: 4px;
            }
            @media (max-width: 600px) {
                .nx-header-row .nx-brand .nx-brand-image { width: 128px; }
                .nx-footer .nx-brand .nx-brand-image { width: 170px; }
                .nx-small-logo img { width: 80px; }
            }

            @media (prefers-reduced-motion: reduce) {
                .nx-home * {
                    animation: none !important;
                    transition: none !important;
                    scroll-behavior: auto !important;
                }
            }
        `}</style>
    );
}