import {Hospital} from "../models/Hospital.model";

export const TRIAL_DAYS = 14;

export const createTrialDates = () => {
    const start = new Date();

    const end = new Date(start);

    end.setDate(
        end.getDate() + TRIAL_DAYS
    );

    return {
        start,
        end,
    };
};

export const isDateExpired = (
    date?: Date
) => {
    if (!date) {
        return false;
    }

    return new Date() >= new Date(date);
};

export const refreshSubscriptionStatus =
    async (hospitalId: string) => {
        const hospital =
            await Hospital.findById(
                hospitalId
            );

        if (!hospital) {
            return null;
        }

        const now = new Date();

        // Trial expired
        if (
            hospital.subscriptionStatus ===
                "TRIAL" &&
            hospital.trialEndsAt &&
            now >= hospital.trialEndsAt
        ) {
            hospital.subscriptionStatus =
                "EXPIRED";

            hospital.isActive = false;

            await hospital.save();
        }

        // Paid subscription expired
        if (
            hospital.subscriptionStatus ===
                "ACTIVE" &&
            hospital.subscriptionEndsAt &&
            now >=
                hospital.subscriptionEndsAt
        ) {
            hospital.subscriptionStatus =
                "EXPIRED";

            hospital.isActive = false;

            await hospital.save();
        }

        return hospital;
    };