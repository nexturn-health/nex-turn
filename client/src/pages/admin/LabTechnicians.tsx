import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, Edit3, Loader2, Plus, Power, RefreshCw, Search, X } from "lucide-react";
import { getActiveLabDepartments } from "../../services/lab/labDepartment.api";
import { getActiveLabRooms } from "../../services/lab/labRoom.api";

// 1. Data types: references can contain an ID or a populated object.
type Reference = string | { _id: string; name?: string; roomNumber?: string } | null;
interface LabDepartment { _id: string; name: string; isActive?: boolean }
interface LabRoom { _id: string; name: string; roomNumber?: string; labDepartmentId: Reference; isActive?: boolean }
interface LabTechnician {
  _id: string; name: string; email: string; phone?: string; role: "LAB_TECHNICIAN";
  labDepartmentId: Reference; labRoomId: Reference; isActive: boolean;
}
interface TechnicianForm {
  name: string; email: string; password: string; phone: string; labDepartmentId: string; labRoomId: string;
}
const emptyForm = (): TechnicianForm => ({ name: "", email: "", password: "", phone: "", labDepartmentId: "", labRoomId: "" });
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const getId = (value: Reference | undefined) => typeof value === "string" ? value : value?._id || "";
function errorText(error: unknown) {
  const value = error as { response?: { data?: { message?: unknown } }; message?: unknown };
  const text = value?.response?.data?.message ?? value?.message;
  return typeof text === "string" ? text : "Something went wrong. Please try again.";
}

