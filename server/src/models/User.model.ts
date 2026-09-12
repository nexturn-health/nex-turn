import mongoose, {
    Schema,
    Document,
} from "mongoose";

// ============================================================
// USER ROLE
// ============================================================

export type UserRole =
    | "SUPER_ADMIN"
    | "HOSPITAL_ADMIN"
    | "RECEPTIONIST"
    | "DOCTOR"
    | "LAB_TECHNICIAN";

// ============================================================
// USER INTERFACE
// ============================================================

export interface IUser extends Document {
    name: string;

    email: string;

    password: string;

    phone?: string;

    role: UserRole;

    // ========================================================
    // HOSPITAL
    // ========================================================

    hospitalId: mongoose.Types.ObjectId;

    // ========================================================
    // DOCTOR DEPARTMENT
    // ========================================================
    //
    // Used for normal hospital/doctor departments such as:
    //
    // Cardiology
    // Neurology
    // General Medicine
    //
    // Do NOT use this for laboratory departments.
    //

    departmentId?: mongoose.Types.ObjectId;

    // ========================================================
    // LAB TECHNICIAN ASSIGNMENT
    // ========================================================
    //
    // Used only when role === LAB_TECHNICIAN
    //
    // Example:
    //
    // labDepartmentId → Hematology
    // labRoomId       → H-01
    //

    labDepartmentId?: mongoose.Types.ObjectId;

    labRoomId?: mongoose.Types.ObjectId;

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    isActive: boolean;

    // ========================================================
    // DOCTOR ONLINE STATUS
    // ========================================================

    isOnline: boolean;

    lastSeenAt?: Date;

    offlineSince?: Date | null;

    // ========================================================
    // CONSULTATION SETTINGS
    // ========================================================

    averageConsultationMinutes: number;

    shiftStartTime?: string | null;

    // ========================================================
    // PASSWORD RESET
    // ========================================================

    resetPasswordToken?: string;

    resetPasswordExpires?: Date;

    // ========================================================
    // TIMESTAMPS
    // ========================================================

    createdAt: Date;

    updatedAt: Date;
    isOnBreak?: boolean;
    breakStartedAt?: Date | null;
    breakReason?: string | null;
    lastResumedAt?: Date | null;
    shiftEndTime?: string | null;
}

// ============================================================
// USER SCHEMA
// ============================================================

const UserSchema = new Schema<IUser>(
    {
        // ======================================================
        // BASIC INFORMATION
        // ======================================================

        name: {
            type: String,

            required: true,

            trim: true,
        },

        email: {
            type: String,

            required: true,

            unique: true,

            lowercase: true,

            trim: true,
        },

        password: {
            type: String,

            required: true,

            minlength: 6,
        },

        phone: {
            type: String,

            default: "",

            trim: true,
        },

        // ======================================================
        // ROLE
        // ======================================================

        role: {
            type: String,

            enum: [
                "SUPER_ADMIN",
                "HOSPITAL_ADMIN",
                "DOCTOR",
                "RECEPTIONIST",
                "LAB_TECHNICIAN",
            ],

            required: true,

            index: true,
        },

        // ======================================================
        // HOSPITAL
        // ======================================================

        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,

            ref: "Hospital",

            required: function () {
                return this.role !== "SUPER_ADMIN";
            },

            index: true,
        },

        // ======================================================
        // DOCTOR DEPARTMENT
        // ======================================================
        //
        // Existing department system for doctors.
        //
        // Example:
        // Cardiology
        // Neurology
        // General Medicine
        //

        departmentId: {
            type: Schema.Types.ObjectId,

            ref: "Department",

            required: false,

            index: true,
        },

        // ======================================================
        // LAB DEPARTMENT
        // ======================================================
        //
        // Used by LAB_TECHNICIAN.
        //
        // Example:
        // Hematology
        // Biochemistry
        // Pathology
        //

        labDepartmentId: {
            type: Schema.Types.ObjectId,

            ref: "LabDepartment",

            required: false,

            default: undefined,

            index: true,
        },

        // ======================================================
        // LAB ROOM
        // ======================================================
        //
        // Used by LAB_TECHNICIAN.
        //
        // Example:
        // H-01
        // B-01
        // P-01
        //

        labRoomId: {
            type: Schema.Types.ObjectId,

            ref: "LabRoom",

            required: false,

            default: undefined,

            index: true,
        },

        // ======================================================
        // ACCOUNT STATUS
        // ======================================================

        isActive: {
            type: Boolean,

            default: true,

            index: true,
        },

        // ======================================================
        // DOCTOR ONLINE STATUS
        // ======================================================

        isOnline: {
            type: Boolean,

            default: false,
        },

        lastSeenAt: {
            type: Date,

            default: undefined,
        },

        offlineSince: {
            type: Date,

            default: null,
        },

        // ======================================================
        // CONSULTATION SETTINGS
        // ======================================================

        averageConsultationMinutes: {
            type: Number,

            default: 8,

            min: 1,
        },

        shiftStartTime: {
            type: String,

            default: null,

            trim: true,
        },

        // ======================================================
        // PASSWORD RESET
        // ======================================================

        resetPasswordToken: {
            type: String,

            default: undefined,
        },

        resetPasswordExpires: {
            type: Date,

            default: undefined,
        },

        isOnBreak: {
            type: Boolean,
            default: false,
            index: true,
        },

        breakStartedAt: {
            type: Date,
            default: null,
        },

        breakReason: {
            type: String,
            trim: true,
            default: null,
        },

        lastResumedAt: {
            type: Date,
            default: null,
        },

        shiftEndTime: {
            type: String,
            trim: true,
            default: null,
        },
    },

    {
        timestamps: true,
    },
);

// ============================================================
// INDEXES
// ============================================================

// Lab technician lookup by department
UserSchema.index({
    hospitalId: 1,
    role: 1,
    labDepartmentId: 1,
});

// Lab technician lookup by room
UserSchema.index({
    hospitalId: 1,
    role: 1,
    labRoomId: 1,
});

// Exact technician assignment lookup
UserSchema.index({
    hospitalId: 1,
    role: 1,
    labDepartmentId: 1,
    labRoomId: 1,
});

// ============================================================
// MODEL
// ============================================================

export const User = mongoose.model<IUser>(
    "User",
    UserSchema,
);