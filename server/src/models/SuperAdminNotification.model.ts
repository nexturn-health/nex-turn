import mongoose, {
    Schema,
    type Document,
    type Model,
} from "mongoose";

export interface ISuperAdminNotification extends Document {
    title: string;
    message: string;
    type: "CONTACT_LEAD" | "SYSTEM";
    isRead: boolean;
    entityId?: mongoose.Types.ObjectId;
    entityModel?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const superAdminNotificationSchema =
    new Schema<ISuperAdminNotification>(
        {
            title: {
                type: String,
                required: true,
                trim: true,
                maxlength: 120,
            },

            message: {
                type: String,
                required: true,
                trim: true,
                maxlength: 500,
            },

            type: {
                type: String,
                enum: [
                    "CONTACT_LEAD",
                    "SYSTEM",
                ],
                required: true,
                index: true,
            },

            isRead: {
                type: Boolean,
                default: false,
                index: true,
            },

            entityId: {
                type: Schema.Types.ObjectId,
            },

            entityModel: {
                type: String,
                trim: true,
            },

            metadata: {
                type: Schema.Types.Mixed,
                default: {},
            },
        },
        {
            timestamps: true,
        },
    );

superAdminNotificationSchema.index({
    createdAt: -1,
});

export const SuperAdminNotification: Model<ISuperAdminNotification> =
    mongoose.models.SuperAdminNotification ||
    mongoose.model<ISuperAdminNotification>(
        "SuperAdminNotification",
        superAdminNotificationSchema,
    );