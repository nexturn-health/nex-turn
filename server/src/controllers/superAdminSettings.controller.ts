import type {
    Request,
    Response,
} from "express";

import {
    PlatformSettings,
    type IPlatformSettings,
} from "../models/PlatformSettings.model";

const SETTINGS_KEY = "GLOBAL";

const DEFAULT_SETTINGS:
    Omit<IPlatformSettings, "createdAt" | "updatedAt"> = {
        key: "GLOBAL",

        platformName: "NexTurn Health",
        supportEmail: "",
        supportPhone: "",
        defaultCountry: "India",

        defaultPlan: "BASIC",
        trialDays: 14,

        allowHospitalRegistration: true,
        maintenanceMode: false,

        whatsappNotificationsEnabled: true,
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: true,
    };

const getOrCreateSettings = async () => {
    let settings =
        await PlatformSettings.findOne({
            key: SETTINGS_KEY,
        }).lean();

    if (!settings) {
        await PlatformSettings.create(
            DEFAULT_SETTINGS,
        );

        settings =
            await PlatformSettings.findOne({
                key: SETTINGS_KEY,
            }).lean();
    }

    return settings;
};

export const getSuperAdminSettings = async (
    _req: Request,
    res: Response,
) => {
    try {
        const settings =
            await getOrCreateSettings();

        return res.status(200).json({
            success: true,
            data: {
                settings,
            },
        });
    } catch (error) {
        console.error(
            "GET SUPER ADMIN SETTINGS ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load platform settings",
        });
    }
};

export const updateSuperAdminSettings = async (
    req: Request,
    res: Response,
) => {
    try {
        const body =
            req.body as Partial<IPlatformSettings>;

        const updates:
            Partial<IPlatformSettings> = {};

        if (typeof body.platformName === "string") {
            updates.platformName =
                body.platformName.trim().slice(0, 100);
        }

        if (typeof body.supportEmail === "string") {
            updates.supportEmail =
                body.supportEmail.trim().toLowerCase().slice(0, 150);
        }

        if (typeof body.supportPhone === "string") {
            updates.supportPhone =
                body.supportPhone.trim().slice(0, 30);
        }

        if (typeof body.defaultCountry === "string") {
            updates.defaultCountry =
                body.defaultCountry.trim().slice(0, 80);
        }

        if (
            body.defaultPlan === "BASIC" ||
            body.defaultPlan === "PREMIUM"
        ) {
            updates.defaultPlan = body.defaultPlan;
        }

        if (body.trialDays !== undefined) {
            const trialDays = Number(body.trialDays);

            if (
                !Number.isInteger(trialDays) ||
                trialDays < 0 ||
                trialDays > 90
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Trial days must be between 0 and 90",
                });
            }

            updates.trialDays = trialDays;
        }

        if (
            typeof body.allowHospitalRegistration ===
            "boolean"
        ) {
            updates.allowHospitalRegistration =
                body.allowHospitalRegistration;
        }

        if (typeof body.maintenanceMode === "boolean") {
            updates.maintenanceMode =
                body.maintenanceMode;
        }

        if (
            typeof body.whatsappNotificationsEnabled ===
            "boolean"
        ) {
            updates.whatsappNotificationsEnabled =
                body.whatsappNotificationsEnabled;
        }

        if (
            typeof body.emailNotificationsEnabled ===
            "boolean"
        ) {
            updates.emailNotificationsEnabled =
                body.emailNotificationsEnabled;
        }

        if (
            typeof body.smsNotificationsEnabled ===
            "boolean"
        ) {
            updates.smsNotificationsEnabled =
                body.smsNotificationsEnabled;
        }

        let settings =
            await PlatformSettings.findOne({
                key: "GLOBAL",
            });

        if (!settings) {
            settings =
                await PlatformSettings.create({
                    key: "GLOBAL",
                    ...updates,
                });
        } else {
            Object.assign(settings, updates);

            await settings.save();
        }

        return res.status(200).json({
            success: true,
            message:
                "Platform settings updated successfully",
            data: {
                settings,
            },
        });
    } catch (error) {
        console.error(
            "UPDATE PLATFORM SETTINGS ERROR:",
            error instanceof Error
                ? error.stack
                : error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update platform settings",
        });
    }
};