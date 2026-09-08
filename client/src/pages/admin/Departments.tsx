import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, X, Building2, Loader2, Pencil, Trash2 } from "lucide-react";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, type Department } from "../../services/department.api";

function errorMessage(error: unknown, fallback: string) {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
}

export default function Departments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [tokenPrefix, setTokenPrefix] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const savePending = useRef(false);
  const deletePending = useRef(new Set<string>());

  const loadDepartments = async () => {
    try {
      setLoading(true); setError("");
      setDepartments(await getDepartments());
    } catch (err) { setError(errorMessage(err, "Failed to load departments.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadDepartments(); }, []);

  const openCreate = () => {
    setEditingDepartment(null); setDepartmentName(""); setTokenPrefix(""); setFormError(""); setShowModal(true);
  };
  const openEdit = (department: Department) => {
    setEditingDepartment(department); setDepartmentName(department.name); setTokenPrefix(department.tokenPrefix); setFormError(""); setShowModal(true);
  };
  const resetModal = () => {
    setShowModal(false); setEditingDepartment(null); setDepartmentName(""); setTokenPrefix(""); setFormError("");
  };
  const closeModal = () => { if (!savePending.current) resetModal(); };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savePending.current) return;
    if (!departmentName.trim() || !tokenPrefix.trim()) {
      setFormError("Enter a department name and token prefix."); return;
    }
    savePending.current = true; setSubmitting(true); setFormError("");
    try {
      const payload = { name: departmentName.trim(), tokenPrefix: tokenPrefix.trim().toUpperCase() };
      if (editingDepartment) {
        const updated = await updateDepartment(editingDepartment._id, payload);
        setDepartments(current => current.map(item => item._id === editingDepartment._id ? updated : item));
      } else {
        const created = await createDepartment(payload);
        setDepartments(current => [...current, created]);
      }
      resetModal();
    } catch (err) { setFormError(errorMessage(err, "Failed to save department. Please try again.")); }
    finally { savePending.current = false; setSubmitting(false); }
  };

  const handleDelete = async (department: Department) => {
    if (deletePending.current.has(department._id)) return;
    if (!window.confirm(`Delete ${department.name}? This will remove the department.`)) return;
    deletePending.current.add(department._id);
    setDeletingIds(current => [...current, department._id]); setError("");
    try {
      await deleteDepartment(department._id);
      setDepartments(current => current.filter(item => item._id !== department._id));
    } catch (err) { setError(errorMessage(err, "Failed to delete department.")); }
    finally {
      deletePending.current.delete(department._id);
      setDeletingIds(current => current.filter(id => id !== department._id));
    }
  };
  const query = search.trim().toLowerCase();
  const filtered = departments.filter(item => item.name.toLowerCase().includes(query) || (item.tokenPrefix ?? "").toLowerCase().includes(query));

  return <div className="cm-page">
    <ManagementStyles />
    <ManagementHeader title="Departments" description="Organize your services and patient token prefixes." onBack={() => navigate("/admin/dashboard")} onAdd={openCreate} addLabel="Add department" />
    <main className="cm-content">
      <SearchToolbar value={search} onChange={setSearch} placeholder="Search by department or token prefix" count={filtered.length} total={departments.length} noun="departments" loading={loading} />
      {error && <ManagementError message={error} onRetry={loadDepartments} />}
      {loading ? <ManagementLoading label="Loading departments…" /> : error && departments.length === 0 ? null : filtered.length === 0 ? (
        <ManagementEmpty searching={Boolean(query)} noun="departments" icon={<Building2 size={26} />} onClear={() => setSearch("")} onAdd={openCreate} addLabel="Add department" />
      ) : <div className="cm-grid">
        {filtered.map(department => {
          const deleting = deletingIds.includes(department._id);
          return <article className="cm-card" key={department._id}>
            <div className="cm-card-top"><div className="cm-card-icon"><Building2 size={23} strokeWidth={1.7} /></div>
              <div className="cm-card-identity"><h2>{department.name}</h2><span className="cm-badge" data-active={Boolean(department.isActive)}>{department.isActive ? "Active" : "Inactive"}</span></div>
            </div>
            <div className="cm-token"><span>Token prefix</span><strong>{department.tokenPrefix}</strong></div>
            <div className="cm-card-actions"><p>Department settings</p><div>
              <button type="button" className="cm-icon-button" onClick={() => openEdit(department)} disabled={deleting} aria-label={`Edit ${department.name}`} title="Edit department"><Pencil size={17} /></button>
              <button type="button" className="cm-icon-button cm-danger" onClick={() => handleDelete(department)} disabled={deleting} aria-label={`Delete ${department.name}`} title="Delete department">{deleting ? <Loader2 className="cm-spin" size={17} /> : <Trash2 size={17} />}</button>
            </div></div>
          </article>;
        })}
      </div>}
    </main>
    {showModal && <ManagementModal title={editingDepartment ? "Edit department" : "Add department"} description="Set the department name and the prefix used for its queue tokens." busy={submitting} onClose={closeModal}>
      <form onSubmit={handleSubmit} aria-busy={submitting}>
        <div className="cm-form-body">
          {formError && <ManagementError message={formError} />}
          <div className="cm-field"><label htmlFor="department-name">Department name</label><input id="department-name" required value={departmentName} onChange={e => setDepartmentName(e.target.value)} placeholder="e.g. Cardiology" disabled={submitting} /></div>
          <div className="cm-field"><label htmlFor="department-token">Token prefix</label><input id="department-token" required maxLength={3} value={tokenPrefix} onChange={e => setTokenPrefix(e.target.value.toUpperCase())} placeholder="e.g. C" disabled={submitting} aria-describedby="department-token-help" />
            <p id="department-token-help">Up to 3 characters. Example token: {tokenPrefix.trim().toUpperCase() || "C"}-001.</p>
          </div>
        </div>
        <FormActions busy={submitting} onCancel={closeModal} label={editingDepartment ? "Save changes" : "Create department"} />
      </form>
    </ManagementModal>}
  </div>;
}

function ManagementHeader({ title, description, onBack, onAdd, addLabel }: {
  title: string; description: string; onBack: () => void; onAdd: () => void; addLabel: string;
}) {
  return <header className="cm-header">
    <div className="cm-heading-group">
      <button type="button" className="cm-icon-button cm-back" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={19} /></button>
      <div><p className="cm-eyebrow">HOSPITAL WORKSPACE</p><h1>{title}</h1><p className="cm-description">{description}</p></div>
    </div>
    <button type="button" className="cm-button cm-primary" onClick={onAdd}><Plus size={18} />{addLabel}</button>
  </header>;
}

function SearchToolbar({ value, onChange, placeholder, count, total, noun, loading }: {
  value: string; onChange: (value: string) => void; placeholder: string; count: number; total: number; noun: string; loading: boolean;
}) {
  return <div className="cm-toolbar">
    <div className="cm-search"><Search size={18} aria-hidden="true" />
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
    <p className="cm-results" role="status">{loading ? "Loading…" : <><strong>{count}</strong> of {total} {noun}</>}</p>
  </div>;
}

function ManagementError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="cm-error" role="alert"><p>{message}</p>{onRetry && <button type="button" onClick={onRetry}>Try again</button>}</div>;
}

