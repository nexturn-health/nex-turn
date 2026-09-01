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
    estimatedWaitTime,
  );
  console.log(
    "TRACKING URL:",
    trackingUrl || "NOT PROVIDED",
  );
  console.log("=================================");

  /* =====================================
     CREATE MESSAGE
  ===================================== */

  let message = "";

  if (type === "TOKEN_CREATED") {
    message =
      `Hello ${patientName}, your NexTurn token is ${tokenLabel}.`;

    if (
      estimatedWaitTime !== undefined
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

  /* =====================================
     VALIDATION
  ===================================== */

  if (
    !phone &&
    !email &&
    !TEST_PATIENT_EMAIL
  ) {
    return {
      success: false,
      channel: "NONE",
      message:
        "Patient contact information missing",
    };
  }

  /* =====================================
     WHATSAPP
  ===================================== */

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

      if (
        whatsappResult.success
      ) {
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

    /* ===================================
       SMS FALLBACK
    =================================== */

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

      if (
        smsResult.success
      ) {
        console.log(
          "✅ SMS notification sent",
        );

        return {
          success: true,
          channel: "SMS",
        };
      }

      console.log(
        "⚠️ SMS failed → checking email",
      );
    } catch (error) {
      console.error(
        "❌ SMS error:",
        error,
      );
    }
  }

  /* =====================================
     EMAIL
  ===================================== */

  if (
    type === "TOKEN_CREATED"
  ) {
    const recipientEmail =
      email ||
      TEST_PATIENT_EMAIL;

    if (recipientEmail) {
      try {
        console.log(
          "📧 Trying Patient Token Email",
        );

        console.log(
          "TO:",
          recipientEmail,
        );

        const emailResult =
          await sendPatientTrackingEmail({
            email:
              recipientEmail,

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
              trackingUrl ||
              "",

            estimatedWaitTime,

          });

        if (emailResult) {
          console.log(
            "✅ Patient token email sent",
          );

          return {
            success: true,
            channel: "EMAIL",
          };
        }

        console.error(
          "❌ Patient token email failed",
        );
      } catch (error) {
        console.error(
          "❌ Email error:",
          error,
        );
      }
    }
  }

  /* =====================================
     ALL FAILED
  ===================================== */

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