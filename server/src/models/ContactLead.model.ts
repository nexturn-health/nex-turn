import mongoose, {
    Schema,
    type Document,
    type Model,
} from "mongoose";

export interface IContactLead extends Document {
    name: string;
    phone: string;
    email?: string;
    organization?: string;
    city?: string;
    interest?: string;
    message: string;
    source: string;
    status:
        | "NEW"
        | "CONTACTED"
        | "DEMO_BOOKED"
        | "CONVERTED"
        | "CLOSED";
    createdAt: Date;
    updatedAt: Date;
}

const contactLeadSchema =
    new Schema<IContactLead>(
        {
            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 80,
            },

            phone: {
                type: String,
                required: true,
                trim: true,
                maxlength: 10,
                index: true,
            },

            email: {
                type: String,
                trim: true,
                lowercase: true,
                maxlength: 120,
            },

            organization: {
                type: String,
                trim: true,
                maxlength: 120,
            },

            city: {
                type: String,
                trim: true,
                maxlength: 80,
            },

            interest: {
                type: String,
                trim: true,
                maxlength: 80,
            },

            message: {
                type: String,
                required: true,
                trim: true,
                maxlength: 1000,
            },

            source: {
                type: String,
                default: "WEBSITE_CONTACT_FORM",
                trim: true,
            },

            status: {
                type: String,
                enum: [
                    "NEW",
                    "CONTACTED",
                    "DEMO_BOOKED",
                    "CONVERTED",
                    "CLOSED",
                ],
                default: "NEW",
                index: true,
            },
        },
        {
            timestamps: true,
        },
    );

contactLeadSchema.index({
    createdAt: -1,
});

export const ContactLead: Model<IContactLead> =
    mongoose.models.ContactLead ||
    mongoose.model<IContactLead>(
        "ContactLead",
        contactLeadSchema,
    );