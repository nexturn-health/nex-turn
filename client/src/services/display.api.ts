import api from "./api";

/* ============================================================
   DISPLAY LANGUAGE
============================================================ */

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

/* ============================================================
   DISPLAY DOCTOR
============================================================ */

export interface DisplayDoctor {
    _id: string;

    name: string;

    isOnline: boolean;

    lastSeen?: string;
}

/* ============================================================
   DISPLAY QUEUE
============================================================ */

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

    doctorLastSeenAt?:
        | string
        | null;

    departmentId?: {
        _id: string;

        name: string;

        tokenPrefix?: string;
    } | null;

    doctorId?: DisplayDoctor;
}

/* ============================================================
   DISPLAY CONFIG
============================================================ */

export interface DisplayConfig {
    _id?: string;

    hospitalId?: string;

    displayKey?: string;

    hospitalName: string;

    heading: string;

    logoUrl: string;

    primaryColor: string;

    secondaryColor: string;

    displayLanguage:
        DisplayLanguage;

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

/* ============================================================
   PUBLIC DISPLAY RESPONSE
============================================================ */

export interface DisplayResponse {
    success?: boolean;

    display: {
        hospitalName: string;

        heading: string;

        logoUrl?: string;

        primaryColor?: string;

        secondaryColor?: string;

        voiceEnabled: boolean;

        announcementEnabled: boolean;

        displayLanguage:
            DisplayLanguage;

        announcementRepeat: number;

        showCurrent: boolean;

        showNext: boolean;

        showWaiting: boolean;

        showEmergency: boolean;
    };

    doctorId:
        | string
        | null;

    doctorName: string;

    doctorOnline: boolean;

    doctorLastSeenAt?:
        | string
        | null;

    current:
        DisplayQueue[];

    next:
        DisplayQueue[];

    waiting:
        DisplayQueue[];

    emergency:
        DisplayQueue[];
}

/* ============================================================
   CONFIG RESPONSE
============================================================ */

export interface DisplayConfigResponse {
    success: boolean;

    message?: string;

    display:
        DisplayConfig;

    displayUrl?: string;
}

/* ============================================================
   CREATE RESPONSE
============================================================ */

export interface CreateDisplayResponse {
    success: boolean;

    message?: string;

    display:
        DisplayConfig;

    displayUrl?: string;
}

/* ============================================================
   UPDATE RESPONSE
============================================================ */

export interface UpdateDisplayResponse {
    success: boolean;

    message?: string;

    display:
        DisplayConfig;
}

/* ============================================================
   REGENERATE RESPONSE
============================================================ */

export interface RegenerateDisplayKeyResponse {
    success: boolean;

    message?: string;

    displayKey?: string;

    display?:
        DisplayConfig;

    displayUrl?: string;
}

/* ============================================================
   PUBLIC DISPLAY
============================================================ */

export const getDisplayBoard =
    async (
        displayKey: string,
    ): Promise<
        DisplayResponse
    > => {

        if (!displayKey) {
            throw new Error(
                "Display key is required",
            );
        }

        const response =
            await api.get<
                DisplayResponse
            >(
                `/display/public/${displayKey}`,
            );

        return response.data;
    };

/* ============================================================
   GET DISPLAY CONFIG
============================================================ */

export const getDisplayConfig =
    async (): Promise<
        DisplayConfig
    > => {

        const response =
            await api.get<
                DisplayConfigResponse
            >(
                "/display/config",
            );

        return response.data.display;
    };

/* ============================================================
   CREATE DISPLAY
============================================================ */

export const createDisplay =
    async (
        data?:
            Partial<DisplayConfig>,
    ): Promise<
        CreateDisplayResponse
    > => {

        const response =
            await api.post<
                CreateDisplayResponse
            >(
                "/display",
                data || {},
            );

        return response.data;
    };

/* ============================================================
   UPDATE DISPLAY
============================================================ */

export const updateDisplayConfig =
    async (
        data:
            Partial<DisplayConfig>,
    ): Promise<
        UpdateDisplayResponse
    > => {

        const response =
            await api.put<
                UpdateDisplayResponse
            >(
                "/display/config",
                data,
            );

        return response.data;
    };

/* ============================================================
   REGENERATE KEY
============================================================ */

export const regenerateDisplayKey =
    async (): Promise<
        RegenerateDisplayKeyResponse
    > => {

        const response =
            await api.post<
                RegenerateDisplayKeyResponse
            >(
                "/display/regenerate-key",
            );

        return response.data;
    };