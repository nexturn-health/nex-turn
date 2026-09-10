import mongoose, {
    Schema,
    Document,
} from "mongoose";

/* ============================================================
   TYPES
============================================================ */

export type DoctorConsultationMode =
    | "OPD_ONLY"
    | "APPOINTMENT_ONLY"
    | "HYBRID"
    | "ON_CALL_APPOINTMENT";

export type WeekDay =
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";

export type DefaultSlotType =
    | "APPOINTMENT"
    | "WALK_IN";

/* ============================================================
   INTERFACE
============================================================ */

export interface IDoctorSchedule
    extends Document {

    hospitalId:
        mongoose.Types.ObjectId;

    doctorId:
        mongoose.Types.ObjectId;

    consultationMode:
        DoctorConsultationMode;

    appointmentEnabled:
        boolean;

    confirmationRequired:
        boolean;

    slotDurationMinutes:
        number;

    minimumNoticeMinutes:
        number;

    bookingWindowDays:
        number;

    gracePeriodMinutes:
        number;

    maxAppointmentsPerDay:
        number;

    maxWalkInsPerDay:
        number;

    emergencyBufferPerDay:
        number;

    timezone:
        string;

    hybridPattern:
        DefaultSlotType[];

    weeklyAvailability: Array<{
        day: WeekDay;

        isAvailable: boolean;

        sessions: Array<{
            startTime: string;
            endTime: string;
        }>;

        blockedPeriods: Array<{
            startTime: string;
            endTime: string;
            reason?: string;
        }>;
    }>;

    dateOverrides: Array<{
        date: string;

        isAvailable: boolean;

        reason?: string;

        sessions: Array<{
            startTime: string;
            endTime: string;
        }>;

        blockedPeriods: Array<{
            startTime: string;
            endTime: string;
            reason?: string;
        }>;
    }>;

    isActive:
        boolean;

    createdAt?: Date;

    updatedAt?: Date;
}

/* ============================================================
   SESSION
============================================================ */

const SessionSchema =
    new Schema(
        {
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
                ],
                default:
                    "APPOINTMENT",
            },
        },
        {
            _id:
                false,
        },
    );

/* ============================================================
   BLOCKED PERIOD / LUNCH / BREAK
============================================================ */

const BlockedPeriodSchema =
    new Schema(
        {
            startTime: {
                type: String,
                required: true,
                trim: true,
            },

            endTime: {
                type: String,
                required: true,
                trim: true,
            },

            reason: {
                type: String,
                trim: true,
                default: "Lunch break",
            },
        },
        {
            _id: false,
        },
    );

/* ============================================================
   WEEKLY
============================================================ */

const WeeklyAvailabilitySchema =
    new Schema(
        {
            day: {
                type: String,

                enum: [
                    "MONDAY",
                    "TUESDAY",
                    "WEDNESDAY",
                    "THURSDAY",
                    "FRIDAY",
                    "SATURDAY",
                    "SUNDAY",
                ],

                required: true,
            },

            isAvailable: {
                type: Boolean,
                default: false,
            },

            sessions: {
                type: [
                    SessionSchema,
                ],

                default: [],
            },

            blockedPeriods: {
                type: [
                    BlockedPeriodSchema,
                ],

                default: [],
            },
        },
        {
            _id: false,
        },
    );

/* ============================================================
   DATE OVERRIDE
============================================================ */

const DateOverrideSchema =
    new Schema(
        {
            date: {
                type: String,
                required: true,
            },

            isAvailable: {
                type: Boolean,
                default: true,
            },

            reason: {
                type: String,
                trim: true,
            },

            sessions: {
                type: [
                    SessionSchema,
                ],

                default: [],
            },

            blockedPeriods: {
                type: [
                    BlockedPeriodSchema,
                ],

                default: [],
            },
        },
        {
            _id: false,
        },
    );

/* ============================================================
   MAIN
============================================================ */

const DoctorScheduleSchema =
    new Schema<IDoctorSchedule>(
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

            consultationMode: {
                type: String,

                enum: [
                    "OPD_ONLY",
                    "APPOINTMENT_ONLY",
                    "HYBRID",
                    "ON_CALL_APPOINTMENT",
                ],

                default:
                    "HYBRID",
            },

            appointmentEnabled: {
                type: Boolean,

                default:
                    true,
            },

            confirmationRequired: {
                type: Boolean,

                default:
                    false,
            },

            slotDurationMinutes: {
                type: Number,

                min: 5,

                max: 120,

                default:
                    15,
            },

            minimumNoticeMinutes: {
                type: Number,

                min: 0,

                default:
                    30,
            },

            bookingWindowDays: {
                type: Number,

                min: 1,

                max: 365,

                default:
                    30,
            },

            gracePeriodMinutes: {
                type: Number,

                min: 0,

                default:
                    15,
            },

            maxAppointmentsPerDay: {
                type: Number,

                min: 0,

                default:
                    20,
            },

            maxWalkInsPerDay: {
                type: Number,

                min: 0,

                default:
                    40,
            },

            emergencyBufferPerDay: {
                type: Number,

                min: 0,

                default:
                    2,
            },

            timezone: {
                type: String,

                default:
                    "Asia/Kolkata",
            },

            hybridPattern: {
                type: [
                    String,
                ],

                enum: [
                    "APPOINTMENT",
                    "WALK_IN",
                ],

                default: [
                    "APPOINTMENT",
                    "WALK_IN",
                ],
            },

            weeklyAvailability: {
                type: [
                    WeeklyAvailabilitySchema,
                ],

                default: [],
            },

            dateOverrides: {
                type: [
                    DateOverrideSchema,
                ],

                default: [],
            },

            isActive: {
                type: Boolean,

                default:
                    true,

                index:
                    true,
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

DoctorScheduleSchema.index(
    {
        hospitalId: 1,
        doctorId: 1,
    },
    {
        unique: true,
    },
);

DoctorScheduleSchema.index({
    hospitalId: 1,
    isActive: 1,
});

DoctorScheduleSchema.index({
    hospitalId: 1,
    doctorId: 1,
    isActive: 1,
});

/* ============================================================
   MODEL
============================================================ */

export const DoctorSchedule =
    mongoose.model<IDoctorSchedule>(
        "DoctorSchedule",
        DoctorScheduleSchema,
    );