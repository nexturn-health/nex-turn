import { Router } from "express";

import {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller";

import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.use(protect);

// Create department
router.post(
  "/",
  authorize("HOSPITAL_ADMIN", "SUPER_ADMIN",),
  createDepartment
);

// Get departments
router.get(
  "/",
  authorize(
    "SUPER_ADMIN",
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),
  getDepartments,
);

// Update department
router.put(
  "/:id",
  authorize("HOSPITAL_ADMIN", "SUPER_ADMIN",),
  updateDepartment
);

// Delete department
router.delete(
  "/:id",
  authorize("HOSPITAL_ADMIN", "SUPER_ADMIN",),
  deleteDepartment
);

export default router;