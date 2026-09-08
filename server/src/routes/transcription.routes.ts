import {
  Router,
} from "express";

import {
  transcribeConsultationAudio,
} from "../controllers/transcription.controller";

import {
  consultationAudioUpload,
} from "../middleware/audioUpload.middleware";

import {
  protect,
} from "../middleware/auth.middleware";

import {
  authorize,
} from "../middleware/role.middleware";

import {
  requirePremium,
} from "../middleware/subscription.middleware";

const router =
  Router();

// ============================================================
// AUTHENTICATION
// ============================================================

router.use(
  protect,
);

// ============================================================
// PREMIUM SUBSCRIPTION REQUIRED
// ============================================================

router.use(
  requirePremium,
);

// ============================================================
// TRANSCRIBE CONSULTATION AUDIO
//
// POST /api/transcriptions/consultation
//
// multipart/form-data
//
// field:
// audio
// ============================================================

router.post(
  "/consultation",

  authorize(
    "DOCTOR",
  ),

  consultationAudioUpload.single(
    "audio",
  ),

  transcribeConsultationAudio,
);

// ============================================================
// EXPORT
// ============================================================

export default router;