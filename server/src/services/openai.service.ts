import OpenAI from "openai";
import { toFile } from "openai/uploads";

// ============================================================
// OPENAI CLIENT
// ============================================================

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    "⚠️ OPENAI_API_KEY is not configured.",
  );
}

export const openai = new OpenAI({
  apiKey,
});

// ============================================================
// TYPES
// ============================================================

export interface TranscriptionResult {
  text: string;
  language?: string;
}

// ============================================================
// TRANSCRIBE AUDIO
// ============================================================

export const transcribeAudio = async (
  file: Express.Multer.File,
): Promise<TranscriptionResult> => {
  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured",
    );
  }

  if (!file) {
    throw new Error(
      "Audio file is required",
    );
  }

  if (!file.buffer) {
    throw new Error(
      "Audio file buffer is empty",
    );
  }

  // ----------------------------------------------------------
  // CONVERT MULTER BUFFER TO OPENAI FILE
  // ----------------------------------------------------------

  const audioFile = await toFile(
    file.buffer,
    file.originalname ||
      "consultation.webm",
    {
      type:
        file.mimetype ||
        "audio/webm",
    },
  );

  // ----------------------------------------------------------
  // MODEL
  // ----------------------------------------------------------

  const model =
    process.env.OPENAI_TRANSCRIPTION_MODEL ||
    "gpt-4o-transcribe";

  console.log(
    "🎙️ OPENAI TRANSCRIPTION MODEL:",
    model,
  );

  // ----------------------------------------------------------
  // TRANSCRIPTION
  // ----------------------------------------------------------

  const transcription =
    await openai.audio.transcriptions.create({
      file: audioFile,

      model,

      prompt:
        "This is a medical consultation between a doctor and a patient. " +
        "The conversation may contain English, Hindi, Hinglish, Indian names, " +
        "medical terminology, symptoms, medicines, diagnoses, and clinical terms. " +
        "Preserve the spoken meaning accurately. " +
        "Do not translate Hindi or Hinglish into English unless the speaker naturally speaks English.",
    });

  // ----------------------------------------------------------
  // RETURN
  // ----------------------------------------------------------

  return {
    text: transcription.text || "",
  };
};