// 2. One helper handles the existing fetch endpoints and Bearer authentication.
// Successful empty responses are allowed; HTML errors are not shown as JSON errors.
async function technicianRequest(path = "", method = "GET", payload?: Record<string, unknown>): Promise<unknown> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Your session is unavailable. Please sign in again.");
  const response = await fetch(`${API_URL}/lab-technicians${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(payload ? { "Content-Type": "application/json" } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* Use a readable fallback for non-JSON server errors. */ }
  if (!response.ok) {
    const message = (data as { message?: unknown } | null)?.message;
    throw new Error(typeof message === "string" ? message : `Request failed (${response.status}). Please try again.`);
  }
  return data;
}

// Native dialog keeps keyboard focus inside the form and restores it on close.
function TechnicianDialog({ busy, title, onClose, children }: { busy: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={ref} className="nltech-dialog" aria-labelledby="technician-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="nltech-dialog-head"><div><small>NextSynq Health</small><h2 id="technician-dialog-title">{title}</h2></div><button className="nltech-icon" type="button" disabled={busy} onClick={onClose} aria-label="Close form"><X size={20} /></button></header>{children}
  </dialog>;
}

export default function LabTechnicians() {
  // 3. Keep list errors separate from form errors so neither hides the other.
  const [technicians, setTechnicians] = useState<LabTechnician[]>([]);
  const [departments, setDepartments] = useState<LabDepartment[]>([]);
  const [rooms, setRooms] = useState<LabRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabTechnician | null>(null);
  const [form, setForm] = useState<TechnicianForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const listRequest = useRef(0);
  const lookupRequest = useRef(0);

  // 4. Load staff and assignment options independently. Old responses are ignored.
  const loadTechnicians = useCallback(async (refresh = false) => {
    const request = ++listRequest.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const result = await technicianRequest();
      const data = Array.isArray(result) ? result : (result as { data?: unknown } | null)?.data;
      if (!Array.isArray(data)) throw new Error("The server returned an invalid technician list.");
      if (request === listRequest.current) setTechnicians(data);
    } catch (error) { if (request === listRequest.current) setError(errorText(error)); }
    finally { if (request === listRequest.current) { setLoading(false); setRefreshing(false); } }
  }, []);
  const loadAssignments = useCallback(async () => {
    const request = ++lookupRequest.current;
    setLookupLoading(true); setLookupError("");
    try {
      const [departmentData, roomData] = await Promise.all([getActiveLabDepartments(), getActiveLabRooms()]);
      if (request !== lookupRequest.current) return;
      setDepartments(Array.isArray(departmentData) ? departmentData.filter(item => item.isActive !== false) : []);
      setRooms(Array.isArray(roomData) ? roomData.filter(item => item.isActive !== false) : []);
    } catch (error) { if (request === lookupRequest.current) setLookupError(errorText(error)); }
    finally { if (request === lookupRequest.current) setLookupLoading(false); }
  }, []);
  useEffect(() => {
    void loadTechnicians(); void loadAssignments();
    return () => { listRequest.current++; lookupRequest.current++; };
  }, [loadTechnicians, loadAssignments]);

  // Use populated names first, then fall back to the loaded department/room lists.
  function departmentName(technician: LabTechnician) {
    const value = technician.labDepartmentId;
    return (typeof value === "object" && value?.name) || departments.find(item => item._id === getId(value))?.name || "Unavailable department";
  }
  function roomName(technician: LabTechnician) {
    const value = technician.labRoomId;
    const room = typeof value === "object" && value?.name ? value : rooms.find(item => item._id === getId(value));
    return room ? `${room.name || "Room"}${room.roomNumber ? ` · ${room.roomNumber}` : ""}` : "Unavailable room";
  }
  const filteredRooms = useMemo(() => rooms.filter(room => getId(room.labDepartmentId) === form.labDepartmentId), [rooms, form.labDepartmentId]);
  const query = search.trim().toLowerCase();
  const filteredTechnicians = technicians.filter(technician =>
    (filter === "ALL" || (filter === "ACTIVE" ? technician.isActive : !technician.isActive)) &&
    [technician.name, technician.email, technician.phone, departmentName(technician), roomName(technician)]
      .some(value => (value || "").toLowerCase().includes(query))
  );
  const activeCount = technicians.filter(technician => technician.isActive).length;

  // 5. An edit never pre-fills the password. Blank means keep the current password.
  function openForm(technician?: LabTechnician) {
    setEditing(technician || null); setFormError("");
    setForm(technician ? { name: technician.name || "", email: technician.email || "", phone: technician.phone || "", password: "", labDepartmentId: getId(technician.labDepartmentId), labRoomId: getId(technician.labRoomId) } : emptyForm());
    setModalOpen(true);
  }
  function closeForm() {
    if (busyRef.current) return;
    setModalOpen(false); setEditing(null); setForm(emptyForm()); setFormError("");
  }
  function change(field: keyof TechnicianForm, value: string) {
    // A room belongs to one department, so clear it when the department changes.
    setForm(previous => ({ ...previous, [field]: value, ...(field === "labDepartmentId" ? { labRoomId: "" } : {}) }));
    setFormError("");
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    if (!form.name.trim() || !form.email.trim()) { setFormError("Enter the technician’s name and email."); return; }
    const password = form.password.trim();
    if ((!editing || password) && password.length < 6) { setFormError("Password must contain at least 6 characters."); return; }
    // Validate against the loaded options, not only a non-empty string.
    if (!departments.some(item => item._id === form.labDepartmentId)) { setFormError("Select an available laboratory department."); return; }
    if (!filteredRooms.some(item => item._id === form.labRoomId)) { setFormError("Select an available room in this department."); return; }
    busyRef.current = true; setSaving(true); setFormError(""); setSuccess("");
    try {
      await technicianRequest(editing ? `/${editing._id}` : "", editing ? "PATCH" : "POST", {
        name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim() || undefined,
        labDepartmentId: form.labDepartmentId, labRoomId: form.labRoomId, ...(password ? { password } : {}),
      });
      setSuccess(editing ? "Technician updated successfully." : "Technician created successfully.");
      setModalOpen(false); setEditing(null); setForm(emptyForm());
      await loadTechnicians(true);
    } catch (error) { setFormError(errorText(error)); }
    finally { busyRef.current = false; setSaving(false); }
  }

  // 6. Preserve activation endpoints and confirmation; prevent repeated requests.
  async function toggleTechnician(technician: LabTechnician) {
    if (busyRef.current) return;
    const action = technician.isActive ? "deactivate" : "activate";
    if (!window.confirm(`${technician.isActive ? "Deactivate" : "Activate"} ${technician.name}?`)) return;
    busyRef.current = true; setActionId(technician._id); setError(""); setSuccess("");
    try {
      await technicianRequest(`/${technician._id}/${action}`, "PATCH");
      setTechnicians(previous => previous.map(item => item._id === technician._id ? { ...item, isActive: !technician.isActive } : item));
      setSuccess(technician.isActive ? "Technician deactivated." : "Technician activated.");
      await loadTechnicians(true);
    } catch (error) { setError(errorText(error)); }
    finally { busyRef.current = false; setActionId(null); }
  }
  const busy = saving || !!actionId;

  // 7. Main page: status tabs, search, and responsive staff cards.
  return <main className="nltech">
    <style>{styles}</style>
    <header className="nltech-header"><div><span className="nltech-eyebrow">LABORATORY · TEAM MANAGEMENT</span><h1>Lab technicians</h1><p>Manage your team and their laboratory assignments.</p></div><div className="nltech-header-actions"><button className="nltech-button" disabled={loading || refreshing || busy} onClick={() => void loadTechnicians(true)}><RefreshCw size={17} className={refreshing ? "nltech-spin" : ""} />Refresh</button><button className="nltech-primary" disabled={busy} onClick={() => openForm()}><Plus size={18} /> Add technician</button></div></header>
    {success && <div className="nltech-success" role="status"><Check size={18} /><span>{success}</span><button className="nltech-icon" aria-label="Dismiss confirmation" onClick={() => setSuccess("")}><X size={17} /></button></div>}
    {error && <div className="nltech-error" role="alert"><span>{error}</span><button disabled={loading || refreshing || busy} onClick={() => void loadTechnicians(true)}>Retry</button></div>}
    <section className="nltech-panel" aria-label="Laboratory team" aria-busy={loading || refreshing}>
      <div className="nltech-toolbar"><div className="nltech-tabs" aria-label="Technician status">{(["ALL", "ACTIVE", "INACTIVE"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "ALL" ? "All staff" : value === "ACTIVE" ? "Active" : "Inactive"}<span>{value === "ALL" ? technicians.length : value === "ACTIVE" ? activeCount : technicians.length - activeCount}</span></button>)}</div><label className="nltech-search"><Search size={18} /><input aria-label="Search name, email, phone, department or room" placeholder="Search name, email or department" value={search} onChange={event => setSearch(event.target.value)} />{search && <button className="nltech-icon" aria-label="Clear search" onClick={() => setSearch("")}><X size={16} /></button>}</label></div>
      <div className="nltech-list-title"><h2>Your laboratory team</h2><span>{loading ? "Loading…" : `${filteredTechnicians.length} technicians`}</span></div>
      {loading ? <div className="nltech-empty" role="status"><Loader2 className="nltech-spin" size={28} /><h3>Loading technicians…</h3></div> : !filteredTechnicians.length ? <div className="nltech-empty"><h3>{error ? "Team unavailable" : search || filter !== "ALL" ? "No matching technicians" : "Build your laboratory team"}</h3><p>{search || filter !== "ALL" ? "Try another search or show all staff." : "Add a technician and assign a department and room."}</p>{!error && <button className="nltech-button" onClick={search || filter !== "ALL" ? () => { setSearch(""); setFilter("ALL"); } : () => openForm()}>{search || filter !== "ALL" ? "Clear filters" : "Add technician"}</button>}</div> : <div className="nltech-list">{filteredTechnicians.map(technician => <article className="nltech-person" key={technician._id}>
        <div className="nltech-name"><span className="nltech-avatar" aria-hidden="true">{technician.name?.charAt(0).toUpperCase() || "T"}</span><div><h3>{technician.name}</h3><p>{technician.email}</p>{technician.phone && <p>{technician.phone}</p>}</div></div>
        <div className="nltech-detail"><small>Department</small><span>{departmentName(technician)}</span></div><div className="nltech-detail"><small>Room</small><span>{roomName(technician)}</span></div>
        <span className={`nltech-badge ${technician.isActive ? "nltech-active" : ""}`}>{technician.isActive ? "Active" : "Inactive"}</span><div className="nltech-row-actions"><button className="nltech-button" disabled={busy || refreshing} onClick={() => openForm(technician)} aria-label={`Edit ${technician.name}`}><Edit3 size={15} />Edit</button><button className="nltech-button" disabled={busy || refreshing} onClick={() => void toggleTechnician(technician)} aria-label={`${technician.isActive ? "Deactivate" : "Activate"} ${technician.name}`}>{actionId === technician._id ? <Loader2 size={15} className="nltech-spin" /> : <Power size={15} />}{technician.isActive ? "Deactivate" : "Activate"}</button></div>
      </article>)}</div>}
    </section>

    {/* 8. Single form for creation and editing. The save button remains visible. */}
    {modalOpen && <TechnicianDialog title={editing ? "Edit technician" : "Add technician"} busy={saving} onClose={closeForm}>
      <form onSubmit={handleSubmit}><fieldset className="nltech-form" disabled={saving}><legend className="nltech-sr">Technician details</legend><div className="nltech-fields">
        <label className="nltech-wide">Full name<input required autoFocus autoComplete="name" value={form.name} onChange={event => change("name", event.target.value)} placeholder="Technician’s full name" /></label>
        <label className="nltech-wide">Email address<input required type="email" autoComplete="email" value={form.email} onChange={event => change("email", event.target.value)} placeholder="technician@example.com" /></label>
        <label>Phone <small>Optional</small><input type="tel" autoComplete="tel" value={form.phone} onChange={event => change("phone", event.target.value)} placeholder="Phone number" /></label>
        <label>{editing ? "New password" : "Password"}<input required={!editing} minLength={6} type="password" autoComplete="new-password" value={form.password} onChange={event => change("password", event.target.value)} placeholder={editing ? "Leave blank to keep current" : "At least 6 characters"} /><small>{editing ? "Leave blank to keep the current password." : "Use at least 6 characters."}</small></label>
      </div><div className="nltech-assignment"><h3>Laboratory assignment</h3><p>Select the department first, then choose one of its rooms.</p>
        {lookupError && <div className="nltech-error" role="alert"><span>{lookupError}</span><button type="button" disabled={lookupLoading} onClick={() => void loadAssignments()}>Retry</button></div>}
        <div className="nltech-fields"><label>Department<select required disabled={lookupLoading || !!lookupError} value={form.labDepartmentId} onChange={event => change("labDepartmentId", event.target.value)}><option value="">{lookupLoading ? "Loading…" : "Select department"}</option>{form.labDepartmentId && !departments.some(item => item._id === form.labDepartmentId) && <option value={form.labDepartmentId} disabled>Current department unavailable — choose another</option>}{departments.map(department => <option key={department._id} value={department._id}>{department.name}</option>)}</select></label>
        <label>Room<select required disabled={!form.labDepartmentId || lookupLoading || !!lookupError} value={form.labRoomId} onChange={event => change("labRoomId", event.target.value)}><option value="">{!form.labDepartmentId ? "Select department first" : "Select room"}</option>{form.labRoomId && !filteredRooms.some(item => item._id === form.labRoomId) && <option value={form.labRoomId} disabled>Current room unavailable — choose another</option>}{filteredRooms.map(room => <option key={room._id} value={room._id}>{room.name}{room.roomNumber ? ` · ${room.roomNumber}` : ""}</option>)}</select></label></div>
        {!lookupLoading && !lookupError && (!departments.length || (form.labDepartmentId && !filteredRooms.length)) && <p className="nltech-help">{!departments.length ? "No active departments are available." : "No active rooms are available for this department."}</p>}
      </div>{formError && <p className="nltech-error" role="alert">{formError}</p>}</fieldset>
      <footer className="nltech-form-actions"><button className="nltech-button" type="button" disabled={saving} onClick={closeForm}>Cancel</button><button className="nltech-primary" type="submit" disabled={saving || lookupLoading || !!lookupError}>{saving ? <Loader2 size={17} className="nltech-spin" /> : <Check size={17} />}{saving ? "Saving…" : editing ? "Save changes" : "Create technician"}</button></footer></form>
    </TechnicianDialog>}
  </main>;
}

// 9. Styles are scoped with nltech so other pages keep their own appearance.
const styles = `

.nltech{--ink:#173d39;--green:#176957;--muted:#6b7c73;--line:#dfe6dc;background:#f5f6f2;color:var(--ink);min-height:100%;padding:32px;font-family:inherit}.nltech *{box-sizing:border-box}.nltech h1,.nltech h2,.nltech h3,.nltech p{margin:0}.nltech button,.nltech input,.nltech select,.nltech textarea{font:inherit}.nltech button{cursor:pointer;transition:background .18s}.nltech button:disabled{opacity:.55;cursor:not-allowed}.nltech button:focus-visible,.nltech input:focus-visible,.nltech textarea:focus-visible{outline:3px solid #98bea9;outline-offset:3px}.nltech-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.nltech-eyebrow{font-size:10px;letter-spacing:.13em;font-weight:700;color:var(--green)}.nltech h1{font-size:30px;letter-spacing:-.9px;font-weight:750;margin:7px 0}.nltech-header p{font-size:14px;color:var(--muted);line-height:1.6}.nltech-header-actions,.nltech-row-actions{display:flex;gap:8px}.nltech-button,.nltech-primary{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:10px 14px;border:1px solid var(--line);border-radius:11px;background:white;color:var(--ink);font-size:12px!important;font-weight:650!important;white-space:nowrap}.nltech-button:hover:not(:disabled){background:#edf3e6}.nltech-primary{background:var(--green);border-color:var(--green);color:white}.nltech-primary:hover:not(:disabled){background:#125442}.nltech-panel{background:white;border:1px solid var(--line);border-radius:19px;overflow:hidden}.nltech-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid var(--line)}.nltech-tabs{display:flex;gap:4px;padding:4px;border-radius:12px;background:#f1f4ed}.nltech-tabs button{border:0;border-radius:9px;padding:10px 12px;background:transparent;color:var(--muted);font-size:12px;font-weight:650;min-height:40px;white-space:nowrap}.nltech-tabs button[aria-pressed=true]{background:var(--ink);color:white}.nltech-tabs span{font-size:10px;margin-left:7px;opacity:.75}.nltech-search{display:flex;align-items:center;gap:9px;background:#fafbf8;border:1px solid var(--line);border-radius:11px;padding:0 12px;width:310px;min-width:0;color:var(--muted)}.nltech-search input{width:100%;min-width:0;height:44px;border:0;background:transparent;color:var(--ink);font-size:12px}.nltech-icon{display:grid;place-items:center;width:38px;height:40px;border:0;border-radius:9px;background:transparent;color:inherit;flex-shrink:0}.nltech-icon:hover{background:#eaf0e1}.nltech-list-title{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 12px}.nltech-list-title h2{font-size:15px;font-weight:700}.nltech-list-title span{font-size:11px;color:var(--muted)}.nltech-list{padding:0 22px 12px}.nltech-person{display:grid;grid-template-columns:minmax(160px,1.5fr) 1fr 1fr auto auto;align-items:center;gap:16px;padding:20px 0;border-bottom:1px solid #edf0e9}.nltech-person:last-child{border:0}.nltech-name{display:flex;align-items:center;gap:11px;min-width:0}.nltech-name>div{min-width:0}.nltech-avatar{display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:12px;background:#edf3e6;color:var(--green)}.nltech h3{font-size:14px;font-weight:650;overflow-wrap:anywhere}.nltech-name p{font-size:11px;color:var(--muted);margin-top:5px;overflow-wrap:anywhere}.nltech-detail{display:flex;flex-direction:column;gap:6px;font-size:12px;min-width:0;overflow-wrap:anywhere}.nltech-detail small{font-size:10px;color:var(--muted)}.nltech-detail>span{display:flex;align-items:center;gap:5px}.nltech-detail svg{flex-shrink:0}.nltech-badge{justify-self:start;background:#f1f3ef;color:#7a8076;font-size:10px;font-weight:650;padding:6px 9px;border-radius:7px}.nltech-active{background:#edf3e6;color:#537443}.nltech-row-actions .nltech-button{padding:9px;font-size:11px!important}.nltech-description{grid-column:1/-1;color:var(--muted);font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.nltech-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:290px;padding:30px;text-align:center;color:var(--muted)}.nltech-empty h3{color:var(--ink);font-size:16px}.nltech-empty p{font-size:13px;line-height:1.6;max-width:360px}.nltech-success,.nltech-error{display:flex;align-items:center;gap:10px;border:1px solid #d1e0c7;background:#edf3e6;color:#4f6e40;border-radius:12px;padding:12px 15px;margin-bottom:18px;font-size:13px;line-height:1.5}.nltech-success>span,.nltech-error>span{flex:1}.nltech-error{border-color:#efcfc2;background:#fff1eb;color:#9c4930}.nltech-error button{border:0;background:transparent;color:inherit;text-decoration:underline;min-height:40px}.nltech-dialog{margin:auto;padding:0;border:1px solid var(--line);border-radius:20px;width:calc(100% - 28px);max-width:620px;max-height:90dvh;overflow:auto;background:white;color:var(--ink);box-shadow:0 24px 90px #12352b30}.nltech-dialog::backdrop{background:#102d2966;backdrop-filter:blur(4px)}.nltech-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid var(--line)}.nltech-dialog-head small{font-size:11px;color:var(--green)}.nltech-dialog-head h2{font-size:22px;margin-top:5px}.nltech-form{border:0;margin:0;padding:22px 24px;min-width:0}.nltech-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.nltech-fields label,.nltech-description-field{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:650;min-width:0}.nltech-fields small,.nltech-description-field small{font-size:10px;color:var(--muted);font-weight:400}.nltech-fields input,.nltech-description-field textarea{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;min-height:44px;padding:11px 12px;color:var(--ink);background:#fafbf8;font-size:13px}.nltech-wide{grid-column:1/-1}.nltech-assignment{border-top:1px solid var(--line);margin-top:22px;padding-top:20px}.nltech-assignment p{font-size:11px;color:var(--muted);line-height:1.6;margin:6px 0 14px}.nltech-description-field{margin-top:20px}.nltech-description-field textarea{resize:vertical}.nltech-form .nltech-error{margin:18px 0 0}.nltech-form-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid var(--line);background:white}.nltech-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.nltech-spin{animation:nltech-spin 1s linear infinite}@keyframes nltech-spin{to{transform:rotate(360deg)}}@media(max-width:1200px){.nltech-person{grid-template-columns:1.4fr 1fr 1fr}.nltech-badge{grid-column:2}.nltech-row-actions{justify-self:end}.nltech-name{align-self:start}.nltech-toolbar{flex-wrap:wrap}}@media(max-width:640px){.nltech{padding:20px 14px}.nltech-header{align-items:flex-start;flex-direction:column;gap:14px}.nltech h1{font-size:26px}.nltech-header p{font-size:12px}.nltech-eyebrow{font-size:9px}.nltech-header-actions{width:100%}.nltech-header-actions>*{flex:1}.nltech-toolbar{padding:14px;gap:12px;align-items:stretch}.nltech-tabs{width:100%}.nltech-tabs button{flex:1;padding:10px 8px;font-size:11px}.nltech-search{width:100%}.nltech-list-title{padding:18px 15px 12px}.nltech-list{padding:0 14px 14px;display:grid;gap:12px}.nltech-person{grid-template-columns:1fr 1fr;gap:14px;padding:15px;border:1px solid var(--line)!important;border-radius:13px}.nltech-name{grid-column:1/-1}.nltech-badge{grid-column:2;align-self:end}.nltech-row-actions{grid-column:1/-1;justify-self:stretch}.nltech-row-actions>*{flex:1}.nltech-description{font-size:11px}.nltech-dialog-head{padding:18px}.nltech-form{padding:18px}.nltech-form-actions{padding:14px 18px}.nltech-form-actions>*{flex:1}.nltech-assignment .nltech-fields{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.nltech *{animation:none!important;transition:none!important}}

.nltech-help{font-size:11px;color:#967039;margin-top:12px!important;line-height:1.6}.nltech-fields select{width:100%;min-width:0;min-height:44px;border:1px solid var(--line);border-radius:10px;padding:11px;background:#fafbf8;color:var(--ink);font-size:13px}.nltech-fields select:focus-visible{outline:3px solid #98bea9;outline-offset:3px}@media(max-width:640px){.nltech-name{grid-column:1/-1}.nltech-badge{grid-column:1}.nltech-row-actions{grid-column:1/-1}.nltech-fields{grid-template-columns:1fr}}
`;
