import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import LabTest from "../models/LabTest.model";
import LabOrder from "../models/LabOrder.model";
import LabDepartment from "../models/LabDepartment.model";
import LabRoom from "../models/LabRoom.model";
import { User } from "../models/User.model";

// ============================================================
// HELPERS
// ============================================================

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

const getRole = (
    req: Request,
): string | undefined => {
    return req.user?.role;
};

const isAdmin = (
    req: Request,
): boolean => {
    return (
        getRole(req) ===
        "HOSPITAL_ADMIN" ||
        getRole(req) ===
        "SUPER_ADMIN"
    );
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

// ============================================================
// ACTIVE LAB TESTS
// ============================================================

export const getActiveLabTests =
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

            const tests =
                await LabTest.find({
                    hospitalId,
                    isActive: true,
                })
                    .populate(
                        "labDepartmentId",
                        "name code",
                    )
                    .populate(
                        "labRoomId",
                        "name roomNumber building floor",
                    )
                    .sort({
                        name: 1,
                    })
                    .lean();

            return res.status(200).json({
                success: true,
                data: tests,
            });
        } catch (error) {
            console.error(
                "Get active lab tests error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to fetch active lab tests.",
            });
        }
    };

// ============================================================
// GET ALL LAB TESTS
// ============================================================

export const getLabTests = async (
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

        const tests =
            await LabTest.find({
                hospitalId,
            })
                .populate(
                    "labDepartmentId",
                    "name code",
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
            data: tests,
        });
    } catch (error) {
        console.error(
            "Get lab tests error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch lab tests.",
        });
    }
};

// ============================================================
// CREATE LAB TEST
// ============================================================

export const createLabTest = async (
    req: Request,
    res: Response,
) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({
                success: false,
                message:
                    "Only hospital admin can create lab tests.",
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
            category,
            description,
            price,
            sampleType,
            turnaroundTimeMinutes,
            labDepartmentId,
            labRoomId,
        } = req.body;

        if (
            !name ||
            typeof name !== "string" ||
            !name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Lab test name is required.",
            });
        }

        if (
            !labDepartmentId ||
            !mongoose.Types.ObjectId.isValid(
                labDepartmentId,
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Lab department is required.",
            });
        }

        if (
            !labRoomId ||
            !mongoose.Types.ObjectId.isValid(
                labRoomId,
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Lab room is required.",
            });
        }

        const department =
            await LabDepartment.findOne({
                _id: labDepartmentId,
                hospitalId,
                isActive: true,
            });

        if (!department) {
            return res.status(404).json({
                success: false,
                message:
                    "Active lab department not found.",
            });
        }

        const room =
            await LabRoom.findOne({
                _id: labRoomId,
                hospitalId,
                labDepartmentId,
                isActive: true,
            });

        if (!room) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected room does not belong to the selected lab department.",
            });
        }

        const normalizedName =
            name.trim();

        const normalizedCode =
            typeof code === "string" &&
                code.trim()
                ? code.trim().toUpperCase()
                : undefined;

        const duplicateName =
            await LabTest.findOne({
                hospitalId,
                name: normalizedName,
            });

        if (duplicateName) {
            return res.status(409).json({
                success: false,
                message:
                    "A lab test with this name already exists.",
            });
        }

        if (normalizedCode) {
            const duplicateCode =
                await LabTest.findOne({
                    hospitalId,
                    code: normalizedCode,
                });

            if (duplicateCode) {
                return res.status(409).json({
                    success: false,
                    message:
                        "A lab test with this code already exists.",
                });
            }
        }

        const test =
            await LabTest.create({
                hospitalId,

                name: normalizedName,

                code: normalizedCode,

                category:
                    typeof category ===
                        "string"
                        ? category.trim()
                        : undefined,

                description:
                    typeof description ===
                        "string"
                        ? description.trim()
                        : undefined,

                price:
                    price !== undefined
                        ? Number(price)
                        : 0,

                sampleType:
                    typeof sampleType ===
                        "string"
                        ? sampleType.trim()
                        : undefined,

                turnaroundTimeMinutes:
                    turnaroundTimeMinutes !==
                        undefined
                        ? Number(
                            turnaroundTimeMinutes,
                        )
                        : 0,

                labDepartmentId,

                labRoomId,

                isActive: true,
            });

        return res.status(201).json({
            success: true,
            message:
                "Lab test created successfully.",
            data: test,
        });
    } catch (error) {
        console.error(
            "Create lab test error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create lab test.",
        });
    }
};

