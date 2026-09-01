import {
    sendWhatsApp,
} from "./whatsapp.service";

import {
    sendSMS,
} from "./sms.service";

import {
    sendPatientTrackingEmail,
} from "./email.service";


// =====================================
// TYPES
// =====================================

export interface PatientNotificationData {
    phone?: string;
    email?: string;

    patientName: string;
    tokenLabel: string;

    hospitalName?: string;
    departmentName?: string;
    doctorName?: string;

    trackingUrl?: string;

    patientsAhead?: number;
    estimatedWaitTime?: number;
}


// =====================================
// NOTIFICATION TYPE
// =====================================

type NotificationType =
    | "TOKEN_CREATED"
    | "NEAR_TURN"
    | "CALLED";


// =====================================
// TEST EMAIL
// =====================================
//
// IMPORTANT:
// This is ONLY for development/testing.
//
// Every patient without an email will receive
// the token email at this address.
//
// Remove this fallback before production.
//

const TEST_PATIENT_EMAIL =
    process.env.TEST_PATIENT_EMAIL;


// =====================================
// MAIN NOTIFICATION
// =====================================

export const sendPatientNotification = async (
    data: PatientNotificationData & {
        type: NotificationType;
    },
) => {

const {
    phone,
    email,
    patientName,
    tokenLabel,
    hospitalName,
    departmentName,
    doctorName,
    trackingUrl,
    patientsAhead,
    estimatedWaitTime,
    type,
} = data;


    // =================================
    // DEBUG
    // =================================

    console.log(
        "=================================",
    );

    console.log(
        "🔔 PATIENT NOTIFICATION",
    );

    console.log(
        "TYPE:",
        type,
    );

    console.log(
        "PATIENT:",
        patientName,
    );

    console.log(
        "PHONE:",
        phone || "NOT PROVIDED",
    );

    console.log(
        "PATIENT EMAIL:",
        email || "NOT PROVIDED",
    );

    console.log(
        "TEST EMAIL:",
        TEST_PATIENT_EMAIL || "NOT CONFIGURED",
    );

    console.log(
        "TOKEN:",
        tokenLabel,
    );

    console.log(
        "TRACKING URL:",
        trackingUrl || "NOT PROVIDED",
    );

    console.log(
        "=================================",
    );


    let message = "";


    // =================================
    // TOKEN CREATED
    // =================================

    if (
        type === "TOKEN_CREATED"
    ) {

        message =
            `Hello ${patientName}, your NexTurn token is ${tokenLabel}.`;


        if (
            estimatedWaitTime !== undefined
        ) {

            message +=
                ` Estimated waiting time is approximately ${estimatedWaitTime} minutes.`;
        }


        if (
            trackingUrl
        ) {

            message +=
                ` Track your live queue here: ${trackingUrl}`;
        }
    }


    // =================================
    // NEAR TURN
    // =================================

    if (
        type === "NEAR_TURN"
    ) {

        message =
            `Hello ${patientName}, your NexTurn token ${tokenLabel} is coming soon. ` +
            `There are ${patientsAhead ?? 2} patients ahead of you. ` +
            `Please be in the waiting area.`;


        if (
            trackingUrl
        ) {

            message +=
                ` Track your queue: ${trackingUrl}`;
        }
    }


    // =================================
    // CALLED
    // =================================

    if (
        type === "CALLED"
    ) {

        message =
            `Hello ${patientName}, your NexTurn token ${tokenLabel} has been called. ` +
            `Please proceed to the doctor's room.`;
    }


    // =================================
    // VALIDATION
    // =================================

    if (
        !phone &&
        !email &&
        !TEST_PATIENT_EMAIL
    ) {

        console.error(
            "❌ No phone, patient email or test email available",
        );


        return {
            success: false,
            channel: "NONE",
            message:
                "Patient contact information missing",
        };
    }


    if (
        !message
    ) {

        return {
            success: false,
            channel: "NONE",
            message:
                "Notification message is empty",
        };
    }


    // =================================
    // 1. WHATSAPP
    // =================================

    if (
        phone
    ) {

        try {

            console.log(
                "=================================",
            );

            console.log(
                "📱 Trying WhatsApp...",
            );

            console.log(
                "TO:",
                phone,
            );

            console.log(
                "TYPE:",
                type,
            );

            console.log(
                "=================================",
            );


            const whatsappResult =
                await sendWhatsApp({
                    phone,
                    message,
                });


            if (
                whatsappResult.success
            ) {

                console.log(
                    "✅ WhatsApp notification sent",
                );


                return {
                    success: true,
                    channel: "WHATSAPP",
                };
            }


            console.log(
                "⚠️ WhatsApp failed → trying SMS",
            );

        } catch (
            error
        ) {

            console.error(
                "❌ WhatsApp error:",
                error,
            );


            console.log(
                "⚠️ WhatsApp failed → trying SMS",
            );
        }


        // =================================
        // 2. SMS FALLBACK
        // =================================

        try {

            console.log(
                "=================================",
            );

            console.log(
                "📤 Trying SMS...",
            );

            console.log(
                "TO:",
                phone,
            );

            console.log(
                "=================================",
            );


            const smsResult =
                await sendSMS({
                    phone,
                    message,
                });


            if (
                smsResult.success
            ) {

                console.log(
                    "✅ SMS notification sent",
                );


                return {
                    success: true,
                    channel: "SMS",
                };
            }


            console.log(
                "⚠️ SMS failed → checking email fallback",
            );

        } catch (
            error
        ) {

            console.error(
                "❌ SMS error:",
                error,
            );


            console.log(
                "⚠️ SMS failed → checking email fallback",
            );
        }
    }


    // =================================
    // 3. EMAIL FALLBACK
    // =================================
    //
    // TOKEN_CREATED ONLY
    //
    // Use:
    //
    // patient email
    //
    // OR, if missing:
    //
    // TEST_PATIENT_EMAIL
    //
    // =================================

    if (
        type === "TOKEN_CREATED"
    ) {

        const recipientEmail =
            email ||
            TEST_PATIENT_EMAIL;


        if (
            recipientEmail
        ) {

            try {

                console.log(
                    "=================================",
                );

                console.log(
                    "📧 Trying Email...",
                );

                console.log(
                    "TO:",
                    recipientEmail,
                );

                console.log(
                    "TOKEN:",
                    tokenLabel,
                );

                console.log(
                    "TRACKING URL:",
                    trackingUrl,
                );

                console.log(
                    "=================================",
                );


                // =================================
                // TRACKING URL REQUIRED
                // =================================

                if (
                    !trackingUrl
                ) {

                    console.error(
                        "❌ Cannot send token email: tracking URL missing",
                    );


                    return {
                        success: false,
                        channel: "NONE",
                        message:
                            "Tracking URL missing for email",
                    };
                }


                // =================================
                // SEND EMAIL
                // =================================

                const emailResult =
                    await sendPatientTrackingEmail({

                        email:
                            recipientEmail,

                        patientName,

                        tokenLabel,

                        trackingUrl,

                    });


                // =================================
                // EMAIL SUCCESS
                // =================================

                if (
                    emailResult
                ) {

                    console.log(
                        "=================================",
                    );

                    console.log(
                        "✅ EMAIL NOTIFICATION SENT",
                    );

                    console.log(
                        "TO:",
                        recipientEmail,
                    );

                    console.log(
                        "TOKEN:",
                        tokenLabel,
                    );

                    console.log(
                        "=================================",
                    );


                    return {
                        success: true,
                        channel: "EMAIL",
                    };
                }


                // =================================
                // EMAIL FAILED
                // =================================

                console.error(
                    "❌ Email notification failed",
                );

            } catch (
                error
            ) {

                console.error(
                    "=================================",
                );

                console.error(
                    "❌ Email error:",
                    error,
                );

                console.error(
                    "=================================",
                );
            }

        } else {

            console.log(
                "⚠️ Email fallback skipped: no email configured",
            );
        }
    }


    // =================================
    // ALL CHANNELS FAILED
    // =================================

    console.error(
        "⚠️ All available notification channels failed",
    );


    return {
        success: false,
        channel: "NONE",
        message:
            "WhatsApp, SMS and Email notifications failed",
    };
};


// =====================================
// TOKEN CREATED
// =====================================

export const sendTokenCreatedNotification =
    async (
        data: PatientNotificationData,
    ) => {

        return sendPatientNotification({

            ...data,

            type:
                "TOKEN_CREATED",

        });
    };


// =====================================
// NEAR TURN
// =====================================

export const sendNearTurnNotification =
    async (
        data: PatientNotificationData,
    ) => {

        return sendPatientNotification({

            ...data,

            type:
                "NEAR_TURN",

        });
    };


// =====================================
// CALLED
// =====================================

export const sendCalledNotification =
    async (
        data: PatientNotificationData,
    ) => {

        return sendPatientNotification({

            ...data,

            type:
                "CALLED",

        });
    };