import jwt from "jsonwebtoken";

import type { UserRole } from "../models/User.model";

export interface JwtPayload {
    userId: string;
    role: UserRole;
    hospitalId?: string;
}

export const generateToken = (
    userId: string,
    role: UserRole,
    hospitalId?: string,
): string => {

    const payload: JwtPayload = {
        userId,
        role,
    };

    // Hospital users have hospitalId.
    // SUPER_ADMIN does not need hospitalId.
    if (hospitalId) {
        payload.hospitalId = hospitalId;
    }

    return jwt.sign(
        payload,
        process.env.JWT_SECRET as string,
        {
            expiresIn: "7d",
        },
    );
};

export const verifyToken = (
    token: string,
): JwtPayload => {

    return jwt.verify(
        token,
        process.env.JWT_SECRET as string,
    ) as JwtPayload;
};