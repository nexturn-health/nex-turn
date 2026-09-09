import type {
    Request,
    Response,
} from "express";

import crypto from "crypto";
import mongoose from "mongoose";

import {
    Hospital,
} from "../models/Hospital.model";

import {
    Department,
} from "../models/Department.model";

import {
    User,
} from "../models/User.model";

import {
    Patient,
} from "../models/Patient.model";

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
    generateDoctorSlots,
} from "../services/appointmentSlot.service";

import {
    getIO,
} from "../config/socket";

/* ============================================================
   HELPERS
============================================================ */

const getParam =
    (
        value:
            unknown,
    ) => {
        if (
            Array.isArray(
                value,
            )
        ) {
            return String(
                value[0] ||
                "",
            );
        }

        return String(
            value ||
            "",
        );
    };

const escapeRegex =
    (
        value:
            string,
    ) => {
        return value.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );
    };

const exactRegex =
    (
        value:
            string,
    ) => {
        return new RegExp(
            `^${escapeRegex(
                value.trim(),
            )}$`,
            "i",
        );
    };

const normalizePhone =
    (
        value:
            unknown,
    ) => {
        const digits =
            String(
                value ||
                "",
            ).replace(
                /\D/g,
                "",
            );

        if (
            digits.length >=
            10
        ) {
            return digits.slice(
                -10,
            );
        }

        return digits;
    };

const isValidObjectId =
    (
        value:
            string,
    ) => {
        return mongoose.isValidObjectId(
            value,
        );
    };

const toObjectId =
    (
        value:
            string,
    ) => {
        return new mongoose.Types.ObjectId(
            value,
        );
    };

const generateAppointmentCode =
    () => {
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

const generatePatientCode =
    () => {
        return (
            "PAT-" +
            Date.now()
                .toString()
                .slice(
                    -6,
                ) +
            "-" +
            crypto
                .randomBytes(
                    2,
                )
                .toString(
                    "hex",
                )
                .toUpperCase()
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
                "PUBLIC APPOINTMENT SOCKET EMIT ERROR:",
                socketError,
            );
        }
    };

const getPublicHospital =
    async (
        hospitalId:
            string,
    ) => {
        if (
            !isValidObjectId(
                hospitalId,
            )
        ) {
            return null;
        }

        return Hospital.findOne({
            _id:
                toObjectId(
                    hospitalId,
                ),

            publicBookingEnabled:
                true,

            isActive:
                true,
        });
    };

const getHospitalPublicAddress =
    (
        hospital:
            any,
    ) => {
        return (
            hospital.publicAddress ||
            hospital.address?.line1 ||
            hospital.address?.addressLine1 ||
            hospital.address?.street ||
            hospital.city ||
            ""
        );
    };

const sanitizeHospital =
    (
        hospital:
            any,
    ) => ({
        _id:
            String(
                hospital._id,
            ),

        name:
            hospital.publicName ||
            hospital.name,

        state:
            hospital.state ||
            hospital.address?.state ||
            "",

        district:
            hospital.district ||
            hospital.address?.district ||
            "",

        city:
            hospital.city ||
            hospital.address?.city ||
            "",

        address:
            getHospitalPublicAddress(
                hospital,
            ),

        pincode:
            hospital.pincode ||
            hospital.address?.pincode ||
            "",

        logoUrl:
            hospital.logoUrl ||
            "",
    });

/* ============================================================
   GET STATES
   GET /api/public/locations/states
============================================================ */

export const getPublicStates =
    async (
        _req:
            Request,
        res:
            Response,
    ) => {
        try {
            const states =
                await Hospital.distinct(
                    "state",
                    {
                        publicBookingEnabled:
                            true,

                        isActive:
                            true,

                        state: {
                            $exists:
                                true,

                            $ne:
                                "",
                        },
                    },
                );

            return res.json({
                success:
                    true,

                data:
                    states
                        .filter(
                            Boolean,
                        )
                        .sort(),
            });
        } catch (
            error
        ) {
            console.error(
                "GET PUBLIC STATES ERROR:",
                error,
            );

            return res
                .status(
                    500,
                )
                .json({
                    success:
                        false,

                    message:
                        "Failed to load states",
                });
        }
    };

