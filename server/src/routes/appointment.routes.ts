import {
    Router,
} from "express";

import {
    protect,
} from "../middleware/auth.middleware";

import appointmentController from "../controllers/appointment.controller";

const {
    getAppointmentDoctors,
    searchAppointmentPatients,

    getDoctorSchedule,
    updateDoctorSchedule,

    getDoctorSlots,
    updateDoctorSlot,

    createAppointment,
    getAppointments,

    confirmAppointment,
    rejectAppointment,
    cancelAppointment,
    rescheduleAppointment,
    markAppointmentNoShow,

    markAppointmentArrived,
    collectAppointmentPayment,
    checkInAppointment,
} =
    appointmentController;

const router =
    Router();

/* ============================================================
   ALL ROUTES REQUIRE LOGIN
============================================================ */

router.use(
    protect,
);

/* ============================================================
   SUPPORT DATA
============================================================ */

router.get(
    "/doctors",
    getAppointmentDoctors,
);

router.get(
    "/patients/search",
    searchAppointmentPatients,
);

/* ============================================================
   DOCTOR SCHEDULE
============================================================ */

router.get(
    "/doctors/:doctorId/schedule",
    getDoctorSchedule,
);

router.put(
    "/doctors/:doctorId/schedule",
    updateDoctorSchedule,
);

/* ============================================================
   SLOTS
============================================================ */

router.get(
    "/doctors/:doctorId/slots",
    getDoctorSlots,
);

router.patch(
    "/slots/:slotId",
    updateDoctorSlot,
);

/* ============================================================
   APPOINTMENTS
============================================================ */

router.get(
    "/",
    getAppointments,
);

router.post(
    "/",
    createAppointment,
);

/* ============================================================
   ACTIONS
============================================================ */

router.post(
    "/:id/confirm",
    confirmAppointment,
);

router.post(
    "/:id/reject",
    rejectAppointment,
);

router.post(
    "/:id/cancel",
    cancelAppointment,
);

router.post(
    "/:id/reschedule",
    rescheduleAppointment,
);

router.post(
    "/:id/no-show",
    markAppointmentNoShow,
);

router.post(
    "/:id/arrived",
    markAppointmentArrived,
);

router.post(
    "/:id/payment",
    collectAppointmentPayment,
);

router.post(
    "/:id/check-in",
    checkInAppointment,
);

export default router;