import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.model";
import { Patient } from "../models/Patient.model";
import { Queue } from "../models/Queue.model";
import { Department } from "../models/Department.model";
import { Hospital } from "../models/Hospital.model";
import { SubscriptionHistory, } from "../models/SubscriptionHistory.model";

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

/* =========================================================
   GET ALL HOSPITALS
   GET /api/super-admin/hospitals
========================================================= */

export const getSuperAdminHospitals = async (
    req: Request,
    res: Response,
) => {
    try {
        if (
            !req.user ||
            req.user.role !== "SUPER_ADMIN"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Super Admin access required",
            });
        }

        const hospitals =
            await Hospital.find()
                .sort({
                    createdAt: -1,
                })
                .lean();

        return res.status(200).json({
            success: true,

            data: hospitals,
        });
    } catch (error) {
        console.error(
            "Get Super Admin hospitals error:",
            error,
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to load hospitals",
        });
    }
};


/* =========================================================
   GET HOSPITAL SUBSCRIPTION
   GET /api/super-admin/hospitals/:hospitalId/subscription
========================================================= */


export const getHospitalSubscription =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            /* =========================================
               SUPER ADMIN CHECK
            ========================================= */

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

            /* =========================================
               GET HOSPITAL ID
            ========================================= */

            const rawHospitalId =
                req.params.hospitalId;

            const hospitalId =
                Array.isArray(rawHospitalId)
                    ? rawHospitalId[0]
                    : rawHospitalId;

            /* =========================================
               VALIDATE HOSPITAL ID
            ========================================= */

            if (
                !hospitalId ||
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

            /* =========================================
               FIND HOSPITAL
            ========================================= */

            const hospital =
                await Hospital.findById(
                    hospitalId,
                ).lean();

            if (!hospital) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Hospital not found",
                });
            }

            /* =========================================
               RESPONSE
            ========================================= */

            return res.status(200).json({
                success: true,

                data: {
                    hospital: {
                        id: hospital._id,
                        name: hospital.name,
                        email: hospital.email,
                        phone: hospital.phone,
                        isActive:
                            hospital.isActive,
                    },

                    subscription: {
                        plan:
                            hospital.plan,

                        status:
                            hospital.subscriptionStatus,

                        trialStartedAt:
                            hospital.trialStartedAt,

                        trialEndsAt:
                            hospital.trialEndsAt,

                        subscriptionStartedAt:
                            hospital.subscriptionStartedAt,

                        subscriptionEndsAt:
                            hospital.subscriptionEndsAt,
                    },
                },
            });
        } catch (error) {
            console.error(
                "Get hospital subscription error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load hospital subscription",
            });
        }
    };



