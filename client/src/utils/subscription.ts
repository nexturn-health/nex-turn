import type {
  SubscriptionInfo,
} from "../types/subscription";

export const isPremiumPlan = (
  subscription:
    SubscriptionInfo | null,
) => {
  return (
    subscription?.plan ===
    "PREMIUM"
  );
};

export const hasValidSubscription = (
  subscription:
    SubscriptionInfo | null,
) => {
  if (!subscription) {
    return false;
  }

  return (
    subscription.status ===
      "TRIAL" ||
    subscription.status ===
      "ACTIVE"
  );
};

export const getSubscriptionExpiry =
  (
    subscription:
      SubscriptionInfo | null,
  ) => {
    if (!subscription) {
      return null;
    }

    if (
      subscription.status ===
      "TRIAL"
    ) {
      return (
        subscription.trialEndsAt ??
        null
      );
    }

    if (
      subscription.status ===
      "ACTIVE"
    ) {
      return (
        subscription.subscriptionEndsAt ??
        null
      );
    }

    return null;
  };

export const getRemainingDays =
  (
    subscription:
      SubscriptionInfo | null,
  ) => {
    const expiresAt =
      getSubscriptionExpiry(
        subscription,
      );

    if (!expiresAt) {
      return 0;
    }

    const end =
      new Date(
        expiresAt,
      ).getTime();

    const now =
      Date.now();

    const difference =
      end - now;

    if (
      difference <= 0
    ) {
      return 0;
    }

    return Math.ceil(
      difference /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );
  };