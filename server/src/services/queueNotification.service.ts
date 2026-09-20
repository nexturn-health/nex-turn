import mongoose from "mongoose";

import { Hospital } from "../models/Hospital.model";
import { Queue } from "../models/Queue.model";

import {
  sendNearTurnNotification,
} from "./notification.service";

/* =========================================================
   TYPES
========================================================= */

type IdType =
  | string
  | mongoose.Types.ObjectId;

type PopulatedPatient = {
  name?: string;
  phone?: string;
  email?: string;
  patientCode?: string;
};

type PopulatedDepartment = {
  name?: string;
  tokenPrefix?: string;
};

type PopulatedDoctor = {
  name?: string;
  email?: string;
};

type PopulatedQueue = {
  _id: mongoose.Types.ObjectId | string;

  tokenLabel: string;
  tokenNumber: number;

  priority?: string;

  patientId?:
    | PopulatedPatient
    | mongoose.Types.ObjectId
    | string
    | null;

  departmentId?:
    | PopulatedDepartment
    | mongoose.Types.ObjectId
    | string
    | null;

  doctorId?:
    | PopulatedDoctor
    | mongoose.Types.ObjectId
    | string
    | null;

  trackingToken?: string | null;

  estimatedWaitTime?: number;

  nearTurnNotificationSent?: boolean;
};

/* =========================================================
   HELPERS
========================================================= */

const getPopulatedObject = <
  T extends {
    name?: string;
  },
>(
  value: unknown,
): T | null => {
  if (
    !value ||
    typeof value !== "object" ||
    !("name" in value)
  ) {
    return null;
  }

  return value as T;
};

/* =========================================================
   CHECK AND SEND NEAR-TURN NOTIFICATIONS
========================================================= */

export const checkAndSendNearTurnNotifications = async (
  hospitalId: IdType,
  departmentId: IdType,
  queueDate: string,
): Promise<void> => {
  try {
    console.log("====================================");
    console.log("🔔 CHECKING NEAR-TURN NOTIFICATIONS");
    console.log("HOSPITAL:", hospitalId);
    console.log("DEPARTMENT:", departmentId);
    console.log("QUEUE DATE:", queueDate);
    console.log("====================================");

    /* =====================================
       GET HOSPITAL NAME
    ===================================== */

    const hospital = await Hospital.findById(hospitalId)
      .select("name")
      .lean();

    const hospitalName =
      hospital?.name?.trim() || "Hospital";

    /* =====================================
       FIND WAITING PATIENTS
    ===================================== */

    const waitingQueues =
      (await Queue.find({
        hospitalId,
        departmentId,
        queueDate,
        status: "WAITING",
        trackingLinkActive: true,
        trackingExpiresAt: {
          $gt: new Date(),
        },
      })
        .sort({
          priority: -1,
          tokenNumber: 1,
        })
        .populate(
          "patientId",
          "name phone email patientCode",
        )
        .populate(
          "departmentId",
          "name tokenPrefix",
        )
        .populate(
          "doctorId",
          "name email",
        )
        .lean()) as unknown as PopulatedQueue[];

    console.log(
      `👥 Waiting patients found: ${waitingQueues.length}`,
    );

    /* =====================================
       PROCESS QUEUE
    ===================================== */

    for (
      let index = 0;
      index < waitingQueues.length;
      index++
    ) {
      const queue = waitingQueues[index];

      try {
        /*
         * Number of patients ahead.
         *
         * First patient  = 0 ahead
         * Second patient = 1 ahead
         * Third patient  = 2 ahead
         */

        const patientsAhead = index;

        /* =====================================
           ONLY NOTIFY FIRST 3 PATIENTS
        ===================================== */

        if (patientsAhead > 2) {
          continue;
        }

        /* =====================================
           PREVENT DUPLICATE NOTIFICATION
        ===================================== */

        if (queue.nearTurnNotificationSent) {
          console.log(
            `⏭️ ${queue.tokenLabel} already notified`,
          );

          continue;
        }

        /* =====================================
           PATIENT
        ===================================== */

        const patient =
          getPopulatedObject<PopulatedPatient>(
            queue.patientId,
          );

        if (!patient) {
          console.log(
            `⚠️ Patient missing for ${queue.tokenLabel}`,
          );

          continue;
        }

        const patientName =
          patient.name?.trim();

        const patientPhone =
          patient.phone?.trim();

        if (!patientName) {
          console.log(
            `⚠️ Patient name missing for ${queue.tokenLabel}`,
          );

          continue;
        }

        if (!patientPhone) {
          console.log(
            `⚠️ Phone missing for ${queue.tokenLabel}`,
          );

          continue;
        }

        /* =====================================
           DEPARTMENT
        ===================================== */

        const department =
          getPopulatedObject<PopulatedDepartment>(
            queue.departmentId,
          );

        const departmentName =
          department?.name?.trim() ||
          "Department";

        /* =====================================
           DOCTOR
        ===================================== */

        const doctor =
          getPopulatedObject<PopulatedDoctor>(
            queue.doctorId,
          );

        const doctorName =
          doctor?.name?.trim() ||
          undefined;

        /* =====================================
           TRACKING URL
        ===================================== */

        const clientUrl = (
          process.env.CLIENT_URL ||
          "http://localhost:5173"
        ).replace(/\/+$/, "");

        const trackingToken =
          queue.trackingToken?.trim();

        const trackingUrl =
          trackingToken
            ? `${clientUrl}/track/${trackingToken}`
            : undefined;

        /* =====================================
           LOG
        ===================================== */

        console.log("====================================");
        console.log(
          `📨 NEAR TURN: ${queue.tokenLabel}`,
        );
        console.log("PATIENT:", patientName);
        console.log("PHONE:", patientPhone);
        console.log(
          "HOSPITAL:",
          hospitalName,
        );
        console.log(
          "DEPARTMENT:",
          departmentName,
        );
        console.log(
          "DOCTOR:",
          doctorName || "Not assigned",
        );
        console.log(
          "PATIENTS AHEAD:",
          patientsAhead,
        );
        console.log(
          "TRACKING URL:",
          trackingUrl || "Not available",
        );
        console.log("====================================");

        /* =====================================
           SEND NOTIFICATION
        ===================================== */

        const result =
          await sendNearTurnNotification({
            phone: patientPhone,

            email: patient.email,

            patientName,

            tokenLabel:
              queue.tokenLabel,

            hospitalName,

            departmentName,

            doctorName,

            trackingUrl,

            patientsAhead,

            estimatedWaitTime:
              queue.estimatedWaitTime ?? 0,
          });

        /* =====================================
           MARK AS SENT
        ===================================== */

        if (result.success) {
          await Queue.findByIdAndUpdate(
            queue._id,
            {
              $set: {
                nearTurnNotificationSent: true,
              },
            },
          );

          console.log(
            `✅ Near-turn notification sent: ${queue.tokenLabel}`,
          );
        } else {
          console.log(
            `❌ Near-turn notification failed: ${queue.tokenLabel}`,
          );
        }
      } catch (queueError) {
        console.error(
          `❌ Failed processing ${queue.tokenLabel}:`,
          queueError,
        );

        // Continue with the next patient.
        continue;
      }
    }

    console.log(
      "✅ Near-turn notification check completed",
    );
  } catch (error) {
    console.error(
      "❌ Near-turn notification process failed:",
      error,
    );

    // Notification errors must not break queue operations.
  }
};