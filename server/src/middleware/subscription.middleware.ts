import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  Hospital,
} from "../models/Hospital.model";

/* =========================================================
   SUBSCRIPTION RESULT TYPES
========================================================= */

type InvalidSubscriptionResult = {
  valid: false;

  reason:
    | "HOSPITAL_NOT_FOUND"
    | "HOSPITAL_INACTIVE"
    | "TRIAL_EXPIRED"
    | "SUBSCRIPTION_EXPIRED";
};

type ValidSubscriptionResult = {
  valid: true;

  hospital: NonNullable<
    Request["hospital"]
  >;
};

type SubscriptionResult =
  | InvalidSubscriptionResult
  | ValidSubscriptionResult;

/* =========================================================
   GET / VALIDATE SUBSCRIPTION STATE
========================================================= */

const getSubscriptionState =
  async (
    hospitalId: string,
  ): Promise<SubscriptionResult> => {
    /* =======================================================
       FIND HOSPITAL
    ======================================================= */

    const hospital =
      await Hospital.findById(
        hospitalId,
      );

    if (!hospital) {
      return {
        valid: false,
        reason:
          "HOSPITAL_NOT_FOUND",
      };
    }

    /* =======================================================
       HOSPITAL ACTIVE CHECK
    ======================================================= */

    if (!hospital.isActive) {
      return {
        valid: false,
        reason:
          "HOSPITAL_INACTIVE",
      };
    }

    const now =
      new Date();

    /* =======================================================
       TRIAL
    ======================================================= */

    if (
      hospital.subscriptionStatus ===
      "TRIAL"
    ) {
      /*
       * Trial must have an expiry date.
       */

      if (!hospital.trialEndsAt) {
        hospital.subscriptionStatus =
          "EXPIRED";

        await hospital.save();

        return {
          valid: false,
          reason:
            "TRIAL_EXPIRED",
        };
      }

      /*
       * Trial is still active.
       */

      if (
        hospital.trialEndsAt >
        now
      ) {
        return {
          valid: true,
          hospital,
        };
      }

      /*
       * Trial expired.
       */

      hospital.subscriptionStatus =
        "EXPIRED";

      await hospital.save();

      return {
        valid: false,
        reason:
          "TRIAL_EXPIRED",
      };
    }

    /* =======================================================
       ACTIVE PAID SUBSCRIPTION
    ======================================================= */

    if (
      hospital.subscriptionStatus ===
      "ACTIVE"
    ) {
      /*
       * ACTIVE subscription should always
       * have an expiry date.
       */

      if (
        !hospital.subscriptionEndsAt
      ) {
        hospital.subscriptionStatus =
          "EXPIRED";

        await hospital.save();

        return {
          valid: false,
          reason:
            "SUBSCRIPTION_EXPIRED",
        };
      }

      /*
       * Subscription expired.
       */

      if (
        hospital.subscriptionEndsAt <=
        now
      ) {
        hospital.subscriptionStatus =
          "EXPIRED";

        await hospital.save();

        return {
          valid: false,
          reason:
            "SUBSCRIPTION_EXPIRED",
        };
      }

      /*
       * Paid subscription valid.
       */

      return {
        valid: true,
        hospital,
      };
    }

    /* =======================================================
       EXPIRED
    ======================================================= */

    return {
      valid: false,
      reason:
        "SUBSCRIPTION_EXPIRED",
    };
  };

/* =========================================================
   REQUIRE SUBSCRIPTION

   BASIC + PREMIUM
========================================================= */

