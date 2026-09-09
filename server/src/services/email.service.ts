// =========================================================
// EMAIL CONFIG (Resend — HTTPS API, not SMTP)
//
// Sends transactional emails through the existing Resend HTTPS API.
//
// Env vars needed:
//   RESEND_API_KEY   - from https://resend.com/api-keys
//   EMAIL_FROM       - e.g. "NextSynq Health <onboarding@resend.dev>" for testing,
//                       or "NextSynq Health <noreply@yourdomain.com>" once you've
//                       verified a domain in Resend.
// =========================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "NextSynq Health <onboarding@resend.dev>";
const RESEND_API_URL = "https://api.resend.com/emails";

if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY is missing");
}

// =========================================================
// HTML ESCAPE
// =========================================================

const escapeHtml = (value: unknown): string => {
  if (value === undefined || value === null) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};


// =========================================================
// SHARED EMAIL DESIGN
// Table layouts and inline styles work without website CSS or image assets.
// Text passed to this wrapper must already be escaped where appropriate.
// =========================================================
function emailLayout(preheader: string, content: string, footer: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NextSynq Health</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-outer { padding: 16px 10px !important; }
      .email-content { padding: 24px 20px !important; }
      .email-header { padding: 24px 20px !important; }
      .email-heading { font-size: 24px !important; }
      .email-button { display: block !important; text-align: center !important; }
      .email-token { font-size: 40px !important; }
      .email-label { width: 38% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f6f2;font-family:Arial,Helvetica,sans-serif;color:#173d39;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f6f2;">
    <tr><td align="center" class="email-outer" style="padding:32px 16px;">
      <!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #dfe6dc;border-radius:20px;overflow:hidden;">
        <tr><td class="email-header" style="padding:28px 32px;background:#173d39;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="44" height="44" align="center" style="background:#eaf0e1;border-radius:12px;color:#173d39;font-size:18px;font-weight:bold;">NS</td>
            <td style="padding-left:12px;color:#f5f6f2;font-size:21px;font-weight:bold;">NextSynq Health<br /><span style="font-size:11px;font-weight:normal;letter-spacing:1px;color:#c7d9cd;">CONNECTED CARE. SIMPLER VISITS.</span></td>
          </tr></table>
        </td></tr>
        <tr><td class="email-content" style="padding:32px;">${content}</td></tr>
        <tr><td style="padding:18px 24px;background:#edf3e6;border-top:1px solid #dfe6dc;text-align:center;">
          <p style="margin:0;color:#61745a;font-size:11px;line-height:1.7;">${footer}<br />&copy; ${new Date().getFullYear()} NextSynq Health</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
}

// Every dynamic value is escaped before it is inserted into a table cell.
function detailRow(label: string, value: unknown): string {
  return `<tr>
    <th scope="row" class="email-label" width="38%" style="padding:12px 0;border-bottom:1px solid #edf0e9;text-align:left;vertical-align:top;font-size:13px;font-weight:normal;color:#6b7c73;">${escapeHtml(label)}</th>
    <td style="padding:12px 0 12px 12px;border-bottom:1px solid #edf0e9;text-align:right;font-size:13px;line-height:1.6;font-weight:bold;color:#173d39;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(value)}</td>
  </tr>`;
}

// =========================================================
// SEND VIA RESEND
// =========================================================

interface ResendSendParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

interface ResendResult {
  success: boolean;
  id?: string;
  error?: unknown;
}

async function sendViaResend({ to, subject, html, replyTo }: ResendSendParams): Promise<ResendResult> {
  if (!RESEND_API_KEY) {
    console.error("❌ Email send skipped: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY missing" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Resend API error:", { status: response.status, data });
      return { success: false, error: data };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error("❌ Resend request failed:", error);
    return { success: false, error };
  }
}

// =========================================================
// VERIFY EMAIL CONNECTION
//
// Resend has no SMTP-style "verify" handshake; this just confirms the API
// key is present and can authenticate by listing the account's domains.
// =========================================================

export const verifyEmailConnection = async (): Promise<boolean> => {
  if (!RESEND_API_KEY) {
    console.error("❌ Email service cannot start: RESEND_API_KEY missing");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });

    if (!response.ok) {
      console.error("❌ EMAIL SERVICE: FAILED", await response.text());
      return false;
    }

    console.log("✅ EMAIL SERVICE: CONNECTED (Resend)");
    console.log("EMAIL FROM:", EMAIL_FROM);
    return true;
  } catch (error) {
    console.error("❌ EMAIL SERVICE: FAILED", error);
    return false;
  }
};