/* ============================================================
   GET DISTRICTS
   GET /api/public/locations/districts?state=Uttar Pradesh
============================================================ */

export const getPublicDistricts =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const state =
                getParam(
                    req.query.state,
                ).trim();

            if (
                !state
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "State is required",
                    });
            }

            const districts =
                await Hospital.distinct(
                    "district",
                    {
                        publicBookingEnabled:
                            true,

                        isActive:
                            true,

                        state:
                            exactRegex(
                                state,
                            ),

                        district: {
                            $exists:
                                true,

                            $ne:
                                "",
                        },
                    },
                );

            return res.json({
                success:
                    true,

                data:
                    districts
                        .filter(
                            Boolean,
                        )
                        .sort(),
            });
        } catch (
            error
        ) {
            console.error(
                "GET PUBLIC DISTRICTS ERROR:",
                error,
            );

            return res
                .status(
                    500,
                )
                .json({
                    success:
                        false,

                    message:
                        "Failed to load districts",
                });
        }
    };

/* ============================================================
   GET HOSPITALS BY LOCATION
   GET /api/public/hospitals?state=Uttar Pradesh&district=Varanasi
============================================================ */

export const getPublicHospitals =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const state =
                getParam(
                    req.query.state,
                ).trim();

            const district =
                getParam(
                    req.query.district,
                ).trim();

            const search =
                getParam(
                    req.query.q,
                ).trim();

            const query:
                any = {
                    publicBookingEnabled:
                        true,

                    isActive:
                        true,
                };

            if (
                state
            ) {
                query.state =
                    exactRegex(
                        state,
                    );
            }

            if (
                district
            ) {
                query.district =
                    exactRegex(
                        district,
                    );
            }

            if (
                search
            ) {
                const regex =
                    new RegExp(
                        escapeRegex(
                            search,
                        ),
                        "i",
                    );

                query.$or = [
                    {
                        name:
                            regex,
                    },
                    {
                        publicName:
                            regex,
                    },
                    {
                        city:
                            regex,
                    },
                    {
                        publicAddress:
                            regex,
                    },
                ];
            }

            const hospitals =
                await Hospital.find(
                    query,
                )
                    .select(
                        "_id name publicName state district city address publicAddress pincode logoUrl",
                    )
                    .sort({
                        name:
                            1,
                    })
                    .lean();

            return res.json({
                success:
                    true,

                data:
                    hospitals.map(
                        sanitizeHospital,
                    ),
            });
        } catch (
            error
        ) {
            console.error(
                "GET PUBLIC HOSPITALS ERROR:",
                error,
            );

            return res
                .status(
                    500,
                )
                .json({
                    success:
                        false,

                    message:
                        "Failed to load hospitals",
                });
        }
    };

/* ============================================================
   GET HOSPITAL DEPARTMENTS
   GET /api/public/hospitals/:hospitalId/departments
============================================================ */

export const getPublicHospitalDepartments =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getParam(
                    req.params.hospitalId,
                );

            const hospital =
                await getPublicHospital(
                    hospitalId,
                );

            if (
                !hospital
            ) {
                return res
                    .status(
                        404,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Hospital not found or booking disabled",
                    });
            }

            const departments =
                await Department.find({
                    hospitalId:
                        hospital._id,

                    isActive:
                        true,
                })
                    .select(
                        "_id name description tokenPrefix",
                    )
                    .sort({
                        name:
                            1,
                    })
                    .lean();

            return res.json({
                success:
                    true,

                data:
                    departments,
            });
        } catch (
            error
        ) {
            console.error(
                "GET PUBLIC DEPARTMENTS ERROR:",
                error,
            );

            return res
                .status(
                    500,
                )
                .json({
                    success:
                        false,

                    message:
                        "Failed to load departments",
                });
        }
    };

