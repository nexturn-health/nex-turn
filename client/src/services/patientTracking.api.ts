import publicApi from "./publicApi";


export interface QueueDoctor {
    _id: string;
    name: string;
    email?: string;
}
export type PatientQueueStatus =
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";
export interface PatientTrackingData {
    _id: string;

    tokenNumber: number;
    tokenLabel: string;

    status:
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";

    priority: "NORMAL" | "EMERGENCY";

    patient: {
        _id: string;
        name: string;
        phone?: string;
        email?: string;
    };

    department: {
        _id: string;
        name: string;
    };

    doctorId?: {
        _id: string;
        name: string;
        email?: string;
    } | null;

    doctorOnline: boolean;

    doctorShiftStartTime?: string | null;

    patientsAhead: number;
    offlineMinutes?: number;

    averageConsultationMinutes: number;

    estimatedWaitTime: number;

    estimatedTurnTime?: string | null;

    currentServingToken?: string | null;

    createdAt?: string;
    updatedAt?: string;
}
interface PatientTrackingResponse {
    success: boolean;

    data: PatientTrackingData;
}

export const trackPatientQueue =
    async (
        trackingToken: string,
    ): Promise<PatientTrackingData> => {
        const response =
            await publicApi.get<PatientTrackingResponse>(
                `/queues/track/${trackingToken}`,
            );

        return response.data.data;
    };