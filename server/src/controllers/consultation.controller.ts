import type {
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

import { Consultation } from "../models/Consultation.model";
import { Queue } from "../models/Queue.model";
import { Patient } from "../models/Patient.model";
import { User } from "../models/User.model";
import { getIO } from "../config/socket";

// ============================================================
// START CONSULTATION
//
// POST /api/consultations/start
//
// Body:
// {
//   "queueId": "QUEUE_ID"
// }
//
// Only the doctor assigned to the SERVING queue can start
// the consultation.
// ============================================================

export const startConsultation = async (
  req: Request,
  res: Response,
) => {
  try {
    const hospitalId =
      req.user?.hospitalId;

    const doctorId =
      req.user?.userId;

    const {
      queueId,
    } = req.body;

    // ========================================================
    // AUTHENTICATION
    // ========================================================

    if (!hospitalId || !doctorId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication information missing",
      });
    }

    // ========================================================
    // VALIDATE QUEUE ID
    // ========================================================

    if (
      !queueId ||
      !mongoose.Types.ObjectId.isValid(
        queueId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue ID",
      });
    }

    // ========================================================
    // FIND DOCTOR
    // ========================================================

    const doctor =
      await User.findOne({
        _id: doctorId,
        hospitalId,
        role: "DOCTOR",
        isActive: true,
      }).lean();

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // ========================================================
    // FIND SERVING QUEUE
    // ========================================================

    const queue =
      await Queue.findOne({
        _id: queueId,
        hospitalId,
        doctorId,
        status: "SERVING",
      }).lean();

    if (!queue) {
      return res.status(404).json({
        success: false,
        message:
          "Serving queue not found for this doctor",
      });
    }

    // ========================================================
    // VERIFY PATIENT
    // ========================================================

    const patient =
      await Patient.findOne({
        _id: queue.patientId,
        hospitalId,
      }).lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          "Patient not found in your hospital",
      });
    }

    // ========================================================
    // CHECK EXISTING CONSULTATION
    // ========================================================

    const existingConsultation =
      await Consultation.findOne({
        queueId: queue._id,
      })
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
        );

    if (existingConsultation) {
      return res.status(200).json({
        success: true,
        message:
          "Consultation already exists for this queue",
        data: existingConsultation,
      });
    }

    // ========================================================
    // CREATE CONSULTATION
    // ========================================================

    const consultation =
      await Consultation.create({
        hospitalId,

        patientId:
          queue.patientId,

        doctorId,

        queueId:
          queue._id,

        departmentId:
          queue.departmentId,

        status:
          "ACTIVE",

        startedAt:
          new Date(),

        symptoms: [],

        finalDiagnosis: [],

        finalPrescription: [],

        dietAdvice: [],

        lifestyleAdvice: [],

        aiReviewedByDoctor:
          false,

        doctorApproved:
          false,
      });

    // ========================================================
    // POPULATE CONSULTATION
    // ========================================================

    const populatedConsultation =
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

    // ========================================================
    // SOCKET UPDATE
    // ========================================================

    getIO()
      .to(`hospital:${hospitalId}`)
      .emit(
        "consultation:started",
        {
          consultation:
            populatedConsultation,

          queueId:
            String(queue._id),

          patientId:
            String(queue.patientId),

          doctorId:
            String(doctorId),
        },
      );

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,
      message:
        "Consultation started successfully",
      data:
        populatedConsultation,
    });
  } catch (error) {
    console.error(
      "❌ Start consultation error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to start consultation",
    });
  }
};

// ============================================================
// GET PATIENT CONSULTATION HISTORY
//
// GET /api/consultations/patient/:patientId
//
// This endpoint is extremely important for our future AI.
//
// When a returning patient visits:
// Patient → Previous consultations → AI context
// ============================================================