/* ============================================================
   GET HOSPITAL DOCTORS
   GET /api/public/hospitals/:hospitalId/doctors?departmentId=...
============================================================ */

export const getPublicHospitalDoctors =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getParam(
                    req.params.hospitalId,
                );

            const departmentId =
                getParam(
                    req.query.departmentId,
                );

            const debug =
                getParam(
                    req.query.debug,
                ) ===
                "true";

            const hospital =
                await getPublicHospital(
                    hospitalId,
                );

            if (
                !hospital
            ) {
                return res
                    .status(
                        404,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Hospital not found or booking disabled",
                    });
            }

            if (
                departmentId &&
                !isValidObjectId(
                    departmentId,
                )
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Invalid department ID",
                    });
            }

            const doctorQuery:
                any = {
                    hospitalId:
                        hospital._id,

                    role:
                        "DOCTOR",

                    isActive: {
                        $ne:
                            false,
                    },
                };

            if (
                departmentId
            ) {
                const departmentObjectId =
                    toObjectId(
                        departmentId,
                    );

                doctorQuery.$or = [
                    {
                        departmentId:
                            departmentObjectId,
                    },
                    {
                        department:
                            departmentObjectId,
                    },
                    {
                        departmentId,
                    },
                    {
                        department:
                            departmentId,
                    },
                ];
            }

            const doctors:
                any[] =
                await User.find(
                    doctorQuery,
                )
                    .select(
                        "_id name phone departmentId department isOnline lastSeenAt isActive role hospitalId",
                    )
                    .populate(
                        "departmentId",
                        "name",
                    )
                    .sort({
                        name:
                            1,
                    })
                    .lean();

            const schedules:
                any[] =
                await DoctorSchedule.find({
                    hospitalId:
                        hospital._id,

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

            const publicDoctors =
                doctors.map(
                    (
                        doctor:
                            any,
                    ) => {
                        const schedule =
                            scheduleMap.get(
                                String(
                                    doctor._id,
                                ),
                            );

                        return {
                            _id:
                                String(
                                    doctor._id,
                                ),

                            name:
                                doctor.name,

                            department:
                                doctor.departmentId
                                    ? {
                                        _id:
                                            String(
                                                doctor.departmentId._id ||
                                                doctor.departmentId,
                                            ),

                                        name:
                                            doctor.departmentId.name ||
                                            "",
                                    }
                                    : null,

                            isOnline:
                                doctor.isOnline ||
                                false,

                            scheduleConfigured:
                                Boolean(
                                    schedule,
                                ),

                            appointmentEnabled:
                                schedule
                                    ? schedule.appointmentEnabled !==
                                    false
                                    : false,
                        };
                    },
                );

            return res.json({
                success:
                    true,

                data:
                    publicDoctors,

                debug:
                    debug
                        ? {
                            hospitalId:
                                String(
                                    hospital._id,
                                ),

                            departmentId,

                            doctorQuery,

                            doctorsFound:
                                doctors.length,

                            schedulesFound:
                                schedules.length,

                            message:
                                doctors.length ===
                                    0
                                    ? "No doctor matched hospitalId + role + departmentId."
                                    : "Doctors found. If slots are empty, configure doctor schedule.",
                        }
                        : undefined,
            });
        } catch (
            error
        ) {
            console.error(
                "GET PUBLIC DOCTORS ERROR:",
                error,
            );

            return res
                .status(
                    500,
                )
                .json({
                    success:
                        false,

                    message:
                        "Failed to load doctors",
                });
        }
    };

/* ============================================================
   GET PUBLIC DOCTOR SLOTS
   GET /api/public/hospitals/:hospitalId/doctors/:doctorId/slots?date=2026-09-08
============================================================ */

