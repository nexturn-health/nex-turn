import api from "./api";

/* =========================================================
   QUEUE TYPES
========================================================= */

export type QueuePriority =
    | "NORMAL"
    | "EMERGENCY";

export type QueueStatus =
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";

/* =========================================================
   QUEUE PATIENT
========================================================= */

export interface QueuePatient {
    _id: string;
    name: string;
    patientCode?: string;
    phone?: string;
    age?: number;
    gender?: string;
}

/* =========================================================
   QUEUE DEPARTMENT
========================================================= */

export interface QueueDepartment {
    _id: string;
    name: string;
    description?: string;
}

/* =========================================================
   QUEUE DOCTOR
========================================================= */

export interface QueueDoctor {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
}

/* =========================================================
   DOCTOR QUEUE ITEM
========================================================= */

export interface DoctorQueueItem {
    _id: string;
    tokenNumber: number;
    tokenLabel: string;

    priority: QueuePriority;

    status: QueueStatus;

    /*
     * Patient may be missing if backend
     * does not populate patientId.
     */
    patient: QueuePatient;

    /*
     * Some backend responses may return
     * patientId instead of patient.
     */
    patientId?:QueuePatient;

    /*
     * Department can be populated object
     * or ObjectId string.
     */
    departmentId?:
    | QueueDepartment;

    /*
     * Doctor can be populated object
     * or ObjectId string.
     */
    doctorId?:
    | QueueDoctor;

    estimatedWaitMinutes?: number;

    estimatedTurnTime?: string;

    calledAt?: string;

    servingAt?: string;

    completedAt?: string;

    createdAt?: string;

    updatedAt?: string;
}

/* =========================================================
   QUEUE API RESPONSE
========================================================= */

interface DoctorQueueResponse {
    success: boolean;

    count?: number;

    data:
    | DoctorQueueItem[]
    | {
        queues?: DoctorQueueItem[];

        data?: DoctorQueueItem[];
    };

    message?: string;
}

/* =========================================================
   DOCTOR TYPES
========================================================= */

export type DoctorStatus =
    | "ACTIVE"
    | "INACTIVE";

/* =========================================================
   DEPARTMENT REFERENCE
========================================================= */

export interface DepartmentReference {
    _id: string;
    name: string;
    description?: string;
}

/* =========================================================
   HOSPITAL REFERENCE
========================================================= */

export interface HospitalReference {
    _id: string;
    name: string;
}

/* =========================================================
   DOCTOR
========================================================= */

export interface Doctor {
    _id: string;

    name: string;

    email: string;

    phone?: string;

    specialization?: string;

    role: "DOCTOR";

    hospitalId: string;

    departmentId?: string | DepartmentReference;

    hospital?: HospitalReference;

    department?: DepartmentReference;

    status: DoctorStatus;

    isActive: boolean;

    createdAt?: string;

    updatedAt?: string;
}

/* =========================================================
   CREATE DOCTOR PAYLOAD
========================================================= */
export interface CreateDoctorPayload {
    name: string;
    email: string;
    phone?: string;
    password: string;
    specialization?: string;
    departmentId: string;
}

/* =========================================================
   UPDATE DOCTOR PAYLOAD
========================================================= */

export interface UpdateDoctorPayload {
    name?: string;

    email?: string;

    phone?: string;

    password?: string;

    specialization?: string;

    hospitalId?: string;

    departmentId?: string;

    isActive?: boolean;
}

/* =========================================================
   API RESPONSE TYPES
========================================================= */

interface DoctorsResponse {
    success: boolean;

    count: number;

    data: Doctor[];

    message?: string;
}

interface DoctorResponse {
    success: boolean;

    data: Doctor;

    message?: string;
}

/* =========================================================
   ERROR HELPER
========================================================= */

const getApiErrorMessage = (
    error: unknown,
): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const response = (
            error as {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            }
        ).response;

        if (
            response?.data?.message
        ) {
            return response.data.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
};

/* =========================================================
   GET DOCTOR QUEUE
   GET /api/queue

   IMPORTANT:
   This uses /queue, NOT /queues/doctor.
========================================================= */

