import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Loader2,
    RefreshCw,
    Stethoscope,
    Ticket,
    UserRound,
    X,
} from "lucide-react";

import {
    cancelAppointment,
    confirmAppointment,
    getAppointments,
    rejectAppointment,
    type AppointmentItem,
} from "../../services/appointment.api";

/* ============================================================
   TYPES
============================================================ */

type DoctorAppointmentAction =
    | "confirm"
    | "reject"
    | "cancel";

type ActionState = {
    id: string;
    type: DoctorAppointmentAction;
} | null;

type StatusFilter =
    | "ALL"
    | "REQUESTED"
    | "BOOKED"
    | "CONFIRMED"
    | "ARRIVED"
    | "CHECKED_IN"
    | "IN_CONSULTATION"
    | "COMPLETED"
    | "RESCHEDULE_REQUESTED"
    | "CANCELLED"
    | "REJECTED"
    | "NO_SHOW";

/* ============================================================
   CONSTANTS
============================================================ */

const STATUS_OPTIONS: StatusFilter[] = [
    "ALL",
    "REQUESTED",
    "BOOKED",
    "CONFIRMED",
    "ARRIVED",
    "CHECKED_IN",
    "IN_CONSULTATION",
    "COMPLETED",
    "RESCHEDULE_REQUESTED",
    "CANCELLED",
    "REJECTED",
    "NO_SHOW",
];

/* ============================================================
   HELPERS
============================================================ */

const pad =
    (
        value: number,
    ) =>
        String(value).padStart(
            2,
            "0",
        );

const getTodayDate =
    () => {
        const now =
            new Date();

        return `${now.getFullYear()}-${pad(
            now.getMonth() + 1,
        )}-${pad(now.getDate())}`;
    };

const readable =
    (
        value?: string | null,
    ) => {
        if (
            !value
        ) {
            return "-";
        }

        return value
            .toLowerCase()
            .replaceAll(
                "_",
                " ",
            )
            .replace(
                /^./,
                (
                    letter,
                ) =>
                    letter.toUpperCase(),
            );
    };

const unwrapAppointments =
    (
        response: any,
    ): AppointmentItem[] => {
        if (
            Array.isArray(
                response,
            )
        ) {
            return response;
        }

        if (
            Array.isArray(
                response?.data,
            )
        ) {
            return response.data;
        }

        if (
            Array.isArray(
                response?.data?.data,
            )
        ) {
            return response.data.data;
        }

        return [];
    };

const getLoggedInDoctorId =
    () => {
        if (
            typeof window ===
            "undefined"
        ) {
            return "";
        }

        const keys = [
            "user",
            "data.user",
        ];

        for (
            const key of keys
        ) {
            const raw =
                localStorage.getItem(
                    key,
                );

            if (
                !raw
            ) {
                continue;
            }

            try {
                const parsed =
                    JSON.parse(
                        raw,
                    );

                const user =
                    parsed?.state?.user ||
                    parsed?.user ||
                    parsed;

                const id =
                    user?._id ||
                    user?.id ||
                    user?.userId;

                if (
                    id
                ) {
                    return String(
                        id,
                    );
                }
            } catch {
                // Ignore invalid localStorage data.
            }
        }

        return "";
    };

const getPatientName =
    (
        appointment: AppointmentItem,
    ) => {
        const patient: any =
            appointment.patientId;

        if (
            typeof patient ===
            "string"
        ) {
            return "Patient";
        }

        return patient?.name ||
            "Patient";
    };

const getPatientPhone =
    (
        appointment: AppointmentItem,
    ) => {
        const patient: any =
            appointment.patientId;

        if (
            typeof patient ===
            "string"
        ) {
            return "-";
        }

        return patient?.phone ||
            "-";
    };

const getDepartmentName =
    (
        appointment: AppointmentItem,
    ) => {
        const department: any =
            appointment.departmentId;

        if (
            typeof department ===
            "string"
        ) {
            return "Department";
        }

        return department?.name ||
            "Department";
    };

const getAppointmentId =
    (
        appointment: AppointmentItem,
    ) => {
        const item: any =
            appointment;

        return String(
            item._id ||
            item.id ||
            "",
        );
    };

