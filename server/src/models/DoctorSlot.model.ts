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
                type: String,

                required:
                    true,

                index:
                    true,
            },

            startTime: {
                type: String,

                required:
                    true,
            },

            endTime: {
                type: String,

                required:
                    true,
            },

            slotType: {
                type: String,

                enum: [
                    "APPOINTMENT",
                    "WALK_IN",
                    "BUFFER",
                ],

                required:
                    true,
            },

            status: {
                type: String,

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
                type: String,

                trim: true,
            },

            source: {
                type: String,

                enum: [
                    "AUTO",
                    "MANUAL",
                ],

                default:
                    "AUTO",
            },

            holdExpiresAt: {
                type: Date,

                default:
                    null,
            },
        },
        {
            timestamps:
                true,
        },
    );

DoctorSlotSchema.index(
    {
        hospitalId: 1,
        doctorId: 1,
        date: 1,
        startTime: 1,
    },
    {
        unique: true,
    },
);

export const DoctorSlot =
    mongoose.model<IDoctorSlot>(
        "DoctorSlot",
        DoctorSlotSchema,
    );