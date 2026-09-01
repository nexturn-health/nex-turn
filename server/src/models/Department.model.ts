import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IDepartment extends Document {
  hospitalId: mongoose.Types.ObjectId;

  name: string;

  tokenPrefix: string;

  description?: string;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    tokenPrefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 3,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate department names in same hospital
DepartmentSchema.index(
  {
    hospitalId: 1,
    name: 1,
  },
  {
    unique: true,
  },
);

// Prevent duplicate token prefixes in same hospital
DepartmentSchema.index(
  {
    hospitalId: 1,
    tokenPrefix: 1,
  },
  {
    unique: true,
  },
);

export const Department = mongoose.model<IDepartment>(
  "Department",
  DepartmentSchema,
);