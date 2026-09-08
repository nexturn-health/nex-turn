import mongoose from "mongoose";

import { Queue, QueueStatus } from "../models/Queue.model";
import { Appointment } from "../models/Appointment.model";
import { DoctorSchedule } from "../models/DoctorSchedule.model";
import { User } from "../models/User.model";

const DEFAULT_CONSULTATION_MINUTES = 15;
const MAX_HISTORY_FOR_AVERAGE = 20;

const ACTIVE_QUEUE_STATUSES: QueueStatus[] = [
    "WAITING",
    "CALLED",
    "SERVING",
];

const ACTIVE_APPOINTMENT_STATUSES = [
    "REQUESTED",
    "BOOKED",
    "CONFIRMED",
    "CHECKED_IN",
] as const;

const dayNames = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
] as const;

type DoctorAvailabilityStatus =
    | "NO_SCHEDULE"
    | "NOT_STARTED"
    | "NOT_ARRIVED"
    | "AVAILABLE"
    | "ON_BREAK"
    | "FINISHED";

type TimelineItemKind =
    | "QUEUE"
    | "APPOINTMENT_SLOT";

type TimelineSource =
    | "WALK_IN"
    | "APPOINTMENT"
    | "EMERGENCY";

type TimelineStatus =
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "APPOINTMENT_BOOKED";

interface QueueEstimateArgs {
    hospitalId: string | mongoose.Types.ObjectId;
    doctorId: string | mongoose.Types.ObjectId;
    departmentId: string | mongoose.Types.ObjectId;
    queueDate: string;
}

type TodaySessionSlotType =
    | "APPOINTMENT"
    | "WALK_IN";

interface TodaySession {
    startTime: string;
    endTime: string;
    slotType: TodaySessionSlotType;
}
interface TimelineItem {
    kind: TimelineItemKind;

    queueId?: mongoose.Types.ObjectId;

    appointmentId?: mongoose.Types.ObjectId;

    label: string;

    source: TimelineSource;

    status: TimelineStatus | string;

    tokenNumber?: number;

    scheduledStartTime?: string | null;

    scheduledDateTime?: Date | null;

    estimatedStartTime?: Date;

    estimatedWaitMinutes?: number;

    durationMinutes?: number;

    createdAt?: Date;
}

const toObjectId = (
    value:
        | string
        | mongoose.Types.ObjectId,
) => {
    return new mongoose.Types.ObjectId(
        String(
            value,
        ),
    );
};

export const getLocalQueueDate = () => {
    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1,
        ).padStart(
            2,
            "0",
        );

    const day =
        String(
            now.getDate(),
        ).padStart(
            2,
            "0",
        );

    return `${year}-${month}-${day}`;
};

const getDayNameFromDate = (
    queueDate:
        string,
) => {
    const date =
        new Date(
            `${queueDate}T00:00:00`,
        );

    return dayNames[
        date.getDay()
    ];
};

const buildDateTime = (
    queueDate:
        string,
    time?:
        string | null,
) => {
    const safeTime =
        time &&
            /^([01]\d|2[0-3]):([0-5]\d)$/.test(
                time,
            )
            ? time
            : "00:00";

    return new Date(
        `${queueDate}T${safeTime}:00`,
    );
};

const minutesBetween = (
    start:
        Date,
    end:
        Date,
) => {
    return Math.ceil(
        (
            end.getTime() -
            start.getTime()
        ) /
        (
            60 *
            1000
        ),
    );
};

const formatTime = (
    date?:
        Date | null,
) => {
    if (!date) {
        return null;
    }

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                true,
        },
    );
};

