import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import mongoose from "mongoose";

import { User } from "../models/User.model";
import { Queue } from "../models/Queue.model";

// ============================================================
// SOCKET INSTANCE
// ============================================================

let io: Server | null = null;

// ============================================================
// TRACK CONNECTED SOCKETS PER USER
//
// This prevents a doctor from becoming offline when one browser
// tab disconnects while another tab is still connected.
// ============================================================

const userSockets = new Map<string, Set<string>>();

// ============================================================
// HELPERS
// ============================================================

const addUserSocket = (
    userId: string,
    socketId: string,
) => {
    let sockets = userSockets.get(userId);

    if (!sockets) {
        sockets = new Set<string>();

        userSockets.set(
            userId,
            sockets,
        );
    }

    sockets.add(socketId);
};

const removeUserSocket = (
    userId: string,
    socketId: string,
) => {
    const sockets =
        userSockets.get(userId);

    if (!sockets) {
        return 0;
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
        userSockets.delete(userId);

        return 0;
    }

    return sockets.size;
};

const getUserSocketCount = (
    userId: string,
) => {
    return (
        userSockets.get(userId)?.size ||
        0
    );
};

// ============================================================
// EMIT DOCTOR STATUS TO PATIENT QUEUES
// ============================================================

const emitDoctorStatusToPatientQueues = async ({
    doctorId,
    hospitalId,
    doctorName,
    isOnline,
    lastSeenAt,
    offlineSince,
}: {
    doctorId: string;
    hospitalId: string;
    doctorName: string;
    isOnline: boolean;
    lastSeenAt: Date;
    offlineSince: Date | null;
}) => {
    if (!io) {
        return;
    }

    try {
        // Find active queues belonging to this doctor.
        const queues = await Queue.find({
            doctorId,
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
        })
            .select("trackingToken")
            .lean();

        for (const queue of queues) {
            if (!queue.trackingToken) {
                continue;
            }

            const room =
                `queue:${queue.trackingToken}`;

            io.to(room).emit(
                "doctor:status",
                {
                    doctorId,
                    role: "DOCTOR",
                    doctorName,
                    isOnline,
                    lastSeenAt,
                    offlineSince,
                },
            );
        }
    } catch (error) {
        console.error(
            "Failed to emit doctor status to patient queues:",
            error,
        );
    }
};

// ============================================================
// EMIT DOCTOR STATUS
// ============================================================

