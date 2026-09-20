import api from "../api";

export type PlatformPlan =
    | "BASIC"
    | "PREMIUM";

export interface PlatformSettings {
    _id?: string;
    key?: string;

    platformName: string;
    supportEmail: string;
    supportPhone: string;
    defaultCountry: string;

    defaultPlan: PlatformPlan;
    trialDays: number;

    allowHospitalRegistration: boolean;
    maintenanceMode: boolean;

    whatsappNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    smsNotificationsEnabled: boolean;

    createdAt?: string;
    updatedAt?: string;
}

interface SettingsResponse {
    success: boolean;
    message?: string;
    data: {
        settings: PlatformSettings;
    };
}

export const getSuperAdminSettings =
    async (): Promise<PlatformSettings> => {
        const response =
            await api.get<SettingsResponse>(
                "/super-admin/settings",
            );

        return response.data.data.settings;
    };

export const updateSuperAdminSettings =
    async (
        settings: PlatformSettings,
    ): Promise<PlatformSettings> => {
        const response =
            await api.patch<SettingsResponse>(
                "/super-admin/settings",
                settings,
            );

        return response.data.data.settings;
    };