function ManagementLoading({ label }: { label: string }) {
  return <div className="cm-empty" role="status"><Loader2 className="cm-spin" size={28} /><p>{label}</p></div>;
}

function ManagementEmpty({ searching, noun, icon, onClear, onAdd, addLabel }: {
  searching: boolean; noun: string; icon: ReactNode; onClear: () => void; onAdd: () => void; addLabel: string;
}) {
  return <div className="cm-empty"><div className="cm-empty-icon">{icon}</div>
    <h2>{searching ? "No matching results" : `No ${noun} yet`}</h2>
    <p>{searching ? "Try a different name or clear your search." : `Add your first ${noun === "doctors" ? "doctor" : "department"} to get started.`}</p>
    <button type="button" className="cm-button cm-primary" onClick={searching ? onClear : onAdd}>{searching ? "Clear search" : addLabel}</button>
  </div>;
}

function ManagementModal({ title, description, busy, onClose, children }: {
  title: string; description: string; busy: boolean; onClose: () => void; children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ busy, onClose });
  useEffect(() => { latest.current = { busy, onClose }; }, [busy, onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("input, select, textarea") ?? panel)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        if (!latest.current.busy) latest.current.onClose();
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); return; }
      if (!panel.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return <div className="cm-modal-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="cm-modal" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}>
      <header className="cm-modal-header"><div><p className="cm-eyebrow">HOSPITAL DIRECTORY</p><h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p></div>
        <button type="button" className="cm-icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20} /></button>
      </header>{children}
    </div>
  </div>;
}

function FormActions({ busy, onCancel, label }: { busy: boolean; onCancel: () => void; label: string }) {
  return <footer className="cm-form-actions"><button type="button" className="cm-button cm-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
    <button type="submit" className="cm-button cm-primary" disabled={busy}>{busy && <Loader2 className="cm-spin" size={17} />}{busy ? "Saving…" : label}</button>
  </footer>;
}

