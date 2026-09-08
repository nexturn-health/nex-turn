import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import LabDepartment from "../models/LabDepartment.model";
import LabRoom from "../models/LabRoom.model";
import LabTest from "../models/LabTest.model";

// ============================================================
// HELPERS
// ============================================================

const getHospitalId = (
    req: Request,
): string | undefined => {
    return req.user?.hospitalId;
};

const isAdmin = (
    req: Request,
): boolean => {
    return (
        req.user?.role === "HOSPITAL_ADMIN" ||
        req.user?.role === "SUPER_ADMIN"
    );
};

const getParamId = (
    req: Request,
): string => {
    const value = req.params.id;

    return Array.isArray(value)
        ? value[0]
        : value;
};

// ============================================================
// GET ALL LAB DEPARTMENTS
// ============================================================

export const getLabDepartments = async (
    req: Request,
    res: Response,
) => {
    try {
        const hospitalId =
            getHospitalId(req);

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message:
                    "Hospital ID is required.",
            });
        }

        const departments =
            await LabDepartment.find({
                hospitalId,
            })
                .sort({
                    name: 1,
                })
                .lean();

        return res.status(200).json({
            success: true,
            data: departments,
        });
    } catch (error) {
        console.error(
            "Get lab departments error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch lab departments.",
        });
    }
};

// ============================================================
// GET ACTIVE LAB DEPARTMENTS
// ============================================================

export const getActiveLabDepartments =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(req);

            if (!hospitalId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Hospital ID is required.",
                });
            }

            const departments =
                await LabDepartment.find({
                    hospitalId,
                    isActive: true,
                })
                    .sort({
                        name: 1,
                    })
                    .lean();

            return res.status(200).json({
                success: true,
                data: departments,
            });
        } catch (error) {
            console.error(
                "Get active lab departments error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to fetch active lab departments.",
            });
        }
    };

// ============================================================
// CREATE LAB DEPARTMENT
// ============================================================

export const createLabDepartment =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only hospital admin can create lab departments.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            if (!hospitalId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Hospital ID is required.",
                });
            }

            const {
                name,
                code,
                description,
            } = req.body;

            if (
                !name ||
                typeof name !== "string" ||
                !name.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Lab department name is required.",
                });
            }

            const normalizedName =
                name.trim();

            const normalizedCode =
                typeof code === "string" &&
                code.trim()
                    ? code.trim().toUpperCase()
                    : undefined;

            const existing =
                await LabDepartment.findOne({
                    hospitalId,
                    name: normalizedName,
                });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    message:
                        "A lab department with this name already exists.",
                });
            }

            if (normalizedCode) {
                const existingCode =
                    await LabDepartment.findOne({
                        hospitalId,
                        code: normalizedCode,
                    });

                if (existingCode) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "A lab department with this code already exists.",
                    });
                }
            }

            const department =
                await LabDepartment.create({
                    hospitalId,
                    name: normalizedName,
                    code: normalizedCode,
                    description:
                        typeof description ===
                        "string"
                            ? description.trim()
                            : undefined,
                    isActive: true,
                });

            return res.status(201).json({
                success: true,
                message:
                    "Lab department created successfully.",
                data: department,
            });
        } catch (error) {
            console.error(
                "Create lab department error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to create lab department.",
            });
        }
    };

// ============================================================
// UPDATE LAB DEPARTMENT
// ============================================================

export const updateLabDepartment =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only hospital admin can update lab departments.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            const departmentId =
                getParamId(req);

            if (
                !hospitalId ||
                !mongoose.Types.ObjectId.isValid(
                    departmentId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid department ID.",
                });
            }

            const department =
                await LabDepartment.findOne({
                    _id: departmentId,
                    hospitalId,
                });

            if (!department) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab department not found.",
                });
            }

            const {
                name,
                code,
                description,
                isActive,
            } = req.body;

            if (
                name !== undefined &&
                (!name ||
                    typeof name !== "string" ||
                    !name.trim())
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid department name.",
                });
            }

            if (name !== undefined) {
                const normalizedName =
                    name.trim();

                const duplicate =
                    await LabDepartment.findOne({
                        hospitalId,
                        name: normalizedName,
                        _id: {
                            $ne: departmentId,
                        },
                    });

                if (duplicate) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "Another lab department already uses this name.",
                    });
                }

                department.name =
                    normalizedName;
            }

            if (code !== undefined) {
                const normalizedCode =
                    typeof code === "string" &&
                    code.trim()
                        ? code
                              .trim()
                              .toUpperCase()
                        : undefined;

                if (normalizedCode) {
                    const duplicate =
                        await LabDepartment.findOne({
                            hospitalId,
                            code: normalizedCode,
                            _id: {
                                $ne: departmentId,
                            },
                        });

                    if (duplicate) {
                        return res.status(409).json({
                            success: false,
                            message:
                                "Another lab department already uses this code.",
                        });
                    }
                }

                department.code =
                    normalizedCode;
            }

            if (
                description !== undefined
            ) {
                department.description =
                    typeof description ===
                    "string"
                        ? description.trim()
                        : undefined;
            }

            if (
                typeof isActive ===
                "boolean"
            ) {
                department.isActive =
                    isActive;
            }

            await department.save();

            return res.status(200).json({
                success: true,
                message:
                    "Lab department updated successfully.",
                data: department,
            });
        } catch (error) {
            console.error(
                "Update lab department error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update lab department.",
            });
        }
    };

// ============================================================
// DELETE / DEACTIVATE LAB DEPARTMENT
// ============================================================

export const deactivateLabDepartment =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only hospital admin can deactivate lab departments.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            const departmentId =
                getParamId(req);

            if (
                !hospitalId ||
                !mongoose.Types.ObjectId.isValid(
                    departmentId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid department ID.",
                });
            }

            const department =
                await LabDepartment.findOne({
                    _id: departmentId,
                    hospitalId,
                });

            if (!department) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab department not found.",
                });
            }

            department.isActive =
                false;

            await department.save();

            await LabRoom.updateMany(
                {
                    hospitalId,
                    labDepartmentId:
                        department._id,
                },
                {
                    $set: {
                        isActive: false,
                    },
                },
            );

            return res.status(200).json({
                success: true,
                message:
                    "Lab department deactivated successfully.",
            });
        } catch (error) {
            console.error(
                "Deactivate lab department error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to deactivate lab department.",
            });
        }
    };