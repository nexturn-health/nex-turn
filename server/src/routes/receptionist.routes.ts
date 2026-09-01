import { Router } from "express";

import {
  createReceptionist,
  getReceptionists,
  updateReceptionist,
} from "../controllers/receptionist.controller";

import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.use(protect);

// Create receptionist
router.post(
  "/",
  authorize("HOSPITAL_ADMIN"),
  createReceptionist
);

// Get receptionists
router.get(
  "/",
  authorize("HOSPITAL_ADMIN"),
  getReceptionists
);

// Update receptionist
router.put(
  "/:id",
  authorize("HOSPITAL_ADMIN"),
  updateReceptionist
);

export default router;