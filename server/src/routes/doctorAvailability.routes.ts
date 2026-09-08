import {
  Router,
} from "express";

import doctorAvailabilityController from "../controllers/doctorAvailability.controller";

const router =
  Router();

const {
  getAvailabilityDoctors,
  getDoctorAvailability,
  updateDoctorAvailability,
} =
  doctorAvailabilityController;

router.get(
  "/doctors",
  getAvailabilityDoctors,
);

router.get(
  "/doctors/:doctorId",
  getDoctorAvailability,
);

router.put(
  "/doctors/:doctorId",
  updateDoctorAvailability,
);

export default router;