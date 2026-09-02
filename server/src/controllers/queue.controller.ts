import type { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";

import { Queue } from "../models/Queue.model";
import { Patient } from "../models/Patient.model";
import { Department } from "../models/Department.model";
import { User } from "../models/User.model";
import { Hospital } from "../models/Hospital.model";

import { getIO } from "../config/socket";

import {
  checkAndSendNearTurnNotifications,
} from "../services/queueNotification.service";

import {
  sendTokenCreatedNotification,
  sendCalledNotification,
} from "../services/notification.service";


// ======================================================
// CONSULTATION / OPD ESTIMATION HELPERS
// ======================================================

const DEFAULT_CONSULTATION_MINUTES = 10;
const MAX_HISTORY_FOR_AVERAGE = 20;

const getDoctorAverageConsultationMinutes = async (
  doctorId?: mongoose.Types.ObjectId,
): Promise<number | null> => {
  if (!doctorId) return null;

  const completedQueues = await Queue.find({
    doctorId,
    status: "COMPLETED",
    $or: [
      { serviceDurationMinutes: { $gt: 0 } },
      { servingAt: { $exists: true }, completedAt: { $exists: true } },
    ],
  })
    .sort({ completedAt: -1 })
    .limit(MAX_HISTORY_FOR_AVERAGE)
    .select("serviceDurationMinutes servingAt completedAt")
    .lean();

  const durations = completedQueues
    .map((queue: any) => {
      const stored = Number(queue.serviceDurationMinutes);
      if (Number.isFinite(stored) && stored > 0) return stored;

      if (queue.servingAt && queue.completedAt) {
        const minutes =
          (new Date(queue.completedAt).getTime() -
            new Date(queue.servingAt).getTime()) /
          (60 * 1000);

        if (Number.isFinite(minutes) && minutes > 0) {
          return minutes;
        }
      }

      return 0;
    })
    .filter((minutes) => minutes > 0);

  if (!durations.length) return null;

  return Math.max(
    1,
    Math.round(
      durations.reduce((sum, minutes) => sum + minutes, 0) / durations.length,
    ),
  );
};

const getDepartmentAverageConsultationMinutes = async (
  hospitalId: string | mongoose.Types.ObjectId,
  departmentId: string | mongoose.Types.ObjectId,
): Promise<number | null> => {
  const completedQueues = await Queue.find({
    hospitalId,
    departmentId,
    status: "COMPLETED",
    $or: [
      { serviceDurationMinutes: { $gt: 0 } },
      { servingAt: { $exists: true }, completedAt: { $exists: true } },
    ],
  })
    .sort({ completedAt: -1 })
    .limit(MAX_HISTORY_FOR_AVERAGE)
    .select("serviceDurationMinutes servingAt completedAt")
    .lean();

  const durations = completedQueues
    .map((queue: any) => {
      const stored = Number(queue.serviceDurationMinutes);
      if (Number.isFinite(stored) && stored > 0) return stored;

      if (queue.servingAt && queue.completedAt) {
        const minutes =
          (new Date(queue.completedAt).getTime() -
            new Date(queue.servingAt).getTime()) /
          (60 * 1000);

        if (Number.isFinite(minutes) && minutes > 0) {
          return minutes;
        }
      }

      return 0;
    })
    .filter((minutes) => minutes > 0);

  if (!durations.length) return null;

  return Math.max(
    1,
    Math.round(
      durations.reduce((sum, minutes) => sum + minutes, 0) / durations.length,
    ),
  );
};

const getTodayOpdStartTime = (shiftStartTime?: string | null): Date | null => {
  if (!shiftStartTime || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(shiftStartTime)) {
    return null;
  }

  const [hours, minutes] = shiftStartTime.split(":").map(Number);
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  return start;
};


// ======================================================
// HELPER TYPES
// ======================================================

interface PopulatedPatient {
  _id?: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  patientCode?: string;
  age?: number;
  gender?: string;
  address?: string;
}

interface PopulatedDepartment {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  tokenPrefix?: string;
}

interface PopulatedDoctor {
  _id?: mongoose.Types.ObjectId;
  name: string;
  email?: string;
}


// ======================================================
// GET QUEUES
// GET /api/queues
// ======================================================

export const getQueues = async (
  req: Request,
  res: Response,
) => {
  try {
    const hospitalId = req.user?.hospitalId;
    const doctorId = req.user?.userId || req.user?.userId;

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message: "Hospital information not found",
      });
    }

    const queueDate = new Date()
      .toISOString()
      .split("T")[0];

    const departmentId =
      typeof req.query.departmentId === "string"
        ? req.query.departmentId
        : undefined;

    const query: {
      hospitalId: mongoose.Types.ObjectId;
      queueDate: string;
      departmentId?: mongoose.Types.ObjectId;
    } = {
      hospitalId:
        new mongoose.Types.ObjectId(hospitalId),
      queueDate,
    };

    // --------------------------------------------
    // Department filter
    // --------------------------------------------

    if (departmentId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          departmentId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID",
        });
      }

      query.departmentId =
        new mongoose.Types.ObjectId(
          departmentId,
        );
    }

    // --------------------------------------------
    // Get queues
    // --------------------------------------------

    const queues = await Queue.find(query)
      .populate(
        "patientId",
        "name phone email patientCode age gender address",
      )
      .populate(
        "departmentId",
        "name description tokenPrefix",
      )
      .populate(
        "doctorId",
        "name email",
      )
      .sort({
        priority: -1,
        tokenNumber: 1,
      });

    return res.status(200).json({
      success: true,

      count: queues.length,

      /*
       * Logged-in doctor.
       *
       * Frontend uses this to identify which
       * CALLED/SERVING queue belongs to this doctor.
       */
      currentDoctorId: doctorId
        ? String(doctorId)
        : null,

      data: queues,
    });
  } catch (error) {
    console.error(
      "❌ Get queues error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// GET DOCTOR QUEUE
// GET /api/queues/doctor
// ======================================================

export const getDoctorQueue = async (
  req: Request,
  res: Response,
) => {
  try {
    const doctorId = req.user?.userId;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        message: "Doctor authentication required",
      });
    }

    const queueDate = new Date()
      .toISOString()
      .split("T")[0];

    const queues = await Queue.find({
      doctorId,
      queueDate,
      status: {
        $in: [
          "WAITING",
          "CALLED",
          "SERVING",
          "COMPLETED",
          "SKIPPED",
        ],
      },
    })
      .populate(
        "patientId",
        "_id patientCode name phone email age gender address",
      )
      .populate(
        "departmentId",
        "name description tokenPrefix",
      )
      .populate(
        "doctorId",
        "name email",
      )
      .sort({
        tokenNumber: 1,
      })
      .lean();

    const data = queues.map(
      (queue: any) => ({
        _id: queue._id,

        tokenNumber:
          queue.tokenNumber,

        tokenLabel:
          queue.tokenLabel,

        priority:
          queue.priority,

        status:
          queue.status,

        patient:
          queue.patientId,

        departmentId:
          queue.departmentId,

        doctorId:
          queue.doctorId,

        estimatedWaitMinutes:
          queue.estimatedWaitMinutes,

        estimatedWaitTime:
          queue.estimatedWaitTime,

        estimatedTurnTime:
          queue.estimatedTurnTime,

        calledAt:
          queue.calledAt,

        servingAt:
          queue.servingAt,

        completedAt:
          queue.completedAt,

        createdAt:
          queue.createdAt,

        updatedAt:
          queue.updatedAt,
      }),
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(
      "❌ GET DOCTOR QUEUE ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor queue",
    });
  }
};


