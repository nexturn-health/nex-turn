// =========================================================
// EMAIL CONFIG (Resend — HTTPS API, not SMTP)
//
// Render's free tier blocks outbound SMTP ports (25/465/587), so raw
// nodemailer/SMTP connections time out no matter how they're configured.
// Resend sends over HTTPS (port 443), which is never blocked.
//
// Env vars needed:
//   RESEND_API_KEY   - from https://resend.com/api-keys
//   EMAIL_FROM       - e.g. "NexTurn <onboarding@resend.dev>" for testing,
//                       or "NexTurn <noreply@yourdomain.com>" once you've
//                       verified a domain in Resend.
// =========================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "NexTurn <onboarding@resend.dev>";
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
    subject: "Reset Your NexTurn Password",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="background:#2563eb;padding:30px;text-align:center;color:#ffffff;">
      <div style="font-size:40px;margin-bottom:10px;">🏥</div>
      <h1 style="margin:0;font-size:26px;">NexTurn</h1>
      <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">Queue Management System</p>
    </div>

    <div style="padding:40px 30px;">
      <h2 style="margin-top:0;color:#0f172a;">Reset your password</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;">Hi ${safeName},</p>
      <p style="color:#475569;font-size:15px;line-height:1.7;">
        We received a request to reset your NexTurn account password.
      </p>

      <div style="text-align:center;margin:30px 0;">
        <a
          href="${safeResetUrl}"
          style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;"
        >
          Reset Password
        </a>
      </div>

      <p style="color:#64748b;font-size:13px;line-height:1.6;">
        This password reset link will expire in 15 minutes.
      </p>
      <p style="color:#64748b;font-size:13px;line-height:1.6;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>

    <div style="background:#f8fafc;padding:20px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 NexTurn Queue Management System</p>
    </div>
  </div>
</body>
</html>
    `,
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
  const safeDoctorName = escapeHtml(doctorName);
  const safeTokenLabel = escapeHtml(tokenLabel);
  const safePhone = escapeHtml(phone || "Not available");
  const safeTrackingUrl = trackingUrl ? escapeHtml(trackingUrl) : "";

  const doctorDisplay = doctorName ? `Dr. ${safeDoctorName}` : "Not assigned";
  const waitDisplay =
    estimatedWaitTime !== undefined && estimatedWaitTime !== null ? `${estimatedWaitTime} minutes` : "Calculating...";

  const trackingSection = trackingUrl
    ? `
      <div style="text-align:center;margin:35px 0;">
        <a
          href="${safeTrackingUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="display:inline-block;padding:15px 30px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;"
        >
          Track My Queue
        </a>
      </div>
      <p style="color:#64748b;font-size:13px;margin-bottom:6px;">Tracking URL:</p>
      <p style="color:#2563eb;font-size:12px;word-break:break-all;">${safeTrackingUrl}</p>
    `
    : `
      <div style="margin:30px 0;padding:15px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;">
        <p style="margin:0;color:#854d0e;font-size:13px;">
          Your queue tracking link is currently unavailable. Please contact the hospital reception for assistance.
        </p>
      </div>
    `;

  console.log("📧 Sending patient token email:", {
    to: email,
    patient: patientName,
    phone: phone || "N/A",
    hospital: hospitalName || "N/A",
    department: departmentName || "N/A",
    doctor: doctorName || "N/A",
    token: tokenLabel,
    estimatedWaitTime: estimatedWaitTime ?? "N/A",
    trackingUrl: trackingUrl || "N/A",
  });

  const result = await sendViaResend({
    to: email,
    subject: `NexTurn Token ${tokenLabel} - ${hospitalName || "Hospital"}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NexTurn Queue Token</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

    <div style="background:#2563eb;padding:30px;text-align:center;color:#ffffff;">
      <div style="font-size:40px;margin-bottom:10px;">🏥</div>
      <h1 style="margin:0;font-size:26px;">${safeHospitalName}</h1>
      <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">NexTurn Queue Management</p>
    </div>

    <div style="padding:35px 30px;">
      <h2 style="margin-top:0;color:#0f172a;font-size:24px;">Your Queue Token</h2>

      <p style="color:#475569;font-size:15px;line-height:1.6;">
        Hello <strong>${safePatientName}</strong>,
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;">
        Your token has been successfully generated. You can track your queue position in real time using the tracking link below.
      </p>

      <div style="margin:25px 0;padding:25px;background:#eff6ff;border:1px solid #dbeafe;border-radius:14px;text-align:center;">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Token</p>
        <div style="margin-top:8px;color:#2563eb;font-size:42px;font-weight:bold;">${safeTokenLabel}</div>
      </div>

      <h3 style="color:#0f172a;margin-top:30px;">Patient Information</h3>

      <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">Patient Name</td>
          <td style="color:#0f172a;font-weight:bold;text-align:right;border-bottom:1px solid #e2e8f0;">${safePatientName}</td>
        </tr>
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">Patient Phone</td>
          <td style="color:#0f172a;font-weight:bold;text-align:right;border-bottom:1px solid #e2e8f0;">${safePhone}</td>
        </tr>
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">Hospital</td>
          <td style="color:#0f172a;font-weight:bold;text-align:right;border-bottom:1px solid #e2e8f0;">${safeHospitalName}</td>
        </tr>
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">Department</td>
          <td style="color:#0f172a;font-weight:bold;text-align:right;border-bottom:1px solid #e2e8f0;">${safeDepartmentName}</td>
        </tr>
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">Doctor</td>
          <td style="color:#0f172a;font-weight:bold;text-align:right;border-bottom:1px solid #e2e8f0;">${doctorDisplay}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Estimated Wait</td>
          <td style="color:#0f172a;font-weight:bold;text-align:right;">${waitDisplay}</td>
        </tr>
      </table>

      ${trackingSection}

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0;" />

      <p style="color:#64748b;font-size:13px;line-height:1.6;">
        Please keep your tracking link private. Your queue information will update automatically while you track your token.
      </p>
    </div>

    <div style="background:#f8fafc;padding:20px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 ${safeHospitalName} · NexTurn</p>
    </div>
  </div>
</body>
</html>
    `,
  });

  if (result.success) {
    console.log("✅ Patient token email sent:", { to: email, token: tokenLabel, id: result.id });
  } else {
    console.error("❌ Patient token email failed:", { to: email, token: tokenLabel, error: result.error });
  }

  return result.success;
};