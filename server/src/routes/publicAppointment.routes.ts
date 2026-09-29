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

   The client calls hold before showing the patient form. The hold
   is short-lived and is identified by an unguessable token.
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
