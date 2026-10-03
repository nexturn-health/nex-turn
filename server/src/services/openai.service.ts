// src/services/openai.service.ts

import OpenAI, { toFile } from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
}

const openai = new OpenAI({
    apiKey,
    // Do not add baseURL here
});

function getExtension(mimetype: string): string {
    if (mimetype.includes("mp4")) return "mp4";
    if (mimetype.includes("mpeg")) return "mpeg";
    if (mimetype.includes("mp3")) return "mp3";
    if (mimetype.includes("wav")) return "wav";
    if (mimetype.includes("m4a")) return "m4a";

    return "webm";
}

export async function transcribeAudio(
    buffer: Buffer,
    mimetype = "audio/webm",
) {
    if (!buffer || buffer.length === 0) {
        throw new Error("Audio file is empty");
    }

    const extension = getExtension(mimetype);

    const file = await toFile(
        buffer,
        `consultation.${extension}`,
        {
            type: mimetype,
        },
    );

    const transcription =
        await openai.audio.transcriptions.create({
            file,
            model:
                process.env.OPENAI_TTS_MODEL ||
                "gpt-transcribe",
            response_format: "json",
        });

    const result = transcription as {
        text?: string;
        language?: string;
        languages?: Array<{
            code?: string;
        }>;
    };

    return {
        text: result.text || "",
        language:
            result.language ||
            result.languages?.[0]?.code ||
            "en",
    };
}