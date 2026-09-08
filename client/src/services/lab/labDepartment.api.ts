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

export interface LabDepartment {
    _id: string;
    hospitalId: string;
    name: string;
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
   GET ALL LAB DEPARTMENTS
============================================================ */

export const getLabDepartments =
    async (): Promise<
        LabDepartment[]
    > => {
        const response =
            await api.get(
                "/lab-departments",
            );

        const data =
            unwrapData<
                LabDepartment[]
            >(response);

        return Array.isArray(data)
            ? data
            : [];
    };

/* ============================================================
   GET ACTIVE LAB DEPARTMENTS
============================================================ */

export const getActiveLabDepartments =
    async (): Promise<
        LabDepartment[]
    > => {
        const response =
            await api.get(
                "/lab-departments/active",
            );

        const data =
            unwrapData<
                LabDepartment[]
            >(response);

        return Array.isArray(data)
            ? data
            : [];
    };

/* ============================================================
   CREATE LAB DEPARTMENT
============================================================ */

export interface CreateLabDepartmentPayload {
    name: string;
    description?: string;
}

export const createLabDepartment =
    async (
        payload: CreateLabDepartmentPayload,
    ): Promise<LabDepartment> => {
        const response =
            await api.post(
                "/lab-departments",
                payload,
            );

        return unwrapData<LabDepartment>(
            response,
        );
    };

/* ============================================================
   UPDATE LAB DEPARTMENT
============================================================ */

export interface UpdateLabDepartmentPayload {
    name?: string;
    description?: string;
}

export const updateLabDepartment =
    async (
        id: string,
        payload: UpdateLabDepartmentPayload,
    ): Promise<LabDepartment> => {
        const response =
            await api.patch(
                `/lab-departments/${id}`,
                payload,
            );

        return unwrapData<LabDepartment>(
            response,
        );
    };

/* ============================================================
   DEACTIVATE LAB DEPARTMENT
============================================================ */

export const deactivateLabDepartment =
    async (
        id: string,
    ): Promise<LabDepartment> => {
        const response =
            await api.delete(
                `/lab-departments/${id}`,
            );

        return unwrapData<LabDepartment>(
            response,
        );
    };

export default api;