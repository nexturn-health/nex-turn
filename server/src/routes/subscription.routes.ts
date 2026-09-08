import { Router } from "express";

import { protect } from "../middleware/auth.middleware";

import {
  getSubscription,
  upgradeToPremium,
} from "../controllers/subscription.controller";

const router = Router();

router.get(
  "/",
  protect,
  getSubscription,
);

router.post(
  "/upgrade",
  protect,
  upgradeToPremium,
);

export default router;