// ============================================================
// UPDATE LAB TEST
// ============================================================

export const updateLabTest = async (
    req: Request,
    res: Response,
) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({
                success: false,
                message:
                    "Only hospital admin can update lab tests.",
            });
        }

        const hospitalId =
            getHospitalId(req);

        const testId =
            getParamId(req, "id");

        if (
            !hospitalId ||
            !mongoose.Types.ObjectId.isValid(
                testId,
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid lab test ID.",
            });
        }

        const test =
            await LabTest.findOne({
                _id: testId,
                hospitalId,
            });

        if (!test) {
            return res.status(404).json({
                success: false,
                message:
                    "Lab test not found.",
            });
        }

        const {
            name,
            code,
            category,
            description,
            price,
            sampleType,
            turnaroundTimeMinutes,
            labDepartmentId,
            labRoomId,
            isActive,
        } = req.body;

        let finalDepartmentId =
            test.labDepartmentId;

        let finalRoomId =
            test.labRoomId;

        if (
            labDepartmentId !==
            undefined
        ) {
            if (
                !mongoose.Types.ObjectId.isValid(
                    labDepartmentId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lab department.",
                });
            }

            finalDepartmentId =
                new mongoose.Types.ObjectId(
                    labDepartmentId,
                );
        }

        if (
            labRoomId !== undefined
        ) {
            if (
                !mongoose.Types.ObjectId.isValid(
                    labRoomId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lab room.",
                });
            }

            finalRoomId =
                new mongoose.Types.ObjectId(
                    labRoomId,
                );
        }

        const department =
            await LabDepartment.findOne({
                _id: finalDepartmentId,
                hospitalId,
                isActive: true,
            });

        if (!department) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected lab department is invalid or inactive.",
            });
        }

        const room =
            await LabRoom.findOne({
                _id: finalRoomId,
                hospitalId,
                labDepartmentId:
                    finalDepartmentId,
                isActive: true,
            });

        if (!room) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected lab room does not belong to the selected department.",
            });
        }

        if (
            name !== undefined
        ) {
            if (
                !name ||
                typeof name !==
                "string" ||
                !name.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lab test name.",
                });
            }

            const duplicate =
                await LabTest.findOne({
                    hospitalId,
                    name: name.trim(),
                    _id: {
                        $ne: testId,
                    },
                });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Another lab test already uses this name.",
                });
            }

            test.name =
                name.trim();
        }

        if (
            code !== undefined
        ) {
            const normalizedCode =
                typeof code === "string" &&
                    code.trim()
                    ? code.trim().toUpperCase()
                    : undefined;

            if (normalizedCode) {
                const duplicate =
                    await LabTest.findOne({
                        hospitalId,
                        code: normalizedCode,
                        _id: {
                            $ne: testId,
                        },
                    });

                if (duplicate) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "Another lab test already uses this code.",
                    });
                }
            }

            test.code =
                normalizedCode;
        }

        if (
            category !== undefined
        ) {
            test.category =
                typeof category ===
                    "string"
                    ? category.trim()
                    : undefined;
        }

        if (
            description !== undefined
        ) {
            test.description =
                typeof description ===
                    "string"
                    ? description.trim()
                    : undefined;
        }

        if (
            price !== undefined
        ) {
            const numericPrice =
                Number(price);

            if (
                Number.isNaN(
                    numericPrice,
                ) ||
                numericPrice < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid price.",
                });
            }

            test.price =
                numericPrice;
        }

        if (
            sampleType !== undefined
        ) {
            test.sampleType =
                typeof sampleType ===
                    "string"
                    ? sampleType.trim()
                    : undefined;
        }

        if (
            turnaroundTimeMinutes !==
            undefined
        ) {
            const minutes =
                Number(
                    turnaroundTimeMinutes,
                );

            if (
                Number.isNaN(minutes) ||
                minutes < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid turnaround time.",
                });
            }

            test.turnaroundTimeMinutes =
                minutes;
        }

        test.labDepartmentId =
            finalDepartmentId;

        test.labRoomId =
            finalRoomId;

        if (
            typeof isActive ===
            "boolean"
        ) {
            test.isActive =
                isActive;
        }

        await test.save();

        return res.status(200).json({
            success: true,
            message:
                "Lab test updated successfully.",
            data: test,
        });
    } catch (error) {
        console.error(
            "Update lab test error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update lab test.",
        });
    }
};

