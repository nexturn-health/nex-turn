import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, FlaskConical, Loader2, Mail, Phone, Plus, RefreshCw, Search, Trash2, UserRound, X } from "lucide-react";
import { getReceptionists, createReceptionist, deleteReceptionist, type Receptionist } from "../../services/recieptionist.api";
import { getPendingLabPayments, confirmLabPayment, type LabOrder } from "../../services/lab/lab.api";
interface ReceptionistFormState { name: string; email: string; password: string; }
const EMPTY_FORM: ReceptionistFormState = { name: "", email: "", password: "" };

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const err = error as {
    response?: {
      data?: {
        message?: string;
      };
    };
  };

  return (
    err?.response?.data?.message ??
    fallback
  );
}

// ============================================================
// RECEPTIONIST DATA HOOK
// ============================================================

function useReceptionistsData() {
  const [
    receptionists,
    setReceptionists,
  ] = useState<Receptionist[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await getReceptionists();

      setReceptionists(data);
    } catch (err) {
      console.error(
        "Load receptionists error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Failed to load receptionists",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removeReceptionist =
    useCallback((id: string) => {
      setReceptionists(
        (current) =>
          current.filter(
            (receptionist) =>
              receptionist._id !== id,
          ),
      );
    }, []);

  return {
    receptionists,
    loading,
    error,
    setError,
    reload: load,
    removeReceptionist,
  };
}

// ============================================================
// LAB PAYMENT DATA HOOK
// ============================================================

function usePendingLabPayments() {
  const [
    labOrders,
    setLabOrders,
  ] = useState<LabOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const load = useCallback(
    async (showRefreshLoader = false) => {
      try {
        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await getPendingLabPayments();

        setLabOrders(
          response ?? [],
        );
      } catch (err) {
        console.error(
          "Load pending lab payments error:",
          err,
        );

        setError(
          getErrorMessage(
            err,
            "Failed to load pending lab payments",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const removeOrder =
    useCallback((orderId: string) => {
      setLabOrders(
        (current) =>
          current.filter(
            (order) =>
              order._id !== orderId,
          ),
      );
    }, []);

  return {
    labOrders,
    loading,
    refreshing,
    error,
    setError,
    reload: load,
    removeOrder,
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================


export default function Receptionists() {
  const navigate = useNavigate();
  const { receptionists, loading, error, setError, reload, removeReceptionist } = useReceptionistsData();
  const { labOrders, loading: labLoading, refreshing, error: labError, setError: setLabError, reload: reloadPayments, removeOrder } = usePendingLabPayments();
  const [view, setView] = useState<"staff" | "payments">("staff");
  const [search, setSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ReceptionistFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const savePending = useRef(false);
  const deletePending = useRef(new Set<string>());
  const paymentPending = useRef(false);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return receptionists.filter(person => `${person.name} ${person.email}`.toLowerCase().includes(query));
  }, [receptionists, search]);
  const filteredOrders = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();
    return labOrders.filter(order => `${getPatientName(order)} ${getPatientPhone(order) ?? ""} ${order._id}`.toLowerCase().includes(query));
  }, [labOrders, paymentSearch]);
  const pendingAmount = useMemo(() => labOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0), [labOrders]);

  function openCreate() { setForm(EMPTY_FORM); setFormError(""); setShowModal(true); }
  function closeModal() { if (savePending.current) return; setShowModal(false); setForm(EMPTY_FORM); setFormError(""); }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savePending.current) return;
    const payload = { name: form.name.trim(), email: form.email.trim(), password: form.password };
    if (!payload.name || !payload.email || !payload.password.trim()) { setFormError("Please fill in all required fields."); return; }
    if (payload.password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    savePending.current = true; setSubmitting(true); setFormError("");
    try {
      await createReceptionist(payload);
      setShowModal(false); setForm(EMPTY_FORM); setNotice("Receptionist added successfully.");
      await reload();
    } catch (err) { setFormError(getErrorMessage(err, "Could not add receptionist. Please try again.")); }
    finally { savePending.current = false; setSubmitting(false); }
  }

  async function handleDelete(person: Receptionist) {
    if (deletePending.current.has(person._id)) return;
    if (!window.confirm(`Delete ${person.name} from your reception staff?`)) return;
    deletePending.current.add(person._id); setDeletingIds(new Set(deletePending.current)); setError("");
    try {
      await deleteReceptionist(person._id); removeReceptionist(person._id);
      setNotice("Receptionist deleted successfully.");
    } catch (err) { setError(getErrorMessage(err, "Could not delete receptionist. Please try again.")); }
    finally { deletePending.current.delete(person._id); setDeletingIds(new Set(deletePending.current)); }
  }

  async function handleConfirmPayment(order: LabOrder) {
    if (paymentPending.current) return;
    if (!window.confirm(`Confirm payment of ${money(calculateOrderTotal(order))} for ${getPatientName(order)}?\n\nThis will move the order to Ready for Lab.`)) return;
    paymentPending.current = true; setPayingOrderId(order._id); setLabError("");
    try {
      await confirmLabPayment(order._id); removeOrder(order._id);
      setNotice("Payment confirmed. The order is now Ready for Lab.");
    } catch (err) { setLabError(getErrorMessage(err, "Could not confirm payment. Please try again.")); }
    finally { paymentPending.current = false; setPayingOrderId(null); }
  }

  return <div className="cm-page rx-page">
    <ManagementStyles /><ReceptionStyles />
    <div className="rx-shell">
      <ManagementHeader title="Reception" description="Your front desk team and pending lab payments, in one place." onBack={() => navigate("/admin/dashboard")} onAdd={openCreate} addLabel="Add receptionist" />
      <div className="rx-views" role="group" aria-label="Reception views">
        <button type="button" aria-pressed={view === "staff"} onClick={() => setView("staff")}><UserRound size={17} />Reception staff<span>{loading || error ? "—" : receptionists.length}</span></button>
        <button type="button" aria-pressed={view === "payments"} onClick={() => setView("payments")}><CreditCard size={17} />Lab payments<span>{labLoading || labError ? "—" : labOrders.length}</span></button>
      </div>
      {notice && <div className="rx-notice"><p role="status"><CheckCircle2 size={17} />{notice}</p><button type="button" className="cm-icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={17} /></button></div>}
      <main className="cm-content">
        {view === "staff" ? <section aria-label="Reception staff">
          <div className="rx-section-heading"><div><h2>Reception staff</h2><p>Manage the people who welcome your patients.</p></div><button type="button" className="cm-button cm-secondary" onClick={() => reload()} disabled={loading}><RefreshCw size={16} className={loading ? "cm-spin" : ""} />Refresh</button></div>
          {error && <ManagementError message={error} onRetry={() => reload()} />}
          <SearchToolbar value={search} onChange={setSearch} placeholder="Search by name or email" count={filteredStaff.length} total={receptionists.length} noun="receptionists" loading={loading} />
          {loading ? <ManagementLoading label="Loading reception staff…" /> : filteredStaff.length ? <div className="cm-grid">
            {filteredStaff.map(person => <article className="cm-card" key={person._id}>
              <div className="cm-card-top"><div className="cm-card-icon"><UserRound size={22} /></div><div className="cm-card-identity"><h2>{person.name}</h2><p className="cm-card-subtitle">Receptionist</p><span className="cm-badge" data-active={person.isActive}>{person.isActive ? "Active" : "Inactive"}</span></div></div>
              <div className="cm-card-details"><div className="cm-card-detail"><Mail size={16} /><span>{person.email}</span></div></div>
              <div className="cm-card-actions"><p>Front desk team</p><button type="button" className="cm-icon-button cm-danger" onClick={() => handleDelete(person)} disabled={deletingIds.has(person._id)} aria-label={`Delete ${person.name}`} title={`Delete ${person.name}`}>{deletingIds.has(person._id) ? <Loader2 size={18} className="cm-spin" /> : <Trash2 size={18} />}</button></div>
            </article>)}
          </div> : !error && <ManagementEmpty searching={!!search.trim()} noun="receptionists" icon={<UserRound size={26} />} onClear={() => setSearch("")} onAdd={openCreate} addLabel="Add receptionist" />}
        </section> : <section aria-label="Pending lab payments">
          <div className="rx-section-heading"><div><h2>Pending lab payments</h2><p>Confirm a received payment to release the order to the lab.</p></div><button type="button" className="cm-button cm-secondary" onClick={() => reloadPayments(true)} disabled={labLoading || refreshing || payingOrderId !== null}><RefreshCw size={16} className={refreshing ? "cm-spin" : ""} />{refreshing ? "Refreshing…" : "Refresh"}</button></div>
          {labError && <ManagementError message={labError} onRetry={() => reloadPayments(true)} />}
          <div className="rx-payment-summary"><div><span>Awaiting payment</span><strong>{labLoading || labError ? "—" : money(pendingAmount)}</strong></div><p>{labLoading || labError ? "Pending orders will appear below" : `${labOrders.length} pending ${labOrders.length === 1 ? "order" : "orders"}`}<br /><small>Review patient and test details before confirming.</small></p></div>
          <SearchToolbar value={paymentSearch} onChange={setPaymentSearch} placeholder="Search patient, phone or order ID" count={filteredOrders.length} total={labOrders.length} noun="orders" loading={labLoading || refreshing} />
          {labLoading ? <ManagementLoading label="Loading pending payments…" /> : filteredOrders.length ? <div className="cm-grid rx-orders">
            {filteredOrders.map(order => <PaymentCard key={order._id} order={order} busy={payingOrderId === order._id} disabled={payingOrderId !== null || refreshing} onConfirm={() => handleConfirmPayment(order)} />)}
          </div> : !labError && <div className="cm-empty"><div className="cm-empty-icon">{paymentSearch.trim() ? <Search size={26} /> : <CheckCircle2 size={26} />}</div><h2>{paymentSearch.trim() ? "No matching orders" : "No pending payments"}</h2><p>{paymentSearch.trim() ? "Try another patient name, phone number or order ID." : "Orders waiting for payment will appear here."}</p>{paymentSearch.trim() && <button type="button" className="cm-button cm-secondary" onClick={() => setPaymentSearch("")}>Clear search</button>}</div>}
        </section>}
      </main>
    </div>
    {showModal && <ManagementModal title="Add receptionist" description="Create an account for a member of your front desk team." busy={submitting} onClose={closeModal}>
      <form onSubmit={handleCreate} aria-busy={submitting}>
        <div className="cm-form-body">{formError && <ManagementError message={formError} />}
          <fieldset className="cm-form-section" disabled={submitting}><legend>ACCOUNT DETAILS</legend>
            <div className="cm-field"><label htmlFor="rx-name">Full name</label><input id="rx-name" required autoComplete="name" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} /></div>
            <div className="cm-field"><label htmlFor="rx-email">Email address</label><input id="rx-email" type="email" required autoComplete="email" placeholder="reception@hospital.com" value={form.email} onChange={e => setForm(current => ({ ...current, email: e.target.value }))} /></div>
            <div className="cm-field"><label htmlFor="rx-password">Password</label><input id="rx-password" type="password" required minLength={6} autoComplete="new-password" aria-describedby="rx-password-help" placeholder="Create a password" value={form.password} onChange={e => setForm(current => ({ ...current, password: e.target.value }))} /><p id="rx-password-help">Use at least 6 characters.</p></div>
          </fieldset>
        </div>
        <FormActions busy={submitting} onCancel={closeModal} label="Add receptionist" />
      </form>
    </ManagementModal>}
  </div>;
}

function money(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value); }

function PaymentCard({ order, busy, disabled, onConfirm }: { order: LabOrder; busy: boolean; disabled: boolean; onConfirm: () => void }) {
  return <article className="cm-card rx-payment-card">
    <div className="cm-card-top"><div className="cm-card-icon"><FlaskConical size={22} /></div><div className="cm-card-identity"><h2>{getPatientName(order)}</h2><p className="cm-card-subtitle">Order #{order._id.slice(-8).toUpperCase()}</p><span className="cm-badge rx-pending">Payment pending</span></div></div>
    <div className="cm-card-details">
      {getPatientPhone(order) && <div className="cm-card-detail"><Phone size={15} /><span>{getPatientPhone(order)}</span></div>}
      {getPatientEmail(order) && <div className="cm-card-detail"><Mail size={15} /><span>{getPatientEmail(order)}</span></div>}
      <div className="cm-card-detail"><UserRound size={15} /><span>Ordered by {getDoctorName(order)}</span></div>
    </div>
    <details className="rx-tests"><summary>View {order.items.length} {order.items.length === 1 ? "test" : "tests"}</summary><ul>{order.items.map((item, index) => <li key={`${order._id}-${index}`}><div>{item.testName}{item.testCode && <small>{item.testCode}</small>}</div><strong>{money(Number(item.price) || 0)}</strong></li>)}</ul></details>
    <div className="rx-total"><span>Total amount</span><strong>{money(calculateOrderTotal(order))}</strong></div>
    {order.orderedAt && <p className="cm-card-subtitle">{formatDate(order.orderedAt)}</p>}
    <button type="button" className="cm-button cm-primary rx-confirm" disabled={disabled} onClick={onConfirm}>{busy ? <Loader2 size={17} className="cm-spin" /> : <CheckCircle2 size={17} />}{busy ? "Confirming…" : "Confirm payment"}</button>
  </article>;
}

function ReceptionStyles() {
  return <style>{`
    .rx-page { min-height: 100dvh; padding: 28px; }
    .rx-shell { max-width: 1240px; margin: 0 auto; }
    .rx-views { display: flex; gap: 6px; padding: 6px; margin-top: 24px; background: #e9eee4; border-radius: 13px; width: fit-content; max-width: 100%; }
    .rx-views button { display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 46px; padding: 10px 18px; background: transparent; border: 0; border-radius: 9px; color: #667961; font-size: 13px; font-weight: 600; }
    .rx-views button[aria-pressed="true"] { background: #fff; color: #176957; box-shadow: 0 2px 5px #173d390a; }
    .rx-views button span { font-size: 11px; background: #edf3e6; padding: 2px 7px; border-radius: 6px; }
    .rx-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .rx-section-heading h2 { margin: 0; font-size: 19px; font-weight: 600; }
    .rx-section-heading p { margin: 7px 0 0; color: #74816c; font-size: 13px; line-height: 1.7; }
    .rx-section-heading > button { flex-shrink: 0; }
    .rx-notice { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 18px; padding: 6px 12px 6px 16px; border: 1px solid #cce2d8; border-radius: 12px; background: #edf7f1; }
    .rx-notice p { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 13px; line-height: 1.6; }
    .rx-notice svg { flex-shrink: 0; }
    .rx-payment-summary { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 22px 24px; margin-bottom: 18px; border-radius: 16px; background: #173d39; color: #fff; }
    .rx-payment-summary span { display: block; font-size: 12px; color: #c1d5cc; }
    .rx-payment-summary strong { display: block; margin-top: 7px; font-size: 28px; font-weight: 600; overflow-wrap: anywhere; }
    .rx-payment-summary p { margin: 0; font-size: 13px; line-height: 1.9; }
    .rx-payment-summary small { color: #c1d5cc; font-size: 12px; }
    .rx-orders { align-items: start; }
    .rx-pending { background: #faf1dd; color: #8a641e; }
    .rx-tests { margin-top: 20px; border-top: 1px solid #edf0e6; border-bottom: 1px solid #edf0e6; }
    .rx-tests summary { padding: 15px 0; cursor: pointer; font-size: 13px; font-weight: 600; }
    .rx-tests summary:focus-visible { outline: 3px solid #38bdb0; outline-offset: 3px; border-radius: 4px; }
    .rx-tests ul { padding: 0; margin: 0 0 12px; list-style: none; }
    .rx-tests li { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; font-size: 12px; line-height: 1.7; }
    .rx-tests li > div { overflow-wrap: anywhere; min-width: 0; }
    .rx-tests li strong { flex-shrink: 0; font-weight: 600; }
    .rx-tests small { display: block; color: #7b8971; }
    .rx-total { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 18px 0 8px; }
    .rx-total span { font-size: 12px; color: #74816c; }
    .rx-total strong { font-size: 20px; }
    .rx-confirm { width: 100%; margin-top: 20px; }
    @media (max-width: 639px) {
      .rx-page { padding: 14px; }
      .rx-views { width: 100%; margin-top: 18px; }
      .rx-views button { flex: 1; padding: 9px 6px; gap: 6px; font-size: 12px; }
      .rx-views button > svg { display: none; }
      .rx-section-heading { align-items: flex-start; gap: 12px; }
      .rx-section-heading h2 { font-size: 17px; }
      .rx-section-heading p { font-size: 12px; }
      .rx-section-heading > button { padding: 9px 12px; }
      .rx-payment-summary { align-items: flex-start; flex-direction: column; gap: 12px; padding: 20px; }
    }
  `}</style>;
}

function getPatientName(
  order: LabOrder,
): string {
  if (
    typeof order.patientId ===
    "object" &&
    order.patientId
  ) {
    return (
      order.patientId.name ||
      "Unknown Patient"
    );
  }

  return "Patient";
}

function getPatientPhone(
  order: LabOrder,
): string | undefined {
  if (
    typeof order.patientId ===
    "object" &&
    order.patientId
  ) {
    return order.patientId.phone;
  }

  return undefined;
}

function getPatientEmail(
  order: LabOrder,
): string | undefined {
  if (
    typeof order.patientId ===
    "object" &&
    order.patientId
  ) {
    return order.patientId.email;
  }

  return undefined;
}

function getDoctorName(
  order: LabOrder,
): string {
  if (
    typeof order.doctorId ===
    "object" &&
    order.doctorId
  ) {
    return (
      order.doctorId.name ||
      "Unknown Doctor"
    );
  }

  return "Doctor";
}

function calculateOrderTotal(
  order: LabOrder,
): number {
  return order.items.reduce(
    (total, item) =>
      total +
      (Number(item.price) ||
        0),
    0,
  );
}

function formatDate(
  date?: string,
): string {
  if (!date) {
    return "";
  }

  try {
    return new Date(
      date,
    ).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  } catch {
    return "";
  }
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
    <p>{searching ? "Try a different name or clear your search." : `Add your first ${noun === "receptionists" ? "receptionist" : noun} to get started.`}</p>
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
