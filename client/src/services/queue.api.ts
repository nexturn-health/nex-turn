import api from "./api";

/* ============================================================
   TYPES
============================================================ */

export type QueueStatus =
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";

export type QueuePriority =
    | "NORMAL"
    | "EMERGENCY";

export type QueueSource =
    | "WALK_IN"
    | "APPOINTMENT"
    | "EMERGENCY";

export type QueueRecallMode =
    | "RECALL_NOW"
    | "AFTER_CURRENT"
    | "END_OF_QUEUE";

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    code?: string;
    count?: number;
    data?: T;
}

export interface QueuePatientData {
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
    patientCode?: string;
    age?: number;
    gender?: string;
    address?: string;
}

export interface QueueDepartmentData {
    _id?: string;
    name?: string;
    description?: string;
    tokenPrefix?: string;
}

export interface QueueDoctorData {
    _id?: string;
    name?: string;
    email?: string;
    isOnline?: boolean;
    isOnBreak?: boolean;
    breakStartedAt?: string | Date | null;
    breakReason?: string | null;
    lastResumedAt?: string | Date | null;
    shiftStartTime?: string | null;
    shiftEndTime?: string | null;
}

export interface QueueData {
    _id: string;

    tokenNumber: number;
    tokenLabel: string;

    priority: QueuePriority;
    source?: QueueSource;
    status: QueueStatus;

    patientId?: QueuePatientData | null;
    patient?: QueuePatientData | null;

    departmentId?: QueueDepartmentData | null;
    doctorId?: QueueDoctorData | string | null;

    appointmentId?: unknown;
    appointmentCode?: string | null;

    scheduledStartTime?: string | null;
    scheduledEndTime?: string | null;
    appointmentCallStatus?: "UPCOMING" | "PRIORITY" | "MISSED" | null;
    appointmentMissedAt?: string | Date | null;
    manuallyCalledAfterMissedAt?: string | Date | null;

    estimatedWaitMinutes?: number;
    estimatedWaitTime?: number;
    estimatedTurnTime?: string | Date | null;

    trackingToken?: string;
    trackingUrl?: string | null;
    trackingLinkActive?: boolean;

    calledAt?: string | Date | null;
    servingAt?: string | Date | null;
    completedAt?: string | Date | null;

    skipReason?: string;
    skippedAt?: string | Date | null;
    skippedBy?: string | null;
    skipCount?: number;

    recallStatus?:
        | "NONE"
        | "WAITING_RECALL"
        | "RECALLED"
        | "NO_SHOW";

    recallMode?:
        | "NONE"
        | "RECALL_NOW"
        | "AFTER_CURRENT"
        | "END_OF_QUEUE";

    recalledAt?: string | Date | null;
    recalledBy?: string | null;

    manualOverride?: boolean;
    manualOverrideReason?: string;
    manualOverrideAt?: string | Date | null;
    manualOverrideBy?: string | null;

    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface CreateQueuePayload {
    patientId: string;
    departmentId: string;
    doctorId: string;
    priority?: QueuePriority;
}

export interface CreateQueueResponseData {
    queue: QueueData;
    trackingUrl?: string | null;
    estimatedWaitTime?: number;
    estimatedTurnTime?: string | Date | null;
}

export interface CreateQueueApiResponse {
    success: boolean;
    message?: string;
    code?: string;
    data: CreateQueueResponseData;
}

export interface QueueActionResponseData {
    queue?: QueueData;
    doctorStatus?: Record<string, unknown>;
}

export interface SkipPatientPayload {
    reason?: string;
}

export interface RecallSkippedPatientPayload {
    mode: QueueRecallMode;
    reason?: string;
}

export interface MarkSkippedNoShowPayload {
    reason?: string;
}

export interface DoctorBreakPayload {
    reason?: string;
}

/* ============================================================
   HELPERS
============================================================ */

function unwrapResponse<T>(
    response: {
        data: ApiResponse<T>;
    },
): ApiResponse<T> {
    return response.data;
}

/* ============================================================
   CREATE / LIST QUEUE
============================================================ */

export const createQueue = async (
    payload: CreateQueuePayload,
): Promise<CreateQueueApiResponse> => {
    const response =
        await api.post<CreateQueueApiResponse>(
            "/queues",
            payload,
        );

    return response.data;
};

export const getQueues = async (
    departmentId?: string,
): Promise<QueueData[]> => {
    const response =
        await api.get<ApiResponse<QueueData[]>>(
            "/queues",
            {
                params: departmentId
                    ? {
                          departmentId,
                      }
                    : undefined,
            },
        );

    return response.data.data || [];
};

/* ============================================================
   QUEUE ACTIONS
============================================================ */

export const callNextPatient = async () => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >("/queues/call-next");

    return unwrapResponse(response);
};

export const callSelectedPatient = async (
    queueId: string,
) => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >(`/queues/${queueId}/call-selected`);

    return unwrapResponse(response);
};

export const startServingPatient = async (
    queueId: string,
) => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >(`/queues/${queueId}/start`);

    return unwrapResponse(response);
};

export const completePatient = async (
    queueId: string,
) => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >(`/queues/${queueId}/complete`);

    return unwrapResponse(response);
};

export const skipPatient = async (
    queueId: string,
    payload: SkipPatientPayload = {},
) => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >(
            `/queues/${queueId}/skip`,
            payload,
        );

    return unwrapResponse(response);
};

/* ============================================================
   SKIPPED PATIENT RECALL / OVERRIDE
============================================================ */

export const recallSkippedPatient = async (
    queueId: string,
    payload: RecallSkippedPatientPayload,
) => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >(
            `/queues/${queueId}/recall-skipped`,
            payload,
        );

    return unwrapResponse(response);
};

export const recallSkippedPatientNow = async (
    queueId: string,
    reason = "Patient returned to OPD room.",
) => {
    return recallSkippedPatient(
        queueId,
        {
            mode: "RECALL_NOW",
            reason,
        },
    );
};

export const rejoinSkippedPatientAfterCurrent = async (
    queueId: string,
    reason = "Patient returned after being skipped.",
) => {
    return recallSkippedPatient(
        queueId,
        {
            mode: "AFTER_CURRENT",
            reason,
        },
    );
};

export const rejoinSkippedPatientEndOfQueue = async (
    queueId: string,
    reason = "Patient returned late.",
) => {
    return recallSkippedPatient(
        queueId,
        {
            mode: "END_OF_QUEUE",
            reason,
        },
    );
};

export const markSkippedPatientNoShow = async (
    queueId: string,
    payload: MarkSkippedNoShowPayload = {},
) => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >(
            `/queues/${queueId}/skipped-no-show`,
            payload,
        );

    return unwrapResponse(response);
};

/* ============================================================
   DOCTOR BREAK
============================================================ */

export const takeDoctorBreak = async (
    payload: DoctorBreakPayload = {},
) => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >(
            "/queues/doctor/break",
            payload,
        );

    return unwrapResponse(response);
};

export const resumeDoctorDuty = async () => {
    const response =
        await api.patch<
            ApiResponse<QueueActionResponseData>
        >("/queues/doctor/resume");

    return unwrapResponse(response);
};