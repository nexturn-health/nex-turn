import mongoose, {
    Schema,
    Document,
} from "mongoose";

export interface IDoctorAttendance extends Document {
    hospitalId: mongoose.Types.ObjectId;
    doctorId: mongoose.Types.ObjectId;

    attendanceDate: string;

    scheduledStartTime: string | null;
    scheduledEndTime: string | null;

    firstOnlineAt: Date | null;
    lastSeenAt: Date | null;

    isOnline: boolean;
    lateByMinutes: number;

    createdAt: Date;
    updatedAt: Date;
}

const DoctorAttendanceSchema =
    new Schema<IDoctorAttendance>(
        {
            hospitalId: {
                type: Schema.Types.ObjectId,
                ref: "Hospital",
                required: true,
                index: true,
            },

            doctorId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true,
            },

            attendanceDate: {
                type: String,
                required: true,
                index: true,
            },

            scheduledStartTime: {
                type: String,
                default: null,
            },

            scheduledEndTime: {
                type: String,
                default: null,
            },

            firstOnlineAt: {
                type: Date,
                default: null,
            },

            lastSeenAt: {
                type: Date,
                default: null,
            },

            isOnline: {
                type: Boolean,
                default: false,
                index: true,
            },

            lateByMinutes: {
                type: Number,
                default: 0,
            },
        },
        {
            timestamps: true,
        },
    );

DoctorAttendanceSchema.index(
    {
        hospitalId: 1,
        doctorId: 1,
        attendanceDate: 1,
    },
    {
        unique: true,
    },
);

export const DoctorAttendance =
    mongoose.model<IDoctorAttendance>(
        "DoctorAttendance",
        DoctorAttendanceSchema,
    );