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
        req.user?.role === "HOSPITAL_ADMIN"
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

const isValidObjectId = (
    value: unknown,
): value is string => {
    return (
        typeof value === "string" &&
        mongoose.Types.ObjectId.isValid(
            value,
        )
    );
};

// ============================================================
// GET LAB ROOMS
// ============================================================
//
// GET /api/lab-rooms
//
// Optional:
//
// ?labDepartmentId=xxxxx
// ?isActive=true
// ?isActive=false
//
// ============================================================

export const getLabRooms = async (
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

        const filter: Record<
            string,
            unknown
        > = {
            hospitalId,
        };

        const {
            labDepartmentId,
            isActive,
        } = req.query;

        // ====================================================
        // DEPARTMENT FILTER
        // ====================================================

        if (
            typeof labDepartmentId ===
            "string"
        ) {
            if (
                !mongoose.Types.ObjectId.isValid(
                    labDepartmentId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lab department ID.",
                });
            }

            filter.labDepartmentId =
                labDepartmentId;
        }

        // ====================================================
        // ACTIVE FILTER
        // ====================================================

        if (isActive === "true") {
            filter.isActive = true;
        }

        if (isActive === "false") {
            filter.isActive = false;
        }

        const rooms =
            await LabRoom.find(filter)
                .populate(
                    "labDepartmentId",
                    "name code description",
                )
                .sort({
                    name: 1,
                    roomNumber: 1,
                })
                .lean();

        return res.status(200).json({
            success: true,
            data: rooms,
        });
    } catch (error) {
        console.error(
            "Get lab rooms error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch lab rooms.",
        });
    }
};

// ============================================================
// GET ACTIVE LAB ROOMS
// ============================================================
//
// GET /api/lab-rooms/active
//
// Optional:
//
// ?labDepartmentId=xxxxx
//
// This endpoint is useful when creating/editing Lab Tests.
//
// ============================================================

export const getActiveLabRooms =
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

            const {
                labDepartmentId,
            } = req.query;

            const filter: Record<
                string,
                unknown
            > = {
                hospitalId,
                isActive: true,
            };

            // =================================================
            // DEPARTMENT FILTER
            // =================================================

            if (
                typeof labDepartmentId ===
                "string"
            ) {
                if (
                    !mongoose.Types.ObjectId.isValid(
                        labDepartmentId,
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid lab department ID.",
                    });
                }

                filter.labDepartmentId =
                    labDepartmentId;
            }

            const rooms =
                await LabRoom.find(filter)
                    .populate(
                        "labDepartmentId",
                        "name code description",
                    )
                    .sort({
                        name: 1,
                        roomNumber: 1,
                    })
                    .lean();

            return res.status(200).json({
                success: true,
                data: rooms,
            });
        } catch (error) {
            console.error(
                "Get active lab rooms error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to fetch active lab rooms.",
            });
        }
    };

// ============================================================
// CREATE LAB ROOM
// ============================================================
//
// POST /api/lab-rooms
//
// Body:
//
// {
//   "labDepartmentId": "...",
//   "name": "Hematology Room",
//   "roomNumber": "H-01",
//   "building": "Main Hospital",
//   "floor": "2nd Floor",
//   "description": "CBC and ESR processing"
// }
//
// ============================================================

