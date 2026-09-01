import { Router } from "express";

import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  getTokenEligiblePatients,
  getTodayPatients,
} from "../controllers/patient.controller";

import {
  protect,
} from "../middleware/auth.middleware";

import {
  authorize,
} from "../middleware/role.middleware";

const router = Router();

// =====================================
// AUTHENTICATION
// =====================================

router.use(protect);


// =====================================
// CREATE PATIENT
// POST /api/patients
//
// ADMIN + RECEPTIONIST
// =====================================

router.post(
  "/",
  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST"
  ),
  createPatient
);


// =====================================
// GET ALL PATIENTS
// GET /api/patients
//
// ADMIN + RECEPTIONIST
// =====================================

router.get(
  "/",
  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST"
  ),
  getPatients
);

router.get(
  "/today",
  protect,
  getTodayPatients,
);

router.get(
  "/token-eligible",
  protect,
  getTokenEligiblePatients,
);
//
// ADMIN + RECEPTIONIST
// =====================================

router.get(
  "/:id",
  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST"
  ),
  getPatientById
);

// =====================================
// UPDATE PATIENT
// PUT /api/patients/:id
//
// ADMIN + RECEPTIONIST
// =====================================

router.put(
  "/:id",
  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST"
  ),
  updatePatient
);


export default router;