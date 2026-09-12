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

/* ======================================================
   CONFIG
====================================================== */

const DEFAULT_CONSULTATION_MINUTES = 8;
const MAX_HISTORY_FOR_AVERAGE = 20;
const APPOINTMENT_PRIORITY_WINDOW_MINUTES = 15;

type AppointmentCallStatus =
  | "UPCOMING"
  | "PRIORITY"
  | "MISSED";

/* ======================================================
   HELPERS
====================================================== */

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

const getIndiaCurrentTime = () => {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Asia/Kolkata",
        hour:
          "2-digit",
        minute:
          "2-digit",
        hour12:
          false,
      },
    ).formatToParts(
      new Date(),
    );

  const hour =
    parts.find(
      (part) =>
        part.type === "hour",
    )?.value || "00";

  const minute =
    parts.find(
      (part) =>
        part.type === "minute",
    )?.value || "00";

  return `${hour}:${minute}`;
};

const timeToMinutes = (
  value?: string | null,
): number | null => {
  if (!value) {
    return null;
  }

  const match =
    String(value).match(
      /^(\d{1,2}):(\d{2})/,
    );

  if (!match) {
    return null;
  }

  const hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

const minutesToTime = (
  minutes: number,
): string => {
  const safeMinutes =
    ((Math.round(minutes) % 1440) + 1440) %
    1440;

  const hours =
    Math.floor(
      safeMinutes / 60,
    );

  const mins =
    safeMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0",
  )}:${String(mins).padStart(
    2,
    "0",
  )}`;
};

const addMinutesToTime = (
  value?: string | null,
  minutesToAdd = 0,
): string | null => {
  const minutes =
    timeToMinutes(value);

  if (minutes === null) {
    return null;
  }

  return minutesToTime(
    minutes + minutesToAdd,
  );
};

const getAppointmentWindowEndTime = (
  scheduledStartTime?: string | null,
  scheduledEndTime?: string | null,
): string | null => {
  if (scheduledEndTime) {
    return scheduledEndTime;
  }

  return addMinutesToTime(
    scheduledStartTime,
    APPOINTMENT_PRIORITY_WINDOW_MINUTES,
  );
};

const getAppointmentCallStatus = ({
  currentTime,
  scheduledStartTime,
  scheduledEndTime,
}: {
  currentTime: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
}): AppointmentCallStatus => {
  const startMinutes =
    timeToMinutes(
      scheduledStartTime,
    );

  const windowEndTime =
    getAppointmentWindowEndTime(
      scheduledStartTime,
      scheduledEndTime,
    );

  const endMinutes =
    timeToMinutes(
      windowEndTime,
    );

  const nowMinutes =
    timeToMinutes(
      currentTime,
    );

  if (
    startMinutes === null ||
    endMinutes === null ||
    nowMinutes === null
  ) {
    return "UPCOMING";
  }

  if (nowMinutes >= endMinutes) {
    return "MISSED";
  }

  if (nowMinutes >= startMinutes) {
    return "PRIORITY";
  }

  return "UPCOMING";
};

const buildQueueDateTime = (
  queueDate?: string,
  time?: string | null,
): Date | null => {
  if (
    !queueDate ||
    !time ||
    !/^(\d{1,2}):(\d{2})/.test(time)
  ) {
    return null;
  }

  const normalizedTime =
    time.length === 5
      ? time
      : String(time).slice(0, 5);

  return new Date(
    `${queueDate}T${normalizedTime}:00+05:30`,
  );
};

const getQueueScheduledStartTime = (
  queue: any,
): string | null => {
  return (
    queue.scheduledStartTime ||
    queue.appointmentId?.confirmedStartTime ||
    queue.appointmentId?.requestedStartTime ||
    null
  );
};

const getQueueScheduledEndTime = (
  queue: any,
): string | null => {
  return getAppointmentWindowEndTime(
    getQueueScheduledStartTime(queue),
    queue.scheduledEndTime ||
      queue.appointmentId?.endTime ||
      null,
  );
};

const isAppointmentQueue = (
  queue: any,
) => {
  return (
    queue.source === "APPOINTMENT" ||
    Boolean(queue.appointmentId) ||
    Boolean(queue.scheduledStartTime) ||
    String(queue.tokenLabel || "").includes("-A")
  );
};

const isEmergencyQueue = (
  queue: any,
) => {
  return (
    queue.priority === "EMERGENCY" ||
    queue.source === "EMERGENCY"
  );
};

const isMissedAppointmentQueue = (
  queue: any,
  currentTime: string,
) => {
  if (
    !isAppointmentQueue(queue) ||
    isEmergencyQueue(queue)
  ) {
    return false;
  }

  if (
    queue.appointmentCallStatus === "MISSED"
  ) {
    return true;
  }

  return getAppointmentCallStatus({
    currentTime,
    scheduledStartTime:
      getQueueScheduledStartTime(queue),
    scheduledEndTime:
      getQueueScheduledEndTime(queue),
  }) === "MISSED";
};

const isActiveAppointmentWindow = (
  queue: any,
  currentTime: string,
) => {
  if (
    !isAppointmentQueue(queue) ||
    isEmergencyQueue(queue)
  ) {
    return false;
  }

  return getAppointmentCallStatus({
    currentTime,
    scheduledStartTime:
      getQueueScheduledStartTime(queue),
    scheduledEndTime:
      getQueueScheduledEndTime(queue),
  }) === "PRIORITY";
};

const markMissedAppointments = async ({
  hospitalId,
  departmentId,
  queueDate,
  currentTime,
}: {
  hospitalId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  queueDate: string;
  currentTime: string;
}) => {
  const appointmentQueues: any[] =
    await Queue.find({
      hospitalId,
      departmentId,
      queueDate,
      status: "WAITING",
      source: "APPOINTMENT",
      appointmentCallStatus: {
        $ne: "MISSED",
      },
    })
      .select(
        "_id scheduledStartTime scheduledEndTime appointmentCallStatus",
      )
      .lean() as any[];

  const missedUpdates =
    appointmentQueues
      .map((queue: any) => {
        const scheduledEndTime =
          getAppointmentWindowEndTime(
            queue.scheduledStartTime,
            queue.scheduledEndTime,
          );

        const status =
          getAppointmentCallStatus({
            currentTime,
            scheduledStartTime:
              queue.scheduledStartTime,
            scheduledEndTime,
          });

        return {
          queueId:
            queue._id,
          scheduledEndTime,
          status,
        };
      })
      .filter(
        (item) =>
          item.status === "MISSED",
      );

  if (!missedUpdates.length) {
    return 0;
  }

  await Promise.all(
    missedUpdates.map(
      (item) =>
        Queue.updateOne(
          {
            _id:
              item.queueId,
          },
          {
            $set: {
              appointmentCallStatus:
                "MISSED",
              scheduledEndTime:
                item.scheduledEndTime,
              appointmentMissedAt:
                new Date(),
            },
          },
        ),
    ),
  );

  return missedUpdates.length;
};

const getSortTime = (
  queue: any,
): number => {
  if (isAppointmentQueue(queue)) {
    const scheduledDateTime =
      buildQueueDateTime(
        queue.queueDate,
        getQueueScheduledStartTime(queue),
      );

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
  currentTime: string,
) => {
  return (
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

    const rank = (
      item: any,
    ) => {
      if (isEmergencyQueue(item)) {
        return 0;
      }

      if (
        isActiveAppointmentWindow(
          item,
          currentTime,
        )
      ) {
        return 1;
      }

      if (!isAppointmentQueue(item)) {
        return 2;
      }

      if (
        isMissedAppointmentQueue(
          item,
          currentTime,
        )
      ) {
        return 4;
      }

      return 3;
    };

    const firstRank =
      rank(first);

    const secondRank =
      rank(second);

    if (firstRank !== secondRank) {
      return firstRank - secondRank;
    }

    const sortTimeDiff =
      getSortTime(first) -
      getSortTime(second);

    if (sortTimeDiff !== 0) {
      return sortTimeDiff;
    }

    return (
      Number(first.tokenNumber || 0) -
      Number(second.tokenNumber || 0)
    );
  };
};

const calculateOfflineMinutes = (
  doctorTiming: any,
  doctor: any,
): number => {
  if (
    doctorTiming?.isOnline === true ||
    doctor?.isOnline === true
  ) {
    return 0;
  }

  const lastSeenAt =
    doctorTiming?.lastSeenAt ||
    doctor?.lastSeenAt;

  if (lastSeenAt) {
    return Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          new Date(lastSeenAt).getTime()
        ) /
          60000,
      ),
    );
  }

  return doctorTiming?.lateByMinutes ||
    0;
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
        (queue: any) => {
          const stored =
            Number(
              queue.serviceDurationMinutes,
            );

          if (
            Number.isFinite(stored) &&
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
                new Date(queue.completedAt).getTime() -
                new Date(queue.servingAt).getTime()
              ) /
              (60 * 1000);

            if (
              Number.isFinite(minutes) &&
              minutes > 0
            ) {
              return minutes;
            }
          }

          return 0;
        },
      )
      .filter(
        (minutes) =>
          minutes > 0,
      );

  if (!durations.length) {
    return null;
  }

  return Math.max(
    1,
    Math.round(
      durations.reduce(
        (sum, minutes) =>
          sum + minutes,
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
        (queue: any) => {
          const stored =
            Number(
              queue.serviceDurationMinutes,
            );

          if (
            Number.isFinite(stored) &&
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
                new Date(queue.completedAt).getTime() -
                new Date(queue.servingAt).getTime()
              ) /
              (60 * 1000);

            if (
              Number.isFinite(minutes) &&
              minutes > 0
            ) {
              return minutes;
            }
          }

          return 0;
        },
      )
      .filter(
        (minutes) =>
          minutes > 0,
      );

  if (!durations.length) {
    return null;
  }

  return Math.max(
    1,
    Math.round(
      durations.reduce(
        (sum, minutes) =>
          sum + minutes,
        0,
      ) /
        durations.length,
    ),
  );
};

const calculateLiveEstimate = async ({
  queue,
  hospitalId,
  departmentId,
  doctorId,
  averageConsultationMinutes,
  doctorTiming,
  currentTime,
}: {
  queue: any;
  hospitalId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId | null;
  averageConsultationMinutes: number;
  doctorTiming: any | null;
  currentTime: string;
}) => {
  const now =
    new Date();

  const currentServingFilter: any = {
    hospitalId,
    departmentId,
    queueDate:
      queue.queueDate,
    status: {
      $in: [
        "CALLED",
        "SERVING",
      ],
    },
  };

  if (doctorId) {
    currentServingFilter.$or = [
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

  const currentServing: any =
    await Queue.findOne(
      currentServingFilter,
    )
      .sort({
        status:
          -1,
        calledAt:
          1,
      })
      .select(
        "tokenLabel status servingAt calledAt",
      )
      .lean();

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

  if (
    isMissedAppointmentQueue(
      queue,
      currentTime,
    )
  ) {
    return {
      currentServingToken,
      patientsAhead:
        0,
      estimatedWaitTime:
        0,
      estimatedTurnTime:
        null,
    };
  }

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

  if (doctorId) {
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
        "_id tokenLabel tokenNumber priority status source appointmentId scheduledStartTime scheduledEndTime appointmentCallStatus queueDate servingAt calledAt createdAt doctorId",
      )
      .lean() as any[];

  const sortableQueues =
    activeQueues.filter(
      (item) =>
        !isMissedAppointmentQueue(
          item,
          currentTime,
        ),
    );

  const sortedQueues =
    sortableQueues.sort(
      sortQueueItems(currentTime),
    );

  const servingPatient =
    sortedQueues.find(
      (item) =>
        item.status === "SERVING",
    );

  const targetIndex =
    sortedQueues.findIndex(
      (item) =>
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

  if (servingPatient?.servingAt) {
    const elapsedMinutes =
      (
        now.getTime() -
        new Date(
          servingPatient.servingAt,
        ).getTime()
      ) /
      (60 * 1000);

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

  if (isAppointmentQueue(queue)) {
    const appointmentDateTime =
      buildQueueDateTime(
        queue.queueDate,
        getQueueScheduledStartTime(queue),
      );

    if (
      appointmentDateTime &&
      appointmentDateTime.getTime() >
        estimateBaseTime.getTime()
    ) {
      estimateBaseTime =
        appointmentDateTime;
    }
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
          (60 * 1000),
      ),
    );

  return {
    currentServingToken,
    patientsAhead,
    estimatedWaitTime,
    estimatedTurnTime,
  };
};

const buildAppointmentTrackingData = ({
  queue,
  currentTime,
}: {
  queue: any;
  currentTime: string;
}) => {
  if (!isAppointmentQueue(queue)) {
    return null;
  }

  const scheduledStartTime =
    getQueueScheduledStartTime(queue);

  const scheduledEndTime =
    getQueueScheduledEndTime(queue);

  const appointmentCallStatus =
    queue.appointmentCallStatus === "MISSED"
      ? "MISSED"
      : getAppointmentCallStatus({
          currentTime,
          scheduledStartTime,
          scheduledEndTime,
        });

  let message =
    "This is an appointment token.";

  if (queue.status === "SERVING") {
    message = `Doctor is seeing your appointment patient. Appointment time was ${scheduledStartTime || "not available"}${scheduledEndTime ? ` - ${scheduledEndTime}` : ""}.`;
  } else if (queue.status === "CALLED") {
    message =
      "Your appointment token has been called. Please proceed to the doctor's room.";
  } else if (appointmentCallStatus === "MISSED") {
    message =
      "Your appointment window has ended. Doctor may call manually when available.";
  } else if (appointmentCallStatus === "PRIORITY") {
    message =
      "Your appointment time is active now. Please stay ready near the doctor room.";
  } else if (scheduledStartTime) {
    message = `Your appointment time is ${scheduledStartTime}${scheduledEndTime ? ` - ${scheduledEndTime}` : ""}.`;
  }

  return {
    appointmentCode:
      queue.appointmentId?.appointmentCode ||
      null,

    appointmentTime:
      scheduledStartTime,

    scheduledStartTime,

    scheduledEndTime,

    appointmentCallStatus,

    message,
  };
};

const buildDoctorData = (
  doctor: any,
  fallbackDoctor: any,
) => {
  const source =
    doctor ||
    fallbackDoctor ||
    null;

  if (!source) {
    return null;
  }

  return {
    _id:
      source._id,

    name:
      source.name,

    email:
      source.email,

    isOnline:
      Boolean(source.isOnline),

    shiftStartTime:
      source.shiftStartTime ||
      null,

    shiftEndTime:
      source.shiftEndTime ||
      null,

    departmentId:
      source.departmentId ||
      null,

    lastSeenAt:
      source.lastSeenAt ||
      null,

    isOnBreak:
      Boolean(source.isOnBreak),

    breakStartedAt:
      source.breakStartedAt ||
      null,

    breakReason:
      source.breakReason ||
      null,

    lastResumedAt:
      source.lastResumedAt ||
      null,
  };
};

const buildResponseData = ({
  queue,
  doctor,
  doctorTiming,
  liveEstimate,
  appointment,
  averageConsultationMinutes,
}: {
  queue: any;
  doctor: any;
  doctorTiming: any | null;
  liveEstimate: any;
  appointment: any;
  averageConsultationMinutes: number;
}) => {
  const doctorData =
    buildDoctorData(
      doctor,
      queue.doctorId,
    );

  const doctorOnline =
    Boolean(
      doctorTiming?.isOnline ??
      doctorData?.isOnline,
    );

  const doctorOnBreak =
    Boolean(
      doctorData?.isOnBreak ||
      doctorTiming?.isOnBreak,
    );

  const doctorShiftStartTime =
    doctorTiming?.scheduledStartTime ||
    doctorData?.shiftStartTime ||
    null;

  const doctorShiftEndTime =
    doctorTiming?.scheduledEndTime ||
    doctorData?.shiftEndTime ||
    null;

  const doctorTimingData =
    doctorTiming ||
    doctorData
      ? {
          scheduledStartTime:
            doctorShiftStartTime,

          scheduledEndTime:
            doctorShiftEndTime,

          isOnline:
            doctorOnline,

          isOnBreak:
            doctorOnBreak,

          breakStartedAt:
            doctorData?.breakStartedAt ||
            null,

          breakReason:
            doctorData?.breakReason ||
            null,

          lastResumedAt:
            doctorData?.lastResumedAt ||
            null,

          isLate:
            Boolean(
              doctorTiming?.isLate,
            ),

          lateByMinutes:
            doctorTiming?.lateByMinutes ||
            0,

          firstOnlineAt:
            doctorTiming?.firstOnlineAt ||
            null,

          lastSeenAt:
            doctorTiming?.lastSeenAt ||
            doctorData?.lastSeenAt ||
            null,

          expectedDoctorStartAt:
            doctorTiming?.expectedDoctorStartAt ||
            null,

          averageServiceMinutes:
            doctorTiming?.averageServiceMinutes ||
            averageConsultationMinutes,

          message:
            doctorOnBreak
              ? "Doctor is on break"
              : doctorTiming?.message ||
                "Doctor timing is being updated.",
        }
      : null;

  return {
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
      queue.source ||
      "WALK_IN",

    isAppointment:
      isAppointmentQueue(queue),

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

    doctorOnBreak,

    doctorShiftStartTime,

    doctorShiftEndTime,

    offlineMinutes:
      calculateOfflineMinutes(
        doctorTiming,
        doctorData,
      ),

    doctorTiming:
      doctorTimingData,

    appointment,

    queueDate:
      queue.queueDate,

    createdAt:
      queue.createdAt,

    updatedAt:
      queue.updatedAt,
  };
};

/* ======================================================
   TRACK PATIENT QUEUE
   GET /api/queues/track/:trackingToken
====================================================== */

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

    if (!trackingToken) {
      return res.status(400).json({
        success:
          false,
        message:
          "Tracking token is required",
      });
    }

    const currentTime =
      getIndiaCurrentTime();

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
          "name email isOnline shiftStartTime shiftEndTime departmentId lastSeenAt isOnBreak breakStartedAt breakReason lastResumedAt",
        )
        .populate(
          "appointmentId",
          "appointmentCode requestedStartTime confirmedStartTime endTime paymentStatus status",
        )
        .lean();

    if (!queue) {
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

    await markMissedAppointments({
      hospitalId,
      departmentId,
      queueDate:
        queue.queueDate,
      currentTime,
    });

    if (
      queue.status === "WAITING" &&
      isMissedAppointmentQueue(
        queue,
        currentTime,
      )
    ) {
      queue.appointmentCallStatus =
        "MISSED";

      queue.appointmentMissedAt =
        queue.appointmentMissedAt ||
        new Date();
    }

    const appointment =
      buildAppointmentTrackingData({
        queue,
        currentTime,
      });

    let doctor: any =
      null;

    if (queue.doctorId?._id) {
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
            "name email isOnline shiftStartTime shiftEndTime departmentId lastSeenAt isOnBreak breakStartedAt breakReason lastResumedAt averageConsultationMinutes",
          )
          .lean();
    }

    if (!doctor) {
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
            "name email isOnline shiftStartTime shiftEndTime departmentId lastSeenAt isOnBreak breakStartedAt breakReason lastResumedAt averageConsultationMinutes",
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

    if (doctorId) {
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

    const configuredAverage =
      Number(
        doctor?.averageConsultationMinutes ||
        DEFAULT_CONSULTATION_MINUTES,
      );

    const averageConsultationMinutes =
      Number(
        doctorTiming?.averageServiceMinutes ||
        doctorAverage ||
        departmentAverage ||
        (
          Number.isFinite(configuredAverage) &&
          configuredAverage > 0
            ? configuredAverage
            : DEFAULT_CONSULTATION_MINUTES
        ),
      );

    const liveEstimate =
      await calculateLiveEstimate({
        queue,
        hospitalId,
        departmentId,
        doctorId,
        averageConsultationMinutes,
        doctorTiming,
        currentTime,
      });

    const responseData =
      buildResponseData({
        queue,
        doctor,
        doctorTiming,
        liveEstimate,
        appointment,
        averageConsultationMinutes,
      });

    console.log(
      "=================================",
    );
    console.log(
      "🔎 PATIENT TRACKING",
    );
    console.log(
      "Token:",
      queue.tokenLabel,
    );
    console.log(
      "Doctor:",
      doctor?.name || "Not assigned",
    );
    console.log(
      "Doctor Online:",
      responseData.doctorOnline,
    );
    console.log(
      "Doctor Break:",
      responseData.doctorOnBreak,
    );
    console.log(
      "Appointment:",
      appointment?.scheduledStartTime || "Walk-in",
    );
    console.log(
      "Appointment Status:",
      appointment?.appointmentCallStatus || "N/A",
    );
    console.log(
      "Estimated Wait:",
      liveEstimate.estimatedWaitTime,
    );
    console.log(
      "=================================",
    );

    /*
     * Terminal statuses still return data,
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
          ...responseData,
          doctorOnline:
            false,
          currentServingToken:
            null,
          patientsAhead:
            0,
          estimatedWaitTime:
            0,
          estimatedTurnTime:
            null,
          doctorTiming:
            responseData.doctorTiming,
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
        success:
          false,
        code:
          "TRACKING_EXPIRED",
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

    return res.status(200).json({
      success:
        true,
      data:
        responseData,
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

/* ======================================================
   ALIASES
   Keep old route imports working
====================================================== */

export const trackPatientQueue =
  trackQueue;

export const getQueueTracking =
  trackQueue;

export const getQueueByTrackingToken =
  trackQueue;
