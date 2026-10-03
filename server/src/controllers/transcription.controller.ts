import type {
    Request,
    Response,
} from "express";

import {
    transcribeAudio,
} from "../services/openai.service";

const MAX_AUDIO_SIZE =
    25 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
    new Set([
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/ogg",
        "audio/m4a",
        "audio/x-m4a",
    ]);

export const transcribeConsultationAudio =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const doctorId =
                req.user?.userId;

            if (!doctorId) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Doctor authentication required",
                });
            }

            const file =
                req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Audio recording is required",
                });
            }

            if (
                !file.buffer ||
                file.buffer.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Audio file buffer is empty",
                });
            }

            const mimeType =
                (file.mimetype || "")
                    .split(";")[0]
                    .trim()
                    .toLowerCase();

            if (
                !ALLOWED_MIME_TYPES.has(
                    mimeType,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Unsupported audio format: ${mimeType}`,
                });
            }

            const fileSize =
                file.size ||
                file.buffer.length;

            if (
                fileSize >
                MAX_AUDIO_SIZE
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Audio file is too large. Maximum size is 25 MB.",
                });
            }

            const result =
                await transcribeAudio(
                    file.buffer,
                    mimeType,
                );

            const transcript =
                result?.text?.trim() ||
                "";

            if (!transcript) {
                return res.status(422).json({
                    success: false,
                    message:
                        "No speech could be detected in the recording.",
                });
            }

            return res.status(200).json({
                success: true,
                message:
                    "Audio transcribed successfully",
                data: {
                    text: transcript,
                    language:
                        result.language ||
                        "en",
                },
            });
        } catch (error: unknown) {
            console.error(
                "TRANSCRIBE CONSULTATION ERROR:",
                error,
            );

            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to transcribe consultation audio";

            return res.status(502).json({
                success: false,
                message:
                    process.env.NODE_ENV ===
                    "production"
                        ? "Failed to transcribe consultation audio"
                        : message,
            });
        }
    };