import { Router } from "express";

import {
  getHospitalAdmins,
  getHospitalAdmin,
  createHospitalAdmin,
  updateHospitalAdmin,
  updateHospitalAdminStatus,
  deleteHospitalAdmin,
} from "../controllers/hospitalAdmin.controller";

const router = Router();

/* GET ALL */
router.get(
  "/",
  getHospitalAdmins
);

/* GET ONE */
router.get(
  "/:adminId",
  getHospitalAdmin
);

/* CREATE */
router.post(
  "/",
  createHospitalAdmin
);

/* UPDATE */
router.put(
  "/:adminId",
  updateHospitalAdmin
);

/* STATUS */
router.patch(
  "/:adminId/status",
  updateHospitalAdminStatus
);

/* DELETE */
router.delete(
  "/:adminId",
  deleteHospitalAdmin
);

export default router;