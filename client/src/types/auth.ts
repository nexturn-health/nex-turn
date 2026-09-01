export type UserRole =
  | "SUPER_ADMIN"
  | "HOSPITAL_ADMIN"
  | "RECEPTIONIST"
  | "DOCTOR"
  | "PATIENT";

// ==========================================
// USER
// ==========================================

export interface User {
  id: string;

  name: string;

  email: string;

  role: UserRole;

  hospitalId?: string ;
}

// ==========================================
// LOGIN PAYLOAD
// ==========================================

export interface LoginPayload {
  email: string;

  password: string;
}

// ==========================================
// LOGIN RESPONSE
// ==========================================

export interface LoginResponse {
  success: boolean;

  message: string;

  data: {
    user: User;

    token: string;
  };
}

// ==========================================
// REGISTER HOSPITAL PAYLOAD
// ==========================================

export interface RegisterHospitalPayload {
  hospitalName: string;

  name: string;

  email: string;

  password: string;

  phone: string;

  address?: string;
}

// ==========================================
// REGISTER HOSPITAL RESPONSE
// ==========================================

export interface RegisterHospitalResponse {
  success: boolean;

  message: string;

  data: {
    hospital: {
      id: string;

      name: string;

      email: string;

      phone: string;

      address?: string;
    };

    user: User;

    token: string;
  };
}