import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import bcrypt from "bcryptjs";

import {
    User,
} from "../models/User.model";

import LabDepartment from "../models/LabDepartment.model";

import LabRoom from "../models/LabRoom.model";

/* ============================================================
   HELPERS
============================================================ */

const getHospitalId = (
    req: Request,
): string | undefined => {
    return req.user?.hospitalId;
};

const getUserId = (
    req: Request,
): string | undefined => {
    return req.user?.userId;
};

const getParamId = (
    req: Request,
    key: string,
): string => {
    const value = req.params[key];

    return Array.isArray(value)
        ? value[0]
        : value;
};

const isHospitalAdmin = (
    req: Request,
): boolean => {
    return (
        req.user?.role ===
        "HOSPITAL_ADMIN"
    );
};

/* ============================================================
   REMOVE PASSWORD FROM RESPONSE
============================================================ */

const sanitizeTechnician = (
    technician: any,
) => {
    const data =
        technician?.toObject
            ? technician.toObject()
            : {
                ...technician,
            };

    delete data.password;
    delete data.resetPasswordToken;
    delete data.resetPasswordExpires;

    return data;
};

/* ============================================================
   VALIDATE OBJECT ID
============================================================ */

const isValidObjectId = (
    value: string,
): boolean => {
    return mongoose.Types.ObjectId.isValid(
        value,
    );
};

/* ============================================================
   VALIDATE DEPARTMENT
============================================================ */

const validateDepartment = async (
    hospitalId: string,
    labDepartmentId: string,
) => {
    if (
        !isValidObjectId(
            labDepartmentId,
        )
    ) {
        return null;
    }

    return LabDepartment.findOne({
        _id: labDepartmentId,
        hospitalId,
        isActive: true,
    });
};

/* ============================================================
   VALIDATE ROOM
============================================================ */

const validateRoom = async (
    hospitalId: string,
    labDepartmentId: string,
    labRoomId: string,
) => {
    if (
        !isValidObjectId(
            labRoomId,
        )
    ) {
        return null;
    }

    return LabRoom.findOne({
        _id: labRoomId,
        hospitalId,
        labDepartmentId,
        isActive: true,
    });
};

/* ============================================================
   GET LAB TECHNICIANS
============================================================ */

export const getLabTechnicians =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                !isHospitalAdmin(req)
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "Hospital Admin access required",
                    });
            }

            const hospitalId =
                getHospitalId(req);

            if (!hospitalId) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Hospital ID is missing",
                    });
            }

            const technicians =
                await User.find({
                    hospitalId,
                    role: "LAB_TECHNICIAN",
                })
                    .select(
                        "-password -resetPasswordToken -resetPasswordExpires",
                    )
                    .populate(
                        "labDepartmentId",
                        "name",
                    )
                    .populate(
                        "labRoomId",
                        "name roomNumber building floor",
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            return res.status(200).json({
                success: true,
                data: technicians,
            });
        } catch (error) {
            console.error(
                "GET LAB TECHNICIANS ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch lab technicians",
            });
        }
    };

/* ============================================================
   CREATE LAB TECHNICIAN
============================================================ */

