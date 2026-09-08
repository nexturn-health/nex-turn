import mongoose, {
  Document,
  Schema,
} from "mongoose";

// ============================================================
// CONSULTATION STATUS
// ============================================================

export type ConsultationStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

// ============================================================
// MEDICATION
// ============================================================

export interface IConsultationMedication {
  name: string;

  dosage?: string;

  frequency?: string;

  duration?: string;

  instructions?: string;
}

// ============================================================
// AI ANALYSIS
//
// IMPORTANT:
// This is AI-GENERATED INFORMATION.
// It is NOT the final medical record.
//
// The doctor must review and approve it.
// ============================================================

export interface IAIClinicalAnalysis {
  clinicalSummary?: string;

  symptoms?: string[];

  possibleConditions?: string[];

  redFlags?: string[];

  suggestedInvestigations?: string[];

  medicationConsiderations?: string[];

  dietAndLifestyle?: string[];

  followUpSuggestions?: string[];

  generatedAt?: Date;

  model?: string;
}

// ============================================================
// CONSULTATION INTERFACE
// ============================================================

export interface IConsultation
  extends Document {

  // ==========================================================
  // RELATIONSHIPS
  // ==========================================================

  hospitalId: mongoose.Types.ObjectId;

  patientId: mongoose.Types.ObjectId;

  doctorId: mongoose.Types.ObjectId;

  queueId: mongoose.Types.ObjectId;

  departmentId: mongoose.Types.ObjectId;

  // ==========================================================
  // STATUS
  // ==========================================================

  status: ConsultationStatus;

  startedAt: Date;

  completedAt?: Date | null;

  // ==========================================================
  // CONSULTATION NOTES
  // ==========================================================

  chiefComplaint?: string;

  symptoms: string[];

  clinicalNotes?: string;

  examinationNotes?: string;

  // ==========================================================
  // TRANSCRIPTION
  //
  // We will use this later for AI speech-to-text.
  // ==========================================================

  transcript?: string;

  transcriptLanguage?: string;

  // ==========================================================
  // AI ANALYSIS
  // ==========================================================

  aiAnalysis?: IAIClinicalAnalysis;

  aiReviewedByDoctor: boolean;

  aiReviewedAt?: Date | null;

  // ==========================================================
  // FINAL DOCTOR DIAGNOSIS
  // ==========================================================

  finalDiagnosis: string[];

  // ==========================================================
  // FINAL PRESCRIPTION
  //
  // These are doctor-approved medications.
  // ==========================================================

  finalPrescription: IConsultationMedication[];

  // ==========================================================
  // DOCTOR ADVICE
  // ==========================================================

  dietAdvice: string[];

  lifestyleAdvice: string[];

  followUpAdvice?: string;

  // ==========================================================
  // DOCTOR SIGN-OFF
  // ==========================================================

  doctorApproved: boolean;

  doctorApprovedAt?: Date | null;

  // ==========================================================
  // TIMESTAMPS
  // ==========================================================

  createdAt: Date;

  updatedAt: Date;
}

// ============================================================
// MEDICATION SCHEMA
// ============================================================

const medicationSchema =
  new Schema<IConsultationMedication>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      dosage: {
        type: String,
        trim: true,
        default: "",
      },

      frequency: {
        type: String,
        trim: true,
        default: "",
      },

      duration: {
        type: String,
        trim: true,
        default: "",
      },

      instructions: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      _id: false,
    },
  );

// ============================================================
// AI ANALYSIS SCHEMA
// ============================================================

const aiClinicalAnalysisSchema =
  new Schema<IAIClinicalAnalysis>(
    {
      clinicalSummary: {
        type: String,
        trim: true,
        default: "",
      },

      symptoms: {
        type: [String],
        default: [],
      },

      possibleConditions: {
        type: [String],
        default: [],
      },

      redFlags: {
        type: [String],
        default: [],
      },

      suggestedInvestigations: {
        type: [String],
        default: [],
      },

      medicationConsiderations: {
        type: [String],
        default: [],
      },

      dietAndLifestyle: {
        type: [String],
        default: [],
      },

      followUpSuggestions: {
        type: [String],
        default: [],
      },

      generatedAt: {
        type: Date,
        default: null,
      },

      model: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      _id: false,
    },
  );