// ============================================================
// DEACTIVATE LAB TEST
// ============================================================

export const deactivateLabTest =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only hospital admin can deactivate lab tests.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            const testId =
                getParamId(req, "id");

            if (
                !hospitalId ||
                !mongoose.Types.ObjectId.isValid(
                    testId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lab test ID.",
                });
            }

            const test =
                await LabTest.findOne({
                    _id: testId,
                    hospitalId,
                });

            if (!test) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab test not found.",
                });
            }

            test.isActive =
                false;

            await test.save();

            return res.status(200).json({
                success: true,
                message:
                    "Lab test deactivated successfully.",
            });
        } catch (error) {
            console.error(
                "Deactivate lab test error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to deactivate lab test.",
            });
        }
    };

// ============================================================
// CREATE LAB ORDER
// ============================================================

export const createLabOrder =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                getRole(req) !==
                "DOCTOR"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only doctors can create lab orders.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            const doctorId =
                getUserId(req);

            if (
                !hospitalId ||
                !doctorId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Hospital and doctor information are required.",
                });
            }

            const {
                consultationId,
                queueId,
                patientId,
                testIds,
            } = req.body;

            if (
                !consultationId ||
                !mongoose.Types.ObjectId.isValid(
                    consultationId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid consultation ID is required.",
                });
            }

            if (
                !queueId ||
                !mongoose.Types.ObjectId.isValid(
                    queueId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid queue ID is required.",
                });
            }

            if (
                !patientId ||
                !mongoose.Types.ObjectId.isValid(
                    patientId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid patient ID is required.",
                });
            }

            if (
                !Array.isArray(
                    testIds,
                ) ||
                testIds.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "At least one lab test is required.",
                });
            }

            const validTestIds =
                testIds.filter(
                    (
                        id: unknown,
                    ): id is string =>
                        typeof id ===
                        "string" &&
                        mongoose.Types.ObjectId.isValid(
                            id,
                        ),
                );

            if (
                validTestIds.length !==
                testIds.length
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "One or more lab test IDs are invalid.",
                });
            }

            // ==================================================
            // PREVENT DUPLICATE ORDER
            // ==================================================

            const existingOrder =
                await LabOrder.findOne({
                    hospitalId,
                    consultationId,
                });

            if (existingOrder) {
                return res.status(409).json({
                    success: false,
                    message:
                        "A lab order already exists for this consultation.",
                    data: existingOrder,
                });
            }

            // ==================================================
            // FETCH TESTS
            // ==================================================

            const labTests =
                await LabTest.find({
                    _id: {
                        $in: validTestIds,
                    },
                    hospitalId,
                    isActive: true,
                }).lean();

            if (
                labTests.length !==
                validTestIds.length
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "One or more selected lab tests are invalid or inactive.",
                });
            }

            // ==================================================
            // VALIDATE ROUTING
            // ==================================================

            for (const test of labTests) {
                if (
                    !test.labDepartmentId ||
                    !test.labRoomId
                ) {
                    return res.status(400).json({
                        success: false,
                        message: `Lab test "${test.name}" does not have a valid department and room configured.`,
                    });
                }

                const room =
                    await LabRoom.findOne({
                        _id: test.labRoomId,
                        hospitalId,
                        labDepartmentId:
                            test.labDepartmentId,
                        isActive: true,
                    }).lean();

                if (!room) {
                    return res.status(400).json({
                        success: false,
                        message: `Lab test "${test.name}" has an invalid or inactive lab room.`,
                    });
                }
            }

            // ==================================================
            // SNAPSHOT ROUTING
            // ==================================================

            const items =
                labTests.map(
                    (test) => ({
                        labTestId:
                            test._id,

                        testName:
                            test.name,

                        testCode:
                            test.code,

                        price:
                            test.price ??
                            0,

                        labDepartmentId:
                            test.labDepartmentId,

                        labRoomId:
                            test.labRoomId,

                        technicianId:
                            null,

                        status:
                            "ORDERED" as const,
                    }),
                );

            // ==================================================
            // CREATE ORDER
            // ==================================================

            const order =
                await LabOrder.create({
                    hospitalId,

                    patientId,

                    doctorId,

                    consultationId,

                    queueId,

                    items,

                    paymentStatus:
                        "PENDING",

                    status:
                        "PAYMENT_PENDING",

                    orderedAt:
                        new Date(),
                });

            return res.status(201).json({
                success: true,
                message:
                    "Lab order created successfully.",
                data: order,
            });
        } catch (error) {
            console.error(
                "Create lab order error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to create lab order.",
            });
        }
    };

