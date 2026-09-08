import axios from "axios";

import type {
    LabDepartment,
    LabRoom,
    LabTest,
    LabOrder,
} from "../../types/lab.types";

export type {
    LabDepartment,
    LabRoom,
    LabTest,
    LabOrder,
    LabTechnician,
} from "../../types/lab.types";

const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

const labApi =
    axios.create({
        baseURL: API_URL,
    });

// ============================================================
// AUTH
// ============================================================

labApi.interceptors.request.use(
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
);

// ============================================================
// RESPONSE
// ============================================================

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

// ============================================================
// DEPARTMENTS
// ============================================================

export const getLabDepartments =
    async (
        activeOnly = false,
    ): Promise<LabDepartment[]> => {
        const response =
            await labApi.get<
                ApiResponse<
                    LabDepartment[]
                >
            >(
                activeOnly
                    ? "/lab-departments/active"
                    : "/lab-departments",
            );

        return response.data.data;
    };

export const getActiveLabDepartments =
    async (): Promise<LabDepartment[]> => {
        const response =
            await labApi.get<
                ApiResponse<
                    LabDepartment[]
                >
            >(
                "/lab-departments/active",
            );

        return response.data.data;
    };

export const createLabDepartment =
    async (
        data: {
            name: string;
            code?: string;
            description?: string;
        },
    ): Promise<LabDepartment> => {
        const response =
            await labApi.post<
                ApiResponse<LabDepartment>
            >(
                "/lab-departments",
                data,
            );

        return response.data.data;
    };

export const updateLabDepartment =
    async (
        id: string,
        data: {
            name?: string;
            code?: string;
            description?: string;
            isActive?: boolean;
        },
    ): Promise<LabDepartment> => {
        const response =
            await labApi.patch<
                ApiResponse<LabDepartment>
            >(
                `/lab-departments/${id}`,
                data,
            );

        return response.data.data;
    };

export const deactivateLabDepartment =
    async (
        id: string,
    ): Promise<void> => {
        await labApi.delete(
            `/lab-departments/${id}`,
        );
    };

// ============================================================
// ROOMS
// ============================================================

export const getLabRooms =
    async (
        params?: {
            labDepartmentId?: string;
            isActive?: boolean;
        },
    ): Promise<LabRoom[]> => {
        const response =
            await labApi.get<
                ApiResponse<LabRoom[]>
            >(
                "/lab-rooms",
                {
                    params,
                },
            );

        return response.data.data;
    };

