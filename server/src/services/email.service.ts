
import nodemailer from "nodemailer";

// =========================================================
// SMTP CONFIG
// =========================================================

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const SMTP_HOST =
  process.env.SMTP_HOST || "smtp.gmail.com";

const SMTP_PORT =
  Number(process.env.SMTP_PORT || 465);

const SMTP_SECURE =
  process.env.SMTP_SECURE !== "false";

const SMTP_FROM_NAME =
  process.env.SMTP_FROM_NAME ||
  "NexTurn Queue Management";

const SMTP_FROM_EMAIL =
  process.env.SMTP_FROM_EMAIL ||
  SMTP_USER;

// =========================================================
// CONFIG VALIDATION
// =========================================================

console.log("=================================");
console.log("NexTurn EMAIL CONFIG");
console.log("=================================");
console.log("SMTP_HOST:", SMTP_HOST);
console.log("SMTP_PORT:", SMTP_PORT);
console.log("SMTP_SECURE:", SMTP_SECURE);
console.log("SMTP_USER:", SMTP_USER || "NOT SET");
console.log(
  "SMTP_PASS_EXISTS:",
  Boolean(SMTP_PASS),
);
console.log(
  "SMTP_FROM_NAME:",
  SMTP_FROM_NAME,
);
console.log(
  "SMTP_FROM_EMAIL:",
  SMTP_FROM_EMAIL || "NOT SET",
);
console.log("=================================");

if (!SMTP_USER) {
  console.error(
    "❌ SMTP_USER is missing",
  );
}

if (!SMTP_PASS) {
  console.error(
    "❌ SMTP_PASS is missing",
  );
}

// =========================================================
// NODEMAILER TRANSPORTER
// =========================================================

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: 587,
  secure: false,

  auth: {
    user: SMTP_USER!,
    pass: SMTP_PASS!,
  },

  requireTLS: true,

  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,

  tls: {
    servername: "smtp.gmail.com",
  },
});
// =========================================================
// FROM ADDRESS
// =========================================================

const getFromAddress = (): string => {
  return `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`;
};

// =========================================================
// HTML ESCAPE
// =========================================================

const escapeHtml = (
  value: unknown,
): string => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// =========================================================
// VERIFY EMAIL CONNECTION
// =========================================================

