import api from "./api";

/* =========================================================
   TYPES
========================================================= */

export interface Department {
  _id: string;

  name: string;

  tokenPrefix: string;

  hospitalId: string;

  description?: string;

  isActive: boolean;

  createdAt?: string;

  updatedAt?: string;
}

export interface CreateDepartmentData {
  name: string;

  tokenPrefix: string;

  description?: string;
}

interface DepartmentsResponse {
  success: boolean;

  count: number;

  data: Department[];
}

/* =========================================================
   GET DEPARTMENTS
=========================================================

   Normal user:
   getDepartments()

   Super Admin:
   getDepartments(hospitalId)
========================================================= */

export const getDepartments =
  async (
    hospitalId?: string,
  ): Promise<Department[]> => {
    const response =
      await api.get<DepartmentsResponse>(
        "/departments",
        {
          params: hospitalId
            ? {
                hospitalId,
              }
            : undefined,
        },
      );

    return response.data.data;
  };

/* =========================================================
   CREATE DEPARTMENT
========================================================= */

export const createDepartment =
  async (
    data: CreateDepartmentData,
  ): Promise<Department> => {
    const response =
      await api.post(
        "/departments",
        data,
      );

    return response.data.data;
  };

/* =========================================================
   UPDATE DEPARTMENT
========================================================= */

export const updateDepartment =
  async (
    id: string,
    data: CreateDepartmentData,
  ): Promise<Department> => {
    const response =
      await api.put(
        `/departments/${id}`,
        data,
      );

    return response.data.data;
  };

/* =========================================================
   DELETE DEPARTMENT
========================================================= */

export const deleteDepartment =
  async (
    id: string,
  ) => {
    const response =
      await api.delete(
        `/departments/${id}`,
      );

    return response.data;
  };