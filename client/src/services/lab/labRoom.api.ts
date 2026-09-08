import axios from "axios";

/* ============================================================
   API BASE URL
============================================================ */

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

/* ============================================================
   AXIOS INSTANCE
============================================================ */

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/* ============================================================
   REQUEST INTERCEPTOR
============================================================ */

api.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem(
                "token",
            );

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },
    (error) =>
        Promise.reject(error),
);

/* ============================================================
   TYPES
============================================================ */

export interface LabRoom {
    _id: string;

    hospitalId: string;

    labDepartmentId:
        | string
        | {
            _id: string;
            name?: string;
        };

    name: string;

    roomNumber?: string;

    building?: string;

    floor?: string;

    description?: string;

    isActive: boolean;

    createdAt?: string;

    updatedAt?: string;
}

/* ============================================================
   RESPONSE HELPER
============================================================ */

const unwrapData = <T>(
    response: {
        data?: {
            success?: boolean;
            data?: T;
            message?: string;
        } | T;
    },
): T => {
    const body =
        response.data;

    if (
        body &&
        typeof body === "object" &&
        "data" in body &&
        body.data !== undefined
    ) {
        return body.data as T;
    }

    return body as T;
};

/* ============================================================
   GET ALL LAB ROOMS
============================================================ */

export const getLabRooms =
    async (
        labDepartmentId?: string,
    ): Promise<LabRoom[]> => {
        const response =
            await api.get(
                "/lab-rooms",
                {
                    params:
                        labDepartmentId
                            ? {
                                labDepartmentId,
                            }
                            : undefined,
                },
            );

        const data =
            unwrapData<
                LabRoom[]
            >(response);

        return Array.isArray(data)
            ? data
            : [];
    };

/* ============================================================
   GET ACTIVE LAB ROOMS
============================================================ */

export const getActiveLabRooms =
    async (
        labDepartmentId?: string,
    ): Promise<LabRoom[]> => {
        const response =
            await api.get(
                "/lab-rooms/active",
                {
                    params:
                        labDepartmentId
                            ? {
                                labDepartmentId,
                            }
                            : undefined,
                },
            );

        const data =
            unwrapData<
                LabRoom[]
            >(response);

        return Array.isArray(data)
            ? data
            : [];
    };

/* ============================================================
   CREATE LAB ROOM
============================================================ */

export interface CreateLabRoomPayload {
    labDepartmentId: string;
    name: string;
    roomNumber?: string;
    building?: string;
    floor?: string;
    description?: string;
}

export const createLabRoom =
    async (
        payload: CreateLabRoomPayload,
    ): Promise<LabRoom> => {
        const response =
            await api.post(
                "/lab-rooms",
                payload,
            );

        return unwrapData<LabRoom>(
            response,
        );
    };

/* ============================================================
   UPDATE LAB ROOM
============================================================ */

export interface UpdateLabRoomPayload {
    labDepartmentId?: string;
    name?: string;
    roomNumber?: string;
    building?: string;
    floor?: string;
    description?: string;
}

export const updateLabRoom =
    async (
        id: string,
        payload: UpdateLabRoomPayload,
    ): Promise<LabRoom> => {
        const response =
            await api.patch(
                `/lab-rooms/${id}`,
                payload,
            );

        return unwrapData<LabRoom>(
            response,
        );
    };

/* ============================================================
   DEACTIVATE LAB ROOM
============================================================ */

export const deactivateLabRoom =
    async (
        id: string,
    ): Promise<LabRoom> => {
        const response =
            await api.delete(
                `/lab-rooms/${id}`,
            );

        return unwrapData<LabRoom>(
            response,
        );
    };

export default api;