// ============================================================
// GET PENDING PAYMENTS
// ============================================================

export const getPendingLabPayments =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                getRole(req) !==
                "RECEPTIONIST"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only receptionists can access lab payments.",
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

            const orders =
                await LabOrder.find({
                    hospitalId,
                    paymentStatus:
                        "PENDING",
                })
                    .populate(
                        "patientId",
                        "name patientCode phone email",
                    )
                    .populate(
                        "doctorId",
                        "name email phone",
                    )
                    .populate(
                        "items.labDepartmentId",
                        "name code",
                    )
                    .populate(
                        "items.labRoomId",
                        "name roomNumber building floor",
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            return res.status(200).json({
                success: true,
                data: orders,
            });
        } catch (error) {
            console.error(
                "Get pending lab payments error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to fetch pending lab payments.",
            });
        }
    };

// ============================================================
// CONFIRM LAB PAYMENT
// ============================================================

export const confirmLabPayment =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                getRole(req) !==
                "RECEPTIONIST"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only receptionists can confirm lab payments.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            const orderId =
                getParamId(
                    req,
                    "orderId",
                );

            if (
                !hospitalId ||
                !mongoose.Types.ObjectId.isValid(
                    orderId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lab order ID.",
                });
            }

            const order =
                await LabOrder.findOne({
                    _id: orderId,
                    hospitalId,
                });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab order not found.",
                });
            }

            if (
                order.paymentStatus ===
                "PAID"
            ) {
                return res.status(200).json({
                    success: true,
                    message:
                        "Lab payment is already confirmed.",
                    data: order,
                });
            }

            order.paymentStatus =
                "PAID";

            order.status =
                "READY_FOR_LAB";

            order.paidAt =
                new Date();

            await order.save();

            return res.status(200).json({
                success: true,
                message:
                    "Lab payment confirmed. Order is ready for laboratory processing.",
                data: order,
            });
        } catch (error) {
            console.error(
                "Confirm lab payment error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to confirm lab payment.",
            });
        }
    };

// ============================================================
// GET LAB ORDERS FOR RECEPTIONIST
// ============================================================

