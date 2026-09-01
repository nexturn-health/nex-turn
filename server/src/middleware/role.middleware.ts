import type {
  Request,
  Response,
  NextFunction,
} from "express";

import type { UserRole } from "../models/User.model";

export const authorize = (...allowedRoles: UserRole[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.log("=================================");
    console.log("AUTHORIZATION DEBUG");
    console.log("User:", req.user);
    console.log("User role:", req.user?.role);
    console.log("Allowed roles:", allowedRoles);
    console.log("=================================");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !allowedRoles.includes(
        req.user.role as UserRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action",
        userRole: req.user.role,
        allowedRoles,
      });
    }

    next();
  };
};