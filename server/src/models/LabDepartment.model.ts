import mongoose, {
    Document,
    Model,
    Schema,
} from "mongoose";

export interface ILabDepartment extends Document {
    hospitalId: mongoose.Types.ObjectId;
    name: string;
    code?: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LabDepartmentSchema =
    new Schema<ILabDepartment>(
        {
            hospitalId: {
                type: Schema.Types.ObjectId,
                ref: "Hospital",
                required: true,
                index: true,
            },

            name: {
                type: String,
                required: true,
                trim: true,
            },

            code: {
                type: String,
                trim: true,
                uppercase: true,
            },

            description: {
                type: String,
                trim: true,
            },

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

LabDepartmentSchema.index(
    {
        hospitalId: 1,
        name: 1,
    },
    {
        unique: true,
    },
);

LabDepartmentSchema.index(
    {
        hospitalId: 1,
        code: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            code: {
                $type: "string",
            },
        },
    },
);

const LabDepartment: Model<ILabDepartment> =
    mongoose.models.LabDepartment ||
    mongoose.model<ILabDepartment>(
        "LabDepartment",
        LabDepartmentSchema,
    );

export default LabDepartment;