export const createLabTechnician =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                !isHospitalAdmin(req)
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "Hospital Admin access required",
                    });
            }

            const hospitalId =
                getHospitalId(req);

            if (!hospitalId) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Hospital ID is missing",
                    });
            }

            const {
                name,
                email,
                password,
                phone,
                labDepartmentId,
                labRoomId,
            } = req.body;

            /* ==================================================
               REQUIRED FIELDS
            ================================================== */

            if (
                !name ||
                !email ||
                !password ||
                !labDepartmentId ||
                !labRoomId
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Name, email, password, lab department and lab room are required",
                    });
            }

            /* ==================================================
               PASSWORD VALIDATION
            ================================================== */

            if (
                String(password).length <
                6
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Password must be at least 6 characters",
                    });
            }

            /* ==================================================
               EMAIL NORMALIZATION
            ================================================== */

            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            /* ==================================================
               CHECK EMAIL
            ================================================== */

            const existingUser =
                await User.findOne({
                    email:
                        normalizedEmail,
                });

            if (existingUser) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "A user with this email already exists",
                    });
            }

            /* ==================================================
               VALIDATE DEPARTMENT
            ================================================== */

            const department =
                await validateDepartment(
                    hospitalId,
                    String(
                        labDepartmentId,
                    ),
                );

            if (!department) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid or inactive lab department",
                    });
            }

            /* ==================================================
               VALIDATE ROOM
            ================================================== */

            const room =
                await validateRoom(
                    hospitalId,
                    String(
                        labDepartmentId,
                    ),
                    String(
                        labRoomId,
                    ),
                );

            if (!room) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid or inactive lab room, or room does not belong to selected department",
                    });
            }

            /* ==================================================
               HASH PASSWORD
            ================================================== */

            const hashedPassword =
                await bcrypt.hash(
                    String(password),
                    10,
                );

            /* ==================================================
               CREATE USER
            ================================================== */

            const technician =
                await User.create({
                    name: String(
                        name,
                    ).trim(),

                    email:
                        normalizedEmail,

                    password:
                        hashedPassword,

                    phone: phone
                        ? String(
                            phone,
                        ).trim()
                        : "",

                    role:
                        "LAB_TECHNICIAN",

                    hospitalId,

                    labDepartmentId:
                        department._id,

                    labRoomId:
                        room._id,

                    isActive: true,

                    isOnline: false,

                    averageConsultationMinutes: 8,

                    shiftStartTime: null,
                });

            /* ==================================================
               RESPONSE
            ================================================== */

            const safeTechnician =
                sanitizeTechnician(
                    technician,
                );

            return res
                .status(201)
                .json({
                    success: true,
                    message:
                        "Lab technician created successfully",
                    data:
                        safeTechnician,
                });
        } catch (error: any) {
            console.error(
                "CREATE LAB TECHNICIAN ERROR:",
                error,
            );

            if (
                error?.code === 11000
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "A user with this email already exists",
                    });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Failed to create lab technician",
            });
        }
    };

/* ============================================================
   UPDATE LAB TECHNICIAN
============================================================ */

export const updateLabTechnician =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                !isHospitalAdmin(req)
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "Hospital Admin access required",
                    });
            }

            const hospitalId =
                getHospitalId(req);

            if (!hospitalId) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Hospital ID is missing",
                    });
            }

            const technicianId =
                getParamId(
                    req,
                    "id",
                );

            if (
                !isValidObjectId(
                    technicianId,
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid technician ID",
                    });
            }

            const technician =
                await User.findOne({
                    _id: technicianId,
                    hospitalId,
                    role: "LAB_TECHNICIAN",
                });

            if (!technician) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Lab technician not found",
                    });
            }

            const {
                name,
                email,
                password,
                phone,
                labDepartmentId,
                labRoomId,
            } = req.body;

            /* ==================================================
               UPDATE NAME
            ================================================== */

            if (
                name !== undefined
            ) {
                const trimmedName =
                    String(
                        name,
                    ).trim();

                if (!trimmedName) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                "Technician name cannot be empty",
                        });
                }

                technician.name =
                    trimmedName;
            }

            /* ==================================================
               UPDATE EMAIL
            ================================================== */

            if (
                email !== undefined
            ) {
                const normalizedEmail =
                    String(email)
                        .trim()
                        .toLowerCase();

                if (!normalizedEmail) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                "Email cannot be empty",
                        });
                }

                const emailExists =
                    await User.findOne({
                        email:
                            normalizedEmail,
                        _id: {
                            $ne:
                                technician._id,
                        },
                    });

                if (emailExists) {
                    return res
                        .status(409)
                        .json({
                            success: false,
                            message:
                                "Another user already uses this email",
                        });
                }

                technician.email =
                    normalizedEmail;
            }

            /* ==================================================
               UPDATE PHONE
            ================================================== */

            if (
                phone !== undefined
            ) {
                technician.phone =
                    String(
                        phone,
                    ).trim();
            }

            /* ==================================================
               UPDATE DEPARTMENT / ROOM
            ================================================== */

            const newDepartmentId =
                labDepartmentId !==
                undefined
                    ? String(
                        labDepartmentId,
                    )
                    : technician.labDepartmentId?.toString();

            const newRoomId =
                labRoomId !==
                undefined
                    ? String(
                        labRoomId,
                    )
                    : technician.labRoomId?.toString();

            if (
                labDepartmentId !==
                    undefined ||
                labRoomId !==
                    undefined
            ) {
                if (
                    !newDepartmentId ||
                    !newRoomId
                ) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                "Lab department and lab room are required",
                        });
                }

                const department =
                    await validateDepartment(
                        hospitalId,
                        newDepartmentId,
                    );

                if (!department) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                "Invalid or inactive lab department",
                        });
                }

                const room =
                    await validateRoom(
                        hospitalId,
                        newDepartmentId,
                        newRoomId,
                    );

                if (!room) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                "Selected room does not belong to the selected department",
                        });
                }

                technician.labDepartmentId =
                    department._id;

                technician.labRoomId =
                    room._id;
            }

            /* ==================================================
               UPDATE PASSWORD
            ================================================== */

            if (
                password !== undefined &&
                String(
                    password,
                ).trim()
            ) {
                if (
                    String(
                        password,
                    ).length < 6
                ) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                "Password must be at least 6 characters",
                        });
                }

                technician.password =
                    await bcrypt.hash(
                        String(
                            password,
                        ),
                        10,
                    );
            }

            await technician.save();

            const updated =
                await User.findById(
                    technician._id,
                )
                    .select(
                        "-password -resetPasswordToken -resetPasswordExpires",
                    )
                    .populate(
                        "labDepartmentId",
                        "name",
                    )
                    .populate(
                        "labRoomId",
                        "name roomNumber building floor",
                    );

            return res.status(200).json({
                success: true,
                message:
                    "Lab technician updated successfully",
                data: updated,
            });
        } catch (error: any) {
            console.error(
                "UPDATE LAB TECHNICIAN ERROR:",
                error,
            );

            if (
                error?.code === 11000
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "A user with this email already exists",
                    });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update lab technician",
            });
        }
    };