export const activateHospitalSubscription =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            /* =====================================================
               SUPER ADMIN CHECK
            ===================================================== */

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

            /* =====================================================
               HOSPITAL ID
            ===================================================== */

            const rawHospitalId =
                req.params.hospitalId;

            const hospitalId =
                Array.isArray(
                    rawHospitalId,
                )
                    ? rawHospitalId[0]
                    : rawHospitalId;

            /* =====================================================
               BODY
            ===================================================== */

            const {
                plan,
                durationMonths,
                amount,
                paymentMethod,
                paymentReference,
                notes,
            } = req.body;

            /* =====================================================
               VALIDATE HOSPITAL ID
            ===================================================== */

            if (
                !hospitalId ||
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

            /* =====================================================
               VALIDATE PLAN
            ===================================================== */

            if (
                plan !== "BASIC" &&
                plan !== "PREMIUM"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Plan must be BASIC or PREMIUM",
                });
            }

            /* =====================================================
               VALIDATE DURATION
            ===================================================== */

            const parsedDurationMonths =
                Number(durationMonths);

            if (
                !Number.isInteger(
                    parsedDurationMonths,
                ) ||
                parsedDurationMonths <= 0
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Duration must be a positive number of months",
                });
            }

            /* =====================================================
               VALIDATE AMOUNT
            ===================================================== */

            let parsedAmount:
                number | undefined =
                undefined;

            if (
                amount !== undefined &&
                amount !== null &&
                amount !== ""
            ) {
                parsedAmount =
                    Number(amount);

                if (
                    !Number.isFinite(
                        parsedAmount,
                    ) ||
                    parsedAmount < 0
                ) {
                    return res.status(400).json({
                        success: false,

                        message:
                            "Amount must be a valid non-negative number",
                    });
                }
            }

            /* =====================================================
               VALIDATE PAYMENT METHOD
            ===================================================== */

            const validPaymentMethods =
                [
                    "CASH",
                    "UPI",
                    "BANK_TRANSFER",
                    "CHEQUE",
                    "OTHER",
                ] as const;

            if (
                paymentMethod &&
                !validPaymentMethods.includes(
                    paymentMethod,
                )
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Payment method must be CASH, UPI, BANK_TRANSFER, CHEQUE or OTHER",
                });
            }

            /* =====================================================
               FIND HOSPITAL
            ===================================================== */

            const hospital =
                await Hospital.findById(
                    hospitalId,
                );

            if (!hospital) {
                return res.status(404).json({
                    success: false,

                    message:
                        "Hospital not found",
                });
            }

            /* =====================================================
               HOSPITAL MUST BE ACTIVE
            ===================================================== */

            if (!hospital.isActive) {
                return res.status(403).json({
                    success: false,

                    message:
                        "Cannot activate subscription for an inactive hospital",
                });
            }

            /* =====================================================
               CURRENT VALUES BEFORE UPDATE
            ===================================================== */

            const now =
                new Date();

            const previousPlan =
                hospital.plan;

            const previousStatus =
                hospital.subscriptionStatus;

            const previousSubscriptionEnd =
                hospital.subscriptionEndsAt
                    ? new Date(
                        hospital.subscriptionEndsAt,
                    )
                    : undefined;

            /* =====================================================
               DETERMINE ACTION
      
               ACTIVATED
               RENEWED
               PLAN_CHANGED
            ===================================================== */

            let action:
                | "ACTIVATED"
                | "RENEWED"
                | "PLAN_CHANGED";

            if (
                previousStatus === "ACTIVE" &&
                previousPlan !== plan
            ) {
                action =
                    "PLAN_CHANGED";
            } else if (
                previousStatus === "ACTIVE"
            ) {
                action =
                    "RENEWED";
            } else {
                action =
                    "ACTIVATED";
            }

            /* =====================================================
               DETERMINE START DATE
      
               If currently ACTIVE and not expired:
               extend from current expiry.
      
               Otherwise:
               start from now.
            ===================================================== */

            let startDate =
                new Date(now);

            if (
                previousStatus === "ACTIVE" &&
                previousSubscriptionEnd &&
                previousSubscriptionEnd >
                now
            ) {
                startDate =
                    new Date(
                        previousSubscriptionEnd,
                    );
            }

            /* =====================================================
               CALCULATE END DATE
            ===================================================== */

            const endDate =
                new Date(startDate);

            endDate.setMonth(
                endDate.getMonth() +
                parsedDurationMonths,
            );

            /* =====================================================
               UPDATE HOSPITAL
            ===================================================== */

            hospital.plan =
                plan;

            hospital.subscriptionStatus =
                "ACTIVE";

            hospital.subscriptionStartedAt =
                startDate;

            hospital.subscriptionEndsAt =
                endDate;

            /*
             * Once paid subscription is activated,
             * trial is finished.
             */

            hospital.trialStartedAt =
                undefined;

            hospital.trialEndsAt =
                undefined;

            await hospital.save();

            /* =====================================================
               CREATE HISTORY
            ===================================================== */

            const history =
                await SubscriptionHistory.create({
                    hospitalId:
                        hospital._id,

                    previousPlan,

                    plan,

                    action,

                    durationMonths:
                        parsedDurationMonths,

                    amount:
                        parsedAmount,

                    paymentMethod:
                        paymentMethod ||
                        undefined,

                    paymentReference:
                        paymentReference
                            ? String(
                                paymentReference,
                            ).trim()
                            : undefined,

                    subscriptionStartedAt:
                        startDate,

                    subscriptionEndsAt:
                        endDate,

                    activatedBy:
                        new mongoose.Types.ObjectId(
                            req.user.userId,
                        ),

                    notes:
                        notes
                            ? String(
                                notes,
                            ).trim()
                            : undefined,
                });

            /* =====================================================
               RESPONSE
            ===================================================== */

            return res.status(200).json({
                success: true,

                message:
                    action === "RENEWED"
                        ? "Hospital subscription renewed successfully"
                        : action ===
                            "PLAN_CHANGED"
                            ? "Hospital subscription plan changed successfully"
                            : "Hospital subscription activated successfully",

                data: {
                    hospital: {
                        id:
                            hospital._id,

                        name:
                            hospital.name,

                        plan:
                            hospital.plan,

                        previousPlan,

                        subscriptionStatus:
                            hospital.subscriptionStatus,

                        subscriptionStartedAt:
                            hospital.subscriptionStartedAt,

                        subscriptionEndsAt:
                            hospital.subscriptionEndsAt,
                    },

                    subscription: {
                        action,

                        durationMonths:
                            parsedDurationMonths,

                        previousPlan,

                        plan,

                        startDate,

                        endDate,
                    },

                    payment: {
                        amount:
                            history.amount ??
                            null,

                        paymentMethod:
                            history.paymentMethod ??
                            null,

                        paymentReference:
                            history.paymentReference ??
                            null,
                    },

                    history: {
                        id:
                            history._id,

                        action:
                            history.action,

                        createdAt:
                            history.createdAt,
                    },
                },
            });
        } catch (error) {
            console.error(
                "Activate hospital subscription error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to activate hospital subscription",
            });
        }
    };


