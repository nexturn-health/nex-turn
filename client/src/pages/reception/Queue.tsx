import { AlertCircle, Clock, Loader2, RefreshCw, Search, Ticket, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getQueues, type QueueData } from "../../services/queue.api";

type StatusFilter = "ALL" | QueueData["status"];
const filters: StatusFilter[] = ["ALL", "WAITING", "CALLED", "SERVING", "COMPLETED", "SKIPPED", "CANCELLED"];
const summaryStatuses: QueueData["status"][] = ["WAITING", "CALLED", "SERVING", "COMPLETED"];
const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Queue() {
  const [queues, setQueues] = useState<QueueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestId = useRef(0);

  // Keep the existing endpoint. Ignore outdated responses after unmount/reload.
  const loadQueues = useCallback(async (isRefresh = false) => {
    const request = ++requestId.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await getQueues();
      if (request !== requestId.current) return;
      setQueues(data || []);
      setLastUpdated(new Date());
    } catch (error: unknown) {
      if (request !== requestId.current) return;
      const apiError = error as { response?: { data?: { message?: unknown } } };
      const message = apiError?.response?.data?.message;
      setError(typeof message === "string" ? message : "Unable to load today’s queue. Please try again.");
    } finally {
      if (request === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    void loadQueues();
    return () => { requestId.current++; };
  }, [loadQueues]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { ALL: queues.length };
    for (const queue of queues) result[queue.status] = (result[queue.status] || 0) + 1;
    return result;
  }, [queues]);

  // Search and status work together without changing the original queue order.
  const filteredQueues = useMemo(() => {
    const query = search.trim().toLowerCase();
    return queues.filter(queue =>
      (statusFilter === "ALL" || queue.status === statusFilter) &&
      [queue.tokenLabel, queue.patientId?.name, queue.patientId?.phone, queue.departmentId?.name]
        .some(value => String(value ?? "").toLowerCase().includes(query))
    );
  }, [queues, statusFilter, search]);

  function clearFilters() { setSearch(""); setStatusFilter("ALL"); }

  return <main className="nsq">
    <style>{styles}</style>
    <header className="nsq-header">
      <div><span className="nsq-eyebrow">RECEPTION · DAILY OVERVIEW</span><h1>Queue & tokens</h1><p>Follow today’s visits, from arrival to completion.</p></div>
      <button className="nsq-button" onClick={() => void loadQueues(true)} disabled={loading || refreshing}>
        <RefreshCw size={17} className={refreshing ? "nsq-spin" : ""} />{refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </header>

    {/* Tap a summary to filter the list. Tap it again to show everyone. */}
    <div className="nsq-summary" aria-label="Queue summary">
      {summaryStatuses.map(status => <button key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(statusFilter === status ? "ALL" : status)}>
        <span><i className={`nsq-dot nsq-dot-${status.toLowerCase()}`} />{label(status)}</span><strong>{loading ? "—" : counts[status] || 0}</strong>
      </button>)}
    </div>

    {error && <div className="nsq-error" role="alert"><AlertCircle size={20} /><div><strong>{error}</strong>{lastUpdated && <p>The previous queue is shown below. Refresh to try again.</p>}</div><button onClick={() => void loadQueues(true)} disabled={loading || refreshing}>Retry</button></div>}

    <section className="nsq-panel" aria-label="Today’s queue" aria-busy={loading || refreshing}>
      <div className="nsq-toolbar">
        <div><h2>Today’s queue <span>{loading ? "—" : queues.length}</span></h2><p>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Patient tokens and visit status"}</p></div>
        <label className="nsq-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search token, patient or department" aria-label="Search token, patient, phone or department" />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={17} /></button>}</label>
      </div>
      <div className="nsq-filters" aria-label="Filter by queue status">
        {filters.map(status => <button key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>{label(status)}<span>{counts[status] || 0}</span></button>)}
      </div>

      {loading ? <div className="nsq-empty" role="status"><Loader2 size={30} className="nsq-spin" /><h3>Loading today’s queue…</h3><p>Your patient tokens will appear here.</p></div> : !lastUpdated && error ? <div className="nsq-empty"><AlertCircle size={30} /><h3>Queue unavailable</h3><p>Use Retry above to load your patients.</p></div> : filteredQueues.length === 0 ? <div className="nsq-empty"><Clock size={30} /><h3>{search || statusFilter !== "ALL" ? "No matching patients" : "No tokens yet today"}</h3><p>{search || statusFilter !== "ALL" ? "Try a different search or show all statuses." : "Patients will appear here after a visit token is generated."}</p>{(search || statusFilter !== "ALL") && <button className="nsq-button" onClick={clearFilters}>Clear filters</button>}</div> : <>
        {/* The same table becomes readable cards on mobile; no horizontal scroll. */}
        <table className="nsq-table" aria-label="Patient queue">
          <thead><tr><th scope="col">Token</th><th scope="col">Patient</th><th scope="col">Department</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Created</th></tr></thead>
          <tbody>{filteredQueues.map(queue => <tr key={queue._id}>
            <td className="nsq-token-cell"><span className="nsq-token"><Ticket size={17} aria-hidden="true" />{queue.tokenLabel || "—"}</span></td>
            <td className="nsq-patient"><strong>{queue.patientId?.name || "Patient unavailable"}</strong><small>{queue.patientId?.phone || "No phone number"}</small></td>
            <td className="nsq-department"><span className="nsq-mobile-label">Department</span>{queue.departmentId?.name || "—"}</td>
            <td className="nsq-priority-cell"><span className="nsq-mobile-label">Priority</span><span className={`nsq-priority ${queue.priority === "EMERGENCY" ? "nsq-emergency" : ""}`}>{queue.priority === "EMERGENCY" && <AlertCircle size={13} />}{queue.priority === "EMERGENCY" ? "Emergency" : "Normal"}</span></td>
            <td className="nsq-status-cell"><span className={`nsq-status nsq-status-${queue.status.toLowerCase()}`}>{label(queue.status)}</span></td>
            <td className="nsq-time"><span className="nsq-mobile-label">Created</span>{formatTime(queue.createdAt)}</td>
          </tr>)}</tbody>
        </table>
        <footer className="nsq-footer">Showing {filteredQueues.length} of {queues.length} tokens</footer>
      </>}
    </section>
  </main>;
}

