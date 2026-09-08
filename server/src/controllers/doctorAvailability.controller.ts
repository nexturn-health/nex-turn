import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import {
    DoctorSchedule,
} from "../models/DoctorSchedule.model";

import {
    User,
} from "../models/User.model";

const getSingleParam = (
    value:
        string | string[] | undefined,
) => {
    if (
        Array.isArray(value)
    ) {
        return value[0];
    }

    return value;
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

const TIME_REGEX =
    /^([01]\d|2[0-3]):([0-5]\d)$/;

const isValidTime = (
    time:
        string,
) => {
    return TIME_REGEX.test(
        time,
    );
};

const toMinutes = (
    time:
        string,
) => {
    const [
        hours,
        minutes,
    ] =
        time
            .split(":")
            .map(Number);

    return hours * 60 + minutes;
};

const sanitizeWeeklyAvailability =
    (
        weeklyAvailability:
            any[],
    ) => {
        return WEEK_DAYS.map(
            (
                day,
            ) => {
                const found =
                    weeklyAvailability?.find(
                        (
                            item:
                                any,
                        ) =>
                            item.day === day,
                    );

                const isAvailable =
                    Boolean(
                        found?.isAvailable,
                    );

                const sessions =
                    Array.isArray(
                        found?.sessions,
                    )
                        ? found.sessions
                            .filter(
                                (
                                    session:
                                        any,
                                ) =>
                                    isValidTime(
                                        String(
                                            session.startTime ||
                                            "",
                                        ),
                                    ) &&
                                    isValidTime(
                                        String(
                                            session.endTime ||
                                            "",
                                        ),
                                    ) &&
                                    toMinutes(
                                        session.startTime,
                                    ) <
                                    toMinutes(
                                        session.endTime,
                                    ),
                            )
                            .map(
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
                        : [];

                const breaks =
                    Array.isArray(
                        found?.breaks,
                    )
                        ? found.breaks
                            .filter(
                                (
                                    item:
                                        any,
                                ) =>
                                    isValidTime(
                                        String(
                                            item.startTime ||
                                            "",
                                        ),
                                    ) &&
                                    isValidTime(
                                        String(
                                            item.endTime ||
                                            "",
                                        ),
                                    ) &&
                                    toMinutes(
                                        item.startTime,
                                    ) <
                                    toMinutes(
                                        item.endTime,
                                    ),
                            )
                            .map(
                                (
                                    item:
                                        any,
                                ) => ({
                                    startTime:
                                        item.startTime,

                                    endTime:
                                        item.endTime,

                                    label:
                                        item.label ||
                                        "Lunch break",
                                }),
                            )
                        : [];

                return {
                    day,

                    isAvailable,

                    sessions,

                    breaks,
                };
            },
        );
    };

export const getAvailabilityDoctors =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                req.user?.hospitalId;

            if (
                !hospitalId
            ) {
                return res.status(401).json({
                    success: false,
                    message: "Hospital information not found",
                });
            }

            const doctors =
                await User.find({
                    hospitalId,
                    role: "DOCTOR",
                    isActive: {
                        $ne: false,
                    },
                })
                    .select(
                        "_id name email phone departmentId isOnline shiftStartTime",
                    )
                    .populate(
                        "departmentId",
                        "name",
                    )
                    .sort({
                        name: 1,
                    })
                    .lean();

            return res.json({
                success: true,
                data: doctors,
            });
        } catch (error) {
            console.error(
                "GET AVAILABILITY DOCTORS ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load doctors",
            });
        }
    };

export const getDoctorAvailability =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                req.user?.hospitalId;

            const doctorId =
                getSingleParam(
                    req.params.doctorId,
                );

            if (
                !hospitalId
            ) {
                return res.status(401).json({
                    success: false,
                    message: "Hospital information not found",
                });
            }

            if (
                !doctorId ||
                !mongoose.Types.ObjectId.isValid(
                    doctorId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid doctor ID",
                });
            }

            const doctorObjectId =
                new mongoose.Types.ObjectId(
                    doctorId,
                );

            const doctor =
                await User.findOne({
                    _id: doctorId,
                    hospitalId,
                    role: "DOCTOR",
                    isActive: {
                        $ne: false,
                    },
                })
                    .select(
                        "_id name email departmentId",
                    )
                    .populate(
                        "departmentId",
                        "name",
                    )
                    .lean();

            if (
                !doctor
            ) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor not found",
                });
            }

            let schedule =
                await DoctorSchedule.findOne({
                    hospitalId,
                    doctorId,
                }).lean();

            if (
                !schedule
            ) {
                schedule = {
                    hospitalId,
                    doctorId,
                    appointmentEnabled: true,
                    consultationMode: "HYBRID",
                    slotDurationMinutes: 15,
                    minimumNoticeMinutes: 30,
                    maxAdvanceBookingDays: 7,
                    confirmationRequired: false,
                    hybridPattern: [
                        "APPOINTMENT",
                        "WALK_IN",
                    ],
                    weeklyAvailability:
                        sanitizeWeeklyAvailability(
                            [],
                        ),
                } as any;
            }

            return res.json({
                success: true,
                data: {
                    doctor,
                    schedule,
                },
            });
        } catch (error) {
            console.error(
                "GET DOCTOR AVAILABILITY ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load doctor availability",
            });
        }
    };

