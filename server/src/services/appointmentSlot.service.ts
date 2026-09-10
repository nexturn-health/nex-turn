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
            await DoctorSchedule.findOne({
                hospitalId,
                doctorId,
                isActive:
                    true,
            });

        if (
            !schedule
        ) {
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
                slots:
                    [],
            };
        }

        const duration =
            Number(
                schedule.slotDurationMinutes ||
                15,
            );

        const maxAppointmentsPerDay =
            Number(
                schedule.maxAppointmentsPerDay ||
                999999,
            );

        const maxWalkInsPerDay =
            Number(
                schedule.maxWalkInsPerDay ||
                999999,
            );

        const candidates: Array<{
            startTime: string;
            endTime: string;
            slotType:
                DoctorSlotType;
            status:
                | "AVAILABLE"
                | "BLOCKED";
            blockReason?: string;
        }> = [];

        let patternIndex =
            0;

        let appointmentCount =
            0;

        let walkInCount =
            0;

const getSlotType =
    (): DoctorSlotType => {
        /*
         * FINAL SLOT RULE:
         *
         * APPOINTMENT_ONLY    => every slot appointment
         * ON_CALL_APPOINTMENT => every slot appointment
         * OPD_ONLY            => every slot walk-in
         * HYBRID              => use APPOINTMENT + WALK_IN pattern
         */

        if (
            schedule.consultationMode ===
            "OPD_ONLY"
        ) {
            return "WALK_IN";
        }

        if (
            schedule.consultationMode ===
                "APPOINTMENT_ONLY" ||
            schedule.consultationMode ===
                "ON_CALL_APPOINTMENT"
        ) {
            return "APPOINTMENT";
        }

        /*
         * HYBRID mode:
         * Do not check session.slotType here.
         * HYBRID must alternate by pattern.
         */

        const pattern:
            DoctorSlotType[] =
            Array.isArray(
                schedule.hybridPattern,
            ) &&
            schedule.hybridPattern.length
                ? schedule.hybridPattern.filter(
                    (
                        item:
                            string,
                    ): item is DoctorSlotType =>
                        item === "APPOINTMENT" ||
                        item === "WALK_IN",
                )
                : [
                    "APPOINTMENT",
                    "WALK_IN",
                ];

        const safePattern =
            pattern.length
                ? pattern
                : [
                    "APPOINTMENT",
                    "WALK_IN",
                ] as DoctorSlotType[];

        const selectedType =
            safePattern[
                patternIndex %
                safePattern.length
            ];

        patternIndex++;

        return selectedType;
    };

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

                const originalSlotType =
                    getSlotType();

                let slotType =
                    originalSlotType;

                let status:
                    | "AVAILABLE"
                    | "BLOCKED" =
                    "AVAILABLE";

                let blockReason:
                    string | undefined =
                    undefined;

                const blocked =
                    isBlocked(
                        current,
                        slotEnd,
                        blockedPeriods,
                    );

                if (
                    blocked
                ) {
                    status =
                        "BLOCKED";

                    blockReason =
                        blocked.reason ||
                        "Doctor unavailable";
                }

                /*
                 * Do NOT convert appointment session into walk-in.
                 * If daily appointment limit is reached, block extra appointment slots.
                 */

                if (
                    slotType ===
                        "APPOINTMENT" &&
                    appointmentCount >=
                        maxAppointmentsPerDay
                ) {
                    status =
                        "BLOCKED";

                    blockReason =
                        "Daily appointment limit reached";
                }

                if (
                    slotType ===
                        "WALK_IN" &&
                    walkInCount >=
                        maxWalkInsPerDay
                ) {
                    status =
                        "BLOCKED";

                    blockReason =
                        "Daily walk-in limit reached";
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

                    status,

                    blockReason,
                });

                current =
                    slotEnd;
            }
        }

        /* ====================================================
           RESERVE EMERGENCY BUFFER

           Important:
           Do not convert appointment-only slots into buffer.
           Buffer should not hide appointment-only schedule.
        ==================================================== */

        const canReserveBuffer =
            schedule.consultationMode !==
                "APPOINTMENT_ONLY" &&
            schedule.consultationMode !==
                "ON_CALL_APPOINTMENT";

        let buffersRemaining =
            canReserveBuffer
                ? Number(
                    schedule.emergencyBufferPerDay ||
                    0,
                )
                : 0;

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
                candidates[index].status ===
                    "AVAILABLE" &&
                candidates[index].slotType !==
                    "APPOINTMENT"
            ) {
                candidates[index].slotType =
                    "BUFFER" as DoctorSlotType;

                buffersRemaining--;
            }
        }

        /* ====================================================
           CLEAN OLD AUTO / OLD AVAILABLE SLOTS

           This removes old wrong slots like:
           10:00 WALK_IN
           10:15 APPOINTMENT
           10:30 WALK_IN

           It does NOT remove booked or held appointments.
        ==================================================== */

        await DoctorSlot.deleteMany({
            hospitalId,
            doctorId,
            date,
            status: {
                $in: [
                    "AVAILABLE",
                    "BLOCKED",
                ],
            },
            $or: [
                {
                    source:
                        "AUTO",
                },
                {
                    source: {
                        $exists:
                            false,
                    },
                },
                {
                    source:
                        null,
                },
            ],
        });

        /* ====================================================
           UPSERT SLOTS

           Existing BOOKED / HELD slots are protected.
           Available slots are refreshed correctly.
        ==================================================== */

        for (
            const candidate
            of candidates
        ) {
            const existingSlot =
                await DoctorSlot.findOne({
                    hospitalId,
                    doctorId,
                    date,
                    startTime:
                        candidate.startTime,
                });

            if (
                existingSlot &&
                [
                    "BOOKED",
                    "HELD",
                ].includes(
                    existingSlot.status,
                )
            ) {
                continue;
            }

            if (
                existingSlot
            ) {
                existingSlot.endTime =
                    candidate.endTime;

                existingSlot.slotType =
                    candidate.slotType;

                existingSlot.status =
                    candidate.status;

                existingSlot.blockReason =
                    candidate.blockReason;

                existingSlot.source =
                    "AUTO";

                await existingSlot.save();

                continue;
            }

            await DoctorSlot.create({
                hospitalId,
                doctorId,
                date,

                startTime:
                    candidate.startTime,

                endTime:
                    candidate.endTime,

                slotType:
                    candidate.slotType,

                status:
                    candidate.status,

                blockReason:
                    candidate.blockReason,

                source:
                    "AUTO",
            });
        }

        const slots =
            await DoctorSlot.find({
                hospitalId,
                doctorId,
                date,
            })
                .sort({
                    startTime:
                        1,
                })
                .lean();

        return {
            schedule,
            slots,
        };
    };