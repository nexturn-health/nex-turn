import type { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";

import { Queue } from "../models/Queue.model";
import { Patient } from "../models/Patient.model";
import { Department } from "../models/Department.model";
import { User } from "../models/User.model";
import { Hospital } from "../models/Hospital.model";
import { Appointment } from "../models/Appointment.model";
import { DoctorSchedule } from "../models/DoctorSchedule.model";

import { getIO } from "../config/socket";

import {
  checkAndSendNearTurnNotifications,
} from "../services/queueNotification.service";

import {
  sendTokenCreatedNotification,
  sendCalledNotification,
} from "../services/notification.service";


const getIndiaQueueDate = () => {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
    },
  ).format(new Date());
};


const normalizeTimeText =
  (
    value?: string | null,
  ): string | null => {
    if (!value) {
      return null;
    }

    const raw =
      String(value)
        .trim()
        .toUpperCase();

    const match =
      raw.match(
        /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/,
      );

    if (!match) {
      return null;
    }

    let hours =
      Number(match[1]);

    const minutes =
      Number(match[2]);

    const meridiem =
      match[3];

    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    if (meridiem) {
      if (
        hours < 1 ||
        hours > 12
      ) {
        return null;
      }

      if (
        meridiem === "PM" &&
        hours !== 12
      ) {
        hours += 12;
      }

      if (
        meridiem === "AM" &&
        hours === 12
      ) {
        hours = 0;
      }
    }

    if (
      hours < 0 ||
      hours > 23
    ) {
      return null;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

const getIndiaCurrentTime = () => {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).formatToParts(new Date());

  const hour =
    parts.find((part) => part.type === "hour")?.value || "00";

  const minute =
    parts.find((part) => part.type === "minute")?.value || "00";

  return `${hour}:${minute}`;
};

const APPOINTMENT_PRIORITY_WINDOW_MINUTES = 15;

type AppointmentCallStatus =
  | "UPCOMING"
  | "PRIORITY"
  | "MISSED";

const timeToMinutes = (
  value?: string | null,
): number | null => {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours > 23 ||
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
    ((minutes % 1440) + 1440) % 1440;

  const hours =
    Math.floor(safeMinutes / 60);

  const mins =
    safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
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

  if (!scheduledStartTime) {
    return null;
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
    timeToMinutes(scheduledStartTime);

  const endTime =
    getAppointmentWindowEndTime(
      scheduledStartTime,
      scheduledEndTime,
    );

  const endMinutes =
    timeToMinutes(endTime);

  const nowMinutes =
    timeToMinutes(currentTime);

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

const markMissedAppointments = async ({
  hospitalId,
  departmentId,
  queueDate,
  currentTime,
}: {
  hospitalId: string | mongoose.Types.ObjectId;
  departmentId: string | mongoose.Types.ObjectId;
  queueDate: string;
  currentTime: string;
}) => {
  const appointmentQueues =
    await Queue.find({
      hospitalId,
      departmentId,
      queueDate,
      status: "WAITING",
      source: "APPOINTMENT",
      $or: [
        {
          appointmentCallStatus: {
            $exists: false,
          },
        },
        {
          appointmentCallStatus: {
            $ne: "MISSED",
          },
        },
      ],
    }).select(
      "_id scheduledStartTime scheduledEndTime appointmentCallStatus appointmentMissedAt",
    );

  let missedCount = 0;

  await Promise.all(
    appointmentQueues.map(async (queue: any) => {
      const scheduledEndTime =
        getAppointmentWindowEndTime(
          queue.scheduledStartTime || null,
          queue.scheduledEndTime || null,
        );

      const nextStatus =
        getAppointmentCallStatus({
          currentTime,
          scheduledStartTime:
            queue.scheduledStartTime || null,
          scheduledEndTime,
        });

      let changed = false;

      if (
        scheduledEndTime &&
        queue.scheduledEndTime !== scheduledEndTime
      ) {
        queue.scheduledEndTime = scheduledEndTime;
        changed = true;
      }

      if (
        nextStatus !== "UPCOMING" &&
        queue.appointmentCallStatus !== nextStatus
      ) {
        queue.appointmentCallStatus = nextStatus;
        changed = true;
      }

      if (nextStatus === "MISSED") {
        missedCount++;

        if (!queue.appointmentMissedAt) {
          queue.appointmentMissedAt = new Date();
          changed = true;
        }
      }

      if (changed) {
        await queue.save();
      }
    }),
  );

  return missedCount;
};

const emitDoctorBreakStatus = async ({
  hospitalId,
  doctorId,
  departmentId,
  isOnBreak,
  breakStartedAt,
  breakReason,
}: {
  hospitalId: string;
  doctorId: string;
  departmentId: string;
  isOnBreak: boolean;
  breakStartedAt?: Date | null;
  breakReason?: string | null;
}) => {
  const queueDate = getIndiaQueueDate();

  const payload = {
    doctorId: String(doctorId),
    departmentId: String(departmentId),
    isOnBreak,
    breakStartedAt: breakStartedAt || null,
    breakReason: breakReason || null,
    message: isOnBreak
      ? "Doctor is on break"
      : "Doctor returned to serve",
  };

  /*
   * 1. Notify doctor/admin dashboard room.
   */
  getIO()
    .to(`hospital:${String(hospitalId)}`)
    .emit("doctor:break-status", payload);

  /*
   * 2. Notify patient tracking pages.
   *
   * Important:
   * Some WAITING queues may not have doctorId assigned yet.
   * So include:
   * - doctorId matching this doctor
   * - doctorId null
   * - doctorId missing
   *
   * This makes patient tracking update even before patient is called.
   */
  const activeQueues = await Queue.find({
    hospitalId,
    departmentId,
    queueDate,
    status: {
      $in: ["WAITING", "CALLED", "SERVING"],
    },
    trackingToken: {
      $exists: true,
      $ne: null,
    },
    $or: [
      {
        doctorId,
      },
      {
        doctorId: null,
      },
      {
        doctorId: {
          $exists: false,
        },
      },
    ],
  })
    .select("_id trackingToken tokenLabel status doctorId")
    .lean();

  activeQueues.forEach((queue: any) => {
    getIO()
      .to(`queue:${queue.trackingToken}`)
      .emit("queue:doctor-status", {
        ...payload,
        queueId: queue._id,
        tokenLabel: queue.tokenLabel,
        trackingToken: queue.trackingToken,
      });
  });

  console.log("📡 Doctor break status emitted:", {
    hospitalId,
    doctorId,
    departmentId,
    isOnBreak,
    patientsNotified: activeQueues.length,
  });
};
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


const getIndiaDateRange = (
  queueDate: string,
) => {
  const start = new Date(
    `${queueDate}T00:00:00.000+05:30`,
  );

  const end = new Date(
    `${queueDate}T23:59:59.999+05:30`,
  );

  return {
    start,
    end,
  };
};

type AppointmentAwareEstimateItem = {
  _id?: unknown;
  tokenNumber: number;
  tokenLabel?: string;
  priority: "NORMAL" | "EMERGENCY";
  source: "WALK_IN" | "APPOINTMENT" | "EMERGENCY";
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  appointmentCallStatus?: AppointmentCallStatus;
  isVirtualNewToken?: boolean;
};

type DoctorDutyValidationResult = {
  allowed: boolean;
  code:
    | "DOCTOR_AVAILABLE"
    | "DOCTOR_SHIFT_END_MISSING"
    | "INVALID_DOCTOR_SHIFT_END"
    | "DOCTOR_DUTY_ENDED";
  message: string;
  currentTime: string;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
};

type RawDoctorSession = {
  startTime?: string | null;
  endTime?: string | null;
  from?: string | null;
  to?: string | null;
  start?: string | null;
  end?: string | null;
  fromTime?: string | null;
  toTime?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  slotStartTime?: string | null;
  slotEndTime?: string | null;
  slotType?: string | null;
};

type RawDoctorDaySchedule = {
  day?: string | number | null;
  dayOfWeek?: string | number | null;
  isAvailable?: boolean;
  available?: boolean;
  sessions?: RawDoctorSession[] | null;
  slots?: RawDoctorSession[] | null;
  timeSlots?: RawDoctorSession[] | null;
};

type NormalizedDoctorSession = {
  startTime: string;
  endTime: string;
};

const getIndiaTodayDayName = () => {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    },
  )
    .format(new Date())
    .toUpperCase();
};

const normalizeDayNameForSchedule = (
  value?: string | number | null,
): string => {
  const dayMap: Record<string, string> = {
    "0": "SUNDAY",
    "1": "MONDAY",
    "2": "TUESDAY",
    "3": "WEDNESDAY",
    "4": "THURSDAY",
    "5": "FRIDAY",
    "6": "SATURDAY",
    SUN: "SUNDAY",
    SUNDAY: "SUNDAY",
    MON: "MONDAY",
    MONDAY: "MONDAY",
    TUE: "TUESDAY",
    TUESDAY: "TUESDAY",
    WED: "WEDNESDAY",
    WEDNESDAY: "WEDNESDAY",
    THU: "THURSDAY",
    THURSDAY: "THURSDAY",
    FRI: "FRIDAY",
    FRIDAY: "FRIDAY",
    SAT: "SATURDAY",
    SATURDAY: "SATURDAY",
  };

  const key =
    String(value ?? "")
      .trim()
      .toUpperCase();

  return dayMap[key] || key;
};

const getDoctorWeeklyAvailability = (
  doctor: any,
): RawDoctorDaySchedule[] => {
  const possibleSources = [
    doctor?.schedule?.weeklyAvailability,
    doctor?.weeklyAvailability,
    doctor?.availability?.weeklyAvailability,
    doctor?.doctorAvailability?.weeklyAvailability,
    doctor?.doctorSchedule?.weeklyAvailability,
  ];

  const arraySource =
    possibleSources.find(
      (
        item,
      ): item is RawDoctorDaySchedule[] =>
        Array.isArray(item),
    );

  if (
    arraySource
  ) {
    return arraySource;
  }

  return [];
};

const getTodayScheduleShift = (
  doctor: any,
): {
  shiftStartTime: string | null;
  shiftEndTime: string | null;
} => {
  const today =
    getIndiaTodayDayName();

  const weeklyAvailability =
    getDoctorWeeklyAvailability(
      doctor,
    );

  if (
    !Array.isArray(weeklyAvailability) ||
    weeklyAvailability.length === 0
  ) {
    return {
      shiftStartTime: null,
      shiftEndTime: null,
    };
  }

  const todaySchedule =
    weeklyAvailability.find(
      (
        item: RawDoctorDaySchedule,
      ) => {
        const day =
          normalizeDayNameForSchedule(
            item.day ??
              item.dayOfWeek ??
              null,
          );

        return (
          day === today &&
          item?.isAvailable !== false &&
          item?.available !== false
        );
      },
    );

  const sessions: RawDoctorSession[] =
    Array.isArray(
      todaySchedule?.sessions,
    )
      ? todaySchedule.sessions
      : Array.isArray(
          todaySchedule?.slots,
        )
        ? todaySchedule.slots
        : Array.isArray(
            todaySchedule?.timeSlots,
          )
          ? todaySchedule.timeSlots
          : [];

  const validSessions: NormalizedDoctorSession[] =
    sessions
      .map(
        (
          session: RawDoctorSession,
        ): {
          startTime: string | null;
          endTime: string | null;
        } => {
          return {
            startTime:
              normalizeTimeText(
                session.startTime ||
                  session.from ||
                  session.start ||
                  session.fromTime ||
                  session.start_time ||
                  session.slotStartTime ||
                  null,
              ),

            endTime:
              normalizeTimeText(
                session.endTime ||
                  session.to ||
                  session.end ||
                  session.toTime ||
                  session.end_time ||
                  session.slotEndTime ||
                  null,
              ),
          };
        },
      )
      .filter(
        (
          session,
        ): session is NormalizedDoctorSession => {
          return Boolean(
            session.startTime &&
              session.endTime,
          );
        },
      )
      .sort(
        (
          first: NormalizedDoctorSession,
          second: NormalizedDoctorSession,
        ) => {
          const firstStart =
            timeToMinutes(
              first.startTime,
            ) ??
            Number.MAX_SAFE_INTEGER;

          const secondStart =
            timeToMinutes(
              second.startTime,
            ) ??
            Number.MAX_SAFE_INTEGER;

          return (
            firstStart -
            secondStart
          );
        },
      );

  if (
    !validSessions.length
  ) {
    return {
      shiftStartTime: null,
      shiftEndTime: null,
    };
  }

  return {
    shiftStartTime:
      validSessions[0].startTime,

    shiftEndTime:
      validSessions[
        validSessions.length - 1
      ].endTime,
  };
};

const validateDoctorDutyTime =
  ({
    doctor,
  }: {
    doctor: any;
  }): DoctorDutyValidationResult => {
    const scheduleShift =
      getTodayScheduleShift(
        doctor,
      );

    const shiftStartTime =
      normalizeTimeText(
        doctor?.shiftStartTime,
      ) ||
      scheduleShift.shiftStartTime;

    const shiftEndTime =
      normalizeTimeText(
        doctor?.shiftEndTime,
      ) ||
      scheduleShift.shiftEndTime;

    const currentTime =
      getIndiaCurrentTime();

    const currentMinutes =
      timeToMinutes(
        currentTime,
      );

    const endMinutes =
      timeToMinutes(
        shiftEndTime,
      );

    if (
      !shiftEndTime
    ) {
      return {
        allowed: false,

        code:
          "DOCTOR_SHIFT_END_MISSING",

        message:
          "Doctor timing is not configured for today. Please reset doctor availability with start time and end time.",

        currentTime,

        shiftStartTime,

        shiftEndTime: null,
      };
    }

    if (
      currentMinutes === null ||
      endMinutes === null
    ) {
      return {
        allowed: false,

        code:
          "INVALID_DOCTOR_SHIFT_END",

        message:
          "Doctor shift end time format is invalid. Use HH:mm format, for example 17:00.",

        currentTime,

        shiftStartTime,

        shiftEndTime,
      };
    }

    if (
      currentMinutes >= endMinutes
    ) {
      return {
        allowed: false,

        code:
          "DOCTOR_DUTY_ENDED",

        message:
          `Doctor duty ended at ${shiftEndTime}. Token generation is closed for this doctor.`,

        currentTime,

        shiftStartTime,

        shiftEndTime,
      };
    }

    return {
      allowed: true,

      code:
        "DOCTOR_AVAILABLE",

      message:
        "Doctor is available.",

      currentTime,

      shiftStartTime,

      shiftEndTime,
    };
  };

const getTokenLabel = ({
  tokenPrefix,
  tokenNumber,
  source,
}: {
  tokenPrefix?: string | null;
  tokenNumber: number;
  source: "WALK_IN" | "APPOINTMENT" | "EMERGENCY";
}) => {
  const prefix =
    tokenPrefix ||
    "OPD";

  const sourceCode =
    source === "APPOINTMENT"
      ? "A"
      : source === "EMERGENCY"
        ? "E"
        : "W";

  return `${prefix}-${sourceCode}${String(tokenNumber).padStart(3, "0")}`;
};

const buildAppointmentAwareEstimate = async ({
  hospitalId,
  departmentId,
  doctorId,
  queueDate,
  tokenNumber,
  priority,
  averageConsultationMinutes,
  doctorShiftStartTime,
}: {
  hospitalId: string | mongoose.Types.ObjectId;
  departmentId: string | mongoose.Types.ObjectId;
  doctorId?: string | mongoose.Types.ObjectId | null;
  queueDate: string;
  tokenNumber: number;
  priority: "NORMAL" | "EMERGENCY";
  averageConsultationMinutes: number;
  doctorShiftStartTime?: string | null;
}) => {
  const now =
    new Date();

  const currentTime =
    getIndiaCurrentTime();

  const nowMinutes =
    timeToMinutes(
      currentTime,
    ) || 0;

  const shiftStartMinutes =
    timeToMinutes(
      doctorShiftStartTime || null,
    );

  let pointer =
    shiftStartMinutes !== null &&
      nowMinutes < shiftStartMinutes
      ? shiftStartMinutes
      : nowMinutes;

  const doctorFilter = doctorId
    ? {
      $or: [
        {
          doctorId,
        },
        {
          doctorId: null,
        },
        {
          doctorId: {
            $exists: false,
          },
        },
      ],
    }
    : {};

  const activeQueues =
    await Queue.find({
      hospitalId,
      departmentId,
      queueDate,
      status: {
        $in: [
          "WAITING",
          "CALLED",
          "SERVING",
        ],
      },
      ...doctorFilter,
    })
      .select(
        "_id tokenNumber tokenLabel priority source scheduledStartTime scheduledEndTime appointmentCallStatus",
      )
      .lean();

  const {
    start,
    end,
  } = getIndiaDateRange(
    queueDate,
  );

  const appointmentQuery: any = {
    hospitalId,
    departmentId,
    appointmentDate: {
      $gte: start,
      $lte: end,
    },
    status: {
      $in: [
        "BOOKED",
        "CONFIRMED",
        "ARRIVED",
        "CHECKED_IN",
      ],
    },
  };

  if (doctorId) {
    appointmentQuery.doctorId = doctorId;
  }

  const bookedAppointments =
    await Appointment.find(
      appointmentQuery,
    )
      .select(
        "_id appointmentCode requestedStartTime confirmedStartTime endTime queueId",
      )
      .lean();

  const queueItems: AppointmentAwareEstimateItem[] =
    activeQueues
      .filter((queue: any) => {
        return !(
          queue.source === "APPOINTMENT" &&
          queue.appointmentCallStatus === "MISSED"
        );
      })
      .map((queue: any) => {
        const source =
          queue.priority === "EMERGENCY"
            ? "EMERGENCY"
            : queue.source || "WALK_IN";

        const scheduledStartTime =
          queue.scheduledStartTime || null;

        const scheduledEndTime =
          source === "APPOINTMENT"
            ? getAppointmentWindowEndTime(
              scheduledStartTime,
              queue.scheduledEndTime || null,
            )
            : null;

        return {
          _id: queue._id,
          tokenNumber:
            Number(queue.tokenNumber || 0),
          tokenLabel:
            queue.tokenLabel,
          priority:
            queue.priority === "EMERGENCY"
              ? "EMERGENCY"
              : "NORMAL",
          source,
          scheduledStartTime,
          scheduledEndTime,
          appointmentCallStatus:
            source === "APPOINTMENT"
              ? getAppointmentCallStatus({
                currentTime,
                scheduledStartTime,
                scheduledEndTime,
              })
              : undefined,
        };
      });

  const bookedAppointmentItems: AppointmentAwareEstimateItem[] =
    bookedAppointments
      .filter(
        (
          appointment: any,
        ) =>
          !appointment.queueId,
      )
      .map(
        (
          appointment: any,
          index: number,
        ): AppointmentAwareEstimateItem => {
          const scheduledStartTime =
            appointment.confirmedStartTime ||
            appointment.requestedStartTime ||
            null;

          const scheduledEndTime =
            appointment.endTime ||
            getAppointmentWindowEndTime(
              scheduledStartTime,
              null,
            );

          return {
            _id:
              appointment._id,

            tokenNumber:
              100000 + index,

            tokenLabel:
              appointment.appointmentCode,

            priority:
              "NORMAL" as const,

            source:
              "APPOINTMENT" as const,

            scheduledStartTime,

            scheduledEndTime,

            appointmentCallStatus:
              getAppointmentCallStatus({
                currentTime,

                scheduledStartTime,

                scheduledEndTime,
              }),
          };
        },
      ).filter((item) => item.appointmentCallStatus !== "MISSED");

  const virtualNewToken: AppointmentAwareEstimateItem = {
    tokenNumber,
    tokenLabel: "NEW",
    priority,
    source:
      priority === "EMERGENCY"
        ? "EMERGENCY"
        : "WALK_IN",
    isVirtualNewToken: true,
  };

  const pendingItems = [
    ...queueItems,
    ...bookedAppointmentItems,
    virtualNewToken,
  ];

  const removeAt = (
    index: number,
  ) => {
    pendingItems.splice(
      index,
      1,
    );
  };

  let safety =
    0;

  while (
    pendingItems.length &&
    safety < 1000
  ) {
    safety++;

    for (let index = pendingItems.length - 1; index >= 0; index--) {
      const item = pendingItems[index];

      if (item.source !== "APPOINTMENT") {
        continue;
      }

      const status =
        getAppointmentCallStatus({
          currentTime:
            minutesToTime(pointer),
          scheduledStartTime:
            item.scheduledStartTime || null,
          scheduledEndTime:
            item.scheduledEndTime || null,
        });

      item.appointmentCallStatus = status;

      if (status === "MISSED") {
        removeAt(index);
      }
    }

    const emergencyIndex =
      pendingItems.findIndex(
        (item) =>
          item.priority === "EMERGENCY" ||
          item.source === "EMERGENCY",
      );

    if (emergencyIndex >= 0) {
      const selected = pendingItems[emergencyIndex];

      if (selected.isVirtualNewToken) {
        break;
      }

      removeAt(emergencyIndex);
      pointer += averageConsultationMinutes;
      continue;
    }

    const activeAppointments =
      pendingItems
        .map((item, index) => ({
          item,
          index,
        }))
        .filter(({ item }) => {
          if (item.source !== "APPOINTMENT") {
            return false;
          }

          const startMinutes =
            timeToMinutes(
              item.scheduledStartTime || null,
            );

          const endMinutes =
            timeToMinutes(
              item.scheduledEndTime || null,
            );

          return (
            startMinutes !== null &&
            pointer >= startMinutes &&
            (
              endMinutes === null ||
              pointer < endMinutes
            )
          );
        })
        .sort((first, second) => {
          const firstStart =
            timeToMinutes(
              first.item.scheduledStartTime || null,
            ) ?? Number.MAX_SAFE_INTEGER;

          const secondStart =
            timeToMinutes(
              second.item.scheduledStartTime || null,
            ) ?? Number.MAX_SAFE_INTEGER;

          return (
            firstStart - secondStart ||
            first.item.tokenNumber - second.item.tokenNumber
          );
        });

    if (activeAppointments.length) {
      const selected = activeAppointments[0];

      removeAt(selected.index);
      pointer += averageConsultationMinutes;
      continue;
    }

    const walkIns =
      pendingItems
        .map((item, index) => ({
          item,
          index,
        }))
        .filter(({ item }) => item.source !== "APPOINTMENT")
        .sort(
          (first, second) =>
            first.item.tokenNumber - second.item.tokenNumber,
        );

    const nextUpcomingAppointment =
      pendingItems
        .filter((item) => item.source === "APPOINTMENT")
        .map((item) => ({
          item,
          start:
            timeToMinutes(
              item.scheduledStartTime || null,
            ),
        }))
        .filter(
          (entry) =>
            entry.start !== null &&
            entry.start > pointer,
        )
        .sort(
          (first, second) =>
            Number(first.start) - Number(second.start),
        )[0];

    if (walkIns.length) {
      const selected = walkIns[0];

      if (
        nextUpcomingAppointment &&
        typeof nextUpcomingAppointment.start === "number" &&
        nextUpcomingAppointment.start < pointer + averageConsultationMinutes
      ) {
        pointer = nextUpcomingAppointment.start;
        continue;
      }

      if (selected.item.isVirtualNewToken) {
        break;
      }

      removeAt(selected.index);
      pointer += averageConsultationMinutes;
      continue;
    }

    if (
      nextUpcomingAppointment &&
      typeof nextUpcomingAppointment.start === "number"
    ) {
      pointer = nextUpcomingAppointment.start;
      continue;
    }

    break;
  }

  const waitMinutes =
    Math.max(
      0,
      pointer - nowMinutes,
    );

  return {
    estimatedWaitTime:
      waitMinutes,

    estimatedTurnTime:
      new Date(
        now.getTime() +
        waitMinutes *
        60 *
        1000,
      ),
  };
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

    const queueDate = getIndiaQueueDate();

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
    const hospitalId = req.user?.hospitalId;

    if (!doctorId || !hospitalId) {
      return res.status(401).json({
        success: false,
        message: "Doctor authentication required",
      });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      hospitalId,
      role: "DOCTOR",
      isActive: true,
    })
      .select(
        "_id name email departmentId isOnline isOnBreak breakStartedAt breakReason lastResumedAt shiftStartTime shiftEndTime",
      )
      .lean();

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    if (!doctor.departmentId) {
      return res.status(400).json({
        success: false,
        message: "Doctor has no department assigned",
      });
    }

    const queueDate = getIndiaQueueDate();
    const currentTime = getIndiaCurrentTime();
    const departmentId = doctor.departmentId;

    await markMissedAppointments({
      hospitalId,
      departmentId,
      queueDate,
      currentTime,
    });

    const queues = await Queue.find({
      hospitalId,
      departmentId,
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
      $or: [
        { doctorId },
        { doctorId: null },
        { doctorId: { $exists: false } },
      ],
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
        "name email isOnline isOnBreak breakStartedAt breakReason lastResumedAt shiftStartTime shiftEndTime",
      )
      .populate(
        "appointmentId",
        "appointmentCode requestedStartTime confirmedStartTime endTime status paymentStatus",
      )
      .sort({
        tokenNumber: 1,
      })
      .lean();

    const data = queues.map((queue: any) => {
      const appointment =
        queue.appointmentId &&
          typeof queue.appointmentId === "object"
          ? queue.appointmentId
          : null;

      const scheduledStartTime =
        queue.scheduledStartTime ||
        appointment?.confirmedStartTime ||
        appointment?.requestedStartTime ||
        null;

      const scheduledEndTime =
        getAppointmentWindowEndTime(
          scheduledStartTime,
          queue.scheduledEndTime ||
          appointment?.endTime ||
          null,
        );

      const isAppointment =
        queue.source === "APPOINTMENT" ||
        Boolean(queue.appointmentId) ||
        String(queue.tokenLabel || "").includes("-A");

      const appointmentCallStatus =
        isAppointment && queue.status === "WAITING"
          ? getAppointmentCallStatus({
            currentTime,
            scheduledStartTime,
            scheduledEndTime,
          })
          : queue.appointmentCallStatus || null;

      return {
        _id: queue._id,
        tokenNumber: queue.tokenNumber,
        tokenLabel: queue.tokenLabel,
        priority: queue.priority,
        source: queue.source || "WALK_IN",
        status: queue.status,
        patient: queue.patientId,
        patientId: queue.patientId,
        departmentId: queue.departmentId,
        doctorId: queue.doctorId || {
          _id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          isOnline: Boolean((doctor as any).isOnline),
          isOnBreak: Boolean((doctor as any).isOnBreak),
          breakStartedAt: (doctor as any).breakStartedAt || null,
          breakReason: (doctor as any).breakReason || null,
          lastResumedAt: (doctor as any).lastResumedAt || null,
          shiftStartTime: (doctor as any).shiftStartTime || null,
          shiftEndTime: (doctor as any).shiftEndTime || null,
        },
        appointmentId: appointment,
        appointmentCode: appointment?.appointmentCode || null,
        scheduledStartTime,
        scheduledEndTime,
        appointmentCallStatus,
        appointmentMissedAt: queue.appointmentMissedAt || null,
        manuallyCalledAfterMissedAt: queue.manuallyCalledAfterMissedAt || null,
        isAppointment,
        isEmergency:
          queue.priority === "EMERGENCY" ||
          queue.source === "EMERGENCY",
        estimatedWaitMinutes: queue.estimatedWaitMinutes,
        estimatedWaitTime: queue.estimatedWaitTime,
        estimatedTurnTime: queue.estimatedTurnTime,
        calledAt: queue.calledAt,
        servingAt: queue.servingAt,
        completedAt: queue.completedAt,
        createdAt: queue.createdAt,
        updatedAt: queue.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      doctorStatus: {
        doctorId: String(doctor._id),
        departmentId: doctor.departmentId
          ? String(doctor.departmentId)
          : null,
        isOnline: Boolean((doctor as any).isOnline),
        isOnBreak: Boolean((doctor as any).isOnBreak),
        breakStartedAt: (doctor as any).breakStartedAt || null,
        breakReason: (doctor as any).breakReason || null,
        lastResumedAt: (doctor as any).lastResumedAt || null,
        shiftStartTime: (doctor as any).shiftStartTime || null,
        shiftEndTime: (doctor as any).shiftEndTime || null,
      },
      data,
    });
  } catch (error) {
    console.error("❌ GET DOCTOR QUEUE ERROR:", error);

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
      doctorId: requestedDoctorId,
      priority = "NORMAL",
    } = req.body;

    const normalizedPriority =
      String(
        priority || "NORMAL",
      ).toUpperCase();

    if (
      !patientId ||
      !departmentId
    ) {
      return res.status(400).json({
        success: false,
        message: "Patient ID and department ID are required",
      });
    }

    if (
      !requestedDoctorId
    ) {
      return res.status(400).json({
        success: false,
        code: "DOCTOR_REQUIRED",
        message: "Select doctor before generating token.",
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

    if (
      !mongoose.Types.ObjectId.isValid(
        requestedDoctorId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const hospitalId =
      req.user?.hospitalId;

    if (
      !hospitalId
    ) {
      return res.status(401).json({
        success: false,
        message: "Hospital information not found",
      });
    }

    const queueDate =
      getIndiaQueueDate();

    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    if (
      ![
        "NORMAL",
        "EMERGENCY",
      ].includes(
        normalizedPriority,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Priority must be NORMAL or EMERGENCY",
      });
    }

    const patient =
      await Patient.findOne({
        _id: patientId,
        hospitalId,
      }).lean();

    if (
      !patient
    ) {
      return res.status(404).json({
        success: false,
        message: "Patient not found in your hospital",
      });
    }

    const department =
      await Department.findOne({
        _id: departmentId,
        hospitalId,
        isActive: true,
      }).lean();

    if (
      !department
    ) {
      return res.status(404).json({
        success: false,
        message: "Department not found or inactive",
      });
    }

    /*
     * Important:
     * If queue was already created but frontend/API failed before showing success,
     * return existing token instead of throwing error and confusing reception.
     */
    const existingSameDepartmentVisit =
      await Queue.findOne({
        hospitalId,
        patientId,
        departmentId,
        queueDate,
        status: {
          $nin: [
            "CANCELLED",
            "COMPLETED",
            "SKIPPED",
          ],
        },
      })
        .select(
          "_id tokenLabel trackingToken estimatedWaitTime estimatedTurnTime",
        )
        .lean();

    if (
      existingSameDepartmentVisit
    ) {
      const existingPopulatedQueue =
        await Queue.findById(
          existingSameDepartmentVisit._id,
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
            "name email isOnline isOnBreak breakStartedAt breakReason shiftStartTime shiftEndTime",
          )
          .populate(
            "appointmentId",
            "appointmentCode requestedStartTime confirmedStartTime endTime status paymentStatus",
          );

      const existingTrackingUrl =
        existingSameDepartmentVisit.trackingToken
          ? `${clientUrl}/track/${existingSameDepartmentVisit.trackingToken}`
          : null;

      return res.status(200).json({
        success: true,
        code: "TOKEN_ALREADY_EXISTS",
        message:
          `This patient already has token ${existingSameDepartmentVisit.tokenLabel} today in this department.`,
        data: {
          queue:
            existingPopulatedQueue ||
            existingSameDepartmentVisit,
          trackingUrl:
            existingTrackingUrl,
          estimatedWaitTime:
            existingSameDepartmentVisit.estimatedWaitTime || 0,
          estimatedTurnTime:
            existingSameDepartmentVisit.estimatedTurnTime || null,
        },
      });
    }

    const departmentDoctor =
      await User.findOne({
        _id: requestedDoctorId,
        hospitalId,
        departmentId,
        role: "DOCTOR",
        isActive: true,
      })
        .select(
          "name email isOnline shiftStartTime shiftEndTime averageConsultationMinutes isOnBreak breakStartedAt breakReason",
        )
        .lean();

    if (
      !departmentDoctor
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Selected doctor is not available for this department.",
      });
    }

    /*
     * Main fix:
     * Reset availability is saved in DoctorSchedule collection,
     * not directly inside User document.
     * So fetch DoctorSchedule here before validating doctor timing.
     */
    const doctorSchedule =
      await DoctorSchedule.findOne({
        hospitalId,
        doctorId:
          new mongoose.Types.ObjectId(
            String(requestedDoctorId),
          ),
      }).lean();

    const doctor = {
      ...(departmentDoctor as any),
      schedule:
        doctorSchedule ||
        (departmentDoctor as any).schedule ||
        null,
    };

    console.log(
      "🩺 CREATE TOKEN DOCTOR TIMING DEBUG",
      {
        doctorId:
          String(
            doctor._id,
          ),
        doctorName:
          doctor.name,
        hasDirectShiftEndTime:
          Boolean(
            doctor.shiftEndTime,
          ),
        hasDoctorSchedule:
          Boolean(
            doctorSchedule,
          ),
        today:
          getIndiaTodayDayName(),
        weeklyAvailabilityDays:
          Array.isArray(
            doctorSchedule?.weeklyAvailability,
          )
            ? doctorSchedule.weeklyAvailability.map(
                (
                  item: any,
                ) => ({
                  day:
                    item.day,
                  isAvailable:
                    item.isAvailable,
                  sessions:
                    item.sessions,
                }),
              )
            : [],
      },
    );

    const dutyValidation =
      validateDoctorDutyTime({
        doctor,
      });

    if (
      !dutyValidation.allowed
    ) {
      console.log(
        "🚫 TOKEN BLOCKED BY DOCTOR DUTY TIME",
        {
          doctorId:
            String(
              doctor._id,
            ),

          doctorName:
            doctor.name,

          currentTime:
            dutyValidation.currentTime,

          shiftStartTime:
            dutyValidation.shiftStartTime,

          shiftEndTime:
            dutyValidation.shiftEndTime,

          code:
            dutyValidation.code,
        },
      );

      return res.status(409).json({
        success: false,
        code:
          dutyValidation.code,
        message:
          dutyValidation.message,
        data: {
          doctorId:
            String(
              doctor._id,
            ),
          doctorName:
            doctor.name,
          currentTime:
            dutyValidation.currentTime,
          shiftStartTime:
            dutyValidation.shiftStartTime,
          shiftEndTime:
            dutyValidation.shiftEndTime,
          hasDoctorSchedule:
            Boolean(
              doctorSchedule,
            ),
        },
      });
    }

    await markMissedAppointments({
      hospitalId,
      departmentId,
      queueDate,
      currentTime:
        getIndiaCurrentTime(),
    });

    const doctorAverage =
      doctor._id
        ? await getDoctorAverageConsultationMinutes(
            doctor._id,
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
        doctor.averageConsultationMinutes ||
          DEFAULT_CONSULTATION_MINUTES,
      );

    const averageConsultationMinutes =
      doctorAverage ??
      departmentAverage ??
      (
        Number.isFinite(
          configuredAverage,
        ) &&
        configuredAverage > 0
          ? configuredAverage
          : DEFAULT_CONSULTATION_MINUTES
      );

    const queueSource:
      | "WALK_IN"
      | "EMERGENCY" =
      normalizedPriority === "EMERGENCY"
        ? "EMERGENCY"
        : "WALK_IN";

    const trackingToken =
      crypto
        .randomBytes(
          32,
        )
        .toString(
          "hex",
        );

    const trackingExpiresAt =
      new Date(
        Date.now() +
          24 *
            60 *
            60 *
            1000,
      );

    let queue: any = null;
    let tokenLabel = "";
    let estimate: {
      estimatedWaitTime: number;
      estimatedTurnTime: Date;
    } | null = null;

    /*
     * Token number fix:
     * Never reserve token before validation.
     * Retry if two clicks happen at same time and duplicate key occurs.
     */
    for (
      let attempt = 1;
      attempt <= 5;
      attempt++
    ) {
      const lastQueue =
        await Queue.findOne({
          hospitalId,
          departmentId,
          queueDate,
        })
          .sort({
            tokenNumber:
              -1,
          })
          .select(
            "tokenNumber",
          )
          .lean();

      const nextTokenNumber =
        lastQueue
          ? Number(
              lastQueue.tokenNumber,
            ) + 1
          : 1;

      tokenLabel =
        getTokenLabel({
          tokenPrefix:
            department.tokenPrefix,
          tokenNumber:
            nextTokenNumber,
          source:
            queueSource,
        });

      estimate =
        await buildAppointmentAwareEstimate({
          hospitalId,
          departmentId,
          doctorId:
            doctor._id,
          queueDate,
          tokenNumber:
            nextTokenNumber,
          priority:
            normalizedPriority as
              | "NORMAL"
              | "EMERGENCY",
          averageConsultationMinutes,
          doctorShiftStartTime:
            dutyValidation.shiftStartTime,
        });

      const now =
        new Date();

      try {
        queue =
          await Queue.create({
            hospitalId,
            patientId,
            departmentId,
            doctorId:
              doctor._id,
            appointmentId:
              null,
            source:
              queueSource,
            scheduledStartTime:
              null,
            scheduledEndTime:
              null,
            appointmentCallStatus:
              undefined,
            appointmentMissedAt:
              null,
            manuallyCalledAfterMissedAt:
              null,
            sortTime:
              now,
            tokenNumber:
              nextTokenNumber,
            tokenLabel,
            priority:
              normalizedPriority as
                | "NORMAL"
                | "EMERGENCY",
            status:
              "WAITING",
            queueDate,
            paymentStatus:
              "PAID",
            arrivedAt:
              now,
            checkedInAt:
              now,
            estimatedWaitTime:
              estimate.estimatedWaitTime,
            estimatedTurnTime:
              estimate.estimatedTurnTime,
            serviceDurationMinutes:
              null,
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
            calledAt:
              null,
            servingAt:
              null,
            completedAt:
              null,
          });

        break;
      } catch (
        error: any
      ) {
        const duplicateKey =
          error?.code === 11000;

        if (
          duplicateKey &&
          attempt < 5
        ) {
          console.warn(
            "⚠️ Duplicate token number detected. Retrying token generation...",
            {
              attempt,
              tokenLabel,
            },
          );

          continue;
        }

        throw error;
      }
    }

    if (
      !queue ||
      !estimate
    ) {
      throw new Error(
        "Unable to create queue token after retry.",
      );
    }

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
          "name email isOnline isOnBreak breakStartedAt breakReason shiftStartTime shiftEndTime",
        )
        .populate(
          "appointmentId",
          "appointmentCode requestedStartTime confirmedStartTime endTime status paymentStatus",
        );

    const trackingUrl =
      `${clientUrl}/track/${trackingToken}`;

    const patientData =
      populatedQueue?.patientId &&
      typeof populatedQueue.patientId === "object"
        ? populatedQueue.patientId as unknown as PopulatedPatient
        : null;

    const departmentData =
      populatedQueue?.departmentId &&
      typeof populatedQueue.departmentId === "object"
        ? populatedQueue.departmentId as unknown as PopulatedDepartment
        : null;

    const doctorData: PopulatedDoctor = {
      _id:
        doctor._id,
      name:
        doctor.name,
      email:
        doctor.email,
    };

    const hospitalData =
      await Hospital.findById(
        hospitalId,
      )
        .select(
          "name",
        )
        .lean();

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
      "Doctor";

    const notificationEmail =
      patientData?.email ||
      process.env.TEST_PATIENT_EMAIL ||
      "akash0001tech@gmail.com";

    const notificationPhone =
      patientData?.phone ||
      patient.phone;

    const notificationPayload = {
      phone:
        notificationPhone,

      email:
        String(
          notificationEmail || "",
        )
          .trim()
          .toLowerCase(),

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

      estimatedWaitTime:
        estimate.estimatedWaitTime,

      doctorShiftStartTime:
        dutyValidation.shiftStartTime,

      averageConsultationMinutes,
    };

    console.log(
      "=================================",
    );
    console.log(
      "🎫 QUEUE TOKEN CREATED",
    );
    console.log(
      "Token:",
      tokenLabel,
    );
    console.log(
      "Source:",
      queueSource,
    );
    console.log(
      "Doctor:",
      finalDoctorName,
    );
    console.log(
      "Doctor duty start:",
      dutyValidation.shiftStartTime ||
        "Not configured",
    );
    console.log(
      "Doctor duty end:",
      dutyValidation.shiftEndTime ||
        "Not configured",
    );
    console.log(
      "Current India time:",
      getIndiaCurrentTime(),
    );
    console.log(
      "Estimated Wait:",
      estimate.estimatedWaitTime,
    );
    console.log(
      "Estimated Turn:",
      estimate.estimatedTurnTime,
    );
    console.log(
      "=================================",
    );

    void sendTokenCreatedNotification(
      notificationPayload,
    )
      .then(
        async (
          notificationResult,
        ) => {
          if (
            notificationResult.success
          ) {
            await Queue.findByIdAndUpdate(
              queue._id,
              {
                $set: {
                  tokenNotificationSent:
                    true,
                },
              },
            );
          }
        },
      )
      .catch(
        (
          error,
        ) => {
          console.error(
            "❌ Background token notification crashed:",
            error,
          );
        },
      );

    getIO()
      .to(
        `hospital:${hospitalId}`,
      )
      .emit(
        "queue:created",
        populatedQueue,
      );

    return res.status(201).json({
      success: true,

      message:
        "Patient added to queue successfully",

      data: {
        queue:
          populatedQueue,

        trackingUrl,

        estimatedWaitTime:
          estimate.estimatedWaitTime,

        estimatedTurnTime:
          estimate.estimatedTurnTime,

        averageConsultationMinutes,

        doctorOnline:
          doctor.isOnline === true,

        doctorOnBreak:
          doctor.isOnBreak === true,

        doctorShiftStartTime:
          dutyValidation.shiftStartTime,

        doctorShiftEndTime:
          dutyValidation.shiftEndTime,
      },
    });
  } catch (
    error: any
  ) {
    console.error(
      "❌ Create queue error:",
      error,
    );

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_TOKEN_RETRY_FAILED",
        message:
          "Token number conflict happened. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
    const hospitalId = req.user?.hospitalId;
    const doctorId = req.user?.userId;

    if (!hospitalId || !doctorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication information missing",
      });
    }

    const queueDate = getIndiaQueueDate();
    const currentTime = getIndiaCurrentTime();

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

    if (!doctor.departmentId) {
      return res.status(400).json({
        success: false,
        message: "Doctor has no department assigned",
      });
    }

    if (doctor.isOnBreak) {
      return res.status(409).json({
        success: false,
        code: "DOCTOR_ON_BREAK",
        message: "You are on break. Resume duty before calling the next patient.",
        data: {
          isOnBreak: true,
          breakStartedAt: doctor.breakStartedAt,
          breakReason: doctor.breakReason,
        },
      });
    }

    const departmentId = doctor.departmentId;

    await markMissedAppointments({
      hospitalId,
      departmentId,
      queueDate,
      currentTime,
    });

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
        message: "You already have a patient in progress",
        data: currentPatient,
      });
    }

    const doctorOwnershipFilter = {
      $or: [
        { doctorId },
        { doctorId: null },
        { doctorId: { $exists: false } },
      ],
    };

    const commonUpdate = {
      $set: {
        status: "CALLED",
        doctorId,
        calledAt: new Date(),
        estimatedWaitMinutes: 0,
        estimatedWaitTime: 0,
        estimatedTurnTime: new Date(),
        calledNotificationSent: false,
        nearTurnNotificationSent: false,
      },
    };

    const claimQueue = async (
      query: any,
      sort: any,
    ) => {
      return Queue.findOneAndUpdate(
        query,
        commonUpdate,
        {
          returnDocument: "after",
          sort,
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
          "name email isOnBreak breakStartedAt breakReason",
        )
        .populate(
          "appointmentId",
          "appointmentCode requestedStartTime confirmedStartTime endTime status paymentStatus",
        );
    };

    /*
     * AUTO CALL PRIORITY:
     * 1. Emergency
     * 2. Appointment only inside active window
     *    scheduledStartTime <= now < scheduledEndTime
     * 3. Walk-in
     *
     * Missed appointment is not auto-called.
     */

    let nextPatient: any = await claimQueue(
      {
        hospitalId,
        departmentId,
        queueDate,
        status: "WAITING",
        $and: [
          doctorOwnershipFilter,
          {
            $or: [
              { priority: "EMERGENCY" },
              { source: "EMERGENCY" },
            ],
          },
        ],
      },
      {
        tokenNumber: 1,
        createdAt: 1,
      },
    );

    if (!nextPatient) {
      nextPatient = await claimQueue(
        {
          hospitalId,
          departmentId,
          queueDate,
          status: "WAITING",
          source: "APPOINTMENT",
          scheduledStartTime: {
            $lte: currentTime,
          },
          scheduledEndTime: {
            $gt: currentTime,
          },
          appointmentCallStatus: {
            $ne: "MISSED",
          },
          $and: [doctorOwnershipFilter],
        },
        {
          scheduledStartTime: 1,
          tokenNumber: 1,
          createdAt: 1,
        },
      );
    }

    if (!nextPatient) {
      nextPatient = await claimQueue(
        {
          hospitalId,
          departmentId,
          queueDate,
          status: "WAITING",
          priority: {
            $ne: "EMERGENCY",
          },
          $and: [
            doctorOwnershipFilter,
            {
              $or: [
                { source: "WALK_IN" },
                { source: { $exists: false } },
                { source: null },
              ],
            },
          ],
        },
        {
          tokenNumber: 1,
          createdAt: 1,
        },
      );
    }

    if (!nextPatient) {
      const nextUpcomingAppointment = await Queue.findOne({
        hospitalId,
        departmentId,
        queueDate,
        status: "WAITING",
        source: "APPOINTMENT",
        scheduledStartTime: {
          $gt: currentTime,
        },
        appointmentCallStatus: {
          $ne: "MISSED",
        },
        $and: [doctorOwnershipFilter],
      })
        .sort({
          scheduledStartTime: 1,
          tokenNumber: 1,
        })
        .populate(
          "patientId",
          "name phone patientCode",
        )
        .lean();

      const missedCount = await Queue.countDocuments({
        hospitalId,
        departmentId,
        queueDate,
        status: "WAITING",
        source: "APPOINTMENT",
        appointmentCallStatus: "MISSED",
        $and: [doctorOwnershipFilter],
      });

      if (nextUpcomingAppointment) {
        return res.status(409).json({
          success: false,
          code: "ONLY_FUTURE_APPOINTMENT_WAITING",
          message: `Walk-in queue is empty. Next checked-in appointment is at ${nextUpcomingAppointment.scheduledStartTime}. Appointment cannot be called before scheduled time.`,
          data: {
            nextUpcomingAppointment,
            missedCount,
          },
        });
      }

      if (missedCount > 0) {
        return res.status(409).json({
          success: false,
          code: "ONLY_MISSED_APPOINTMENTS_WAITING",
          message: "Only missed appointments are waiting. They are not auto-called. Open Missed appointments and call manually.",
          data: {
            missedCount,
          },
        });
      }

      return res.status(404).json({
        success: false,
        message: "No patients waiting in your department",
      });
    }

    if (!nextPatient.calledNotificationSent) {
      const patient =
        nextPatient.patientId &&
          typeof nextPatient.patientId === "object"
          ? nextPatient.patientId as unknown as {
            name: string;
            phone?: string;
            email?: string;
          }
          : null;

      if (patient?.phone) {
        try {
          const result = await sendCalledNotification({
            phone: patient.phone,
            patientName: patient.name,
            tokenLabel: nextPatient.tokenLabel,
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
          }
        } catch (error) {
          console.error("❌ Called notification error:", error);
        }
      }
    }

    try {
      await checkAndSendNearTurnNotifications(
        hospitalId,
        departmentId,
        queueDate,
      );
    } catch (error) {
      console.error("⚠️ Near-turn notification process failed:", error);
    }

    getIO()
      .to(`hospital:${hospitalId}`)
      .emit("queue:called", {
        queue: nextPatient,
        queueId: nextPatient._id,
        tokenLabel: nextPatient.tokenLabel,
        doctorId,
        departmentId,
        status: "CALLED",
      });

    if (nextPatient.trackingToken) {
      const patientRoom = `queue:${nextPatient.trackingToken}`;

      getIO()
        .to(patientRoom)
        .emit("queue:called", {
          queueId: nextPatient._id,
          status: "CALLED",
          tokenLabel: nextPatient.tokenLabel,
          message: "Your token has been called. Please proceed to the doctor's room.",
        });

      getIO()
        .to(patientRoom)
        .emit("queue:status", nextPatient);
    }

    return res.status(200).json({
      success: true,
      message: "Next patient called successfully",
      data: nextPatient,
    });
  } catch (error) {
    console.error("❌ Call next patient error:", error);

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
            "name email isOnline isOnBreak breakStartedAt breakReason shiftStartTime shiftEndTime",
          )
          .populate(
            "appointmentId",
            "appointmentCode requestedStartTime confirmedStartTime endTime status paymentStatus",
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
        completedAt;

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
            "name email isOnline isOnBreak breakStartedAt breakReason shiftStartTime shiftEndTime",
          )
          .populate(
            "appointmentId",
            "appointmentCode requestedStartTime confirmedStartTime endTime status paymentStatus",
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
            "name email isOnline isOnBreak breakStartedAt breakReason shiftStartTime shiftEndTime",
          )
          .populate(
            "appointmentId",
            "appointmentCode requestedStartTime confirmedStartTime endTime status paymentStatus",
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

export const takeDoctorBreak = async (
  req: Request,
  res: Response,
) => {
  try {
    const hospitalId =
      req.user?.hospitalId;

    const doctorId =
      req.user?.userId;

    const {
      reason,
    } = req.body || {};

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

    const doctor =
      await User.findOne({
        _id:
          doctorId,
        hospitalId,
        role:
          "DOCTOR",
        isActive:
          true,
      });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor not found",
      });
    }

    if (!doctor.departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor has no department assigned",
      });
    }

    const queueDate =
      getIndiaQueueDate();

    const activePatient =
      await Queue.findOne({
        hospitalId,
        doctorId,
        departmentId:
          doctor.departmentId,
        queueDate,
        status: {
          $in: [
            "CALLED",
            "SERVING",
          ],
        },
      })
        .select(
          "_id tokenLabel status",
        )
        .lean();

    if (activePatient) {
      return res.status(409).json({
        success: false,
        code:
          "ACTIVE_PATIENT_EXISTS",
        message:
          `Complete or skip current patient ${activePatient.tokenLabel} before taking a break.`,
        data: {
          activePatient,
        },
      });
    }

    if (doctor.isOnBreak) {
      return res.status(200).json({
        success: true,
        message:
          "Doctor is already on break",
        data: {
          isOnBreak:
            true,
          breakStartedAt:
            doctor.breakStartedAt,
          breakReason:
            doctor.breakReason,
        },
      });
    }

    const now =
      new Date();

    doctor.isOnBreak =
      true;

    doctor.breakStartedAt =
      now;

    doctor.breakReason =
      typeof reason === "string" &&
        reason.trim()
        ? reason.trim()
        : "Break";

    await doctor.save();

    await emitDoctorBreakStatus({
      hospitalId:
        String(hospitalId),
      doctorId:
        String(doctorId),
      departmentId:
        String(doctor.departmentId),
      isOnBreak:
        true,
      breakStartedAt:
        now,
      breakReason:
        doctor.breakReason,
    });

    return res.status(200).json({
      success: true,
      message:
        "Doctor is on break",
      data: {
        doctorId:
          String(doctorId),

        departmentId:
          String(doctor.departmentId),

        isOnBreak:
          true,

        breakStartedAt:
          doctor.breakStartedAt,

        breakReason:
          doctor.breakReason,

        lastResumedAt:
          doctor.lastResumedAt || null,
      },
    });
  } catch (error) {
    console.error(
      "❌ Take doctor break error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};

export const resumeDoctorDuty = async (
  req: Request,
  res: Response,
) => {
  try {
    const hospitalId =
      req.user?.hospitalId;

    const doctorId =
      req.user?.userId;

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

    const doctor =
      await User.findOne({
        _id:
          doctorId,
        hospitalId,
        role:
          "DOCTOR",
        isActive:
          true,
      });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor not found",
      });
    }

    if (!doctor.departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor has no department assigned",
      });
    }

    const now =
      new Date();

    doctor.isOnBreak =
      false;

    doctor.breakStartedAt =
      null;

    doctor.breakReason =
      null;

    doctor.lastResumedAt =
      now;

    await doctor.save();

    await emitDoctorBreakStatus({
      hospitalId:
        String(hospitalId),
      doctorId:
        String(doctorId),
      departmentId:
        String(doctor.departmentId),
      isOnBreak:
        false,
      breakStartedAt:
        null,
      breakReason:
        null,
    });

    return res.status(200).json({
      success: true,
      message:
        "Doctor resumed duty",
      data: {
        isOnBreak:
          false,
        lastResumedAt:
          doctor.lastResumedAt,
      },
    });
  } catch (error) {
    console.error(
      "❌ Resume doctor duty error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};

export const callSelectedPatient = async (
  req: Request,
  res: Response,
) => {
  try {
    const hospitalId = req.user?.hospitalId;
    const doctorId = req.user?.userId;
    const queueId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!hospitalId || !doctorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication information missing",
      });
    }

    if (!queueId || !mongoose.Types.ObjectId.isValid(queueId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue ID",
      });
    }

    const queueDate = getIndiaQueueDate();
    const currentTime = getIndiaCurrentTime();

    const doctor = await User.findOne({
      _id: doctorId,
      hospitalId,
      role: "DOCTOR",
      isActive: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    if (!doctor.departmentId) {
      return res.status(400).json({
        success: false,
        message: "Doctor has no department assigned",
      });
    }

    if (doctor.isOnBreak) {
      return res.status(409).json({
        success: false,
        code: "DOCTOR_ON_BREAK",
        message: "You are on break. Resume duty before calling a patient.",
      });
    }

    const departmentId = doctor.departmentId;

    await markMissedAppointments({
      hospitalId,
      departmentId,
      queueDate,
      currentTime,
    });

    const activePatient = await Queue.findOne({
      hospitalId,
      doctorId,
      departmentId,
      queueDate,
      status: {
        $in: ["CALLED", "SERVING"],
      },
    }).lean();

    if (activePatient) {
      return res.status(409).json({
        success: false,
        message: "You already have a patient in progress",
        data: activePatient,
      });
    }

    const selectedQueue: any = await Queue.findOne({
      _id: queueId,
      hospitalId,
      departmentId,
      queueDate,
      status: "WAITING",
      $or: [
        { doctorId },
        { doctorId: null },
        { doctorId: { $exists: false } },
      ],
    });

    if (!selectedQueue) {
      return res.status(404).json({
        success: false,
        message: "Waiting patient not found for this doctor",
      });
    }

    const isAppointment =
      selectedQueue.source === "APPOINTMENT" ||
      Boolean(selectedQueue.scheduledStartTime) ||
      String(selectedQueue.tokenLabel || "").includes("-A");

    if (isAppointment) {
      const appointmentStatus = getAppointmentCallStatus({
        currentTime,
        scheduledStartTime: selectedQueue.scheduledStartTime || null,
        scheduledEndTime: selectedQueue.scheduledEndTime || null,
      });

      if (appointmentStatus === "UPCOMING") {
        return res.status(409).json({
          success: false,
          code: "APPOINTMENT_NOT_STARTED",
          message: `Appointment starts at ${selectedQueue.scheduledStartTime}. You cannot call before scheduled time.`,
        });
      }
    }

    selectedQueue.status = "CALLED";
    selectedQueue.doctorId = doctorId;
    selectedQueue.calledAt = new Date();
    selectedQueue.estimatedWaitMinutes = 0;
    selectedQueue.estimatedWaitTime = 0;
    selectedQueue.estimatedTurnTime = new Date();

    if (selectedQueue.appointmentCallStatus === "MISSED") {
      selectedQueue.manuallyCalledAfterMissedAt = new Date();
    }

    await selectedQueue.save();

    const updatedQueue = await Queue.findById(selectedQueue._id)
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
        "name email isOnBreak breakStartedAt breakReason",
      )
      .populate(
        "appointmentId",
        "appointmentCode requestedStartTime confirmedStartTime endTime status paymentStatus",
      );

    getIO()
      .to(`hospital:${hospitalId}`)
      .emit("queue:called", {
        queue: updatedQueue,
        queueId: selectedQueue._id,
        tokenLabel: selectedQueue.tokenLabel,
        doctorId,
        departmentId,
        status: "CALLED",
        manual: true,
      });

    if (selectedQueue.trackingToken) {
      getIO()
        .to(`queue:${selectedQueue.trackingToken}`)
        .emit("queue:called", {
          queueId: selectedQueue._id,
          status: "CALLED",
          tokenLabel: selectedQueue.tokenLabel,
          message: "Your token has been called. Please proceed to the doctor's room.",
        });

      getIO()
        .to(`queue:${selectedQueue.trackingToken}`)
        .emit("queue:status", updatedQueue);
    }

    return res.status(200).json({
      success: true,
      message: "Patient called successfully",
      data: updatedQueue,
    });
  } catch (error) {
    console.error("❌ Call selected patient error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};