import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, Clock3, Hospital, Loader2, RefreshCw, Stethoscope, Ticket, UserRound } from "lucide-react";
import { getPublicAppointmentStatus, type PublicAppointmentStatus } from "../../services/appointment/appointmentStatus.api";

// Display the hospital's calendar date without shifting it into another timezone.
function formatDate(value: string): string {
  if (!value) return "Not available";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function statusLabel(value: string) {
  return (value || "Unknown").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
}
function doctorName(value?: string) {
  const name = value?.trim();
  return !name ? "Not assigned" : /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}
function errorMessage(error: unknown) {
  const value = error as { response?: { data?: { message?: unknown } }; message?: unknown };
  const message = value?.response?.data?.message ?? value?.message;
  return typeof message === "string" && message.trim() ? message : "Unable to load appointment status.";
}

export default function AppointmentStatus() {
  const { appointmentCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const phone = searchParams.get("phone") || "";
  const [data, setData] = useState<PublicAppointmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  // Keep the existing API. A stale request cannot replace a newer appointment.
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setData(null);
    void (async () => {
      try {
        if (!appointmentCode || !phone) throw new Error("Appointment code or phone number is missing. Open the complete link provided by your hospital.");
        const result = await getPublicAppointmentStatus(appointmentCode, phone);
        if (active) setData(result);
      } catch (error) { if (active) setError(errorMessage(error)); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [appointmentCode, phone, retry]);

  const trackingUrl = data?.queue?.trackingToken ? `/track/${data.queue.trackingToken}` : "";
  const status = String(data?.status || "").toUpperCase();
  const cancelled = status === "CANCELLED" || status === "CANCELED";
  const completed = status === "COMPLETED";
  const location = [data?.hospital?.district, data?.hospital?.state].filter(Boolean).join(", ");

  return <main className="nas-page">
    <style>{styles}</style>
    <div className="nas-shell">
      {/* Small header keeps the appointment itself in focus. */}
      <header className="nas-header"><button type="button" className="nas-icon" onClick={() => navigate("/book-appointment")} aria-label="Book another appointment"><ArrowLeft size={19} /></button><span className="nas-brand"><Activity size={20} /><strong>NextSynq <span>Health</span></strong></span><button type="button" className="nas-icon" aria-label="Refresh appointment status" disabled={loading || !appointmentCode || !phone} onClick={() => setRetry(value => value + 1)}><RefreshCw size={17} className={loading ? "nas-spin" : ""} /></button></header>
      <div className="nas-main" aria-busy={loading}>
        {loading ? <section className="nas-state" role="status"><Loader2 className="nas-spin" size={30} /><h1>Getting your appointment…</h1><p>Your visit details will appear here.</p></section> : error || !data ? <section className="nas-state"><AlertTriangle size={30} /><h1>Unable to load appointment</h1><p role="alert">{error || "Appointment details are not available."}</p><button className="nas-primary" onClick={() => setRetry(value => value + 1)}>Try again</button><button className="nas-text" onClick={() => navigate("/book-appointment")}>Book an appointment</button></section> : <section className="nas-card" aria-label="Appointment details">
          {/* The code, actual status and next action are immediately visible. */}
          <div className="nas-ticket"><div className="nas-ticket-top"><h1>Appointment pass</h1><span className={`nas-status ${cancelled ? "nas-cancelled" : ""}`}>{statusLabel(data.status)}</span></div><p className="nas-code-label">APPOINTMENT CODE</p><p className="nas-code">{data.appointmentCode}</p><p className="nas-code-note">{cancelled ? "This appointment has been cancelled." : completed ? "Your appointment is complete." : "Show this code at hospital reception."}</p></div>
          <div className="nas-details">
            <div className="nas-hospital"><span className="nas-detail-icon"><Hospital size={20} /></span><div><h2>{data.hospital?.publicName || data.hospital?.name || "Hospital"}</h2><p>{location || "Location not available"}</p></div></div>
            <div className="nas-date-time"><div><CalendarDays size={16} /><span><small>Date</small><strong>{formatDate(data.date)}</strong></span></div><div><Clock3 size={16} /><span><small>Time</small><strong>{data.startTime || "Not available"}{data.endTime ? ` – ${data.endTime}` : ""}</strong></span></div></div>
            <div className="nas-info"><Stethoscope size={18} /><div><small>Doctor</small><strong>{doctorName(data.doctor?.name)}</strong></div></div>
            <div className="nas-info"><UserRound size={18} /><div><small>Patient</small><strong>{data.patient?.name || "Patient"}</strong></div><span className="nas-phone">{data.patient?.phone || phone}</span></div>
            <div className="nas-queue"><Ticket size={17} /><span>Queue token</span><strong>{data.queue?.tokenLabel || "After check-in"}</strong></div>
          </div>
          <footer className="nas-actions">{trackingUrl ? <button className="nas-primary" onClick={() => navigate(trackingUrl)}>Track live queue <ArrowRight size={17} /></button> : <div className="nas-checkin"><strong>{cancelled ? "Need another appointment?" : completed ? "Visit complete" : "Check in at reception"}</strong><p>{cancelled ? "Use the back button to book a new visit." : completed ? "Contact your hospital for any further assistance." : "Live tracking starts after reception marks your arrival, collects payment and checks you in."}</p></div>}</footer>
        </section>}
      </div>
      <footer className="nas-footer">Your visit. Simply connected.</footer>
    </div>
  </main>;
}

// Fits a standard portrait mobile viewport without page scrolling.
// On very short screens or with enlarged text, only the content area can scroll
// so appointment details remain accessible instead of being clipped.
const styles = `
.nas-page{--ink:#173d39;--green:#176957;--muted:#74816d;--line:#dfe6d9;height:100vh;height:100dvh;overflow:hidden;background:#f5f6f2;color:var(--ink);font-family:Arial,Helvetica,sans-serif;padding:0 16px}.nas-page *{box-sizing:border-box}.nas-page h1,.nas-page h2,.nas-page p{margin:0}.nas-page button{font:inherit;cursor:pointer}.nas-page button:disabled{opacity:.5;cursor:not-allowed}.nas-page button:focus-visible{outline:3px solid #8db69a;outline-offset:3px}.nas-shell{display:flex;flex-direction:column;height:100%;max-width:440px;margin:auto;min-height:0}.nas-header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;min-height:70px;padding:10px 0}.nas-brand{display:flex;align-items:center;gap:8px}.nas-brand strong{font-size:17px;letter-spacing:-.4px}.nas-brand strong>span{font-weight:400}.nas-icon{display:grid;place-items:center;width:40px;height:42px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink)}.nas-icon:hover{background:#edf3e6}.nas-main{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:4px 0}.nas-card{border:1px solid #d8e2d3;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 14px 45px #173d3909}.nas-ticket{background:var(--ink);color:white;padding:20px 22px;text-align:center}.nas-ticket-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:20px}.nas-ticket h1{font-size:13px;font-weight:500;color:#dce7d5}.nas-status{font-size:10px;font-weight:650;background:#ffffff17;border:1px solid #ffffff24;border-radius:20px;padding:5px 9px;max-width:60%;overflow-wrap:anywhere}.nas-cancelled{color:#ffddd0;background:#ffffff14}.nas-code-label{font-size:9px;letter-spacing:2px;color:#b9cdbf}.nas-code{font-size:clamp(23px,7vw,34px);font-weight:700;letter-spacing:.6px;line-height:1.2;padding:9px 0;overflow-wrap:anywhere}.nas-code-note{font-size:10px;color:#c8d8c7;line-height:1.5}.nas-details{padding:17px 20px 0}.nas-hospital{display:flex;align-items:center;gap:11px;margin-bottom:15px}.nas-hospital>div{min-width:0}.nas-detail-icon{display:grid;place-items:center;flex-shrink:0;height:38px;width:38px;border-radius:11px;background:#edf3e6;color:#628153}.nas-hospital h2{font-size:14px;font-weight:650;line-height:1.4;overflow-wrap:anywhere}.nas-hospital p{font-size:10px;line-height:1.5;color:var(--muted);margin-top:3px;overflow-wrap:anywhere}.nas-date-time{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;border-radius:12px;background:#edf3e6;margin-bottom:3px}.nas-date-time>div{display:flex;align-items:center;gap:8px;min-width:0}.nas-date-time svg{color:#6c8a5c;flex-shrink:0}.nas-date-time small,.nas-info small{display:block;font-size:9px;color:var(--muted);margin-bottom:4px}.nas-date-time strong{display:block;font-size:11px;font-weight:650;line-height:1.5}.nas-info{display:flex;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid #edf0e9;min-width:0}.nas-info>svg{color:#78956a;flex-shrink:0}.nas-info>div{flex:1;min-width:0}.nas-info strong{display:block;font-size:12px;font-weight:600;overflow-wrap:anywhere;line-height:1.5}.nas-phone{font-size:10px;color:var(--muted);overflow-wrap:anywhere;max-width:42%;text-align:right}.nas-queue{display:flex;align-items:center;gap:8px;padding:14px 0;color:#718565;font-size:11px}.nas-queue strong{margin-left:auto;color:var(--ink);font-size:11px;max-width:55%;overflow-wrap:anywhere;text-align:right}.nas-actions{padding:0 20px 18px}.nas-primary{display:flex;align-items:center;justify-content:center;gap:9px;min-height:46px;width:100%;padding:12px;border:0;border-radius:12px;background:var(--green);color:white;font-size:13px!important;font-weight:650!important}.nas-primary:hover{background:#125844}.nas-checkin{border-radius:11px;padding:12px;background:#f4f6ed;border:1px solid #e0e6d8}.nas-checkin strong{font-size:11px;font-weight:650}.nas-checkin p{font-size:10px;line-height:1.6;color:var(--muted);margin-top:4px}.nas-footer{flex-shrink:0;text-align:center;font-size:9px;color:#89977f;padding:11px 0 max(11px,env(safe-area-inset-bottom))}.nas-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:17px;padding:35px 24px;min-height:340px;background:white;border:1px solid var(--line);border-radius:20px;text-align:center}.nas-state h1{font-size:20px;line-height:1.4}.nas-state p{font-size:13px;line-height:1.7;color:var(--muted);overflow-wrap:anywhere}.nas-state>svg{color:var(--green)}.nas-text{border:0;background:transparent;color:var(--green);min-height:44px;font-size:12px!important}.nas-spin{animation:nas-spin 1s linear infinite}@keyframes nas-spin{to{transform:rotate(360deg)}}@media(min-width:700px){.nas-page{padding-top:20px;padding-bottom:20px}.nas-shell{max-width:470px}.nas-main{flex:0 1 auto}.nas-ticket{padding:24px}.nas-details{padding:20px 24px 0}.nas-info{padding:16px 0}.nas-actions{padding:0 24px 22px}}@media(max-height:700px) and (max-width:699px){.nas-header{min-height:58px;padding:7px 0}.nas-ticket{padding:15px 17px}.nas-ticket-top{margin-bottom:13px}.nas-details{padding:13px 16px 0}.nas-hospital{margin-bottom:11px}.nas-date-time{padding:10px}.nas-info{padding:10px 0}.nas-queue{padding:11px 0}.nas-actions{padding:0 16px 14px}.nas-footer{padding-top:8px;padding-bottom:max(8px,env(safe-area-inset-bottom))}}@media(max-height:570px){.nas-ticket-top{margin-bottom:8px}.nas-ticket{padding-top:12px;padding-bottom:12px}.nas-code{font-size:25px;padding:5px 0}.nas-hospital{margin-bottom:8px}.nas-info{padding:8px 0}.nas-header{min-height:52px}.nas-footer{padding-top:6px;padding-bottom:6px}}@media(prefers-reduced-motion:reduce){.nas-page *{animation:none!important;transition:none!important}}
`;
