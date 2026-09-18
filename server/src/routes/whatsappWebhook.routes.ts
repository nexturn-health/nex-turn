// routes/whatsappWebhook.routes.ts

import { Router } from "express";

import {
    verifyWhatsAppWebhook,
    receiveWhatsAppWebhook,
} from "../controllers/whatsappWebhook.controller";

const router = Router();

router.get(
    "/",
    verifyWhatsAppWebhook,
);

router.post(
    "/",
    receiveWhatsAppWebhook,
);

export default router;