export const requireSubscription =
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      /* =====================================================
         AUTH CHECK
      ===================================================== */

      if (!req.user) {
        return res.status(401).json({
          success: false,

          code:
            "AUTH_REQUIRED",

          message:
            "Authentication required",
        });
      }

      /* =====================================================
         SUPER ADMIN BYPASS

         Super Admin does not belong to
         a hospital subscription.
      ===================================================== */

      if (
        req.user.role ===
        "SUPER_ADMIN"
      ) {
        return next();
      }

      /* =====================================================
         HOSPITAL ID
      ===================================================== */

      const hospitalId =
        req.user.hospitalId;

      if (!hospitalId) {
        return res.status(403).json({
          success: false,

          code:
            "HOSPITAL_REQUIRED",

          message:
            "Hospital information not found",
        });
      }

      /* =====================================================
         CHECK SUBSCRIPTION
      ===================================================== */

      const result =
        await getSubscriptionState(
          hospitalId,
        );

      /* =====================================================
         INVALID
      ===================================================== */

      if (!result.valid) {
        if (
          result.reason ===
          "HOSPITAL_NOT_FOUND"
        ) {
          return res.status(404).json({
            success: false,

            code:
              "HOSPITAL_NOT_FOUND",

            message:
              "Hospital not found",
          });
        }

        if (
          result.reason ===
          "HOSPITAL_INACTIVE"
        ) {
          return res.status(403).json({
            success: false,

            code:
              "HOSPITAL_INACTIVE",

            message:
              "Hospital account is inactive",
          });
        }

        if (
          result.reason ===
          "TRIAL_EXPIRED"
        ) {
          return res.status(402).json({
            success: false,

            code:
              "TRIAL_EXPIRED",

            message:
              "Your 14-day trial has expired. Please contact the administrator to activate a subscription.",
          });
        }

        return res.status(402).json({
          success: false,

          code:
            "SUBSCRIPTION_EXPIRED",

          message:
            "Your subscription has expired. Please renew your plan to continue.",
        });
      }

      /* =====================================================
         ATTACH HOSPITAL TO REQUEST
      ===================================================== */

      req.hospital =
        result.hospital;

      return next();
    } catch (error) {
      console.error(
        "Subscription middleware error:",
        error,
      );

      return res.status(500).json({
        success: false,

        code:
          "SUBSCRIPTION_CHECK_FAILED",

        message:
          "Unable to verify hospital subscription",
      });
    }
  };

/* =========================================================
   REQUIRE PREMIUM

   PREMIUM ONLY
========================================================= */

export const requirePremium =
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      /* =====================================================
         AUTH CHECK
      ===================================================== */

      if (!req.user) {
        return res.status(401).json({
          success: false,

          code:
            "AUTH_REQUIRED",

          message:
            "Authentication required",
        });
      }

      /* =====================================================
         SUPER ADMIN BYPASS
      ===================================================== */

      if (
        req.user.role ===
        "SUPER_ADMIN"
      ) {
        return next();
      }

      /* =====================================================
         HOSPITAL ID
      ===================================================== */

      const hospitalId =
        req.user.hospitalId;

      if (!hospitalId) {
        return res.status(403).json({
          success: false,

          code:
            "HOSPITAL_REQUIRED",

          message:
            "Hospital information not found",
        });
      }

      /* =====================================================
         CHECK SUBSCRIPTION
      ===================================================== */

      const result =
        await getSubscriptionState(
          hospitalId,
        );

      /* =====================================================
         INVALID SUBSCRIPTION
      ===================================================== */

      if (!result.valid) {
        if (
          result.reason ===
          "HOSPITAL_NOT_FOUND"
        ) {
          return res.status(404).json({
            success: false,

            code:
              "HOSPITAL_NOT_FOUND",

            message:
              "Hospital not found",
          });
        }

        if (
          result.reason ===
          "HOSPITAL_INACTIVE"
        ) {
          return res.status(403).json({
            success: false,

            code:
              "HOSPITAL_INACTIVE",

            message:
              "Hospital account is inactive",
          });
        }

        if (
          result.reason ===
          "TRIAL_EXPIRED"
        ) {
          return res.status(402).json({
            success: false,

            code:
              "TRIAL_EXPIRED",

            message:
              "Your trial has expired. Please activate a subscription.",
          });
        }

        return res.status(402).json({
          success: false,

          code:
            "SUBSCRIPTION_EXPIRED",

          message:
            "Your subscription has expired. Please renew your plan.",
        });
      }

      /* =====================================================
         PREMIUM CHECK
      ===================================================== */

      if (
        result.hospital.plan !==
        "PREMIUM"
      ) {
        return res.status(403).json({
          success: false,

          code:
            "PREMIUM_REQUIRED",

          message:
            "This feature is available only on the Premium plan.",
        });
      }

      /* =====================================================
         ATTACH HOSPITAL
      ===================================================== */

      req.hospital =
        result.hospital;

      return next();
    } catch (error) {
      console.error(
        "Premium middleware error:",
        error,
      );

      return res.status(500).json({
        success: false,

        code:
          "PREMIUM_CHECK_FAILED",

        message:
          "Unable to verify Premium subscription",
      });
    }
  };