export const createLabRoom = async (
    req: Request,
    res: Response,
) => {
    try {
        // ====================================================
        // ADMIN ONLY
        // ====================================================

        if (!isAdmin(req)) {
            return res.status(403).json({
                success: false,
                message:
                    "Only hospital admin can create lab rooms.",
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
            labDepartmentId,
            name,
            roomNumber,
            building,
            floor,
            description,
        } = req.body;

        // ====================================================
        // VALIDATE DEPARTMENT
        // ====================================================

        if (
            !isValidObjectId(
                labDepartmentId,
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid lab department ID is required.",
            });
        }

        // ====================================================
        // VALIDATE NAME
        // ====================================================

        if (
            typeof name !== "string" ||
            !name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Room name is required.",
            });
        }

        // ====================================================
        // VALIDATE ROOM NUMBER
        // ====================================================

        if (
            typeof roomNumber !==
            "string" ||
            !roomNumber.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Room number is required.",
            });
        }

        // ====================================================
        // VALIDATE BUILDING
        // ====================================================

        if (
            typeof building !==
            "string" ||
            !building.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Building is required.",
            });
        }

        // ====================================================
        // VALIDATE FLOOR
        // ====================================================

        if (
            typeof floor !== "string" ||
            !floor.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Floor is required.",
            });
        }

        // ====================================================
        // FIND DEPARTMENT
        // ====================================================

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

        // ====================================================
        // NORMALIZE VALUES
        // ====================================================

        const normalizedName =
            name.trim();

        const normalizedRoomNumber =
            roomNumber
                .trim()
                .toUpperCase();

        const normalizedBuilding =
            building.trim();

        const normalizedFloor =
            floor.trim();

        const normalizedDescription =
            typeof description ===
                "string"
                ? description.trim()
                : "";

        // ====================================================
        // CHECK DUPLICATE ROOM NAME
        // ====================================================

        const duplicateName =
            await LabRoom.findOne({
                hospitalId,

                labDepartmentId,

                name: normalizedName,
            });

        if (duplicateName) {
            return res.status(409).json({
                success: false,
                message:
                    "A room with this name already exists in this lab department.",
            });
        }

        // ====================================================
        // CHECK DUPLICATE ROOM NUMBER
        // ====================================================
        //
        // Room numbers are unique inside a hospital.
        //
        // Example:
        //
        // H-01 → Hematology
        // B-01 → Biochemistry
        //
        // ====================================================

        const duplicateRoomNumber =
            await LabRoom.findOne({
                hospitalId,

                roomNumber:
                    normalizedRoomNumber,
            });

        if (duplicateRoomNumber) {
            return res.status(409).json({
                success: false,
                message:
                    "This room number is already in use in this hospital.",
            });
        }

        // ====================================================
        // CREATE ROOM
        // ====================================================

        const room =
            await LabRoom.create({
                hospitalId,

                labDepartmentId,

                name:
                    normalizedName,

                roomNumber:
                    normalizedRoomNumber,

                building:
                    normalizedBuilding,

                floor:
                    normalizedFloor,

                description:
                    normalizedDescription,

                isActive: true,
            });

        // ====================================================
        // RETURN POPULATED ROOM
        // ====================================================

        const populatedRoom =
            await LabRoom.findById(
                room._id,
            )
                .populate(
                    "labDepartmentId",
                    "name code description",
                )
                .lean();

        return res.status(201).json({
            success: true,
            message:
                "Lab room created successfully.",
            data:
                populatedRoom ??
                room,
        });
    } catch (error) {
        console.error(
            "Create lab room error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create lab room.",
        });
    }
};

// ============================================================
// UPDATE LAB ROOM
// ============================================================
//
// PATCH /api/lab-rooms/:id
//
// ============================================================

