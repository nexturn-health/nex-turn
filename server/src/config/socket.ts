import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            throw new Error(
                "MONGO_URI is not defined in environment variables",
            );
        }

        console.log("Connecting to MongoDB...");

        await mongoose.connect(mongoURI);

        console.log("✅ MongoDB connected successfully");
    } catch (error) {
        console.error(
            "❌ MongoDB connection failed:",
            error,
        );

        process.exit(1);
    }
};

export { connectDB };
let io: Server | null = null;

export const initializeSocket = (
    httpServer: HttpServer,
) => {
    io = new Server(httpServer, {
        cors: {
            origin:
                process.env.CLIENT_URL ||
                "http://localhost:5173",
            credentials: true,
        },
        transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
        console.log(
            "SOCKET CONNECTED:",
            socket.id,
        );

        // =========================================
        // JOIN HOSPITAL
        // =========================================

        socket.on(
            "join:hospital",
            (hospitalId: string) => {

                if (!hospitalId) {
                    console.log(
                        "JOIN HOSPITAL FAILED: missing hospitalId",
                    );
                    return;
                }

                const room =
                    `hospital:${hospitalId}`;

                socket.join(room);

                console.log(
                    `SOCKET ${socket.id} JOINED ${room}`,
                );
            },
        );

        // =========================================
        // QUEUE TRACKING
        // =========================================

        socket.on(
            "queue:join",
            (trackingToken: string) => {

                if (!trackingToken) {
                    return;
                }

                const room =
                    `queue:${trackingToken}`;

                socket.join(room);

                console.log(
                    `SOCKET ${socket.id} JOINED ${room}`,
                );
            },
        );

        socket.on(
            "queue:leave",
            (trackingToken: string) => {

                if (!trackingToken) {
                    return;
                }

                const room =
                    `queue:${trackingToken}`;

                socket.leave(room);
            },
        );

        // =========================================
        // DISCONNECT
        // =========================================

        socket.on("disconnect", () => {

            console.log(
                "SOCKET DISCONNECTED:",
                socket.id,
            );

        });
    });

    return io;
};

// =========================================
// GET SOCKET
// =========================================

export const getIO = (): Server => {

    if (!io) {
        throw new Error(
            "Socket.IO is not initialized",
        );
    }

    return io;
};

// =========================================
// DOCTOR STATUS
// =========================================

export const emitDoctorStatus = ({
    hospitalId,
    userId,
    doctorName,
    isOnline,
    lastSeenAt,
}: {
    hospitalId: string;
    userId: string;
    doctorName: string;
    isOnline: boolean;
    lastSeenAt: Date;
}) => {

    const socketIO = getIO();

    const room =
        `hospital:${hospitalId}`;

    console.log(
        "EMITTING DOCTOR STATUS:",
        {
            room,
            userId,
            doctorName,
            isOnline,
        },
    );

    socketIO
        .to(room)
        .emit(
            "user:status",
            {
                userId,
                role: "DOCTOR",
                doctorName,
                isOnline,
                lastSeenAt,
            },
        );
};