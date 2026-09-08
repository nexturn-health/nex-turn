import OpenAI from "openai";

import type {
  IAIClinicalAnalysis,
} from "../models/Consultation.model";

// ============================================================
// OPENAI CLIENT
// ============================================================

const apiKey =
  process.env.OPENAI_API_KEY?.trim();

const openai =
  apiKey
    ? new OpenAI({
        apiKey,
      })
    : null;

// ============================================================
// RESULT TYPE
// ============================================================

export interface ClinicalAnalysisInput {
  chiefComplaint?: string;

  symptoms?: string[];

  clinicalNotes?: string;

  examinationNotes?: string;

  transcript?: string;

  patientAge?: number;

  patientGender?: string;

  previousConsultations?: string;
}

// ============================================================
// GENERATE AI CLINICAL ANALYSIS
// ============================================================

export const generateClinicalAnalysis =
  async (
    input: ClinicalAnalysisInput,
  ): Promise<IAIClinicalAnalysis> => {
    if (!openai) {
      throw new Error(
        "OpenAI API key is not configured",
      );
    }

    const {
      chiefComplaint,
      symptoms,
      clinicalNotes,
      examinationNotes,
      transcript,
      patientAge,
      patientGender,
      previousConsultations,
    } = input;

    // ========================================================
    // BUILD CLINICAL CONTEXT
    // ========================================================

    const clinicalContext = `
PATIENT INFORMATION

Age:
${patientAge ?? "Not provided"}

Gender:
${patientGender || "Not provided"}


CHIEF COMPLAINT

${chiefComplaint || "Not provided"}


SYMPTOMS

${
  symptoms?.length
    ? symptoms.join(", ")
    : "Not provided"
}


CLINICAL NOTES

${clinicalNotes || "Not provided"}


EXAMINATION NOTES

${
  examinationNotes ||
  "Not provided"
}


CONSULTATION TRANSCRIPT

${transcript || "Not provided"}


PREVIOUS CONSULTATIONS

${
  previousConsultations ||
  "No previous consultation information provided"
}
`;

    // ========================================================
    // AI INSTRUCTIONS
    // ========================================================

    const systemPrompt = `
You are a clinical decision-support assistant
for a hospital queue and consultation management
system called NexTurn.

Your job is to analyze the information provided
by a doctor and produce a structured clinical
summary for the doctor to review.

IMPORTANT SAFETY RULES:

1. Do NOT claim certainty when the information
   does not support certainty.

2. Possible conditions must be presented as
   possibilities/differential considerations,
   not confirmed diagnoses.

3. Clearly identify red flags when information
   suggests potentially urgent evaluation.

4. Do not replace the doctor's clinical judgment.

5. Do not independently prescribe medication.

6. Medication considerations may mention
   medication classes or considerations that
   a doctor may evaluate, but must not be
   presented as a final prescription.

7. Do not invent symptoms, examination findings,
   investigations, medications, diagnoses,
   or patient history.

8. If information is insufficient, explicitly
   say so.

9. Keep the analysis concise and clinically useful.

Return ONLY valid JSON with this exact structure:

{
  "clinicalSummary": "string",
  "symptoms": ["string"],
  "possibleConditions": ["string"],
  "redFlags": ["string"],
  "suggestedInvestigations": ["string"],
  "medicationConsiderations": ["string"],
  "dietAndLifestyle": ["string"],
  "followUpSuggestions": ["string"]
}
`;

    // ========================================================
    // OPENAI REQUEST
    // ========================================================

    const response =
      await openai.responses.create({
        model:
          process.env.OPENAI_CLINICAL_MODEL ||
          "gpt-5.6-luna",

        instructions:
          systemPrompt,

        input:
          clinicalContext,

      });

    // ========================================================
    // READ RESPONSE
    // ========================================================

    const output =
      response.output_text?.trim();

    if (!output) {
      throw new Error(
        "AI returned an empty clinical analysis",
      );
    }

    // ========================================================
    // PARSE JSON
    // ========================================================

    let parsed:
      Partial<IAIClinicalAnalysis>;

    try {
      parsed = JSON.parse(
        output,
      );
    } catch (error) {
      console.error(
        "❌ AI JSON PARSE ERROR:",
        error,
      );

      console.error(
        "AI RAW OUTPUT:",
        output,
      );

      throw new Error(
        "AI returned an invalid clinical analysis format",
      );
    }

    // ========================================================
    // NORMALIZE RESULT
    // ========================================================

    return {
      clinicalSummary:
        typeof parsed.clinicalSummary ===
        "string"
          ? parsed.clinicalSummary
          : "",

      symptoms:
        Array.isArray(
          parsed.symptoms,
        )
          ? parsed.symptoms
          : [],

      possibleConditions:
        Array.isArray(
          parsed.possibleConditions,
        )
          ? parsed.possibleConditions
          : [],

      redFlags:
        Array.isArray(
          parsed.redFlags,
        )
          ? parsed.redFlags
          : [],

      suggestedInvestigations:
        Array.isArray(
          parsed.suggestedInvestigations,
        )
          ? parsed.suggestedInvestigations
          : [],

      medicationConsiderations:
        Array.isArray(
          parsed.medicationConsiderations,
        )
          ? parsed.medicationConsiderations
          : [],

      dietAndLifestyle:
        Array.isArray(
          parsed.dietAndLifestyle,
        )
          ? parsed.dietAndLifestyle
          : [],

      followUpSuggestions:
        Array.isArray(
          parsed.followUpSuggestions,
        )
          ? parsed.followUpSuggestions
          : [],

      generatedAt:
        new Date(),

      model:
        process.env.OPENAI_CLINICAL_MODEL ||
        "gpt-5.6-luna",
    };
  };