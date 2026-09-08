import type {
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

import {
  Queue,
} from "../models/Queue.model";

import {
  User,
} from "../models/User.model";

import {
  getDoctorLiveDelayStatus,
} from "../services/doctorTiming.service";

// ======================================================
// CONFIG
// ======================================================

const DEFAULT_CONSULTATION_MINUTES = 8;
const MAX_HISTORY_FOR_AVERAGE = 20;

// ======================================================
// HELPERS
// ======================================================

const getObjectId = (
  value: any,
): mongoose.Types.ObjectId | null => {
  const id =
    value?._id ||
    value;

  if (
    !id ||
    !mongoose.Types.ObjectId.isValid(
      String(id),
    )
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    String(id),
  );
};

const getDoctorAverageConsultationMinutes = async (
  doctorId?: mongoose.Types.ObjectId,
): Promise<number | null> => {
  if (!doctorId) {
    return null;
  }

  const completedQueues: any[] =
    await Queue.find({
      doctorId,

      status:
        "COMPLETED",

      $or: [
        {
          serviceDurationMinutes: {
            $gt:
              0,
          },
        },
        {
          servingAt: {
            $exists:
              true,
          },

          completedAt: {
            $exists:
              true,
          },
        },
      ],
    })
      .sort({
        completedAt:
          -1,
      })
      .limit(
        MAX_HISTORY_FOR_AVERAGE,
      )
      .select(
        "serviceDurationMinutes servingAt completedAt",
      )
      .lean() as any[];

  const durations =
    completedQueues
      .map(
        (
          queue: any,
        ) => {
          const stored =
            Number(
              queue.serviceDurationMinutes,
            );

          if (
            Number.isFinite(
              stored,
            ) &&
            stored > 0
          ) {
            return stored;
          }

          if (
            queue.servingAt &&
            queue.completedAt
          ) {
            const minutes =
              (
                new Date(
                  queue.completedAt,
                ).getTime() -
                new Date(
                  queue.servingAt,
                ).getTime()
              ) /
              (
                60 *
                1000
              );

            if (
              Number.isFinite(
                minutes,
              ) &&
              minutes > 0
            ) {
              return minutes;
            }
          }

          return 0;
        },
      )
      .filter(
        (
          minutes,
        ) =>
          minutes > 0,
      );

  if (
    !durations.length
  ) {
    return null;
  }

  return Math.max(
    1,
    Math.round(
      durations.reduce(
        (
          sum,
          minutes,
        ) =>
          sum +
          minutes,
        0,
      ) /
      durations.length,
    ),
  );
};

const getDepartmentAverageConsultationMinutes = async (
  hospitalId: mongoose.Types.ObjectId,
  departmentId: mongoose.Types.ObjectId,
): Promise<number | null> => {
  const completedQueues: any[] =
    await Queue.find({
      hospitalId,

      departmentId,

      status:
        "COMPLETED",

      $or: [
        {
          serviceDurationMinutes: {
            $gt:
              0,
          },
        },
        {
          servingAt: {
            $exists:
              true,
          },

          completedAt: {
            $exists:
              true,
          },
        },
      ],
    })
      .sort({
        completedAt:
          -1,
      })
      .limit(
        MAX_HISTORY_FOR_AVERAGE,
      )
      .select(
        "serviceDurationMinutes servingAt completedAt",
      )
      .lean() as any[];

  const durations =
    completedQueues
      .map(
        (
          queue: any,
        ) => {
          const stored =
            Number(
              queue.serviceDurationMinutes,
            );

          if (
            Number.isFinite(
              stored,
            ) &&
            stored > 0
          ) {
            return stored;
          }

          if (
            queue.servingAt &&
            queue.completedAt
          ) {
            const minutes =
              (
                new Date(
                  queue.completedAt,
                ).getTime() -
                new Date(
                  queue.servingAt,
                ).getTime()
              ) /
              (
                60 *
                1000
              );

            if (
              Number.isFinite(
                minutes,
              ) &&
              minutes > 0
            ) {
              return minutes;
            }
          }

          return 0;
        },
      )
      .filter(
        (
          minutes,
        ) =>
          minutes > 0,
      );

  if (
    !durations.length
  ) {
    return null;
  }

  return Math.max(
    1,
    Math.round(
      durations.reduce(
        (
          sum,
          minutes,
        ) =>
          sum +
          minutes,
        0,
      ) /
      durations.length,
    ),
  );
};

const buildQueueDateTime = (
  queueDate?: string,
  time?: string | null,
): Date | null => {
  if (
    !queueDate ||
    !time ||
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(
      time,
    )
  ) {
    return null;
  }

  return new Date(
    `${queueDate}T${time}:00+05:30`,
  );
};

const getQueueScheduledTime = (
  queue: any,
): string | null => {
  return (
    queue.scheduledStartTime ||
    queue.appointmentId?.confirmedStartTime ||
    queue.appointmentId?.requestedStartTime ||
    null
  );
};

const getSortTime = (
  queue: any,
): number => {
  const scheduledTime =
    getQueueScheduledTime(
      queue,
    );

  const scheduledDateTime =
    buildQueueDateTime(
      queue.queueDate,
      scheduledTime,
    );

  if (
    queue.source ===
    "APPOINTMENT"
  ) {
    return scheduledDateTime
      ? scheduledDateTime.getTime()
      : Number.MAX_SAFE_INTEGER;
  }

  return Number(
    queue.tokenNumber ||
    0,
  );
};

const sortQueueItems = (
  first: any,
  second: any,
): number => {
  if (
    first.status === "SERVING" &&
    second.status !== "SERVING"
  ) {
    return -1;
  }

  if (
    second.status === "SERVING" &&
    first.status !== "SERVING"
  ) {
    return 1;
  }

  if (
    first.status === "CALLED" &&
    second.status !== "CALLED"
  ) {
    return -1;
  }

  if (
    second.status === "CALLED" &&
    first.status !== "CALLED"
  ) {
    return 1;
  }

  if (
    first.priority === "EMERGENCY" &&
    second.priority !== "EMERGENCY"
  ) {
    return -1;
  }

  if (
    second.priority === "EMERGENCY" &&
    first.priority !== "EMERGENCY"
  ) {
    return 1;
  }

  return (
    getSortTime(first) -
    getSortTime(second)
  );
};

const calculateOfflineMinutes = (
  doctorTiming: any,
): number => {
  if (
    doctorTiming?.isOnline ===
    true
  ) {
    return 0;
  }

  if (
    doctorTiming?.lastSeenAt
  ) {
    return Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          new Date(
            doctorTiming.lastSeenAt,
          ).getTime()
        ) /
        60000,
      ),
    );
  }

  return doctorTiming?.lateByMinutes ||
    0;
};

