import api from "./api";

/* =========================================================
   SUPER ADMIN DASHBOARD TYPES
========================================================= */

export interface SuperAdminDashboardData {
    hospitals: {
        total: number;
        active: number;
        inactive: number;
    };

    users: {
        totalAdmins?: number;
        totalHospitalAdmins?: number;
        totalDoctors: number;
        totalReceptionists: number;
        totalSuperAdmins: number;
        total: number;
    };

    patients: {
        total: number;
        today: number;
    };

    departments: {
        total: number;
        active: number;
        inactive: number;
    };

    queues: {
        totalTokensToday: number;
        waiting: number;
        called: number;
        serving: number;
        completed: number;
        skipped: number;
    };

    generatedAt?: string;
}

export interface SuperAdminDashboardResponse {
    success: boolean;
    message?: string;
    data: SuperAdminDashboardData;
}

/* =========================================================
   HOSPITAL TYPES
========================================================= */

export interface HospitalStats {
    doctors: number;
    receptionists: number;
    patients: number;
    departments: number;
    todayTokens: number;
}

export interface Hospital {
    _id: string;

    name: string;

    email?: string;

    phone?: string;

    address?: string;

    city?: string;

    state?: string;

    pincode?: string;

    registrationNumber?: string;

    isActive: boolean;

    createdAt?: string;

    updatedAt?: string;

    stats?: HospitalStats;

    totalDoctors?: number;

    totalReceptionists?: number;

    totalPatients?: number;

    totalDepartments?: number;

    todayTokens?: number;
}

/* =========================================================
   HOSPITAL LIST RESPONSE
========================================================= */

export interface SuperAdminHospitalsResponse {
    success: boolean;
    message?: string;
    data: Hospital[];
}

/* =========================================================
   CREATE HOSPITAL
========================================================= */

export interface CreateHospitalPayload {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    registrationNumber?: string;
}

/* =========================================================
   UPDATE HOSPITAL
========================================================= */

export interface UpdateHospitalPayload {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    registrationNumber?: string;
}

/* =========================================================
   HOSPITAL DETAILS
========================================================= */

export interface HospitalDetailsResponse {
    success: boolean;
    message?: string;
    data: Hospital;
}

/* =========================================================
   HOSPITAL DASHBOARD
========================================================= */

export interface HospitalQueueStats {
    waiting: number;
    called: number;
    serving: number;
    completed: number;
    skipped: number;
}

export interface HospitalDashboardData {
    hospital: Hospital;
    doctors: number;
    receptionists: number;
    patients: number;
    departments: number;
    todayTokens: number;
    queue: HospitalQueueStats;
}

export interface HospitalDashboardResponse {
    success: boolean;
    message?: string;
    data: HospitalDashboardData;
}

/* =========================================================
   BASIC RESPONSE
========================================================= */

export interface BasicApiResponse {
    success: boolean;
    message?: string;
}

/* =========================================================
   SUPER ADMIN DASHBOARD
========================================================= */

export const getSuperAdminDashboard =
    async (): Promise<SuperAdminDashboardResponse> => {
        const response =
            await api.get<SuperAdminDashboardResponse>(
                "/super-admin/dashboard",
            );

        return response.data;
    };

/* =========================================================
   GET ALL HOSPITALS
========================================================= */

export const getSuperAdminHospitals =
    async (): Promise<SuperAdminHospitalsResponse> => {
        const response =
            await api.get<SuperAdminHospitalsResponse>(
                "/hospitals",
            );

        return response.data;
    };

/* =========================================================
   GET SINGLE HOSPITAL
========================================================= */

export const getSuperAdminHospital =
    async (
        hospitalId: string,
    ): Promise<HospitalDetailsResponse> => {
        const response =
            await api.get<HospitalDetailsResponse>(
                `/hospitals/${hospitalId}`,
            );

        return response.data;
    };

/* =========================================================
   CREATE HOSPITAL
========================================================= */

export const createSuperAdminHospital =
    async (
        payload: CreateHospitalPayload,
    ): Promise<BasicApiResponse> => {
        const response =
            await api.post<BasicApiResponse>(
                "/hospitals",
                payload,
            );

        return response.data;
    };

/* =========================================================
   UPDATE HOSPITAL
========================================================= */

export const updateSuperAdminHospital =
    async (
        hospitalId: string,
        payload: UpdateHospitalPayload,
    ): Promise<BasicApiResponse> => {
        const response =
            await api.put<BasicApiResponse>(
                `/hospitals/${hospitalId}`,
                payload,
            );

        return response.data;
    };

/* =========================================================
   UPDATE HOSPITAL STATUS
========================================================= */

export const updateHospitalStatus =
    async (
        hospitalId: string,
        isActive: boolean,
    ): Promise<BasicApiResponse> => {
        const response =
            await api.patch<BasicApiResponse>(
                `/hospitals/${hospitalId}/status`,
                {
                    isActive,
                },
            );

        return response.data;
    };

/* =========================================================
   HOSPITAL DASHBOARD
========================================================= */

export const getHospitalDashboard =
    async (
        hospitalId: string,
    ): Promise<HospitalDashboardResponse> => {
        const response =
            await api.get<HospitalDashboardResponse>(
                `/hospitals/${hospitalId}/dashboard`,
            );

        return response.data;
    };