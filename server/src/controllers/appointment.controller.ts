import type {
    Request,
    Response,
} from "express";

import crypto from "crypto";
import mongoose from "mongoose";

import {
    Appointment,
} from "../models/Appointment.model";

import {
    DoctorSchedule,
} from "../models/DoctorSchedule.model";

import {
    DoctorSlot,
} from "../models/DoctorSlot.model";

import {
    User,
} from "../models/User.model";

import {
    Patient,
} from "../models/Patient.model";

import {
    Department,
} from "../models/Department.model";

import {
    Queue,
} from "../models/Queue.model";

import {
    generateDoctorSlots,
} from "../services/appointmentSlot.service";

import {
    recalculateDoctorQueueEstimates,
} from "../services/queueEstimate.service";

import {
    getIO,
} from "../config/socket";

/* ============================================================
   HELPERS
============================================================ */

const getParam =
    (
        value:
            | string
            | string[]
            | undefined,
    ): string | undefined => {
        if (
            Array.isArray(
                value,
            )
        ) {
            return value[0];
        }

        return value;
    };

const getHospitalId =
    (
        req:
            Request,
    ): mongoose.Types.ObjectId => {
        if (
            !req.user?.hospitalId ||
            !mongoose.isValidObjectId(
                req.user.hospitalId,
            )
        ) {
            throw new Error(
                "Hospital information not found",
            );
        }

        return new mongoose.Types.ObjectId(
            req.user.hospitalId,
        );
    };

const getRequestUserObjectId =
    (
        req:
            Request,
    ): mongoose.Types.ObjectId | undefined => {
        const userId =
            req.user?.userId;

        if (
            !userId ||
            !mongoose.isValidObjectId(
                userId,
            )
        ) {
            return undefined;
        }

        return new mongoose.Types.ObjectId(
            userId,
        );
    };

const canManageAppointments =
    (
        req:
            Request,
    ): boolean => {
        return [
            "HOSPITAL_ADMIN",
            "RECEPTIONIST",
            "DOCTOR",
        ].includes(
            req.user?.role ||
            "",
        );
    };

const generateAppointmentCode =
    (): string => {
        return (
            "APT-" +
            crypto
                .randomBytes(
                    4,
                )
                .toString(
                    "hex",
                )
                .toUpperCase()
        );
    };

const pushHistory =
    (
        appointment:
            any,
        status:
            string,
        req:
            Request,
        note?:
            string,
    ) => {
        if (
            !Array.isArray(
                appointment.history,
            )
        ) {
            appointment.history =
                [];
        }

        appointment.history.push({
            status,
            at:
                new Date(),
            by:
                getRequestUserObjectId(
                    req,
                ),
            note,
        });
    };

const getIndiaDateString =
    (
        date =
            new Date(),
    ): string => {
        return new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Asia/Kolkata",
                year:
                    "numeric",
                month:
                    "2-digit",
                day:
                    "2-digit",
            },
        ).format(
            date,
        );
    };

const getDateOnly =
    (
        value:
            unknown,
    ): string => {
        if (
            !value
        ) {
            return "";
        }

        if (
            typeof value ===
            "string"
        ) {
            return value.slice(
                0,
                10,
            );
        }

        const date =
            new Date(
                value as any,
            );

        if (
            Number.isNaN(
                date.getTime(),
            )
        ) {
            return "";
        }

        return getIndiaDateString(
            date,
        );
    };

const buildSortTime =
    (
        queueDate:
            string,
        time?:
            string | null,
    ): Date => {
        if (
            !time
        ) {
            return new Date();
        }

        return new Date(
            `${queueDate}T${time}:00+05:30`,
        );
    };

const isClosedAppointmentStatus =
    (
        status:
            string,
    ): boolean => {
        return [
            "COMPLETED",
            "CANCELLED",
            "REJECTED",
            "NO_SHOW",
        ].includes(
            status,
        );
    };

type ActiveAppointmentStatus =
    | "REQUESTED"
    | "BOOKED"
    | "CONFIRMED"
    | "ARRIVED"
    | "CHECKED_IN"
    | "IN_CONSULTATION"
    | "RESCHEDULE_REQUESTED";

const ACTIVE_APPOINTMENT_STATUSES:
    ActiveAppointmentStatus[] = [
        "REQUESTED",
        "BOOKED",
        "CONFIRMED",
        "ARRIVED",
        "CHECKED_IN",
        "IN_CONSULTATION",
        "RESCHEDULE_REQUESTED",
    ];

const MAX_ACTIVE_FUTURE_APPOINTMENTS_PER_PATIENT =
    2;

const MAX_NO_SHOW_ALLOWED =
    3;

const emitAppointmentUpdate =
    (
        appointment:
            any,
        eventName:
            | "appointment:created"
            | "appointment:updated" =
            "appointment:updated",
    ) => {
        try {
            const io =
                getIO();

            io.to(
                `hospital:${String(
                    appointment.hospitalId,
                )}`,
            ).emit(
                eventName,
                {
                    appointmentId:
                        appointment._id,

                    appointmentCode:
                        appointment.appointmentCode,

                    hospitalId:
                        appointment.hospitalId,

                    patientId:
                        appointment.patientId,

                    doctorId:
                        appointment.doctorId,

                    departmentId:
                        appointment.departmentId,

                    appointmentDate:
                        appointment.appointmentDate,

                    requestedStartTime:
                        appointment.requestedStartTime,

                    confirmedStartTime:
                        appointment.confirmedStartTime,

                    endTime:
                        appointment.endTime,

                    status:
                        appointment.status,

                    paymentStatus:
                        appointment.paymentStatus,
                },
            );
        } catch (
        socketError
        ) {
            console.error(
                "APPOINTMENT SOCKET EMIT ERROR:",
                socketError,
            );
        }
    };

/* ============================================================
   GET DOCTORS FOR APPOINTMENTS
============================================================ */

export const getAppointmentDoctors =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const departmentId =
                typeof req.query.departmentId ===
                    "string"
                    ? req.query.departmentId
                    : undefined;

            const filter:
                any = {
                hospitalId,
                role:
                    "DOCTOR",
                isActive:
                    true,
            };

            if (
                departmentId
            ) {
                filter.departmentId =
                    departmentId;
            }

            const doctors =
                await User.find(
                    filter,
                )
                    .select(
                        "_id name phone departmentId isOnline lastSeenAt",
                    )
                    .populate(
                        "departmentId",
                        "name",
                    )
                    .lean();

            const schedules =
                await DoctorSchedule.find({
                    hospitalId,
                    doctorId: {
                        $in:
                            doctors.map(
                                (
                                    doctor,
                                ) =>
                                    doctor._id,
                            ),
                    },
                }).lean();

            const scheduleMap =
                new Map(
                    schedules.map(
                        (
                            schedule,
                        ) => [
                                String(
                                    schedule.doctorId,
                                ),
                                schedule,
                            ],
                    ),
                );

            return res.json({
                success:
                    true,
                data:
                    doctors.map(
                        (
                            doctor,
                        ) => ({
                            ...doctor,
                            schedule:
                                scheduleMap.get(
                                    String(
                                        doctor._id,
                                    ),
                                ) ??
                                null,
                            scheduleConfigured:
                                scheduleMap.has(
                                    String(
                                        doctor._id,
                                    ),
                                ),
                        }),
                    ),
            });
        } catch (
        error
        ) {
            console.error(
                "GET APPOINTMENT DOCTORS ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to load doctors",
            });
        }
    };

