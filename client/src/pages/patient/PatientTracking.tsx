import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useParams,
} from "react-router-dom";

import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    Clock,
    HeartPulse,
    Loader2,
    RefreshCw,
    Stethoscope,
    Ticket,
    Users,
    Wifi,
    WifiOff,
} from "lucide-react";

import {
    trackPatientQueue,
    type PatientTrackingData,
} from "../../services/patientTracking.api";

import {
    socket,
    joinPatientQueue,
    leavePatientQueue,
} from "../../socket/socket";

/* ============================================================
   HELPERS
============================================================ */

function formatShiftTime(
    time?: string | null,
) {
    if (
        !time ||
        !/^\d{1,2}:\d{2}$/.test(
            time,
        )
    ) {
        return null;
    }

    const [
        hours,
        minutes,
    ] =
        time
            .split(":")
            .map(Number);

    if (
        hours > 23 ||
        minutes > 59
    ) {
        return null;
    }

    return `${hours % 12 || 12}:${String(
        minutes,
    ).padStart(
        2,
        "0",
    )} ${hours >= 12 ? "PM" : "AM"}`;
}

function formatDateTime(
    value?: string | null,
) {
    if (
        !value
    ) {
        return null;
    }

    if (
        /^\d{1,2}:\d{2}$/.test(
            value,
        )
    ) {
        return formatShiftTime(
            value,
        );
    }

    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour:
                "2-digit",
            minute:
                "2-digit",
        },
    );
}

