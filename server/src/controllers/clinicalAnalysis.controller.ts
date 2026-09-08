import type {
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

import {
  Consultation,
} from "../models/Consultation.model";

import {
  Patient,
} from "../models/Patient.model";

import {
  generateClinicalAnalysis,
} from "../services/clinicalAnalysis.service";

import {
  getIO,
} from "../config/socket";

// ============================================================
// GENERATE CLINICAL ANALYSIS
//
// POST /api/consultations/:id/ai-analysis
// ============================================================

export const generateConsultationAIAnalysis =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        req.user?.hospitalId;

      const doctorId =
        req.user?.userId;

      const consultationId =
        Array.isArray(
          req.params.id,
        )
          ? req.params.id[0]
          : req.params.id;

      // ======================================================
      // AUTH
      // ======================================================

      if (
        !hospitalId ||
        !doctorId
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication information missing",
        });
      }

      // ======================================================
      // VALIDATE ID
      // ======================================================

      if (
        !consultationId ||
        !mongoose.Types.ObjectId.isValid(
          consultationId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid consultation ID",
        });
      }

      // ======================================================
      // FIND CONSULTATION
      // ======================================================

      const consultation =
        await Consultation.findOne({
          _id: consultationId,
          hospitalId,
          doctorId,
        });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message:
            "Consultation not found for this doctor",
        });
      }

      // ======================================================
      // ONLY ACTIVE CONSULTATIONS
      // ======================================================

      if (
        consultation.status !==
        "ACTIVE"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Only active consultations can be analyzed",
        });
      }

      // ======================================================
      // PATIENT
      // ======================================================

      const patient =
        await Patient.findOne({
          _id:
            consultation.patientId,
          hospitalId,
        })
          .select(
            "name age gender",
          )
          .lean();

      // ======================================================
      // PREVIOUS CONSULTATIONS
      // ======================================================

      const previousConsultations =
        await Consultation.find({
          hospitalId,
          patientId:
            consultation.patientId,
          _id: {
            $ne:
              consultation._id,
          },
          status:
            "COMPLETED",
        })
          .sort({
            createdAt: -1,
          })
          .limit(5)
          .select(
            "createdAt chiefComplaint symptoms clinicalNotes examinationNotes finalDiagnosis finalPrescription dietAdvice lifestyleAdvice followUpAdvice",
          )
          .lean();

      // ======================================================
      // CREATE PREVIOUS HISTORY CONTEXT
      // ======================================================

      const previousHistory =
        previousConsultations
          .map(
            (
              previous,
              index,
            ) => `
CONSULTATION ${
              index + 1
            }

Date:
${previous.createdAt}

Chief Complaint:
${
  previous.chiefComplaint ||
  "Not provided"
}

Symptoms:
${
  previous.symptoms?.join(
    ", ",
  ) ||
  "Not provided"
}

Clinical Notes:
${
  previous.clinicalNotes ||
  "Not provided"
}

Examination Notes:
${
  previous.examinationNotes ||
  "Not provided"
}

Final Diagnosis:
${
  previous.finalDiagnosis?.join(
    ", ",
  ) ||
  "Not provided"
}

Doctor Advice:
${
  previous.followUpAdvice ||
  "Not provided"
}
`,
          )
          .join(
            "\n-----------------------------\n",
          );

      // ======================================================
      // GENERATE ANALYSIS
      // ======================================================

      console.log(
        "========================================",
      );

      console.log(
        "🤖 GENERATING AI CLINICAL ANALYSIS",
      );

      console.log(
        "CONSULTATION:",
        consultationId,
      );

      console.log(
        "DOCTOR:",
        doctorId,
      );

      console.log(
        "========================================",
      );

      const aiAnalysis =
        await generateClinicalAnalysis({
          chiefComplaint:
            consultation.chiefComplaint,

          symptoms:
            consultation.symptoms,

          clinicalNotes:
            consultation.clinicalNotes,

          examinationNotes:
            consultation.examinationNotes,

          transcript:
            consultation.transcript,

          patientAge:
            patient?.age,

          patientGender:
            patient?.gender,

          previousConsultations:
            previousHistory,
        });

      // ======================================================
      // SAVE AI ANALYSIS
      // ======================================================

      consultation.aiAnalysis =
        aiAnalysis;

      consultation.aiReviewedByDoctor =
        false;

      consultation.aiReviewedAt =
        null;

      await consultation.save();

      // ======================================================
      // POPULATE RESPONSE
      // ======================================================

      const updatedConsultation =
        await Consultation.findById(
          consultation._id,
        )
          .populate(
            "patientId",
            "name phone email patientCode age gender address",
          )
          .populate(
            "doctorId",
            "name email",
          )
          .populate(
            "departmentId",
            "name description tokenPrefix",
          )
          .populate(
            "queueId",
            "tokenNumber tokenLabel status priority queueDate",
          );

      // ======================================================
      // SOCKET
      // ======================================================

      getIO()
        .to(
          `hospital:${hospitalId}`,
        )
        .emit(
          "consultation:ai-analysis",
          updatedConsultation,
        );

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(200).json({
        success: true,

        message:
          "AI clinical analysis generated successfully",

        data:
          updatedConsultation,
      });
    } catch (error: any) {
      console.error(
        "❌ AI CLINICAL ANALYSIS ERROR:",
        error,
      );

      console.error(
        "MESSAGE:",
        error?.message,
      );

      console.error(
        "STATUS:",
        error?.status,
      );

      console.error(
        "CODE:",
        error?.code,
      );

      return res.status(
        error?.status === 429
          ? 429
          : 500,
      ).json({
        success: false,

        message:
          error?.message ||
          "Failed to generate AI clinical analysis",
      });
    }
  };