import {
    Queue,
    type IQueue,
} from "../models/Queue.model";

// =====================================
// CONFIGURATION
// =====================================

// Number of recent completed consultations
// used to calculate the doctor's current speed.
const AVERAGE_WINDOW = 20;

// Fallback when the doctor has no completed
// consultations yet.
const DEFAULT_SERVICE_TIME = 10;

// Ignore unrealistic consultation durations.
const MIN_SERVICE_TIME = 1;
const MAX_SERVICE_TIME = 120;

// =====================================
// RESULT TYPE
// =====================================

export interface QueueTrackingResult {
    currentServingToken: string | null;

    patientsAhead: number;

    estimatedWaitTime: number;

    estimatedTurnTime: Date | null;

    averageServiceTime: number;
}

// =====================================
// CALCULATE DOCTOR'S AVERAGE SERVICE TIME
// =====================================

const calculateAverageServiceTime = async (
    queue: IQueue,
): Promise<number> => {

    // =================================
    // Find recently completed patients
    // for the SAME doctor
    // =================================

    const completedQueues =
        await Queue.find({
            hospitalId: queue.hospitalId,

            departmentId: queue.departmentId,

            doctorId: queue.doctorId,

            status: "COMPLETED",

            servingAt: {
                $ne: null,
            },

            completedAt: {
                $ne: null,
            },
        })
            .sort({
                completedAt: -1,
            })
            .limit(AVERAGE_WINDOW)
            .select(
                "servingAt completedAt",
            )
            .lean();

    // =================================
    // No history
    // =================================

    if (
        completedQueues.length === 0
    ) {
        return DEFAULT_SERVICE_TIME;
    }

    // =================================
    // Calculate consultation durations
    // =================================

    const durations =
        completedQueues
            .map((item) => {

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
                    (end - start) /
                    (1000 * 60);

                return minutes;
            })
            .filter(
                (minutes) =>
                    minutes >=
                    MIN_SERVICE_TIME &&
                    minutes <=
                    MAX_SERVICE_TIME,
            );

    // =================================
    // If valid data doesn't exist
    // =================================

    if (durations.length === 0) {
        return DEFAULT_SERVICE_TIME;
    }

    // =================================
    // Average
    // =================================

    const total =
        durations.reduce(
            (sum, value) =>
                sum + value,
            0,
        );

    return (
        total /
        durations.length
    );
};

// =====================================
// CALCULATE LIVE QUEUE
// =====================================

export const calculateQueueTracking = async (
    queue: IQueue,
): Promise<QueueTrackingResult> => {

    // ===================================
    // TERMINAL STATUS
    // ===================================

    if (
        queue.status === "COMPLETED" ||
        queue.status === "SKIPPED" ||
        queue.status === "CANCELLED"
    ) {
        return {
            currentServingToken: null,

            patientsAhead: 0,

            estimatedWaitTime: 0,

            estimatedTurnTime: null,

            averageServiceTime:
                DEFAULT_SERVICE_TIME,
        };
    }

    // ===================================
    // GET DOCTOR AVERAGE
    // ===================================

    const averageServiceTime =
        await calculateAverageServiceTime(
            queue,
        );

    // ===================================
    // GET ACTIVE QUEUES
    // ===================================

    const activeQueues =
        await Queue.find({
            hospitalId:
                queue.hospitalId,

            departmentId:
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
            .sort({
                priority: -1,
                tokenNumber: 1,
            })
            .lean();

    // ===================================
    // CURRENTLY SERVING
    // ===================================

    const servingPatient =
        activeQueues.find(
            (item) =>
                item.status ===
                "SERVING",
        );

    const calledPatient =
        activeQueues.find(
            (item) =>
                item.status ===
                "CALLED",
        );

    const currentServing =
        servingPatient ||
        calledPatient;

    const currentServingToken =
        currentServing?.tokenLabel ||
        null;

    // ===================================
    // PATIENT ALREADY CALLED/SERVING
    // ===================================

    if (
        queue.status === "CALLED" ||
        queue.status === "SERVING"
    ) {
        return {
            currentServingToken,

            patientsAhead: 0,

            estimatedWaitTime: 0,

            estimatedTurnTime:
                new Date(),

            averageServiceTime:
                Number(
                    averageServiceTime.toFixed(1),
                ),
        };
    }

    // ===================================
    // WAITING PATIENTS AHEAD
    // ===================================

    const patientsAhead =
        activeQueues.filter(
            (item) => {

                // Don't count current patient
                if (
                    item._id.toString() ===
                    queue._id.toString()
                ) {
                    return false;
                }

                // Only waiting patients
                if (
                    item.status !==
                    "WAITING"
                ) {
                    return false;
                }

                // =================================
                // EMERGENCY PRIORITY
                // =================================

                if (
                    item.priority ===
                    "EMERGENCY" &&
                    queue.priority ===
                    "NORMAL"
                ) {
                    return true;
                }

                if (
                    item.priority ===
                    "NORMAL" &&
                    queue.priority ===
                    "EMERGENCY"
                ) {
                    return false;
                }

                // =================================
                // SAME PRIORITY
                // =================================

                return (
                    item.tokenNumber <
                    queue.tokenNumber
                );
            },
        ).length;

    // ===================================
    // CURRENT PATIENT REMAINING TIME
    // ===================================

    let remainingCurrentPatient = 0;

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
            (1000 * 60);

        remainingCurrentPatient =
            Math.max(
                averageServiceTime -
                elapsedMinutes,
                0,
            );
    }

    // ===================================
    // ESTIMATED WAIT TIME
    // ===================================

    const estimatedWaitTime =
        Math.max(
            Math.round(
                remainingCurrentPatient +
                patientsAhead *
                averageServiceTime,
            ),
            0,
        );

    // ===================================
    // ESTIMATED TURN TIME
    // ===================================

    const estimatedTurnTime =
        new Date(
            Date.now() +
            estimatedWaitTime *
            60 *
            1000,
        );

    // ===================================
    // RETURN
    // ===================================

    return {
        currentServingToken,

        patientsAhead,

        estimatedWaitTime,

        estimatedTurnTime,

        averageServiceTime:
            Number(
                averageServiceTime.toFixed(1),
            ),
    };
};