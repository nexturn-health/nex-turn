import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

const publicApi =
    axios.create({
        baseURL:
            API_BASE_URL,
    });

export interface PublicHospital {
    _id: string;
    name: string;
    state: string;
    district: string;
    city: string;
    address: string;
    pincode?: string;
    logoUrl?: string;
}

export interface PublicDepartment {
    _id: string;
    name: string;
    description?: string;
    tokenPrefix?: string;
}

export interface PublicDoctor {
    _id: string;
    name: string;
    department?: {
        _id: string;
        name: string;
    } | null;
    isOnline?: boolean;
}

export interface PublicSlot {
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
    slotType: "APPOINTMENT";
    status: "AVAILABLE";
}

export interface PublicBookingPayload {
    doctorId: string;
    departmentId: string;
    slotId: string;
    name: string;
    phone: string;
    age?: string;
    gender?: string;
    reason?: string;
    notes?: string;
}

export interface PublicBookingResult {
    appointmentId: string;
    appointmentCode: string;
    status: string;
    confirmationRequired: boolean;
    hospital: {
        _id: string;
        name: string;
        address?: string;
        city?: string;
        district?: string;
        state?: string;
    };
    doctor: {
        _id: string;
        name: string;
    };
    department: {
        _id: string;
        name: string;
    };
    patient: {
        _id: string;
        name: string;
        phone: string;
    };
    date: string;
    startTime: string;
    endTime: string;
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export const getPublicStates =
    async () => {

        const response =
            await publicApi.get<
                ApiResponse<string[]>
            >(
                "/public/locations/states",
            );

        return response.data;
    };

export const getPublicDistricts =
    async (
        state:
            string,
    ) => {

        const response =
            await publicApi.get<
                ApiResponse<string[]>
            >(
                "/public/locations/districts",
                {
                    params: {
                        state,
                    },
                },
            );

        return response.data;
    };

export const getPublicHospitals =
    async (
        params:
            {
                state?: string;
                district?: string;
                q?: string;
            },
    ) => {

        const response =
            await publicApi.get<
                ApiResponse<PublicHospital[]>
            >(
                "/public/hospitals",
                {
                    params,
                },
            );

        return response.data;
    };

export const getPublicDepartments =
    async (
        hospitalId:
            string,
    ) => {

        const response =
            await publicApi.get<
                ApiResponse<PublicDepartment[]>
            >(
                `/public/hospitals/${hospitalId}/departments`,
            );

        return response.data;
    };

export const getPublicDoctors =
    async (
        hospitalId:
            string,
        departmentId?:
            string,
    ) => {

        const response =
            await publicApi.get<
                ApiResponse<PublicDoctor[]>
            >(
                `/public/hospitals/${hospitalId}/doctors`,
                {
                    params: {
                        departmentId:
                            departmentId ||
                            undefined,
                    },
                },
            );

        return response.data;
    };

export const getPublicSlots =
    async (
        hospitalId:
            string,
        doctorId:
            string,
        date:
            string,
    ) => {

        const response =
            await publicApi.get<
                ApiResponse<{
                    date: string;
                    doctorId: string;
                    appointmentEnabled: boolean;
                    confirmationRequired: boolean;
                    slotDurationMinutes: number;
                    slots: PublicSlot[];
                }>
            >(
                `/public/hospitals/${hospitalId}/doctors/${doctorId}/slots`,
                {
                    params: {
                        date,
                    },
                },
            );

        return response.data;
    };

export const bookPublicAppointment =
    async (
        hospitalId:
            string,
        payload:
            PublicBookingPayload,
    ) => {

        const response =
            await publicApi.post<
                ApiResponse<PublicBookingResult>
            >(
                `/public/hospitals/${hospitalId}/appointments`,
                payload,
            );

        return response.data;
    };

export const getPublicAppointmentByCode =
    async (
        appointmentCode:
            string,
        phone:
            string,
    ) => {

        const response =
            await publicApi.get<
                ApiResponse<unknown>
            >(
                `/public/appointments/${appointmentCode}`,
                {
                    params: {
                        phone,
                    },
                },
            );

        return response.data;
    };