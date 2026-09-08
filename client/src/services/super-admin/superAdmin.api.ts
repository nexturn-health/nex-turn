import api from "../api";

/* ============================================================
   COMMON
============================================================ */

export type HospitalPlan =
  | "BASIC"
  | "PREMIUM";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED";

/* ============================================================
   SUBSCRIPTION
============================================================ */

export interface HospitalSubscription {
  plan: HospitalPlan;

  status: SubscriptionStatus;

  trialStartedAt?: string | null;

  trialEndsAt?: string | null;

  subscriptionStartedAt?: string | null;

  subscriptionEndsAt?: string | null;
}

/* ============================================================
   HOSPITAL ADDRESS
============================================================ */

export interface HospitalAddress {
  addressLine?: string;
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export type HospitalAddressValue =
  | string
  | HospitalAddress
  | null;

/* ============================================================
   HOSPITAL
============================================================ */
export interface Hospital {
  _id: string;

  name: string;

  publicName?: string;

  email?: string;

  phone?: string;

  address?: string | HospitalAddress;

  city?: string;

  district?: string;

  state?: string;

  country?: string;

  pincode?: string;

  publicAddress?: string;

  publicBookingEnabled?: boolean;

  registrationNumber?: string;

  isActive: boolean;

  /* SUBSCRIPTION */

  plan?: HospitalPlan;

  subscriptionStatus?: SubscriptionStatus;

  trialStartedAt?: string | null;

  trialEndsAt?: string | null;

  subscriptionStartedAt?: string | null;

  subscriptionEndsAt?: string | null;

  /* OPTIONAL STATS */

  totalDoctors?: number;

  totalReceptionists?: number;

  totalPatients?: number;

  totalDepartments?: number;

  totalTokensToday?: number;

  doctors?: number;

  receptionists?: number;

  patients?: number;

  departments?: number;

  todayTokens?: number;

  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================
   CREATE HOSPITAL

   IMPORTANT:

   Your backend creates:

   Hospital
   +
   First Hospital Admin

   in the same API request.
============================================================ */
export interface CreateHospitalPayload {
  hospitalName: string;

  /*
   * Backend field "name" means Hospital Admin name.
   */
  name: string;

  email: string;

  password: string;

  phone: string;

  publicName?: string;

  address?: string;

  city?: string;

  district?: string;

  state?: string;

  country?: string;

  pincode?: string;

  publicAddress?: string;

  publicBookingEnabled?: boolean;

  registrationNumber?: string;
}

/* ============================================================
   CREATE RESPONSE
============================================================ */

export interface CreatedHospitalData {
  hospital: {
    id: string;

    name: string;

    email?: string;

    phone?: string;

    address?: HospitalAddressValue;

    isActive: boolean;

    plan: HospitalPlan;

    subscriptionStatus:
      SubscriptionStatus;

    trialStartedAt?:
      string | null;

    trialEndsAt?:
      string | null;
  };

  admin: {
    id: string;

    name: string;

    email: string;

    phone?: string;

    role:
      "HOSPITAL_ADMIN";

    hospitalId: string;

    isActive: boolean;
  };
}

export interface CreateHospitalResponse {
  success: boolean;

  message?: string;

  data?: CreatedHospitalData;
}

/* ============================================================
   UPDATE HOSPITAL
============================================================ */

export interface UpdateHospitalPayload {
  name?: string;

  publicName?: string;

  email?: string;

  phone?: string;

  address?: string;

  city?: string;

  district?: string;

  state?: string;

  country?: string;

  pincode?: string;

  publicAddress?: string;

  publicBookingEnabled?: boolean;

  registrationNumber?: string;
}

/* ============================================================
   HOSPITAL DASHBOARD
============================================================ */

export interface HospitalDashboardData {
  hospital?: {
    _id?: string;

    id?: string;

    name?: string;

    email?: string;

    phone?: string;

    isActive?: boolean;
  };

  users?: {
    total?: number;

    doctors?: number;

    receptionists?: number;

    admins?: number;

    labTechnicians?: number;

    totalDoctors?: number;

    totalReceptionists?: number;

    totalAdmins?: number;

    totalLabTechnicians?: number;
  };

