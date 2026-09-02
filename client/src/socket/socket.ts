import {
    io,
    type Socket,
} from "socket.io-client";

// ============================================================
// SOCKET URL
// ============================================================

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000";

// ============================================================
// SOCKET INSTANCE
// ============================================================

export const socket: Socket =
    io(
        SOCKET_URL,
        {
            autoConnect: false,

            transports: [
                "websocket",
                "polling",
            ],

            withCredentials: true,
        },
    );

// ============================================================
// HEARTBEAT
// ============================================================

let heartbeatInterval:
    number | null = null;

let currentUserId:
    string | undefined;

let currentHospitalId:
    string | undefined;

// ============================================================
// START DOCTOR HEARTBEAT
// ============================================================

const startDoctorHeartbeat = () => {
    stopDoctorHeartbeat();

    if (!currentUserId) {
        return;
    }

    // Send immediately.
    socket.emit(
        "doctor:heartbeat",
        {
            userId:
                currentUserId,
        },
    );

    // Then every 15 seconds.
    heartbeatInterval =
        window.setInterval(
            () => {
                if (
                    !socket.connected ||
                    !currentUserId
                ) {
                    return;
                }

                socket.emit(
                    "doctor:heartbeat",
                    {
                        userId:
                            currentUserId,
                    },
                );
            },
            15000,
        );
};

// ============================================================
// STOP DOCTOR HEARTBEAT
// ============================================================

const stopDoctorHeartbeat = () => {
    if (
        heartbeatInterval !== null
    ) {
        window.clearInterval(
            heartbeatInterval,
        );

        heartbeatInterval = null;
    }
};

// ============================================================
// SOCKET CONNECT
// ============================================================
export const connectSocket = (
    userId: string,
    hospitalId: string,
) => {
    console.log(
        "================================",
    );

    console.log(
        "🟢 CONNECT SOCKET CALLED",
    );

    console.log(
        "USER:",
        userId,
    );

    console.log(
        "HOSPITAL:",
        hospitalId,
    );

    console.log(
        "SOCKET CONNECTED:",
        socket.connected,
    );

    console.log(
        "================================",
    );

    // VERY IMPORTANT
    currentUserId = userId;
    currentHospitalId = hospitalId;

    if (socket.connected) {
        console.log(
            "⚠️ SOCKET ALREADY CONNECTED",
        );

        socket.emit(
            "user:online",
            {
                userId,
                hospitalId,
            },
        );

        startDoctorHeartbeat();

        return;
    }

    socket.off("connect");

    socket.on(
        "connect",
        () => {
            console.log(
                "🟢 SOCKET CONNECTED:",
                socket.id,
            );

            console.log(
                "📤 EMITTING user:online",
            );

            socket.emit(
                "user:online",
                {
                    userId,
                    hospitalId,
                },
            );

            startDoctorHeartbeat();
        },
    );

    socket.off(
        "connect_error",
    );

    socket.on(
        "connect_error",
        (error) => {
            console.error(
                "❌ SOCKET CONNECT ERROR:",
                error,
            );
        },
    );

    socket.connect();
};


// ============================================================
// DISCONNECT
// ============================================================

export const disconnectSocket = () => {
    console.log("================================");
    console.log("🔴 DISCONNECT SOCKET CALLED");
    console.log("================================");

    stopDoctorHeartbeat();

    const userId = currentUserId;
    const hospitalId = currentHospitalId;

    console.log("SOCKET STATE BEFORE LOGOUT:", {
        connected: socket.connected,
        socketId: socket.id,
        userId,
        hospitalId,
    });

    if (
        socket.connected &&
        userId &&
        hospitalId
    ) {
        console.log("📤 EMITTING user:offline");

        socket.emit(
            "user:offline",
            {
                userId,
                hospitalId,
            },
        );
    } else {
        console.warn(
            "⚠️ Cannot emit user:offline",
            {
                connected:
                    socket.connected,
                userId,
                hospitalId,
            },
        );
    }

    // Disconnect after giving Socket.IO
    // time to send the event.
    setTimeout(() => {
        console.log(
            "🔌 DISCONNECTING SOCKET",
        );

        if (socket.connected) {
            socket.disconnect();
        }

        currentUserId = undefined;
        currentHospitalId = undefined;
    }, 500);
};

// ============================================================
// QUEUE JOIN
// ============================================================

export const joinPatientQueue = (
    trackingToken: string,
) => {
    if (!trackingToken) {
        return;
    }

    if (!socket.connected) {
        console.warn(
            "Socket not connected. Queue join will happen after connection.",
        );
    }

    socket.emit(
        "queue:join",
        {
            trackingToken,
        },
    );

    console.log(
        "PATIENT QUEUE JOIN:",
        trackingToken,
    );
};

// ============================================================
// QUEUE LEAVE
// ============================================================

export const leavePatientQueue = (
    trackingToken: string,
) => {
    if (!trackingToken) {
        return;
    }

    socket.emit(
        "queue:leave",
        {
            trackingToken,
        },
    );

    console.log(
        "PATIENT QUEUE LEAVE:",
        trackingToken,
    );
};

// ============================================================
// EXPORT
// ============================================================

export default socket;