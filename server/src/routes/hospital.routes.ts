import { Router } from "express";

import {
  getHospitals,
  getHospital,
  createHospital,
  updateHospital,
  updateHospitalStatus,
  getHospitalDashboard,
} from "../controllers/hospital.controller";

const router =
  Router();

/* =========================================================
   HOSPITAL LIST
========================================================= */

router.get(
  "/",
  getHospitals,
);

/* =========================================================
   CREATE
========================================================= */

router.post(
  "/",
  createHospital,
);

/* =========================================================
   SINGLE HOSPITAL
========================================================= */

router.get(
  "/:hospitalId",
  getHospital,
);

/* =========================================================
   UPDATE
========================================================= */

router.put(
  "/:hospitalId",
  updateHospital,
);

/* =========================================================
   STATUS
========================================================= */

router.patch(
  "/:hospitalId/status",
  updateHospitalStatus,
);

/* =========================================================
   DASHBOARD
========================================================= */

router.get(
  "/:hospitalId/dashboard",
  getHospitalDashboard,
);

export default router;