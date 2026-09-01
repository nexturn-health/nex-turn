import "dotenv/config";
import express from "express";
import cors from "cors";
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

// import receptionRoutes from "./routes/reception.routes";

import displayRoutes from "./routes/display.routes";

const app = express();

const clientUrl = (
  process.env.CLIENT_URL ||
  "http://localhost:5173"
).trim().replace(/,$/, "");

console.log("🌐 CORS CLIENT_URL:", JSON.stringify(clientUrl));

app.use(
  cors({
    origin: clientUrl,
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
  })
);

app.use(express.json());

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Hospital Queue API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/departments",departmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/receptionists",receptionistRoutes);
app.use("/api/patients",patientRoutes);
app.use("/api/queues",queueRoutes);
app.use("/api/test", testRoutes);
app.use("/api/notifications", notificationRoutes,);
app.use("/api/dashboard", dashboardRoutes,);
app.use("/api/super-admin",superAdminRoutes,);
app.use("/api/hospitals",hospitalRoutes,);
app.use("/api/hospital-admins",hospitalAdminRoutes);
// app.use("/api/reception",receptionRoutes );
app.use("/api/display", displayRoutes );
app.use(
    "/api/webhooks/whatsapp",
    whatsappWebhookRoutes
);

export default app;
//6a86358499174b8a8f5e428a
