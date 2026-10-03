import {
    Router,
} from "express";

import publicAppointmentController from "../controllers/publicAppointment.controller";

const router =
    Router();

const {
    getPublicStates,
    getPublicDistricts,
    getPublicHospitals,
    getPublicHospitalBySlug,
    getPublicHospitalDepartments,
    getPublicHospitalDoctors,
    getPublicDoctorSlots,
    holdPublicDoctorSlot,
    releasePublicDoctorSlot,
    bookPublicAppointment,
    getPublicAppointmentByCode,
} =
    publicAppointmentController;

/* ============================================================
   PUBLIC LOCATION
============================================================ */

router.get(
    "/locations/states",
    getPublicStates,
);

router.get(
    "/locations/districts",
    getPublicDistricts,
);

/* ============================================================
   PUBLIC HOSPITAL DISCOVERY
============================================================ */

router.get(
    "/hospitals",
    getPublicHospitals,
);

// Direct hospital search by slug
// Example:
// /api/public/hospitals/slug/janhit-hospital
router.get(
    "/hospitals/slug/:slug",
    getPublicHospitalBySlug,
);

router.get(
    "/hospitals/:hospitalId/departments",
    getPublicHospitalDepartments,
);

router.get(
    "/hospitals/:hospitalId/doctors",
    getPublicHospitalDoctors,
);

router.get(
    "/hospitals/:hospitalId/doctors/:doctorId/slots",
    getPublicDoctorSlots,
);

/* ============================================================
   PUBLIC SLOT HOLD
============================================================ */

router.post(
    "/hospitals/:hospitalId/doctors/:doctorId/slots/:slotId/hold",
    holdPublicDoctorSlot,
);

router.post(
    "/hospitals/:hospitalId/doctors/:doctorId/slots/:slotId/release",
    releasePublicDoctorSlot,
);

/* ============================================================
   PUBLIC BOOKING
============================================================ */

router.post(
    "/hospitals/:hospitalId/appointments",
    bookPublicAppointment,
);

router.get(
    "/appointments/:appointmentCode",
    getPublicAppointmentByCode,
);

export default router;