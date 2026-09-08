import mongoose, {
    Document,
    Model,
    Schema,
} from "mongoose";

// ============================================================
// LAB TEST INTERFACE
// ============================================================

export interface ILabTest extends Document {
    hospitalId: mongoose.Types.ObjectId;

    name: string;
    code?: string;
    category?: string;
    description?: string;

    price?: number;

    sampleType?: string;

    turnaroundTimeMinutes?: number;

    // ========================================================
    // AUTOMATIC LAB ROUTING
    // ========================================================

    labDepartmentId: mongoose.Types.ObjectId;

    labRoomId: mongoose.Types.ObjectId;

    // ========================================================

    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}

// ============================================================
// SCHEMA
// ============================================================

const LabTestSchema =
    new Schema<ILabTest>(
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
            // TEST NAME
            // ==================================================

            name: {
                type: String,
                required: true,
                trim: true,
            },

            // ==================================================
            // TEST CODE
            // ==================================================

            code: {
                type: String,
                trim: true,
                uppercase: true,
            },

            // ==================================================
            // CATEGORY
            // ==================================================

            category: {
                type: String,
                trim: true,
            },

            // ==================================================
            // DESCRIPTION
            // ==================================================

            description: {
                type: String,
                trim: true,
            },

            // ==================================================
            // PRICE
            // ==================================================

            price: {
                type: Number,
                min: 0,
                default: 0,
            },

            // ==================================================
            // SAMPLE TYPE
            // ==================================================

            sampleType: {
                type: String,
                trim: true,
            },

            // ==================================================
            // TURNAROUND TIME
            // ==================================================

            turnaroundTimeMinutes: {
                type: Number,
                min: 0,
                default: 0,
            },

            // ==================================================
            // LAB DEPARTMENT
            // ==================================================
            //
            // Example:
            // Hematology
            // Biochemistry
            // Pathology
            // Microbiology
            //
            // This is NOT the doctor's Department model.
            //
            // ==================================================

            labDepartmentId: {
                type: Schema.Types.ObjectId,
                ref: "LabDepartment",
                required: true,
                index: true,
            },

            // ==================================================
            // LAB ROOM
            // ==================================================
            //
            // Example:
            // H-01
            // B-01
            // P-01
            //
            // ==================================================

            labRoomId: {
                type: Schema.Types.ObjectId,
                ref: "LabRoom",
                required: true,
                index: true,
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

// Unique test name inside hospital
LabTestSchema.index(
    {
        hospitalId: 1,
        name: 1,
    },
    {
        unique: true,
    },
);

// Unique test code inside hospital
LabTestSchema.index(
    {
        hospitalId: 1,
        code: 1,
    },
    {
        unique: true,
        sparse: true,
    },
);

// Active tests
LabTestSchema.index({
    hospitalId: 1,
    isActive: 1,
});

// Routing lookup
LabTestSchema.index({
    hospitalId: 1,
    labDepartmentId: 1,
    labRoomId: 1,
});

// ============================================================
// MODEL
// ============================================================

const LabTest: Model<ILabTest> =
    mongoose.models.LabTest ||
    mongoose.model<ILabTest>(
        "LabTest",
        LabTestSchema,
    );

export default LabTest;