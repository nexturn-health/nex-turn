import mongoose, {
    Schema,
    Document,
} from "mongoose";

/* ============================================================
   TYPES
============================================================ */

export type AppointmentStatus =
    | "REQUESTED"
    | "BOOKED"
    | "CONFIRMED"
    | "ARRIVED"
    | "CHECKED_IN"
    | "IN_CONSULTATION"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
    | "NO_SHOW"
    | "RESCHEDULE_REQUESTED"
    | "WAITLISTED";

export type AppointmentPaymentStatus =
    | "UNPAID"
    | "PAID"
    | "REFUNDED";

export type AppointmentPaymentMethod =
    | "CASH"
    | "UPI"
    | "CARD"
    | "OTHER";

export type AppointmentHistoryStatus =
    | AppointmentStatus
    | "PAYMENT_PAID"
    | "PAYMENT_REFUNDED";

/* ============================================================
   INTERFACE
============================================================ */

export interface IAppointment
    extends Document {
    hospitalId:
        mongoose.Types.ObjectId;

    patientId:
        mongoose.Types.ObjectId;

    doctorId:
        mongoose.Types.ObjectId;

    departmentId:
        mongoose.Types.ObjectId;

    slotId?:
        mongoose.Types.ObjectId | null;

    appointmentCode:
        string;

    appointmentDate:
        string;

    requestedStartTime:
        string;

    confirmedStartTime?:
        string | null;

    endTime:
        string;

    status:
        AppointmentStatus;

    paymentStatus:
        AppointmentPaymentStatus;

    feeAmount:
        number;

    paidAmount:
        number;

    paymentMethod?:
        AppointmentPaymentMethod | null;

    paidAt?:
        Date | null;

    paymentCollectedBy?:
        mongoose.Types.ObjectId | null;

    confirmationRequired:
        boolean;

    reason?:
        string;

    notes?:
        string;

    queueId?:
        mongoose.Types.ObjectId | null;

    arrivedAt?:
        Date | null;

    checkedInAt?:
        Date | null;

    cancelledAt?:
        Date | null;

    cancellationReason?:
        string;

    rejectedReason?:
        string;

    noShowAt?:
        Date | null;

    createdBy?:
        mongoose.Types.ObjectId | null;

    createdByRole?:
        string;

    history:
        Array<{
            status:
                AppointmentHistoryStatus;

            at:
                Date;

            by?:
                mongoose.Types.ObjectId;

            note?:
                string;
        }>;

    createdAt?:
        Date;

    updatedAt?:
        Date;
}

/* ============================================================
   HISTORY SCHEMA
============================================================ */

const HistorySchema =
    new Schema(
        {
            status: {
                type:
                    String,

                required:
                    true,
            },

            at: {
                type:
                    Date,

                default:
                    Date.now,
            },

            by: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "User",
            },

            note: {
                type:
                    String,

                trim:
                    true,
            },
        },
        {
            _id:
                false,
        },
    );

/* ============================================================
   APPOINTMENT SCHEMA
============================================================ */

const AppointmentSchema =
    new Schema<IAppointment>(
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

            doctorId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "User",

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

            slotId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "DoctorSlot",

                default:
                    null,

                index:
                    true,
            },

            appointmentCode: {
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

            appointmentDate: {
                type:
                    String,

                required:
                    true,

                index:
                    true,

                trim:
                    true,
            },

            requestedStartTime: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,
            },

            confirmedStartTime: {
                type:
                    String,

                default:
                    null,

                trim:
                    true,
            },

            endTime: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,
            },

            status: {
                type:
                    String,

                enum: [
                    "REQUESTED",
                    "BOOKED",
                    "CONFIRMED",
                    "ARRIVED",
                    "CHECKED_IN",
                    "IN_CONSULTATION",
                    "COMPLETED",
                    "CANCELLED",
                    "REJECTED",
                    "NO_SHOW",
                    "RESCHEDULE_REQUESTED",
                    "WAITLISTED",
                ],

                default:
                    "BOOKED",

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

            feeAmount: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },

            paidAmount: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },

            paymentMethod: {
                type:
                    String,

                enum: [
                    "CASH",
                    "UPI",
                    "CARD",
                    "OTHER",
                ],

                default:
                    null,
            },

            paidAt: {
                type:
                    Date,

                default:
                    null,
            },

            paymentCollectedBy: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,
            },

            confirmationRequired: {
                type:
                    Boolean,

                default:
                    false,
            },

            reason: {
                type:
                    String,

                trim:
                    true,
            },

            notes: {
                type:
                    String,

                trim:
                    true,
            },

            queueId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Queue",

                default:
                    null,

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

            cancelledAt: {
                type:
                    Date,

                default:
                    null,
            },

            cancellationReason: {
                type:
                    String,

                trim:
                    true,
            },

            rejectedReason: {
                type:
                    String,

                trim:
                    true,
            },

            noShowAt: {
                type:
                    Date,

                default:
                    null,
            },

            createdBy: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,
            },

            createdByRole: {
                type:
                    String,

                trim:
                    true,
            },

            history: {
                type: [
                    HistorySchema,
                ],

                default:
                    [],
            },
        },
        {
            timestamps:
                true,
        },
    );

/* ============================================================
   INDEXES
============================================================ */

AppointmentSchema.index({
    hospitalId:
        1,
    appointmentDate:
        1,
    doctorId:
        1,
});

AppointmentSchema.index({
    hospitalId:
        1,
    appointmentDate:
        1,
    status:
        1,
});

AppointmentSchema.index({
    hospitalId:
        1,
    patientId:
        1,
    appointmentDate:
        1,
});

AppointmentSchema.index({
    hospitalId:
        1,
    paymentStatus:
        1,
    appointmentDate:
        1,
});

/* ============================================================
   MODEL
============================================================ */

export const Appointment =
    mongoose.model<IAppointment>(
        "Appointment",
        AppointmentSchema,
    );