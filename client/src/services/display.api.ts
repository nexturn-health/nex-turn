import api from "./api";

// =====================================================
// DISPLAY LANGUAGE
// =====================================================

export type DisplayLanguage =
    | "EN"
    | "HI"
    | "BN"
    | "MR"
    | "TA"
    | "TE"
    | "KN"
    | "GU"
    | "PA"
    | "ML";

export interface DisplayDoctor {
    _id: string;
    name: string;
    isOnline: boolean;
    lastSeen?: string;
}

// =====================================================
// DISPLAY QUEUE
// =====================================================

export interface DisplayQueue {

    _id: string;

    tokenNumber: number;

    tokenLabel: string;

    priority:
    | "NORMAL"
    | "EMERGENCY";

    status:
    | "WAITING"
    | "CALLED"
    | "SERVING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";

    estimatedWaitTime?: number;

    doctorOnline?: boolean;

    doctorLastSeenAt?: string | null;

    departmentId?: {

        _id: string;

        name: string;

        tokenPrefix?: string;

    } | null;

    doctorId?: DisplayDoctor;

}


// =====================================================
// DISPLAY CONFIG
// =====================================================

export interface DisplayConfig {

    _id?: string;

    hospitalId?: string;

    displayKey?: string;

    hospitalName: string;

    heading: string;

    logoUrl: string;

    primaryColor: string;

    secondaryColor: string;

    displayLanguage: DisplayLanguage;

    voiceEnabled: boolean;

    announcementEnabled: boolean;

    announcementRepeat: number;

    showEmergency: boolean;

    showReferred: boolean;

    showWaiting: boolean;

    showNext: boolean;

    showCurrent: boolean;

    isActive?: boolean;

}


export interface DisplayResponse {

    success?: boolean;

    display: {

        hospitalName: string;

        heading: string;

        logoUrl?: string;

        primaryColor?: string;

        voiceEnabled: boolean;

        announcementEnabled: boolean;

        displayLanguage: DisplayLanguage;

        announcementRepeat: number;

        showCurrent: boolean;

        showNext: boolean;

        showWaiting: boolean;

        showEmergency: boolean;

    };

    // ============================================
    // DOCTOR PRESENCE
    // ============================================

    doctorId: string | null;

    doctorName: string;

    doctorOnline: boolean;

    doctorLastSeenAt?: string | null;

    // ============================================
    // QUEUES
    // ============================================

    current: DisplayQueue[];

    next: DisplayQueue[];

    waiting: DisplayQueue[];

    emergency: DisplayQueue[];
}


// =====================================================
// PUBLIC DISPLAY
// =====================================================

export const getDisplayBoard = async (
    displayKey: string,
): Promise<DisplayResponse> => {

    if (!displayKey) {

        throw new Error(
            "Display key is required",
        );

    }

    console.log(
        "DISPLAY KEY:",
        displayKey,
    );

    const response =
        await api.get<DisplayResponse>(
            `/display/public/${displayKey}`,
        );

    return response.data;
};


// =====================================================
// GET DISPLAY CONFIG
// ADMIN
// =====================================================

export const getDisplayConfig =
    async (): Promise<DisplayConfig> => {

        const response =
            await api.get<{
                success: boolean;
                display: DisplayConfig;
                displayUrl?: string;
            }>(
                "/display/config",
            );

        return response.data.display;
    };


// =====================================================
// CREATE DISPLAY
// ADMIN
// =====================================================

export const createDisplay =
    async (
        data?: Partial<DisplayConfig>,
    ) => {

        const response =
            await api.post(
                "/display",
                data || {},
            );

        return response.data;
    };


// =====================================================
// UPDATE DISPLAY CONFIG
// ADMIN
// =====================================================

export const updateDisplayConfig =
    async (
        data: Partial<DisplayConfig>,
    ) => {

        const response =
            await api.put(
                "/display/config",
                data,
            );

        return response.data;
    };


// =====================================================
// REGENERATE DISPLAY KEY
// ADMIN
// =====================================================

export const regenerateDisplayKey =
    async () => {

        const response =
            await api.post(
                "/display/regenerate-key",
            );

        return response.data;
    };