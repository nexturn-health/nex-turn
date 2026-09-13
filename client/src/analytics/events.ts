import { usePostHog } from "@posthog/react";

type SafeProperties = Record<
    string,
    string | number | boolean | null | undefined
>;

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

export const analyticsEvents = {
    LOGIN_SUCCESS: "login_success",
    LOGOUT_SUCCESS: "logout_success",

    HOSPITAL_REGISTERED: "hospital_registered",
    PLAN_SELECTED: "plan_selected",
    UPGRADE_CLICKED: "subscription_upgrade_clicked",

    OPD_TOKEN_GENERATED: "opd_token_generated",
    OPD_TOKEN_DUPLICATE_RETURNED: "opd_token_duplicate_returned",

    APPOINTMENT_BOOKED: "appointment_booked",
    APPOINTMENT_CHECKED_IN: "appointment_checked_in",

    DOCTOR_CALL_NEXT: "doctor_called_next_patient",
    DOCTOR_START_SERVING: "doctor_started_serving",
    DOCTOR_COMPLETE_PATIENT: "doctor_completed_patient",
    DOCTOR_SKIP_PATIENT: "doctor_skipped_patient",
    DOCTOR_BREAK_STARTED: "doctor_break_started",
    DOCTOR_BREAK_ENDED: "doctor_break_ended",

    LAB_ORDER_CREATED: "lab_order_created",
    LAB_PAYMENT_CONFIRMED: "lab_payment_confirmed",
    REPORT_UPLOADED: "report_uploaded",

    DASHBOARD_OPENED: "dashboard_opened",
    FEATURE_OPENED: "feature_opened",
} as const;

export type AnalyticsEventName =
    (typeof analyticsEvents)[keyof typeof analyticsEvents];

export const useAnalytics = () => {
    const posthog =
        usePostHog();

    const capture = (
        event: AnalyticsEventName,
        properties?: SafeProperties,
    ) => {
        posthog?.capture(
            event,
            sanitizeProperties(properties),
        );
    };

    return {
        capture,
    };
};