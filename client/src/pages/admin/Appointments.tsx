import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Loader2,
    Plus,
    RefreshCw,
    Save,
    Search,
    Settings,
    Ticket,
    UserRound,
    Users,
    X,
} from "lucide-react";

import {
    cancelAppointment,
    checkInAppointment,
    collectAppointmentPayment,
    confirmAppointment,
    createAppointment,
    getAppointmentDoctors,
    getAppointments,
    getDoctorSlots,
    markAppointmentArrived,
    markAppointmentNoShow,
    searchAppointmentPatients,
    updateDoctorSchedule,
    type AppointmentDoctor,
    type AppointmentItem,
    type AppointmentPatient,
    type ConsultationMode,
    type DoctorSlot,
    type HybridPattern,
    type UpdateDoctorSchedulePayload,
    type WeekDay,
} from "../../services/appointment.api";
import socket from "../../socket/socket";

/* ============================================================
   TYPES
============================================================ */

type ScheduleSessionForm = {
    startTime: string;
    endTime: string;
    slotType: "APPOINTMENT" | "WALK_IN";
};

type ScheduleDayForm = {
    day: WeekDay;
    isAvailable: boolean;
    sessions: ScheduleSessionForm[];
};

type ScheduleForm = {
    consultationMode: ConsultationMode;
    appointmentEnabled: boolean;
    confirmationRequired: boolean;
    slotDurationMinutes: number;
    weeklyAvailability: ScheduleDayForm[];
    maxAppointmentsPerDay: number;
    maxWalkInsPerDay: number;
    emergencyBufferPerDay: number;
    bookingWindowDays: number;
    gracePeriodMinutes: number;
    hybridPattern: HybridPattern[];
};

type AppointmentActionType =
    | "confirm"
    | "arrived"
    | "payment"
    | "cancel"
    | "no-show"
    | "check-in";

type ActionState = {
    type: string;
    id: string;
} | null;

/* ============================================================
   CONSTANTS
============================================================ */

const WEEK_DAYS: {
    day: WeekDay;
    label: string;
}[] = [
        {
            day: "MONDAY",
            label: "Mon",
        },
        {
            day: "TUESDAY",
            label: "Tue",
        },
        {
            day: "WEDNESDAY",
            label: "Wed",
        },
        {
            day: "THURSDAY",
            label: "Thu",
        },
        {
            day: "FRIDAY",
            label: "Fri",
        },
        {
            day: "SATURDAY",
            label: "Sat",
        },
        {
            day: "SUNDAY",
            label: "Sun",
        },
    ];