// ======================================================
// CREATE QUEUE TOKEN
// POST /api/queues
// ======================================================

export const createQueue = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      patientId,
      departmentId,
      priority = "NORMAL",
    } = req.body;

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!patientId || !departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Patient ID and department ID are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        patientId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        departmentId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    // ==================================================
    // HOSPITAL
    // ==================================================

    const hospitalId =
      req.user?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message:
          "Hospital information not found",
      });
    }

    // ==================================================
    // QUEUE DATE
    // ==================================================

    const queueDate =
      new Date()
        .toISOString()
        .split("T")[0];

    // ==================================================
    // VALIDATE PRIORITY
    // ==================================================

    if (
      !["NORMAL", "EMERGENCY"].includes(
        priority,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Priority must be NORMAL or EMERGENCY",
      });
    }

    // ==================================================
    // FIND PATIENT
    // ==================================================

    const patient =
      await Patient.findOne({
        _id: patientId,
        hospitalId,
      }).lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          "Patient not found in your hospital",
      });
    }

    // ==================================================
    // FIND DEPARTMENT
    // ==================================================

    const department =
      await Department.findOne({
        _id: departmentId,
        hospitalId,
        isActive: true,
      }).lean();

    if (!department) {
      return res.status(404).json({
        success: false,
        message:
          "Department not found or inactive",
      });
    }

    // ==================================================
    // CHECK EXISTING ACTIVE TOKEN
    // ==================================================

    const existingQueue =
      await Queue.findOne({
        hospitalId,
        patientId,
        queueDate,
        status: {
          $in: [
            "WAITING",
            "CALLED",
            "SERVING",
          ],
        },
      });

    if (existingQueue) {
      return res.status(409).json({
        success: false,
        message:
          `Token already generated today (${existingQueue.tokenLabel})`,
      });
    }

    // ==================================================
    // GENERATE NEXT TOKEN
    // ==================================================

    const lastQueue =
      await Queue.findOne({
        hospitalId,
        departmentId,
        queueDate,
      })
        .sort({
          tokenNumber: -1,
        })
        .select("tokenNumber");

    const nextTokenNumber =
      lastQueue
        ? lastQueue.tokenNumber + 1
        : 1;

    const tokenLabel =
      `${department.tokenPrefix}-${String(
        nextTokenNumber,
      ).padStart(3, "0")}`;

    // ==================================================
    // FIND DEPARTMENT DOCTOR
    // ==================================================

