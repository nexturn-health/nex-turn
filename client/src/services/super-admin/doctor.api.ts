import api from "../api";

/* =========================================================
   TYPES
========================================================= */

export type DoctorStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface DoctorHospital {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface DoctorDepartment {
  _id: string;
  name: string;
  tokenPrefix?: string;
}

export interface Doctor {
  _id: string;

  name: string;

  email: string;

  phone?: string;

  hospitalId: string;

  departmentId: string;

  hospital?: DoctorHospital;

  department?: DoctorDepartment;

  status: DoctorStatus;

  createdAt?: string;

  updatedAt?: string;

  lastLogin?: string;
}

/* =========================================================
   CREATE
========================================================= */

export interface CreateDoctorPayload {
  name: string;

  email: string;

  phone?: string;

  password: string;

  hospitalId: string;

  departmentId: string;
}

/* =========================================================
   UPDATE
========================================================= */

export interface UpdateDoctorPayload {
  name?: string;

  email?: string;

  phone?: string;

  hospitalId?: string;

  departmentId?: string;
}

/* =========================================================
   RESPONSE
========================================================= */

export interface DoctorsResponse {
  success: boolean;

  message?: string;

  data: Doctor[];
}

export interface DoctorResponse {
  success: boolean;

  message?: string;

  data: Doctor;
}

/* =========================================================
   GET DOCTORS
========================================================= */

export const getDoctors =
  async (): Promise<Doctor[]> => {
    const response =
      await api.get<DoctorsResponse>(
        "/doctors",
      );

    return response.data.data;
  };

/* =========================================================
   GET SINGLE DOCTOR
========================================================= */

export const getDoctor =
  async (
    doctorId: string,
  ): Promise<Doctor> => {
    const response =
      await api.get<DoctorResponse>(
        `/doctors/${doctorId}`,
      );

    return response.data.data;
  };

/* =========================================================
   CREATE DOCTOR
========================================================= */

export const createDoctor =
  async (
    payload: CreateDoctorPayload,
  ): Promise<Doctor> => {
    const response =
      await api.post<DoctorResponse>(
        "/doctors",
        payload,
      );

    return response.data.data;
  };

/* =========================================================
   UPDATE DOCTOR
========================================================= */

export const updateDoctor =
  async (
    doctorId: string,
    payload: UpdateDoctorPayload,
  ): Promise<Doctor> => {
    const response =
      await api.put<DoctorResponse>(
        `/doctors/${doctorId}`,
        payload,
      );

    return response.data.data;
  };

/* =========================================================
   UPDATE STATUS
========================================================= */

export const updateDoctorStatus =
  async (
    doctorId: string,
    status: DoctorStatus,
  ): Promise<Doctor> => {
    const response =
      await api.patch<DoctorResponse>(
        `/doctors/${doctorId}/status`,
        {
          status,
        },
      );

    return response.data.data;
  };