function getErrorMessage(
    error: unknown,
) {
    const response =
        error as {
            response?: {
                data?: {
                    message?: unknown;
                };
            };
        };

    const message =
        response?.response?.data?.message;

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
    const {
        trackingToken,
    } =
        useParams<{
            trackingToken: string;
        }>();

    const [
        queue,
        setQueue,
    ] =
        useState<PatientTrackingData | null>(
            null,
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        refreshing,
        setRefreshing,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState("");

    const [
        isLive,
        setIsLive,
    ] =
        useState(false);

    const [
        lastUpdated,
        setLastUpdated,
    ] =
        useState<Date | null>(
            null,
        );

    const refreshQueue =
        useRef<(() => Promise<void>) | null>(
            null,
        );

    function handleManualRefresh(): void {
        const refresh =
            refreshQueue.current;

        if (
            refresh !== null
        ) {
            void refresh();
        }
    }

    useEffect(
        () => {
            let active =
                true;

            let requestInFlight =
                false;

            let refreshPending =
                false;

            let timer:
                number | undefined;

            let currentQueue:
                PatientTrackingData | null =
                null;

            setQueue(
                null,
            );

            setLoading(
                true,
            );

            setRefreshing(
                false,
            );

            setError(
                "",
            );

            setIsLive(
                false,
            );

            setLastUpdated(
                null,
            );

            if (
                !trackingToken
            ) {
                setError(
                    "This tracking link is incomplete. Please ask reception for a new link.",
                );

                setLoading(
                    false,
                );

                return;
            }

            const token: string =
                trackingToken;

            async function loadQueue(
                manual = false,
            ): Promise<void> {
                if (
                    !active
                ) {
                    return;
                }

                if (
                    manual
                ) {
                    setRefreshing(
                        true,
                    );
                }

                if (
                    requestInFlight
                ) {
                    refreshPending =
                        true;

                    return;
                }

                requestInFlight =
                    true;

                try {
                    const data =
                        await trackPatientQueue(
                            token,
                        );

                    if (
                        !active
                    ) {
                        return;
                    }

                    currentQueue =
                        data;

                    setQueue(
                        data,
                    );

                    setError(
                        "",
                    );

                    setLastUpdated(
                        new Date(),
                    );

                    if (
                        data.status ===
                        "COMPLETED" ||
                        data.status ===
                        "CANCELLED"
                    ) {
                        setLoading(
                            false,
                        );

                        setRefreshing(
                            false,
                        );

                        setIsLive(
                            false,
                        );

                        stopTracking();
                    }
                } catch (
                err
                ) {
                    if (
                        active
                    ) {
                        setError(
                            getErrorMessage(
                                err,
                            ),
                        );
                    }
                } finally {
                    requestInFlight =
                        false;

                    if (
                        active
                    ) {
                        setLoading(
                            false,
                        );

                        setRefreshing(
                            false,
                        );

                        if (
                            refreshPending
                        ) {
                            refreshPending =
                                false;

                            void loadQueue();
                        }
                    }
                }
            }

            refreshQueue.current =
                () =>
                    loadQueue(
                        true,
                    );

            function handleConnect() {
                if (
                    !active
                ) {
                    return;
                }

                setIsLive(
                    true,
                );

                void loadQueue();
            }

            function handleDisconnect() {
                if (
                    active
                ) {
                    setIsLive(
                        false,
                    );
                }
            }

            function handleQueueUpdate(
                data?: {
                    trackingToken?: string;
                    doctorId?: string;
                    reason?: string;
                },
            ) {
                if (
                    !active
                ) {
                    return;
                }

                if (
                    data?.trackingToken &&
                    data.trackingToken !==
                    token
                ) {
                    return;
                }

                void loadQueue();
            }

            function handleDoctorStatus(
                data?: {
                    doctorId?: string;
                    isOnline?: boolean;
                },
            ) {
                if (
                    !active ||
                    !data
                ) {
                    return;
                }

                const doctorId =
                    currentQueue?.doctorId?._id;

                if (
                    doctorId &&
                    data.doctorId &&
                    data.doctorId !==
                    doctorId
                ) {
                    return;
                }

                void loadQueue();
            }

            function handleDoctorTimingUpdated(
                data?: {
                    doctorId?: string;
                    hospitalId?: string;
                },
            ) {
                if (
                    !active
                ) {
                    return;
                }

                const doctorId =
                    currentQueue?.doctorId?._id;

                if (
                    doctorId &&
                    data?.doctorId &&
                    data.doctorId !==
                    doctorId
                ) {
                    return;
                }

                void loadQueue();
            }

            socket.on(
                "connect",
                handleConnect,
            );

            socket.on(
                "disconnect",
                handleDisconnect,
            );

            socket.on(
                "connect_error",
                handleDisconnect,
            );

            socket.on(
                "queue:updated",
                handleQueueUpdate,
            );

            socket.on(
                "queue:status",
                handleQueueUpdate,
            );

            socket.on(
                "user:status",
                handleDoctorStatus,
            );

            socket.on(
                "doctor:status",
                handleDoctorStatus,
            );

            socket.on(
                "doctor:timing-updated",
                handleDoctorTimingUpdated,
            );

            joinPatientQueue(
                token,
            );

            if (
                socket.connected
            ) {
                handleConnect();
            } else {
                void loadQueue();

                socket.connect();
            }

            timer =
                window.setInterval(
                    () => {
                        if (
                            active &&
                            !requestInFlight
                        ) {
                            void loadQueue();
                        }
                    },
                    5000,
                );

            function handleVisible() {
                if (
                    document.visibilityState ===
                    "visible"
                ) {
                    void loadQueue();
                }
            }

            document.addEventListener(
                "visibilitychange",
                handleVisible,
            );

            window.addEventListener(
                "online",
                handleVisible,
            );

            function stopTracking(): void {
                if (
                    !active
                ) {
                    return;
                }

                active =
                    false;

                refreshPending =
                    false;

                refreshQueue.current =
                    null;

                if (
                    timer !==
                    undefined
                ) {
                    window.clearInterval(
                        timer,
                    );
                }

                document.removeEventListener(
                    "visibilitychange",
                    handleVisible,
                );

                window.removeEventListener(
                    "online",
                    handleVisible,
                );

                socket.off(
                    "connect",
                    handleConnect,
                );

                socket.off(
                    "disconnect",
                    handleDisconnect,
                );

                socket.off(
                    "connect_error",
                    handleDisconnect,
                );

                socket.off(
                    "queue:updated",
                    handleQueueUpdate,
                );

                socket.off(
                    "queue:status",
                    handleQueueUpdate,
                );

                socket.off(
                    "user:status",
                    handleDoctorStatus,
                );

                socket.off(
                    "doctor:status",
                    handleDoctorStatus,
                );

                socket.off(
                    "doctor:timing-updated",
                    handleDoctorTimingUpdated,
                );

                leavePatientQueue(
                    token,
                );
            }

            return stopTracking;
        },
        [
            trackingToken,
        ],
    );

    const status =
        queue?.status;

    const isWaiting =
        status ===
        "WAITING";

    const isCalled =
        status ===
        "CALLED";

    const isServing =
        status ===
        "SERVING";

    const isCompleted =
        status ===
        "COMPLETED";

    const isSkipped =
        status ===
        "SKIPPED";

    const isCancelled =
        status ===
        "CANCELLED";

    const doctorName =
        queue?.doctorId?.name;

    const doctorLabel =
        doctorName
            ? /^dr\.?\s/i.test(
                doctorName,
            )
                ? doctorName
                : `Dr. ${doctorName}`
            : "your doctor";

    const doctorTiming =
        queue?.doctorTiming ||
        null;

    const appointment =
        queue?.appointment ||
        null;

    const scheduledStartTime =
        doctorTiming?.scheduledStartTime ||
        queue?.doctorShiftStartTime ||
        null;

    const scheduledEndTime =
        doctorTiming?.scheduledEndTime ||
        null;

    const shiftStartLabel =
        formatShiftTime(
            scheduledStartTime,
        );

    const shiftEndLabel =
        formatShiftTime(
            scheduledEndTime,
        );

    const appointmentTime =
        appointment?.appointmentTime ||
        appointment?.scheduledStartTime ||
        null;

    const appointmentTimeLabel =
        formatShiftTime(
            appointmentTime,
        ) ||
        appointmentTime;

    const estimatedTurnTimeLabel =
        formatDateTime(
            queue?.estimatedTurnTime,
        );

    const expectedDoctorStartLabel =
        formatDateTime(
            doctorTiming?.expectedDoctorStartAt,
        );

    const doctorOnline =
        doctorTiming?.isOnline ??
        queue?.doctorOnline;

    const offlineMinutes =
        queue?.offlineMinutes ??
        0;

    const lateByMinutes =
        doctorTiming?.lateByMinutes ??
        0;

    const averageServiceMinutes =
        doctorTiming?.averageServiceMinutes ??
        queue?.averageConsultationMinutes ??
        12;

    const isDoctorLate =
        Boolean(
            doctorTiming?.isLate ||
            lateByMinutes > 0,
        );

    let statusTitle =
        "Appointment status";

    let statusMessage =
        "Please contact reception if you need help with your appointment.";

    if (
        isWaiting
    ) {
        statusTitle =
            "You're in the queue";

        statusMessage =
            "Please stay nearby. Your position and wait time update automatically.";
    } else if (
        isCalled
    ) {
        statusTitle =
            "It's your turn";

        statusMessage =
            `Your token has been called. Please proceed to ${doctorLabel}'s room.`;
    } else if (
        isServing
    ) {
        statusTitle =
            "Consultation in progress";

        statusMessage =
            `Your appointment with ${doctorLabel} is in progress.`;
    } else if (
        isCompleted
    ) {
        statusTitle =
            "Appointment completed";

        statusMessage =
            `Your consultation with ${doctorLabel} is complete.`;
    } else if (
        isSkipped
    ) {
        statusTitle =
            "Your token was skipped";

        statusMessage =
            "Please speak with reception for help with your next step.";
    } else if (
        isCancelled
    ) {
        statusTitle =
            "Appointment cancelled";

        statusMessage =
            "Please contact reception if you need to book again.";
    }

    return (
        <div className="pt-page">
            <PatientTrackingStyles />

            <header className="pt-header">
                <div className="pt-brand">
                    <span className="pt-brand-icon">
                        <HeartPulse
                            size={22}
                            aria-hidden="true"
                        />
                    </span>

                    <div>
                        <strong>
                            NextSynq Health
                        </strong>

                        <span>
                            Patient queue
                        </span>
                    </div>
                </div>

                <span
                    className="pt-connection"
                    data-live={
                        isLive
                    }
                    role="status"
                >
                    {isCompleted ? (
                        <CheckCircle2
                            size={14}
                        />
                    ) : isLive ? (
                        <Wifi size={14} />
                    ) : (
                        <WifiOff
                            size={14}
                        />
                    )}

                    {isCompleted
                        ? "Completed"
                        : isLive
                            ? "Live updates"
                            : "Connecting…"}
                </span>
            </header>

            <main className="pt-main">
                {loading ? (
                    <section
                        className="pt-empty"
                        role="status"
                    >
                        <Loader2
                            className="pt-spin"
                            size={30}
                        />

                        <h1>
                            Loading your appointment
                        </h1>

                        <p>
                            Checking the latest queue information…
                        </p>
                    </section>
                ) : !queue ? (
                    <section className="pt-empty">
                        <AlertCircle
                            size={30}
                        />

                        <h1>
                            Tracking unavailable
                        </h1>

                        <p role="alert">
                            {error ||
                                "This tracking link is no longer available. Please contact reception."}
                        </p>

                        {trackingToken && (
                            <button
                                className="pt-button"
                                type="button"
                                disabled={
                                    refreshing
                                }
                                onClick={
                                    handleManualRefresh
                                }
                            >
                                <RefreshCw
                                    size={17}
                                    className={
                                        refreshing
                                            ? "pt-spin"
                                            : ""
                                    }
                                />

                                {refreshing
                                    ? "Trying again…"
                                    : "Try again"}
                            </button>
                        )}
                    </section>
                ) : (
                    <>
                        <div className="pt-greeting">
                            <p className="pt-eyebrow">
                                YOUR APPOINTMENT
                            </p>

                            <h1>
                                Hello,{" "}
                                {
                                    queue.patient
                                        .name
                                }
                            </h1>

                            <p>
                                Follow your turn without the guesswork.
                            </p>
                        </div>

                        {error && (
                            <div
                                className="pt-error"
                                role="alert"
                            >
                                <AlertCircle
                                    size={19}
                                />

                                <div>
                                    <strong>
                                        Showing your last update
                                    </strong>

                                    <p>
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}

                        <section
                            className="pt-ticket"
                            aria-label="Your appointment details"
                        >
                            <div className="pt-token-panel">
                                <span className="pt-eyebrow">
                                    YOUR TOKEN
                                </span>

                                <strong className="pt-token">
                                    {
                                        queue.tokenLabel
                                    }
                                </strong>

                                {!isSkipped && (
                                    <span
                                        className="pt-priority"
                                        data-emergency={
                                            queue.priority ===
                                            "EMERGENCY"
                                        }
                                    >
                                        {queue.priority ===
                                            "EMERGENCY"
                                            ? "Emergency priority"
                                            : "Normal priority"}
                                    </span>
                                )}
                            </div>

                            <div className="pt-appointment">
                                <span className="pt-eyebrow">
                                    CONSULTATION WITH
                                </span>

                                <h2>
                                    {doctorName
                                        ? doctorLabel
                                        : "Doctor to be confirmed"}
                                </h2>

                                <p>
                                    {
                                        queue
                                            .department
                                            .name
                                    }
                                </p>

                                <span className="pt-detail-note">
                                    <Ticket
                                        size={15}
                                    />
                                    Keep your token handy
                                </span>
                            </div>
                        </section>

                        <section
                            className="pt-status"
                            data-status={
                                status
                            }
                            role={
                                isCalled
                                    ? "alert"
                                    : "status"
                            }
                            aria-atomic="true"
                        >
                            {queue.priority === "EMERGENCY" &&
                                !isCompleted &&
                                !isCancelled && (
                                    <section className="pt-emergency-alert">
                                        <strong>
                                            Emergency priority
                                        </strong>

                                        <p>
                                            Your token has been marked as emergency. Please stay ready and follow hospital staff instructions.
                                        </p>
                                    </section>
                                )}
                            <span className="pt-status-icon">
                                {isSkipped ? (
                                    <AlertCircle
                                        size={24}
                                    />
                                ) : isCalled ? (
                                    <Ticket
                                        size={24}
                                    />
                                ) : isServing ||
                                    isCompleted ? (
                                    <CheckCircle2
                                        size={24}
                                    />
                                ) : (
                                    <Clock
                                        size={24}
                                    />
                                )}
                            </span>

                            <div>
                                <h2>
                                    {
                                        statusTitle
                                    }
                                </h2>

                                <p>
                                    {
                                        statusMessage
                                    }
                                </p>
                            </div>
                        </section>

                        {(appointment ||
                            doctorTiming) &&
                            !isCompleted &&
                            !isCancelled && (
                                <div className="pt-live-grid">
                                    {appointment && (
                                        <section className="pt-info-card">
                                            <span className="pt-info-icon">
                                                <CalendarDays
                                                    size={
                                                        19
                                                    }
                                                />
                                            </span>

                                            <div>
                                                <p className="pt-eyebrow">
                                                    FIXED APPOINTMENT TIME
                                                </p>

                                                <h2>
                                                    {appointmentTimeLabel ||
                                                        "Reserved"}
                                                </h2>

                                                <p>
                                                    {appointment.message ||
                                                        "Your appointment time is fixed. Estimated turn time may change if doctor is late or queue is delayed."}
                                                </p>
                                            </div>
                                        </section>
                                    )}

                                    {doctorTiming && (
                                        <section
                                            className="pt-info-card"
                                            data-warning={
                                                isDoctorLate
                                            }
                                        >
                                            <span className="pt-info-icon">
                                                <Stethoscope
                                                    size={
                                                        19
                                                    }
                                                />
                                            </span>

                                            <div>
                                                <p className="pt-eyebrow">
                                                    DOCTOR TIMING
                                                </p>

                                                <h2>
                                                    {isDoctorLate
                                                        ? "Doctor is late today"
                                                        : doctorOnline
                                                            ? "Doctor is available"
                                                            : "Doctor timing update"}
                                                </h2>

                                                <p>
                                                    {doctorTiming.message ||
                                                        (isDoctorLate
                                                            ? `Doctor is running late today by ${lateByMinutes} minutes.`
                                                            : "Doctor timing is being updated live.")}
                                                </p>

                                                <div className="pt-mini-grid">
                                                    <span>
                                                        Start:{" "}
                                                        <strong>
                                                            {shiftStartLabel ||
                                                                "-"}
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        End:{" "}
                                                        <strong>
                                                            {shiftEndLabel ||
                                                                "-"}
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        Avg/patient:{" "}
                                                        <strong>
                                                            {
                                                                averageServiceMinutes
                                                            }{" "}
                                                            min
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        Expected start:{" "}
                                                        <strong>
                                                            {expectedDoctorStartLabel ||
                                                                shiftStartLabel ||
                                                                "-"}
                                                        </strong>
                                                    </span>
                                                </div>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}

                        {isWaiting && (
                            <div className="pt-stats pt-stats-three">
                                <section className="pt-stat">
                                    <Users
                                        size={21}
                                    />

                                    <p>
                                        Patients ahead
                                    </p>

                                    <strong>
                                        {queue.patientsAhead ??
                                            "—"}
                                    </strong>
                                </section>

                                <section className="pt-stat">
                                    <Clock
                                        size={21}
                                    />

                                    <p>
                                        Estimated wait
                                    </p>

                                    <strong>
                                        {queue.estimatedWaitTime ??
                                            "—"}

                                        {queue.estimatedWaitTime !=
                                            null && (
                                                <small>
                                                    min
                                                </small>
                                            )}
                                    </strong>
                                </section>

                                <section className="pt-stat">
                                    <CalendarDays
                                        size={21}
                                    />

                                    <p>
                                        Estimated turn
                                    </p>

                                    <strong className="pt-stat-time">
                                        {estimatedTurnTimeLabel ||
                                            "—"}
                                    </strong>
                                </section>
                            </div>
                        )}

                        {!isSkipped &&
                            !isCompleted &&
                            !isCancelled && (
                                <section
                                    className="pt-serving"
                                    aria-label="Currently serving"
                                >
                                    <div>
                                        <p className="pt-eyebrow">
                                            CURRENTLY SERVING
                                        </p>

                                        <p>
                                            {error ||
                                                !isLive
                                                ? "Last known queue update"
                                                : "Doctor's queue"}
                                        </p>
                                    </div>

                                    <strong>
                                        {queue.currentServingToken ||
                                            "—"}
                                    </strong>
                                </section>
                            )}

                        {!isCompleted &&
                            !isCancelled && (
                                <details
                                    className="pt-doctor"
                                    data-offline={
                                        doctorOnline ===
                                        false
                                    }
                                    data-late={
                                        isDoctorLate
                                    }
                                >
                                    <summary>
                                        <span
                                            className="pt-doctor-dot"
                                            data-online={
                                                doctorOnline ===
                                                true
                                            }
                                        />

                                        <span>
                                            {isDoctorLate
                                                ? `Doctor is late by ${lateByMinutes} min`
                                                : doctorOnline ===
                                                    true
                                                    ? "Doctor is available"
                                                    : doctorOnline ===
                                                        false
                                                        ? "Doctor is currently offline"
                                                        : "Availability not confirmed"}
                                        </span>

                                        <span
                                            className="pt-expand"
                                            aria-hidden="true"
                                        >
                                            +
                                        </span>
                                    </summary>

                                    <div className="pt-doctor-details">
                                        {doctorOnline ===
                                            true ? (
                                            <p>
                                                {
                                                    doctorLabel
                                                }{" "}
                                                is online.
                                            </p>
                                        ) : doctorOnline ===
                                            false ? (
                                            <>
                                                <p>
                                                    {shiftStartLabel
                                                        ? `OPD usually starts around ${shiftStartLabel}.`
                                                        : "Please check with reception if you need an update."}
                                                </p>

                                                {offlineMinutes >
                                                    0 && (
                                                        <p>
                                                            Offline
                                                            for
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
                                            </>
                                        ) : (
                                            <p>
                                                Please check with reception for the latest availability.
                                            </p>
                                        )}

                                        {isDoctorLate && (
                                            <p className="pt-muted">
                                                Your appointment time remains fixed. Only estimated turn time increases based on doctor delay and average consultation duration.
                                            </p>
                                        )}

                                        {isWaiting && (
                                            <p className="pt-muted">
                                                Wait times are estimates and can change as the queue moves.
                                            </p>
                                        )}
                                    </div>
                                </details>
                            )}

                        <footer className="pt-footer">
                            <div>
                                <p>
                                    {lastUpdated
                                        ? `Updated at ${lastUpdated.toLocaleTimeString(
                                            "en-IN",
                                            {
                                                hour:
                                                    "2-digit",
                                                minute:
                                                    "2-digit",
                                            },
                                        )}`
                                        : "Waiting for an update"}
                                </p>

                                <span>
                                    {isCompleted ||
                                        isCancelled
                                        ? "Tracking ended. You can close this page."
                                        : isLive
                                            ? "Queue updates automatically"
                                            : "Reconnecting · checking every 5 seconds"}
                                </span>
                            </div>

                            {!isCompleted &&
                                !isCancelled && (
                                    <button
                                        type="button"
                                        className="pt-button"
                                        disabled={
                                            refreshing
                                        }
                                        onClick={
                                            handleManualRefresh
                                        }
                                    >
                                        <RefreshCw
                                            size={17}
                                            className={
                                                refreshing
                                                    ? "pt-spin"
                                                    : ""
                                            }
                                        />

                                        {refreshing
                                            ? "Refreshing…"
                                            : "Refresh queue"}
                                    </button>
                                )}
                        </footer>
                    </>
                )}
            </main>
        </div>
    );
}

/* ============================================================
   STYLES
============================================================ */

function PatientTrackingStyles() {
    return (
        <style>
            {`
    .pt-page {
        min-height: 100dvh;
        background: #f5f6f2;
        color: #173d39;
        font-family: "Inter", "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
    }

    .pt-page *,
    .pt-page *::before,
    .pt-page *::after {
        box-sizing: border-box;
    }

    .pt-page h1,
    .pt-page h2,
    .pt-page p {
        margin: 0;
    }

    .pt-page svg {
        flex-shrink: 0;
    }

    .pt-header {
        max-width: 820px;
        margin: auto;
        padding: 25px 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid #dfe6da;
    }

    .pt-brand {
        display: flex;
        align-items: center;
        gap: 11px;
    }

    .pt-brand-icon {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        background: #173d39;
        color: #edf3e6;
        border-radius: 13px;
    }

    .pt-brand strong {
        display: block;
        font-size: 15px;
        font-weight: 650;
        letter-spacing: -.3px;
    }

    .pt-brand div > span {
        display: block;
        font-size: 11px;
        color: #73816c;
        margin-top: 4px;
    }

    .pt-connection {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        border: 1px solid #dfe6da;
        background: #edf0e9;
        border-radius: 30px;
        color: #647361;
        font-size: 11px;
        white-space: nowrap;
    }

    .pt-connection[data-live="true"] {
        background: #eaf4e9;
        border-color: #d2e4cd;
        color: #416d42;
    }

    .pt-main {
        max-width: 764px;
        margin: auto;
        padding: 30px 28px 40px;
    }

    .pt-greeting {
        margin-bottom: 24px;
    }

    .pt-eyebrow {
        display: block;
        font-size: 10px;
        font-weight: 650;
        letter-spacing: 1.5px;
        color: #76846a;
    }

    .pt-greeting h1 {
        margin-top: 9px;
        font-size: clamp(23px, 4vw, 30px);
        line-height: 1.3;
        font-weight: 600;
        letter-spacing: -.8px;
        overflow-wrap: anywhere;
    }

    .pt-greeting > p:last-child {
        margin-top: 8px;
        font-size: 13px;
        line-height: 1.6;
        color: #718068;
    }

    .pt-ticket {
        display: grid;
        grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
        background: #fff;
        border: 1px solid #dbe4d5;
        border-radius: 20px;
        overflow: hidden;
    }

    .pt-token-panel {
        padding: 26px;
        background: #eaf0e1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        border-right: 1px dashed #c7d5bd;
    }

    .pt-token {
        display: block;
        margin: 9px 0 14px;
        font-size: clamp(36px, 7vw, 56px);
        font-weight: 650;
        line-height: 1.1;
        letter-spacing: -1.5px;
        overflow-wrap: anywhere;
        max-width: 100%;
    }

    .pt-priority {
        background: #ffffffa8;
        border-radius: 20px;
        padding: 6px 9px;
        font-size: 10px;
        color: #617551;
        line-height: 1.5;
    }

    .pt-priority[data-emergency="true"] {
        color: #a34639;
        background: #fcebe5;
    }

    .pt-appointment {
        padding: 26px;
        align-self: center;
        min-width: 0;
    }

    .pt-appointment h2 {
        margin-top: 10px;
        font-size: 19px;
        line-height: 1.5;
        font-weight: 600;
        overflow-wrap: anywhere;
    }

    .pt-appointment > p {
        margin-top: 6px;
        color: #708164;
        font-size: 13px;
        overflow-wrap: anywhere;
        line-height: 1.6;
    }

    .pt-detail-note {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 22px;
        color: #7b8971;
        font-size: 11px;
        line-height: 1.6;
    }

    .pt-status {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 22px;
        margin-top: 16px;
        border: 1px solid #d9e5d3;
        border-radius: 16px;
        background: #edf3e6;
    }

    .pt-status-icon {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: #ffffff9c;
        flex-shrink: 0;
    }

    .pt-status h2 {
        font-size: 17px;
        line-height: 1.5;
        font-weight: 600;
    }

    .pt-status p {
        font-size: 13px;
        margin-top: 5px;
        line-height: 1.7;
    }

    .pt-status[data-status="CALLED"] {
        background: #176957;
        border-color: #176957;
        color: white;
    }

    .pt-status[data-status="CALLED"] .pt-status-icon {
        background: #ffffff20;
    }

    .pt-status[data-status="SKIPPED"],
    .pt-status[data-status="CANCELLED"] {
        color: #805c27;
        background: #fbf1df;
        border-color: #ecddbf;
    }

    .pt-live-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-top: 16px;
    }

    .pt-info-card {
        display: flex;
        align-items: flex-start;
        gap: 13px;
        padding: 18px;
        border: 1px solid #d9e5d3;
        border-radius: 16px;
        background: #ffffff;
    }

    .pt-info-card[data-warning="true"] {
        background: #fff8e8;
        border-color: #eddcb6;
    }

    .pt-info-icon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: #edf3e6;
        color: #176957;
        flex-shrink: 0;
    }

    .pt-info-card[data-warning="true"] .pt-info-icon {
        background: #fbedd0;
        color: #986716;
    }

    .pt-info-card h2 {
        margin-top: 6px;
        font-size: 17px;
        line-height: 1.45;
        font-weight: 650;
    }

    .pt-info-card p {
        margin-top: 6px;
        color: #6d7d63;
        font-size: 12px;
        line-height: 1.7;
    }

    .pt-mini-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 13px;
    }

    .pt-mini-grid span {
        display: block;
        padding: 9px 10px;
        border-radius: 10px;
        background: #f5f7f1;
        color: #73816c;
        font-size: 11px;
        line-height: 1.5;
    }

    .pt-mini-grid strong {
        color: #25483e;
        font-weight: 650;
    }

    .pt-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-top: 16px;
    }

    .pt-stats-three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .pt-stat {
        padding: 22px;
        background: white;
        border: 1px solid #dfe6d7;
        border-radius: 16px;
    }

    .pt-stat > svg {
        color: #6b865a;
    }

    .pt-stat p {
        margin-top: 13px;
        font-size: 12px;
        color: #6e7e63;
    }

    .pt-stat strong {
        display: block;
        margin-top: 6px;
        font-size: 32px;
        font-weight: 600;
        line-height: 1.3;
    }

    .pt-stat-time {
        font-size: 22px !important;
        line-height: 1.45 !important;
    }

    .pt-stat small {
        margin-left: 7px;
        font-size: 13px;
        color: #7b8971;
        font-weight: 400;
    }

    .pt-serving {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 23px 26px;
        margin-top: 16px;
        background: #173d39;
        color: white;
        border-radius: 16px;
    }

    .pt-serving .pt-eyebrow {
        color: #cad9c1;
        font-size: 9px;
    }

    .pt-serving p:last-child {
        margin-top: 7px;
        color: #b8ccc1;
        font-size: 12px;
        line-height: 1.6;
    }

    .pt-serving strong {
        max-width: 55%;
        overflow-wrap: anywhere;
        font-size: 32px;
        font-weight: 600;
        letter-spacing: -.7px;
        text-align: right;
    }

    .pt-doctor {
        margin-top: 22px;
        background: #edf1e8;
        border: 1px solid #e0e6d9;
        border-radius: 13px;
        display: block;
        padding: 0;
    }

    .pt-doctor[data-offline="true"] {
        background: #faf3e7;
        border-color: #ebe0cd;
    }

    .pt-doctor[data-late="true"] {
        background: #fff8e8;
        border-color: #eddcb6;
    }

    .pt-doctor summary {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 14px 16px;
        min-height: 48px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        list-style: none;
    }

    .pt-doctor summary::-webkit-details-marker {
        display: none;
    }

    .pt-doctor summary:focus-visible {
        outline: 3px solid #38a992;
        outline-offset: 2px;
        border-radius: 12px;
    }

    .pt-doctor-dot {
        flex-shrink: 0;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #929886;
    }

    .pt-doctor-dot[data-online="true"] {
        background: #52845b;
    }

    .pt-doctor[data-offline="true"] .pt-doctor-dot,
    .pt-doctor[data-late="true"] .pt-doctor-dot {
        background: #b38a47;
    }

    .pt-expand {
        margin-left: auto;
        font-size: 20px;
        line-height: 1;
    }

    .pt-doctor[open] .pt-expand {
        transform: rotate(45deg);
    }

    .pt-doctor-details {
        padding: 0 16px 14px;
    }

    .pt-doctor-details p {
        margin-top: 5px;
        font-size: 12px;
        line-height: 1.7;
        color: #6c795f;
    }

    .pt-doctor .pt-muted {
        margin-top: 10px;
        color: #7a6a49;
    }

    .pt-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-top: 24px;
    }

    .pt-footer p {
        color: #536c52;
        font-size: 12px;
    }

    .pt-footer span {
        display: block;
        font-size: 11px;
        line-height: 1.6;
        color: #7c8972;
        margin-top: 5px;
    }

    .pt-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        gap: 8px;
        min-height: 46px;
        padding: 12px 16px;
        border: 1px solid #ceddc3;
        border-radius: 11px;
        background: #fff;
        color: #315d44;
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        touch-action: manipulation;
        transition: background .15s;
    }

    .pt-button:hover:not(:disabled) {
        background: #eaf0e1;
    }

    .pt-button:focus-visible {
        outline: 3px solid #38a992;
        outline-offset: 3px;
    }

    .pt-button:disabled {
        opacity: .6;
        cursor: not-allowed;
    }

    .pt-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        background: #fff;
        border: 1px solid #dfe6d7;
        border-radius: 20px;
        padding: 48px 24px;
        margin-top: 24px;
        text-align: center;
    }

    .pt-empty > svg {
        color: #628657;
    }

    .pt-empty h1 {
        font-size: 22px;
        font-weight: 600;
    }

    .pt-empty p {
        color: #74816c;
        font-size: 14px;
        line-height: 1.8;
    }

    .pt-error {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        margin-bottom: 16px;
        padding: 16px;
        border: 1px solid #efd7cd;
        border-radius: 12px;
        background: #fcf0eb;
        color: #964e3e;
        font-size: 13px;
        line-height: 1.7;
    }

    .pt-error p {
        margin-top: 4px;
    }

    @keyframes pt-spin {
        to {
            transform: rotate(360deg);
        }
    }

    .pt-spin {
        animation: pt-spin 1s linear infinite;
    }

    @media (max-width: 639px) {
        .pt-page {
            padding: 12px 12px max(12px, env(safe-area-inset-bottom));
            background: linear-gradient(120deg, #f2f5e9, #f7f8f1 55%, #e5efdf);
        }

        .pt-header {
            max-width: 480px;
            padding: 14px 16px;
            gap: 10px;
            background: #173d39;
            color: #e4f0df;
            border: 1px solid #173d39;
            border-radius: 17px 17px 0 0;
        }

        .pt-brand {
            gap: 8px;
        }

        .pt-brand-icon {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            background: #ffffff12;
        }

        .pt-brand strong {
            font-size: 13px;
        }

        .pt-brand div > span {
            color: #b1c9b9;
            font-size: 10px;
            margin-top: 2px;
        }

        .pt-connection,
        .pt-connection[data-live="true"] {
            font-size: 10px;
            padding: 6px 8px;
            color: #d5e6d6;
            border-color: #ffffff26;
            background: #ffffff0a;
        }

        .pt-main {
            max-width: 480px;
            padding: 16px;
            background: #fff;
            border: 1px solid #cedcc8;
            border-top: 0;
            border-radius: 0 0 17px 17px;
            box-shadow: 0 12px 30px #173d390e;
        }

        .pt-greeting {
            margin-bottom: 12px;
        }

        .pt-greeting h1 {
            margin-top: 4px;
            font-size: 23px;
            line-height: 1.25;
        }

        .pt-greeting > p:last-child {
            display: none;
        }

        .pt-ticket {
            grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
            border-radius: 13px;
            background: #eaf1e2;
        }

        .pt-token-panel,
        .pt-appointment {
            padding: 13px 14px;
        }

        .pt-token-panel {
            background: transparent;
        }

        .pt-token {
            font-size: 36px;
            line-height: 1.15;
            margin: 5px 0 7px;
        }

        .pt-priority {
            font-size: 10px;
            padding: 3px 7px;
        }

        .pt-appointment h2 {
            font-size: 15px;
            line-height: 1.4;
            margin-top: 6px;
        }

        .pt-appointment > p {
            font-size: 12px;
            margin-top: 4px;
        }

        .pt-eyebrow {
            font-size: 9px;
            letter-spacing: 1px;
        }

        .pt-detail-note {
            display: none;
        }

        .pt-status {
            padding: 12px;
            gap: 10px;
            margin-top: 10px;
            border-radius: 12px;
        }

        .pt-status h2 {
            font-size: 15px;
            line-height: 1.4;
        }
            .pt-emergency-alert {
    margin-top: 16px;
    padding: 16px;
    border: 1px solid #fecaca;
    border-radius: 14px;
    background: #fef2f2;
    color: #991b1b;
}

.pt-emergency-alert strong {
    display: block;
    font-size: 14px;
    font-weight: 800;
}

.pt-emergency-alert p {
    margin-top: 5px;
    font-size: 12px;
    line-height: 1.6;
    color: #b91c1c;
}

        .pt-status p {
            font-size: 12px;
            line-height: 1.5;
            margin-top: 3px;
        }

        .pt-status-icon {
            width: 30px;
            height: 30px;
            border-radius: 9px;
        }

        .pt-status-icon svg {
            width: 19px;
            height: 19px;
        }

        .pt-live-grid {
            gap: 9px;
            margin-top: 10px;
        }

        .pt-info-card {
            padding: 12px;
            gap: 10px;
            border-radius: 12px;
        }

        .pt-info-icon {
            width: 30px;
            height: 30px;
            border-radius: 9px;
        }

        .pt-info-card h2 {
            font-size: 14px;
            margin-top: 4px;
        }

        .pt-info-card p {
            font-size: 11px;
            line-height: 1.5;
            margin-top: 4px;
        }

        .pt-mini-grid {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-top: 9px;
        }

        .pt-mini-grid span {
            padding: 7px;
            font-size: 10px;
        }

        .pt-stats,
        .pt-stats-three {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
        }

        .pt-stats-three .pt-stat:last-child {
            grid-column: 1 / -1;
        }

        .pt-stat {
            display: grid;
            grid-template-columns: 16px 1fr;
            align-items: center;
            column-gap: 7px;
            padding: 11px 12px;
            border-radius: 12px;
            background: #fafbf7;
        }

        .pt-stat > svg {
            width: 16px;
            height: 16px;
        }

        .pt-stat p {
            margin: 0;
            font-size: 11px;
        }

        .pt-stat strong {
            grid-column: 1 / -1;
            font-size: 27px;
            margin-top: 4px;
        }

        .pt-stat-time {
            font-size: 21px !important;
        }

        .pt-stat small {
            font-size: 12px;
        }

        .pt-serving {
            padding: 10px 2px;
            margin-top: 4px;
            border-radius: 0;
            border-bottom: 1px solid #edf0e7;
            background: transparent;
            color: #315c40;
        }

        .pt-serving .pt-eyebrow {
            color: #72816c;
        }

        .pt-serving p:last-child {
            color: #7c8972;
            font-size: 10px;
            margin-top: 3px;
        }

        .pt-serving strong {
            font-size: 23px;
        }

        .pt-doctor {
            margin-top: 10px;
            border-radius: 10px;
        }

        .pt-doctor summary {
            padding: 10px 12px;
            min-height: 44px;
            font-size: 12px;
        }

        .pt-doctor-details {
            padding: 0 12px 12px;
        }

        .pt-footer {
            align-items: center;
            flex-direction: row;
            text-align: left;
            gap: 10px;
            margin-top: 12px;
        }

        .pt-footer > div {
            min-width: 0;
        }

        .pt-footer p {
            font-size: 10px;
            line-height: 1.5;
        }

        .pt-footer span {
            font-size: 10px;
            margin-top: 2px;
        }

        .pt-button {
            min-height: 44px;
            padding: 10px 12px;
            font-size: 11px;
            background: #176957;
            border-color: #176957;
            color: #fff;
        }

        .pt-button:hover:not(:disabled) {
            background: #104e40;
        }

        .pt-empty {
            padding: 32px 16px;
            margin: 0;
            border: 0;
        }

        .pt-error {
            padding: 10px;
            margin-bottom: 10px;
            font-size: 12px;
        }
    }

    @media (max-width: 359px) {
        .pt-page {
            padding-left: 8px;
            padding-right: 8px;
        }

        .pt-header,
        .pt-main {
            padding-left: 12px;
            padding-right: 12px;
        }

        .pt-brand-icon {
            display: none;
        }

        .pt-token-panel,
        .pt-appointment {
            padding-left: 10px;
            padding-right: 10px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .pt-spin {
            animation: none;
        }

        .pt-button {
            transition: none;
        }
    }
            `}
        </style>
    );
}