const getAppointmentTime =
    (
        appointment: AppointmentItem,
    ) => {
        const item: any =
            appointment;

        return (
            appointment.confirmedStartTime ||
            appointment.requestedStartTime ||
            item.appointmentTime ||
            "-"
        );
    };

const getPaymentStatus =
    (
        appointment: AppointmentItem,
    ) => {
        return String(
            (
                appointment as any
            ).paymentStatus ||
            "UNPAID",
        );
    };

const getQueueLabel =
    (
        appointment: AppointmentItem,
    ) => {
        const queue: any =
            (
                appointment as any
            ).queueId;

        if (
            !queue
        ) {
            return "Token not created";
        }

        if (
            typeof queue ===
            "string"
        ) {
            return "Token created";
        }

        return queue.tokenLabel
            ? `Token ${queue.tokenLabel}`
            : "Token created";
    };

const getStatusMessage =
    (
        appointment: AppointmentItem,
    ) => {
        const status =
            appointment.status;

        const paymentStatus =
            getPaymentStatus(
                appointment,
            );

        if (
            status ===
            "REQUESTED"
        ) {
            return "Patient requested an appointment. Confirm or reject it.";
        }

        if (
            status ===
            "RESCHEDULE_REQUESTED"
        ) {
            return "Patient requested a new time. Confirm or reject it.";
        }

        if (
            status ===
            "BOOKED" ||
            status ===
            "CONFIRMED"
        ) {
            return "Appointment time is reserved. Waiting for patient arrival.";
        }

        if (
            status ===
            "ARRIVED" &&
            paymentStatus !==
            "PAID"
        ) {
            return "Patient arrived. Reception is collecting payment.";
        }

        if (
            status ===
            "ARRIVED" &&
            paymentStatus ===
            "PAID"
        ) {
            return "Payment done. Reception can check-in and generate token.";
        }

        if (
            status ===
            "CHECKED_IN"
        ) {
            return "Patient checked in. Token is now visible in doctor queue.";
        }

        if (
            status ===
            "IN_CONSULTATION"
        ) {
            return "Consultation is currently active.";
        }

        if (
            status ===
            "COMPLETED"
        ) {
            return "Consultation completed.";
        }

        if (
            status ===
            "NO_SHOW"
        ) {
            return "Patient did not arrive.";
        }

        if (
            status ===
            "CANCELLED"
        ) {
            return "Appointment cancelled.";
        }

        if (
            status ===
            "REJECTED"
        ) {
            return "Appointment rejected.";
        }

        return "Appointment status updated.";
    };

/* ============================================================
   COMPONENT
============================================================ */

