import mongoose, {
    Schema,
    Document,
} from "mongoose";

export type DoctorSlotType =
    | "APPOINTMENT"
    | "WALK_IN"
    | "BUFFER";

export type DoctorSlotStatus =
    | "AVAILABLE"
    | "HELD"
    | "BOOKED"
    | "BLOCKED"
    | "COMPLETED"
    | "MISSED";

export interface IDoctorSlot
    extends Document {

    hospitalId:
        mongoose.Types.ObjectId;

    doctorId:
        mongoose.Types.ObjectId;

    date:
        string;

    startTime:
        string;

    endTime:
        string;

    slotType:
        DoctorSlotType;

    status:
        DoctorSlotStatus;

    appointmentId?:
        mongoose.Types.ObjectId | null;

    patientId?:
        mongoose.Types.ObjectId | null;

    blockReason?:
        string;

    source:
        "AUTO" | "MANUAL";

    holdToken?:
        string | null;

    holdExpiresAt?:
        Date | null;
}

const DoctorSlotSchema =
    new Schema<IDoctorSlot>(
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

            date: {
                type:
                    String,

                required:
                    true,

                index:
                    true,
            },

            startTime: {
                type:
                    String,

                required:
                    true,
            },

            endTime: {
                type:
                    String,

                required:
                    true,
            },

            slotType: {
                type:
                    String,

                enum: [
                    "APPOINTMENT",
                    "WALK_IN",
                    "BUFFER",
                ],

                required:
                    true,
            },

            status: {
                type:
                    String,

                enum: [
                    "AVAILABLE",
                    "HELD",
                    "BOOKED",
                    "BLOCKED",
                    "COMPLETED",
                    "MISSED",
                ],

                default:
                    "AVAILABLE",

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
            },

            patientId: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Patient",

                default:
                    null,
            },

            blockReason: {
                type:
                    String,

                trim:
                    true,
            },

            source: {
                type:
                    String,

                enum: [
                    "AUTO",
                    "MANUAL",
                ],

                default:
                    "AUTO",
            },

            holdToken: {
                type:
                    String,

                trim:
                    true,

                default:
                    null,

                index:
                    true,

                // Prevent accidental exposure in normal queries.
                select:
                    false,
            },

            holdExpiresAt: {
                type:
                    Date,

                default:
                    null,

                index:
                    true,
            },
        },
        {
            timestamps:
                true,
        },
    );

/*
 * Prevent duplicate slots for the same doctor and time.
 */
DoctorSlotSchema.index(
    {
        hospitalId: 1,
        doctorId: 1,
        date: 1,
        startTime: 1,
    },
    {
        unique:
            true,
    },
);

/*
 * Speeds up public slot lookup.
 */
DoctorSlotSchema.index({
    hospitalId: 1,
    doctorId: 1,
    date: 1,
    slotType: 1,
    status: 1,
});

/*
 * Speeds up expired hold cleanup.
 */
DoctorSlotSchema.index({
    status: 1,
    holdExpiresAt: 1,
});

export const DoctorSlot =
    mongoose.model<IDoctorSlot>(
        "DoctorSlot",
        DoctorSlotSchema,
    );