import type {
    NextFunction,
    Request,
    Response,
} from "express";

import rateLimit from "express-rate-limit";

const suspiciousPatterns = [
    /https?:\/\//i,
    /www\./i,
    /casino/i,
    /loan/i,
    /crypto/i,
    /betting/i,
    /telegram/i,
    /whatsapp group/i,
    /seo service/i,
];

export const contactRateLimit =
    rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        limit: 5, // max 5 submissions per IP per hour
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message:
                "Too many demo requests. Please try again later.",
        },
    });

export const contactSecurityCheck = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const honeypot =
        String(req.body.website || "").trim();

    // Hidden field. Real users will not fill it. Bots usually fill it.
    if (honeypot) {
        return res.status(400).json({
            success: false,
            message: "Invalid request.",
        });
    }

    const formStartedAt =
        Number(req.body.formStartedAt || 0);

    const now =
        Date.now();

    const timeTaken =
        now - formStartedAt;

    // Bot submits too fast.
    if (
        !formStartedAt ||
        Number.isNaN(formStartedAt) ||
        timeTaken < 3000
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Please wait a few seconds before submitting the form.",
        });
    }

    // Very old form submit.
    if (timeTaken > 30 * 60 * 1000) {
        return res.status(400).json({
            success: false,
            message:
                "Form expired. Please refresh and submit again.",
        });
    }

    const message =
        String(req.body.message || "");

    const isSuspicious =
        suspiciousPatterns.some((pattern) =>
            pattern.test(message),
        );

    if (isSuspicious) {
        return res.status(400).json({
            success: false,
            message:
                "Your message contains unsupported content.",
        });
    }

    next();
};