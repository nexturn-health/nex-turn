
import type {
    Request,
    Response,
} from "express";

export const verifyWhatsAppWebhook = (
    req: Request,
    res: Response,
) => {
    console.log(
        "WHATSAPP VERIFY REQUEST:",
        req.query,
    );

    const mode =
        typeof req.query["hub.mode"] === "string"
            ? req.query["hub.mode"]
            : "";

    const token =
        typeof req.query[
            "hub.verify_token"
        ] === "string"
            ? req.query[
                  "hub.verify_token"
              ]
            : "";

    const challenge =
        typeof req.query[
            "hub.challenge"
        ] === "string"
            ? req.query[
                  "hub.challenge"
              ]
            : "";

    if (
        mode === "subscribe" &&
        token ===
            process.env
                .WHATSAPP_VERIFY_TOKEN
    ) {
        console.log(
            "WHATSAPP WEBHOOK VERIFIED",
        );

        return res
            .status(200)
            .send(challenge);
    }

    console.log(
        "WHATSAPP WEBHOOK TOKEN FAILED",
    );

    return res.sendStatus(403);
};

export const receiveWhatsAppWebhook = (
    req: Request,
    res: Response,
) => {
    console.log(
        "WHATSAPP EVENT RECEIVED:",
        JSON.stringify(
            req.body,
            null,
            2,
        ),
    );

    return res.sendStatus(200);
};