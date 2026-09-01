// import { Server } from "socket.io";
// import type { Server as HttpServer } from "http";

// import { User } from "../models/User.model";

// let io: Server | null = null;

// export const initializeSocket = (
//     httpServer: HttpServer,
// ) => {

//     io = new Server(httpServer, {
//         cors: {
//             origin:
//                 process.env.CLIENT_URL ||
//                 "http://localhost:5173",

//             credentials: true,
//         },
//     });

//     io.on("connection", (socket) => {

//         console.log(
//             "Socket connected:",
//             socket.id,
//         );

//         // =====================================
//         // JOIN HOSPITAL ROOM
//         // =====================================

//         socket.on(
//             "join:hospital",
//             async (
//                 data:
//                     | string
//                     | {
//                         hospitalId?: string;
//                         userId?: string;
//                     },
//             ) => {

//                 const hospitalId =
//                     typeof data === "string"
//                         ? data
//                         : data?.hospitalId;

//                 const userId =
//                     typeof data === "string"
//                         ? undefined
//                         : data?.userId;

//                 if (!hospitalId) {
//                     return;
//                 }

//                 const roomName =
//                     `hospital:${hospitalId}`;

//                 socket.join(roomName);

//                 // Store user information on socket
//                 socket.data.hospitalId =
//                     hospitalId;

//                 if (userId) {
//                     socket.data.userId =
//                         userId;
//                 }

//                 console.log(
//                     `Socket ${socket.id} joined ${roomName}`,
//                 );

//                 console.log(
//                     "Socket user:",
//                     userId,
//                 );
//             },
//         );

//         // =====================================
//         // JOIN PATIENT TRACKING ROOM
//         // =====================================

//         socket.on(
//             "queue:join",
//             ({
//                 trackingToken,
//             }: {
//                 trackingToken?: string;
//             }) => {

//                 if (!trackingToken) {
//                     return;
//                 }

//                 const roomName =
//                     `queue:${trackingToken}`;

//                 socket.join(roomName);

//                 console.log(
//                     `Socket ${socket.id} joined ${roomName}`,
//                 );
//             },
//         );

//         // =====================================
//         // LEAVE PATIENT TRACKING ROOM
//         // =====================================

//         socket.on(
//             "queue:leave",
//             ({
//                 trackingToken,
//             }: {
//                 trackingToken?: string;
//             }) => {

//                 if (!trackingToken) {
//                     return;
//                 }

//                 const roomName =
//                     `queue:${trackingToken}`;

//                 socket.leave(roomName);

//                 console.log(
//                     `Socket ${socket.id} left ${roomName}`,
//                 );
//             },
//         );

//         // =====================================
//         // DISCONNECT
//         // =====================================

//         socket.on(
//             "disconnect",
//             async () => {

//                 console.log(
//                     "Socket disconnected:",
//                     socket.id,
//                 );

//                 const userId =
//                     socket.data.userId;

//                 if (!userId) {
//                     return;
//                 }

//                 try {

//                     const user =
//                         await User.findById(
//                             userId,
//                         );

//                     if (!user) {
//                         return;
//                     }

//                     // Only update if currently online
//                     if (user.isOnline) {

//                         user.isOnline = false;

//                         user.lastSeenAt =
//                             new Date();

//                         await user.save();

//                         // Notify reception/display
//                         if (
//                             user.hospitalId
//                         ) {

//                             io?.to(
//                                 `hospital:${user.hospitalId.toString()}`
//                             ).emit(
//                                 "user:status",
//                                 {
//                                     userId:
//                                         user._id.toString(),

//                                     role:
//                                         user.role,

//                                     isOnline:
//                                         false,

//                                     lastSeenAt:
//                                         user.lastSeenAt,
//                                 },
//                             );
//                         }

//                     }

//                 } catch (error) {

//                     console.error(
//                         "Socket disconnect status error:",
//                         error,
//                     );

//                 }
//             },
//         );
//     });

//     return io;
// };

// // =====================================
// // GET SOCKET INSTANCE
// // =====================================

// export const getIO = (): Server => {

//     if (!io) {

//         throw new Error(
//             "Socket.IO is not initialized",
//         );

//     }

//     return io;
// };