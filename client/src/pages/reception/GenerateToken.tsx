import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";

import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Loader2,
    Search,
    Stethoscope,
    Ticket,
    User,
    X,
} from "lucide-react";

import {
    getTokenEligiblePatients,
} from "../../services/patient.api";

import type {
    Patient,
} from "../../types/patient";

import {
    createQueue,
    type QueueData,
} from "../../services/queue.api";

import {
    getDepartments,
    type Department,
} from "../../services/department.api";

import {
    getAvailabilityDoctors,
    getDoctorAvailability,
    type AvailabilityDoctor,
} from "../../services/doctor/DoctorAvailability";

type Priority =
    | "NORMAL"
    | "EMERGENCY";

type DoctorAvailabilityData = {
    statusText?: string;
    todaySessions?: Array<{
        startTime: string;
        endTime: string;
        slotType?: string;
    }>;
    schedule?: {
        appointmentEnabled?: boolean;
        consultationMode?: string;
        weeklyAvailability?: Array<{
            day: string;
            isAvailable: boolean;
            sessions?: Array<{
                startTime: string;
                endTime: string;
                slotType?: string;
            }>;
            blockedPeriods?: Array<{
                startTime: string;
                endTime: string;
                reason?: string;
            }>;
        }>;
    };
};

const WEEK_DAYS = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
];

function getErrorMessage(
    error:
        unknown,
    fallback:
        string,
) {
    const message =
        (
            error as {
                response?: {
                    data?: {
                        message?: unknown;
                    };
                };
            }
        )?.response?.data?.message;

    return typeof message ===
        "string"
        ? message
        : fallback;
}

function getDoctorDepartmentId(
    doctor:
        AvailabilityDoctor | any,
) {
    return String(
        doctor.departmentId?._id ||
        doctor.departmentId ||
        doctor.department?._id ||
        doctor.department ||
        "",
    );
}

function getTodayDayName() {
    return WEEK_DAYS[
        new Date().getDay()
    ];
}

function getTodaySessionsFromAvailability(
    availability:
        DoctorAvailabilityData | null,
) {
    if (
        !availability
    ) {
        return [];
    }

    if (
        Array.isArray(
            availability.todaySessions,
        ) &&
        availability.todaySessions.length
    ) {
        return availability.todaySessions;
    }

    const today =
        getTodayDayName();

    const daySchedule =
        availability.schedule?.weeklyAvailability?.find(
            (
                item,
            ) =>
                item.day ===
                today &&
                item.isAvailable !==
                false,
        );

    return daySchedule?.sessions ||
        [];
}

