import "dotenv/config";
import express from "express";
import cors, { type CorsOptions } from "cors";
import path from "path";

import authRoutes from "./routes/auth.routes";
import testRoutes from "./routes/test.routes";
import departmentRoutes from "./routes/department.routes";
import doctorRoutes from "./routes/doctor.routes";
import receptionistRoutes from "./routes/receptionist.routes";
import patientRoutes from "./routes/patient.routes";
import queueRoutes from "./routes/queue.routes";
import notificationRoutes from "./routes/notification.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import superAdminRoutes from "./routes/superAdmin.routes";
import whatsappWebhookRoutes from "./routes/whatsappWebhook.routes";
import hospitalRoutes from "./routes/hospital.routes";
import hospitalAdminRoutes from "./routes/hospitalAdmin.routes";
import displayRoutes from "./routes/display.routes";
import consultationRoutes from "./routes/consultation.routes";
import transcriptionRoutes from "./routes/transcription.routes";
import labRoutes from "./routes/lab.routes";
import labDepartmentRoutes from "./routes/labDepartment.routes";
import labRoomRoutes from "./routes/labRoom.routes";
import labTechnicianRoutes from "./routes/labTechnician.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import appointmentRoutes from "./routes/appointment.routes";
import publicAppointmentRoutes from "./routes/publicAppointment.routes";
import doctorAvailabilityRoutes from "./routes/doctorAvailability.routes";

import { protect } from "./middleware/auth.middleware";

const app = express();

// ============================================================
// CORS CONFIG
// ============================================================

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://nexturn-silk.vercel.app",
];

/*
 * Backend deployment environment:
 *
 * CLIENT_URLS=https://nexturn-silk.vercel.app,https://yourdomain.com
 *
 * Local environment:
 *
 * CLIENT_URLS=http://localhost:5173
 */
const envAllowedOrigins =
  process.env.CLIENT_URLS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...envAllowedOrigins,
];

const normalizeOrigin = (origin: string) => {
  return origin.replace(/\/$/, "");
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    /*
     * Allow requests without an origin:
     * - Postman
     * - Server-to-server requests
     * - Health checks
     */
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = normalizeOrigin(origin);

    const isAllowed = allowedOrigins
      .map(normalizeOrigin)
      .includes(cleanOrigin);

    // Preserve the existing Vercel preview matching rule.
    const isYourVercelPreview =
      /^https:\/\/nexturn.*\.vercel\.app$/.test(cleanOrigin);

    if (isAllowed || isYourVercelPreview) {
      console.log("✅ CORS allowed:", cleanOrigin);

      return callback(null, true);
    }

    console.log("❌ CORS rejected:", cleanOrigin);

    return callback(
      new Error(`CORS blocked origin: ${cleanOrigin}`),
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ============================================================
// BODY PARSER
// ============================================================

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Hospital Queue API is running",
  });
});

// ============================================================
// STATIC UPLOADS
// ============================================================

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads")),
);

// ============================================================
// ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/receptionists", receptionistRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/queues", queueRoutes);
app.use("/api/test", testRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/hospital-admins", hospitalAdminRoutes);
app.use("/api/display", displayRoutes);
app.use("/api/webhooks/whatsapp", whatsappWebhookRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/transcriptions", transcriptionRoutes);
app.use("/api/lab-tests", labRoutes);
app.use("/api/lab-departments", labDepartmentRoutes);
app.use("/api/lab-rooms", labRoomRoutes);
app.use("/api/lab-technicians", labTechnicianRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/public", publicAppointmentRoutes);

app.use(
  "/api/doctor-availability",
  protect,
  doctorAvailabilityRoutes,
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

export default app;