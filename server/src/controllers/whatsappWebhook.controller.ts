import type { Request, Response } from "express";

/**
 * GET /api/webhooks/whatsapp
 *
 * Meta calls this endpoint when you click
 * "Verify and Save" in the WhatsApp Webhook settings.
 */
export const verifyWhatsAppWebhook = (
  req: Request,
  res: Response
) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("\n========================================");
  console.log("📥 WhatsApp Webhook Verification");
  console.log("Mode:", mode);
  console.log("Verify Token:", token);
  console.log("Challenge:", challenge);
  console.log("========================================");

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error(
      "❌ WHATSAPP_VERIFY_TOKEN is missing from .env"
    );

    return res.status(500).send("Webhook verify token not configured");
  }

  if (
    mode === "subscribe" &&
    token === expectedToken
  ) {
    console.log("✅ WhatsApp Webhook Verified!");

    return res.status(200).send(challenge);
  }

  console.error(
    "❌ WhatsApp Webhook Verification Failed"
  );

  return res.sendStatus(403);
};

/**
 * POST /api/webhooks/whatsapp
 *
 * Meta will send WhatsApp messages and status
 * updates to this endpoint.
 */
export const receiveWhatsAppWebhook = (
  req: Request,
  res: Response
) => {
  console.log("\n========================================");
  console.log("📥 WhatsApp Webhook Event");
  console.log(JSON.stringify(req.body, null, 2));
  console.log("========================================");

  // Tell Meta that we received the webhook.
  return res.sendStatus(200);
};