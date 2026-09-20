const GRAPH_API_VERSION =
    process.env.META_GRAPH_API_VERSION || "v25.0";

const META_ACCESS_TOKEN =
    process.env.META_ACCESS_TOKEN;

const PHONE_NUMBER_ID =
    process.env.META_PHONE_NUMBER_ID;

const TEMPLATE_NAME = String(
  process.env.WHATSAPP_TEMPLATE_NAME ||
    process.env.META_TEMPLATE_NAME ||
    "opd_queue_confirmed",
).trim();

const TEMPLATE_LANGUAGE = String(
  process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
    process.env.META_TEMPLATE_LANGUAGE ||
    "en_US",
).trim();

console.log("META TEMPLATE CONFIG:", {
  name: TEMPLATE_NAME,
  language: TEMPLATE_LANGUAGE,
  wabaId: process.env.META_WABA_ID,
  phoneNumberId: process.env.META_PHONE_NUMBER_ID,
});

const DEFAULT_COUNTRY_CODE =
    process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ||
    "91";

interface MetaResponse {
    messages?: Array<{
        id: string;
    }>;

    error?: {
        message?: string;
        code?: number;
        type?: string;
    };
}

export interface SendOpdQueueMessageParams {
    to: string;
    patientName: string;
    queueNumber: string;
    hospitalName: string;
    departmentName: string;
    estimatedWaitMinutes: number;
    trackingToken: string;
}

const requiredEnv = (
    value: string | undefined,
    name: string,
) => {
    if (!value) {
        throw new Error(
            `${name} is missing in .env`,
        );
    }

    return value;
};

const normalizePhoneNumber = (
    phone: string,
) => {
    let digits = String(phone || "").replace(
        /\D/g,
        "",
    );

    if (digits.startsWith("00")) {
        digits = digits.slice(2);
    }

    if (digits.length === 10) {
        digits =
            `${DEFAULT_COUNTRY_CODE}${digits}`;
    }

    if (digits.length < 11) {
        throw new Error(
            "Invalid WhatsApp phone number",
        );
    }

    return digits;
};

export const sendOpdQueueConfirmed =
    async ({
        to,
        patientName,
        queueNumber,
        hospitalName,
        departmentName,
        estimatedWaitMinutes,
        trackingToken,
    }: SendOpdQueueMessageParams) => {
        const accessToken = requiredEnv(
            META_ACCESS_TOKEN,
            "META_ACCESS_TOKEN",
        );

        const phoneNumberId = requiredEnv(
            PHONE_NUMBER_ID,
            "META_PHONE_NUMBER_ID",
        );

        if (!trackingToken) {
            throw new Error(
                "Tracking token is missing",
            );
        }

        const recipient =
            normalizePhoneNumber(to);

        const url =
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

        const payload = {
            messaging_product: "whatsapp",

            to: recipient,

            type: "template",

            template: {
                name: TEMPLATE_NAME,

                language: {
                    code: TEMPLATE_LANGUAGE,
                },

                components: [
                    {
                        type: "body",

                        parameters: [
                            {
                                type: "text",
                                text: patientName,
                            },
                            {
                                type: "text",
                                text: queueNumber,
                            },
                            {
                                type: "text",
                                text: hospitalName,
                            },
                            {
                                type: "text",
                                text: departmentName,
                            },
                            {
                                type: "text",
                                text: String(
                                    estimatedWaitMinutes || 0,
                                ),
                            },
                        ],
                    },

                    {
                        type: "button",
                        sub_type: "url",
                        index: "0",

                        parameters: [
                            {
                                type: "text",
                                text: trackingToken,
                            },
                        ],
                    },
                ],
            },
        };

        const response = await fetch(url, {
            method: "POST",

            headers: {
                Authorization:
                    `Bearer ${accessToken}`,

                "Content-Type":
                    "application/json",
            },

            body: JSON.stringify(payload),
        });

        const result =
            (await response.json().catch(() => ({}))) as MetaResponse;

        if (!response.ok) {
            throw new Error(
                `Meta WhatsApp error ${response.status}: ${
                    result.error?.message ||
                    JSON.stringify(result)
                }`,
            );
        }

        const messageId =
            result.messages?.[0]?.id;

        console.log(
            "WHATSAPP OPD MESSAGE SENT:",
            messageId,
        );

        return {
            success: true,
            messageId,
            response: result,
        };
    };