import { AlertCircle, Copy, ExternalLink, Eye, KeyRound, Loader2, Monitor, Palette, RefreshCw, RotateCcw, Save, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef, } from "react";
import toast from "react-hot-toast";
import { createDisplay, getDisplayConfig, regenerateDisplayKey, updateDisplayConfig, type DisplayConfig, type DisplayLanguage, } from "../../services/display.api";
/* ============================================================
   DEFAULT CONFIG
============================================================ */
const DEFAULT_CONFIG: DisplayConfig = {
    hospitalName: "",
    heading: "Patient Queue",
    logoUrl: "",
    primaryColor: "#176957",
    secondaryColor: "#f5f6f2",
    displayLanguage: "EN",
    voiceEnabled: true,
    announcementEnabled: true,
    announcementRepeat: 2,
    showEmergency: true,
    showReferred: true,
    showWaiting: true,
    showNext: true,
    showCurrent: true,
    isActive: true,
};
/* ============================================================
   LANGUAGES
============================================================ */
const LANGUAGES: {
    value: DisplayLanguage;
    label: string;
}[] = [
    {
        value: "EN",
        label: "English",
    },
    {
        value: "HI",
        label: "Hindi",
    },
    {
        value: "BN",
        label: "Bengali",
    },
    {
        value: "MR",
        label: "Marathi",
    },
    {
        value: "TA",
        label: "Tamil",
    },
    {
        value: "TE",
        label: "Telugu",
    },
    {
        value: "KN",
        label: "Kannada",
    },
    {
        value: "GU",
        label: "Gujarati",
    },
    {
        value: "PA",
        label: "Punjabi",
    },
    {
        value: "ML",
        label: "Malayalam",
    },
];
/* ============================================================
   ERROR MESSAGE
============================================================ */
const getErrorMessage = (error: any, fallback: string): string => {
    return (error
        ?.response
        ?.data
        ?.message ||
        error?.message ||
        fallback);
};
/* ============================================================
   MAIN
============================================================ */
const DisplaySettings = () => {
    const [tab, setTab] = useState<"Appearance" | "Queue sections" | "Sound">("Appearance");
    const mutationPending = useRef(false);
    /* ====================================================
       DISPLAY
    ==================================================== */
    const [display, setDisplay,] = useState<DisplayConfig | null>(null);
    const [form, setForm,] = useState<DisplayConfig>(DEFAULT_CONFIG);
    /* ====================================================
       STATE
    ==================================================== */
    const [loading, setLoading,] = useState(true);
    const [creating, setCreating,] = useState(false);
    const [saving, setSaving,] = useState(false);
    const [regenerating, setRegenerating,] = useState(false);
    const [refreshing, setRefreshing,] = useState(false);
    const [error, setError,] = useState("");
    /* ====================================================
       LOAD
    ==================================================== */
    const loadDisplay = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
            else {
                setRefreshing(true);
            }
            setError("");
            const config = await getDisplayConfig();
            setDisplay(config);
            setForm({
                ...DEFAULT_CONFIG,
                ...config,
            });
        }
        catch (error: any) {
            /*
             * If no display exists yet,
             * backend will often return 404.
             */
            if (error
                ?.response
                ?.status ===
                404) {
                setDisplay(null);
                setForm(DEFAULT_CONFIG);
                return;
            }
            console.error("LOAD DISPLAY ERROR:", error);
            setError(getErrorMessage(error, "Unable to load display settings"));
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    useEffect(() => {
        loadDisplay();
    }, [
        loadDisplay,
    ]);
    /* ====================================================
       PUBLIC URL
    ==================================================== */
    const displayUrl = useMemo(() => {
        if (!display
            ?.displayKey) {
            return "";
        }
        /*
         * Change /display/ here only
         * if your frontend public route
         * uses a different path.
         */
        return (`${window.location.origin}/display/${display.displayKey}`);
    }, [
        display
            ?.displayKey,
    ]);
    /* ====================================================
       CHANGE
    ==================================================== */
    const updateField = <K extends keyof DisplayConfig,>(key: K, value: DisplayConfig[K]) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };
    /* ====================================================
       CREATE DISPLAY
    ==================================================== */
    const handleCreate = async () => {
        if (mutationPending.current) return;
        if (!form.heading.trim() || !/^#[0-9a-f]{6}$/i.test(form.primaryColor) || !/^#[0-9a-f]{6}$/i.test(form.secondaryColor)) { setError("Enter a display heading and valid six-digit hex colours."); return; }
        mutationPending.current = true;
        try {
            setCreating(true);
            setError("");
            const response = await createDisplay({
                heading: form.heading,
                logoUrl: form.logoUrl,
                primaryColor: form.primaryColor,
                secondaryColor: form.secondaryColor,
                displayLanguage: form.displayLanguage,
                voiceEnabled: form.voiceEnabled,
                announcementEnabled: form.announcementEnabled,
                announcementRepeat: form.announcementRepeat,
                showEmergency: form.showEmergency,
                showReferred: form.showReferred,
                showWaiting: form.showWaiting,
                showNext: form.showNext,
                showCurrent: form.showCurrent,
            });
            if (!response.success) {
                throw new Error(response.message ||
                    "Unable to create display");
            }
            toast.success("Display created successfully");
            await loadDisplay(false);
        }
        catch (error: any) {
            console.error("CREATE DISPLAY ERROR:", error);
            const message = getErrorMessage(error, "Unable to create display");
            setError(message);
            toast.error(message);
        }
        finally {
            mutationPending.current = false;
            setCreating(false);
        }
    };
    /* ====================================================
       SAVE SETTINGS
    ==================================================== */
    const handleSave = async () => {
        if (!display) {
            return;
        }
        if (mutationPending.current) return;
        if (!form.heading.trim() || !/^#[0-9a-f]{6}$/i.test(form.primaryColor) || !/^#[0-9a-f]{6}$/i.test(form.secondaryColor)) { setError("Enter a display heading and valid six-digit hex colours."); return; }
        mutationPending.current = true;
        try {
            setSaving(true);
            setError("");
            const response = await updateDisplayConfig({
                heading: form.heading
                    .trim(),
                logoUrl: form.logoUrl
                    .trim(),
                primaryColor: form.primaryColor,
                secondaryColor: form.secondaryColor,
                displayLanguage: form.displayLanguage,
                voiceEnabled: form.voiceEnabled,
                announcementEnabled: form.announcementEnabled,
                announcementRepeat: Number(form
                    .announcementRepeat),
                showEmergency: form.showEmergency,
                showReferred: form.showReferred,
                showWaiting: form.showWaiting,
                showNext: form.showNext,
                showCurrent: form.showCurrent,
                isActive: form.isActive,
            });
            if (!response.success) {
                throw new Error(response.message ||
                    "Unable to save display");
            }
            toast.success("Display settings saved");
            await loadDisplay(false);
        }
        catch (error: any) {
            console.error("SAVE DISPLAY ERROR:", error);
            const message = getErrorMessage(error, "Unable to save display");
            setError(message);
            toast.error(message);
        }
        finally {
            mutationPending.current = false;
            setSaving(false);
        }
    };
    /* ====================================================
       REGENERATE KEY
    ==================================================== */
    const handleRegenerate = async () => {
        const confirmed = window.confirm("Regenerate the display key? The old public display URL will stop working.");
        if (!confirmed) {
            return;
        }
        if (mutationPending.current) return;
        
        mutationPending.current = true;
        try {
            setRegenerating(true);
            setError("");
            const response = await regenerateDisplayKey();
            if (!response.success) {
                throw new Error(response.message ||
                    "Unable to regenerate display key");
            }
            toast.success("Display key regenerated");
            await loadDisplay(false);
        }
        catch (error: any) {
            const message = getErrorMessage(error, "Unable to regenerate display key");
            setError(message);
            toast.error(message);
        }
        finally {
            mutationPending.current = false;
            setRegenerating(false);
        }
    };
    /* ====================================================
       COPY
    ==================================================== */
    const handleCopyUrl = async () => {
        if (!displayUrl) {
            return;
        }
        try {
            await navigator
                .clipboard
                .writeText(displayUrl);
            toast.success("Display URL copied");
        }
        catch {
            toast.error("Unable to copy URL");
        }
    };
    /* ====================================================
       OPEN
    ==================================================== */
    const handleOpenDisplay = () => {
        if (!displayUrl) {
            return;
        }
        window.open(displayUrl, "_blank", "noopener,noreferrer");
    };
    const busy = loading || refreshing || creating || saving || regenerating;
    const dirty = JSON.stringify(form) !== JSON.stringify({ ...DEFAULT_CONFIG, ...display });

    return <div className="ds-page">
      <DisplaySettingsStyles />
      <header className="ds-header"><div><p className="ds-eyebrow">WAITING ROOM</p><h1>Display board</h1><p>Set up a clear, welcoming queue screen for your patients.</p></div><button type="button" className="ds-button ds-secondary" disabled={busy || dirty} onClick={() => loadDisplay(false)} title={dirty ? "Save or discard your changes before refreshing" : "Refresh display settings"}><RefreshCw size={16} className={refreshing ? "ds-spin" : ""} />Refresh</button></header>
      {error && <div className="ds-error" role="alert"><AlertCircle size={18} /><p>{error}</p></div>}
      {loading ? <div className="ds-empty" role="status"><Loader2 className="ds-spin" size={28} />Loading display settings…</div> : <>
        {/* The live link and saved activation status are separate from draft changes. */}
        <section className="ds-link-card"><span className="ds-icon"><Monitor size={24} /></span><div className="ds-link-info"><div className="ds-title-line"><h2>{display?.hospitalName || "Hospital display"}</h2><span className="ds-badge" data-active={!!display && display.isActive !== false}>{display ? display.isActive === false ? "Inactive" : "Active" : "Not created"}</span></div><p>{display ? "Open this link on your waiting-room TV or monitor." : "Choose your settings below, then create your display."}</p>{displayUrl && <input aria-label="Public display URL" readOnly value={displayUrl} onFocus={event => event.target.select()} />}</div>{displayUrl && <div className="ds-link-actions"><button type="button" className="ds-button ds-secondary" onClick={handleCopyUrl}><Copy size={16} />Copy link</button><button type="button" className="ds-button ds-primary" onClick={handleOpenDisplay}><ExternalLink size={16} />Open display</button></div>}</section>

        <div className="ds-layout"><section className="ds-editor">
          <div className="ds-tabs" role="group" aria-label="Display settings sections">{(["Appearance", "Queue sections", "Sound"] as const).map(label => <button type="button" key={label} aria-pressed={tab === label} onClick={() => setTab(label)}>{label}</button>)}</div>
          <fieldset disabled={busy} className="ds-fields">
            {/* One focused group at a time keeps the page short on mobile. */}
            {tab === "Appearance" && <><div className="ds-section-title"><Palette size={20} /><div><h2>Make it your hospital's screen</h2><p>Set the title, logo and display colours.</p></div></div>
              <label className="ds-field">Display heading<input value={form.heading} onChange={event => updateField("heading", event.target.value)} placeholder="Patient Queue" /></label>
              <label className="ds-field">Logo URL <span className="ds-optional">Optional</span><input type="url" value={form.logoUrl} onChange={event => updateField("logoUrl", event.target.value)} placeholder="https://your-hospital.com/logo.png" /></label>
              <div className="ds-two"><ColorField label="Primary colour" value={form.primaryColor} onChange={value => updateField("primaryColor", value)} /><ColorField label="Background colour" value={form.secondaryColor} onChange={value => updateField("secondaryColor", value)} /></div>
              <p className="ds-hint">Use contrasting colours so tokens remain readable from a distance.</p>
            </>}
            {tab === "Queue sections" && <><div className="ds-section-title"><Eye size={20} /><div><h2>Choose what patients see</h2><p>Show the sections your waiting room needs.</p></div></div>
              <SwitchRow title="Now serving" description="The token currently being seen." value={form.showCurrent} onChange={value => updateField("showCurrent", value)} />
              <SwitchRow title="Up next" description="Upcoming tokens in the queue." value={form.showNext} onChange={value => updateField("showNext", value)} />
              <SwitchRow title="Waiting queue" value={form.showWaiting} onChange={value => updateField("showWaiting", value)} />
              <SwitchRow title="Emergency queue" value={form.showEmergency} onChange={value => updateField("showEmergency", value)} />
              <SwitchRow title="Referred patients" value={form.showReferred} onChange={value => updateField("showReferred", value)} />
              {display && <SwitchRow title="Display active" description="Save changes to activate or deactivate this display." value={form.isActive !== false} onChange={value => updateField("isActive", value)} />}
            </>}
            {tab === "Sound" && <><div className="ds-section-title"><Volume2 size={20} /><div><h2>Voice & announcements</h2><p>Help patients hear when their token is called.</p></div></div>
              <label className="ds-field">Display language<select value={form.displayLanguage} onChange={event => updateField("displayLanguage", event.target.value as DisplayLanguage)}>{LANGUAGES.map(language => <option key={language.value} value={language.value}>{language.label}</option>)}</select></label>
              <SwitchRow title="Voice enabled" description="Allow the display to use text-to-speech." value={form.voiceEnabled} onChange={value => updateField("voiceEnabled", value)} />
              <SwitchRow title="Token announcements" description="Announce newly called tokens." value={form.announcementEnabled} onChange={value => updateField("announcementEnabled", value)} />
              {form.announcementEnabled && <label className="ds-field">Repeat each announcement<select value={form.announcementRepeat} onChange={event => updateField("announcementRepeat", Number(event.target.value))}><option value={1}>Once</option><option value={2}>Twice</option><option value={3}>Three times</option></select></label>}
              <p className="ds-hint">After opening the TV display, enable sound on that device. Available voices depend on its browser.</p>
            </>}
          </fieldset>

          {/* All tabs share a single save action. No settings are saved on toggle. */}
          <footer className="ds-save"><span role="status">{saving || creating ? "Saving settings…" : dirty ? "Unsaved changes" : display ? "Settings up to date" : "Ready to create"}</span><div>{display && dirty && <button type="button" className="ds-button ds-secondary" disabled={busy} onClick={() => { setForm({ ...DEFAULT_CONFIG, ...display }); setError(""); }}>Discard</button>}<button type="button" className="ds-button ds-primary" disabled={busy || (!!display && !dirty)} onClick={display ? handleSave : handleCreate}>{saving || creating ? <Loader2 size={17} className="ds-spin" /> : <Save size={17} />}{saving || creating ? "Saving…" : display ? "Save changes" : "Create display"}</button></div></footer>
        </section>

        <aside className="ds-aside"><section className="ds-preview-panel"><div className="ds-preview-heading"><div><h2>Sample preview</h2><p>Illustrates your current selections.</p></div><Monitor size={19} /></div><DisplayPreview form={form} /><p className="ds-hint">Sample tokens only. The TV page controls the final layout and supported sections.</p></section>
          {display && <details className="ds-key"><summary><KeyRound size={17} />Display link settings</summary><p>Regenerating the key stops the old link from working. Update the link on your TV afterwards.</p><label className="ds-field">Current key<input readOnly value={display.displayKey || ""} onFocus={event => event.target.select()} /></label><button type="button" className="ds-button ds-secondary" disabled={busy || dirty} onClick={handleRegenerate}>{regenerating ? <Loader2 size={16} className="ds-spin" /> : <RotateCcw size={16} />}Regenerate key</button>{dirty && <p>Save or discard changes before regenerating the key.</p>}</details>}
        </aside></div>
      </>}
    </div>;
};
export default DisplaySettings;

function SwitchRow({ title, description, value, onChange }: { title: string; description?: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="ds-switch"><span><strong>{title}</strong>{description && <small>{description}</small>}</span><input type="checkbox" role="switch" checked={value} onChange={event => onChange(event.target.checked)} /><span className="ds-switch-track" aria-hidden="true" /></label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="ds-field"><span>{label}</span><div className="ds-color"><input type="color" aria-label={`${label} picker`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#173d39"} onChange={event => onChange(event.target.value)} /><input aria-label={`${label} hex value`} value={value} onChange={event => onChange(event.target.value)} maxLength={7} spellCheck={false} /></div></div>;
}

// Preview data is deliberately labelled as a sample, never as a live queue.
function DisplayPreview({ form }: { form: DisplayConfig }) {
  return <div className="ds-preview" style={{ backgroundColor: form.secondaryColor || "#f5f6f2" }}><header style={{ backgroundColor: form.primaryColor || "#173d39" }}>{form.logoUrl && <img src={form.logoUrl} alt="Hospital logo" />}<div><small>{form.hospitalName || "Your hospital"}</small><strong>{form.heading || "Patient Queue"}</strong></div></header><div className="ds-preview-body">
    {form.isActive === false && <p className="ds-preview-off">Display inactive</p>}
    {form.showCurrent && <section className="ds-preview-current"><span>Now serving</span><strong style={{ color: form.primaryColor }}>A-104</strong><small>General Medicine</small></section>}
    {form.showNext && <section className="ds-preview-next"><span>Up next</span><div><strong>A-105</strong><strong>A-106</strong><strong>A-107</strong></div></section>}
    {form.showWaiting && <p className="ds-preview-row">Waiting <strong>A-108 · A-109</strong></p>}
    {form.showEmergency && <p className="ds-preview-row">Emergency <strong>E-01</strong></p>}
    {form.showReferred && <p className="ds-preview-row">Referred <strong>R-02</strong></p>}
    <p className="ds-preview-row">Announcements {form.voiceEnabled && form.announcementEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}</p>
  </div></div>;
}

// Styles are included in this file and scoped to the display settings page.
function DisplaySettingsStyles() {
  return <style>{`
    .ds-page { min-height: 100dvh; padding: 26px; background: #f5f6f2; color: #173d39; font-family: "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
    .ds-page *, .ds-page *::before, .ds-page *::after { box-sizing: border-box; }
    .ds-page h1, .ds-page h2, .ds-page p { margin: 0; }
    .ds-page button, .ds-page input, .ds-page select { font: inherit; }
    .ds-page button { cursor: pointer; touch-action: manipulation; }
    .ds-page button:disabled { opacity: .5; cursor: not-allowed; }
    .ds-page svg { flex-shrink: 0; }
    .ds-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 26px; background: linear-gradient(110deg, #eaf0e1, #edf3e6, #dcebdd); border: 1px solid #d9e4d1; border-radius: 19px; }
    .ds-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 1.6px; color: #687f5b; margin-bottom: 9px !important; }
    .ds-header h1 { font-size: 29px; font-weight: 600; letter-spacing: -.8px; }
    .ds-header > div > p:last-child { font-size: 13px; color: #6d7e62; line-height: 1.7; margin-top: 8px; }
    .ds-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; min-height: 46px; border: 1px solid transparent; border-radius: 10px; font-size: 12px !important; font-weight: 600 !important; flex-shrink: 0; }
    .ds-primary { background: #176957; color: white; }
    .ds-primary:hover:not(:disabled) { background: #104e40; }
    .ds-secondary { border-color: #d5e0cb; background: white; color: #58744c; }
    .ds-secondary:hover:not(:disabled) { background: #edf3e6; }
    .ds-link-card { display: flex; align-items: center; gap: 16px; padding: 22px; margin: 22px 0; background: white; border: 1px solid #dfe6d7; border-radius: 15px; }
    .ds-icon { width: 48px; height: 48px; display: grid; place-items: center; background: #edf3e6; color: #638154; border-radius: 13px; flex-shrink: 0; }
    .ds-link-info { flex: 1; min-width: 0; }
    .ds-title-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ds-title-line h2 { font-size: 16px; font-weight: 600; overflow-wrap: anywhere; }
    .ds-link-info p { font-size: 12px; color: #7b8b70; margin: 7px 0 0; line-height: 1.6; }
    .ds-link-info input { width: 100%; margin-top: 9px; border: 1px solid #e2e9da; background: #fafbf7; border-radius: 8px; padding: 10px; font-size: 12px; color: #55714a; }
    .ds-link-actions { display: flex; gap: 8px; }
    .ds-badge { border-radius: 20px; padding: 4px 9px; font-size: 10px; background: #f0f1ea; color: #7b8272; }
    .ds-badge[data-active="true"] { background: #edf6e7; color: #53784a; }
    .ds-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 340px); gap: 22px; align-items: start; }
    .ds-editor, .ds-preview-panel, .ds-key { background: white; border: 1px solid #dfe6d7; border-radius: 16px; min-width: 0; }
    .ds-tabs { display: flex; gap: 6px; padding: 8px; border-bottom: 1px solid #e3eadb; background: #f0f4e9; border-radius: 16px 16px 0 0; }
    .ds-tabs button { flex: 1; border: 0; border-radius: 9px; padding: 10px; min-height: 44px; background: transparent; color: #75876a; font-size: 12px; }
    .ds-tabs button[aria-pressed="true"] { background: white; color: #176957; font-weight: 600; }
    .ds-fields { display: grid; gap: 18px; border: 0; padding: 24px; margin: 0; min-width: 0; }
    .ds-section-title { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 4px; }
    .ds-section-title > svg { margin-top: 2px; color: #6d895f; }
    .ds-section-title h2 { font-size: 16px; font-weight: 600; line-height: 1.5; }
    .ds-section-title p { margin-top: 5px; font-size: 12px; color: #7c8c72; line-height: 1.6; }
    .ds-field { display: grid; gap: 8px; font-size: 12px; font-weight: 600; color: #536e47; min-width: 0; }
    .ds-field input, .ds-field select, .ds-color input { width: 100%; min-height: 46px; border-radius: 10px; border: 1px solid #d9e3d0; background: #fafbf7; color: #365c3f; padding: 11px 12px; font-size: 14px; font-weight: 400; }
    .ds-field input::placeholder { color: #8c9b82; }
    .ds-optional { color: #7c8e71; font-size: 10px; font-weight: 400; }
    .ds-two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .ds-color { display: flex; gap: 8px; min-width: 0; }
    .ds-color input[type="color"] { width: 46px; padding: 5px; flex-shrink: 0; cursor: pointer; }
    .ds-color input:not([type="color"]) { min-width: 0; }
    .ds-hint { font-size: 11px; line-height: 1.8; color: #74856a; }
    .ds-switch { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px; min-height: 54px; border: 1px solid #e0e8d9; border-radius: 11px; background: #fafcf7; cursor: pointer; }
    .ds-switch strong { display: block; font-size: 13px; font-weight: 600; }
    .ds-switch small { display: block; margin-top: 5px; font-size: 11px; line-height: 1.6; color: #7d8e72; }
    .ds-switch > input { position: absolute; right: 14px; width: 44px; height: 28px; opacity: 0; }
    .ds-switch-track { width: 44px; height: 26px; border-radius: 20px; background: #ced9c5; flex-shrink: 0; padding: 3px; transition: background .15s; }
    .ds-switch-track::after { content: ""; display: block; width: 20px; height: 20px; border-radius: 50%; background: white; transition: transform .15s; }
    .ds-switch input:checked + .ds-switch-track { background: #176957; }
    .ds-switch input:checked + .ds-switch-track::after { transform: translateX(18px); }
    .ds-switch input:focus-visible + .ds-switch-track { outline: 3px solid #35ad95; outline-offset: 3px; }
    .ds-switch input:disabled + .ds-switch-track { opacity: .5; }
    .ds-save { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; bottom: 0; background: #fafcf7; padding: 16px 24px; border-top: 1px solid #e0e8d8; border-radius: 0 0 16px 16px; z-index: 2; }
    .ds-save > span { font-size: 11px; color: #7b8c70; }
    .ds-save > div { display: flex; gap: 8px; }
    .ds-aside { display: grid; gap: 18px; }
    .ds-preview-panel { padding: 18px; }
    .ds-preview-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
    .ds-preview-heading h2 { font-size: 14px; font-weight: 600; }
    .ds-preview-heading p { font-size: 11px; color: #7c8c72; margin-top: 5px; }
    .ds-preview-panel > .ds-hint { margin-top: 12px; }
    .ds-preview { border-radius: 12px; border: 1px solid #173d3920; overflow: hidden; }
    .ds-preview > header { padding: 15px; color: white; display: flex; align-items: center; gap: 9px; }
    .ds-preview > header img { width: 30px; height: 30px; object-fit: contain; background: white; border-radius: 5px; }
    .ds-preview > header small { display: block; font-size: 10px; margin-bottom: 5px; overflow-wrap: anywhere; }
    .ds-preview > header strong { display: block; font-size: 13px; overflow-wrap: anywhere; }
    .ds-preview-body { padding: 12px; display: grid; gap: 10px; }
    .ds-preview-current { text-align: center; padding: 15px; border-radius: 8px; background: #ffffffd9; }
    .ds-preview-current > span { font-size: 10px; color: #62745a; }
    .ds-preview-current > strong { display: block; font-size: 40px; font-weight: 600; margin: 7px 0; }
    .ds-preview-current small { font-size: 10px; color: #788a6d; }
    .ds-preview-next > span { font-size: 10px; color: #62745a; }
    .ds-preview-next > div { display: flex; gap: 6px; margin-top: 6px; }
    .ds-preview-next strong { flex: 1; background: #ffffffc9; padding: 9px 3px; text-align: center; font-size: 12px; border-radius: 6px; }
    .ds-preview-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px; background: #ffffffb3; border-radius: 6px; font-size: 10px; }
    .ds-preview-off { text-align: center; font-size: 12px; padding: 8px; background: #fff; border-radius: 6px; }
    .ds-key { padding: 0 18px 18px; }
    .ds-key summary { display: flex; align-items: center; gap: 9px; padding: 17px 0; font-size: 13px; font-weight: 600; cursor: pointer; }
    .ds-key summary::after { content: "+"; margin-left: auto; }
    .ds-key[open] summary::after { content: "−"; }
    .ds-key:not([open]) { padding-bottom: 0; }
    .ds-key p { font-size: 11px; color: #7a8b70; line-height: 1.8; margin-bottom: 14px; }
    .ds-key > button { margin: 14px 0; width: 100%; }
    .ds-error { display: flex; gap: 10px; padding: 14px 16px; border: 1px solid #eed4c9; border-radius: 11px; background: #fcf0eb; color: #9d4e3a; font-size: 13px; line-height: 1.7; margin-top: 16px; }
    .ds-empty { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 70px 24px; font-size: 14px; color: #6b805f; }
    .ds-page button:focus-visible, .ds-page summary:focus-visible { outline: 3px solid #35ad95; outline-offset: 3px; }
    .ds-page input:not([role="switch"]):focus, .ds-page select:focus { outline: 2px solid #8eae7f; outline-offset: 1px; }
    @keyframes ds-spin { to { transform: rotate(360deg); } }
    .ds-spin { animation: ds-spin 1s linear infinite; }
    @media (max-width: 1100px) { .ds-layout { grid-template-columns: minmax(0, 1fr); } .ds-aside { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; } .ds-link-card { flex-wrap: wrap; } .ds-link-actions { margin-left: 64px; } }
    @media (max-width: 639px) { .ds-page { padding: 14px; } .ds-header { padding: 20px; flex-direction: column; align-items: stretch; } .ds-header h1 { font-size: 26px; } .ds-link-card { padding: 16px; gap: 12px; } .ds-icon { display: none; } .ds-link-actions { margin: 0; width: 100%; } .ds-link-actions > button { flex: 1; } .ds-fields { padding: 18px; } .ds-two { grid-template-columns: 1fr; } .ds-tabs button { padding: 9px 6px; font-size: 11px; } .ds-save { padding: 14px 18px max(14px, env(safe-area-inset-bottom)); flex-wrap: wrap; } .ds-save > div { width: 100%; } .ds-save .ds-primary { flex: 1; } .ds-aside { grid-template-columns: 1fr; } .ds-field input, .ds-field select, .ds-color input { font-size: 16px; } .ds-button { min-height: 48px; } }
    @media (prefers-reduced-motion: reduce) { .ds-page *, .ds-page *::before, .ds-page *::after { animation: none !important; transition: none !important; } }
  `}</style>;
}
