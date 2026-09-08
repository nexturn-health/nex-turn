import mongoose, {
    Document,
    Model,
    Schema,
} from "mongoose";

// ============================================================
// PAYMENT STATUS
// ============================================================

export type LabOrderPaymentStatus =
    | "PENDING"
    | "PAID";

// ============================================================
// ORDER STATUS
// ============================================================

export type LabOrderStatus =
    | "ORDERED"
    | "PAYMENT_PENDING"
    | "READY_FOR_LAB"
    | "SAMPLE_COLLECTED"
    | "PROCESSING"
    | "REPORT_READY"
    | "COMPLETED"
    | "CANCELLED";

// ============================================================
// ITEM STATUS
// ============================================================

export type LabOrderItemStatus =
    | "ORDERED"
    | "SAMPLE_COLLECTED"
    | "PROCESSING"
    | "COMPLETED"
    | "CANCELLED";

// ============================================================
// LAB ORDER ITEM
// ============================================================

export interface ILabOrderItem {
    _id?: mongoose.Types.ObjectId;

    // ========================================================
    // TEST
    // ========================================================

    labTestId: mongoose.Types.ObjectId;

    testName: string;

    testCode?: string;

    price: number;

    // ========================================================
    // ROUTING SNAPSHOT
    // ========================================================

    labDepartmentId: mongoose.Types.ObjectId;

    labRoomId: mongoose.Types.ObjectId;

    technicianId?: mongoose.Types.ObjectId | null;

    // ========================================================
    // LAB WORK
    // ========================================================

    status: LabOrderItemStatus;

    // ========================================================
    // RESULT
    // ========================================================

    result?: string;

    // ========================================================
    // NOTES
    // ========================================================

    notes?: string;

    // ========================================================
    // UPLOADED REPORT
    // ========================================================

    reportFileUrl?: string | null;

    reportFileName?: string | null;

    reportUploadedAt?: Date | null;
}

// ============================================================
// LAB ORDER
// ============================================================

export interface ILabOrder extends Document {
    hospitalId: mongoose.Types.ObjectId;

    patientId: mongoose.Types.ObjectId;

    doctorId: mongoose.Types.ObjectId;

    consultationId: mongoose.Types.ObjectId;

    queueId: mongoose.Types.ObjectId;

    items: ILabOrderItem[];

    paymentStatus: LabOrderPaymentStatus;

    status: LabOrderStatus;

    orderedAt: Date;

    paidAt?: Date | null;

    collectedAt?: Date | null;

    completedAt?: Date | null;

    createdAt: Date;

    updatedAt: Date;
}

// ============================================================
// LAB ORDER ITEM SCHEMA
// ============================================================

const LabOrderItemSchema =
    new Schema<ILabOrderItem>(
        {
            // ==================================================
            // LAB TEST
            // ==================================================

            labTestId: {
                type: Schema.Types.ObjectId,
                ref: "LabTest",
                required: true,
                index: true,
            },

            testName: {
                type: String,
                required: true,
                trim: true,
            },

            testCode: {
                type: String,
                trim: true,
                uppercase: true,
            },

            price: {
                type: Number,
                min: 0,
                default: 0,
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
            // LAB ROOM
            // ==================================================

            labRoomId: {
                type: Schema.Types.ObjectId,
                ref: "LabRoom",
                required: true,
                index: true,
            },

            // ==================================================
            // TECHNICIAN
            // ==================================================

            technicianId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                default: null,
                index: true,
            },

            // ==================================================
            // ITEM STATUS
            // ==================================================

            status: {
                type: String,

                enum: [
                    "ORDERED",
                    "SAMPLE_COLLECTED",
                    "PROCESSING",
                    "COMPLETED",
                    "CANCELLED",
                ],

                default: "ORDERED",

                index: true,
            },

            // ==================================================
            // RESULT
            // ==================================================

            result: {
                type: String,
                trim: true,
                default: undefined,
            },

            // ==================================================
            // NOTES
            // ==================================================

            notes: {
                type: String,
                trim: true,
                default: undefined,
            },

            // ==================================================
            // REPORT FILE
            // ==================================================

            reportFileUrl: {
                type: String,
                trim: true,
                default: null,
            },

            reportFileName: {
                type: String,
                trim: true,
                default: null,
            },

            reportUploadedAt: {
                type: Date,
                default: null,
            },
        },

        {
            _id: true,
        },
    );

// ============================================================
// LAB ORDER SCHEMA
// ============================================================

const LabOrderSchema =
    new Schema<ILabOrder>(
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
            // PATIENT
            // ==================================================

            patientId: {
                type: Schema.Types.ObjectId,
                ref: "Patient",
                required: true,
                index: true,
            },

            // ==================================================
            // DOCTOR
            // ==================================================

            doctorId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true,
            },

            // ==================================================
            // CONSULTATION
            // ==================================================

            consultationId: {
                type: Schema.Types.ObjectId,
                ref: "Consultation",
                required: true,
                unique: true,
                index: true,
            },

            // ==================================================
            // QUEUE
            // ==================================================

            queueId: {
                type: Schema.Types.ObjectId,
                ref: "Queue",
                required: true,
                index: true,
            },

            // ==================================================
            // LAB ITEMS
            // ==================================================

            items: {
                type: [LabOrderItemSchema],

                required: true,

                validate: {
                    validator: (
                        value: ILabOrderItem[],
                    ) => {
                        return (
                            Array.isArray(value) &&
                            value.length > 0
                        );
                    },

                    message:
                        "At least one lab test is required.",
                },
            },

            // ==================================================
            // PAYMENT
            // ==================================================

            paymentStatus: {
                type: String,

                enum: [
                    "PENDING",
                    "PAID",
                ],

                default: "PENDING",

                index: true,
            },

            // ==================================================
            // ORDER STATUS
            // ==================================================

            status: {
                type: String,

                enum: [
                    "ORDERED",
                    "PAYMENT_PENDING",
                    "READY_FOR_LAB",
                    "SAMPLE_COLLECTED",
                    "PROCESSING",
                    "REPORT_READY",
                    "COMPLETED",
                    "CANCELLED",
                ],

                default:
                    "PAYMENT_PENDING",

                index: true,
            },

            // ==================================================
            // DATES
            // ==================================================

            orderedAt: {
                type: Date,
                default: Date.now,
                index: true,
            },

            paidAt: {
                type: Date,
                default: null,
            },

            collectedAt: {
                type: Date,
                default: null,
            },

            completedAt: {
                type: Date,
                default: null,
            },
        },

        {
            timestamps: true,
        },
    );

// ============================================================
// INDEXES
// ============================================================

LabOrderSchema.index({
    hospitalId: 1,
    paymentStatus: 1,
    status: 1,
});

LabOrderSchema.index({
    hospitalId: 1,
    patientId: 1,
    createdAt: -1,
});

LabOrderSchema.index({
    hospitalId: 1,
    doctorId: 1,
    createdAt: -1,
});

LabOrderSchema.index({
    hospitalId: 1,
    "items.labDepartmentId": 1,
});

LabOrderSchema.index({
    hospitalId: 1,
    "items.labRoomId": 1,
});

LabOrderSchema.index({
    hospitalId: 1,
    "items.technicianId": 1,
    "items.status": 1,
});

LabOrderSchema.index({
    hospitalId: 1,
    "items.labDepartmentId": 1,
    "items.labRoomId": 1,
});

// ============================================================
// MODEL
// ============================================================

const LabOrder: Model<ILabOrder> =
    mongoose.models.LabOrder ||
    mongoose.model<ILabOrder>(
        "LabOrder",
        LabOrderSchema,
    );

export default LabOrder;