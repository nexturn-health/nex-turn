import {
  Router,
} from "express";

import {
  getLabDepartments,
  getActiveLabDepartments,
  createLabDepartment,
  updateLabDepartment,
  deactivateLabDepartment,
} from "../controllers/labDepartment.controller";

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
// GET ACTIVE LAB DEPARTMENTS
// ============================================================

router.get(
  "/active",

  authorize(
    "HOSPITAL_ADMIN",
    "DOCTOR",
    "RECEPTIONIST",
    "LAB_TECHNICIAN",
  ),

  getActiveLabDepartments,
);

// ============================================================
// GET ALL LAB DEPARTMENTS
// ============================================================

router.get(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
    "DOCTOR",
    "RECEPTIONIST",
    "LAB_TECHNICIAN",
  ),

  getLabDepartments,
);

// ============================================================
// CREATE LAB DEPARTMENT
// ============================================================

router.post(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  createLabDepartment,
);

// ============================================================
// UPDATE LAB DEPARTMENT
// ============================================================

router.patch(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  updateLabDepartment,
);

// ============================================================
// DEACTIVATE LAB DEPARTMENT
// ============================================================

router.delete(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  deactivateLabDepartment,
);

// ============================================================
// EXPORT
// ============================================================

export default router;