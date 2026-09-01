import type { Request, Response } from "express";

import { sendSMS } from "../services/sms.service";

export const testSMS = async (
    req: Request,
    res: Response,
) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
        }

        const result = await sendSMS(
            phone,
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error(
            "Test SMS error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Failed to send test SMS",
        });
    }
};