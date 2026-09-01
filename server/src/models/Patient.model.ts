import mongoose, {
    Document,
    Schema,
} from "mongoose";

// ========================================
// PATIENT INTERFACE
// ========================================

export interface IPatient
    extends Document {
    registrationDate: string;
    name: string;
    email: string;
    phone: string;
    age?: number;
    gender?:
    | "MALE"
    | "FEMALE"
    | "OTHER";
    address?: string;
    hospitalId:
    mongoose.Types.ObjectId;
    patientCode: string;
    createdAt: Date;
    updatedAt: Date;
}


// ========================================
// PATIENT SCHEMA
// ========================================

const patientSchema =
    new Schema<IPatient>(
        {

            // ==============================
            // NAME
            // ==============================

            name: {
                type: String,
                required: true,
                trim: true,
            },


            // ==============================
            // PHONE
            // ==============================

            phone: {
                type: String,
                required: true,
                trim: true,
            },

            email: {
                type: String,
                trim: true,
                lowercase: true,
                default: undefined,
            },
            // ==============================
            // AGE
            // ==============================

            age: {
                type: Number,
                min: 0,
                max: 150,
            },


            // ==============================
            // GENDER
            // ==============================

            gender: {
                type: String,
                enum: [
                    "MALE",
                    "FEMALE",
                    "OTHER",
                ],
            },


            // ==============================
            // ADDRESS
            // ==============================

            address: {
                type: String,
                trim: true,
                default: "",
            },


            // ==============================
            // HOSPITAL
            // ==============================

            hospitalId: {
                type: Schema.Types.ObjectId,
                ref: "Hospital",
                required: true,
                index: true,
            },


            // ==============================
            // PATIENT CODE
            // ==============================

            patientCode: {
                type: String,
                required: true,
                trim: true,
            },

            registrationDate: {
                type: String,
                required: true,
                index: true,
            },
        },
        {
            timestamps: true,
        },
    );

// patientSchema.index(
//   {
//     hospitalId: 1,
//     registrationDate: 1,
//     phone: 1,
//   },
//   {
//     unique: true,
//   },
// );

patientSchema.index(
    {
        hospitalId: 1,
        patientCode: 1,
    },
    {
        unique: true,
    },
);
// ========================================
// MODEL
// ========================================

export const Patient =
    mongoose.models.Patient ||
    mongoose.model<IPatient>(
        "Patient",
        patientSchema,
    );

export default Patient;