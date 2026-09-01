import mongoose, {
    Schema,
    Document,
} from "mongoose";

export type UserRole =
    | "SUPER_ADMIN"
    | "HOSPITAL_ADMIN"
    | "DOCTOR"
    | "RECEPTIONIST";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: UserRole;

    hospitalId: mongoose.Types.ObjectId;

    departmentId?: mongoose.Types.ObjectId;

    isActive: boolean;

    // ========================================
    // DOCTOR ONLINE STATUS
    // ========================================

    isOnline: boolean;

    lastSeenAt?: Date;

    // ========================================
    // PASSWORD RESET
    // ========================================

    resetPasswordToken?: string;

    resetPasswordExpires?: Date;

    createdAt: Date;

    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
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

        role: {
            type: String,
            enum: [
                "SUPER_ADMIN",
                "HOSPITAL_ADMIN",
                "DOCTOR",
                "RECEPTIONIST",
            ],
            required: true,
        },

        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: function () {
                return this.role !== "SUPER_ADMIN";
            },
        },

        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            required: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        // ========================================
        // DOCTOR ONLINE STATUS
        // ========================================

        isOnline: {
            type: Boolean,
            default: false,
        },

        lastSeenAt: {
            type: Date,
            default: undefined,
        },

        // ========================================
        // PASSWORD RESET
        // ========================================

        resetPasswordToken: {
            type: String,
            default: undefined,
        },

        resetPasswordExpires: {
            type: Date,
            default: undefined,
        },
    },
    {
        timestamps: true,
    },
);

export const User = mongoose.model<IUser>(
    "User",
    UserSchema,
);