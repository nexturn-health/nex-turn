import { Router } from "express";

import {
  createQueue,
  getQueues,
  callNextPatient,
  startServingPatient,
  completePatient,
  skipPatient,
  getDoctorQueue,
  takeDoctorBreak,
  resumeDoctorDuty,
  callSelectedPatient,
} from "../controllers/queue.controller";

import {
  trackQueue,
} from "../controllers/queueTracking.controller";

import {
  protect,
} from "../middleware/auth.middleware";

import {
  authorize,
} from "../middleware/role.middleware";

import {
  requireSubscription,
} from "../middleware/subscription.middleware";

const router = Router();

/* =========================================================
   PUBLIC PATIENT TRACKING

   GET /api/queues/track/:trackingToken
========================================================= */

router.get(
  "/track/:trackingToken",
  trackQueue,
);

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(protect);

/* =========================================================
   ACTIVE SUBSCRIPTION REQUIRED

   BASIC + PREMIUM
========================================================= */

router.use(requireSubscription);

/* =========================================================
   CREATE QUEUE / GENERATE TOKEN

   POST /api/queues

   HOSPITAL_ADMIN
   RECEPTIONIST
========================================================= */

router.post(
  "/",
  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),
  createQueue,
);

/* =========================================================
   GET TODAY'S QUEUE

   GET /api/queues

   HOSPITAL_ADMIN
   RECEPTIONIST
   DOCTOR
========================================================= */

router.get(
  "/",
  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
    "DOCTOR",
  ),
  getQueues,
);

/* =========================================================
   DOCTOR QUEUE

   GET /api/queues/doctor
========================================================= */

router.get(
  "/doctor",
  authorize(
    "DOCTOR",
  ),
  getDoctorQueue,
);

/* =========================================================
   DOCTOR CALL NEXT PATIENT

   PATCH /api/queues/call-next
========================================================= */

router.patch(
  "/call-next",
  authorize(
    "DOCTOR",
  ),
  callNextPatient,
);


router.patch(
  "/doctor/break",
  protect,
  authorize(
    "DOCTOR",
  ),
  takeDoctorBreak,
);

router.patch(
  "/doctor/resume",
  protect,
  authorize(
    "DOCTOR",
  ),
  resumeDoctorDuty,
);

router.patch(
  "/:id/call-selected",
  protect,
  authorize("DOCTOR"),
  callSelectedPatient,
);

/* =========================================================
   START SERVING

   PATCH /api/queues/:id/start
========================================================= */

router.patch(
  "/:id/start",
  authorize(
    "DOCTOR",
  ),
  startServingPatient,
);

/* =========================================================
   COMPLETE PATIENT

   PATCH /api/queues/:id/complete
========================================================= */

router.patch(
  "/:id/complete",
  authorize(
    "DOCTOR",
  ),
  completePatient,
);

/* =========================================================
   SKIP PATIENT

   PATCH /api/queues/:id/skip
========================================================= */

router.patch(
  "/:id/skip",
  authorize(
    "DOCTOR",
  ),
  skipPatient,
);

/* =========================================================
   EXPORT
========================================================= */

export default router;