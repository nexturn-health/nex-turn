import {
    Queue,
} from "../models/Queue.model";

import {
    sendNearTurnNotification as sendNearTurnNotificationService,
    sendCalledNotification,
} from "./notification.service";


// =====================================
// SEND NEAR TURN NOTIFICATION
// =====================================

export const sendNearTurnNotification =
    async (
        queue: any,
    ) => {

        try {

            // =================================
            // PATIENT
            // =================================

            const patient =
                queue.patientId &&
                typeof queue.patientId ===
                    "object"
                    ? queue.patientId as {
                        name: string;
                        phone?: string;
                    }
                    : null;


            if (!patient?.phone) {

                console.log(
                    `⚠️ Near-turn notification skipped for ${queue.tokenLabel}: phone missing`,
                );

                return {
                    success: false,
                    channel: "NONE",
                    message:
                        "Patient phone number missing",
                };
            }


            // =================================
            // TRACKING URL
            // =================================

            const clientUrl =
                process.env.CLIENT_URL ||
                "http://localhost:5173";


            const trackingUrl =
                queue.trackingToken
                    ? `${clientUrl}/track/${queue.trackingToken}`
                    : undefined;


            // =================================
            // SEND
            // =================================

            return await sendNearTurnNotificationService({

                phone:
                    patient.phone,

                patientName:
                    patient.name,

                tokenLabel:
                    queue.tokenLabel,

                estimatedWaitTime:
                    queue.estimatedWaitTime,

                trackingUrl,

            });

        } catch (error) {

            console.error(
                "❌ Near-turn notification error:",
                error,
            );

            return {
                success: false,
                channel: "NONE",
                error,
            };
        }
    };


// =====================================
// SEND YOUR TURN / CALLED
// =====================================

export const sendYourTurnNotification =
    async (
        queue: any,
    ) => {

        try {

            const patient =
                queue.patientId &&
                typeof queue.patientId ===
                    "object"
                    ? queue.patientId as {
                        name: string;
                        phone?: string;
                    }
                    : null;


            if (!patient?.phone) {

                return {
                    success: false,
                    channel: "NONE",
                    message:
                        "Patient phone number missing",
                };
            }


            return await sendCalledNotification({

                phone:
                    patient.phone,

                patientName:
                    patient.name,

                tokenLabel:
                    queue.tokenLabel,

            });

        } catch (error) {

            console.error(
                "❌ Called notification error:",
                error,
            );

            return {
                success: false,
                channel: "NONE",
                error,
            };
        }
    };