// ============================================================
// CONSULTATION SCHEMA
// ============================================================

const consultationSchema =
  new Schema<IConsultation>(
    {
      // ========================================================
      // HOSPITAL
      // ========================================================

      hospitalId: {
        type: Schema.Types.ObjectId,
        ref: "Hospital",
        required: true,
        index: true,
      },

      // ========================================================
      // PATIENT
      // ========================================================

      patientId: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
        index: true,
      },

      // ========================================================
      // DOCTOR
      // ========================================================

      doctorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      // ========================================================
      // QUEUE
      // ========================================================

      queueId: {
        type: Schema.Types.ObjectId,
        ref: "Queue",
        required: true,
        unique: true,
        index: true,
      },

      // ========================================================
      // DEPARTMENT
      // ========================================================

      departmentId: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        required: true,
        index: true,
      },

      // ========================================================
      // STATUS
      // ========================================================

      status: {
        type: String,
        enum: [
          "ACTIVE",
          "COMPLETED",
          "CANCELLED",
        ],
        default: "ACTIVE",
        required: true,
        index: true,
      },

      // ========================================================
      // START TIME
      // ========================================================

      startedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      // ========================================================
      // CHIEF COMPLAINT
      // ========================================================

      chiefComplaint: {
        type: String,
        trim: true,
        default: "",
      },

      // ========================================================
      // SYMPTOMS
      // ========================================================

      symptoms: {
        type: [String],
        default: [],
      },

      // ========================================================
      // CLINICAL NOTES
      // ========================================================

      clinicalNotes: {
        type: String,
        trim: true,
        default: "",
      },

      examinationNotes: {
        type: String,
        trim: true,
        default: "",
      },

      // ========================================================
      // TRANSCRIPT
      // ========================================================

      transcript: {
        type: String,
        default: "",
      },

      transcriptLanguage: {
        type: String,
        trim: true,
        default: "en",
      },

      // ========================================================
      // AI ANALYSIS
      // ========================================================

      aiAnalysis: {
        type: aiClinicalAnalysisSchema,
        default: undefined,
      },

      aiReviewedByDoctor: {
        type: Boolean,
        default: false,
      },

      aiReviewedAt: {
        type: Date,
        default: null,
      },

      // ========================================================
      // FINAL DIAGNOSIS
      // ========================================================

      finalDiagnosis: {
        type: [String],
        default: [],
      },

      // ========================================================
      // FINAL PRESCRIPTION
      // ========================================================

      finalPrescription: {
        type: [medicationSchema],
        default: [],
      },

      // ========================================================
      // DIET
      // ========================================================

      dietAdvice: {
        type: [String],
        default: [],
      },

      // ========================================================
      // LIFESTYLE
      // ========================================================

      lifestyleAdvice: {
        type: [String],
        default: [],
      },

      // ========================================================
      // FOLLOW UP
      // ========================================================

      followUpAdvice: {
        type: String,
        trim: true,
        default: "",
      },

      // ========================================================
      // DOCTOR APPROVAL
      // ========================================================

      doctorApproved: {
        type: Boolean,
        default: false,
        index: true,
      },

      doctorApprovedAt: {
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

consultationSchema.index({
  hospitalId: 1,
  patientId: 1,
  createdAt: -1,
});

consultationSchema.index({
  hospitalId: 1,
  doctorId: 1,
  createdAt: -1,
});

consultationSchema.index({
  hospitalId: 1,
  departmentId: 1,
  createdAt: -1,
});

consultationSchema.index({
  patientId: 1,
  status: 1,
});

// ============================================================
// MODEL
// ============================================================

export const Consultation =
  mongoose.models.Consultation ||
  mongoose.model<IConsultation>(
    "Consultation",
    consultationSchema,
  );

export default Consultation;