const getValidDurations = (
    queues:
        any[],
) => {
    return queues
        .map(
            (
                queue:
                    any,
            ) => {
                const stored =
                    Number(
                        queue.serviceDurationMinutes,
                    );

                if (
                    Number.isFinite(
                        stored,
                    ) &&
                    stored >=
                    1 &&
                    stored <=
                    120
                ) {
                    return stored;
                }

                if (
                    queue.servingAt &&
                    queue.completedAt
                ) {
                    const minutes =
                        minutesBetween(
                            new Date(
                                queue.servingAt,
                            ),
                            new Date(
                                queue.completedAt,
                            ),
                        );

                    if (
                        minutes >=
                        1 &&
                        minutes <=
                        120
                    ) {
                        return minutes;
                    }
                }

                return 0;
            },
        )
        .filter(
            (
                minutes:
                    number,
            ) =>
                minutes >
                0,
        );
};

export const getAverageConsultationMinutes =
    async (
        hospitalId:
            string | mongoose.Types.ObjectId,
        doctorId:
            string | mongoose.Types.ObjectId,
        departmentId:
            string | mongoose.Types.ObjectId,
    ) => {

        const doctorCompletedQueues =
            await Queue.find({
                hospitalId:
                    toObjectId(
                        hospitalId,
                    ),

                doctorId:
                    toObjectId(
                        doctorId,
                    ),

                status:
                    "COMPLETED",

                $or: [
                    {
                        serviceDurationMinutes: {
                            $gt:
                                0,
                        },
                    },
                    {
                        servingAt: {
                            $ne:
                                null,
                        },

                        completedAt: {
                            $ne:
                                null,
                        },
                    },
                ],
            })
                .sort({
                    completedAt:
                        -1,
                })
                .limit(
                    MAX_HISTORY_FOR_AVERAGE,
                )
                .select(
                    "serviceDurationMinutes servingAt completedAt",
                )
                .lean();

        const doctorDurations =
            getValidDurations(
                doctorCompletedQueues,
            );

        if (
            doctorDurations.length
        ) {
            return Math.max(
                1,
                Math.round(
                    doctorDurations.reduce(
                        (
                            sum,
                            minutes,
                        ) =>
                            sum +
                            minutes,
                        0,
                    ) /
                    doctorDurations.length,
                ),
            );
        }

        const departmentCompletedQueues =
            await Queue.find({
                hospitalId:
                    toObjectId(
                        hospitalId,
                    ),

                departmentId:
                    toObjectId(
                        departmentId,
                    ),

                status:
                    "COMPLETED",

                $or: [
                    {
                        serviceDurationMinutes: {
                            $gt:
                                0,
                        },
                    },
                    {
                        servingAt: {
                            $ne:
                                null,
                        },

                        completedAt: {
                            $ne:
                                null,
                        },
                    },
                ],
            })
                .sort({
                    completedAt:
                        -1,
                })
                .limit(
                    MAX_HISTORY_FOR_AVERAGE,
                )
                .select(
                    "serviceDurationMinutes servingAt completedAt",
                )
                .lean();

        const departmentDurations =
            getValidDurations(
                departmentCompletedQueues,
            );

        if (
            departmentDurations.length
        ) {
            return Math.max(
                1,
                Math.round(
                    departmentDurations.reduce(
                        (
                            sum,
                            minutes,
                        ) =>
                            sum +
                            minutes,
                        0,
                    ) /
                    departmentDurations.length,
                ),
            );
        }

        return DEFAULT_CONSULTATION_MINUTES;
    };

