import { Check, Clock3, Edit3, FlaskConical, Loader2, Plus, Power, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createLabTest, deactivateLabTest, getLabTests, updateLabTest, type LabTest } from "../../services/lab/lab.api";

type Filter = "ALL" | "ACTIVE" | "INACTIVE";
interface TestForm {
  name: string; code: string; category: string; description: string; price: string;
  sampleType: string; turnaroundTimeMinutes: string; labDepartmentId: string; labRoomId: string;
}
const emptyForm = (): TestForm => ({ name: "", code: "", category: "", description: "", price: "", sampleType: "", turnaroundTimeMinutes: "", labDepartmentId: "", labRoomId: "" });
// A routing reference may be a populated object, an ID, or null.
function referenceId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value && typeof value._id === "string") return value._id;
  return "";
}
function errorText(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { message?: unknown } }; message?: unknown };
  const text = value?.response?.data?.message ?? value?.message;
  return typeof text === "string" ? text : fallback;
}
const priceLabel = (value?: number) => value == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
function timeLabel(minutes?: number) {
  if (minutes == null) return "Not specified";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
}

// Native dialog supports Escape, focus containment, and focus restoration.
function TestDialog({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={ref} className="nlt-dialog" aria-labelledby="lab-test-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="nlt-dialog-head"><div><small>NextSynq Health</small><h2 id="lab-test-dialog-title">{title}</h2></div><button type="button" className="nlt-icon" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button></header>{children}
  </dialog>;
}

export default function LabTests() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [form, setForm] = useState<TestForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const busyRef = useRef(false);
  const requestRef = useRef(0);

  const loadTests = useCallback(async (refresh = false) => {
    const request = ++requestRef.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await getLabTests();
      if (request === requestRef.current) setTests(response ?? []);
    } catch (error) {
      if (request === requestRef.current) setError(errorText(error, "Unable to load laboratory tests. Please try again."));
    } finally { if (request === requestRef.current) { setLoading(false); setRefreshing(false); } }
  }, []);
  useEffect(() => { void loadTests(); return () => { requestRef.current++; }; }, [loadTests]);

  const activeCount = tests.filter(test => test.isActive).length;
  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tests.filter(test => (filter === "ALL" || (filter === "ACTIVE" ? test.isActive : !test.isActive)) &&
      [test.name, test.code, test.category, test.sampleType].some(value => (value || "").toLowerCase().includes(query)));
  }, [tests, search, filter]);

  function openForm(test?: LabTest) {
    setEditingTest(test || null); setFormError("");
    setForm(test ? {
      name: test.name || "", code: test.code || "", category: test.category || "", description: test.description || "",
      price: test.price == null ? "" : String(test.price), sampleType: test.sampleType || "",
      turnaroundTimeMinutes: test.turnaroundTimeMinutes == null ? "" : String(test.turnaroundTimeMinutes),
      labDepartmentId: referenceId(test.labDepartmentId), labRoomId: referenceId(test.labRoomId),
    } : emptyForm());
    setShowModal(true);
  }
  function closeForm() { if (!busyRef.current) { setShowModal(false); setFormError(""); } }
  function change(field: keyof TestForm, value: string) { setForm(previous => ({ ...previous, [field]: value })); setFormError(""); }

  // Preserve the supplied payload and reject invalid numbers before saving.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    if (!form.name.trim()) { setFormError("Enter the test name."); return; }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) { setFormError("Enter a valid price of zero or more."); return; }
    if (form.turnaroundTimeMinutes.trim() && (!Number.isInteger(Number(form.turnaroundTimeMinutes)) || Number(form.turnaroundTimeMinutes) < 0)) { setFormError("Turnaround time must be a whole number of minutes, zero or more."); return; }
    if (!form.labDepartmentId.trim() || !form.labRoomId.trim()) { setFormError("Enter the laboratory department ID and room ID."); return; }
    busyRef.current = true; setSaving(true); setFormError(""); setSuccess("");
    const payload = {
      name: form.name.trim(), code: form.code.trim() || undefined, category: form.category.trim() || undefined,
      description: form.description.trim() || undefined, price: Number(form.price), sampleType: form.sampleType.trim() || undefined,
      turnaroundTimeMinutes: form.turnaroundTimeMinutes.trim() ? Number(form.turnaroundTimeMinutes) : undefined,
      labDepartmentId: form.labDepartmentId.trim(), labRoomId: form.labRoomId.trim(),
    };
    try {
      if (editingTest) await updateLabTest(editingTest._id, { ...payload, isActive: editingTest.isActive });
      else await createLabTest(payload);
      setSuccess(editingTest ? "Lab test updated successfully." : "Lab test created successfully.");
      setShowModal(false); setForm(emptyForm()); setEditingTest(null);
      await loadTests(true);
    } catch (error) { setFormError(errorText(error, "Unable to save the laboratory test.")); }
    finally { busyRef.current = false; setSaving(false); }
  }
  async function toggleStatus(test: LabTest) {
    if (busyRef.current) return;
    // Preserve the original confirmation before deactivating a test.
    if (test.isActive && !window.confirm(`Deactivate “${test.name}”?`)) return;
    busyRef.current = true; setChangingId(test._id); setError(""); setSuccess("");
    try {
      if (test.isActive) await deactivateLabTest(test._id);
      else await updateLabTest(test._id, { isActive: true });
      setTests(previous => previous.map(item => item._id === test._id ? { ...item, isActive: !test.isActive } : item));
      setSuccess(test.isActive ? "Lab test deactivated." : "Lab test activated.");
      await loadTests(true);
    } catch (error) { setError(errorText(error, "Unable to change test status.")); }
    finally { busyRef.current = false; setChangingId(null); }
  }
  const busy = saving || !!changingId;

  return <main className="nlt">
    <style>{styles}</style>
    <header className="nlt-header"><div><span className="nlt-eyebrow">LABORATORY · TEST CATALOGUE</span><h1>Lab tests</h1><p>Manage tests, pricing, and sample requirements.</p></div><div className="nlt-header-actions"><button className="nlt-button" onClick={() => void loadTests(true)} disabled={loading || refreshing || busy}><RefreshCw size={17} className={refreshing ? "nlt-spin" : ""} />Refresh</button><button className="nlt-primary" onClick={() => openForm()} disabled={busy}><Plus size={18} /> Add test</button></div></header>
    {success && <div className="nlt-success" role="status"><Check size={19} /><span>{success}</span><button className="nlt-icon" aria-label="Dismiss confirmation" onClick={() => setSuccess("")}><X size={17} /></button></div>}
    {error && <div className="nlt-error" role="alert"><span>{error}</span><button onClick={() => void loadTests(true)} disabled={loading || refreshing || busy}>Retry</button></div>}
    <section className="nlt-panel" aria-label="Laboratory test catalogue" aria-busy={loading || refreshing}>
      <div className="nlt-toolbar"><div className="nlt-tabs" aria-label="Test status filters">{(["ALL", "ACTIVE", "INACTIVE"] as Filter[]).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "ALL" ? "All tests" : value === "ACTIVE" ? "Active" : "Inactive"}<span>{value === "ALL" ? tests.length : value === "ACTIVE" ? activeCount : tests.length - activeCount}</span></button>)}</div><label className="nlt-search"><Search size={18} /><input aria-label="Search test name, code, category or sample" placeholder="Search name, code or sample" value={search} onChange={event => setSearch(event.target.value)} />{search && <button className="nlt-icon" aria-label="Clear search" onClick={() => setSearch("")}><X size={16} /></button>}</label></div>
      <div className="nlt-list-title"><h2>Test catalogue</h2><span>{loading ? "Loading…" : `${filteredTests.length} tests`}</span></div>
      {loading ? <div className="nlt-empty" role="status"><Loader2 size={29} className="nlt-spin" /><h3>Loading laboratory tests…</h3></div> : !filteredTests.length ? <div className="nlt-empty"><FlaskConical size={30} /><h3>{search || filter !== "ALL" ? "No matching tests" : "No laboratory tests yet"}</h3><p>{search || filter !== "ALL" ? "Try another search or show all tests." : "Add a test so doctors can request it during consultation."}</p><button className="nlt-button" onClick={search || filter !== "ALL" ? () => { setSearch(""); setFilter("ALL"); } : () => openForm()}>{search || filter !== "ALL" ? "Clear filters" : "Add test"}</button></div> : <div className="nlt-list">{filteredTests.map(test => <article className="nlt-test" key={test._id}>
        <div className="nlt-test-name"><span className="nlt-avatar"><FlaskConical size={20} /></span><div><h3>{test.name}</h3><p>{[test.code, test.category].filter(Boolean).join(" · ") || "Uncategorised"}</p></div></div>
        <div className="nlt-detail"><small>Price</small><strong>{priceLabel(test.price)}</strong></div><div className="nlt-detail"><small>Sample</small><span>{test.sampleType || "Not specified"}</span></div><div className="nlt-detail"><small>Turnaround</small><span><Clock3 size={13} />{timeLabel(test.turnaroundTimeMinutes)}</span></div>
        <span className={`nlt-badge ${test.isActive ? "nlt-active" : ""}`}>{test.isActive ? "Active" : "Inactive"}</span>
        <div className="nlt-row-actions"><button className="nlt-button" disabled={busy || refreshing} onClick={() => openForm(test)} aria-label={`Edit ${test.name}`}><Edit3 size={15} />Edit</button><button className="nlt-button" disabled={busy || refreshing} onClick={() => void toggleStatus(test)} aria-label={`${test.isActive ? "Deactivate" : "Activate"} ${test.name}`}>{changingId === test._id ? <Loader2 size={15} className="nlt-spin" /> : <Power size={15} />}{test.isActive ? "Deactivate" : "Activate"}</button></div>
        {test.description && <p className="nlt-description">{test.description}</p>}
      </article>)}</div>}
    </section>

    {showModal && <TestDialog title={editingTest ? "Edit lab test" : "Add lab test"} busy={saving} onClose={closeForm}>
      <form onSubmit={handleSubmit}><fieldset className="nlt-form" disabled={saving}>
        <legend className="nlt-sr">Test information</legend>
        <div className="nlt-fields">
          <label className="nlt-wide">Test name<input autoFocus required value={form.name} onChange={event => change("name", event.target.value)} placeholder="e.g. Complete blood count" /></label>
          <label>Test code <small>Optional</small><input value={form.code} onChange={event => change("code", event.target.value.toUpperCase())} placeholder="CBC" /></label>
          <label>Category <small>Optional</small><input value={form.category} onChange={event => change("category", event.target.value)} placeholder="Hematology" /></label>
          <label>Price (₹)<input type="number" min="0" step="0.01" value={form.price} onChange={event => change("price", event.target.value)} placeholder="0.00" /><small>Blank saves as ₹0.</small></label>
          <label>Sample type <small>Optional</small><input value={form.sampleType} onChange={event => change("sampleType", event.target.value)} placeholder="Blood" /></label>
          <label className="nlt-wide">Turnaround (minutes) <small>Optional</small><input type="number" min="0" step="1" value={form.turnaroundTimeMinutes} onChange={event => change("turnaroundTimeMinutes", event.target.value)} placeholder="120" /></label>
        </div>
        {/* Routing IDs are required by the existing API. No lookup endpoints were supplied. */}
        <div className="nlt-routing"><h3>Laboratory routing</h3><p>Enter the existing department and room IDs for this test.</p><div className="nlt-fields"><label>Lab department ID<input required value={form.labDepartmentId} onChange={event => change("labDepartmentId", event.target.value)} placeholder="Department ID" /></label><label>Lab room ID<input required value={form.labRoomId} onChange={event => change("labRoomId", event.target.value)} placeholder="Room ID" /></label></div></div>
        <label className="nlt-description-field">Description <small>Optional</small><textarea rows={3} value={form.description} onChange={event => change("description", event.target.value)} placeholder="Sample requirements or a short description" /></label>
        {formError && <p className="nlt-error" role="alert">{formError}</p>}
      </fieldset><footer className="nlt-form-actions"><button type="button" className="nlt-button" onClick={closeForm} disabled={saving}>Cancel</button><button className="nlt-primary" type="submit" disabled={saving}>{saving ? <Loader2 size={17} className="nlt-spin" /> : <Check size={17} />}{saving ? "Saving…" : editingTest ? "Save changes" : "Create test"}</button></footer></form>
    </TestDialog>}
  </main>;
}

