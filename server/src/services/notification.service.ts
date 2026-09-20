import {
  sendSMS,
} from "./sms.service";

import {
  sendPatientTrackingEmail,
} from "./email.service";

/* =========================================================
   TYPES
========================================================= */

export interface PatientNotificationData {
  phone?: string;
  email?: string;

  patientName: string;
  tokenLabel: string;

  hospitalName?: string;
  departmentName?: string;
  doctorName?: string;

  trackingUrl?: string;

  patientsAhead?: number;
  estimatedWaitTime?: number;
}

/* =========================================================
   NOTIFICATION TYPE
========================================================= */

type NotificationType =
  | "TOKEN_CREATED"
  | "NEAR_TURN"
  | "CALLED";

/* =========================================================
   TEST EMAIL
========================================================= */

const TEST_PATIENT_EMAIL =
  process.env.TEST_PATIENT_EMAIL ||
  "akash0001tech@gmail.com";

/* =========================================================
   MAIN NOTIFICATION
========================================================= */

export const sendPatientNotification = async (
  data: PatientNotificationData & {
    type: NotificationType;
  },
) => {
  const {
    phone,
    email,
    patientName,
    tokenLabel,
    hospitalName,
    departmentName,
    doctorName,
    trackingUrl,
    patientsAhead,
    estimatedWaitTime,
    type,
  } = data;

  console.log("=================================");
  console.log("🔔 PATIENT NOTIFICATION");
  console.log("TYPE:", type);
  console.log("PATIENT:", patientName);
  console.log("PHONE:", phone || "NOT PROVIDED");
  console.log("EMAIL:", email || "NOT PROVIDED");
  console.log("TOKEN:", tokenLabel);
  console.log("=================================");

  /* =======================================================
     CREATE SMS MESSAGE
  ======================================================= */

  let message = "";

  if (type === "TOKEN_CREATED") {
    message =
      `Hello ${patientName}, your NexTurn token is ${tokenLabel}.`;

    if (
      estimatedWaitTime !== undefined &&
      estimatedWaitTime !== null
    ) {
      message +=
        ` Estimated waiting time is approximately ${estimatedWaitTime} minutes.`;
    }

    if (trackingUrl) {
      message +=
        ` Track your live queue here: ${trackingUrl}`;
    }
  }

  if (type === "NEAR_TURN") {
    message =
      `Hello ${patientName}, your NexTurn token ${tokenLabel} is coming soon. ` +
      `There are ${patientsAhead ?? 2} patients ahead of you. ` +
      `Please be in the waiting area.`;

    if (trackingUrl) {
      message +=
        ` Track your queue here: ${trackingUrl}`;
    }
  }

  if (type === "CALLED") {
    message =
      `Hello ${patientName}, your NexTurn token ${tokenLabel} has been called. ` +
      `Please proceed to the doctor's room.`;
  }

  /* =======================================================
     TOKEN CREATED EMAIL
     
     Initial token WhatsApp is sent separately from
     createQueue using sendOpdQueueConfirmed.
  ======================================================= */

  if (type === "TOKEN_CREATED") {
    const recipientEmail =
      email || TEST_PATIENT_EMAIL;

    if (recipientEmail) {
      try {
        console.log("=================================");
        console.log("📧 TRYING TOKEN EMAIL");
        console.log("TO:", recipientEmail);
        console.log("TOKEN:", tokenLabel);
        console.log("=================================");

        const emailResult =
          await sendPatientTrackingEmail({
            email: recipientEmail,

            phone,

            patientName,

            tokenLabel,

            hospitalName:
              hospitalName ||
              "NexTurn Hospital",

            departmentName:
              departmentName ||
              "Department",

            doctorName,

            trackingUrl:
              trackingUrl || "",

            patientsAhead,

            estimatedWaitTime,
          });

        if (emailResult) {
          console.log("=================================");
          console.log("✅ TOKEN EMAIL SENT");
          console.log("TO:", recipientEmail);
          console.log("TOKEN:", tokenLabel);
          console.log("=================================");

          return {
            success: true,
            channel: "EMAIL",
          };
        }

        console.log(
          "⚠️ Token email failed. Trying SMS...",
        );
      } catch (error) {
        console.error(
          "❌ Token email error:",
          error,
        );
      }
    }
  }

  /* =======================================================
     SMS NOTIFICATION
     
     Used for:
     - Near-turn notification
     - Called notification
     - Token email fallback
  ======================================================= */

  if (phone) {
    try {
      console.log(
        "📤 TRYING SMS:",
        phone,
      );

      const smsResult =
        await sendSMS({
          phone,
          message,
        });

      if (smsResult.success) {
        console.log(
          "✅ SMS notification sent",
        );

        return {
          success: true,
          channel: "SMS",
        };
      }

      console.log(
        "⚠️ SMS failed. Trying email fallback...",
      );
    } catch (error) {
      console.error(
        "❌ SMS error:",
        error,
      );
    }
  }

  /* =======================================================
     EMAIL FALLBACK
     
     Used for:
     - NEAR_TURN
     - CALLED
     - Failed token SMS
  ======================================================= */

  const recipientEmail =
    email || TEST_PATIENT_EMAIL;

  if (recipientEmail) {
    try {
      console.log(
        "📧 TRYING FALLBACK EMAIL:",
        recipientEmail,
      );

      const emailResult =
        await sendPatientTrackingEmail({
          email: recipientEmail,

          phone,

          patientName,

          tokenLabel,

          hospitalName:
            hospitalName ||
            "NexTurn Hospital",

          departmentName:
            departmentName ||
            "Department",

          doctorName,

          trackingUrl:
            trackingUrl || "",

          patientsAhead,

          estimatedWaitTime,
        });

      if (emailResult) {
        console.log(
          "✅ FALLBACK EMAIL SENT",
        );

        return {
          success: true,
          channel: "EMAIL",
        };
      }
    } catch (error) {
      console.error(
        "❌ Fallback email error:",
        error,
      );
    }
  }

  /* =======================================================
     ALL FAILED
  ======================================================= */

  console.error("=================================");
  console.error(
    "⚠️ ALL NOTIFICATION CHANNELS FAILED",
  );
  console.error("TOKEN:", tokenLabel);
  console.error("=================================");

  return {
    success: false,
    channel: "NONE",
    message:
      "All notification channels failed",
  };
};

/* =========================================================
   TOKEN CREATED
========================================================= */

export const sendTokenCreatedNotification =
  async (
    data: PatientNotificationData,
  ) => {
    return sendPatientNotification({
      ...data,
      type: "TOKEN_CREATED",
    });
  };

/* =========================================================
   NEAR TURN
========================================================= */

export const sendNearTurnNotification =
  async (
    data: PatientNotificationData,
  ) => {
    return sendPatientNotification({
      ...data,
      type: "NEAR_TURN",
    });
  };

/* =========================================================
   CALLED
========================================================= */

export const sendCalledNotification =
  async (
    data: PatientNotificationData,
  ) => {
    return sendPatientNotification({
      ...data,
      type: "CALLED",
    });
  };