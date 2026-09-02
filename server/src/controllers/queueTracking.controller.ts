import type { Request, Response } from "express";
import mongoose from "mongoose";

import { Queue } from "../models/Queue.model";
import { User } from "../models/User.model";

// ======================================================
// CONFIG
// ======================================================

const DEFAULT_CONSULTATION_MINUTES = 8;
const MAX_HISTORY_FOR_AVERAGE = 20;

// ======================================================
// HELPERS
// ======================================================

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
      durations.reduce((sum, minutes) => sum + minutes, 0) /
        durations.length,
    ),
  );
};

const getDepartmentAverageConsultationMinutes = async (
  hospitalId: mongoose.Types.ObjectId,
  departmentId: mongoose.Types.ObjectId,
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
      durations.reduce((sum, minutes) => sum + minutes, 0) /
        durations.length,
    ),
  );
};

const getTodayOpdStartTime = (
  shiftStartTime?: string | null,
): Date | null => {
  if (
    !shiftStartTime ||
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(shiftStartTime)
  ) {
    return null;
  }

  const [hours, minutes] = shiftStartTime.split(":").map(Number);
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);

  return start;
};

/**
 * Returns true when queue A should be ahead of queue B.
 * Emergency patients are always ahead of normal patients.
 * Within the same priority, the lower token number is ahead.
 */
const isQueueAhead = (
  candidate: any,
  target: any,
): boolean => {
  if (candidate.priority !== target.priority) {
    return candidate.priority === "EMERGENCY";
  }

  return Number(candidate.tokenNumber) < Number(target.tokenNumber);
};

/**
 * Calculate a better estimate than simply patientsAhead * average.
 * If somebody is currently serving, only the remaining portion of the
 * average consultation is added. CALLED patients get a full slot.
 */
const calculateLiveEstimate = async ({
  queue,
  hospitalId,
  departmentId,
  averageConsultationMinutes,
  doctorOnline,
  shiftStartTime,
}: {
  queue: any;
  hospitalId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  averageConsultationMinutes: number;
  doctorOnline: boolean;
  shiftStartTime: string | null;
}) => {
  const now = new Date();

  const activeQueues = await Queue.find({
    hospitalId,
    departmentId,
    queueDate: queue.queueDate,
    status: { $in: ["WAITING", "CALLED", "SERVING"] },
  })
    .select(
      "_id tokenNumber priority status servingAt calledAt",
    )
    .lean();

  const queuesAhead = activeQueues.filter((candidate: any) => {
    if (String(candidate._id) === String(queue._id)) return false;
    return isQueueAhead(candidate, queue);
  });

  const waitingAhead = queuesAhead.filter(
    (item: any) => item.status === "WAITING",
  );

  const calledAhead = queuesAhead.filter(
    (item: any) => item.status === "CALLED",
  );

  const servingAhead = queuesAhead.filter(
    (item: any) => item.status === "SERVING",
  );

  let processingStart = now;

  // If the doctor is offline and today's configured shift has not started,
  // the estimate starts from the shift time instead of from "now".
  const opdStartDate = getTodayOpdStartTime(shiftStartTime);

  if (
    !doctorOnline &&
    opdStartDate &&
    opdStartDate.getTime() > now.getTime()
  ) {
    processingStart = opdStartDate;
  }

  let waitMinutes = 0;

  // Current serving patient's remaining time.
  if (doctorOnline && servingAhead.length > 0) {
    const serving = servingAhead[0];

    if (serving.servingAt) {
      const elapsedMinutes =
        (now.getTime() -
          new Date(serving.servingAt).getTime()) /
        (60 * 1000);

      waitMinutes += Math.max(
        0,
        averageConsultationMinutes - elapsedMinutes,
      );
    } else {
      waitMinutes += averageConsultationMinutes;
    }
  } else if (!doctorOnline && servingAhead.length > 0) {
    waitMinutes += servingAhead.length * averageConsultationMinutes;
  }

  waitMinutes +=
    calledAhead.length * averageConsultationMinutes;

  waitMinutes +=
    waitingAhead.length * averageConsultationMinutes;

  const estimatedTurnTime = new Date(
    processingStart.getTime() +
      waitMinutes * 60 * 1000,
  );

  const estimatedWaitTime = Math.max(
    0,
    Math.ceil(
      (estimatedTurnTime.getTime() - now.getTime()) /
        (60 * 1000),
    ),
  );

  return {
    patientsAhead: queuesAhead.length,
    estimatedWaitTime,
    estimatedTurnTime,
  };
};