/* ============================================================
   ACTIVATE LAB TECHNICIAN
============================================================ */

export const activateLabTechnician =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                !isHospitalAdmin(req)
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "Hospital Admin access required",
                    });
            }

            const hospitalId =
                getHospitalId(req);

            const technicianId =
                getParamId(
                    req,
                    "id",
                );

            if (
                !hospitalId
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Hospital ID is missing",
                    });
            }

            if (
                !isValidObjectId(
                    technicianId,
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid technician ID",
                    });
            }

            const technician =
                await User.findOne({
                    _id: technicianId,
                    hospitalId,
                    role: "LAB_TECHNICIAN",
                });

            if (!technician) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Lab technician not found",
                    });
            }

            technician.isActive =
                true;

            await technician.save();

            return res.status(200).json({
                success: true,
                message:
                    "Lab technician activated successfully",
                data:
                    sanitizeTechnician(
                        technician,
                    ),
            });
        } catch (error) {
            console.error(
                "ACTIVATE LAB TECHNICIAN ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to activate lab technician",
            });
        }
    };

/* ============================================================
   DEACTIVATE LAB TECHNICIAN
============================================================ */

export const deactivateLabTechnician =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                !isHospitalAdmin(req)
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "Hospital Admin access required",
                    });
            }

            const hospitalId =
                getHospitalId(req);

            const technicianId =
                getParamId(
                    req,
                    "id",
                );

            if (
                !hospitalId
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Hospital ID is missing",
                    });
            }

            if (
                !isValidObjectId(
                    technicianId,
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid technician ID",
                    });
            }

            const technician =
                await User.findOne({
                    _id: technicianId,
                    hospitalId,
                    role: "LAB_TECHNICIAN",
                });

            if (!technician) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Lab technician not found",
                    });
            }

            technician.isActive =
                false;

            technician.isOnline =
                false;

            technician.offlineSince =
                new Date();

            await technician.save();

            return res.status(200).json({
                success: true,
                message:
                    "Lab technician deactivated successfully",
                data:
                    sanitizeTechnician(
                        technician,
                    ),
            });
        } catch (error) {
            console.error(
                "DEACTIVATE LAB TECHNICIAN ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to deactivate lab technician",
            });
        }
    };