// Scoped styles keep the replacement self-contained.
const styles = `
.nlt{--ink:#173d39;--green:#176957;--muted:#6b7c73;--line:#dfe6dc;background:#f5f6f2;color:var(--ink);min-height:100%;padding:32px;font-family:inherit}.nlt *{box-sizing:border-box}.nlt h1,.nlt h2,.nlt h3,.nlt p{margin:0}.nlt button,.nlt input,.nlt select,.nlt textarea{font:inherit}.nlt button{cursor:pointer;transition:background .18s}.nlt button:disabled{opacity:.55;cursor:not-allowed}.nlt button:focus-visible,.nlt input:focus-visible,.nlt textarea:focus-visible{outline:3px solid #98bea9;outline-offset:3px}.nlt-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.nlt-eyebrow{font-size:10px;letter-spacing:.13em;font-weight:700;color:var(--green)}.nlt h1{font-size:30px;letter-spacing:-.9px;font-weight:750;margin:7px 0}.nlt-header p{font-size:14px;color:var(--muted);line-height:1.6}.nlt-header-actions,.nlt-row-actions{display:flex;gap:8px}.nlt-button,.nlt-primary{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:10px 14px;border:1px solid var(--line);border-radius:11px;background:white;color:var(--ink);font-size:12px!important;font-weight:650!important;white-space:nowrap}.nlt-button:hover:not(:disabled){background:#edf3e6}.nlt-primary{background:var(--green);border-color:var(--green);color:white}.nlt-primary:hover:not(:disabled){background:#125442}.nlt-panel{background:white;border:1px solid var(--line);border-radius:19px;overflow:hidden}.nlt-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid var(--line)}.nlt-tabs{display:flex;gap:4px;padding:4px;border-radius:12px;background:#f1f4ed}.nlt-tabs button{border:0;border-radius:9px;padding:10px 12px;background:transparent;color:var(--muted);font-size:12px;font-weight:650;min-height:40px;white-space:nowrap}.nlt-tabs button[aria-pressed=true]{background:var(--ink);color:white}.nlt-tabs span{font-size:10px;margin-left:7px;opacity:.75}.nlt-search{display:flex;align-items:center;gap:9px;background:#fafbf8;border:1px solid var(--line);border-radius:11px;padding:0 12px;width:310px;min-width:0;color:var(--muted)}.nlt-search input{width:100%;min-width:0;height:44px;border:0;background:transparent;color:var(--ink);font-size:12px}.nlt-icon{display:grid;place-items:center;width:38px;height:40px;border:0;border-radius:9px;background:transparent;color:inherit;flex-shrink:0}.nlt-icon:hover{background:#eaf0e1}.nlt-list-title{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 12px}.nlt-list-title h2{font-size:15px;font-weight:700}.nlt-list-title span{font-size:11px;color:var(--muted)}.nlt-list{padding:0 22px 12px}.nlt-test{display:grid;grid-template-columns:minmax(150px,1.5fr) .6fr .8fr .9fr auto auto;align-items:center;gap:16px;padding:20px 0;border-bottom:1px solid #edf0e9}.nlt-test:last-child{border:0}.nlt-test-name{display:flex;align-items:center;gap:11px;min-width:0}.nlt-test-name>div{min-width:0}.nlt-avatar{display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:12px;background:#edf3e6;color:var(--green)}.nlt h3{font-size:14px;font-weight:650;overflow-wrap:anywhere}.nlt-test-name p{font-size:11px;color:var(--muted);margin-top:5px;overflow-wrap:anywhere}.nlt-detail{display:flex;flex-direction:column;gap:6px;font-size:12px;min-width:0;overflow-wrap:anywhere}.nlt-detail small{font-size:10px;color:var(--muted)}.nlt-detail>span{display:flex;align-items:center;gap:5px}.nlt-detail svg{flex-shrink:0}.nlt-badge{justify-self:start;background:#f1f3ef;color:#7a8076;font-size:10px;font-weight:650;padding:6px 9px;border-radius:7px}.nlt-active{background:#edf3e6;color:#537443}.nlt-row-actions .nlt-button{padding:9px;font-size:11px!important}.nlt-description{grid-column:1/-1;color:var(--muted);font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.nlt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:290px;padding:30px;text-align:center;color:var(--muted)}.nlt-empty h3{color:var(--ink);font-size:16px}.nlt-empty p{font-size:13px;line-height:1.6;max-width:360px}.nlt-success,.nlt-error{display:flex;align-items:center;gap:10px;border:1px solid #d1e0c7;background:#edf3e6;color:#4f6e40;border-radius:12px;padding:12px 15px;margin-bottom:18px;font-size:13px;line-height:1.5}.nlt-success>span,.nlt-error>span{flex:1}.nlt-error{border-color:#efcfc2;background:#fff1eb;color:#9c4930}.nlt-error button{border:0;background:transparent;color:inherit;text-decoration:underline;min-height:40px}.nlt-dialog{margin:auto;padding:0;border:1px solid var(--line);border-radius:20px;width:calc(100% - 28px);max-width:620px;max-height:90dvh;overflow:auto;background:white;color:var(--ink);box-shadow:0 24px 90px #12352b30}.nlt-dialog::backdrop{background:#102d2966;backdrop-filter:blur(4px)}.nlt-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid var(--line)}.nlt-dialog-head small{font-size:11px;color:var(--green)}.nlt-dialog-head h2{font-size:22px;margin-top:5px}.nlt-form{border:0;margin:0;padding:22px 24px;min-width:0}.nlt-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.nlt-fields label,.nlt-description-field{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:650;min-width:0}.nlt-fields small,.nlt-description-field small{font-size:10px;color:var(--muted);font-weight:400}.nlt-fields input,.nlt-description-field textarea{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;min-height:44px;padding:11px 12px;color:var(--ink);background:#fafbf8;font-size:13px}.nlt-wide{grid-column:1/-1}.nlt-routing{border-top:1px solid var(--line);margin-top:22px;padding-top:20px}.nlt-routing p{font-size:11px;color:var(--muted);line-height:1.6;margin:6px 0 14px}.nlt-description-field{margin-top:20px}.nlt-description-field textarea{resize:vertical}.nlt-form .nlt-error{margin:18px 0 0}.nlt-form-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid var(--line);background:white}.nlt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.nlt-spin{animation:nlt-spin 1s linear infinite}@keyframes nlt-spin{to{transform:rotate(360deg)}}@media(max-width:1200px){.nlt-test{grid-template-columns:1.4fr 1fr 1fr}.nlt-badge{grid-column:2}.nlt-row-actions{justify-self:end}.nlt-test-name{align-self:start}.nlt-toolbar{flex-wrap:wrap}}@media(max-width:640px){.nlt{padding:20px 14px}.nlt-header{align-items:flex-start;flex-direction:column;gap:14px}.nlt h1{font-size:26px}.nlt-header p{font-size:12px}.nlt-eyebrow{font-size:9px}.nlt-header-actions{width:100%}.nlt-header-actions>*{flex:1}.nlt-toolbar{padding:14px;gap:12px;align-items:stretch}.nlt-tabs{width:100%}.nlt-tabs button{flex:1;padding:10px 8px;font-size:11px}.nlt-search{width:100%}.nlt-list-title{padding:18px 15px 12px}.nlt-list{padding:0 14px 14px;display:grid;gap:12px}.nlt-test{grid-template-columns:1fr 1fr;gap:14px;padding:15px;border:1px solid var(--line)!important;border-radius:13px}.nlt-test-name{grid-column:1/-1}.nlt-badge{grid-column:2;align-self:end}.nlt-row-actions{grid-column:1/-1;justify-self:stretch}.nlt-row-actions>*{flex:1}.nlt-description{font-size:11px}.nlt-dialog-head{padding:18px}.nlt-form{padding:18px}.nlt-form-actions{padding:14px 18px}.nlt-form-actions>*{flex:1}.nlt-routing .nlt-fields{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.nlt *{animation:none!important;transition:none!important}}
`;
