import {
  Router,
} from "express";

import {
  getLabRooms,
  getActiveLabRooms,
  createLabRoom,
  updateLabRoom,
  deactivateLabRoom,
} from "../controllers/labRoom.controller";

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
// GET ACTIVE LAB ROOMS
// ============================================================

router.get(
  "/active",

  authorize(
    "HOSPITAL_ADMIN",
    "LAB_TECHNICIAN",
  ),

  getActiveLabRooms,
);

// ============================================================
// GET ALL LAB ROOMS
// ============================================================

router.get(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
    "LAB_TECHNICIAN",
  ),

  getLabRooms,
);

// ============================================================
// CREATE LAB ROOM
// ============================================================

router.post(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  createLabRoom,
);

// ============================================================
// UPDATE LAB ROOM
// ============================================================

router.patch(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  updateLabRoom,
);

// ============================================================
// DEACTIVATE LAB ROOM
// ============================================================

router.delete(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  deactivateLabRoom,
);

// ============================================================
// EXPORT
// ============================================================

export default router;