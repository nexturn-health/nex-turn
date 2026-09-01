import type {
    Request,
    Response,
    NextFunction,
} from "express";

/**
 * ==========================================
 * SUPER ADMIN AUTHORIZATION
 * ==========================================
 *
 * This middleware assumes that the JWT has
 * already been verified by `protect`.
 *
 * protect()
 *     ↓
 * superAdmin()
 *     ↓
 * controller
 */

export const superAdmin = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        // ----------------------------------
        // Check authenticated user
        // ----------------------------------

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required",
            });
        }

        // ----------------------------------
        // Check SUPER_ADMIN role
        // ----------------------------------

        if (
            req.user.role !==
            "SUPER_ADMIN"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Super Admin access required",
            });
        }

        // ----------------------------------
        // Authorized
        // ----------------------------------

        next();
    } catch (error) {
        console.error(
            "Super Admin middleware error:",
            error,
        );

        return res.status(403).json({
            success: false,
            message:
                "Super Admin authorization failed",
        });
    }
};