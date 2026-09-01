import mongoose, { Schema, Document } from "mongoose";

// ========================================
// DISPLAY LANGUAGE
// ========================================

export type DisplayLanguage = "EN" | "HI" | "BN" | "MR" | "TA" | "TE" | "GU" | "KN" | "ML" | "PA";

// ========================================
// DISPLAY DOCUMENT
// ========================================

export interface IDisplayConfig extends Document {
    hospitalId: mongoose.Types.ObjectId;
    displayKey: string;
    hospitalName: string;
    heading: string;
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    displayLanguage: DisplayLanguage;
    voiceEnabled: boolean;
    announcementEnabled: boolean;
    announcementRepeat: number;
    showEmergency: boolean;
    showReferred: boolean;
    showWaiting: boolean;
    showNext: boolean;
    showCurrent: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ========================================
// SCHEMA
// ========================================

const displayConfigSchema = new Schema<IDisplayConfig>(
    {
        // HOSPITAL
        hospitalId: {
            type: Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
            unique: true,
            index: true,
        },

        // DISPLAY KEY
        displayKey: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        // BRANDING
        hospitalName: {
            type: String,
            required: true,
            default: "NexTurn Hospital",
            trim: true,
        },

        heading: {
            type: String,
            required: true,
            default: "Hospital Queue",
            trim: true,
        },

        logoUrl: {
            type: String,
            default: "",
            trim: true,
        },

        primaryColor: {
            type: String,
            default: "#2563EB",
        },

        secondaryColor: {
            type: String,
            default: "#0F172A",
        },

        // LANGUAGE
        displayLanguage: {
            type: String,
            enum: ["EN", "HI", "BN", "MR", "TA", "TE", "GU", "KN", "ML", "PA"],
            default: "EN",
        },

        // VOICE
        voiceEnabled: {
            type: Boolean,
            default: true,
        },

        announcementEnabled: {
            type: Boolean,
            default: true,
        },

        announcementRepeat: {
            type: Number,
            min: 1,
            max: 5,
            default: 2,
        },

        // DISPLAY SECTIONS
        showEmergency: {
            type: Boolean,
            default: true,
        },

        showReferred: {
            type: Boolean,
            default: true,
        },

        showWaiting: {
            type: Boolean,
            default: true,
        },

        showNext: {
            type: Boolean,
            default: true,
        },

        showCurrent: {
            type: Boolean,
            default: true,
        },

        // ACTIVE
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
);

// ========================================
// MODEL
// ========================================

export const DisplayConfig =
    mongoose.models.DisplayConfig || mongoose.model<IDisplayConfig>("DisplayConfig", displayConfigSchema);

export default DisplayConfig;