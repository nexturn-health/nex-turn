import type {
    Request,
    Response,
    NextFunction,
} from "express";

import {
    verifyToken,
} from "../utils/jwt";

export const protect = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const authorization =
            req.headers.authorization;

        console.log("================================");
        console.log("AUTH HEADER:", authorization);

        if (!authorization) {
            return res.status(401).json({
                success: false,
                message: "Authorization token is required",
            });
        }

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format",
            });
        }

        const token = authorization.substring(7);

        console.log("TOKEN:", token);

        const decoded = verifyToken(token);

        console.log("DECODED JWT:", decoded);
        console.log("JWT USER ID:", decoded.userId);
        console.log("JWT ROLE:", decoded.role);
        console.log("JWT HOSPITAL ID:", decoded.hospitalId);

        req.user = decoded;

        console.log("REQ.USER:", req.user);
        console.log("================================");

        next();

    } catch (error) {
        console.error("JWT verification error:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};