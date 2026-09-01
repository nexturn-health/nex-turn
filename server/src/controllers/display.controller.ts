import type { Request, Response } from "express";
import crypto from "crypto";

import { Queue } from "../models/Queue.model";
import { DisplayConfig } from "../models/DisplayConfig.model";
import { User } from "../models/User.model";

// =====================================================
// DISPLAY LANGUAGE
// =====================================================

export type DisplayLanguage = "EN" | "HI" | "BN" | "MR" | "TA" | "TE" | "KN" | "GU" | "PA" | "ML";

const ALLOWED_LANGUAGES: DisplayLanguage[] = ["EN", "HI", "BN", "MR", "TA", "TE", "KN", "GU", "PA", "ML"];

const isDisplayLanguage = (value: unknown): value is DisplayLanguage => {
    return typeof value === "string" && ALLOWED_LANGUAGES.includes(value as DisplayLanguage);
};

const getFrontendUrl = (): string => {
    return process.env.FRONTEND_URL || "http://localhost:5173";
};

// =====================================================
// CREATE DISPLAY
// POST /api/display
// ADMIN ONLY
// =====================================================

export const createDisplay = async (req: Request, res: Response) => {
    try {
        const hospitalId = req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message: "Hospital ID not found in logged-in user",
            });
        }

        // CHECK EXISTING DISPLAY

        const existing = await DisplayConfig.findOne({ hospitalId });

        if (existing) {
            const displayUrl = `${getFrontendUrl()}/display/${existing.displayKey}`;

            return res.status(200).json({
                success: true,
                message: "Display already exists",
                display: existing,
                displayKey: existing.displayKey,
                displayUrl,
            });
        }

        const {
            hospitalName,
            heading,
            logoUrl,
            primaryColor,
            secondaryColor,
            displayLanguage,
            voiceEnabled,
            announcementEnabled,
            announcementRepeat,
            showEmergency,
            showReferred,
            showWaiting,
            showNext,
            showCurrent,
        } = req.body || {};

        const language: DisplayLanguage = isDisplayLanguage(displayLanguage) ? displayLanguage : "EN";

        const repeat = announcementRepeat === undefined ? 2 : Number(announcementRepeat);

        if (!Number.isInteger(repeat) || repeat < 1 || repeat > 5) {
            return res.status(400).json({
                success: false,
                message: "announcementRepeat must be between 1 and 5",
            });
        }

        const displayKey = crypto.randomBytes(32).toString("hex");

        const display = await DisplayConfig.create({
            hospitalId,
            displayKey,
            hospitalName:
                typeof hospitalName === "string" && hospitalName.trim() ? hospitalName.trim() : "NexTurn Hospital",
            heading: typeof heading === "string" && heading.trim() ? heading.trim() : "Hospital Queue",
            logoUrl: typeof logoUrl === "string" ? logoUrl.trim() : "",
            primaryColor: typeof primaryColor === "string" && primaryColor.trim() ? primaryColor.trim() : "#2563EB",
            secondaryColor:
                typeof secondaryColor === "string" && secondaryColor.trim() ? secondaryColor.trim() : "#0F172A",
            displayLanguage: language,
            voiceEnabled: typeof voiceEnabled === "boolean" ? voiceEnabled : true,
            announcementEnabled: typeof announcementEnabled === "boolean" ? announcementEnabled : true,
            announcementRepeat: repeat,
            showEmergency: typeof showEmergency === "boolean" ? showEmergency : true,
            showReferred: typeof showReferred === "boolean" ? showReferred : true,
            showWaiting: typeof showWaiting === "boolean" ? showWaiting : true,
            showNext: typeof showNext === "boolean" ? showNext : true,
            showCurrent: typeof showCurrent === "boolean" ? showCurrent : true,
            isActive: true,
        });

        const displayUrl = `${getFrontendUrl()}/display/${displayKey}`;

        return res.status(201).json({
            success: true,
            message: "Display created successfully",
            display,
            displayKey,
            displayUrl,
        });
    } catch (error: unknown) {
        console.error("CREATE DISPLAY ERROR:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return res.status(500).json({
            success: false,
            message: "Failed to create display",
            error: errorMessage,
        });
    }
};

