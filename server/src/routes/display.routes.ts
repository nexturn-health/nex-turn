import { Router } from "express";

import {
    createDisplay,
    getPublicDisplayBoard,
    getDisplayConfig,
    updateDisplayConfig,
    regenerateDisplayKey,
} from "../controllers/display.controller";

import { protect } from "../middleware/auth.middleware";

import { authorize } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/public/:displayKey",
    getPublicDisplayBoard,
);


router.post(
    "/",
    protect,
    authorize("HOSPITAL_ADMIN"),
    createDisplay,
);


// =====================================================
// GET DISPLAY CONFIG
// =====================================================
//
// GET /api/display/config
//
// ADMIN ONLY
// =====================================================

router.get(
    "/config",
    protect,
    authorize("HOSPITAL_ADMIN"),
    getDisplayConfig,
);


// =====================================================
// UPDATE DISPLAY CONFIG
// =====================================================
//
// PUT /api/display/config
//
// ADMIN ONLY
// =====================================================

router.put(
    "/config",
    protect,
    authorize("HOSPITAL_ADMIN"),
    updateDisplayConfig,
);


// =====================================================
// REGENERATE DISPLAY KEY
// =====================================================
//
// POST /api/display/regenerate-key
//
// ADMIN ONLY
// =====================================================

router.post(
    "/regenerate-key",
    protect,
    authorize("HOSPITAL_ADMIN"),
    regenerateDisplayKey,
);


export default router;