// Scoped styles keep this file independent from shared UI components.
const styles = `
.nsq{--ink:#173d39;--green:#176957;--muted:#6a7c74;--line:#dfe6dc;background:#f5f6f2;color:var(--ink);padding:32px;min-height:100%;font-family:inherit}.nsq *{box-sizing:border-box}.nsq h1,.nsq h2,.nsq h3,.nsq p{margin:0}.nsq button,.nsq input{font:inherit}.nsq button{cursor:pointer;transition:background .18s,border-color .18s}.nsq button:disabled{opacity:.55;cursor:not-allowed}.nsq button:focus-visible,.nsq input:focus-visible{outline:3px solid #91bda9;outline-offset:3px}.nsq-header{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:24px}.nsq-eyebrow{font-size:10px;letter-spacing:.14em;font-weight:700;color:var(--green)}.nsq h1{font-size:30px;letter-spacing:-.9px;font-weight:750;margin:7px 0}.nsq-header p{font-size:14px;color:var(--muted);line-height:1.6}.nsq-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 16px;border:1px solid var(--line);border-radius:12px;background:white;color:var(--ink);font-size:13px!important;font-weight:650!important;white-space:nowrap}.nsq-button:hover:not(:disabled){background:#eaf0e1;border-color:#b8cbbd}.nsq-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}.nsq-summary button{text-align:left;border:1px solid var(--line);background:white;border-radius:16px;padding:18px 20px;color:var(--ink)}.nsq-summary button:hover{background:#edf3e6}.nsq-summary button[aria-pressed=true]{background:#eaf0e1;border-color:#80a28d;box-shadow:inset 0 0 0 1px #80a28d}.nsq-summary button>span{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}.nsq-summary strong{display:block;font-size:30px;line-height:1.2;margin-top:10px;letter-spacing:-1px;font-variant-numeric:tabular-nums}.nsq-dot{display:block;height:7px;width:7px;border-radius:50%;background:#8b9d6f}.nsq-dot-waiting{background:#be9646}.nsq-dot-called{background:#6a96b0}.nsq-dot-serving{background:#176957}.nsq-dot-completed{background:#8caa72}.nsq-panel{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden}.nsq-toolbar{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px}.nsq-toolbar h2{font-size:16px;font-weight:700}.nsq-toolbar h2 span{display:inline-block;margin-left:6px;border-radius:6px;background:#edf3e6;padding:3px 7px;font-size:11px;vertical-align:middle}.nsq-toolbar p{font-size:11px;color:var(--muted);margin-top:5px}.nsq-search{display:flex;align-items:center;gap:10px;width:345px;max-width:100%;padding:0 12px;border:1px solid var(--line);border-radius:11px;background:#f8faf6;color:var(--muted)}.nsq-search input{min-width:0;width:100%;height:44px;border:0;background:transparent;color:var(--ink);font-size:12px}.nsq-search button{display:grid;place-items:center;border:0;background:transparent;color:var(--muted);min-width:30px;min-height:40px}.nsq-filters{display:flex;flex-wrap:wrap;gap:7px;padding:0 22px 20px;border-bottom:1px solid var(--line)}.nsq-filters button{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:9px;background:white;color:var(--muted);padding:9px 12px;min-height:40px;font-size:12px;font-weight:600}.nsq-filters button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:white}.nsq-filters button:hover:not([aria-pressed=true]){background:#f1f5ec}.nsq-filters span{font-size:10px;opacity:.75}.nsq-table{border-collapse:collapse;width:100%;text-align:left;table-layout:fixed}.nsq-table th{padding:13px 18px;font-size:10px;font-weight:650;color:var(--muted);background:#f8faf6;text-transform:uppercase;letter-spacing:.07em}.nsq-table th:nth-child(2){width:23%}.nsq-table th:nth-child(3){width:21%}.nsq-table th:last-child{width:12%}.nsq-table td{padding:19px 18px;border-top:1px solid #edf0e9;font-size:13px;overflow-wrap:anywhere}.nsq-table tbody tr:hover{background:#fcfdf9}.nsq-token{display:inline-flex;align-items:center;gap:7px;color:var(--green);font-weight:750;font-size:16px;letter-spacing:-.3px}.nsq-token svg{flex-shrink:0}.nsq-patient strong{display:block;font-size:13px;font-weight:650}.nsq-patient small{display:block;margin-top:5px;color:var(--muted);font-size:11px}.nsq-status,.nsq-priority{display:inline-flex;align-items:center;gap:5px;padding:6px 9px;font-size:10px;font-weight:650;border-radius:7px;background:#f0f3ee;color:#67776b}.nsq-emergency,.nsq-status-cancelled{background:#fff0ed;color:#a14e3b}.nsq-status-waiting{background:#fbf3df;color:#8b6826}.nsq-status-called{background:#edf3f8;color:#456f8a}.nsq-status-serving{background:#176957;color:white}.nsq-status-completed{background:#edf3e6;color:#527141}.nsq-status-skipped{background:#fbefe3;color:#946134}.nsq-time{color:var(--muted);font-variant-numeric:tabular-nums}.nsq-mobile-label{display:none}.nsq-footer{padding:15px 22px;border-top:1px solid var(--line);font-size:11px;color:var(--muted)}.nsq-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:280px;padding:40px 20px;text-align:center;color:var(--muted)}.nsq-empty h3{font-size:16px;color:var(--ink);font-weight:650}.nsq-empty p{max-width:330px;font-size:13px;line-height:1.6}.nsq-error{display:flex;align-items:center;gap:12px;border:1px solid #edd3c8;background:#fff3ec;color:#98432f;border-radius:13px;padding:14px 16px;margin-bottom:18px;font-size:13px}.nsq-error>svg{flex-shrink:0}.nsq-error>div{flex:1}.nsq-error strong{font-weight:600}.nsq-error p{font-size:12px;margin-top:4px}.nsq-error button{border:0;background:transparent;text-decoration:underline;min-height:40px;color:inherit;font-weight:650}.nsq-spin{animation:nsq-spin 1s linear infinite}@keyframes nsq-spin{to{transform:rotate(360deg)}}
@media(max-width:1050px){.nsq{padding:24px 18px}.nsq-table th,.nsq-table td{padding-left:11px;padding-right:11px}.nsq-token{font-size:14px}.nsq-token svg{display:none}}
@media(max-width:760px){.nsq{padding:20px 14px}.nsq-header{align-items:flex-start;margin-bottom:20px;gap:10px}.nsq h1{font-size:26px}.nsq-eyebrow{font-size:8px;letter-spacing:.09em}.nsq-header p{font-size:12px;max-width:240px}.nsq-header .nsq-button{padding:10px;margin-top:18px;font-size:12px!important}.nsq-summary{grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:16px}.nsq-summary button{padding:14px;border-radius:13px;display:flex;align-items:center;justify-content:space-between;gap:8px}.nsq-summary strong{font-size:25px;margin:0}.nsq-summary button>span{font-size:11px}.nsq-panel{border-radius:16px}.nsq-toolbar{padding:16px;flex-direction:column;align-items:stretch;gap:14px}.nsq-toolbar>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.nsq-toolbar h2{font-size:14px}.nsq-toolbar p{margin:0;font-size:10px}.nsq-search{width:100%}.nsq-filters{padding:0 16px 16px;gap:6px}.nsq-filters button{padding:8px 10px;font-size:11px}.nsq-table{display:block}.nsq-table thead{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.nsq-table tbody{display:grid;gap:12px;padding:14px}.nsq-table tr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border:1px solid var(--line);border-radius:13px;padding:14px;gap:14px;align-items:start}.nsq-table td{display:block;border:0;padding:0;font-size:12px}.nsq-token-cell{grid-column:1;grid-row:1}.nsq-token{font-size:19px}.nsq-token svg{display:block}.nsq-status-cell{grid-column:2;grid-row:1;justify-self:end;align-self:center}.nsq-patient{grid-column:1/-1;grid-row:2;border-bottom:1px solid #edf0e9!important;padding-bottom:13px!important}.nsq-patient strong{font-size:14px}.nsq-department{grid-column:1;grid-row:3}.nsq-priority-cell{grid-column:2;grid-row:3}.nsq-time{grid-column:1/-1;grid-row:4;display:flex!important;align-items:center;gap:8px}.nsq-mobile-label{display:block;font-size:10px;color:var(--muted);margin-bottom:6px}.nsq-time .nsq-mobile-label{margin:0}.nsq-footer{padding:13px 16px}.nsq-status,.nsq-priority{font-size:10px}.nsq-empty{min-height:250px}}
@media(prefers-reduced-motion:reduce){.nsq *{animation:none!important;transition:none!important}}
`;
