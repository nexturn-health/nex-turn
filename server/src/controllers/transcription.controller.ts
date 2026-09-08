import type {
  Request,
  Response,
} from "express";

import {
  transcribeAudio,
} from "../services/openai.service";

// ============================================================
// TRANSCRIBE CONSULTATION AUDIO
// ============================================================

export const transcribeConsultationAudio =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      // --------------------------------------------------------
      // AUTHENTICATION
      // --------------------------------------------------------

      const doctorId =
        req.user?.userId;

      if (!doctorId) {
        return res.status(401).json({
          success: false,
          message:
            "Doctor authentication required",
        });
      }

      // --------------------------------------------------------
      // AUDIO FILE
      // --------------------------------------------------------

      const file =
        req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message:
            "Audio recording is required",
        });
      }

      // --------------------------------------------------------
      // BASIC FILE VALIDATION
      // --------------------------------------------------------

      const allowedMimeTypes = [
        "audio/webm",
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/ogg",
        "audio/m4a",
        "audio/mp4",
      ];

      const mimeType =
        file.mimetype
          ?.split(";")[0]
          .trim();

      if (
        !allowedMimeTypes.includes(
          mimeType,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported audio format",
        });
      }

      // --------------------------------------------------------
      // FILE SIZE
      // --------------------------------------------------------

      const maxSize =
        25 * 1024 * 1024;

      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message:
            "Audio file is too large. Maximum size is 25 MB.",
        });
      }

      // --------------------------------------------------------
      // TRANSCRIBE
      // --------------------------------------------------------

      const result =
        await transcribeAudio(
          file,
        );

      if (!result.text?.trim()) {
        return res.status(422).json({
          success: false,
          message:
            "No speech could be detected in the recording.",
        });
      }

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Audio transcribed successfully",
        data: {
          text: result.text,
          language:
            result.language || null,
        },
      });
    } catch (error: any) {
      console.error(
        "❌ TRANSCRIBE CONSULTATION ERROR:",
        error,
      );

      console.error(
        "OPENAI ERROR:",
        error?.response?.data ||
          error?.message,
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to transcribe consultation audio",
      });
    }
  };
