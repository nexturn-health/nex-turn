import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import mongoose from "mongoose";

import { User } from "../models/User.model";
import { Queue } from "../models/Queue.model";

let io: Server | null = null;

/* =========================================================
   DOCTOR SOCKET CONNECTIONS
   One doctor can have multiple browser tabs/devices.
   We only mark offline when ALL connections are gone.
========================================================= */

const doctorSockets = new Map<string, Set<string>>();

/* =========================================================
   DATABASE
========================================================= */

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            throw new Error(
                "MONGO_URI is not defined in environment variables"
            );
        }

        console.log("Connecting to MongoDB...");

        await mongoose.connect(mongoURI);

        console.log("✅ MongoDB connected successfully");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        process.exit(1);
    }
};

/* =========================================================
   INITIALIZE SOCKET
========================================================= */

export const initializeSocket = (httpServer: HttpServer) => {
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
        console.log("=================================");
        console.log("🟢 SOCKET CONNECTED:", socket.id);
        console.log("=================================");

        /* =====================================================
           JOIN HOSPITAL ROOM
        ===================================================== */

        socket.on(
            "join:hospital",
            (hospitalId: string) => {
                if (!hospitalId) {
                    console.log(
                        "❌ JOIN HOSPITAL FAILED: missing hospitalId"
                    );
                    return;
                }

                const room = `hospital:${hospitalId}`;

                socket.join(room);

                socket.data.hospitalId = hospitalId;

                console.log(
                    `🏥 SOCKET ${socket.id} JOINED ${room}`
                );
            }
        );

        /* =====================================================
           PATIENT QUEUE ROOM
        ===================================================== */

        socket.on(
            "queue:join",
            (
                payload:
                    | string
                    | {
                        trackingToken?: string;
                    }
            ) => {
                const trackingToken =
                    typeof payload === "string"
                        ? payload
                        : payload?.trackingToken;

                if (!trackingToken) {
                    console.log(
                        "❌ QUEUE JOIN FAILED: missing trackingToken"
                    );
                    return;
                }

                const room = `queue:${trackingToken}`;

                socket.join(room);

                socket.data.trackingToken =
                    trackingToken;

                console.log(
                    `🎫 SOCKET ${socket.id} JOINED ${room}`
                );
            }
        );

        /* =====================================================
           PATIENT LEAVE QUEUE
        ===================================================== */

        socket.on(
            "queue:leave",
            (
                payload:
                    | string
                    | {
                        trackingToken?: string;
                    }
            ) => {
                const trackingToken =
                    typeof payload === "string"
                        ? payload
                        : payload?.trackingToken;

                if (!trackingToken) return;

                const room = `queue:${trackingToken}`;

                socket.leave(room);

                console.log(
                    `🚪 SOCKET ${socket.id} LEFT ${room}`
                );
            }
        );

        /* =====================================================
           DOCTOR ONLINE
        ===================================================== */

        socket.on(
            "user:online",
            async ({
                userId,
                hospitalId,
            }: {
                userId?: string;
                hospitalId?: string;
            }) => {
                try {
                    if (!userId || !hospitalId) {
                        console.log(
                            "❌ USER ONLINE FAILED:",
                            {
                                userId,
                                hospitalId,
                            }
                        );

                        return;
                    }

                    if (
                        !mongoose.Types.ObjectId.isValid(
                            userId
                        )
                    ) {
                        console.log(
                            "❌ INVALID USER ID:",
                            userId
                        );

                        return;
                    }

                    socket.data.userId = userId;
                    socket.data.hospitalId =
                        hospitalId;
                    socket.data.role = "DOCTOR";

                    /* ================================
                       JOIN HOSPITAL ROOM
                    ================================= */

                    socket.join(
                        `hospital:${hospitalId}`
                    );

                    /* ================================
                       STORE SOCKET
                    ================================= */

                    let connections =
                        doctorSockets.get(userId);

                    if (!connections) {
                        connections = new Set<string>();

                        doctorSockets.set(
                            userId,
                            connections
                        );
                    }

                    connections.add(socket.id);

                    /* ================================
                       FIND DOCTOR
                    ================================= */

                    const doctor =
                        await User.findOne({
                            _id: userId,
                            hospitalId,
                            role: "DOCTOR",
                        });

                    if (!doctor) {
                        console.log(
                            "❌ DOCTOR NOT FOUND:",
                            userId
                        );

                        return;
                    }

                    const wasOnline =
                        doctor.isOnline === true;

                    const now = new Date();

                    doctor.isOnline = true;
                    doctor.lastSeenAt = now;

                    await doctor.save();

                    console.log(
                        "🟢 DOCTOR ONLINE:",
                        doctor.name,
                        doctor._id.toString()
                    );

                    /* ================================
                       EMIT ONLY WHEN STATUS CHANGED
                    ================================= */

                    if (!wasOnline) {
                        await emitDoctorStatus({
                            hospitalId,
                            userId,
                            doctorName:
                                doctor.name,
                            isOnline: true,
                            lastSeenAt: now,
                            departmentId:
                                doctor.departmentId
                                    ? String(doctor.departmentId)
                                    : undefined,
                        });
                    }
                } catch (error) {
                    console.error(
                        "❌ USER ONLINE ERROR:",
                        error
                    );
                }
            }
        );

        /* =====================================================
           DOCTOR HEARTBEAT
           Frontend sends this every ~15 seconds.
        ===================================================== */

        socket.on(
            "user:heartbeat",
            async ({
                userId,
            }: {
                userId?: string;
            }) => {
                try {
                    if (!userId) return;

                    if (
                        !mongoose.Types.ObjectId.isValid(
                            userId
                        )
                    ) {
                        return;
                    }

                    await User.findByIdAndUpdate(
                        userId,
                        {
                            isOnline: true,
                            lastSeenAt: new Date(),
                        }
                    );
                } catch (error) {
                    console.error(
                        "❌ HEARTBEAT ERROR:",
                        error
                    );
                }
            }
        );

        /* =====================================================
           EXPLICIT DOCTOR OFFLINE
           Called during logout.
        ===================================================== */

        socket.on(
            "user:offline",
            async ({
                userId,
                hospitalId,
            }: {
                userId?: string;
                hospitalId?: string;
            }) => {
                try {
                    if (!userId || !hospitalId) {
                        return;
                    }

                    console.log(
                        "🔴 USER OFFLINE EVENT:",
                        userId
                    );

                    const now = new Date();

                    const doctor =
                        await User.findOne({
                            _id: userId,
                            hospitalId,
                            role: "DOCTOR",
                        });

                    if (!doctor) return;

                    doctor.isOnline = false;
                    doctor.lastSeenAt = now;

                    await doctor.save();

                    /* Remove this socket */

                    const connections =
                        doctorSockets.get(userId);

                    if (connections) {
                        connections.delete(
                            socket.id
                        );

                        /*
                         * Important:
                         * If another browser/tab is still
                         * connected, don't mark offline.
                         */

                        if (
                            connections.size === 0
                        ) {
                            doctorSockets.delete(
                                userId
                            );
                        }
                    }

                    /*
                     * Notify patient tracking pages
                     */

                    await emitDoctorStatus({
                        hospitalId,
                        userId,
                        doctorName:
                            doctor.name,
                        isOnline: false,
                        lastSeenAt: now,
                        departmentId:
                            doctor.departmentId
                                ? String(doctor.departmentId)
                                : undefined,
                    });
                } catch (error) {
                    console.error(
                        "❌ USER OFFLINE ERROR:",
                        error
                    );
                }
            }
        );

        /* =====================================================
           DISCONNECT
        ===================================================== */

        socket.on(
            "disconnect",
            async (reason) => {
                try {
                    console.log(
                        "🔴 SOCKET DISCONNECTED:",
                        socket.id,
                        reason
                    );

                    const userId =
                        socket.data.userId;

                    const hospitalId =
                        socket.data.hospitalId;

                    if (!userId || !hospitalId) {
                        return;
                    }

                    const connections =
                        doctorSockets.get(userId);

                    if (connections) {
                        connections.delete(
                            socket.id
                        );

                        /*
                         * Another socket is still active.
                         */

                        if (
                            connections.size > 0
                        ) {
                            console.log(
                                "Doctor still has active socket:",
                                userId
                            );

                            return;
                        }

                        doctorSockets.delete(
                            userId
                        );
                    }

                    const doctor =
                        await User.findOne({
                            _id: userId,
                            hospitalId,
                            role: "DOCTOR",
                        });

                    if (!doctor) return;

                    /*
                     * Only mark offline if the doctor
                     * was actually online.
                     */

                    if (doctor.isOnline) {
                        const now = new Date();

                        doctor.isOnline = false;
                        doctor.lastSeenAt = now;

                        await doctor.save();

                        console.log(
                            "🔴 DOCTOR OFFLINE:",
                            doctor.name
                        );

                        await emitDoctorStatus({
                            hospitalId,
                            userId,
                            doctorName:
                                doctor.name,
                            isOnline: false,
                            lastSeenAt: now,
                            departmentId:
                                doctor.departmentId
                                    ? String(doctor.departmentId)
                                    : undefined,
                        });
                    }
                } catch (error) {
                    console.error(
                        "❌ DISCONNECT ERROR:",
                        error
                    );
                }
            }
        );
    });

    return io;
};