const calculateLiveEstimate = async ({
  queue,
  hospitalId,
  departmentId,
  doctorId,
  averageConsultationMinutes,
  doctorTiming,
}: {
  queue: any;
  hospitalId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId | null;
  averageConsultationMinutes: number;
  doctorTiming: any | null;
}) => {
  const now =
    new Date();

  const queueFilter: any = {
    hospitalId,

    departmentId,

    queueDate:
      queue.queueDate,

    status: {
      $in: [
        "WAITING",
        "CALLED",
        "SERVING",
      ],
    },
  };

  if (
    doctorId
  ) {
    queueFilter.$or = [
      {
        doctorId,
      },
      {
        doctorId:
          null,
      },
      {
        doctorId: {
          $exists:
            false,
        },
      },
    ];
  }

  const activeQueues: any[] =
    await Queue.find(
      queueFilter,
    )
      .populate(
        "appointmentId",
        "appointmentCode requestedStartTime confirmedStartTime endTime paymentStatus status",
      )
      .select(
        "_id tokenLabel tokenNumber priority status source appointmentId scheduledStartTime queueDate servingAt calledAt createdAt doctorId",
      )
      .lean() as any[];

  const sortedQueues =
    activeQueues.sort(
      sortQueueItems,
    );

  const servingPatient =
    sortedQueues.find(
      (
        item,
      ) =>
        item.status ===
        "SERVING",
    );

  const calledPatient =
    sortedQueues.find(
      (
        item,
      ) =>
        item.status ===
        "CALLED",
    );

  const currentServing =
    servingPatient ||
    calledPatient;

  const currentServingToken =
    currentServing?.tokenLabel ||
    null;

  if (
    queue.status === "CALLED" ||
    queue.status === "SERVING"
  ) {
    return {
      currentServingToken:
        queue.tokenLabel ||
        currentServingToken,

      patientsAhead:
        0,

      estimatedWaitTime:
        0,

      estimatedTurnTime:
        new Date(),
    };
  }

  const targetIndex =
    sortedQueues.findIndex(
      (
        item,
      ) =>
        String(item._id) ===
        String(queue._id),
    );

  const safeTargetIndex =
    targetIndex >= 0
      ? targetIndex
      : sortedQueues.length;

  const aheadItems =
    sortedQueues.slice(
      0,
      safeTargetIndex,
    );

  const patientsAhead =
    aheadItems.length;

  let remainingCurrentPatient =
    0;

  if (
    servingPatient?.servingAt
  ) {
    const elapsedMinutes =
      (
        now.getTime() -
        new Date(
          servingPatient.servingAt,
        ).getTime()
      ) /
      (
        60 *
        1000
      );

    remainingCurrentPatient =
      Math.max(
        averageConsultationMinutes -
        elapsedMinutes,
        0,
      );
  }

  let estimateBaseTime =
    now;

  if (
    doctorTiming?.expectedDoctorStartAt
  ) {
    const expectedDoctorStartAt =
      new Date(
        doctorTiming.expectedDoctorStartAt,
      );

    if (
      !Number.isNaN(
        expectedDoctorStartAt.getTime(),
      ) &&
      expectedDoctorStartAt.getTime() >
      estimateBaseTime.getTime()
    ) {
      estimateBaseTime =
        expectedDoctorStartAt;
    }
  }

  const appointmentTime =
    getQueueScheduledTime(
      queue,
    );

  const appointmentDateTime =
    buildQueueDateTime(
      queue.queueDate,
      appointmentTime,
    );

  /*
   * Appointment time remains fixed.
   * Estimated turn time can move later,
   * but never earlier than appointment time.
   */
  if (
    appointmentDateTime &&
    appointmentDateTime.getTime() >
    estimateBaseTime.getTime()
  ) {
    estimateBaseTime =
      appointmentDateTime;
  }

  const estimatedTurnTime =
    new Date(
      estimateBaseTime.getTime() +
      (
        remainingCurrentPatient +
        patientsAhead *
        averageConsultationMinutes
      ) *
      60 *
      1000,
    );

  const estimatedWaitTime =
    Math.max(
      0,
      Math.ceil(
        (
          estimatedTurnTime.getTime() -
          now.getTime()
        ) /
        (
          60 *
          1000
        ),
      ),
    );

  return {
    currentServingToken,

    patientsAhead,

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
    const trackingToken =
      Array.isArray(
        req.params.trackingToken,
      )
        ? req.params.trackingToken[0]
        : req.params.trackingToken;

    if (
      !trackingToken
    ) {
      return res.status(400).json({
        success:
          false,

        message:
          "Tracking token is required",
      });
    }

    const queue: any =
      await Queue.findOne({
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
          "name email isOnline shiftStartTime departmentId lastSeenAt",
        )
        .populate(
          "appointmentId",
          "appointmentCode requestedStartTime confirmedStartTime endTime paymentStatus status",
        )
        .lean();

    if (
      !queue
    ) {
      return res.status(404).json({
        success:
          false,

        message:
          "Invalid tracking link",
      });
    }

    const hospitalId =
      getObjectId(
        queue.hospitalId,
      );

    const departmentId =
      getObjectId(
        queue.departmentId,
      );

    if (
      !hospitalId ||
      !departmentId
    ) {
      return res.status(500).json({
        success:
          false,

        message:
          "Queue configuration is invalid",
      });
    }

    const appointmentTime =
      getQueueScheduledTime(
        queue,
      );

    const appointment =
      queue.source === "APPOINTMENT" ||
        queue.appointmentId ||
        queue.scheduledStartTime
        ? {
          appointmentCode:
            queue.appointmentId?.appointmentCode ||
            null,

          appointmentTime,

          scheduledStartTime:
            appointmentTime,

          message:
            "Your appointment time is fixed. Estimated turn time may change based on doctor availability and current queue.",
        }
        : null;

    /*
     * Terminal statuses should still return data,
     * so patient can see final screen instead of invalid link.
     */
    if (
      queue.status === "COMPLETED" ||
      queue.status === "SKIPPED" ||
      queue.status === "CANCELLED"
    ) {
      return res.status(200).json({
        success:
          true,

        data: {
          _id:
            queue._id,

          queueId:
            queue._id,

          hospitalId:
            queue.hospitalId,

          tokenLabel:
            queue.tokenLabel,

          tokenNumber:
            queue.tokenNumber,

          status:
            queue.status,

          source:
            queue.source,

          priority:
            queue.priority,

          patient:
            queue.patientId,

          department:
            queue.departmentId,

          doctorId:
            queue.doctorId ||
            null,

          doctorOnline:
            false,

          doctorShiftStartTime:
            null,

          averageConsultationMinutes:
            DEFAULT_CONSULTATION_MINUTES,

          currentServingToken:
            null,

          patientsAhead:
            0,

          estimatedWaitTime:
            0,

          estimatedTurnTime:
            null,

          doctorTiming:
            null,

          appointment,

          queueDate:
            queue.queueDate,

          createdAt:
            queue.createdAt,

          updatedAt:
            queue.updatedAt,
        },
      });
    }

    if (queue.trackingLinkActive === false) {
      const message =
        queue.status === "COMPLETED"
          ? "Your consultation is completed. This tracking token has expired."
          : queue.status === "SKIPPED"
            ? "Your token was skipped. Please contact reception."
            : queue.status === "CANCELLED"
              ? "This token was cancelled. Please contact reception."
              : "This tracking token is no longer active.";

      return res.status(410).json({
        success: false,
        code: "TRACKING_EXPIRED",
        message,
      });
    }

    if (
      queue.trackingExpiresAt &&
      new Date(
        queue.trackingExpiresAt,
      ).getTime() < Date.now()
    ) {
      return res.status(410).json({
        success:
          false,

        code:
          "TRACKING_EXPIRED",

        message:
          "This tracking link has expired.",
      });
    }

    let doctor: any =
      null;

    if (
      queue.doctorId?._id
    ) {
      doctor =
        await User.findOne({
          _id:
            queue.doctorId._id,

          hospitalId,

          role:
            "DOCTOR",

          isActive:
            true,
        })
          .select(
            "name email isOnline shiftStartTime departmentId lastSeenAt",
          )
          .lean();
    }

    if (
      !doctor
    ) {
      doctor =
        await User.findOne({
          hospitalId,

          departmentId,

          role:
            "DOCTOR",

          isActive:
            true,
        })
          .select(
            "name email isOnline shiftStartTime departmentId lastSeenAt",
          )
          .sort({
            isOnline:
              -1,

            createdAt:
              1,
          })
          .lean();
    }

    const doctorId =
      getObjectId(
        doctor?._id ||
        queue.doctorId?._id ||
        queue.doctorId,
      );

    let doctorTiming: any =
      null;

    if (
      doctorId
    ) {
      doctorTiming =
        await getDoctorLiveDelayStatus({
          hospitalId,

          doctorId,

          date:
            queue.queueDate,
        });
    }

    const doctorAverage =
      doctorId
        ? await getDoctorAverageConsultationMinutes(
          doctorId,
        )
        : null;

    const departmentAverage =
      doctorAverage === null
        ? await getDepartmentAverageConsultationMinutes(
          hospitalId,
          departmentId,
        )
        : null;

    const averageConsultationMinutes =
      doctorTiming?.averageServiceMinutes ||
      doctorAverage ||
      departmentAverage ||
      DEFAULT_CONSULTATION_MINUTES;

    const liveEstimate =
      await calculateLiveEstimate({
        queue,

        hospitalId,

        departmentId,

        doctorId,

        averageConsultationMinutes,

        doctorTiming,
      });

    const doctorOnline =
      Boolean(
        doctorTiming?.isOnline ??
        doctor?.isOnline,
      );

    const doctorShiftStartTime =
      doctorTiming?.scheduledStartTime ||
      (
        typeof doctor?.shiftStartTime ===
          "string"
          ? doctor.shiftStartTime
          : null
      );

    const offlineMinutes =
      calculateOfflineMinutes(
        doctorTiming,
      );

    const doctorData =
      doctor
        ? {
          _id:
            doctor._id,

          name:
            doctor.name,

          email:
            doctor.email,
        }
        : queue.doctorId ||
        null;

    console.log("=================================");
    console.log("🔎 PATIENT TRACKING");
    console.log("Token:", queue.tokenLabel);
    console.log("Doctor:", doctor?.name || "Not assigned");
    console.log("Doctor Online:", doctorOnline);
    console.log(
      "Doctor Late:",
      doctorTiming?.isLate
        ? `${doctorTiming.lateByMinutes} min`
        : "No",
    );
    console.log(
      "Appointment Time:",
      appointmentTime || "Walk-in",
    );
    console.log(
      "Estimated Wait:",
      liveEstimate.estimatedWaitTime,
    );
    console.log(
      "Estimated Turn:",
      liveEstimate.estimatedTurnTime,
    );
    console.log("=================================");

    return res.status(200).json({
      success:
        true,

      data: {
        _id:
          queue._id,

        queueId:
          queue._id,

        hospitalId:
          queue.hospitalId,

        tokenLabel:
          queue.tokenLabel,

        tokenNumber:
          queue.tokenNumber,

        status:
          queue.status,

        source:
          queue.source,

        priority:
          queue.priority,

        patient:
          queue.patientId,

        department:
          queue.departmentId,

        doctorId:
          doctorData,

        currentServingToken:
          liveEstimate.currentServingToken,

        patientsAhead:
          liveEstimate.patientsAhead,

        estimatedWaitTime:
          liveEstimate.estimatedWaitTime,

        estimatedTurnTime:
          liveEstimate.estimatedTurnTime,

        averageConsultationMinutes,

        doctorOnline,

        doctorShiftStartTime,

        offlineMinutes,

        doctorTiming:
          doctorTiming
            ? {
              scheduledStartTime:
                doctorTiming.scheduledStartTime ||
                null,

              scheduledEndTime:
                doctorTiming.scheduledEndTime ||
                null,

              isOnline:
                Boolean(
                  doctorTiming.isOnline,
                ),

              isLate:
                Boolean(
                  doctorTiming.isLate,
                ),

              lateByMinutes:
                doctorTiming.lateByMinutes ||
                0,

              firstOnlineAt:
                doctorTiming.firstOnlineAt ||
                null,

              lastSeenAt:
                doctorTiming.lastSeenAt ||
                null,

              expectedDoctorStartAt:
                doctorTiming.expectedDoctorStartAt ||
                null,

              averageServiceMinutes:
                doctorTiming.averageServiceMinutes ||
                averageConsultationMinutes,

              message:
                doctorTiming.message ||
                "Doctor timing is being updated.",
            }
            : null,

        appointment,

        queueDate:
          queue.queueDate,

        createdAt:
          queue.createdAt,

        updatedAt:
          queue.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "❌ Track queue error:",
      error,
    );

    return res.status(500).json({
      success:
        false,

      message:
        "Failed to track queue",
    });
  }
};

// ======================================================
// ALIASES
// Keep old route imports working
// ======================================================

export const trackPatientQueue =
  trackQueue;

export const getQueueTracking =
  trackQueue;

export const getQueueByTrackingToken =
  trackQueue;