import api from "../services/api";

/* ============================================================
   TYPES
============================================================ */

export type WeekDay =
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";

export type ConsultationMode =
    | "OPD_ONLY"
    | "APPOINTMENT_ONLY"
    | "HYBRID"
    | "ON_CALL_APPOINTMENT";

export type HybridPattern =
    | "APPOINTMENT"
    | "WALK_IN";

export type AppointmentStatus =
    | "REQUESTED"
    | "BOOKED"
    | "CONFIRMED"
    | "ARRIVED"
    | "CHECKED_IN"
    | "IN_CONSULTATION"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
    | "NO_SHOW"
    | "RESCHEDULE_REQUESTED"
    | "WAITLISTED";

export type AppointmentPaymentStatus =
    | "UNPAID"
    | "PAID"
    | "REFUNDED";

export type PaymentMethod =
    | "CASH"
    | "UPI"
    | "CARD"
    | "OTHER";

export interface ScheduleSession {
    startTime: string;
    endTime: string;
    slotType: HybridPattern;
}

export interface ScheduleDay {
    day: WeekDay;
    isAvailable: boolean;
    sessions: ScheduleSession[];
    blockedPeriods?: {
        startTime: string;
        endTime: string;
        reason?: string;
    }[];
}

export interface DoctorSchedule {
    _id?: string;
    consultationMode: ConsultationMode;
    appointmentEnabled: boolean;
    confirmationRequired: boolean;
    slotDurationMinutes: number;
    weeklyAvailability: ScheduleDay[];
    blockedDates?: string[];
    maxAppointmentsPerDay: number;
    maxWalkInsPerDay: number;
    emergencyBufferPerDay: number;
    bookingWindowDays: number;
    gracePeriodMinutes: number;
    hybridPattern: HybridPattern[];
}

export interface AppointmentDepartment {
    _id: string;
    name: string;
    tokenPrefix?: string;
}

export interface AppointmentDoctor {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    isOnline?: boolean;
    lastSeenAt?: string;
    departmentId?: AppointmentDepartment;
    schedule?: DoctorSchedule;
    scheduleConfigured?: boolean;
}

export interface AppointmentPatient {
    _id: string;
    name: string;
    phone?: string;
    age?: number;
    gender?: string;
    patientCode?: string;
}

export interface DoctorSlot {
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
    slotType: HybridPattern;
    status:
        | "AVAILABLE"
        | "BOOKED"
        | "HELD"
        | "BLOCKED"
        | "MISSED";
    blockReason?: string;
}

export interface AppointmentQueue {
    _id?: string;
    tokenLabel?: string;
    status?: string;
    source?: string;
    estimatedTurnTime?: string | null;
    estimatedWaitTime?: number;
}

export interface AppointmentItem {
    _id: string;
    id?: string;

    appointmentCode?: string;

    patientId:
        | string
        | AppointmentPatient;

    departmentId:
        | string
        | AppointmentDepartment;

    doctorId:
        | string
        | AppointmentDoctor;

    slotId?: string | null;

    queueId?:
        | string
        | AppointmentQueue
        | null;

    appointmentDate: string;

    requestedStartTime: string;

    confirmedStartTime?: string | null;

    endTime: string;

    status: AppointmentStatus;

    paymentStatus?: AppointmentPaymentStatus;

    feeAmount?: number;

    paidAmount?: number;

    paymentMethod?: PaymentMethod | null;

    paidAt?: string | null;

    arrivedAt?: string | null;

    checkedInAt?: string | null;

    cancelledAt?: string | null;

    cancellationReason?: string;

    rejectedReason?: string;

    noShowAt?: string | null;

    reason?: string;

    notes?: string;

    confirmationRequired?: boolean;

    createdAt?: string;

    updatedAt?: string;
}

export interface UpdateDoctorSchedulePayload {
    consultationMode: ConsultationMode;
    appointmentEnabled: boolean;
    confirmationRequired: boolean;
    slotDurationMinutes: number;
    weeklyAvailability: ScheduleDay[];
    blockedDates?: string[];
    maxAppointmentsPerDay: number;
    maxWalkInsPerDay: number;
    emergencyBufferPerDay: number;
    bookingWindowDays: number;
    gracePeriodMinutes: number;
    hybridPattern: HybridPattern[];
}

export interface CreateAppointmentPayload {
    patientId: string;
    doctorId: string;
    departmentId: string;
    slotId: string;
    reason?: string;
    notes?: string;
    feeAmount?: number;
}

export interface GetAppointmentsParams {
    date?: string;
    doctorId?: string;
    departmentId?: string;
    status?: AppointmentStatus | "ALL" | string;
    paymentStatus?: AppointmentPaymentStatus | "ALL";
}

export interface CollectAppointmentPaymentPayload {
    paidAmount: number;
    feeAmount?: number;
    paymentMethod: PaymentMethod;
}

/* ============================================================
   SUPPORT DATA
============================================================ */

export const getAppointmentDoctors =
    async () => {
        const response =
            await api.get(
                "/appointments/doctors",
            );

        return response.data;
    };

export const searchAppointmentPatients =
    async (
        query: string,
    ) => {
        const response =
            await api.get(
                "/appointments/patients/search",
                {
                    params: {
                        q: query,
                    },
                },
            );

        return response.data;
    };

/* ============================================================
   DOCTOR SCHEDULE
============================================================ */

export const getDoctorSchedule =
    async (
        doctorId: string,
    ) => {
        const response =
            await api.get(
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
            await api.put(
                `/appointments/doctors/${doctorId}/schedule`,
                payload,
            );

        return response.data;
    };

/* ============================================================
   DOCTOR SLOTS
============================================================ */

export const getDoctorSlots =
    async (
        doctorId: string,
        date: string,
    ) => {
        const response =
            await api.get(
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
        payload: Partial<DoctorSlot>,
    ) => {
        const response =
            await api.patch(
                `/appointments/slots/${slotId}`,
                payload,
            );

        return response.data;
    };

/* ============================================================
   APPOINTMENTS
============================================================ */

export const getAppointments =
    async (
        params: GetAppointmentsParams = {},
    ) => {
        const response =
            await api.get(
                "/appointments",
                {
                    params,
                },
            );

        return response.data;
    };

export const createAppointment =
    async (
        payload: CreateAppointmentPayload,
    ) => {
        const response =
            await api.post(
                "/appointments",
                payload,
            );

        return response.data;
    };

/* ============================================================
   APPOINTMENT ACTIONS
============================================================ */

export const confirmAppointment =
    async (
        appointmentId: string,
    ) => {
        const response =
            await api.post(
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
            await api.post(
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
            await api.post(
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
            await api.post(
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
            await api.post(
                `/appointments/${appointmentId}/no-show`,
            );

        return response.data;
    };

/* ============================================================
   NEW RECEPTIONIST FLOW
   ARRIVED → PAYMENT → CHECK-IN
============================================================ */

export const markAppointmentArrived =
    async (
        appointmentId: string,
    ) => {
        const response =
            await api.post(
                `/appointments/${appointmentId}/arrived`,
            );

        return response.data;
    };

export const collectAppointmentPayment =
    async (
        appointmentId: string,
        payload: CollectAppointmentPaymentPayload,
    ) => {
        const response =
            await api.post(
                `/appointments/${appointmentId}/payment`,
                payload,
            );

        return response.data;
    };

export const checkInAppointment =
    async (
        appointmentId: string,
    ) => {
        const response =
            await api.post(
                `/appointments/${appointmentId}/check-in`,
            );

        return response.data;
    };

    