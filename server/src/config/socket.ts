import {
    Server,
} from "socket.io";

import type {
    Server as HttpServer,
} from "http";

import mongoose from "mongoose";

import {
    User,
} from "../models/User.model";

import {
    Queue,
} from "../models/Queue.model";

// ============================================================
// SOCKET INSTANCE
// ============================================================

let io: Server | null = null;

// ============================================================
// DOCTOR SOCKET CONNECTIONS
//
// One doctor can have:
// - multiple browser tabs
// - multiple devices
//
// Doctor becomes offline only when all sockets disappear.
// ============================================================

const doctorSockets =
    new Map<
        string,
        Set<string>
    >();

// ============================================================
// DATABASE
// ============================================================

const connectDB =
    async (): Promise<void> => {
        try {
            const mongoURI =
                process.env.MONGO_URI;

            if (!mongoURI) {
                throw new Error(
                    "MONGO_URI is not defined in environment variables",
                );
            }

            console.log(
                "Connecting to MongoDB...",
            );

            await mongoose.connect(
                mongoURI,
            );

            console.log(
                "✅ MongoDB connected successfully",
            );
        } catch (error) {
            console.error(
                "❌ MongoDB connection failed:",
                error,
            );

            process.exit(1);
        }
    };

// ============================================================
// INITIALIZE SOCKET
// ============================================================