export const getLabOrdersForReceptionist =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                getRole(req) !==
                "RECEPTIONIST"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only receptionists can access lab orders.",
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
                search,
                paymentStatus,
                status,
                date,
                sort = "newest",
            } = req.query;

            const filter: Record<
                string,
                unknown
            > = {
                hospitalId,
            };

            if (
                paymentStatus ===
                "PENDING" ||
                paymentStatus ===
                "PAID"
            ) {
                filter.paymentStatus =
                    paymentStatus;
            }

            if (
                typeof status ===
                "string" &&
                status
            ) {
                filter.status =
                    status;
            }

            if (
                typeof date ===
                "string" &&
                date
            ) {
                const start =
                    new Date(
                        `${date}T00:00:00`,
                    );

                const end =
                    new Date(
                        `${date}T23:59:59.999`,
                    );

                if (
                    !Number.isNaN(
                        start.getTime(),
                    ) &&
                    !Number.isNaN(
                        end.getTime(),
                    )
                ) {
                    filter.createdAt =
                    {
                        $gte: start,
                        $lte: end,
                    };
                }
            }

            let orders =
                await LabOrder.find(
                    filter,
                )
                    .populate(
                        "patientId",
                        "name patientCode phone email",
                    )
                    .populate(
                        "doctorId",
                        "name email phone",
                    )
                    .populate(
                        "items.labDepartmentId",
                        "name code",
                    )
                    .populate(
                        "items.labRoomId",
                        "name roomNumber building floor",
                    )
                    .sort({
                        createdAt:
                            sort ===
                                "oldest"
                                ? 1
                                : -1,
                    })
                    .lean();

            if (
                typeof search ===
                "string" &&
                search.trim()
            ) {
                const query =
                    search
                        .trim()
                        .toLowerCase();

                orders =
                    orders.filter(
                        (order: any) => {
                            const patient =
                                order.patientId;

                            const doctor =
                                order.doctorId;

                            const patientMatch =
                                patient &&
                                (
                                    String(
                                        patient.name ??
                                        "",
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query,
                                        ) ||
                                    String(
                                        patient.phone ??
                                        "",
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query,
                                        ) ||
                                    String(
                                        patient.email ??
                                        "",
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query,
                                        ) ||
                                    String(
                                        patient.patientCode ??
                                        "",
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query,
                                        )
                                );

                            const doctorMatch =
                                doctor &&
                                (
                                    String(
                                        doctor.name ??
                                        "",
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query,
                                        ) ||
                                    String(
                                        doctor.email ??
                                        "",
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query,
                                        )
                                );

                            const testMatch =
                                order.items?.some(
                                    (
                                        item: any,
                                    ) =>
                                        String(
                                            item.testName ??
                                            "",
                                        )
                                            .toLowerCase()
                                            .includes(
                                                query,
                                            ) ||
                                        String(
                                            item.testCode ??
                                            "",
                                        )
                                            .toLowerCase()
                                            .includes(
                                                query,
                                            ),
                                );

                            return Boolean(
                                patientMatch ||
                                doctorMatch ||
                                testMatch ||
                                String(
                                    order._id,
                                )
                                    .toLowerCase()
                                    .includes(
                                        query,
                                    ),
                            );
                        },
                    );
            }

            const summary = {
                total: orders.length,

                pendingPayment:
                    orders.filter(
                        (order: { paymentStatus: string; }) =>
                            order.paymentStatus ===
                            "PENDING",
                    ).length,

                paid:
                    orders.filter(
                        (order: { paymentStatus: string; }) =>
                            order.paymentStatus ===
                            "PAID",
                    ).length,

                readyForLab:
                    orders.filter(
                        (order: { status: string; }) =>
                            order.status ===
                            "READY_FOR_LAB",
                    ).length,

                processing:
                    orders.filter(
                        (order: { status: string; }) =>
                            order.status ===
                            "PROCESSING" ||
                            order.status ===
                            "SAMPLE_COLLECTED",
                    ).length,

                completed:
                    orders.filter(
                        (order: { status: string; }) =>
                            order.status ===
                            "COMPLETED",
                    ).length,
            };

            return res.status(200).json({
                success: true,
                data: orders,
                summary,
            });
        } catch (error) {
            console.error(
                "Get receptionist lab orders error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to fetch lab orders.",
            });
        }
    };

// ============================================================
// TECHNICIAN WORK QUEUE
// ============================================================

