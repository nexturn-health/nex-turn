import {
  Router,
} from "express";

import {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller";

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
   CREATE DEPARTMENT

   POST /api/departments
========================================================= */

router.post(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
    "SUPER_ADMIN",
  ),

  createDepartment,
);

/* =========================================================
   GET DEPARTMENTS

   GET /api/departments
========================================================= */

router.get(
  "/",

  authorize(
    "SUPER_ADMIN",
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
    "DOCTOR",
  ),

  getDepartments,
);

/* =========================================================
   UPDATE DEPARTMENT

   PUT /api/departments/:id
========================================================= */

router.put(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
    "SUPER_ADMIN",
  ),

  updateDepartment,
);

/* =========================================================
   DELETE DEPARTMENT

   DELETE /api/departments/:id
========================================================= */

router.delete(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
    "SUPER_ADMIN",
  ),

  deleteDepartment,
);

/* =========================================================
   EXPORT
========================================================= */

export default router;