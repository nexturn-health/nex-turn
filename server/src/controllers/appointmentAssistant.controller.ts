import type {
    Request,
    Response,
} from "express";

import {
    searchAppointmentAvailability,
} from "../services/appointmentAssistant.service";

const INDIA_TIME_ZONE =
    "Asia/Kolkata";

const BOOKING_WINDOW_DAYS = 7;

function getParam(
    value: unknown,
): string {
    if (Array.isArray(value)) {
        return String(value[0] || "");
    }

    return String(value || "");
}

function indiaDate(
    value = new Date(),
): string {
    const parts = new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: INDIA_TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        },
    ).formatToParts(value);

    const year =
        parts.find(
            (part) => part.type === "year",
        )?.value || "";

    const month =
        parts.find(
            (part) => part.type === "month",
        )?.value || "";

    const day =
        parts.find(
            (part) => part.type === "day",
        )?.value || "";

    return `${year}-${month}-${day}`;
}

function addCalendarDays(
    value: string,
    days: number,
): string {
    const [year, month, day] = value
        .split("-")
        .map(Number);

    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day,
        ),
    );

    date.setUTCDate(
        date.getUTCDate() + days,
    );

    return [
        date.getUTCFullYear(),
        String(
            date.getUTCMonth() + 1,
        ).padStart(2, "0"),
        String(
            date.getUTCDate(),
        ).padStart(2, "0"),
    ].join("-");
}

export const searchAppointmentWithAI =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const message = getParam(
                req.body?.message,
            )
                .replace(/\s+/g, " ")
                .trim();

            if (message.length < 2) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please describe the hospital, department, doctor, or date you need.",
                });
            }

            if (message.length > 300) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please keep your appointment request under 300 characters.",
                });
            }

            const today = indiaDate();
            const lastBookableDate =
                addCalendarDays(
                    today,
                    BOOKING_WINDOW_DAYS - 1,
                );

            const data =
                await searchAppointmentAvailability(
                    message,
                    {
                        today,
                        lastBookableDate,
                    },
                );

            return res.status(200).json({
                success: true,
                data,
            });
        } catch (error: any) {
            console.error(
                "APPOINTMENT ASSISTANT ERROR:",
                error,
            );

            if (
                String(error?.message || "")
                    .includes(
                        "OPENAI_API_KEY is not configured",
                    )
            ) {
                return res.status(503).json({
                    success: false,
                    message:
                        "Appointment assistant is not configured yet.",
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Unable to search appointments right now. Please use the normal hospital search.",
            });
        }
    };

const appointmentAssistantController = {
    searchAppointmentWithAI,
};

export default appointmentAssistantController;

