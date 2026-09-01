import type { IQueue } from "../models/Queue.model";

import { sendSMS } from "./sms.service";
import { sendWhatsApp } from "./whatsapp.service";

// =====================================
// SEND SMS + WHATSAPP
// =====================================

const sendPatientNotification = async (
    queue: any,
    message: string,
) => {
    try {
        const phone =
            queue.patientId?.phone;

        if (!phone) {
            console.warn(
                `No phone number for token ${queue.tokenLabel}`,
            );

            return;
        }

        // ---------------------------------
        // SMS
        // ---------------------------------

        await sendSMS(
            phone,
            message,
        );

        // ---------------------------------
        // WhatsApp
        // ---------------------------------

        await sendWhatsApp(
            phone,
            message,
        );
    } catch (error) {
        console.error(
            "Patient notification error:",
            error,
        );
    }
};

// =====================================
// YOUR TURN
// =====================================

export const sendYourTurnNotification =
    async (
        queue: any,
    ) => {
        const patientName =
            queue.patientId?.name ||
            "Patient";

        const token =
            queue.tokenLabel;

        const message =
            `Hello ${patientName}, your token ${token} has been called at NexTurn. Please proceed to the doctor's room.`;

        await sendPatientNotification(
            queue,
            message,
        );
    };

// =====================================
// 15 MINUTE WARNING
// =====================================

export const sendFifteenMinuteNotification =
    async (
        queue: any,
    ) => {
        const patientName =
            queue.patientId?.name ||
            "Patient";

        const token =
            queue.tokenLabel;

        const estimatedWait =
            queue.estimatedWaitTime ??
            15;

        const message =
            `Hello ${patientName}, your NexTurn token ${token} is approaching. Estimated waiting time is approximately ${estimatedWait} minutes. Please be ready.`;

        await sendPatientNotification(
            queue,
            message,
        );
    };