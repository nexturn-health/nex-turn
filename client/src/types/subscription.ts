export type HospitalPlan =
  | "BASIC"
  | "PREMIUM";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED";

export interface SubscriptionInfo {
  plan:
    HospitalPlan;

  status:
    SubscriptionStatus;

  trialStartedAt?:
    string | null;

  trialEndsAt?:
    string | null;

  subscriptionStartedAt?:
    string | null;

  subscriptionEndsAt?:
    string | null;
}