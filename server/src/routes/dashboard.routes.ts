import {
  Router,
} from "express";

import {
  getDashboardStats,
} from "../controllers/dashboard.controller";

import {
  protect,
} from "../middleware/auth.middleware";

import {
  requireSubscription,
} from "../middleware/subscription.middleware";

const router = Router();

/* =========================================================
   DASHBOARD STATS

   GET /api/dashboard/stats

   BASIC + PREMIUM
========================================================= */

router.get(
  "/stats",

  protect,

  requireSubscription,

  getDashboardStats,
);

/* =========================================================
   EXPORT
========================================================= */

export default router;