import api from "./api";

export interface CreateReceptionAppointmentPayload {
    name: string;
    phone: string;
    age: number;
    gender: "MALE" | "FEMALE" | "OTHER";
    address?: string;

    departmentId: string;

    priority: "NORMAL" | "EMERGENCY";
}

export interface ReceptionAppointmentResponse {
    success: boolean;

    message: string;

    patient: {
        _id: string;
        name: string;
        phone: string;
        age: number;
        gender: "MALE" | "FEMALE" | "OTHER";
        address?: string;
        patientCode?: string;
    };

    queue: {
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

        estimatedWaitTime: number;

        trackingToken: string;

        trackingUrl: string;
    };

    notification?: {
        sms: "SENT" | "FAILED" | "NOT_SENT";
        whatsapp: "SENT" | "FAILED" | "NOT_SENT";
    };
}

export const createReceptionAppointment =
    async (
        payload: CreateReceptionAppointmentPayload,
    ): Promise<ReceptionAppointmentResponse> => {

        const response =
            await api.post(
                "/reception/appointments",
                payload,
            );

        return response.data;
    };