export default function GenerateToken() {
    const [
        patients,
        setPatients,
    ] =
        useState<Patient[]>(
            [],
        );

    const [
        departments,
        setDepartments,
    ] =
        useState<Department[]>(
            [],
        );

    const [
        doctors,
        setDoctors,
    ] =
        useState<AvailabilityDoctor[]>(
            [],
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        loadError,
        setLoadError,
    ] =
        useState("");

    const [
        error,
        setError,
    ] =
        useState("");

    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        selectedPatient,
        setSelectedPatient,
    ] =
        useState<Patient | null>(
            null,
        );

    const [
        departmentId,
        setDepartmentId,
    ] =
        useState("");

    const [
        doctorId,
        setDoctorId,
    ] =
        useState("");

    const [
        doctorAvailability,
        setDoctorAvailability,
    ] =
        useState<DoctorAvailabilityData | null>(
            null,
        );

    const [
        priority,
        setPriority,
    ] =
        useState<Priority>(
            "NORMAL",
        );

    const [
        submitting,
        setSubmitting,
    ] =
        useState(false);

    const [
        generatedQueue,
        setGeneratedQueue,
    ] =
        useState<QueueData | null>(
            null,
        );

    const busyRef =
        useRef(false);

    const requestRef =
        useRef(0);

    const searchRef =
        useRef<HTMLInputElement>(
            null,
        );

    const receiptRef =
        useRef<HTMLHeadingElement>(
            null,
        );

    const load =
        useCallback(
            async () => {
                const request =
                    ++requestRef.current;

                setLoading(
                    true,
                );

                setLoadError(
                    "",
                );

                try {
                    const [
                        patientData,
                        departmentData,
                        doctorResponse,
                    ] =
                        await Promise.all([
                            getTokenEligiblePatients(),
                            getDepartments(),
                            getAvailabilityDoctors(),
                        ]);

                    if (
                        request !==
                        requestRef.current
                    ) {
                        return;
                    }

                    setPatients(
                        patientData ||
                        [],
                    );

                    setDepartments(
                        (
                            departmentData ||
                            []
                        ).filter(
                            (
                                department,
                            ) =>
                                department.isActive,
                        ),
                    );

                    const doctorList =
                        Array.isArray(
                            doctorResponse,
                        )
                            ? doctorResponse
                            : doctorResponse?.data ||
                            [];

                    setDoctors(
                        doctorList,
                    );
                } catch (error) {
                    if (
                        request ===
                        requestRef.current
                    ) {
                        setLoadError(
                            getErrorMessage(
                                error,
                                "Unable to load patients, departments and doctors. Please try again.",
                            ),
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
            [],
        );

    useEffect(
        () => {
            void load();

            return () => {
                requestRef.current++;
            };
        },
        [
            load,
        ],
    );

    useEffect(
        () => {
            if (
                generatedQueue
            ) {
                receiptRef.current?.focus();
            }
        },
        [
            generatedQueue,
        ],
    );

    const matches =
        useMemo(
            () => {
                const query =
                    search
                        .trim()
                        .toLowerCase();

                if (
                    !query
                ) {
                    return [];
                }

                return patients.filter(
                    (
                        patient,
                    ) =>
                        [
                            patient.name,
                            patient.phone,
                            patient.patientCode,
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
                patients,
                search,
            ],
        );

    const filteredDoctors =
        useMemo(
            () => {
                if (
                    !departmentId
                ) {
                    return [];
                }

                return doctors.filter(
                    (
                        doctor,
                    ) =>
                        getDoctorDepartmentId(
                            doctor,
                        ) ===
                        departmentId,
                );
            },
            [
                doctors,
                departmentId,
            ],
        );

    const selectedDoctor =
        useMemo(
            () => {
                return doctors.find(
                    (
                        doctor,
                    ) =>
                        doctor._id ===
                        doctorId,
                );
            },
            [
                doctors,
                doctorId,
            ],
        );

    useEffect(
        () => {
            if (
                !doctorId
            ) {
                setDoctorAvailability(
                    null,
                );

                return;
            }

            let active =
                true;

            const loadDoctorAvailability =
                async () => {
                    try {
                        const response =
                            await getDoctorAvailability(
                                doctorId,
                            );

                        if (
                            !active
                        ) {
                            return;
                        }

                        setDoctorAvailability(
                            response?.data ||
                            response ||
                            null,
                        );
                    } catch (error) {
                        if (
                            active
                        ) {
                            setDoctorAvailability(
                                null,
                            );
                        }
                    }
                };

            void loadDoctorAvailability();

            return () => {
                active =
                    false;
            };
        },
        [
            doctorId,
        ],
    );

    const todaySessions =
        useMemo(
            () =>
                getTodaySessionsFromAvailability(
                    doctorAvailability,
                ),
            [
                doctorAvailability,
            ],
        );

    function clearPatient() {
        setSelectedPatient(
            null,
        );

        setSearch(
            "",
        );

        setError(
            "",
        );

        requestAnimationFrame(
            () =>
                searchRef.current?.focus(),
        );
    }

    async function handleGenerateToken(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            busyRef.current
        ) {
            return;
        }

        if (
            !selectedPatient
        ) {
            setError(
                "Select a patient from the search results.",
            );

            searchRef.current?.focus();

            return;
        }

        if (
            !departmentId
        ) {
            setError(
                "Choose a department.",
            );

            return;
        }

        if (
            !doctorId
        ) {
            setError(
                "Choose a doctor.",
            );

            return;
        }

        busyRef.current =
            true;

        setSubmitting(
            true,
        );

        setError(
            "",
        );

        try {
            const response =
                await createQueue({
                    patientId:
                        selectedPatient._id,

                    departmentId,

                    doctorId,

                    priority,
                });

            setGeneratedQueue(
                response.data.queue,
            );

            setPatients(
                (
                    previous,
                ) =>
                    previous.filter(
                        (
                            patient,
                        ) =>
                            patient._id !==
                            selectedPatient._id,
                    ),
            );
        } catch (error) {
            setError(
                getErrorMessage(
                    error,
                    "Unable to generate token. Please try again.",
                ),
            );
        } finally {
            busyRef.current =
                false;

            setSubmitting(
                false,
            );
        }
    }

    function resetForm() {
        setGeneratedQueue(
            null,
        );

        setSelectedPatient(
            null,
        );

        setSearch(
            "",
        );

        setDepartmentId(
            "",
        );

        setDoctorId(
            "",
        );

        setDoctorAvailability(
            null,
        );

        setPriority(
            "NORMAL",
        );

        setError(
            "",
        );

        requestAnimationFrame(
            () =>
                searchRef.current?.focus(),
        );
    }

    const skipped =
        generatedQueue?.status ===
        "SKIPPED";

    return (
        <main className="nst">
            <style>
                {styles}
            </style>

            <div className="nst-wrap">
                <header className="nst-header">
                    <span>
                        RECEPTION · PATIENT VISITS
                    </span>

                    <h1>
                        Generate token
                    </h1>

                    <p>
                        Select a patient, choose department, select doctor and generate a live queue token.
                    </p>
                </header>

                {generatedQueue ? (
                    <section
                        className="nst-card nst-receipt"
                        aria-label="Token confirmation"
                    >
                        <div
                            className={`nst-receipt-top ${skipped
                                ? "nst-skipped"
                                : ""
                                }`}
                        >
                            {skipped ? (
                                <AlertCircle
                                    size={32}
                                />
                            ) : (
                                <CheckCircle2
                                    size={32}
                                />
                            )}

                            <h2
                                ref={receiptRef}
                                tabIndex={-1}
                            >
                                {skipped
                                    ? "Token skipped"
                                    : "Your token is ready"}
                            </h2>

                            <p>
                                {skipped
                                    ? "Please contact reception for assistance."
                                    : "The patient has been added to the doctor queue."}
                            </p>

                            <small>
                                TOKEN NUMBER
                            </small>

                            <strong className="nst-token">
                                {generatedQueue.tokenLabel}
                            </strong>
                        </div>

                        <div className="nst-receipt-body">
                            <dl>
                                <div>
                                    <dt>
                                        Patient
                                    </dt>

                                    <dd>
                                        {generatedQueue.patientId?.name ||
                                            selectedPatient?.name ||
                                            "—"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Department
                                    </dt>

                                    <dd>
                                        {generatedQueue.departmentId?.name ||
                                            departments.find(
                                                (
                                                    department,
                                                ) =>
                                                    department._id ===
                                                    departmentId,
                                            )?.name ||
                                            "—"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Doctor
                                    </dt>

                                    <dd>
                                        {(generatedQueue as any).doctorId?.name ||
                                            selectedDoctor?.name ||
                                            "—"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Priority
                                    </dt>

                                    <dd>
                                        {generatedQueue.priority ===
                                            "EMERGENCY"
                                            ? "Emergency"
                                            : "Normal"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Status
                                    </dt>

                                    <dd>
                                        {generatedQueue.status.charAt(
                                            0,
                                        ) +
                                            generatedQueue.status
                                                .slice(
                                                    1,
                                                )
                                                .toLowerCase()}
                                    </dd>
                                </div>
                            </dl>

                            <div className="nst-note">
                                <Clock
                                    size={18}
                                />

                                <p>
                                    {skipped
                                        ? "Check with reception whether the token can be recalled or rescheduled."
                                        : "Keep this token number ready and wait for it to be called."}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="nst-primary"
                                onClick={resetForm}
                            >
                                <Ticket
                                    size={18}
                                />
                                Generate another token
                            </button>
                        </div>
                    </section>
                ) : (
                    <section
                        className="nst-card"
                        aria-busy={
                            loading ||
                            submitting
                        }
                    >
                        {loading ? (
                            <div
                                className="nst-empty"
                                role="status"
                            >
                                <Loader2
                                    size={30}
                                    className="nst-spin"
                                />

                                <h2>
                                    Getting things ready…
                                </h2>

                                <p>
                                    Loading patients, departments and doctors.
                                </p>
                            </div>
                        ) : loadError ? (
                            <div
                                className="nst-empty"
                                role="alert"
                            >
                                <AlertCircle
                                    size={30}
                                />

                                <h2>
                                    Unable to load the form
                                </h2>

                                <p>
                                    {loadError}
                                </p>

                                <button
                                    type="button"
                                    className="nst-secondary"
                                    onClick={() =>
                                        void load()
                                    }
                                >
                                    Try again
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleGenerateToken}>
                                <div className="nst-form">
                                    <div className="nst-section-title">
                                        <span className="nst-icon">
                                            <Ticket
                                                size={20}
                                            />
                                        </span>

                                        <div>
                                            <h2>
                                                New visit
                                            </h2>

                                            <p>
                                                Patient, department and doctor details
                                            </p>
                                        </div>
                                    </div>

                                    <label
                                        className="nst-label"
                                        htmlFor="token-patient"
                                    >
                                        Patient
                                    </label>

                                    {selectedPatient ? (
                                        <div className="nst-selected">
                                            <span className="nst-avatar">
                                                <User
                                                    size={20}
                                                />
                                            </span>

                                            <div>
                                                <strong>
                                                    {selectedPatient.name}
                                                </strong>

                                                <small>
                                                    {selectedPatient.phone ||
                                                        "No phone number"}
                                                    {selectedPatient.patientCode
                                                        ? ` · ${selectedPatient.patientCode}`
                                                        : ""}
                                                </small>
                                            </div>

                                            <button
                                                type="button"
                                                aria-label="Change selected patient"
                                                disabled={submitting}
                                                onClick={clearPatient}
                                            >
                                                <X
                                                    size={18}
                                                />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="nst-search">
                                                <Search
                                                    size={18}
                                                />

                                                <input
                                                    ref={searchRef}
                                                    id="token-patient"
                                                    value={search}
                                                    onChange={(event) => {
                                                        setSearch(
                                                            event.target.value,
                                                        );

                                                        setError(
                                                            "",
                                                        );
                                                    }}
                                                    placeholder="Name, phone or patient ID"
                                                    autoComplete="off"
                                                    disabled={submitting}
                                                    aria-describedby="token-search-help"
                                                />

                                                {search && (
                                                    <button
                                                        type="button"
                                                        aria-label="Clear search"
                                                        onClick={clearPatient}
                                                    >
                                                        <X
                                                            size={17}
                                                        />
                                                    </button>
                                                )}
                                            </div>

                                            <p
                                                className="nst-help"
                                                id="token-search-help"
                                            >
                                                Search existing patients eligible for a token.
                                            </p>

                                            {search.trim() && (
                                                <div className="nst-results">
                                                    <p role="status">
                                                        {matches.length
                                                            ? `${matches.length} matching ${matches.length ===
                                                                1
                                                                ? "patient"
                                                                : "patients"}${matches.length >
                                                                    6
                                                                    ? " · Showing first 6; refine your search"
                                                                    : ""}`
                                                            : "No eligible patients found. Try another name or phone number."}
                                                    </p>

                                                    {matches
                                                        .slice(
                                                            0,
                                                            6,
                                                        )
                                                        .map(
                                                            (
                                                                patient,
                                                            ) => (
                                                                <button
                                                                    key={patient._id}
                                                                    type="button"
                                                                    disabled={submitting}
                                                                    onClick={() => {
                                                                        setSelectedPatient(
                                                                            patient,
                                                                        );

                                                                        setSearch(
                                                                            "",
                                                                        );

                                                                        setError(
                                                                            "",
                                                                        );
                                                                    }}
                                                                >
                                                                    <span className="nst-avatar">
                                                                        <User
                                                                            size={17}
                                                                        />
                                                                    </span>

                                                                    <span>
                                                                        <strong>
                                                                            {patient.name}
                                                                        </strong>

                                                                        <small>
                                                                            {patient.phone ||
                                                                                "No phone number"}
                                                                            {patient.patientCode
                                                                                ? ` · ${patient.patientCode}`
                                                                                : ""}
                                                                        </small>
                                                                    </span>

                                                                    <span className="nst-select-text">
                                                                        Select
                                                                    </span>
                                                                </button>
                                                            ),
                                                        )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <label
                                        className="nst-label nst-gap"
                                        htmlFor="token-department"
                                    >
                                        Department
                                    </label>

                                    <select
                                        id="token-department"
                                        value={departmentId}
                                        required
                                        disabled={
                                            submitting ||
                                            !departments.length
                                        }
                                        onChange={(event) => {
                                            setDepartmentId(
                                                event.target.value,
                                            );

                                            setDoctorId(
                                                "",
                                            );

                                            setDoctorAvailability(
                                                null,
                                            );

                                            setError(
                                                "",
                                            );
                                        }}
                                    >
                                        <option value="">
                                            Choose a department
                                        </option>

                                        {departments.map(
                                            (
                                                department,
                                            ) => (
                                                <option
                                                    key={department._id}
                                                    value={department._id}
                                                >
                                                    {department.name}
                                                </option>
                                            ),
                                        )}
                                    </select>

                                    {!departments.length && (
                                        <p className="nst-help">
                                            No active departments are available. Activate a department before generating tokens.
                                        </p>
                                    )}

                                    <label
                                        className="nst-label nst-gap"
                                        htmlFor="token-doctor"
                                    >
                                        Doctor
                                    </label>

                                    <select
                                        id="token-doctor"
                                        value={doctorId}
                                        required
                                        disabled={
                                            submitting ||
                                            !departmentId ||
                                            !filteredDoctors.length
                                        }
                                        onChange={(event) => {
                                            setDoctorId(
                                                event.target.value,
                                            );

                                            setError(
                                                "",
                                            );
                                        }}
                                    >
                                        <option value="">
                                            Choose a doctor
                                        </option>

                                        {filteredDoctors.map(
                                            (
                                                doctor,
                                            ) => (
                                                <option
                                                    key={doctor._id}
                                                    value={doctor._id}
                                                >
                                                    {doctor.name}
                                                    {doctor.isOnline
                                                        ? " · Online"
                                                        : " · Offline"}
                                                </option>
                                            ),
                                        )}
                                    </select>

                                    {departmentId &&
                                        !filteredDoctors.length && (
                                            <p className="nst-help">
                                                No active doctor found for this department.
                                            </p>
                                        )}

                                    {doctorId && (
                                        <div className="nst-doctor-box">
                                            <div>
                                                <Stethoscope
                                                    size={17}
                                                />

                                                <strong>
                                                    {doctorAvailability?.statusText ||
                                                        selectedDoctor?.name ||
                                                        "Doctor selected"}
                                                </strong>
                                            </div>

                                            {todaySessions.length ? (
                                                <p>
                                                    Today OPD:{" "}
                                                    {todaySessions
                                                        .map(
                                                            (
                                                                session,
                                                            ) =>
                                                                `${session.startTime} - ${session.endTime}`,
                                                        )
                                                        .join(
                                                            ", ",
                                                        )}
                                                </p>
                                            ) : doctorAvailability ? (
                                                <p>
                                                    No OPD session configured for today.
                                                </p>
                                            ) : (
                                                <p>
                                                    Loading doctor availability...
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <fieldset
                                        className="nst-priority"
                                        disabled={submitting}
                                    >
                                        <legend>
                                            Visit priority
                                        </legend>

                                        <label
                                            className={
                                                priority ===
                                                    "NORMAL"
                                                    ? "nst-choice-active"
                                                    : ""
                                            }
                                        >
                                            <input
                                                type="radio"
                                                name="priority"
                                                checked={
                                                    priority ===
                                                    "NORMAL"
                                                }
                                                onChange={() =>
                                                    setPriority(
                                                        "NORMAL",
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

                                        <label
                                            className={
                                                priority ===
                                                    "EMERGENCY"
                                                    ? "nst-choice-urgent"
                                                    : ""
                                            }
                                        >
                                            <input
                                                type="radio"
                                                name="priority"
                                                checked={
                                                    priority ===
                                                    "EMERGENCY"
                                                }
                                                onChange={() =>
                                                    setPriority(
                                                        "EMERGENCY",
                                                    )
                                                }
                                            />

                                            <span>
                                                <strong>
                                                    Emergency
                                                </strong>

                                                <small>
                                                    Higher priority
                                                </small>
                                            </span>
                                        </label>
                                    </fieldset>

                                    {error && (
                                        <div
                                            className="nst-error"
                                            role="alert"
                                        >
                                            <AlertCircle
                                                size={18}
                                            />

                                            <span>
                                                {error}
                                            </span>

                                            <button
                                                type="button"
                                                aria-label="Dismiss error"
                                                onClick={() =>
                                                    setError(
                                                        "",
                                                    )
                                                }
                                            >
                                                <X
                                                    size={17}
                                                />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <footer className="nst-actions">
                                    <button
                                        type="submit"
                                        className="nst-primary"
                                        disabled={
                                            submitting ||
                                            !departments.length ||
                                            !departmentId ||
                                            !doctorId
                                        }
                                    >
                                        {submitting ? (
                                            <Loader2
                                                size={18}
                                                className="nst-spin"
                                            />
                                        ) : (
                                            <Ticket
                                                size={18}
                                            />
                                        )}

                                        {submitting
                                            ? "Generating token…"
                                            : "Generate token"}
                                    </button>
                                </footer>
                            </form>
                        )}
                    </section>
                )}

                <p className="nst-brand">
                    NextSynq Health
                </p>
            </div>
        </main>
    );
}

const styles = `
.nst{--ink:#173d39;--green:#176957;--muted:#6c7d73;--line:#dfe6dc;background:#f5f6f2;color:var(--ink);padding:32px 20px;min-height:100%;font-family:inherit}
.nst *{box-sizing:border-box}
.nst h1,.nst h2,.nst p{margin:0}
.nst button,.nst input,.nst select{font:inherit}
.nst button{cursor:pointer;transition:background .18s,border-color .18s}
.nst button:disabled{opacity:.55;cursor:not-allowed}
.nst button:focus-visible,.nst input:focus-visible,.nst select:focus-visible{outline:3px solid #99c4af;outline-offset:3px}
.nst-wrap{max-width:620px;margin:0 auto}
.nst-header{margin-bottom:24px}
.nst-header>span{font-size:10px;letter-spacing:.14em;font-weight:700;color:var(--green)}
.nst h1{font-size:30px;letter-spacing:-.9px;font-weight:750;margin:8px 0}
.nst-header p{font-size:14px;color:var(--muted);line-height:1.6}
.nst-card{border:1px solid var(--line);border-radius:22px;background:white;box-shadow:0 5px 25px #173d3904}
.nst-form{padding:26px}
.nst-section-title{display:flex;gap:12px;align-items:center;margin-bottom:24px}
.nst-section-title h2{font-size:17px;font-weight:700}
.nst-section-title p{font-size:12px;color:var(--muted);margin-top:4px}
.nst-icon{display:grid;place-items:center;background:#edf3e6;color:var(--green);height:44px;width:44px;border-radius:13px}
.nst-label{display:block;font-size:12px;font-weight:650;margin-bottom:9px}
.nst-gap{margin-top:22px}
.nst-search{display:flex;align-items:center;gap:10px;padding:0 13px;border:1px solid var(--line);background:#fafbf8;border-radius:11px;color:var(--muted)}
.nst-search input{width:100%;min-width:0;border:0;background:transparent;color:var(--ink);height:46px;font-size:13px}
.nst-help{font-size:11px;color:var(--muted);line-height:1.6;margin-top:8px!important}
.nst select{width:100%;min-height:46px;border:1px solid var(--line);border-radius:11px;padding:11px 13px;background:#fafbf8;color:var(--ink);font-size:13px}
.nst-selected{display:flex;align-items:center;gap:11px;border:1px solid #ccddc4;background:#edf3e6;padding:14px;border-radius:12px}
.nst-selected>div{flex:1;min-width:0;overflow-wrap:anywhere}
.nst-avatar{display:grid;place-items:center;width:36px;height:36px;flex-shrink:0;background:#f0f5eb;color:var(--green);border-radius:11px}
.nst-selected .nst-avatar{background:white}
.nst-selected strong,.nst-results strong{display:block;font-size:13px;font-weight:650}
.nst-selected small,.nst-results small{display:block;font-size:11px;color:var(--muted);margin-top:4px;line-height:1.5}
.nst-selected button,.nst-search button,.nst-error button{display:grid;place-items:center;border:0;background:transparent;color:inherit;min-width:36px;min-height:40px;border-radius:8px}
.nst-selected button:hover,.nst-search button:hover{background:#e6eddf}
.nst-results{border:1px solid var(--line);border-radius:12px;margin-top:10px;overflow:hidden}
.nst-results>p{font-size:11px;color:var(--muted);background:#f8faf6;padding:11px 13px;line-height:1.6}
.nst-results>button{display:flex;align-items:center;gap:10px;width:100%;padding:12px;border:0;border-top:1px solid #edf0e9;background:white;text-align:left;color:var(--ink)}
.nst-results>button:hover{background:#f1f6eb}
.nst-results>button>span:nth-child(2){flex:1;min-width:0;overflow-wrap:anywhere}
.nst-select-text{font-size:11px;color:var(--green);font-weight:650}
.nst-doctor-box{margin-top:10px;border:1px solid #ccddc4;background:#edf3e6;border-radius:12px;padding:13px;color:var(--ink)}
.nst-doctor-box>div{display:flex;align-items:center;gap:8px;font-size:12px}
.nst-doctor-box p{margin-top:8px;font-size:11px;color:var(--muted);line-height:1.6}
.nst-priority{display:grid;grid-template-columns:1fr 1fr;gap:12px;border:0;padding:0;margin:24px 0 0}
.nst-priority legend{font-size:12px;font-weight:650;margin-bottom:10px}
.nst-priority label{display:flex;align-items:center;gap:10px;padding:15px;border:1px solid var(--line);border-radius:12px;cursor:pointer}
.nst-priority input{accent-color:var(--green);margin:0;flex-shrink:0}
.nst-priority strong{display:block;font-size:12px}
.nst-priority small{display:block;font-size:11px;color:var(--muted);margin-top:5px}
.nst-priority .nst-choice-active{background:#edf3e6;border-color:#94b39b}
.nst-priority .nst-choice-urgent{background:#fff1eb;border-color:#dcb4a1}
.nst-choice-urgent input{accent-color:#ac523a}
.nst-actions{padding:18px 26px;border-top:1px solid var(--line);background:#fcfdf9;border-radius:0 0 22px 22px;position:sticky;bottom:0;z-index:1}
.nst-primary,.nst-secondary{display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid var(--green);background:var(--green);color:white;min-height:46px;border-radius:12px;padding:12px 18px;font-size:13px!important;font-weight:650!important;width:100%}
.nst-primary:hover:not(:disabled){background:#125442}
.nst-secondary{width:auto;background:white;color:var(--green);border-color:var(--line)}
.nst-error{display:flex;align-items:center;gap:10px;background:#fff1ec;border:1px solid #eed1c5;color:#9e4931;border-radius:11px;padding:10px 12px;margin-top:20px;font-size:12px;line-height:1.6}
.nst-error>span{flex:1}
.nst-error>svg{flex-shrink:0}
.nst-brand{text-align:center;color:var(--muted);font-size:11px;margin-top:18px!important}
.nst-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;min-height:310px;padding:35px;text-align:center;color:var(--muted)}
.nst-empty h2{font-size:17px;color:var(--ink)}
.nst-empty p{font-size:13px;line-height:1.6}
.nst-receipt{overflow:hidden}
.nst-receipt-top{text-align:center;background:var(--ink);color:white;padding:28px 24px}
.nst-receipt-top>svg{color:#c9e2b8;margin-bottom:12px}
.nst-receipt-top h2{font-size:21px;font-weight:700}
.nst-receipt-top p{font-size:12px;color:#c7d9d0;margin-top:8px;line-height:1.6}
.nst-receipt-top>small{display:block;font-size:10px;letter-spacing:.15em;color:#c7d9d0;margin-top:25px}
.nst-token{display:block;font-size:clamp(36px,8vw,60px);font-weight:750;letter-spacing:-1.5px;line-height:1.2;margin-top:8px;overflow-wrap:anywhere}
.nst-skipped{background:#785b2c}
.nst-receipt-body{padding:24px}
.nst-receipt dl{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:0 0 22px}
.nst-receipt dt{font-size:11px;color:var(--muted)}
.nst-receipt dd{font-size:14px;font-weight:650;margin:5px 0 0;overflow-wrap:anywhere}
.nst-note{display:flex;align-items:flex-start;gap:10px;background:#edf3e6;border-radius:11px;padding:14px;margin-bottom:20px;font-size:12px;line-height:1.6;color:#53684f}
.nst-note svg{flex-shrink:0;margin-top:1px}
.nst-spin{animation:nst-spin 1s linear infinite}
@keyframes nst-spin{to{transform:rotate(360deg)}}
@media(max-width:600px){
    .nst{padding:20px 14px}
    .nst-header{margin-bottom:18px}
    .nst-header>span{font-size:9px}
    .nst h1{font-size:26px}
    .nst-header p{font-size:12px}
    .nst-form{padding:18px}
    .nst-card{border-radius:17px}
    .nst-section-title{margin-bottom:20px}
    .nst-priority{gap:9px}
    .nst-priority label{padding:13px 10px;gap:8px}
    .nst-actions{padding:14px 18px;border-radius:0 0 17px 17px;padding-bottom:max(14px,env(safe-area-inset-bottom))}
    .nst-receipt-body{padding:20px}
    .nst-receipt-top{padding:24px 18px}
    .nst-selected{padding:11px}
    .nst-select-text{display:none}
}
@media(prefers-reduced-motion:reduce){
    .nst *{animation:none!important;transition:none!important}
}
`;