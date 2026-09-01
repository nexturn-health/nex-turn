import "dotenv/config";
import http from "http";
import { connectDB } from "./config/db";
import app from "./app";
import { initializeSocket } from "./config/socket";
import { verifyEmailConnection } from "./services/email.service";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("1. Starting server...");

    console.log("2. Connecting to MongoDB...");
    await connectDB();
    console.log("3. MongoDB connected");

    const httpServer = http.createServer(app);

    console.log("4. Initializing Socket.IO...");
    initializeSocket(httpServer);

    console.log("5. Starting server...");

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Socket.IO is running");
      verifyEmailConnection();
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

startServer();