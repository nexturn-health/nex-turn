import api from "../api";

export type WeekDay =
    | "SUNDAY"
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY";

export type ConsultationMode =
    | "OPD_ONLY"
    | "APPOINTMENT_ONLY"
    | "HYBRID"
    | "ON_CALL_APPOINTMENT";

export type SlotType =
    | "APPOINTMENT"
    | "WALK_IN";

export interface AvailabilityDoctor {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    isOnline?: boolean;

    departmentId?: {
        _id: string;
        name: string;
    };
}

export interface DoctorSession {
    startTime: string;
    endTime: string;

    // Optional because old backend data may not have slotType.
    slotType?: SlotType;
}

export interface DoctorBlockedPeriod {
    startTime: string;
    endTime: string;
    reason?: string;
}

export interface WeeklyAvailability {
    day: WeekDay;
    isAvailable: boolean;
    sessions: DoctorSession[];
    blockedPeriods: DoctorBlockedPeriod[];
}

export interface DoctorSchedulePayload {
    appointmentEnabled: boolean;
    consultationMode: ConsultationMode;
    slotDurationMinutes: number;
    minimumNoticeMinutes: number;
    bookingWindowDays: number;
    gracePeriodMinutes: number;
    maxAppointmentsPerDay: number;
    maxWalkInsPerDay: number;
    emergencyBufferPerDay: number;
    timezone: string;
    confirmationRequired: boolean;
    hybridPattern: SlotType[];
    weeklyAvailability: WeeklyAvailability[];
}

export const getAvailabilityDoctors =
    async () => {
        const response =
            await api.get(
                "/doctor-availability/doctors",
            );

        return response.data;
    };

export const getDoctorAvailability =
    async (
        doctorId:
            string,
    ) => {
        const response =
            await api.get(
                `/doctor-availability/doctors/${doctorId}`,
            );

        return response.data;
    };

export const updateDoctorAvailability =
    async (
        doctorId:
            string,
        payload:
            DoctorSchedulePayload,
    ) => {
        const response =
            await api.put(
                `/doctor-availability/doctors/${doctorId}`,
                payload,
            );

        return response.data;
    };