export const updateDoctorAvailability =
    async (
        req:
            Request,
        res:
            Response,
    ) => {
        try {
            const hospitalId =
                req.user?.hospitalId;

            const rawDoctorId =
                req.params.doctorId;

            const doctorId =
                Array.isArray(rawDoctorId)
                    ? rawDoctorId[0]
                    : rawDoctorId;

            if (
                !hospitalId
            ) {
                return res.status(401).json({
                    success: false,
                    message: "Hospital information not found",
                });
            }

            if (
                !doctorId ||
                !mongoose.Types.ObjectId.isValid(
                    doctorId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid doctor ID",
                });
            }

            const doctorObjectId =
                new mongoose.Types.ObjectId(
                    doctorId,
                );

            const doctor =
                await User.findOne({
                    _id:
                        doctorObjectId,

                    hospitalId,

                    role:
                        "DOCTOR",

                    isActive: {
                        $ne:
                            false,
                    },
                }).lean();

            if (
                !doctor
            ) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor not found",
                });
            }

            const {
                appointmentEnabled = true,
                consultationMode = "HYBRID",
                slotDurationMinutes = 15,
                minimumNoticeMinutes = 30,

                // Your model uses bookingWindowDays.
                bookingWindowDays = req.body.maxAdvanceBookingDays || 30,

                gracePeriodMinutes = 15,
                maxAppointmentsPerDay = 20,
                maxWalkInsPerDay = 40,
                emergencyBufferPerDay = 2,
                timezone = "Asia/Kolkata",
                confirmationRequired = false,
                hybridPattern = [
                    "APPOINTMENT",
                    "WALK_IN",
                ],
                weeklyAvailability = [],
                dateOverrides = [],
                isActive = true,
            } = req.body;

            const cleanWeeklyAvailability =
                sanitizeWeeklyAvailability(
                    weeklyAvailability,
                );

            const safeConsultationMode =
                [
                    "OPD_ONLY",
                    "APPOINTMENT_ONLY",
                    "HYBRID",
                    "ON_CALL_APPOINTMENT",
                ].includes(
                    consultationMode,
                )
                    ? consultationMode
                    : "HYBRID";

            const safeHybridPattern =
                Array.isArray(
                    hybridPattern,
                ) &&
                    hybridPattern.length
                    ? hybridPattern.filter(
                        (
                            item:
                                string,
                        ) =>
                            item === "APPOINTMENT" ||
                            item === "WALK_IN",
                    )
                    : [
                        "APPOINTMENT",
                        "WALK_IN",
                    ];

            const schedule =
                await DoctorSchedule.findOneAndUpdate(
                    {
                        hospitalId,

                        doctorId:
                            doctorObjectId,
                    },
                    {
                        $set: {
                            hospitalId,

                            doctorId:
                                doctorObjectId,

                            appointmentEnabled:
                                Boolean(
                                    appointmentEnabled,
                                ),

                            consultationMode:
                                safeConsultationMode,

                            slotDurationMinutes:
                                Number(
                                    slotDurationMinutes,
                                ) ||
                                15,

                            minimumNoticeMinutes:
                                Number(
                                    minimumNoticeMinutes,
                                ) ||
                                0,

                            bookingWindowDays:
                                Number(
                                    bookingWindowDays,
                                ) ||
                                30,

                            gracePeriodMinutes:
                                Number(
                                    gracePeriodMinutes,
                                ) ||
                                15,

                            maxAppointmentsPerDay:
                                Number(
                                    maxAppointmentsPerDay,
                                ) ||
                                20,

                            maxWalkInsPerDay:
                                Number(
                                    maxWalkInsPerDay,
                                ) ||
                                40,

                            emergencyBufferPerDay:
                                Number(
                                    emergencyBufferPerDay,
                                ) ||
                                2,

                            timezone:
                                timezone ||
                                "Asia/Kolkata",

                            confirmationRequired:
                                Boolean(
                                    confirmationRequired,
                                ),

                            hybridPattern:
                                safeHybridPattern.length
                                    ? safeHybridPattern
                                    : [
                                        "APPOINTMENT",
                                        "WALK_IN",
                                    ],

                            weeklyAvailability:
                                cleanWeeklyAvailability,

                            dateOverrides:
                                Array.isArray(
                                    dateOverrides,
                                )
                                    ? dateOverrides
                                    : [],

                            isActive:
                                Boolean(
                                    isActive,
                                ),
                        },
                    },
                    {
                        new: true,
                        upsert: true,
                        runValidators: true,
                    },
                );

            return res.json({
                success: true,
                message: "Doctor availability updated successfully",
                data: schedule,
            });
        } catch (error) {
            console.error(
                "UPDATE DOCTOR AVAILABILITY ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message: "Failed to update doctor availability",
            });
        }
    };

const doctorAvailabilityController = {
    getAvailabilityDoctors,
    getDoctorAvailability,
    updateDoctorAvailability,
};

export default doctorAvailabilityController;