  patients?: {
    total?: number;

    today?: number;
  };

  departments?: {
    total?: number;

    active?: number;

    inactive?: number;
  };

  queues?: {
    totalTokensToday?: number;

    waiting?: number;

    called?: number;

    serving?: number;

    completed?: number;

    skipped?: number;
  };

  /*
   * Compatibility with older flattened dashboard
   * responses if your backend still returns them.
   */

  doctors?: number;

  receptionists?: number;

  patientsCount?: number;

  departmentsCount?: number;

  todayTokens?: number;

  queue?: {
    waiting?: number;

    called?: number;

    serving?: number;

    completed?: number;

    skipped?: number;
  };

  generatedAt?: string;
}

/* ============================================================
   SUPER ADMIN DASHBOARD
============================================================ */

export interface SuperAdminDashboardData {
  hospitals: {
    total: number;

    active: number;

    inactive: number;
  };

  users: {
    totalHospitalAdmins: number;

    totalDoctors: number;

    totalReceptionists: number;

    totalSuperAdmins: number;

    total: number;

    /*
     * Optional compatibility alias.
     */
    totalAdmins?: number;
  };

  patients: {
    total: number;

    today: number;
  };

  departments: {
    total: number;

    active: number;

    inactive: number;
  };

  queues: {
    totalTokensToday: number;

    waiting: number;

    called: number;

    serving: number;

    completed: number;

    skipped: number;
  };

  generatedAt: string;
}

/* ============================================================
   API RESPONSES
============================================================ */

export interface SuperAdminDashboardResponse {
  success: boolean;

  message?: string;

  data: SuperAdminDashboardData;
}

export interface HospitalsResponse {
  success: boolean;

  message?: string;

  data: Hospital[];
}

export interface HospitalResponse {
  success: boolean;

  message?: string;

  data: Hospital;
}

export interface HospitalStatusResponse {
  success: boolean;

  message?: string;

  data?: Hospital;
}

/* ============================================================
   GET SUBSCRIPTION RESPONSE
============================================================ */

export interface HospitalSubscriptionResponseData {
  hospital: {
    id: string;

    name: string;

    email?: string;

    phone?: string;

    isActive: boolean;
  };

  subscription: HospitalSubscription;
}

export interface HospitalSubscriptionResponse {
  success: boolean;

  message?: string;

  data: HospitalSubscriptionResponseData;
}

/* ============================================================
   ACTIVATE / RENEW
============================================================ */

export interface ActivateHospitalSubscriptionPayload {
  plan: HospitalPlan;

  durationMonths: number;

  amount?: number;

  paymentMethod?: string;

  paymentReference?: string;
}

export interface ActivatedHospitalSubscription {
  hospitalId: string;

  hospitalName: string;

  plan: HospitalPlan;

  subscriptionStatus: SubscriptionStatus;

  subscriptionStartedAt: string | null;

  subscriptionEndsAt: string | null;

  durationMonths?: number;

  amount?: number | null;

  paymentMethod?: string | null;

  paymentReference?: string | null;
}

export interface ActivateHospitalSubscriptionResponse {
  success: boolean;

  message?: string;