/* ============================================================
   SEARCH PATIENT
============================================================ */

export const searchAppointmentPatients =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const query =
                String(
                    req.query.q ||
                    "",
                ).trim();

            if (
                query.length <
                2
            ) {
                return res.json({
                    success:
                        true,
                    data:
                        [],
                });
            }

            const regex =
                new RegExp(
                    query,
                    "i",
                );

            const patients =
                await Patient.find({
                    hospitalId,
                    $or: [
                        {
                            name:
                                regex,
                        },
                        {
                            phone:
                                regex,
                        },
                        {
                            patientCode:
                                regex,
                        },
                    ],
                })
                    .limit(
                        20,
                    )
                    .select(
                        "_id name phone age gender patientCode noShowCount onlineBookingBlocked",
                    )
                    .lean();

            return res.json({
                success:
                    true,
                data:
                    patients,
            });
        } catch (
        error
        ) {
            console.error(
                "PATIENT SEARCH ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to search patients",
            });
        }
    };

/* ============================================================
   GET DOCTOR SCHEDULE
============================================================ */

export const getDoctorSchedule =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const doctorId =
                getParam(
                    req.params.doctorId,
                );

            if (
                !doctorId ||
                !mongoose.isValidObjectId(
                    doctorId,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid doctor ID",
                });
            }

            const schedule =
                await DoctorSchedule.findOne({
                    hospitalId,
                    doctorId,
                }).lean();

            return res.json({
                success:
                    true,
                data:
                    schedule,
            });
        } catch (
        error
        ) {
            console.error(
                "GET DOCTOR SCHEDULE ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to load doctor schedule",
            });
        }
    };

/* ============================================================
   UPDATE / CREATE DOCTOR SCHEDULE
============================================================ */

export const updateDoctorSchedule =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            if (
                req.user?.role !==
                "HOSPITAL_ADMIN"
            ) {
                return res.status(403).json({
                    success:
                        false,
                    message:
                        "Hospital Admin access required",
                });
            }

            const hospitalId =
                getHospitalId(
                    req,
                );

            const doctorId =
                getParam(
                    req.params.doctorId,
                );

            if (
                !doctorId ||
                !mongoose.isValidObjectId(
                    doctorId,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid doctor ID",
                });
            }

            const doctor =
                await User.findOne({
                    _id:
                        doctorId,
                    hospitalId,
                    role:
                        "DOCTOR",
                });

            if (
                !doctor
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Doctor not found",
                });
            }

            const {
                consultationMode,
                appointmentEnabled,
                confirmationRequired,
                slotDurationMinutes,
                weeklyAvailability,
                blockedDates,
                maxAppointmentsPerDay,
                maxWalkInsPerDay,
                emergencyBufferPerDay,
                minNoticeMinutes,
                bookingWindowDays,
                gracePeriodMinutes,
                hybridPattern,
            } =
                req.body;

            const dayMap:
                Record<number, string> = {
                0: "SUNDAY",
                1: "MONDAY",
                2: "TUESDAY",
                3: "WEDNESDAY",
                4: "THURSDAY",
                5: "FRIDAY",
                6: "SATURDAY",
            };

            const normalizeDay =
                (
                    value:
                        any,
                ): string => {
                    if (
                        typeof value ===
                        "number"
                    ) {
                        return dayMap[value] ||
                            "MONDAY";
                    }

                    const stringValue =
                        String(
                            value ||
                            "",
                        )
                            .trim()
                            .toUpperCase();

                    if (
                        dayMap[
                        Number(
                            stringValue,
                        )
                        ]
                    ) {
                        return dayMap[
                            Number(
                                stringValue,
                            )
                        ];
                    }

                    return stringValue;
                };

            const normalizedWeeklyAvailability =
                Array.isArray(
                    weeklyAvailability,
                )
                    ? weeklyAvailability.map(
                        (
                            item:
                                any,
                        ) => ({
                            day:
                                normalizeDay(
                                    item.day ??
                                    item.dayOfWeek,
                                ),

                            isAvailable:
                                Boolean(
                                    item.isAvailable,
                                ),

                            sessions:
                                Array.isArray(
                                    item.sessions,
                                )
                                    ? item.sessions.map(
                                        (
                                            session:
                                                any,
                                        ) => ({
                                            startTime:
                                                String(
                                                    session.startTime ||
                                                    "",
                                                ),

                                            endTime:
                                                String(
                                                    session.endTime ||
                                                    "",
                                                ),

                                            slotType:
                                                session.slotType ||
                                                "APPOINTMENT",
                                        }),
                                    )
                                    : [],

                            blockedPeriods:
                                Array.isArray(
                                    item.blockedPeriods,
                                )
                                    ? item.blockedPeriods
                                    : [],
                        }),
                    )
                    : [];

            const finalConsultationMode =
                consultationMode ||
                "HYBRID";

            const finalAppointmentEnabled =
                finalConsultationMode ===
                    "OPD_ONLY"
                    ? false
                    : appointmentEnabled ??
                    true;

            const finalConfirmationRequired =
                finalConsultationMode ===
                    "ON_CALL_APPOINTMENT"
                    ? true
                    : confirmationRequired ??
                    false;

            const hasOnlyAppointmentSessions =
                normalizedWeeklyAvailability
                    .filter(
                        (
                            day:
                                any,
                        ) =>
                            day.isAvailable,
                    )
                    .every(
                        (
                            day:
                                any,
                        ) =>
                            Array.isArray(
                                day.sessions,
                            ) &&
                            day.sessions.length > 0 &&
                            day.sessions.every(
                                (
                                    session:
                                        any,
                                ) =>
                                    session.slotType ===
                                    "APPOINTMENT",
                            ),
                    );

            const hasOnlyWalkInSessions =
                normalizedWeeklyAvailability
                    .filter(
                        (
                            day:
                                any,
                        ) =>
                            day.isAvailable,
                    )
                    .every(
                        (
                            day:
                                any,
                        ) =>
                            Array.isArray(
                                day.sessions,
                            ) &&
                            day.sessions.length > 0 &&
                            day.sessions.every(
                                (
                                    session:
                                        any,
                                ) =>
                                    session.slotType ===
                                    "WALK_IN",
                            ),
                    );

            const finalHybridPattern =
                finalConsultationMode ===
                    "HYBRID"
                    ? [
                        "APPOINTMENT",
                        "WALK_IN",
                    ]
                    : finalConsultationMode ===
                        "OPD_ONLY"
                        ? [
                            "WALK_IN",
                        ]
                        : [
                            "APPOINTMENT",
                        ];
            const payload = {
                hospitalId,

                doctorId:
                    new mongoose.Types.ObjectId(
                        doctorId,
                    ),

                consultationMode:
                    finalConsultationMode,

                appointmentEnabled:
                    finalAppointmentEnabled,

                confirmationRequired:
                    finalConfirmationRequired,

                slotDurationMinutes:
                    Number(
                        slotDurationMinutes ||
                        15,
                    ),

                weeklyAvailability:
                    normalizedWeeklyAvailability,

                blockedDates:
                    Array.isArray(
                        blockedDates,
                    )
                        ? blockedDates
                        : [],

                maxAppointmentsPerDay:
                    Number(
                        maxAppointmentsPerDay ||
                        40,
                    ),

                maxWalkInsPerDay:
                    Number(
                        maxWalkInsPerDay ||
                        100,
                    ),

                emergencyBufferPerDay:
                    Number(
                        emergencyBufferPerDay ||
                        5,
                    ),

                minNoticeMinutes:
                    Number(
                        minNoticeMinutes ||
                        0,
                    ),

                minimumNoticeMinutes:
                    Number(
                        minNoticeMinutes ||
                        req.body.minimumNoticeMinutes ||
                        0,
                    ),

                bookingWindowDays:
                    Number(
                        bookingWindowDays ||
                        30,
                    ),

                gracePeriodMinutes:
                    Number(
                        gracePeriodMinutes ||
                        15,
                    ),

                hybridPattern:
                    finalHybridPattern,
            };

            const schedule =
                await DoctorSchedule.findOneAndUpdate(
                    {
                        hospitalId,
                        doctorId:
                            new mongoose.Types.ObjectId(
                                doctorId,
                            ),
                    },
                    {
                        $set:
                            payload,
                    },
                    {
                        returnDocument:
                            "after",
                        upsert:
                            true,
                        runValidators:
                            true,
                        setDefaultsOnInsert:
                            true,
                    },
                );

            const today =
                getIndiaDateString();

            await DoctorSlot.deleteMany({
                hospitalId,
                doctorId:
                    new mongoose.Types.ObjectId(
                        doctorId,
                    ),
                date: {
                    $gte:
                        today,
                },
                source:
                    "AUTO",
                status: {
                    $in: [
                        "AVAILABLE",
                        "BLOCKED",
                    ],
                },
            });

            return res.json({
                success:
                    true,
                message:
                    "Doctor schedule updated successfully",
                data:
                    schedule,
            });
        } catch (
        error: any
        ) {
            console.error(
                "UPDATE DOCTOR SCHEDULE ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    error?.message ||
                    "Failed to update doctor schedule",
                errors:
                    error?.errors ||
                    undefined,
            });
        }
    };

