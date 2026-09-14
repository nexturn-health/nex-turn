import { PostHog } from "posthog-node";

const POSTHOG_TOKEN =
    process.env.POSTHOG_PROJECT_TOKEN;

const POSTHOG_HOST =
    process.env.POSTHOG_HOST ||
    "https://us.i.posthog.com";

const POSTHOG_ENABLED =
    process.env.POSTHOG_ENABLED === "true";

const blockedKeys = [
    "patientName",
    "patientPhone",
    "phone",
    "email",
    "address",
    "age",
    "gender",
    "symptoms",
    "diagnosis",
    "prescription",
    "medicine",
    "labReport",
    "reportUrl",
    "trackingToken",
    "trackingUrl",
    "tokenLabel",
    "patientCode",
    "patientId",
];

type SafeProperties = Record<
    string,
    string | number | boolean | null | undefined
>;

type CaptureServerEventInput = {
    distinctId?: string | null;
    event: string;
    hospitalId?: string | null;
    role?: string | null;
    plan?: string | null;
    properties?: SafeProperties;
};

const sanitizeProperties = (
    properties: SafeProperties = {},
) => {
    const safeProperties: SafeProperties = {};

    Object.entries(properties).forEach(
        ([key, value]) => {
            if (blockedKeys.includes(key)) {
                return;
            }

            safeProperties[key] = value;
        },
    );

    return safeProperties;
};

export const posthogClient =
    POSTHOG_ENABLED && POSTHOG_TOKEN
        ? new PostHog(
              POSTHOG_TOKEN,
              {
                  host: POSTHOG_HOST,
              },
          )
        : null;

export const captureServerEvent = ({
    distinctId,
    event,
    hospitalId,
    role,
    plan,
    properties = {},
}: CaptureServerEventInput) => {
    try {
        if (!posthogClient) {
            return;
        }

        posthogClient.capture({
            distinctId:
                distinctId ||
                hospitalId ||
                "server",
            event,
            properties: {
                ...sanitizeProperties(properties),

                hospitalId:
                    hospitalId || null,

                role:
                    role || null,

                plan:
                    plan || null,

                source:
                    "backend",

                /*
                 * Avoid unnecessary person profile creation
                 * for backend/system events.
                 */
                $process_person_profile: false,
            },
        });
    } catch (error) {
        console.error(
            "PostHog capture failed:",
            error,
        );
    }
};

export const shutdownPostHog = async () => {
    try {
        if (!posthogClient) {
            return;
        }

        await posthogClient.shutdown();
    } catch (error) {
        console.error(
            "PostHog shutdown failed:",
            error,
        );
    }
};