import mongoose from "mongoose";

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

/* =========================================================
   CHECK AND SEND NEAR-TURN NOTIFICATIONS
========================================================= */

export const checkAndSendNearTurnNotifications = async (
  hospitalId: IdType,
  departmentId: IdType,
  queueDate: string,
) => {
  try {
    console.log("====================================");
    console.log("🔔 CHECKING NEAR-TURN NOTIFICATIONS");
    console.log("HOSPITAL:", hospitalId);
    console.log("DEPARTMENT:", departmentId);
    console.log("QUEUE DATE:", queueDate);
    console.log("====================================");

    /* =====================================
       FIND WAITING PATIENTS
    ===================================== */

    const waitingQueues = await Queue.find({
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
      .lean();

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

      /*
       * Number of patients ahead.
       *
       * Example:
       *
       * C-001 → 0 ahead
       * C-002 → 1 ahead
       * C-003 → 2 ahead
       * C-004 → 3 ahead
       */

      const patientsAhead = index;

      /* =====================================
         ONLY NOTIFY <= 2 PATIENTS AHEAD
      ===================================== */

      if (patientsAhead > 2) {
        continue;
      }

      /* =====================================
         PREVENT DUPLICATE
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
        queue.patientId &&
        typeof queue.patientId === "object"
          ? queue.patientId as unknown as {
              name: string;
              phone?: string;
              email?: string;
            }
          : null;

      if (!patient) {
        console.log(
          `⚠️ Patient missing for ${queue.tokenLabel}`,
        );

        continue;
      }

      if (!patient.phone) {
        console.log(
          `⚠️ Phone missing for ${queue.tokenLabel}`,
        );

        continue;
      }

      /* =====================================
         DEPARTMENT
      ===================================== */

      const department =
        queue.departmentId &&
        typeof queue.departmentId === "object"
          ? queue.departmentId as unknown as {
              name: string;
            }
          : null;

      /* =====================================
         DOCTOR
      ===================================== */

      const doctor =
        queue.doctorId &&
        typeof queue.doctorId === "object"
          ? queue.doctorId as unknown as {
              name: string;
            }
          : null;

      /* =====================================
         TRACKING URL
      ===================================== */

      const clientUrl =
        process.env.CLIENT_URL ||
        "http://localhost:5173";

      const trackingUrl =
        queue.trackingToken
          ? `${clientUrl}/track/${queue.trackingToken}`
          : undefined;

      console.log("====================================");
      console.log(
        `📨 NEAR TURN: ${queue.tokenLabel}`,
      );
      console.log("PATIENT:", patient.name);
      console.log("PHONE:", patient.phone);
      console.log("PATIENT EMAIL:", patient.email);
      console.log(
        "DEPARTMENT:",
        department?.name,
      );
      console.log(
        "DOCTOR:",
        doctor?.name,
      );
      console.log(
        "PATIENTS AHEAD:",
        patientsAhead,
      );
      console.log(
        "TRACKING URL:",
        trackingUrl,
      );
      console.log("====================================");

      /* =====================================
         SEND NOTIFICATION
      ===================================== */

      const result =
        await sendNearTurnNotification({
          phone: patient.phone,

          email: patient.email,

          patientName:
            patient.name,

          tokenLabel:
            queue.tokenLabel,

          hospitalName:
            "Hospital",

          departmentName:
            department?.name ||
            "Department",

          doctorName:
            doctor?.name,

          trackingUrl,

          patientsAhead,

          estimatedWaitTime:
            queue.estimatedWaitTime,
        });

      /* =====================================
         MARK AS SENT
      ===================================== */

      if (result.success) {
        await Queue.findByIdAndUpdate(
          queue._id,
          {
            $set: {
              nearTurnNotificationSent:
                true,
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
    }

    console.log(
      "✅ Near-turn notification check completed",
    );
  } catch (error) {
    console.error(
      "❌ Near-turn notification process failed:",
      error,
    );

    /*
     * Notification failure should NEVER
     * break the queue operation.
     */
  }
};