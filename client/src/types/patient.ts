export type Gender =
    | "MALE"
    | "FEMALE"
    | "OTHER";

export interface Patient {
    _id: string;

    hospitalId: string;

    name: string;

    phone: string;

    age: number;

    gender: Gender;

    address?: string;

     patientCode: string;

    createdAt?: string;

    updatedAt?: string;
}

export interface CreatePatientPayload {
    name: string;

    phone: string;

    age: number;

    gender: Gender;

    address?: string;

    departmentId?: string
}