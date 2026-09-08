import {
  Router,
} from "express";

import {
  createReceptionist,
  getReceptionists,
  updateReceptionist,
} from "../controllers/receptionist.controller";

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
   CREATE RECEPTIONIST

   POST /api/receptionists
========================================================= */

router.post(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  createReceptionist,
);

/* =========================================================
   GET RECEPTIONISTS

   GET /api/receptionists
========================================================= */

router.get(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  getReceptionists,
);

/* =========================================================
   UPDATE RECEPTIONIST

   PUT /api/receptionists/:id
========================================================= */

router.put(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  updateReceptionist,
);

/* =========================================================
   EXPORT
========================================================= */

export default router;