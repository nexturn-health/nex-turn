import api from "./api";

import type {
  LoginPayload,
  LoginResponse,
  RegisterHospitalPayload,
  RegisterHospitalResponse,
} from "../types/auth";

// ==========================================
// LOGIN
// ==========================================

export const loginUser = async (
  data: LoginPayload,
): Promise<LoginResponse> => {
  const response =
    await api.post<LoginResponse>(
      "/auth/login",
      data,
    );

  console.log(
    "LOGIN API RESPONSE:",
    response.data,
  );

  if (response.data.success) {
    const token =
      response.data.data.token;

    const user =
      response.data.data.user;

    // Save JWT
    localStorage.setItem(
      "token",
      token,
    );

    // Save user
    localStorage.setItem(
      "user",
      JSON.stringify(user),
    );

    console.log(
      "TOKEN SAVED:",
      token,
    );

    console.log(
      "USER SAVED:",
      user,
    );
  }

  return response.data;
};

// ==========================================
// REGISTER HOSPITAL
// ==========================================

export const registerHospital = async (
  data: RegisterHospitalPayload,
): Promise<RegisterHospitalResponse> => {
  const response =
    await api.post<RegisterHospitalResponse>(
      "/auth/register-hospital",
      data,
    );

  return response.data;
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export const forgotPassword = async (
  email: string,
): Promise<ForgotPasswordResponse> => {
  const response =
    await api.post<ForgotPasswordResponse>(
      "/auth/forgot-password",
      {
        email,
      },
    );

  return response.data;
};

export const logout = async () => {

    try {

        await api.post(
            "/auth/logout",
        );

    } catch (error) {

        console.error(
            "Logout API error:",
            error,
        );

    } finally {

        localStorage.removeItem(
            "token",
        );

        localStorage.removeItem(
            "user",
        );

        window.location.href =
            "/login";
    }
};