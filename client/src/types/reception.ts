export type ReceptionGender =
    | "MALE"
    | "FEMALE"
    | "OTHER";

export type ReceptionPriority =
    | "NORMAL"
    | "EMERGENCY";

export interface CreateReceptionAppointmentPayload {
    name: string;
    phone: string;
    age: number;
    gender: ReceptionGender;
    address?: string;

    departmentId: string;

    priority: ReceptionPriority;
}