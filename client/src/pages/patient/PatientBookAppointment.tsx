import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, ChevronRight, HeartPulse, Loader2, MapPin, Search, UserRound } from "lucide-react";
import {
  bookPublicAppointment, getPublicDepartments, getPublicDistricts,
  getPublicDoctors, getPublicHospitals, getPublicSlots, getPublicStates,
  type PublicBookingResult, type PublicDepartment, type PublicDoctor,
  type PublicHospital, type PublicSlot,
} from "../../services/appointment/publicAppointment.api";

// Dates use the patient's local calendar, rather than UTC.
function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function doctorName(name: string): string {
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}
function errorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" ? message : "Something went wrong. Please try again.";
}

// Reuse the same small loader for location, hospital, doctor and slot lists.
// Cleanup prevents an old response from replacing a newer selection.
function useBookingList<T>(load: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    let active = true;
    setItems([]); setLoading(true); setError("");
    // A short delay also debounces typing in the hospital search.
    const timer = window.setTimeout(async () => {
      try {
        const result = await load();
        if (active) setItems(result);
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [load, retryCount]);
  return { items, loading, error, retry: () => setRetryCount(value => value + 1) };
}

export default function PatientBookAppointment() {
  // Three short screens instead of six long, stacked sections.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [hospital, setHospital] = useState<PublicHospital | null>(null);
  const [department, setDepartment] = useState<PublicDepartment | null>(null);
  const [doctor, setDoctor] = useState<PublicDoctor | null>(null);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("MALE");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [success, setSuccess] = useState<PublicBookingResult | null>(null);
  const savingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Keep the supplied API methods and response shapes unchanged.
  const states = useBookingList<string>(useCallback(async () => (await getPublicStates()).data || [], []));
  const districts = useBookingList<string>(useCallback(async () => state ? (await getPublicDistricts(state)).data || [] : [], [state]));
  const hospitals = useBookingList<PublicHospital>(useCallback(async () => state && district
    ? (await getPublicHospitals({ state, district, q: search.trim() || undefined })).data || [] : [], [state, district, search]));
  const departments = useBookingList<PublicDepartment>(useCallback(async () => hospital
    ? (await getPublicDepartments(hospital._id)).data || [] : [], [hospital]));
  const doctors = useBookingList<PublicDoctor>(useCallback(async () => hospital && department
    ? (await getPublicDoctors(hospital._id, department._id)).data || [] : [], [hospital, department]));
  const slots = useBookingList<PublicSlot>(useCallback(async () => hospital && doctor && date
    ? (await getPublicSlots(hospital._id, doctor._id, date)).data.slots || [] : [], [hospital, doctor, date]));

  // Move keyboard focus to the new screen without adding extra Next buttons.
  useEffect(() => { headingRef.current?.focus(); }, [step, success]);

  function resetHospital(): void {
    setHospital(null); setDepartment(null); setDoctor(null); setSlot(null);
    setBookingError("");
  }
  function chooseHospital(value: PublicHospital): void {
    resetHospital(); setHospital(value); setStep(2);
  }

  async function book(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (savingRef.current) return;
    if (!hospital || !department || !doctor || !slot) {
      setBookingError("Please choose your hospital, doctor and appointment time."); return;
    }
    // Accept ten digits or an Indian +91 prefix; do not silently truncate input.
    let digits = phone.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (name.trim().length < 2) { setBookingError("Please enter the patient's full name."); return; }
    if (digits.length !== 10) { setBookingError("Please enter a valid 10-digit mobile number."); return; }
    if (date < today()) { setBookingError("Please choose an appointment date from today onwards."); return; }
    savingRef.current = true; setSaving(true); setBookingError("");
    try {
      const response = await bookPublicAppointment(hospital._id, {
        doctorId: doctor._id, departmentId: department._id, slotId: slot._id,
        name: name.trim(), phone: digits, age: age || undefined, gender,
        reason: reason.trim() || "Appointment booking", notes: "",
      });
      setSuccess(response.data);
    } catch (err) {
      setBookingError(errorMessage(err));
    } finally {
      savingRef.current = false; setSaving(false);
    }
  }

  return <div className="pb-page">
    <BookingStyles />
    <header className="pb-header"><div className="pb-brand"><HeartPulse size={23} /><strong>NextSynq Health</strong></div><span>Book an appointment</span></header>
    <main className="pb-main">
      {success ? <section className="pb-panel pb-success">
        <span className="pb-success-icon"><CheckCircle2 size={32} /></span>
        <h1 ref={headingRef} tabIndex={-1}>Appointment booked</h1>
        <p>Save this code and show it at reception when you arrive.</p>
        <div className="pb-code"><span>APPOINTMENT CODE</span><strong>{success.appointmentCode}</strong><p>{success.status}</p></div>
        <dl className="pb-summary-list"><div><dt>Hospital</dt><dd>{success.hospital.name}</dd></div><div><dt>Doctor</dt><dd>{doctorName(success.doctor.name)}</dd></div><div><dt>Department</dt><dd>{success.department.name}</dd></div><div><dt>Date & time</dt><dd>{formatDate(success.date)} · {success.startTime}</dd></div></dl>
        <p className="pb-note">Please arrive before your appointment time. Reception will check you in and provide your live queue token. Consultation times may vary.</p>
        <button type="button" className="pb-button pb-primary" onClick={() => window.location.reload()}>Book another appointment</button>
      </section> : <>
        <div className="pb-intro"><p className="pb-eyebrow">CARE, AT YOUR CONVENIENCE</p><h1 ref={headingRef} tabIndex={-1}>{step === 1 ? "Find your hospital" : step === 2 ? "Choose your doctor & time" : "You're almost booked"}</h1><p>{step === 1 ? "Choose a location to see hospitals accepting appointments." : step === 2 ? "Select a department, doctor and available appointment time." : "Add the patient's details and confirm your appointment."}</p></div>
        <ol className="pb-progress" aria-label="Booking progress">{["Hospital", "Doctor & time", "Your details"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} data-done={step > index + 1}><span>{step > index + 1 ? <CheckCircle2 size={16} /> : index + 1}</span>{label}</li>)}</ol>

        {step > 1 && hospital && <div className="pb-selection"><Building2 size={20} /><div><strong>{hospital.name}</strong><p>{step === 3 && doctor && slot ? `${doctorName(doctor.name)} · ${formatDate(date)} · ${slot.startTime}` : hospital.address || `${hospital.district}, ${hospital.state}`}</p></div><button type="button" disabled={saving} onClick={() => { setBookingError(""); setStep(step === 3 ? 2 : 1); }}>Change</button></div>}

        <section className="pb-panel">
          {/* 1. Location and hospital are one screen. Selecting a hospital advances. */}
          {step === 1 && <>
            <div className="pb-fields">
              <div className="pb-field"><label htmlFor="pb-state">State</label><select id="pb-state" value={state} disabled={states.loading} onChange={e => { setState(e.target.value); setDistrict(""); resetHospital(); }}><option value="">Select state</option>{states.items.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="pb-field"><label htmlFor="pb-district">District / city</label><select id="pb-district" value={district} disabled={!state || districts.loading} onChange={e => { setDistrict(e.target.value); resetHospital(); }}><option value="">Select district / city</option>{districts.items.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
            </div>
            <ListFeedback loading={states.loading} error={states.error} retry={states.retry} />
            {state && <ListFeedback loading={districts.loading} error={districts.error} retry={districts.retry} />}
            {!states.loading && !states.error && !states.items.length && <p className="pb-empty">No booking locations are available yet. Please contact your hospital.</p>}
            {state && !districts.loading && !districts.error && !districts.items.length && <p className="pb-empty">No districts are available for this state. Try another location.</p>}
            {district && <>
              <div className="pb-search"><Search size={18} /><input type="search" aria-label="Search hospitals" placeholder="Search hospital name" value={search} onChange={e => { setSearch(e.target.value); resetHospital(); }} /></div>
              <ListFeedback loading={hospitals.loading} error={hospitals.error} retry={hospitals.retry} />
              {!hospitals.loading && !hospitals.error && <div className="pb-options">{hospitals.items.map(item => <button type="button" className="pb-option" key={item._id} onClick={() => chooseHospital(item)}><span className="pb-option-icon"><Building2 size={21} /></span><span className="pb-option-text"><strong>{item.name}</strong><span>{item.address || item.city || "Address not available"}</span><small><MapPin size={12} />{item.district}, {item.state}</small></span><ChevronRight size={18} /></button>)}</div>}
              {!hospitals.loading && !hospitals.error && !hospitals.items.length && <p className="pb-empty">No hospitals found. Try another name or location.</p>}
            </>}
          </>}

          {/* 2. Show only the choices that are ready, rather than empty sections. */}
          {step === 2 && <>
            <div className="pb-field"><label htmlFor="pb-department">Department</label><select id="pb-department" disabled={departments.loading} value={department?._id || ""} onChange={e => { setDepartment(departments.items.find(item => item._id === e.target.value) || null); setDoctor(null); setSlot(null); }}><option value="">Select department</option>{departments.items.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></div>
            <ListFeedback loading={departments.loading} error={departments.error} retry={departments.retry} />
            {!departments.loading && !departments.error && !departments.items.length && <p className="pb-empty">No departments are accepting appointments here. Choose another hospital.</p>}
            {department && <div className="pb-section"><h2>Choose a doctor</h2><ListFeedback loading={doctors.loading} error={doctors.error} retry={doctors.retry} />
              {!doctors.loading && !doctors.error && <div className="pb-options">{doctors.items.map(item => <button type="button" className="pb-option" aria-pressed={doctor?._id === item._id} key={item._id} onClick={() => { setDoctor(item); setSlot(null); }}><span className="pb-option-icon"><UserRound size={21} /></span><span className="pb-option-text"><strong>{doctorName(item.name)}</strong><span>{department.name}</span></span>{doctor?._id === item._id ? <CheckCircle2 size={19} /> : <ChevronRight size={18} />}</button>)}</div>}
              {!doctors.loading && !doctors.error && !doctors.items.length && <p className="pb-empty">No doctors are available for booking in this department.</p>}
            </div>}
            {doctor && <div className="pb-section"><div className="pb-date-heading"><h2>Choose a time</h2><div className="pb-field"><label htmlFor="pb-date">Appointment date</label><input id="pb-date" type="date" min={today()} value={date} onChange={e => { setDate(e.target.value); setSlot(null); }} /></div></div>
              <ListFeedback loading={slots.loading} error={slots.error} retry={slots.retry} />
              {!slots.loading && !slots.error && <div className="pb-times">{slots.items.map(item => <button type="button" key={item._id} aria-pressed={slot?._id === item._id} onClick={() => setSlot(item)}><strong>{item.startTime}</strong><span>to {item.endTime}</span></button>)}</div>}
              {!slots.loading && !slots.error && !slots.items.length && <p className="pb-empty">No times available. Try another date or doctor.</p>}
              <p className="pb-hint">Appointment times are approximate. Emergency cases or longer consultations can affect the queue.</p>
            </div>}
            <div className="pb-actions"><button type="button" className="pb-button pb-secondary" onClick={() => setStep(1)}><ArrowLeft size={16} />Back</button><button type="button" className="pb-button pb-primary" disabled={!slot || slots.loading || !!slots.error || !date || date < today()} onClick={() => setStep(3)}>Continue<ChevronRight size={16} /></button></div>
          </>}

          {/* 3. Keep optional information compact and the final action explicit. */}
          {step === 3 && <form onSubmit={book} aria-busy={saving}>
            {bookingError && <div className="pb-error" role="alert">{bookingError}</div>}
            <fieldset className="pb-form" disabled={saving}>
              <div className="pb-fields"><div className="pb-field"><label htmlFor="pb-name">Patient name</label><input id="pb-name" required minLength={2} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></div><div className="pb-field"><label htmlFor="pb-phone">Mobile number</label><input id="pb-phone" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" /></div></div>
              <div className="pb-fields"><div className="pb-field"><label htmlFor="pb-age">Age <span>(optional)</span></label><input id="pb-age" type="number" min="0" step="1" value={age} onChange={e => setAge(e.target.value)} placeholder="Age in years" /></div><div className="pb-field"><label htmlFor="pb-gender">Gender</label><select id="pb-gender" value={gender} onChange={e => setGender(e.target.value)}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></div></div>
              <div className="pb-field"><label htmlFor="pb-reason">Reason for visit <span>(optional)</span></label><textarea id="pb-reason" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly describe why you're visiting" /></div>
            </fieldset>
            <p className="pb-note">After booking, show your appointment code at reception to check in and receive your queue token.</p>
            <div className="pb-actions"><button type="button" className="pb-button pb-secondary" disabled={saving} onClick={() => { setBookingError(""); setStep(2); }}><ArrowLeft size={16} />Back</button><button type="submit" className="pb-button pb-primary" disabled={saving}>{saving ? <Loader2 size={17} className="pb-spin" /> : <CalendarDays size={17} />}{saving ? "Booking…" : "Confirm appointment"}</button></div>
          </form>}
        </section>
        <p className="pb-bottom-note">Your live queue begins after check-in at the hospital.</p>
      </>}
    </main>
  </div>;
}

function ListFeedback({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <p className="pb-loading" role="status"><Loader2 size={18} className="pb-spin" />Loading available options…</p>;
  if (error) return <div className="pb-error" role="alert"><span>{error}</span><button type="button" onClick={retry}>Try again</button></div>;
  return null;
}

// Scoped styles keep this component independent of shared UI files.
function BookingStyles() {
  return <style>{`
    .pb-page { min-height: 100dvh; color: #173d39; background: #f5f6f2; font-family: "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
    .pb-page *, .pb-page *::before, .pb-page *::after { box-sizing: border-box; }
    .pb-page h1, .pb-page h2, .pb-page p { margin: 0; }
    .pb-page button, .pb-page input, .pb-page select, .pb-page textarea { font: inherit; }
    .pb-page button { cursor: pointer; touch-action: manipulation; }
    .pb-page button:disabled { opacity: .5; cursor: not-allowed; }
    .pb-page svg { flex-shrink: 0; }
    .pb-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 1060px; padding: 22px 28px; margin: auto; border-bottom: 1px solid #dce5d5; }
    .pb-brand { display: flex; align-items: center; gap: 10px; font-size: 16px; }
    .pb-header > span { color: #6a7b61; font-size: 12px; }
    .pb-main { max-width: 820px; margin: auto; padding: 32px 24px 40px; }
    .pb-intro { padding: 24px; border: 1px solid #dce5d5; border-radius: 18px; background: linear-gradient(110deg, #eaf0e1, #eef4e9, #dcebdd); }
    .pb-eyebrow { color: #647c57; font-size: 9px; letter-spacing: 1.6px; font-weight: 700; }
    .pb-intro h1 { margin-top: 9px; font-size: 28px; line-height: 1.3; letter-spacing: -.7px; font-weight: 600; }
    .pb-intro > p:last-child { margin-top: 8px; font-size: 13px; color: #67795e; line-height: 1.7; }
    .pb-intro h1:focus, .pb-success h1:focus { outline: none; }
    .pb-progress { display: grid; grid-template-columns: repeat(3, 1fr); list-style: none; padding: 0; gap: 12px; margin: 22px 0; }
    .pb-progress li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: #7a8970; }
    .pb-progress li > span { display: grid; place-items: center; width: 28px; height: 28px; background: #e7ecdf; border-radius: 50%; flex-shrink: 0; }
    .pb-progress li[aria-current="step"] { color: #176957; font-weight: 600; }
    .pb-progress li[aria-current="step"] > span { background: #176957; color: white; }
    .pb-progress li[data-done="true"] > span { background: #e2eeda; color: #507547; }
    .pb-panel { padding: 26px; background: #fff; border: 1px solid #dfe6d7; border-radius: 18px; }
    .pb-selection { display: flex; align-items: center; gap: 12px; padding: 16px 18px; margin-bottom: 14px; background: #edf3e6; border: 1px solid #dce6d4; border-radius: 13px; }
    .pb-selection > div { flex: 1; min-width: 0; }
    .pb-selection strong { font-size: 13px; overflow-wrap: anywhere; }
    .pb-selection p { font-size: 12px; color: #6c7e60; margin-top: 5px; line-height: 1.6; overflow-wrap: anywhere; }
    .pb-selection button { border: 0; color: #176957; background: transparent; text-decoration: underline; font-size: 12px; min-height: 44px; }
    .pb-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .pb-field { display: grid; gap: 8px; min-width: 0; }
    .pb-field label { font-size: 12px; color: #4c6746; font-weight: 600; }
    .pb-field label > span { color: #7d8c71; font-weight: 400; }
    .pb-field input, .pb-field select, .pb-field textarea, .pb-search input { width: 100%; min-height: 48px; border: 1px solid #d9e3d0; border-radius: 10px; background: #fafbf7; color: #264d39; padding: 12px; font-size: 14px; }
    .pb-field textarea { resize: vertical; }
    .pb-field input:focus, .pb-field select:focus, .pb-field textarea:focus, .pb-search input:focus { outline: 2px solid #85aa76; outline-offset: 1px; background: white; }
    .pb-page button:focus-visible { outline: 3px solid #38a992; outline-offset: 3px; }
    .pb-field input::placeholder, .pb-field textarea::placeholder, .pb-search input::placeholder { color: #8a9980; }
    .pb-search { position: relative; margin: 22px 0 16px; }
    .pb-search > svg { position: absolute; top: 15px; left: 13px; color: #869879; }
    .pb-search input { padding-left: 40px; }
    .pb-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr)); gap: 12px; }
    .pb-option { display: flex; align-items: center; gap: 12px; padding: 16px; min-width: 0; text-align: left; border: 1px solid #dce5d3; border-radius: 12px; background: white; color: #31553d; transition: background .15s, border-color .15s; }
    .pb-option:hover { background: #f4f8ee; border-color: #9ab48b; }
    .pb-option[aria-pressed="true"] { background: #edf5e6; border-color: #62885e; }
    .pb-option-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; background: #edf3e6; color: #668355; flex-shrink: 0; }
    .pb-option-text { display: grid; gap: 5px; min-width: 0; flex: 1; }
    .pb-option-text strong { font-size: 14px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
    .pb-option-text > span, .pb-option-text small { font-size: 11px; color: #718363; line-height: 1.6; overflow-wrap: anywhere; }
    .pb-option-text small { display: flex; align-items: center; gap: 4px; }
    .pb-section { margin-top: 24px; border-top: 1px solid #e8eddf; padding-top: 22px; }
    .pb-section h2 { margin-bottom: 14px; font-size: 16px; font-weight: 600; }
    .pb-date-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .pb-date-heading h2 { margin: 0; }
    .pb-times { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
    .pb-times button { padding: 12px; border: 1px solid #d9e3d0; border-radius: 10px; background: #fafbf7; color: #345c42; }
    .pb-times strong { display: block; font-size: 15px; font-weight: 600; }
    .pb-times span { display: block; margin-top: 5px; font-size: 11px; }
    .pb-times button[aria-pressed="true"] { background: #176957; border-color: #176957; color: white; }
    .pb-hint, .pb-bottom-note { font-size: 11px; color: #75856a; line-height: 1.7; }
    .pb-hint { margin-top: 14px !important; }
    .pb-bottom-note { text-align: center; margin-top: 18px !important; }
    .pb-actions { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #e6ecdd; padding-top: 18px; margin-top: 24px; }
    .pb-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 12px 18px; border-radius: 10px; border: 1px solid transparent; font-size: 13px !important; font-weight: 600 !important; }
    .pb-primary { background: #176957; color: white; }
    .pb-primary:hover:not(:disabled) { background: #104e40; }
    .pb-secondary { background: white; color: #5b744e; border-color: #d7e2cc; }
    .pb-form { display: grid; gap: 18px; border: 0; padding: 0; margin: 0; min-width: 0; }
    .pb-note { padding: 15px; background: #f0f5e9; border-radius: 11px; color: #637b55; font-size: 12px; line-height: 1.8; margin-top: 20px !important; }
    .pb-loading { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 22px; font-size: 12px; color: #6c845f; }
    .pb-error { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fcf0eb; border: 1px solid #eed4ca; color: #974b3b; border-radius: 10px; padding: 14px; margin: 12px 0; font-size: 13px; line-height: 1.6; }
    .pb-error button { background: transparent; border: 0; color: inherit; text-decoration: underline; min-height: 44px; flex-shrink: 0; }
    .pb-empty { padding: 24px 12px; text-align: center; color: #74836a; font-size: 13px; line-height: 1.8; }
    .pb-success { max-width: 600px; margin: auto; text-align: center; }
    .pb-success-icon { display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 18px; background: #edf4e5; color: #176957; }
    .pb-success h1 { font-size: 27px; font-weight: 600; margin: 18px 0 8px; }
    .pb-success > p { color: #728568; font-size: 13px; line-height: 1.8; }
    .pb-code { background: #eaf0e1; border-radius: 14px; padding: 22px; margin-top: 22px; }
    .pb-code > span { font-size: 10px; letter-spacing: 1.5px; color: #647b57; }
    .pb-code strong { display: block; font-size: 30px; margin: 10px 0; overflow-wrap: anywhere; }
    .pb-code p { font-size: 12px; }
    .pb-summary-list { text-align: left; margin: 20px 0; }
    .pb-summary-list > div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #e5ebdc; font-size: 13px; }
    .pb-summary-list dt { color: #7a8a6c; }
    .pb-summary-list dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
    .pb-success > button { width: 100%; margin-top: 20px; }
    @keyframes pb-spin { to { transform: rotate(360deg); } }
    .pb-spin { animation: pb-spin 1s linear infinite; }
    @media (max-width: 639px) {
      .pb-header { padding: 18px 16px; }
      .pb-header > span { display: none; }
      .pb-main { padding: 20px 14px 28px; }
      .pb-intro { padding: 20px; border-radius: 15px; }
      .pb-intro h1 { font-size: 25px; }
      .pb-progress { gap: 6px; margin: 18px 0; }
      .pb-progress li { gap: 5px; font-size: 10px; }
      .pb-progress li > span { width: 24px; height: 24px; }
      .pb-panel { padding: 18px; border-radius: 14px; }
      .pb-fields { grid-template-columns: 1fr; gap: 16px; }
      .pb-field input, .pb-field select, .pb-field textarea, .pb-search input { font-size: 16px; }
      .pb-selection { padding: 12px; }
      .pb-date-heading { align-items: stretch; flex-direction: column; }
      .pb-actions { position: sticky; bottom: 0; background: #fff; padding-bottom: max(12px, env(safe-area-inset-bottom)); }
      .pb-actions .pb-primary { flex: 1; padding-left: 10px; padding-right: 10px; }
      .pb-actions .pb-secondary { padding-left: 12px; padding-right: 12px; }
    }
    @media (prefers-reduced-motion: reduce) { .pb-spin { animation: none; } .pb-option { transition: none; } }
  `}</style>;
}
