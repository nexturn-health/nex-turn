import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Bell, Building2, CheckCircle2, Globe2, Loader2, Save, ShieldCheck } from "lucide-react";
import { getSuperAdminSettings, updateSuperAdminSettings, type PlatformPlan, type PlatformSettings } from "../../services/super-admin/superAdminSettings.api";

type SettingsForm = Pick<PlatformSettings,
    "platformName" | "supportEmail" | "supportPhone" | "defaultCountry" |
    "defaultPlan" | "trialDays" | "allowHospitalRegistration" | "maintenanceMode" |
    "whatsappNotificationsEnabled" | "emailNotificationsEnabled" | "smsNotificationsEnabled"
>;

const DEFAULT_FORM: SettingsForm = {
    platformName: "NextSynq Health", supportEmail: "", supportPhone: "", defaultCountry: "India",
    defaultPlan: "BASIC", trialDays: 14, allowHospitalRegistration: true, maintenanceMode: false,
    whatsappNotificationsEnabled: true, emailNotificationsEnabled: true, smsNotificationsEnabled: true,
};

const sections = [
    { id: "general", title: "General", description: "Identity & support", icon: Building2 },
    { id: "plans", title: "Plans & access", description: "Trials & registration", icon: Globe2 },
    { id: "notifications", title: "Notifications", description: "Delivery channels", icon: Bell },
    { id: "maintenance", title: "Maintenance", description: "Platform availability", icon: ShieldCheck },
] as const;
type SectionId = typeof sections[number]["id"];

// Keep the editable payload limited to the fields supported by this screen.
function toForm(settings: PlatformSettings): SettingsForm {
    return Object.fromEntries(Object.keys(DEFAULT_FORM).map(key => [
        key, settings[key as keyof SettingsForm] ?? DEFAULT_FORM[key as keyof SettingsForm],
    ])) as SettingsForm;
}

