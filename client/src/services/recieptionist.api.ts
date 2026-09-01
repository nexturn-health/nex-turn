import api from "./api";

export interface Receptionist {
  _id: string;
  name: string;
  email: string;
  role: "RECEPTIONIST";
  hospitalId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReceptionistData {
  name: string;
  email: string;
  password: string;
}

// ==============================
// GET RECEPTIONISTS
// ==============================

export const getReceptionists = async (): Promise<
  Receptionist[]
> => {
  const response = await api.get(
    "/receptionists",
  );

  return response.data.data || response.data;
};

// ==============================
// CREATE RECEPTIONIST
// ==============================

export const createReceptionist = async (
  data: CreateReceptionistData,
) => {
  const response = await api.post(
    "/receptionists",
    data,
  );

  return response.data;
};

// ==============================
// DELETE RECEPTIONIST
// ==============================

export const deleteReceptionist = async (
  id: string,
) => {
  const response = await api.delete(
    `/receptionists/${id}`,
  );

  return response.data;
};