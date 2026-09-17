import mongoose, { HydratedDocument, Schema } from "mongoose";

export type ContactLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "DEMO_SCHEDULED"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "REJECTED";

export type ContactLeadPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ContactLeadNote {
  note: string;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
}

export interface IContactLead {
  _id?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  organization?: string;
  city?: string;
  interest?: string;
  message: string;
  source?: string;
  status: ContactLeadStatus;
  priority: ContactLeadPriority;
  notes: ContactLeadNote[];
  followUpAt?: Date | null;
  lastContactedAt?: Date | null;
  convertedAt?: Date | null;
  convertedHospitalId?: mongoose.Types.ObjectId | null;
  isArchived: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ContactLeadDocument = HydratedDocument<IContactLead>;

const contactLeadNoteSchema = new Schema<ContactLeadNote>(
  {
    note: { type: String, required: true, trim: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const contactLeadSchema = new Schema<IContactLead>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 10, index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: "" },
    organization: { type: String, trim: true, maxlength: 120, default: "" },
    city: { type: String, trim: true, maxlength: 80, default: "" },
    interest: { type: String, trim: true, maxlength: 80, default: "Free demo" },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    source: { type: String, trim: true, maxlength: 80, default: "WEBSITE_CONTACT_FORM" },
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "DEMO_SCHEDULED", "FOLLOW_UP", "CONVERTED", "REJECTED"],
      default: "NEW",
      index: true,
    },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM", index: true },
    notes: { type: [contactLeadNoteSchema], default: [] },
    followUpAt: { type: Date, default: null, index: true },
    lastContactedAt: { type: Date, default: null },
    convertedAt: { type: Date, default: null },
    convertedHospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", default: null },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

contactLeadSchema.index({ phone: 1, createdAt: -1 });
contactLeadSchema.index({ status: 1, createdAt: -1 });
contactLeadSchema.index({ city: 1, status: 1 });
contactLeadSchema.index({ isArchived: 1, followUpAt: 1 });

export const ContactLead = mongoose.model<IContactLead>("ContactLead", contactLeadSchema);