export default function SuperAdminSettings() {
    const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM);
    const [saved, setSaved] = useState<SettingsForm | null>(null);
    const [active, setActive] = useState<SectionId>("general");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const saveLock = useRef(false);
    const mounted = useRef(false);
    const dirty = saved !== null && JSON.stringify(form) !== JSON.stringify(saved);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const settings = toForm(await getSuperAdminSettings());
            if (!mounted.current) return;
            setForm(settings);
            setSaved(settings);
        } catch {
            if (mounted.current) setError("Could not load platform settings. Please try again.");
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        mounted.current = true;
        void loadSettings();
        return () => { mounted.current = false; };
    }, [loadSettings]);

    // Warn before a browser refresh or tab close would discard edits.
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    function updateField<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
        setForm(current => ({ ...current, [key]: value }));
        setSuccess("");
        setError("");
    }

    async function saveSettings() {
        if (saveLock.current || !saved || !dirty) return;
        if (!form.platformName.trim() || !form.defaultCountry.trim()) {
            setActive("general"); setError("Enter a platform name and default country."); return;
        }
        if (form.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())) {
            setActive("general"); setError("Enter a valid support email address."); return;
        }
        if (!Number.isInteger(form.trialDays) || form.trialDays < 0 || form.trialDays > 90) {
            setActive("plans"); setError("Trial days must be a whole number from 0 to 90."); return;
        }
        saveLock.current = true;
        setSaving(true); setError(""); setSuccess("");
        try {
            // Preserve the service contract used by your existing component.
            const updated = await updateSuperAdminSettings(form as PlatformSettings);
            if (!mounted.current) return;
            const next = toForm(updated);
            setForm(next); setSaved(next);
            setSuccess("All changes saved successfully.");
        } catch {
            if (mounted.current) setError("Could not save your changes. Your edits are still here; please try again.");
        } finally {
            saveLock.current = false;
            if (mounted.current) setSaving(false);
        }
    }

    const selected = sections.find(section => section.id === active)!;
    const Icon = selected.icon;

    return (
        <main className="nxs">
            <SettingsStyles />
            <div className="nxs-shell">
                <header className="nxs-heading">
                    <div><span className="nxs-eyebrow">SUPER ADMIN WORKSPACE</span><h1>Platform settings</h1>
                        <p>Manage how NextSynq Health works across your hospitals.</p></div>
                    <span className="nxs-scope"><ShieldCheck size={16} />Platform-wide</span>
                </header>
                {loading ? <div className="nxs-loading" role="status"><Loader2 size={25} className="nxs-spin" />Loading your settings…</div> : !saved ? (
                    <div className="nxs-loading"><p role="alert">{error}</p><button type="button" className="nxs-primary" onClick={() => void loadSettings()}>Try again</button></div>
                ) : (
                    <>
                        <div className="nxs-layout">
                            <nav className="nxs-nav" aria-label="Settings sections">
                                {sections.map(({ id, title, description, icon: SectionIcon }) => (
                                    <button key={id} type="button" aria-current={active === id ? "page" : undefined} onClick={() => setActive(id)}>
                                        <SectionIcon size={19} aria-hidden="true" /><span><strong>{title}</strong><small>{description}</small></span>
                                    </button>
                                ))}
                                <p>Changes apply to the entire platform after you save.</p>
                            </nav>
                            <section className="nxs-card" aria-labelledby="nxs-section-title">
                                <header className="nxs-card-heading"><span className="nxs-icon"><Icon size={22} /></span><div>
                                    <h2 id="nxs-section-title">{selected.title}</h2><p>{selected.description}</p>
                                </div></header>
                                {/* Disabling the fields during save prevents newer edits being overwritten. */}
                                <fieldset className="nxs-fields" disabled={saving}>
                                    <legend className="nxs-sr">{selected.title} settings</legend>
                                    {active === "general" && <div className="nxs-grid">
                                        <Field label="Platform name" hint="Shown across your platform."><input value={form.platformName} onChange={e => updateField("platformName", e.target.value)} maxLength={120} /></Field>
                                        <Field label="Default country"><input value={form.defaultCountry} onChange={e => updateField("defaultCountry", e.target.value)} /></Field>
                                        <Field label="Support email" hint="Your team's support contact."><input type="email" placeholder="support@yourcompany.com" value={form.supportEmail} onChange={e => updateField("supportEmail", e.target.value)} /></Field>
                                        <Field label="Support phone"><input type="tel" placeholder="Enter support number" value={form.supportPhone} onChange={e => updateField("supportPhone", e.target.value)} /></Field>
                                    </div>}
                                    {active === "plans" && <>
                                        <div className="nxs-grid">
                                            <Field label="Default plan" hint="Applied to newly registered hospitals."><select value={form.defaultPlan} onChange={e => updateField("defaultPlan", e.target.value as PlatformPlan)}><option value="BASIC">Basic</option><option value="PREMIUM">Premium</option></select></Field>
                                            <Field label="Free trial duration" hint="0–90 days. Use 0 for no trial."><div className="nxs-unit"><input aria-label="Free trial duration in days" type="number" min={0} max={90} step={1} value={Number.isNaN(form.trialDays) ? "" : form.trialDays} onChange={e => updateField("trialDays", e.target.valueAsNumber)} /><span>days</span></div></Field>
                                        </div>
                                        <Toggle label="Hospital registration" description="Allow new hospitals to create an account." checked={form.allowHospitalRegistration} onChange={value => updateField("allowHospitalRegistration", value)} />
                                    </>}
                                    {active === "notifications" && <>
                                        <p className="nxs-intro">Choose which channels your platform can use for updates.</p>
                                        <Toggle label="WhatsApp notifications" description="Send OPD queue updates through your WhatsApp integration." checked={form.whatsappNotificationsEnabled} onChange={value => updateField("whatsappNotificationsEnabled", value)} />
                                        <Toggle label="Email notifications" description="Send patient and platform emails." checked={form.emailNotificationsEnabled} onChange={value => updateField("emailNotificationsEnabled", value)} />
                                        <Toggle label="SMS notifications" description="Allow SMS fallback notifications." checked={form.smsNotificationsEnabled} onChange={value => updateField("smsNotificationsEnabled", value)} />
                                    </>}
                                    {active === "maintenance" && <>
                                        <div className="nxs-warning"><ShieldCheck size={20} /><div><strong>Manage platform availability carefully</strong><p>Maintenance mode can affect access for hospital teams.</p></div></div>
                                        <Toggle label="Maintenance mode" description="Request restricted access while maintenance is running." checked={form.maintenanceMode} onChange={value => updateField("maintenanceMode", value)} />
                                        <p className="nxs-note">Access restrictions only take effect if your backend middleware enforces this setting.</p>
                                    </>}
                                </fieldset>
                            </section>
                        </div>
                        <footer className="nxs-savebar">
                            <div aria-live="polite"><strong>{saving ? "Saving your changes…" : dirty ? "You have unsaved changes" : "Settings are up to date"}</strong>
                                <p>{dirty ? "Review your changes, then save to apply them." : "Your platform configuration is saved."}</p></div>
                            <div className="nxs-save-actions">
                                <button className="nxs-secondary" type="button" disabled={!dirty || saving} onClick={() => { setForm(saved); setError(""); setSuccess(""); }}>Discard</button>
                                <button className="nxs-primary" type="button" disabled={!dirty || saving} onClick={() => void saveSettings()}>
                                    {saving ? <Loader2 className="nxs-spin" size={17} /> : <Save size={17} />}{saving ? "Saving…" : "Save changes"}
                                </button>
                            </div>
                        </footer>
                        {error && <p className="nxs-feedback nxs-error" role="alert">{error}</p>}
                        {success && <p className="nxs-feedback nxs-success" role="status"><CheckCircle2 size={18} />{success}</p>}
                    </>
                )}
            </div>
        </main>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return <label className="nxs-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Toggle({ label, description, checked, onChange }: {
    label: string; description: string; checked: boolean; onChange: (value: boolean) => void;
}) {
    const id = useId();
    return (
        <div className="nxs-toggle-row">
            <div><strong id={`${id}-label`}>{label}</strong><p id={`${id}-description`}>{description}</p></div>
            <button type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`}
                className="nxs-switch" onClick={() => onChange(!checked)}><span /><small>{checked ? "On" : "Off"}</small></button>
        </div>
    );
}

function SettingsStyles() {
    return <style>{`
        .nxs { --ink:#173d39; --green:#176957; --muted:#69786f; --line:#dfe7dc; min-height:100%; padding:clamp(18px,3vw,40px); background:#f7f8f3; color:var(--ink); font-family:inherit; }
        .nxs * { box-sizing:border-box; }
        .nxs h1,.nxs h2,.nxs p { margin:0; }
        .nxs button,.nxs input,.nxs select { font:inherit; }
        .nxs button { cursor:pointer; }
        .nxs button:disabled { cursor:not-allowed; opacity:.45; }
        .nxs button:focus-visible,.nxs input:focus-visible,.nxs select:focus-visible { outline:3px solid #8bab86; outline-offset:3px; }
        .nxs-shell { max-width:1320px; margin:auto; }
        .nxs-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:28px; }
        .nxs-eyebrow { font-size:10px; font-weight:750; letter-spacing:.16em; color:var(--green); }
        .nxs h1 { font-size:clamp(25px,2.5vw,34px); line-height:1.2; margin:9px 0; letter-spacing:-.8px; }
        .nxs-heading p { font-size:13px; color:var(--muted); line-height:1.6; }
        .nxs-scope { display:flex; align-items:center; gap:7px; font-size:12px; background:#eaf1e4; padding:9px 12px; border-radius:20px; white-space:nowrap; }
        .nxs-layout { display:grid; grid-template-columns:235px minmax(0,1fr); gap:28px; align-items:start; }
        .nxs-nav { display:grid; gap:6px; }
        .nxs-nav button { display:flex; gap:12px; align-items:center; padding:15px; border:1px solid transparent; border-radius:12px; background:transparent; color:var(--muted); text-align:left; }
        .nxs-nav button[aria-current] { border-color:#d4e2cd; background:#e9f1e3; color:var(--ink); }
        .nxs-nav button:hover { background:#eef3e9; }
        .nxs-nav strong { display:block; font-size:13px; }
        .nxs-nav small { display:block; margin-top:4px; font-size:11px; font-weight:400; }
        .nxs-nav p { font-size:11px; line-height:1.7; color:var(--muted); padding:16px; }
        .nxs-card { min-width:0; background:#fff; border:1px solid var(--line); border-radius:18px; overflow:hidden; box-shadow:0 6px 24px #173d3904; }
        .nxs-card-heading { padding:24px; display:flex; align-items:center; gap:14px; border-bottom:1px solid #edf0e9; }
        .nxs-icon { display:grid; place-items:center; width:46px; height:46px; border-radius:13px; background:#edf3e6; flex-shrink:0; }
        .nxs h2 { font-size:19px; letter-spacing:-.3px; }
        .nxs-card-heading p { font-size:12px; color:var(--muted); margin-top:5px; }
        .nxs-fields { min-width:0; padding:26px; border:0; margin:0; }
        .nxs-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:26px 22px; }
        .nxs-field { display:flex; flex-direction:column; gap:8px; min-width:0; }
        .nxs-field>span { font-size:12px; font-weight:650; }
        .nxs-field input,.nxs-field select { width:100%; min-width:0; min-height:46px; border:1px solid #d7e1d2; border-radius:9px; padding:11px 13px; background:#fafbf8; color:var(--ink); font-size:14px; }
        .nxs-field small { font-size:11px; color:var(--muted); line-height:1.5; }
        .nxs-unit { position:relative; }
        .nxs-unit input { padding-right:55px; }
        .nxs-unit>span { position:absolute; right:14px; top:14px; font-size:12px; color:var(--muted); pointer-events:none; }
        .nxs-toggle-row { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:22px 0; border-bottom:1px solid #edf0e9; }
        .nxs-toggle-row:last-child { border-bottom:0; padding-bottom:5px; }
        .nxs-grid+.nxs-toggle-row { margin-top:20px; border-top:1px solid #edf0e9; }
        .nxs-toggle-row strong { font-size:13px; }
        .nxs-toggle-row p,.nxs-intro,.nxs-note { font-size:12px; color:var(--muted); line-height:1.7; }
        .nxs-toggle-row p { margin-top:5px; max-width:460px; }
        .nxs-switch { display:flex; align-items:center; gap:9px; flex-shrink:0; background:transparent; border:0; padding:4px; min-height:44px; color:var(--muted); }
        .nxs-switch>span { position:relative; display:block; width:42px; height:24px; border-radius:20px; background:#c5cec5; transition:background .15s; }
        .nxs-switch>span:after { content:""; position:absolute; width:18px; height:18px; border-radius:50%; background:white; top:3px; left:3px; transition:transform .15s; box-shadow:0 1px 3px #0002; }
        .nxs-switch[aria-checked=true]>span { background:var(--green); }
        .nxs-switch[aria-checked=true]>span:after { transform:translateX(18px); }
        .nxs-switch small { font-size:11px; width:20px; text-align:left; }
        .nxs-warning { display:flex; align-items:flex-start; gap:12px; padding:16px; border:1px solid #ebdcb9; border-radius:11px; background:#fcf7ea; color:#805921; }
        .nxs-warning svg { flex-shrink:0; }
        .nxs-warning strong { font-size:13px; }
        .nxs-warning p { font-size:12px; line-height:1.6; margin-top:4px; }
        .nxs-note { margin-top:14px!important; }
        .nxs-savebar { position:sticky; bottom:12px; z-index:5; display:flex; justify-content:space-between; align-items:center; gap:20px; margin-top:24px; padding:18px 22px; border:1px solid var(--line); border-radius:14px; background:#fff; box-shadow:0 8px 30px #173d3910; }
        .nxs-savebar strong { font-size:13px; }
        .nxs-savebar p { font-size:11px; color:var(--muted); margin-top:4px; }
        .nxs-save-actions { display:flex; gap:10px; }
        .nxs-primary,.nxs-secondary { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:11px 17px; border:1px solid var(--green); border-radius:9px; font-size:12px!important; font-weight:650!important; white-space:nowrap; }
        .nxs-primary { color:#fff; background:var(--green); }
        .nxs-secondary { color:var(--ink); background:#fff; border-color:var(--line); }
        .nxs-primary:hover:not(:disabled) { background:#125343; }
        .nxs-feedback { display:flex; align-items:center; gap:8px; padding:14px 18px; margin-top:14px!important; border-radius:10px; font-size:13px; line-height:1.6; }
        .nxs-error { background:#fff0ed; color:#a13227; }
        .nxs-success { background:#eaf4e8; color:#21633f; }
        .nxs-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:300px; gap:16px; font-size:14px; }
        .nxs-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
        .nxs-spin { animation:nxs-spin 1s linear infinite; }
        @keyframes nxs-spin { to { transform:rotate(360deg); } }
        @media(max-width:850px) {
            .nxs-layout { grid-template-columns:1fr; gap:16px; }
            .nxs-nav { grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
            .nxs-nav button { flex-direction:column; padding:12px 6px; gap:8px; text-align:center; background:#fff; border-color:var(--line); }
            .nxs-nav small,.nxs-nav p { display:none; }
            .nxs-nav strong { font-size:11px; }
        }
        @media(max-width:560px) {
            .nxs { padding:20px 12px; }
            .nxs-heading { margin-bottom:20px; }
            .nxs-scope { display:none; }
            .nxs-grid { grid-template-columns:1fr; gap:20px; }
            .nxs-card-heading { padding:18px; }
            .nxs-fields { padding:20px 18px; }
            .nxs-field input,.nxs-field select { font-size:16px; }
            .nxs-savebar { flex-direction:column; align-items:stretch; gap:12px; padding:14px; bottom:calc(8px + env(safe-area-inset-bottom,0px)); }
            .nxs-savebar p { display:none; }
            .nxs-save-actions button { flex:1; }
            .nxs-toggle-row { gap:10px; }
            .nxs-switch small { display:none; }
        }
        @media(prefers-reduced-motion:reduce) { .nxs * { animation:none!important; transition:none!important; } }
    `}</style>;
}
