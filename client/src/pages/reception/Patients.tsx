import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    Loader2,
    Plus,
    Search,
    Stethoscope,
    Ticket,
    Trash2,
    Users,
    X,
} from "lucide-react";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";


import {
    getPatients,
    getTodayPatients,
    createPatient,
} from "../../services/patient.api";

import type {
    Patient,
    CreatePatientPayload,
} from "../../types/patient";

import api from "../../services/api";

interface Department {
    _id: string;
    name: string;
    isActive?: boolean;
}

interface DoctorSession {
    startTime: string;
    endTime: string;
    slotType?: string;
}

interface DoctorDaySchedule {
    day: string;
    isAvailable?: boolean;
    sessions?: DoctorSession[];
}

interface DoctorSchedule {
    weeklyAvailability?: DoctorDaySchedule[];
}

interface Doctor {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    isOnline?: boolean;
    lastSeenAt?: string;
    scheduleConfigured?: boolean;
    schedule?: DoctorSchedule | null;
    departmentId?: string | {
        _id?: string;
        name?: string;
    };
}

type QueueStatus =
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";

interface SameDayToken {
    _id: string;
    tokenLabel: string;
    tokenNumber?: number;
    status: QueueStatus;
    departmentName?: string;
}

type TodayPatient = Patient & {
    sameDayTokens?: SameDayToken[];
};

interface QueueApiItem {
    _id?: string;
    queueId?: string;
    patientId?: string | {
        _id?: string;
    };
    patient?: {
        _id?: string;
    };
    tokenLabel?: string;
    token?: string | number;
    tokenNumber?: number;
    status?: string;
    department?: {
        name?: string;
    };
    departmentId?: string | {
        name?: string;
    };
}

type Priority =
    | "NORMAL"
    | "EMERGENCY";

type ModalType =
    | "new"
    | "register"
    | null;

type PopupType =
    | "success"
    | "error";

interface PopupMessage {
    type: PopupType;
    title: string;
    message: string;
    patientName?: string;
    tokenLabel?: string;
}

interface VisitForm {
    departmentId: string;
    doctorId: string;
    priority: Priority;
}

const emptyForm =
    (): CreatePatientPayload => ({
        name: "",
        phone: "",
        age: 0,
        gender: "MALE",
        address: "",
        departmentId: "",
    });

const emptyVisitForm =
    (): VisitForm => ({
        departmentId: "",
        doctorId: "",
        priority: "NORMAL",
    });

function errorMessage(
    error: unknown,
    fallback: string,
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

    return typeof message === "string"
        ? message
        : fallback;
}

function formatDate(
    value?: string,
) {
    if (
        !value
    ) {
        return "—";
    }

    const date =
        new Date(
            value,
        );

    return Number.isNaN(
        date.getTime(),
    )
        ? "—"
        : date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            },
        );
}

function getTodayDayName() {
    return new Intl.DateTimeFormat(
        "en-US",
        {
            weekday: "long",
            timeZone: "Asia/Kolkata",
        },
    )
        .format(
            new Date(),
        )
        .toUpperCase();
}

function getDoctorTodaySessions(
    doctor: Doctor,
) {
    const today =
        getTodayDayName();

    const day =
        doctor.schedule?.weeklyAvailability?.find(
            (
                item,
            ) =>
                item.day === today &&
                item.isAvailable !== false,
        );

    return day?.sessions?.filter(
        (
            session,
        ) =>
            session.startTime &&
            session.endTime,
    ) || [];
}

function visitTimeToMinutes(
    value?: string | null,
): number | null {
    if (!value) {
        return null;
    }

    const match =
        String(value).match(
            /^(\d{1,2}):(\d{2})/,
        );

    if (!match) {
        return null;
    }

    const hours =
        Number(match[1]);

    const minutes =
        Number(match[2]);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    return hours * 60 + minutes;
}

function getIndiaCurrentMinutes() {
    const parts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            },
        ).formatToParts(
            new Date(),
        );

    const hour =
        Number(
            parts.find(
                (part) =>
                    part.type === "hour",
            )?.value || "0",
        );

    const minute =
        Number(
            parts.find(
                (part) =>
                    part.type === "minute",
            )?.value || "0",
        );

    return hour * 60 + minute;
}

function isDoctorAvailableToday(
    doctor: Doctor,
) {
    const sessions =
        getDoctorTodaySessions(
            doctor,
        );

    if (
        sessions.length === 0
    ) {
        return false;
    }

    const nowMinutes =
        getIndiaCurrentMinutes();

    return sessions.some(
        (session) => {
            const endMinutes =
                visitTimeToMinutes(
                    session.endTime,
                );

            return (
                endMinutes !== null &&
                nowMinutes < endMinutes
            );
        },
    );
}

function getDoctorAvailabilityText(
    doctor: Doctor,
) {
    const sessions =
        getDoctorTodaySessions(
            doctor,
        );

    if (
        sessions.length === 0
    ) {
        return "Not available today";
    }

    const timing =
        sessions
            .map(
                (
                    session,
                ) =>
                    `${session.startTime} - ${session.endTime}`,
            )
            .join(", ");

    if (
        !isDoctorAvailableToday(
            doctor,
        )
    ) {
        return `Duty ended today · ${timing}`;
    }

    if (
        doctor.isOnline
    ) {
        return `Available now · ${timing}`;
    }

    return `Scheduled today · ${timing}`;
}

function getDepartmentId(
    value: Doctor["departmentId"],
) {
    if (
        !value
    ) {
        return "";
    }

    if (
        typeof value ===
        "string"
    ) {
        return value;
    }

    return value._id || "";
}

function PatientDialog({
    title,
    children,
    busy,
    onClose,
}: {
    title: string;
    children: ReactNode;
    busy: boolean;
    onClose: () => void;
}) {
    const ref =
        useRef<HTMLDialogElement>(
            null,
        );

    useEffect(
        () => {
            const dialog =
                ref.current;

            dialog?.showModal();

            const previous =
                document.body.style.overflow;

            document.body.style.overflow =
                "hidden";

            return () => {
                dialog?.close();

                document.body.style.overflow =
                    previous;
            };
        },
        [],
    );

    return (
        <dialog
            ref={ref}
            className="nsp-dialog"
            aria-labelledby="patient-dialog-title"
            onCancel={(event) => {
                event.preventDefault();

                if (
                    !busy
                ) {
                    onClose();
                }
            }}
        >
            <div className="nsp-dialog-head">
                <div>
                    <small>
                        NextSynq Health
                    </small>

                    <h2 id="patient-dialog-title">
                        {title}
                    </h2>
                </div>

                <button
                    type="button"
                    className="nsp-icon"
                    aria-label="Close dialog"
                    disabled={busy}
                    onClick={onClose}
                >
                    <X size={20} />
                </button>
            </div>

            {children}
        </dialog>
    );
}

function MessagePopup({
    popup,
    onClose,
}: {
    popup: PopupMessage;
    onClose: () => void;
}) {
    const ref =
        useRef<HTMLDialogElement>(
            null,
        );

    useEffect(
        () => {
            const dialog =
                ref.current;

            if (
                dialog &&
                !dialog.open
            ) {
                dialog.showModal();
            }

            return () => {
                if (
                    dialog?.open
                ) {
                    dialog.close();
                }
            };
        },
        [popup],
    );

    const isSuccess =
        popup.type === "success";

    return (
        <dialog
            ref={ref}
            className={`nsp-popup nsp-popup-${popup.type}`}
            aria-labelledby="nsp-popup-title"
            aria-describedby="nsp-popup-message"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
        >
            <button
                type="button"
                className="nsp-popup-close"
                aria-label="Close message"
                onClick={onClose}
            >
                <X size={18} />
            </button>

            <div className="nsp-popup-icon">
                {isSuccess ? (
                    <CheckCircle2 size={34} />
                ) : (
                    <AlertCircle size={34} />
                )}
            </div>

            <h2 id="nsp-popup-title">
                {popup.title}
            </h2>

            <p id="nsp-popup-message">
                {popup.message}
            </p>

            {popup.tokenLabel && (
                <div className="nsp-popup-token">
                    <span>
                        Token
                    </span>

                    <strong>
                        {popup.tokenLabel}
                    </strong>

                    {popup.patientName && (
                        <small>
                            {popup.patientName}
                        </small>
                    )}
                </div>
            )}

            <button
                type="button"
                className="nsp-primary nsp-popup-action"
                onClick={onClose}
            >
                {isSuccess ? "Done" : "Okay"}
            </button>
        </dialog>
    );
}


