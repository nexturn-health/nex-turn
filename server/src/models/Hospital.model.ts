import mongoose, {
  Model,
  Schema,
} from "mongoose";

/* =========================================================
   SUBSCRIPTION TYPES
========================================================= */

export type HospitalPlan =
  | "BASIC"
  | "PREMIUM";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED";

/* =========================================================
   ADDRESS INTERFACE
========================================================= */

export interface IHospitalAddress {
  addressLine?: string;
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

/* =========================================================
   HOSPITAL INTERFACE
========================================================= */

export interface IHospital {
  name: string;
  publicName?: string;
  email?: string;
  phone?: string;

  address?: IHospitalAddress;

  publicAddress?: string;

  state?: string;
  district?: string;
  city?: string;
  country?: string;
  pincode?: string;

  publicBookingEnabled?: boolean;
  logoUrl?: string;

  registrationNumber?: string;
  isActive: boolean;

  plan: HospitalPlan;
  subscriptionStatus: SubscriptionStatus;

  trialStartedAt?: Date;
  trialEndsAt?: Date;
  subscriptionStartedAt?: Date;
  subscriptionEndsAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

/* =========================================================
   ADDRESS SCHEMA
========================================================= */

const HospitalAddressSchema =
  new Schema<IHospitalAddress>(
    {
      addressLine: {
        type: String,
        trim: true,
        default: "",
      },

      line1: {
        type: String,
        trim: true,
        default: "",
      },

      line2: {
        type: String,
        trim: true,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        default: "",
      },

      district: {
        type: String,
        trim: true,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        default: "",
      },

      country: {
        type: String,
        trim: true,
        default: "India",
      },

      pincode: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      _id: false,
    },
  );

/* =========================================================
   HOSPITAL SCHEMA
========================================================= */

const HospitalSchema =
  new Schema<IHospital>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      publicName: {
        type: String,
        trim: true,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
      },

      phone: {
        type: String,
        trim: true,
      },

      address: {
        type: HospitalAddressSchema,
        default: () => ({}),
      },

      publicAddress: {
        type: String,
        trim: true,
      },

      state: {
        type: String,
        trim: true,
        index: true,
      },

      district: {
        type: String,
        trim: true,
        index: true,
      },

      city: {
        type: String,
        trim: true,
        index: true,
      },

      country: {
        type: String,
        trim: true,
        default: "India",
      },

      pincode: {
        type: String,
        trim: true,
      },

      publicBookingEnabled: {
        type: Boolean,
        default: true,
        index: true,
      },

      logoUrl: {
        type: String,
        trim: true,
      },

      registrationNumber: {
        type: String,
        trim: true,
        uppercase: true,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      plan: {
        type: String,
        enum: [
          "BASIC",
          "PREMIUM",
        ],
        default: "BASIC",
        required: true,
      },

      subscriptionStatus: {
        type: String,
        enum: [
          "TRIAL",
          "ACTIVE",
          "EXPIRED",
        ],
        default: "TRIAL",
        required: true,
      },

      trialStartedAt: {
        type: Date,
      },

      trialEndsAt: {
        type: Date,
      },

      subscriptionStartedAt: {
        type: Date,
      },

      subscriptionEndsAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    },
  );

/* =========================================================
   INDEXES
========================================================= */

HospitalSchema.index({
  state: 1,
  district: 1,
  publicBookingEnabled: 1,
  isActive: 1,
});

HospitalSchema.index({
  state: 1,
  city: 1,
  publicBookingEnabled: 1,
  isActive: 1,
});

HospitalSchema.index({
  name: 1,
  state: 1,
  district: 1,
});

HospitalSchema.index({
  publicName: 1,
  state: 1,
  district: 1,
});

HospitalSchema.index(
  {
    email: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

HospitalSchema.index(
  {
    registrationNumber: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

HospitalSchema.index({
  name: 1,
});

HospitalSchema.index({
  plan: 1,
});

HospitalSchema.index({
  subscriptionStatus: 1,
});

HospitalSchema.index({
  plan: 1,
  subscriptionStatus: 1,
});

HospitalSchema.index({
  trialEndsAt: 1,
});

HospitalSchema.index({
  subscriptionEndsAt: 1,
});

HospitalSchema.index({
  isActive: 1,
  subscriptionStatus: 1,
});

/* =========================================================
   MODEL
========================================================= */

export const Hospital:
  Model<IHospital> =
  mongoose.model<IHospital>(
    "Hospital",
    HospitalSchema,
  );