const departmentDoctor = await User.findOne({
  hospitalId,
  departmentId,
  role: "DOCTOR",
  isActive: true,
})
  .select("name email isOnline shiftStartTime")
  .lean();

    // ==================================================
    // COUNT ACTIVE PATIENTS
    // ==================================================

    const waitingPatients = await Queue.countDocuments({
      hospitalId,
      departmentId,
      queueDate,
      status: { $in: ["WAITING", "CALLED", "SERVING"] },
    });

    // ==================================================
    // REAL CONSULTATION AVERAGE
    // ==================================================

    const doctorAverage = departmentDoctor?._id
      ? await getDoctorAverageConsultationMinutes(departmentDoctor._id)
      : null;

    const departmentAverage = doctorAverage === null
      ? await getDepartmentAverageConsultationMinutes(hospitalId, departmentId)
      : null;

    const averageConsultationMinutes =
      doctorAverage ?? departmentAverage ?? DEFAULT_CONSULTATION_MINUTES;

    // ==================================================
    // OPD START + ESTIMATED TURN
    // ==================================================

    const now = new Date();
    const shiftStartTime =
      typeof departmentDoctor?.shiftStartTime === "string"
        ? departmentDoctor.shiftStartTime
        : null;

    const opdStartDate = getTodayOpdStartTime(shiftStartTime);
    const doctorOnline = departmentDoctor?.isOnline === true;

    const processingStart =
      !doctorOnline && opdStartDate && opdStartDate.getTime() > now.getTime()
        ? opdStartDate
        : now;

    const estimatedTurnTime = new Date(
      processingStart.getTime() +
      waitingPatients * averageConsultationMinutes * 60 * 1000,
    );

    const estimatedWaitTime = Math.max(
      0,
      Math.ceil(
        (estimatedTurnTime.getTime() - now.getTime()) / (60 * 1000),
      ),
    );

    console.log("=================================");
    console.log("🎫 QUEUE ESTIMATION");
    console.log("Token:", tokenLabel);
    console.log("Doctor:", departmentDoctor?.name || "Not assigned");
    console.log("Doctor Online:", doctorOnline);
    console.log("OPD Start:", shiftStartTime || "Not configured");
    console.log("Patients Ahead:", waitingPatients);
    console.log("Average Consultation:", `${averageConsultationMinutes} min`);
    console.log("Estimated Wait:", estimatedWaitTime);
    console.log("Estimated Turn:", estimatedTurnTime);
    console.log("=================================");

    // ==================================================
    // SECURE TRACKING TOKEN
    // ==================================================

    const trackingToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const trackingExpiresAt =
      new Date(
        Date.now() +
        24 *
        60 *
        60 *
        1000,
      );

    // ==================================================
    // CREATE QUEUE
    // ==================================================

    const queue =
      await Queue.create({
        hospitalId,

        patientId,

        departmentId,

        tokenNumber:
          nextTokenNumber,

        tokenLabel,

        priority,

        status:
          "WAITING",

        queueDate,

        estimatedWaitTime,

        estimatedTurnTime,

        trackingToken,

        trackingLinkActive:
          true,

        trackingExpiresAt,

        nearTurnNotificationSent:
          false,

        calledNotificationSent:
          false,

        tokenNotificationSent:
          false,
      });

    // ==================================================
    // POPULATE QUEUE
    // ==================================================

    const populatedQueue =
      await Queue.findById(
        queue._id,
      )
        .populate(
          "patientId",
          "name phone email patientCode age gender address",
        )
        .populate(
          "departmentId",
          "name description tokenPrefix",
        )
        .populate(
          "doctorId",
          "name email",
        );

    // ==================================================
    // TRACKING URL
    // ==================================================

    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    const trackingUrl =
      `${clientUrl}/track/${trackingToken}`;

    // ==================================================
    // PATIENT DATA
    // ==================================================

    const patientData =
      populatedQueue?.patientId &&
        typeof populatedQueue.patientId ===
        "object"
        ? populatedQueue.patientId as unknown as PopulatedPatient
        : null;

    // ==================================================
    // DEPARTMENT DATA
    // ==================================================

    const departmentData =
      populatedQueue?.departmentId &&
        typeof populatedQueue.departmentId ===
        "object"
        ? populatedQueue.departmentId as unknown as PopulatedDepartment
        : null;

    // ==================================================
    // DOCTOR DATA
    //
    // IMPORTANT:
    // At token creation doctorId is normally NULL.
    //
    // Therefore we find an active doctor belonging
    // to this department for the email.
    // ==================================================

    let doctorData:
      PopulatedDoctor | null = null;

    if (departmentDoctor) {
      doctorData = {
        _id: departmentDoctor._id,
        name: departmentDoctor.name,
        email: departmentDoctor.email,
      };
    }

    // ==================================================
    // HOSPITAL DATA
    // ==================================================

    const hospitalData =
      await Hospital.findById(
        hospitalId,
      )
        .select("name")
        .lean();

    // ==================================================
    // FINAL VALUES
    // ==================================================

    const finalPatientName =
      patientData?.name ||
      patient.name ||
      "Patient";

    const finalHospitalName =
      hospitalData?.name ||
      "Hospital";

    const finalDepartmentName =
      departmentData?.name ||
      department.name ||
      "Department";

    const finalDoctorName =
      doctorData?.name ||
      "Doctor not assigned";

    // ==================================================
    // DEBUG
    // ==================================================

    console.log(
      "=================================",
    );

    console.log(
      "📧 PATIENT TOKEN EMAIL DATA",
    );

    console.log(
      "Patient Name:",
      finalPatientName,
    );

    console.log(
      "Patient Phone:",
      patientData?.phone ||
      patient.phone ||
      "N/A",
    );

    console.log(
      "Patient Email:",
      patientData?.email ||
      "N/A",
    );

    console.log(
      "Hospital:",
      finalHospitalName,
    );

    console.log(
      "Department:",
      finalDepartmentName,
    );

    console.log(
      "Doctor:",
      finalDoctorName,
    );

    console.log(
      "Token:",
      tokenLabel,
    );

    console.log(
      "Estimated Wait:",
      estimatedWaitTime,
    );

    console.log(
      "Tracking URL:",
      trackingUrl,
    );

    console.log(
      "=================================",
    );

    // ==================================================
    // SEND TOKEN NOTIFICATION
    //
    // TEST MODE:
    // All patients receive email at TEST_PATIENT_EMAIL.
    //
    // WhatsApp/SMS will still be attempted first.
    // ==================================================

    const notificationEmail =
      patientData?.email ||
      process.env.TEST_PATIENT_EMAIL ||
      "akash0001tech@gmail.com";

    const notificationPhone =
      patientData?.phone ||
      patient.phone;

    const notificationPayload = {
      phone: notificationPhone,

      email: notificationEmail,

      patientName:
        finalPatientName,

      tokenLabel,

      hospitalName:
        finalHospitalName,

      departmentName:
        finalDepartmentName,

      doctorName:
        finalDoctorName,

      trackingUrl,

      estimatedWaitTime,

      doctorShiftStartTime: shiftStartTime,

      averageConsultationMinutes,
    };

    console.log("=================================");
    console.log(
      "📨 STARTING BACKGROUND TOKEN NOTIFICATION",
    );
    console.log(
      "EMAIL:",
      notificationEmail,
    );
    console.log(
      "PHONE:",
      notificationPhone || "N/A",
    );
    console.log(
      "TOKEN:",
      tokenLabel,
    );
    console.log("=================================");

    // ======================================================
    // DO NOT AWAIT
    // ======================================================

    void sendTokenCreatedNotification(
      notificationPayload,
    )
      .then(async (notificationResult) => {
        console.log("=================================");
        console.log(
          "📨 BACKGROUND NOTIFICATION RESULT",
        );
        console.log(
          "TOKEN:",
          tokenLabel,
        );
        console.log(
          "RESULT:",
          notificationResult,
        );
        console.log("=================================");

        if (notificationResult.success) {
          await Queue.findByIdAndUpdate(
            queue._id,
            {
              $set: {
                tokenNotificationSent: true,
              },
            },
          );

          console.log(
            `✅ Token notification marked as sent via ${notificationResult.channel}`,
          );
        } else {
          console.error(
            "⚠️ Token notification failed:",
            notificationResult,
          );
        }
      })
      .catch((error) => {
        console.error(
          "❌ Background token notification crashed:",
          error,
        );
      });

    // ==================================================
    // SOCKET UPDATE
    // ==================================================

    getIO()
      .to(
        `hospital:${hospitalId}`,
      )
      .emit(
        "queue:created",
        populatedQueue,
      );

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(201).json({
      success: true,

      message:
        "Patient added to queue successfully",

      data: {
        queue:
          populatedQueue,

        trackingUrl,

        estimatedWaitTime,

        estimatedTurnTime,

        patientsAhead: waitingPatients,

        averageConsultationMinutes,

        doctorOnline,

        doctorShiftStartTime: shiftStartTime,
      },
    });
  } catch (error) {
    console.error(
      "❌ Create queue error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};


// ======================================================
// CALL NEXT PATIENT
// PATCH /api/queues/call-next
// ======================================================

export const callNextPatient = async (
  req: Request,
  res: Response,
) => {
  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================

    const hospitalId = req.user?.hospitalId;
    const doctorId = req.user?.userId;

    if (!hospitalId || !doctorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication information missing",
      });
    }

    // ============================================================
    // QUEUE DATE
    // ============================================================

    const queueDate = new Date()
      .toISOString()
      .split("T")[0];

    // ============================================================
    // FIND DOCTOR
    // ============================================================

    const doctor = await User.findOne({
      _id: doctorId,
      role: "DOCTOR",
      hospitalId,
      isActive: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // ============================================================
    // CHECK DEPARTMENT
    // ============================================================

    if (!doctor.departmentId) {
      return res.status(400).json({
        success: false,
        message: "Doctor has no department assigned",
      });
    }

    const departmentId = doctor.departmentId;

    // ============================================================
    // CHECK IF DOCTOR ALREADY HAS A PATIENT
    // ============================================================

    const currentPatient = await Queue.findOne({
      hospitalId,
      doctorId,
      departmentId,
      queueDate,
      status: {
        $in: ["CALLED", "SERVING"],
      },
    });

    if (currentPatient) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a patient in progress",
        data: currentPatient,
      });
    }

    // ============================================================
    // FIND + CLAIM NEXT WAITING PATIENT
    //
    // IMPORTANT:
    //
    // Only WAITING patients are eligible.
    //
    // This operation is atomic.
    //
    // Doctor 1:
    // H-001 WAITING -> CALLED -> Doctor 1
    //
    // Doctor 2:
    // H-001 is no longer WAITING
    // H-002 WAITING -> CALLED -> Doctor 2
    //
    // ============================================================

    const nextPatient =
      await Queue.findOneAndUpdate(
        {
          hospitalId,

          departmentId,

          queueDate,

          status: "WAITING",

          // Optional safety:
          // A token already assigned to a doctor
          // should never be selected again.
          $or: [
            {
              doctorId: {
                $exists: false,
              },
            },
            {
              doctorId: null,
            },
          ],
        },

        {
          $set: {
            status: "CALLED",

            // IMPORTANT:
            // This permanently assigns this queue
            // token to the doctor who called it.
            doctorId,

            calledAt: new Date(),

            estimatedWaitMinutes: 0,

            estimatedWaitTime: 0,

            estimatedTurnTime: new Date(),

            calledNotificationSent: false,

            nearTurnNotificationSent: false,
          },
        },

        {
          new: true,

          // Emergency first.
          // Within the same priority:
          // smallest token first.
          sort: {
            priority: -1,
            tokenNumber: 1,
            createdAt: 1,
          },
        },
      )
        .populate(
          "patientId",
          "name phone email patientCode age gender address",
        )
        .populate(
          "departmentId",
          "name description tokenPrefix",
        )
        .populate(
          "doctorId",
          "name email",
        );

    // ============================================================
    // NO WAITING PATIENT
    // ============================================================

    if (!nextPatient) {
      return res.status(404).json({
        success: false,
        message:
          "No patients waiting in your department",
      });
    }

    // ============================================================
    // LOG ASSIGNMENT
    // ============================================================

    console.log(
      `📞 Token ${nextPatient.tokenLabel} assigned to doctor ${doctorId}`,
    );

    // ============================================================
    // CALLED NOTIFICATION
    // ============================================================

    if (!nextPatient.calledNotificationSent) {
      const patient =
        nextPatient.patientId &&
        typeof nextPatient.patientId === "object"
          ? (nextPatient.patientId as unknown as {
              name: string;
              phone?: string;
              email?: string;
            })
          : null;

      if (patient?.phone) {
        try {
          const result =
            await sendCalledNotification({
              phone: patient.phone,

              patientName: patient.name,

              tokenLabel:
                nextPatient.tokenLabel,
            });

          if (result.success) {
            await Queue.findByIdAndUpdate(
              nextPatient._id,
              {
                $set: {
                  calledNotificationSent: true,
                },
              },
            );

            console.log(
              `✅ Called notification sent through ${result.channel}`,
            );
          } else {
            console.log(
              "⚠️ Called notification failed:",
              result,
            );
          }
        } catch (error) {
          console.error(
            "❌ Called notification error:",
            error,
          );
        }
      } else {
        console.log(
          "⚠️ Called notification skipped: patient phone missing",
        );
      }
    }

    // ============================================================
    // UPDATE NEAR-TURN NOTIFICATIONS
    // ============================================================

    try {
      await checkAndSendNearTurnNotifications(
        hospitalId,
        departmentId,
        queueDate,
      );
    } catch (error) {
      console.error(
        "⚠️ Near-turn notification process failed:",
        error,
      );
    }

    // ============================================================
    // HOSPITAL SOCKET
    //
    // Every doctor in this hospital/department can receive
    // the queue update.
    //
    // This allows Doctor 2's UI to immediately know that
    // H-001 has already been assigned to Doctor 1.
    // ============================================================

    getIO()
      .to(`hospital:${hospitalId}`)
      .emit(
        "queue:called",
        {
          queue: nextPatient,

          queueId: nextPatient._id,

          tokenLabel:
            nextPatient.tokenLabel,

          doctorId,

          departmentId,

          status: "CALLED",
        },
      );

    // ============================================================
    // PATIENT SOCKET
    // ============================================================

    if (nextPatient.trackingToken) {
      const patientRoom =
        `queue:${nextPatient.trackingToken}`;

      // Token called
      getIO()
        .to(patientRoom)
        .emit(
          "queue:called",
          {
            queueId:
              nextPatient._id,

            status: "CALLED",

            tokenLabel:
              nextPatient.tokenLabel,

            message:
              "Your token has been called. Please proceed to the doctor's room.",
          },
        );

      // Full queue status
      getIO()
        .to(patientRoom)
        .emit(
          "queue:status",
          nextPatient,
        );
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return res.status(200).json({
      success: true,

      message:
        "Next patient called successfully",

      data: nextPatient,
    });
  } catch (error) {
    console.error(
      "❌ Call next patient error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ======================================================
// START SERVING PATIENT
// PATCH /api/queues/:id/start
// ======================================================

export const startServingPatient =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        req.user?.hospitalId;

      const doctorId =
        req.user?.userId;

      const queueId =
        Array.isArray(
          req.params.id,
        )
          ? req.params.id[0]
          : req.params.id;

      // ==================================================
      // AUTH
      // ==================================================

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

      // ==================================================
      // VALIDATE QUEUE ID
      // ==================================================

      if (
        !queueId ||
        !mongoose.Types.ObjectId.isValid(
          queueId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid queue ID",
        });
      }

      // ==================================================
      // FIND CALLED PATIENT
      // ==================================================

      const queue =
        await Queue.findOne({
          _id: queueId,
          hospitalId,
          doctorId,
          status: "CALLED",
        });

      if (!queue) {
        return res.status(404).json({
          success: false,
          message:
            "Called patient not found for this doctor",
        });
      }

      // ==================================================
      // START SERVING
      // ==================================================

      queue.status =
        "SERVING";

      queue.servingAt =
        new Date();

      queue.estimatedWaitTime =
        0;

      queue.estimatedTurnTime =
        new Date();

      await queue.save();

      // ==================================================
      // UPDATED QUEUE
      // ==================================================

      const updatedQueue =
        await Queue.findById(
          queue._id,
        )
          .populate(
            "patientId",
            "name phone email patientCode age gender address",
          )
          .populate(
            "departmentId",
            "name description tokenPrefix",
          )
          .populate(
            "doctorId",
            "name email",
          );

      // ==================================================
      // HOSPITAL SOCKET
      // ==================================================

      getIO()
        .to(
          `hospital:${hospitalId}`,
        )
        .emit(
          "queue:serving",
          updatedQueue,
        );

      // ==================================================
      // PATIENT SOCKET
      // ==================================================

      if (
        queue.trackingToken
      ) {
        getIO()
          .to(
            `queue:${queue.trackingToken}`,
          )
          .emit(
            "queue:status",
            updatedQueue,
          );
      }

      return res.status(200).json({
        success: true,

        message:
          "Patient is now being served",

        data:
          updatedQueue,
      });
    } catch (error) {
      console.error(
        "❌ Start serving patient error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Internal server error",
      });
    }
  };


