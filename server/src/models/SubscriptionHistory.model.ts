
import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

import type {
  HospitalPlan,
} from "./Hospital.model";

/* =========================================================
   PAYMENT METHOD TYPE
========================================================= */

export type SubscriptionPaymentMethod =
  | "CASH"
  | "UPI"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "OTHER";

/* =========================================================
   SUBSCRIPTION ACTION TYPE
========================================================= */

export type SubscriptionAction =
  | "ACTIVATED"
  | "RENEWED"
  | "PLAN_CHANGED";

/* =========================================================
   INTERFACE
========================================================= */

export interface ISubscriptionHistory
  extends Document {
  hospitalId:
    mongoose.Types.ObjectId;

  plan:
    HospitalPlan;

  previousPlan?:
    HospitalPlan;

  action:
    SubscriptionAction;

  durationMonths:
    number;

  amount?:
    number;

  paymentMethod?:
    SubscriptionPaymentMethod;

  paymentReference?:
    string;

  subscriptionStartedAt:
    Date;

  subscriptionEndsAt:
    Date;

  activatedBy:
    mongoose.Types.ObjectId;

  notes?:
    string;

  createdAt:
    Date;

  updatedAt:
    Date;
}

/* =========================================================
   SCHEMA
========================================================= */

const SubscriptionHistorySchema =
  new Schema<ISubscriptionHistory>(
    {
      /* =====================================================
         HOSPITAL
      ===================================================== */

      hospitalId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Hospital",

        required:
          true,
      },

      /* =====================================================
         CURRENT PLAN
      ===================================================== */

      plan: {
        type:
          String,

        enum: [
          "BASIC",
          "PREMIUM",
        ],

        required:
          true,
      },

      /* =====================================================
         PREVIOUS PLAN
      ===================================================== */

      previousPlan: {
        type:
          String,

        enum: [
          "BASIC",
          "PREMIUM",
        ],
      },

      /* =====================================================
         ACTION

         ACTIVATED
         RENEWED
         PLAN_CHANGED
      ===================================================== */

      action: {
        type:
          String,

        enum: [
          "ACTIVATED",
          "RENEWED",
          "PLAN_CHANGED",
        ],

        required:
          true,
      },

      /* =====================================================
         DURATION
      ===================================================== */

      durationMonths: {
        type:
          Number,

        required:
          true,

        min:
          1,
      },

      /* =====================================================
         PAYMENT AMOUNT
      ===================================================== */

      amount: {
        type:
          Number,

        min:
          0,
      },

      /* =====================================================
         PAYMENT METHOD
      ===================================================== */

      paymentMethod: {
        type:
          String,

        enum: [
          "CASH",
          "UPI",
          "BANK_TRANSFER",
          "CHEQUE",
          "OTHER",
        ],
      },

      /* =====================================================
         PAYMENT REFERENCE
      ===================================================== */

      paymentReference: {
        type:
          String,

        trim:
          true,
      },

      /* =====================================================
         SUBSCRIPTION START
      ===================================================== */

      subscriptionStartedAt: {
        type:
          Date,

        required:
          true,
      },

      /* =====================================================
         SUBSCRIPTION END
      ===================================================== */

      subscriptionEndsAt: {
        type:
          Date,

        required:
          true,
      },

      /* =====================================================
         SUPER ADMIN WHO ACTIVATED IT
      ===================================================== */

      activatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      /* =====================================================
         OPTIONAL NOTES
      ===================================================== */

      notes: {
        type:
          String,

        trim:
          true,
      },
    },

    {
      timestamps:
        true,
    },
  );

/* =========================================================
   INDEXES
========================================================= */

SubscriptionHistorySchema.index({
  hospitalId: 1,
  createdAt: -1,
});

SubscriptionHistorySchema.index({
  hospitalId: 1,
  subscriptionEndsAt: -1,
});

SubscriptionHistorySchema.index({
  activatedBy: 1,
});

SubscriptionHistorySchema.index({
  action: 1,
});

SubscriptionHistorySchema.index({
  plan: 1,
});

/* =========================================================
   MODEL
========================================================= */

export const SubscriptionHistory:
  Model<ISubscriptionHistory> =
    mongoose.model<ISubscriptionHistory>(
      "SubscriptionHistory",
      SubscriptionHistorySchema,
    );