// ============================================================
// CREATE HOSPITAL + HOSPITAL ADMIN
// SUPER ADMIN ONLY
// ============================================================
export const createHospital = async (
    req: Request,
    res: Response,
) => {
    const session =
        await mongoose.startSession();

    let transactionStarted =
        false;

    try {
        if (
            !req.user ||
            req.user.role !== "SUPER_ADMIN"
        ) {
            return res.status(403).json({
                success: false,
                message: "Super Admin access required",
            });
        }

        const {
            hospitalName,
            publicName,
            name,
            email,
            password,
            phone,
            address,
            addressLine,
            city,
            district,
            state,
            country = "India",
            pincode,
            publicAddress,
            publicBookingEnabled = true,
            registrationNumber,
        } = req.body;

        const cleanHospitalName =
            String(hospitalName || "").trim();

        const cleanPublicName =
            String(publicName || "").trim() ||
            cleanHospitalName;

        const cleanAdminName =
            String(name || "").trim();

        const normalizedEmail =
            String(email || "")
                .toLowerCase()
                .trim();

        const cleanPhone =
            String(phone || "").trim();

        const cleanAddress =
            String(addressLine || address || "").trim();

        const cleanCity =
            String(city || "").trim();

        const cleanDistrict =
            String(district || "").trim();

        const cleanState =
            String(state || "").trim();

        const cleanCountry =
            String(country || "India").trim();

        const cleanPincode =
            String(pincode || "").trim();

        const cleanRegistrationNumber =
            String(registrationNumber || "")
                .trim()
                .toUpperCase();

        const cleanPublicAddress =
            String(publicAddress || "").trim() ||
            [
                cleanAddress,
                cleanCity,
                cleanDistrict,
                cleanState,
                cleanPincode,
            ]
                .filter(Boolean)
                .join(", ");

        if (
            !cleanHospitalName ||
            !cleanAdminName ||
            !normalizedEmail ||
            !password ||
            !cleanPhone
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Hospital name, admin name, email, password and phone are required",
            });
        }

        if (
            !cleanState ||
            !cleanDistrict ||
            !cleanCity ||
            !cleanPincode
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "State, district, city and pincode are required for appointment booking",
            });
        }

        if (
            typeof password !== "string" ||
            password.length < 6
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters",
            });
        }

        const existingUser =
            await User.findOne({
                email: normalizedEmail,
            }).lean();

        if (
            existingUser
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Admin email already exists",
            });
        }

        const existingHospital =
            await Hospital.findOne({
                email: normalizedEmail,
            }).lean();

        if (
            existingHospital
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Hospital email already exists",
            });
        }

        if (
            cleanRegistrationNumber
        ) {
            const existingRegistration =
                await Hospital.findOne({
                    registrationNumber:
                        cleanRegistrationNumber,
                }).lean();

            if (
                existingRegistration
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Hospital registration number already exists",
                });
            }
        }

        session.startTransaction();

        transactionStarted =
            true;

        const trialStartedAt =
            new Date();

        const trialEndsAt =
            new Date(
                trialStartedAt.getTime() +
                14 *
                24 *
                60 *
                60 *
                1000,
            );

        const hospital =
            new Hospital({
                name:
                    cleanHospitalName,

                publicName:
                    cleanPublicName,

                email:
                    normalizedEmail,

                phone:
                    cleanPhone,

                address: {
                    addressLine:
                        cleanAddress,

                    line1:
                        cleanAddress,

                    line2:
                        "",

                    city:
                        cleanCity,

                    district:
                        cleanDistrict,

                    state:
                        cleanState,

                    country:
                        cleanCountry,

                    pincode:
                        cleanPincode,
                },

                publicAddress:
                    cleanPublicAddress,

                city:
                    cleanCity,

                district:
                    cleanDistrict,

                state:
                    cleanState,

                country:
                    cleanCountry,

                pincode:
                    cleanPincode,

                publicBookingEnabled:
                    Boolean(
                        publicBookingEnabled,
                    ),

                registrationNumber:
                    cleanRegistrationNumber ||
                    undefined,

                plan:
                    "BASIC",

                subscriptionStatus:
                    "TRIAL",

                trialStartedAt,

                trialEndsAt,

                isActive:
                    true,
            });

        await hospital.save({
            session,
        });

        const hashedPassword =
            await bcrypt.hash(
                password,
                10,
            );

        const user =
            new User({
                name:
                    cleanAdminName,

                email:
                    normalizedEmail,

                phone:
                    cleanPhone,

                password:
                    hashedPassword,

                role:
                    "HOSPITAL_ADMIN",

                hospitalId:
                    hospital._id,

                isActive:
                    true,

                isOnline:
                    false,
            });

        await user.save({
            session,
        });

        await session.commitTransaction();

        transactionStarted =
            false;

        return res.status(201).json({
            success: true,
            message:
                "Hospital and Hospital Admin created successfully",
            data: {
                hospital: {
                    id:
                        hospital._id,

                    name:
                        hospital.name,

                    publicName:
                        hospital.publicName,

                    email:
                        hospital.email,

                    phone:
                        hospital.phone,

                    address:
                        hospital.address,

                    publicAddress:
                        hospital.publicAddress,

                    city:
                        hospital.city,

                    district:
                        hospital.district,

                    state:
                        hospital.state,

                    country:
                        hospital.country,

                    pincode:
                        hospital.pincode,

                    publicBookingEnabled:
                        hospital.publicBookingEnabled,

                    registrationNumber:
                        hospital.registrationNumber,

                    isActive:
                        hospital.isActive,

                    plan:
                        hospital.plan,

                    subscriptionStatus:
                        hospital.subscriptionStatus,

                    trialStartedAt:
                        hospital.trialStartedAt,

                    trialEndsAt:
                        hospital.trialEndsAt,
                },

                admin: {
                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    role:
                        user.role,

                    hospitalId:
                        user.hospitalId,

                    isActive:
                        user.isActive,
                },
            },
        });
    } catch (error: any) {
        if (
            transactionStarted
        ) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                console.error(
                    "Abort transaction error:",
                    abortError,
                );
            }
        }

        console.error(
            "Create hospital error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                error?.message ||
                "Failed to create hospital",
        });
    } finally {
        await session.endSession();
    }
};