export const emitDoctorStatus = ({
    hospitalId,
    userId,
    doctorName,
    isOnline,
    lastSeenAt,
    offlineSince = null,
}: {
    hospitalId: string;
    userId: string;
    doctorName: string;
    isOnline: boolean;
    lastSeenAt: Date;
    offlineSince?: Date | null;
}) => {
    if (!io) {
        console.error(
            "Socket.IO is not initialized",
        );

        return;
    }

    const room =
        `hospital:${hospitalId}`;

    console.log(
        "========================================",
    );

    console.log(
        "EMITTING DOCTOR STATUS",
    );

    console.log({
        room,
        userId,
        doctorName,
        isOnline,
        lastSeenAt,
        offlineSince,
    });

    console.log(
        "========================================",
    );

    // --------------------------------------------------------
    // Hospital room
    // --------------------------------------------------------

    io.to(room).emit(
        "user:status",
        {
            userId,
            role: "DOCTOR",
            doctorName,
            isOnline,
            lastSeenAt,
            offlineSince,
        },
    );

    // --------------------------------------------------------
    // Patient queue rooms
    // --------------------------------------------------------

    void emitDoctorStatusToPatientQueues({
        doctorId: userId,
        hospitalId,
        doctorName,
        isOnline,
        lastSeenAt,
        offlineSince,
    });
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

    // ========================================================
    // CONNECTION
    // ========================================================

    io.on(
        "connection",
        (socket) => {
            console.log(
                "SOCKET CONNECTED:",
                socket.id,
            );

            // =================================================
            // USER ONLINE
            // =================================================

            socket.on(
                "user:online",
                async (data) => {
                    try {
                        const {
                            userId,
                            hospitalId,
                        } = data || {};

                        if (
                            !userId ||
                            !hospitalId
                        ) {
                            console.log(
                                "USER ONLINE FAILED: missing userId or hospitalId",
                            );

                            return;
                        }

                        // Save user information on socket.
                        socket.data.userId =
                            String(userId);

                        socket.data.hospitalId =
                            String(hospitalId);

                        // ------------------------------------------------
                        // Join hospital room
                        // ------------------------------------------------

                        const hospitalRoom =
                            `hospital:${hospitalId}`;

                        socket.join(
                            hospitalRoom,
                        );

                        // ------------------------------------------------
                        // Track this socket
                        // ------------------------------------------------

                        addUserSocket(
                            String(userId),
                            socket.id,
                        );

                        // ------------------------------------------------
                        // Update doctor status
                        // ------------------------------------------------

                        const user =
                            await User.findById(
                                userId,
                            );

                        if (!user) {
                            console.log(
                                "USER ONLINE FAILED: user not found",
                            );

                            return;
                        }

                        socket.data.role =
                            user.role;

                        const now =
                            new Date();

                        // Only doctors should have
                        // doctor online status.
                        if (
                            user.role ===
                            "DOCTOR"
                        ) {
                            user.isOnline =
                                true;

                            user.lastSeenAt =
                                now;

                            user.offlineSince =
                                null;

                            await user.save();

                            emitDoctorStatus({
                                hospitalId:
                                    String(
                                        user.hospitalId,
                                    ),

                                userId:
                                    String(
                                        user._id,
                                    ),

                                doctorName:
                                    user.name,

                                isOnline: true,

                                lastSeenAt:
                                    now,

                                offlineSince:
                                    null,
                            });
                        }

                        console.log(
                            `USER ONLINE: ${user.name} (${user.role})`,
                        );

                        console.log(
                            `SOCKET: ${socket.id}`,
                        );

                        console.log(
                            `USER SOCKET COUNT: ${getUserSocketCount(
                                String(user._id),
                            )}`,
                        );
                    } catch (error) {
                        console.error(
                            "USER ONLINE ERROR:",
                            error,
                        );
                    }
                },
            );

            // =================================================
            // DOCTOR HEARTBEAT
            //
            // Frontend sends this every 15 seconds.
            // =================================================

            socket.on(
                "doctor:heartbeat",
                async (data) => {
                    try {
                        const userId =
                            data?.userId ||
                            socket.data.userId;

                        if (!userId) {
                            return;
                        }

                        const now =
                            new Date();

                        const user =
                            await User.findOneAndUpdate(
                                {
                                    _id: userId,
                                    role: "DOCTOR",
                                },
                                {
                                    $set: {
                                        isOnline:
                                            true,

                                        lastSeenAt:
                                            now,

                                        offlineSince:
                                            null,
                                    },
                                },
                                {
                                    new: true,
                                },
                            );

                        if (!user) {
                            return;
                        }
                    } catch (error) {
                        console.error(
                            "DOCTOR HEARTBEAT ERROR:",
                            error,
                        );
                    }
                },
            );

            // =================================================
            // JOIN HOSPITAL
            // =================================================

            socket.on(
                "join:hospital",
                (
                    hospitalId: string,
                ) => {
                    if (!hospitalId) {
                        console.log(
                            "JOIN HOSPITAL FAILED: missing hospitalId",
                        );

                        return;
                    }

                    const room =
                        `hospital:${hospitalId}`;

                    socket.join(room);

                    socket.data.hospitalId =
                        String(
                            hospitalId,
                        );

                    console.log(
                        `SOCKET ${socket.id} JOINED ${room}`,
                    );
                },
            );

            // =================================================
            // QUEUE TRACKING
            //
            // Accept BOTH:
            //
            // socket.emit("queue:join", trackingToken)
            //
            // and
            //
            // socket.emit("queue:join", {
            //     trackingToken
            // })
            //
            // =================================================

            socket.on(
                "queue:join",
                (
                    data:
                        | string
                        | {
                              trackingToken?: string;
                          },
                ) => {
                    const trackingToken =
                        typeof data ===
                        "string"
                            ? data
                            : data?.trackingToken;

                    if (!trackingToken) {
                        console.log(
                            "QUEUE JOIN FAILED: missing trackingToken",
                        );

                        return;
                    }

                    const room =
                        `queue:${trackingToken}`;

                    socket.join(room);

                    socket.data.trackingToken =
                        trackingToken;

                    console.log(
                        `SOCKET ${socket.id} JOINED ${room}`,
                    );
                },
            );

            // =================================================
            // QUEUE LEAVE
            // =================================================

            socket.on(
                "queue:leave",
                (
                    data:
                        | string
                        | {
                              trackingToken?: string;
                          },
                ) => {
                    const trackingToken =
                        typeof data ===
                        "string"
                            ? data
                            : data?.trackingToken;

                    if (!trackingToken) {
                        return;
                    }

                    const room =
                        `queue:${trackingToken}`;

                    socket.leave(room);

                    console.log(
                        `SOCKET ${socket.id} LEFT ${room}`,
                    );
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
                    console.log(
                        "SOCKET DISCONNECTED:",
                        socket.id,
                        reason,
                    );

                    const userId =
                        socket.data.userId;

                    const hospitalId =
                        socket.data.hospitalId;

                    const role =
                        socket.data.role;

                    if (
                        !userId ||
                        role !== "DOCTOR"
                    ) {
                        return;
                    }

                    // Remove this socket.
                    const remainingSockets =
                        removeUserSocket(
                            String(
                                userId,
                            ),
                            socket.id,
                        );

                    console.log(
                        "REMAINING DOCTOR SOCKETS:",
                        remainingSockets,
                    );

                    // Another tab/device is still connected.
                    if (
                        remainingSockets >
                        0
                    ) {
                        return;
                    }

                    try {
                        const now =
                            new Date();

                        const user =
                            await User.findOneAndUpdate(
                                {
                                    _id: userId,
                                    role: "DOCTOR",
                                },
                                {
                                    $set: {
                                        isOnline:
                                            false,

                                        lastSeenAt:
                                            now,

                                        offlineSince:
                                            now,
                                    },
                                },
                                {
                                    new: true,
                                },
                            );

                        if (!user) {
                            return;
                        }

                        console.log(
                            `DOCTOR OFFLINE: ${user.name}`,
                        );

                        emitDoctorStatus({
                            hospitalId:
                                String(
                                    hospitalId ||
                                        user.hospitalId,
                                ),

                            userId:
                                String(
                                    user._id,
                                ),

                            doctorName:
                                user.name,

                            isOnline: false,

                            lastSeenAt:
                                now,

                            offlineSince:
                                now,
                        });
                    } catch (error) {
                        console.error(
                            "DOCTOR DISCONNECT STATUS ERROR:",
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
// GET SOCKET
// ============================================================

export const getIO = (): Server => {
    if (!io) {
        throw new Error(
            "Socket.IO is not initialized",
        );
    }

    return io;
};