// ======================================================
// COMPLETE PATIENT
// PATCH /api/queues/:id/complete
// ======================================================

export const completePatient =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        req.user?.hospitalId;

      const doctorId =
        req.user?.userId;

      const queueId =
        Array.isArray(
          req.params.id,
        )
          ? req.params.id[0]
          : req.params.id;

      // ==================================================
      // AUTH
      // ==================================================

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

      // ==================================================
      // VALIDATE ID
      // ==================================================

      if (
        !queueId ||
        !mongoose.Types.ObjectId.isValid(
          queueId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid queue ID",
        });
      }

      // ==================================================
      // FIND SERVING PATIENT
      // ==================================================

      const queue =
        await Queue.findOne({
          _id: queueId,
          hospitalId,
          doctorId,
          status: "SERVING",
        });

      if (!queue) {
        return res.status(404).json({
          success: false,
          message:
            "Serving patient not found for this doctor",
        });
      }

      // ==================================================
      // COMPLETE
      // ==================================================

      const completedAt =
        new Date();

      queue.status =
        "COMPLETED";

      queue.completedAt =
        completedAt;

      // ==================================================
      // SERVICE DURATION
      // ==================================================

      if (queue.servingAt) {
        const durationMs =
          completedAt.getTime() -
          new Date(
            queue.servingAt,
          ).getTime();

        const durationMinutes =
          Math.max(
            1,
            Math.round(
              durationMs /
              (1000 * 60),
            ),
          );

        queue.serviceDurationMinutes =
          durationMinutes;
      }

      // ==================================================
      // DISABLE TRACKING
      // ==================================================

      queue.trackingLinkActive =
        false;

      queue.trackingExpiresAt =
        new Date();

      await queue.save();

      // ==================================================
      // UPDATED QUEUE
      // ==================================================

      const updatedQueue =
        await Queue.findById(
          queue._id,
        )
          .populate(
            "patientId",
            "name phone email patientCode age gender address",
          )
          .populate(
            "departmentId",
            "name description tokenPrefix",
          )
          .populate(
            "doctorId",
            "name email",
          );

      // ==================================================
      // HOSPITAL SOCKET
      // ==================================================

      getIO()
        .to(
          `hospital:${hospitalId}`,
        )
        .emit(
          "queue:completed",
          updatedQueue,
        );

      // ==================================================
      // PATIENT SOCKET
      // ==================================================

      if (
        queue.trackingToken
      ) {
        getIO()
          .to(
            `queue:${queue.trackingToken}`,
          )
          .emit(
            "queue:status",
            updatedQueue,
          );
      }

      return res.status(200).json({
        success: true,

        message:
          "Patient completed successfully",

        data:
          updatedQueue,
      });
    } catch (error) {
      console.error(
        "❌ Complete patient error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Internal server error",
      });
    }
  };


