import nodemailer from "nodemailer";

// =========================================================
// SMTP CONFIG
// =========================================================

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE !== "false";

const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "NexTurn Queue Management";
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;

if (!SMTP_USER) console.error("Email config error: SMTP_USER is missing");
if (!SMTP_PASS) console.error("Email config error: SMTP_PASS is missing");

// =========================================================
// TRANSPORTER
// =========================================================

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

const getFromAddress = () => `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`;

// =========================================================
// VERIFY EMAIL CONNECTION
// =========================================================

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log("Email service connected:", getFromAddress());
    return true;
  } catch (error) {
    console.error("Email service connection failed:", error);
    return false;
  }
};

// =========================================================
// SEND PASSWORD RESET EMAIL
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
  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: email,
      subject: "Reset Your NexTurn Password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
              <div style="background-color: #2563eb; padding: 30px; text-align: center; color: white;">
                <div style="font-size: 40px; margin-bottom: 10px;">🏥</div>
                <h1 style="margin: 0; font-size: 26px;">NexTurn</h1>
                <p style="margin: 8px 0 0; color: #dbeafe; font-size: 14px;">Queue Management System</p>
              </div>

              <div style="padding: 40px 30px;">
                <h2 style="margin-top: 0; color: #0f172a; font-size: 24px;">Reset your password</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.7;">Hi ${name},</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.7;">
                  We received a request to reset your NexTurn account password.
                </p>
                <p style="color: #475569; font-size: 15px; line-height: 1.7;">
                  Click the button below to create a new password.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <a
                    href="${resetUrl}"
                    style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px;"
                  >
                    Reset Password
                  </a>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                  This password reset link will expire in 15 minutes.
                </p>
                <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                  If you did not request a password reset, you can safely ignore this email.
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />

                <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #2563eb; font-size: 12px; word-break: break-all;">${resetUrl}</p>
              </div>

              <div style="background-color: #f8fafc; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2026 NexTurn Queue Management System</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Password reset email sent to:", email);
    return true;
  } catch (error) {
    console.error("Password reset email failed for", email, error);
    return false;
  }
};

// =========================================================
// SEND PATIENT TRACKING EMAIL
// =========================================================

export interface PatientNotificationData {
  phone?: string;
  email?: string;
  patientName: string;
  tokenLabel: string;
  hospitalName: string;
  departmentName: string;
  doctorName?: string;
  trackingUrl?: string;
  patientsAhead?: number;
  estimatedWaitTime?: number;
}

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
    console.warn("Skipping patient tracking email — no email address for", patientName);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: email,
      subject: `NexTurn Token ${tokenLabel} - ${hospitalName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>NexTurn Token</title>
          </head>
          <body style="margin:0; padding:0; background:#f1f5f9; font-family:Arial, Helvetica, sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden;">
              <div style="background:#2563eb; padding:30px; text-align:center; color:white;">
                <div style="font-size:40px; margin-bottom:10px;">🏥</div>
                <h1 style="margin:0; font-size:26px;">${hospitalName}</h1>
                <p style="margin:8px 0 0; color:#dbeafe; font-size:14px;">NexTurn Queue Management</p>
              </div>

              <div style="padding:35px 30px;">
                <h2 style="margin-top:0; color:#0f172a;">Your Queue Token</h2>

                <p style="color:#475569; font-size:15px;">Hello <strong>${patientName}</strong>,</p>
                <p style="color:#475569; font-size:15px; line-height:1.6;">
                  Your token has been successfully generated. You can track your queue position using the link below.
                </p>

                <div style="margin:25px 0; padding:25px; background:#eff6ff; border:1px solid #dbeafe; border-radius:14px; text-align:center;">
                  <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Your Token</p>
                  <div style="margin-top:8px; color:#2563eb; font-size:42px; font-weight:bold;">${tokenLabel}</div>
                </div>

                <h3 style="color:#0f172a; margin-top:30px;">Patient Information</h3>

                <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse; font-size:14px;">
                  <tr>
                    <td style="color:#64748b; border-bottom:1px solid #e2e8f0;">Patient Name</td>
                    <td style="color:#0f172a; font-weight:bold; text-align:right; border-bottom:1px solid #e2e8f0;">${patientName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; border-bottom:1px solid #e2e8f0;">Patient Phone</td>
                    <td style="color:#0f172a; font-weight:bold; text-align:right; border-bottom:1px solid #e2e8f0;">${phone || "Not available"}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; border-bottom:1px solid #e2e8f0;">Hospital</td>
                    <td style="color:#0f172a; font-weight:bold; text-align:right; border-bottom:1px solid #e2e8f0;">${hospitalName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; border-bottom:1px solid #e2e8f0;">Department</td>
                    <td style="color:#0f172a; font-weight:bold; text-align:right; border-bottom:1px solid #e2e8f0;">${departmentName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; border-bottom:1px solid #e2e8f0;">Doctor</td>
                    <td style="color:#0f172a; font-weight:bold; text-align:right; border-bottom:1px solid #e2e8f0;">${doctorName ? `Dr. ${doctorName}` : "Not assigned"}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; border-bottom:1px solid #e2e8f0;">Estimated Wait</td>
                    <td style="color:#0f172a; font-weight:bold; text-align:right; border-bottom:1px solid #e2e8f0;">${
                      estimatedWaitTime !== undefined ? `${estimatedWaitTime} minutes` : "Calculating..."
                    }</td>
                  </tr>
                </table>

                ${
                  trackingUrl
                    ? `
                <div style="text-align:center; margin:35px 0;">
                  <a
                    href="${trackingUrl}"
                    target="_blank"
                    style="display:inline-block; padding:15px 30px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:10px; font-weight:bold; font-size:15px;"
                  >
                    Track My Queue
                  </a>
                </div>

                <p style="color:#64748b; font-size:13px;">Tracking URL:</p>
                <p style="color:#2563eb; font-size:12px; word-break:break-all;">${trackingUrl}</p>
                `
                    : ""
                }

                <hr style="border:none; border-top:1px solid #e2e8f0; margin:30px 0;" />

                <p style="color:#64748b; font-size:13px; line-height:1.6;">
                  Please keep this tracking link private. Your queue information will update automatically while you track your token.
                </p>
              </div>

              <div style="background:#f8fafc; padding:20px; text-align:center;">
                <p style="margin:0; color:#94a3b8; font-size:12px;">© 2026 ${hospitalName} · NexTurn</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Patient token email sent:", { to: email, token: tokenLabel, messageId: info.messageId });
    return true;
  } catch (error) {
    console.error("Patient token email failed for", email, error);
    return false;
  }
};