export const initializeSocket = (
    httpServer: HttpServer,
) => {
    io = new Server(
        httpServer,
        {
            cors: {
                origin:
                    process.env.CLIENT_URL ||
                    "http://localhost:5173",

                credentials: true,
            },

            transports: [
                "websocket",
                "polling",
            ],
        },
    );

    io.on(
        "connection",
        (socket) => {
            console.log(
                "=================================",
            );

            console.log(
                "🟢 SOCKET CONNECTED:",
                socket.id,
            );

            console.log(
                "=================================",
            );

            // =================================================
            // JOIN HOSPITAL
            // =================================================

            socket.on(
                "join:hospital",
                (
                    hospitalId: string,
                ) => {
                    if (
                        !hospitalId
                    ) {
                        console.warn(
                            "❌ JOIN HOSPITAL FAILED",
                        );

                        return;
                    }

                    const room =
                        `hospital:${hospitalId}`;

                    socket.join(
                        room,
                    );

                    socket.data.hospitalId =
                        hospitalId;

                    console.log(
                        `🏥 ${socket.id} JOINED ${room}`,
                    );
                },
            );

            // =================================================
            // PATIENT QUEUE JOIN
            // =================================================

            socket.on(
                "queue:join",
                (
                    payload:
                        | string
                        | {
                            trackingToken?: string;
                        },
                ) => {
                    const trackingToken =
                        typeof payload ===
                        "string"
                            ? payload
                            : payload?.trackingToken;

                    if (
                        !trackingToken
                    ) {
                        console.warn(
                            "❌ QUEUE JOIN FAILED: missing trackingToken",
                        );

                        return;
                    }

                    const room =
                        `queue:${trackingToken}`;

                    socket.join(
                        room,
                    );

                    socket.data.trackingToken =
                        trackingToken;

                    console.log(
                        `🎫 ${socket.id} JOINED ${room}`,
                    );
                },
            );

            // =================================================
            // PATIENT QUEUE LEAVE
            // =================================================

            socket.on(
                "queue:leave",
                (
                    payload:
                        | string
                        | {
                            trackingToken?: string;
                        },
                ) => {
                    const trackingToken =
                        typeof payload ===
                        "string"
                            ? payload
                            : payload?.trackingToken;

                    if (
                        !trackingToken
                    ) {
                        return;
                    }

                    const room =
                        `queue:${trackingToken}`;

                    socket.leave(
                        room,
                    );

                    if (
                        socket.data
                            .trackingToken ===
                        trackingToken
                    ) {
                        delete socket.data
                            .trackingToken;
                    }

                    console.log(
                        `🚪 ${socket.id} LEFT ${room}`,
                    );
                },
            );

            // =================================================
            // DOCTOR ONLINE
            // =================================================

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
                        if (
                            !userId ||
                            !hospitalId
                        ) {
                            console.warn(
                                "❌ USER ONLINE FAILED",
                                {
                                    userId,
                                    hospitalId,
                                },
                            );

                            return;
                        }

                        if (
                            !mongoose.Types.ObjectId.isValid(
                                userId,
                            )
                        ) {
                            console.warn(
                                "❌ INVALID USER ID:",
                                userId,
                            );

                            return;
                        }

                        socket.data.userId =
                            userId;

                        socket.data.hospitalId =
                            hospitalId;

                        socket.data.role =
                            "DOCTOR";

                        // Join hospital room.
                        socket.join(
                            `hospital:${hospitalId}`,
                        );

                        // Store socket.
                        let connections =
                            doctorSockets.get(
                                userId,
                            );

                        if (
                            !connections
                        ) {
                            connections =
                                new Set<string>();

                            doctorSockets.set(
                                userId,
                                connections,
                            );
                        }

                        connections.add(
                            socket.id,
                        );

                        // Find doctor.
                        const doctor =
                            await User.findOne(
                                {
                                    _id: userId,
                                    hospitalId,
                                    role: "DOCTOR",
                                },
                            );

                        if (
                            !doctor
                        ) {
                            console.warn(
                                "❌ DOCTOR NOT FOUND:",
                                userId,
                            );

                            return;
                        }

                        const wasOnline =
                            doctor.isOnline ===
                            true;

                        const now =
                            new Date();

                        doctor.isOnline =
                            true;

                        doctor.lastSeenAt =
                            now;

                        await doctor.save();

                        console.log(
                            "🟢 DOCTOR ONLINE:",
                            doctor.name,
                        );

                        if (
                            !wasOnline
                        ) {
                            await emitDoctorStatus(
                                {
                                    hospitalId,
                                    userId,
                                    doctorName:
                                        doctor.name,
                                    isOnline:
                                        true,
                                    lastSeenAt:
                                        now,
                                },
                            );
                        }
                    } catch (error) {
                        console.error(
                            "❌ USER ONLINE ERROR:",
                            error,
                        );
                    }
                },
            );

            // =================================================
            // HEARTBEAT
            // =================================================

            const handleHeartbeat =
                async ({
                    userId,
                }: {
                    userId?: string;
                }) => {
                    try {
                        if (
                            !userId ||
                            !mongoose.Types.ObjectId.isValid(
                                userId,
                            )
                        ) {
                            return;
                        }

                        await User.findByIdAndUpdate(
                            userId,
                            {
                                isOnline:
                                    true,

                                lastSeenAt:
                                    new Date(),
                            },
                        );
                    } catch (error) {
                        console.error(
                            "❌ HEARTBEAT ERROR:",
                            error,
                        );
                    }
                };

            socket.on(
                "user:heartbeat",
                handleHeartbeat,
            );

            // Backward compatibility.
            socket.on(
                "doctor:heartbeat",
                handleHeartbeat,
            );

            // =================================================
            // EXPLICIT OFFLINE
            // =================================================

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
                        if (
                            !userId ||
                            !hospitalId
                        ) {
                            return;
                        }

                        const doctor =
                            await User.findOne(
                                {
                                    _id: userId,
                                    hospitalId,
                                    role: "DOCTOR",
                                },
                            );

                        if (
                            !doctor
                        ) {
                            return;
                        }

                        const connections =
                            doctorSockets.get(
                                userId,
                            );

                        if (
                            connections
                        ) {
                            connections.delete(
                                socket.id,
                            );

                            if (
                                connections.size >
                                0
                            ) {
                                console.log(
                                    "Doctor still has another active socket:",
                                    userId,
                                );

                                return;
                            }

                            doctorSockets.delete(
                                userId,
                            );
                        }

                        const now =
                            new Date();

                        doctor.isOnline =
                            false;

                        doctor.lastSeenAt =
                            now;

                        await doctor.save();

                        await emitDoctorStatus(
                            {
                                hospitalId,
                                userId,
                                doctorName:
                                    doctor.name,
                                isOnline:
                                    false,
                                lastSeenAt:
                                    now,
                            },
                        );
                    } catch (error) {
                        console.error(
                            "❌ USER OFFLINE ERROR:",
                            error,
                        );
                    }
                },
            );

            // =================================================
            // DISCONNECT
            // =================================================

            socket.on(
                "disconnect",
                async (
                    reason,
                ) => {
                    try {
                        console.log(
                            "🔴 SOCKET DISCONNECTED:",
                            socket.id,
                            reason,
                        );

                        const userId =
                            socket.data
                                .userId;

                        const hospitalId =
                            socket.data
                                .hospitalId;

                        // Patient sockets don't have userId.
                        if (
                            !userId ||
                            !hospitalId
                        ) {
                            return;
                        }

                        const connections =
                            doctorSockets.get(
                                userId,
                            );

                        if (
                            connections
                        ) {
                            connections.delete(
                                socket.id,
                            );

                            if (
                                connections.size >
                                0
                            ) {
                                return;
                            }

                            doctorSockets.delete(
                                userId,
                            );
                        }

                        const doctor =
                            await User.findOne(
                                {
                                    _id: userId,
                                    hospitalId,
                                    role: "DOCTOR",
                                },
                            );

                        if (
                            !doctor ||
                            !doctor.isOnline
                        ) {
                            return;
                        }

                        const now =
                            new Date();

                        doctor.isOnline =
                            false;

                        doctor.lastSeenAt =
                            now;

                        await doctor.save();

                        console.log(
                            "🔴 DOCTOR OFFLINE:",
                            doctor.name,
                        );

                        await emitDoctorStatus(
                            {
                                hospitalId,
                                userId,
                                doctorName:
                                    doctor.name,
                                isOnline:
                                    false,
                                lastSeenAt:
                                    now,
                            },
                        );
                    } catch (error) {
                        console.error(
                            "❌ DISCONNECT ERROR:",
                            error,
                        );
                    }
                },
            );
        },
    );

    return io;
};