/* ============================================================
   GET DOCTOR DAILY SLOTS
============================================================ */

export const getDoctorSlots =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const doctorId =
                getParam(
                    req.params.doctorId,
                );

            const date =
                String(
                    req.query.date ||
                    "",
                );

            if (
                !doctorId ||
                !date
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Doctor ID and date are required",
                });
            }

            const result =
                await generateDoctorSlots(
                    String(
                        hospitalId,
                    ),
                    doctorId,
                    date,
                );

            return res.json({
                success:
                    true,
                data: {
                    date,
                    consultationMode:
                        result.schedule.consultationMode,
                    appointmentEnabled:
                        result.schedule.appointmentEnabled,
                    confirmationRequired:
                        result.schedule.confirmationRequired,
                    slotDurationMinutes:
                        result.schedule.slotDurationMinutes,
                    slots:
                        result.slots,
                },
            });
        } catch (
        error: any
        ) {
            console.error(
                "GET DOCTOR SLOTS ERROR:",
                error,
            );

            return res.status(
                error?.message ===
                    "Doctor schedule not configured"
                    ? 404
                    : 500,
            ).json({
                success:
                    false,
                message:
                    error?.message ||
                    "Failed to load slots",
            });
        }
    };

/* ============================================================
   ADMIN UPDATE SLOT
============================================================ */

export const updateDoctorSlot =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            if (
                req.user?.role !==
                "HOSPITAL_ADMIN"
            ) {
                return res.status(403).json({
                    success:
                        false,
                    message:
                        "Hospital Admin access required",
                });
            }

            const hospitalId =
                getHospitalId(
                    req,
                );

            const slotId =
                getParam(
                    req.params.slotId,
                );

            if (
                !slotId ||
                !mongoose.isValidObjectId(
                    slotId,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid slot ID",
                });
            }

            const slot =
                await DoctorSlot.findOne({
                    _id:
                        slotId,
                    hospitalId,
                });

            if (
                !slot
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Slot not found",
                });
            }

            if (
                [
                    "BOOKED",
                    "HELD",
                ].includes(
                    slot.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Booked or held slot cannot be manually changed",
                });
            }

            const {
                slotType,
                status,
                blockReason,
            } =
                req.body;

            if (
                slotType
            ) {
                slot.slotType =
                    slotType;
            }

            if (
                status
            ) {
                slot.status =
                    status;
            }

            slot.blockReason =
                blockReason;

            slot.source =
                "MANUAL";

            await slot.save();

            return res.json({
                success:
                    true,
                message:
                    "Slot updated",
                data:
                    slot,
            });
        } catch (
        error
        ) {
            console.error(
                "UPDATE DOCTOR SLOT ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to update slot",
            });
        }
    };

/* ============================================================
   CREATE APPOINTMENT
============================================================ */

