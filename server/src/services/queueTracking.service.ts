import mongoose from "mongoose";

import {
    Queue,
    type IQueue,
} from "../models/Queue.model";

import {
    User,
} from "../models/User.model";

import {
    getDoctorLiveDelayStatus,
} from "./doctorTiming.service";

/* ============================================================
   CONFIGURATION
============================================================ */

const AVERAGE_WINDOW =
    20;

const DEFAULT_SERVICE_TIME =
    10;

const MIN_SERVICE_TIME =
    1;

const MAX_SERVICE_TIME =
    120;

/* ============================================================
   TYPES
============================================================ */

export interface QueueTrackingResult {
    currentServingToken: string | null;
    patientsAhead: number;
    estimatedWaitTime: number;
    estimatedTurnTime: Date | null;
    averageServiceTime: number;
    doctorTiming?: any | null;
}

/* ============================================================
   HELPERS
============================================================ */

const toObjectId = (
    value: any,
) => {
    if (
        value?._id
    ) {
        return new mongoose.Types.ObjectId(
            String(
                value._id,
            ),
        );
    }

    return new mongoose.Types.ObjectId(
        String(
            value,
        ),
    );
};

const getIdString = (
    value: any,
) => {
    if (
        value?._id
    ) {
        return String(
            value._id,
        );
    }

    return String(
        value,
    );
};

const buildQueueDateTime = (
    queueDate?: string,
    time?: string | null,
) => {
    if (
        !queueDate ||
        !time ||
        !/^([01]\d|2[0-3]):([0-5]\d)$/.test(
            time,
        )
    ) {
        return null;
    }

    return new Date(
        `${queueDate}T${time}:00+05:30`,
    );
};

const getQueueScheduledTime = (
    queue: any,
) => {
    return (
        queue.scheduledStartTime ||
        queue.appointmentId?.confirmedStartTime ||
        queue.appointmentId?.requestedStartTime ||
        null
    );
};

const getSortTime = (
    item: any,
) => {
    const scheduledTime =
        getQueueScheduledTime(
            item,
        );

    const scheduledDateTime =
        buildQueueDateTime(
            item.queueDate,
            scheduledTime,
        );

    if (
        item.source ===
            "APPOINTMENT" &&
        scheduledDateTime
    ) {
        return scheduledDateTime.getTime();
    }

    return (
        item.tokenNumber ||
        0
    );
};

const sortQueueItems = (
    first: any,
    second: any,
) => {
    if (
        first.status ===
            "SERVING" &&
        second.status !==
            "SERVING"
    ) {
        return -1;
    }

    if (
        second.status ===
            "SERVING" &&
        first.status !==
            "SERVING"
    ) {
        return 1;
    }

    if (
        first.status ===
            "CALLED" &&
        second.status !==
            "CALLED"
    ) {
        return -1;
    }

    if (
        second.status ===
            "CALLED" &&
        first.status !==
            "CALLED"
    ) {
        return 1;
    }

    if (
        first.priority ===
            "EMERGENCY" &&
        second.priority !==
            "EMERGENCY"
    ) {
        return -1;
    }

    if (
        second.priority ===
            "EMERGENCY" &&
        first.priority !==
            "EMERGENCY"
    ) {
        return 1;
    }

    return (
        getSortTime(
            first,
        ) -
        getSortTime(
            second,
        )
    );
};

const calculateOfflineMinutes = (
    doctorTiming: any,
) => {
    if (
        doctorTiming?.isOnline ===
        true
    ) {
        return 0;
    }

    if (
        doctorTiming?.lastSeenAt
    ) {
        return Math.max(
            0,
            Math.floor(
                (
                    Date.now() -
                    new Date(
                        doctorTiming.lastSeenAt,
                    ).getTime()
                ) /
                    60000,
            ),
        );
    }

    return doctorTiming?.lateByMinutes ||
        0;
};

/* ============================================================
   CALCULATE DOCTOR'S AVERAGE SERVICE TIME
============================================================ */

