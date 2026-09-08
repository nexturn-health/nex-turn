import {
  Router,
} from "express";

import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
  deleteDoctor,
} from "../controllers/doctor.controller";

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
   GET ALL DOCTORS

   GET /api/doctors
========================================================= */

router.get(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
    "DOCTOR",
  ),

  getDoctors,
);

/* =========================================================
   CREATE DOCTOR

   POST /api/doctors

   HOSPITAL ADMIN ONLY
========================================================= */

router.post(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  createDoctor,
);

/* =========================================================
   GET DOCTOR BY ID

   GET /api/doctors/:id
========================================================= */

router.get(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
    "DOCTOR",
  ),

  getDoctorById,
);

/* =========================================================
   UPDATE DOCTOR

   PUT /api/doctors/:id

   HOSPITAL ADMIN ONLY
========================================================= */

router.put(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  updateDoctor,
);

/* =========================================================
   UPDATE DOCTOR STATUS

   PATCH /api/doctors/:id/status

   HOSPITAL ADMIN + DOCTOR
========================================================= */

router.patch(
  "/:id/status",

  authorize(
    "HOSPITAL_ADMIN",
    "DOCTOR",
  ),

  updateDoctorStatus,
);

/* =========================================================
   DELETE DOCTOR

   DELETE /api/doctors/:id

   HOSPITAL ADMIN ONLY
========================================================= */

router.delete(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  deleteDoctor,
);

/* =========================================================
   EXPORT
========================================================= */

export default router;