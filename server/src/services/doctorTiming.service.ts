import mongoose from "mongoose";

import {
    DoctorAttendance,
} from "../models/DoctorAttendance.model";

import {
    DoctorSchedule,
} from "../models/DoctorSchedule.model";

import {
    Queue,
} from "../models/Queue.model";

/* ============================================================
   DATE HELPERS
============================================================ */

export const getIndiaDateString = (
    date = new Date(),
) => {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        },
    ).format(date);
};

export const buildIndiaDateTime = (
    date: string,
    time: string,
) => {
    return new Date(
        `${date}T${time}:00+05:30`,
    );
};

const getWeekDay = (
    date: string,
) => {
    const dayIndex =
        new Date(
            `${date}T00:00:00+05:30`,
        ).getDay();

    const map: Record<number, string> = {
        0: "SUNDAY",
        1: "MONDAY",
        2: "TUESDAY",
        3: "WEDNESDAY",
        4: "THURSDAY",
        5: "FRIDAY",
        6: "SATURDAY",
    };

    return map[dayIndex];
};

const toObjectId = (
    value: string | mongoose.Types.ObjectId,
) => {
    return typeof value === "string"
        ? new mongoose.Types.ObjectId(value)
        : value;
};

/* ============================================================
   GET DOCTOR SCHEDULE TIME
============================================================ */

export const getDoctorTodayScheduleTiming = async ({
    hospitalId,
    doctorId,
    date,
}: {
    hospitalId: string | mongoose.Types.ObjectId;
    doctorId: string | mongoose.Types.ObjectId;
    date: string;
}) => {
    const schedule =
        await DoctorSchedule.findOne({
            hospitalId,
            doctorId,
            isActive: true,
        }).lean();

    if (
        !schedule
    ) {
        return {
            scheduledStartTime: null,
            scheduledEndTime: null,
        };
    }

    const weekDay =
        getWeekDay(date);

    const daySchedule =
        schedule.weeklyAvailability?.find(
            (item: any) =>
                item.day === weekDay &&
                item.isAvailable,
        );

    const sessions =
        daySchedule?.sessions || [];

    if (
        !sessions.length
    ) {
        return {
            scheduledStartTime: null,
            scheduledEndTime: null,
        };
    }

    const sortedSessions =
        [...sessions].sort(
            (first: any, second: any) =>
                String(first.startTime).localeCompare(
                    String(second.startTime),
                ),
        );

    return {
        scheduledStartTime:
            sortedSessions[0]?.startTime || null,

        scheduledEndTime:
            sortedSessions[
                sortedSessions.length - 1
            ]?.endTime || null,
    };
};

/* ============================================================
   MARK DOCTOR ONLINE
============================================================ */

export const markDoctorOnlineAttendance = async ({
    hospitalId,
    doctorId,
}: {
    hospitalId: string | mongoose.Types.ObjectId;
    doctorId: string | mongoose.Types.ObjectId;
}) => {
    const attendanceDate =
        getIndiaDateString();

    const now =
        new Date();

    const timing =
        await getDoctorTodayScheduleTiming({
            hospitalId,
            doctorId,
            date: attendanceDate,
        });

    const existingAttendance =
        await DoctorAttendance.findOne({
            hospitalId,
            doctorId,
            attendanceDate,
        });

    const firstOnlineAt =
        existingAttendance?.firstOnlineAt || now;

    let lateByMinutes =
        0;

    if (
        timing.scheduledStartTime
    ) {
        const scheduledStart =
            buildIndiaDateTime(
                attendanceDate,
                timing.scheduledStartTime,
            );

        lateByMinutes =
            Math.max(
                0,
                Math.floor(
                    (
                        firstOnlineAt.getTime() -
                        scheduledStart.getTime()
                    ) / 60000,
                ),
            );
    }

    const attendance =
        await DoctorAttendance.findOneAndUpdate(
            {
                hospitalId,
                doctorId,
                attendanceDate,
            },
            {
                $set: {
                    scheduledStartTime:
                        timing.scheduledStartTime,

                    scheduledEndTime:
                        timing.scheduledEndTime,

                    firstOnlineAt,

                    lastSeenAt:
                        now,

                    isOnline:
                        true,

                    lateByMinutes,
                },
            },
            {
                returnDocument: "after",
                upsert: true,
            },
        );

    return attendance;
};

