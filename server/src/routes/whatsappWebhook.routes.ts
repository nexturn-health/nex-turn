import { Router } from "express";
import {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
} from "../controllers/whatsappWebhook.controller";

const router = Router();

/**
 * Meta webhook verification
 *
 * GET /api/webhooks/whatsapp
 */
router.get("/", verifyWhatsAppWebhook);

/**
 * WhatsApp webhook events
 *
 * POST /api/webhooks/whatsapp
 */
router.post("/", receiveWhatsAppWebhook);

export default router;