export const updateLabRoom = async (
    req: Request,
    res: Response,
) => {
    try {
        // ====================================================
        // ADMIN ONLY
        // ====================================================

        if (!isAdmin(req)) {
            return res.status(403).json({
                success: false,
                message:
                    "Only hospital admin can update lab rooms.",
            });
        }

        const hospitalId =
            getHospitalId(req);

        const roomId =
            getParamId(req);

        // ====================================================
        // VALIDATE IDs
        // ====================================================

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message:
                    "Hospital ID is required.",
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                roomId,
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid lab room ID.",
            });
        }

        // ====================================================
        // FIND ROOM
        // ====================================================

        const room =
            await LabRoom.findOne({
                _id: roomId,
                hospitalId,
            });

        if (!room) {
            return res.status(404).json({
                success: false,
                message:
                    "Lab room not found.",
            });
        }

        const {
            labDepartmentId,
            name,
            roomNumber,
            building,
            floor,
            description,
            isActive,
        } = req.body;

        // ====================================================
        // DETERMINE FINAL DEPARTMENT
        // ====================================================

        let finalDepartmentId =
            room.labDepartmentId;

        if (
            labDepartmentId !==
            undefined
        ) {
            if (
                !isValidObjectId(
                    labDepartmentId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lab department ID.",
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

            finalDepartmentId =
                new mongoose.Types.ObjectId(
                    labDepartmentId,
                );
        } else {
            // =================================================
            // MAKE SURE CURRENT DEPARTMENT STILL EXISTS
            // =================================================

            const currentDepartment =
                await LabDepartment.findOne({
                    _id: room.labDepartmentId,

                    hospitalId,

                    isActive: true,
                });

            if (!currentDepartment) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The room's current lab department is inactive or does not exist.",
                });
            }
        }

        // ====================================================
        // VALIDATE NAME
        // ====================================================

        if (
            name !== undefined &&
            (
                typeof name !==
                "string" ||
                !name.trim()
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid room name.",
            });
        }

        // ====================================================
        // VALIDATE ROOM NUMBER
        // ====================================================

        if (
            roomNumber !==
            undefined &&
            (
                typeof roomNumber !==
                "string" ||
                !roomNumber.trim()
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid room number.",
            });
        }

        // ====================================================
        // VALIDATE BUILDING
        // ====================================================

        if (
            building !==
            undefined &&
            (
                typeof building !==
                "string" ||
                !building.trim()
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Building cannot be empty.",
            });
        }

        // ====================================================
        // VALIDATE FLOOR
        // ====================================================

        if (
            floor !== undefined &&
            (
                typeof floor !==
                "string" ||
                !floor.trim()
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Floor cannot be empty.",
            });
        }

        // ====================================================
        // FINAL VALUES
        // ====================================================

        const finalName =
            name !== undefined
                ? name.trim()
                : room.name;

        const finalRoomNumber: string =
            roomNumber !== undefined
                ? roomNumber
                    .trim()
                    .toUpperCase()
                : room.roomNumber ?? "";

        // ====================================================
        // CHECK DUPLICATE NAME
        // ====================================================

        const duplicateName =
            await LabRoom.findOne({
                hospitalId,

                labDepartmentId:
                    finalDepartmentId,

                name: finalName,

                _id: {
                    $ne: roomId,
                },
            });

        if (duplicateName) {
            return res.status(409).json({
                success: false,
                message:
                    "Another room with this name already exists in this lab department.",
            });
        }

        // ====================================================
        // CHECK DUPLICATE ROOM NUMBER
        // ====================================================

        const duplicateRoomNumber =
            await LabRoom.findOne({
                hospitalId,

                roomNumber:
                    finalRoomNumber,

                _id: {
                    $ne: roomId,
                },
            });

        if (duplicateRoomNumber) {
            return res.status(409).json({
                success: false,
                message:
                    "This room number is already in use in this hospital.",
            });
        }

        // ====================================================
        // IMPORTANT:
        // CHECK ACTIVE TESTS BEFORE MOVING ROOM
        // ====================================================
        //
        // If an active test is currently routed to this room
        // and admin changes the department, that would make
        // the test routing inconsistent.
        //
        // Example:
        //
        // CBC → Hematology → H-01
        //
        // Admin tries:
        //
        // H-01 → Biochemistry
        //
        // This would break CBC routing.
        //
        // So reject the operation when active tests exist.
        //
        // ====================================================

        const departmentChanged =
            String(
                room.labDepartmentId,
            ) !==
            String(
                finalDepartmentId,
            );

        if (departmentChanged) {
            const activeTests =
                await LabTest.findOne({
                    hospitalId,

                    labRoomId:
                        room._id,

                    isActive: true,
                }).lean();

            if (activeTests) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This room is assigned to one or more active lab tests. Reassign or deactivate those tests before changing the room's lab department.",
                });
            }
        }

        // ====================================================
        // UPDATE DEPARTMENT
        // ====================================================

        room.labDepartmentId =
            finalDepartmentId;

        // ====================================================
        // UPDATE NAME
        // ====================================================

        room.name =
            finalName;

        // ====================================================
        // UPDATE ROOM NUMBER
        // ====================================================

        room.roomNumber =
            finalRoomNumber;

        // ====================================================
        // UPDATE BUILDING
        // ====================================================

        if (
            building !==
            undefined
        ) {
            room.building =
                building.trim();
        }

        // ====================================================
        // UPDATE FLOOR
        // ====================================================

        if (
            floor !== undefined
        ) {
            room.floor =
                floor.trim();
        }

        // ====================================================
        // UPDATE DESCRIPTION
        // ====================================================

        if (
            description !==
            undefined
        ) {
            room.description =
                typeof description ===
                    "string"
                    ? description.trim()
                    : "";
        }

        // ====================================================
        // UPDATE ACTIVE STATUS
        // ====================================================

        if (
            typeof isActive ===
            "boolean"
        ) {
            // ================================================
            // DEACTIVATING ROOM
            // ================================================

            if (
                isActive ===
                false
            ) {
                const activeTest =
                    await LabTest.findOne({
                        hospitalId,

                        labRoomId:
                            room._id,

                        isActive: true,
                    }).lean();

                if (activeTest) {
                    return res.status(409).json({
                        success: false,
                        message:
                            `Cannot deactivate this room because active lab test "${activeTest.name}" is assigned to it. Reassign or deactivate the test first.`,
                    });
                }
            }

            room.isActive =
                isActive;
        }

        // ====================================================
        // SAVE
        // ====================================================

        await room.save();

        // ====================================================
        // POPULATE RESPONSE
        // ====================================================

        const updatedRoom =
            await LabRoom.findById(
                room._id,
            )
                .populate(
                    "labDepartmentId",
                    "name code description",
                )
                .lean();

        return res.status(200).json({
            success: true,
            message:
                "Lab room updated successfully.",
            data:
                updatedRoom ??
                room,
        });
    } catch (error) {
        console.error(
            "Update lab room error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update lab room.",
        });
    }
};

