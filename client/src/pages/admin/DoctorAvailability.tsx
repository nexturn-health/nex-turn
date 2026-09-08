import { CalendarDays, Clock3, Coffee, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { getAvailabilityDoctors, getDoctorAvailability, updateDoctorAvailability, type AvailabilityDoctor, type ConsultationMode, type DoctorSchedulePayload, type SlotType, type WeeklyAvailability, type WeekDay } from "../../services/doctor/DoctorAvailability";

// 1. Defaults match the original schedule: Sunday off, two sessions on other days.
const DAYS: WeekDay[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const dayName = (day: string) => day.charAt(0) + day.slice(1).toLowerCase();
function defaultWeek(): WeeklyAvailability[] {
  return DAYS.map(day => ({ day, isAvailable: day !== "SUNDAY", sessions: day === "SUNDAY" ? [] : [
    { startTime: "10:00", endTime: "13:00", slotType: "APPOINTMENT" },
    { startTime: "17:00", endTime: "20:00", slotType: "WALK_IN" },
  ], blockedPeriods: day === "SUNDAY" ? [] : [{ startTime: "13:00", endTime: "14:00", reason: "Lunch break" }] }));
}
function defaults(): DoctorSchedulePayload {
  return { appointmentEnabled: true, consultationMode: "HYBRID", slotDurationMinutes: 15, minimumNoticeMinutes: 30,
    bookingWindowDays: 30, gracePeriodMinutes: 15, maxAppointmentsPerDay: 20, maxWalkInsPerDay: 40,
    emergencyBufferPerDay: 2, timezone: "Asia/Kolkata", confirmationRequired: false,
    hybridPattern: ["APPOINTMENT", "WALK_IN"], weeklyAvailability: defaultWeek() };
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
function text(value: unknown, fallback: string) { return typeof value === "string" ? value : fallback; }
function number(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }

// 2. Normalize older responses, including the previous `breaks` field.
// Null/missing values use defaults. A saved zero is preserved.
function normalize(value: unknown): DoctorSchedulePayload {
  const source = record(value), base = defaults();
  const mode = source.consultationMode;
  const week = Array.isArray(source.weeklyAvailability) ? source.weeklyAvailability : null;
  return {
    ...base,
    appointmentEnabled: source.appointmentEnabled !== false,
    consultationMode: mode === "HYBRID" || mode === "APPOINTMENT_ONLY" || mode === "OPD_ONLY" || mode === "ON_CALL_APPOINTMENT" ? mode : base.consultationMode,
    slotDurationMinutes: number(source.slotDurationMinutes, 15), minimumNoticeMinutes: number(source.minimumNoticeMinutes, 30),
    bookingWindowDays: number(source.bookingWindowDays ?? source.maxAdvanceBookingDays, 30),
    gracePeriodMinutes: number(source.gracePeriodMinutes, 15), maxAppointmentsPerDay: number(source.maxAppointmentsPerDay, 20),
    maxWalkInsPerDay: number(source.maxWalkInsPerDay, 40), emergencyBufferPerDay: number(source.emergencyBufferPerDay, 2),
    timezone: text(source.timezone, "Asia/Kolkata"), confirmationRequired: Boolean(source.confirmationRequired),
    hybridPattern: Array.isArray(source.hybridPattern) && source.hybridPattern.length ? source.hybridPattern.filter((item): item is SlotType => item === "APPOINTMENT" || item === "WALK_IN") : base.hybridPattern,
    weeklyAvailability: week ? DAYS.map(day => {
      const found = record(week.find(item => record(item).day === day));
      const breaks = Array.isArray(found.blockedPeriods) ? found.blockedPeriods : Array.isArray(found.breaks) ? found.breaks : [];
      return { day, isAvailable: Boolean(found.isAvailable),
        sessions: Array.isArray(found.sessions) ? found.sessions.map(value => { const item = record(value); return { startTime: text(item.startTime, "10:00"), endTime: text(item.endTime, "13:00"), slotType: item.slotType === "WALK_IN" ? "WALK_IN" : "APPOINTMENT" }; }) : [],
        blockedPeriods: breaks.map(value => { const item = record(value); return { startTime: text(item.startTime, "13:00"), endTime: text(item.endTime, "14:00"), reason: text(item.reason ?? item.label, "Lunch break") }; }),
      };
    }) : base.weeklyAvailability,
  };
}
function errorText(error: unknown, fallback: string) {
  const value = record(error), response = record(value.response), data = record(response.data);
  return text(data.message ?? value.message, fallback);
}
const numberFields = [
  { key: "slotDurationMinutes", label: "Slot duration (minutes)", min: 5 },
  { key: "minimumNoticeMinutes", label: "Minimum notice (minutes)", min: 0 },
  { key: "bookingWindowDays", label: "Booking window (days)", min: 1 },
  { key: "gracePeriodMinutes", label: "Grace period (minutes)", min: 0 },
  { key: "maxAppointmentsPerDay", label: "Appointments per day", min: 0 },
  { key: "maxWalkInsPerDay", label: "Walk-ins per day", min: 0 },
  { key: "emergencyBufferPerDay", label: "Emergency places per day", min: 0 },
] as const;

export default function DoctorAvailability() {
  // 3. The complete editable payload is kept together for predictable resets.
  const [doctors, setDoctors] = useState<AvailabilityDoctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorError, setDoctorError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<DoctorSchedulePayload>(defaults);
  const [saved, setSaved] = useState("");
  const [activeDay, setActiveDay] = useState<WeekDay>("MONDAY");
  const [retry, setRetry] = useState(0);
  const busyRef = useRef(false);
  const requestRef = useRef(0);
  const dirty = !!doctorId && !!saved && JSON.stringify(schedule) !== saved;
  const doctor = doctors.find(item => item._id === doctorId);
  const currentDay = schedule.weeklyAvailability.find(item => item.day === activeDay)!;

  const loadDoctors = useCallback(async () => {
    setDoctorLoading(true); setDoctorError("");
    try { const response = await getAvailabilityDoctors(); setDoctors(response.data || []); }
    catch (error) { setDoctorError(errorText(error, "Unable to load doctors.")); }
    finally { setDoctorLoading(false); }
  }, []);
  useEffect(() => { void loadDoctors(); }, [loadDoctors]);

  // 4. Clear the previous schedule immediately and ignore outdated responses.
  useEffect(() => {
    const request = ++requestRef.current;
    if (!doctorId) return;
    setLoading(true); setLoadError(""); setFormError(""); setSaved(""); setSchedule(defaults());
    void (async () => {
      try {
        const response = await getDoctorAvailability(doctorId);
        if (request !== requestRef.current) return;
        const next = normalize(response.data?.schedule);
        setSchedule(next); setSaved(JSON.stringify(next));
      } catch (error) { if (request === requestRef.current) setLoadError(errorText(error, "Unable to load this doctor’s availability.")); }
      finally { if (request === requestRef.current) setLoading(false); }
    })();
    return () => { requestRef.current++; };
  }, [doctorId, retry]);
  function selectDoctor(nextId: string) {
    if (dirty && !window.confirm("Discard unsaved schedule changes and switch doctors?")) return;
    setSaved(""); setLoading(!!nextId); setDoctorId(nextId);
  }
  function change<K extends keyof DoctorSchedulePayload>(key: K, value: DoctorSchedulePayload[K]) {
    setSchedule(previous => ({ ...previous, [key]: value })); setFormError("");
  }
  function updateDay(updater: (day: WeeklyAvailability) => WeeklyAvailability) {
    setSchedule(previous => ({ ...previous, weeklyAvailability: previous.weeklyAvailability.map(day => day.day === activeDay ? updater(day) : day) }));
    setFormError("");
  }

  // 5. Validate all days, including days hidden by the day selector.
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current || loading || loadError || !doctorId || !saved) return;
    for (const field of numberFields) {
      const value = schedule[field.key];
      if (!Number.isInteger(value) || value < field.min) { setFormError(`${field.label} must be a whole number of at least ${field.min}.`); return; }
    }
    try { new Intl.DateTimeFormat("en-IN", { timeZone: schedule.timezone }).format(); }
    catch { setFormError("Enter a valid timezone, for example Asia/Kolkata."); return; }
    if (!schedule.timezone.trim()) { setFormError("Enter a timezone."); return; }
    for (const day of schedule.weeklyAvailability) {
      if (!day.isAvailable) continue;
      if (!day.sessions.length) { setActiveDay(day.day); setFormError(`Add a session for ${dayName(day.day)} or mark the day unavailable.`); return; }
      for (const range of [...day.sessions, ...(day.blockedPeriods || [])]) {
        const valid = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
        if (!valid(range.startTime) || !valid(range.endTime) || range.startTime >= range.endTime) {
          setActiveDay(day.day); setFormError(`Check ${dayName(day.day)}: each end time must be later than its start time.`); return;
        }
      }
    }
    busyRef.current = true; setSaving(true); setFormError("");
    try {
      await updateDoctorAvailability(doctorId, schedule);
      setSaved(JSON.stringify(schedule)); toast.success("Doctor availability saved.");
    } catch (error) { setFormError(errorText(error, "Unable to save availability.")); }
    finally { busyRef.current = false; setSaving(false); }
  }

  return <main className="nda"><style>{styles}</style>
    <header className="nda-header"><span>DOCTOR SETTINGS · OPD SCHEDULE</span><h1>Doctor availability</h1><p>Set working hours, breaks, and booking preferences.</p></header>
    <section className="nda-doctor"><label>Doctor<select value={doctorId} disabled={doctorLoading || saving} onChange={event => selectDoctor(event.target.value)}><option value="">{doctorLoading ? "Loading doctors…" : "Choose a doctor"}</option>{doctors.map(item => <option key={item._id} value={item._id}>{item.name}{item.departmentId?.name ? ` · ${item.departmentId.name}` : ""}</option>)}</select></label>{doctor && <span className="nda-presence">{doctor.isOnline ? "Online" : "Offline"}</span>}</section>
    {doctorError && <div className="nda-error" role="alert">{doctorError}<button onClick={() => void loadDoctors()}>Retry</button></div>}
    {!doctorId ? <div className="nda-empty"><CalendarDays size={30} /><h2>{!doctorLoading && !doctors.length && !doctorError ? "No doctors available" : "Choose a doctor to begin"}</h2><p>Their weekly schedule and booking settings will appear here.</p></div> : loading ? <div className="nda-empty" role="status"><Loader2 className="nda-spin" size={30} /><h2>Loading availability…</h2></div> : loadError ? <div className="nda-error" role="alert">{loadError}<button onClick={() => setRetry(value => value + 1)}>Retry</button></div> : <form onSubmit={handleSave}>
      <fieldset className="nda-editor" disabled={saving}><legend className="nda-sr">Doctor availability settings</legend>
        {/* 6. Show one day at a time to keep mobile editing short. */}
        <section className="nda-card"><div className="nda-section-head"><div><h2><Clock3 size={18} /> Weekly hours</h2><p>{schedule.weeklyAvailability.filter(day => day.isAvailable).length} working days · {schedule.timezone}</p></div></div>
          <div className="nda-days" aria-label="Choose day">{schedule.weeklyAvailability.map(day => <button type="button" key={day.day} aria-pressed={activeDay === day.day} aria-label={`${dayName(day.day)}, ${day.isAvailable ? "available" : "off"}`} onClick={() => setActiveDay(day.day)}><span>{dayName(day.day).slice(0, 3)}</span><small>{day.isAvailable ? `${day.sessions.length} slots` : "Off"}</small></button>)}</div>
          <div className="nda-day-head"><h3>{dayName(activeDay)}</h3><label className="nda-check"><input type="checkbox" checked={currentDay.isAvailable} onChange={event => updateDay(day => ({ ...day, isAvailable: event.target.checked }))} />Available</label></div>
          {!currentDay.isAvailable ? <p className="nda-off">No consultations on this day. Enable availability to edit working hours.</p> : <>
            <div className="nda-row-title"><h3>Consultation sessions</h3><button type="button" className="nda-text-button" onClick={() => updateDay(day => ({ ...day, sessions: [...day.sessions, { startTime: "10:00", endTime: "13:00", slotType: "APPOINTMENT" }] }))}><Plus size={15} />Add session</button></div>
            {!currentDay.sessions.length && <p className="nda-help">Add a session to set this day’s working hours.</p>}
            {currentDay.sessions.map((session, index) => <div className="nda-time-row" key={`${activeDay}-session-${index}`}>
              <label>From<input type="time" required value={session.startTime} onChange={event => updateDay(day => ({ ...day, sessions: day.sessions.map((item, position) => position === index ? { ...item, startTime: event.target.value } : item) }))} /></label>
              <label>To<input type="time" required value={session.endTime} onChange={event => updateDay(day => ({ ...day, sessions: day.sessions.map((item, position) => position === index ? { ...item, endTime: event.target.value } : item) }))} /></label>
              <label className="nda-kind">Visit type<select value={session.slotType} onChange={event => updateDay(day => ({ ...day, sessions: day.sessions.map((item, position) => position === index ? { ...item, slotType: event.target.value as SlotType } : item) }))}><option value="APPOINTMENT">Appointment</option><option value="WALK_IN">Walk-in</option></select></label>
              <button type="button" className="nda-remove" aria-label={`Remove session ${index + 1}`} onClick={() => updateDay(day => ({ ...day, sessions: day.sessions.filter((_, position) => position !== index) }))}><Trash2 size={17} /></button>
            </div>)}
            <div className="nda-row-title nda-break-title"><h3><Coffee size={16} /> Breaks</h3><button type="button" className="nda-text-button" onClick={() => updateDay(day => ({ ...day, blockedPeriods: [...(day.blockedPeriods || []), { startTime: "13:00", endTime: "14:00", reason: "Lunch break" }] }))}><Plus size={15} />Add break</button></div>
            {!(currentDay.blockedPeriods || []).length && <p className="nda-help">No breaks added.</p>}
            {(currentDay.blockedPeriods || []).map((period, index) => <div className="nda-time-row" key={`${activeDay}-break-${index}`}>
              <label>From<input type="time" required value={period.startTime} onChange={event => updateDay(day => ({ ...day, blockedPeriods: (day.blockedPeriods || []).map((item, position) => position === index ? { ...item, startTime: event.target.value } : item) }))} /></label>
              <label>To<input type="time" required value={period.endTime} onChange={event => updateDay(day => ({ ...day, blockedPeriods: (day.blockedPeriods || []).map((item, position) => position === index ? { ...item, endTime: event.target.value } : item) }))} /></label>
              <label className="nda-kind">Reason<input value={period.reason || ""} onChange={event => updateDay(day => ({ ...day, blockedPeriods: (day.blockedPeriods || []).map((item, position) => position === index ? { ...item, reason: event.target.value } : item) }))} placeholder="Lunch break" /></label>
              <button type="button" className="nda-remove" aria-label={`Remove break ${index + 1}`} onClick={() => updateDay(day => ({ ...day, blockedPeriods: (day.blockedPeriods || []).filter((_, position) => position !== index) }))}><Trash2 size={17} /></button>
            </div>)}
          </>}
        </section>
        {/* 7. Secondary settings stay expandable. Their saved values are preserved. */}
        <details className="nda-card nda-settings"><summary>Booking settings <span>Mode, capacity & timing</span></summary><div className="nda-settings-body"><div className="nda-fields">
          <label>Appointments<select value={schedule.appointmentEnabled ? "YES" : "NO"} onChange={event => change("appointmentEnabled", event.target.value === "YES")}><option value="YES">Enabled</option><option value="NO">Disabled</option></select></label>
          <label>Consultation mode<select value={schedule.consultationMode} onChange={event => change("consultationMode", event.target.value as ConsultationMode)}><option value="HYBRID">Hybrid</option><option value="APPOINTMENT_ONLY">Appointment only</option><option value="OPD_ONLY">OPD / Walk-in only</option><option value="ON_CALL_APPOINTMENT">On-call appointment</option></select></label>
          {numberFields.map(field => <label key={field.key}>{field.label}<input type="number" min={field.min} step="1" value={Number.isNaN(schedule[field.key]) ? "" : schedule[field.key]} onChange={event => change(field.key, event.target.valueAsNumber)} /></label>)}
          <label>Timezone<input value={schedule.timezone} onChange={event => change("timezone", event.target.value)} placeholder="Asia/Kolkata" /></label>
          <label>Booking confirmation<select value={schedule.confirmationRequired ? "YES" : "NO"} onChange={event => change("confirmationRequired", event.target.value === "YES")}><option value="NO">Not required</option><option value="YES">Required</option></select></label>
        </div></div></details>
      </fieldset>
      {formError && <div className="nda-error" role="alert">{formError}</div>}
      <footer className="nda-save"><div><strong>{doctor?.name}</strong><small>{dirty ? "Unsaved changes" : "Schedule ready"}</small></div><button type="submit" disabled={saving || loading || !saved}><span>{saving ? <Loader2 size={17} className="nda-spin" /> : <Save size={17} />}</span>{saving ? "Saving…" : "Save availability"}</button></footer>
    </form>}
  </main>;
}

// 8. Page-scoped colours and responsive layouts; no additional stylesheet needed.
const styles = `
.nda{--ink:#173d39;--green:#176957;--muted:#6b7c73;--line:#dfe6dc;color:var(--ink);background:#f5f6f2;min-height:100%;padding:32px;max-width:1200px;margin:auto;font-family:inherit}.nda *{box-sizing:border-box}.nda h1,.nda h2,.nda h3,.nda p{margin:0}.nda button,.nda input,.nda select{font:inherit}.nda button{cursor:pointer}.nda button:disabled{opacity:.55;cursor:not-allowed}.nda button:focus-visible,.nda input:focus-visible,.nda select:focus-visible,.nda summary:focus-visible{outline:3px solid #99bea9;outline-offset:3px}.nda-header{margin-bottom:24px}.nda-header>span{font-size:10px;font-weight:700;letter-spacing:.13em;color:var(--green)}.nda h1{font-size:30px;font-weight:750;letter-spacing:-.9px;margin:8px 0}.nda-header p{font-size:14px;color:var(--muted);line-height:1.6}.nda-doctor{display:flex;align-items:center;gap:16px;background:#eaf0e1;border:1px solid #dce5d3;border-radius:15px;padding:18px 20px;margin-bottom:20px}.nda-doctor>label{max-width:500px;width:100%}.nda label{display:flex;flex-direction:column;gap:7px;font-size:11px;font-weight:650;min-width:0}.nda input:not([type=checkbox]),.nda select{width:100%;min-width:0;min-height:44px;border:1px solid var(--line);border-radius:10px;background:#fafbf8;color:var(--ink);padding:10px 12px;font-size:13px}.nda-presence{font-size:11px;color:var(--green);margin-top:20px}.nda-editor{border:0;padding:0;margin:0;min-width:0;display:grid;gap:18px}.nda-card{padding:22px;background:white;border:1px solid var(--line);border-radius:18px}.nda-section-head h2{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:700}.nda-section-head p{font-size:11px;color:var(--muted);margin-top:7px}.nda-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin:22px 0;background:#f6f8f2;padding:6px;border-radius:13px}.nda-days button{border:1px solid transparent;border-radius:9px;background:transparent;padding:11px 4px;color:var(--muted)}.nda-days button[aria-pressed=true]{background:var(--ink);color:white}.nda-days span{display:block;font-size:12px;font-weight:650}.nda-days small{display:block;font-size:9px;margin-top:5px;opacity:.8}.nda-day-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--line)}.nda h3{font-size:14px;font-weight:650}.nda .nda-check{flex-direction:row;align-items:center;gap:8px;font-size:12px}.nda-check input{accent-color:var(--green);width:17px;height:17px}.nda-row-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 8px}.nda-row-title h3{display:flex;align-items:center;gap:7px;font-size:12px}.nda-text-button{display:flex;align-items:center;gap:5px;min-height:40px;border:0;background:transparent;color:var(--green);font-size:11px!important;font-weight:650!important}.nda-time-row{display:grid;grid-template-columns:1fr 1fr 1.4fr 40px;align-items:end;gap:10px;padding:13px;background:#fafbf8;border:1px solid #edf0e8;border-radius:12px;margin-bottom:10px}.nda-remove{display:grid;place-items:center;min-height:44px;border:0;border-radius:9px;background:#fff0eb;color:#a75740}.nda-break-title{margin-top:24px}.nda-help,.nda-off{font-size:12px;color:var(--muted);line-height:1.6;padding:12px 0}.nda-settings{padding:0;overflow:hidden}.nda-settings summary{padding:20px 22px;cursor:pointer;font-size:14px;font-weight:650}.nda-settings summary span{font-size:11px;font-weight:400;color:var(--muted);margin-left:12px}.nda-settings-body{padding:0 22px 22px}.nda-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px}.nda-save{position:sticky;bottom:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:15px;padding:16px 20px;background:white;border:1px solid var(--line);border-radius:14px;margin-top:18px;box-shadow:0 -4px 20px #173d3906}.nda-save strong{display:block;font-size:12px}.nda-save small{display:block;font-size:10px;color:var(--muted);margin-top:5px}.nda-save button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:0;border-radius:11px;background:var(--green);color:white;padding:12px 17px;font-size:12px;font-weight:650}.nda-save button>span{display:flex}.nda-error{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff1eb;border:1px solid #efd0c2;color:#9b4930;border-radius:12px;padding:14px;margin:16px 0;font-size:13px;line-height:1.5}.nda-error button{min-height:40px;background:transparent;border:0;color:inherit;text-decoration:underline}.nda-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:300px;text-align:center;padding:30px;background:white;border:1px solid var(--line);border-radius:17px;color:var(--muted)}.nda-empty h2{font-size:18px;color:var(--ink)}.nda-empty p{font-size:13px;line-height:1.6}.nda-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.nda-spin{animation:nda-spin 1s linear infinite}@keyframes nda-spin{to{transform:rotate(360deg)}}@media(max-width:700px){.nda{padding:20px 14px}.nda h1{font-size:26px}.nda-header>span{font-size:9px}.nda-header p{font-size:12px}.nda-doctor{padding:14px}.nda-card{padding:16px}.nda-days{gap:2px;padding:4px}.nda-days span{font-size:10px}.nda-days small{font-size:8px}.nda-time-row{grid-template-columns:1fr 1fr 36px;padding:11px;gap:10px}.nda-time-row>label:nth-child(1){grid-column:1;grid-row:1}.nda-time-row>label:nth-child(2){grid-column:2/4;grid-row:1}.nda-kind{grid-column:1/3;grid-row:2}.nda-remove{grid-column:3;grid-row:2}.nda-fields{grid-template-columns:1fr 1fr;gap:14px}.nda-settings{padding:0}.nda-settings summary{padding:18px 16px}.nda-settings summary span{display:block;margin:6px 0 0}.nda-settings-body{padding:0 16px 18px}.nda-save{padding:12px;gap:10px}.nda-save button{font-size:11px;padding:11px}.nda-save>div{min-width:0;overflow-wrap:anywhere}.nda-section-head h2{font-size:16px}}@media(max-width:380px){.nda-fields{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.nda *{animation:none!important;transition:none!important}}
`;
