export const PLAN_FEATURES = {
    BASIC: [
        "DASHBOARD",
        "DEPARTMENTS",
        "DOCTORS",
        "RECEPTIONISTS",
        "PATIENTS",

        "QUEUE",
        "TOKEN_GENERATION",
        "DOCTOR_QUEUE",

        "PATIENT_TRACKING",
        "WAITING_DISPLAY",
        "VOICE_QUEUE",
    ],

    PREMIUM: [
        "DASHBOARD",
        "DEPARTMENTS",
        "DOCTORS",
        "RECEPTIONISTS",
        "PATIENTS",

        "QUEUE",
        "TOKEN_GENERATION",
        "DOCTOR_QUEUE",

        "PATIENT_TRACKING",
        "WAITING_DISPLAY",
        "VOICE_QUEUE",

        "CONSULTATION",
        "DIAGNOSIS",
        "PRESCRIPTION",
        "MEDICAL_HISTORY",
        "MEDICAL_TIMELINE",

        "LABORATORY",
        "LAB_ORDERS",
        "LAB_REPORTS",

        "AI_PRESCRIPTION",
        "ANALYTICS",
        "ADVANCED_NOTIFICATIONS",
    ],
} as const;

export type PlanFeature =
    typeof PLAN_FEATURES[
        keyof typeof PLAN_FEATURES
    ][number];