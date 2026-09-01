import {
    getIO,
} from "../sockets/socket";

export const emitQueueUpdated = (
    hospitalId: string,
    departmentId: string,
) => {
    const room =
        `queue:${hospitalId}:${departmentId}`;

    getIO().to(room).emit(
        "queue:updated",
        {
            hospitalId,
            departmentId,
            timestamp:
                new Date().toISOString(),
        },
    );
};