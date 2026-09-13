import posthog from "posthog-js";

const POSTHOG_TOKEN =
    import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;

const POSTHOG_HOST =
    import.meta.env.VITE_POSTHOG_HOST ||
    "https://us.i.posthog.com";

const POSTHOG_ENABLED =
    import.meta.env.VITE_POSTHOG_ENABLED === "true";

const blockedPropertyKeys = [
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

export const initPostHog = () => {
    if (!POSTHOG_ENABLED || !POSTHOG_TOKEN) {
        console.log("PostHog disabled or token missing");
        return;
    }

    posthog.init(
        POSTHOG_TOKEN,
        {
            api_host: POSTHOG_HOST,

            /*
             * Privacy-safe setup for hospital software.
             * We will capture only manual safe events.
             */
            autocapture: false,
            capture_pageview: false,
            capture_pageleave: false,
            disable_session_recording: true,

            mask_all_text: true,
            mask_all_element_attributes: true,

            property_denylist: blockedPropertyKeys,

            person_profiles: "identified_only",

            loaded: (client) => {
                if (import.meta.env.DEV) {
                    client.debug();
                }
            },
        },
    );
};

export default posthog;