export const getPatientConsultationHistory =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        req.user?.hospitalId;

      const patientId =
        Array.isArray(
          req.params.patientId,
        )
          ? req.params.patientId[0]
          : req.params.patientId;

      // ======================================================
      // AUTH
      // ======================================================

      if (!hospitalId) {
        return res.status(401).json({
          success: false,
          message:
            "Hospital information missing",
        });
      }

      // ======================================================
      // VALIDATE PATIENT ID
      // ======================================================

      if (
        !patientId ||
        !mongoose.Types.ObjectId.isValid(
          patientId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid patient ID",
        });
      }

      // ======================================================
      // VERIFY PATIENT BELONGS TO HOSPITAL
      // ======================================================

      const patient =
        await Patient.findOne({
          _id: patientId,
          hospitalId,
        })
          .select(
            "name patientCode age gender phone email address",
          )
          .lean();

      if (!patient) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found in your hospital",
        });
      }

      // ======================================================
      // GET CONSULTATIONS
      // ======================================================

      const consultations =
        await Consultation.find({
          hospitalId,
          patientId,
        })
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
            "tokenNumber tokenLabel queueDate priority",
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(200).json({
        success: true,

        patient,

        count:
          consultations.length,

        data:
          consultations,
      });
    } catch (error) {
      console.error(
        "❌ Get patient consultation history error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch consultation history",
      });
    }
  };

// ============================================================
// GET SINGLE CONSULTATION
//
// GET /api/consultations/:id
// ============================================================

export const getConsultationById =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        req.user?.hospitalId;

      const consultationId =
        Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;

      if (!hospitalId) {
        return res.status(401).json({
          success: false,
          message:
            "Hospital information missing",
        });
      }

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

      const consultation =
        await Consultation.findOne({
          _id: consultationId,
          hospitalId,
        })
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
          )
          .lean();

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message:
            "Consultation not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: consultation,
      });
    } catch (error) {
      console.error(
        "❌ Get consultation error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch consultation",
      });
    }
  };

// ============================================================
// UPDATE CONSULTATION
//
// PATCH /api/consultations/:id
//
// This will initially allow the doctor to save:
//
// - chief complaint
// - symptoms
// - clinical notes
// - examination notes
//
// Later the same endpoint will save AI review and
// final diagnosis/prescription.
// ============================================================

export const updateConsultation =
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
        Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;

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
      // ONLY ASSIGNED DOCTOR CAN UPDATE
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

      if (
        consultation.status !==
        "ACTIVE"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Only active consultations can be updated",
        });
      }

      // ======================================================
      // ALLOWED FIELDS
      // ======================================================

      const {
        chiefComplaint,
        symptoms,
        clinicalNotes,
        examinationNotes,
        transcript,
        transcriptLanguage,
      } = req.body;

      if (
        chiefComplaint !== undefined
      ) {
        consultation.chiefComplaint =
          String(
            chiefComplaint,
          ).trim();
      }

      if (
        Array.isArray(symptoms)
      ) {
        consultation.symptoms =
          symptoms
            .map((item: unknown) =>
              String(item).trim(),
            )
            .filter(Boolean);
      }

      if (
        clinicalNotes !== undefined
      ) {
        consultation.clinicalNotes =
          String(
            clinicalNotes,
          ).trim();
      }

      if (
        examinationNotes !== undefined
      ) {
        consultation.examinationNotes =
          String(
            examinationNotes,
          ).trim();
      }

      if (
        transcript !== undefined
      ) {
        consultation.transcript =
          String(
            transcript,
          );
      }

      if (
        transcriptLanguage !==
        undefined
      ) {
        consultation.transcriptLanguage =
          String(
            transcriptLanguage,
          ).trim();
      }

      await consultation.save();

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
        .to(`hospital:${hospitalId}`)
        .emit(
          "consultation:updated",
          updatedConsultation,
        );

      return res.status(200).json({
        success: true,
        message:
          "Consultation updated successfully",
        data:
          updatedConsultation,
      });
    } catch (error) {
      console.error(
        "❌ Update consultation error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update consultation",
      });
    }
  };

// ============================================================
// COMPLETE CONSULTATION
//
// POST /api/consultations/:id/complete
//
// IMPORTANT:
// This does NOT automatically complete the queue.
//
// The doctor should explicitly complete the queue through
// the existing queue endpoint.
//
// This keeps consultation and queue lifecycle separate.
// ============================================================

export const completeConsultation =
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
        Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;

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
            "Consultation not found",
        });
      }

      if (
        consultation.status !==
        "ACTIVE"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Consultation is not active",
        });
      }

      consultation.status =
        "COMPLETED";

      consultation.completedAt =
        new Date();

      await consultation.save();

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
        .to(`hospital:${hospitalId}`)
        .emit(
          "consultation:completed",
          updatedConsultation,
        );

      return res.status(200).json({
        success: true,
        message:
          "Consultation completed successfully",
        data:
          updatedConsultation,
      });
    } catch (error) {
      console.error(
        "❌ Complete consultation error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to complete consultation",
      });
    }
  };