// =========================================================
// PASSWORD RESET EMAIL
// =========================================================

interface SendPasswordResetEmailParams {
  email: string;
  name: string;
  resetUrl: string;
}

export const sendPasswordResetEmail = async ({
  email,
  name,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<boolean> => {
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl);

  const result = await sendViaResend({
    to: email,
    subject: "Reset Your NextSynq Health Password",
    html: emailLayout(
      "Reset your NextSynq Health password. This link expires in 15 minutes.",
      `
      <p style="margin:0 0 12px;color:#6e895e;font-size:10px;letter-spacing:1.6px;font-weight:bold;">ACCOUNT SECURITY</p>
      <h1 class="email-heading" style="margin:0 0 20px;font-size:28px;line-height:1.25;color:#173d39;">Reset your password</h1>
      <p style="margin:0 0 12px;color:#52695a;font-size:15px;line-height:1.7;">Hi ${safeName || "there"},</p>
      <p style="margin:0 0 24px;color:#52695a;font-size:14px;line-height:1.8;">We received a request to reset your NextSynq Health password. Use the button below to choose a new one.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px;background:#edf3e6;border:1px solid #dce6d3;border-radius:12px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#526d44;"><strong>Valid for 15 minutes</strong><br />For your security, keep this link private.</p>
      </td></tr></table>
      <div style="margin:26px 0;"><a class="email-button" href="${safeResetUrl}" style="display:inline-block;background:#176957;border:1px solid #176957;border-radius:11px;padding:15px 24px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Reset password</a></div>
      <p style="margin:0 0 8px;color:#6b7c73;font-size:12px;line-height:1.7;">If the button does not work, open this link:</p>
      <p style="margin:0 0 24px;word-break:break-all;font-size:12px;line-height:1.7;"><a href="${safeResetUrl}" style="color:#176957;text-decoration:underline;">${safeResetUrl}</a></p>
      <p style="margin:0;padding-top:20px;border-top:1px solid #dfe6dc;color:#6b7c73;font-size:12px;line-height:1.8;">If you did not request this change, you can ignore this email. Your password will remain unchanged.</p>
      `,
      "An account security notification.",
    ),
  });

  if (result.success) {
    console.log("✅ Password reset email sent:", email);
  } else {
    console.error("❌ Password reset email failed:", { email, error: result.error });
  }

  return result.success;
};

// =========================================================
// PATIENT NOTIFICATION DATA
// =========================================================

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

// =========================================================
// SEND PATIENT TRACKING EMAIL
// =========================================================

export const sendPatientTrackingEmail = async ({
  email,
  phone,
  patientName,
  hospitalName,
  departmentName,
  doctorName,
  tokenLabel,
  estimatedWaitTime,
  trackingUrl,
}: PatientNotificationData): Promise<boolean> => {
  if (!email) {
    console.warn("⚠️ Patient tracking email skipped: No email address", patientName);
    return false;
  }

  const safePatientName = escapeHtml(patientName);
  const safeHospitalName = escapeHtml(hospitalName || "Hospital");
  const safeDepartmentName = escapeHtml(departmentName || "Department");
  const safeTokenLabel = escapeHtml(tokenLabel);
  const safeTrackingUrl = trackingUrl ? escapeHtml(trackingUrl) : "";

  const doctorDisplay = doctorName
    ? /^dr\.?\s/i.test(doctorName.trim()) ? doctorName.trim() : `Dr. ${doctorName.trim()}`
    : "Not assigned";
  const waitDisplay =
    estimatedWaitTime !== undefined && estimatedWaitTime !== null ? `${estimatedWaitTime} minutes` : "Calculating...";

  // This message is a snapshot; the tracking page contains current queue updates.
  const trackingSection = trackingUrl
    ? `<div style="margin:24px 0;"><a class="email-button" href="${safeTrackingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#176957;border:1px solid #176957;border-radius:11px;padding:15px 24px;color:white;font-size:14px;font-weight:bold;text-decoration:none;">Track my queue</a></div>
       <p style="margin:0 0 6px;font-size:12px;line-height:1.7;color:#6b7c73;">Or open your personal tracking link:</p>
       <p style="margin:0 0 24px;font-size:12px;line-height:1.7;word-break:break-all;"><a href="${safeTrackingUrl}" style="color:#176957;">${safeTrackingUrl}</a></p>`
    : `<p style="margin:24px 0;padding:16px;border:1px solid #e8dab8;border-radius:11px;background:#faf5e9;font-size:13px;line-height:1.7;color:#856a36;">Your tracking link is currently unavailable. Please contact hospital reception for assistance.</p>`;

  const result = await sendViaResend({
    to: email,
    subject: `NextSynq Health Token ${tokenLabel} - ${hospitalName || "Hospital"}`,
    html: emailLayout(
      `Your token ${tokenLabel} for ${hospitalName || "Hospital"} is ready.`,
      `
      <p style="margin:0 0 12px;color:#6e895e;font-size:10px;letter-spacing:1.6px;font-weight:bold;">YOUR HOSPITAL VISIT</p>
      <h1 class="email-heading" style="margin:0 0 18px;font-size:28px;line-height:1.25;color:#173d39;">Your token is ready</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#52695a;">Hello <strong>${safePatientName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.8;color:#52695a;">Your token has been generated at ${safeHospitalName}. Keep your token handy and follow your visit using the tracking link.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:25px 16px;background:#173d39;border-radius:14px;">
        <p style="margin:0;color:#c5d8cb;font-size:10px;letter-spacing:2px;">YOUR TOKEN</p>
        <p class="email-token" style="margin:10px 0;color:#ffffff;font-size:48px;line-height:1.15;font-weight:bold;word-break:break-word;">${safeTokenLabel}</p>
        <p style="margin:0;color:#d7e5cf;font-size:13px;line-height:1.6;">${safeDepartmentName}</p>
      </td></tr></table>
      <h2 style="margin:26px 0 8px;font-size:16px;color:#173d39;">Visit details</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
        ${detailRow("Patient", patientName)}
        ${detailRow("Phone", phone || "Not available")}
        ${detailRow("Hospital", hospitalName || "Hospital")}
        ${detailRow("Department", departmentName || "Department")}
        ${detailRow("Doctor", doctorDisplay)}
        ${detailRow("Estimated wait", waitDisplay)}
      </table>
      <p style="margin:12px 0 0;font-size:11px;line-height:1.7;color:#6b7c73;">The estimate reflects the time this email was sent and may change. Open your tracking link for current progress.</p>
      ${trackingSection}
      <p style="margin:0;padding:16px;background:#edf3e6;border:1px solid #dce6d3;border-radius:11px;font-size:12px;line-height:1.8;color:#526d44;">Keep your tracking link private. You can follow your token from your phone’s browser.</p>
      `,
      safeHospitalName,
    ),
  });

  if (result.success) {
    console.log("✅ Patient token email sent:", { to: email, token: tokenLabel, id: result.id });
  } else {
    console.error("❌ Patient token email failed:", { to: email, token: tokenLabel, error: result.error });
  }

  return result.success;
};
// =========================================================
// APPOINTMENT BOOKING EMAIL
// Uses the same layout and Resend sender as the other emails above.
// =========================================================

export interface AppointmentBookedEmailData {
  email: string;
  patientName: string;
  patientPhone?: string;
  appointmentCode: string;
  hospitalName?: string;
  departmentName?: string;
  doctorName?: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  trackingUrl?: string;
}

export const sendAppointmentBookedEmail = async ({
  email,
  patientName,
  patientPhone,
  appointmentCode,
  hospitalName,
  departmentName,
  doctorName,
  appointmentDate,
  startTime,
  endTime,
  status,
  trackingUrl,
}: AppointmentBookedEmailData): Promise<boolean> => {
  if (!email) {
    console.warn("Appointment booking email skipped: No email address");
    return false;
  }

  // Escape values used directly in HTML. detailRow escapes its own values.
  const safePatientName = escapeHtml(patientName);
  const safeHospitalName = escapeHtml(hospitalName || "Hospital");
  const safeAppointmentCode = escapeHtml(appointmentCode);
  const safeTrackingUrl = trackingUrl ? escapeHtml(trackingUrl) : "";
  const statusLabel = (status || "BOOKED")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

  // Avoid showing “Dr. Dr.” when the supplied name already has a title.
  const trimmedDoctor = doctorName?.trim();
  const doctorDisplay = trimmedDoctor
    ? /^dr\.?\s/i.test(trimmedDoctor)
      ? trimmedDoctor
      : `Dr. ${trimmedDoctor}`
    : "Not assigned";

  // Keep the provided local date and time; do not shift them between timezones.
  const timeDisplay = startTime
    ? `${startTime}${endTime ? ` – ${endTime}` : ""}`
    : "Not available";

  const trackingSection = trackingUrl
    ? `
      <div style="margin:26px 0;">
        <a
          class="email-button"
          href="${safeTrackingUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="display:inline-block;padding:15px 24px;background:#176957;border:1px solid #176957;border-radius:11px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;"
        >View appointment status</a>
      </div>
      <p style="margin:0 0 6px;color:#6b7c73;font-size:12px;line-height:1.7;">
        If the button does not work, open your appointment link:
      </p>
      <p style="margin:0 0 24px;font-size:12px;line-height:1.7;word-break:break-all;">
        <a href="${safeTrackingUrl}" style="color:#176957;text-decoration:underline;">${safeTrackingUrl}</a>
      </p>
    `
    : `
      <p style="margin:24px 0;padding:16px;border:1px solid #e8dab8;border-radius:11px;background:#faf5e9;color:#856a36;font-size:13px;line-height:1.7;">
        Your appointment status link is currently unavailable. Please contact hospital reception for assistance.
      </p>
    `;

  const result = await sendViaResend({
    to: email,
    subject: `NextSynq Health Appointment ${appointmentCode} - ${hospitalName || "Hospital"}`,
    html: emailLayout(
      `Appointment ${appointmentCode} at ${hospitalName || "Hospital"}. Status: ${statusLabel}.`,
      `
      <p style="margin:0 0 12px;color:#6e895e;font-size:10px;letter-spacing:1.6px;font-weight:bold;">
        CARE, AT YOUR CONVENIENCE
      </p>
      <h1 class="email-heading" style="margin:0 0 18px;color:#173d39;font-size:28px;line-height:1.25;">
        Your appointment details
      </h1>
      <p style="margin:0 0 12px;color:#52695a;font-size:15px;line-height:1.7;">
        Hello <strong>${safePatientName}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#52695a;font-size:14px;line-height:1.8;">
        Here are your appointment details for ${safeHospitalName}. Save your appointment code and show it at reception when you arrive.
      </p>

      <!-- The reference code is easy to find on a phone at reception. -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:25px 16px;background:#173d39;border-radius:14px;">
            <p style="margin:0;color:#c5d8cb;font-size:10px;letter-spacing:2px;">APPOINTMENT CODE</p>
            <p class="email-token" style="margin:12px 0;color:#ffffff;font-size:38px;line-height:1.25;font-weight:bold;word-break:break-word;">
              ${safeAppointmentCode}
            </p>
            <p style="margin:0;color:#d7e5cf;font-size:13px;line-height:1.6;">
              Status: ${escapeHtml(statusLabel)}
            </p>
          </td>
        </tr>
      </table>

      <h2 style="margin:26px 0 8px;color:#173d39;font-size:16px;">Your visit at a glance</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
        ${detailRow("Patient", patientName)}
        ${detailRow("Phone", patientPhone || "Not available")}
        ${detailRow("Hospital", hospitalName || "Hospital")}
        ${detailRow("Department", departmentName || "Department")}
        ${detailRow("Doctor", doctorDisplay)}
        ${detailRow("Date", appointmentDate || "Not available")}
        ${detailRow("Time", timeDisplay)}
      </table>

      ${trackingSection}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:16px;background:#edf3e6;border:1px solid #dce6d3;border-radius:11px;">
            <p style="margin:0 0 6px;color:#526d44;font-size:13px;font-weight:bold;">Before your visit</p>
            <p style="margin:0;color:#526d44;font-size:12px;line-height:1.8;">
              For a booked appointment, please arrive before the scheduled time and check in at reception. Your live queue tracking link will be generated after check-in.
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0;color:#6b7c73;font-size:11px;line-height:1.8;">
        Keep your appointment link private. This email shows the details at the time it was sent; open your appointment link for the latest status.
      </p>
      `,
      safeHospitalName,
    ),
  });

  // Do not write patient details or private tracking links to the logs.
  if (result.success) {
    console.log("Appointment booking email sent:", { id: result.id });
  } else {
    console.error("Appointment booking email failed:", result.error);
  }

  return result.success;
};
