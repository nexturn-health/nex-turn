import "dotenv/config";

import bcrypt from "bcryptjs";

import { User } from "../models/User.model";
import { connectDB } from "../config/db";

const resetSuperAdminPassword = async () => {
    try {
        await connectDB();

        const email =
            "";

        const newPassword =
            "";

        const user =
            await User.findOne({
                email,
            });

        if (!user) {
            console.log(
                "SUPER ADMIN NOT FOUND:",
                email,
            );

            process.exit(1);
        }

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                10,
            );

        user.password =
            hashedPassword;

        user.role =
            "SUPER_ADMIN";

        user.isActive =
            true;

        await user.save();

        console.log(
            "================================",
        );

        console.log(
            "SUPER ADMIN PASSWORD RESET",
        );

        console.log(
            "Email:",
            email,
        );

        console.log(
            "Password:",
            newPassword,
        );

        console.log(
            "Role:",
            user.role,
        );

        console.log(
            "================================",
        );

        process.exit(0);
    } catch (error) {
        console.error(
            "Reset Super Admin error:",
            error,
        );

        process.exit(1);
    }
};

resetSuperAdminPassword();