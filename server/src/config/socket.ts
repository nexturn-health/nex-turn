import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import mongoose from "mongoose";

import { User } from "../models/User.model";
import { Queue } from "../models/Queue.model";
import { markDoctorOnlineAttendance } from "../services/doctorTiming.service";

let io: Server | null = null;

const doctorSockets = new Map<string, Set<string>>();

type QueueEventName =
  | "queue:created"
  | "queue:updated"
  | "queue:status"
  | "queue:called"
  | "queue:serving"
  | "queue:completed"
  | "queue:skipped"
  | "queue:cancelled"
  | "queue:terminated"
  | "queue:deleted";

export interface QueueSocketRecord {
  _id?: unknown;
  hospitalId?: unknown;
  doctorId?: unknown;
  departmentId?: unknown;
  patientId?: unknown;
  trackingToken?: unknown;
  tokenLabel?: unknown;
  tokenNumber?: unknown;
  status?: unknown;
  priority?: unknown;
  queueDate?: unknown;
}

function stringId(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id?: unknown })._id || "");
  }

  return String(value);
}

function isValidObjectId(value?: string) {
  return Boolean(value && mongoose.Types.ObjectId.isValid(value));
}

function hospitalRoom(hospitalId: string) {
  return "hospital:" + hospitalId;
}

function queueRoom(trackingToken: string) {
  return "queue:" + trackingToken;
}

function extractTrackingToken(
  payload: string | { trackingToken?: string } | undefined,
) {
  return typeof payload === "string"
    ? payload.trim()
    : String(payload?.trackingToken || "").trim();
}

function trackingTokensForSocket(socket: Socket) {
  const existing = socket.data.trackingTokens;

  if (existing instanceof Set) {
    return existing as Set<string>;
  }

  const tokens = new Set<string>();
  socket.data.trackingTokens = tokens;
  return tokens;
}

function removeDoctorSocket(userId: string, socketId: string) {
  const connections = doctorSockets.get(userId);

  if (!connections) {
    return false;
  }

  connections.delete(socketId);

  if (connections.size > 0) {
    return true;
  }

  doctorSockets.delete(userId);
  return false;
}

function addDoctorSocket(userId: string, socketId: string) {
  let connections = doctorSockets.get(userId);

  if (!connections) {
    connections = new Set<string>();
    doctorSockets.set(userId, connections);
  }

  connections.add(socketId);
}

/**
 * Emits one queue event to:
 * 1. every authenticated screen in the hospital room;
 * 2. the private patient tracking room.
 *
 * The payload intentionally contains no patient name or phone number.
 * The clients refetch the latest authorized data after receiving it.
 */
export const emitQueueUpdate = (
  queue: QueueSocketRecord,
  eventName: QueueEventName = "queue:updated",
) => {
  const socketIO = getIO();
  const hospitalId = stringId(queue.hospitalId);

  if (!hospitalId) {
    console.warn("[socket] queue event skipped: hospitalId missing");
    return;
  }

  const trackingToken = stringId(queue.trackingToken);

  const payload = {
    queueId: stringId(queue._id),
    hospitalId,
    doctorId: stringId(queue.doctorId),
    departmentId: stringId(queue.departmentId),
    trackingToken: trackingToken || undefined,
    tokenLabel:
      queue.tokenLabel === undefined ? undefined : String(queue.tokenLabel),
    tokenNumber:
      queue.tokenNumber === undefined ? undefined : Number(queue.tokenNumber),
    status: queue.status === undefined ? undefined : String(queue.status),
    priority: queue.priority === undefined ? undefined : String(queue.priority),
    queueDate:
      queue.queueDate === undefined ? undefined : String(queue.queueDate),
    eventName,
  };

  const eventNames = new Set<QueueEventName>([eventName, "queue:updated"]);

  for (const name of eventNames) {
    socketIO.to(hospitalRoom(hospitalId)).emit(name, payload);
  }

  if (trackingToken) {
    for (const name of eventNames) {
      socketIO.to(queueRoom(trackingToken)).emit(name, payload);
    }
  }

  console.log("[socket] queue event emitted", {
    eventName,
    queueId: payload.queueId,
    hospitalId,
    trackingToken: Boolean(trackingToken),
  });
};

