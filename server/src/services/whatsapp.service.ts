import "dotenv/config";
import twilio from "twilio";

/* =========================================================
   TWILIO CONFIG
========================================================= */

const accountSid =
    process.env.TWILIO_ACCOUNT_SID;

const authToken =
    process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
    throw new Error(
        "Twilio credentials are missing"
    );
}

const client = twilio(
    accountSid,
    authToken
);

/* =========================================================
   TYPES
========================================================= */

export interface SendWhatsAppParams {
    phone: string;
    message: string;
}

export interface WhatsAppResult {
    success: boolean;
    sid?: string;
    error?: string;
}

/* =========================================================
   PHONE NORMALIZATION
========================================================= */

function normalizePhone(
    phone: string
): string {

    let value =
        phone.trim();

    // Remove spaces, -, (, )
    value = value.replace(
        /[\s\-()]/g,
        ""
    );

    // 10 digit Indian number
    if (/^\d{10}$/.test(value)) {
        value =
            `+91${value}`;
    }

    // 91XXXXXXXXXX
    if (/^91\d{10}$/.test(value)) {
        value =
            `+${value}`;
    }

    return value;
}

/* =========================================================
   SEND WHATSAPP
========================================================= */

export async function sendWhatsApp({
    phone,
    message,
}: SendWhatsAppParams): Promise<WhatsAppResult> {

    try {

        const normalizedPhone =
            normalizePhone(phone);

        console.log(
            "================================"
        );

        console.log(
            " Sending WhatsApp..."
        );

        console.log(
            " To:",
            normalizedPhone
        );

        console.log(
            " Message:",
            message
        );

        console.log(
            "================================"
        );

        /*
         * ====================================================
         * IMPORTANT
         *
         * Twilio Sandbox currently requires an approved
         * WhatsApp template for business-initiated messages.
         *
         * Therefore this 'message' is currently logged,
         * while the Sandbox template is used for testing.
         *
         * Once your production NexTurn WhatsApp template
         * is approved, we'll pass the template variables here.
         * ====================================================
         */

        const twilioMessage =
            await client.messages.create({

                from:
                    process.env
                        .TWILIO_WHATSAPP_FROM,

                to:
                    `whatsapp:${normalizedPhone}`,

                /*
                 * YOUR CURRENT WORKING
                 * SANDBOX CONTENT SID
                 */
                contentSid:
                    "HXfe5ab5f00277942d4d4200328b4d403c",

                /*
                 * Temporary Sandbox variables.
                 *
                 * These can be changed once we create
                 * the actual NexTurn WhatsApp template.
                 */
                contentVariables:
                    JSON.stringify({
                        "1":
                            "NexTurn",

                        "2":
                            message,
                    }),
            });

        console.log(
            "✅ WhatsApp sent"
        );

        console.log(
            "SID:",
            twilioMessage.sid
        );

        console.log(
            "Status:",
            twilioMessage.status
        );

        return {
            success: true,
            sid:
                twilioMessage.sid,
        };

    } catch (error: any) {

        console.error(
            "❌ WhatsApp failed:"
        );

        console.error(
            error?.message ||
            error
        );

        return {
            success: false,

            error:
                error?.message ||
                "WhatsApp sending failed",
        };
    }
}