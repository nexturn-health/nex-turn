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

export const socket: Socket = io(
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
// STATE
// ============================================================

let heartbeatInterval:
    number | null = null;

let currentUserId:
    string | undefined;

let currentHospitalId:
    string | undefined;

// ============================================================
// PATIENT QUEUE ROOMS
//
// Important:
// Keep track of joined patient rooms so they can be
// restored automatically after Socket.IO reconnects.
// ============================================================

const joinedPatientQueues =
    new Set<string>();

// ============================================================
// DOCTOR HEARTBEAT
// ============================================================

const startDoctorHeartbeat = () => {
    stopDoctorHeartbeat();

    if (!currentUserId) {
        return;
    }

    const sendHeartbeat = () => {
        if (
            !socket.connected ||
            !currentUserId
        ) {
            return;
        }

        socket.emit(
            "user:heartbeat",
            {
                userId:
                    currentUserId,
            },
        );
    };

    // Send immediately.
    sendHeartbeat();

    // Then every 15 seconds.
    heartbeatInterval =
        window.setInterval(
            sendHeartbeat,
            15000,
        );
};

// ============================================================
// STOP HEARTBEAT
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
// RESTORE PATIENT ROOMS
// ============================================================

const restorePatientQueueRooms = () => {
    if (!socket.connected) {
        return;
    }

    for (
        const trackingToken of
        joinedPatientQueues
    ) {
        console.log(
            "🎫 REJOINING PATIENT QUEUE:",
            trackingToken,
        );

        socket.emit(
            "queue:join",
            {
                trackingToken,
            },
        );
    }
};

// ============================================================
// GLOBAL CONNECT HANDLER
// ============================================================

const handleSocketConnect = () => {
    console.log(
        "================================",
    );

    console.log(
        "🟢 SOCKET CONNECTED:",
        socket.id,
    );

    console.log(
        "================================",
    );

    // --------------------------------------------------------
    // Doctor/receptionist online
    // --------------------------------------------------------

    if (
        currentUserId &&
        currentHospitalId
    ) {
        socket.emit(
            "user:online",
            {
                userId:
                    currentUserId,

                hospitalId:
                    currentHospitalId,
            },
        );

        startDoctorHeartbeat();
    }

    // --------------------------------------------------------
    // Restore patient tracking rooms
    // --------------------------------------------------------

    restorePatientQueueRooms();
};

// Register global connect handler once.
socket.on(
    "connect",
    handleSocketConnect,
);

// ============================================================
// SOCKET ERROR
// ============================================================

socket.on(
    "connect_error",
    (error) => {
        console.error(
            "❌ SOCKET CONNECT ERROR:",
            error.message,
        );
    },
);

// ============================================================
// CONNECT SOCKET
// ============================================================

export const connectSocket = (
    userId: string,
    hospitalId: string,
): void => {
    if (
        !userId ||
        !hospitalId
    ) {
        console.warn(
            "⚠️ connectSocket skipped: missing userId or hospitalId",
            {
                userId,
                hospitalId,
            },
        );

        return;
    }

    currentUserId = userId;
    currentHospitalId =
        hospitalId;

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
        "CONNECTED:",
        socket.connected,
    );

    console.log(
        "================================",
    );

    // --------------------------------------------------------
    // Already connected
    // --------------------------------------------------------

    if (socket.connected) {
        socket.emit(
            "user:online",
            {
                userId,
                hospitalId,
            },
        );

        startDoctorHeartbeat();

        restorePatientQueueRooms();

        return;
    }

    // --------------------------------------------------------
    // Start connection
    // --------------------------------------------------------

    socket.connect();
};

// ============================================================
// DISCONNECT SOCKET
// ============================================================

export const disconnectSocket =
    (): void => {
        console.log(
            "================================",
        );

        console.log(
            "🔴 DISCONNECT SOCKET CALLED",
        );

        console.log(
            "================================",
        );

        stopDoctorHeartbeat();

        const userId =
            currentUserId;

        const hospitalId =
            currentHospitalId;

        console.log(
            "SOCKET STATE:",
            {
                connected:
                    socket.connected,

                socketId:
                    socket.id,

                userId,

                hospitalId,
            },
        );

        // ----------------------------------------------------
        // Tell backend doctor is offline
        // ----------------------------------------------------

        if (
            socket.connected &&
            userId &&
            hospitalId
        ) {
            console.log(
                "📤 EMITTING user:offline",
            );

            socket.emit(
                "user:offline",
                {
                    userId,
                    hospitalId,
                },
            );
        }

        currentUserId =
            undefined;

        currentHospitalId =
            undefined;

        // Give Socket.IO time to send offline event.
        window.setTimeout(() => {
            if (
                socket.connected
            ) {
                console.log(
                    "🔌 DISCONNECTING SOCKET",
                );

                socket.disconnect();
            }
        }, 500);
    };

// ============================================================
// JOIN PATIENT QUEUE
// ============================================================

export const joinPatientQueue = (
    trackingToken: string,
): void => {
    if (!trackingToken) {
        return;
    }

    // Remember room for reconnect.
    joinedPatientQueues.add(
        trackingToken,
    );

    console.log(
        "🎫 PATIENT QUEUE REGISTERED:",
        trackingToken,
    );

    // Socket is not connected yet.
    // Global connect handler will restore the room.
    if (!socket.connected) {
        console.log(
            "🔌 PATIENT SOCKET NOT CONNECTED. CONNECTING...",
        );

        socket.connect();

        return;
    }

    // Already connected.
    console.log(
        "📤 JOINING PATIENT QUEUE:",
        trackingToken,
    );

    socket.emit(
        "queue:join",
        {
            trackingToken,
        },
    );
};

// ============================================================
// LEAVE PATIENT QUEUE
// ============================================================

export const leavePatientQueue = (
    trackingToken: string,
): void => {
    if (!trackingToken) {
        return;
    }

    joinedPatientQueues.delete(
        trackingToken,
    );

    if (socket.connected) {
        socket.emit(
            "queue:leave",
            {
                trackingToken,
            },
        );
    }

    console.log(
        "🚪 PATIENT QUEUE LEFT:",
        trackingToken,
    );
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default socket;