  data: ActivatedHospitalSubscription;
}

/* ============================================================
   GET SUPER ADMIN DASHBOARD
============================================================ */

export const getSuperAdminDashboard =
  async (): Promise<
    SuperAdminDashboardResponse
  > => {
    try {
      const response =
        await api.get<
          SuperAdminDashboardResponse
        >(
          "/super-admin/dashboard",
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "GET SUPER ADMIN DASHBOARD ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   GET ALL HOSPITALS
============================================================ */

export const getSuperAdminHospitals =
  async (): Promise<
    HospitalsResponse
  > => {
    try {
      const response =
        await api.get<
          HospitalsResponse
        >(
          "/super-admin/hospitals",
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "GET SUPER ADMIN HOSPITALS ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   GET SINGLE HOSPITAL
============================================================ */

export const getSuperAdminHospital =
  async (
    hospitalId: string,
  ): Promise<
    HospitalResponse
  > => {
    try {
      const response =
        await api.get<
          HospitalResponse
        >(
          `/super-admin/hospitals/${hospitalId}`,
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "GET HOSPITAL ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   CREATE HOSPITAL + FIRST ADMIN
============================================================ */

export const createSuperAdminHospital =
  async (
    payload:
      CreateHospitalPayload,
  ): Promise<
    CreateHospitalResponse
  > => {
    try {
      const response =
        await api.post<
          CreateHospitalResponse
        >(
          "/super-admin/hospitals",
          payload,
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "CREATE HOSPITAL ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   UPDATE HOSPITAL
============================================================ */

export const updateSuperAdminHospital =
  async (
    hospitalId: string,
    payload:
      UpdateHospitalPayload,
  ): Promise<
    HospitalResponse
  > => {
    try {
      const response =
        await api.put<
          HospitalResponse
        >(
          `/super-admin/hospitals/${hospitalId}`,
          payload,
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "UPDATE HOSPITAL ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   HOSPITAL STATUS
============================================================ */

export const updateHospitalStatus =
  async (
    hospitalId: string,
    isActive: boolean,
  ): Promise<
    HospitalStatusResponse
  > => {
    try {
      const response =
        await api.patch<
          HospitalStatusResponse
        >(
          `/super-admin/hospitals/${hospitalId}/status`,
          {
            isActive,
          },
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "UPDATE HOSPITAL STATUS ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   HOSPITAL DASHBOARD
============================================================ */

export const getHospitalDashboard =
  async (
    hospitalId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data: HospitalDashboardData;
  }> => {
    try {
      const response =
        await api.get<{
          success: boolean;
          message?: string;
          data: HospitalDashboardData;
        }>(
          `/super-admin/hospitals/${hospitalId}/dashboard`,
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "GET HOSPITAL DASHBOARD ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   GET SUBSCRIPTION
============================================================ */

export const getHospitalSubscription =
  async (
    hospitalId: string,
  ): Promise<
    HospitalSubscriptionResponse
  > => {
    try {
      const response =
        await api.get<
          HospitalSubscriptionResponse
        >(
          `/super-admin/hospitals/${hospitalId}/subscription`,
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "GET HOSPITAL SUBSCRIPTION ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   ACTIVATE / RENEW SUBSCRIPTION
============================================================ */

export const activateHospitalSubscription =
  async (
    hospitalId: string,
    payload:
      ActivateHospitalSubscriptionPayload,
  ): Promise<
    ActivateHospitalSubscriptionResponse
  > => {
    try {
      const response =
        await api.post<
          ActivateHospitalSubscriptionResponse
        >(
          `/super-admin/hospitals/${hospitalId}/subscription/activate`,
          payload,
        );

      return response.data;
    } catch (error: any) {
      console.error(
        "ACTIVATE SUBSCRIPTION ERROR:",
        error?.response?.data ||
          error,
      );

      throw error;
    }
  };

/* ============================================================
   GET EXPIRY
============================================================ */

export const getHospitalSubscriptionExpiry =
  (
    hospital:
      Hospital,
  ): string | null => {
    if (
      hospital.subscriptionStatus ===
      "TRIAL"
    ) {
      return (
        hospital.trialEndsAt ??
        null
      );
    }

    if (
      hospital.subscriptionStatus ===
      "ACTIVE"
    ) {
      return (
        hospital.subscriptionEndsAt ??
        null
      );
    }

    return (
      hospital.subscriptionEndsAt ??
      hospital.trialEndsAt ??
      null
    );
  };

/* ============================================================
   REMAINING DAYS
============================================================ */

export const getSubscriptionRemainingDays =
  (
    expiry:
      string | null | undefined,
  ): number => {
    if (!expiry) {
      return 0;
    }

    const expiryTime =
      new Date(
        expiry,
      ).getTime();

    if (
      Number.isNaN(
        expiryTime,
      )
    ) {
      return 0;
    }

    const difference =
      expiryTime -
      Date.now();

    if (
      difference <= 0
    ) {
      return 0;
    }

    return Math.ceil(
      difference /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );
  };