const STATUS_OPTIONS = [
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
        value:
            number,
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

const getDayFromDate =
    (
        date:
            string,
    ): WeekDay => {
        const dayIndex =
            new Date(
                `${date}T00:00:00`,
            ).getDay();

        const map:
            Record<number, WeekDay> = {
            0: "SUNDAY",
            1: "MONDAY",
            2: "TUESDAY",
            3: "WEDNESDAY",
            4: "THURSDAY",
            5: "FRIDAY",
            6: "SATURDAY",
        };

        return map[dayIndex];
    };

const getDefaultWeeklyAvailability =
    (
        selectedDate:
            string,
    ): ScheduleDayForm[] => {
        const selectedDay =
            getDayFromDate(
                selectedDate,
            );

        return WEEK_DAYS.map(
            (
                item,
            ) => ({
                day:
                    item.day,

                isAvailable:
                    item.day ===
                    selectedDay,

                sessions: [
                    {
                        startTime:
                            "10:00",

                        endTime:
                            "13:00",

                        slotType:
                            "APPOINTMENT",
                    },
                ],
            }),
        );
    };

const getDefaultScheduleForm =
    (
        selectedDate:
            string,
    ): ScheduleForm => ({
        consultationMode:
            "HYBRID",

        appointmentEnabled:
            true,

        confirmationRequired:
            false,

        slotDurationMinutes:
            15,

        weeklyAvailability:
            getDefaultWeeklyAvailability(
                selectedDate,
            ),

        maxAppointmentsPerDay:
            40,

        maxWalkInsPerDay:
            100,

        emergencyBufferPerDay:
            5,

        bookingWindowDays:
            30,

        gracePeriodMinutes:
            15,

        hybridPattern: [
            "APPOINTMENT",
            "WALK_IN",
        ],
    });

const unwrapList =
    <T,>(
        response:
            any,
    ): T[] => {
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

const unwrapSlots =
    (
        response:
            any,
    ): DoctorSlot[] => {
        return (
            response?.data?.slots ||
            response?.data?.data?.slots ||
            response?.slots ||
            []
        );
    };

const getDoctorDepartmentId =
    (
        doctor:
            AppointmentDoctor | null,
    ) => {
        if (
            !doctor?.departmentId
        ) {
            return "";
        }

        return doctor.departmentId._id;
    };

const getDoctorDepartmentName =
    (
        doctor:
            AppointmentDoctor,
    ) => {
        return doctor.departmentId?.name ||
            "No department";
    };

const getPatientName =
    (
        appointment:
            AppointmentItem,
    ) => {
        const patient:
            any =
            appointment.patientId;

        return patient?.name ||
            "Patient";
    };

const getPatientPhone =
    (
        appointment:
            AppointmentItem,
    ) => {
        const patient:
            any =
            appointment.patientId;

        return patient?.phone ||
            "-";
    };

const getDoctorName =
    (
        appointment:
            AppointmentItem,
    ) => {
        const doctor:
            any =
            appointment.doctorId;

        return doctor?.name ||
            "Doctor";
    };

const getDepartmentName =
    (
        appointment:
            AppointmentItem,
    ) => {
        const department:
            any =
            appointment.departmentId;

        return department?.name ||
            "Department";
    };

const getAppointmentId =
    (
        appointment:
            AppointmentItem,
    ) => {
        const item:
            any =
            appointment;

        return String(
            item._id ||
            item.id ||
            "",
        );
    };

const getAppointmentStatus =
    (
        appointment:
            AppointmentItem,
    ) => {
        return String(
            (
                appointment as any
            ).status ||
            "",
        );
    };

const getPaymentStatus =
    (
        appointment:
            AppointmentItem,
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
        appointment:
            AppointmentItem,
    ) => {
        const queue:
            any =
            (
                appointment as any
            ).queueId;

        if (
            !queue
        ) {
            return "Not checked in";
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

const hasArrived =
    (
        appointment:
            AppointmentItem,
    ) => {
        const item:
            any =
            appointment;

        return Boolean(
            item.arrivedAt ||
            item.status ===
            "ARRIVED" ||
            item.status ===
            "CHECKED_IN",
        );
    };

const isClosedStatus =
    (
        status:
            string,
    ) => {
        return [
            "CHECKED_IN",
            "IN_CONSULTATION",
            "COMPLETED",
            "CANCELLED",
            "REJECTED",
            "NO_SHOW",
        ].includes(
            status,
        );
    };

/* ============================================================
   COMPONENT
============================================================ */

const Appointments =
    () => {
        const [
            view,
            setView,
        ] =
            useState<
                "appointments" |
                "slots"
            >(
                "appointments",
            );

        const [
            showAllSlots,
            setShowAllSlots,
        ] =
            useState(false);

        const mutationPending =
            useRef(false);

        const [
            doctors,
            setDoctors,
        ] =
            useState<
                AppointmentDoctor[]
            >([]);

        const [
            selectedDoctorId,
            setSelectedDoctorId,
        ] =
            useState("ALL");

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
            useState("ALL");

        const [
            slots,
            setSlots,
        ] =
            useState<
                DoctorSlot[]
            >([]);

        const [
            appointments,
            setAppointments,
        ] =
            useState<
                AppointmentItem[]
            >([]);

        const [
            patients,
            setPatients,
        ] =
            useState<
                AppointmentPatient[]
            >([]);

        const [
            selectedPatient,
            setSelectedPatient,
        ] =
            useState<
                AppointmentPatient |
                null
            >(null);

        const [
            selectedSlot,
            setSelectedSlot,
        ] =
            useState<
                DoctorSlot |
                null
            >(null);

        const [
            patientSearch,
            setPatientSearch,
        ] =
            useState("");

        const [
            reason,
            setReason,
        ] =
            useState("");

        const [
            notes,
            setNotes,
        ] =
            useState("");

        const [
            loading,
            setLoading,
        ] =
            useState(true);

        const [
            slotsLoading,
            setSlotsLoading,
        ] =
            useState(false);

        const [
            appointmentsLoading,
            setAppointmentsLoading,
        ] =
            useState(false);

        const [
            patientSearchLoading,
            setPatientSearchLoading,
        ] =
            useState(false);

        const [
            scheduleSaving,
            setScheduleSaving,
        ] =
            useState(false);

        const [
            bookingLoading,
            setBookingLoading,
        ] =
            useState(false);

        const [
            actionState,
            setActionState,
        ] =
            useState<
                ActionState
            >(null);

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

        const [
            scheduleModalOpen,
            setScheduleModalOpen,
        ] =
            useState(false);

        const [
            bookingModalOpen,
            setBookingModalOpen,
        ] =
            useState(false);

        const [
            scheduleForm,
            setScheduleForm,
        ] =
            useState<
                ScheduleForm
            >(
                getDefaultScheduleForm(
                    selectedDate,
                ),
            );

        const selectedDoctor =
            useMemo(
                () => {
                    if (
                        !selectedDoctorId ||
                        selectedDoctorId === "ALL"
                    ) {
                        return null;
                    }

                    return (
                        doctors.find(
                            (
                                doctor,
                            ) =>
                                doctor._id ===
                                selectedDoctorId,
                        ) ||
                        null
                    );
                },
                [
                    doctors,
                    selectedDoctorId,
                ],
            );

        const availableSlots =
            useMemo(
                () =>
                    slots.filter(
                        (
                            slot,
                        ) =>
                            slot.status ===
                            "AVAILABLE" &&
                            slot.slotType ===
                            "APPOINTMENT",
                    ),
                [
                    slots,
                ],
            );

        /* ========================================================
           LOAD DOCTORS
        ======================================================== */

        const loadDoctors =
            useCallback(
                async () => {
                    try {
                        setLoading(
                            true,
                        );

                        setError("");

                        const response =
                            await getAppointmentDoctors();

                        const doctorList =
                            unwrapList<
                                AppointmentDoctor
                            >(
                                response,
                            );

                        setDoctors(
                            doctorList,
                        );

                        setSelectedDoctorId(
                            (
                                current,
                            ) => {
                                if (
                                    current === "ALL"
                                ) {
                                    return "ALL";
                                }

                                return doctorList.some(
                                    (
                                        doctor,
                                    ) =>
                                        doctor._id ===
                                        current,
                                )
                                    ? current
                                    : "ALL";
                            },
                        );
                    } catch (
                    error:
                        any
                    ) {
                        console.error(
                            "Load appointment doctors error:",
                            error,
                        );

                        setError(
                            error?.response?.data?.message ||
                            "Failed to load doctors",
                        );
                    } finally {
                        setLoading(
                            false,
                        );
                    }
                },
                [],
            );

        /* ========================================================
           LOAD SLOTS
        ======================================================== */

        const loadSlots =
            useCallback(
                async () => {
                    if (
                        !selectedDoctorId ||
                        selectedDoctorId === "ALL" ||
                        !selectedDate
                    ) {
                        setSlots([]);

                        return;
                    }

                    try {
                        setSlotsLoading(
                            true,
                        );

                        setError("");

                        const response =
                            await getDoctorSlots(
                                selectedDoctorId,
                                selectedDate,
                            );

                        setSlots(
                            unwrapSlots(
                                response,
                            ),
                        );
                    } catch (
                    error:
                        any
                    ) {
                        console.error(
                            "Load doctor slots error:",
                            error,
                        );

                        setSlots([]);

                        setError(
                            error?.response?.data?.message ||
                            "Failed to load slots. Please configure doctor schedule first.",
                        );
                    } finally {
                        setSlotsLoading(
                            false,
                        );
                    }
                },
                [
                    selectedDoctorId,
                    selectedDate,
                ],
            );

        /* ========================================================
           LOAD APPOINTMENTS
        ======================================================== */

        const loadAppointments =
            useCallback(
                async () => {
                    try {
                        setAppointmentsLoading(
                            true,
                        );

                        const response =
                            await getAppointments({
                                date:
                                    selectedDate,

                                doctorId:
                                    selectedDoctorId &&
                                        selectedDoctorId !== "ALL"
                                        ? selectedDoctorId
                                        : undefined,

                                status:
                                    selectedStatus,
                            });

                        setAppointments(
                            unwrapList<
                                AppointmentItem
                            >(
                                response,
                            ),
                        );
                    } catch (
                    error:
                        any
                    ) {
                        console.error(
                            "Load appointments error:",
                            error,
                        );

                        setError(
                            error?.response?.data?.message ||
                            "Failed to load appointments",
                        );
                    } finally {
                        setAppointmentsLoading(
                            false,
                        );
                    }
                },
                [
                    selectedDate,
                    selectedDoctorId,
                    selectedStatus,
                ],
            );

        useEffect(
            () => {
                loadDoctors();
            },
            [
                loadDoctors,
            ],
        );

        useEffect(
            () => {
                void loadSlots();
                void loadAppointments();
            },
            [
                selectedDoctorId,
                selectedDate,
                selectedStatus,
                loadSlots,
                loadAppointments,
            ],
        );
        useEffect(
            () => {
                const handleAppointmentCreated =
                    () => {
                        void loadAppointments();
                    };

                const handleAppointmentUpdated =
                    () => {
                        void loadAppointments();
                    };

                socket.on(
                    "appointment:created",
                    handleAppointmentCreated,
                );

                socket.on(
                    "appointment:updated",
                    handleAppointmentUpdated,
                );

                return () => {
                    socket.off(
                        "appointment:created",
                        handleAppointmentCreated,
                    );

                    socket.off(
                        "appointment:updated",
                        handleAppointmentUpdated,
                    );
                };
            },
            [
                loadAppointments,
            ],
        );

        /* ========================================================
           SCHEDULE MODAL
        ======================================================== */

        const openScheduleModal =
            () => {
                setError("");

                const selectedDoctorAny:
                    any =
                    selectedDoctor;

                if (
                    selectedDoctorAny?.schedule
                ) {
                    const existing =
                        selectedDoctorAny.schedule;

                    const existingDays =
                        existing.weeklyAvailability ||
                        [];

                    const weeklyAvailability:
                        ScheduleDayForm[] =
                        WEEK_DAYS.map(
                            (
                                dayItem,
                            ) => {
                                const found =
                                    existingDays.find(
                                        (
                                            item:
                                                any,
                                        ) =>
                                            item.day ===
                                            dayItem.day,
                                    );

                                const sessions:
                                    ScheduleSessionForm[] =
                                    found?.sessions?.length
                                        ? found.sessions.map(
                                            (
                                                session:
                                                    any,
                                            ) => ({
                                                startTime:
                                                    session.startTime,

                                                endTime:
                                                    session.endTime,

                                                slotType:
                                                    session.slotType ===
                                                        "WALK_IN"
                                                        ? "WALK_IN"
                                                        : "APPOINTMENT",
                                            }),
                                        )
                                        : [
                                            {
                                                startTime:
                                                    "10:00",

                                                endTime:
                                                    "13:00",

                                                slotType:
                                                    "APPOINTMENT",
                                            },
                                        ];

                                return {
                                    day:
                                        dayItem.day,

                                    isAvailable:
                                        found?.isAvailable ||
                                        false,

                                    sessions,
                                };
                            },
                        );

                    setScheduleForm({
                        consultationMode:
                            existing.consultationMode ||
                            "HYBRID",

                        appointmentEnabled:
                            existing.appointmentEnabled ??
                            true,

                        confirmationRequired:
                            existing.confirmationRequired ??
                            false,

                        slotDurationMinutes:
                            existing.slotDurationMinutes ||
                            15,

                        weeklyAvailability,

                        maxAppointmentsPerDay:
                            existing.maxAppointmentsPerDay ??
                            40,

                        maxWalkInsPerDay:
                            existing.maxWalkInsPerDay ??
                            100,

                        emergencyBufferPerDay:
                            existing.emergencyBufferPerDay ??
                            5,

                        bookingWindowDays:
                            existing.bookingWindowDays ||
                            30,

                        gracePeriodMinutes:
                            existing.gracePeriodMinutes ??
                            15,

                        hybridPattern:
                            existing.hybridPattern?.length
                                ? existing.hybridPattern
                                : [
                                    "APPOINTMENT",
                                    "WALK_IN",
                                ],
                    });
                } else {
                    setScheduleForm(
                        getDefaultScheduleForm(
                            selectedDate,
                        ),
                    );
                }

                setScheduleModalOpen(
                    true,
                );
            };

        const updateScheduleDay =
            (
                day:
                    WeekDay,
                changes:
                    Partial<
                        ScheduleDayForm
                    >,
            ) => {
                setScheduleForm(
                    (
                        previous,
                    ) => ({
                        ...previous,

                        weeklyAvailability:
                            previous.weeklyAvailability.map(
                                (
                                    item,
                                ) =>
                                    item.day ===
                                        day
                                        ? {
                                            ...item,
                                            ...changes,
                                        }
                                        : item,
                            ),
                    }),
                );
            };

        const updateScheduleSession =
            (
                day:
                    WeekDay,
                index:
                    number,
                changes:
                    Partial<
                        ScheduleSessionForm
                    >,
            ) => {
                setScheduleForm(
                    (
                        previous,
                    ) => ({
                        ...previous,

                        weeklyAvailability:
                            previous.weeklyAvailability.map(
                                (
                                    item,
                                ) => {
                                    if (
                                        item.day !==
                                        day
                                    ) {
                                        return item;
                                    }

                                    return {
                                        ...item,

                                        sessions:
                                            item.sessions.map(
                                                (
                                                    session,
                                                    sessionIndex,
                                                ) =>
                                                    sessionIndex ===
                                                        index
                                                        ? {
                                                            ...session,
                                                            ...changes,
                                                        }
                                                        : session,
                                            ),
                                    };
                                },
                            ),
                    }),
                );
            };

        const addScheduleSession =
            (
                day:
                    WeekDay,
            ) => {
                setScheduleForm(
                    (
                        previous,
                    ) => ({
                        ...previous,

                        weeklyAvailability:
                            previous.weeklyAvailability.map(
                                (
                                    item,
                                ) =>
                                    item.day ===
                                        day
                                        ? {
                                            ...item,

                                            sessions: [
                                                ...item.sessions,
                                                {
                                                    startTime:
                                                        "17:00",

                                                    endTime:
                                                        "20:00",

                                                    slotType:
                                                        "APPOINTMENT",
                                                },
                                            ],
                                        }
                                        : item,
                            ),
                    }),
                );
            };

        const removeScheduleSession =
            (
                day:
                    WeekDay,
                index:
                    number,
            ) => {
                setScheduleForm(
                    (
                        previous,
                    ) => ({
                        ...previous,

                        weeklyAvailability:
                            previous.weeklyAvailability.map(
                                (
                                    item,
                                ) =>
                                    item.day ===
                                        day
                                        ? {
                                            ...item,

                                            sessions:
                                                item.sessions.filter(
                                                    (
                                                        _,
                                                        sessionIndex,
                                                    ) =>
                                                        sessionIndex !==
                                                        index,
                                                ),
                                        }
                                        : item,
                            ),
                    }),
                );
            };

        const normalizeScheduleFormByMode =
            (
                form:
                    ScheduleForm,
            ): ScheduleForm => {
                if (
                    form.consultationMode ===
                    "APPOINTMENT_ONLY" ||
                    form.consultationMode ===
                    "ON_CALL_APPOINTMENT"
                ) {
                    return {
                        ...form,

                        appointmentEnabled:
                            true,

                        confirmationRequired:
                            form.consultationMode ===
                                "ON_CALL_APPOINTMENT"
                                ? true
                                : form.confirmationRequired,

                        hybridPattern:
                            [
                                "APPOINTMENT",
                            ] as HybridPattern[],

                        weeklyAvailability:
                            form.weeklyAvailability.map(
                                (
                                    day,
                                ) => ({
                                    ...day,

                                    sessions:
                                        day.sessions.map(
                                            (
                                                session,
                                            ) => ({
                                                ...session,

                                                slotType:
                                                    "APPOINTMENT",
                                            }),
                                        ),
                                }),
                            ),
                    };
                }

                if (
                    form.consultationMode ===
                    "OPD_ONLY"
                ) {
                    return {
                        ...form,

                        appointmentEnabled:
                            false,

                        confirmationRequired:
                            false,

                        hybridPattern:
                            [
                                "WALK_IN",
                            ] as HybridPattern[],

                        weeklyAvailability:
                            form.weeklyAvailability.map(
                                (
                                    day,
                                ) => ({
                                    ...day,

                                    sessions:
                                        day.sessions.map(
                                            (
                                                session,
                                            ) => ({
                                                ...session,

                                                slotType:
                                                    "WALK_IN",
                                            }),
                                        ),
                                }),
                            ),
                    };
                }

                return {
                    ...form,

                    appointmentEnabled:
                        true,

                    hybridPattern:
                        form.hybridPattern?.length
                            ? form.hybridPattern
                            : [
                                "APPOINTMENT",
                                "WALK_IN",
                            ] as HybridPattern[],
                };
            };
        const handleConsultationModeChange =
            (
                mode:
                    ConsultationMode,
            ) => {
                /*
                 * IMPORTANT:
                 * Do not auto-detect consultation mode from sessions.
                 * The dropdown value is the final source of truth.
                 */
                setScheduleForm(
                    (
                        previous,
                    ) => {
                        if (
                            mode ===
                            "HYBRID"
                        ) {
                            return {
                                ...previous,

                                consultationMode:
                                    "HYBRID",

                                appointmentEnabled:
                                    true,

                                confirmationRequired:
                                    false,

                                hybridPattern:
                                    [
                                        "APPOINTMENT",
                                        "WALK_IN",
                                    ] as HybridPattern[],
                            };
                        }

                        if (
                            mode ===
                            "APPOINTMENT_ONLY"
                        ) {
                            return {
                                ...previous,

                                consultationMode:
                                    "APPOINTMENT_ONLY",

                                appointmentEnabled:
                                    true,

                                confirmationRequired:
                                    false,

                                hybridPattern:
                                    [
                                        "APPOINTMENT",
                                    ] as HybridPattern[],

                                weeklyAvailability:
                                    previous.weeklyAvailability.map(
                                        (
                                            day,
                                        ) => ({
                                            ...day,

                                            sessions:
                                                day.sessions.map(
                                                    (
                                                        session,
                                                    ) => ({
                                                        ...session,

                                                        slotType:
                                                            "APPOINTMENT",
                                                    }),
                                                ),
                                        }),
                                    ),
                            };
                        }

                        if (
                            mode ===
                            "ON_CALL_APPOINTMENT"
                        ) {
                            return {
                                ...previous,

                                consultationMode:
                                    "ON_CALL_APPOINTMENT",

                                appointmentEnabled:
                                    true,

                                confirmationRequired:
                                    true,

                                hybridPattern:
                                    [
                                        "APPOINTMENT",
                                    ] as HybridPattern[],

                                weeklyAvailability:
                                    previous.weeklyAvailability.map(
                                        (
                                            day,
                                        ) => ({
                                            ...day,

                                            sessions:
                                                day.sessions.map(
                                                    (
                                                        session,
                                                    ) => ({
                                                        ...session,

                                                        slotType:
                                                            "APPOINTMENT",
                                                    }),
                                                ),
                                        }),
                                    ),
                            };
                        }

                        return {
                            ...previous,

                            consultationMode:
                                "OPD_ONLY",

                            appointmentEnabled:
                                false,

                            confirmationRequired:
                                false,

                            hybridPattern:
                                [
                                    "WALK_IN",
                                ] as HybridPattern[],

                            weeklyAvailability:
                                previous.weeklyAvailability.map(
                                    (
                                        day,
                                    ) => ({
                                        ...day,

                                        sessions:
                                            day.sessions.map(
                                                (
                                                    session,
                                                ) => ({
                                                    ...session,

                                                    slotType:
                                                        "WALK_IN",
                                                }),
                                            ),
                                    }),
                                ),
                        };
                    },
                );
            };

const handleSaveSchedule =
            async () => {
                if (
                    !selectedDoctor
                ) {
                    return;
                }

                const finalScheduleForm =
                    normalizeScheduleFormByMode(
                        scheduleForm,
                    );

                for (
                    const day of finalScheduleForm.weeklyAvailability.filter(
                        (
                            item,
                        ) =>
                            item.isAvailable,
                    )
                ) {
                    const sessions =
                        [
                            ...day.sessions,
                        ].sort(
                            (
                                first,
                                second,
                            ) =>
                                first.startTime.localeCompare(
                                    second.startTime,
                                ),
                        );

                    if (
                        !sessions.length ||
                        sessions.some(
                            (
                                session,
                                index,
                            ) =>
                                !session.startTime ||
                                !session.endTime ||
                                session.endTime <=
                                session.startTime ||
                                (
                                    index >
                                    0 &&
                                    session.startTime <
                                    sessions[
                                        index -
                                        1
                                    ].endTime
                                ),
                        )
                    ) {
                        setError(
                            `Check ${day.day.toLowerCase()}: sessions must have valid times and must not overlap.`,
                        );

                        return;
                    }
                }

                if (
                    !Number.isFinite(
                        finalScheduleForm.slotDurationMinutes,
                    ) ||
                    finalScheduleForm.slotDurationMinutes <
                    5
                ) {
                    setError(
                        "Slot duration must be at least 5 minutes.",
                    );

                    return;
                }

                const activeDays =
                    finalScheduleForm.weeklyAvailability
                        .filter(
                            (
                                item,
                            ) =>
                                item.isAvailable,
                        )
                        .map(
                            (
                                item,
                            ) => ({
                                day:
                                    item.day,

                                isAvailable:
                                    item.isAvailable,

                                sessions:
                                    item.sessions.filter(
                                        (
                                            session,
                                        ) =>
                                            session.startTime &&
                                            session.endTime,
                                    ),
                            }),
                        );

                if (
                    activeDays.length ===
                    0
                ) {
                    setError(
                        "Please select at least one available day.",
                    );

                    return;
                }

                if (
                    mutationPending.current
                ) {
                    return;
                }

                mutationPending.current =
                    true;

                try {
                    setScheduleSaving(
                        true,
                    );

                    setError("");
                    setSuccess("");

                    const selectedDoctorAny:
                        any =
                        selectedDoctor;
                    const finalMode =
                        finalScheduleForm.consultationMode;

                    const finalHybridPattern:
                        HybridPattern[] =
                        finalMode === "HYBRID"
                            ? (
                                finalScheduleForm.hybridPattern?.length
                                    ? finalScheduleForm.hybridPattern
                                    : [
                                        "APPOINTMENT",
                                        "WALK_IN",
                                    ] as HybridPattern[]
                            ).filter(
                                (
                                    item,
                                ): item is HybridPattern =>
                                    item === "APPOINTMENT" ||
                                    item === "WALK_IN",
                            )
                            : finalMode === "OPD_ONLY"
                                ? [
                                    "WALK_IN",
                                ] as HybridPattern[]
                                : [
                                    "APPOINTMENT",
                                ] as HybridPattern[];

const payload:
                        UpdateDoctorSchedulePayload = {
                        consultationMode:
                            finalMode,

                        appointmentEnabled:
                            finalMode !== "OPD_ONLY",

                        confirmationRequired:
                            finalMode === "ON_CALL_APPOINTMENT"
                                ? true
                                : finalScheduleForm.confirmationRequired,

                        slotDurationMinutes:
                            Number(
                                finalScheduleForm.slotDurationMinutes,
                            ),

                        weeklyAvailability:
                            activeDays,

                        blockedDates:
                            selectedDoctorAny.schedule?.blockedDates ??
                            [],

                        maxAppointmentsPerDay:
                            Number(
                                finalScheduleForm.maxAppointmentsPerDay,
                            ),

                        maxWalkInsPerDay:
                            Number(
                                finalScheduleForm.maxWalkInsPerDay,
                            ),

                        emergencyBufferPerDay:
                            finalMode === "APPOINTMENT_ONLY" ||
                            finalMode === "ON_CALL_APPOINTMENT"
                                ? 0
                                : Number(
                                    finalScheduleForm.emergencyBufferPerDay,
                                ),

                        bookingWindowDays:
                            Number(
                                finalScheduleForm.bookingWindowDays,
                            ),

                        gracePeriodMinutes:
                            Number(
                                finalScheduleForm.gracePeriodMinutes,
                            ),

                        hybridPattern:
                            finalHybridPattern,
                    };

                    await updateDoctorSchedule(
                        selectedDoctor._id,
                        payload,
                    );

                    setSuccess(
                        "Doctor schedule updated successfully.",
                    );

                    setScheduleModalOpen(
                        false,
                    );

                    await loadDoctors();
                    await loadSlots();
                } catch (
                error:
                    any
                ) {
                    console.error(
                        "Save schedule error:",
                        error,
                    );

                    setError(
                        error?.response?.data?.message ||
                        "Failed to update doctor schedule",
                    );
                } finally {
                    mutationPending.current =
                        false;

                    setScheduleSaving(
                        false,
                    );
                }
            };

        /* ========================================================
           PATIENT SEARCH
        ======================================================== */

        const handlePatientSearch =
            async () => {
                const query =
                    patientSearch.trim();

                if (
                    query.length <
                    2
                ) {
                    setError(
                        "Enter at least 2 characters to search patient.",
                    );

                    return;
                }

                try {
                    setPatientSearchLoading(
                        true,
                    );

                    setError("");

                    const response =
                        await searchAppointmentPatients(
                            query,
                        );

                    setPatients(
                        unwrapList<
                            AppointmentPatient
                        >(
                            response,
                        ),
                    );
                } catch (
                error:
                    any
                ) {
                    console.error(
                        "Patient search error:",
                        error,
                    );

                    setError(
                        error?.response?.data?.message ||
                        "Failed to search patients",
                    );
                } finally {
                    setPatientSearchLoading(
                        false,
                    );
                }
            };

        /* ========================================================
           BOOK APPOINTMENT
        ======================================================== */

        const openBookingModal =
            (
                slot:
                    DoctorSlot,
            ) => {
                setError("");
                setSelectedSlot(
                    slot,
                );
                setSelectedPatient(
                    null,
                );
                setPatients([]);
                setPatientSearch("");
                setReason("");
                setNotes("");
                setBookingModalOpen(
                    true,
                );
            };

        const handleBookAppointment =
            async () => {
                if (
                    !selectedDoctor ||
                    !selectedSlot ||
                    !selectedPatient
                ) {
                    setError(
                        "Please select doctor, slot and patient.",
                    );

                    return;
                }

                const departmentId =
                    getDoctorDepartmentId(
                        selectedDoctor,
                    );

                if (
                    !departmentId
                ) {
                    setError(
                        "Doctor department not found. Please assign department to doctor.",
                    );

                    return;
                }

                if (
                    mutationPending.current
                ) {
                    return;
                }

                mutationPending.current =
                    true;

                try {
                    setBookingLoading(
                        true,
                    );

                    setError("");
                    setSuccess("");

                    await createAppointment({
                        patientId:
                            selectedPatient._id,

                        doctorId:
                            selectedDoctor._id,

                        departmentId,

                        slotId:
                            selectedSlot._id,

                        reason:
                            reason.trim() ||
                            undefined,

                        notes:
                            notes.trim() ||
                            undefined,
                    });

                    setSuccess(
                        "Appointment booked successfully.",
                    );

                    setBookingModalOpen(
                        false,
                    );

                    await loadSlots();
                    await loadAppointments();
                } catch (
                error:
                    any
                ) {
                    console.error(
                        "Book appointment error:",
                        error,
                    );

                    setError(
                        error?.response?.data?.message ||
                        "Failed to book appointment",
                    );
                } finally {
                    mutationPending.current =
                        false;

                    setBookingLoading(
                        false,
                    );
                }
            };

        /* ========================================================
           APPOINTMENT ACTIONS
        ======================================================== */

        const runAppointmentAction =
            async (
                appointmentId:
                    string,
                type:
                    AppointmentActionType,
            ) => {
                if (
                    (
                        type ===
                        "cancel" ||
                        type ===
                        "no-show"
                    ) &&
                    !window.confirm(
                        type ===
                            "cancel"
                            ? "Cancel this appointment?"
                            : "Mark this appointment as no-show?",
                    )
                ) {
                    return;
                }

                if (
                    mutationPending.current
                ) {
                    return;
                }

                mutationPending.current =
                    true;

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
                        "arrived"
                    ) {
                        await markAppointmentArrived(
                            appointmentId,
                        );

                        setSuccess(
                            "Patient marked as arrived.",
                        );
                    }

                    if (
                        type ===
                        "payment"
                    ) {
                        const amount =
                            window.prompt(
                                "Enter consultation fee",
                                "500",
                            );

                        if (
                            !amount
                        ) {
                            return;
                        }

                        const parsedAmount =
                            Number(
                                amount,
                            );

                        if (
                            !Number.isFinite(
                                parsedAmount,
                            ) ||
                            parsedAmount <=
                            0
                        ) {
                            setError(
                                "Enter a valid payment amount.",
                            );

                            return;
                        }

                        await collectAppointmentPayment(
                            appointmentId,
                            {
                                paidAmount:
                                    parsedAmount,

                                feeAmount:
                                    parsedAmount,

                                paymentMethod:
                                    "CASH",
                            },
                        );

                        setSuccess(
                            "Payment collected successfully.",
                        );
                    }

                    if (
                        type ===
                        "cancel"
                    ) {
                        await cancelAppointment(
                            appointmentId,
                            "Cancelled by hospital",
                        );

                        setSuccess(
                            "Appointment cancelled.",
                        );
                    }

                    if (
                        type ===
                        "no-show"
                    ) {
                        await markAppointmentNoShow(
                            appointmentId,
                        );

                        setSuccess(
                            "Appointment marked as no-show.",
                        );
                    }

                    if (
                        type ===
                        "check-in"
                    ) {
                        await checkInAppointment(
                            appointmentId,
                        );

                        setSuccess(
                            "Patient checked in and queue token generated.",
                        );
                    }

                    await loadSlots();
                    await loadAppointments();
                } catch (
                error:
                    any
                ) {
                    console.error(
                        "Appointment action error:",
                        error,
                    );

                    setError(
                        error?.response?.data?.message ||
                        "Action failed",
                    );
                } finally {
                    mutationPending.current =
                        false;

                    setActionState(
                        null,
                    );
                }
            };

        /* ========================================================
           RENDER
        ======================================================== */

        return (
            <div className="am-page">

                <AppointmentsStyles />

                <header className="am-header">
                    <div>
                        <p className="am-eyebrow">
                            HOSPITAL WORKSPACE
                        </p>

                        <h1>
                            Appointments
                        </h1>

                        <p>
                            Manage reserved appointments, arrival, payment and check-in queue tokens.
                        </p>
                    </div>

                    <div className="am-header-actions">
                        <button
                            type="button"
                            className="am-button am-secondary"
                            disabled={
                                loading ||
                                slotsLoading ||
                                appointmentsLoading
                            }
                            onClick={() => {
                                void loadDoctors();
                                void loadSlots();
                                void loadAppointments();
                            }}
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>

                        <button
                            type="button"
                            className="am-button am-primary"
                            disabled={
                                !selectedDoctor
                            }
                            onClick={() =>
                                setView(
                                    "slots",
                                )
                            }
                        >
                            <Plus size={17} />
                            Book appointment
                        </button>
                    </div>
                </header>

                {error &&
                    !scheduleModalOpen &&
                    !bookingModalOpen && (
                        <div
                            className="am-error"
                            role="alert"
                        >
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
                        Doctor

                        <select
                            value={
                                selectedDoctorId
                            }
                            disabled={
                                loading
                            }
                            onChange={(
                                event,
                            ) =>
                                setSelectedDoctorId(
                                    event.target.value,
                                )
                            }
                        >
                            <option value="ALL">
                                All doctors · show all appointments
                            </option>

                            {!doctors.length && (
                                <option value="">
                                    No doctors found
                                </option>
                            )}

                            {doctors.map(
                                (
                                    doctor,
                                ) => (
                                    <option
                                        key={
                                            doctor._id
                                        }
                                        value={
                                            doctor._id
                                        }
                                    >
                                        Dr. {doctor.name} · {getDoctorDepartmentName(
                                            doctor,
                                        )}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

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

                    <button
                        type="button"
                        className="am-button am-secondary"
                        disabled={
                            !selectedDoctor
                        }
                        onClick={
                            openScheduleModal
                        }
                    >
                        <Settings size={16} />
                        Doctor schedule
                    </button>
                </section>

                <div className="am-metrics">
                    <div>
                        <span>
                            Appointment slots available
                        </span>

                        <strong>
                            {slotsLoading
                                ? "—"
                                : availableSlots.length}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Total slots
                        </span>

                        <strong>
                            {slotsLoading
                                ? "—"
                                : slots.length}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Appointments · current filter
                        </span>

                        <strong>
                            {appointmentsLoading
                                ? "—"
                                : appointments.length}
                        </strong>
                    </div>
                </div>

                <div
                    className="am-tabs"
                    role="group"
                    aria-label="Appointment views"
                >
                    <button
                        type="button"
                        aria-pressed={
                            view ===
                            "appointments"
                        }
                        onClick={() =>
                            setView(
                                "appointments",
                            )
                        }
                    >
                        <Users size={17} />
                        Appointments
                    </button>

                    <button
                        type="button"
                        aria-pressed={
                            view ===
                            "slots"
                        }
                        onClick={() =>
                            setView(
                                "slots",
                            )
                        }
                    >
                        <Clock3 size={17} />
                        Available slots
                    </button>
                </div>

                {loading ? (
                    <div
                        className="am-empty"
                        role="status"
                    >
                        <Loader2
                            className="am-spin"
                            size={26}
                        />

                        Loading doctors…
                    </div>
                ) : view ===
                    "appointments" ? (
                    <section className="am-panel">
                        <div className="am-panel-heading">
                            <div>
                                <h2>
                                    Patient appointments
                                </h2>

                                <p>
                                    Receptionist flow: Arrived → Collect Payment → Check in.
                                </p>
                            </div>

                            <label className="am-status-filter">
                                Status

                                <select
                                    value={
                                        selectedStatus
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setSelectedStatus(
                                            event.target.value,
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
                        </div>

                        {appointmentsLoading ? (
                            <div
                                className="am-empty"
                                role="status"
                            >
                                <Loader2
                                    size={24}
                                    className="am-spin"
                                />

                                Loading appointments…
                            </div>
                        ) : !appointments.length ? (
                            <div className="am-empty">
                                <CalendarDays size={30} />

                                <h3>
                                    No appointments found
                                </h3>

                                <p>
                                    Try another date or status, or book an available time.
                                </p>

                                <button
                                    type="button"
                                    className="am-button am-primary"
                                    disabled={
                                        !selectedDoctor
                                    }
                                    onClick={() =>
                                        setView(
                                            "slots",
                                        )
                                    }
                                >
                                    View available slots
                                </button>
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
                                            getAppointmentStatus(
                                                appointment,
                                            );

                                        const paymentStatus =
                                            getPaymentStatus(
                                                appointment,
                                            );

                                        const arrived =
                                            hasArrived(
                                                appointment,
                                            );

                                        const actionDisabled =
                                            Boolean(
                                                actionState,
                                            );

                                        return (
                                            <article
                                                className="am-visit"
                                                key={
                                                    appointmentId
                                                }
                                            >
                                                <div className="am-visit-time">
                                                    <strong>
                                                        {
                                                            appointment.requestedStartTime
                                                        }
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
                                                    <h3>
                                                        {getPatientName(
                                                            appointment,
                                                        )}
                                                    </h3>

                                                    <p>
                                                        {getPatientPhone(
                                                            appointment,
                                                        )}
                                                    </p>

                                                    <p>
                                                        Dr.{" "}
                                                        {getDoctorName(
                                                            appointment,
                                                        )}{" "}
                                                        ·{" "}
                                                        {getDepartmentName(
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

                                                    <span>
                                                        {getQueueLabel(
                                                            appointment,
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="am-visit-actions">
                                                    {[
                                                        "REQUESTED",
                                                        "RESCHEDULE_REQUESTED",
                                                    ].includes(
                                                        status,
                                                    ) && (
                                                            <button
                                                                type="button"
                                                                className="am-button am-secondary"
                                                                disabled={
                                                                    actionDisabled
                                                                }
                                                                onClick={() =>
                                                                    runAppointmentAction(
                                                                        appointmentId,
                                                                        "confirm",
                                                                    )
                                                                }
                                                            >
                                                                Confirm
                                                            </button>
                                                        )}

                                                    {[
                                                        "BOOKED",
                                                        "CONFIRMED",
                                                    ].includes(
                                                        status,
                                                    ) &&
                                                        !arrived && (
                                                            <button
                                                                type="button"
                                                                className="am-button am-primary"
                                                                disabled={
                                                                    actionDisabled
                                                                }
                                                                onClick={() =>
                                                                    runAppointmentAction(
                                                                        appointmentId,
                                                                        "arrived",
                                                                    )
                                                                }
                                                            >
                                                                <Users
                                                                    size={
                                                                        15
                                                                    }
                                                                />
                                                                Arrived
                                                            </button>
                                                        )}

                                                    {arrived &&
                                                        paymentStatus !==
                                                        "PAID" &&
                                                        !isClosedStatus(
                                                            status,
                                                        ) && (
                                                            <button
                                                                type="button"
                                                                className="am-button am-primary"
                                                                disabled={
                                                                    actionDisabled
                                                                }
                                                                onClick={() =>
                                                                    runAppointmentAction(
                                                                        appointmentId,
                                                                        "payment",
                                                                    )
                                                                }
                                                            >
                                                                Collect Payment
                                                            </button>
                                                        )}

                                                    {arrived &&
                                                        paymentStatus ===
                                                        "PAID" &&
                                                        !isClosedStatus(
                                                            status,
                                                        ) && (
                                                            <button
                                                                type="button"
                                                                className="am-button am-primary"
                                                                disabled={
                                                                    actionDisabled
                                                                }
                                                                onClick={() =>
                                                                    runAppointmentAction(
                                                                        appointmentId,
                                                                        "check-in",
                                                                    )
                                                                }
                                                            >
                                                                <Ticket
                                                                    size={
                                                                        15
                                                                    }
                                                                />
                                                                Check in
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
                                                                Token Created
                                                            </span>
                                                        )}

                                                    {[
                                                        "BOOKED",
                                                        "CONFIRMED",
                                                        "ARRIVED",
                                                        "REQUESTED",
                                                    ].includes(
                                                        status,
                                                    ) && (
                                                            <button
                                                                type="button"
                                                                className="am-button am-secondary"
                                                                disabled={
                                                                    actionDisabled
                                                                }
                                                                onClick={() =>
                                                                    runAppointmentAction(
                                                                        appointmentId,
                                                                        "no-show",
                                                                    )
                                                                }
                                                            >
                                                                No show
                                                            </button>
                                                        )}

                                                    {[
                                                        "BOOKED",
                                                        "CONFIRMED",
                                                        "ARRIVED",
                                                        "REQUESTED",
                                                        "RESCHEDULE_REQUESTED",
                                                    ].includes(
                                                        status,
                                                    ) && (
                                                            <button
                                                                type="button"
                                                                className="am-button am-danger"
                                                                disabled={
                                                                    actionDisabled
                                                                }
                                                                onClick={() =>
                                                                    runAppointmentAction(
                                                                        appointmentId,
                                                                        "cancel",
                                                                    )
                                                                }
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}

                                                    {actionState?.id ===
                                                        appointmentId && (
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
                ) : (
                    <section className="am-panel">
                        <div className="am-panel-heading">
                            <div>
                                <h2>
                                    Choose a time to book
                                </h2>

                                <p>
                                    Only available appointment slots can be booked here.
                                </p>
                            </div>

                            <label className="am-switch">
                                <input
                                    type="checkbox"
                                    checked={
                                        showAllSlots
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setShowAllSlots(
                                            event.target.checked,
                                        )
                                    }
                                />

                                Show all slots
                            </label>
                        </div>

                        {slotsLoading ? (
                            <div
                                className="am-empty"
                                role="status"
                            >
                                <Loader2
                                    size={24}
                                    className="am-spin"
                                />

                                Loading slots…
                            </div>
                        ) : !(
                            showAllSlots
                                ? slots
                                : availableSlots
                        ).length ? (
                            <div className="am-empty">
                                <Clock3 size={30} />

                                <h3>
                                    No available appointment slots
                                </h3>

                                <p>
                                    Choose another date or review the doctor's schedule.
                                </p>

                                <button
                                    type="button"
                                    disabled={
                                        !selectedDoctor
                                    }
                                    className="am-button am-secondary"
                                    onClick={
                                        openScheduleModal
                                    }
                                >
                                    Doctor schedule
                                </button>
                            </div>
                        ) : (
                            <div className="am-slot-grid">
                                {(
                                    showAllSlots
                                        ? slots
                                        : availableSlots
                                ).map(
                                    (
                                        slot,
                                    ) => (
                                        <article
                                            className="am-slot"
                                            key={
                                                slot._id
                                            }
                                        >
                                            <div>
                                                <strong>
                                                    {
                                                        slot.startTime
                                                    }
                                                </strong>

                                                <span>
                                                    to{" "}
                                                    {
                                                        slot.endTime
                                                    }
                                                </span>
                                            </div>

                                            <p>
                                                {readable(
                                                    slot.slotType,
                                                )}{" "}
                                                ·{" "}
                                                {readable(
                                                    slot.status,
                                                )}
                                            </p>

                                            {slot.status ===
                                                "AVAILABLE" &&
                                                slot.slotType ===
                                                "APPOINTMENT" ? (
                                                <button
                                                    type="button"
                                                    className="am-button am-primary"
                                                    onClick={() =>
                                                        openBookingModal(
                                                            slot,
                                                        )
                                                    }
                                                >
                                                    <Plus
                                                        size={
                                                            15
                                                        }
                                                    />
                                                    Book this time
                                                </button>
                                            ) : (
                                                <span className="am-slot-note">
                                                    {slot.slotType ===
                                                        "WALK_IN"
                                                        ? "Reserved for walk-ins"
                                                        : "Not available for booking"}
                                                </span>
                                            )}
                                        </article>
                                    ),
                                )}
                            </div>
                        )}
                    </section>
                )}

                {/* SCHEDULE MODAL */}

                {scheduleModalOpen && (
                    <Modal
                        title="Doctor schedule"
                        busy={
                            scheduleSaving
                        }
                        onClose={() => {
                            if (
                                !mutationPending.current
                            ) {
                                setScheduleModalOpen(
                                    false,
                                );
                            }
                        }}
                    >
                        <div className="space-y-5">
                            {error && (
                                <div
                                    className="am-error"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-bold text-slate-900">
                                    Dr.{" "}
                                    {
                                        selectedDoctor?.name
                                    }
                                </p>

                                <p className="text-xs text-slate-500">
                                    {selectedDoctor
                                        ? getDoctorDepartmentName(
                                            selectedDoctor,
                                        )
                                        : ""}
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <FormField label="Consultation mode">
                                    <select
                                        value={
                                            scheduleForm.consultationMode
                                        }
                                        onChange={(
                                            event,
                                        ) => {
                                            const mode =
                                                event.target.value as ConsultationMode;

                                            setScheduleForm(
                                                (
                                                    previous,
                                                ) =>
                                                    normalizeScheduleFormByMode({
                                                        ...previous,

                                                        consultationMode:
                                                            mode,
                                                    }),
                                            );
                                        }}
                                        className="form-input"
                                    >
                                        <option value="HYBRID">
                                            HYBRID
                                        </option>

                                        <option value="APPOINTMENT_ONLY">
                                            APPOINTMENT_ONLY
                                        </option>

                                        <option value="ON_CALL_APPOINTMENT">
                                            ON_CALL_APPOINTMENT
                                        </option>

                                        <option value="OPD_ONLY">
                                            OPD_ONLY
                                        </option>
                                    </select>
                                </FormField>

                                <FormField label="Slot duration">
                                    <input
                                        type="number"
                                        min={5}
                                        value={
                                            scheduleForm.slotDurationMinutes
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setScheduleForm(
                                                (
                                                    previous,
                                                ) => ({
                                                    ...previous,

                                                    slotDurationMinutes:
                                                        Number(
                                                            event.target.value,
                                                        ),
                                                }),
                                            )
                                        }
                                        className="form-input"
                                    />
                                </FormField>

                                <FormField label="Booking window days">
                                    <input
                                        type="number"
                                        min={1}
                                        value={
                                            scheduleForm.bookingWindowDays
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setScheduleForm(
                                                (
                                                    previous,
                                                ) => ({
                                                    ...previous,

                                                    bookingWindowDays:
                                                        Number(
                                                            event.target.value,
                                                        ),
                                                }),
                                            )
                                        }
                                        className="form-input"
                                    />
                                </FormField>
                            </div>

                            <details className="am-advanced">
                                <summary>
                                    Capacity & grace period
                                </summary>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <FormField label="Max appointments/day">
                                        <input
                                            type="number"
                                            min={1}
                                            value={
                                                scheduleForm.maxAppointmentsPerDay
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setScheduleForm(
                                                    (
                                                        previous,
                                                    ) => ({
                                                        ...previous,

                                                        maxAppointmentsPerDay:
                                                            Number(
                                                                event.target.value,
                                                            ),
                                                    }),
                                                )
                                            }
                                            className="form-input"
                                        />
                                    </FormField>

                                    <FormField label="Max walk-ins/day">
                                        <input
                                            type="number"
                                            min={0}
                                            value={
                                                scheduleForm.maxWalkInsPerDay
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setScheduleForm(
                                                    (
                                                        previous,
                                                    ) => ({
                                                        ...previous,

                                                        maxWalkInsPerDay:
                                                            Number(
                                                                event.target.value,
                                                            ),
                                                    }),
                                                )
                                            }
                                            className="form-input"
                                        />
                                    </FormField>

                                    <FormField label="Grace period minutes">
                                        <input
                                            type="number"
                                            min={0}
                                            value={
                                                scheduleForm.gracePeriodMinutes
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setScheduleForm(
                                                    (
                                                        previous,
                                                    ) => ({
                                                        ...previous,

                                                        gracePeriodMinutes:
                                                            Number(
                                                                event.target.value,
                                                            ),
                                                    }),
                                                )
                                            }
                                            className="form-input"
                                        />
                                    </FormField>
                                </div>
                            </details>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                                    <input
                                        type="checkbox"
                                        checked={
                                            scheduleForm.appointmentEnabled
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setScheduleForm(
                                                (
                                                    previous,
                                                ) => ({
                                                    ...previous,

                                                    appointmentEnabled:
                                                        event.target.checked,
                                                }),
                                            )
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                    />

                                    <span className="text-sm font-semibold text-slate-800">
                                        Appointment booking enabled
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                                    <input
                                        type="checkbox"
                                        checked={
                                            scheduleForm.confirmationRequired
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setScheduleForm(
                                                (
                                                    previous,
                                                ) => ({
                                                    ...previous,

                                                    confirmationRequired:
                                                        event.target.checked,
                                                }),
                                            )
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                    />

                                    <span className="text-sm font-semibold text-slate-800">
                                        Doctor confirmation required
                                    </span>
                                </label>
                            </div>

                            <div>
                                <h3 className="mb-3 text-sm font-bold text-slate-900">
                                    Weekly Availability
                                </h3>

                                <div className="space-y-3">
                                    {scheduleForm.weeklyAvailability.map(
                                        (
                                            dayItem,
                                        ) => (
                                            <div
                                                key={
                                                    dayItem.day
                                                }
                                                className="rounded-2xl border border-slate-200 p-4"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <label className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                dayItem.isAvailable
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateScheduleDay(
                                                                    dayItem.day,
                                                                    {
                                                                        isAvailable:
                                                                            event
                                                                                .target
                                                                                .checked,
                                                                    },
                                                                )
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                                        />

                                                        <span className="text-sm font-bold text-slate-800">
                                                            {
                                                                dayItem.day
                                                            }
                                                        </span>
                                                    </label>

                                                    {dayItem.isAvailable && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                addScheduleSession(
                                                                    dayItem.day,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                                                        >
                                                            <Plus
                                                                size={
                                                                    13
                                                                }
                                                            />
                                                            Add session
                                                        </button>
                                                    )}
                                                </div>

                                                {dayItem.isAvailable && (
                                                    <div className="mt-3 space-y-2">
                                                        {dayItem.sessions.map(
                                                            (
                                                                session,
                                                                index,
                                                            ) => (
                                                                <div
                                                                    key={`${dayItem.day}-${index}`}
                                                                    className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                                                                >
                                                                    <input
                                                                        aria-label={`${dayItem.day} session ${index + 1} start`}
                                                                        type="time"
                                                                        value={
                                                                            session.startTime
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateScheduleSession(
                                                                                dayItem.day,
                                                                                index,
                                                                                {
                                                                                    startTime:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="form-input"
                                                                    />

                                                                    <input
                                                                        aria-label={`${dayItem.day} session ${index + 1} end`}
                                                                        type="time"
                                                                        value={
                                                                            session.endTime
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateScheduleSession(
                                                                                dayItem.day,
                                                                                index,
                                                                                {
                                                                                    endTime:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="form-input"
                                                                    />

                                                                    <select
                                                                        aria-label={`${dayItem.day} session ${index + 1} type`}
                                                                        value={
                                                                            session.slotType
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateScheduleSession(
                                                                                dayItem.day,
                                                                                index,
                                                                                {
                                                                                    slotType:
                                                                                        event
                                                                                            .target
                                                                                            .value as "APPOINTMENT" | "WALK_IN",
                                                                                },
                                                                            )
                                                                        }
                                                                        className="form-input"
                                                                    >
                                                                        <option value="APPOINTMENT">
                                                                            Appointment
                                                                        </option>

                                                                        <option value="WALK_IN">
                                                                            Walk-in
                                                                        </option>
                                                                    </select>

                                                                    <button
                                                                        type="button"
                                                                        aria-label="Remove session"
                                                                        onClick={() =>
                                                                            removeScheduleSession(
                                                                                dayItem.day,
                                                                                index,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            dayItem
                                                                                .sessions
                                                                                .length ===
                                                                            1
                                                                        }
                                                                        className="inline-flex items-center justify-center rounded-xl border border-red-100 px-3 py-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                                    >
                                                                        <X
                                                                            size={
                                                                                15
                                                                            }
                                                                        />
                                                                    </button>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    disabled={
                                        scheduleSaving
                                    }
                                    onClick={() => {
                                        if (
                                            !mutationPending.current
                                        ) {
                                            setScheduleModalOpen(
                                                false,
                                            );
                                        }
                                    }}
                                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        handleSaveSchedule
                                    }
                                    disabled={
                                        scheduleSaving
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {scheduleSaving ? (
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Save
                                            size={16}
                                        />
                                    )}

                                    Save Schedule
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* BOOKING MODAL */}

                {bookingModalOpen && (
                    <Modal
                        title="Book appointment"
                        busy={
                            bookingLoading
                        }
                        onClose={() => {
                            if (
                                !mutationPending.current
                            ) {
                                setBookingModalOpen(
                                    false,
                                );
                            }
                        }}
                    >
                        <div className="space-y-5">
                            {error && (
                                <div
                                    className="am-error"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="grid gap-3 rounded-2xl bg-blue-50 p-4 text-sm sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-bold uppercase text-blue-500">
                                        Doctor
                                    </p>

                                    <p className="font-bold text-blue-950">
                                        Dr.{" "}
                                        {
                                            selectedDoctor?.name
                                        }
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase text-blue-500">
                                        Slot
                                    </p>

                                    <p className="font-bold text-blue-950">
                                        {
                                            selectedSlot?.startTime
                                        }{" "}
                                        -{" "}
                                        {
                                            selectedSlot?.endTime
                                        }
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Search Patient
                                </label>

                                <div className="flex gap-2">
                                    <input
                                        value={
                                            patientSearch
                                        }
                                        aria-label="Search patients"
                                        onChange={(
                                            event,
                                        ) => {
                                            setPatientSearch(
                                                event.target.value,
                                            );
                                            setSelectedPatient(
                                                null,
                                            );
                                            setPatients([]);
                                        }}
                                        onKeyDown={(
                                            event,
                                        ) => {
                                            if (
                                                event.key ===
                                                "Enter"
                                            ) {
                                                handlePatientSearch();
                                            }
                                        }}
                                        placeholder="Search by name, phone or patient code"
                                        className="form-input"
                                    />

                                    <button
                                        type="button"
                                        aria-label="Search patients"
                                        onClick={
                                            handlePatientSearch
                                        }
                                        disabled={
                                            patientSearchLoading
                                        }
                                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        {patientSearchLoading ? (
                                            <Loader2
                                                size={17}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <Search
                                                size={17}
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {patients.length >
                                0 && (
                                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2">
                                        {patients.map(
                                            (
                                                patient,
                                            ) => (
                                                <button
                                                    key={
                                                        patient._id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedPatient(
                                                            patient,
                                                        )
                                                    }
                                                    className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition ${selectedPatient?._id ===
                                                        patient._id
                                                        ? "bg-blue-50 ring-2 ring-blue-500"
                                                        : "hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                            <UserRound
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </div>

                                                        <div>
                                                            <p className="font-bold text-slate-900">
                                                                {
                                                                    patient.name
                                                                }
                                                            </p>

                                                            <p className="text-xs text-slate-500">
                                                                {
                                                                    patient.phone
                                                                }{" "}
                                                                {patient.patientCode
                                                                    ? `• ${patient.patientCode}`
                                                                    : ""}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {selectedPatient?._id ===
                                                        patient._id && (
                                                            <CheckCircle2
                                                                size={
                                                                    18
                                                                }
                                                                className="text-blue-600"
                                                            />
                                                        )}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                )}

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Reason
                                </label>

                                <input
                                    value={
                                        reason
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setReason(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: Fever and weakness"
                                    className="form-input"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Notes
                                </label>

                                <textarea
                                    value={
                                        notes
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setNotes(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Optional appointment notes"
                                    rows={3}
                                    className="form-input resize-none"
                                />
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    disabled={
                                        bookingLoading
                                    }
                                    onClick={() => {
                                        if (
                                            !mutationPending.current
                                        ) {
                                            setBookingModalOpen(
                                                false,
                                            );
                                        }
                                    }}
                                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        handleBookAppointment
                                    }
                                    disabled={
                                        bookingLoading ||
                                        !selectedPatient
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {bookingLoading ? (
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <CalendarDays
                                            size={16}
                                        />
                                    )}

                                    Book Appointment
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        );
    };

export default Appointments;

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function readable(
    value:
        string | null | undefined,
): string {
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
}

function FormField({
    label,
    children,
}: {
    label:
    string;
    children:
    ReactNode;
}) {
    return (
        <label className="am-field">
            <span>
                {label}
            </span>

            {children}
        </label>
    );
}

function Modal({
    title,
    busy,
    children,
    onClose,
}: {
    title:
    string;
    busy:
    boolean;
    children:
    ReactNode;
    onClose:
    () => void;
}) {
    const headingId =
        useId();

    const panel =
        useRef<HTMLDivElement>(
            null,
        );

    const latest =
        useRef({
            busy,
            onClose,
        });

    latest.current = {
        busy,
        onClose,
    };

    useEffect(
        () => {
            const previousFocus =
                document.activeElement as HTMLElement | null;

            const overflow =
                document.body.style.overflow;

            document.body.style.overflow =
                "hidden";

            panel.current?.focus();

            function handleKey(
                event:
                    KeyboardEvent,
            ) {
                if (
                    event.key ===
                    "Escape"
                ) {
                    event.preventDefault();

                    if (
                        !latest.current.busy
                    ) {
                        latest.current.onClose();
                    }
                }

                if (
                    event.key !==
                    "Tab"
                ) {
                    return;
                }

                const elements =
                    Array.from(
                        panel.current?.querySelectorAll<HTMLElement>(
                            "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary",
                        ) ||
                        [],
                    ).filter(
                        (
                            element,
                        ) =>
                            element.getClientRects().length >
                            0,
                    );

                const first =
                    elements[0];

                const last =
                    elements[
                    elements.length -
                    1
                    ];

                if (
                    !first
                ) {
                    event.preventDefault();
                    panel.current?.focus();

                    return;
                }

                if (
                    event.shiftKey &&
                    (
                        document.activeElement ===
                        first ||
                        document.activeElement ===
                        panel.current
                    )
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (
                    !event.shiftKey &&
                    (
                        document.activeElement ===
                        last ||
                        document.activeElement ===
                        panel.current
                    )
                ) {
                    event.preventDefault();
                    first.focus();
                }
            }

            document.addEventListener(
                "keydown",
                handleKey,
            );

            return () => {
                document.body.style.overflow =
                    overflow;

                document.removeEventListener(
                    "keydown",
                    handleKey,
                );

                previousFocus?.focus();
            };
        },
        [],
    );

    return (
        <div
            className="am-overlay"
            onClick={(
                event,
            ) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !busy
                ) {
                    onClose();
                }
            }}
        >
            <div
                className="am-dialog"
                ref={
                    panel
                }
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={
                    headingId
                }
            >
                <header>
                    <div>
                        <p className="am-eyebrow">
                            APPOINTMENT MANAGEMENT
                        </p>

                        <h2 id={headingId}>
                            {title}
                        </h2>
                    </div>

                    <button
                        type="button"
                        aria-label="Close dialog"
                        disabled={
                            busy
                        }
                        onClick={
                            onClose
                        }
                    >
                        <X size={20} />
                    </button>
                </header>

                <fieldset
                    disabled={
                        busy
                    }
                    className="am-dialog-body"
                >
                    {children}
                </fieldset>
            </div>
        </div>
    );
}

/* ============================================================
   STYLES
============================================================ */

function AppointmentsStyles() {
    return (
        <style>
            {`
    .am-page { min-height: 100dvh; background: #f5f6f2; color: #173d39; padding: 26px; font-family: "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
    .am-page *, .am-page *::before, .am-page *::after { box-sizing: border-box; }
    .am-page h1, .am-page h2, .am-page h3, .am-page p { margin: 0; }
    .am-page button, .am-page input, .am-page select, .am-page textarea { font: inherit; }
    .am-page button { cursor: pointer; touch-action: manipulation; }
    .am-page button:disabled { opacity: .5; cursor: not-allowed; }
    .am-page button:focus-visible, .am-page summary:focus-visible { outline: 3px solid #35ad95; outline-offset: 3px; }
    .am-page svg { flex-shrink: 0; }

    .am-header { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 26px; background: linear-gradient(110deg, #eaf0e1, #edf3e6, #dcebdd); border: 1px solid #d9e4d1; border-radius: 19px; }
    .am-eyebrow { font-size: 9px; letter-spacing: 1.6px; font-weight: 700; color: #657e59; margin-bottom: 9px !important; }
    .am-header h1 { font-size: 29px; letter-spacing: -.8px; font-weight: 600; }
    .am-header > div > p:last-child { margin-top: 8px; color: #66795d; font-size: 13px; line-height: 1.7; }
    .am-header-actions { display: flex; gap: 10px; flex-shrink: 0; }

    .am-button { display: inline-flex; justify-content: center; align-items: center; gap: 7px; border: 1px solid transparent; border-radius: 10px; padding: 10px 15px; min-height: 44px; font-size: 12px !important; font-weight: 600 !important; line-height: 1.5; }
    .am-primary { background: #176957; color: white; }
    .am-primary:hover:not(:disabled) { background: #104e40; }
    .am-secondary { background: white; border-color: #d7e2cd; color: #536e48; }
    .am-secondary:hover:not(:disabled) { background: #f0f5e9; }
    .am-danger { background: #fcf0eb; color: #9f4b39; }

    .am-filters { display: flex; align-items: flex-end; gap: 16px; padding: 20px; margin-top: 22px; border: 1px solid #dfe6d7; border-radius: 14px; background: #fff; }
    .am-filters > label { display: grid; gap: 8px; font-size: 12px; font-weight: 600; color: #5c744e; min-width: 0; }
    .am-filters > label:first-child { flex: 1; }
    .am-filters select, .am-filters input, .am-status-filter select { min-height: 46px; width: 100%; border: 1px solid #d9e3d0; background: #fafbf7; padding: 10px 12px; border-radius: 9px; color: #345832; font-size: 13px; }

    .am-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 18px 0; }
    .am-metrics > div { display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid #e0e7d8; padding: 17px 20px; border-radius: 13px; background: white; }
    .am-metrics span { font-size: 12px; line-height: 1.6; color: #6c7e60; }
    .am-metrics strong { font-size: 25px; font-weight: 600; }

    .am-tabs { display: flex; gap: 6px; background: #e8eee1; padding: 6px; width: fit-content; border-radius: 12px; margin-bottom: 18px; }
    .am-tabs button { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 18px; border: 0; border-radius: 9px; background: transparent; color: #6f8264; font-size: 13px; }
    .am-tabs button[aria-pressed="true"] { background: white; color: #176957; font-weight: 600; }

    .am-panel { border: 1px solid #dfe6d7; border-radius: 16px; background: white; overflow: hidden; }
    .am-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 22px; border-bottom: 1px solid #e8eddf; }
    .am-panel-heading h2 { font-size: 18px; font-weight: 600; }
    .am-panel-heading p { font-size: 12px; margin-top: 6px; color: #77876c; line-height: 1.6; }
    .am-status-filter { display: flex; align-items: center; gap: 10px; color: #6f8163; font-size: 12px; }
    .am-switch { display: flex; align-items: center; gap: 8px; color: #647b56; font-size: 12px; min-height: 44px; flex-shrink: 0; }

    .am-page input[type="checkbox"] { accent-color: #176957; width: 18px; height: 18px; }

    .am-empty { display: flex; flex-direction: column; align-items: center; gap: 15px; text-align: center; padding: 48px 22px; color: #74886a; font-size: 13px; line-height: 1.7; }
    .am-empty h3 { color: #3d603a; font-size: 17px; font-weight: 600; }

    .am-visit { display: grid; grid-template-columns: 115px minmax(150px, 1fr) minmax(115px, .5fr); gap: 18px; padding: 20px 22px; border-bottom: 1px solid #e8eddf; align-items: start; }
    .am-visit:last-child { border: 0; }
    .am-visit-time { display: grid; gap: 4px; }
    .am-visit-time strong { font-size: 20px; font-weight: 600; }
    .am-visit-time span, .am-visit-time small { font-size: 11px; color: #7c8b72; }

    .am-visit-person { min-width: 0; }
    .am-visit-person h3 { font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
    .am-visit-person p { font-size: 12px; line-height: 1.7; color: #748769; margin-top: 4px; overflow-wrap: anywhere; }

    .am-visit-status { display: grid; justify-items: end; gap: 8px; font-size: 11px; color: #7a8a70; text-align: right; }
    .am-badge { display: inline-flex; width: fit-content; padding: 5px 9px; border-radius: 20px; background: #edf4e7; color: #527447; font-size: 11px; font-weight: 600; }
    .am-badge[data-status="REQUESTED"], .am-badge[data-status="RESCHEDULE_REQUESTED"] { background: #fbf0da; color: #936922; }
    .am-badge[data-status="ARRIVED"] { background: #e7f1ff; color: #275c94; }
    .am-badge[data-status="CHECKED_IN"] { background: #e1f5eb; color: #176957; }
    .am-badge[data-status="CANCELLED"], .am-badge[data-status="REJECTED"], .am-badge[data-status="NO_SHOW"] { background: #faece6; color: #9a5b45; }

    .am-payment { display: inline-flex; width: fit-content; padding: 5px 9px; border-radius: 20px; background: #fff7df; color: #806217; font-size: 11px; font-weight: 600; }
    .am-payment[data-payment="PAID"] { background: #e1f5eb; color: #176957; }
    .am-payment[data-payment="REFUNDED"] { background: #eef1f4; color: #586473; }

    .am-visit-actions { grid-column: 2 / -1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
    .am-working { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #536e48; }

    .am-slot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr)); gap: 14px; padding: 22px; }
    .am-slot { border: 1px solid #dce6d3; padding: 18px; border-radius: 12px; background: #fafcf7; }
    .am-slot > div { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
    .am-slot strong { font-size: 22px; font-weight: 600; }
    .am-slot span, .am-slot p { font-size: 11px; color: #6e8361; }
    .am-slot p { margin-top: 9px; line-height: 1.7; }
    .am-slot button { margin-top: 16px; width: 100%; }
    .am-slot-note { display: block; margin-top: 20px; }

    .am-error, .am-success { display: flex; align-items: center; gap: 12px; border-radius: 11px; padding: 13px 16px; margin-top: 14px; font-size: 13px; line-height: 1.7; }
    .am-error { border: 1px solid #efd6cc; background: #fcf0eb; color: #9c503c; }
    .am-success { border: 1px solid #d5e5cf; background: #edf5e8; color: #4f7548; }
    .am-error button, .am-success button { margin-left: auto; border: 0; padding: 8px; background: transparent; color: inherit; }

    .am-overlay { position: fixed; inset: 0; z-index: 200; background: #102c2870; backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; padding: 20px; }
    .am-dialog { width: 100%; max-width: 780px; max-height: calc(100dvh - 40px); overflow-y: auto; overscroll-behavior: contain; background: white; border-radius: 18px; border: 1px solid #d5e1cc; box-shadow: 0 20px 70px #102c2833; outline: none; }
    .am-dialog > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px; background: #edf3e6; }
    .am-dialog h2 { font-size: 22px; font-weight: 600; }
    .am-dialog > header button { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px; border: 0; background: transparent; color: #6a815b; }
    .am-dialog-body { border: 0; padding: 22px; margin: 0; min-width: 0; }
    .am-field { display: grid; gap: 8px; min-width: 0; font-size: 12px; font-weight: 600; color: #56714a; }
    .am-dialog .form-input { width: 100%; min-height: 46px; border: 1px solid #dbe5d2; border-radius: 10px; padding: 11px 12px; background: #fafbf7; color: #345b3d; font-size: 14px; }
    .am-page input:focus, .am-page select:focus, .am-page textarea:focus { outline: 2px solid #88ae7a; outline-offset: 1px; }
    .am-advanced { border: 1px solid #dce6d4; border-radius: 12px; padding: 0 14px 14px; }
    .am-advanced summary { min-height: 46px; padding: 13px 0; font-size: 13px; font-weight: 600; cursor: pointer; }
    .am-advanced:not([open]) { padding-bottom: 0; }

    .am-dialog [class~="bg-blue-600"], .am-dialog [class~="bg-slate-900"] { background: #176957; }
    .am-dialog [class~="bg-blue-50"], .am-dialog [class~="bg-slate-50"], .am-dialog [class~="bg-slate-100"] { background: #edf3e6; }
    .am-dialog [class~="text-blue-600"], .am-dialog [class~="text-blue-500"], .am-dialog [class~="text-blue-950"], .am-dialog [class~="text-slate-900"], .am-dialog [class~="text-slate-800"] { color: #345b3d; }
    .am-dialog [class~="text-slate-500"] { color: #7b8b70; }
    .am-dialog [class~="border-slate-200"] { border-color: #dfe7d6; }
    .am-dialog [class~="font-bold"] { font-weight: 600; }
    .am-dialog button { min-height: 44px; }
    .am-dialog .flex-col-reverse { position: sticky; bottom: -22px; background: #fff; border-top: 1px solid #e0e8d9; padding: 16px 0; }

    @keyframes am-spin { to { transform: rotate(360deg); } }
    .am-spin { animation: am-spin 1s linear infinite; }

    @media (max-width: 767px) {
      .am-page { padding: 14px; }
      .am-header { padding: 20px; flex-direction: column; align-items: stretch; gap: 18px; }
      .am-header h1 { font-size: 26px; }
      .am-header-actions { flex-wrap: wrap; }
      .am-header-actions button { flex: 1; }
      .am-filters { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; }
      .am-filters > label:first-child { grid-column: 1 / -1; }
      .am-filters > button { align-self: end; }
      .am-metrics { gap: 8px; }
      .am-metrics > div { align-items: flex-start; flex-direction: column; padding: 12px; gap: 8px; }
      .am-metrics span { font-size: 10px; }
      .am-metrics strong { font-size: 23px; }
      .am-tabs { width: 100%; }
      .am-tabs button { flex: 1; justify-content: center; padding: 10px; font-size: 12px; }
      .am-panel-heading { flex-direction: column; align-items: stretch; padding: 18px; }
      .am-status-filter select { flex: 1; }
      .am-visit { grid-template-columns: 84px minmax(0, 1fr); padding: 18px; gap: 14px; }
      .am-visit-status { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; text-align: left; flex-wrap: wrap; }
      .am-visit-actions { grid-column: 1 / -1; justify-content: flex-start; border-top: 1px solid #e8eddf; padding-top: 12px; }
      .am-visit-actions .am-primary { flex: 1; }
      .am-slot-grid { padding: 16px; }
      .am-overlay { padding: 12px; }
      .am-dialog { max-height: calc(100dvh - 24px); }
      .am-dialog > header, .am-dialog-body { padding: 18px; }
      .am-dialog .form-input, .am-filters select, .am-filters input, .am-status-filter select { font-size: 16px; }
      .am-button { min-height: 46px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .am-page *, .am-page *::before, .am-page *::after {
        animation: none !important;
        transition: none !important;
      }
    }
            `}
        </style>
    );
}