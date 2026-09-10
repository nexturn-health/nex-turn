import { useEffect, useRef, useState, } from "react";
import { useParams, } from "react-router-dom";
import { AlertCircle, CheckCircle2, HeartPulse, Loader2, RefreshCw, Stethoscope, Wifi, WifiOff, } from "lucide-react";
import { trackPatientQueue, type PatientTrackingData, } from "../../services/patientTracking.api";
import { socket, joinPatientQueue, leavePatientQueue, } from "../../socket/socket";
/* ============================================================
   HELPERS
============================================================ */
function formatShiftTime(time?: string | null) {
    if (!time ||
        !/^\d{1,2}:\d{2}$/.test(time)) {
        return null;
    }
    const [hours, minutes,] = time
        .split(":")
        .map(Number);
    if (hours > 23 ||
        minutes > 59) {
        return null;
    }
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}
function formatDateTime(value?: string | null) {
    if (!value) {
        return null;
    }
    if (/^\d{1,2}:\d{2}$/.test(value)) {
        return formatShiftTime(value);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}
function getErrorMessage(error: unknown) {
    const response = error as {
        response?: {
            data?: {
                message?: unknown;
            };
        };
    };
    const message = response?.response?.data?.message;
    return typeof message ===
        "string" &&
        message.trim()
        ? message
        : "We couldn't update your queue. Please try again.";
}
/* ============================================================
   COMPONENT
============================================================ */
export default function PatientTracking() {
    const { trackingToken, } = useParams<{
        trackingToken: string;
    }>();
    const [queue, setQueue,] = useState<PatientTrackingData | null>(null);
    const [loading, setLoading,] = useState(true);
    const [refreshing, setRefreshing,] = useState(false);
    const [error, setError,] = useState("");
    const [isLive, setIsLive,] = useState(false);
    const [lastUpdated, setLastUpdated,] = useState<Date | null>(null);
    const [doctorBreak, setDoctorBreak,] = useState<{
        isOnBreak: boolean;
        breakStartedAt?: string | null;
        breakReason?: string | null;
        message?: string;
    }>({
        isOnBreak: false,
    });
    const [doctorResumeNotice, setDoctorResumeNotice,] = useState<{
        show: boolean;
        resumedAt?: string | null;
        message?: string;
    }>({
        show: false,
    });
    const refreshQueue = useRef<(() => Promise<void>) | null>(null);
    function handleManualRefresh(): void {
        const refresh = refreshQueue.current;
        if (refresh !== null) {
            void refresh();
        }
    }
    useEffect(() => {
        let active = true;
        let requestInFlight = false;
        let refreshPending = false;
        let timer: number | undefined;
        let resumeNoticeTimer: number | undefined;
        let currentQueue: PatientTrackingData | null = null;
        setQueue(null);
        setLoading(true);
        setRefreshing(false);
        setError("");
        setIsLive(false);
        setLastUpdated(null);
        setDoctorBreak({
            isOnBreak: false,
        });
        setDoctorResumeNotice({
            show: false,
        });
        if (!trackingToken) {
            setError("This tracking link is incomplete. Please ask reception for a new link.");
            setLoading(false);
            return;
        }
        const token: string = trackingToken;
        async function loadQueue(manual = false): Promise<void> {
            if (!active) {
                return;
            }
            if (manual) {
                setRefreshing(true);
            }
            if (requestInFlight) {
                refreshPending =
                    true;
                return;
            }
            requestInFlight =
                true;
            try {
                const data = await trackPatientQueue(token);
                if (!active) {
                    return;
                }
                currentQueue =
                    data;
                setQueue(data);
                const timingBreak = data.doctorTiming as {
                    isOnBreak?: boolean;
                    breakStartedAt?: string | null;
                    breakReason?: string | null;
                    message?: string;
                } | null;
                const doctorBreakData = data.doctorId as {
                    isOnBreak?: boolean;
                    breakStartedAt?: string | null;
                    breakReason?: string | null;
                } | null;
                const hasBreakInfo = Boolean(timingBreak &&
                    ("isOnBreak" in timingBreak ||
                        "breakStartedAt" in timingBreak ||
                        "breakReason" in timingBreak)) ||
                    Boolean(doctorBreakData &&
                        ("isOnBreak" in doctorBreakData ||
                            "breakStartedAt" in doctorBreakData ||
                            "breakReason" in doctorBreakData));
                if (hasBreakInfo) {
                    const isOnBreak = Boolean(timingBreak?.isOnBreak ??
                        doctorBreakData?.isOnBreak);
                    setDoctorBreak({
                        isOnBreak,
                        breakStartedAt: timingBreak?.breakStartedAt ||
                            doctorBreakData?.breakStartedAt ||
                            null,
                        breakReason: timingBreak?.breakReason ||
                            doctorBreakData?.breakReason ||
                            null,
                        message: timingBreak?.message ||
                            (isOnBreak
                                ? "Doctor is on break"
                                : "Doctor resumed duty"),
                    });
                }
                setError("");
                setLastUpdated(new Date());
                if (data.status ===
                    "COMPLETED" ||
                    data.status ===
                        "CANCELLED") {
                    setLoading(false);
                    setRefreshing(false);
                    setIsLive(false);
                    stopTracking();
                }
            }
            catch (err) {
                if (active) {
                    setError(getErrorMessage(err));
                }
            }
            finally {
                requestInFlight =
                    false;
                if (active) {
                    setLoading(false);
                    setRefreshing(false);
                    if (refreshPending) {
                        refreshPending =
                            false;
                        void loadQueue();
                    }
                }
            }
        }
        refreshQueue.current =
            () => loadQueue(true);
        function handleConnect() {
            if (!active) {
                return;
            }
            setIsLive(true);
            void loadQueue();
        }
        function handleDisconnect() {
            if (active) {
                setIsLive(false);
            }
        }
        function handleQueueUpdate(data?: {
            trackingToken?: string;
            doctorId?: string;
            reason?: string;
        }) {
            if (!active) {
                return;
            }
            if (data?.trackingToken &&
                data.trackingToken !==
                    token) {
                return;
            }
            void loadQueue();
        }
        function handleDoctorStatus(data?: {
            doctorId?: string;
            isOnline?: boolean;
        }) {
            if (!active ||
                !data) {
                return;
            }
            const doctorId = currentQueue?.doctorId?._id;
            if (doctorId &&
                data.doctorId &&
                data.doctorId !==
                    doctorId) {
                return;
            }
            void loadQueue();
        }
        function handleDoctorTimingUpdated(data?: {
            doctorId?: string;
            hospitalId?: string;
        }) {
            if (!active) {
                return;
            }
            const doctorId = currentQueue?.doctorId?._id;
            if (doctorId &&
                data?.doctorId &&
                data.doctorId !==
                    doctorId) {
                return;
            }
            void loadQueue();
        }
        function handleDoctorBreakStatus(data?: {
            doctorId?: string;
            isOnBreak?: boolean;
            breakStartedAt?: string | null;
            breakReason?: string | null;
            message?: string;
        }) {
            if (!active ||
                !data) {
                return;
            }
            const doctorId = currentQueue?.doctorId?._id;
            if (doctorId &&
                data.doctorId &&
                data.doctorId !==
                    doctorId) {
                return;
            }
            const isNowOnBreak = Boolean(data.isOnBreak);
            if (resumeNoticeTimer !==
                undefined) {
                window.clearTimeout(resumeNoticeTimer);
                resumeNoticeTimer =
                    undefined;
            }
            setDoctorBreak({
                isOnBreak: isNowOnBreak,
                breakStartedAt: data.breakStartedAt ||
                    null,
                breakReason: data.breakReason ||
                    null,
                message: data.message ||
                    (isNowOnBreak
                        ? "Doctor is on break"
                        : "Doctor returned to serve"),
            });
            if (isNowOnBreak) {
                setDoctorResumeNotice({
                    show: false,
                });
            }
            else {
                setDoctorResumeNotice({
                    show: true,
                    resumedAt: new Date().toISOString(),
                    message: data.message ||
                        "Doctor returned to serve",
                });
                resumeNoticeTimer =
                    window.setTimeout(() => {
                        if (active) {
                            setDoctorResumeNotice({
                                show: false,
                            });
                        }
                    }, 20000);
            }
            void loadQueue();
        }
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleDisconnect);
        socket.on("queue:updated", handleQueueUpdate);
        socket.on("queue:status", handleQueueUpdate);
        socket.on("user:status", handleDoctorStatus);
        socket.on("doctor:status", handleDoctorStatus);
        socket.on("doctor:timing-updated", handleDoctorTimingUpdated);
        socket.on("queue:doctor-status", handleDoctorBreakStatus);
        socket.on("doctor:break-status", handleDoctorBreakStatus);
        joinPatientQueue(token);
        if (socket.connected) {
            handleConnect();
        }
        else {
            void loadQueue();
            socket.connect();
        }
        timer =
            window.setInterval(() => {
                if (active &&
                    !requestInFlight) {
                    void loadQueue();
                }
            }, 30000);
        function handleVisible() {
            if (document.visibilityState ===
                "visible") {
                void loadQueue();
            }
        }
        document.addEventListener("visibilitychange", handleVisible);
        window.addEventListener("online", handleVisible);
        function stopTracking(): void {
            if (!active) {
                return;
            }
            active =
                false;
            refreshPending =
                false;
            refreshQueue.current =
                null;
            if (timer !==
                undefined) {
                window.clearInterval(timer);
            }
            if (resumeNoticeTimer !==
                undefined) {
                window.clearTimeout(resumeNoticeTimer);
            }
            document.removeEventListener("visibilitychange", handleVisible);
            window.removeEventListener("online", handleVisible);
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleDisconnect);
            socket.off("queue:updated", handleQueueUpdate);
            socket.off("queue:status", handleQueueUpdate);
            socket.off("user:status", handleDoctorStatus);
            socket.off("doctor:status", handleDoctorStatus);
            socket.off("doctor:timing-updated", handleDoctorTimingUpdated);
            socket.off("queue:doctor-status", handleDoctorBreakStatus);
            socket.off("doctor:break-status", handleDoctorBreakStatus);
            leavePatientQueue(token);
        }
        return stopTracking;
    }, [
        trackingToken,
    ]);
    const status = queue?.status;
    const isWaiting = status ===
        "WAITING";
    const isCalled = status ===
        "CALLED";
    const isServing = status ===
        "SERVING";
    const isCompleted = status ===
        "COMPLETED";
    const isSkipped = status ===
        "SKIPPED";
    const isCancelled = status ===
        "CANCELLED";
    const doctorName = queue?.doctorId?.name;
    const doctorLabel = doctorName
        ? /^dr\.?\s/i.test(doctorName)
            ? doctorName
            : `Dr. ${doctorName}`
        : "your doctor";
    const doctorTiming = queue?.doctorTiming ||
        null;
    const appointment = queue?.appointment ||
        null;
    const scheduledStartTime = doctorTiming?.scheduledStartTime ||
        queue?.doctorShiftStartTime ||
        null;
    const scheduledEndTime = doctorTiming?.scheduledEndTime ||
        null;
    const shiftStartLabel = formatShiftTime(scheduledStartTime);
    const shiftEndLabel = formatShiftTime(scheduledEndTime);
    const appointmentTime = appointment?.appointmentTime ||
        appointment?.scheduledStartTime ||
        null;
    const appointmentTimeLabel = formatShiftTime(appointmentTime) ||
        appointmentTime;
    const estimatedTurnTimeLabel = formatDateTime(queue?.estimatedTurnTime);
    const expectedDoctorStartLabel = formatDateTime(doctorTiming?.expectedDoctorStartAt);
    const doctorOnline = doctorTiming?.isOnline ??
        queue?.doctorOnline;
    const doctorTimingBreak = doctorTiming as {
        isOnBreak?: boolean;
        breakStartedAt?: string | null;
        breakReason?: string | null;
        message?: string;
    } | null;
    const doctorDataBreak = queue?.doctorId as {
        isOnBreak?: boolean;
        breakStartedAt?: string | null;
        breakReason?: string | null;
    } | null;
    const isDoctorOnBreak = Boolean(doctorBreak.isOnBreak ||
        doctorTimingBreak?.isOnBreak ||
        doctorDataBreak?.isOnBreak);
    const doctorBreakStartedLabel = formatDateTime(doctorBreak.breakStartedAt ||
        doctorTimingBreak?.breakStartedAt ||
        doctorDataBreak?.breakStartedAt ||
        null);
    const doctorBreakReason = doctorBreak.breakReason ||
        doctorTimingBreak?.breakReason ||
        doctorDataBreak?.breakReason ||
        "Break";
    const isDoctorRecentlyResumed = Boolean(doctorResumeNotice.show &&
        !isDoctorOnBreak &&
        !isCompleted &&
        !isCancelled);
    const lateByMinutes = doctorTiming?.lateByMinutes ??
        0;
    const isDoctorLate = Boolean(doctorTiming?.isLate ||
        lateByMinutes > 0);
    let statusTitle = "Appointment status";
    let statusMessage = "Please contact reception if you need help with your appointment.";
    if (isWaiting &&
        isDoctorOnBreak) {
        statusTitle =
            "Doctor is on break";
        statusMessage =
            "Please wait nearby. Your token remains active while the doctor takes a break.";
    }
    else if (isWaiting &&
        isDoctorRecentlyResumed) {
        statusTitle =
            "Doctor returned to serve";
        statusMessage =
            "Calling has resumed. Please stay ready and keep watching your live token updates.";
    }
    else if (isWaiting) {
        statusTitle =
            "You're in the queue";
        statusMessage =
            "Please stay nearby. Your position and wait time update automatically.";
    }
    else if (isCalled) {
        statusTitle =
            "It's your turn";
        statusMessage =
            `Your token has been called. Please proceed to ${doctorLabel}'s room.`;
    }
    else if (isServing) {
        statusTitle =
            "Consultation in progress";
        statusMessage =
            `Your appointment with ${doctorLabel} is in progress.`;
    }
    else if (isCompleted) {
        statusTitle =
            "Appointment completed";
        statusMessage =
            `Your consultation with ${doctorLabel} is complete.`;
    }
    else if (isSkipped) {
        statusTitle =
            "Your token was skipped";
        statusMessage =
            "Please speak with reception for help with your next step.";
    }
    else if (isCancelled) {
        statusTitle =
            "Appointment cancelled";
        statusMessage =
            "Please contact reception if you need to book again.";
    }
    const trackingEnded = isCompleted || isCancelled;
    const availabilityTitle = isDoctorOnBreak
        ? "On a short break"
        : isDoctorRecentlyResumed
            ? "Doctor has returned"
            : isDoctorLate
                ? "Clinic running late"
                : doctorOnline === true
                    ? "Doctor is available"
                    : "Availability awaiting confirmation";
    const availabilityMessage = isDoctorOnBreak
        ? "Calling is paused. We’ll update this page when the doctor returns."
        : isDoctorRecentlyResumed
            ? "Calling has resumed. Please keep your token ready."
            : isDoctorLate
                ? `The clinic is delayed${lateByMinutes > 0 ? ` by about ${lateByMinutes} min` : ""}. Your estimated turn may change.`
                : doctorOnline === true
                    ? "Please wait for your token to be called."
                    : "Please check with reception if you need an update.";

    // One compact page: token, next step, queue estimate, and doctor status.
    return (
        <div className="pt-page">
            <PatientTrackingStyles />
            <div className="pt-shell">
                <header className="pt-header">
                    <span className="pt-brand"><HeartPulse size={21} aria-hidden="true" />NextSynq Health</span>
                    <span className="pt-connection" data-live={isLive}>
                        {trackingEnded ? <CheckCircle2 size={13} /> : isLive ? <Wifi size={13} /> : <WifiOff size={13} />}
                        {trackingEnded ? "Ended" : isLive ? "Live" : "Connecting"}
                    </span>
                </header>

                <main className="pt-main">
                    {loading ? (
                        <section className="pt-empty" role="status"><Loader2 size={28} className="pt-spin" /><h1>Loading your token</h1><p>Checking the latest queue update…</p></section>
                    ) : !queue ? (
                        <section className="pt-empty">
                            <AlertCircle size={28} /><h1>Tracking unavailable</h1>
                            <p role="alert">{error || "Please ask reception for a new tracking link."}</p>
                            {trackingToken && <button type="button" className="pt-button" disabled={refreshing} onClick={handleManualRefresh}><RefreshCw size={16} className={refreshing ? "pt-spin" : ""} />Try again</button>}
                        </section>
                    ) : (
                        <>
                            <div className="pt-greeting"><h1>Hello, {queue.patient.name}</h1><p>Your visit, at a glance</p></div>
                            {error && <div className="pt-error" role="alert"><AlertCircle size={16} /><p>Showing your last update. {error}</p></div>}

                            <section className="pt-ticket" aria-label="Your token">
                                <div className="pt-ticket-top"><span>YOUR TOKEN</span>
                                    {queue.priority === "EMERGENCY" && !trackingEnded && <span className="pt-emergency">Emergency</span>}
                                </div>
                                <strong className="pt-token">{queue.tokenLabel}</strong>
                                <div className="pt-department">{queue.department.name}</div>
                                <div className="pt-status" data-status={status} role={isCalled ? "alert" : "status"} aria-atomic="true">
                                    <strong>{statusTitle}</strong><p>{statusMessage}</p>
                                </div>
                            </section>

                            {isWaiting && (
                                <section className="pt-stats" aria-label="Queue estimates">
                                    <div><span>Patients ahead</span><strong>{queue.patientsAhead ?? "—"}</strong></div>
                                    <div><span>Est. wait</span><strong>{isDoctorOnBreak ? "Paused" : queue.estimatedWaitTime ?? "—"}{!isDoctorOnBreak && queue.estimatedWaitTime != null && <small> min</small>}</strong></div>
                                    <div><span>Est. turn</span><strong className="pt-turn">{isDoctorOnBreak ? "Updating" : estimatedTurnTimeLabel || "—"}</strong></div>
                                </section>
                            )}

                            {!trackingEnded && (
                                <section className="pt-doctor" aria-label="Doctor availability">
                                    <div className="pt-doctor-top"><Stethoscope size={18} aria-hidden="true" />
                                        <h2>{doctorName ? doctorLabel : "Doctor to be confirmed"}</h2>
                                    </div>
                                    {/* One status replaces repeated break and timing banners. */}
                                    <div className="pt-availability" data-break={isDoctorOnBreak} role="status" aria-live="polite">
                                        <span className="pt-dot" aria-hidden="true" />
                                        <div><strong>{availabilityTitle}</strong><p>{availabilityMessage}</p>
                                            {isDoctorOnBreak && doctorBreakStartedLabel && <small>Break started {doctorBreakStartedLabel}</small>}
                                        </div>
                                    </div>
                                    {(appointment || shiftStartLabel || shiftEndLabel || (isDoctorLate && expectedDoctorStartLabel)) && (
                                        <dl className="pt-times">
                                            {appointment && <div><dt>Your appointment</dt><dd>{appointmentTimeLabel || "Ask reception"}</dd></div>}
                                            {(shiftStartLabel || shiftEndLabel) && <div><dt>Clinic hours</dt><dd>{shiftStartLabel || "—"}{shiftEndLabel ? ` – ${shiftEndLabel}` : " onwards"}</dd></div>}
                                            {isDoctorLate && expectedDoctorStartLabel && <div><dt>Expected start</dt><dd>{expectedDoctorStartLabel}</dd></div>}
                                        </dl>
                                    )}
                                    {isDoctorOnBreak && doctorBreakReason && doctorBreakReason !== "Break" && doctorBreakReason !== "Doctor break" && (
                                        <details className="pt-details"><summary>Break details</summary><p>{doctorBreakReason}</p></details>
                                    )}
                                </section>
                            )}

                            {!isSkipped && !trackingEnded && (
                                <div className="pt-serving"><span>Now serving</span><strong>{queue.currentServingToken || "—"}</strong>
                                    {!isLive && <small>Last update</small>}
                                </div>
                            )}
                            <footer className="pt-footer">
                                <div><p>{trackingEnded ? "Tracking ended. You can close this page." : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Waiting for an update"}</p>
                                    {!trackingEnded && <small>{isLive ? "Updates automatically" : "Reconnecting · checks every 30 sec"}</small>}
                                </div>
                                {!trackingEnded && <button type="button" className="pt-button" disabled={refreshing} onClick={handleManualRefresh} aria-label="Refresh queue"><RefreshCw size={15} className={refreshing ? "pt-spin" : ""} />{refreshing ? "Updating" : "Refresh"}</button>}
                            </footer>
                            {isWaiting && <p className="pt-disclaimer">Times are estimates and may change. Keep your token ready.</p>}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

// Compact on mobile without hiding content or blocking accessibility scrolling.
function PatientTrackingStyles() {
    return <style>{`
.pt-page{--ink:#193e38;--muted:#61726b;--line:#dfe7de;background:#f4f6f1;color:var(--ink);min-height:100dvh;padding:20px 12px;font-family:inherit;line-height:1.45}
.pt-page *{box-sizing:border-box}
.pt-page h1,.pt-page h2,.pt-page p{margin:0}
.pt-shell{max-width:440px;margin:0 auto;background:#fafbf8;border:1px solid var(--line);border-radius:20px;overflow:hidden}
.pt-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line)}
.pt-brand{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700}
.pt-connection{display:flex;align-items:center;gap:5px;color:var(--muted);font-size:11px;white-space:nowrap}
.pt-connection[data-live=true]{color:#216957}
.pt-main{padding:16px;display:flex;flex-direction:column;gap:12px}
.pt-greeting h1{font-size:18px;font-weight:650;overflow-wrap:anywhere}
.pt-greeting p{font-size:12px;color:var(--muted);margin-top:2px}
.pt-ticket{border-radius:14px;background:#1c4940;color:#fff;padding:14px 16px;text-align:center}
.pt-ticket-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10px;letter-spacing:1.2px;color:#dbe9e0}
.pt-emergency{background:#fff0e9;color:#9b392b;border-radius:5px;padding:3px 6px;letter-spacing:0}
.pt-token{display:block;font-size:clamp(34px,10vw,48px);font-weight:700;line-height:1.1;margin:7px 0 3px;letter-spacing:-1px;overflow-wrap:anywhere}
.pt-department{font-size:12px;color:#dbe9e0;overflow-wrap:anywhere}
.pt-status{border-top:1px solid #ffffff26;margin-top:12px;padding-top:10px}
.pt-status strong{font-size:15px;font-weight:650}
.pt-status p{font-size:12px;color:#e0ebe4;line-height:1.5;margin:4px auto 0;max-width:340px}
.pt-status[data-status=CALLED] strong{color:#f5e8b0}
.pt-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:12px;background:white;padding:11px 0}
.pt-stats>div{text-align:center;padding:0 6px;min-width:0}
.pt-stats>div+div{border-left:1px solid var(--line)}
.pt-stats span{display:block;font-size:10px;color:var(--muted)}
.pt-stats strong{display:block;font-size:20px;font-weight:650;line-height:1.4;margin-top:3px;overflow-wrap:anywhere}
.pt-stats small{font-size:11px;font-weight:400}
.pt-stats .pt-turn{font-size:14px;padding-top:4px}
.pt-doctor{padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:#fff}
.pt-doctor-top{display:flex;align-items:center;gap:8px}
.pt-doctor-top svg{flex-shrink:0;color:#547365}
.pt-doctor h2{font-size:14px;font-weight:650;overflow-wrap:anywhere}
.pt-availability{display:flex;gap:8px;margin-top:9px}
.pt-dot{width:7px;height:7px;flex-shrink:0;border-radius:50%;background:#7c8b80;margin-top:5px}
.pt-availability[data-break=true] .pt-dot{background:#b78b39}
.pt-availability strong{font-size:12px;font-weight:600}
.pt-availability p,.pt-availability small{font-size:11px;line-height:1.5;color:var(--muted);display:block;margin-top:2px}
.pt-times{margin:10px 0 0;padding-top:8px;border-top:1px solid var(--line);display:grid;gap:5px;font-size:11px}
.pt-times>div{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.pt-times dt{color:var(--muted)}
.pt-times dd{margin:0;text-align:right;font-weight:600}
.pt-details{font-size:11px;color:var(--muted);margin-top:8px}
.pt-details summary{cursor:pointer;padding:6px 0}
.pt-serving{display:flex;align-items:center;gap:10px;font-size:12px;padding:0 3px;color:var(--muted)}
.pt-serving strong{font-size:15px;color:var(--ink);margin-left:auto;overflow-wrap:anywhere}
.pt-serving small{font-size:10px}
.pt-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px solid var(--line)}
.pt-footer p{font-size:11px;color:var(--muted)}
.pt-footer small{display:block;font-size:10px;color:var(--muted);margin-top:2px}
.pt-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border:1px solid var(--line);border-radius:8px;background:white;color:var(--ink);font:inherit;font-size:12px;padding:8px 12px;cursor:pointer;flex-shrink:0}
.pt-button:disabled{opacity:.5;cursor:wait}
.pt-button:focus-visible,.pt-details summary:focus-visible{outline:3px solid #86b9a5;outline-offset:2px}
.pt-disclaimer{text-align:center;font-size:10px;line-height:1.5;color:var(--muted)}
.pt-error{display:flex;align-items:flex-start;gap:8px;padding:10px;background:#fff5e8;border:1px solid #eddec5;border-radius:9px;color:#875c2a;font-size:12px}
.pt-error svg{flex-shrink:0;margin-top:2px}
.pt-empty{min-height:360px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;text-align:center;padding:22px 10px}
.pt-empty h1{font-size:20px}.pt-empty p{font-size:13px;color:var(--muted)}
.pt-spin{animation:pt-spin 1s linear infinite}@keyframes pt-spin{to{transform:rotate(360deg)}}
@media(max-width:480px){.pt-page{padding:0}.pt-shell{border:0;border-radius:0;min-height:100dvh}.pt-header{padding:12px 16px}.pt-main{padding:12px 14px;gap:10px}.pt-ticket{padding:12px 14px}.pt-doctor{padding:11px 12px}}
@media(max-height:720px) and (max-width:480px){.pt-header{padding:10px 14px}.pt-main{padding:10px 12px;gap:8px}.pt-greeting p{display:none}.pt-ticket{padding:10px 12px}.pt-token{font-size:36px;margin:4px 0 2px}.pt-status{margin-top:8px;padding-top:7px}.pt-stats{padding:8px 0}.pt-doctor{padding:10px 12px}.pt-footer{padding-top:4px}.pt-times{margin-top:7px;padding-top:6px}}
@media(prefers-reduced-motion:reduce){.pt-spin{animation:none}}
`}</style>;
}
