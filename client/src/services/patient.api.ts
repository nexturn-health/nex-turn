import api from "./api";

import type {
  CreatePatientPayload,
  Patient,
} from "../types/patient";

/* ============================== */
/* UPDATE PAYLOAD */
/* ============================== */

export interface UpdatePatientPayload {
  name?: string;
  phone?: string;
  age?: number;
  gender?: "MALE" | "FEMALE" | "OTHER";
  address?: string;
}

/* ============================== */
/* RESPONSE TYPES */
/* ============================== */

interface PatientsResponse {
  success: boolean;
  message: string;
  // count?: number;
  data: Patient[];
}

interface PatientResponse {
  success: boolean;
  message?: string;
  data: Patient;
}

/* ============================== */
/* GET ALL PATIENTS */
/* ============================== */

export const getPatients = async (): Promise<Patient[]> => {
  const response = await api.get<PatientsResponse>(
    "/patients"
  );

  return response.data.data || [];
};

/* ============================== */
/* GET SINGLE PATIENT */
/* ============================== */

export const getPatientById = async (
  patientId: string
): Promise<Patient> => {
  const response = await api.get<PatientResponse>(
    `/patients/${patientId}`
  );

  return response.data.data;
};

/* ============================== */
/* CREATE PATIENT */
/* ============================== */

export const createPatient = async (
  data: CreatePatientPayload
): Promise<Patient> => {
  const response = await api.post<PatientResponse>(
    "/patients",
    data
  );

  return response.data.data;
};

/* ============================== */
/* UPDATE PATIENT */
/* ============================== */

export const updatePatient = async (
  patientId: string,
  data: UpdatePatientPayload
): Promise<Patient> => {
  const response = await api.put<PatientResponse>(
    `/patients/${patientId}`,
    data
  );

  return response.data.data;
};

export const getTokenEligiblePatients =
  async (): Promise<Patient[]> => {

    const response =
      await api.get(
        "/patients/token-eligible",
      );

    return response.data.data;
  };

/* ============================== */
/* GET TODAY'S PATIENTS */
/* ============================== */

export const getTodayPatients =
  async (): Promise<Patient[]> => {
    const response =
      await api.get<PatientsResponse>(
        "/patients/today",
      );

    return response.data.data || [];
  };