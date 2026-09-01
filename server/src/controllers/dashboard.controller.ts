import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import { Patient } from "../models/Patient.model";
import { User } from "../models/User.model";
import { Department } from "../models/Department.model";
import { Queue } from "../models/Queue.model";


export const getDashboardStats = async (
    req: Request,
    res: Response,
) => {
    try {

        // =================================
        // HOSPITAL ID
        // =================================

        const hospitalId =
            req.user?.hospitalId;

        console.log(
            "DASHBOARD HOSPITAL ID:",
            hospitalId,
        );

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message:
                    "Hospital information not found",
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                hospitalId,
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid hospital ID",
            });
        }

        const hospitalObjectId =
            new mongoose.Types.ObjectId(
                hospitalId,
            );

        // =================================
        // TODAY
        // =================================

        const now = new Date();

        const startOfDay = new Date(now);

        startOfDay.setHours(
            0,
            0,
            0,
            0,
        );

        const endOfDay = new Date(now);

        endOfDay.setHours(
            23,
            59,
            59,
            999,
        );

        // =================================
        // QUEUE DATE
        // IMPORTANT
        // Use local date instead of UTC
        // =================================

        const year =
            now.getFullYear();

        const month =
            String(
                now.getMonth() + 1,
            ).padStart(2, "0");

        const day =
            String(
                now.getDate(),
            ).padStart(2, "0");

        const queueDate =
            `${year}-${month}-${day}`;

        console.log(
            "DASHBOARD QUEUE DATE:",
            queueDate,
        );

        // =================================
        // GET ALL STATS
        // =================================

        const [
            patientsToday,
            doctors,
            departments,
            waitingPatients,
            calledPatients,
            servingPatients,
            completedPatients,
        ] = await Promise.all([

            // =============================
            // PATIENTS TODAY
            // =============================

            Patient.countDocuments({
                hospitalId:
                    hospitalObjectId,

                createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay,
                },
            }),

            // =============================
            // DOCTORS
            // =============================

            User.countDocuments({
                hospitalId:
                    hospitalObjectId,

                role: "DOCTOR",

                isActive: true,
            }),

            // =============================
            // DEPARTMENTS
            // =============================

            Department.countDocuments({
                hospitalId:
                    hospitalObjectId,

                isActive: true,
            }),

            // =============================
            // WAITING PATIENTS
            // =============================

            Queue.countDocuments({
                hospitalId:
                    hospitalObjectId,

                queueDate,

                status: "WAITING",
            }),

            // =============================
            // CALLED
            // =============================

            Queue.countDocuments({
                hospitalId:
                    hospitalObjectId,

                queueDate,

                status: "CALLED",
            }),

            // =============================
            // SERVING
            // =============================

            Queue.countDocuments({
                hospitalId:
                    hospitalObjectId,

                queueDate,

                status: "SERVING",
            }),

            // =============================
            // COMPLETED
            // =============================

            Queue.countDocuments({
                hospitalId:
                    hospitalObjectId,

                queueDate,

                status: "COMPLETED",
            }),
        ]);

        // =================================
        // RESPONSE
        // =================================

        return res.status(200).json({

            success: true,

            data: {

                patientsToday,

                doctors,

                departments,

                waitingPatients,

                calledPatients,

                servingPatients,

                completedPatients,

            },

        });

    } catch (error) {

        console.error(
            "Dashboard stats error:",
            error,
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load dashboard statistics",

        });

    }
};