export const createAppointment =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            if (
                !canManageAppointments(
                    req,
                )
            ) {
                return res.status(403).json({
                    success:
                        false,
                    message:
                        "Appointment access denied",
                });
            }

            const hospitalId =
                getHospitalId(
                    req,
                );

            const {
                patientId,
                doctorId,
                departmentId,
                slotId,
                reason,
                notes,
                feeAmount,
            } =
                req.body;

            if (
                !patientId ||
                !doctorId ||
                !departmentId ||
                !slotId
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Patient, doctor, department and slot are required",
                });
            }

            if (
                !mongoose.isValidObjectId(
                    patientId,
                ) ||
                !mongoose.isValidObjectId(
                    doctorId,
                ) ||
                !mongoose.isValidObjectId(
                    departmentId,
                ) ||
                !mongoose.isValidObjectId(
                    slotId,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid patient, doctor, department or slot ID",
                });
            }

            const [
                patient,
                doctor,
                department,
                schedule,
            ] =
                await Promise.all([
                    Patient.findOne({
                        _id:
                            patientId,
                        hospitalId,
                    }),

                    User.findOne({
                        _id:
                            doctorId,
                        hospitalId,
                        role:
                            "DOCTOR",
                    }),

                    Department.findOne({
                        _id:
                            departmentId,
                        hospitalId,
                    }),

                    DoctorSchedule.findOne({
                        hospitalId,
                        doctorId,
                    }),
                ]);

            if (
                !patient ||
                !doctor ||
                !department
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Patient, doctor or department not found",
                });
            }

            if (
                !schedule ||
                !schedule.appointmentEnabled
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Appointments are not enabled for this doctor",
                });
            }

            /* ============================================================
               FAKE BOOKING PROTECTION
            ============================================================ */

            const patientAny:
                any =
                patient;

            if (
                patientAny.onlineBookingBlocked
            ) {
                return res.status(403).json({
                    success:
                        false,
                    message:
                        "Online booking is blocked for this patient because of repeated missed appointments. Please contact reception.",
                });
            }

            if (
                Number(
                    patientAny.noShowCount ||
                    0,
                ) >=
                MAX_NO_SHOW_ALLOWED
            ) {
                return res.status(403).json({
                    success:
                        false,
                    message:
                        "This patient has missed multiple appointments. Please book from reception.",
                });
            }

            const selectedSlot =
                await DoctorSlot.findOne({
                    _id:
                        slotId,
                    hospitalId,
                    doctorId,
                    slotType:
                        "APPOINTMENT",
                }).lean();

            if (
                !selectedSlot
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment slot not found",
                });
            }

            const appointmentDate =
                getDateOnly(
                    selectedSlot.date,
                );

            const duplicateSameDoctorToday =
                await Appointment.findOne({
                    hospitalId,
                    patientId,
                    doctorId,
                    appointmentDate,
                    status: {
                        $in:
                            ACTIVE_APPOINTMENT_STATUSES,
                    },
                }).lean();

            if (
                duplicateSameDoctorToday
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "This patient already has an active appointment with this doctor on this date.",
                });
            }

            const activeFutureAppointments =
                await Appointment.countDocuments({
                    hospitalId,
                    patientId,
                    status: {
                        $in:
                            ACTIVE_APPOINTMENT_STATUSES,
                    },
                });

            if (
                activeFutureAppointments >=
                MAX_ACTIVE_FUTURE_APPOINTMENTS_PER_PATIENT
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        `This patient already has ${MAX_ACTIVE_FUTURE_APPOINTMENTS_PER_PATIENT} active appointments. Please complete or cancel old appointments first.`,
                });
            }

            const confirmationRequired =
                schedule.confirmationRequired ||
                schedule.consultationMode ===
                "ON_CALL_APPOINTMENT";

            const targetStatus =
                confirmationRequired
                    ? "HELD"
                    : "BOOKED";

            const slot =
                await DoctorSlot.findOneAndUpdate(
                    {
                        _id:
                            slotId,
                        hospitalId,
                        doctorId,
                        slotType:
                            "APPOINTMENT",
                        status:
                            "AVAILABLE",
                    },
                    {
                        $set: {
                            status:
                                targetStatus,
                            patientId,
                        },
                    },
                    {
                        returnDocument:
                            "after",
                    },
                );

            if (
                !slot
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "This appointment slot is no longer available",
                });
            }

            try {
                const status =
                    confirmationRequired
                        ? "REQUESTED"
                        : "BOOKED";

                const parsedFeeAmount =
                    Number(
                        feeAmount ||
                        0,
                    );

                const appointment =
                    await Appointment.create({
                        hospitalId,
                        patientId,
                        doctorId,
                        departmentId,

                        slotId:
                            slot._id,

                        appointmentCode:
                            generateAppointmentCode(),

                        appointmentDate:
                            slot.date,

                        requestedStartTime:
                            slot.startTime,

                        confirmedStartTime:
                            confirmationRequired
                                ? null
                                : slot.startTime,

                        endTime:
                            slot.endTime,

                        status,

                        paymentStatus:
                            "UNPAID",

                        feeAmount:
                            Number.isFinite(
                                parsedFeeAmount,
                            )
                                ? parsedFeeAmount
                                : 0,

                        paidAmount:
                            0,

                        confirmationRequired,

                        reason,
                        notes,

                        createdBy:
                            getRequestUserObjectId(
                                req,
                            ) ??
                            null,

                        createdByRole:
                            req.user?.role,

                        history: [
                            {
                                status,
                                at:
                                    new Date(),
                                by:
                                    getRequestUserObjectId(
                                        req,
                                    ),
                                note:
                                    confirmationRequired
                                        ? "Appointment request created"
                                        : "Appointment booked",
                            },
                        ],
                    });

                slot.appointmentId =
                    appointment._id;

                await slot.save();

                emitAppointmentUpdate(
                    appointment,
                    "appointment:created",
                );

                return res.status(201).json({
                    success:
                        true,
                    message:
                        confirmationRequired
                            ? "Appointment request created. Doctor confirmation required."
                            : "Appointment booked successfully",
                    data:
                        appointment,
                });
            } catch (
            error
            ) {
                await DoctorSlot.updateOne(
                    {
                        _id:
                            slot._id,
                    },
                    {
                        $set: {
                            status:
                                "AVAILABLE",
                            patientId:
                                null,
                            appointmentId:
                                null,
                        },
                    },
                );

                throw error;
            }
        } catch (
        error
        ) {
            console.error(
                "CREATE APPOINTMENT ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to create appointment",
            });
        }
    };

/* ============================================================
   GET APPOINTMENTS
============================================================ */

export const getAppointments =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const {
                date,
                doctorId,
                departmentId,
                status,
                paymentStatus,
            } =
                req.query;

            const filter:
                any = {
                hospitalId,
            };

            if (
                typeof date ===
                "string" &&
                date.trim()
            ) {
                const selectedDate =
                    date.trim();

                const startOfDay =
                    new Date(
                        `${selectedDate}T00:00:00.000+05:30`,
                    );

                const endOfDay =
                    new Date(
                        `${selectedDate}T23:59:59.999+05:30`,
                    );

                filter.$or = [
                    {
                        appointmentDate:
                            selectedDate,
                    },
                    {
                        appointmentDate: {
                            $gte:
                                startOfDay,
                            $lte:
                                endOfDay,
                        },
                    },
                ];
            }

            if (
                typeof doctorId ===
                "string" &&
                doctorId !==
                "ALL" &&
                mongoose.isValidObjectId(
                    doctorId,
                )
            ) {
                filter.doctorId =
                    doctorId;
            }

            if (
                typeof departmentId ===
                "string" &&
                departmentId !==
                "ALL" &&
                mongoose.isValidObjectId(
                    departmentId,
                )
            ) {
                filter.departmentId =
                    departmentId;
            }

            if (
                typeof status ===
                "string" &&
                status !==
                "ALL"
            ) {
                filter.status =
                    status;
            }

            if (
                typeof paymentStatus ===
                "string" &&
                paymentStatus !==
                "ALL"
            ) {
                filter.paymentStatus =
                    paymentStatus;
            }

            const appointments =
                await Appointment.find(
                    filter,
                )
                    .populate(
                        "patientId",
                        "name phone age gender patientCode noShowCount onlineBookingBlocked",
                    )
                    .populate(
                        "doctorId",
                        "name",
                    )
                    .populate(
                        "departmentId",
                        "name tokenPrefix",
                    )
                    .populate(
                        "queueId",
                        "tokenLabel status source estimatedTurnTime estimatedWaitTime",
                    )
                    .sort({
                        appointmentDate:
                            1,
                        requestedStartTime:
                            1,
                        createdAt:
                            -1,
                    })
                    .lean();

            return res.json({
                success:
                    true,
                count:
                    appointments.length,
                data:
                    appointments,
            });
        } catch (
        error
        ) {
            console.error(
                "GET APPOINTMENTS ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to load appointments",
            });
        }
    };