const calculateAverageServiceTime = async (
    queue: IQueue | any,
): Promise<number> => {
    const doctorId =
        queue.doctorId?._id ||
        queue.doctorId;

    if (
        !doctorId
    ) {
        return DEFAULT_SERVICE_TIME;
    }

    const completedQueues: any[] =
        await Queue.find({
            hospitalId:
                queue.hospitalId,

            departmentId:
                queue.departmentId?._id ||
                queue.departmentId,

            doctorId,

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
                AVERAGE_WINDOW,
            )
            .select(
                "serviceDurationMinutes servingAt completedAt",
            )
            .lean() as any[];

    if (
        completedQueues.length ===
        0
    ) {
        return DEFAULT_SERVICE_TIME;
    }

    const durations =
        completedQueues
            .map(
                (
                    item: any,
                ) => {
                    const stored =
                        Number(
                            item.serviceDurationMinutes,
                        );

                    if (
                        Number.isFinite(
                            stored,
                        ) &&
                        stored >=
                            MIN_SERVICE_TIME &&
                        stored <=
                            MAX_SERVICE_TIME
                    ) {
                        return stored;
                    }

                    if (
                        !item.servingAt ||
                        !item.completedAt
                    ) {
                        return 0;
                    }

                    const start =
                        new Date(
                            item.servingAt,
                        ).getTime();

                    const end =
                        new Date(
                            item.completedAt,
                        ).getTime();

                    const minutes =
                        (
                            end -
                            start
                        ) /
                        (
                            1000 *
                            60
                        );

                    return minutes;
                },
            )
            .filter(
                (
                    minutes,
                ) =>
                    minutes >=
                        MIN_SERVICE_TIME &&
                    minutes <=
                        MAX_SERVICE_TIME,
            );

    if (
        durations.length ===
        0
    ) {
        return DEFAULT_SERVICE_TIME;
    }

    const total =
        durations.reduce(
            (
                sum,
                value,
            ) =>
                sum +
                value,
            0,
        );

    return Number(
        (
            total /
            durations.length
        ).toFixed(
            1,
        ),
    );
};

/* ============================================================
   CALCULATE LIVE QUEUE
============================================================ */

export const calculateQueueTracking = async (
    queue: IQueue | any,
): Promise<QueueTrackingResult> => {
    if (
        queue.status ===
            "COMPLETED" ||
        queue.status ===
            "SKIPPED" ||
        queue.status ===
            "CANCELLED"
    ) {
        return {
            currentServingToken:
                null,

            patientsAhead:
                0,

            estimatedWaitTime:
                0,

            estimatedTurnTime:
                null,

            averageServiceTime:
                DEFAULT_SERVICE_TIME,

            doctorTiming:
                null,
        };
    }

    let doctorId =
        queue.doctorId?._id ||
        queue.doctorId;

    if (
        !doctorId
    ) {
        const fallbackDoctor: any =
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
                    "_id name email isOnline lastSeenAt",
                )
                .lean();

        doctorId =
            fallbackDoctor?._id ||
            null;
    }

    let doctorTiming: any =
        null;

    if (
        doctorId
    ) {
        doctorTiming =
            await getDoctorLiveDelayStatus({
                hospitalId:
                    queue.hospitalId,

                doctorId,

                date:
                    queue.queueDate,
            });
    }

    let averageServiceTime =
        await calculateAverageServiceTime(
            {
                ...queue,
                doctorId:
                    doctorId ||
                    queue.doctorId,
            },
        );

    averageServiceTime =
        doctorTiming?.averageServiceMinutes ||
        averageServiceTime ||
        DEFAULT_SERVICE_TIME;

    const activeQueues: any[] =
        await Queue.find({
            hospitalId:
                queue.hospitalId,

            departmentId:
                queue.departmentId?._id ||
                queue.departmentId,

            queueDate:
                queue.queueDate,

            status: {
                $in: [
                    "WAITING",
                    "CALLED",
                    "SERVING",
                ],
            },
        })
            .populate(
                "appointmentId",
                "appointmentCode requestedStartTime confirmedStartTime endTime paymentStatus status",
            )
            .sort({
                priority:
                    -1,

                tokenNumber:
                    1,
            })
            .lean() as any[];

    const sortedActiveQueues =
        activeQueues.sort(
            sortQueueItems,
        );

    const servingPatient =
        sortedActiveQueues.find(
            (
                item,
            ) =>
                item.status ===
                "SERVING",
        );

    const calledPatient =
        sortedActiveQueues.find(
            (
                item,
            ) =>
                item.status ===
                "CALLED",
        );

    const currentServing =
        servingPatient ||
        calledPatient;

    const currentServingToken =
        currentServing?.tokenLabel ||
        null;

    if (
        queue.status ===
            "CALLED" ||
        queue.status ===
            "SERVING"
    ) {
        return {
            currentServingToken:
                queue.tokenLabel ||
                currentServingToken,

            patientsAhead:
                0,

            estimatedWaitTime:
                0,

            estimatedTurnTime:
                new Date(),

            averageServiceTime:
                Number(
                    averageServiceTime.toFixed(
                        1,
                    ),
                ),

            doctorTiming,
        };
    }

    const currentQueueId =
        getIdString(
            queue._id,
        );

    const targetIndex =
        sortedActiveQueues.findIndex(
            (
                item,
            ) =>
                getIdString(
                    item._id,
                ) ===
                currentQueueId,
        );

    const safeTargetIndex =
        targetIndex >=
            0
            ? targetIndex
            : sortedActiveQueues.length;

    const patientsAhead =
        sortedActiveQueues
            .slice(
                0,
                safeTargetIndex,
            )
            .filter(
                (
                    item,
                ) =>
                    item.status ===
                        "WAITING" ||
                    item.status ===
                        "CALLED" ||
                    item.status ===
                        "SERVING",
            ).length;

    let remainingCurrentPatient =
        0;

    if (
        servingPatient?.servingAt
    ) {
        const startedAt =
            new Date(
                servingPatient.servingAt,
            ).getTime();

        const elapsedMinutes =
            (
                Date.now() -
                startedAt
            ) /
            (
                1000 *
                60
            );

        remainingCurrentPatient =
            Math.max(
                averageServiceTime -
                    elapsedMinutes,
                0,
            );
    }

    const now =
        new Date();

    let estimateBaseTime =
        now;

    if (
        doctorTiming?.expectedDoctorStartAt
    ) {
        const expectedDoctorStartAt =
            new Date(
                doctorTiming.expectedDoctorStartAt,
            );

        if (
            !Number.isNaN(
                expectedDoctorStartAt.getTime(),
            ) &&
            expectedDoctorStartAt.getTime() >
                estimateBaseTime.getTime()
        ) {
            estimateBaseTime =
                expectedDoctorStartAt;
        }
    }

    const appointmentTime =
        getQueueScheduledTime(
            queue,
        );

    const appointmentDateTime =
        buildQueueDateTime(
            queue.queueDate,
            appointmentTime,
        );

    if (
        appointmentDateTime &&
        appointmentDateTime.getTime() >
            estimateBaseTime.getTime()
    ) {
        estimateBaseTime =
            appointmentDateTime;
    }

    const estimatedTurnTime =
        new Date(
            estimateBaseTime.getTime() +
                (
                    remainingCurrentPatient +
                    patientsAhead *
                        averageServiceTime
                ) *
                    60 *
                    1000,
        );

    const estimatedWaitTime =
        Math.max(
            0,
            Math.ceil(
                (
                    estimatedTurnTime.getTime() -
                    now.getTime()
                ) /
                    (
                        60 *
                        1000
                    ),
            ),
        );

    return {
        currentServingToken,

        patientsAhead,

        estimatedWaitTime,

        estimatedTurnTime,

        averageServiceTime:
            Number(
                averageServiceTime.toFixed(
                    1,
                ),
            ),

        doctorTiming,
    };
};

