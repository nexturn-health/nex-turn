import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import { User } from "../models/User.model";
import { Patient } from "../models/Patient.model";
import { Queue } from "../models/Queue.model";
import { Department } from "../models/Department.model";
import { Hospital } from "../models/Hospital.model";

// ==========================================
// SUPER ADMIN DASHBOARD
// GET /api/super-admin/dashboard
// ==========================================

export const getSuperAdminDashboard =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            console.log("================================");
        console.log("SUPER ADMIN CONTROLLER HIT");
        console.log("USER:", req.user);
        console.log("ROLE:", req.user?.role);
        console.log(
            "ROLE TYPE:",
            typeof req.user?.role,
        );
        console.log(
            "ROLE MATCH:",
            req.user?.role === "SUPER_ADMIN",
        );
        console.log("================================");


            if (
                !req.user ||
                req.user.role !==
                "SUPER_ADMIN"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Super Admin access required",
                });
            }

            console.log(
                "SUPER ADMIN REQUEST USER:",
                req.user,
            );

            // =================================
            // TODAY
            // =================================

            const today =
                new Date()
                    .toISOString()
                    .split("T")[0];

            // =================================
            // HOSPITAL STATISTICS
            // =================================

            const totalHospitals =
                await Hospital.countDocuments();

            // If your Hospital model has
            // isActive, this will work.
            const activeHospitals =
                await Hospital.countDocuments({
                    isActive: true,
                });

            // =================================
            // USER STATISTICS
            // =================================

            const totalHospitalAdmins =
                await User.countDocuments({
                    role: "HOSPITAL_ADMIN",
                });

            const totalDoctors =
                await User.countDocuments({
                    role: "DOCTOR",
                });

            const totalReceptionists =
                await User.countDocuments({
                    role: "RECEPTIONIST",
                });

            const totalSuperAdmins =
                await User.countDocuments({
                    role: "SUPER_ADMIN",
                });

            // =================================
            // PATIENT STATISTICS
            // =================================

            const totalPatients =
                await Patient.countDocuments();

            // =================================
            // DEPARTMENT STATISTICS
            // =================================

            const totalDepartments =
                await Department.countDocuments();

            const activeDepartments =
                await Department.countDocuments({
                    isActive: true,
                });

            // =================================
            // TODAY'S PATIENTS
            // =================================

            const patientsToday =
                await Patient.countDocuments({
                    createdAt: {
                        $gte: new Date(
                            `${today}T00:00:00.000Z`,
                        ),
                        $lt: new Date(
                            `${today}T23:59:59.999Z`,
                        ),
                    },
                });

            // =================================
            // TODAY'S QUEUES
            // =================================

            const totalTokensToday =
                await Queue.countDocuments({
                    queueDate: today,
                });

            const waitingPatients =
                await Queue.countDocuments({
                    queueDate: today,
                    status: "WAITING",
                });

            const calledPatients =
                await Queue.countDocuments({
                    queueDate: today,
                    status: "CALLED",
                });

            const servingPatients =
                await Queue.countDocuments({
                    queueDate: today,
                    status: "SERVING",
                });

            const completedPatients =
                await Queue.countDocuments({
                    queueDate: today,
                    status: "COMPLETED",
                });

            const skippedPatients =
                await Queue.countDocuments({
                    queueDate: today,
                    status: "SKIPPED",
                });

            // =================================
            // RESPONSE
            // =================================

            return res.status(200).json({
                success: true,

                data: {
                    hospitals: {
                        total:
                            totalHospitals,

                        active:
                            activeHospitals,

                        inactive:
                            totalHospitals -
                            activeHospitals,
                    },

                    users: {
                        totalHospitalAdmins,
                        totalDoctors,
                        totalReceptionists,
                        totalSuperAdmins,

                        total:
                            totalHospitalAdmins +
                            totalDoctors +
                            totalReceptionists +
                            totalSuperAdmins,
                    },

                    patients: {
                        total:
                            totalPatients,

                        today:
                            patientsToday,
                    },

                    departments: {
                        total:
                            totalDepartments,

                        active:
                            activeDepartments,

                        inactive:
                            totalDepartments -
                            activeDepartments,
                    },

                    queues: {
                        totalTokensToday,

                        waiting:
                            waitingPatients,

                        called:
                            calledPatients,

                        serving:
                            servingPatients,

                        completed:
                            completedPatients,

                        skipped:
                            skippedPatients,
                    },

                    generatedAt:
                        new Date(),
                },
            });
        } catch (error) {
            console.error(
                "Super Admin dashboard error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load Super Admin dashboard",
            });
        }
    };