/* ============================================================
   AVG SERVICE TIME
============================================================ */

export const getAverageDoctorServiceMinutes = async ({
    hospitalId,
    doctorId,
    defaultMinutes = 12,
}: {
    hospitalId: string | mongoose.Types.ObjectId;
    doctorId: string | mongoose.Types.ObjectId;
    defaultMinutes?: number;
}) => {
    const result =
        await Queue.aggregate([
            {
                $match: {
                    hospitalId:
                        toObjectId(hospitalId),

                    doctorId:
                        toObjectId(doctorId),

                    status:
                        "COMPLETED",

                    serviceDurationMinutes: {
                        $gt: 0,
                        $lte: 120,
                    },
                },
            },
            {
                $sort: {
                    completedAt: -1,
                },
            },
            {
                $limit: 50,
            },
            {
                $group: {
                    _id: null,
                    averageMinutes: {
                        $avg: "$serviceDurationMinutes",
                    },
                },
            },
        ]);

    const average =
        Math.round(
            result[0]?.averageMinutes ||
            defaultMinutes,
        );

    return Math.max(
        5,
        average,
    );
};

/* ============================================================
   LIVE DOCTOR DELAY STATUS
============================================================ */

export const getDoctorLiveDelayStatus = async ({
    hospitalId,
    doctorId,
    date,
}: {
    hospitalId: string | mongoose.Types.ObjectId;
    doctorId: string | mongoose.Types.ObjectId;
    date: string;
}) => {
    const now =
        new Date();

    const timing =
        await getDoctorTodayScheduleTiming({
            hospitalId,
            doctorId,
            date,
        });

    const attendance =
        await DoctorAttendance.findOne({
            hospitalId,
            doctorId,
            attendanceDate: date,
        }).lean();

    let lateByMinutes =
        0;

    let expectedDoctorStartAt: Date | null =
        null;

    if (
        timing.scheduledStartTime
    ) {
        const scheduledStart =
            buildIndiaDateTime(
                date,
                timing.scheduledStartTime,
            );

        if (
            attendance?.firstOnlineAt
        ) {
            lateByMinutes =
                Math.max(
                    0,
                    Math.floor(
                        (
                            new Date(
                                attendance.firstOnlineAt,
                            ).getTime() -
                            scheduledStart.getTime()
                        ) / 60000,
                    ),
                );
        } else {
            lateByMinutes =
                Math.max(
                    0,
                    Math.floor(
                        (
                            now.getTime() -
                            scheduledStart.getTime()
                        ) / 60000,
                    ),
                );
        }

        expectedDoctorStartAt =
            new Date(
                scheduledStart.getTime() +
                lateByMinutes * 60000,
            );
    }

    const lastSeenAt =
        attendance?.lastSeenAt
            ? new Date(attendance.lastSeenAt)
            : null;

    const isOnline =
        lastSeenAt
            ? now.getTime() - lastSeenAt.getTime() <=
              60 * 1000
            : false;

    const averageServiceMinutes =
        await getAverageDoctorServiceMinutes({
            hospitalId,
            doctorId,
        });

    const isLate =
        lateByMinutes > 0;

    return {
        scheduledStartTime:
            timing.scheduledStartTime,

        scheduledEndTime:
            timing.scheduledEndTime,

        isOnline,

        firstOnlineAt:
            attendance?.firstOnlineAt || null,

        lastSeenAt:
            attendance?.lastSeenAt || null,

        isLate,

        lateByMinutes,

        expectedDoctorStartAt,

        averageServiceMinutes,

        message:
            isLate
                ? `Doctor is running late today by ${lateByMinutes} minutes.`
                : "Doctor is on time today.",
    };
};