export const getDoctorQueue =
    async (): Promise<
        DoctorQueueItem[]
    > => {
        try {
            const response =
                await api.get<DoctorQueueResponse>(
                    "/queues",
                );

            const data =
                response.data?.data;

            /* -----------------------------------------
               RESPONSE 1

               {
                   success: true,
                   data: [...]
               }
            ----------------------------------------- */

            if (Array.isArray(data)) {
                return data;
            }

            /* -----------------------------------------
               RESPONSE 2

               {
                   success: true,
                   data: {
                       queues: [...]
                   }
               }
            ----------------------------------------- */

            if (
                data &&
                Array.isArray(
                    data.queues,
                )
            ) {
                return data.queues;
            }

            /* -----------------------------------------
               RESPONSE 3

               {
                   success: true,
                   data: {
                       data: [...]
                   }
               }
            ----------------------------------------- */

            if (
                data &&
                Array.isArray(
                    data.data,
                )
            ) {
                return data.data;
            }

            return [];
        } catch (error) {
            console.error(
                "Failed to fetch doctor queue:",
                error,
            );

            throw new Error(
                getApiErrorMessage(error),
            );
        }
    };

/* =========================================================
   GET DOCTORS
   GET /api/doctors

   Super Admin:
   getDoctors()

   Super Admin with hospital:
   getDoctors(hospitalId)

   Hospital Admin:
   backend restricts to own hospital.
========================================================= */

export const getDoctors =
    async (
        hospitalId?: string,
    ): Promise<Doctor[]> => {
        try {
            const response =
                await api.get<DoctorsResponse>(
                    "/doctors",
                    {
                        params:
                            hospitalId
                                ? {
                                    hospitalId,
                                }
                                : undefined,
                    },
                );

            return Array.isArray(
                response.data.data,
            )
                ? response.data.data
                : [];
        } catch (error) {
            console.error(
                "Failed to fetch doctors:",
                error,
            );

            throw new Error(
                getApiErrorMessage(error),
            );
        }
    };

/* =========================================================
   GET SINGLE DOCTOR
   GET /api/doctors/:id
========================================================= */

export const getDoctorById =
    async (
        id: string,
    ): Promise<Doctor> => {
        try {
            const response =
                await api.get<DoctorResponse>(
                    `/doctors/${id}`,
                );

            return response.data.data;
        } catch (error) {
            console.error(
                "Failed to fetch doctor:",
                error,
            );

            throw new Error(
                getApiErrorMessage(error),
            );
        }
    };

/* =========================================================
   CREATE DOCTOR
   POST /api/doctors
========================================================= */

export const createDoctor =
    async (
        payload: CreateDoctorPayload,
    ): Promise<Doctor> => {
        try {
            const response =
                await api.post<DoctorResponse>(
                    "/doctors",
                    payload,
                );

            return response.data.data;
        } catch (error) {
            console.error(
                "Failed to create doctor:",
                error,
            );

            throw new Error(
                getApiErrorMessage(error),
            );
        }
    };

/* =========================================================
   UPDATE DOCTOR
   PUT /api/doctors/:id
========================================================= */

export const updateDoctor =
    async (
        id: string,
        payload: UpdateDoctorPayload,
    ): Promise<Doctor> => {
        try {
            const response =
                await api.put<DoctorResponse>(
                    `/doctors/${id}`,
                    payload,
                );

            return response.data.data;
        } catch (error) {
            console.error(
                "Failed to update doctor:",
                error,
            );

            throw new Error(
                getApiErrorMessage(error),
            );
        }
    };

/* =========================================================
   UPDATE DOCTOR STATUS
   PATCH /api/doctors/:id/status
========================================================= */

export const updateDoctorStatus =
    async (
        id: string,
        status: DoctorStatus,
    ): Promise<Doctor> => {
        try {
            const response =
                await api.patch<DoctorResponse>(
                    `/doctors/${id}/status`,
                    {
                        status,

                        isActive:
                            status ===
                            "ACTIVE",
                    },
                );

            return response.data.data;
        } catch (error) {
            console.error(
                "Failed to update doctor status:",
                error,
            );

            throw new Error(
                getApiErrorMessage(error),
            );
        }
    };

/* =========================================================
   DELETE DOCTOR
   DELETE /api/doctors/:id
========================================================= */

export const deleteDoctor =
    async (
        id: string,
    ): Promise<void> => {
        try {
            await api.delete(
                `/doctors/${id}`,
            );
        } catch (error) {
            console.error(
                "Failed to delete doctor:",
                error,
            );

            throw new Error(
                getApiErrorMessage(error),
            );
        }
    };