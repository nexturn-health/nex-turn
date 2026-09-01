import twilio from "twilio";

const accountSid =
  process.env.TWILIO_ACCOUNT_SID;

const authToken =
  process.env.TWILIO_AUTH_TOKEN;

const smsFrom =
  process.env.TWILIO_SMS_FROM;

if (!accountSid || !authToken) {
  console.warn(
    "⚠️ Twilio SMS credentials are missing",
  );
}

const client =
  accountSid && authToken
    ? twilio(accountSid, authToken)
    : null;


// =====================================
// TYPES
// =====================================

export interface SendSMSParams {
  phone: string;
  message: string;
}


// =====================================
// SEND SMS
// =====================================

export async function sendSMS(
  data: SendSMSParams,
) {

  const {
    phone,
    message,
  } = data;

  try {

    if (!client) {
      return {
        success: false,
        channel: "SMS",
        message:
          "Twilio client is not configured",
      };
    }

    if (!smsFrom) {
      return {
        success: false,
        channel: "SMS",
        message:
          "TWILIO_SMS_FROM is missing",
      };
    }

    if (!phone) {
      return {
        success: false,
        channel: "SMS",
        message:
          "Phone number is missing",
      };
    }

    if (!message) {
      return {
        success: false,
        channel: "SMS",
        message:
          "SMS message is empty",
      };
    }

    // =================================
    // NORMALIZE PHONE
    // =================================

    const formattedPhone =
      phone.startsWith("+")
        ? phone
        : `+91${phone}`;


    console.log(
      "📤 Sending SMS to:",
      formattedPhone,
    );


    // =================================
    // SEND
    // =================================

    const result =
      await client.messages.create({

        body: message,

        from: smsFrom,

        to: formattedPhone,

      });


    console.log(
      "✅ SMS sent:",
      result.sid,
    );


    return {
      success: true,
      channel: "SMS",
      sid: result.sid,
      status: result.status,
    };

  } catch (error) {

    console.error(
      "❌ SMS failed:",
      error,
    );

    return {
      success: false,
      channel: "SMS",
      error,
    };
  }
}