export const getLabTechnicianOrders =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                getRole(req) !==
                "LAB_TECHNICIAN"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only lab technicians can access the laboratory work queue.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            const technicianId =
                getUserId(req);

            if (
                !hospitalId ||
                !technicianId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Technician information is required.",
                });
            }

            const technician =
                await User.findOne({
                    _id: technicianId,
                    hospitalId,
                    role: "LAB_TECHNICIAN",
                    isActive: true,
                }).lean();

            if (!technician) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab technician account not found.",
                });
            }

            if (
                !technician.labDepartmentId ||
                !technician.labRoomId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Your technician account is not assigned to a lab department and room.",
                });
            }

            const orders =
                await LabOrder.find({
                    hospitalId,

                    paymentStatus:
                        "PAID",

                    status: {
                        $in: [
                            "READY_FOR_LAB",
                            "SAMPLE_COLLECTED",
                            "PROCESSING",
                            "REPORT_READY",
                            "COMPLETED",
                        ],
                    },

                    items: {
                        $elemMatch: {
                            labDepartmentId:
                                technician.labDepartmentId,

                            labRoomId:
                                technician.labRoomId,

                            status: {
                                $in: [
                                    "ORDERED",
                                    "SAMPLE_COLLECTED",
                                    "PROCESSING",
                                    "COMPLETED",
                                ],
                            },
                        },
                    },
                })
                    .populate(
                        "patientId",
                        "name patientCode age gender phone email",
                    )
                    .populate(
                        "doctorId",
                        "name",
                    )
                    .populate(
                        "items.labDepartmentId",
                        "name code",
                    )
                    .populate(
                        "items.labRoomId",
                        "name roomNumber building floor",
                    )
                    .populate(
                        "items.technicianId",
                        "name email",
                    )
                    .sort({
                        createdAt: 1,
                    })
                    .lean();

            return res.status(200).json({
                success: true,

                technician: {
                    _id:
                        technician._id,

                    name:
                        technician.name,

                    labDepartmentId:
                        technician.labDepartmentId,

                    labRoomId:
                        technician.labRoomId,
                },

                data: orders,
            });
        } catch (error) {
            console.error(
                "Get lab technician orders error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to fetch technician work queue.",
            });
        }
    };


// ============================================================
// UPDATE LAB ORDER ITEM STATUS
// ============================================================

