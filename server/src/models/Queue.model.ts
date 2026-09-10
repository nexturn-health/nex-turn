import mongoose, {
    HydratedDocument,
    Schema,
} from "mongoose";

/* ============================================================

   QUEUE TYPES

============================================================ */

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

export type QueueSource =
    | "WALK_IN"
    | "APPOINTMENT"
    | "EMERGENCY";

export type QueuePaymentStatus =
    | "UNPAID"
    | "PAID"
    | "REFUNDED";

export type AppointmentCallStatus =
    | "UPCOMING"
    | "PRIORITY"
    | "MISSED";

/* ============================================================

   QUEUE INTERFACE

============================================================ */

export interface IQueue {
    _id?:
        mongoose.Types.ObjectId;

    hospitalId:
        mongoose.Types.ObjectId;

    patientId:
        mongoose.Types.ObjectId;

    departmentId:
        mongoose.Types.ObjectId;

    doctorId?:
        mongoose.Types.ObjectId | null;

    appointmentId?:
        mongoose.Types.ObjectId | null;

    source:
        QueueSource;

    scheduledStartTime?:
        string | null;

    scheduledEndTime?:
        string | null;

    sortTime?:
        Date | null;

    tokenNumber:
        number;

    tokenLabel:
        string;

    priority:
        QueuePriority;

    status:
        QueueStatus;

    queueDate:
        string;

    paymentStatus:
        QueuePaymentStatus;

    arrivedAt?:
        Date | null;

    checkedInAt?:
        Date | null;

    estimatedWaitTime:
        number;

    estimatedTurnTime?:
        Date | null;

    serviceDurationMinutes?:
        number | null;

    trackingToken:
        string;

    trackingLinkActive:
        boolean;

    trackingExpiresAt:
        Date;

    tokenNotificationSent:
        boolean;

    nearTurnNotificationSent:
        boolean;

    calledNotificationSent:
        boolean;

    calledAt?:
        Date | null;

    servingAt?:
        Date | null;

    completedAt?:
        Date | null;

    appointmentCallStatus?:
        AppointmentCallStatus;

    appointmentMissedAt?:
        Date | null;

    manuallyCalledAfterMissedAt?:
        Date | null;

    createdAt?:
        Date;

    updatedAt?:
        Date;
}

export type QueueDocument =
    HydratedDocument<IQueue>;

/* ============================================================

   QUEUE SCHEMA

============================================================ */

