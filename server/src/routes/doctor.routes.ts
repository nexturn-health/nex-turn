import { Router } from "express";

import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
   deleteDoctor,
} from "../controllers/doctor.controller";

import { protect } from "../middleware/auth.middleware";

const router = Router();

/* =========================================================
   DOCTORS
========================================================= */

// GET /api/doctors
router.get(
  "/",
  protect,
  getDoctors,
);

// POST /api/doctors
router.post(
  "/",
  protect,
  createDoctor,
);

// GET /api/doctors/:id
router.get(
  "/:id",
  protect,
  getDoctorById,
);

// PUT /api/doctors/:id
router.put(
  "/:id",
  protect,
  updateDoctor,
);

// PATCH /api/doctors/:id/status
router.patch(
  "/:id/status",
  protect,
  updateDoctorStatus,
);

router.delete(
    "/:id",
    protect,
    deleteDoctor,
);


export default router;