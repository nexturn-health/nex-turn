import type { Request, Response } from "express";
import {
  searchAppointmentAvailability,
  type AppointmentAssistantChatMessage,
} from "../services/appointmentAssistant.service";

const INDIA_TIME_ZONE = "Asia/Kolkata";
const BOOKING_WINDOW_DAYS = 7;
function getParam(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}
function indiaDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}
function addCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
}
function parseHistory(value: unknown): AppointmentAssistantChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-8).flatMap((item: any) => {
    if (!item || (item.role !== "user" && item.role !== "assistant")) return [];
    const content = String(item.content || "").replace(/\s+/g, " ").trim().slice(0, 1200);
    return content ? [{ role: item.role, content } as AppointmentAssistantChatMessage] : [];
  });
}
export const searchAppointmentWithAI = async (req: Request, res: Response) => {
  try {
    const message = getParam(req.body?.message).replace(/\s+/g, " ").trim();
    if (message.length < 1) return res.status(400).json({ success: false, message: "Please enter a message." });
    if (message.length > 300) return res.status(400).json({ success: false, message: "Please keep your message under 300 characters." });
    const history = parseHistory(req.body?.history);
    const today = indiaDate();
    const lastBookableDate = addCalendarDays(today, BOOKING_WINDOW_DAYS - 1);
    const data = await searchAppointmentAvailability(message, { today, lastBookableDate }, history);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("APPOINTMENT ASSISTANT ERROR:", error);
    if (String(error?.message || "").includes("OPENAI_API_KEY is not configured")) {
      return res.status(503).json({ success: false, message: "Appointment assistant is not configured yet." });
    }
    return res.status(500).json({ success: false, message: "Unable to respond right now. Please try again." });
  }
};
const appointmentAssistantController = { searchAppointmentWithAI };
export default appointmentAssistantController;
