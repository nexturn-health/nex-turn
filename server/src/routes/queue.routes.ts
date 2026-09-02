import { Router } from "express";

import {
  createQueue,
  getQueues,
  callNextPatient,
  startServingPatient,
  completePatient,
  skipPatient,
  getDoctorQueue
} from "../controllers/queue.controller";

import {
    trackQueue,
} from "../controllers/queueTracking.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();



router.get(
    "/track/:trackingToken",
    trackQueue,
);


// =====================================
// AUTHENTICATION
// =====================================

router.use(protect);

// =====================================
// CREATE QUEUE / GENERATE TOKEN
// POST /api/queues
// =====================================

router.post(
  "/",
  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),
  createQueue,
);

// =====================================
// GET TODAY'S QUEUE
// GET /api/queues
// =====================================

router.get(
  "/",
  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
    "DOCTOR",
  ),
  getQueues,
);

// =====================================
// DOCTOR CALL NEXT PATIENT
// PATCH /api/queues/call-next
// =====================================

router.patch(
  "/call-next",
  authorize("DOCTOR"),
  callNextPatient,
);

// =====================================
// START SERVING
// PATCH /api/queues/:id/start
// =====================================

router.patch(
  "/:id/start",
  authorize("DOCTOR"),
  startServingPatient,
);

// =====================================
// COMPLETE PATIENT
// PATCH /api/queues/:id/complete
// =====================================

router.patch(
  "/:id/complete",
  authorize("DOCTOR"),
  completePatient,
);

// =====================================
// SKIP PATIENT
// PATCH /api/queues/:id/skip
// =====================================

router.patch(
  "/:id/skip",
  authorize("DOCTOR"),
  skipPatient,
);

router.get(
  "/doctor",
  protect,
  getDoctorQueue
);

// =====================================
// EXPORT
// =====================================

export default router;