const DoctorAppointments =
    () => {
        const doctorId =
            useMemo(
                () =>
                    getLoggedInDoctorId(),
                [],
            );

        const [
            selectedDate,
            setSelectedDate,
        ] =
            useState(
                getTodayDate(),
            );

        const [
            selectedStatus,
            setSelectedStatus,
        ] =
            useState<StatusFilter>(
                "ALL",
            );

        const [
            appointments,
            setAppointments,
        ] =
            useState<AppointmentItem[]>(
                [],
            );

        const [
            loading,
            setLoading,
        ] =
            useState(false);

        const [
            actionState,
            setActionState,
        ] =
            useState<ActionState>(
                null,
            );

        const [
            error,
            setError,
        ] =
            useState("");

        const [
            success,
            setSuccess,
        ] =
            useState("");

        const stats =
            useMemo(
                () => {
                    return {
                        total:
                            appointments.length,

                        requests:
                            appointments.filter(
                                (
                                    item,
                                ) =>
                                    [
                                        "REQUESTED",
                                        "RESCHEDULE_REQUESTED",
                                    ].includes(
                                        item.status,
                                    ),
                            ).length,

                        arrived:
                            appointments.filter(
                                (
                                    item,
                                ) =>
                                    item.status ===
                                    "ARRIVED",
                            ).length,

                        checkedIn:
                            appointments.filter(
                                (
                                    item,
                                ) =>
                                    item.status ===
                                    "CHECKED_IN",
                            ).length,
                    };
                },
                [
                    appointments,
                ],
            );

        const loadAppointments =
            useCallback(
                async () => {
                    try {
                        setLoading(
                            true,
                        );

                        setError("");

                        const response =
                            await getAppointments({
                                date:
                                    selectedDate,

                                doctorId:
                                    doctorId ||
                                    undefined,

                                status:
                                    selectedStatus,
                            });

                        setAppointments(
                            unwrapAppointments(
                                response,
                            ),
                        );
                    } catch (
                        error: any
                    ) {
                        console.error(
                            "Doctor appointments load error:",
                            error,
                        );

                        setError(
                            error?.response?.data?.message ||
                            "Failed to load appointments",
                        );
                    } finally {
                        setLoading(
                            false,
                        );
                    }
                },
                [
                    doctorId,
                    selectedDate,
                    selectedStatus,
                ],
            );

        useEffect(
            () => {
                loadAppointments();
            },
            [
                loadAppointments,
            ],
        );

        const runAction =
            async (
                appointmentId: string,
                type: DoctorAppointmentAction,
            ) => {
                if (
                    actionState
                ) {
                    return;
                }

                let reason =
                    "";

                if (
                    type ===
                    "reject"
                ) {
                    const input =
                        window.prompt(
                            "Reason for rejecting appointment?",
                            "Doctor not available",
                        );

                    if (
                        !input
                    ) {
                        return;
                    }

                    reason =
                        input;
                }

                if (
                    type ===
                    "cancel"
                ) {
                    const input =
                        window.prompt(
                            "Reason for cancelling appointment?",
                            "Doctor unavailable",
                        );

                    if (
                        !input
                    ) {
                        return;
                    }

                    reason =
                        input;
                }

                try {
                    setActionState({
                        id:
                            appointmentId,
                        type,
                    });

                    setError("");
                    setSuccess("");

                    if (
                        type ===
                        "confirm"
                    ) {
                        await confirmAppointment(
                            appointmentId,
                        );

                        setSuccess(
                            "Appointment confirmed.",
                        );
                    }

                    if (
                        type ===
                        "reject"
                    ) {
                        await rejectAppointment(
                            appointmentId,
                            reason,
                        );

                        setSuccess(
                            "Appointment rejected.",
                        );
                    }

                    if (
                        type ===
                        "cancel"
                    ) {
                        await cancelAppointment(
                            appointmentId,
                            reason,
                        );

                        setSuccess(
                            "Appointment cancelled.",
                        );
                    }

                    await loadAppointments();
                } catch (
                    error: any
                ) {
                    console.error(
                        "Doctor appointment action error:",
                        error,
                    );

                    setError(
                        error?.response?.data?.message ||
                        "Action failed",
                    );
                } finally {
                    setActionState(
                        null,
                    );
                }
            };

        return (
            <div className="am-page">
                <DoctorAppointmentsStyles />

                <header className="am-header">
                    <div>
                        <p className="am-eyebrow">
                            DOCTOR WORKSPACE
                        </p>

                        <h1>
                            My Appointments
                        </h1>

                        <p>
                            View reserved appointments, patient arrival, payment status and queue token status.
                        </p>
                    </div>

                    <div className="am-header-actions">
                        <button
                            type="button"
                            className="am-button am-secondary"
                            disabled={
                                loading
                            }
                            onClick={() =>
                                loadAppointments()
                            }
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>

                        <button
                            type="button"
                            className="am-button am-primary"
                            onClick={() =>
                                setSelectedDate(
                                    getTodayDate(),
                                )
                            }
                        >
                            <CalendarDays size={16} />
                            Today
                        </button>
                    </div>
                </header>

                {error && (
                    <div
                        className="am-error"
                        role="alert"
                    >
                        <AlertCircle size={18} />

                        {error}

                        <button
                            type="button"
                            aria-label="Dismiss error"
                            onClick={() =>
                                setError(
                                    "",
                                )
                            }
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                {success && (
                    <div
                        className="am-success"
                        role="status"
                    >
                        <CheckCircle2 size={18} />

                        {success}

                        <button
                            type="button"
                            aria-label="Dismiss notification"
                            onClick={() =>
                                setSuccess(
                                    "",
                                )
                            }
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                <section className="am-filters">
                    <label>
                        Date

                        <input
                            type="date"
                            value={
                                selectedDate
                            }
                            onChange={(
                                event,
                            ) =>
                                setSelectedDate(
                                    event.target.value,
                                )
                            }
                        />
                    </label>

                    <label>
                        Status

                        <select
                            value={
                                selectedStatus
                            }
                            onChange={(
                                event,
                            ) =>
                                setSelectedStatus(
                                    event.target.value as StatusFilter,
                                )
                            }
                        >
                            {STATUS_OPTIONS.map(
                                (
                                    status,
                                ) => (
                                    <option
                                        key={
                                            status
                                        }
                                        value={
                                            status
                                        }
                                    >
                                        {readable(
                                            status,
                                        )}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                </section>

                <div className="am-metrics">
                    <div>
                        <span>
                            Total appointments
                        </span>

                        <strong>
                            {loading
                                ? "—"
                                : stats.total}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Need confirmation
                        </span>

                        <strong>
                            {loading
                                ? "—"
                                : stats.requests}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Arrived at reception
                        </span>

                        <strong>
                            {loading
                                ? "—"
                                : stats.arrived}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Checked-in tokens
                        </span>

                        <strong>
                            {loading
                                ? "—"
                                : stats.checkedIn}
                        </strong>
                    </div>
                </div>

                <section className="am-panel">
                    <div className="am-panel-heading">
                        <div>
                            <h2>
                                Appointment timeline
                            </h2>

                            <p>
                                Doctor can confirm or reject appointment requests. Reception manages arrival, payment and check-in.
                            </p>
                        </div>

                        <div className="am-doctor-pill">
                            <Stethoscope size={16} />
                            Doctor view
                        </div>
                    </div>

                    {loading ? (
                        <div
                            className="am-empty"
                            role="status"
                        >
                            <Loader2
                                size={26}
                                className="am-spin"
                            />

                            Loading appointments…
                        </div>
                    ) : !appointments.length ? (
                        <div className="am-empty">
                            <CalendarDays size={32} />

                            <h3>
                                No appointments found
                            </h3>

                            <p>
                                Select another date or status to view your appointments.
                            </p>
                        </div>
                    ) : (
                        <div className="am-visits">
                            {appointments.map(
                                (
                                    appointment,
                                ) => {
                                    const appointmentId =
                                        getAppointmentId(
                                            appointment,
                                        );

                                    const status =
                                        appointment.status;

                                    const paymentStatus =
                                        getPaymentStatus(
                                            appointment,
                                        );

                                    const isRequest =
                                        [
                                            "REQUESTED",
                                            "RESCHEDULE_REQUESTED",
                                        ].includes(
                                            status,
                                        );

                                    const canCancel =
                                        [
                                            "BOOKED",
                                            "CONFIRMED",
                                            "ARRIVED",
                                            "REQUESTED",
                                            "RESCHEDULE_REQUESTED",
                                        ].includes(
                                            status,
                                        );

                                    const isWorking =
                                        actionState?.id ===
                                        appointmentId;

                                    return (
                                        <article
                                            className="am-visit"
                                            key={
                                                appointmentId
                                            }
                                        >
                                            <div className="am-visit-time">
                                                <strong>
                                                    {getAppointmentTime(
                                                        appointment,
                                                    )}
                                                </strong>

                                                <span>
                                                    to{" "}
                                                    {
                                                        appointment.endTime
                                                    }
                                                </span>

                                                <small>
                                                    {
                                                        appointment.appointmentDate
                                                    }
                                                </small>
                                            </div>

                                            <div className="am-visit-person">
                                                <div className="am-patient-title">
                                                    <span>
                                                        <UserRound
                                                            size={
                                                                16
                                                            }
                                                        />
                                                    </span>

                                                    <h3>
                                                        {getPatientName(
                                                            appointment,
                                                        )}
                                                    </h3>
                                                </div>

                                                <p>
                                                    {getPatientPhone(
                                                        appointment,
                                                    )}
                                                </p>

                                                <p>
                                                    {getDepartmentName(
                                                        appointment,
                                                    )}
                                                </p>

                                                <p className="am-status-note">
                                                    {getStatusMessage(
                                                        appointment,
                                                    )}
                                                </p>
                                            </div>

                                            <div className="am-visit-status">
                                                <span
                                                    className="am-badge"
                                                    data-status={
                                                        status
                                                    }
                                                >
                                                    {readable(
                                                        status,
                                                    )}
                                                </span>

                                                <span
                                                    className="am-payment"
                                                    data-payment={
                                                        paymentStatus
                                                    }
                                                >
                                                    {readable(
                                                        paymentStatus,
                                                    )}
                                                </span>

                                                <span className="am-token">
                                                    <Ticket size={13} />
                                                    {getQueueLabel(
                                                        appointment,
                                                    )}
                                                </span>
                                            </div>

                                            <div className="am-visit-actions">
                                                {isRequest && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="am-button am-primary"
                                                            disabled={
                                                                !!actionState
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    appointmentId,
                                                                    "confirm",
                                                                )
                                                            }
                                                        >
                                                            <CheckCircle2
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                            Confirm
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="am-button am-danger"
                                                            disabled={
                                                                !!actionState
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    appointmentId,
                                                                    "reject",
                                                                )
                                                            }
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {canCancel &&
                                                    !isRequest && (
                                                        <button
                                                            type="button"
                                                            className="am-button am-secondary"
                                                            disabled={
                                                                !!actionState
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    appointmentId,
                                                                    "cancel",
                                                                )
                                                            }
                                                        >
                                                            Cancel if unavailable
                                                        </button>
                                                    )}

                                                {status ===
                                                    "CHECKED_IN" && (
                                                    <span className="am-working">
                                                        <CheckCircle2
                                                            size={
                                                                16
                                                            }
                                                        />
                                                        Ready in doctor queue
                                                    </span>
                                                )}

                                                {status ===
                                                    "IN_CONSULTATION" && (
                                                    <span className="am-working">
                                                        <Clock3
                                                            size={
                                                                16
                                                            }
                                                        />
                                                        Consultation active
                                                    </span>
                                                )}

                                                {status ===
                                                    "COMPLETED" && (
                                                    <span className="am-working">
                                                        <CheckCircle2
                                                            size={
                                                                16
                                                            }
                                                        />
                                                        Completed
                                                    </span>
                                                )}

                                                {isWorking && (
                                                    <span
                                                        role="status"
                                                        className="am-working"
                                                    >
                                                        <Loader2
                                                            size={
                                                                17
                                                            }
                                                            className="am-spin"
                                                        />
                                                        Updating…
                                                    </span>
                                                )}
                                            </div>
                                        </article>
                                    );
                                },
                            )}
                        </div>
                    )}
                </section>
            </div>
        );
    };

export default DoctorAppointments;

/* ============================================================
   STYLES - SAME UIUX AS APPOINTMENTS PAGE
============================================================ */

function DoctorAppointmentsStyles() {
    return (
        <style>
            {`
    .am-page {
        min-height: 100dvh;
        background: #f5f6f2;
        color: #173d39;
        padding: 26px;
        font-family: "Inter", "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
    }

    .am-page *,
    .am-page *::before,
    .am-page *::after {
        box-sizing: border-box;
    }

    .am-page h1,
    .am-page h2,
    .am-page h3,
    .am-page p {
        margin: 0;
    }

    .am-page button,
    .am-page input,
    .am-page select {
        font: inherit;
    }

    .am-page button {
        cursor: pointer;
        touch-action: manipulation;
    }

    .am-page button:disabled {
        opacity: .5;
        cursor: not-allowed;
    }

    .am-page button:focus-visible {
        outline: 3px solid #35ad95;
        outline-offset: 3px;
    }

    .am-page svg {
        flex-shrink: 0;
    }

    .am-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 22px;
        padding: 26px;
        background: linear-gradient(110deg, #eaf0e1, #edf3e6, #dcebdd);
        border: 1px solid #d9e4d1;
        border-radius: 19px;
    }

    .am-eyebrow {
        font-size: 9px;
        letter-spacing: 1.6px;
        font-weight: 700;
        color: #657e59;
        margin-bottom: 9px !important;
    }

    .am-header h1 {
        font-size: 29px;
        letter-spacing: -.8px;
        font-weight: 600;
    }

    .am-header > div > p:last-child {
        margin-top: 8px;
        color: #66795d;
        font-size: 13px;
        line-height: 1.7;
    }

    .am-header-actions {
        display: flex;
        gap: 10px;
        flex-shrink: 0;
    }

    .am-button {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        gap: 7px;
        border: 1px solid transparent;
        border-radius: 10px;
        padding: 10px 15px;
        min-height: 44px;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.5;
    }

    .am-primary {
        background: #176957;
        color: white;
    }

    .am-primary:hover:not(:disabled) {
        background: #104e40;
    }

    .am-secondary {
        background: white;
        border-color: #d7e2cd;
        color: #536e48;
    }

    .am-secondary:hover:not(:disabled) {
        background: #f0f5e9;
    }

    .am-danger {
        background: #fcf0eb;
        color: #9f4b39;
    }

    .am-danger:hover:not(:disabled) {
        background: #fae3d9;
    }

    .am-error,
    .am-success {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: 11px;
        padding: 13px 16px;
        margin-top: 14px;
        font-size: 13px;
        line-height: 1.7;
    }

    .am-error {
        border: 1px solid #efd6cc;
        background: #fcf0eb;
        color: #9c503c;
    }

    .am-success {
        border: 1px solid #d5e5cf;
        background: #edf5e8;
        color: #4f7548;
    }

    .am-error button,
    .am-success button {
        margin-left: auto;
        border: 0;
        padding: 8px;
        background: transparent;
        color: inherit;
    }

    .am-filters {
        display: flex;
        align-items: flex-end;
        gap: 16px;
        padding: 20px;
        margin-top: 22px;
        border: 1px solid #dfe6d7;
        border-radius: 14px;
        background: #fff;
    }

    .am-filters > label {
        display: grid;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #5c744e;
        min-width: 0;
        flex: 1;
    }

    .am-filters select,
    .am-filters input {
        min-height: 46px;
        width: 100%;
        border: 1px solid #d9e3d0;
        background: #fafbf7;
        padding: 10px 12px;
        border-radius: 9px;
        color: #345832;
        font-size: 13px;
    }

    .am-page input:focus,
    .am-page select:focus {
        outline: 2px solid #88ae7a;
        outline-offset: 1px;
    }

    .am-metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin: 18px 0;
    }

    .am-metrics > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border: 1px solid #e0e7d8;
        padding: 17px 20px;
        border-radius: 13px;
        background: white;
    }

    .am-metrics span {
        font-size: 12px;
        line-height: 1.6;
        color: #6c7e60;
    }

    .am-metrics strong {
        font-size: 25px;
        font-weight: 600;
    }

    .am-panel {
        border: 1px solid #dfe6d7;
        border-radius: 16px;
        background: white;
        overflow: hidden;
    }

    .am-panel-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 22px;
        border-bottom: 1px solid #e8eddf;
    }

    .am-panel-heading h2 {
        font-size: 18px;
        font-weight: 600;
    }

    .am-panel-heading p {
        font-size: 12px;
        margin-top: 6px;
        color: #77876c;
        line-height: 1.6;
    }

    .am-doctor-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border-radius: 999px;
        padding: 9px 12px;
        background: #edf5e8;
        color: #176957;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
    }

    .am-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        text-align: center;
        padding: 48px 22px;
        color: #74886a;
        font-size: 13px;
        line-height: 1.7;
    }

    .am-empty h3 {
        color: #3d603a;
        font-size: 17px;
        font-weight: 600;
    }

    .am-visit {
        display: grid;
        grid-template-columns: 115px minmax(150px, 1fr) minmax(135px, .5fr);
        gap: 18px;
        padding: 20px 22px;
        border-bottom: 1px solid #e8eddf;
        align-items: start;
    }

    .am-visit:last-child {
        border: 0;
    }

    .am-visit-time {
        display: grid;
        gap: 4px;
    }

    .am-visit-time strong {
        font-size: 20px;
        font-weight: 600;
    }

    .am-visit-time span,
    .am-visit-time small {
        font-size: 11px;
        color: #7c8b72;
    }

    .am-visit-person {
        min-width: 0;
    }

    .am-patient-title {
        display: flex;
        align-items: center;
        gap: 9px;
    }

    .am-patient-title > span {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: #edf3e6;
        color: #176957;
    }

    .am-visit-person h3 {
        font-size: 15px;
        font-weight: 600;
        overflow-wrap: anywhere;
    }

    .am-visit-person p {
        font-size: 12px;
        line-height: 1.7;
        color: #748769;
        margin-top: 4px;
        overflow-wrap: anywhere;
    }

    .am-status-note {
        margin-top: 9px !important;
        color: #3f5d3f !important;
        font-weight: 600;
    }

    .am-visit-status {
        display: grid;
        justify-items: end;
        gap: 8px;
        font-size: 11px;
        color: #7a8a70;
        text-align: right;
    }

    .am-badge {
        display: inline-flex;
        width: fit-content;
        padding: 5px 9px;
        border-radius: 20px;
        background: #edf4e7;
        color: #527447;
        font-size: 11px;
        font-weight: 600;
    }

    .am-badge[data-status="REQUESTED"],
    .am-badge[data-status="RESCHEDULE_REQUESTED"] {
        background: #fbf0da;
        color: #936922;
    }

    .am-badge[data-status="ARRIVED"] {
        background: #e7f1ff;
        color: #275c94;
    }

    .am-badge[data-status="CHECKED_IN"],
    .am-badge[data-status="IN_CONSULTATION"] {
        background: #e1f5eb;
        color: #176957;
    }

    .am-badge[data-status="CANCELLED"],
    .am-badge[data-status="REJECTED"],
    .am-badge[data-status="NO_SHOW"] {
        background: #faece6;
        color: #9a5b45;
    }

    .am-payment {
        display: inline-flex;
        width: fit-content;
        padding: 5px 9px;
        border-radius: 20px;
        background: #fff7df;
        color: #806217;
        font-size: 11px;
        font-weight: 600;
    }

    .am-payment[data-payment="PAID"] {
        background: #e1f5eb;
        color: #176957;
    }

    .am-token {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 5px;
        color: #607455;
    }

    .am-visit-actions {
        grid-column: 2 / -1;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
    }

    .am-working {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #536e48;
        font-weight: 600;
    }

    @keyframes am-spin {
        to {
            transform: rotate(360deg);
        }
    }

    .am-spin {
        animation: am-spin 1s linear infinite;
    }

    @media (max-width: 900px) {
        .am-metrics {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 767px) {
        .am-page {
            padding: 14px;
        }

        .am-header {
            padding: 20px;
            flex-direction: column;
            align-items: stretch;
            gap: 18px;
        }

        .am-header h1 {
            font-size: 26px;
        }

        .am-header-actions {
            flex-wrap: wrap;
        }

        .am-header-actions button {
            flex: 1;
        }

        .am-filters {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 16px;
        }

        .am-metrics {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .am-metrics > div {
            align-items: flex-start;
            flex-direction: column;
            padding: 12px;
            gap: 8px;
        }

        .am-metrics span {
            font-size: 10px;
        }

        .am-metrics strong {
            font-size: 23px;
        }

        .am-panel-heading {
            flex-direction: column;
            align-items: stretch;
            padding: 18px;
        }

        .am-doctor-pill {
            width: fit-content;
        }

        .am-visit {
            grid-template-columns: 84px minmax(0, 1fr);
            padding: 18px;
            gap: 14px;
        }

        .am-visit-status {
            grid-column: 1 / -1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-align: left;
            flex-wrap: wrap;
        }

        .am-visit-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
            border-top: 1px solid #e8eddf;
            padding-top: 12px;
        }

        .am-visit-actions .am-primary {
            flex: 1;
        }

        .am-button {
            min-height: 46px;
        }

        .am-filters select,
        .am-filters input {
            font-size: 16px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .am-page *,
        .am-page *::before,
        .am-page *::after {
            animation: none !important;
            transition: none !important;
        }
    }
            `}
        </style>
    );
}