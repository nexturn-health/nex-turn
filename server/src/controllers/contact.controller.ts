import type {
    Request,
    Response,
} from "express";

import { Types } from "mongoose";

import { ContactLead } from "../models/ContactLead.model";
import { SuperAdminNotification } from "../models/SuperAdminNotification.model";

const cleanText = (
    value: unknown,
    maxLength = 500,
) => {
    return String(value || "")
        .trim()
        .slice(0, maxLength);
};

const normalizePhone = (
    value: unknown,
) => {
    const digits =
        String(value || "")
            .replace(/\D/g, "");

    if (digits.length > 10) {
        return digits.slice(-10);
    }

    return digits;
};

const isValidEmail = (
    email: string,
) => {
    if (!email) {
        return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const suspiciousPatterns = [
    /https?:\/\//i,
    /www\./i,
    /casino/i,
    /betting/i,
    /loan/i,
    /crypto/i,
    /telegram/i,
    /whatsapp group/i,
    /seo service/i,
    /backlink/i,
    /adult/i,
    /porn/i,
];

const hasSuspiciousContent = (
    value: string,
) => {
    return suspiciousPatterns.some((pattern) =>
        pattern.test(value),
    );
};

export const createContactLead = async (
    req: Request,
    res: Response,
) => {
    try {
        console.log("✅ CONTACT FORM HIT:", {
            phone: req.body.phone,
            source: req.body.source,
            time: new Date().toISOString(),
        });

        // ============================================================
        // BASIC BOT PROTECTION
        // ============================================================

        const honeypot =
            cleanText(req.body.website, 100);

        // Hidden field. Real users will not fill this.
        // Bots often fill every field.
        if (honeypot) {
            return res.status(400).json({
                success: false,
                code: "INVALID_CONTACT_REQUEST",
                message: "Invalid request.",
            });
        }

        const formStartedAt =
            Number(req.body.formStartedAt || 0);

        // This will not break old frontend.
        // When frontend sends formStartedAt, we validate timing.
        if (formStartedAt) {
            const timeTaken =
                Date.now() - formStartedAt;

            if (
                Number.isNaN(formStartedAt) ||
                timeTaken < 3000
            ) {
                return res.status(400).json({
                    success: false,
                    code: "CONTACT_FORM_TOO_FAST",
                    message:
                        "Please wait a few seconds before submitting the form.",
                });
            }

            if (timeTaken > 30 * 60 * 1000) {
                return res.status(400).json({
                    success: false,
                    code: "CONTACT_FORM_EXPIRED",
                    message:
                        "Form expired. Please refresh and submit again.",
                });
            }
        }

        // ============================================================
        // CLEAN INPUT
        // ============================================================

        const name =
            cleanText(req.body.name, 80);

        const phone =
            normalizePhone(req.body.phone);

        const email =
            cleanText(req.body.email, 120).toLowerCase();

        const organization =
            cleanText(req.body.organization, 120);

        const city =
            cleanText(req.body.city, 80);

        const interest =
            cleanText(req.body.interest, 80);

        const message =
            cleanText(req.body.message, 1000);

        const source =
            cleanText(
                req.body.source,
                80,
            ) || "WEBSITE_CONTACT_FORM";

        // ============================================================
        // VALIDATION
        // ============================================================

        if (!name) {
            return res.status(400).json({
                success: false,
                code: "CONTACT_NAME_REQUIRED",
                message: "Name is required.",
            });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                code: "CONTACT_INVALID_PHONE",
                message:
                    "Phone number must be exactly 10 digits.",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                code: "CONTACT_INVALID_EMAIL",
                message:
                    "Please enter a valid email address.",
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                code: "CONTACT_MESSAGE_REQUIRED",
                message: "Message is required.",
            });
        }

        if (message.length < 10) {
            return res.status(400).json({
                success: false,
                code: "CONTACT_MESSAGE_TOO_SHORT",
                message:
                    "Message should be at least 10 characters.",
            });
        }

        const combinedText =
            [
                name,
                email,
                organization,
                city,
                interest,
                message,
            ].join(" ");

        if (hasSuspiciousContent(combinedText)) {
            return res.status(400).json({
                success: false,
                code: "CONTACT_SPAM_CONTENT",
                message:
                    "Your message contains unsupported content.",
            });
        }

        // Block messages like aaaaaaaaaaaaa / 111111111111.
        if (/(.)\1{9,}/.test(message)) {
            return res.status(400).json({
                success: false,
                code: "CONTACT_INVALID_MESSAGE",
                message:
                    "Please enter a valid message.",
            });
        }

        // ============================================================
        // DUPLICATE PHONE PROTECTION
        // Same phone number will not create another lead/notification
        // for 24 hours.
        // ============================================================

        const oneDayAgo =
            new Date(
                Date.now() - 24 * 60 * 60 * 1000,
            );

        const existingRecentLead =
            await ContactLead.findOne({
                phone,
                createdAt: {
                    $gte: oneDayAgo,
                },
            }).lean();

        if (existingRecentLead) {
            return res.status(409).json({
                success: false,
                code: "DUPLICATE_CONTACT_PHONE",
                message:
                    "This phone number already submitted a demo request today. We will contact you soon.",
                data: {
                    duplicate: true,
                    leadId: existingRecentLead._id,
                },
            });
        }

        // ============================================================
        // CREATE LEAD
        // ============================================================

        const lead =
            await ContactLead.create({
                name,
                phone,
                email,
                organization,
                city,
                interest,
                message,
                source,
            });

        const leadId =
            lead._id as Types.ObjectId;

        // ============================================================
        // CREATE SUPER ADMIN NOTIFICATION
        // ============================================================

        const notification =
            await SuperAdminNotification.create({
                title: "New demo request",
                message: `${name} submitted a contact form for ${
                    organization || "hospital/clinic demo"
                }.`,
                type: "CONTACT_LEAD",
                entityId: leadId,
                entityModel: "ContactLead",
                metadata: {
                    leadId,
                    name: lead.name,
                    phone: lead.phone,
                    email: lead.email,
                    organization: lead.organization,
                    city: lead.city,
                    interest: lead.interest,
                    message: lead.message,
                    source: lead.source,
                },
            });

        return res.status(201).json({
            success: true,
            message:
                "Thank you. We received your request and will contact you soon.",
            data: {
                leadId,
                notificationId: notification._id,
            },
        });
    } catch (error) {
        console.log(
            "CREATE CONTACT LEAD ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            code: "CONTACT_SUBMIT_FAILED",
            message:
                "Something went wrong while submitting contact form.",
        });
    }
};