/* ============================================================
   CONFIRM ON-CALL APPOINTMENT
============================================================ */

export const confirmAppointment =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const appointmentId =
                getParam(
                    req.params.id,
                );

            if (
                !appointmentId ||
                !mongoose.isValidObjectId(
                    appointmentId,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid appointment ID",
                });
            }

            const appointment =
                await Appointment.findOne({
                    _id:
                        appointmentId,
                    hospitalId,
                });

            if (
                !appointment
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment not found",
                });
            }

            if (
                ![
                    "REQUESTED",
                    "RESCHEDULE_REQUESTED",
                ].includes(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Appointment cannot be confirmed in current status",
                });
            }

            appointment.status =
                "CONFIRMED";

            appointment.confirmedStartTime =
                appointment.requestedStartTime;

            pushHistory(
                appointment,
                "CONFIRMED",
                req,
                "Hospital confirmed appointment with doctor",
            );

            await appointment.save();

            if (
                appointment.slotId
            ) {
                await DoctorSlot.updateOne(
                    {
                        _id:
                            appointment.slotId,
                    },
                    {
                        $set: {
                            status:
                                "BOOKED",
                        },
                    },
                );
            }

            emitAppointmentUpdate(
                appointment,
                "appointment:updated",
            );

            return res.json({
                success:
                    true,
                message:
                    "Appointment confirmed",
                data:
                    appointment,
            });
        } catch (
        error
        ) {
            console.error(
                "CONFIRM APPOINTMENT ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to confirm appointment",
            });
        }
    };

/* ============================================================
   REJECT
============================================================ */

export const rejectAppointment =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const id =
                getParam(
                    req.params.id,
                );

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid appointment ID",
                });
            }

            const appointment =
                await Appointment.findOne({
                    _id:
                        id,
                    hospitalId,
                });

            if (
                !appointment
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment not found",
                });
            }

            if (
                [
                    "COMPLETED",
                    "CANCELLED",
                    "REJECTED",
                    "CHECKED_IN",
                    "IN_CONSULTATION",
                ].includes(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Appointment cannot be rejected in current status",
                });
            }

            appointment.status =
                "REJECTED";

            appointment.rejectedReason =
                req.body.reason ||
                "Not available";

            pushHistory(
                appointment,
                "REJECTED",
                req,
                appointment.rejectedReason,
            );

            await appointment.save();

            if (
                appointment.slotId
            ) {
                await DoctorSlot.updateOne(
                    {
                        _id:
                            appointment.slotId,
                    },
                    {
                        $set: {
                            status:
                                "AVAILABLE",
                            appointmentId:
                                null,
                            patientId:
                                null,
                        },
                    },
                );
            }

            emitAppointmentUpdate(
                appointment,
                "appointment:updated",
            );

            return res.json({
                success:
                    true,
                message:
                    "Appointment rejected",
            });
        } catch (
        error
        ) {
            console.error(
                "REJECT APPOINTMENT ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to reject appointment",
            });
        }
    };

/* ============================================================
   CANCEL
============================================================ */

export const cancelAppointment =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const id =
                getParam(
                    req.params.id,
                );

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid appointment ID",
                });
            }

            const appointment =
                await Appointment.findOne({
                    _id:
                        id,
                    hospitalId,
                });

            if (
                !appointment
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment not found",
                });
            }

            if (
                [
                    "COMPLETED",
                    "CANCELLED",
                    "REJECTED",
                    "CHECKED_IN",
                    "IN_CONSULTATION",
                ].includes(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Appointment cannot be cancelled",
                });
            }

            appointment.status =
                "CANCELLED";

            appointment.cancelledAt =
                new Date();

            appointment.cancellationReason =
                req.body.reason ||
                "Cancelled";

            pushHistory(
                appointment,
                "CANCELLED",
                req,
                appointment.cancellationReason,
            );

            await appointment.save();

            if (
                appointment.slotId
            ) {
                await DoctorSlot.updateOne(
                    {
                        _id:
                            appointment.slotId,
                    },
                    {
                        $set: {
                            status:
                                "AVAILABLE",
                            appointmentId:
                                null,
                            patientId:
                                null,
                        },
                    },
                );
            }

            emitAppointmentUpdate(
                appointment,
                "appointment:updated",
            );

            return res.json({
                success:
                    true,
                message:
                    "Appointment cancelled",
            });
        } catch (
        error
        ) {
            console.error(
                "CANCEL APPOINTMENT ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to cancel appointment",
            });
        }
    };

/* ============================================================
   RESCHEDULE
============================================================ */

