import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

const assistantApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60_000,
    headers: {
        "Content-Type":
            "application/json",
    },
});

export interface AppointmentAssistantSlot {
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
}

export interface AppointmentAssistantDate {
    date: string;
    slots: AppointmentAssistantSlot[];
}

export interface AppointmentAssistantHospital {
    _id: string;
    name: string;
    state: string;
    district: string;
    city: string;
    address: string;
    bookingSlug?: string;
}

export interface AppointmentAssistantResult {
    hospital: AppointmentAssistantHospital;
    department: {
        _id: string;
        name: string;
    };
    doctor: {
        _id: string;
        name: string;
    };
    dates: AppointmentAssistantDate[];
}

export interface AppointmentAssistantResponse {
    message: string;
    intent: {
        intent:
            | "APPOINTMENT_SEARCH"
            | "MEDICAL_QUESTION"
            | "UNCLEAR";
        hospitalQuery: string;
        departmentQuery: string;
        doctorQuery: string;
        stateQuery: string;
        districtQuery: string;
        requestedDate: string | null;
    };
    bookingWindow: {
        from: string;
        to: string;
    };
    hospitals: AppointmentAssistantHospital[];
    results: AppointmentAssistantResult[];
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export async function searchAppointmentsWithAI(
    message: string,
): Promise<AppointmentAssistantResponse> {
    const response =
        await assistantApi.post<
            ApiResponse<AppointmentAssistantResponse>
        >(
            "/public/appointment-assistant/search",
            {
                message:
                    message.trim(),
            },
        );

    return response.data.data;
}
