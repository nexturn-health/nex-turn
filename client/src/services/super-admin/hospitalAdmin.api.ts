import api from "../api";

export interface HospitalReference {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}


/* =========================================================
   TYPES
========================================================= */

export type AdminStatus = "ACTIVE" | "INACTIVE";

/* =========================================================
   HOSPITAL ADMIN
========================================================= */

export interface HospitalAdmin {
  _id: string;

  name: string;

  email: string;

  phone?: string;

 hospitalId:
  | string
  | HospitalReference
  | null;

  hospitalName?:
        | string
        | HospitalReference
        | null;

  hospital?: HospitalReference | null;

  role: "HOSPITAL_ADMIN";

  status: AdminStatus;

  createdAt: string;

  updatedAt?: string;

  lastLogin?: string;
}

/* =========================================================
   FORM PAYLOAD
   Used by React form
========================================================= */

export interface CreateAdminFormPayload {
  name: string;

  email: string;

  phone: string;

  hospitalId: string;

  hospitalName: string;

  password: string;
}

/* =========================================================
   CREATE API PAYLOAD
   Sent to backend
========================================================= */

export interface CreateHospitalAdminPayload {
  name: string;

  email: string;

  phone?: string;

  password: string;

  hospitalId: string;
}

/* =========================================================
   UPDATE API PAYLOAD
========================================================= */

export interface UpdateHospitalAdminPayload {
  name?: string;

  email?: string;

  phone?: string;

  hospitalId?: string;
}

/* =========================================================
   API RESPONSES
========================================================= */

interface HospitalAdminsResponse {
  success: boolean;

  message?: string;

  data: HospitalAdmin[];
}

interface HospitalAdminResponse {
  success: boolean;

  message?: string;

  data: HospitalAdmin;
}

/* =========================================================
   GET ALL ADMINS
========================================================= */

export const getHospitalAdmins = async (): Promise<
  HospitalAdmin[]
> => {
  const response =
    await api.get<HospitalAdminsResponse>(
      "/hospital-admins",
    );

  return response.data.data;
};

/* =========================================================
   GET SINGLE ADMIN
========================================================= */

export const getHospitalAdmin = async (
  adminId: string,
): Promise<HospitalAdmin> => {
  const response =
    await api.get<HospitalAdminResponse>(
      `/hospital-admins/${adminId}`,
    );

  return response.data.data;
};

/* =========================================================
   CREATE ADMIN
========================================================= */

export const createHospitalAdmin = async (
  payload: CreateHospitalAdminPayload,
): Promise<HospitalAdmin> => {
  console.log(
    "CREATE ADMIN PAYLOAD:",
    payload,
  );

  try {
    const response =
      await api.post<HospitalAdminResponse>(
        "/hospital-admins",
        payload,
      );

    return response.data.data;
  } catch (error: any) {
    console.error(
      "CREATE ADMIN ERROR:",
      error?.response?.data || error,
    );

    throw error;
  }
};

/* =========================================================
   UPDATE ADMIN
========================================================= */

export const updateHospitalAdmin = async (
  adminId: string,
  payload: UpdateHospitalAdminPayload,
): Promise<HospitalAdmin> => {
  try {
    const response =
      await api.put<HospitalAdminResponse>(
        `/hospital-admins/${adminId}`,
        payload,
      );

    return response.data.data;
  } catch (error: any) {
    console.error(
      "UPDATE ADMIN ERROR:",
      error?.response?.data || error,
    );

    throw error;
  }
};

/* =========================================================
   CHANGE STATUS
========================================================= */

export const updateHospitalAdminStatus = async (
  adminId: string,
  status: AdminStatus,
): Promise<HospitalAdmin> => {
  const response =
    await api.patch<HospitalAdminResponse>(
      `/hospital-admins/${adminId}/status`,
      {
        status,
        isActive: status === "ACTIVE",
      },
    );

  return response.data.data;
};

/* =========================================================
   DELETE ADMIN
========================================================= */

export const deleteHospitalAdmin = async (
  adminId: string,
): Promise<void> => {
  await api.delete(
    `/hospital-admins/${adminId}`,
  );
};