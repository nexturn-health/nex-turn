import {
  Router,
} from "express";

import {
  getLabTechnicians,
  createLabTechnician,
  updateLabTechnician,
  activateLabTechnician,
  deactivateLabTechnician,
} from "../controllers/labTechnician.controller";

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
// GET LAB TECHNICIANS
// ============================================================

router.get(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  getLabTechnicians,
);

// ============================================================
// CREATE LAB TECHNICIAN
// ============================================================

router.post(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  createLabTechnician,
);

// ============================================================
// UPDATE LAB TECHNICIAN
// ============================================================

router.patch(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  updateLabTechnician,
);

// ============================================================
// ACTIVATE LAB TECHNICIAN
// ============================================================

router.patch(
  "/:id/activate",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  activateLabTechnician,
);

// ============================================================
// DEACTIVATE LAB TECHNICIAN
// ============================================================

router.patch(
  "/:id/deactivate",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  deactivateLabTechnician,
);

// ============================================================
// EXPORT
// ============================================================

export default router;