export const initializeSocket = (httpServer: HttpServer) => {
  const configuredOrigins = String(
    process.env.CLIENT_URL || "http://localhost:5173",
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || configuredOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Socket origin is not allowed"), false);
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("[socket] connected", socket.id);

    /**
     * Staff hospital room.
     * Existing clients may send hospitalId. If user:online already
     * established the socket hospital, the server also accepts no id.
     */
    socket.on("join:hospital", (requestedHospitalId?: string) => {
      if (!socket.data.userId) {
        console.warn("[socket] hospital room rejected: user is not online");
        return;
      }

      const requested = stringId(requestedHospitalId);
      const assigned = stringId(socket.data.hospitalId);

      if (assigned && requested && assigned !== requested) {
        console.warn("[socket] hospital room rejected", socket.id);
        return;
      }

      const finalHospitalId = assigned || requested;

      if (!isValidObjectId(finalHospitalId)) {
        console.warn("[socket] hospital room rejected: invalid hospitalId");
        return;
      }

      socket.join(hospitalRoom(finalHospitalId));
      socket.data.hospitalId = finalHospitalId;

      console.log(
        "[socket] joined hospital room",
        hospitalRoom(finalHospitalId),
      );
    });

    /**
     * Patient tracking room.
     * The server verifies the token exists before joining.
     */
    socket.on(
      "queue:join",
      async (payload: string | { trackingToken?: string }) => {
        try {
          const trackingToken = extractTrackingToken(payload);

          if (!trackingToken) {
            console.warn("[socket] queue join rejected: token missing");
            return;
          }

          const queue = await Queue.findOne({
            trackingToken,
          })
            .select("hospitalId trackingToken")
            .lean();

          if (!queue) {
            console.warn("[socket] queue join rejected: token not found");
            return;
          }

          const queueHospitalId = stringId(queue.hospitalId);
          const socketHospitalId = stringId(socket.data.hospitalId);

          if (
            socketHospitalId &&
            queueHospitalId &&
            socketHospitalId !== queueHospitalId
          ) {
            console.warn("[socket] queue join rejected: hospital mismatch");
            return;
          }

          socket.join(queueRoom(trackingToken));
          trackingTokensForSocket(socket).add(trackingToken);
          socket.data.trackingToken = trackingToken;

          console.log("[socket] joined patient room", queueRoom(trackingToken));
        } catch (error) {
          console.error("[socket] queue join error", error);
        }
      },
    );

    socket.on("queue:leave", (payload: string | { trackingToken?: string }) => {
      const trackingToken = extractTrackingToken(payload);

      if (!trackingToken) return;

      socket.leave(queueRoom(trackingToken));
      trackingTokensForSocket(socket).delete(trackingToken);

      console.log("[socket] left patient room", queueRoom(trackingToken));
    });

    socket.on(
      "user:online",
      async (payload: { userId?: string; hospitalId?: string }) => {
        try {
          const userId = stringId(payload?.userId);
          const hospitalId = stringId(payload?.hospitalId);

          if (!isValidObjectId(userId) || !isValidObjectId(hospitalId)) {
            console.warn("[socket] user online rejected");
            return;
          }

          const user = await User.findOne({
            _id: userId,
            hospitalId,
          });

          if (!user) {
            console.warn("[socket] user online rejected: user not found");
            return;
          }

          socket.data.userId = userId;
          socket.data.hospitalId = hospitalId;
          socket.data.role = user.role;
          socket.join(hospitalRoom(hospitalId));

          const now = new Date();
          const wasOnline = user.role === "DOCTOR" && user.isOnline === true;

          user.lastSeenAt = now;

          if (user.role === "DOCTOR") {
            user.isOnline = true;
            addDoctorSocket(userId, socket.id);
          }

          await user.save();

          if (user.role === "DOCTOR") {
            await markDoctorOnlineAttendance({
              hospitalId,
              doctorId: userId,
            });

            if (!wasOnline) {
              await emitDoctorStatus({
                hospitalId,
                userId,
                doctorName: user.name,
                isOnline: true,
                lastSeenAt: now,
                departmentId: user.departmentId
                  ? String(user.departmentId)
                  : undefined,
              });
            }

            await emitDoctorTimingUpdate({
              hospitalId,
              userId,
              departmentId: user.departmentId
                ? String(user.departmentId)
                : undefined,
            });
          }
        } catch (error) {
          console.error("[socket] user online error", error);
        }
      },
    );

    socket.on(
      "user:heartbeat",
      async (payload: { userId?: string; hospitalId?: string }) => {
        try {
          const userId =
            stringId(payload?.userId) || stringId(socket.data.userId);
          const hospitalId =
            stringId(payload?.hospitalId) || stringId(socket.data.hospitalId);

          if (!isValidObjectId(userId) || !isValidObjectId(hospitalId)) {
            return;
          }

          const user = await User.findOne({
            _id: userId,
            hospitalId,
          });

          if (!user) return;

          const now = new Date();
          user.lastSeenAt = now;

          if (user.role === "DOCTOR") {
            user.isOnline = true;
          }

          await user.save();

          if (user.role === "DOCTOR") {
            await markDoctorOnlineAttendance({
              hospitalId,
              doctorId: userId,
            });

            await emitDoctorTimingUpdate({
              hospitalId,
              userId,
              departmentId: user.departmentId
                ? String(user.departmentId)
                : undefined,
            });
          }
        } catch (error) {
          console.error("[socket] heartbeat error", error);
        }
      },
    );

    socket.on(
      "user:offline",
      async (payload: { userId?: string; hospitalId?: string }) => {
        const userId = stringId(payload?.userId);
        const hospitalId = stringId(payload?.hospitalId);

        if (isValidObjectId(userId) && isValidObjectId(hospitalId)) {
          await markDoctorOffline(userId, hospitalId, socket.id);
        }
      },
    );

    socket.on("disconnect", async () => {
      console.log("[socket] disconnected", socket.id);

      const userId = stringId(socket.data.userId);
      const hospitalId = stringId(socket.data.hospitalId);

      if (
        socket.data.role === "DOCTOR" &&
        isValidObjectId(userId) &&
        isValidObjectId(hospitalId)
      ) {
        await markDoctorOffline(userId, hospitalId, socket.id);
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  return io;
};

async function markDoctorOffline(
  userId: string,
  hospitalId: string,
  socketId: string,
) {
  const stillConnected = removeDoctorSocket(userId, socketId);

  if (stillConnected) {
    return;
  }

  const doctor = await User.findOne({
    _id: userId,
    hospitalId,
    role: "DOCTOR",
  });

  if (!doctor || !doctor.isOnline) {
    return;
  }

  const now = new Date();
  doctor.isOnline = false;
  doctor.lastSeenAt = now;
  await doctor.save();

  await emitDoctorStatus({
    hospitalId,
    userId,
    doctorName: doctor.name,
    isOnline: false,
    lastSeenAt: now,
    departmentId: doctor.departmentId ? String(doctor.departmentId) : undefined,
  });

  await emitDoctorTimingUpdate({
    hospitalId,
    userId,
    departmentId: doctor.departmentId ? String(doctor.departmentId) : undefined,
  });
}

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
    offlineSince: isOnline ? null : lastSeenAt,
  };

  socketIO.to(hospitalRoom(hospitalId)).emit("user:status", payload);

  try {
    const queueFilter: Record<string, unknown> = {
      hospitalId,
      status: {
        $in: ["WAITING", "CALLED", "SERVING"],
      },
      trackingToken: {
        $exists: true,
        $ne: "",
      },
    };

    if (departmentId) {
      queueFilter.$or = [
        { doctorId: userId },
        {
          doctorId: null,
          departmentId,
        },
        {
          doctorId: { $exists: false },
          departmentId,
        },
      ];
    } else {
      queueFilter.doctorId = userId;
    }

    const activeQueues = await Queue.find(queueFilter)
      .select("trackingToken")
      .lean();

    for (const queue of activeQueues) {
      const trackingToken = stringId(queue.trackingToken);

      if (!trackingToken) continue;

      socketIO.to(queueRoom(trackingToken)).emit("user:status", payload);

      socketIO.to(queueRoom(trackingToken)).emit("queue:updated", {
        hospitalId,
        doctorId: userId,
        trackingToken,
        reason: "DOCTOR_STATUS_CHANGED",
      });
    }
  } catch (error) {
    console.error("[socket] patient doctor-status emit error", error);
  }
};

export const emitDoctorTimingUpdate = async ({
  hospitalId,
  userId,
  departmentId,
}: {
  hospitalId: string;
  userId: string;
  departmentId?: string;
}) => {
  const socketIO = getIO();

  socketIO.to(hospitalRoom(hospitalId)).emit("doctor:timing-updated", {
    hospitalId,
    doctorId: userId,
  });

  try {
    const queueFilter: Record<string, unknown> = {
      hospitalId,
      status: {
        $in: ["WAITING", "CALLED", "SERVING"],
      },
      trackingToken: {
        $exists: true,
        $ne: "",
      },
    };

    if (departmentId) {
      queueFilter.$or = [
        { doctorId: userId },
        {
          doctorId: null,
          departmentId,
        },
        {
          doctorId: { $exists: false },
          departmentId,
        },
      ];
    } else {
      queueFilter.doctorId = userId;
    }

    const activeQueues = await Queue.find(queueFilter)
      .select("trackingToken")
      .lean();

    for (const queue of activeQueues) {
      const trackingToken = stringId(queue.trackingToken);

      if (!trackingToken) continue;

      socketIO.to(queueRoom(trackingToken)).emit("queue:updated", {
        hospitalId,
        doctorId: userId,
        trackingToken,
        reason: "DOCTOR_TIMING_UPDATED",
      });

      socketIO.to(queueRoom(trackingToken)).emit("doctor:timing-updated", {
        hospitalId,
        doctorId: userId,
        trackingToken,
      });
    }
  } catch (error) {
    console.error("[socket] patient timing emit error", error);
  }
};

// Keep this export only if another existing file imports
// connectDB from the socket config. Prefer connecting MongoDB
// once from server.ts.
export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error("MONGO_URI is not defined");
  }

  await mongoose.connect(mongoURI);
};