export const getActiveLabRooms =
    async (
        labDepartmentId?: string,
    ): Promise<LabRoom[]> => {
        const response =
            await labApi.get<
                ApiResponse<LabRoom[]>
            >(
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

        return response.data.data;
    };

export const createLabRoom =
    async (
        data: {
            labDepartmentId: string;
            name: string;
            roomNumber: string;
            building: string;
            floor: string;
            description?: string;
        },
    ): Promise<LabRoom> => {
        const response =
            await labApi.post<
                ApiResponse<LabRoom>
            >(
                "/lab-rooms",
                data,
            );

        return response.data.data;
    };

export const updateLabRoom =
    async (
        id: string,
        data: {
            labDepartmentId?: string;
            name?: string;
            roomNumber?: string;
            building?: string;
            floor?: string;
            description?: string;
            isActive?: boolean;
        },
    ): Promise<LabRoom> => {
        const response =
            await labApi.patch<
                ApiResponse<LabRoom>
            >(
                `/lab-rooms/${id}`,
                data,
            );

        return response.data.data;
    };

export const deactivateLabRoom =
    async (
        id: string,
    ): Promise<void> => {
        await labApi.delete(
            `/lab-rooms/${id}`,
        );
    };

// ============================================================
// LAB TESTS
// ============================================================

export const getLabTests =
    async (
        activeOnly = false,
    ): Promise<LabTest[]> => {
        const response =
            await labApi.get<
                ApiResponse<LabTest[]>
            >(
                activeOnly
                    ? "/lab-tests/active"
                    : "/lab-tests",
            );

        return response.data.data;
    };

export const getActiveLabTests =
    async (): Promise<LabTest[]> => {
        const response =
            await labApi.get<
                LabTest[] | {
                    success?: boolean;
                    data?: LabTest[];
                }
            >(
                "/lab-tests/active",
            );

        const payload =
            response.data;

        if (
            Array.isArray(
                payload,
            )
        ) {
            return payload;
        }

        if (
            payload &&
            Array.isArray(
                payload.data,
            )
        ) {
            return payload.data;
        }

        return [];
    };

export const createLabTest =
    async (
        data: {
            name: string;
            code?: string;
            category?: string;
            description?: string;
            price: number;
            sampleType?: string;
            turnaroundTimeMinutes?: number;
            labDepartmentId: string;
            labRoomId: string;
        },
    ): Promise<LabTest> => {
        const response =
            await labApi.post<
                ApiResponse<LabTest>
            >(
                "/lab-tests",
                data,
            );

        return response.data.data;
    };

export const updateLabTest =
    async (
        id: string,
        data: {
            name?: string;
            code?: string;
            category?: string;
            description?: string;
            price?: number;
            sampleType?: string;
            turnaroundTimeMinutes?: number;
            labDepartmentId?: string;
            labRoomId?: string;
            isActive?: boolean;
        },
    ): Promise<LabTest> => {
        const response =
            await labApi.patch<
                ApiResponse<LabTest>
            >(
                `/lab-tests/${id}`,
                data,
            );

        return response.data.data;
    };

export const deactivateLabTest =
    async (
        id: string,
    ): Promise<void> => {
        await labApi.delete(
            `/lab-tests/${id}`,
        );
    };

// ============================================================
// CREATE LAB ORDER
// ============================================================

export const createLabOrder =
    async (
        data: {
            consultationId: string;
            queueId: string;
            patientId: string;
            testIds: string[];
        },
    ): Promise<LabOrder> => {
        const response =
            await labApi.post<
                ApiResponse<LabOrder>
            >(
                "/lab-tests/orders",
                data,
            );

        return response.data.data;
    };

// ============================================================
// RECEPTIONIST ORDERS
// ============================================================

export const getLabOrders =
    async (
        params?: {
            search?: string;
            date?: string;
            paymentStatus?: string;
            status?: string;
            sort?: string;
        },
    ): Promise<LabOrder[]> => {
        const response =
            await labApi.get<
                LabOrder[]
            >(
                "/lab-tests/orders",
                {
                    params,
                },
            );

        return response.data;
    };

// ============================================================
// PENDING PAYMENTS
// ============================================================

export const getPendingLabPayments =
    async (): Promise<LabOrder[]> => {
        const response =
            await labApi.get<
                ApiResponse<LabOrder[]>
            >(
                "/lab-tests/orders/pending-payments",
            );

        return response.data.data;
    };

// ============================================================
// CONFIRM PAYMENT
// ============================================================

export const confirmLabPayment =
    async (
        orderId: string,
    ): Promise<LabOrder> => {
        const response =
            await labApi.patch<
                ApiResponse<LabOrder>
            >(
                `/lab-tests/orders/${orderId}/payment`,
            );

        return response.data.data;
    };

// ============================================================
// TECHNICIAN ORDERS
// ============================================================

export const getLabTechnicianOrders =
    async (): Promise<LabOrder[]> => {
        const response =
            await labApi.get<
                ApiResponse<LabOrder[]>
            >(
                "/lab-tests/technician/orders",
            );

        return response.data.data;
    };

// ============================================================
// UPDATE TECHNICIAN LAB ITEM
// ============================================================

export const updateLabOrderItemStatus =
    async (
        orderId: string,
        itemId: string,
        data: {
            status:
            | "SAMPLE_COLLECTED"
            | "PROCESSING"
            | "COMPLETED";

            result?: string;

            notes?: string;

            reportFile?: File | null;
        },
    ): Promise<LabOrder> => {
        const formData =
            new FormData();

        formData.append(
            "status",
            data.status,
        );

        if (
            data.result !==
            undefined
        ) {
            formData.append(
                "result",
                data.result,
            );
        }

        if (
            data.notes !==
            undefined
        ) {
            formData.append(
                "notes",
                data.notes,
            );
        }

        if (
            data.reportFile
        ) {
            formData.append(
                "reportFile",
                data.reportFile,
            );
        }

        const response =
            await labApi.patch<
                ApiResponse<LabOrder>
            >(
                `/lab-tests/technician/orders/${orderId}/items/${itemId}`,
                formData,
            );

        return response.data.data;
    };

// ============================================================
// GET LAB REPORT
// ============================================================

export interface LabReportResponse {
    orderId: string;
    itemId: string;
    testName: string;
    result: string;
    notes: string;
    reportFileUrl:
    string;
    reportFileName:
    string;
    reportUploadedAt:
    string | null;
}

export const getLabReport =
    async (
        orderId: string,
        itemId: string,
    ): Promise<LabReportResponse> => {
        const response =
            await labApi.get<
                ApiResponse<
                    LabReportResponse
                >
            >(
                `/lab-tests/reports/${orderId}/${itemId}`,
            );

        return response.data.data;
    };


// GET LAB REPORT FILE

export const getLabReportBlob =
    async (
        orderId: string,
        itemId: string,
    ): Promise<Blob> => {
        const response =
            await labApi.get(
                `/lab-tests/reports/${orderId}/${itemId}`,
                {
                    responseType: "blob",
                },
            );

        return response.data;
    };

export const getTodayPatientLabOrders = async (
    patientId: string,
): Promise<LabOrder[]> => {
    const response = await labApi.get(
       `/lab-tests/patient/${patientId}/today`,
    );

    return response.data?.data ?? response.data ?? [];
};


export default labApi;