export const getPublicDoctorSlots =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getParam(
                    req.params.hospitalId,
                );

            const doctorId =
                getParam(
                    req.params.doctorId,
                );

            const date =
                getParam(
                    req.query.date,
                );

            const debug =
                getParam(
                    req.query.debug,
                ) ===
                "true";

            if (
                !isValidObjectId(
                    hospitalId,
                ) ||
                !isValidObjectId(
                    doctorId,
                ) ||
                !date
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Hospital ID, doctor ID and date are required",
                    });
            }

            const hospital =
                await getPublicHospital(
                    hospitalId,
                );

            if (
                !hospital
            ) {
                return res
                    .status(
                        404,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Hospital not found or booking disabled",
                    });
            }

            const doctor:
                any =
                await User.findOne({
                    _id:
                        toObjectId(
                            doctorId,
                        ),

                    hospitalId:
                        hospital._id,

                    role:
                        "DOCTOR",

                    isActive: {
                        $ne:
                            false,
                    },
                })
                    .select(
                        "_id name departmentId hospitalId role isActive",
                    )
                    .lean();

            if (
                !doctor
            ) {
                return res
                    .status(
                        404,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Doctor not found",
                    });
            }

            const schedule:
                any =
                await DoctorSchedule.findOne({
                    hospitalId:
                        hospital._id,

                    doctorId:
                        toObjectId(
                            doctorId,
                        ),
                }).lean();

            if (
                !schedule
            ) {
                return res
                    .status(
                        404,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Doctor schedule not configured",

                        debug:
                            debug
                                ? {
                                    hospitalId,
                                    doctorId,
                                    date,
                                    doctorFound:
                                        true,
                                    scheduleFound:
                                        false,
                                    fix:
                                        "Go to Admin Dashboard → Appointments → Select doctor → Update schedule.",
                                }
                                : undefined,
                    });
            }

            if (
                schedule.appointmentEnabled ===
                false
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Appointment booking is disabled for this doctor",

                        debug:
                            debug
                                ? {
                                    hospitalId,
                                    doctorId,
                                    date,
                                    scheduleFound:
                                        true,
                                    appointmentEnabled:
                                        schedule.appointmentEnabled,
                                    fix:
                                        "Set appointmentEnabled true in doctor schedule.",
                                }
                                : undefined,
                    });
            }

            const dayNames = [
                "SUNDAY",
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
            ];

            const selectedDate =
                new Date(
                    `${date}T00:00:00`,
                );

            const selectedDay =
                dayNames[
                    selectedDate.getDay()
                ];

            const daySchedule =
                schedule.weeklyAvailability?.find(
                    (
                        item:
                            any,
                    ) =>
                        item.day ===
                        selectedDay,
                );

            if (
                debug
            ) {
                console.log(
                    "PUBLIC SLOT DEBUG:",
                    {
                        hospitalId,
                        doctorId,
                        date,
                        selectedDay,
                        scheduleFound:
                            true,
                        appointmentEnabled:
                            schedule.appointmentEnabled,
                        consultationMode:
                            schedule.consultationMode,
                        weeklyAvailability:
                            schedule.weeklyAvailability,
                        matchedDay:
                            daySchedule,
                    },
                );
            }

            if (
                !daySchedule ||
                daySchedule.isAvailable ===
                false
            ) {
                return res.json({
                    success:
                        true,

                    message:
                        "No schedule available for selected date",

                    data: {
                        date,

                        doctorId,

                        appointmentEnabled:
                            schedule.appointmentEnabled,

                        confirmationRequired:
                            schedule.confirmationRequired,

                        slotDurationMinutes:
                            schedule.slotDurationMinutes,

                        slots:
                            [],
                    },

                    debug:
                        debug
                            ? {
                                selectedDay,
                                reason:
                                    "No weeklyAvailability matched this date day or isAvailable is false.",
                                availableDays:
                                    schedule.weeklyAvailability?.map(
                                        (
                                            item:
                                                any,
                                        ) => ({
                                            day:
                                                item.day,

                                            isAvailable:
                                                item.isAvailable,

                                            sessions:
                                                item.sessions,
                                        }),
                                    ) ||
                                    [],
                                fix:
                                    `Add ${selectedDay} in doctor schedule with APPOINTMENT session.`,
                            }
                            : undefined,
                });
            }

            const appointmentSessions =
                (
                    daySchedule.sessions ||
                    []
                ).filter(
                    (
                        session:
                            any,
                    ) =>
                        session.slotType ===
                        "APPOINTMENT" ||
                        !session.slotType,
                );

            if (
                appointmentSessions.length ===
                0
            ) {
                return res.json({
                    success:
                        true,

                    message:
                        "No appointment sessions found for selected date",

                    data: {
                        date,

                        doctorId,

                        appointmentEnabled:
                            schedule.appointmentEnabled,

                        confirmationRequired:
                            schedule.confirmationRequired,

                        slotDurationMinutes:
                            schedule.slotDurationMinutes,

                        slots:
                            [],
                    },

                    debug:
                        debug
                            ? {
                                selectedDay,
                                sessions:
                                    daySchedule.sessions ||
                                    [],
                                reason:
                                    "Sessions exist but slotType is not APPOINTMENT.",
                                fix:
                                    "Change at least one session slotType to APPOINTMENT in doctor schedule.",
                            }
                            : undefined,
                });
            }

            const result:
                any =
                await generateDoctorSlots(
                    String(
                        hospital._id,
                    ),
                    doctorId,
                    date,
                );

            const allSlots:
                any[] =
                result.slots ||
                [];

            const appointmentSlots =
                allSlots.filter(
                    (
                        slot:
                            any,
                    ) =>
                        slot.slotType ===
                        "APPOINTMENT",
                );

            const availableSlots =
                appointmentSlots.filter(
                    (
                        slot:
                            any,
                    ) =>
                        slot.status ===
                        "AVAILABLE",
                );

            return res.json({
                success:
                    true,

                data: {
                    date,

                    doctorId,

                    appointmentEnabled:
                        result.schedule?.appointmentEnabled ??
                        schedule.appointmentEnabled,

                    confirmationRequired:
                        result.schedule?.confirmationRequired ??
                        schedule.confirmationRequired,

                    slotDurationMinutes:
                        result.schedule?.slotDurationMinutes ??
                        schedule.slotDurationMinutes,

                    slots:
                        availableSlots.map(
                            (
                                slot:
                                    any,
                            ) => ({
                                _id:
                                    String(
                                        slot._id,
                                    ),

                                date:
                                    slot.date,

                                startTime:
                                    slot.startTime,

                                endTime:
                                    slot.endTime,

                                slotType:
                                    slot.slotType,

                                status:
                                    slot.status,
                            }),
                        ),
                },

                debug:
                    debug
                        ? {
                            hospitalId:
                                String(
                                    hospital._id,
                                ),

                            doctorId,

                            doctorName:
                                doctor.name,

                            date,

                            selectedDay,

                            scheduleFound:
                                true,

                            appointmentEnabled:
                                schedule.appointmentEnabled,

                            consultationMode:
                                schedule.consultationMode,

                            slotDurationMinutes:
                                schedule.slotDurationMinutes,

                            matchedDay:
                                daySchedule,

                            totalGeneratedSlots:
                                allSlots.length,

                            appointmentSlots:
                                appointmentSlots.length,

                            availableSlots:
                                availableSlots.length,

                            allSlotsPreview:
                                allSlots.slice(
                                    0,
                                    20,
                                ).map(
                                    (
                                        slot:
                                            any,
                                    ) => ({
                                        _id:
                                            String(
                                                slot._id,
                                            ),

                                        startTime:
                                            slot.startTime,

                                        endTime:
                                            slot.endTime,

                                        slotType:
                                            slot.slotType,

                                        status:
                                            slot.status,
                                    }),
                                ),
                        }
                        : undefined,
            });
        } catch (
            error:
                any
        ) {
            console.error(
                "GET PUBLIC SLOTS ERROR:",
                error,
            );

            return res
                .status(
                    error?.message ===
                        "Doctor schedule not configured"
                        ? 404
                        : 500,
                )
                .json({
                    success:
                        false,

                    message:
                        error?.message ||
                        "Failed to load slots",
                });
        }
    };