// Keep token status visible even when a token also has a Delete action.
const TOKEN_STATUS_LABELS: Record<QueueStatus, string> = {
    WAITING: "Waiting",
    CALLED: "Called",
    SERVING: "In consultation",
    COMPLETED: "Completed",
    SKIPPED: "Skipped",
    CANCELLED: "Cancelled",
};

function PatientTable({
    patients,
    view,
    busy,
    deletingTokenId,
    onRegister,
    onDeleteToken,
}: {
    patients: Patient[];
    view: "today" | "all";
    busy: boolean;
    deletingTokenId: string | null;
    onRegister: (patient: Patient) => void;
    onDeleteToken: (patient: Patient, token: SameDayToken) => Promise<void>;
}) {
    const isToday = view === "today";

    return (
        <div
            className="nsp-directory-scroll"
            role="region"
            aria-label={isToday ? "Today's patients table" : "Patient directory table"}
            tabIndex={0}
        >
            {/* Desktop uses aligned columns; the same rows become labelled mobile cards. */}
            <table className="nsp-directory-table" role="table">
                <caption className="nsp-visually-hidden">
                    {isToday ? "Today's patients, visit tokens and actions" : "Registered patients and actions"}
                </caption>
                <thead role="rowgroup">
                    <tr role="row">
                        <th scope="col" role="columnheader">Patient</th>
                        <th scope="col" role="columnheader">Contact & details</th>
                        <th scope="col" role="columnheader">{isToday ? "Address" : "Registration & address"}</th>
                        {isToday && <th scope="col" role="columnheader">Today's tokens</th>}
                        <th scope="col" role="columnheader">Actions</th>
                    </tr>
                </thead>
                <tbody role="rowgroup">
                    {patients.map((patient) => {
                        const tokens = (patient as TodayPatient).sameDayTokens || [];
                        const gender = patient.gender
                            ? patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase()
                            : "Gender not recorded";

                        return (
                            <tr key={patient._id} role="row">
                                <th scope="row" role="rowheader" className="nsp-directory-person">
                                    <div className="nsp-directory-identity">
                                        <span className="nsp-directory-avatar" aria-hidden="true">
                                            {patient.name?.trim().charAt(0).toUpperCase() || "P"}
                                        </span>
                                        <div>
                                            <strong>{patient.name || "Name not recorded"}</strong>
                                            <span className="nsp-directory-code">
                                                <span className="nsp-visually-hidden">Patient ID: </span>
                                                {patient.patientCode || patient._id}
                                            </span>
                                        </div>
                                    </div>
                                </th>

                                <td role="cell" className="nsp-directory-contact">
                                    <span className="nsp-mobile-label" aria-hidden="true">Contact & details</span>
                                    <span className="nsp-directory-phone">{patient.phone || "No phone recorded"}</span>
                                    <span className="nsp-directory-secondary">
                                        {patient.age == null ? "Age not recorded" : `${patient.age} yrs`} · {gender}
                                    </span>
                                </td>

                                <td role="cell" className="nsp-directory-address">
                                    <span className="nsp-mobile-label" aria-hidden="true">
                                        {isToday ? "Address" : "Registration & address"}
                                    </span>
                                    {!isToday && (
                                        <span className="nsp-directory-date">{formatDate(patient.createdAt)}</span>
                                    )}
                                    <span className={isToday ? "nsp-address-value" : "nsp-directory-secondary"}>
                                        {patient.address || "Address not recorded"}
                                    </span>
                                </td>

                                {isToday && (
                                    <td role="cell" className="nsp-directory-tokens">
                                        <span className="nsp-mobile-label" aria-hidden="true">Today's tokens</span>
                                        {tokens.length === 0 ? (
                                            <span className="nsp-directory-secondary">No token available</span>
                                        ) : (
                                            <ul className="nsp-visit-list" aria-label={`Tokens for ${patient.name}`}>
                                                {tokens.map((token) => {
                                                    const canDelete = token.status === "WAITING" || token.status === "CALLED";
                                                    const deleting = deletingTokenId === token._id;

                                                    return (
                                                        <li key={token._id} className="nsp-visit-card">
                                                            <div className="nsp-visit-main">
                                                                <strong className="nsp-token-number">
                                                                    <Ticket size={15} aria-hidden="true" />
                                                                    {token.tokenLabel}
                                                                </strong>
                                                                <span className="nsp-status-badge" data-status={token.status}>
                                                                    <span aria-hidden="true" />
                                                                    {TOKEN_STATUS_LABELS[token.status] || token.status}
                                                                </span>
                                                            </div>
                                                            <div className="nsp-visit-bottom">
                                                                <span className="nsp-token-department">
                                                                    {token.departmentName || "Department not recorded"}
                                                                </span>
                                                                {canDelete && (
                                                                    <button
                                                                        type="button"
                                                                        className="nsp-token-remove"
                                                                        disabled={busy || deleting}
                                                                        aria-label={`Delete token ${token.tokenLabel} for ${patient.name}`}
                                                                        onClick={() => void onDeleteToken(patient, token)}
                                                                    >
                                                                        {deleting
                                                                            ? <Loader2 size={14} className="nsp-spin" aria-hidden="true" />
                                                                            : <Trash2 size={14} aria-hidden="true" />}
                                                                        {deleting ? "Deleting…" : "Delete"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </td>
                                )}

                                <td role="cell" className="nsp-directory-actions">
                                    <button
                                        type="button"
                                        className="nsp-secondary nsp-directory-register"
                                        disabled={busy}
                                        onClick={() => onRegister(patient)}
                                    >
                                        <Plus size={16} aria-hidden="true" />
                                        {isToday ? "Another department" : "Register today"}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}


export default function Patients() {
    const [
        today,
        setToday,
    ] =
        useState<TodayPatient[]>([]);

    const [
        allPatients,
        setAllPatients,
    ] =
        useState<Patient[]>([]);

    const [
        view,
        setView,
    ] =
        useState<"today" | "all">(
            "today",
        );

    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] =
        useState("");

    const [
        departments,
        setDepartments,
    ] =
        useState<Department[]>([]);

    const [
        departmentLoading,
        setDepartmentLoading,
    ] =
        useState(false);

    const [
        departmentError,
        setDepartmentError,
    ] =
        useState("");

    const [
        modal,
        setModal,
    ] =
        useState<ModalType>(
            null,
        );

    const [
        selectedPatient,
        setSelectedPatient,
    ] =
        useState<Patient | null>(
            null,
        );

    const [
        form,
        setForm,
    ] =
        useState<CreatePatientPayload>(
            emptyForm,
        );

    const [
        visit,
        setVisit,
    ] =
        useState<VisitForm>(
            emptyVisitForm,
        );

    const [
        doctors,
        setDoctors,
    ] =
        useState<Doctor[]>([]);

    const [
        doctorLoading,
        setDoctorLoading,
    ] =
        useState(false);

    const [
        doctorError,
        setDoctorError,
    ] =
        useState("");

    const [
        busy,
        setBusy,
    ] =
        useState(false);

    const [
        deletingTokenId,
        setDeletingTokenId,
    ] =
        useState<string | null>(null);

    const [
        formError,
        setFormError,
    ] =
        useState("");

    const [
        receipt,
        setReceipt,
    ] =
        useState<{
            patientName: string;
            tokenLabel: string;
        } | null>(null);

    const [
        popup,
        setPopup,
    ] =
        useState<PopupMessage | null>(
            null,
        );

    const savingRef =
        useRef(false);

    const requestRef =
        useRef(0);

    const doctorRequestRef =
        useRef(0);

    const showErrorPopup =
        useCallback(
            (
                message: string,
                title = "Action failed",
            ) => {
                setPopup({
                    type: "error",
                    title,
                    message,
                });
            },
            [],
        );

    const showSuccessPopup =
        useCallback(
            ({
                patientName,
                tokenLabel,
            }: {
                patientName: string;
                tokenLabel: string;
            }) => {
                setPopup({
                    type: "success",
                    title: "Token generated",
                    message: `${patientName} has been added to the queue successfully.`,
                    patientName,
                    tokenLabel,
                });
            },
            [],
        );

    const selectedDoctor =
        useMemo(
            () =>
                doctors.find(
                    (
                        doctor,
                    ) =>
                        doctor._id ===
                        visit.doctorId,
                ) || null,
            [
                doctors,
                visit.doctorId,
            ],
        );

    const selectedDepartment =
        useMemo(
            () =>
                departments.find(
                    (
                        department,
                    ) =>
                        department._id ===
                        visit.departmentId,
                ) || null,
            [
                departments,
                visit.departmentId,
            ],
        );

    const selectedDoctorAvailable =
        selectedDoctor
            ? isDoctorAvailableToday(
                selectedDoctor,
            )
            : false;

    const canGenerateToken =
        Boolean(
            visit.departmentId &&
            visit.doctorId &&
            selectedDoctorAvailable &&
            !doctorLoading &&
            !departmentLoading &&
            !doctorError &&
            !departmentError,
        );

    const loadPatients =
        useCallback(
            async () => {
                const request =
                    ++requestRef.current;

                setLoading(
                    true,
                );

                setError(
                    "",
                );

                try {
                    const [
                        todayResult,
                        allResult,
                        queueResponse,
                    ] =
                        await Promise.all([
                            getTodayPatients(),
                            getPatients(),
                            api.get(
                                "/queues",
                            ),
                        ]);

                    if (
                        request !==
                        requestRef.current
                    ) {
                        return;
                    }

                    const queuePayload =
                        queueResponse.data;

                    const queueList =
                        (
                            Array.isArray(
                                queuePayload,
                            )
                                ? queuePayload
                                : queuePayload?.data ??
                                  queuePayload?.queues ??
                                  []
                        ) as QueueApiItem[];

                    const tokensByPatient =
                        new Map<
                            string,
                            SameDayToken[]
                        >();

                    queueList.forEach(
                        (
                            queue,
                        ) => {
                            const status =
                                queue.status as
                                    | QueueStatus
                                    | undefined;

                            if (
                                !status ||
                                status ===
                                    "CANCELLED"
                            ) {
                                return;
                            }

                            const patientId =
                                typeof queue.patientId ===
                                    "string"
                                    ? queue.patientId
                                    : queue.patientId?._id ||
                                      queue.patient?._id;

                            const queueId =
                                queue._id ||
                                queue.queueId;

                            if (
                                !patientId ||
                                !queueId
                            ) {
                                return;
                            }

                            const tokenLabel =
                                String(
                                    queue.tokenLabel ??
                                    queue.token ??
                                    queue.tokenNumber ??
                                    "Token",
                                );

                            const departmentName =
                                queue.department?.name ||
                                (
                                    typeof queue.departmentId ===
                                        "object"
                                        ? queue.departmentId.name
                                        : undefined
                                );

                            const token: SameDayToken = {
                                _id: String(
                                    queueId,
                                ),
                                tokenLabel,
                                tokenNumber:
                                    queue.tokenNumber,
                                status,
                                departmentName,
                            };

                            const current =
                                tokensByPatient.get(
                                    String(
                                        patientId,
                                    ),
                                ) || [];

                            current.push(
                                token,
                            );

                            tokensByPatient.set(
                                String(
                                    patientId,
                                ),
                                current,
                            );
                        },
                    );

                    setToday(
                        (
                            todayResult as TodayPatient[]
                        ).map(
                            (
                                patient,
                            ) => ({
                                ...patient,
                                sameDayTokens:
                                    tokensByPatient.get(
                                        String(
                                            patient._id,
                                        ),
                                    ) || [],
                            }),
                        ),
                    );

                    setAllPatients(
                        allResult,
                    );
                } catch (
                    error
                ) {
                    if (
                        request ===
                        requestRef.current
                    ) {
                        const message =
                            errorMessage(
                                error,
                                "Unable to load patients. Please try again.",
                            );

                        setError(
                            message,
                        );

                        showErrorPopup(
                            message,
                            "Unable to load patients",
                        );
                    }
                } finally {
                    if (
                        request ===
                        requestRef.current
                    ) {
                        setLoading(
                            false,
                        );
                    }
                }
            },
            [showErrorPopup],
        );

    const loadDepartments =
        useCallback(
            async () => {
                setDepartmentLoading(
                    true,
                );

                setDepartmentError(
                    "",
                );

                try {
                    const response =
                        await api.get(
                            "/departments",
                        );

                    setDepartments(
                        (
                            response.data?.data ??
                            []
                        ).filter(
                            (
                                department: Department,
                            ) =>
                                department.isActive !==
                                false,
                        ),
                    );
                } catch (
                    error
                ) {
                    const message =
                        errorMessage(
                            error,
                            "Unable to load departments.",
                        );

                    setDepartmentError(
                        message,
                    );

                    showErrorPopup(
                        message,
                        "Unable to load departments",
                    );
                } finally {
                    setDepartmentLoading(
                        false,
                    );
                }
            },
            [showErrorPopup],
        );

    const loadDoctors =
        useCallback(
            async (
                departmentId: string,
            ) => {
                if (
                    !departmentId
                ) {
                    setDoctors(
                        [],
                    );

                    setDoctorError(
                        "",
                    );

                    return;
                }

                const request =
                    ++doctorRequestRef.current;

                setDoctorLoading(
                    true,
                );

                setDoctorError(
                    "",
                );

                try {
                    const response =
                        await api.get(
                            "/appointments/doctors",
                            {
                                params: {
                                    departmentId,
                                },
                            },
                        );

                    const list: Doctor[] =
                        response.data?.data ??
                        response.data?.doctors ??
                        [];

                    if (
                        request !==
                        doctorRequestRef.current
                    ) {
                        return;
                    }

                    const filteredDoctors =
                        list.filter(
                            (
                                doctor,
                            ) => {
                                const doctorDepartmentId =
                                    getDepartmentId(
                                        doctor.departmentId,
                                    );

                                return (
                                    !doctorDepartmentId ||
                                    doctorDepartmentId ===
                                    departmentId
                                );
                            },
                        );

                    setDoctors(
                        filteredDoctors,
                    );

                    if (
                        filteredDoctors.length ===
                        0
                    ) {
                        const message =
                            "No doctor is assigned to this department.";

                        setDoctorError(
                            message,
                        );

                        showErrorPopup(
                            message,
                            "Doctor unavailable",
                        );
                    }
                } catch (
                    error
                ) {
                    if (
                        request ===
                        doctorRequestRef.current
                    ) {
                        const message =
                            errorMessage(
                                error,
                                "Unable to load doctors.",
                            );

                        setDoctorError(
                            message,
                        );

                        showErrorPopup(
                            message,
                            "Unable to load doctors",
                        );
                    }
                } finally {
                    if (
                        request ===
                        doctorRequestRef.current
                    ) {
                        setDoctorLoading(
                            false,
                        );
                    }
                }
            },
            [showErrorPopup],
        );

    useEffect(
        () => {
            void loadPatients();
            void loadDepartments();

            return () => {
                requestRef.current++;
                doctorRequestRef.current++;
            };
        },
        [
            loadPatients,
            loadDepartments,
        ],
    );

    useEffect(
        () => {
            if (
                !modal ||
                !visit.departmentId
            ) {
                setDoctors(
                    [],
                );

                setDoctorError(
                    "",
                );

                return;
            }

            void loadDoctors(
                visit.departmentId,
            );
        },
        [
            modal,
            visit.departmentId,
            loadDoctors,
        ],
    );

    const filtered =
        useMemo(
            () => {
                const query =
                    search
                        .trim()
                        .toLowerCase();

                return (
                    view === "today"
                        ? today
                        : allPatients
                ).filter(
                    (
                        patient,
                    ) =>
                        [
                            patient.name,
                            patient.phone,
                            patient.patientCode,
                            patient._id,
                        ].some(
                            (
                                value,
                            ) =>
                                String(
                                    value ??
                                    "",
                                )
                                    .toLowerCase()
                                    .includes(
                                        query,
                                    ),
                        ),
                );
            },
            [
                view,
                today,
                allPatients,
                search,
            ],
        );

    function resetVisit() {
        setVisit(
            emptyVisitForm(),
        );

        setDoctors(
            [],
        );

        setDoctorError(
            "",
        );
    }

    function closeModal() {
        if (
            savingRef.current
        ) {
            return;
        }

        setModal(
            null,
        );

        setSelectedPatient(
            null,
        );

        setFormError(
            "",
        );

        resetVisit();
    }

    function openNewPatient() {
        setForm(
            emptyForm(),
        );

        setSelectedPatient(
            null,
        );

        setFormError(
            "",
        );

        resetVisit();

        setModal(
            "new",
        );
    }

    function openRegistration(
        patient: Patient,
    ) {
        setSelectedPatient(
            patient,
        );

        setFormError(
            "",
        );

        resetVisit();

        setModal(
            "register",
        );
    }

    function updateDepartment(
        departmentId: string,
    ) {
        setVisit(
            {
                ...visit,
                departmentId,
                doctorId: "",
            },
        );

        setDoctorError(
            "",
        );
    }

    async function createTokenForPatient({
        patientId,
        patientName,
    }: {
        patientId: string;
        patientName: string;
    }) {
        if (
            !visit.departmentId
        ) {
            const message =
                "Select a department to continue.";

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Cannot generate token",
            );

            return false;
        }

        if (
            !visit.doctorId
        ) {
            const message =
                "Select a doctor to continue.";

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Cannot generate token",
            );

            return false;
        }

        if (
            !selectedDoctor ||
            !selectedDoctorAvailable
        ) {
            const message =
                "Selected doctor timing is ended or not available today. Choose another doctor or department.";

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Doctor unavailable",
            );

            return false;
        }

        const response =
            await api.post(
                "/queues",
                {
                    patientId,
                    departmentId:
                        visit.departmentId,
                    doctorId:
                        visit.doctorId,
                    priority:
                        visit.priority,
                },
            );

        const data =
            response.data?.data;

        const tokenSource =
            data?.queue ??
            data;

        const tokenLabel =
            String(
                tokenSource?.tokenLabel ??
                tokenSource?.token ??
                tokenSource?.tokenNumber ??
                "Generated",
            );

        setReceipt(
            {
                patientName,
                tokenLabel,
            },
        );

        showSuccessPopup(
            {
                patientName,
                tokenLabel,
            },
        );

        setModal(
            null,
        );

        setSelectedPatient(
            null,
        );

        resetVisit();

        await loadPatients();

        return true;
    }

    async function handleDeleteToken(
        patient: Patient,
        token: SameDayToken,
    ) {
        if (
            token.status !== "WAITING" &&
            token.status !== "CALLED"
        ) {
            showErrorPopup(
                "Only waiting or called tokens can be deleted.",
                "Token cannot be deleted",
            );

            return;
        }

        const confirmed =
            window.confirm(
                `Delete token ${token.tokenLabel} for ${patient.name}? The patient record will not be deleted.`,
            );

        if (!confirmed) {
            return;
        }

        setDeletingTokenId(
            token._id,
        );

        try {
            await api.delete(
                `/queues/${token._id}`,
                {
                    data: {
                        reason:
                            "Removed by reception",
                    },
                },
            );

            setToday(
                (
                    current,
                ) =>
                    current.map(
                        (
                            item,
                        ) =>
                            item._id ===
                            patient._id
                                ? {
                                      ...item,
                                      sameDayTokens:
                                          (
                                              item.sameDayTokens ||
                                              []
                                          ).filter(
                                              (
                                                  itemToken,
                                              ) =>
                                                  itemToken._id !==
                                                  token._id,
                                          ),
                                  }
                                : item,
                    ),
            );

            setPopup(
                {
                    type: "success",
                    title: "Token deleted",
                    message: `Token ${token.tokenLabel} was removed successfully. The patient record is still available.`,
                },
            );
        } catch (
            error
        ) {
            showErrorPopup(
                errorMessage(
                    error,
                    "Unable to delete token. Please try again.",
                ),
                "Delete failed",
            );
        } finally {
            setDeletingTokenId(
                null,
            );
        }
    }

    async function savePatient(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            savingRef.current
        ) {
            return;
        }

        if (
            !form.name.trim() ||
            !form.phone.trim()
        ) {
            const message =
                "Enter the patient’s name and phone number.";

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Missing patient details",
            );

            return;
        }

        if (
            !Number.isFinite(
                form.age,
            ) ||
            form.age < 0
        ) {
            const message =
                "Enter a valid age.";

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Invalid age",
            );

            return;
        }

        if (
            !canGenerateToken
        ) {
            const message =
                "Select department and available doctor before generating token.";

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Cannot generate token",
            );

            return;
        }

        savingRef.current =
            true;

        setBusy(
            true,
        );

        setFormError(
            "",
        );

        try {
            const createdResponse: any =
                await createPatient(
                    {
                        ...form,
                        name:
                            form.name.trim(),
                        phone:
                            form.phone.trim(),
                        departmentId:
                            visit.departmentId,
                    },
                );

            const createdPatient =
                createdResponse?.data ??
                createdResponse?.patient ??
                createdResponse;

            const patientId =
                createdPatient?._id;

            if (
                !patientId
            ) {
                throw new Error(
                    "Patient created but patient ID was not returned.",
                );
            }

            const tokenCreated =
                await createTokenForPatient(
                    {
                        patientId,
                        patientName:
                            createdPatient.name ||
                            form.name.trim(),
                    },
                );

            if (
                !tokenCreated
            ) {
                return;
            }

            setForm(
                emptyForm(),
            );

        } catch (
            error
        ) {
            const message =
                errorMessage(
                    error,
                    "Unable to add patient. Please try again.",
                );

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Unable to add patient",
            );

            if (
                message
                    .toLowerCase()
                    .includes(
                        "phone",
                    ) ||
                message
                    .toLowerCase()
                    .includes(
                        "already",
                    )
            ) {
                setSearch(
                    form.phone,
                );

                setView(
                    "all",
                );
            }
        } finally {
            savingRef.current =
                false;

            setBusy(
                false,
            );
        }
    }

    async function generateToken(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            savingRef.current ||
            !selectedPatient
        ) {
            return;
        }

        if (
            !canGenerateToken
        ) {
            const message =
                "Select department and available doctor before generating token.";

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Cannot generate token",
            );

            return;
        }

        savingRef.current =
            true;

        setBusy(
            true,
        );

        setFormError(
            "",
        );

        try {
            await createTokenForPatient(
                {
                    patientId:
                        selectedPatient._id,
                    patientName:
                        selectedPatient.name,
                },
            );

        } catch (
            error
        ) {
            const message =
                errorMessage(
                    error,
                    "Unable to generate token. Please try again.",
                );

            setFormError(
                message,
            );

            showErrorPopup(
                message,
                "Unable to generate token",
            );
        } finally {
            savingRef.current =
                false;

            setBusy(
                false,
            );
        }
    }

    function renderVisitFields() {
        return (
            <>
                <div className="nsp-fields">
                    <label className="nsp-wide">
                        Department

                        <select
                            required
                            value={visit.departmentId}
                            disabled={
                                busy ||
                                departmentLoading
                            }
                            onChange={(event) =>
                                updateDepartment(
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">
                                {departmentLoading
                                    ? "Loading departments…"
                                    : "Choose a department"}
                            </option>

                            {departments.map(
                                (
                                    department,
                                ) => (
                                    <option
                                        value={department._id}
                                        key={department._id}
                                    >
                                        {department.name}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                </div>

                {departmentError ? (
                    <div
                        className="nsp-error"
                        role="alert"
                    >
                        {departmentError}

                        <button
                            type="button"
                            disabled={
                                departmentLoading
                            }
                            onClick={() =>
                                void loadDepartments()
                            }
                        >
                            Retry
                        </button>
                    </div>
                ) : !departmentLoading &&
                  !departments.length ? (
                    <p className="nsp-error">
                        No active departments are available. Add or activate a department first.
                    </p>
                ) : null}

                {visit.departmentId && (
                    <section className="nsp-doctor-box">
                        <div className="nsp-doctor-head">
                            <div>
                                <span className="nsp-eyebrow">
                                    DOCTOR AVAILABILITY
                                </span>

                                <h3>
                                    {selectedDepartment?.name ||
                                        "Selected department"}
                                </h3>
                            </div>

                            {doctorLoading && (
                                <Loader2
                                    size={18}
                                    className="nsp-spin"
                                />
                            )}
                        </div>

                        {doctorError && (
                            <p
                                className="nsp-error"
                                role="alert"
                            >
                                {doctorError}
                            </p>
                        )}

                        {!doctorLoading &&
                            !doctorError &&
                            doctors.length ===
                                0 && (
                                <p className="nsp-warning">
                                    No doctor is available for same-day registration in this department.
                                </p>
                            )}

                        <div className="nsp-doctor-list">
                            {doctors.map(
                                (
                                    doctor,
                                ) => {
                                    const available =
                                        isDoctorAvailableToday(
                                            doctor,
                                        );

                                    return (
                                        <label
                                            className="nsp-doctor-card"
                                            data-available={
                                                available
                                            }
                                            key={
                                                doctor._id
                                            }
                                        >
                                            <input
                                                type="radio"
                                                name="doctorId"
                                                value={
                                                    doctor._id
                                                }
                                                checked={
                                                    visit.doctorId ===
                                                    doctor._id
                                                }
                                                disabled={
                                                    busy ||
                                                    !available
                                                }
                                                onChange={() =>
                                                    setVisit(
                                                        {
                                                            ...visit,
                                                            doctorId:
                                                                doctor._id,
                                                        },
                                                    )
                                                }
                                            />

                                            <span className="nsp-doctor-icon">
                                                <Stethoscope
                                                    size={
                                                        17
                                                    }
                                                />
                                            </span>

                                            <span>
                                                <strong>
                                                    {doctor.name}
                                                </strong>

                                                <small>
                                                    {getDoctorAvailabilityText(
                                                        doctor,
                                                    )}
                                                </small>
                                            </span>

                                            <em>
                                                {available
                                                    ? doctor.isOnline
                                                        ? "Online"
                                                        : "Scheduled"
                                                    : "Unavailable"}
                                            </em>
                                        </label>
                                    );
                                },
                            )}
                        </div>

                        {selectedDoctor &&
                            !selectedDoctorAvailable && (
                                <p
                                    className="nsp-warning"
                                    role="alert"
                                >
                                    Doctor duty timing has ended for today. Token generation is closed for this doctor.
                                </p>
                            )}
                    </section>
                )}

                <fieldset
                    className="nsp-priority"
                    disabled={busy}
                >
                    <legend>
                        Visit priority
                    </legend>

                    <label>
                        <input
                            type="radio"
                            name="priority"
                            checked={
                                visit.priority ===
                                "NORMAL"
                            }
                            onChange={() =>
                                setVisit(
                                    {
                                        ...visit,
                                        priority:
                                            "NORMAL",
                                    },
                                )
                            }
                        />

                        <span>
                            <strong>
                                Normal
                            </strong>

                            <small>
                                Standard queue
                            </small>
                        </span>
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="priority"
                            checked={
                                visit.priority ===
                                "EMERGENCY"
                            }
                            onChange={() =>
                                setVisit(
                                    {
                                        ...visit,
                                        priority:
                                            "EMERGENCY",
                                    },
                                )
                            }
                        />

                        <span>
                            <strong>
                                Emergency
                            </strong>

                            <small>
                                Urgent attention
                            </small>
                        </span>
                    </label>
                </fieldset>

                <p className="nsp-help">
                    Same patient cannot be registered twice in the same department today. Another department is allowed.
                </p>
            </>
        );
    }

    return (
        <main className="nsp">
            <style>
                {styles}
                {extraStyles}
                {patientTableStyles}
            </style>

            {popup && (
                <MessagePopup
                    popup={popup}
                    onClose={() =>
                        setPopup(
                            null,
                        )
                    }
                />
            )}

            <header className="nsp-header">
                <div>
                    <span className="nsp-eyebrow">
                        RECEPTION · PATIENT MANAGEMENT
                    </span>

                    <h1>
                        Patients
                    </h1>

                    <p>
                        Register new patients, find existing patients, and generate today’s visit token.
                    </p>
                </div>

                <button
                    className="nsp-primary"
                    onClick={openNewPatient}
                    disabled={busy}
                >
                    <Plus size={18} />
                    Add patient
                </button>
            </header>

            <div className="nsp-summary">
                <span>
                    <CalendarDays size={19} />
                    <strong>
                        {today.length}
                    </strong>
                    today
                </span>

                <span>
                    <Users size={19} />
                    <strong>
                        {allPatients.length}
                    </strong>
                    registered patients
                </span>
            </div>

            {receipt && (
                <div
                    className="nsp-receipt"
                    role="status"
                >
                    <CheckCircle2 size={25} />

                    <div>
                        <strong>
                            Token {receipt.tokenLabel}
                        </strong>

                        <p>
                            {receipt.patientName} has been added to the queue.
                        </p>
                    </div>

                    <button
                        className="nsp-icon"
                        onClick={() =>
                            setReceipt(
                                null,
                            )
                        }
                        aria-label="Dismiss token confirmation"
                    >
                        <X size={19} />
                    </button>
                </div>
            )}

            {error && (
                <div
                    className="nsp-error"
                    role="alert"
                >
                    {error}

                    <button
                        type="button"
                        onClick={() =>
                            void loadPatients()
                        }
                        disabled={loading}
                    >
                        Try again
                    </button>
                </div>
            )}

            <section
                className="nsp-panel"
                aria-label="Patient directory"
                aria-busy={loading}
            >
                <div className="nsp-toolbar">
                    <div
                        className="nsp-tabs"
                        aria-label="Patient views"
                    >
                        <button
                            aria-pressed={
                                view === "today"
                            }
                            onClick={() =>
                                setView(
                                    "today",
                                )
                            }
                        >
                            Today{" "}
                            <span>
                                {today.length}
                            </span>
                        </button>

                        <button
                            aria-pressed={
                                view === "all"
                            }
                            onClick={() =>
                                setView(
                                    "all",
                                )
                            }
                        >
                            All patients{" "}
                            <span>
                                {allPatients.length}
                            </span>
                        </button>
                    </div>

                    <label className="nsp-search">
                        <Search size={18} />

                        <input
                            aria-label="Search patients by name, phone or ID"
                            placeholder="Search existing patient by name, phone or ID"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                        />

                        {search && (
                            <button
                                className="nsp-icon"
                                onClick={() =>
                                    setSearch(
                                        "",
                                    )
                                }
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </label>
                </div>

                <div className="nsp-list-heading">
                    <h2>
                        {view === "today"
                            ? "Today’s patients"
                            : "Patient directory"}
                    </h2>

                    <span>
                        {filtered.length}{" "}
                        {filtered.length ===
                        1
                            ? "patient"
                            : "patients"}
                    </span>
                </div>

                {loading ? (
                    <div
                        className="nsp-empty"
                        role="status"
                    >
                        <Loader2
                            className="nsp-spin"
                            size={28}
                        />

                        <h3>
                            Loading patients…
                        </h3>
                    </div>
                ) : filtered.length ===
                  0 ? (
                    <div className="nsp-empty">
                        <Users size={30} />

                        <h3>
                            {search
                                ? "No matching patients"
                                : view === "today"
                                    ? "No patients today yet"
                                    : "Your patient directory starts here"}
                        </h3>

                        <p>
                            {search
                                ? "Try a different name, phone number or ID."
                                : "Add a new patient or register an existing patient for today."}
                        </p>

                        {!search && (
                            <button
                                className="nsp-secondary"
                                onClick={
                                    view ===
                                    "today"
                                        ? () =>
                                            setView(
                                                "all",
                                            )
                                        : openNewPatient
                                }
                            >
                                {view ===
                                "today"
                                    ? "Find an existing patient"
                                    : "Add patient"}
                            </button>
                        )}
                    </div>
                ) : (
                    <PatientTable
                        patients={filtered}
                        view={view}
                        busy={busy}
                        deletingTokenId={deletingTokenId}
                        onRegister={openRegistration}
                        onDeleteToken={handleDeleteToken}
                    />
                )}
            </section>

            {modal && (
                <PatientDialog
                    title={
                        modal === "new"
                            ? "Add patient & register today"
                            : "Register for today"
                    }
                    busy={busy}
                    onClose={closeModal}
                >
                    <form
                        onSubmit={
                            modal === "new"
                                ? savePatient
                                : generateToken
                        }
                    >
                        <div className="nsp-form-body">
                            {modal === "new" ? (
                                <>
                                    <p className="nsp-form-intro">
                                        First search by phone or name. Add a new record only if the patient is new.
                                    </p>

                                    <div className="nsp-fields">
                                        <label className="nsp-wide">
                                            Full name

                                            <input
                                                autoFocus
                                                required
                                                autoComplete="name"
                                                value={
                                                    form.name
                                                }
                                                placeholder="Patient’s full name"
                                                onChange={(event) =>
                                                    setForm(
                                                        {
                                                            ...form,
                                                            name:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                disabled={
                                                    busy
                                                }
                                            />
                                        </label>

                                        <label className="nsp-wide">
                                            Phone number

                                            <input
                                                required
                                                type="tel"
                                                autoComplete="tel"
                                                value={
                                                    form.phone
                                                }
                                                placeholder="Enter phone number"
                                                onChange={(event) =>
                                                    setForm(
                                                        {
                                                            ...form,
                                                            phone:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                disabled={
                                                    busy
                                                }
                                            />
                                        </label>

                                        <label>
                                            Age

                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={
                                                    Number.isNaN(
                                                        form.age,
                                                    )
                                                        ? ""
                                                        : form.age
                                                }
                                                onChange={(event) =>
                                                    setForm(
                                                        {
                                                            ...form,
                                                            age:
                                                                event
                                                                    .target
                                                                    .valueAsNumber,
                                                        },
                                                    )
                                                }
                                                disabled={
                                                    busy
                                                }
                                            />
                                        </label>

                                        <label>
                                            Gender

                                            <select
                                                value={
                                                    form.gender
                                                }
                                                onChange={(event) =>
                                                    setForm(
                                                        {
                                                            ...form,
                                                            gender:
                                                                event
                                                                    .target
                                                                    .value as CreatePatientPayload["gender"],
                                                        },
                                                    )
                                                }
                                                disabled={
                                                    busy
                                                }
                                            >
                                                <option value="MALE">
                                                    Male
                                                </option>

                                                <option value="FEMALE">
                                                    Female
                                                </option>

                                                <option value="OTHER">
                                                    Other
                                                </option>
                                            </select>
                                        </label>

                                        <label className="nsp-wide">
                                            Address{" "}
                                            <small>
                                                Optional
                                            </small>

                                            <textarea
                                                rows={
                                                    2
                                                }
                                                autoComplete="street-address"
                                                value={
                                                    form.address ??
                                                    ""
                                                }
                                                placeholder="Area, city or full address"
                                                onChange={(event) =>
                                                    setForm(
                                                        {
                                                            ...form,
                                                            address:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                disabled={
                                                    busy
                                                }
                                            />
                                        </label>
                                    </div>

                                    <div className="nsp-section-divider">
                                        <span>
                                            Today’s visit
                                        </span>
                                    </div>

                                    {renderVisitFields()}
                                </>
                            ) : (
                                <>
                                    <div className="nsp-selected">
                                        <strong>
                                            {
                                                selectedPatient?.name
                                            }
                                        </strong>

                                        <p>
                                            {selectedPatient?.phone ||
                                                "No phone"}{" "}
                                            ·{" "}
                                            {selectedPatient?.age ??
                                                "—"}{" "}
                                            yrs ·{" "}
                                            {selectedPatient?.gender ||
                                                "—"}
                                        </p>

                                        <small>
                                            {selectedPatient?.patientCode ||
                                                selectedPatient?._id}
                                        </small>
                                    </div>

                                    {renderVisitFields()}
                                </>
                            )}

                            {formError && (
                                <p
                                    className="nsp-error"
                                    role="alert"
                                >
                                    <AlertCircle
                                        size={
                                            16
                                        }
                                    />{" "}
                                    {formError}
                                </p>
                            )}
                        </div>

                        <footer className="nsp-actions">
                            <button
                                type="button"
                                className="nsp-secondary"
                                onClick={closeModal}
                                disabled={busy}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="nsp-primary"
                                disabled={
                                    busy ||
                                    !canGenerateToken
                                }
                            >
                                {busy ? (
                                    <Loader2
                                        size={
                                            17
                                        }
                                        className="nsp-spin"
                                    />
                                ) : modal ===
                                  "new" ? (
                                    <Plus
                                        size={
                                            17
                                        }
                                    />
                                ) : (
                                    <Ticket
                                        size={
                                            17
                                        }
                                    />
                                )}

                                {busy
                                    ? "Saving…"
                                    : modal ===
                                        "new"
                                        ? "Add & generate token"
                                        : "Generate token"}
                            </button>
                        </footer>
                    </form>
                </PatientDialog>
            )}
        </main>
    );
}

const extraStyles = `
.nsp-section-divider{display:flex;align-items:center;gap:12px;margin:24px 0 18px;color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.nsp-section-divider:before,.nsp-section-divider:after{content:"";height:1px;background:var(--line);flex:1}.nsp-doctor-box{margin-top:18px;padding:16px;border:1px solid var(--line);border-radius:14px;background:#fafbf8}.nsp-doctor-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.nsp-doctor-head h3{margin-top:5px!important}.nsp-doctor-list{display:grid;gap:10px}.nsp-doctor-card{display:grid;grid-template-columns:auto 34px 1fr auto;align-items:center;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:white;cursor:pointer}.nsp-doctor-card:has(input:checked){background:#edf3e6;border-color:#78a58b}.nsp-doctor-card[data-available=false]{background:#f6f2ee;color:#95877a}.nsp-doctor-card input{accent-color:var(--green)}.nsp-doctor-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#edf3e6;color:var(--green)}.nsp-doctor-card strong{display:block;font-size:13px}.nsp-doctor-card small{display:block;margin-top:4px;font-size:11px;color:var(--muted);line-height:1.5}.nsp-doctor-card em{font-style:normal;font-size:10px;font-weight:800;padding:5px 8px;border-radius:30px;background:#edf3e6;color:var(--green);white-space:nowrap}.nsp-doctor-card[data-available=false] em{background:#fff1ed;color:#9b3e2b}.nsp-warning{padding:12px;border-radius:10px;background:#fff8e8;border:1px solid #eddcb6;color:#8a6117;font-size:12px;line-height:1.6}.nsp-help{margin-top:12px!important;color:var(--muted);font-size:12px;line-height:1.6}.nsp-register{justify-content:center}.nsp-token-actions{display:flex;flex-direction:column;gap:8px;min-width:180px}.nsp-token-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.nsp-token-info{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}.nsp-token-info small{font-size:10px;color:var(--muted);overflow-wrap:anywhere}.nsp-delete-token{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:7px 9px;border:1px solid #efc9c2;border-radius:9px;background:#fff1ed;color:#9b3e2b;font-size:11px;font-weight:700;white-space:nowrap}.nsp-delete-token:hover:not(:disabled){background:#fbded7}.nsp-token-status{padding:6px 8px;border-radius:8px;background:#f1f4ee;color:var(--muted);font-size:10px;font-weight:750;white-space:nowrap}@media(max-width:1100px){.nsp-token-actions{grid-column:2/-1}}@media(max-width:640px){.nsp-doctor-card{grid-template-columns:auto 30px 1fr}.nsp-doctor-card em{grid-column:2/-1;justify-self:start}.nsp-section-divider{margin:20px 0 14px}.nsp-token-actions{grid-column:1/-1}.nsp-token-row{align-items:stretch}.nsp-token-row .nsp-delete-token{flex:0 0 auto}}
@media(max-width:480px){.nsp-popup{width:calc(100% - 24px);max-height:calc(100dvh - 24px);padding:24px 18px 20px}}`;
// All styles live in this file and are scoped to this page.
const styles = `
.nsp-popup{position:fixed!important;top:50%!important;left:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;margin:0!important;width:calc(100% - 32px);max-width:420px;max-height:calc(100dvh - 32px);overflow:auto;border:0;border-radius:22px;padding:28px 24px 24px;background:#fff;color:var(--ink);box-shadow:0 28px 90px #102d2940;text-align:center}.nsp-popup::backdrop{background:#102d2966;backdrop-filter:blur(4px)}.nsp-popup-close{position:absolute;top:12px;right:12px;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:10px;background:transparent;color:var(--muted)}.nsp-popup-close:hover{background:#f1f4ee}.nsp-popup-icon{width:66px;height:66px;margin:0 auto 16px;display:grid;place-items:center;border-radius:20px}.nsp-popup-success .nsp-popup-icon{background:#e5f3e9;color:var(--green)}.nsp-popup-error .nsp-popup-icon{background:#fff1ed;color:#9b3e2b}.nsp-popup h2{font-size:22px;font-weight:750;margin:0 0 9px!important}.nsp-popup p{font-size:14px;line-height:1.6;color:var(--muted);margin:0!important}.nsp-popup-token{margin:18px 0 4px;padding:15px;border-radius:16px;background:#f6f8f3;border:1px solid var(--line)}.nsp-popup-token span{display:block;font-size:11px;color:var(--muted);font-weight:750;text-transform:uppercase;letter-spacing:.1em}.nsp-popup-token strong{display:block;margin-top:5px;font-size:26px;color:var(--green);letter-spacing:-.4px}.nsp-popup-token small{display:block;margin-top:4px;font-size:13px;color:var(--muted)}.nsp-popup-action{width:100%;margin-top:20px}.nsp-popup-error .nsp-popup-action{background:#9b3e2b;border-color:#9b3e2b}.nsp-popup-error .nsp-popup-action:hover:not(:disabled){background:#813321}
.nsp{--ink:#173d39;--muted:#6b7c75;--line:#dfe6dc;--green:#176957;color:var(--ink);background:#f5f6f2;min-height:100%;padding:32px;font-family:inherit}.nsp *{box-sizing:border-box}.nsp button,.nsp input,.nsp select,.nsp textarea{font:inherit}.nsp button{cursor:pointer;transition:background .18s,box-shadow .18s}.nsp button:disabled{opacity:.55;cursor:not-allowed}.nsp button:focus-visible,.nsp input:focus-visible,.nsp select:focus-visible,.nsp textarea:focus-visible{outline:3px solid #95c4b4;outline-offset:3px}.nsp h1,.nsp h2,.nsp h3,.nsp p{margin:0}.nsp-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.nsp-eyebrow{font-size:10px;letter-spacing:.15em;font-weight:700;color:var(--green)}.nsp h1{font-size:32px;font-weight:750;letter-spacing:-1px;margin:7px 0}.nsp-header p,.nsp-form-intro{font-size:14px;color:var(--muted);line-height:1.6}.nsp-primary,.nsp-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 17px;border-radius:12px;font-size:13px!important;font-weight:650!important;white-space:nowrap}.nsp-primary{background:var(--green);border:1px solid var(--green);color:white}.nsp-primary:hover:not(:disabled){background:#125442}.nsp-secondary{background:white;border:1px solid var(--line);color:var(--ink)}.nsp-secondary:hover:not(:disabled){background:#edf3e6}.nsp-summary{display:flex;flex-wrap:wrap;gap:20px;background:#eaf0e1;border:1px solid #dde6d4;padding:16px 20px;border-radius:15px;margin-bottom:22px;font-size:13px}.nsp-summary>span{display:flex;align-items:center;gap:8px}.nsp-summary strong{font-size:18px}.nsp-panel{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden}.nsp-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px;border-bottom:1px solid var(--line)}.nsp-tabs{display:flex;gap:4px;padding:4px;background:#f1f4ee;border-radius:12px}.nsp-tabs button{border:0;background:transparent;color:var(--muted);padding:10px 14px;border-radius:9px;font-size:13px;font-weight:650;white-space:nowrap}.nsp-tabs button[aria-pressed=true]{background:#173d39;color:white}.nsp-tabs span{margin-left:6px;opacity:.75;font-size:11px}.nsp-search{display:flex;align-items:center;gap:10px;min-width:0;width:320px;background:#f8faf6;border:1px solid var(--line);border-radius:12px;padding:0 12px;color:var(--muted)}.nsp-search input{min-width:0;width:100%;height:44px;background:transparent;border:0;color:var(--ink);font-size:13px}.nsp-icon{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:inherit}.nsp-icon:hover{background:#eaf0e1}.nsp-list-heading{display:flex;justify-content:space-between;padding:20px 22px 12px}.nsp-list-heading h2{font-size:15px;font-weight:700}.nsp-list-heading>span{font-size:12px;color:var(--muted)}.nsp-list{padding:0 22px 12px}.nsp-patient{display:grid;grid-template-columns:minmax(160px,1.4fr) minmax(105px,.8fr) minmax(115px,.8fr) minmax(100px,1fr) auto;align-items:center;gap:18px;padding:20px 0;border-bottom:1px solid #edf0e9}.nsp-patient:last-child{border-bottom:0}.nsp-person{display:flex;align-items:center;gap:12px;min-width:0}.nsp-person>div:last-child{min-width:0}.nsp-avatar{width:42px;height:42px;flex-shrink:0;display:grid;place-items:center;border-radius:14px;background:#edf3e6;color:var(--green);font-weight:700}.nsp h3{font-size:14px;font-weight:700;overflow-wrap:anywhere}.nsp-code{font-size:11px;color:var(--muted);margin-top:4px!important;overflow-wrap:anywhere}.nsp-detail{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:13px;overflow-wrap:anywhere}.nsp-detail small,.nsp-selected small{font-size:11px;color:var(--muted)}.nsp-visit{display:inline-flex;gap:6px;align-items:center;font-size:11px;font-weight:600;color:var(--green);background:#edf3e6;padding:8px 10px;border-radius:30px;white-space:nowrap}.nsp-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:13px;padding:65px 20px;color:var(--muted)}.nsp-empty h3{font-size:17px;color:var(--ink)}.nsp-empty p{font-size:13px;max-width:350px;line-height:1.6}.nsp-receipt{display:flex;align-items:center;gap:13px;padding:16px;background:#e5f3e9;border:1px solid #c8e1d2;border-radius:15px;margin-bottom:18px}.nsp-receipt>div{flex:1}.nsp-receipt p{font-size:13px;margin-top:4px}.nsp-error{background:#fff1ed;border:1px solid #f1d5cb;color:#9b3e2b;padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.5;margin:12px 0!important}.nsp-error button{background:transparent;border:0;text-decoration:underline;color:inherit;font-weight:700}.nsp-dialog{color:var(--ink);background:white;border:1px solid var(--line);border-radius:22px;padding:0;width:calc(100% - 28px);max-width:510px;max-height:90dvh;margin:auto;overflow:auto;box-shadow:0 24px 90px #12362b30}.nsp-dialog::backdrop{background:#102d2966;backdrop-filter:blur(4px)}.nsp-dialog-head{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;border-bottom:1px solid var(--line)}.nsp-dialog-head small{font-size:11px;color:var(--green);font-weight:650}.nsp-dialog-head h2{font-size:22px;margin-top:5px}.nsp-form-body{padding:22px 24px}.nsp-form-intro{margin-bottom:20px!important}.nsp-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.nsp-fields label{display:flex;flex-direction:column;gap:8px;font-size:12px;font-weight:650;min-width:0}.nsp-wide{grid-column:1/-1}.nsp-fields label small{font-weight:400;color:var(--muted)}.nsp-fields input,.nsp-fields select,.nsp-fields textarea{width:100%;border:1px solid var(--line);border-radius:10px;min-height:44px;padding:11px 12px;background:#fafbf8;color:var(--ink);font-size:14px}.nsp-fields textarea{resize:vertical}.nsp-actions{position:sticky;bottom:0;background:white;display:flex;justify-content:flex-end;gap:10px;padding:17px 24px;border-top:1px solid var(--line)}.nsp-selected{padding:16px;background:#edf3e6;border-radius:13px;margin-bottom:20px;overflow-wrap:anywhere}.nsp-selected p{font-size:13px;margin:6px 0}.nsp-priority{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0 0;padding:0;border:0}.nsp-priority legend{font-size:12px;font-weight:650;margin-bottom:10px}.nsp-priority label{display:flex;align-items:center;gap:9px;padding:13px;border:1px solid var(--line);border-radius:12px;cursor:pointer}.nsp-priority label:has(input:checked){background:#edf3e6;border-color:#78a58b}.nsp-priority input{accent-color:var(--green)}.nsp-priority strong,.nsp-priority small{display:block;font-size:12px}.nsp-priority small{font-size:11px;font-weight:400;color:var(--muted);margin-top:4px}.nsp-spin{animation:nsp-spin 1s linear infinite}@keyframes nsp-spin{to{transform:rotate(360deg)}}@media(min-width:1400px){.nsp{padding:36px 48px}}@media(max-width:1100px){.nsp-patient{grid-template-columns:1.3fr 1fr 1fr}.nsp-address{grid-column:2}.nsp-register,.nsp-visit{justify-self:end}.nsp-person{align-self:start;grid-row:span 2}}@media(max-width:640px){.nsp{padding:20px 14px}.nsp-header{align-items:flex-start;gap:12px}.nsp h1{font-size:27px}.nsp-header p{font-size:12px;max-width:230px}.nsp-eyebrow{font-size:8px;letter-spacing:.09em}.nsp-header>.nsp-primary{padding:10px;font-size:12px!important;margin-top:20px}.nsp-summary{gap:15px;padding:12px;font-size:11px;margin-bottom:16px}.nsp-summary strong{font-size:16px}.nsp-toolbar{flex-direction:column;align-items:stretch;padding:14px;gap:12px}.nsp-tabs button{flex:1}.nsp-search{width:100%}.nsp-list-heading{padding:18px 15px 12px}.nsp-list{padding:0 14px 14px;display:grid;gap:12px}.nsp-patient{grid-template-columns:1fr 1fr;gap:14px;padding:16px;border:1px solid var(--line)!important;border-radius:14px}.nsp-person{grid-column:1/-1;grid-row:auto}.nsp-address{grid-column:1/-1}.nsp-register,.nsp-visit{grid-column:1/-1;justify-self:stretch;justify-content:center}.nsp-dialog-head{padding:18px}.nsp-form-body{padding:18px}.nsp-actions{padding:14px 18px}.nsp-actions>*{flex:1}.nsp-priority{gap:8px}.nsp-priority label{padding:10px}.nsp-receipt{gap:9px;padding:12px}.nsp-receipt p{font-size:12px}}@media(prefers-reduced-motion:reduce){.nsp *{animation:none!important;transition:none!important}}
`;

/* Patient directory: independent styles avoid changing forms and dialogs. */
const patientTableStyles = `
.nsp-directory-scroll {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    scrollbar-color: #c6d5ca #f5f8f3;
}
.nsp-directory-scroll:focus-visible {
    outline: 3px solid #95c4b4;
    outline-offset: -3px;
}
.nsp-directory-table {
    width: 100%;
    min-width: 1060px;
    border-collapse: separate;
    border-spacing: 0;
    text-align: left;
    font-size: 13px;
    line-height: 1.5;
}
.nsp-directory-table thead th {
    padding: 13px 18px;
    background: #f2f6ed;
    color: #52665b;
    border-block: 1px solid var(--line);
    font-size: 11px;
    font-weight: 750;
    letter-spacing: .035em;
}
.nsp-directory-table tbody td,
.nsp-directory-table tbody th {
    padding: 19px 18px;
    vertical-align: top;
    border-bottom: 1px solid #e8ede6;
    font-weight: 400;
}
.nsp-directory-table tbody tr:last-child > * { border-bottom: 0; }
.nsp-directory-table tbody tr:focus-within > * { background: #f7faf4; }
@media (hover: hover) {
    .nsp-directory-table tbody tr:hover > * { background: #fbfcf9; }
}
.nsp-directory-person { width: 23%; min-width: 220px; }
.nsp-directory-contact { width: 17%; min-width: 168px; }
.nsp-directory-address { width: 19%; min-width: 165px; }
.nsp-directory-tokens { width: 27%; min-width: 292px; }
.nsp-directory-actions { width: 14%; min-width: 192px; }
.nsp-directory-identity { display: flex; align-items: flex-start; gap: 11px; }
.nsp-directory-identity > div { min-width: 0; }
.nsp-directory-identity strong {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    overflow-wrap: anywhere;
}
.nsp-directory-avatar {
    width: 39px;
    height: 39px;
    flex: 0 0 39px;
    display: grid;
    place-items: center;
    border: 1px solid #dce8d6;
    border-radius: 12px;
    background: #ecf3e6;
    color: var(--green);
    font-size: 15px;
    font-weight: 750;
}
.nsp-directory-code {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: #64766c;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
}
.nsp-directory-phone,
.nsp-directory-date { display: block; font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.nsp-directory-secondary { display: block; margin-top: 5px; font-size: 12px; color: #65766d; overflow-wrap: anywhere; }
.nsp-address-value { display: block; color: #40594d; overflow-wrap: anywhere; }
.nsp-visit-list { display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; }
.nsp-visit-card { padding: 10px 12px; background: #f9fbf7; border: 1px solid #e0e8dc; border-radius: 12px; }
.nsp-visit-main { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.nsp-token-number { display: inline-flex; align-items: center; gap: 6px; min-width: 0; color: var(--ink); font-size: 14px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.nsp-token-number svg { flex-shrink: 0; color: #6d8b73; }
.nsp-status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 7px; border-radius: 6px; font-size: 10px; font-weight: 700; background: #edf0ed; color: #52635b; }
.nsp-status-badge > span { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.nsp-status-badge[data-status="WAITING"] { background: #fff1d5; color: #80550c; }
.nsp-status-badge[data-status="CALLED"] { background: #e5efff; color: #315da0; }
.nsp-status-badge[data-status="SERVING"] { background: #dff2eb; color: #176957; }
.nsp-status-badge[data-status="COMPLETED"] { background: #e8f1e2; color: #486440; }
.nsp-status-badge[data-status="SKIPPED"],
.nsp-status-badge[data-status="CANCELLED"] { background: #f5eae7; color: #8a4a3d; }
.nsp-visit-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 5px; }
.nsp-token-department { font-size: 11px; color: #65766d; min-width: 0; overflow-wrap: anywhere; }
.nsp-token-remove { display: inline-flex; align-items: center; justify-content: center; gap: 5px; flex-shrink: 0; min-height: 36px; padding: 6px 8px; border: 1px solid #ebd4ce; border-radius: 8px; background: #fff; color: #954936; font-size: 11px!important; font-weight: 650!important; }
.nsp-token-remove:hover:not(:disabled) { background: #fff0eb; }
.nsp-directory-register { width: 100%; font-size: 12px!important; padding: 10px 12px; border-color: #cdddcf; color: #176957; white-space: normal; }
.nsp-mobile-label { display: none; }
.nsp-visually-hidden { position: absolute!important; width: 1px!important; height: 1px!important; padding: 0!important; margin: -1px!important; overflow: hidden!important; clip: rect(0,0,0,0)!important; white-space: nowrap!important; border: 0!important; }
.nsp-list-heading { align-items: center; gap: 12px; padding-bottom: 18px; }
.nsp-list-heading > span { flex-shrink: 0; padding: 4px 9px; border-radius: 8px; background: #f1f5ed; color: #52665b; font-variant-numeric: tabular-nums; }
.nsp-search { width: min(400px, 100%); }
.nsp { min-width: 0; }
.nsp-panel { min-width: 0; }

/* No sideways scrolling on phones: preserve every field in a compact card. */
@media (max-width: 760px) {
    .nsp-toolbar { flex-direction: column; align-items: stretch; }
    .nsp-search { width: 100%; }
    .nsp-tabs button { flex: 1; }
    .nsp-directory-scroll { overflow: visible; padding: 0 14px 16px; }
    .nsp-directory-table,
    .nsp-directory-table tbody { display: block; min-width: 0; width: 100%; }
    .nsp-directory-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
    .nsp-directory-table tbody { display: grid; gap: 12px; }
    .nsp-directory-table tbody tr { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 14px 12px; padding: 16px; border: 1px solid #dce5d6; border-radius: 16px; background: #fff; }
    .nsp-directory-table tbody td,
    .nsp-directory-table tbody th { display: block; width: auto; min-width: 0; padding: 0; border: 0; }
    .nsp-directory-table .nsp-directory-person { grid-column: 1 / -1; border-bottom: 1px solid #edf0e9; padding-bottom: 13px; }
    .nsp-directory-table .nsp-directory-tokens,
    .nsp-directory-table .nsp-directory-actions { grid-column: 1 / -1; }
    .nsp-directory-identity { align-items: center; }
    .nsp-directory-identity strong { font-size: 15px; }
    .nsp-directory-code { font-size: 11px; }
    .nsp-mobile-label { display: block; margin-bottom: 6px; font-size: 10px; font-weight: 650; color: #64766c; }
    .nsp-directory-phone { font-size: 13px; }
    .nsp-directory-secondary, .nsp-address-value { font-size: 12px; }
    .nsp-token-remove { min-height: 44px; padding-inline: 11px; }
    .nsp-directory-register { min-height: 44px; }
}
`;
