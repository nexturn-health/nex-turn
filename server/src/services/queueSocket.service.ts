import {
  getIO,
} from "../config/socket";

/* =========================================================
   EMIT QUEUE UPDATED
========================================================= */

export const emitQueueUpdated = (
  hospitalId: string,
  departmentId: string,
) => {
  try {
    const room =
      `hospital:${hospitalId}`;

    getIO()
      .to(room)
      .emit(
        "queue:updated",
        {
          hospitalId,
          departmentId,
          timestamp:
            new Date().toISOString(),
        },
      );

    console.log(
      "📡 Queue update emitted",
    );

    console.log(
      "ROOM:",
      room,
    );

    console.log(
      "DEPARTMENT:",
      departmentId,
    );
  } catch (error) {
    console.error(
      "❌ Queue socket emit failed:",
      error,
    );
  }
};