const queueSchema =
    new Schema<IQueue>(
        {
            hospitalId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Hospital",

                required:
                    true,

                index:
                    true,
            },

            patientId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Patient",

                required:
                    true,

                index:
                    true,
            },

            departmentId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Department",

                required:
                    true,

                index:
                    true,
            },

            doctorId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,

                index:
                    true,
            },

            appointmentId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Appointment",

                default:
                    null,

                index:
                    true,
            },

            source: {
                type:
                    String,

                enum: [
                    "WALK_IN",
                    "APPOINTMENT",
                    "EMERGENCY",
                ],

                default:
                    "WALK_IN",

                required:
                    true,

                index:
                    true,
            },

            scheduledStartTime: {
                type:
                    String,

                trim:
                    true,

                default:
                    null,
            },

            scheduledEndTime: {
                type:
                    String,

                trim:
                    true,

                default:
                    null,
            },

            sortTime: {
                type:
                    Date,

                default:
                    null,

                index:
                    true,
            },

            tokenNumber: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,
            },

            tokenLabel: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,
            },

            priority: {
                type:
                    String,

                enum: [
                    "NORMAL",
                    "EMERGENCY",
                ],

                default:
                    "NORMAL",

                required:
                    true,
            },

            status: {
                type:
                    String,

                enum: [
                    "WAITING",
                    "CALLED",
                    "SERVING",
                    "COMPLETED",
                    "SKIPPED",
                    "CANCELLED",
                ],

                default:
                    "WAITING",

                required:
                    true,

                index:
                    true,
            },

            queueDate: {
                type:
                    String,

                required:
                    true,

                index:
                    true,
            },

            paymentStatus: {
                type:
                    String,

                enum: [
                    "UNPAID",
                    "PAID",
                    "REFUNDED",
                ],

                default:
                    "UNPAID",

                index:
                    true,
            },

            arrivedAt: {
                type:
                    Date,

                default:
                    null,
            },

            checkedInAt: {
                type:
                    Date,

                default:
                    null,
            },

            estimatedWaitTime: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },

            estimatedTurnTime: {
                type:
                    Date,

                default:
                    null,
            },

            serviceDurationMinutes: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },

            trackingToken: {
                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true,

                trim:
                    true,
            },

            trackingLinkActive: {
                type:
                    Boolean,

                default:
                    true,

                index:
                    true,
            },

            trackingExpiresAt: {
                type:
                    Date,

                required:
                    true,

                index:
                    true,
            },

            tokenNotificationSent: {
                type:
                    Boolean,

                default:
                    false,
            },

            nearTurnNotificationSent: {
                type:
                    Boolean,

                default:
                    false,
            },

            calledNotificationSent: {
                type:
                    Boolean,

                default:
                    false,
            },

            calledAt: {
                type:
                    Date,

                default:
                    null,
            },

            servingAt: {
                type:
                    Date,

                default:
                    null,
            },

            completedAt: {
                type:
                    Date,

                default:
                    null,
            },

            appointmentCallStatus: {
                type:
                    String,

                enum: [
                    "UPCOMING",
                    "PRIORITY",
                    "MISSED",
                ],

                default:
                    "UPCOMING",

                index:
                    true,
            },

            appointmentMissedAt: {
                type:
                    Date,

                default:
                    null,
            },

            manuallyCalledAfterMissedAt: {
                type:
                    Date,

                default:
                    null,
            },
        },
        {
            timestamps:
                true,
        },
    );

/* ============================================================

   BASE INDEXES

============================================================ */

queueSchema.index({
    hospitalId:
        1,

    departmentId:
        1,

    queueDate:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    departmentId:
        1,

    queueDate:
        1,

    tokenNumber:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    departmentId:
        1,

    queueDate:
        1,

    status:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    doctorId:
        1,

    queueDate:
        1,

    status:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    doctorId:
        1,

    queueDate:
        1,

    source:
        1,

    status:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    appointmentId:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    doctorId:
        1,

    queueDate:
        1,

    scheduledStartTime:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    doctorId:
        1,

    queueDate:
        1,

    sortTime:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    departmentId:
        1,

    queueDate:
        1,

    status:
        1,

    serviceDurationMinutes:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    doctorId:
        1,

    status:
        1,

    completedAt:
        -1,
});

queueSchema.index({
    trackingToken:
        1,

    trackingLinkActive:
        1,

    trackingExpiresAt:
        1,
});

/* ============================================================

   APPOINTMENT MISSED FLOW INDEXES

   Used for:
   - appointment priority only inside time window
   - upcoming appointment list
   - missed appointment section
   - manual call after missed

============================================================ */

queueSchema.index({
    hospitalId:
        1,

    departmentId:
        1,

    queueDate:
        1,

    status:
        1,

    source:
        1,

    scheduledStartTime:
        1,

    scheduledEndTime:
        1,

    tokenNumber:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    departmentId:
        1,

    queueDate:
        1,

    status:
        1,

    source:
        1,

    appointmentCallStatus:
        1,

    scheduledStartTime:
        1,

    tokenNumber:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    doctorId:
        1,

    queueDate:
        1,

    status:
        1,

    source:
        1,

    appointmentCallStatus:
        1,

    appointmentMissedAt:
        -1,
});

queueSchema.index({
    hospitalId:
        1,

    appointmentId:
        1,

    appointmentCallStatus:
        1,
});

queueSchema.index({
    hospitalId:
        1,

    departmentId:
        1,

    queueDate:
        1,

    source:
        1,

    appointmentCallStatus:
        1,

    appointmentMissedAt:
        -1,
});

/* ============================================================

   MODEL

============================================================ */

export const Queue =
    mongoose.model<IQueue>(
        "Queue",
        queueSchema,
    );