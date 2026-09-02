import mongoose, {
  Document,
  Schema,
} from "mongoose";

// =====================================
// QUEUE TYPES
// =====================================

export type QueueStatus =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED";

export type QueuePriority =
  | "NORMAL"
  | "EMERGENCY";

// =====================================
// QUEUE INTERFACE
// =====================================

export interface IQueue extends Document {
  hospitalId: mongoose.Types.ObjectId;

  patientId: mongoose.Types.ObjectId;

  departmentId: mongoose.Types.ObjectId;

  doctorId?: mongoose.Types.ObjectId | null;

  tokenNumber: number;

  tokenLabel: string;

  priority: QueuePriority;

  status: QueueStatus;

  queueDate: string;

  // ===================================
  // ESTIMATED WAIT TIME
  // ===================================

  estimatedWaitTime: number;

  estimatedTurnTime?: Date | null;

  // ===================================
  // REAL CONSULTATION DURATION
  // ===================================

  serviceDurationMinutes?: number | null;

  // ===================================
  // SECURE PATIENT TRACKING
  // ===================================

  trackingToken: string;

  trackingLinkActive: boolean;

  trackingExpiresAt: Date;

  // ===================================
  // NOTIFICATION STATUS
  // ===================================

  tokenNotificationSent: boolean;

  nearTurnNotificationSent: boolean;

  calledNotificationSent: boolean;

  // ===================================
  // QUEUE TIMESTAMPS
  // ===================================

  calledAt?: Date | null;

  servingAt?: Date | null;

  completedAt?: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

// =====================================
// QUEUE SCHEMA
// =====================================

const queueSchema = new Schema<IQueue>(
  {
    // =================================
    // HOSPITAL
    // =================================

    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },

    // =================================
    // PATIENT
    // =================================

    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    // =================================
    // DEPARTMENT
    // =================================

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },

    // =================================
    // DOCTOR
    // =================================

    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // =================================
    // TOKEN
    // =================================

    tokenNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    tokenLabel: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================
    // PRIORITY
    // =================================

    priority: {
      type: String,
      enum: [
        "NORMAL",
        "EMERGENCY",
      ],
      default: "NORMAL",
      required: true,
    },

    // =================================
    // STATUS
    // =================================

    status: {
      type: String,
      enum: [
        "WAITING",
        "CALLED",
        "SERVING",
        "COMPLETED",
        "SKIPPED",
        "CANCELLED",
      ],
      default: "WAITING",
      required: true,
      index: true,
    },

    // =================================
    // QUEUE DATE
    // =================================

    queueDate: {
      type: String,
      required: true,
      index: true,
    },

    // =================================
    // ESTIMATED WAIT TIME
    // =================================

    estimatedWaitTime: {
      type: Number,
      default: 0,
      min: 0,
    },

    estimatedTurnTime: {
      type: Date,
      default: null,
    },

    // =================================
    // REAL CONSULTATION DURATION
    //
    // Saved when doctor completes a patient.
    // This is used to calculate the doctor's
    // real average consultation time.
    // =================================

    serviceDurationMinutes: {
      type: Number,
      default: null,
      min: 0,
    },

    // =================================
    // SECURE PATIENT TRACKING
    // =================================

    trackingToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    trackingLinkActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    trackingExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    // =================================
    // NOTIFICATION STATUS
    // =================================

    tokenNotificationSent: {
      type: Boolean,
      default: false,
    },

    nearTurnNotificationSent: {
      type: Boolean,
      default: false,
    },

    calledNotificationSent: {
      type: Boolean,
      default: false,
    },

    // =================================
    // QUEUE TIMESTAMPS
    // =================================

    calledAt: {
      type: Date,
      default: null,
    },

    servingAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// =====================================
// INDEXES
// =====================================

queueSchema.index({
  hospitalId: 1,
  departmentId: 1,
  queueDate: 1,
});

queueSchema.index({
  hospitalId: 1,
  departmentId: 1,
  queueDate: 1,
  tokenNumber: 1,
});

queueSchema.index({
  hospitalId: 1,
  departmentId: 1,
  queueDate: 1,
  status: 1,
});

queueSchema.index({
  hospitalId: 1,
  doctorId: 1,
  queueDate: 1,
  status: 1,
});

queueSchema.index({
  hospitalId: 1,
  departmentId: 1,
  queueDate: 1,
  status: 1,
  serviceDurationMinutes: 1,
});

queueSchema.index({
  hospitalId: 1,
  doctorId: 1,
  status: 1,
  completedAt: -1,
});

queueSchema.index({
  trackingToken: 1,
  trackingLinkActive: 1,
  trackingExpiresAt: 1,
});

// =====================================
// MODEL
// =====================================

export const Queue = mongoose.model<IQueue>(
  "Queue",
  queueSchema,
);