import type {
    Request,
    Response,
} from "express";

import { Queue } from "../models/Queue.model";

import {
    calculateQueueTracking,
} from "../services/queueTracking.service";

// =====================================
// TRACK PATIENT QUEUE
// GET /api/queues/track/:trackingToken
// =====================================
export const trackQueue = async (
    req: Request,
    res: Response,
) => {
    try {
        const { trackingToken } = req.params;

        // =================================
        // VALIDATE TOKEN
        // =================================

        if (!trackingToken) {
            return res.status(400).json({
                success: false,
                message: "Tracking token is required",
            });
        }

        // =================================
        // FIND QUEUE
        // =================================

        const queue = await Queue.findOne({
            trackingToken,
        })
            .populate(
                "patientId",
                "name phone patientCode age gender",
            )
            .populate(
                "departmentId",
                "name description tokenPrefix",
            )
            .lean();

        // =================================
        // QUEUE NOT FOUND
        // =================================

        if (!queue) {
            return res.status(404).json({
                success: false,
                message: "Invalid tracking link",
            });
        }

        // =================================
        // SKIPPED TOKEN
        // =================================
        // IMPORTANT:
        // Check SKIPPED BEFORE trackingLinkActive
        // and expiration checks.

        if (queue.status === "SKIPPED") {
            return res.status(200).json({
                success: true,

                code: "TOKEN_SKIPPED",

                message:
                    "Your token was skipped. Please contact reception.",

                data: {
                    queueId: queue._id,

                    hospitalId: queue.hospitalId,

                    tokenLabel: queue.tokenLabel,

                    tokenNumber: queue.tokenNumber,

                    status: queue.status,

                    priority: queue.priority,

                    patient: queue.patientId,

                    department: queue.departmentId,

                    currentServingToken: null,

                    patientsAhead: 0,

                    estimatedWaitTime: 0,

                    estimatedTurnTime: null,

                    queueDate: queue.queueDate,
                },
            });
        }

        // =================================
        // CHECK TRACKING STATUS
        // =================================

        if (queue.trackingLinkActive === false) {
            return res.status(410).json({
                success: false,
                code: "TRACKING_TERMINATED",
                message:
                    "Your token has already been called. Please proceed to the doctor's room.",
            });
        }

        // =================================
        // CHECK EXPIRATION
        // =================================

        if (
            queue.trackingExpiresAt &&
            new Date(
                queue.trackingExpiresAt,
            ).getTime() < Date.now()
        ) {
            return res.status(410).json({
                success: false,
                code: "TRACKING_EXPIRED",
                message:
                    "This tracking link has expired.",
            });
        }

        // =================================
        // CALCULATE LIVE QUEUE
        // =================================

        const tracking =
            await calculateQueueTracking(
                queue as any,
            );

        // =================================
        // RESPONSE
        // =================================

        return res.status(200).json({
            success: true,

            data: {
                queueId: queue._id,

                hospitalId: queue.hospitalId,

                tokenLabel: queue.tokenLabel,

                tokenNumber: queue.tokenNumber,

                status: queue.status,

                priority: queue.priority,

                patient: queue.patientId,

                department: queue.departmentId,

                currentServingToken:
                    tracking.currentServingToken,

                patientsAhead:
                    tracking.patientsAhead,

                estimatedWaitTime:
                    tracking.estimatedWaitTime,

                estimatedTurnTime:
                    tracking.estimatedTurnTime,

                queueDate: queue.queueDate,
            },
        });
    } catch (error) {
        console.error(
            "Track queue error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Failed to track queue",
        });
    }
};