export const verifyEmailConnection =
  async (): Promise<boolean> => {
    try {
      if (!SMTP_USER || !SMTP_PASS) {
        console.error(
          "❌ Email service cannot start: SMTP credentials missing",
        );

        return false;
      }

      await transporter.verify();

      console.log("=================================");
      console.log(
        "✅ EMAIL SERVICE: CONNECTED",
      );
      console.log(
        "EMAIL USER:",
        SMTP_USER,
      );
      console.log(
        "EMAIL FROM:",
        getFromAddress(),
      );
      console.log("=================================");

      return true;
    } catch (error) {
      console.error("=================================");
      console.error(
        "❌ EMAIL SERVICE: FAILED",
      );
      console.error(error);
      console.error("=================================");

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

export const sendPasswordResetEmail =
  async ({
    email,
    name,
    resetUrl,
  }: SendPasswordResetEmailParams): Promise<boolean> => {
    try {
      const safeName =
        escapeHtml(name);

      const safeResetUrl =
        escapeHtml(resetUrl);

      console.log("=================================");
      console.log(
        "📧 PASSWORD RESET EMAIL",
      );
      console.log("TO:", email);
      console.log(
        "FROM:",
        getFromAddress(),
      );
      console.log("=================================");

      await transporter.sendMail({
        from: getFromAddress(),

        to: email,

        replyTo: SMTP_FROM_EMAIL,

        subject:
          "Reset Your NexTurn Password",

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f1f5f9;
    font-family:Arial,Helvetica,sans-serif;
  "
>

<div
  style="
    max-width:600px;
    margin:40px auto;
    background:#ffffff;
    border-radius:16px;
    overflow:hidden;
  "
>

  <!-- HEADER -->

  <div
    style="
      background:#2563eb;
      padding:30px;
      text-align:center;
      color:#ffffff;
    "
  >

    <div
      style="
        font-size:40px;
        margin-bottom:10px;
      "
    >
      🏥
    </div>

    <h1
      style="
        margin:0;
        font-size:26px;
      "
    >
      NexTurn
    </h1>

    <p
      style="
        margin:8px 0 0;
        color:#dbeafe;
        font-size:14px;
      "
    >
      Queue Management System
    </p>

  </div>

  <!-- CONTENT -->

  <div style="padding:40px 30px;">

    <h2
      style="
        margin-top:0;
        color:#0f172a;
      "
    >
      Reset your password
    </h2>

    <p
      style="
        color:#475569;
        font-size:15px;
        line-height:1.7;
      "
    >
      Hi ${safeName},
    </p>

    <p
      style="
        color:#475569;
        font-size:15px;
        line-height:1.7;
      "
    >
      We received a request to reset your
      NexTurn account password.
    </p>

    <div
      style="
        text-align:center;
        margin:30px 0;
      "
    >

      <a
        href="${safeResetUrl}"
        style="
          display:inline-block;
          padding:14px 28px;
          background:#2563eb;
          color:#ffffff;
          text-decoration:none;
          border-radius:10px;
          font-weight:bold;
        "
      >
        Reset Password
      </a>

    </div>

    <p
      style="
        color:#64748b;
        font-size:13px;
        line-height:1.6;
      "
    >
      This password reset link will expire
      in 15 minutes.
    </p>

    <p
      style="
        color:#64748b;
        font-size:13px;
        line-height:1.6;
      "
    >
      If you did not request a password reset,
      you can safely ignore this email.
    </p>

  </div>

  <!-- FOOTER -->

  <div
    style="
      background:#f8fafc;
      padding:20px;
      text-align:center;
    "
  >

    <p
      style="
        margin:0;
        color:#94a3b8;
        font-size:12px;
      "
    >
      © 2026 NexTurn Queue Management System
    </p>

  </div>

</div>

</body>
</html>
        `,
      });

      console.log(
        "✅ Password reset email sent:",
        email,
      );

      return true;
    } catch (error) {
      console.error(
        "❌ Password reset email failed:",
        {
          email,
          error,
        },
      );

      return false;
    }
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

export const sendPatientTrackingEmail =
  async ({
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

    // =====================================================
    // EMAIL VALIDATION
    // =====================================================

    if (!email) {
      console.warn(
        "⚠️ Patient tracking email skipped:",
        "No email address",
      );

      console.warn(
        "PATIENT:",
        patientName,
      );

      return false;
    }

    if (!SMTP_USER || !SMTP_PASS) {
      console.error(
        "❌ Patient tracking email failed:",
        "SMTP credentials missing",
      );

      return false;
    }

    // =====================================================
    // SAFE VALUES
    // =====================================================

    const safePatientName =
      escapeHtml(patientName);

    const safeHospitalName =
      escapeHtml(
        hospitalName || "Hospital",
      );

    const safeDepartmentName =
      escapeHtml(
        departmentName || "Department",
      );

    const safeDoctorName =
      escapeHtml(doctorName);

    const safeTokenLabel =
      escapeHtml(tokenLabel);

    const safePhone =
      escapeHtml(
        phone || "Not available",
      );

    const safeTrackingUrl =
      trackingUrl
        ? escapeHtml(trackingUrl)
        : "";

    // =====================================================
    // DISPLAY VALUES
    // =====================================================

    const doctorDisplay =
      doctorName
        ? `Dr. ${safeDoctorName}`
        : "Not assigned";

    const waitDisplay =
      estimatedWaitTime !== undefined &&
      estimatedWaitTime !== null
        ? `${estimatedWaitTime} minutes`
        : "Calculating...";

    // =====================================================
    // TRACKING SECTION
    // =====================================================

    const trackingSection =
      trackingUrl
        ? `
          <div
            style="
              text-align:center;
              margin:35px 0;
            "
          >

            <a
              href="${safeTrackingUrl}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display:inline-block;
                padding:15px 30px;
                background:#2563eb;
                color:#ffffff;
                text-decoration:none;
                border-radius:10px;
                font-weight:bold;
                font-size:15px;
              "
            >
              Track My Queue
            </a>

          </div>

          <p
            style="
              color:#64748b;
              font-size:13px;
              margin-bottom:6px;
            "
          >
            Tracking URL:
          </p>

          <p
            style="
              color:#2563eb;
              font-size:12px;
              word-break:break-all;
            "
          >
            ${safeTrackingUrl}
          </p>
        `
        : `
          <div
            style="
              margin:30px 0;
              padding:15px;
              background:#fefce8;
              border:1px solid #fde68a;
              border-radius:10px;
            "
          >

            <p
              style="
                margin:0;
                color:#854d0e;
                font-size:13px;
              "
            >
              Your queue tracking link is currently
              unavailable. Please contact the hospital
              reception for assistance.
            </p>

          </div>
        `;

    // =====================================================
    // LOG
    // =====================================================

    console.log("=================================");
    console.log(
      "📧 SENDING PATIENT TOKEN EMAIL",
    );
    console.log("TO:", email);
    console.log(
      "PATIENT:",
      patientName,
    );
    console.log(
      "PHONE:",
      phone || "undefined",
    );
    console.log(
      "HOSPITAL:",
      hospitalName || "undefined",
    );
    console.log(
      "DEPARTMENT:",
      departmentName || "undefined",
    );
    console.log(
      "DOCTOR:",
      doctorName || "undefined",
    );
    console.log(
      "TOKEN:",
      tokenLabel,
    );
    console.log(
      "ESTIMATED WAIT:",
      estimatedWaitTime ?? "undefined",
    );
    console.log(
      "TRACKING URL:",
      trackingUrl || "undefined",
    );
    console.log("=================================");

    // =====================================================
    // SEND EMAIL
    // =====================================================

    try {
      const info =
        await transporter.sendMail({
          from: getFromAddress(),

          to: email,

          replyTo:
            SMTP_FROM_EMAIL,

          subject:
            `NexTurn Token ${tokenLabel} - ${
              hospitalName || "Hospital"
            }`,

          html: `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    NexTurn Queue Token
  </title>

</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f1f5f9;
    font-family:Arial,Helvetica,sans-serif;
  "
>

<div
  style="
    max-width:600px;
    margin:40px auto;
    background:#ffffff;
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 10px 30px rgba(0,0,0,0.08);
  "
>

  <!-- ================================================= -->
  <!-- HEADER -->
  <!-- ================================================= -->

  <div
    style="
      background:#2563eb;
      padding:30px;
      text-align:center;
      color:#ffffff;
    "
  >

    <div
      style="
        font-size:40px;
        margin-bottom:10px;
      "
    >
      🏥
    </div>

    <h1
      style="
        margin:0;
        font-size:26px;
      "
    >
      ${safeHospitalName}
    </h1>

    <p
      style="
        margin:8px 0 0;
        color:#dbeafe;
        font-size:14px;
      "
    >
      NexTurn Queue Management
    </p>

  </div>


  <!-- ================================================= -->
  <!-- CONTENT -->
  <!-- ================================================= -->

  <div
    style="
      padding:35px 30px;
    "
  >

    <h2
      style="
        margin-top:0;
        color:#0f172a;
        font-size:24px;
      "
    >
      Your Queue Token
    </h2>


    <p
      style="
        color:#475569;
        font-size:15px;
        line-height:1.6;
      "
    >
      Hello
      <strong>
        ${safePatientName}
      </strong>,
    </p>


    <p
      style="
        color:#475569;
        font-size:15px;
        line-height:1.6;
      "
    >
      Your token has been successfully generated.
      You can track your queue position in real time
      using the tracking link below.
    </p>


    <!-- ================================================= -->
    <!-- TOKEN -->
    <!-- ================================================= -->

    <div
      style="
        margin:25px 0;
        padding:25px;
        background:#eff6ff;
        border:1px solid #dbeafe;
        border-radius:14px;
        text-align:center;
      "
    >

      <p
        style="
          margin:0;
          color:#64748b;
          font-size:12px;
          text-transform:uppercase;
          letter-spacing:1px;
        "
      >
        Your Token
      </p>

      <div
        style="
          margin-top:8px;
          color:#2563eb;
          font-size:42px;
          font-weight:bold;
        "
      >
        ${safeTokenLabel}
      </div>

    </div>


    <!-- ================================================= -->
    <!-- PATIENT INFORMATION -->
    <!-- ================================================= -->

    <h3
      style="
        color:#0f172a;
        margin-top:30px;
      "
    >
      Patient Information
    </h3>


    <table
      width="100%"
      cellpadding="10"
      cellspacing="0"
      style="
        border-collapse:collapse;
        font-size:14px;
      "
    >

      <tr>

        <td
          style="
            color:#64748b;
            border-bottom:1px solid #e2e8f0;
          "
        >
          Patient Name
        </td>

        <td
          style="
            color:#0f172a;
            font-weight:bold;
            text-align:right;
            border-bottom:1px solid #e2e8f0;
          "
        >
          ${safePatientName}
        </td>

      </tr>


      <tr>

        <td
          style="
            color:#64748b;
            border-bottom:1px solid #e2e8f0;
          "
        >
          Patient Phone
        </td>

        <td
          style="
            color:#0f172a;
            font-weight:bold;
            text-align:right;
            border-bottom:1px solid #e2e8f0;
          "
        >
          ${safePhone}
        </td>

      </tr>


      <tr>

        <td
          style="
            color:#64748b;
            border-bottom:1px solid #e2e8f0;
          "
        >
          Hospital
        </td>

        <td
          style="
            color:#0f172a;
            font-weight:bold;
            text-align:right;
            border-bottom:1px solid #e2e8f0;
          "
        >
          ${safeHospitalName}
        </td>

      </tr>


      <tr>

        <td
          style="
            color:#64748b;
            border-bottom:1px solid #e2e8f0;
          "
        >
          Department
        </td>

        <td
          style="
            color:#0f172a;
            font-weight:bold;
            text-align:right;
            border-bottom:1px solid #e2e8f0;
          "
        >
          ${safeDepartmentName}
        </td>

      </tr>


      <tr>

        <td
          style="
            color:#64748b;
            border-bottom:1px solid #e2e8f0;
          "
        >
          Doctor
        </td>

        <td
          style="
            color:#0f172a;
            font-weight:bold;
            text-align:right;
            border-bottom:1px solid #e2e8f0;
          "
        >
          ${doctorDisplay}
        </td>

      </tr>


      <tr>

        <td
          style="
            color:#64748b;
          "
        >
          Estimated Wait
        </td>

        <td
          style="
            color:#0f172a;
            font-weight:bold;
            text-align:right;
          "
        >
          ${waitDisplay}
        </td>

      </tr>

    </table>


    <!-- ================================================= -->
    <!-- TRACKING -->
    <!-- ================================================= -->

    ${trackingSection}


    <hr
      style="
        border:none;
        border-top:1px solid #e2e8f0;
        margin:30px 0;
      "
    />


    <p
      style="
        color:#64748b;
        font-size:13px;
        line-height:1.6;
      "
    >
      Please keep your tracking link private.
      Your queue information will update automatically
      while you track your token.
    </p>

  </div>


  <!-- ================================================= -->
  <!-- FOOTER -->
  <!-- ================================================= -->

  <div
    style="
      background:#f8fafc;
      padding:20px;
      text-align:center;
    "
  >

    <p
      style="
        margin:0;
        color:#94a3b8;
        font-size:12px;
      "
    >
      © 2026 ${safeHospitalName} · NexTurn
    </p>

  </div>

</div>

</body>

</html>
          `,
        });

      console.log("=================================");
      console.log(
        "✅ PATIENT TOKEN EMAIL SENT",
      );
      console.log("TO:", email);
      console.log(
        "TOKEN:",
        tokenLabel,
      );
      console.log(
        "MESSAGE ID:",
        info.messageId,
      );
      console.log(
        "RESPONSE:",
        info.response,
      );
      console.log("=================================");

      return true;

    } catch (error) {

      console.error("=================================");
      console.error(
        "❌ PATIENT TOKEN EMAIL FAILED",
      );
      console.error("TO:", email);
      console.error(
        "TOKEN:",
        tokenLabel,
      );
      console.error("ERROR:", error);
      console.error("=================================");

      return false;
    }
  };