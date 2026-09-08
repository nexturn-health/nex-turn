import multer, {
  type FileFilterCallback,
} from "multer";

import type { Request } from "express";

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_AUDIO_SIZE =
  25 * 1024 * 1024; // 25 MB

// ============================================================
// ALLOWED AUDIO MIME TYPES
// ============================================================

const allowedAudioTypes =
  new Set([
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/flac",
    "audio/mpga",
  ]);

// ============================================================
// MEMORY STORAGE
//
// Audio is kept in memory temporarily and sent directly
// to the transcription service.
//
// We do NOT save consultation audio permanently.
// ============================================================

const storage =
  multer.memoryStorage();

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
) => {
  const mimeType =
    file.mimetype
      .split(";")[0]
      .trim()
      .toLowerCase();

  if (
    !allowedAudioTypes.has(
      mimeType,
    )
  ) {
    return callback(
      new Error(
        `Unsupported audio format: ${mimeType}`,
      ),
    );
  }

  callback(null, true);
};

// ============================================================
// MULTER UPLOAD
// ============================================================

export const consultationAudioUpload =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_AUDIO_SIZE,
    },

    fileFilter,
  });