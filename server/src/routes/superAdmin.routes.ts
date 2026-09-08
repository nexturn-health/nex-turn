import { Router } from "express";

import {
  protect,
} from "../middleware/auth.middleware";

import {
  superAdmin,
} from "../middleware/superAdmin.middleware";

import {
  getSuperAdminDashboard,
  getSuperAdminHospitals,
  getHospitalSubscription,
  activateHospitalSubscription,
  createHospital,
  getHospitalSubscriptionHistory,
  getSuperAdminHospitalDashboard,
} from "../controllers/superAdmin.controller";

const router = Router();

// ============================================================
// SUPER ADMIN DASHBOARD
// ============================================================

router.get(
  "/dashboard",
  protect,
  superAdmin,
  getSuperAdminDashboard,
);

// ============================================================
// GET ALL HOSPITALS
// ============================================================

router.get(
  "/hospitals",
  protect,
  superAdmin,
  getSuperAdminHospitals,
);

// ============================================================
// CREATE HOSPITAL
// ============================================================

router.post(
  "/hospitals",
  protect,
  superAdmin,
  createHospital,
);

/* ============================================================
   GET SINGLE HOSPITAL
   GET /api/super-admin/hospitals/:hospitalId
============================================================ */

router.get(
  "/hospitals/:hospitalId",
  protect,
  superAdmin,
  getSuperAdminHospitals,
);

/* ============================================================
   HOSPITAL DASHBOARD
============================================================ */

router.get(
  "/hospitals/:hospitalId/dashboard",
  protect,
  superAdmin,
  getSuperAdminHospitalDashboard,
);


// ============================================================
// GET HOSPITAL SUBSCRIPTION
// ============================================================

router.get(
  "/hospitals/:hospitalId/subscription",
  protect,
  superAdmin,
  getHospitalSubscription,
);

router.get(
  "/hospitals/:hospitalId/subscription/history",
  protect,
  superAdmin,
  getHospitalSubscriptionHistory,
);

// ============================================================
// ACTIVATE / RENEW SUBSCRIPTION
// ============================================================

router.post(
  "/hospitals/:hospitalId/subscription/activate",
  protect,
  superAdmin,
  activateHospitalSubscription,
);

export default router;