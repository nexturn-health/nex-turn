import {
  Router,
} from "express";

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

import {
  requireSubscription,
} from "../middleware/subscription.middleware";

const router =
  Router();

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(
  protect,
);

/* =========================================================
   ACTIVE SUBSCRIPTION REQUIRED

   BASIC + PREMIUM
========================================================= */

router.use(
  requireSubscription,
);

/* =========================================================
   CREATE PATIENT

   POST /api/patients

   HOSPITAL_ADMIN
   RECEPTIONIST
========================================================= */

router.post(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  createPatient,
);

/* =========================================================
   GET ALL PATIENTS

   GET /api/patients

   HOSPITAL_ADMIN
   RECEPTIONIST
========================================================= */

router.get(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  getPatients,
);

/* =========================================================
   GET TODAY'S PATIENTS

   GET /api/patients/today
========================================================= */

router.get(
  "/today",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  getTodayPatients,
);

/* =========================================================
   GET TOKEN ELIGIBLE PATIENTS

   GET /api/patients/token-eligible
========================================================= */

router.get(
  "/token-eligible",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  getTokenEligiblePatients,
);

/* =========================================================
   GET PATIENT BY ID

   GET /api/patients/:id
========================================================= */

router.get(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  getPatientById,
);

/* =========================================================
   UPDATE PATIENT

   PUT /api/patients/:id
========================================================= */

router.put(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  updatePatient,
);

/* =========================================================
   EXPORT
========================================================= */

export default router;