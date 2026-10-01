import { io, type Socket } from "socket.io-client";

// VITE_SOCKET_URL must contain only the backend origin.
// Example: https://api.example.com
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

let currentUserId: string | undefined;
let currentHospitalId: string | undefined;
let heartbeatInterval: number | null = null;

// A public patient page can join one or more private tracking rooms.
// The connect event re-joins them automatically after reconnect.
const patientQueues = new Set<string>();

function stopDoctorHeartbeat() {
  if (heartbeatInterval !== null) {
    window.clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function emitPatientQueueJoins() {
  if (!socket.connected) return;

  for (const trackingToken of patientQueues) {
    socket.emit("queue:join", { trackingToken });
  }
}

function startDoctorHeartbeat() {
  stopDoctorHeartbeat();

  if (!currentUserId || !currentHospitalId || !socket.connected) {
    return;
  }

  const heartbeat = () => {
    if (socket.connected && currentUserId && currentHospitalId) {
      socket.emit("user:heartbeat", {
        userId: currentUserId,
        hospitalId: currentHospitalId,
      });
    }
  };

  heartbeat();
  heartbeatInterval = window.setInterval(heartbeat, 15000);
}

function announceUserOnline() {
  if (!currentUserId || !currentHospitalId || !socket.connected) {
    return;
  }

  // user:online validates the user and joins the hospital room
  // on the server. Do not join an arbitrary room before validation.
  socket.emit("user:online", {
    userId: currentUserId,
    hospitalId: currentHospitalId,
  });

  startDoctorHeartbeat();
}

socket.on("connect", () => {
  console.info("[socket] connected", socket.id);

  announceUserOnline();
  emitPatientQueueJoins();
});

socket.on("disconnect", (reason) => {
  console.warn("[socket] disconnected", reason);
  stopDoctorHeartbeat();
});

socket.on("connect_error", (error) => {
  console.warn("[socket] connection error", error.message);
  stopDoctorHeartbeat();
});

/**
 * Call this after a protected user is loaded.
 * Receptionist, doctor and hospital-admin pages use the hospital room.
 */
export function connectSocket(userId: string, hospitalId: string) {
  const nextUserId = String(userId || "").trim();
  const nextHospitalId = String(hospitalId || "").trim();

  if (!nextUserId || !nextHospitalId) {
    console.warn("[socket] userId and hospitalId are required");
    return;
  }

  if (
    currentUserId &&
    (currentUserId !== nextUserId || currentHospitalId !== nextHospitalId)
  ) {
    stopDoctorHeartbeat();
    socket.disconnect();
  }

  currentUserId = nextUserId;
  currentHospitalId = nextHospitalId;

  if (socket.connected) {
    announceUserOnline();
  } else {
    socket.connect();
  }
}

/**
 * Ensures a socket exists for a public tracking page or a page
 * whose authenticated socket was initialized by the auth store.
 */
export function ensureSocketConnected() {
  if (socket.connected) return;

  // A public patient page is allowed to connect after it has
  // registered a tracking token. A staff page must first call
  // connectSocket(userId, hospitalId).
  if (!currentUserId && patientQueues.size === 0) {
    console.warn(
      "[socket] not connecting: no staff identity or patient tracking token",
    );
    return;
  }

  socket.connect();
}

export function disconnectSocket() {
  if (socket.connected && currentUserId && currentHospitalId) {
    socket.emit("user:offline", {
      userId: currentUserId,
      hospitalId: currentHospitalId,
    });
  }

  stopDoctorHeartbeat();
  currentUserId = undefined;
  currentHospitalId = undefined;

  // Do not disconnect a socket that is still being used by a
  // public patient tracking page in the same browser tab.
  if (patientQueues.size === 0) {
    socket.disconnect();
  } else if (!socket.connected) {
    socket.connect();
  }
}

export function joinPatientQueue(trackingToken: string) {
  const token = String(trackingToken || "").trim();

  if (!token) return;

  patientQueues.add(token);

  // This was the main issue in the previous version:
  // a public patient page added the token but never connected.
  ensureSocketConnected();

  if (socket.connected) {
    socket.emit("queue:join", {
      trackingToken: token,
    });
  }
}

export function leavePatientQueue(trackingToken: string) {
  const token = String(trackingToken || "").trim();

  if (!token || !patientQueues.delete(token)) {
    return;
  }

  if (socket.connected) {
    socket.emit("queue:leave", {
      trackingToken: token,
    });
  }

  if (patientQueues.size === 0 && !currentUserId) {
    socket.disconnect();
  }
}

export default socket;
