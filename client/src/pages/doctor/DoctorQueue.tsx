import {
    AlertCircle,
    Bell,
    CalendarDays,
    CheckCircle2,
    Clock,
    Loader2,
    LockKeyhole,
    Phone,
    RefreshCw,
    Search,
    SkipForward,
    Stethoscope,
    Ticket,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    callNextPatient,
    callSelectedPatient,
    completePatient,
    resumeDoctorDuty,
    skipPatient,
    startServingPatient,
    takeDoctorBreak,
} from "../../services/queue.api";
import {
    getDoctorQueue,
    type DoctorQueueItem,
} from "../../services/doctor.api";
import api from "../../services/api";
import {
    useAuthStore,
} from "../../store/authStore";
import StartConsultation from "./DoctorConsultation";
import {
    socket,
} from "../../socket/socket";
/* ============================================================
   TYPES
============================================================ */
interface DoctorBreakState {
    isOnBreak: boolean;
    breakStartedAt: string | null;
    breakReason: string | null;
}

// Narrow API/socket values safely, without `any` or changing shared API types.
function asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}
function readDoctorBreak(value: unknown): DoctorBreakState | null {
    const doctor = asRecord(value);
    if (!doctor || typeof doctor.isOnBreak !== "boolean") return null;
    return {
        isOnBreak: doctor.isOnBreak,
        breakStartedAt: typeof doctor.breakStartedAt === "string" ? doctor.breakStartedAt : null,
        breakReason: typeof doctor.breakReason === "string" ? doctor.breakReason : null,
    };
}

