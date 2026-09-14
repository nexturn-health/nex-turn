import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";
import { SuperAdminNotification } from "../models/SuperAdminNotification.model";

export const getSuperAdminNotifications = async (
    req: Request,
    res: Response,
) => {
    try {
        const notifications =
            await SuperAdminNotification.find()
                .sort({
                    createdAt: -1,
                })
                .limit(50)
                .lean();

        const unreadCount =
            await SuperAdminNotification.countDocuments({
                isRead: false,
            });

        return res.status(200).json({
            success: true,
            data: {
                notifications,
                unreadCount,
            },
        });
    } catch (error) {
        console.log(
            "GET SUPER ADMIN NOTIFICATIONS ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load notifications.",
        });
    }
};

export const markSuperAdminNotificationRead = async (
    req: Request,
    res: Response,
) => {
    try {
        const rawId = req.params.id;

        const id =
            Array.isArray(rawId)
                ? rawId[0]
                : rawId;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification id.",
            });
        }

        const notification =
            await SuperAdminNotification.findByIdAndUpdate(
                id,
                {
                    isRead: true,
                },
                {
                    new: true,
                },
            );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read.",
            data: notification,
        });
    } catch (error) {
        console.log(
            "MARK NOTIFICATION READ ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update notification.",
        });
    }
};

export const markAllSuperAdminNotificationsRead = async (
    req: Request,
    res: Response,
) => {
    try {
        await SuperAdminNotification.updateMany(
            {
                isRead: false,
            },
            {
                isRead: true,
            },
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
        });
    } catch (error) {
        console.log(
            "MARK ALL NOTIFICATIONS READ ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update notifications.",
        });
    }
};