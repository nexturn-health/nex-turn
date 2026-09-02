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
    userId?: string,
    hospitalId?: string,
) => {
    if (
        !userId ||
        !hospitalId
    ) {
        console.error(
            "Socket: userId or hospitalId missing",
        );

        return;
    }

    currentUserId =
        String(userId);

    currentHospitalId =
        String(hospitalId);

    // ========================================================
    // ALREADY CONNECTED
    // ========================================================

    if (socket.connected) {
        console.log(
            "Socket already connected",
        );

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

        return;
    }

    // ========================================================
    // CONNECT EVENT
    // ========================================================

    const handleConnect = () => {
        console.log(
            "========================================",
        );

        console.log(
            "FRONTEND SOCKET CONNECTED:",
            socket.id,
        );

        console.log(
            "USER ID:",
            currentUserId,
        );

        console.log(
            "HOSPITAL ID:",
            currentHospitalId,
        );

        console.log(
            "========================================",
        );

        // ----------------------------------------------------
        // Tell backend that user is online.
        // ----------------------------------------------------

        socket.emit(
            "user:online",
            {
                userId:
                    currentUserId,

                hospitalId:
                    currentHospitalId,
            },
        );

        // ----------------------------------------------------
        // Join hospital room.
        // ----------------------------------------------------

        socket.emit(
            "join:hospital",
            currentHospitalId,
        );

        // ----------------------------------------------------
        // Start heartbeat.
        // ----------------------------------------------------

        startDoctorHeartbeat();

        console.log(
            "USER ONLINE EVENT SENT",
        );
    };

    // ========================================================
    // CONNECT ERROR
    // ========================================================

    const handleConnectError = (
        error: Error,
    ) => {
        console.error(
            "SOCKET CONNECTION ERROR:",
            error,
        );
    };

    socket.once(
        "connect",
        handleConnect,
    );

    socket.on(
        "connect_error",
        handleConnectError,
    );

    // ========================================================
    // CONNECT
    // ========================================================

    socket.connect();
};

// ============================================================
// DISCONNECT
// ============================================================

export const disconnectSocket = () => {
    console.log(
        "FRONTEND SOCKET DISCONNECTING",
    );

    stopDoctorHeartbeat();

    if (socket.connected) {
        socket.disconnect();
    }

    currentUserId =
        undefined;

    currentHospitalId =
        undefined;
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