// ============================================================
// DEACTIVATE LAB ROOM
// ============================================================
//
// DELETE /api/lab-rooms/:id
//
// This is a SOFT DELETE.
// The room remains in MongoDB but becomes inactive.
//
// ============================================================

export const deactivateLabRoom =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            // =================================================
            // ADMIN ONLY
            // =================================================

            if (!isAdmin(req)) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only hospital admin can deactivate lab rooms.",
                });
            }

            const hospitalId =
                getHospitalId(req);

            const roomId =
                getParamId(req);

            if (!hospitalId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Hospital ID is required.",
                });
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    roomId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lab room ID.",
                });
            }

            // =================================================
            // FIND ROOM
            // =================================================

            const room =
                await LabRoom.findOne({
                    _id: roomId,
                    hospitalId,
                });

            if (!room) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Lab room not found.",
                });
            }

            // =================================================
            // ALREADY INACTIVE
            // =================================================

            if (
                !room.isActive
            ) {
                return res.status(200).json({
                    success: true,
                    message:
                        "Lab room is already inactive.",
                    data: room,
                });
            }

            // =================================================
            // CHECK ACTIVE LAB TESTS
            // =================================================

            const activeTest =
                await LabTest.findOne({
                    hospitalId,

                    labRoomId:
                        room._id,

                    isActive: true,
                }).lean();

            if (activeTest) {
                return res.status(409).json({
                    success: false,
                    message:
                        `Cannot deactivate this room because active lab test "${activeTest.name}" is assigned to it. Reassign or deactivate the test first.`,
                });
            }

            // =================================================
            // DEACTIVATE
            // =================================================

            room.isActive =
                false;

            await room.save();

            return res.status(200).json({
                success: true,
                message:
                    "Lab room deactivated successfully.",
                data: room,
            });
        } catch (error) {
            console.error(
                "Deactivate lab room error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to deactivate lab room.",
            });
        }
    };