interface StartConsultationResponse {
    success: boolean;
    message?: string;
    data?: {
        _id?: string;
        id?: string;
        consultationId?: string;
    };
}
/* ============================================================
   HELPERS
============================================================ */
const getQueuePatient = (queue?: DoctorQueueItem | null) => {
    return queue?.patientId || queue?.patient || null;
};
const isAppointmentPatient = (queue?: DoctorQueueItem | null) => {
    if (!queue) {
        return false;
    }
    return (queue.isAppointment === true ||
        queue.source === "APPOINTMENT" ||
        Boolean(queue.appointmentId) ||
        Boolean(queue.scheduledStartTime) ||
        queue.tokenLabel?.includes("-A"));
};
const isEmergencyPatient = (queue?: DoctorQueueItem | null) => {
    return (queue?.isEmergency === true ||
        queue?.priority === "EMERGENCY" ||
        queue?.source === "EMERGENCY");
};
const timeToMinutes = (value?: string | null) => {
    if (!value) {
        return null;
    }
    const match = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) {
        return null;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        hours > 23 ||
        minutes > 59) {
        return null;
    }
    return hours * 60 + minutes;
};
const getIndiaNowMinutes = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
    return hour * 60 + minute;
};
const formatAppointmentTime = (value?: string | null) => {
    if (!value) {
        return "Time not set";
    }
    const minutes = timeToMinutes(value);
    if (minutes === null) {
        return value;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const suffix = hours >= 12
        ? "PM"
        : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(mins).padStart(2, "0")} ${suffix}`;
};
const formatDuration = (minutes: number) => {
    const safeMinutes = Math.max(0, Math.round(minutes));
    if (safeMinutes < 60) {
        return `${safeMinutes} min`;
    }
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    if (!mins) {
        return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
};
const getQueueScheduledStartTime = (queue?: DoctorQueueItem | null) => {
    const appointment = queue?.appointmentId &&
        typeof queue.appointmentId === "object"
        ? queue.appointmentId
        : null;
    return (queue?.scheduledStartTime ||
        appointment?.confirmedStartTime ||
        appointment?.requestedStartTime ||
        null);
};
const getQueueScheduledEndTime = (queue?: DoctorQueueItem | null) => {
    const appointment = queue?.appointmentId &&
        typeof queue.appointmentId === "object"
        ? queue.appointmentId
        : null;
    return (queue?.scheduledEndTime ||
        appointment?.endTime ||
        null);
};
const DEFAULT_APPOINTMENT_WINDOW_MINUTES = 15;

const getAppointmentStartMinutes = (queue?: DoctorQueueItem | null) => {
    return timeToMinutes(getQueueScheduledStartTime(queue));
};

const getAppointmentEndMinutes = (queue?: DoctorQueueItem | null) => {
    const startMinutes = getAppointmentStartMinutes(queue);
    const explicitEndMinutes = timeToMinutes(getQueueScheduledEndTime(queue));

    if (explicitEndMinutes !== null) {
        return explicitEndMinutes;
    }

    if (startMinutes === null) {
        return null;
    }

    return startMinutes + DEFAULT_APPOINTMENT_WINDOW_MINUTES;
};

const isMissedAppointment = (
    queue: DoctorQueueItem,
    nowMinutes: number,
) => {
    if (
        !isAppointmentPatient(queue) ||
        isEmergencyPatient(queue)
    ) {
        return false;
    }

    if (
        queue.appointmentCallStatus === "MISSED"
    ) {
        return true;
    }

    const endMinutes =
        getAppointmentEndMinutes(queue);

    if (endMinutes === null) {
        return false;
    }

    return nowMinutes >= endMinutes;
};

const getAppointmentDeltaMinutes = (queue: DoctorQueueItem, nowMinutes: number) => {
    const scheduledMinutes = timeToMinutes(getQueueScheduledStartTime(queue));
    if (scheduledMinutes === null) {
        return null;
    }
    return scheduledMinutes - nowMinutes;
};
const isAppointmentDue = (queue: DoctorQueueItem, nowMinutes: number) => {
    if (isEmergencyPatient(queue)) {
        return true;
    }

    if (!isAppointmentPatient(queue)) {
        return true;
    }

    if (isMissedAppointment(queue, nowMinutes)) {
        return false;
    }

    const startMinutes = getAppointmentStartMinutes(queue);

    if (startMinutes === null) {
        return false;
    }

    return nowMinutes >= startMinutes;
};

const getAppointmentDueText = (queue: DoctorQueueItem, nowMinutes: number) => {
    if (isEmergencyPatient(queue)) {
        return "Emergency priority";
    }

    if (!isAppointmentPatient(queue)) {
        return "Walk-in token";
    }

    const scheduledTime = getQueueScheduledStartTime(queue);
    const scheduledEndTime = getQueueScheduledEndTime(queue);
    const startMinutes = getAppointmentStartMinutes(queue);
    const endMinutes = getAppointmentEndMinutes(queue);

    if (startMinutes === null) {
        return "Appointment time not set";
    }

    if (isMissedAppointment(queue, nowMinutes)) {
        return `Missed appointment · window ended ${formatAppointmentTime(scheduledEndTime || getQueueScheduledStartTime(queue))}`;
    }

    if (nowMinutes < startMinutes) {
        return `Scheduled ${formatAppointmentTime(scheduledTime)} · starts in ${formatDuration(startMinutes - nowMinutes)}`;
    }

    if (endMinutes !== null) {
        return `Priority window active · until ${formatAppointmentTime(scheduledEndTime || `${Math.floor(endMinutes / 60)}:${String(endMinutes % 60).padStart(2, "0")}`)}`;
    }

    return `Due now · ${formatAppointmentTime(scheduledTime)}`;
};
const sortDoctorWaitingQueue = (first: DoctorQueueItem, second: DoctorQueueItem, nowMinutes: number) => {
    const rank = (queue: DoctorQueueItem) => {
        if (isEmergencyPatient(queue)) {
            return 0;
        }
        if (isAppointmentPatient(queue) &&
            isAppointmentDue(queue, nowMinutes)) {
            return 1;
        }
        if (!isAppointmentPatient(queue)) {
            return 2;
        }

        if (isMissedAppointment(queue, nowMinutes)) {
            return 4;
        }

        return 3;
    };
    const firstRank = rank(first);
    const secondRank = rank(second);
    if (firstRank !== secondRank) {
        return firstRank - secondRank;
    }
    if (isAppointmentPatient(first) &&
        isAppointmentPatient(second)) {
        const firstTime = timeToMinutes(getQueueScheduledStartTime(first)) ??
            Number.MAX_SAFE_INTEGER;
        const secondTime = timeToMinutes(getQueueScheduledStartTime(second)) ??
            Number.MAX_SAFE_INTEGER;
        if (firstTime !== secondTime) {
            return firstTime - secondTime;
        }
    }
    return (Number(first.tokenNumber || 0) -
        Number(second.tokenNumber || 0));
};
function errorText(error: unknown, fallback: string) {
    const value = error as {
        response?: {
            data?: {
                message?: unknown;
                code?: string;
            };
        };
        message?: unknown;
    };
    const message = value?.response?.data?.message ??
        value?.message;
    return typeof message === "string"
        ? message
        : fallback;
}
/* ============================================================
   DOCTOR QUEUE
============================================================ */
export default function DoctorQueue() {
    const isPremium = useAuthStore((state) => state.subscription?.plan ===
        "PREMIUM");
    const [queues, setQueues,] = useState<DoctorQueueItem[]>([]);
    const [loading, setLoading,] = useState(true);
    const [refreshing, setRefreshing,] = useState(false);
    const [action, setAction,] = useState("");
    const [error, setError,] = useState("");
    const [loadError, setLoadError,] = useState("");
    const [updated, setUpdated,] = useState<Date | null>(null);
    const [consultation, setConsultation,] = useState<{
        id: string;
        queueId: string;
    } | null>(null);
    const [completionRetry, setCompletionRetry,] = useState<string | null>(null);
    const [premiumNotice, setPremiumNotice,] = useState(false);
    const [
        tab,
        setTab,
    ] =
        useState<
            | "waiting"
            | "upcoming"
            | "missed"
            | "completed"
        >(
            "waiting",
        );
    const [search, setSearch,] = useState("");
    const [nowMinutes, setNowMinutes,] = useState(getIndiaNowMinutes);
    const doctorId = useAuthStore((state) => state.user?.id);
    const [doctorBreak, setDoctorBreak] = useState<DoctorBreakState>({
        isOnBreak: false,
        breakStartedAt: null,
        breakReason: null,
    });
    const hospitalId = useAuthStore((state) => state.user?.hospitalId);
    const [socketConnected, setSocketConnected] = useState(socket.connected);
    const pendingRefresh = useRef(false);
    const lock = useRef(false);
    const fetching = useRef(false);
    const generation = useRef(0);
    const mounted = useRef(true);
    // Coalesce updates received during a request. Never lose a socket update
    // just because an earlier request is still loading.
    const loadQueue = useCallback(async () => {
        if (fetching.current) {
            pendingRefresh.current = true;
            return;
        }
        fetching.current = true;
        setRefreshing(true);
        try {
            do {
                pendingRefresh.current = false;
                const request = generation.current;
                try {
                    const data = await getDoctorQueue();
                    if (mounted.current && request === generation.current) {
                        const rows = Array.isArray(data) ? data : [];
                        setQueues(rows);
                        // Only use this doctor's populated record. An empty queue
                        // must not clear a break that was already confirmed.
                        const ownDoctor = rows.map((queue) => asRecord(queue.doctorId))
                            .find((doctor) => doctorId &&
                                String(doctor?._id ?? doctor?.id ?? "") === doctorId);
                        const savedBreak = readDoctorBreak(ownDoctor);
                        if (savedBreak) setDoctorBreak(savedBreak);
                        setUpdated(new Date());
                        setLoadError("");
                    }
                } catch (error) {
                    if (mounted.current && request === generation.current) {
                        setLoadError(errorText(error, "Unable to refresh the queue."));
                    }
                }
            } while (mounted.current && pendingRefresh.current);
        } finally {
            fetching.current = false;
            if (mounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [doctorId]);

    // Subscribe to the existing shared socket; no queue API polling.
    useEffect(() => {
        mounted.current = true;
        let refreshTimer: number | undefined;
        const scheduleRefresh = () => {
            // Several events from one queue change need only one refresh.
            if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
            refreshTimer = window.setTimeout(() => {
                refreshTimer = undefined;
                // Mutations already refresh when they finish.
                if (!lock.current) void loadQueue();
            }, 150);
        };
        const handleConnect = () => {
            setSocketConnected(true);
            if (hospitalId) socket.emit("join:hospital", hospitalId);
            // Catch changes missed while disconnected.
            scheduleRefresh();
        };
        const handleDisconnect = () => setSocketConnected(false);
        // Accept break changes from another tab only for the signed-in doctor.
        const handleDoctorStatus = (payload: unknown) => {
            const status = asRecord(payload);
            if (!doctorId || String(status?.doctorId ?? status?.userId ?? "") !== doctorId) return;
            const nextBreak = readDoctorBreak(status);
            if (nextBreak) {
                setDoctorBreak(nextBreak);
                scheduleRefresh();
            }
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleDisconnect);
        socket.on("queue:created", scheduleRefresh);
        socket.on("queue:called", scheduleRefresh);
        socket.on("queue:serving", scheduleRefresh);
        socket.on("queue:completed", scheduleRefresh);
        socket.on("queue:skipped", scheduleRefresh);
        socket.on("queue:updated", scheduleRefresh);
        socket.on("queue:status", scheduleRefresh);
        socket.on("appointment:updated", scheduleRefresh);
        socket.on("user:status", handleDoctorStatus);
        socket.on("doctor:status", handleDoctorStatus);
        socket.on("doctor:break-status", handleDoctorStatus);

        setSocketConnected(socket.connected);
        if (socket.connected) {
            handleConnect();
        } else {
            void loadQueue();
            socket.connect();
        }
        return () => {
            mounted.current = false;
            generation.current++;
            if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
            // Remove only this page's listeners. Keep doctor presence connected.
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleDisconnect);
            socket.off("queue:created", scheduleRefresh);
            socket.off("queue:called", scheduleRefresh);
            socket.off("queue:serving", scheduleRefresh);
            socket.off("queue:completed", scheduleRefresh);
            socket.off("queue:skipped", scheduleRefresh);
            socket.off("queue:updated", scheduleRefresh);
            socket.off("queue:status", scheduleRefresh);
            socket.off("appointment:updated", scheduleRefresh);
            socket.off("user:status", handleDoctorStatus);
            socket.off("doctor:status", handleDoctorStatus);
            socket.off("doctor:break-status", handleDoctorStatus);
        };
    }, [hospitalId, doctorId, loadQueue]);

    // This timer updates appointment labels only. It makes NO network request.
    useEffect(() => {
        const interval = window.setInterval(() => {
            setNowMinutes(getIndiaNowMinutes());
        }, 1000);
        return () => window.clearInterval(interval);
    }, []);
    const current = queues.find((queue) => queue.status ===
        "SERVING") ||
        queues.find((queue) => queue.status ===
            "CALLED");
    const currentPatient = getQueuePatient(current);
    const waiting = useMemo(() => queues
        .filter((queue) => queue.status ===
            "WAITING")
        .sort((first, second) => sortDoctorWaitingQueue(first, second, nowMinutes)), [
        queues,
        nowMinutes,
    ]);
    const missedAppointments =
        waiting.filter(
            (queue) =>
                isMissedAppointment(
                    queue,
                    nowMinutes,
                ),
        );

    const ready =
        waiting.filter(
            (queue) =>
                !isMissedAppointment(
                    queue,
                    nowMinutes,
                ) &&
                isAppointmentDue(
                    queue,
                    nowMinutes,
                ),
        );

    const upcoming =
        waiting.filter(
            (queue) =>
                isAppointmentPatient(queue) &&
                !isAppointmentDue(
                    queue,
                    nowMinutes,
                ) &&
                !isMissedAppointment(
                    queue,
                    nowMinutes,
                ),
        );
    const completed = queues.filter((queue) => queue.status === "COMPLETED");
    const walkInWaiting = waiting.filter((queue) => !isAppointmentPatient(queue) &&
        !isEmergencyPatient(queue));
    const dueAppointments = ready.filter((queue) => isAppointmentPatient(queue) &&
        !isEmergencyPatient(queue));
    const lateAppointments = dueAppointments.filter((queue) => {
        const delta = getAppointmentDeltaMinutes(queue, nowMinutes);
        return (delta !== null &&
            delta <= -1);
    });
    const nextUpcomingAppointment = upcoming[0] || null;
    const walkInEmptyUpcomingAppointment = !current &&
        !ready.length &&
        !walkInWaiting.length &&
        Boolean(nextUpcomingAppointment);
    const activeDoctorAlert = useMemo(() => {
        if (!current && missedAppointments.length) {
            const firstMissed = missedAppointments[0];

            return {
                type: "missed",
                title: "Missed appointment waiting",
                message: `${firstMissed.tokenLabel} · ${getQueuePatient(firstMissed)?.name || "Patient"} missed the appointment window. It will not disturb walk-in queue.`,
                meta: "Open Missed tab to call manually.",
            };
        }

        if (lateAppointments.length) {
            const firstLate = lateAppointments[0];
            return {
                type: "late",
                title: "Appointment time has passed",
                message: `${firstLate.tokenLabel} · ${getQueuePatient(firstLate)?.name || "Patient"} was scheduled at ${formatAppointmentTime(getQueueScheduledStartTime(firstLate))}. Prioritised after emergency patients.`,
                meta: getAppointmentDueText(firstLate, nowMinutes),
            };
        }
        if (dueAppointments.length) {
            const firstDue = dueAppointments[0];
            return {
                type: "due",
                title: "Appointment patient is ready",
                message: `${firstDue.tokenLabel} · ${getQueuePatient(firstDue)?.name || "Patient"} appointment time is ${formatAppointmentTime(getQueueScheduledStartTime(firstDue))}.`,
                meta: "Due now · after any emergency patients.",
            };
        }
        if (walkInEmptyUpcomingAppointment &&
            nextUpcomingAppointment) {
            return {
                type: "upcoming",
                title: "Walk-in queue is empty",
                message: `No walk-in patient is waiting now. Next checked-in appointment is ${nextUpcomingAppointment.tokenLabel} at ${formatAppointmentTime(getQueueScheduledStartTime(nextUpcomingAppointment))}.`,
                meta: getAppointmentDueText(nextUpcomingAppointment, nowMinutes),
            };
        }
        if (!current &&
            !waiting.length) {
            return {
                type: "empty",
                title: "No patient is waiting",
                message: "Walk-in and appointment queue are both empty right now.",
                meta: "New patients appear when the queue changes.",
            };
        }
        return null;
    }, [
        current,
        waiting.length,
        lateAppointments,
        dueAppointments,
        missedAppointments,
        walkInEmptyUpcomingAppointment,
        nextUpcomingAppointment,
        nowMinutes,
    ]);
    const list = tab === "waiting"
        ? ready
        : tab === "upcoming"
            ? upcoming
            : tab === "missed"
                ? missedAppointments
                : completed;
    const filtered = list.filter((queue) => {
        const person = getQueuePatient(queue);
        const searchText = search
            .trim()
            .toLowerCase();
        if (!searchText) {
            return true;
        }
        return [
            queue.tokenLabel,
            person?.name,
            person?.phone,
            person?.patientCode,
        ].some((value) => String(value || "")
            .toLowerCase()
            .includes(searchText));
    });
    const blocked = Boolean(action) ||
        Boolean(consultation) ||
        Boolean(completionRetry) ||
        loading ||
        Boolean(loadError) ||
        doctorBreak.isOnBreak;
    async function runAction(label: string, work: () => Promise<void>) {
        if (lock.current) {
            return;
        }
        lock.current =
            true;
        generation.current++;
        setAction(label);
        setError("");
        try {
            await work();
        }
        catch (error) {
            setError(errorText(error, `Unable to ${label.toLowerCase()}.`));
        }
        finally {
            await loadQueue();
            lock.current =
                false;
            setAction("");
        }
    }
    // Finish the current visit before pausing. The backend persists the break
    // and broadcasts it to patient tracking pages.
    async function handleTakeBreak() {
        if (current) {
            setError("Complete or skip the current patient before taking a break.");
            return;
        }
        if (blocked || lock.current) return;
        await runAction("Take break", async () => {
            const response: unknown = await takeDoctorBreak("Doctor break");
            const payload = asRecord(asRecord(response)?.data) ?? asRecord(response);
            setDoctorBreak({
                isOnBreak: true,
                breakStartedAt: typeof payload?.breakStartedAt === "string" ? payload.breakStartedAt : null,
                breakReason: typeof payload?.breakReason === "string" ? payload.breakReason : "Doctor break",
            });
        });
    }

    async function handleResumeDuty() {
        // Do not use `blocked`: being on break must not disable Resume.
        if (lock.current || action || consultation || completionRetry || loading) return;
        await runAction("Resume duty", async () => {
            await resumeDoctorDuty();
            setDoctorBreak({ isOnBreak: false, breakStartedAt: null, breakReason: null });
        });
    }

    async function callMissedAppointment(queue: DoctorQueueItem) {
        if (blocked || current || doctorBreak.isOnBreak) {
            return;
        }

        const person = getQueuePatient(queue);
        const confirmed = window.confirm(
            `Call missed appointment ${queue.tokenLabel} ${person?.name ? `for ${person.name}` : ""}? This is a manual override.`,
        );

        if (!confirmed) {
            return;
        }

        await runAction("Call missed appointment", async () => {
            await callSelectedPatient(queue._id);
        });
    }

    async function callNext() {
        if (blocked ||
            current ||
            !ready.length) {
            return;
        }
        await runAction("Call next patient", async () => {
            await callNextPatient();
        });
    }
    async function startConsultation() {
        if (!current ||
            blocked) {
            return;
        }
        if (!isPremium) {
            setPremiumNotice(true);
            return;
        }
        const queueId = current._id;
        await runAction("Open consultation", async () => {
            try {
                if (current.status ===
                    "CALLED") {
                    await startServingPatient(queueId);
                    setQueues((previous) => previous.map((queue) => queue._id ===
                        queueId
                        ? {
                            ...queue,
                            status: "SERVING",
                        }
                        : queue));
                }
                const response = await api.post<StartConsultationResponse>("/consultations/start", {
                    queueId,
                });
                const value = response.data.data;
                const id = value?._id ||
                    value?.id ||
                    value?.consultationId;
                if (!id) {
                    throw new Error("The server did not return a consultation ID.");
                }
                setConsultation({
                    id,
                    queueId,
                });
            }
            catch (error) {
                if ((error as {
                    response?: {
                        data?: {
                            code?: string;
                        };
                    };
                })?.response?.data?.code ===
                    "PREMIUM_REQUIRED") {
                    setPremiumNotice(true);
                }
                throw error;
            }
        });
    }
    async function startBasic() {
        if (!current ||
            blocked ||
            current.status !==
            "CALLED") {
            return;
        }
        const id = current._id;
        await runAction("Start visit", async () => {
            await startServingPatient(id);
            setQueues((previous) => previous.map((queue) => queue._id ===
                id
                ? {
                    ...queue,
                    status: "SERVING",
                }
                : queue));
        });
    }
    async function finishBasic() {
        if (!current ||
            blocked ||
            current.status !==
            "SERVING" ||
            isPremium) {
            return;
        }
        const id = current._id;
        await runAction("Complete visit", async () => {
            await completePatient(id);
            setQueues((previous) => previous.map((queue) => queue._id ===
                id
                ? {
                    ...queue,
                    status: "COMPLETED",
                }
                : queue));
        });
    }
    async function skipCurrent() {
        if (!current ||
            blocked) {
            return;
        }
        if (!window.confirm(`Skip ${getQueuePatient(current)?.name || "this patient"} (${current.tokenLabel})?`)) {
            return;
        }
        const id = current._id;
        await runAction("Skip patient", async () => {
            await skipPatient(id);
            setQueues((previous) => previous.map((queue) => queue._id ===
                id
                ? {
                    ...queue,
                    status: "SKIPPED",
                }
                : queue));
        });
    }
    async function finishPremium(queueId: string) {
        if (lock.current) {
            return;
        }
        setConsultation(null);
        setCompletionRetry(queueId);
        await runAction("Complete queue token", async () => {
            await completePatient(queueId);
            setQueues((previous) => previous.map((queue) => queue._id ===
                queueId
                ? {
                    ...queue,
                    status: "COMPLETED",
                }
                : queue));
            setCompletionRetry(null);
        });
    }
    // Keep the current patient and the primary action together on every screen.
    return (
        <main className="dqc">
            <style>{styles}</style>
            {consultation && (
                <StartConsultation
                    consultationId={consultation.id}
                    onClose={async () => { setConsultation(null); await loadQueue(); }}
                    onCompleted={() => finishPremium(consultation.queueId)}
                />
            )}

            <header className="dqc-header">
                <div>
                    <h1>Patient queue</h1>
                    <p>{updated ? `Updated ${updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${socketConnected ? "Live updates on" : "Live updates disconnected"}` : "Today’s patients"}</p>
                </div>
                <div className="dqc-header-actions">
                    <button type="button" className={doctorBreak.isOnBreak ? "dqc-resume" : "dqc-break"}
                        onClick={() => void (doctorBreak.isOnBreak ? handleResumeDuty() : handleTakeBreak())}
                        disabled={Boolean(action) || Boolean(consultation) || Boolean(completionRetry) || loading ||
                            (!doctorBreak.isOnBreak && (Boolean(current) || Boolean(loadError)))}>
                        {action === "Take break" || action === "Resume duty" ? <Loader2 size={17} className="dqc-spin" /> :
                            doctorBreak.isOnBreak ? <Stethoscope size={17} /> : <Clock size={17} />}
                        {doctorBreak.isOnBreak ? "Resume duty" : "Take a break"}
                    </button>
                    <button type="button" className="dqc-secondary" onClick={() => void loadQueue()}
                        disabled={refreshing || Boolean(action) || Boolean(consultation)}>
                        <RefreshCw size={16} className={refreshing ? "dqc-spin" : ""} />
                        <span>Refresh</span>
                    </button>
                </div>
            </header>

            {doctorBreak.isOnBreak && (
                <div className="dqc-break-alert" role="status" aria-live="polite">
                    <Clock size={20} />
                    <div><strong>You are on break</strong>
                        <p>Patients can see “Doctor is on break”. Resume duty to call the next patient.</p>
                        {doctorBreak.breakReason && <p>{doctorBreak.breakReason}</p>}
                    </div>
                </div>
            )}
            {(error || loadError) && (
                <div className="dqc-error" role="alert">
                    <AlertCircle size={18} />
                    <div>{error || loadError}{loadError && <p>Refresh the queue before taking the next action.</p>}</div>
                </div>
            )}
            {!socketConnected && (
                <div className="dqc-recovery" role="status">
                    Live updates disconnected. Reconnecting… You can refresh manually.
                </div>
            )}
            {completionRetry && (
                <div className="dqc-recovery" role="status">
                    <span>Consultation saved. Complete the queue token to continue.</span>
                    <button type="button" className="dqc-secondary" disabled={Boolean(action)}
                        onClick={() => void finishPremium(completionRetry)}>Retry completion</button>
                </div>
            )}

            <div className="dqc-workspace">
                <section className="dqc-current" aria-label="Current patient">
                    <div className="dqc-section-title">
                        <h2>{current ? "Current patient" : "Next patient"}</h2>
                        {current && <span className="dqc-state">{current.status === "CALLED" ? "Called" : "In consultation"}</span>}
                    </div>

                    {loading ? (
                        <div className="dqc-empty" role="status"><Loader2 size={24} className="dqc-spin" /><p>Loading patients…</p></div>
                    ) : current ? (
                        <>
                            <div className="dqc-patient">
                                <div className="dqc-patient-top"><span className="dqc-token">{current.tokenLabel}</span><QueueBadge queue={current} /></div>
                                <h3>{currentPatient?.name || "Patient name unavailable"}</h3>
                                <div className="dqc-patient-meta">
                                    {currentPatient?.patientCode && <span>ID {currentPatient.patientCode}</span>}
                                    <span><Phone size={14} />{currentPatient?.phone || "Phone unavailable"}</span>
                                </div>
                                {isAppointmentPatient(current) && (
                                    <p className="dqc-time"><CalendarDays size={15} />
                                        Appointment · {formatAppointmentTime(getQueueScheduledStartTime(current))}
                                        {getQueueScheduledEndTime(current) ? ` – ${formatAppointmentTime(getQueueScheduledEndTime(current))}` : ""}
                                    </p>
                                )}
                            </div>
                            <div className="dqc-actions">
                                <button type="button" className="dqc-primary" disabled={blocked}
                                    onClick={() => void (isPremium ? startConsultation() : current.status === "CALLED" ? startBasic() : finishBasic())}>
                                    {action ? <Loader2 size={18} className="dqc-spin" /> : current.status === "SERVING" && !isPremium ? <CheckCircle2 size={18} /> : <Stethoscope size={18} />}
                                    {action || (isPremium ? current.status === "SERVING" ? "Resume consultation" : "Start consultation" : current.status === "CALLED" ? "Start visit" : "Complete visit")}
                                </button>
                                <button type="button" className="dqc-secondary" disabled={blocked} onClick={() => void skipCurrent()}>
                                    <SkipForward size={16} />Skip
                                </button>
                            </div>
                            {!isPremium && (
                                <button type="button" className="dqc-premium-link" onClick={() => setPremiumNotice(!premiumNotice)} aria-expanded={premiumNotice}>
                                    <LockKeyhole size={13} />Clinical records · Premium
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="dqc-next">
                            {ready[0] ? (
                                <>
                                    <div className="dqc-patient-top"><span className="dqc-token">{ready[0].tokenLabel}</span><QueueBadge queue={ready[0]} /></div>
                                    <h3>{getQueuePatient(ready[0])?.name || "Patient"}</h3>
                                    <p>Next in queue · {getAppointmentDueText(ready[0], nowMinutes)}</p>
                                </>
                            ) : missedAppointments.length ? (
                                <>
                                    <span className="dqc-caption">Missed appointment waiting</span>
                                    <h3>{missedAppointments.length} missed appointment{missedAppointments.length > 1 ? "s" : ""}</h3>
                                    <p>These patients are not auto-called. Open the Missed tab and call manually when you decide.</p>
                                </>
                            ) : nextUpcomingAppointment ? (
                                <>
                                    <span className="dqc-caption">Next checked-in appointment</span>
                                    <h3>{formatAppointmentTime(getQueueScheduledStartTime(nextUpcomingAppointment))}</h3>
                                    <p>{nextUpcomingAppointment.tokenLabel} · {getQueuePatient(nextUpcomingAppointment)?.name || "Patient"}</p>
                                    <p>No walk-ins waiting. {getAppointmentDueText(nextUpcomingAppointment, nowMinutes)}</p>
                                </>
                            ) : (
                                <><CheckCircle2 size={26} /><h3>You’re all caught up</h3><p>New checked-in patients will appear here automatically.</p></>
                            )}
                            <button type="button" className="dqc-primary" disabled={blocked || !ready.length} onClick={() => void callNext()}>
                                {action ? <Loader2 size={18} className="dqc-spin" /> : <Ticket size={18} />}{action || "Call next patient"}
                            </button>
                        </div>
                    )}
                    {premiumNotice && (
                        <div className="dqc-premium-note">
                            <p>Clinical notes, prescriptions, lab orders and AI assistance require Premium. Contact your hospital administrator.</p>
                            <button type="button" className="dqc-premium-link" onClick={() => setPremiumNotice(false)}>Dismiss</button>
                        </div>
                    )}
                </section>

                <section className="dqc-list-panel" aria-label="Patient lists">
                    {/* Show one useful notice; empty states are already explained above. */}
                    {!loading && !loadError && activeDoctorAlert && activeDoctorAlert.type !== "empty" &&
                        (activeDoctorAlert.type !== "upcoming" || Boolean(current)) && (
                            <div className={`dqc-notice ${activeDoctorAlert.type === "late" ? "dqc-notice-late" : activeDoctorAlert.type === "missed" ? "dqc-notice-missed" : ""}`} role="status" aria-live="polite">
                                <Bell size={17} />
                                <div><strong>{activeDoctorAlert.title}</strong><p>{activeDoctorAlert.message}</p><small>{activeDoctorAlert.meta}</small></div>
                            </div>
                        )}
                    <div className="dqc-tabs" aria-label="Filter patients">
                        {(["waiting", "upcoming", "missed", "completed"] as const).map((value) => (
                            <button type="button" key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>
                                {value === "waiting" ? "Waiting" : value === "upcoming" ? "Upcoming" : value === "missed" ? "Missed" : "Done"}
                                <span>{value === "waiting" ? ready.length : value === "upcoming" ? upcoming.length : value === "missed" ? missedAppointments.length : completed.length}</span>
                            </button>
                        ))}
                    </div>
                    <label className="dqc-search"><Search size={17} /><input
                        aria-label="Search patient, phone or token" placeholder="Search name, phone or token"
                        value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                    <p className="dqc-list-note">{tab === "waiting" ? "Emergency → due appointment within time window → walk-in" : tab === "upcoming" ? "Checked-in appointments waiting for scheduled time" : tab === "missed" ? "Appointment window ended. These patients are not auto-prioritized; call manually only when doctor decides." : "Completed visits today"}</p>
                    {!filtered.length ? (
                        <div className="dqc-empty"><p>{search ? "No matching patients." : loading ? "Loading patients…" : tab === "completed" ? "No completed visits yet." : tab === "missed" ? "No missed appointments." : "No patients in this list."}</p></div>
                    ) : (
                        <div className="dqc-list">
                            {filtered.map((queue) => {
                                const person = getQueuePatient(queue);
                                return (
                                    <article className="dqc-row" key={queue._id}>
                                        <strong className="dqc-row-token">{queue.tokenLabel}</strong>
                                        <div className="dqc-row-person"><h3>{person?.name || "Patient"}</h3><p>{person?.phone || "No phone"}{person?.patientCode ? ` · ${person.patientCode}` : ""}</p>
                                            {tab !== "completed" && isAppointmentPatient(queue) && <small className={isMissedAppointment(queue, nowMinutes) ? "dqc-missed-text" : isAppointmentDue(queue, nowMinutes) ? "dqc-due-text" : ""}>{getAppointmentDueText(queue, nowMinutes)}</small>}
                                        </div>
                                        {tab === "missed" ? (
                                            <button
                                                type="button"
                                                className="dqc-call-small"
                                                disabled={blocked || Boolean(current)}
                                                onClick={() => void callMissedAppointment(queue)}
                                            >
                                                Call
                                            </button>
                                        ) : tab === "completed" ? <CheckCircle2 size={17} className="dqc-done" aria-label="Completed" /> : <QueueBadge queue={queue} />}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

// A consistent, quiet label for each patient’s queue type.
function QueueBadge({ queue }: { queue: DoctorQueueItem }) {
    return (
        <span className={`dqc-badge ${isEmergencyPatient(queue) ? "dqc-emergency" : ""}`}>
            {isEmergencyPatient(queue) ? "Emergency" : isAppointmentPatient(queue) ? "Appointment" : "Walk-in"}
        </span>
    );
}

// All styles stay in this file. Mobile uses normal page scrolling.
const styles = `
.dqc-header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dqc-break,.dqc-resume{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border-radius:8px;padding:10px 14px;font-size:13px!important;font-weight:600!important;border:1px solid var(--line)}
.dqc-break{background:#fbf6ec;color:#8c641f;border-color:#e9ddc3}
.dqc-break:hover:not(:disabled){background:#f4ecd9}
.dqc-resume{background:#edf4ef;color:var(--green);border-color:#cddfd4}
.dqc-resume:hover:not(:disabled){background:#dfeee4}
.dqc-break-alert{max-width:1200px;margin:0 auto 16px;display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border:1px solid #e9ddc3;border-radius:10px;background:#fbf6ec;color:#8c641f}
.dqc-break-alert svg{flex-shrink:0;margin-top:2px}
.dqc-break-alert strong{display:block;font-size:14px;font-weight:600}
.dqc-break-alert p{font-size:12px;line-height:1.6;margin-top:4px!important}
@media(max-width:600px){.dqc .dqc-header{flex-wrap:wrap}.dqc-header-actions{width:100%}.dqc-header-actions>button{flex:1}}

.dqc{--ink:#193f39;--green:#216959;--muted:#61716b;--line:#e2e8e2;background:#f6f7f3;color:var(--ink);padding:24px;min-height:100%;font-family:inherit;line-height:1.5}
.dqc *{box-sizing:border-box}
.dqc h1,.dqc h2,.dqc h3,.dqc p{margin:0}
.dqc button,.dqc input{font:inherit}
.dqc button{cursor:pointer;transition:background-color .15s ease}
.dqc button:disabled{opacity:.5;cursor:not-allowed}
.dqc button:focus-visible,.dqc input:focus-visible{outline:3px solid #85b3a5;outline-offset:3px}
.dqc-header{max-width:1200px;margin:0 auto 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.dqc h1{font-size:25px;font-weight:650;letter-spacing:-.7px}
.dqc-header p{font-size:12px;color:var(--muted);margin-top:4px}
.dqc-workspace{max-width:1200px;margin:auto;display:grid;grid-template-columns:minmax(280px,.85fr) minmax(0,1.5fr);gap:20px;align-items:start}
.dqc-current,.dqc-list-panel{min-width:0;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.dqc-current{position:sticky;top:20px}
.dqc-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line)}
.dqc h2{font-size:14px;font-weight:600}
.dqc-state{font-size:12px;color:var(--green);background:#edf4ef;padding:3px 8px;border-radius:6px}
.dqc-patient{padding:24px 20px 20px}
.dqc-patient-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.dqc-token{font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-.4px;overflow-wrap:anywhere}
.dqc-badge{font-size:11px;font-weight:500;background:#f1f5f1;color:#546b60;padding:4px 7px;border-radius:5px;white-space:nowrap}
.dqc-emergency{color:#9f342d;background:#fff0ed}
.dqc-patient h3,.dqc-next h3{font-size:21px;line-height:1.35;font-weight:600;overflow-wrap:anywhere}
.dqc-patient-meta{display:flex;flex-wrap:wrap;gap:6px 14px;color:var(--muted);font-size:13px;margin-top:12px}
.dqc-patient-meta span,.dqc-time{display:flex;align-items:center;gap:6px}
.dqc-time{font-size:12px;color:var(--muted);margin-top:14px!important;flex-wrap:wrap}
.dqc-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:0 20px 20px}
.dqc-primary,.dqc-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 14px;border-radius:8px;font-size:13px!important;font-weight:600!important}
.dqc-primary{background:var(--green);border:1px solid var(--green);color:#fff;width:100%}
.dqc-primary:hover:not(:disabled){background:#174f43}
.dqc-secondary{background:#fff;border:1px solid var(--line);color:var(--ink)}
.dqc-secondary:hover:not(:disabled){background:#f0f4ef}
.dqc button svg{flex-shrink:0}
.dqc-premium-link{display:flex;align-items:center;gap:6px;border:0;background:none;color:var(--muted);font-size:12px!important;min-height:44px;padding:8px 20px;text-align:left}
.dqc-current>.dqc-premium-link{border-top:1px solid var(--line);width:100%}
.dqc-premium-note{padding:12px 20px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}
.dqc-premium-note .dqc-premium-link{padding-left:0;text-decoration:underline}
.dqc-next{padding:24px 20px}
.dqc-next>svg{color:var(--green);margin-bottom:12px}
.dqc-next>p{font-size:13px;color:var(--muted);margin-top:8px}
.dqc-next>.dqc-primary{margin-top:22px}
.dqc-caption{display:block;font-size:12px;color:var(--muted);margin-bottom:8px}
.dqc-notice{display:flex;align-items:flex-start;gap:10px;padding:14px 18px;background:#f1f6f1;border-bottom:1px solid var(--line)}
.dqc-notice>svg{flex-shrink:0;margin-top:2px;color:var(--green)}
.dqc-notice strong{font-size:13px;font-weight:600}
.dqc-notice p{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.6}
.dqc-notice small{display:block;font-size:12px;margin-top:4px}
.dqc-notice-late{background:#fbf6ec}
.dqc-notice-late>svg,.dqc-notice-late small{color:#8c641f}
.dqc-tabs{display:flex;gap:12px;padding:0 18px;border-bottom:1px solid var(--line)}
.dqc-tabs button{min-height:50px;flex:1;display:flex;justify-content:center;align-items:center;gap:7px;padding:10px 0;border:0;border-bottom:2px solid transparent;background:none;color:var(--muted);font-size:13px;font-weight:500}
.dqc-tabs button[aria-pressed=true]{border-bottom-color:var(--green);color:var(--green);font-weight:650}
.dqc-tabs span{font-size:11px;background:#f1f4f0;border-radius:5px;min-width:21px;padding:1px 4px}
.dqc-search{display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:8px;padding:0 12px;margin:16px 18px 0;color:var(--muted)}
.dqc-search input{height:44px;min-width:0;width:100%;border:0;background:none;color:var(--ink);font-size:14px}
.dqc-list-note{padding:10px 18px!important;font-size:11px;color:var(--muted);line-height:1.6}
.dqc-list{padding:0 18px 8px}
.dqc-row{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:12px;align-items:start;padding:15px 0;border-top:1px solid var(--line)}
.dqc-row-token{font-size:14px;font-weight:650;overflow-wrap:anywhere}
.dqc-row-person{min-width:0}
.dqc-row h3{font-size:14px;font-weight:600;overflow-wrap:anywhere}
.dqc-row p{font-size:12px;color:var(--muted);margin-top:3px;overflow-wrap:anywhere}
.dqc-row small{display:block;font-size:12px;color:var(--muted);margin-top:4px}
.dqc-row .dqc-due-text{color:#8c641f}
.dqc-row .dqc-missed-text{color:#a33b2f;font-weight:600}
.dqc-call-small{display:inline-flex;align-items:center;justify-content:center;min-height:34px;border-radius:7px;border:1px solid #ead6c0;background:#fff8ef;color:#865025;font-size:12px!important;font-weight:650!important;padding:6px 10px}
.dqc-call-small:hover:not(:disabled){background:#fbe9d2}
.dqc-notice-missed{background:#fff8ef}
.dqc-notice-missed>svg,.dqc-notice-missed small{color:#865025}
.dqc-done{color:var(--green);margin-top:2px}
.dqc-empty{min-height:150px;padding:24px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;text-align:center;font-size:13px;color:var(--muted)}
.dqc-error,.dqc-recovery{max-width:1200px;margin:0 auto 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1px solid #ead6c0;background:#fff8ef;border-radius:10px;padding:12px 16px;color:#865025;font-size:13px}
.dqc-error>svg{flex-shrink:0}
.dqc-error p{font-size:12px;margin-top:3px}
.dqc-recovery{justify-content:space-between}
.dqc-spin{animation:dqc-spin 1s linear infinite}
@keyframes dqc-spin{to{transform:rotate(360deg)}}
@media(max-width:800px){.dqc{padding:18px 14px}.dqc-header{margin-bottom:18px}.dqc-workspace{grid-template-columns:1fr;gap:16px}.dqc-current{position:static}.dqc h1{font-size:23px}.dqc-search input{font-size:16px}}
@media(max-width:420px){.dqc{padding:16px 10px}.dqc-header{gap:8px}.dqc-header p{font-size:11px}.dqc-header>.dqc-secondary{padding:10px}.dqc-patient,.dqc-next{padding:20px 16px}.dqc-section-title{padding:14px 16px}.dqc-actions{padding:0 16px 16px}.dqc-row{grid-template-columns:62px minmax(0,1fr);gap:4px 10px}.dqc-row>.dqc-badge,.dqc-row>.dqc-done{grid-column:2;justify-self:start}.dqc-tabs{gap:8px;padding:0 14px}.dqc-list{padding:0 14px 6px}.dqc-search{margin:14px 14px 0}}
@media(prefers-reduced-motion:reduce){.dqc *{animation:none!important;transition:none!important}}
`;
