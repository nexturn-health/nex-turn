import type {
  Request,
  Response,
} from "express";

import { Hospital } from "../models/Hospital.model";

/* =========================================================
   GET CURRENT SUBSCRIPTION
========================================================= */

export const getSubscription =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        req.user?.hospitalId;

      if (!hospitalId) {
        return res.status(403).json({
          success: false,

          message:
            "Hospital not found",
        });
      }

      const hospital =
        await Hospital.findById(
          hospitalId,
        );

      if (!hospital) {
        return res.status(404).json({
          success: false,

          message:
            "Hospital not found",
        });
      }

      // ======================================================
      // AUTO EXPIRY
      // ======================================================

      const now = new Date();

      if (
        hospital.subscriptionStatus ===
          "TRIAL" &&
        hospital.trialEndsAt &&
        now >
          hospital.trialEndsAt
      ) {
        hospital.subscriptionStatus =
          "EXPIRED";

        await hospital.save();
      }

      if (
        hospital.subscriptionStatus ===
          "ACTIVE" &&
        hospital.subscriptionEndsAt &&
        now >
          hospital.subscriptionEndsAt
      ) {
        hospital.subscriptionStatus =
          "EXPIRED";

        await hospital.save();
      }

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(200).json({
        success: true,

        data: {
          plan:
            hospital.plan,

          status:
            hospital.subscriptionStatus,

          trialStartedAt:
            hospital.trialStartedAt,

          trialEndsAt:
            hospital.trialEndsAt,

          subscriptionStartedAt:
            hospital.subscriptionStartedAt,

          subscriptionEndsAt:
            hospital.subscriptionEndsAt,
        },
      });
    } catch (error) {
      console.error(
        "Get subscription error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to get subscription",
      });
    }
  };

/* =========================================================
   DEVELOPMENT UPGRADE
========================================================= */

/*
 * IMPORTANT:
 *
 * This endpoint is only for development/testing.
 *
 * Later we will replace this with:
 *
 * Payment Gateway
 *      ↓
 * Payment verification
 *      ↓
 * Premium activation
 */

export const upgradeToPremium =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        req.user?.hospitalId;

      if (!hospitalId) {
        return res.status(403).json({
          success: false,

          message:
            "Hospital not found",
        });
      }

      const hospital =
        await Hospital.findById(
          hospitalId,
        );

      if (!hospital) {
        return res.status(404).json({
          success: false,

          message:
            "Hospital not found",
        });
      }

      // ======================================================
      // ONLY HOSPITAL ADMIN
      // ======================================================

      if (
        req.user?.role !==
        "HOSPITAL_ADMIN"
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Only hospital admin can upgrade the plan",
        });
      }

      // ======================================================
      // ALREADY PREMIUM
      // ======================================================

      if (
        hospital.plan ===
        "PREMIUM"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Hospital is already on Premium plan",
        });
      }

      // ======================================================
      // ACTIVATE PREMIUM
      // ======================================================

      const subscriptionStartedAt =
        new Date();

      const subscriptionEndsAt =
        new Date(
          subscriptionStartedAt.getTime() +
            30 *
              24 *
              60 *
              60 *
              1000,
        );

      hospital.plan =
        "PREMIUM";

      hospital.subscriptionStatus =
        "ACTIVE";

      hospital.subscriptionStartedAt =
        subscriptionStartedAt;

      hospital.subscriptionEndsAt =
        subscriptionEndsAt;

      await hospital.save();

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(200).json({
        success: true,

        message:
          "Premium plan activated successfully",

        data: {
          plan:
            hospital.plan,

          status:
            hospital.subscriptionStatus,

          subscriptionStartedAt:
            hospital.subscriptionStartedAt,

          subscriptionEndsAt:
            hospital.subscriptionEndsAt,
        },
      });
    } catch (error) {
      console.error(
        "Upgrade Premium error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to upgrade subscription",
      });
    }
  };