// =====================================================
// GET PUBLIC DISPLAY BOARD
// GET /api/display/:displayKey
// PUBLIC
// =====================================================

export const getPublicDisplayBoard = async (req: Request, res: Response) => {
    try {
        const { displayKey } = req.params;

        if (!displayKey) {
            return res.status(400).json({
                success: false,
                message: "Display key is required",
            });
        }

        const config = await DisplayConfig.findOne({ displayKey }).lean();

        if (!config) {
            return res.status(404).json({
                success: false,
                message: "Display not found",
            });
        }

        if (config.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "Display is inactive",
            });
        }

        const hospitalId = config.hospitalId;
        const today = new Date().toISOString().split("T")[0];

        // DOCTOR PRESENCE

        const doctors = await User.find({
            hospitalId: config.hospitalId,
            role: "DOCTOR",
            isActive: true,
        })
            .select("_id name isOnline lastSeenAt")
            .lean();

        const onlineDoctor = doctors.find((doctor) => doctor.isOnline === true);
        const selectedDoctor = onlineDoctor || doctors[0] || null;

        // GLOBAL DOCTOR STATUS

        const doctorId = selectedDoctor ? String(selectedDoctor._id) : null;
        const doctorName = selectedDoctor?.name || "Doctor";
        const doctorOnline = selectedDoctor?.isOnline === true;
        const doctorLastSeenAt = selectedDoctor?.lastSeenAt ?? null;

        // QUEUES

        const queues = await Queue.find({
            hospitalId,
            queueDate: today,
            status: { $in: ["WAITING", "CALLED", "SERVING"] },
        })
            .populate("departmentId", "name tokenPrefix")
            .populate("doctorId", "name isOnline lastSeenAt")
            .sort({ priority: -1, tokenNumber: 1 })
            .lean();

        const current = queues.filter((queue) => queue.status === "SERVING" || queue.status === "CALLED");
        const waiting = queues.filter((queue) => queue.status === "WAITING");
        const next = waiting.slice(0, 8);
        const emergency = queues.filter((queue) => queue.priority === "EMERGENCY");

        // ADD DOCTOR STATUS TO CURRENT QUEUES
        //
        // Queue doctor status is kept for cards, but the GLOBAL doctorOnline
        // above is independent.

        const currentWithDoctorStatus = current.map((queue) => {
            let queueDoctorId: string | null = null;

            if (queue.doctorId) {
                queueDoctorId =
                    typeof queue.doctorId === "object" && "_id" in queue.doctorId
                        ? String(queue.doctorId._id)
                        : String(queue.doctorId);
            }

            const queueDoctor = doctors.find((doctor) => String(doctor._id) === queueDoctorId);

            return {
                ...queue,
                doctorOnline: queueDoctor ? queueDoctor.isOnline === true : false,
                doctorLastSeenAt: queueDoctor?.lastSeenAt ?? null,
            };
        });

        const display = {
            hospitalName: config.hospitalName,
            heading: config.heading,
            logoUrl: config.logoUrl,
            primaryColor: config.primaryColor,
            secondaryColor: config.secondaryColor,
            displayLanguage: config.displayLanguage,
            voiceEnabled: config.voiceEnabled,
            announcementEnabled: config.announcementEnabled,
            announcementRepeat: config.announcementRepeat,
            showEmergency: config.showEmergency,
            showReferred: config.showReferred,
            showWaiting: config.showWaiting,
            showNext: config.showNext,
            showCurrent: config.showCurrent,
        };

        // FINAL RESPONSE
        //
        // IMPORTANT: doctorOnline is TOP-LEVEL. Frontend should use
        // displayData.doctorOnline, NOT currentQueue.doctorOnline.

        return res.status(200).json({
            success: true,
            display,

            // DOCTOR PRESENCE
            doctorId,
            doctorName,
            doctorOnline,
            doctorLastSeenAt,

            // QUEUES
            current: currentWithDoctorStatus,
            next,
            waiting,
            emergency,
        });
    } catch (error) {
        console.error("GET PUBLIC DISPLAY BOARD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load display board",
        });
    }
};

// =====================================================
// GET DISPLAY CONFIG
// GET /api/display/config
// ADMIN
// =====================================================

