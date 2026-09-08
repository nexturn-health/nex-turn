import api from "../../services/api";

export type ConsultationMode =
    | "OPD_ONLY"
    | "APPOINTMENT_ONLY"
    | "HYBRID"
    | "ON_CALL_APPOINTMENT";

export type AppointmentStatus =
    | "REQUESTED"
    | "BOOKED"
    | "CONFIRMED"
    | "RESCHEDULE_REQUESTED"
    | "CHECKED_IN"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
    | "NO_SHOW";

export type SlotStatus =
    | "AVAILABLE"
    | "BOOKED"
    | "HELD"
    | "BLOCKED"
    | "MISSED";

export type HybridPattern =
    | "APPOINTMENT"
    | "WALK_IN";

export type WeekDay =
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";

export interface AppointmentDoctor {
    _id: string;
    name: string;
    phone?: string;
    departmentId?: {
        _id: string;
        name: string;
    };
    isOnline?: boolean;
    lastSeenAt?: string;
    schedule?: DoctorSchedule | null;
    scheduleConfigured?: boolean;
}

export interface DoctorSession {
    startTime: string;
    endTime: string;
    slotType?: "APPOINTMENT" | "WALK_IN";
}

export interface WeeklyAvailability {
    day: WeekDay;
    isAvailable: boolean;
    sessions: DoctorSession[];
}

export interface DoctorSchedule {
    _id?: string;
    hospitalId?: string;
    doctorId?: string;
    consultationMode: ConsultationMode;
    appointmentEnabled: boolean;
    confirmationRequired: boolean;
    slotDurationMinutes: number;
    weeklyAvailability: WeeklyAvailability[];
    blockedDates?: string[];
    dateOverrides?: unknown[];
    maxAppointmentsPerDay?: number;
    maxWalkInsPerDay?: number;
    emergencyBufferPerDay?: number;
    minimumNoticeMinutes?: number;
    bookingWindowDays?: number;
    gracePeriodMinutes?: number;
    hybridPattern?: HybridPattern[];
    timezone?: string;
    isActive?: boolean;
}

export interface DoctorSlot {
    _id: string;
    hospitalId: string;
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
    slotType: "APPOINTMENT" | "WALK_IN";
    status: SlotStatus;
    source?: "AUTO" | "MANUAL";
    patientId?: string | null;
    appointmentId?: string | null;
    blockReason?: string;
}

export interface AppointmentPatient {
    _id: string;
    name: string;
    phone: string;
    age?: number;
    gender?: string;
    patientCode?: string;
}

