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

           IDEMPOTENT SLOT UPSERT

           The public slots endpoint can be called repeatedly and several
           patients can call it at the same time. Never use findOne followed
           by create here; both requests can observe no document and then
           both attempt to insert the same unique slot.

           Also remove duplicate candidates caused by overlapping schedule
           sessions before touching MongoDB.
        ==================================================== */

        const uniqueCandidates =
            Array.from(
                new Map(
                    candidates.map(
                        (
                            candidate,
                        ) => [
                            `${date}|${candidate.startTime}`,
                            candidate,
                        ],
                    ),
                ).values(),
            );

        const insertOperations =
            uniqueCandidates.map(
                (
                    candidate,
                ) => ({
                    updateOne: {
                        filter: {
                            hospitalId,
                            doctorId,
                            date,
                            startTime:
                                candidate.startTime,
                        },

                        update: {
                            $setOnInsert: {
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
                                appointmentId:
                                    null,
                                patientId:
                                    null,
                                holdToken:
                                    null,
                                holdExpiresAt:
                                    null,
                            },
                        },

                        upsert:
                            true,
                    },
                }),
            );

        try {
            if (
                insertOperations.length
            ) {
                await DoctorSlot.bulkWrite(
                    insertOperations as any,
                    {
                        ordered:
                            false,
                    },
                );
            }
        } catch (
            error:
                any
        ) {
            /*
             * A concurrent request can win the unique-index race while both
             * requests are creating the same slots. Those duplicate errors
             * are safe because the winning request already created the slot.
             */
            const writeErrors =
                error?.writeErrors ||
                [];

            const onlyDuplicateErrors =
                error?.code ===
                    11000 ||
                (
                    writeErrors.length >
                    0 &&
                    writeErrors.every(
                        (
                            item:
                                any,
                        ) =>
                            item?.code ===
                            11000,
                    )
                );

            if (
                !onlyDuplicateErrors
            ) {
                throw error;
            }
        }

        /*
         * Refresh only AVAILABLE/BLOCKED records. The status condition is
         * important: if a patient holds a slot while this update runs, the
         * update does not reset HELD back to AVAILABLE.
         */
        const refreshOperations =
            uniqueCandidates.map(
                (
                    candidate,
                ) => ({
                    updateOne: {
                        filter: {
                            hospitalId,
                            doctorId,
                            date,
                            startTime:
                                candidate.startTime,
                            status: {
                                $in: [
                                    "AVAILABLE",
                                    "BLOCKED",
                                ],
                            },
                        },

                        update: {
                            $set: {
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
                            },
                        },
                    },
                }),
            );

        if (
            refreshOperations.length
        ) {
            await DoctorSlot.bulkWrite(
                refreshOperations as any,
                {
                    ordered:
                        false,
                },
            );
        }

        /*
         * Remove only stale AVAILABLE/BLOCKED automatically generated slots.
         * BOOKED and HELD slots are never deleted. Cleanup happens after the
         * expected slots exist, so concurrent generation cannot create the
         * delete-then-create race that caused the duplicate-key error.
         */
        await DoctorSlot.deleteMany({
            hospitalId,
            doctorId,
            date,
            startTime: {
                $nin:
                    uniqueCandidates.map(
                        (
                            candidate,
                        ) => candidate.startTime,
                    ),
            },
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
