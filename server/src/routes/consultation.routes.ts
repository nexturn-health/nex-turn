import {
  Router,
} from "express";

import {
  startConsultation,
  getPatientConsultationHistory,
  getConsultationById,
  updateConsultation,
  completeConsultation,
} from "../controllers/consultation.controller";

import {
  generateConsultationAIAnalysis,
} from "../controllers/clinicalAnalysis.controller";

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
// START CONSULTATION
//
// POST /api/consultations/start
// ============================================================

router.post(
  "/start",

  authorize(
    "DOCTOR",
  ),

  startConsultation,
);

// ============================================================
// PATIENT CONSULTATION HISTORY
//
// GET /api/consultations/patient/:patientId
// ============================================================

router.get(
  "/patient/:patientId",

  authorize(
    "DOCTOR",
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  getPatientConsultationHistory,
);

// ============================================================
// AI CLINICAL ANALYSIS
//
// POST /api/consultations/:id/ai-analysis
// ============================================================

router.post(
  "/:id/ai-analysis",

  authorize(
    "DOCTOR",
  ),

  generateConsultationAIAnalysis,
);

// ============================================================
// GET SINGLE CONSULTATION
//
// GET /api/consultations/:id
// ============================================================

router.get(
  "/:id",

  authorize(
    "DOCTOR",
    "HOSPITAL_ADMIN",
  ),

  getConsultationById,
);

// ============================================================
// UPDATE CONSULTATION
//
// PATCH /api/consultations/:id
// ============================================================

router.patch(
  "/:id",

  authorize(
    "DOCTOR",
  ),

  updateConsultation,
);

// ============================================================
// COMPLETE CONSULTATION
//
// POST /api/consultations/:id/complete
// ============================================================

router.post(
  "/:id/complete",

  authorize(
    "DOCTOR",
  ),

  completeConsultation,
);

// ============================================================
// EXPORT
// ============================================================

export default router;