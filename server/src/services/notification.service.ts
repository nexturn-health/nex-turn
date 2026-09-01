
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
  process.env.TEST_PATIENT_EMAIL;

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
  console.log(
    "PHONE:",
    phone || "NOT PROVIDED",
  );
  console.log(
    "PATIENT EMAIL:",
    email || "NOT PROVIDED",
  );
  console.log(
    "TEST EMAIL:",
    TEST_PATIENT_EMAIL || "NOT CONFIGURED",
  );
  console.log(
    "HOSPITAL:",
    hospitalName || "NOT PROVIDED",
  );
  console.log(
    "DEPARTMENT:",
    departmentName || "NOT PROVIDED",
  );
  console.log(
    "DOCTOR:",
    doctorName || "NOT ASSIGNED",
  );
  console.log("TOKEN:", tokenLabel);
  console.log(
    "ESTIMATED WAIT:",
    estimatedWaitTime ?? "NOT PROVIDED",
  );
  console.log(
    "TRACKING URL:",
    trackingUrl || "NOT PROVIDED",
  );
  console.log("=================================");

  /* =====================================================
     CREATE MESSAGE
  ===================================================== */

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

  /* =====================================================
     RESULTS
  ===================================================== */

  const successfulChannels: string[] = [];
  const failedChannels: string[] = [];

  /* =====================================================
     1. WHATSAPP
  ===================================================== */

  if (phone) {
    try {
      console.log("=================================");
      console.log("📱 Trying WhatsApp");
      console.log("TO:", phone);
      console.log("=================================");

      const whatsappResult =
        await sendWhatsApp({
          phone,
          message,
        });

      if (whatsappResult.success) {
        console.log(
          "✅ WhatsApp notification sent",
        );

        successfulChannels.push("WHATSAPP");
      } else {
        console.log(
          "⚠️ WhatsApp failed",
        );

        failedChannels.push("WHATSAPP");
      }
    } catch (error) {
      console.error(
        "❌ WhatsApp error:",
        error,
      );

      failedChannels.push("WHATSAPP");
    }
  }

  /* =====================================================
     2. SMS
     
     SMS is attempted when WhatsApp failed.
  ===================================================== */

  if (
    phone &&
    !successfulChannels.includes("WHATSAPP")
  ) {
    try {
      console.log("=================================");
      console.log("📤 Trying SMS");
      console.log("TO:", phone);
      console.log("=================================");

      const smsResult =
        await sendSMS({
          phone,
          message,
        });

      if (smsResult.success) {
        console.log(
          "✅ SMS notification sent",
        );

        successfulChannels.push("SMS");
      } else {
        console.log(
          "⚠️ SMS failed",
        );

        failedChannels.push("SMS");
      }
    } catch (error) {
      console.error(
        "❌ SMS error:",
        error,
      );

      failedChannels.push("SMS");
    }
  }

  /* =====================================================
     3. EMAIL
     
     IMPORTANT:
     
     TOKEN_CREATED email is independent of WhatsApp/SMS.
     
     Even if WhatsApp succeeds, email will still be sent.
  ===================================================== */

  if (type === "TOKEN_CREATED") {
    const recipientEmail =
      email || TEST_PATIENT_EMAIL;

    console.log("=================================");
    console.log("📧 PATIENT TOKEN EMAIL");
    console.log(
      "PATIENT EMAIL:",
      email || "NOT PROVIDED",
    );
    console.log(
      "TEST EMAIL:",
      TEST_PATIENT_EMAIL || "NOT CONFIGURED",
    );
    console.log(
      "FINAL RECIPIENT:",
      recipientEmail || "NONE",
    );
    console.log("=================================");

    if (recipientEmail) {
      try {
        if (!trackingUrl) {
          console.warn(
            "⚠️ Tracking URL missing for patient email",
          );
        }

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

            estimatedWaitTime,
          });

        if (emailResult) {
          console.log("=================================");
          console.log(
            "✅ PATIENT TOKEN EMAIL SENT",
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

          successfulChannels.push("EMAIL");
        } else {
          console.error(
            "❌ PATIENT TOKEN EMAIL FAILED",
          );

          failedChannels.push("EMAIL");
        }
      } catch (error) {
        console.error("=================================");
        console.error(
          "❌ PATIENT TOKEN EMAIL ERROR",
        );
        console.error("TO:", recipientEmail);
        console.error("ERROR:", error);
        console.error("=================================");

        failedChannels.push("EMAIL");
      }
    } else {
      console.warn(
        "⚠️ No patient email and TEST_PATIENT_EMAIL is not configured",
      );

      failedChannels.push("EMAIL");
    }
  }

  /* =====================================================
     FINAL RESULT
  ===================================================== */

  const success =
    successfulChannels.length > 0;

  console.log("=================================");
  console.log("📊 NOTIFICATION RESULT");
  console.log(
    "SUCCESS:",
    success,
  );
  console.log(
    "SUCCESSFUL CHANNELS:",
    successfulChannels,
  );
  console.log(
    "FAILED CHANNELS:",
    failedChannels,
  );
  console.log("=================================");

  return {
    success,

    channel:
      successfulChannels.join(",") ||
      "NONE",

    successfulChannels,

    failedChannels,

    message: success
      ? "Notification sent successfully"
      : "All notification channels failed",
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