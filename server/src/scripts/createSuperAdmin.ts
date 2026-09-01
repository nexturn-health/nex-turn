import dotenv from "dotenv";
import mongoose from "mongoose";

import { User } from "../models/User.model";

// Load server/.env
dotenv.config({
    path: ".env",
});

const createSuperAdmin = async () => {
    try {
        console.log(
            "MONGODB_URI exists:",
            !!process.env.MONGODB_URI,
        );

        if (!process.env.MONGODB_URI) {
            throw new Error(
                "MONGODB_URI is missing. Check server/.env",
            );
        }

        await mongoose.connect(
            process.env.MONGODB_URI,
        );

        console.log(
            "MongoDB connected",
        );

        const existing =
            await User.findOne({
                email: "superadmin@nexturn.com",
            });

        if (existing) {
            console.log(
                "Super Admin already exists",
            );

            await mongoose.disconnect();

            process.exit(0);
        }

        await User.create({
            name: "NexTurn Super Admin",

            email: "superadmin@nexturn.com",

            password: "SuperAdmin@123",

            role: "SUPER_ADMIN",

            isActive: true,
        });

        console.log(
            "SUPER_ADMIN created successfully",
        );

        console.log(
            "Email: superadmin@nexturn.com",
        );

        console.log(
            "Password: SuperAdmin@123",
        );

        await mongoose.disconnect();

        process.exit(0);
    } catch (error) {
        console.error(
            "Super Admin creation failed:",
            error,
        );

        await mongoose.disconnect();

        process.exit(1);
    }
};

createSuperAdmin();