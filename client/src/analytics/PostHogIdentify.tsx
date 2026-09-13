import { useEffect } from "react";
import { usePostHog } from "@posthog/react";
import { useAuthStore } from "../store/authStore";

type PostHogSafeUser = {
    _id?: string;
    id?: string;
    userId?: string;

    role?: string;

    hospitalId?:
        | string
        | {
              _id?: string;
              id?: string;
          }
        | null;

    /*
     * These fields may or may not exist in your auth store.
     * We keep them optional only for analytics.
     */
    plan?: string | null;
    hospitalPlan?: string | null;
    subscriptionPlan?: string | null;

    hospital?: {
        _id?: string;
        id?: string;
        plan?: string | null;
        subscriptionStatus?: string | null;
    } | null;
};

const getUserId = (
    user: PostHogSafeUser | null,
) => {
    return (
        user?._id ||
        user?.id ||
        user?.userId ||
        null
    );
};

const getHospitalId = (
    user: PostHogSafeUser | null,
) => {
    const hospitalId =
        user?.hospitalId;

    if (!hospitalId) {
        return null;
    }

    if (typeof hospitalId === "string") {
        return hospitalId;
    }

    return (
        hospitalId._id ||
        hospitalId.id ||
        null
    );
};

const getPlan = (
    user: PostHogSafeUser | null,
) => {
    return (
        user?.plan ||
        user?.hospitalPlan ||
        user?.subscriptionPlan ||
        user?.hospital?.plan ||
        null
    );
};

const getSubscriptionStatus = (
    user: PostHogSafeUser | null,
) => {
    return (
        user?.hospital?.subscriptionStatus ||
        null
    );
};

export default function PostHogIdentify() {
    const posthog =
        usePostHog();

    const authUser =
        useAuthStore((state) => state.user);

    useEffect(() => {
        if (!posthog) {
            return;
        }

        const user =
            authUser as PostHogSafeUser | null;

        const userId =
            getUserId(user);

        if (!userId) {
            posthog.reset();
            return;
        }

        const hospitalId =
            getHospitalId(user);

        const plan =
            getPlan(user);

        const subscriptionStatus =
            getSubscriptionStatus(user);

        /*
         * Safe analytics only.
         * Do not send patient name, phone, email, symptoms,
         * diagnosis, prescription, reports, tracking token, etc.
         */
        posthog.identify(
            String(userId),
            {
                role:
                    user?.role || "UNKNOWN",

                hospitalId,

                plan,

                subscriptionStatus,
            },
        );

        if (hospitalId) {
            posthog.group(
                "hospital",
                String(hospitalId),
                {
                    plan,
                    subscriptionStatus,
                },
            );
        }
    }, [
        posthog,
        authUser,
    ]);

    return null;
}