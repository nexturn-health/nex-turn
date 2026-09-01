import api from "./api";


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
    queueId: string;

    hospitalId: string;
    doctorId?: QueueDoctor;


    tokenLabel: string;

    tokenNumber: number;

    status:
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";

    priority:
    | "NORMAL"
    | "EMERGENCY";

    patient: {
        _id: string;
        name: string;
        phone: string;
        patientCode?: string;
        age?: number;
        gender?: string;
    };
    department: {
        _id: string;
        name: string;
        description?: string;
        tokenPrefix?: string;
    };

    currentServingToken:
    | string
    | null;

    patientsAhead: number;

    estimatedWaitTime: number;

    estimatedTurnTime:
    | string
    | null;

    queueDate: string;

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
            await api.get<PatientTrackingResponse>(
                `/queues/track/${trackingToken}`,
            );

        return response.data.data;
    };