/* =========================================================
   GET SOCKET
========================================================= */

export const getIO = (): Server => {
    if (!io) {
        throw new Error(
            "Socket.IO is not initialized"
        );
    }

    return io;
};

/* =========================================================
   EMIT DOCTOR STATUS
========================================================= */

export const emitDoctorStatus = async ({
    hospitalId,
    userId,
    doctorName,
    isOnline,
    lastSeenAt,
    departmentId,
}: {
    hospitalId: string;
    userId: string;
    doctorName: string;
    isOnline: boolean;
    lastSeenAt: Date;
    departmentId?: string;
}) => {
    const socketIO = getIO();


    const payload = {
        doctorId: userId,
        role: "DOCTOR",
        doctorName,
        isOnline,
        lastSeenAt,
        offlineSince: isOnline
            ? null
            : lastSeenAt,
    };


    /* =====================================================
       HOSPITAL ROOM
       Doctors/receptionists/dashboard
    ===================================================== */

    socketIO
        .to(`hospital:${hospitalId}`)
        .emit(
            "user:status",
            payload
        );

    /* =====================================================
       PATIENT TRACKING ROOMS

       IMPORTANT: match by department, not by Queue.doctorId.
       Queue.doctorId is only set once a patient is CALLED —
       a WAITING patient's queue document has doctorId: null,
       so matching on doctorId alone silently excluded every
       waiting patient from ever receiving this update.
    ===================================================== */

    try {
        const queueFilter: Record<string, unknown> = {
            hospitalId,
            status: {
                $in: [
                    "WAITING",
                    "CALLED",
                    "SERVING",
                ],
            },
            trackingToken: {
                $exists: true,
                $ne: "",
            },
        };

        if (departmentId) {
            queueFilter.departmentId = departmentId;
        } else {
            // Fallback if a caller doesn't have departmentId handy —
            // still catches already-assigned (CALLED/SERVING) patients.
            queueFilter.doctorId = userId;
        }

        const activeQueues =
            await Queue.find(queueFilter).select(
                "trackingToken"
            );

        for (const queue of activeQueues) {
            if (!queue.trackingToken) {
                continue;
            }

            socketIO
                .to(
                    `queue:${queue.trackingToken}`
                )
                .emit(
                    "user:status",
                    payload
                );
        }

        console.log(
            "📡 DOCTOR STATUS SENT TO PATIENTS:",
            {
                doctorName,
                isOnline,
                patientQueues:
                    activeQueues.length,
            }
        );
    } catch (error) {
        console.error(
            "❌ PATIENT STATUS EMIT ERROR:",
            error
        );
    }
};

export { connectDB };