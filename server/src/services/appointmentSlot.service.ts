import {
    DoctorSchedule,
} from "../models/DoctorSchedule.model";

import {
    DoctorSlot,
    type DoctorSlotType,
} from "../models/DoctorSlot.model";

/* ============================================================
   TIME
============================================================ */

export const timeToMinutes =
    (
        value:
            string,
    ): number => {

        const [
            hour,
            minute,
        ] =
            value
                .split(":")
                .map(Number);

        return (
            hour *
                60 +
            minute
        );
    };

export const minutesToTime =
    (
        minutes:
            number,
    ): string => {

        const hours =
            Math.floor(
                minutes /
                    60,
            );

        const mins =
            minutes %
            60;

        return `${String(
            hours,
        ).padStart(
            2,
            "0",
        )}:${String(
            mins,
        ).padStart(
            2,
            "0",
        )}`;
    };

/* ============================================================
   DAY
============================================================ */

const DAY_NAMES = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
] as const;

export const getDayName =
    (
        date:
            string,
    ) => {

        const parsed =
            new Date(
                `${date}T12:00:00`,
            );

        return DAY_NAMES[
            parsed.getDay()
        ];
    };

/* ============================================================
   SESSIONS FOR DATE
============================================================ */

export const getSessionsForDate =
    (
        schedule:
            any,
        date:
            string,
    ) => {

        const override =
            schedule
                .dateOverrides
                ?.find(
                    (
                        item:
                            any,
                    ) =>
                        item.date ===
                        date,
                );

        if (override) {

            if (
                !override
                    .isAvailable
            ) {
                return {
                    sessions:
                        [],
                    blockedPeriods:
                        [],
                    unavailableReason:
                        override.reason ||
                        "Doctor unavailable",
                };
            }

            return {
                sessions:
                    override
                        .sessions ??
                    [],

                blockedPeriods:
                    override
                        .blockedPeriods ??
                    [],
            };
        }

        const day =
            getDayName(
                date,
            );

        const weekly =
            schedule
                .weeklyAvailability
                ?.find(
                    (
                        item:
                            any,
                    ) =>
                        item.day ===
                        day,
                );

        if (
            !weekly ||
            !weekly.isAvailable
        ) {
            return {
                sessions:
                    [],
                blockedPeriods:
                    [],
            };
        }

        return {
            sessions:
                weekly.sessions ||
                [],

            blockedPeriods:
                [],
        };
    };

/* ============================================================
   OVERLAP
============================================================ */

const isBlocked =
    (
        start:
            number,
        end:
            number,
        periods:
            any[],
    ) => {

        return periods.find(
            (
                period,
            ) => {

                const blockStart =
                    timeToMinutes(
                        period.startTime,
                    );

                const blockEnd =
                    timeToMinutes(
                        period.endTime,
                    );

                return (
                    start <
                        blockEnd &&
                    end >
                        blockStart
                );
            },
        );
    };

/* ============================================================
   GENERATE DAILY SLOTS
============================================================ */

export const generateDoctorSlots =
    async (
        hospitalId:
            string,
        doctorId:
            string,
        date:
            string,
    ) => {

        const schedule =
            await DoctorSchedule.findOne(
                {
                    hospitalId,
                    doctorId,
                    isActive:
                        true,
                },
            );

        if (!schedule) {

            throw new Error(
                "Doctor schedule not configured",
            );
        }

        const {
            sessions,
            blockedPeriods,
        } =
            getSessionsForDate(
                schedule,
                date,
            );

        if (
            sessions.length ===
            0
        ) {

            return {
                schedule,
                slots: [],
            };
        }

        const duration =
            schedule
                .slotDurationMinutes;

        const candidates: Array<{
            startTime: string;
            endTime: string;
            slotType:
                DoctorSlotType;
            status:
                "AVAILABLE" |
                "BLOCKED";
            blockReason?: string;
        }> = [];

        let patternIndex =
            0;

        let appointmentCount =
            0;

        let walkInCount =
            0;

        for (
            const session
            of sessions
        ) {

            let current =
                timeToMinutes(
                    session.startTime,
                );

            const end =
                timeToMinutes(
                    session.endTime,
                );

            while (
                current +
                    duration <=
                end
            ) {

                const slotEnd =
                    current +
                    duration;

                let slotType:
                    DoctorSlotType;

                if (
                    schedule
                        .consultationMode ===
                    "OPD_ONLY"
                ) {

                    slotType =
                        "WALK_IN";

                } else if (
                    schedule
                        .consultationMode ===
                        "APPOINTMENT_ONLY" ||
                    schedule
                        .consultationMode ===
                        "ON_CALL_APPOINTMENT"
                ) {

                    slotType =
                        "APPOINTMENT";

                } else {

                    const pattern =
                        schedule
                            .hybridPattern
                            ?.length
                            ? schedule
                                .hybridPattern
                            : [
                                "APPOINTMENT",
                                "WALK_IN",
                            ];

                    slotType =
                        pattern[
                            patternIndex %
                            pattern.length
                        ] as DoctorSlotType;

                    patternIndex++;

                    if (
                        slotType ===
                            "APPOINTMENT" &&
                        appointmentCount >=
                            schedule
                                .maxAppointmentsPerDay
                    ) {
                        slotType =
                            "WALK_IN";
                    }

                    if (
                        slotType ===
                            "WALK_IN" &&
                        walkInCount >=
                            schedule
                                .maxWalkInsPerDay
                    ) {
                        slotType =
                            "APPOINTMENT";
                    }
                }

                if (
                    slotType ===
                    "APPOINTMENT"
                ) {
                    appointmentCount++;
                }

                if (
                    slotType ===
                    "WALK_IN"
                ) {
                    walkInCount++;
                }

                const blocked =
                    isBlocked(
                        current,
                        slotEnd,
                        blockedPeriods,
                    );

                candidates.push({
                    startTime:
                        minutesToTime(
                            current,
                        ),

                    endTime:
                        minutesToTime(
                            slotEnd,
                        ),

                    slotType,

                    status:
                        blocked
                            ? "BLOCKED"
                            : "AVAILABLE",

                    blockReason:
                        blocked
                            ?.reason,
                });

                current =
                    slotEnd;
            }
        }

        /* ====================================================
           RESERVE BUFFER SLOTS
        ==================================================== */

        let buffersRemaining =
            schedule
                .emergencyBufferPerDay;

        for (
            let index =
                candidates.length -
                1;
            index >= 0 &&
            buffersRemaining >
                0;
            index--
        ) {

            if (
                candidates[index]
                    .status ===
                "AVAILABLE"
            ) {

                candidates[index]
                    .slotType =
                    "BUFFER";

                buffersRemaining--;
            }
        }

        /* ====================================================
           UPSERT SLOTS
        ==================================================== */

        for (
            const candidate
            of candidates
        ) {

            await DoctorSlot.updateOne(
                {
                    hospitalId,
                    doctorId,
                    date,
                    startTime:
                        candidate
                            .startTime,
                },
                {
                    $setOnInsert: {
                        hospitalId,
                        doctorId,
                        date,

                        startTime:
                            candidate
                                .startTime,

                        endTime:
                            candidate
                                .endTime,

                        slotType:
                            candidate
                                .slotType,

                        status:
                            candidate
                                .status,

                        blockReason:
                            candidate
                                .blockReason,

                        source:
                            "AUTO",
                    },
                },
                {
                    upsert: true,
                },
            );
        }

        const slots =
            await DoctorSlot.find({
                hospitalId,
                doctorId,
                date,
            })
                .sort({
                    startTime: 1,
                })
                .lean();

        return {
            schedule,
            slots,
        };
    };