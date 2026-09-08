import { AlertCircle, CheckCircle2, ChevronDown, FlaskConical, Loader2, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getLabOrders, confirmLabPayment, type LabOrder } from "../../services/lab/lab.api";

const statuses = ["ORDERED", "READY_FOR_LAB", "SAMPLE_COLLECTED", "PROCESSING", "REPORT_READY", "COMPLETED", "CANCELLED"];
const statusLabel = (status: string) => status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase());
const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
const total = (order: LabOrder) => (Array.isArray(order.items) ? order.items : []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
const patient = (order: LabOrder) => typeof order.patientId === "object" && order.patientId ? order.patientId : null;
const doctor = (order: LabOrder) => typeof order.doctorId === "object" && order.doctorId ? order.doctorId : null;
function dateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function message(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { message?: unknown } }; message?: unknown };
  const text = value?.response?.data?.message ?? value?.message;
  return typeof text === "string" ? text : fallback;
}
// Support both response shapes used by the supplied service.
function normalize(response: unknown): LabOrder[] {
  if (Array.isArray(response)) return response;
  const data = (response as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data : [];
}

export default function LabOrders() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"" | "PENDING" | "PAID">("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const requestRef = useRef(0);
  const paymentRef = useRef(false);
  const activeFilters = [search.trim(), date, paymentStatus, status].filter(Boolean).length;

  // Debounced server filters remain unchanged. Only the latest response is applied.
  const loadOrders = useCallback(async (refresh = false) => {
    const request = ++requestRef.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await getLabOrders({ search: search.trim() || undefined, date: date || undefined, paymentStatus: paymentStatus || undefined, status: status || undefined, sort });
      if (request === requestRef.current) setOrders(normalize(response));
    } catch (error) {
      if (request === requestRef.current) setError(message(error, "Unable to load lab orders. Please try again."));
    } finally {
      if (request === requestRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [search, date, paymentStatus, status, sort]);
  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => void loadOrders(), 300);
    return () => { window.clearTimeout(timer); requestRef.current++; };
  }, [loadOrders]);

  const summary = useMemo(() => ({
    tests: orders.reduce((sum, order) => sum + (order.items?.length || 0), 0),
    pending: orders.filter(order => order.paymentStatus === "PENDING"),
    paid: orders.filter(order => order.paymentStatus === "PAID"),
  }), [orders]);
  function clearFilters() { setSearch(""); setDate(""); setPaymentStatus(""); setStatus(""); setSort("newest"); }

  // Prevent rapid or concurrent confirmation clicks while the request is pending.
  async function handleConfirmPayment(orderId: string) {
    if (paymentRef.current) return;
    paymentRef.current = true; setProcessingOrderId(orderId);
    try {
      await confirmLabPayment(orderId);
      // Keep a successful payment from appearing unpaid if the refresh fails.
      setOrders(previous => previous.map(order => order._id === orderId ? { ...order, paymentStatus: "PAID" } : order));
      toast.success("Lab payment confirmed successfully.");
      await loadOrders(true);
    } catch (error) { toast.error(message(error, "Unable to confirm lab payment.")); }
    finally { paymentRef.current = false; setProcessingOrderId(null); }
  }

  return <main className="nsl">
    <style>{styles}</style>
    <header className="nsl-header"><div><span className="nsl-eyebrow">RECEPTION · LABORATORY</span><h1>Lab orders</h1><p>Track tests, review orders, and confirm payments.</p></div><button className="nsl-button" disabled={loading || refreshing || !!processingOrderId} onClick={() => void loadOrders(true)}><RefreshCw size={17} className={refreshing ? "nsl-spin" : ""} />{refreshing ? "Refreshing…" : "Refresh"}</button></header>
    <div className="nsl-stats" aria-label="Summary of current results">
      <div><small>Orders</small><strong>{loading ? "—" : orders.length}</strong><span>{loading ? "Loading…" : `${summary.tests} tests in current results`}</span></div>
      <div><small>Payment pending</small><strong>{loading ? "—" : money(summary.pending.reduce((sum, order) => sum + total(order), 0))}</strong><span>{summary.pending.length} orders</span></div>
      <div><small>Payment received</small><strong>{loading ? "—" : money(summary.paid.reduce((sum, order) => sum + total(order), 0))}</strong><span>{summary.paid.length} orders</span></div>
    </div>
    {/* Keep advanced filters out of the way until they are needed. */}
    <section className="nsl-controls" aria-label="Search and filter lab orders">
      <div className="nsl-toolbar"><label className="nsl-search"><Search size={18} /><input aria-label="Search patient, phone, email, doctor, test, code or order ID" placeholder="Search patient, doctor, test or order ID" value={search} disabled={!!processingOrderId} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="Clear search" disabled={!!processingOrderId} onClick={() => setSearch("")}><X size={17} /></button>}</label><button className="nsl-button" aria-expanded={showFilters} aria-controls="lab-order-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={17} /> Filters{activeFilters > 0 && <span>{activeFilters}</span>}</button>{(activeFilters > 0 || sort !== "newest") && <button className="nsl-clear" disabled={!!processingOrderId} onClick={clearFilters}>Clear</button>}</div>
      {showFilters && <fieldset id="lab-order-filters" className="nsl-filters" disabled={!!processingOrderId}><legend className="nsl-sr">Order filters</legend>
        <label>Order date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
        <label>Payment<select value={paymentStatus} onChange={event => setPaymentStatus(event.target.value as "" | "PENDING" | "PAID")}><option value="">All payments</option><option value="PENDING">Pending</option><option value="PAID">Paid</option></select></label>
        <label>Order status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
        <label>Sort by<select value={sort} onChange={event => setSort(event.target.value as "newest" | "oldest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      </fieldset>}
    </section>
    {error && <div className="nsl-error" role="alert"><AlertCircle size={20} /><span>{error} Previous results may be out of date.</span><button disabled={loading || refreshing || !!processingOrderId} onClick={() => void loadOrders(true)}>Retry</button></div>}
    <section aria-label="Lab order results" aria-busy={loading || refreshing}>
      <div className="nsl-results-heading"><h2>Order overview</h2><span>{loading ? "Updating results…" : `${orders.length} orders · ${activeFilters ? "Filtered results" : "All results"}`}</span></div>
      {loading ? <div className="nsl-empty" role="status"><Loader2 size={30} className="nsl-spin" /><h3>Loading lab orders…</h3></div> : !orders.length ? <div className="nsl-empty"><FlaskConical size={30} /><h3>{error ? "Orders unavailable" : "No lab orders found"}</h3><p>{error ? "Retry to load lab orders." : activeFilters ? "Try a different search or clear your filters." : "Lab orders will appear here when tests are requested."}</p>{activeFilters > 0 && <button className="nsl-button" onClick={clearFilters}>Clear filters</button>}</div> : <div className="nsl-orders">{orders.map(order => {
        const person = patient(order), clinician = doctor(order);
        const pending = order.paymentStatus === "PENDING";
        const processing = processingOrderId === order._id;
        return <article className="nsl-order" key={order._id}>
          <div className="nsl-order-head"><div className="nsl-person"><span className="nsl-avatar" aria-hidden="true">{person?.name?.charAt(0).toUpperCase() || "P"}</span><div><h3>{person?.name || "Unknown patient"}</h3><p>{person?.phone || "No phone number"}</p></div></div><span className={`nsl-status nsl-status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span></div>
          <div className="nsl-doctor"><span>Ordered by <strong>{clinician?.name || "Unknown doctor"}</strong></span><time>{dateLabel(order.orderedAt || order.createdAt)}</time></div>
          <div className="nsl-tests"><div className="nsl-test-title"><h4>Ordered tests</h4><span>{order.items?.length || 0} tests</span></div>{(Array.isArray(order.items) ? order.items : []).map((item, index) => <div className="nsl-test" key={`${order._id}-${index}`}><div><strong>{item.testName}</strong><div className="nsl-test-meta">{item.testCode && <small>{item.testCode}</small>}<span className={`nsl-status nsl-status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></div>{item.result && <p className="nsl-result">Result: {item.result}</p>}</div><span>{money(Number(item.price) || 0)}</span></div>)}<div className="nsl-total"><span>Total amount</span><strong>{money(total(order))}</strong></div></div>
          <details className="nsl-details"><summary>Contact & order details <ChevronDown size={16} /></summary><dl><div><dt>Patient email</dt><dd>{person?.email || "—"}</dd></div><div><dt>Doctor email</dt><dd>{clinician?.email || "—"}</dd></div><div><dt>Order ID</dt><dd>{order._id}</dd></div><div><dt>Consultation ID</dt><dd>{order.consultationId || "—"}</dd></div><div><dt>Queue ID</dt><dd>{order.queueId || "—"}</dd></div></dl></details>
          <footer className="nsl-order-footer"><div><span className={`nsl-payment ${pending ? "nsl-pending" : ""}`}>{pending ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}{statusLabel(order.paymentStatus)}</span>{pending && <p>Confirm only after receiving payment.</p>}</div>{pending && <button className="nsl-primary" disabled={!!processingOrderId || refreshing} onClick={() => void handleConfirmPayment(order._id)}>{processing ? <Loader2 size={17} className="nsl-spin" /> : <CheckCircle2 size={17} />}{processing ? "Confirming…" : "Confirm payment"}</button>}</footer>
        </article>;
      })}</div>}
    </section>
  </main>;
}

// Page-scoped styles: no separate UI or stylesheet is needed.
const styles = `
.nsl{--ink:#173d39;--green:#176957;--muted:#6b7d73;--line:#dfe6dc;color:var(--ink);background:#f5f6f2;min-height:100%;padding:32px;font-family:inherit}.nsl *{box-sizing:border-box}.nsl h1,.nsl h2,.nsl h3,.nsl h4,.nsl p{margin:0}.nsl button,.nsl input,.nsl select{font:inherit}.nsl button{cursor:pointer;transition:background .18s}.nsl button:disabled{opacity:.55;cursor:not-allowed}.nsl button:focus-visible,.nsl input:focus-visible,.nsl select:focus-visible,.nsl summary:focus-visible{outline:3px solid #99bea9;outline-offset:3px}.nsl-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}.nsl-eyebrow{font-size:10px;letter-spacing:.14em;font-weight:700;color:var(--green)}.nsl h1{font-size:30px;letter-spacing:-.9px;font-weight:750;margin:7px 0}.nsl-header p{font-size:14px;color:var(--muted);line-height:1.6}.nsl-button,.nsl-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 15px;border-radius:11px;border:1px solid var(--line);background:white;color:var(--ink);font-size:12px!important;font-weight:650!important;white-space:nowrap}.nsl-button:hover{background:#edf3e6}.nsl-primary{background:var(--green);border-color:var(--green);color:white}.nsl-primary:hover:not(:disabled){background:#125442}.nsl-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}.nsl-stats>div{display:flex;flex-direction:column;gap:8px;border:1px solid var(--line);background:#fff;border-radius:15px;padding:18px 20px}.nsl-stats>div:last-child{background:#eaf0e1;border-color:#dce5d2}.nsl-stats small{font-size:12px;color:var(--muted)}.nsl-stats strong{font-size:26px;letter-spacing:-.7px;overflow-wrap:anywhere}.nsl-stats span{font-size:11px;color:var(--muted)}.nsl-controls{background:white;border:1px solid var(--line);border-radius:15px;padding:16px}.nsl-toolbar{display:flex;gap:10px;align-items:center}.nsl-search{display:flex;align-items:center;gap:10px;min-width:0;flex:1;background:#fafbf8;border:1px solid var(--line);border-radius:11px;padding:0 12px;color:var(--muted)}.nsl-search input{min-width:0;width:100%;height:44px;border:0;background:transparent;font-size:13px;color:var(--ink)}.nsl-search button{border:0;background:transparent;color:inherit;min-height:40px;display:grid;place-items:center}.nsl-clear{border:0;background:transparent;color:var(--green);font-size:12px!important;min-height:44px;padding:0 8px}.nsl-filters{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;border:0;border-top:1px solid var(--line);padding:16px 0 0;margin:16px 0 0;min-width:0}.nsl-filters label{display:flex;flex-direction:column;gap:8px;font-size:11px;font-weight:650;min-width:0}.nsl-filters input,.nsl-filters select{width:100%;min-width:0;min-height:44px;border:1px solid var(--line);border-radius:10px;padding:10px;background:#fafbf8;color:var(--ink);font-size:12px}.nsl-results-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:24px 0 14px}.nsl-results-heading h2{font-size:16px;font-weight:700}.nsl-results-heading span{font-size:11px;color:var(--muted)}.nsl-orders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}.nsl-order{border:1px solid var(--line);border-radius:18px;background:white;overflow:hidden}.nsl-order-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 20px 14px}.nsl-person{display:flex;gap:11px;align-items:center;min-width:0}.nsl-person>div{min-width:0}.nsl-avatar{display:grid;place-items:center;width:40px;height:40px;flex-shrink:0;border-radius:12px;background:#edf3e6;color:var(--green);font-weight:700}.nsl h3{font-size:15px;font-weight:700;overflow-wrap:anywhere}.nsl-person p{font-size:11px;color:var(--muted);margin-top:5px}.nsl-status{display:inline-block;font-size:10px;font-weight:650;padding:5px 8px;border-radius:6px;background:#f1f3ed;color:#657565;line-height:1.4}.nsl-order-head>.nsl-status{flex-shrink:0;max-width:120px}.nsl-status-ready_for_lab,.nsl-status-sample_collected{background:#edf3f8;color:#50768a}.nsl-status-processing{background:#fbf3df;color:#886a31}.nsl-status-report_ready,.nsl-status-completed{background:#edf3e6;color:#527441}.nsl-status-cancelled{background:#fff0eb;color:#a55239}.nsl-doctor{display:flex;flex-wrap:wrap;gap:7px 16px;padding:0 20px 17px;color:var(--muted);font-size:11px}.nsl-doctor strong{font-weight:600;color:var(--ink)}.nsl-tests{margin:0 20px;border:1px solid var(--line);border-radius:12px;overflow:hidden}.nsl-test-title{display:flex;align-items:center;justify-content:space-between;padding:12px;background:#fafbf7;font-size:10px;color:var(--muted)}.nsl-test-title h4{font-size:12px;font-weight:650;color:var(--ink)}.nsl-test{display:flex;justify-content:space-between;gap:14px;padding:13px;border-top:1px solid #edf0e9;font-size:12px}.nsl-test>div{min-width:0;overflow-wrap:anywhere}.nsl-test strong{font-size:12px;font-weight:650}.nsl-test>span{white-space:nowrap;font-weight:600}.nsl-test-meta{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:7px}.nsl-test-meta small{font-size:10px;color:var(--muted)}.nsl-result{font-size:11px;color:var(--muted);line-height:1.6;margin-top:8px!important;white-space:pre-wrap}.nsl-total{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#edf3e6;padding:14px;font-size:12px}.nsl-total strong{font-size:18px}.nsl-details{margin:0 20px;padding:4px 0}.nsl-details summary{display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;font-size:11px;color:var(--muted);min-height:48px}.nsl-details summary::-webkit-details-marker{display:none}.nsl-details[open] summary svg{transform:rotate(180deg)}.nsl-details dl{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 16px}.nsl-details dt{font-size:10px;color:var(--muted)}.nsl-details dd{font-size:11px;margin:5px 0 0;overflow-wrap:anywhere}.nsl-order-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;border-top:1px solid var(--line);background:#fcfdf9}.nsl-payment{display:flex;align-items:center;gap:6px;color:var(--green);font-size:11px;font-weight:650}.nsl-pending{color:#977333}.nsl-order-footer p{font-size:10px;line-height:1.5;color:var(--muted);margin-top:5px}.nsl-error{display:flex;align-items:center;gap:10px;border:1px solid #edd0c3;background:#fff1eb;color:#9c4930;border-radius:12px;padding:12px;margin-top:15px;font-size:12px}.nsl-error span{flex:1}.nsl-error svg{flex-shrink:0}.nsl-error button{border:0;background:transparent;color:inherit;min-height:40px;text-decoration:underline}.nsl-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:270px;padding:30px;text-align:center;background:white;border:1px solid var(--line);border-radius:16px;color:var(--muted)}.nsl-empty h3{color:var(--ink)}.nsl-empty p{font-size:13px;line-height:1.6}.nsl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.nsl-spin{animation:nsl-spin 1s linear infinite}@keyframes nsl-spin{to{transform:rotate(360deg)}}@media(max-width:1100px){.nsl-orders{grid-template-columns:1fr}.nsl-filters{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.nsl{padding:20px 14px}.nsl h1{font-size:26px}.nsl-header{align-items:flex-start;margin-bottom:18px}.nsl-header p{font-size:12px}.nsl-eyebrow{font-size:8px}.nsl-header>.nsl-button{margin-top:18px;padding:10px}.nsl-stats{gap:8px;grid-template-columns:1fr 1fr}.nsl-stats>div{padding:13px}.nsl-stats>div:first-child{grid-column:1/-1;flex-direction:row;align-items:center;gap:10px}.nsl-stats>div:first-child span{margin-left:auto}.nsl-stats strong{font-size:21px}.nsl-stats small,.nsl-stats span{font-size:10px}.nsl-controls{padding:12px}.nsl-toolbar{flex-wrap:wrap;gap:8px}.nsl-search{flex-basis:100%}.nsl-search input{font-size:12px}.nsl-filters{gap:11px}.nsl-results-heading h2{font-size:14px}.nsl-results-heading span{font-size:10px}.nsl-order-head{padding:16px 14px 12px}.nsl-doctor{padding:0 14px 14px}.nsl-tests{margin:0 14px}.nsl-details{margin:0 14px}.nsl-order-footer{padding:14px;flex-wrap:wrap}.nsl-order-footer .nsl-primary{width:100%}.nsl-details dl{grid-template-columns:1fr}.nsl-orders{gap:14px}}@media(prefers-reduced-motion:reduce){.nsl *{animation:none!important;transition:none!important}}
`;
