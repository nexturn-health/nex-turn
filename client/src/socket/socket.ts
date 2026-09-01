import {
    io,
    type Socket,
} from "socket.io-client";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000";


export const socket: Socket =
    io(SOCKET_URL, {
        autoConnect: false,

        transports: [
            "websocket",
            "polling",
        ],

        withCredentials: true,
    });


// =====================================
// SOCKET CONNECT
// =====================================

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

    // =================================
    // ALREADY CONNECTED
    // =================================

    if (socket.connected) {

        console.log(
            "Socket already connected",
        );

        socket.emit(
            "user:online",
            {
                userId,
                hospitalId,
            },
        );

        return;
    }


    // =================================
    // CONNECT EVENT
    // =================================

    socket.once(
        "connect",
        () => {

            console.log(
                "FRONTEND SOCKET CONNECTED:",
                socket.id,
            );

            socket.emit(
                "user:online",
                {
                    userId,
                    hospitalId,
                },
            );

            console.log(
                "USER ONLINE EVENT SENT",
            );
        },
    );


    socket.on(
        "connect_error",
        (error) => {

            console.error(
                "SOCKET CONNECTION ERROR:",
                error,
            );
        },
    );


    socket.connect();
};


// =====================================
// DISCONNECT
// =====================================

export const disconnectSocket = () => {

    if (socket.connected) {

        console.log(
            "FRONTEND SOCKET DISCONNECTING",
        );

        socket.disconnect();
    }
};


export default socket;