import api from "../api";

/* =========================================================
   HOSPITAL REFERENCE
========================================================= */

export interface HospitalReference {
  _id: string;

  name: string;

  email?: string;

  phone?: string;

  isActive?: boolean;
}

/* =========================================================
   ADMIN STATUS
========================================================= */

export type AdminStatus =
  | "ACTIVE"
  | "INACTIVE";

/* =========================================================
   HOSPITAL ADMIN
========================================================= */

export interface HospitalAdmin {
  _id: string;

  name: string;

  email: string;

  phone?: string;

  /*
   * Depending on backend population,
   * hospitalId may be:
   *
   * "68xxxx"
   *
   * OR
   *
   * {
   *   _id: "...",
   *   name: "Hospital"
   * }
   */
  hospitalId:
    | string
    | HospitalReference
    | null;

  /*
   * Kept because some existing API responses
   * may return hospitalName separately.
   */
  hospitalName?:
    | string
    | HospitalReference
    | null;

  /*
   * Optional populated hospital object.
   */
  hospital?:
    | HospitalReference
    | null;

  role: "HOSPITAL_ADMIN";

  status: AdminStatus;

  /*
   * Optional backend value.
   *
   * Your UI should mainly use status,
   * but keeping this makes the type compatible
   * with APIs returning isActive.
   */
  isActive?: boolean;

  createdAt: string;

  updatedAt?: string;

  lastLogin?: string | null;
}

/* =========================================================
   CREATE FORM PAYLOAD

   Used only by React form.

   hospitalName is useful for UI,
   but is NOT sent to backend.
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
   CREATE ADMIN API PAYLOAD
========================================================= */

export interface CreateHospitalAdminPayload {
  name: string;

  email: string;

  phone?: string;

  password: string;

  hospitalId: string;
}

/* =========================================================
   UPDATE ADMIN API PAYLOAD
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
   HELPER
   NORMALIZE ADMIN
========================================================= */

const normalizeHospitalAdmin = (
  admin: HospitalAdmin,
): HospitalAdmin => {

  /*
   * Some backend endpoints may return:
   *
   * isActive: true
   *
   * while frontend expects:
   *
   * status: "ACTIVE"
   *
   * Keep frontend consistent.
   */

  const status: AdminStatus =
    admin.status ||
    (
      admin.isActive === false
        ? "INACTIVE"
        : "ACTIVE"
    );

  return {
    ...admin,

    status,

    isActive:
      typeof admin.isActive ===
      "boolean"
        ? admin.isActive
        : status === "ACTIVE",
  };
};

/* =========================================================
   GET ALL ADMINS
========================================================= */

export const getHospitalAdmins =
  async (): Promise<
    HospitalAdmin[]
  > => {

    try {

      const response =
        await api.get<
          HospitalAdminsResponse
        >(
          "/hospital-admins",
        );

      const admins =
        response.data.data;

      if (
        !Array.isArray(
          admins,
        )
      ) {
        return [];
      }

      return admins.map(
        normalizeHospitalAdmin,
      );

    } catch (error: any) {

      console.error(
        "GET HOSPITAL ADMINS ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* =========================================================
   GET SINGLE ADMIN
========================================================= */

export const getHospitalAdmin =
  async (
    adminId: string,
  ): Promise<
    HospitalAdmin
  > => {

    try {

      const response =
        await api.get<
          HospitalAdminResponse
        >(
          `/hospital-admins/${adminId}`,
        );

      return normalizeHospitalAdmin(
        response.data.data,
      );

    } catch (error: any) {

      console.error(
        "GET HOSPITAL ADMIN ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* =========================================================
   CREATE ADMIN
========================================================= */

export const createHospitalAdmin =
  async (
    payload:
      CreateHospitalAdminPayload,
  ): Promise<
    HospitalAdmin
  > => {

    try {

      const response =
        await api.post<
          HospitalAdminResponse
        >(
          "/hospital-admins",
          payload,
        );

      return normalizeHospitalAdmin(
        response.data.data,
      );

    } catch (error: any) {

      console.error(
        "CREATE HOSPITAL ADMIN ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* =========================================================
   UPDATE ADMIN
========================================================= */

export const updateHospitalAdmin =
  async (
    adminId: string,

    payload:
      UpdateHospitalAdminPayload,
  ): Promise<
    HospitalAdmin
  > => {

    try {

      const response =
        await api.put<
          HospitalAdminResponse
        >(
          `/hospital-admins/${adminId}`,
          payload,
        );

      return normalizeHospitalAdmin(
        response.data.data,
      );

    } catch (error: any) {

      console.error(
        "UPDATE HOSPITAL ADMIN ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* =========================================================
   CHANGE ADMIN STATUS
========================================================= */

export const updateHospitalAdminStatus =
  async (
    adminId: string,

    status:
      AdminStatus,
  ): Promise<
    HospitalAdmin
  > => {

    try {

      const response =
        await api.patch<
          HospitalAdminResponse
        >(
          `/hospital-admins/${adminId}/status`,
          {
            status,

            /*
             * Kept for compatibility if backend
             * currently expects isActive.
             */
            isActive:
              status ===
              "ACTIVE",
          },
        );

      return normalizeHospitalAdmin(
        response.data.data,
      );

    } catch (error: any) {

      console.error(
        "UPDATE HOSPITAL ADMIN STATUS ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* =========================================================
   DELETE ADMIN
========================================================= */

export const deleteHospitalAdmin =
  async (
    adminId: string,
  ): Promise<void> => {

    try {

      await api.delete(
        `/hospital-admins/${adminId}`,
      );

    } catch (error: any) {

      console.error(
        "DELETE HOSPITAL ADMIN ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };