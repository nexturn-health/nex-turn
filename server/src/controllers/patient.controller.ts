import type { Request, Response } from "express";
import mongoose from "mongoose";

import { Patient } from "../models/Patient.model";
import { Queue } from "../models/Queue.model";

// =====================================
// CREATE PATIENT
// POST /api/patients
// =====================================
export const createPatient = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      name,
      phone,
      age,
      gender,
      address,
    } = req.body;

    // =====================================
    // VALIDATION
    // =====================================

    if (
      !name?.trim() ||
      !phone?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name and phone are required",
      });
    }

    // =====================================
    // HOSPITAL
    // =====================================

    const hospitalId =
      req.user?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message:
          "Hospital information not found",
      });
    }

    // =====================================
    // VALIDATE IDS
    // =====================================

    if (
      !mongoose.Types.ObjectId.isValid(
        hospitalId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid hospital ID",
      });
    }

    // =====================================
    // TODAY
    // =====================================

    const today = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(new Date());
    // =====================================
    // CHECK DUPLICATE PHONE
    //
    // SAME:
    // hospital + department + today
    //
    // =====================================

    const existingPatient =
      await Patient.findOne({
        hospitalId,
        registrationDate: today,
        phone: phone.trim(),
      });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message:
          "This phone number is already registered today.",
      });
    }

    // =====================================
    // GENERATE PATIENT CODE
    // =====================================

    const patientCode =
      `PAT-${Date.now()}`;

    // =====================================
    // CREATE PATIENT
    // =====================================

    const patient =
      await Patient.create({
        name: name.trim(),

        phone: phone.trim(),

        age,

        gender,

        address:
          address?.trim() || "",

        hospitalId,

        registrationDate: today,

        patientCode,
      });

    return res.status(201).json({
      success: true,

      message:
        "Patient registered successfully",

      data: patient,
    });

  } catch (error: any) {

    console.error(
      "Create patient error:",
      error,
    );

    // MongoDB duplicate key
    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This phone number is already registered today for this department.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};


// =====================================
// GET ALL PATIENTS
// GET /api/patients
// =====================================

export const getPatients = async (
  req: Request,
  res: Response
) => {
  try {

    const hospitalId =
      req.user?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message: "Hospital information not found",
      });
    }

    const patients =
      await Patient.find({
        hospitalId,
      })
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: patients.length,
      data: patients,
    });

  } catch (error) {

    console.error(
      "Get patients error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// =====================================
// GET SINGLE PATIENT
// GET /api/patients/:id
// =====================================

export const getPatientById = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const hospitalId =
      req.user?.hospitalId;

    // =====================================
    // VALIDATE HOSPITAL
    // =====================================

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message: "Hospital information not found",
      });
    }

    // =====================================
    // VALIDATE PATIENT ID
    // =====================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    // =====================================
    // FIND PATIENT
    // IMPORTANT:
    // hospitalId is included for security.
    // A user cannot access another
    // hospital's patient.
    // =====================================

    const patient =
      await Patient.findOne({
        _id: id,
        hospitalId,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: patient,
    });

  } catch (error) {

    console.error(
      "Get patient error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getTokenEligiblePatients = async (
  req: Request,
  res: Response,
) => {
  try {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message: "Hospital information not found",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        hospitalId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid hospital ID",
      });
    }

    const hospitalObjectId =
      new mongoose.Types.ObjectId(
        hospitalId,
      );

    // =====================================
    // TODAY'S DATE
    // =====================================

    const today = new Date();

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // =====================================
    // GET PATIENTS REGISTERED TODAY
    // =====================================

    const patients = await Patient.find({
      hospitalId: hospitalObjectId,

      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    // =====================================
    // QUEUE DATE
    // =====================================

    const queueDate =
      today.toISOString().split("T")[0];

    // =====================================
    // GET PATIENTS WHO ALREADY HAVE TOKEN
    // TODAY
    // =====================================

    const queues = await Queue.find({
      hospitalId: hospitalObjectId,

      queueDate,

      status: {
        $nin: ["CANCELLED"],
      },
    })
      .select("patientId")
      .lean();

    // =====================================
    // CREATE SET OF PATIENT IDS
    // =====================================

    const tokenPatientIds =
      new Set(
        queues
          .filter(
            (queue) =>
              queue.patientId,
          )
          .map(
            (queue) =>
              queue.patientId!.toString(),
          ),
      );

    // =====================================
    // ONLY TODAY + NO TOKEN
    // =====================================

    const eligiblePatients =
      patients.filter(
        (patient) =>
          !tokenPatientIds.has(
            patient._id.toString(),
          ),
      );

    // =====================================
    // RESPONSE
    // =====================================

    return res.status(200).json({
      success: true,

      data: eligiblePatients,
    });
  } catch (error) {
    console.error(
      "Get token eligible patients error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load token eligible patients",
    });
  }
};


export const getTodayPatients = async (
  req: Request,
  res: Response,
) => {
  try {
    const hospitalId = req.user?.hospitalId;

    // ============================================================
    // VALIDATE HOSPITAL
    // ============================================================

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message: "Hospital information not found",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hospital ID",
      });
    }

    // ============================================================
    // GET TODAY'S DATE IN INDIA
    // ============================================================

    const now = new Date();

    const indiaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    console.log("=================================");
    console.log("GET TODAY PATIENTS");
    console.log("Hospital ID:", hospitalId);
    console.log("India Date:", indiaDate);
    console.log("=================================");

    // ============================================================
    // FIND TODAY'S QUEUES
    //
    // IMPORTANT:
    // Today's patient list is based on Queue records,
    // NOT Patient.createdAt.
    // ============================================================

    const queues = await Queue.find({
      hospitalId: new mongoose.Types.ObjectId(hospitalId),
      queueDate: indiaDate,
    })
      .populate(
        "patientId",
        "name phone patientCode age gender address registrationDate createdAt"
      )
      .lean();

    console.log("TODAY QUEUES:", queues.length);

    // ============================================================
    // GET UNIQUE PATIENTS
    //
    // A patient can have multiple queues/tokens today.
    // We only want to show the patient once.
    // ============================================================

    const uniquePatients = new Map<string, any>();

    for (const queue of queues) {
      const patient = queue.patientId as any;

      if (!patient || !patient._id) {
        continue;
      }

      const patientId = String(patient._id);

      if (!uniquePatients.has(patientId)) {
        uniquePatients.set(patientId, patient);
      }
    }

    const todayPatients = Array.from(
      uniquePatients.values()
    );

    // ============================================================
    // LOGGING
    // ============================================================

    console.log(
      "UNIQUE TODAY PATIENTS:",
      todayPatients.length
    );

    console.log(
      "TODAY PATIENT NAMES:",
      todayPatients.map((patient) => patient.name)
    );

    // ============================================================
    // RESPONSE
    // ============================================================

    return res.status(200).json({
      success: true,
      count: todayPatients.length,
      data: todayPatients,
    });

  } catch (error) {
    console.error(
      "❌ GET TODAY PATIENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load today's patients",
    });
  }
};

// =====================================
// UPDATE PATIENT
// PUT /api/patients/:id
// =====================================

export const updatePatient = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const {
      name,
      phone,
      age,
      gender,
    } = req.body;

    const hospitalId =
      req.user?.hospitalId;

    // =====================================
    // VALIDATE HOSPITAL
    // =====================================

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message: "Hospital information not found",
      });
    }

    // =====================================
    // VALIDATE ID
    // =====================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    // =====================================
    // FIND PATIENT
    // =====================================

    const patient =
      await Patient.findOne({
        _id: id,
        hospitalId,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // =====================================
    // VALIDATE NAME
    // =====================================

    if (
      name !== undefined &&
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Patient name cannot be empty",
      });
    }

    // =====================================
    // IF PHONE IS CHANGING
    // CHECK DUPLICATE
    // =====================================

    if (
      phone !== undefined &&
      phone.trim() !== patient.phone
    ) {

      const existingPatient =
        await Patient.findOne({
          phone: phone.trim(),
          hospitalId,
          registrationDate: patient.registrationDate,
          _id: { $ne: patient._id, },
        });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message:
            "This phone number is already registered today for this department."
        });
      }

      patient.phone =
        phone.trim();
    }

    // =====================================
    // UPDATE FIELDS
    // =====================================

    if (name !== undefined) {
      patient.name =
        name.trim();
    }

    if (age !== undefined) {
      patient.age = age;
    }

    if (gender !== undefined) {
      patient.gender = gender;
    }

    // =====================================
    // SAVE
    // =====================================

    await patient.save();

    return res.status(200).json({
      success: true,
      message:
        "Patient updated successfully",
      data: patient,
    });

  } catch (error) {

    console.error(
      "Update patient error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

