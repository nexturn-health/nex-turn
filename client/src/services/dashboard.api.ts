import api from "./api";

// =====================================
// TYPES
// =====================================

export interface DashboardStats {
    patientsToday: number;

    doctors: number;

    departments: number;

    waitingPatients: number;

    calledPatients: number;

    servingPatients: number;

    completedPatients: number;
}

interface DashboardStatsResponse {
    success: boolean;

    data: DashboardStats;
}

// =====================================
// GET DASHBOARD STATS
// =====================================

export const getDashboardStats =
    async (): Promise<DashboardStats> => {
        const response =
            await api.get<DashboardStatsResponse>(
                "/dashboard/stats",
            );

        return response.data.data;
    };
