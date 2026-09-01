import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

/* =========================================================
   ADDRESS INTERFACE
========================================================= */

export interface IHospitalAddress {
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

/* =========================================================
   HOSPITAL INTERFACE
========================================================= */

export interface IHospital
  extends Document {
  name: string;

  email?: string;

  phone?: string;

  address?: IHospitalAddress;

  registrationNumber?: string;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
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

      city: {
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
      /* -----------------------------------------------
         NAME
      ----------------------------------------------- */

      name: {
        type: String,
        required: true,
        trim: true,
      },

      /* -----------------------------------------------
         EMAIL
      ----------------------------------------------- */

      email: {
        type: String,
        trim: true,
        lowercase: true,
      },

      /* -----------------------------------------------
         PHONE
      ----------------------------------------------- */

      phone: {
        type: String,
        trim: true,
      },

      /* -----------------------------------------------
         ADDRESS
      ----------------------------------------------- */

      address: {
        type: HospitalAddressSchema,
        default: () => ({}),
      },

      /* -----------------------------------------------
         REGISTRATION NUMBER
      ----------------------------------------------- */

      registrationNumber: {
        type: String,
        trim: true,
        uppercase: true,
      },

      /* -----------------------------------------------
         STATUS
      ----------------------------------------------- */

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    },
  );

/* =========================================================
   INDEXES
========================================================= */

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
  isActive: 1,
});

/* =========================================================
   MODEL
========================================================= */

export const Hospital: Model<IHospital> =
  mongoose.model<IHospital>(
    "Hospital",
    HospitalSchema,
  );