export const rescheduleAppointment =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const id =
                getParam(
                    req.params.id,
                );

            const {
                slotId,
            } =
                req.body;

            if (
                !id ||
                !slotId ||
                !mongoose.isValidObjectId(
                    id,
                ) ||
                !mongoose.isValidObjectId(
                    slotId,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid appointment or slot ID",
                });
            }

            const appointment =
                await Appointment.findOne({
                    _id:
                        id,
                    hospitalId,
                });

            if (
                !appointment
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment not found",
                });
            }

            if (
                [
                    "COMPLETED",
                    "CANCELLED",
                    "REJECTED",
                    "CHECKED_IN",
                    "IN_CONSULTATION",
                    "NO_SHOW",
                ].includes(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Appointment cannot be rescheduled in current status",
                });
            }

            const schedule =
                await DoctorSchedule.findOne({
                    hospitalId,
                    doctorId:
                        appointment.doctorId,
                });

            if (
                !schedule
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Doctor schedule not configured",
                });
            }

            const confirmationRequired =
                schedule.confirmationRequired ||
                schedule.consultationMode ===
                "ON_CALL_APPOINTMENT";

            const newSlot =
                await DoctorSlot.findOneAndUpdate(
                    {
                        _id:
                            slotId,
                        hospitalId,
                        doctorId:
                            appointment.doctorId,
                        slotType:
                            "APPOINTMENT",
                        status:
                            "AVAILABLE",
                    },
                    {
                        $set: {
                            status:
                                confirmationRequired
                                    ? "HELD"
                                    : "BOOKED",
                            patientId:
                                appointment.patientId,
                            appointmentId:
                                appointment._id,
                        },
                    },
                    {
                        returnDocument:
                            "after",
                    },
                );

            if (
                !newSlot
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "New slot is not available",
                });
            }

            const oldSlot =
                appointment.slotId;

            appointment.slotId =
                newSlot._id;

            appointment.appointmentDate =
                newSlot.date;

            appointment.requestedStartTime =
                newSlot.startTime;

            appointment.endTime =
                newSlot.endTime;

            appointment.confirmedStartTime =
                confirmationRequired
                    ? null
                    : newSlot.startTime;

            appointment.status =
                confirmationRequired
                    ? "RESCHEDULE_REQUESTED"
                    : "BOOKED";

            appointment.paymentStatus =
                "UNPAID";

            appointment.paidAmount =
                0;

            appointment.paidAt =
                null;

            appointment.paymentMethod =
                null;

            appointment.arrivedAt =
                null;

            appointment.checkedInAt =
                null;

            appointment.queueId =
                null;

            pushHistory(
                appointment,
                appointment.status,
                req,
                "Appointment rescheduled",
            );

            await appointment.save();

            if (
                oldSlot
            ) {
                await DoctorSlot.updateOne(
                    {
                        _id:
                            oldSlot,
                    },
                    {
                        $set: {
                            status:
                                "AVAILABLE",
                            patientId:
                                null,
                            appointmentId:
                                null,
                        },
                    },
                );
            }

            emitAppointmentUpdate(
                appointment,
                "appointment:updated",
            );

            return res.json({
                success:
                    true,
                message:
                    confirmationRequired
                        ? "Reschedule request created"
                        : "Appointment rescheduled",
                data:
                    appointment,
            });
        } catch (
        error
        ) {
            console.error(
                "RESCHEDULE APPOINTMENT ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to reschedule appointment",
            });
        }
    };

/* ============================================================
   NO SHOW
============================================================ */

export const markAppointmentNoShow =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const id =
                getParam(
                    req.params.id,
                );

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid appointment ID",
                });
            }

            const appointment =
                await Appointment.findOne({
                    _id:
                        id,
                    hospitalId,
                });

            if (
                !appointment
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment not found",
                });
            }

            if (
                [
                    "COMPLETED",
                    "CANCELLED",
                    "REJECTED",
                    "CHECKED_IN",
                    "IN_CONSULTATION",
                    "NO_SHOW",
                ].includes(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Appointment cannot be marked no-show in current status",
                });
            }

            const now =
                new Date();

            appointment.status =
                "NO_SHOW";

            appointment.noShowAt =
                now;

            pushHistory(
                appointment,
                "NO_SHOW",
                req,
                "Patient did not arrive",
            );

            await appointment.save();

            await Patient.updateOne(
                {
                    _id:
                        appointment.patientId,
                    hospitalId,
                },
                {
                    $inc: {
                        noShowCount:
                            1,
                    },
                    $set: {
                        lastNoShowAt:
                            now,
                    },
                },
            );

            const updatedPatient:
                any =
                await Patient.findOne({
                    _id:
                        appointment.patientId,
                    hospitalId,
                }).lean();

            if (
                Number(
                    updatedPatient?.noShowCount ||
                    0,
                ) >=
                MAX_NO_SHOW_ALLOWED
            ) {
                await Patient.updateOne(
                    {
                        _id:
                            appointment.patientId,
                        hospitalId,
                    },
                    {
                        $set: {
                            onlineBookingBlocked:
                                true,
                        },
                    },
                );
            }

            if (
                appointment.slotId
            ) {
                await DoctorSlot.updateOne(
                    {
                        _id:
                            appointment.slotId,
                    },
                    {
                        $set: {
                            status:
                                "MISSED",
                        },
                    },
                );
            }

            emitAppointmentUpdate(
                appointment,
                "appointment:updated",
            );

            return res.json({
                success:
                    true,
                message:
                    "Appointment marked as no-show",
            });
        } catch (
        error
        ) {
            console.error(
                "MARK APPOINTMENT NO SHOW ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to mark appointment as no-show",
            });
        }
    };

/* ============================================================
   MARK ARRIVED
============================================================ */

export const markAppointmentArrived =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const id =
                getParam(
                    req.params.id,
                );

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid appointment ID",
                });
            }

            const appointment =
                await Appointment.findOne({
                    _id:
                        id,
                    hospitalId,
                });

            if (
                !appointment
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment not found",
                });
            }

            if (
                isClosedAppointmentStatus(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "This appointment cannot be marked arrived",
                });
            }

            if (
                appointment.status ===
                "CHECKED_IN"
            ) {
                return res.json({
                    success:
                        true,
                    message:
                        "Patient already checked in",
                    data:
                        appointment,
                });
            }

            const today =
                getIndiaDateString();

            if (
                getDateOnly(
                    appointment.appointmentDate,
                ) !==
                today
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Only today's appointment can be marked arrived",
                });
            }

            if (
                ![
                    "BOOKED",
                    "CONFIRMED",
                    "ARRIVED",
                ].includes(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Only booked or confirmed appointment can be marked arrived",
                });
            }

            if (
                !appointment.arrivedAt
            ) {
                appointment.arrivedAt =
                    new Date();
            }

            appointment.status =
                "ARRIVED";

            pushHistory(
                appointment,
                "ARRIVED",
                req,
                "Patient arrived at reception",
            );

            await appointment.save();

            emitAppointmentUpdate(
                appointment,
                "appointment:updated",
            );

            return res.json({
                success:
                    true,
                message:
                    "Patient marked as arrived",
                data:
                    appointment,
            });
        } catch (
        error
        ) {
            console.error(
                "MARK APPOINTMENT ARRIVED ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to mark appointment arrived",
            });
        }
    };

/* ============================================================
   COLLECT PAYMENT
============================================================ */