/*
   GET HOSPITAL SUBSCRIPTION HISTORY
*/

export const getHospitalSubscriptionHistory =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            /* =====================================================
               SUPER ADMIN CHECK
            ===================================================== */

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

            /* =====================================================
               HOSPITAL ID
            ===================================================== */

            const rawHospitalId =
                req.params.hospitalId;

            const hospitalId =
                Array.isArray(
                    rawHospitalId,
                )
                    ? rawHospitalId[0]
                    : rawHospitalId;

            /* =====================================================
               VALIDATE
            ===================================================== */

            if (
                !hospitalId ||
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

            /* =====================================================
               FIND HOSPITAL
            ===================================================== */

            const hospital =
                await Hospital.findById(
                    hospitalId,
                )
                    .select(
                        `
            name
            email
            phone
            plan
            subscriptionStatus
            trialStartedAt
            trialEndsAt
            subscriptionStartedAt
            subscriptionEndsAt
            `,
                    )
                    .lean();

            if (!hospital) {
                return res.status(404).json({
                    success: false,

                    message:
                        "Hospital not found",
                });
            }

            /* =====================================================
               GET HISTORY
            ===================================================== */

            const history =
                await SubscriptionHistory.find({
                    hospitalId,
                })
                    .populate(
                        "activatedBy",
                        "name email role",
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            /* =====================================================
               RESPONSE
            ===================================================== */

            return res.status(200).json({
                success: true,

                data: {
                    hospital,

                    totalRecords:
                        history.length,

                    history,
                },
            });
        } catch (error) {
            console.error(
                "Get subscription history error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to load subscription history",
            });
        }
    };


/* ============================================================
   GET SINGLE HOSPITAL DASHBOARD
   GET /api/super-admin/hospitals/:hospitalId/dashboard
============================================================ */