export const updateLabOrderItemStatus =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            if (
                getRole(req) !==
                "LAB_TECHNICIAN"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only lab technicians can update laboratory work.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            const technicianId =
                getUserId(req);

            const orderId =
                getParamId(
                    req,
                    "orderId",
                );

            const itemId =
                getParamId(
                    req,
                    "itemId",
                );

            if (
                !hospitalId ||
                !technicianId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Technician information is required.",
                });
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    orderId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid order ID.",
                });
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    itemId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid order item ID.",
                });
            }

            const {
                status,
                result,
                notes,
            } = req.body;

            const allowedStatuses = [
                "SAMPLE_COLLECTED",
                "PROCESSING",
                "COMPLETED",
            ];

            if (
                !allowedStatuses.includes(
                    status,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid laboratory item status.",
                });
            }

            const technician =
                await User.findOne({
                    _id: technicianId,
                    hospitalId,
                    role: "LAB_TECHNICIAN",
                    isActive: true,
                }).lean();

            if (!technician) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab technician not found.",
                });
            }

            if (
                !technician.labDepartmentId ||
                !technician.labRoomId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Technician is not assigned to a lab department and room.",
                });
            }

            const order =
                await LabOrder.findOne({
                    _id: orderId,
                    hospitalId,
                    paymentStatus:
                        "PAID",
                });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Paid lab order not found.",
                });
            }

            const item =
                order.items.find(
                    (
                        currentItem,
                    ) =>
                        currentItem._id?.toString() ===
                        itemId,
                );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab order item not found.",
                });
            }

            // ========================================================
            // VERIFY TECHNICIAN ROUTING
            // ========================================================

            if (
                String(
                    item.labDepartmentId,
                ) !==
                String(
                    technician.labDepartmentId,
                ) ||
                String(
                    item.labRoomId,
                ) !==
                String(
                    technician.labRoomId,
                )
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "This test is not assigned to your laboratory department and room.",
                });
            }

            // ========================================================
            // PREVENT UPDATES TO FINISHED ITEMS
            // ========================================================

            if (
                item.status ===
                "COMPLETED" ||
                item.status ===
                "CANCELLED"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This lab item can no longer be updated.",
                });
            }

            // ========================================================
            // STATUS TRANSITIONS
            // ========================================================

            if (
                status ===
                "SAMPLE_COLLECTED" &&
                item.status !==
                "ORDERED"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Sample can only be collected from an ordered test.",
                });
            }

            if (
                status ===
                "PROCESSING" &&
                item.status !==
                "SAMPLE_COLLECTED"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Test can only start processing after sample collection.",
                });
            }

            if (
                status ===
                "COMPLETED" &&
                item.status !==
                "PROCESSING"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Test can only be completed after processing.",
                });
            }

            // ========================================================
            // UPDATE STATUS
            // ========================================================

            item.status =
                status;

            // ========================================================
            // ASSIGN TECHNICIAN
            // ========================================================

            item.technicianId =
                new mongoose.Types.ObjectId(
                    technicianId,
                );

            // ========================================================
            // RESULT
            // ========================================================

            if (
                result !==
                undefined
            ) {
                item.result =
                    typeof result ===
                        "string"
                        ? result.trim()
                        : String(
                            result,
                        );
            }

            // ========================================================
            // NOTES
            // ========================================================

            if (
                notes !==
                undefined
            ) {
                item.notes =
                    typeof notes ===
                        "string"
                        ? notes.trim()
                        : String(
                            notes,
                        );
            }

            // ========================================================
            // REPORT UPLOAD
            // ========================================================

            const uploadedFile =
                req.file;

            if (
                uploadedFile
            ) {
                const baseUrl =
                    `${req.protocol}://${req.get(
                        "host",
                    )}`;

                item.reportFileUrl =
                    `${baseUrl}/uploads/lab-reports/${uploadedFile.filename}`;

                item.reportFileName =
                    uploadedFile.originalname;

                item.reportUploadedAt =
                    new Date();
            }

            // ========================================================
            // VALIDATE COMPLETED REPORT
            // ========================================================

            if (
                status ===
                "COMPLETED"
            ) {
                if (
                    !item.result ||
                    !item.result.trim()
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Test result is required before completing the report.",
                    });
                }
            }

            // ========================================================
            // ORDER STATUS
            // ========================================================

            const activeItems =
                order.items.filter(
                    (
                        currentItem,
                    ) =>
                        currentItem.status !==
                        "CANCELLED",
                );

            const completedItems =
                activeItems.filter(
                    (
                        currentItem,
                    ) =>
                        currentItem.status ===
                        "COMPLETED",
                );

            const processingItems =
                activeItems.filter(
                    (
                        currentItem,
                    ) =>
                        currentItem.status ===
                        "PROCESSING" ||
                        currentItem.status ===
                        "SAMPLE_COLLECTED",
                );

            const orderedItems =
                activeItems.filter(
                    (
                        currentItem,
                    ) =>
                        currentItem.status ===
                        "ORDERED",
                );

            if (
                activeItems.length >
                0 &&
                completedItems.length ===
                activeItems.length
            ) {
                order.status =
                    "COMPLETED";

                order.completedAt =
                    new Date();
            } else if (
                completedItems.length >
                0
            ) {
                order.status =
                    "REPORT_READY";
            } else if (
                processingItems.length >
                0
            ) {
                order.status =
                    "PROCESSING";
            } else if (
                orderedItems.length >
                0
            ) {
                order.status =
                    "READY_FOR_LAB";
            } else {
                order.status =
                    "READY_FOR_LAB";
            }

            // ========================================================
            // COLLECTION DATE
            // ========================================================

            if (
                activeItems.some(
                    (
                        currentItem,
                    ) =>
                        currentItem.status ===
                        "SAMPLE_COLLECTED",
                )
            ) {
                order.collectedAt =
                    order.collectedAt ??
                    new Date();
            }

            // ========================================================
            // SAVE
            // ========================================================

            await order.save();

            // ========================================================
            // RETURN POPULATED ORDER
            // ========================================================

            const updatedOrder =
                await LabOrder.findById(
                    order._id,
                )
                    .populate(
                        "patientId",
                        "name patientCode age gender phone email",
                    )
                    .populate(
                        "doctorId",
                        "name",
                    )
                    .populate(
                        "items.labDepartmentId",
                        "name code",
                    )
                    .populate(
                        "items.labRoomId",
                        "name roomNumber building floor",
                    )
                    .populate(
                        "items.technicianId",
                        "name email",
                    )
                    .lean();

            return res.status(200).json({
                success: true,

                message:
                    "Lab test updated successfully.",

                data:
                    updatedOrder,
            });
        } catch (error) {
            console.error(
                "Update lab order item status error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update lab test.",
            });
        }
    };

