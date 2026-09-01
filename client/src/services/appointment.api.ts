import api from "./api";

export interface Appointment {
  _id?: string;
  id?: string;

  patientId: {
    _id?: string;
    name?: string;
    phone?: string;
    patientCode?: string;
  };

  departmentId: {
    _id?: string;
    name?: string;
  };

  doctorId?: {
    _id?: string;
    name?: string;
    email?: string;
  };

  appointmentDate: string;

  appointmentTime?: string;

  status:
    | "BOOKED"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED";

  createdAt?: string;
  updatedAt?: string;
}

// ==============================
// GET APPOINTMENTS
// ==============================

export const getAppointments = async (): Promise<
  Appointment[]
> => {
  const response = await api.get("/appointments");

  return response.data.data;
};

// ==============================
// UPDATE APPOINTMENT STATUS
// ==============================

export const updateAppointmentStatus = async (
  id: string,
  status: Appointment["status"],
) => {
  const response = await api.patch(
    `/appointments/${id}/status`,
    {
      status,
    },
  );

  return response.data;
};

// ==============================
// DELETE APPOINTMENT
// ==============================

export const deleteAppointment = async (
  id: string,
) => {
  const response = await api.delete(
    `/appointments/${id}`,
  );

  return response.data;
};