export const getSuperAdminHospitalDashboard =
  async (
    req: Request,
    res: Response,
  ) => {
    try {

      /* ======================================================
         SUPER ADMIN CHECK
      ====================================================== */

      if (
        !req.user ||
        req.user.role !==
          "SUPER_ADMIN"
      ) {
        return res.status(
          403,
        ).json({
          success: false,
          message:
            "Super Admin access required",
        });
      }

      /* ======================================================
         HOSPITAL ID
      ====================================================== */

      const rawHospitalId =
        req.params.hospitalId;

      const hospitalId =
        Array.isArray(
          rawHospitalId,
        )
          ? rawHospitalId[0]
          : rawHospitalId;

      if (
        !hospitalId ||
        !mongoose.Types.ObjectId.isValid(
          hospitalId,
        )
      ) {
        return res.status(
          400,
        ).json({
          success: false,
          message:
            "Invalid hospital ID",
        });
      }

      /* ======================================================
         HOSPITAL
      ====================================================== */

      const hospital =
        await Hospital.findById(
          hospitalId,
        ).lean();

      if (!hospital) {
        return res.status(
          404,
        ).json({
          success: false,
          message:
            "Hospital not found",
        });
      }

      /* ======================================================
         TODAY
      ====================================================== */

      const today =
        new Date()
          .toISOString()
          .split("T")[0];

      /* ======================================================
         USERS
      ====================================================== */

      const [
        totalDoctors,
        totalReceptionists,
        totalAdmins,
        totalLabTechnicians,
      ] =
        await Promise.all([
          User.countDocuments({
            hospitalId,
            role:
              "DOCTOR",
          }),

          User.countDocuments({
            hospitalId,
            role:
              "RECEPTIONIST",
          }),

          User.countDocuments({
            hospitalId,
            role:
              "HOSPITAL_ADMIN",
          }),

          User.countDocuments({
            hospitalId,
            role:
              "LAB_TECHNICIAN",
          }),
        ]);

      /* ======================================================
         PATIENTS
      ====================================================== */

      const [
        totalPatients,
        todayPatients,
      ] =
        await Promise.all([
          Patient.countDocuments({
            hospitalId,
          }),

          Patient.countDocuments({
            hospitalId,

            createdAt: {
              $gte:
                new Date(
                  `${today}T00:00:00.000Z`,
                ),

              $lte:
                new Date(
                  `${today}T23:59:59.999Z`,
                ),
            },
          }),
        ]);

      /* ======================================================
         DEPARTMENTS
      ====================================================== */

      const [
        totalDepartments,
        activeDepartments,
      ] =
        await Promise.all([
          Department.countDocuments({
            hospitalId,
          }),

          Department.countDocuments({
            hospitalId,
            isActive:
              true,
          }),
        ]);

      /* ======================================================
         QUEUE
      ====================================================== */

      const [
        totalTokensToday,
        waiting,
        called,
        serving,
        completed,
        skipped,
      ] =
        await Promise.all([
          Queue.countDocuments({
            hospitalId,
            queueDate:
              today,
          }),

          Queue.countDocuments({
            hospitalId,
            queueDate:
              today,
            status:
              "WAITING",
          }),

          Queue.countDocuments({
            hospitalId,
            queueDate:
              today,
            status:
              "CALLED",
          }),

          Queue.countDocuments({
            hospitalId,
            queueDate:
              today,
            status:
              "SERVING",
          }),

          Queue.countDocuments({
            hospitalId,
            queueDate:
              today,
            status:
              "COMPLETED",
          }),

          Queue.countDocuments({
            hospitalId,
            queueDate:
              today,
            status:
              "SKIPPED",
          }),
        ]);

      /* ======================================================
         RESPONSE
      ====================================================== */

      return res.status(
        200,
      ).json({
        success: true,

        data: {
          hospital: {
            id:
              hospital._id,

            name:
              hospital.name,

            email:
              hospital.email,

            phone:
              hospital.phone,

            isActive:
              hospital.isActive,

            plan:
              hospital.plan,

            subscriptionStatus:
              hospital.subscriptionStatus,
          },

          users: {
            total:
              totalDoctors +
              totalReceptionists +
              totalAdmins +
              totalLabTechnicians,

            doctors:
              totalDoctors,

            receptionists:
              totalReceptionists,

            admins:
              totalAdmins,

            labTechnicians:
              totalLabTechnicians,

            totalDoctors,

            totalReceptionists,

            totalAdmins,

            totalLabTechnicians,
          },

          patients: {
            total:
              totalPatients,

            today:
              todayPatients,
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

            waiting,

            called,

            serving,

            completed,

            skipped,
          },

          generatedAt:
            new Date(),
        },
      });

    } catch (error) {

      console.error(
        "Get hospital dashboard error:",
        error,
      );

      return res.status(
        500,
      ).json({
        success: false,
        message:
          "Failed to load hospital dashboard",
      });
    }
  };