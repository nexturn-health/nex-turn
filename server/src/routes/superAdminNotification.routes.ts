import {
    Router,
    type NextFunction,
    type Request,
    type Response,
} from "express";

import { protect } from "../middleware/auth.middleware";

import {
    getSuperAdminNotifications,
    markAllSuperAdminNotificationsRead,
    markSuperAdminNotificationRead,
} from "../controllers/superAdminNotification.controller";

const router = Router();

const requireSuperAdmin = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (req.user?.role !== "SUPER_ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Super Admin access required.",
        });
    }

    next();
};

router.use(protect);
router.use(requireSuperAdmin);

router.get(
    "/",
    getSuperAdminNotifications,
);

router.patch(
    "/:id/read",
    markSuperAdminNotificationRead,
);

router.patch(
    "/read-all",
    markAllSuperAdminNotificationsRead,
);

export default router;