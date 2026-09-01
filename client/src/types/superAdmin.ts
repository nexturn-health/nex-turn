// ==========================================
// HOSPITAL
// ==========================================

export interface SuperAdminHospital {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;

  admin?: {
    _id: string;
    name: string;
    email: string;
    isActive: boolean;
  };

  statistics?: {
    doctors: number;
    patients: number;
    departments: number;
    tokensToday: number;
    waitingToday: number;
    completedToday: number;
  };
}

// ==========================================
// DASHBOARD
// ==========================================

export interface SuperAdminDashboardData {
  hospitals: {
    total: number;
    active: number;
    inactive: number;
  };

  users: {
    totalAdmins: number;
    totalDoctors: number;
    totalReceptionists: number;
    totalSuperAdmins: number;
    total: number;
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

export interface SuperAdminDashboardResponse {
  success: boolean;
  data: SuperAdminDashboardData;
}

// ==========================================
// HOSPITAL LIST
// ==========================================

export interface HospitalsResponse {
  success: boolean;

  data: SuperAdminHospital[];
}

// ==========================================
// HOSPITAL ADMIN
// ==========================================

export interface HospitalAdmin {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  hospitalId?: string;
}

export interface HospitalAdminsResponse {
  success: boolean;

  data: HospitalAdmin[];
}