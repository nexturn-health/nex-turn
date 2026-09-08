import {
    io,
    type Socket,
} from "socket.io-client";

// Keep your existing VITE_SOCKET_URL pointing to backend origin.
const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000";

export const socket: Socket =
    io(
        SOCKET_URL,
        {
            autoConnect: false,
            withCredentials: true,
            transports: [
                "polling",
                "websocket",
            ],
            reconnection: true,
        },
    );

let currentUserId:
    string | undefined;

let currentHospitalId:
    string | undefined;

let heartbeatInterval:
    number | null = null;

// Remember active tracking pages so their private rooms survive reconnects.
const patientQueues =
    new Set<string>();

function stopDoctorHeartbeat() {
    if (
        heartbeatInterval !==
        null
    ) {
        window.clearInterval(
            heartbeatInterval,
        );
    }

    heartbeatInterval =
        null;
}

function startDoctorHeartbeat() {
    stopDoctorHeartbeat();

    if (
        !currentUserId ||
        !currentHospitalId ||
        !socket.connected
    ) {
        return;
    }

    const heartbeat =
        () => {
            if (
                socket.connected &&
                currentUserId &&
                currentHospitalId
            ) {
                socket.emit(
                    "user:heartbeat",
                    {
                        userId:
                            currentUserId,
                        hospitalId:
                            currentHospitalId,
                    },
                );
            }
        };

    heartbeat();

    heartbeatInterval =
        window.setInterval(
            heartbeat,
            15000,
        );
}

function announceUserOnline() {
    if (
        !currentUserId ||
        !currentHospitalId
    ) {
        return;
    }

    socket.emit(
        "join:hospital",
        currentHospitalId,
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
}

// Register shared listeners once.
// Never call off("connect") without a handler.
socket.on(
    "connect",
    () => {
        announceUserOnline();

        for (
            const trackingToken of patientQueues
        ) {
            socket.emit(
                "queue:join",
                {
                    trackingToken,
                },
            );
        }
    },
);

socket.on(
    "disconnect",
    stopDoctorHeartbeat,
);

socket.on(
    "connect_error",
    stopDoctorHeartbeat,
);

export function connectSocket(
    userId: string,
    hospitalId: string,
) {
    if (
        currentUserId &&
        (
            currentUserId !==
            userId ||
            currentHospitalId !==
            hospitalId
        )
    ) {
        stopDoctorHeartbeat();
        socket.disconnect();
    }

    currentUserId =
        userId;

    currentHospitalId =
        hospitalId;

    if (
        socket.connected
    ) {
        announceUserOnline();
    } else {
        socket.connect();
    }
}

export function disconnectSocket() {
    if (
        socket.connected &&
        currentUserId &&
        currentHospitalId
    ) {
        socket.emit(
            "user:offline",
            {
                userId:
                    currentUserId,
                hospitalId:
                    currentHospitalId,
            },
        );
    }

    stopDoctorHeartbeat();

    currentUserId =
        undefined;

    currentHospitalId =
        undefined;

    socket.disconnect();

    if (
        patientQueues.size >
        0
    ) {
        socket.connect();
    }
}

export function joinPatientQueue(
    trackingToken: string,
) {
    if (
        !trackingToken ||
        patientQueues.has(
            trackingToken,
        )
    ) {
        return;
    }

    patientQueues.add(
        trackingToken,
    );

    if (
        socket.connected
    ) {
        socket.emit(
            "queue:join",
            {
                trackingToken,
            },
        );
    }
}

export function leavePatientQueue(
    trackingToken: string,
) {
    if (
        !patientQueues.delete(
            trackingToken,
        )
    ) {
        return;
    }

    if (
        socket.connected
    ) {
        socket.emit(
            "queue:leave",
            {
                trackingToken,
            },
        );
    }
}

export default socket;