export const collectAppointmentPayment =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const id =
                getParam(
                    req.params.id,
                );

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid appointment ID",
                });
            }

            const {
                paidAmount,
                paymentMethod,
                feeAmount,
            } =
                req.body;

            const appointment =
                await Appointment.findOne({
                    _id:
                        id,
                    hospitalId,
                });

            if (
                !appointment
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment not found",
                });
            }

            if (
                isClosedAppointmentStatus(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Payment cannot be collected for this appointment",
                });
            }

            if (
                ![
                    "BOOKED",
                    "CONFIRMED",
                    "ARRIVED",
                    "CHECKED_IN",
                ].includes(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Appointment must be booked, confirmed or arrived before payment",
                });
            }

            const parsedPaidAmount =
                Number(
                    paidAmount,
                );

            if (
                !Number.isFinite(
                    parsedPaidAmount,
                ) ||
                parsedPaidAmount <=
                0
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Paid amount must be greater than 0",
                });
            }

            const validPaymentMethods =
                [
                    "CASH",
                    "UPI",
                    "CARD",
                    "OTHER",
                ];

            if (
                !validPaymentMethods.includes(
                    paymentMethod,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Payment method must be CASH, UPI, CARD or OTHER",
                });
            }

            const today =
                getIndiaDateString();

            if (
                getDateOnly(
                    appointment.appointmentDate,
                ) !==
                today
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Only today's appointment payment can be collected",
                });
            }

            if (
                !appointment.arrivedAt
            ) {
                appointment.arrivedAt =
                    new Date();
            }

            if (
                appointment.status !==
                "CHECKED_IN"
            ) {
                appointment.status =
                    "ARRIVED";
            }

            appointment.paymentStatus =
                "PAID";

            appointment.paidAmount =
                parsedPaidAmount;

            const parsedFeeAmount =
                Number(
                    feeAmount,
                );

            appointment.feeAmount =
                Number.isFinite(
                    parsedFeeAmount,
                ) &&
                    parsedFeeAmount >
                    0
                    ? parsedFeeAmount
                    : parsedPaidAmount;

            appointment.paymentMethod =
                paymentMethod;

            appointment.paidAt =
                new Date();

            const collectedBy =
                getRequestUserObjectId(
                    req,
                );

            if (
                collectedBy
            ) {
                appointment.paymentCollectedBy =
                    collectedBy;
            }

            pushHistory(
                appointment,
                "PAYMENT_PAID",
                req,
                `Payment collected: ₹${parsedPaidAmount}`,
            );

            await appointment.save();

            emitAppointmentUpdate(
                appointment,
                "appointment:updated",
            );

            return res.json({
                success:
                    true,
                message:
                    "Payment collected successfully",
                data:
                    appointment,
            });
        } catch (
        error
        ) {
            console.error(
                "COLLECT APPOINTMENT PAYMENT ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to collect appointment payment",
            });
        }
    };

/* ============================================================
   CHECK IN → QUEUE
============================================================ */

export const checkInAppointment =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(
                    req,
                );

            const id =
                getParam(
                    req.params.id,
                );

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id,
                )
            ) {
                return res.status(400).json({
                    success:
                        false,
                    message:
                        "Invalid appointment ID",
                });
            }

            const appointment =
                await Appointment.findOne({
                    _id:
                        id,
                    hospitalId,
                });

            if (
                !appointment
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Appointment not found",
                });
            }

            if (
                appointment.status ===
                "CHECKED_IN" &&
                appointment.queueId
            ) {
                const existingQueue =
                    await Queue.findById(
                        appointment.queueId,
                    );

                return res.json({
                    success:
                        true,
                    message:
                        "Patient already checked in",
                    data: {
                        appointment,
                        queue:
                            existingQueue,
                    },
                });
            }

            if (
                ![
                    "BOOKED",
                    "CONFIRMED",
                    "ARRIVED",
                ].includes(
                    appointment.status,
                )
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Appointment must be booked, confirmed or arrived before check-in",
                });
            }

            if (
                appointment.paymentStatus !==
                "PAID"
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Collect payment before check-in",
                });
            }

            const queueDate =
                getIndiaDateString();

            if (
                getDateOnly(
                    appointment.appointmentDate,
                ) !==
                queueDate
            ) {
                return res.status(409).json({
                    success:
                        false,
                    message:
                        "Only today's appointment can be checked in",
                });
            }

            const department =
                await Department.findOne({
                    _id:
                        appointment.departmentId,
                    hospitalId,
                });

            if (
                !department
            ) {
                return res.status(404).json({
                    success:
                        false,
                    message:
                        "Department not found",
                });
            }

            const existingQueue =
                await Queue.findOne({
                    hospitalId,
                    appointmentId:
                        appointment._id,
                    queueDate,
                    status: {
                        $in: [
                            "WAITING",
                            "CALLED",
                            "SERVING",
                        ],
                    },
                });

            if (
                existingQueue
            ) {
                appointment.status =
                    "CHECKED_IN";

                appointment.queueId =
                    existingQueue._id;

                if (
                    !appointment.checkedInAt
                ) {
                    appointment.checkedInAt =
                        new Date();
                }

                await appointment.save();

                emitAppointmentUpdate(
                    appointment,
                    "appointment:updated",
                );

                return res.json({
                    success:
                        true,
                    message:
                        "Patient already has active queue token",
                    data: {
                        appointment,
                        queue:
                            existingQueue,
                    },
                });
            }

            const lastQueue =
                await Queue.findOne({
                    hospitalId,
                    departmentId:
                        appointment.departmentId,
                    queueDate,
                })
                    .sort({
                        tokenNumber:
                            -1,
                    })
                    .select(
                        "tokenNumber",
                    );

            const tokenNumber =
                (
                    lastQueue?.tokenNumber ||
                    0
                ) + 1;

            const tokenPrefix =
                department.tokenPrefix ||
                "APT";

            const tokenLabel =
                `${tokenPrefix}-${String(
                    tokenNumber,
                ).padStart(
                    3,
                    "0",
                )}`;

            const scheduledStartTime =
                appointment.confirmedStartTime ||
                appointment.requestedStartTime;

            const trackingToken =
                crypto
                    .randomBytes(
                        24,
                    )
                    .toString(
                        "hex",
                    );

            const trackingExpiresAt =
                new Date(
                    Date.now() +
                    24 *
                    60 *
                    60 *
                    1000,
                );

            const now =
                new Date();

            const queue =
                await Queue.create({
                    hospitalId,

                    patientId:
                        appointment.patientId,

                    departmentId:
                        appointment.departmentId,

                    doctorId:
                        appointment.doctorId,

                    appointmentId:
                        appointment._id,

                    source:
                        "APPOINTMENT",

                    scheduledStartTime,

                    sortTime:
                        buildSortTime(
                            queueDate,
                            scheduledStartTime,
                        ),

                    tokenNumber,

                    tokenLabel,

                    priority:
                        "NORMAL",

                    status:
                        "WAITING",

                    queueDate,

                    paymentStatus:
                        "PAID",

                    arrivedAt:
                        appointment.arrivedAt ||
                        now,

                    checkedInAt:
                        now,

                    estimatedWaitTime:
                        0,

                    estimatedTurnTime:
                        null,

                    serviceDurationMinutes:
                        null,

                    trackingToken,

                    trackingLinkActive:
                        true,

                    trackingExpiresAt,

                    tokenNotificationSent:
                        false,

                    nearTurnNotificationSent:
                        false,

                    calledNotificationSent:
                        false,

                    calledAt:
                        null,

                    servingAt:
                        null,

                    completedAt:
                        null,
                });

            appointment.status =
                "CHECKED_IN";

            appointment.checkedInAt =
                now;

            if (
                !appointment.arrivedAt
            ) {
                appointment.arrivedAt =
                    now;
            }

            appointment.queueId =
                queue._id;

            pushHistory(
                appointment,
                "CHECKED_IN",
                req,
                `Queue token ${queue.tokenLabel} generated`,
            );

            await appointment.save();

            try {
                await recalculateDoctorQueueEstimates({
                    hospitalId:
                        String(
                            hospitalId,
                        ),
                    doctorId:
                        String(
                            appointment.doctorId,
                        ),
                    departmentId:
                        String(
                            appointment.departmentId,
                        ),
                    queueDate,
                });
            } catch (
            estimateError
            ) {
                console.error(
                    "Appointment queue estimate recalculation failed:",
                    estimateError,
                );
            }

            emitAppointmentUpdate(
                appointment,
                "appointment:updated",
            );

            return res.json({
                success:
                    true,
                message:
                    "Patient checked in successfully",
                data: {
                    appointment,
                    queue,
                },
            });
        } catch (
        error
        ) {
            console.error(
                "APPOINTMENT CHECK-IN ERROR:",
                error,
            );

            return res.status(500).json({
                success:
                    false,
                message:
                    "Failed to check in patient",
            });
        }
    };