/* ============================================================
   PUBLIC TRACKING SNAPSHOT
   Used by: GET /api/queues/track/:trackingToken
============================================================ */

export const getQueueTrackingSnapshot =
    async (
        trackingToken: string,
    ) => {
        const queue: any =
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
                    "_id name phone email patientCode age gender",
                )
                .populate(
                    "departmentId",
                    "_id name tokenPrefix",
                )
                .populate(
                    "doctorId",
                    "_id name email isOnline lastSeenAt",
                )
                .populate(
                    "appointmentId",
                    "appointmentCode requestedStartTime confirmedStartTime endTime paymentStatus status",
                )
                .lean();

        if (
            !queue
        ) {
            return null;
        }

        let resolvedDoctor: any =
            queue.doctorId ||
            null;

        let doctorId =
            queue.doctorId?._id ||
            queue.doctorId;

        if (
            !doctorId
        ) {
            const fallbackDoctor: any =
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
                        "_id name email isOnline lastSeenAt",
                    )
                    .lean();

            if (
                fallbackDoctor
            ) {
                resolvedDoctor =
                    fallbackDoctor;

                doctorId =
                    fallbackDoctor._id;
            }
        }

        const tracking =
            await calculateQueueTracking({
                ...queue,
                doctorId:
                    doctorId ||
                    queue.doctorId,
            });

        const doctorTiming =
            tracking.doctorTiming ||
            null;

        const appointmentTime =
            getQueueScheduledTime(
                queue,
            );

        const appointment =
            queue.source ===
                "APPOINTMENT" ||
            queue.appointmentId ||
            queue.scheduledStartTime
                ? {
                    appointmentCode:
                        queue.appointmentId?.appointmentCode ||
                        null,

                    appointmentTime,

                    scheduledStartTime:
                        appointmentTime,

                    message:
                        "Your appointment time is fixed. Estimated turn time may change based on doctor availability and current queue.",
                }
                : null;

        const doctorOnline =
            Boolean(
                doctorTiming?.isOnline ??
                resolvedDoctor?.isOnline,
            );

        const doctorShiftStartTime =
            doctorTiming?.scheduledStartTime ||
            null;

        const offlineMinutes =
            calculateOfflineMinutes(
                doctorTiming,
            );

        return {
            _id:
                queue._id,

            hospitalId:
                queue.hospitalId,

            tokenNumber:
                queue.tokenNumber,

            tokenLabel:
                queue.tokenLabel,

            status:
                queue.status,

            source:
                queue.source,

            priority:
                queue.priority,

            queueDate:
                queue.queueDate,

            patient:
                queue.patientId,

            department:
                queue.departmentId,

            doctorId:
                resolvedDoctor
                    ? {
                        _id:
                            resolvedDoctor._id,

                        name:
                            resolvedDoctor.name,

                        email:
                            resolvedDoctor.email,
                    }
                    : null,

            doctorOnline,

            doctorShiftStartTime,

            patientsAhead:
                tracking.patientsAhead,

            offlineMinutes,

            averageConsultationMinutes:
                tracking.averageServiceTime,

            estimatedWaitTime:
                tracking.estimatedWaitTime,

            estimatedTurnTime:
                tracking.estimatedTurnTime,

            currentServingToken:
                tracking.currentServingToken,

            doctorTiming: doctorTiming
                ? {
                    scheduledStartTime:
                        doctorTiming.scheduledStartTime ||
                        null,

                    scheduledEndTime:
                        doctorTiming.scheduledEndTime ||
                        null,

                    isOnline:
                        Boolean(
                            doctorTiming.isOnline,
                        ),

                    isLate:
                        Boolean(
                            doctorTiming.isLate,
                        ),

                    lateByMinutes:
                        doctorTiming.lateByMinutes ||
                        0,

                    firstOnlineAt:
                        doctorTiming.firstOnlineAt ||
                        null,

                    lastSeenAt:
                        doctorTiming.lastSeenAt ||
                        null,

                    expectedDoctorStartAt:
                        doctorTiming.expectedDoctorStartAt ||
                        null,

                    averageServiceMinutes:
                        doctorTiming.averageServiceMinutes ||
                        tracking.averageServiceTime,

                    message:
                        doctorTiming.message ||
                        "Doctor timing is being updated.",
                }
                : null,

            appointment,

            createdAt:
                queue.createdAt,

            updatedAt:
                queue.updatedAt,
        };
    };