// ======================================================
// TRACK PATIENT QUEUE
// GET /api/queues/track/:trackingToken
// ======================================================

export const trackQueue = async (
  req: Request,
  res: Response,
) => {
  try {
    const trackingToken = Array.isArray(req.params.trackingToken)
      ? req.params.trackingToken[0]
      : req.params.trackingToken;

    // ==================================================
    // VALIDATE TOKEN
    // ==================================================

    if (!trackingToken) {
      return res.status(400).json({
        success: false,
        message: "Tracking token is required",
      });
    }

    // ==================================================
    // FIND QUEUE
    // ==================================================

    const queue = await Queue.findOne({
      trackingToken,
    })
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
        "name email isOnline shiftStartTime departmentId",
      )
      .lean();

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Invalid tracking link",
      });
    }

    // ==================================================
    // SKIPPED TOKEN
    // ==================================================

    if (queue.status === "SKIPPED") {
      return res.status(200).json({
        success: true,
        code: "TOKEN_SKIPPED",
        message:
          "Your token was skipped. Please contact reception.",
        data: {
          queueId: queue._id,
          hospitalId: queue.hospitalId,
          tokenLabel: queue.tokenLabel,
          tokenNumber: queue.tokenNumber,
          status: queue.status,
          priority: queue.priority,
          patient: queue.patientId,
          department: queue.departmentId,
          doctorId: queue.doctorId || null,
          doctorOnline: false,
          doctorShiftStartTime: null,
          averageConsultationMinutes: DEFAULT_CONSULTATION_MINUTES,
          currentServingToken: null,
          patientsAhead: 0,
          estimatedWaitTime: 0,
          estimatedTurnTime: null,
          queueDate: queue.queueDate,
        },
      });
    }

    // ==================================================
    // CHECK TRACKING STATUS
    // ==================================================

    if (queue.trackingLinkActive === false) {
      return res.status(410).json({
        success: false,
        code: "TRACKING_TERMINATED",
        message:
          "Your token has already been called. Please proceed to the doctor's room.",
      });
    }

    // ==================================================
    // CHECK EXPIRATION
    // ==================================================

    if (
      queue.trackingExpiresAt &&
      new Date(queue.trackingExpiresAt).getTime() < Date.now()
    ) {
      return res.status(410).json({
        success: false,
        code: "TRACKING_EXPIRED",
        message: "This tracking link has expired.",
      });
    }

    // ==================================================
    // IDS
    // ==================================================

    const hospitalId = queue.hospitalId as mongoose.Types.ObjectId;
    const departmentId = queue.departmentId?._id as mongoose.Types.ObjectId;

    if (
      !mongoose.Types.ObjectId.isValid(hospitalId) ||
      !mongoose.Types.ObjectId.isValid(departmentId)
    ) {
      return res.status(500).json({
        success: false,
        message: "Queue configuration is invalid",
      });
    }

    // ==================================================
    // FIND DOCTOR
    // ==================================================
    // IMPORTANT:
    // 1. Once a doctor has been assigned to the queue, use that doctor.
    // 2. Before assignment, use the active doctor of the department.
    // This fixes the old situation where patient tracking could show
    // "doctor not online" simply because queue.doctorId was still null.

    let doctor: any = null;

    if (queue.doctorId?._id) {
      doctor = await User.findOne({
        _id: queue.doctorId._id,
        hospitalId,
        role: "DOCTOR",
        isActive: true,
      })
        .select("name email isOnline shiftStartTime departmentId")
        .lean();
    }

    if (!doctor) {
      doctor = await User.findOne({
        hospitalId,
        departmentId,
        role: "DOCTOR",
        isActive: true,
      })
        .select("name email isOnline shiftStartTime departmentId")
        .sort({ isOnline: -1, createdAt: 1 })
        .lean();
    }

    const doctorOnline = doctor?.isOnline === true;
    const doctorShiftStartTime =
      typeof doctor?.shiftStartTime === "string"
        ? doctor.shiftStartTime
        : null;

    // ==================================================
    // REAL CONSULTATION AVERAGE
    // ==================================================

    const doctorAverage = doctor?._id
      ? await getDoctorAverageConsultationMinutes(doctor._id)
      : null;

    const departmentAverage =
      doctorAverage === null
        ? await getDepartmentAverageConsultationMinutes(
            hospitalId,
            departmentId,
          )
        : null;

    const averageConsultationMinutes =
      doctorAverage ??
      departmentAverage ??
      DEFAULT_CONSULTATION_MINUTES;

    // ==================================================
    // CURRENTLY SERVING
    // ==================================================

    const currentServing = await Queue.findOne({
      hospitalId,
      departmentId,
      queueDate: queue.queueDate,
      status: "SERVING",
    })
      .sort({ servingAt: 1 })
      .select("tokenLabel tokenNumber doctorId")
      .lean();

    // ==================================================
    // LIVE ESTIMATE
    // ==================================================

    const liveEstimate = await calculateLiveEstimate({
      queue,
      hospitalId,
      departmentId,
      averageConsultationMinutes,
      doctorOnline,
      shiftStartTime: doctorShiftStartTime,
    });

    // ==================================================
    // FINAL DOCTOR DATA
    // ==================================================

    const doctorData = doctor
      ? {
          _id: doctor._id,
          name: doctor.name,
          email: doctor.email,
        }
      : queue.doctorId || null;

    // ==================================================
    // DEBUG
    // ==================================================

    console.log("=================================");
    console.log("🔎 PATIENT TRACKING");
    console.log("Token:", queue.tokenLabel);
    console.log("Doctor:", doctor?.name || "Not assigned");
    console.log("Doctor Online:", doctorOnline);
    console.log(
      "OPD Start:",
      doctorShiftStartTime || "Not configured",
    );
    console.log(
      "Average Consultation:",
      `${averageConsultationMinutes} min`,
    );
    console.log("Patients Ahead:", liveEstimate.patientsAhead);
    console.log(
      "Estimated Wait:",
      liveEstimate.estimatedWaitTime,
    );
    console.log(
      "Estimated Turn:",
      liveEstimate.estimatedTurnTime,
    );
    console.log(
      "Current Serving:",
      currentServing?.tokenLabel || "None",
    );
    console.log("=================================");

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,
      data: {
        queueId: queue._id,
        hospitalId: queue.hospitalId,
        tokenLabel: queue.tokenLabel,
        tokenNumber: queue.tokenNumber,
        status: queue.status,
        priority: queue.priority,

        patient: queue.patientId,
        department: queue.departmentId,
        doctorId: doctorData,

        currentServingToken:
          currentServing?.tokenLabel || null,

        patientsAhead:
          liveEstimate.patientsAhead,

        estimatedWaitTime:
          liveEstimate.estimatedWaitTime,

        estimatedTurnTime:
          liveEstimate.estimatedTurnTime,

        averageConsultationMinutes,

        doctorOnline,

        doctorShiftStartTime,

        queueDate: queue.queueDate,
      },
    });
  } catch (error) {
    console.error("❌ Track queue error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to track queue",
    });
  }
};