function ManagementStyles() {
  return <style>{`
    .cm-page { color: #173d39; background: #f5f6f2; font-family: "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; width: 100%; min-width: 0; }
    .cm-page *, .cm-page *::before, .cm-page *::after { box-sizing: border-box; }
    .cm-page button, .cm-page input, .cm-page select { font: inherit; }
    .cm-page button { cursor: pointer; touch-action: manipulation; }
    .cm-page button:disabled { opacity: .55; cursor: not-allowed; }
    .cm-page button:focus-visible { outline: 3px solid #38bdb0; outline-offset: 3px; }
    .cm-header { display: flex; justify-content: space-between; align-items: center; gap: 22px; padding: 28px; border: 1px solid #dbe5d7; border-radius: 20px; background: linear-gradient(110deg, #eaf0e1, #eef4e9 58%, #d6e8dc); }
    .cm-heading-group { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .cm-eyebrow { color: #617b56; letter-spacing: 1.8px; font-size: 9px; font-weight: 700; margin: 0 0 8px; }
    .cm-header h1 { font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -.8px; margin: 0; color: #234633; }
    .cm-description { color: #65775d; font-size: 13px; line-height: 1.7; margin: 8px 0 0; }
    .cm-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 11px 18px; border: 1px solid transparent; border-radius: 10px; font-size: 13px !important; font-weight: 600 !important; line-height: 1.5; text-decoration: none; transition: background .15s, border-color .15s; }
    .cm-header > .cm-button { flex-shrink: 0; }
    .cm-primary { background: #176957; color: white; }
    .cm-primary:hover:not(:disabled) { background: #104e40; }
    .cm-secondary { background: white; border-color: #d9e2d1; color: #506847; }
    .cm-secondary:hover:not(:disabled) { background: #f2f6eb; border-color: #b8cdaa; }
    .cm-icon-button { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #72816a; }
    .cm-icon-button:hover:not(:disabled) { background: #edf4e5; color: #345b36; }
    .cm-back { background: #ffffff85; border-color: #d6e1cc; }
    .cm-content { padding: 24px 0; }
    .cm-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 16px 18px; border: 1px solid #e0e7d8; border-radius: 14px; background: #fff; margin-bottom: 22px; }
    .cm-search { position: relative; width: 100%; max-width: 440px; }
    .cm-search > svg { position: absolute; top: 50%; left: 14px; transform: translateY(-50%); color: #879879; pointer-events: none; }
    .cm-search input { width: 100%; min-height: 46px; padding: 11px 14px 11px 42px; border: 1px solid #dce5d3; border-radius: 10px; background: #fafbf7; font-size: 14px; color: #345330; }
    .cm-results { margin: 0; font-size: 12px; color: #75856b; white-space: nowrap; }
    .cm-results strong { color: #345b36; }
    .cm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr)); gap: 18px; }
    .cm-card { background: white; border: 1px solid #dfe6d7; border-radius: 16px; padding: 22px; min-width: 0; display: flex; flex-direction: column; }
    .cm-card-top { display: flex; align-items: flex-start; gap: 12px; }
    .cm-card-icon { width: 46px; height: 46px; flex-shrink: 0; display: grid; place-items: center; border-radius: 13px; background: #edf3e6; color: #5c7c4e; }
    .cm-card-identity { min-width: 0; flex: 1; }
    .cm-card h2 { font-size: 16px; font-weight: 600; color: #294a36; line-height: 1.5; margin: 0; overflow-wrap: anywhere; }
    .cm-card-subtitle { font-size: 12px; color: #7b8971; line-height: 1.6; margin: 4px 0 0; overflow-wrap: anywhere; }
    .cm-badge { display: inline-flex; align-items: center; gap: 5px; width: fit-content; border-radius: 20px; padding: 4px 8px; font-size: 10px; font-weight: 600; background: #edf6e8; color: #527444; margin-top: 9px; }
    .cm-badge::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .cm-badge[data-active="false"] { color: #976656; background: #fbefe9; }
    .cm-card-details { display: grid; gap: 12px; border-top: 1px solid #edf0e6; padding-top: 18px; margin-top: 20px; }
    .cm-card-detail { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; line-height: 1.7; color: #6b7d60; overflow-wrap: anywhere; }
    .cm-card-detail svg { flex-shrink: 0; margin-top: 2px; color: #8a9b7c; }
    .cm-token { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 11px; background: #f5f8ef; border: 1px solid #e6ecde; margin: 20px 0; gap: 12px; }
    .cm-token span { font-size: 11px; color: #7c8e6d; }
    .cm-token strong { font-size: 19px; font-weight: 600; color: #527244; letter-spacing: .6px; overflow-wrap: anywhere; }
    .cm-card-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid #edf0e6; padding-top: 16px; margin-top: auto; }
    .cm-card-details + .cm-card-actions { margin-top: 20px; }
    .cm-card-actions > p { margin: 0; color: #88967d; font-size: 11px; }
    .cm-card-actions > div { display: flex; gap: 6px; }
    .cm-danger { background: transparent; color: #a45644; }
    .cm-danger:hover:not(:disabled) { background: #fcf0eb; color: #a13f2b; }
    .cm-error { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 13px 16px; margin-bottom: 18px; border: 1px solid #efd4cc; border-radius: 11px; background: #fcf1ed; color: #a34b3d; font-size: 13px; line-height: 1.7; }
    .cm-error p { margin: 0; overflow-wrap: anywhere; }
    .cm-error button { background: none; border: none; color: inherit; font-weight: 600; text-decoration: underline; flex-shrink: 0; min-height: 32px; }
    .cm-empty { display: flex; flex-direction: column; align-items: center; gap: 15px; background: #fff; border: 1px solid #e0e7d8; border-radius: 16px; padding: 48px 24px; color: #728568; text-align: center; }
    .cm-empty-icon { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 16px; background: #edf3e6; color: #7a9667; }
    .cm-empty h2 { margin: 0; font-size: 18px; color: #3a5b36; font-weight: 600; }
    .cm-empty p { margin: 0; font-size: 13px; line-height: 1.7; }
    .cm-modal-backdrop { position: fixed; inset: 0; z-index: 200; background: #102c2870; backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .cm-modal { width: 100%; max-width: 540px; max-height: calc(100dvh - 40px); overflow-y: auto; overscroll-behavior: contain; border: 1px solid #dae5d3; background: #fff; border-radius: 20px; box-shadow: 0 20px 70px #102c2833; outline: none; }
    .cm-modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 24px; background: #eef4e7; border-bottom: 1px solid #dce6d4; }
    .cm-modal h2 { margin: 0; font-size: 21px; letter-spacing: -.5px; font-weight: 600; color: #294b32; }
    .cm-modal-header p:last-child { margin: 8px 0 0; font-size: 12px; line-height: 1.7; color: #76866a; }
    .cm-form-body { padding: 24px; display: grid; gap: 20px; }
    .cm-form-section { border: 0; padding: 0; margin: 0; min-width: 0; display: grid; gap: 16px; }
    .cm-form-section legend { color: #82936f; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 15px; }
    .cm-field { display: grid; gap: 8px; min-width: 0; }
    .cm-field label { color: #506b43; font-size: 12px; font-weight: 600; }
    .cm-field input, .cm-field select { width: 100%; min-height: 48px; padding: 12px 14px; border-radius: 10px; border: 1px solid #dce5d3; background: #fafbf7; color: #345330; font-size: 14px; }
    .cm-field input:focus, .cm-field select:focus, .cm-search input:focus { outline: none; background: #fff; border-color: #85a974; box-shadow: 0 0 0 3px #edf4e5; }
    .cm-field p { color: #839578; font-size: 11px; line-height: 1.7; margin: 0; }
    .cm-field input::placeholder { color: #9aa98e; }
    .cm-form-actions { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; background: #fafbf8; border-top: 1px solid #e2e9da; }
    @keyframes cm-spin { to { transform: rotate(360deg); } }
    .cm-spin { animation: cm-spin 1s linear infinite; }
    @media (max-width: 639px) { .cm-header { padding: 22px 18px; flex-direction: column; align-items: stretch; gap: 18px; } .cm-heading-group { gap: 12px; } .cm-header h1 { font-size: 25px; } .cm-toolbar { flex-direction: column; align-items: stretch; padding: 14px; gap: 10px; } .cm-search { max-width: none; } .cm-results { font-size: 11px; } .cm-card { padding: 20px; } .cm-button { min-height: 48px; } .cm-modal-backdrop { padding: 12px; } .cm-modal { max-height: calc(100dvh - 24px); border-radius: 16px; } .cm-modal-header, .cm-form-body { padding: 20px; } .cm-form-actions { padding: 14px 20px; } .cm-form-actions > button { flex: 1; padding-left: 10px; padding-right: 10px; } .cm-field input, .cm-field select, .cm-search input { font-size: 16px; } }
    @media (prefers-reduced-motion: reduce) { .cm-page *, .cm-page *::before, .cm-page *::after { animation: none !important; transition: none !important; } }
  `}</style>;
}
