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

import {
    markDoctorOnlineAttendance,
} from "../services/doctorTiming.service";

let io:
    Server | null = null;

/* =========================================================
   DOCTOR SOCKET CONNECTIONS
   One doctor can have multiple browser tabs/devices.
   We only mark offline when ALL connections are gone.
========================================================= */

const doctorSockets =
    new Map<
        string,
        Set<string>
    >();

/* =========================================================
   DATABASE
========================================================= */

const connectDB =
    async (): Promise<void> => {
        try {
            const mongoURI =
                process.env.MONGO_URI;

            if (
                !mongoURI
            ) {
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
        } catch (
            error
        ) {
            console.error(
                "❌ MongoDB connection failed:",
                error,
            );

            process.exit(1);
        }
    };

/* =========================================================
   HELPERS
========================================================= */

const isValidObjectId =
    (
        value?: string,
    ) => {
        return Boolean(
            value &&
            mongoose.Types.ObjectId.isValid(
                value,
            ),
        );
    };

const removeDoctorSocket =
    (
        userId: string,
        socketId: string,
    ) => {
        const connections =
            doctorSockets.get(
                userId,
            );

        if (
            !connections
        ) {
            return false;
        }

        connections.delete(
            socketId,
        );

        if (
            connections.size >
            0
        ) {
            return true;
        }

        doctorSockets.delete(
            userId,
        );

        return false;
    };

/* =========================================================
   INITIALIZE SOCKET
========================================================= */

export const initializeSocket =
    (
        httpServer: HttpServer,
    ) => {
        io =
            new Server(
                httpServer,
                {
                    cors: {
                        origin:
                            process.env.CLIENT_URL ||
                            "http://localhost:5173",
                        credentials:
                            true,
                    },

                    transports: [
                        "websocket",
                        "polling",
                    ],
                },
            );

        io.on(
            "connection",
            (
                socket,
            ) => {
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

                /* =====================================================
                   JOIN HOSPITAL ROOM
                ===================================================== */

                socket.on(
                    "join:hospital",
                    (
                        hospitalId: string,
                    ) => {
                        if (
                            !hospitalId
                        ) {
                            console.log(
                                "❌ JOIN HOSPITAL FAILED: missing hospitalId",
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
                            `🏥 SOCKET ${socket.id} JOINED ${room}`,
                        );
                    },
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
                            console.log(
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
                            `🎫 SOCKET ${socket.id} JOINED ${room}`,
                        );
                    },
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

                        console.log(
                            `🚪 SOCKET ${socket.id} LEFT ${room}`,
                        );
                    },
                );

                /* =====================================================
                   USER ONLINE
                   Doctor attendance starts here.
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
                            if (
                                !userId ||
                                !hospitalId
                            ) {
                                console.log(
                                    "❌ USER ONLINE FAILED:",
                                    {
                                        userId,
                                        hospitalId,
                                    },
                                );

                                return;
                            }

                            if (
                                !isValidObjectId(
                                    userId,
                                ) ||
                                !isValidObjectId(
                                    hospitalId,
                                )
                            ) {
                                console.log(
                                    "❌ INVALID USER ONLINE PAYLOAD:",
                                    {
                                        userId,
                                        hospitalId,
                                    },
                                );

                                return;
                            }

                            socket.data.userId =
                                userId;

                            socket.data.hospitalId =
                                hospitalId;

                            socket.join(
                                `hospital:${hospitalId}`,
                            );

                            const user =
                                await User.findOne(
                                    {
                                        _id:
                                            userId,
                                        hospitalId,
                                    },
                                );

                            if (
                                !user
                            ) {
                                console.log(
                                    "❌ USER NOT FOUND:",
                                    userId,
                                );

                                return;
                            }

                            socket.data.role =
                                user.role;

                            const now =
                                new Date();

                            user.lastSeenAt =
                                now;

                            if (
                                user.role ===
                                "DOCTOR"
                            ) {
                                const doctor =
                                    user;

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

                                const wasOnline =
                                    doctor.isOnline ===
                                    true;

                                doctor.isOnline =
                                    true;

                                await doctor.save();

                                await markDoctorOnlineAttendance(
                                    {
                                        hospitalId,
                                        doctorId:
                                            userId,
                                    },
                                );

                                console.log(
                                    "🟢 DOCTOR ONLINE:",
                                    doctor.name,
                                    doctor._id.toString(),
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
                                            departmentId:
                                                doctor.departmentId
                                                    ? String(
                                                        doctor.departmentId,
                                                    )
                                                    : undefined,
                                        },
                                    );
                                }

                                await emitDoctorTimingUpdate(
                                    {
                                        hospitalId,
                                        userId,
                                        departmentId:
                                            doctor.departmentId
                                                ? String(
                                                    doctor.departmentId,
                                                )
                                                : undefined,
                                    },
                                );
                            } else {
                                await user.save();
                            }
                        } catch (
                            error
                        ) {
                            console.error(
                                "❌ USER ONLINE ERROR:",
                                error,
                            );
                        }
                    },
                );

                /* =====================================================
                   USER HEARTBEAT
                   Frontend sends every ~15 seconds.
                   This keeps doctor attendance and late timing live.
                ===================================================== */

                socket.on(
                    "user:heartbeat",
                    async ({
                        userId,
                        hospitalId,
                    }: {
                        userId?: string;
                        hospitalId?: string;
                    }) => {
                        try {
                            const finalUserId =
                                userId ||
                                socket.data.userId;

                            const finalHospitalId =
                                hospitalId ||
                                socket.data.hospitalId;

                            if (
                                !finalUserId ||
                                !finalHospitalId
                            ) {
                                return;
                            }

                            if (
                                !isValidObjectId(
                                    finalUserId,
                                ) ||
                                !isValidObjectId(
                                    finalHospitalId,
                                )
                            ) {
                                return;
                            }

                            const user =
                                await User.findOne(
                                    {
                                        _id:
                                            finalUserId,
                                        hospitalId:
                                            finalHospitalId,
                                    },
                                );

                            if (
                                !user
                            ) {
                                return;
                            }

                            const now =
                                new Date();

                            user.lastSeenAt =
                                now;

                            if (
                                user.role ===
                                "DOCTOR"
                            ) {
                                user.isOnline =
                                    true;

                                await user.save();

                                await markDoctorOnlineAttendance(
                                    {
                                        hospitalId:
                                            finalHospitalId,
                                        doctorId:
                                            finalUserId,
                                    },
                                );

                                await emitDoctorTimingUpdate(
                                    {
                                        hospitalId:
                                            finalHospitalId,
                                        userId:
                                            finalUserId,
                                        departmentId:
                                            user.departmentId
                                                ? String(
                                                    user.departmentId,
                                                )
                                                : undefined,
                                    },
                                );
                            } else {
                                await user.save();
                            }
                        } catch (
                            error
                        ) {
                            console.error(
                                "❌ HEARTBEAT ERROR:",
                                error,
                            );
                        }
                    },
                );

                /* =====================================================
                   EXPLICIT USER OFFLINE
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
                            if (
                                !userId ||
                                !hospitalId
                            ) {
                                return;
                            }

                            if (
                                !isValidObjectId(
                                    userId,
                                ) ||
                                !isValidObjectId(
                                    hospitalId,
                                )
                            ) {
                                return;
                            }

                            console.log(
                                "🔴 USER OFFLINE EVENT:",
                                userId,
                            );

                            const doctor =
                                await User.findOne(
                                    {
                                        _id:
                                            userId,
                                        hospitalId,
                                        role:
                                            "DOCTOR",
                                    },
                                );

                            if (
                                !doctor
                            ) {
                                return;
                            }

                            const stillHasAnotherSocket =
                                removeDoctorSocket(
                                    userId,
                                    socket.id,
                                );

                            if (
                                stillHasAnotherSocket
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
                                    departmentId:
                                        doctor.departmentId
                                            ? String(
                                                doctor.departmentId,
                                            )
                                            : undefined,
                                },
                            );

                            await emitDoctorTimingUpdate(
                                {
                                    hospitalId,
                                    userId,
                                    departmentId:
                                        doctor.departmentId
                                            ? String(
                                                doctor.departmentId,
                                            )
                                            : undefined,
                                },
                            );
                        } catch (
                            error
                        ) {
                            console.error(
                                "❌ USER OFFLINE ERROR:",
                                error,
                            );
                        }
                    },
                );

                /* =====================================================
                   DISCONNECT
                ===================================================== */

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
                                socket.data.userId;

                            const hospitalId =
                                socket.data.hospitalId;

                            const role =
                                socket.data.role;

                            if (
                                !userId ||
                                !hospitalId ||
                                role !==
                                "DOCTOR"
                            ) {
                                return;
                            }

                            const stillHasAnotherSocket =
                                removeDoctorSocket(
                                    userId,
                                    socket.id,
                                );

                            if (
                                stillHasAnotherSocket
                            ) {
                                console.log(
                                    "Doctor still has active socket:",
                                    userId,
                                );

                                return;
                            }

                            const doctor =
                                await User.findOne(
                                    {
                                        _id:
                                            userId,
                                        hospitalId,
                                        role:
                                            "DOCTOR",
                                    },
                                );

                            if (
                                !doctor
                            ) {
                                return;
                            }

                            if (
                                doctor.isOnline
                            ) {
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
                                        departmentId:
                                            doctor.departmentId
                                                ? String(
                                                    doctor.departmentId,
                                                )
                                                : undefined,
                                    },
                                );

                                await emitDoctorTimingUpdate(
                                    {
                                        hospitalId,
                                        userId,
                                        departmentId:
                                            doctor.departmentId
                                                ? String(
                                                    doctor.departmentId,
                                                )
                                                : undefined,
                                    },
                                );
                            }
                        } catch (
                            error
                        ) {
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

/* =========================================================
   GET SOCKET
========================================================= */

export const getIO =
    (): Server => {
        if (
            !io
        ) {
            throw new Error(
                "Socket.IO is not initialized",
            );
        }

        return io;
    };

/* =========================================================
   EMIT DOCTOR STATUS
========================================================= */

export const emitDoctorStatus =
    async ({
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
        const socketIO =
            getIO();

        const payload = {
            doctorId:
                userId,
            role:
                "DOCTOR",
            doctorName,
            isOnline,
            lastSeenAt,
            offlineSince:
                isOnline
                    ? null
                    : lastSeenAt,
        };

        socketIO
            .to(
                `hospital:${hospitalId}`,
            )
            .emit(
                "user:status",
                payload,
            );

        try {
            const queueFilter:
                Record<
                    string,
                    unknown
                > = {
                hospitalId,
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
                    $ne:
                        "",
                },
            };

            if (
                departmentId
            ) {
                queueFilter.$or = [
                    {
                        doctorId:
                            userId,
                    },
                    {
                        doctorId:
                            null,
                        departmentId,
                    },
                    {
                        doctorId: {
                            $exists:
                                false,
                        },
                        departmentId,
                    },
                ];
            } else {
                queueFilter.doctorId =
                    userId;
            }

            const activeQueues =
                await Queue.find(
                    queueFilter,
                ).select(
                    "trackingToken",
                );

            for (
                const queue of activeQueues
            ) {
                if (
                    !queue.trackingToken
                ) {
                    continue;
                }

                socketIO
                    .to(
                        `queue:${queue.trackingToken}`,
                    )
                    .emit(
                        "user:status",
                        payload,
                    );

                socketIO
                    .to(
                        `queue:${queue.trackingToken}`,
                    )
                    .emit(
                        "queue:updated",
                        {
                            hospitalId,
                            doctorId:
                                userId,
                            reason:
                                "DOCTOR_STATUS_CHANGED",
                        },
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
        } catch (
            error
        ) {
            console.error(
                "❌ PATIENT STATUS EMIT ERROR:",
                error,
            );
        }
    };

/* =========================================================
   EMIT DOCTOR TIMING UPDATE
   Used for doctor late / average waiting time refresh.
========================================================= */

export const emitDoctorTimingUpdate =
    async ({
        hospitalId,
        userId,
        departmentId,
    }: {
        hospitalId: string;
        userId: string;
        departmentId?: string;
    }) => {
        const socketIO =
            getIO();

        socketIO
            .to(
                `hospital:${hospitalId}`,
            )
            .emit(
                "queue:updated",
                {
                    hospitalId,
                    doctorId:
                        userId,
                    reason:
                        "DOCTOR_TIMING_UPDATED",
                },
            );

        try {
            const queueFilter:
                Record<
                    string,
                    unknown
                > = {
                hospitalId,
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
                    $ne:
                        "",
                },
            };

            if (
                departmentId
            ) {
                queueFilter.$or = [
                    {
                        doctorId:
                            userId,
                    },
                    {
                        doctorId:
                            null,
                        departmentId,
                    },
                    {
                        doctorId: {
                            $exists:
                                false,
                        },
                        departmentId,
                    },
                ];
            } else {
                queueFilter.doctorId =
                    userId;
            }

            const activeQueues =
                await Queue.find(
                    queueFilter,
                ).select(
                    "trackingToken",
                );

            for (
                const queue of activeQueues
            ) {
                if (
                    !queue.trackingToken
                ) {
                    continue;
                }

                socketIO
                    .to(
                        `queue:${queue.trackingToken}`,
                    )
                    .emit(
                        "queue:updated",
                        {
                            hospitalId,
                            doctorId:
                                userId,
                            reason:
                                "DOCTOR_TIMING_UPDATED",
                        },
                    );

                socketIO
                    .to(
                        `queue:${queue.trackingToken}`,
                    )
                    .emit(
                        "doctor:timing-updated",
                        {
                            hospitalId,
                            doctorId:
                                userId,
                        },
                    );
            }
        } catch (
            error
        ) {
            console.error(
                "❌ DOCTOR TIMING UPDATE EMIT ERROR:",
                error,
            );
        }
    };

export {
    connectDB,
};