const getTodaySessionsFromSchedule = (
    schedule:
        any,
    queueDate:
        string,
): TodaySession[] => {

    const selectedDay =
        getDayNameFromDate(
            queueDate,
        );

    const daySchedule =
        schedule?.weeklyAvailability?.find(
            (
                item:
                    any,
            ) =>
                item.day ===
                selectedDay &&
                item.isAvailable !==
                false,
        );

    if (
        !daySchedule
    ) {
        return [];
    }

    return (
        daySchedule.sessions ||
        []
    )
        .filter(
            (
                session:
                    any,
            ) =>
                session.startTime &&
                session.endTime,
        )
        .map(
            (
                session:
                    any,
            ): TodaySession => ({
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
        .sort(
            (
                first:
                    TodaySession,
                second:
                    TodaySession,
            ) =>
                first.startTime.localeCompare(
                    second.startTime,
                ),
        )
        .filter(
            (
                session:
                    any,
            ) =>
                session.startTime &&
                session.endTime,
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
                    session.slotType ||
                    "APPOINTMENT",
            }),
        )
        .sort(
            (
                first: TodaySession,
                second: TodaySession,
            ) =>
                first.startTime.localeCompare(
                    second.startTime,
                ),
        );
};

const moveCursorInsideSession = (
    cursor:
        Date,
    sessions:
        TodaySession[],
    queueDate:
        string,
) => {

    if (
        !sessions.length
    ) {
        return cursor;
    }

    for (
        const session of sessions
    ) {
        const start =
            buildDateTime(
                queueDate,
                session.startTime,
            );

        const end =
            buildDateTime(
                queueDate,
                session.endTime,
            );

        if (
            cursor.getTime() <
            start.getTime()
        ) {
            return start;
        }

        if (
            cursor.getTime() >=
            start.getTime() &&
            cursor.getTime() <=
            end.getTime()
        ) {
            return cursor;
        }
    }

    return cursor;
};

export const getDoctorTodayAvailability =
    async (
        hospitalId:
            string | mongoose.Types.ObjectId,
        doctorId:
            string | mongoose.Types.ObjectId,
        queueDate:
            string,
    ) => {

        const [
            doctor,
            schedule,
        ] =
            await Promise.all([
                User.findById(
                    toObjectId(
                        doctorId,
                    ),
                )
                    .select(
                        "_id name isOnline shiftStartTime",
                    )
                    .lean(),

                DoctorSchedule.findOne({
                    hospitalId:
                        toObjectId(
                            hospitalId,
                        ),

                    doctorId:
                        toObjectId(
                            doctorId,
                        ),
                }).lean(),
            ]);

        const todaySessions =
            getTodaySessionsFromSchedule(
                schedule,
                queueDate,
            );

        const now =
            new Date();

        let status:
            DoctorAvailabilityStatus =
            "NO_SCHEDULE";

        if (
            todaySessions.length
        ) {
            const firstStart =
                buildDateTime(
                    queueDate,
                    todaySessions[0].startTime,
                );

            const lastEnd =
                buildDateTime(
                    queueDate,
                    todaySessions[
                        todaySessions.length -
                        1
                    ].endTime,
                );

            const activeSession =
                todaySessions.find(
                    (
                        session,
                    ) => {
                        const start =
                            buildDateTime(
                                queueDate,
                                session.startTime,
                            );

                        const end =
                            buildDateTime(
                                queueDate,
                                session.endTime,
                            );

                        return (
                            now.getTime() >=
                            start.getTime() &&
                            now.getTime() <=
                            end.getTime()
                        );
                    },
                );

            const nextSession =
                todaySessions.find(
                    (
                        session,
                    ) =>
                        now.getTime() <
                        buildDateTime(
                            queueDate,
                            session.startTime,
                        ).getTime(),
                );

            if (
                now.getTime() <
                firstStart.getTime()
            ) {
                status =
                    "NOT_STARTED";
            } else if (
                now.getTime() >
                lastEnd.getTime()
            ) {
                status =
                    "FINISHED";
            } else if (
                activeSession
            ) {
                status =
                    doctor?.isOnline
                        ? "AVAILABLE"
                        : "NOT_ARRIVED";
            } else if (
                nextSession
            ) {
                status =
                    "ON_BREAK";
            }
        }

        return {
            doctor:
                doctor
                    ? {
                        _id:
                            doctor._id,

                        name:
                            doctor.name,

                        isOnline:
                            Boolean(
                                doctor.isOnline,
                            ),
                    }
                    : null,

            schedule,

            todaySessions,

            selectedDay:
                getDayNameFromDate(
                    queueDate,
                ),

            status,

            statusText:
                status ===
                    "NO_SCHEDULE"
                    ? "Doctor schedule is not configured today"
                    : status ===
                        "NOT_STARTED"
                        ? `Doctor will start at ${todaySessions[0]?.startTime}`
                        : status ===
                            "NOT_ARRIVED"
                            ? "Doctor shift time started, but doctor is not online yet"
                            : status ===
                                "AVAILABLE"
                                ? "Doctor is available"
                                : status ===
                                    "ON_BREAK"
                                    ? "Doctor is between sessions"
                                    : "Doctor OPD is finished today",
        };
    };

const getInitialProcessingCursor = (
    sessions:
        TodaySession[],
    queueDate:
        string,
) => {
    const now =
        new Date();

    if (
        !sessions.length
    ) {
        return now;
    }

    const firstStart =
        buildDateTime(
            queueDate,
            sessions[0].startTime,
        );

    if (
        now.getTime() <
        firstStart.getTime()
    ) {
        return firstStart;
    }

    return moveCursorInsideSession(
        now,
        sessions,
        queueDate,
    );
};

const getQueueItemDuration = (
    item:
        TimelineItem,
    averageConsultationMinutes:
        number,
) => {

    if (
        item.status ===
        "SERVING" &&
        item.createdAt
    ) {
        return averageConsultationMinutes;
    }

    return averageConsultationMinutes;
};

const sortWaitingQueues = (
    first:
        TimelineItem,
    second:
        TimelineItem,
) => {

    if (
        first.source ===
        "EMERGENCY" &&
        second.source !==
        "EMERGENCY"
    ) {
        return -1;
    }

    if (
        second.source ===
        "EMERGENCY" &&
        first.source !==
        "EMERGENCY"
    ) {
        return 1;
    }

    if (
        first.source ===
        "APPOINTMENT" &&
        second.source ===
        "APPOINTMENT"
    ) {
        const firstTime =
            first.scheduledDateTime?.getTime() ||
            0;

        const secondTime =
            second.scheduledDateTime?.getTime() ||
            0;

        return (
            firstTime -
            secondTime
        );
    }

    return (
        (
            first.tokenNumber ||
            0
        ) -
        (
            second.tokenNumber ||
            0
        )
    );
};

export const buildDoctorQueueTimeline =
    async (
        args:
            QueueEstimateArgs,
    ) => {

        const hospitalId =
            toObjectId(
                args.hospitalId,
            );

        const doctorId =
            toObjectId(
                args.doctorId,
            );

        const departmentId =
            toObjectId(
                args.departmentId,
            );

        const queueDate =
            args.queueDate;

        const averageConsultationMinutes =
            await getAverageConsultationMinutes(
                hospitalId,
                doctorId,
                departmentId,
            );

        const availability =
            await getDoctorTodayAvailability(
                hospitalId,
                doctorId,
                queueDate,
            );
        const liveQueues:
            any[] =
            await Queue.find({
                hospitalId,

                departmentId,

                queueDate,

                status: {
                    $in:
                        ACTIVE_QUEUE_STATUSES,
                },

                $or: [
                    {
                        doctorId,
                    },
                    {
                        doctorId: {
                            $exists:
                                false,
                        },
                    },
                    {
                        doctorId:
                            null,
                    },
                ],
            } as any).select(
                "_id tokenLabel tokenNumber priority status source appointmentId scheduledStartTime createdAt servingAt",
            )
                .lean();

        const startOfDay =
            new Date(
                `${queueDate}T00:00:00`,
            );

        const endOfDay =
            new Date(
                `${queueDate}T23:59:59.999`,
            );

        const appointments:
            any[] =
            await (Appointment as any).find({
                hospitalId,

                doctorId,

                departmentId,

                status: {
                    $in:
                        ACTIVE_APPOINTMENT_STATUSES,
                },

                $or: [
                    {
                        appointmentDate:
                            queueDate,
                    },
                    {
                        appointmentDate: {
                            $gte:
                                startOfDay,

                            $lte:
                                endOfDay,
                        },
                    },
                ],
            })
                .select(
                    "_id appointmentCode appointmentDate requestedStartTime confirmedStartTime endTime status",
                )
                .lean();

        const checkedInAppointmentIds =
            new Set(
                liveQueues
                    .filter(
                        (
                            queue:
                                any,
                        ) =>
                            queue.appointmentId,
                    )
                    .map(
                        (
                            queue:
                                any,
                        ) =>
                            String(
                                queue.appointmentId,
                            ),
                    ),
            );

        const queueItems:
            TimelineItem[] =
            liveQueues.map(
                (
                    queue:
                        any,
                ) => {

                    const source:
                        TimelineSource =
                        queue.priority ===
                            "EMERGENCY" ||
                            queue.source ===
                            "EMERGENCY"
                            ? "EMERGENCY"
                            : queue.source ===
                                "APPOINTMENT"
                                ? "APPOINTMENT"
                                : "WALK_IN";

                    return {
                        kind:
                            "QUEUE",

                        queueId:
                            queue._id,

                        appointmentId:
                            queue.appointmentId ||
                            undefined,

                        label:
                            queue.tokenLabel,

                        tokenNumber:
                            queue.tokenNumber,

                        source,

                        status:
                            queue.status,

                        scheduledStartTime:
                            queue.scheduledStartTime ||
                            null,

                        scheduledDateTime:
                            queue.scheduledStartTime
                                ? buildDateTime(
                                    queueDate,
                                    queue.scheduledStartTime,
                                )
                                : null,

                        createdAt:
                            queue.createdAt,
                    };
                },
            );

        const appointmentSlotItems:
            TimelineItem[] =
            appointments
                .filter(
                    (
                        appointment:
                            any,
                    ) =>
                        !checkedInAppointmentIds.has(
                            String(
                                appointment._id,
                            ),
                        ),
                )
                .map(
                    (
                        appointment:
                            any,
                    ): TimelineItem => {

                        const scheduledStartTime =
                            appointment.confirmedStartTime ||
                            appointment.requestedStartTime ||
                            null;

                        return {
                            kind:
                                "APPOINTMENT_SLOT",

                            appointmentId:
                                appointment._id,

                            label:
                                appointment.appointmentCode ||
                                "Appointment",

                            source:
                                "APPOINTMENT",

                            status:
                                "APPOINTMENT_BOOKED",

                            scheduledStartTime,

                            scheduledDateTime:
                                scheduledStartTime
                                    ? buildDateTime(
                                        queueDate,
                                        scheduledStartTime,
                                    )
                                    : null,
                        };
                    },
                )
                .filter(
                    (
                        item:
                            TimelineItem,
                    ) =>
                        Boolean(
                            item.scheduledDateTime,
                        ),
                )
                .sort(
                    (
                        first:
                            TimelineItem,
                        second:
                            TimelineItem,
                    ) =>
                        (
                            first.scheduledDateTime?.getTime() ||
                            0
                        ) -
                        (
                            second.scheduledDateTime?.getTime() ||
                            0
                        ),
                );

        const activeNowItems =
            queueItems
                .filter(
                    (
                        item,
                    ) =>
                        item.status ===
                        "SERVING" ||
                        item.status ===
                        "CALLED",
                )
                .sort(
                    (
                        first,
                        second,
                    ) => {
                        const rank =
                            (
                                status:
                                    string,
                            ) =>
                                status ===
                                    "SERVING"
                                    ? 0
                                    : 1;

                        return (
                            rank(
                                String(
                                    first.status,
                                ),
                            ) -
                            rank(
                                String(
                                    second.status,
                                ),
                            )
                        );
                    },
                );

        const waitingQueueItems =
            queueItems
                .filter(
                    (
                        item,
                    ) =>
                        item.status ===
                        "WAITING",
                )
                .sort(
                    sortWaitingQueues,
                );

        const timeline:
            TimelineItem[] =
            [];

        let cursor =
            getInitialProcessingCursor(
                availability.todaySessions,
                queueDate,
            );

        const pushItem =
            (
                item:
                    TimelineItem,
            ) => {

                cursor =
                    moveCursorInsideSession(
                        cursor,
                        availability.todaySessions,
                        queueDate,
                    );

                const waitMinutes =
                    Math.max(
                        0,
                        minutesBetween(
                            new Date(),
                            cursor,
                        ),
                    );

                const finalItem:
                    TimelineItem = {
                    ...item,

                    estimatedStartTime:
                        cursor,

                    estimatedWaitMinutes:
                        waitMinutes,

                    durationMinutes:
                        getQueueItemDuration(
                            item,
                            averageConsultationMinutes,
                        ),
                };

                timeline.push(
                    finalItem,
                );

                cursor =
                    new Date(
                        cursor.getTime() +
                        (
                            finalItem.durationMinutes ||
                            averageConsultationMinutes
                        ) *
                        60 *
                        1000,
                    );
            };

        for (
            const item of activeNowItems
        ) {
            pushItem(
                item,
            );
        }

        const appointmentSlots =
            [
                ...appointmentSlotItems,
            ];

        while (
            waitingQueueItems.length ||
            appointmentSlots.length
        ) {
            const nextQueue =
                waitingQueueItems[0];

            const nextAppointment =
                appointmentSlots[0];

            if (
                !nextQueue &&
                nextAppointment
            ) {
                appointmentSlots.shift();
                pushItem(
                    nextAppointment,
                );
                continue;
            }

            if (
                nextQueue &&
                !nextAppointment
            ) {
                waitingQueueItems.shift();
                pushItem(
                    nextQueue,
                );
                continue;
            }

            if (
                nextQueue &&
                nextAppointment
            ) {
                const nextAppointmentTime =
                    nextAppointment.scheduledDateTime?.getTime() ||
                    0;

                const cursorTime =
                    cursor.getTime();

                const cursorAfterOnePatient =
                    cursorTime +
                    averageConsultationMinutes *
                    60 *
                    1000;

                if (
                    nextQueue.source !==
                    "EMERGENCY" &&
                    nextAppointmentTime <=
                    cursorAfterOnePatient
                ) {
                    appointmentSlots.shift();
                    pushItem(
                        nextAppointment,
                    );
                } else {
                    waitingQueueItems.shift();
                    pushItem(
                        nextQueue,
                    );
                }
            }
        }

        return {
            averageConsultationMinutes,

            availability,

            timeline,
        };
    };

export const recalculateDoctorQueueEstimates =
    async (
        args:
            QueueEstimateArgs,
    ) => {

        const result =
            await buildDoctorQueueTimeline(
                args,
            );

        const bulkOps =
            result.timeline
                .filter(
                    (
                        item,
                    ) =>
                        item.kind ===
                        "QUEUE" &&
                        item.queueId,
                )
                .map(
                    (
                        item,
                        index,
                    ) => {

                        const wait =
                            item.status ===
                                "CALLED" ||
                                item.status ===
                                "SERVING"
                                ? 0
                                : item.estimatedWaitMinutes ||
                                0;

                        return {
                            updateOne: {
                                filter: {
                                    _id:
                                        item.queueId,
                                },

                                update: {
                                    $set: {
                                        estimatedWaitTime:
                                            wait,

                                        estimatedWaitMinutes:
                                            wait,

                                        estimatedTurnTime:
                                            item.estimatedStartTime ||
                                            new Date(),

                                        patientsAhead:
                                            index,
                                    },
                                },
                            },
                        };
                    },
                );

        if (
            bulkOps.length
        ) {
            await Queue.bulkWrite(
                bulkOps,
            );
        }

        return result;
    };

export const getQueueTrackingSnapshot =
    async (
        trackingToken:
            string,
    ) => {

        const queue:
            any =
            await Queue.findOne({
                trackingToken,

                trackingLinkActive:
                    true,

                trackingExpiresAt: {
                    $gt:
                        new Date(),
                },
            })
                .populate(
                    "patientId",
                    "name phone email patientCode age gender",
                )
                .populate(
                    "departmentId",
                    "name tokenPrefix",
                )
                .populate(
                    "doctorId",
                    "name email isOnline",
                )
                .lean();

        if (
            !queue
        ) {
            return null;
        }

        let doctorId =
            queue.doctorId?._id ||
            queue.doctorId;

        if (
            !doctorId
        ) {
            const fallbackDoctor:
                any =
                await User.findOne({
                    hospitalId:
                        queue.hospitalId,

                    departmentId:
                        queue.departmentId?._id ||
                        queue.departmentId,

                    role:
                        "DOCTOR",

                    isActive: {
                        $ne:
                            false,
                    },
                })
                    .select(
                        "_id name email isOnline",
                    )
                    .lean();

            doctorId =
                fallbackDoctor?._id;
        }

        if (
            !doctorId
        ) {
            return {
                queue,

                patientsAhead:
                    0,

                aheadList:
                    [],

                doctorAvailability: {
                    status:
                        "NO_DOCTOR",

                    statusText:
                        "Doctor is not assigned yet",

                    todaySessions:
                        [],
                },
            };
        }

        const timelineResult =
            await buildDoctorQueueTimeline({
                hospitalId:
                    queue.hospitalId,

                doctorId,

                departmentId:
                    queue.departmentId?._id ||
                    queue.departmentId,

                queueDate:
                    queue.queueDate,
            });

        const targetIndex =
            timelineResult.timeline.findIndex(
                (
                    item,
                ) =>
                    item.kind ===
                    "QUEUE" &&
                    String(
                        item.queueId,
                    ) ===
                    String(
                        queue._id,
                    ),
            );

        const safeTargetIndex =
            targetIndex >=
                0
                ? targetIndex
                : 0;

        const targetItem =
            timelineResult.timeline[
            safeTargetIndex
            ];

        const aheadItems =
            targetIndex >
                0
                ? timelineResult.timeline.slice(
                    0,
                    targetIndex,
                )
                : [];

        const currentServing =
            timelineResult.timeline.find(
                (
                    item,
                ) =>
                    item.status ===
                    "SERVING",
            ) ||
            timelineResult.timeline.find(
                (
                    item,
                ) =>
                    item.status ===
                    "CALLED",
            ) ||
            null;

        return {
            queue: {
                _id:
                    queue._id,

                tokenLabel:
                    queue.tokenLabel,

                tokenNumber:
                    queue.tokenNumber,

                status:
                    queue.status,

                source:
                    queue.source,

                priority:
                    queue.priority,

                queueDate:
                    queue.queueDate,

                estimatedWaitTime:
                    targetItem?.estimatedWaitMinutes ??
                    queue.estimatedWaitTime ??
                    0,

                estimatedWaitMinutes:
                    targetItem?.estimatedWaitMinutes ??
                    queue.estimatedWaitMinutes ??
                    queue.estimatedWaitTime ??
                    0,

                estimatedTurnTime:
                    targetItem?.estimatedStartTime ||
                    queue.estimatedTurnTime,

                estimatedTurnTimeText:
                    formatTime(
                        targetItem?.estimatedStartTime ||
                        queue.estimatedTurnTime,
                    ),

                scheduledStartTime:
                    queue.scheduledStartTime ||
                    null,

                patient:
                    queue.patientId,

                department:
                    queue.departmentId,

                doctor:
                    queue.doctorId,
            },

            doctorAvailability: {
                status:
                    timelineResult.availability.status,

                statusText:
                    timelineResult.availability.statusText,

                todaySessions:
                    timelineResult.availability.todaySessions,

                selectedDay:
                    timelineResult.availability.selectedDay,

                doctor:
                    timelineResult.availability.doctor,
            },

            currentServingToken:
                currentServing?.label ||
                null,

            patientsAhead:
                aheadItems.length,

            aheadList:
                aheadItems.map(
                    (
                        item,
                    ) => ({
                        label:
                            item.label,

                        type:
                            item.source,

                        status:
                            item.status,

                        scheduledStartTime:
                            item.scheduledStartTime ||
                            null,

                        estimatedStartTime:
                            item.estimatedStartTime ||
                            null,

                        estimatedStartTimeText:
                            formatTime(
                                item.estimatedStartTime,
                            ),
                    }),
                ),

            averageConsultationMinutes:
                timelineResult.averageConsultationMinutes,

            updatedAt:
                new Date(),
        };
    };