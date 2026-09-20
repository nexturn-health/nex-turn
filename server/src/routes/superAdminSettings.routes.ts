import {
    Router,
    type NextFunction,
    type Request,
    type Response,
} from "express";

import { protect } from "../middleware/auth.middleware";

import {
    getSuperAdminSettings,
    updateSuperAdminSettings,
} from "../controllers/superAdminSettings.controller";

const router = Router();

const superAdminOnly = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (req.user?.role !== "SUPER_ADMIN") {
        return res.status(403).json({
            success: false,
            message:
                "Super Admin access required",
        });
    }

    next();
};

router.use(protect);
router.use(superAdminOnly);

router.get(
    "/",
    getSuperAdminSettings,
);

router.patch(
    "/",
    updateSuperAdminSettings,
);

export default router;