// ============================================================
// GET IO
// ============================================================

export const getIO = (): Server => {
    if (!io) {
        throw new Error(
            "Socket.IO is not initialized",
        );
    }

    return io;
};

// ============================================================
// QUEUE UPDATE
//
// THIS IS THE IMPORTANT PART.
//
// Call this AFTER MongoDB queue update succeeds.
// ============================================================

export const emitQueueUpdate = ({
    trackingToken,
    payload = {},
}: {
    trackingToken: string;
    payload?: Record<
        string,
        unknown
    >;
}): void => {
    if (
        !trackingToken
    ) {
        console.warn(
            "⚠️ emitQueueUpdate called without trackingToken",
        );

        return;
    }

    const socketIO =
        getIO();

    const room =
        `queue:${trackingToken}`;

    const eventPayload = {
        trackingToken,

        ...payload,
    };

    console.log(
        "================================",
    );

    console.log(
        "📡 QUEUE UPDATE EMITTING",
    );

    console.log(
        "ROOM:",
        room,
    );

    console.log(
        "PAYLOAD:",
        eventPayload,
    );

    console.log(
        "================================",
    );

    // New event.
    socketIO
        .to(room)
        .emit(
            "queue:updated",
            eventPayload,
        );

    // Backward-compatible event.
    socketIO
        .to(room)
        .emit(
            "queue:status",
            eventPayload,
        );
};

// ============================================================
// DOCTOR STATUS
// ============================================================

export const emitDoctorStatus =
    async ({
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
        const socketIO =
            getIO();

        const payload = {
            doctorId:
                userId,

            role: "DOCTOR",

            doctorName,

            isOnline,

            lastSeenAt,

            offlineSince:
                isOnline
                    ? null
                    : lastSeenAt,
        };

        // ----------------------------------------------------
        // Hospital room
        // ----------------------------------------------------

        socketIO
            .to(
                `hospital:${hospitalId}`,
            )
            .emit(
                "user:status",
                payload,
            );

        // ----------------------------------------------------
        // Patient rooms
        // ----------------------------------------------------

        try {
            const activeQueues =
                await Queue.find(
                    {
                        doctorId:
                            userId,

                        status: {
                            $in: [
                                "WAITING",
                                "CALLED",
                                "SERVING",
                            ],
                        },

                        trackingToken: {
                            $exists:
                                true,

                            $ne: "",
                        },
                    },
                ).select(
                    "trackingToken",
                );

            for (
                const queue of
                activeQueues
            ) {
                if (
                    !queue.trackingToken
                ) {
                    continue;
                }

                const room =
                    `queue:${queue.trackingToken}`;

                socketIO
                    .to(room)
                    .emit(
                        "user:status",
                        payload,
                    );

                // Backward compatibility.
                socketIO
                    .to(room)
                    .emit(
                        "doctor:status",
                        payload,
                    );
            }

            console.log(
                "📡 DOCTOR STATUS SENT TO PATIENTS:",
                {
                    doctorName,
                    isOnline,
                    patientQueues:
                        activeQueues.length,
                },
            );
        } catch (error) {
            console.error(
                "❌ PATIENT STATUS EMIT ERROR:",
                error,
            );
        }
    };

export {
    connectDB,
};
