import {
  sendWhatsApp,
} from "./whatsapp.service";

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
  "atul123ak47@gmail.com";

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
  console.log(
    "EMAIL:",
    email || "NOT PROVIDED",
  );
  console.log("TOKEN:", tokenLabel);
  console.log("=================================");

  /* =======================================================
     CREATE MESSAGE
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
        ` Track your queue: ${trackingUrl}`;
    }
  }

  if (type === "CALLED") {
    message =
      `Hello ${patientName}, your NexTurn token ${tokenLabel} has been called. ` +
      `Please proceed to the doctor's room.`;
  }

  /* =======================================================
     TOKEN CREATED
     
     IMPORTANT:
     For token creation we try EMAIL FIRST.
     
     This guarantees your default/test email is attempted
     without waiting for WhatsApp/SMS failures.
  ======================================================= */

  if (type === "TOKEN_CREATED") {
    const recipientEmail =
      email || TEST_PATIENT_EMAIL;

    if (recipientEmail) {
      try {
        console.log("=================================");
        console.log(
          "📧 TRYING TOKEN EMAIL",
        );
        console.log(
          "TO:",
          recipientEmail,
        );
        console.log(
          "TOKEN:",
          tokenLabel,
        );
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
          console.log(
            "✅ TOKEN EMAIL SENT",
          );
          console.log(
            "TO:",
            recipientEmail,
          );
          console.log(
            "TOKEN:",
            tokenLabel,
          );
          console.log("=================================");

          return {
            success: true,
            channel: "EMAIL",
          };
        }

        console.log(
          "⚠️ Email failed → trying WhatsApp",
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
     WHATSAPP
  ======================================================= */

  if (phone) {
    try {
      console.log(
        "📱 Trying WhatsApp:",
        phone,
      );

      const whatsappResult =
        await sendWhatsApp({
          phone,
          message,
        });

      if (whatsappResult.success) {
        console.log(
          "✅ WhatsApp notification sent",
        );

        return {
          success: true,
          channel: "WHATSAPP",
        };
      }

      console.log(
        "⚠️ WhatsApp failed → trying SMS",
      );
    } catch (error) {
      console.error(
        "❌ WhatsApp error:",
        error,
      );
    }

    /* =====================================================
       SMS FALLBACK
    ===================================================== */

    try {
      console.log(
        "📤 Trying SMS:",
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
        "⚠️ SMS failed",
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
     
     Important for NEAR_TURN / CALLED.
     
     TOKEN_CREATED already attempted email above.
  ======================================================= */

  if (type !== "TOKEN_CREATED") {
    const recipientEmail =
      email || TEST_PATIENT_EMAIL;

    if (recipientEmail) {
      try {
        console.log(
          "📧 Trying fallback email:",
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
            "✅ Fallback email sent",
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
  }

  /* =======================================================
     ALL FAILED
  ======================================================= */

  console.error("=================================");
  console.error(
    "⚠️ ALL NOTIFICATION CHANNELS FAILED",
  );
  console.error(
    "TOKEN:",
    tokenLabel,
  );
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