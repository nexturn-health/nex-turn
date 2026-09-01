import api from "./api";

/* ============================== */
/* TYPES */
/* ============================== */

export type QueuePriority =
  | "NORMAL"
  | "EMERGENCY";

export type QueueStatus =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED";

export interface CreateQueuePayload {
  patientId: string;
  departmentId: string;
  priority: QueuePriority;
}

export interface QueuePatient {
  _id: string;
  name: string;
  phone: string;
  patientCode?: string;
  age?: number;
  gender?: "MALE" | "FEMALE" | "OTHER";
}

export interface QueueDepartment {
  _id: string;
  name: string;
  description?: string;
  tokenPrefix?: string;
}

export interface QueueDoctor {
  _id: string;
  name: string;
  email?: string;
}
export interface QueueData {
    _id: string;

    tokenNumber: number;

    tokenLabel: string;

    name:string;

    priority:
        | "NORMAL"
        | "EMERGENCY";

    status:
        | "WAITING"
        | "CALLED"
        | "SERVING"
        | "COMPLETED"
        | "SKIPPED"
        | "CANCELLED";

    patientId: QueuePatient;

    departmentId: QueueDepartment;
    doctorId?: QueueDoctor;

    queueDate: string;

    estimatedWaitTime?: number;

    estimatedTurnTime?: string;

    trackingToken?: string;

    trackingExpiresAt?: string;

    trackingLinkActive?: boolean;

    createdAt: string;
}

/* ============================== */
/* RESPONSE TYPES */
/* ============================== */

interface QueueListResponse {
  success: boolean;
  count: number;
  data: QueueData[];
}

interface QueueResponse {
  success: boolean;
  message: string;
  data: QueueData;
}

interface CreateQueueResponse {
  success: boolean;
  message: string;

  data: {
    queue: QueueData;
    trackingUrl: string;
    estimatedWaitTime: number;
    estimatedTurnTime: string;
  };
}

/* ============================== */
/* CREATE TOKEN */
/* ============================== */

export const createQueue = async (
  data: CreateQueuePayload,
): Promise<CreateQueueResponse> => {
  const response =
    await api.post<CreateQueueResponse>(
      "/queues",
      data,
    );

  return response.data;
};

/* ============================== */
/* GET TODAY QUEUE */
/* ============================== */

export const getQueues = async (
  departmentId?: string,
): Promise<QueueData[]> => {
  const response =
    await api.get<QueueListResponse>(
      "/queues",
      {
        params: departmentId
          ? { departmentId }
          : {},
      },
    );

  return response.data.data;
};

/* ============================== */
/* CALL NEXT PATIENT */
/* ============================== */

export const callNextPatient =
  async (): Promise<QueueData> => {
    const response =
      await api.patch<QueueResponse>(
        "/queues/call-next",
      );

    return response.data.data;
  };

/* ============================== */
/* START SERVING */
/* ============================== */

export const startServingPatient =
  async (
    queueId: string,
  ): Promise<QueueData> => {
    const response =
      await api.patch<QueueResponse>(
        `/queues/${queueId}/start`,
      );

    return response.data.data;
  };

/* ============================== */
/* COMPLETE PATIENT */
/* ============================== */

export const completePatient =
  async (
    queueId: string,
  ): Promise<QueueData> => {
    const response =
      await api.patch<QueueResponse>(
        `/queues/${queueId}/complete`,
      );

    return response.data.data;
  };

/* ============================== */
/* SKIP PATIENT */
/* ============================== */

export const skipPatient =
  async (
    queueId: string,
  ): Promise<QueueData> => {
    const response =
      await api.patch<QueueResponse>(
        `/queues/${queueId}/skip`,
      );

    return response.data.data;
  };