export const getDisplayConfig = async (req: Request, res: Response) => {
    try {
        const hospitalId = req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message: "Hospital not found",
            });
        }

        const display = await DisplayConfig.findOne({ hospitalId }).lean();

        if (!display) {
            return res.status(404).json({
                success: false,
                message: "Display configuration not found",
            });
        }

        return res.status(200).json({
            success: true,
            display,
            displayUrl: `${getFrontendUrl()}/display/${display.displayKey}`,
        });
    } catch (error) {
        console.error("GET DISPLAY CONFIG ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get display configuration",
        });
    }
};

// =====================================================
// UPDATE DISPLAY CONFIG
// PUT /api/display/config
// ADMIN
// =====================================================

export const updateDisplayConfig = async (req: Request, res: Response) => {
    try {
        const hospitalId = req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message: "Hospital not found",
            });
        }

        const display = await DisplayConfig.findOne({ hospitalId });

        if (!display) {
            return res.status(404).json({
                success: false,
                message: "Display configuration not found",
            });
        }

        const {
            hospitalName,
            heading,
            logoUrl,
            primaryColor,
            secondaryColor,
            displayLanguage,
            voiceEnabled,
            announcementEnabled,
            announcementRepeat,
            showEmergency,
            showReferred,
            showWaiting,
            showNext,
            showCurrent,
            isActive,
        } = req.body;

        // BASIC SETTINGS

        if (typeof hospitalName === "string") display.hospitalName = hospitalName.trim();
        if (typeof heading === "string") display.heading = heading.trim();
        if (typeof logoUrl === "string") display.logoUrl = logoUrl.trim();
        if (typeof primaryColor === "string") display.primaryColor = primaryColor;
        if (typeof secondaryColor === "string") display.secondaryColor = secondaryColor;

        // LANGUAGE

        if (displayLanguage !== undefined) {
            if (!isDisplayLanguage(displayLanguage)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid display language",
                });
            }

            display.displayLanguage = displayLanguage;
        }

        // VOICE

        if (typeof voiceEnabled === "boolean") display.voiceEnabled = voiceEnabled;
        if (typeof announcementEnabled === "boolean") display.announcementEnabled = announcementEnabled;

        // ANNOUNCEMENT REPEAT

        if (announcementRepeat !== undefined) {
            const repeat = Number(announcementRepeat);

            if (!Number.isInteger(repeat) || repeat < 1 || repeat > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Announcement repeat must be between 1 and 5",
                });
            }

            display.announcementRepeat = repeat;
        }

        // DISPLAY SECTIONS

        if (typeof showEmergency === "boolean") display.showEmergency = showEmergency;
        if (typeof showReferred === "boolean") display.showReferred = showReferred;
        if (typeof showWaiting === "boolean") display.showWaiting = showWaiting;
        if (typeof showNext === "boolean") display.showNext = showNext;
        if (typeof showCurrent === "boolean") display.showCurrent = showCurrent;

        // ACTIVE

        if (typeof isActive === "boolean") display.isActive = isActive;

        await display.save();

        return res.status(200).json({
            success: true,
            message: "Display settings updated",
            display,
            displayUrl: `${getFrontendUrl()}/display/${display.displayKey}`,
        });
    } catch (error) {
        console.error("UPDATE DISPLAY CONFIG ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update display",
        });
    }
};

// =====================================================
// REGENERATE DISPLAY KEY
// POST /api/display/regenerate-key
// ADMIN
// =====================================================

export const regenerateDisplayKey = async (req: Request, res: Response) => {
    try {
        const hospitalId = req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message: "Hospital not found",
            });
        }

        const display = await DisplayConfig.findOne({ hospitalId });

        if (!display) {
            return res.status(404).json({
                success: false,
                message: "Display configuration not found",
            });
        }

        display.displayKey = crypto.randomBytes(32).toString("hex");

        await display.save();

        const displayUrl = `${getFrontendUrl()}/display/${display.displayKey}`;

        return res.status(200).json({
            success: true,
            message: "Display key regenerated",
            displayKey: display.displayKey,
            displayUrl,
        });
    } catch (error) {
        console.error("REGENERATE DISPLAY KEY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to regenerate display key",
        });
    }
};