/* ============================================================
   BOOK PUBLIC APPOINTMENT
   POST /api/public/hospitals/:hospitalId/appointments
============================================================ */

export const bookPublicAppointment =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                getParam(
                    req.params.hospitalId,
                );

            const {
                doctorId,
                departmentId,
                slotId,
                name,
                phone,
                age,
                gender,
                reason,
                notes,
            } =
                req.body;

            const patientName =
                String(
                    name ||
                    "",
                ).trim();

            const normalizedPhone =
                normalizePhone(
                    phone,
                );

            if (
                !isValidObjectId(
                    hospitalId,
                ) ||
                !isValidObjectId(
                    String(
                        doctorId ||
                        "",
                    ),
                ) ||
                !isValidObjectId(
                    String(
                        departmentId ||
                        "",
                    ),
                ) ||
                !isValidObjectId(
                    String(
                        slotId ||
                        "",
                    ),
                )
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Invalid booking details",
                    });
            }

            if (
                patientName.length <
                2
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Patient name is required",
                    });
            }

            if (
                normalizedPhone.length !==
                10
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Valid 10 digit phone number is required",
                    });
            }

            const hospital:
                any =
                await getPublicHospital(
                    hospitalId,
                );

            if (
                !hospital
            ) {
                return res
                    .status(
                        404,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Hospital not found or booking disabled",
                    });
            }

            const [
                doctor,
                department,
                schedule,
            ]:
                any[] =
                await Promise.all([
                    User.findOne({
                        _id:
                            toObjectId(
                                doctorId,
                            ),

                        hospitalId:
                            hospital._id,

                        role:
                            "DOCTOR",

                        isActive: {
                            $ne:
                                false,
                        },
                    }),

                    Department.findOne({
                        _id:
                            toObjectId(
                                departmentId,
                            ),

                        hospitalId:
                            hospital._id,

                        isActive:
                            true,
                    }),

                    DoctorSchedule.findOne({
                        hospitalId:
                            hospital._id,

                        doctorId:
                            toObjectId(
                                doctorId,
                            ),
                    }),
                ]);

            if (
                !doctor ||
                !department
            ) {
                return res
                    .status(
                        404,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Doctor or department not found",
                    });
            }

            if (
                !schedule ||
                !schedule.appointmentEnabled
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Appointments are not enabled for this doctor",
                    });
            }

            const doctorDepartmentId =
                doctor.departmentId
                    ? String(
                        doctor.departmentId,
                    )
                    : "";

            if (
                doctorDepartmentId &&
                doctorDepartmentId !==
                String(
                    department._id,
                )
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Selected doctor does not belong to selected department",
                    });
            }

            let patient:
                any =
                await Patient.findOne({
                    hospitalId:
                        hospital._id,

                    phone:
                        normalizedPhone,
                });

            if (
                !patient
            ) {
                patient =
                    await Patient.create({
                        hospitalId:
                            hospital._id,

                        name:
                            patientName,

                        phone:
                            normalizedPhone,

                        age:
                            age
                                ? Number(
                                    age,
                                )
                                : undefined,

                        gender:
                            gender ||
                            "OTHER",

                        patientCode:
                            generatePatientCode(),

                        registrationDate:
                            new Date(),

                        noShowCount:
                            0,

                        onlineBookingBlocked:
                            false,
                    } as any);
            } else {
                patient.name =
                    patient.name ||
                    patientName;

                if (
                    age &&
                    !patient.age
                ) {
                    patient.age =
                        Number(
                            age,
                        );
                }

                if (
                    gender &&
                    !patient.gender
                ) {
                    patient.gender =
                        gender;
                }

                if (
                    !patient.registrationDate
                ) {
                    patient.registrationDate =
                        new Date();
                }

                await patient.save();
            }

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
                        "Online booking is blocked for this number because of repeated missed appointments. Please contact hospital reception.",
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
                        "This number has missed multiple appointments. Please contact hospital reception to book.",
                });
            }

            const selectedSlot:
                any =
                await DoctorSlot.findOne({
                    _id:
                        toObjectId(
                            slotId,
                        ),

                    hospitalId:
                        hospital._id,

                    doctorId:
                        toObjectId(
                            doctorId,
                        ),

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
                    hospitalId:
                        hospital._id,

                    patientId:
                        patient._id,

                    doctorId:
                        doctor._id,

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
                        "You already have an active appointment with this doctor on this date.",
                });
            }

            const activeFutureAppointments =
                await Appointment.countDocuments({
                    hospitalId:
                        hospital._id,

                    patientId:
                        patient._id,

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
                        `You already have ${MAX_ACTIVE_FUTURE_APPOINTMENTS_PER_PATIENT} active appointments. Please complete or cancel old appointments first.`,
                });
            }

            const confirmationRequired =
                Boolean(
                    schedule.confirmationRequired,
                ) ||
                schedule.consultationMode ===
                "ON_CALL_APPOINTMENT";

            const targetSlotStatus =
                confirmationRequired
                    ? "HELD"
                    : "BOOKED";

            const slot:
                any =
                await DoctorSlot.findOneAndUpdate(
                    {
                        _id:
                            toObjectId(
                                slotId,
                            ),

                        hospitalId:
                            hospital._id,

                        doctorId:
                            toObjectId(
                                doctorId,
                            ),

                        slotType:
                            "APPOINTMENT",

                        status:
                            "AVAILABLE",
                    },
                    {
                        $set: {
                            status:
                                targetSlotStatus,

                            patientId:
                                patient._id,
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
                return res
                    .status(
                        409,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "This slot is no longer available. Please choose another slot.",
                    });
            }

            try {
                const appointmentStatus =
                    confirmationRequired
                        ? "REQUESTED"
                        : "BOOKED";

                const appointmentCode =
                    generateAppointmentCode();

                const appointment:
                    any =
                    await Appointment.create({
                        hospitalId:
                            hospital._id,

                        patientId:
                            patient._id,

                        doctorId:
                            doctor._id,

                        departmentId:
                            department._id,

                        slotId:
                            slot._id,

                        appointmentCode,

                        appointmentDate:
                            slot.date,

                        requestedStartTime:
                            slot.startTime,

                        confirmedStartTime:
                            confirmationRequired
                                ? undefined
                                : slot.startTime,

                        endTime:
                            slot.endTime,

                        status:
                            appointmentStatus,

                        paymentStatus:
                            "UNPAID",

                        paidAmount:
                            0,

                        feeAmount:
                            0,

                        confirmationRequired,

                        reason:
                            reason ||
                            "Public appointment booking",

                        notes:
                            notes ||
                            "",

                        createdByRole:
                            "PATIENT",

                        history: [
                            {
                                status:
                                    appointmentStatus,

                                at:
                                    new Date(),

                                note:
                                    confirmationRequired
                                        ? "Appointment requested by patient"
                                        : "Appointment booked by patient",
                            },
                        ],
                    } as any);

                slot.patientId =
                    patient._id;

                slot.appointmentId =
                    appointment._id;

                await slot.save();

                emitAppointmentUpdate(
                    appointment,
                    "appointment:created",
                );

                return res
                    .status(
                        201,
                    )
                    .json({
                        success:
                            true,

                        message:
                            confirmationRequired
                                ? "Appointment request submitted successfully"
                                : "Appointment booked successfully",

                        data: {
                            appointmentId:
                                appointment._id,

                            appointmentCode:
                                appointment.appointmentCode,

                            status:
                                appointment.status,

                            confirmationRequired:
                                appointment.confirmationRequired,

                            hospital: {
                                _id:
                                    hospital._id,

                                name:
                                    hospital.publicName ||
                                    hospital.name,

                                address:
                                    getHospitalPublicAddress(
                                        hospital,
                                    ),

                                city:
                                    hospital.city ||
                                    hospital.address?.city,

                                district:
                                    hospital.district ||
                                    hospital.address?.district,

                                state:
                                    hospital.state ||
                                    hospital.address?.state,
                            },

                            doctor: {
                                _id:
                                    doctor._id,

                                name:
                                    doctor.name,
                            },

                            department: {
                                _id:
                                    department._id,

                                name:
                                    department.name,
                            },

                            patient: {
                                _id:
                                    patient._id,

                                name:
                                    patient.name,

                                phone:
                                    patient.phone,
                            },

                            date:
                                appointment.appointmentDate,

                            startTime:
                                appointment.requestedStartTime,

                            endTime:
                                appointment.endTime,
                        },
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
            error:
                any
        ) {
            console.error(
                "BOOK PUBLIC APPOINTMENT ERROR:",
                error,
            );

            return res
                .status(
                    500,
                )
                .json({
                    success:
                        false,

                    message:
                        error?.message ||
                        "Failed to book appointment",

                    errors:
                        error?.errors ||
                        undefined,
                });
        }
    };

/* ============================================================
   GET PUBLIC APPOINTMENT BY CODE
   GET /api/public/appointments/:appointmentCode?phone=9123456789
============================================================ */

export const getPublicAppointmentByCode =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const appointmentCode =
                getParam(
                    req.params.appointmentCode,
                ).trim();

            const phone =
                normalizePhone(
                    req.query.phone,
                );

            if (
                !appointmentCode ||
                phone.length !==
                10
            ) {
                return res
                    .status(
                        400,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Appointment code and phone number are required",
                    });
            }

            const appointment:
                any =
                await Appointment.findOne({
                    appointmentCode:
                        appointmentCode.toUpperCase(),
                })
                    .populate(
                        "patientId",
                        "name phone patientCode",
                    )
                    .populate(
                        "doctorId",
                        "name",
                    )
                    .populate(
                        "departmentId",
                        "name",
                    )
                    .populate(
                        "hospitalId",
                        "name publicName address publicAddress city district state",
                    )
                    .populate(
                        "queueId",
                        "tokenLabel status trackingToken",
                    )
                    .lean();

            if (
                !appointment
            ) {
                return res
                    .status(
                        404,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Appointment not found",
                    });
            }

            const patientPhone =
                normalizePhone(
                    appointment.patientId?.phone,
                );

            if (
                patientPhone !==
                phone
            ) {
                return res
                    .status(
                        403,
                    )
                    .json({
                        success:
                            false,

                        message:
                            "Phone number does not match this appointment",
                    });
            }

            return res.json({
                success:
                    true,

                data: {
                    appointmentCode:
                        appointment.appointmentCode,

                    status:
                        appointment.status,

                    date:
                        appointment.appointmentDate,

                    startTime:
                        appointment.requestedStartTime,

                    endTime:
                        appointment.endTime,

                    patient:
                        appointment.patientId,

                    doctor:
                        appointment.doctorId,

                    department:
                        appointment.departmentId,

                    hospital:
                        appointment.hospitalId,

                    queue:
                        appointment.queueId
                            ? {
                                tokenLabel:
                                    appointment.queueId.tokenLabel,

                                status:
                                    appointment.queueId.status,

                                trackingToken:
                                    appointment.queueId.trackingToken,
                            }
                            : null,
                },
            });
        } catch (
            error
        ) {
            console.error(
                "GET PUBLIC APPOINTMENT ERROR:",
                error,
            );

            return res
                .status(
                    500,
                )
                .json({
                    success:
                        false,

                    message:
                        "Failed to load appointment",
                });
        }
    };

const publicAppointmentController = {
    getPublicStates,
    getPublicDistricts,
    getPublicHospitals,
    getPublicHospitalDepartments,
    getPublicHospitalDoctors,
    getPublicDoctorSlots,
    bookPublicAppointment,
    getPublicAppointmentByCode,
};

export default publicAppointmentController;