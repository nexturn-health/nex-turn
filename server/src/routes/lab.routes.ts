import {
  Router,
} from "express";

import {
  // ========================================================
  // LAB ORDERS
  // ========================================================

  createLabOrder,
  getLabOrdersForReceptionist,
  getPendingLabPayments,
  confirmLabPayment,

  // ========================================================
  // PATIENT LAB ORDERS
  // ========================================================

  getTodayPatientLabOrders,

  // ========================================================
  // LAB TECHNICIAN
  // ========================================================

  getLabTechnicianOrders,
  updateLabOrderItemStatus,

  // ========================================================
  // LAB REPORT
  // ========================================================

  getLabReport,

  // ========================================================
  // LAB TESTS
  // ========================================================

  createLabTest,
  getActiveLabTests,
  getLabTests,
  updateLabTest,
  deactivateLabTest,
} from "../controllers/lab.controller";

import {
  protect,
} from "../middleware/auth.middleware";

import {
  authorize,
} from "../middleware/role.middleware";

import {
  requirePremium,
} from "../middleware/subscription.middleware";

import {
  labReportUpload,
} from "../middleware/labReportUpload.middleware";

const router =
  Router();

// ============================================================
// AUTHENTICATION
// ============================================================

router.use(
  protect,
);

// ============================================================
// PREMIUM SUBSCRIPTION REQUIRED
// ============================================================

router.use(
  requirePremium,
);

// ============================================================
// LAB ORDERS
// ============================================================

/**
 * Create a new lab order
 *
 * POST /api/lab-tests/orders
 *
 * Doctor only
 */

router.post(
  "/orders",

  authorize(
    "DOCTOR",
  ),

  createLabOrder,
);

/**
 * Get lab orders for receptionist
 *
 * GET /api/lab-tests/orders
 */

router.get(
  "/orders",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  getLabOrdersForReceptionist,
);

/**
 * Get lab orders waiting for payment
 *
 * GET /api/lab-tests/orders/pending-payments
 */

router.get(
  "/orders/pending-payments",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  getPendingLabPayments,
);

/**
 * Confirm lab payment
 *
 * PATCH /api/lab-tests/orders/:orderId/payment
 */

router.patch(
  "/orders/:orderId/payment",

  authorize(
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
  ),

  confirmLabPayment,
);

// ============================================================
// PATIENT LAB ORDERS
// ============================================================

/**
 * Get today's lab orders for a patient
 *
 * GET /api/lab-tests/patient/:patientId/today
 */

router.get(
  "/patient/:patientId/today",

  authorize(
    "DOCTOR",
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
    "LAB_TECHNICIAN",
  ),

  getTodayPatientLabOrders,
);

// ============================================================
// LAB TECHNICIAN
// ============================================================

/**
 * Get orders assigned to logged-in lab technician
 *
 * GET /api/lab-tests/technician/orders
 */

router.get(
  "/technician/orders",

  authorize(
    "LAB_TECHNICIAN",
    "HOSPITAL_ADMIN",
  ),

  getLabTechnicianOrders,
);

/**
 * Update lab order item status
 *
 * PATCH
 * /api/lab-tests/technician/orders/:orderId/items/:itemId
 *
 * multipart/form-data
 *
 * reportFile
 */

router.patch(
  "/technician/orders/:orderId/items/:itemId",

  authorize(
    "LAB_TECHNICIAN",
  ),

  labReportUpload.single(
    "reportFile",
  ),

  updateLabOrderItemStatus,
);

// ============================================================
// LAB REPORT
// ============================================================

/**
 * Get secure lab report
 *
 * GET /api/lab-tests/reports/:orderId/:itemId
 */

router.get(
  "/reports/:orderId/:itemId",

  authorize(
    "DOCTOR",
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
    "LAB_TECHNICIAN",
  ),

  getLabReport,
);

// ============================================================
// LAB TESTS
// ============================================================

/**
 * Get active lab tests
 *
 * GET /api/lab-tests/active
 */

router.get(
  "/active",

  authorize(
    "DOCTOR",
    "HOSPITAL_ADMIN",
    "RECEPTIONIST",
    "LAB_TECHNICIAN",
  ),

  getActiveLabTests,
);

/**
 * Get all lab tests
 *
 * GET /api/lab-tests
 */

router.get(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
    "DOCTOR",
    "RECEPTIONIST",
    "LAB_TECHNICIAN",
  ),

  getLabTests,
);

/**
 * Create lab test
 *
 * POST /api/lab-tests
 */

router.post(
  "/",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  createLabTest,
);

/**
 * Update lab test
 *
 * PATCH /api/lab-tests/:id
 */

router.patch(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  updateLabTest,
);

/**
 * Deactivate lab test
 *
 * DELETE /api/lab-tests/:id
 */

router.delete(
  "/:id",

  authorize(
    "HOSPITAL_ADMIN",
  ),

  deactivateLabTest,
);

// ============================================================
// EXPORT
// ============================================================

export default router;