export interface AppointmentItem {
    _id: string;
    appointmentCode: string;
    appointmentDate: string;
    requestedStartTime: string;
    confirmedStartTime?: string | null;
    endTime: string;
    status: AppointmentStatus;
    confirmationRequired: boolean;
    reason?: string;
    notes?: string;
    patientId: AppointmentPatient;
    doctorId: {
        _id: string;
        name: string;
    };
    departmentId: {
        _id: string;
        name: string;
        tokenPrefix?: string;
    };
    slotId?: string;
    queueId?: {
        _id: string;
        tokenLabel: string;
        status: string;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface UpdateDoctorSchedulePayload {
    consultationMode: ConsultationMode;
    appointmentEnabled: boolean;
    confirmationRequired: boolean;
    slotDurationMinutes: number;
    weeklyAvailability: WeeklyAvailability[];
    blockedDates?: string[];
    maxAppointmentsPerDay?: number;
    maxWalkInsPerDay?: number;
    emergencyBufferPerDay?: number;
    minimumNoticeMinutes?: number;
    bookingWindowDays?: number;
    gracePeriodMinutes?: number;
    hybridPattern?: HybridPattern[];
}

export interface CreateAppointmentPayload {
    patientId: string;
    doctorId: string;
    departmentId: string;
    slotId: string;
    reason?: string;
    notes?: string;
}

export const getAppointmentDoctors =
    async (
        departmentId?: string,
    ) => {

        const response =
            await api.get<
                ApiResponse<AppointmentDoctor[]>
            >(
                "/appointments/doctors",
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

export const searchAppointmentPatients =
    async (
        q: string,
    ) => {

        const response =
            await api.get<
                ApiResponse<AppointmentPatient[]>
            >(
                "/appointments/patients/search",
                {
                    params: {
                        q,
                    },
                },
            );

        return response.data;
    };

export const getDoctorSchedule =
    async (
        doctorId: string,
    ) => {

        const response =
            await api.get<
                ApiResponse<DoctorSchedule | null>
            >(
                `/appointments/doctors/${doctorId}/schedule`,
            );

        return response.data;
    };

export const updateDoctorSchedule =
    async (
        doctorId: string,
        payload: UpdateDoctorSchedulePayload,
    ) => {

        const response =
            await api.put<
                ApiResponse<DoctorSchedule>
            >(
                `/appointments/doctors/${doctorId}/schedule`,
                payload,
            );

        return response.data;
    };

export const getDoctorSlots =
    async (
        doctorId: string,
        date: string,
    ) => {

        const response =
            await api.get<
                ApiResponse<{
                    date: string;
                    consultationMode: ConsultationMode;
                    appointmentEnabled: boolean;
                    confirmationRequired: boolean;
                    slotDurationMinutes: number;
                    slots: DoctorSlot[];
                }>
            >(
                `/appointments/doctors/${doctorId}/slots`,
                {
                    params: {
                        date,
                    },
                },
            );

        return response.data;
    };

export const updateDoctorSlot =
    async (
        slotId: string,
        payload: {
            slotType?: "APPOINTMENT" | "WALK_IN";
            status?: SlotStatus;
            blockReason?: string;
        },
    ) => {

        const response =
            await api.patch<
                ApiResponse<DoctorSlot>
            >(
                `/appointments/slots/${slotId}`,
                payload,
            );

        return response.data;
    };

export const createAppointment =
    async (
        payload: CreateAppointmentPayload,
    ) => {

        const response =
            await api.post<
                ApiResponse<AppointmentItem>
            >(
                "/appointments",
                payload,
            );

        return response.data;
    };

export const getAppointments =
    async (
        params?: {
            date?: string;
            doctorId?: string;
            departmentId?: string;
            status?: string;
        },
    ) => {

        const response =
            await api.get<
                ApiResponse<AppointmentItem[]>
            >(
                "/appointments",
                {
                    params,
                },
            );

        return response.data;
    };

export const confirmAppointment =
    async (
        appointmentId: string,
    ) => {

        const response =
            await api.post<
                ApiResponse<AppointmentItem>
            >(
                `/appointments/${appointmentId}/confirm`,
            );

        return response.data;
    };

export const rejectAppointment =
    async (
        appointmentId: string,
        reason?: string,
    ) => {

        const response =
            await api.post<
                ApiResponse<unknown>
            >(
                `/appointments/${appointmentId}/reject`,
                {
                    reason,
                },
            );

        return response.data;
    };

export const cancelAppointment =
    async (
        appointmentId: string,
        reason?: string,
    ) => {

        const response =
            await api.post<
                ApiResponse<unknown>
            >(
                `/appointments/${appointmentId}/cancel`,
                {
                    reason,
                },
            );

        return response.data;
    };

export const rescheduleAppointment =
    async (
        appointmentId: string,
        slotId: string,
    ) => {

        const response =
            await api.post<
                ApiResponse<AppointmentItem>
            >(
                `/appointments/${appointmentId}/reschedule`,
                {
                    slotId,
                },
            );

        return response.data;
    };

export const markAppointmentNoShow =
    async (
        appointmentId: string,
    ) => {

        const response =
            await api.post<
                ApiResponse<unknown>
            >(
                `/appointments/${appointmentId}/no-show`,
            );

        return response.data;
    };

export const checkInAppointment =
    async (
        appointmentId: string,
    ) => {

        const response =
            await api.post<
                ApiResponse<{
                    appointment: AppointmentItem;
                    queue: unknown;
                }>
            >(
                `/appointments/${appointmentId}/check-in`,
            );

        return response.data;
    };