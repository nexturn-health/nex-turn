import type {
    Request,
    Response,
} from "express";

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

export const createContactLead = async (
    req: Request,
    res: Response,
) => {
    try {
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

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required.",
            });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be exactly 10 digits.",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address.",
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required.",
            });
        }

        const lead =
            await ContactLead.create({
                name,
                phone,
                email,
                organization,
                city,
                interest,
                message,
                source:
                    cleanText(
                        req.body.source,
                        80,
                    ) || "WEBSITE_CONTACT_FORM",
            });

        const notification =
            await SuperAdminNotification.create({
                title: "New demo request",
                message: `${name} submitted a contact form for ${organization || "hospital/clinic demo"}.`,
                type: "CONTACT_LEAD",
                entityId: lead._id,
                entityModel: "ContactLead",
                metadata: {
                    leadId: lead._id,
                    name: lead.name,
                    phone: lead.phone,
                    email: lead.email,
                    organization: lead.organization,
                    city: lead.city,
                    interest: lead.interest,
                    message: lead.message,
                },
            });

        return res.status(201).json({
            success: true,
            message:
                "Thank you. We received your request and will contact you soon.",
            data: {
                leadId: lead._id,
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
            message:
                "Something went wrong while submitting contact form.",
        });
    }
};