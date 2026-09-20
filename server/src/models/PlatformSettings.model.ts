import mongoose, {
    Schema,
} from "mongoose";

export type PlatformPlan =
    | "BASIC"
    | "PREMIUM";

export interface IPlatformSettings {
    key: "GLOBAL";

    platformName: string;
    supportEmail: string;
    supportPhone: string;
    defaultCountry: string;

    defaultPlan: PlatformPlan;
    trialDays: number;

    allowHospitalRegistration: boolean;
    maintenanceMode: boolean;

    whatsappNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    smsNotificationsEnabled: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

const PlatformSettingsSchema =
    new Schema<IPlatformSettings>(
        {
            key: {
                type: String,
                default: "GLOBAL",
                unique: true,
                enum: ["GLOBAL"],
            },

            platformName: {
                type: String,
                default: "NexTurn Health",
                trim: true,
                maxlength: 100,
            },

            supportEmail: {
                type: String,
                default: "",
                trim: true,
                lowercase: true,
            },

            supportPhone: {
                type: String,
                default: "",
                trim: true,
            },

            defaultCountry: {
                type: String,
                default: "India",
                trim: true,
            },

            defaultPlan: {
                type: String,
                enum: ["BASIC", "PREMIUM"],
                default: "BASIC",
            },

            trialDays: {
                type: Number,
                default: 14,
                min: 0,
                max: 90,
            },

            allowHospitalRegistration: {
                type: Boolean,
                default: true,
            },

            maintenanceMode: {
                type: Boolean,
                default: false,
            },

            whatsappNotificationsEnabled: {
                type: Boolean,
                default: true,
            },

            emailNotificationsEnabled: {
                type: Boolean,
                default: true,
            },

            smsNotificationsEnabled: {
                type: Boolean,
                default: true,
            },
        },
        {
            timestamps: true,
        },
    );

export const PlatformSettings =
    mongoose.models.PlatformSettings ||
    mongoose.model<IPlatformSettings>(
        "PlatformSettings",
        PlatformSettingsSchema,
    );