// ======================================================
// SKIP PATIENT
// PATCH /api/queues/:id/skip
// ======================================================

export const skipPatient =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const hospitalId =
        req.user?.hospitalId;

      const doctorId =
        req.user?.userId;

      const queueId =
        Array.isArray(
          req.params.id,
        )
          ? req.params.id[0]
          : req.params.id;

      // ==================================================
      // AUTH
      // ==================================================

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

      // ==================================================
      // VALIDATE ID
      // ==================================================

      if (
        !queueId ||
        !mongoose.Types.ObjectId.isValid(
          queueId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid queue ID",
        });
      }

      // ==================================================
      // FIND ACTIVE PATIENT
      // ==================================================

      const queue =
        await Queue.findOne({
          _id: queueId,
          hospitalId,
          doctorId,
          status: {
            $in: [
              "CALLED",
              "SERVING",
            ],
          },
        });

      if (!queue) {
        return res.status(404).json({
          success: false,
          message:
            "Active patient not found for this doctor",
        });
      }

      // ==================================================
      // SKIP
      // ==================================================

      queue.status =
        "SKIPPED";

      // ==================================================
      // DISABLE TRACKING
      // ==================================================

      queue.trackingLinkActive =
        false;

      queue.trackingExpiresAt =
        new Date();

      await queue.save();

      // ==================================================
      // UPDATED QUEUE
      // ==================================================

      const updatedQueue =
        await Queue.findById(
          queue._id,
        )
          .populate(
            "patientId",
            "name phone email patientCode age gender address",
          )
          .populate(
            "departmentId",
            "name description tokenPrefix",
          )
          .populate(
            "doctorId",
            "name email",
          );

      // ==================================================
      // HOSPITAL SOCKET
      // ==================================================

      getIO()
        .to(
          `hospital:${hospitalId}`,
        )
        .emit(
          "queue:skipped",
          updatedQueue,
        );

      // ==================================================
      // PATIENT SOCKET
      // ==================================================

      if (
        queue.trackingToken
      ) {
        getIO()
          .to(
            `queue:${queue.trackingToken}`,
          )
          .emit(
            "queue:status",
            updatedQueue,
          );
      }

      return res.status(200).json({
        success: true,

        message:
          "Patient skipped successfully",

        data:
          updatedQueue,
      });
    } catch (error) {
      console.error(
        "❌ Skip patient error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Internal server error",
      });
    }
  };