// ============================================================
// GET LAB REPORT
// ============================================================

export const getLabReport =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const hospitalId =
                getHospitalId(req);

            const orderId =
                getParamId(
                    req,
                    "orderId",
                );

            const itemId =
                getParamId(
                    req,
                    "itemId",
                );

            if (!hospitalId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Hospital information is required.",
                });
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    orderId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid order ID.",
                });
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    itemId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid item ID.",
                });
            }

            const order =
                await LabOrder.findOne({
                    _id: orderId,
                    hospitalId,
                }).lean();

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab order not found.",
                });
            }

            const item =
                order.items.find(
                    (
                        currentItem,
                    ) =>
                        currentItem._id?.toString() ===
                        itemId,
                );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab order item not found.",
                });
            }

            if (
                !item.reportFileUrl
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "No uploaded report found for this test.",
                });
            }

            return res.status(200).json({
                success: true,

                data: {
                    orderId:
                        order._id,

                    itemId:
                        item._id,

                    testName:
                        item.testName,

                    result:
                        item.result ||
                        "",

                    notes:
                        item.notes ||
                        "",

                    reportFileUrl:
                        item.reportFileUrl,

                    reportFileName:
                        item.reportFileName ||
                        "Lab Report",

                    reportUploadedAt:
                        item.reportUploadedAt ||
                        null,
                },
            });
        } catch (error) {
            console.error(
                "Get lab report error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to fetch lab report.",
            });
        }
    };


export const getTodayPatientLabOrders = async (
    req: Request,
    res: Response,
) => {
    try {
        const {
            patientId,
        } = req.params;

        // ====================================================
        // VALIDATE PATIENT ID TYPE
        // ====================================================

        if (
            typeof patientId !== "string" ||
            !mongoose.Types.ObjectId.isValid(patientId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID.",
            });
        }

        // ====================================================
        // GET HOSPITAL ID
        // ====================================================

        const hospitalId =
            req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                message: "Hospital ID not found.",
            });
        }

        // ====================================================
        // TODAY DATE RANGE
        // ====================================================

        const startOfToday =
            new Date();

        startOfToday.setHours(
            0,
            0,
            0,
            0,
        );

        const endOfToday =
            new Date();

        endOfToday.setHours(
            23,
            59,
            59,
            999,
        );

        // ====================================================
        // FIND TODAY'S LAB ORDERS
        // ====================================================

        const orders =
            await LabOrder.find({
                hospitalId,
                patientId,

                orderedAt: {
                    $gte: startOfToday,
                    $lte: endOfToday,
                },

                status: {
                    $ne: "CANCELLED",
                },
            })
                .sort({
                    orderedAt: -1,
                })
                .lean();

        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(200).json({
            success: true,
            data: orders,
        });

    } catch (error) {

        console.error(
            "GET TODAY PATIENT LAB ORDERS ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch today's patient lab orders.",
        });
    }
};
