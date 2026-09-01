import { Router } from "express";

import { protect } from "../middleware/auth.middleware";

import {
    superAdmin,
} from "../middleware/superAdmin.middleware";

import {
    getSuperAdminDashboard,
} from "../controllers/superAdmin.controller";

const router = Router();

// ==========================================
// SUPER ADMIN DASHBOARD
// ==========================================

router.get(
    "/dashboard",
    protect,
    superAdmin,
    getSuperAdminDashboard,
);

export default router;