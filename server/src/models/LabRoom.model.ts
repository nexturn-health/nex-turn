import mongoose, {
    Document,
    Schema,
} from "mongoose";

// ============================================================
// LAB ROOM INTERFACE
// ============================================================

export interface ILabRoom extends Document {
    hospitalId: mongoose.Types.ObjectId;

    // ========================================================
    // LAB DEPARTMENT
    // ========================================================

    labDepartmentId: mongoose.Types.ObjectId;

    // ========================================================
    // ROOM INFORMATION
    // ========================================================

    name: string;

    roomNumber: string;

    building: string;

    floor: string;

    description?: string;

    // ========================================================
    // STATUS
    // ========================================================

    isActive: boolean;

    // ========================================================
    // TIMESTAMPS
    // ========================================================

    createdAt: Date;

    updatedAt: Date;
}

// ============================================================
// LAB ROOM SCHEMA
// ============================================================

const LabRoomSchema =
    new Schema<ILabRoom>(
        {
            // ==================================================
            // HOSPITAL
            // ==================================================

            hospitalId: {
                type: Schema.Types.ObjectId,

                ref: "Hospital",

                required: true,

                index: true,
            },

            // ==================================================
            // LAB DEPARTMENT
            // ==================================================

            labDepartmentId: {
                type: Schema.Types.ObjectId,

                ref: "LabDepartment",

                required: true,

                index: true,
            },

            // ==================================================
            // ROOM NAME
            // ==================================================

            name: {
                type: String,

                required: true,

                trim: true,
            },

            // ==================================================
            // ROOM NUMBER
            // ==================================================

            roomNumber: {
                type: String,

                required: true,

                trim: true,

                uppercase: true,
            },

            // ==================================================
            // BUILDING
            // ==================================================

            building: {
                type: String,

                required: true,

                trim: true,
            },

            // ==================================================
            // FLOOR
            // ==================================================

            floor: {
                type: String,

                required: true,

                trim: true,
            },

            // ==================================================
            // DESCRIPTION
            // ==================================================

            description: {
                type: String,

                default: "",

                trim: true,
            },

            // ==================================================
            // ACTIVE STATUS
            // ==================================================

            isActive: {
                type: Boolean,

                default: true,

                index: true,
            },
        },

        {
            timestamps: true,
        },
    );

// ============================================================
// INDEXES
// ============================================================

// ------------------------------------------------------------
// Find rooms by hospital + department
// ------------------------------------------------------------

LabRoomSchema.index({
    hospitalId: 1,

    labDepartmentId: 1,
});

// ------------------------------------------------------------
// Find active rooms by hospital + department
// ------------------------------------------------------------

LabRoomSchema.index({
    hospitalId: 1,

    labDepartmentId: 1,

    isActive: 1,
});

// ------------------------------------------------------------
// Room number should be unique inside a hospital
// ------------------------------------------------------------

LabRoomSchema.index(
    {
        hospitalId: 1,

        roomNumber: 1,
    },
    {
        unique: true,
    },
);

// ------------------------------------------------------------
// Room name should be unique inside a department
// ------------------------------------------------------------

LabRoomSchema.index(
    {
        hospitalId: 1,

        labDepartmentId: 1,

        name: 1,
    },
    {
        unique: true,
    },
);

// ============================================================
// MODEL
// ============================================================

const LabRoom = mongoose.model<ILabRoom>(
    "LabRoom",
    LabRoomSchema,
);

export default LabRoom;