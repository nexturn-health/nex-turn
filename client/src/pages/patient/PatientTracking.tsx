import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Loader2,
    RefreshCw,
    Ticket,
    Users,
    Wifi,
    WifiOff,
} from "lucide-react";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { useParams } from "react-router-dom";

import {
    trackPatientQueue,
    type PatientTrackingData,
} from "../../services/patientTracking.api";

import {
    socket,
    joinPatientQueue,
    leavePatientQueue,
} from "../../socket/socket";

// ============================================================
// SHIFT TIME FORMATTING
// ============================================================

const formatShiftTime = (
    time24?: string,
): string | null => {
    if (!time24) {
        return null;
    }

    const [hoursStr, minutesStr] =
        time24.split(":");

    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {
        return null;
    }

    const period =
        hours >= 12
            ? "PM"
            : "AM";

    const displayHours =
        hours % 12 === 0
            ? 12
            : hours % 12;

    const displayMinutes =
        minutes
            .toString()
            .padStart(2, "0");

    return `${displayHours}:${displayMinutes} ${period}`;
};

// ============================================================
// PATIENT TRACKING
// ============================================================

const PatientTracking = () => {
    const {
        trackingToken,
    } = useParams<{
        trackingToken: string;
    }>();

    // ========================================================
    // STATE
    // ========================================================

    const [queue, setQueue] =
        useState<PatientTrackingData | null>(
            null,
        );

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const [isLive, setIsLive] =
        useState(false);

    // ========================================================
    // LOAD QUEUE
    // ========================================================

    const loadQueue = useCallback(
        async (
            showRefreshing = false,
        ) => {
            if (!trackingToken) {
                setError(
                    "Invalid tracking link",
                );

                setLoading(false);

                return;
            }

            try {
                if (showRefreshing) {
                    setRefreshing(true);
                }

                const data =
                    await trackPatientQueue(
                        trackingToken,
                    );

                setQueue(data);

                setError("");
            } catch (error: any) {
                console.error(
                    "Patient tracking error:",
                    error,
                );

                setError(
                    error?.response
                        ?.data?.message ||
                        "Unable to load queue",
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [trackingToken],
    );

    // ========================================================
    // INITIAL LOAD
    // ========================================================

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    // ========================================================
    // SOCKET + LIVE TRACKING
    // ========================================================

    useEffect(() => {
        if (!trackingToken) {
            return;
        }

        let isMounted = true;

        // ====================================================
        // SOCKET CONNECT
        // ====================================================

        const handleConnect = () => {
            if (!isMounted) {
                return;
            }

            console.log(
                "PATIENT TRACKING SOCKET CONNECTED",
            );

            setIsLive(true);

            // Join this patient's private queue room.
            joinPatientQueue(
                trackingToken,
            );

            // Reload immediately after reconnect.
            loadQueue();
        };

        // ====================================================
        // SOCKET DISCONNECT
        // ====================================================

        const handleDisconnect = () => {
            if (!isMounted) {
                return;
            }

            console.log(
                "PATIENT TRACKING SOCKET DISCONNECTED",
            );

            setIsLive(false);
        };

        // ====================================================
        // QUEUE STATUS
        // ====================================================

        const handleQueueStatus = () => {
            if (!isMounted) {
                return;
            }

            console.log(
                "QUEUE STATUS UPDATE RECEIVED",
            );

            loadQueue();
        };

        // ====================================================
        // QUEUE UPDATED
        // ====================================================

        const handleQueueUpdated = (
            data: any,
        ) => {
            if (!isMounted) {
                return;
            }

            // If the event belongs to another
            // patient queue, ignore it.
            if (
                data?.trackingToken &&
                data.trackingToken !==
                    trackingToken
            ) {
                return;
            }

            console.log(
                "QUEUE UPDATED EVENT RECEIVED:",
                data,
            );

            loadQueue();
        };

        // ====================================================
        // DOCTOR STATUS
        // ====================================================

        const handleDoctorStatus = (
            data: {
                doctorId: string;
                doctorName?: string;
                isOnline: boolean;
                lastSeenAt?: string;
                offlineSince?:
                    | string
                    | null;
            },
        ) => {
            if (!isMounted) {
                return;
            }

            // We need a loaded queue to know
            // which doctor belongs to this patient.
            const currentDoctorId =
                queue?.doctorId?._id;

            if (
                currentDoctorId &&
                data.doctorId !==
                    currentDoctorId
            ) {
                return;
            }

            console.log(
                "DOCTOR STATUS UPDATE:",
                data,
            );

            // ------------------------------------------------
            // Update UI immediately.
            // ------------------------------------------------

            setQueue(
                (previous) => {
                    if (!previous) {
                        return previous;
                    }

                    return {
                        ...previous,

                        doctorOnline:
                            data.isOnline,

                        doctorOfflineSince:
                            data.offlineSince ??
                            null,
                    };
                },
            );

            // ------------------------------------------------
            // Reload from backend.
            //
            // Backend recalculates:
            //
            // - patients ahead
            // - average consultation time
            // - offline duration
            // - estimated wait
            // - estimated turn time
            // ------------------------------------------------

            loadQueue();
        };

        // ====================================================
        // LISTENERS
        // ====================================================

        socket.on(
            "connect",
            handleConnect,
        );

        socket.on(
            "disconnect",
            handleDisconnect,
        );

        socket.on(
            "queue:status",
            handleQueueStatus,
        );

        socket.on(
            "queue:updated",
            handleQueueUpdated,
        );

        socket.on(
            "doctor:status",
            handleDoctorStatus,
        );

        // ====================================================
        // CONNECT / RECONNECT
        // ====================================================

        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        // ====================================================
        // FALLBACK POLLING
        //
        // Socket.IO is primary.
        // Polling is only a safety net.
        // ====================================================

        const refreshInterval =
            window.setInterval(() => {
                if (!isMounted) {
                    return;
                }

                // Don't constantly hit the API
                // while Socket.IO is working.
                if (!socket.connected) {
                    loadQueue();
                }
            }, 10000);

        // ====================================================
        // CLEANUP
        // ====================================================

        return () => {
            isMounted = false;

            window.clearInterval(
                refreshInterval,
            );

            // Leave patient queue room.
            leavePatientQueue(
                trackingToken,
            );

            // Remove listeners.
            socket.off(
                "connect",
                handleConnect,
            );

            socket.off(
                "disconnect",
                handleDisconnect,
            );

            socket.off(
                "queue:status",
                handleQueueStatus,
            );

            socket.off(
                "queue:updated",
                handleQueueUpdated,
            );

            socket.off(
                "doctor:status",
                handleDoctorStatus,
            );

            setIsLive(false);
        };
    }, [
        trackingToken,
        loadQueue,
    ]);

    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">

                        <Loader2
                            size={25}
                            className="animate-spin text-blue-600"
                        />

                    </div>

                    <p className="mt-3 text-sm font-medium text-slate-500">
                        Loading your appointment...
                    </p>

                </div>
            </div>
        );
    }

    // ========================================================
    // ERROR
    // ========================================================

    if (
        error ||
        !queue
    ) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">

                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">

                        <AlertCircle
                            size={28}
                            className="text-red-500"
                        />

                    </div>

                    <h1 className="mt-4 text-xl font-bold text-slate-900">
                        Tracking unavailable
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {error ||
                            "This tracking link is no longer valid."}
                    </p>

                </div>

            </div>
        );
    }

    // ========================================================
    // QUEUE STATUS
    // ========================================================

    const isWaiting =
        queue.status ===
        "WAITING";

    const isCalled =
        queue.status ===
        "CALLED";

    const isServing =
        queue.status ===
        "SERVING";

    const isCompleted =
        queue.status ===
        "COMPLETED";

    const isSkipped =
        queue.status ===
        "SKIPPED";

    // ========================================================
    // DOCTOR
    // ========================================================

    const doctorName =
        queue.doctorId?.name ||
        "your doctor";

    const doctorOnline =
        queue.doctorOnline === true;

    const doctorShiftStartTime =
        formatShiftTime(
            queue.doctorShiftStartTime ??
                undefined,
        );

    const offlineMinutes =
        queue.offlineMinutes ??
        0;

    // ========================================================
    // MAIN
    // ========================================================

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ================================================= */}
            {/* HEADER */}
            {/* ================================================= */}

            <header className="border-b border-slate-200 bg-white">

                <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4">

                    <div className="flex items-center gap-2.5">

                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 sm:h-10 sm:w-10 sm:rounded-xl">

                            <span className="text-sm sm:text-lg">
                                🏥
                            </span>

                        </div>

                        <div>

                            <h1 className="text-sm font-bold text-slate-900 sm:text-base">
                                NexTurn
                            </h1>

                            <p className="hidden text-xs text-slate-500 sm:block">
                                Patient Queue
                            </p>

                        </div>

                    </div>

                    {/* LIVE CONNECTION */}

                    <div
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs ${
                            isLive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                    >

                        {isLive ? (
                            <>
                                <Wifi size={11} />
                                Live
                            </>
                        ) : (
                            <>
                                <WifiOff size={11} />
                                Offline
                            </>
                        )}

                    </div>

                </div>

            </header>

            {/* ================================================= */}
            {/* MAIN */}
            {/* ================================================= */}

            <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-8">

                {/* ================================================= */}
                {/* DOCTOR STATUS */}
                {/* ================================================= */}

                <section
                    className={`rounded-2xl border p-3.5 sm:rounded-3xl sm:p-5 ${
                        doctorOnline
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-red-200 bg-red-50"
                    }`}
                >

                    <div className="flex items-start gap-3">

                        <span
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                doctorOnline
                                    ? "animate-pulse bg-emerald-500"
                                    : "bg-red-500"
                            }`}
                        />

                        <div className="min-w-0">

                            <p
                                className={`text-sm font-bold sm:text-base ${
                                    doctorOnline
                                        ? "text-emerald-900"
                                        : "text-red-900"
                                }`}
                            >
                                Dr. {doctorName} is{" "}
                                {doctorOnline
                                    ? "online and seeing patients"
                                    : "offline"}
                            </p>

                            {/* ===================================== */}
                            {/* DOCTOR ONLINE */}
                            {/* ===================================== */}

                            {doctorOnline && (
                                <p className="mt-1 text-xs leading-5 text-emerald-800 sm:text-sm">
                                    The doctor is currently
                                    available. Your queue
                                    will update automatically.
                                </p>
                            )}

                            {/* ===================================== */}
                            {/* DOCTOR OFFLINE */}
                            {/* ===================================== */}

                            {!doctorOnline && (
                                <div className="mt-1">

                                    <p className="text-xs leading-5 text-red-800 sm:text-sm">
                                        {doctorShiftStartTime
                                            ? `OPD usually starts around ${doctorShiftStartTime}.`
                                            : "The doctor is currently unavailable."}
                                    </p>

                                    {offlineMinutes >
                                        0 && (
                                        <p className="mt-1 text-xs font-semibold text-red-700 sm:text-sm">
                                            Doctor has been
                                            offline for
                                            approximately{" "}
                                            {
                                                offlineMinutes
                                            }{" "}
                                            {offlineMinutes ===
                                            1
                                                ? "minute"
                                                : "minutes"}
                                            .
                                        </p>
                                    )}

                                    <p className="mt-1 text-[11px] leading-5 text-red-600 sm:text-xs">
                                        Your estimated
                                        waiting time is
                                        being adjusted
                                        automatically.
                                    </p>

                                </div>
                            )}

                        </div>

                    </div>

                </section>

                {/* ================================================= */}
                {/* APPOINTMENT CARD */}
                {/* ================================================= */}

                <section className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-5 sm:rounded-3xl">

                    <div className="p-4 sm:p-8">

                        {/* PATIENT + DOCTOR */}

                        <div>

                            <p className="text-[11px] font-medium text-slate-400 sm:text-sm">
                                Hello,
                            </p>

                            <h2 className="mt-0.5 text-lg font-bold text-slate-900 sm:text-3xl">
                                {queue.patient.name}
                            </h2>

                            <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-base">

                                Your appointment with{" "}

                                <span className="font-bold text-slate-900">
                                    Dr. {doctorName}
                                </span>

                            </p>

                        </div>

                        {/* DEPARTMENT + TOKEN */}

                        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">

                            {/* DEPARTMENT */}

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:rounded-2xl sm:p-4">

                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                                    Department
                                </p>

                                <p className="mt-1 truncate text-sm font-bold text-slate-900 sm:mt-2 sm:text-base">
                                    {queue.department.name}
                                </p>

                            </div>

                            {/* TOKEN */}

                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 sm:rounded-2xl sm:p-4">

                                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500 sm:text-xs">
                                    Token Number
                                </p>

                                <p className="mt-0.5 text-2xl font-black tracking-wide text-blue-600 sm:mt-1 sm:text-4xl">
                                    {queue.tokenLabel}
                                </p>

                            </div>

                        </div>

                        {/* REFRESH */}

                        <button
                            type="button"
                            onClick={() =>
                                loadQueue(
                                    true,
                                )
                            }
                            disabled={
                                refreshing
                            }
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-5 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-sm"
                        >

                            <RefreshCw
                                size={15}
                                className={
                                    refreshing
                                        ? "animate-spin"
                                        : ""
                                }
                            />

                            {refreshing
                                ? "Refreshing..."
                                : "Refresh Queue"}

                        </button>

                    </div>

                </section>

                {/* ================================================= */}
                {/* CURRENTLY SERVING */}
                {/* ================================================= */}

                {!isSkipped &&
                    !isCompleted && (
                        <section className="mt-3 rounded-2xl bg-blue-600 p-4 text-center shadow-sm sm:mt-5 sm:rounded-3xl sm:p-8">

                            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-100 sm:text-xs">
                                Currently Serving
                            </p>

                            <p className="mt-1 text-4xl font-black leading-none text-white sm:mt-3 sm:text-6xl">
                                {queue.currentServingToken ||
                                    "--"}
                            </p>

                            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[9px] text-blue-100 sm:mt-3 sm:gap-2 sm:text-xs">

                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 sm:h-2 sm:w-2" />

                                Live doctor queue

                            </div>

                        </section>
                    )}

                {/* ================================================= */}
                {/* QUEUE STATS */}
                {/* ================================================= */}

                {isWaiting && (
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-4">

                        {/* PATIENTS AHEAD */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6">

                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 sm:h-11 sm:w-11 sm:rounded-xl">

                                <Users
                                    size={17}
                                    className="text-blue-600 sm:size-[21px]"
                                />

                            </div>

                            <p className="mt-2.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:mt-4 sm:text-xs">
                                Patients Ahead
                            </p>

                            <p className="mt-0.5 text-2xl font-black text-slate-900 sm:mt-1 sm:text-3xl">
                                {
                                    queue.patientsAhead
                                }
                            </p>

                        </div>

                        {/* WAIT */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6">

                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 sm:h-11 sm:w-11 sm:rounded-xl">

                                <Clock
                                    size={17}
                                    className="text-orange-500 sm:size-[21px]"
                                />

                            </div>

                            <p className="mt-2.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:mt-4 sm:text-xs">
                                Estimated Wait
                            </p>

                            <p className="mt-0.5 text-2xl font-black text-slate-900 sm:mt-1 sm:text-3xl">

                                {
                                    queue.estimatedWaitTime ??
                                    0
                                }

                                <span className="ml-1 text-[10px] font-normal text-slate-400 sm:text-sm">
                                    min
                                </span>

                            </p>

                        </div>

                    </div>
                )}

                {/* ================================================= */}
                {/* OFFLINE WAIT INFORMATION */}
                {/* ================================================= */}

                {isWaiting &&
                    !doctorOnline &&
                    offlineMinutes >
                        0 && (
                        <section className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 sm:mt-5 sm:rounded-3xl sm:p-5">

                            <div className="flex items-start gap-3">

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 sm:h-10 sm:w-10 sm:rounded-xl">

                                    <WifiOff
                                        size={16}
                                        className="text-red-600 sm:size-[20px]"
                                    />

                                </div>

                                <div>

                                    <p className="text-xs font-bold text-red-900 sm:text-sm">
                                        Doctor currently
                                        offline
                                    </p>

                                    <p className="mt-1 text-[11px] leading-5 text-red-700 sm:text-xs sm:leading-5">
                                        Estimated wait has
                                        been adjusted for
                                        the doctor's offline
                                        time.
                                    </p>

                                    <p className="mt-1.5 text-[11px] font-semibold text-red-800 sm:text-xs">
                                        Offline duration:{" "}
                                        {
                                            offlineMinutes
                                        }{" "}
                                        {offlineMinutes ===
                                        1
                                            ? "minute"
                                            : "minutes"}
                                    </p>

                                </div>

                            </div>

                        </section>
                    )}

                {/* ================================================= */}
                {/* STATUS CARD */}
                {/* ================================================= */}

                <section
                    className={`mt-3 rounded-2xl border p-4 text-center shadow-sm sm:mt-5 sm:rounded-3xl sm:p-6 ${
                        isCalled
                            ? "border-blue-200 bg-blue-50"
                            : isServing
                                ? "border-emerald-200 bg-emerald-50"
                                : isCompleted
                                    ? "border-emerald-200 bg-emerald-50"
                                    : isSkipped
                                        ? "border-amber-200 bg-amber-50"
                                        : "border-blue-100 bg-white"
                    }`}
                >

                    {/* CALLED */}

                    {isCalled && (
                        <>
                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 sm:h-14 sm:w-14 sm:rounded-2xl">

                                <Ticket
                                    size={20}
                                    className="text-blue-600 sm:size-[30px]"
                                />

                            </div>

                            <h3 className="mt-2 text-base font-bold text-blue-900 sm:mt-4 sm:text-xl">
                                Your Token Has Been Called
                            </h3>

                            <p className="mt-1 text-[10px] text-blue-800 sm:mt-2 sm:text-sm">
                                Please proceed to Dr.{" "}
                                {doctorName}'s
                                room.
                            </p>
                        </>
                    )}

                    {/* SERVING */}

                    {isServing && (
                        <>
                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 sm:h-14 sm:w-14 sm:rounded-2xl">

                                <CheckCircle2
                                    size={20}
                                    className="text-emerald-600 sm:size-[30px]"
                                />

                            </div>

                            <h3 className="mt-2 text-base font-bold text-emerald-900 sm:mt-4 sm:text-xl">
                                Your Consultation Is
                                In Progress
                            </h3>

                            <p className="mt-1 text-[10px] text-emerald-800 sm:mt-2 sm:text-sm">
                                Please proceed to Dr.{" "}
                                {doctorName}'s
                                room.
                            </p>
                        </>
                    )}

                    {/* COMPLETED */}

                    {isCompleted && (
                        <>
                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 sm:h-14 sm:w-14 sm:rounded-2xl">

                                <CheckCircle2
                                    size={20}
                                    className="text-emerald-600 sm:size-[30px]"
                                />

                            </div>

                            <h3 className="mt-2 text-base font-bold text-emerald-900 sm:mt-4 sm:text-xl">
                                Appointment Completed
                            </h3>

                            <p className="mt-1 text-[10px] text-emerald-800 sm:mt-2 sm:text-sm">
                                Your consultation with
                                Dr.{" "}
                                {doctorName} has
                                been completed.
                            </p>
                        </>
                    )}

                    {/* SKIPPED */}

                    {isSkipped && (
                        <>
                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 sm:h-14 sm:w-14 sm:rounded-2xl">

                                <AlertCircle
                                    size={20}
                                    className="text-amber-600 sm:size-[30px]"
                                />

                            </div>

                            <h3 className="mt-2 text-base font-bold text-amber-900 sm:mt-4 sm:text-xl">
                                Token Skipped
                            </h3>

                            <p className="mt-1 text-[10px] text-amber-800 sm:mt-2 sm:text-sm">
                                Please contact
                                reception for
                                further assistance.
                            </p>
                        </>
                    )}

                    {/* WAITING */}

                    {isWaiting && (
                        <>
                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 sm:h-14 sm:w-14 sm:rounded-2xl">

                                <Clock
                                    size={20}
                                    className="text-blue-600 sm:size-[28px]"
                                />

                            </div>

                            <h3 className="mt-2 text-base font-bold text-slate-900 sm:mt-4 sm:text-xl">
                                You Are In The Queue
                            </h3>

                            <p className="mt-1 text-[10px] leading-4 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                                Please wait for your
                                turn. Your queue
                                position will update
                                automatically.
                            </p>
                        </>
                    )}

                </section>

                {/* ================================================= */}
                {/* PRIORITY + LIVE */}
                {/* ================================================= */}

                <div className="mt-3 flex items-center justify-between sm:mt-5">

                    {/* PRIORITY */}

                    {!isSkipped ? (
                        <div className="flex items-center gap-2">

                            <span className="text-[10px] font-medium text-slate-400 sm:text-xs">
                                Priority
                            </span>

                            <span
                                className={`rounded-full px-2.5 py-1 text-[9px] font-bold sm:px-3 sm:text-xs ${
                                    queue.priority ===
                                    "EMERGENCY"
                                        ? "bg-red-50 text-red-600"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                {queue.priority ===
                                "EMERGENCY"
                                    ? "Emergency"
                                    : "Normal"}
                            </span>

                        </div>
                    ) : (
                        <div />
                    )}

                    {/* LIVE STATUS */}

                    <div
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs ${
                            isLive
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                        }`}
                    >

                        <span
                            className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${
                                isLive
                                    ? "animate-pulse bg-emerald-500"
                                    : "bg-slate-400"
                            }`}
                        />

                        {isLive
                            ? "Live updates"
                            : "Reconnecting..."}

                    </div>

                </div>

                {/* ================================================= */}
                {/* FOOTER */}
                {/* ================================================= */}

                <p className="mt-2 text-center text-[9px] text-slate-400 sm:mt-3 sm:text-[11px]">
                    Queue information updates
                    automatically.
                </p>

            </main>
        </div>
    );
};

export default PatientTracking;