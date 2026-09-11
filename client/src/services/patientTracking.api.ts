import publicApi from "./publicApi";

export interface QueueDoctor {
    _id: string;
    name: string;
    email?: string;
    isOnline?: boolean;
    isOnBreak?: boolean;
    breakStartedAt?: string | null;
    breakReason?: string | null;
}

export type PatientQueueStatus =
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";

export type QueuePriority =
    | "NORMAL"
    | "EMERGENCY";

export interface DoctorTimingData {
    scheduledStartTime?: string | null;
    scheduledEndTime?: string | null;

    isOnline?: boolean;
    isLate?: boolean;

    lateByMinutes?: number;

    firstOnlineAt?: string | null;
    lastSeenAt?: string | null;
    expectedDoctorStartAt?: string | null;

    averageServiceMinutes?: number;

    message?: string;
    isOnBreak?: boolean;
    breakStartedAt?: string | null;
    breakReason?: string | null;
}

export interface AppointmentTrackingData {
    appointmentCode?: string | null;
    appointmentTime?: string | null;
    scheduledStartTime?: string | null;
    scheduledEndTime?: string | null;
    appointmentCallStatus?: "UPCOMING" | "PRIORITY" | "MISSED" | null;
    message?: string;
}
export interface PatientTrackingData {
    _id: string;

    tokenNumber: number;
    tokenLabel: string;

    status: PatientQueueStatus;

    priority: QueuePriority;

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

    /*
     * Old field kept for backward compatibility.
     * New UI mainly uses doctorTiming.scheduledStartTime.
     */
    doctorShiftStartTime?: string | null;

    patientsAhead: number;

    offlineMinutes?: number;

    averageConsultationMinutes: number;

    estimatedWaitTime: number;

    estimatedTurnTime?: string | null;

    currentServingToken?: string | null;

    doctorTiming?: DoctorTimingData | null;

    appointment?: AppointmentTrackingData | null;

    createdAt?: string;
    updatedAt?: string;
    source?: "WALK_IN" | "APPOINTMENT" | "EMERGENCY";
    isAppointment?: boolean;

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