/* ============================================================
BACKEND FIX: CLOSE SAME-DAY PAST APPOINTMENT SLOTS
Add this in BOTH:
1) server/src/controllers/appointment.controller.ts
2) server/src/controllers/publicAppointment.controller.ts

Then call assertAppointmentSlotNotPassed(...) before creating/locking appointment.
============================================================ */

const getIndiaTodayAndMinutes =
    () => {
        const parts =
            new Intl.DateTimeFormat(
                "en-GB",
                {
                    timeZone:
                        "Asia/Kolkata",
                    year:
                        "numeric",
                    month:
                        "2-digit",
                    day:
                        "2-digit",
                    hour:
                        "2-digit",
                    minute:
                        "2-digit",
                    hour12:
                        false,
                },
            ).formatToParts(
                new Date(),
            );

        const getPart =
            (
                type:
                    string,
            ) =>
                parts.find(
                    (
                        part,
                    ) =>
                        part.type ===
                        type,
                )?.value || "";

        const hour =
            Number(
                getPart(
                    "hour",
                ) || "0",
            );

        const minute =
            Number(
                getPart(
                    "minute",
                ) || "0",
            );

        return {
            date:
                `${getPart("year")}-${getPart("month")}-${getPart("day")}`,

            minutes:
                hour * 60 +
                minute,
        };
    };

const timeToMinutes =
    (
        value?: string | null,
    ) => {
        if (
            !value
        ) {
            return null;
        }

        const match =
            String(
                value,
            ).match(
                /^(\d{1,2}):(\d{2})/,
            );

        if (
            !match
        ) {
            return null;
        }

        const hours =
            Number(
                match[1],
            );

        const minutes =
            Number(
                match[2],
            );

        if (
            !Number.isFinite(
                hours,
            ) ||
            !Number.isFinite(
                minutes,
            ) ||
            hours > 23 ||
            minutes > 59
        ) {
            return null;
        }

        return hours * 60 +
            minutes;
    };

const normalizeAppointmentDate =
    (
        value:
            unknown,
    ) => {
        if (
            value instanceof Date
        ) {
            return new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        "Asia/Kolkata",
                },
            ).format(
                value,
            );
        }

        return String(
            value || "",
        ).slice(
            0,
            10,
        );
    };

const isAppointmentSlotPassed =
    (
        appointmentDate:
            unknown,
        startTime:
            string,
    ) => {
        const selectedDate =
            normalizeAppointmentDate(
                appointmentDate,
            );

        const now =
            getIndiaTodayAndMinutes();

        if (
            !selectedDate ||
            selectedDate < now.date
        ) {
            return true;
        }

        if (
            selectedDate > now.date
        ) {
            return false;
        }

        const slotStartMinutes =
            timeToMinutes(
                startTime,
            );

        if (
            slotStartMinutes ===
            null
        ) {
            return true;
        }

        /*
         * Same-day rule:
         * 11:00 slot closes at 11:00.
         * It must close even if it was never booked.
         */
        return slotStartMinutes <=
            now.minutes;
    };

const assertAppointmentSlotNotPassed =
    (
        appointmentDate:
            unknown,
        startTime:
            string,
    ) => {
        if (
            isAppointmentSlotPassed(
                appointmentDate,
                startTime,
            )
        ) {
            return {
                success:
                    false,

                message:
                    "This appointment time has already passed. Please select another available slot.",

                code:
                    "APPOINTMENT_SLOT_TIME_PASSED",
            };
        }

        return null;
    };

/* ============================================================
   INSERT INSIDE ADMIN createAppointment BEFORE SLOT LOCK / CREATE
============================================================ */

// Example:
// const selectedSlot = await DoctorSlot.findById(slotId);
// const passedSlotError = assertAppointmentSlotNotPassed(
//     selectedSlot.slotDate || appointmentDate,
//     selectedSlot.startTime,
// );
//
// if (passedSlotError) {
//     return res.status(409).json(passedSlotError);
// }

/* ============================================================
   INSERT INSIDE PUBLIC bookPublicAppointment BEFORE DoctorSlot.findOneAndUpdate
============================================================ */

// Example:
// const passedSlotError = assertAppointmentSlotNotPassed(
//     appointmentDate,
//     requestedStartTime,
// );
//
// if (passedSlotError) {
//     return res.status(409).json(passedSlotError);
// }
//
// Then continue with DoctorSlot.findOneAndUpdate(...)

/* ============================================================
   UPDATE SLOT LIST RESPONSE TOO
   Wherever you map/get DoctorSlot response, return:
============================================================ */

// const isTimePassed = isAppointmentSlotPassed(slot.slotDate || selectedDate, slot.startTime);
//
// return {
//     ...slotObject,
//     status:
//         isTimePassed && slot.status === "AVAILABLE"
//             ? "TIME_PASSED"
//             : slot.status,
//     isTimePassed,
//     canBook:
//         slot.status === "AVAILABLE" &&
//         slot.slotType === "APPOINTMENT" &&
//         !isTimePassed,
// };


/* ============================================================
   DEFAULT EXPORT
============================================================ */

const appointmentController = {
    getAppointmentDoctors,
    searchAppointmentPatients,

    getDoctorSchedule,
    updateDoctorSchedule,

    getDoctorSlots,
    updateDoctorSlot,

    createAppointment,
    getAppointments,

    confirmAppointment,
    rejectAppointment,
    cancelAppointment,
    rescheduleAppointment,
    markAppointmentNoShow,

    markAppointmentArrived,
    collectAppointmentPayment,
    checkInAppointment,
    getIndiaTodayAndMinutes
};

export default appointmentController;