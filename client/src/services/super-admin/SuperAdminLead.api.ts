import api from "../api";

// ============================================================
// TYPES
// ============================================================

export type ContactLeadStatus =
    | "NEW"
    | "CONTACTED"
    | "DEMO_SCHEDULED"
    | "FOLLOW_UP"
    | "CONVERTED"
    | "REJECTED";

export type ContactLeadPriority =
    | "LOW"
    | "MEDIUM"
    | "HIGH";

export interface ContactLeadNote {
    text: string;
    createdBy?: string | null;
    createdAt?: string;
}

export interface SuperAdminLead {
    _id: string;

    name: string;
    phone: string;
    email?: string;

    organization?: string;
    city?: string;
    interest?: string;
    message: string;
    source?: string;

    status: ContactLeadStatus;
    priority: ContactLeadPriority;

    notes: ContactLeadNote[];

    followUpAt?: string | null;

    lastContactedAt?: string | null;

    convertedHospitalId?: string | null;
    convertedAt?: string | null;

    isArchived: boolean;

    createdAt: string;
    updatedAt: string;
}

export interface LeadStats {
    total: number;
    new: number;
    contacted: number;
    demoScheduled: number;
    followUp: number;
    converted: number;
    rejected: number;
}

export interface LeadPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface LeadsApiResponse {
    success: boolean;
    message?: string;

    data: {
        leads: SuperAdminLead[];
        stats: LeadStats;
        pagination: LeadPagination;
    };
}

interface LeadApiResponse {
    success: boolean;
    message?: string;

    data: {
        lead: SuperAdminLead;
    };
}

export interface GetSuperAdminLeadsParams {
    status?: ContactLeadStatus | "ALL";
    q?: string;
    page?: number;
    limit?: number;
}

// ============================================================
// GET ALL CRM LEADS
// GET /api/super-admin/leads
// ============================================================

export const getSuperAdminLeads = async (
    params: GetSuperAdminLeadsParams = {},
) => {
    const response =
        await api.get<LeadsApiResponse>(
            "/super-admin/leads",
            {
                params,
            },
        );

    return response.data.data;
};

// ============================================================
// GET SINGLE LEAD
// GET /api/super-admin/leads/:id
// ============================================================

export const getSuperAdminLeadById = async (
    id: string,
) => {
    const response =
        await api.get<LeadApiResponse>(
            `/super-admin/leads/${id}`,
        );

    return response.data.data.lead;
};

// ============================================================
// UPDATE STATUS
// PATCH /api/super-admin/leads/:id/status
// ============================================================

export const updateSuperAdminLeadStatus = async (
    id: string,
    status: ContactLeadStatus,
    note?: string,
) => {
    const response =
        await api.patch<LeadApiResponse>(
            `/super-admin/leads/${id}/status`,
            {
                status,
                note,
            },
        );

    return response.data.data.lead;
};

// ============================================================
// UPDATE PRIORITY
// PATCH /api/super-admin/leads/:id/priority
// ============================================================

export const updateSuperAdminLeadPriority =
    async (
        id: string,
        priority: ContactLeadPriority,
    ) => {
        const response =
            await api.patch<LeadApiResponse>(
                `/super-admin/leads/${id}/priority`,
                {
                    priority,
                },
            );

        return response.data.data.lead;
    };

// ============================================================
// ADD NOTE
// POST /api/super-admin/leads/:id/notes
// ============================================================

export const addSuperAdminLeadNote = async (
    id: string,
    text: string,
) => {
    const response =
        await api.post<LeadApiResponse>(
            `/super-admin/leads/${id}/notes`,
            {
                text,
            },
        );

    return response.data.data.lead;
};

// ============================================================
// UPDATE FOLLOW-UP
// PATCH /api/super-admin/leads/:id/follow-up
// ============================================================

export const updateSuperAdminLeadFollowUp =
    async (
        id: string,
        followUpAt: string | null,
        followUpNote: string,
    ) => {
        const response =
            await api.patch<LeadApiResponse>(
                `/super-admin/leads/${id}/follow-up`,
                {
                    followUpAt,
                    followUpNote,
                },
            );

        return response.data.data.lead;
    };

// ============================================================
// MARK CONTACTED
// PATCH /api/super-admin/leads/:id/contacted
// ============================================================

export const markSuperAdminLeadContacted =
    async (
        id: string,
        note?: string,
    ) => {
        const response =
            await api.patch<LeadApiResponse>(
                `/super-admin/leads/${id}/contacted`,
                {
                    note,
                },
            );

        return response.data.data.lead;
    };

// ============================================================
// ARCHIVE LEAD
// PATCH /api/super-admin/leads/:id/archive
// ============================================================

export const archiveSuperAdminLead = async (
    id: string,
) => {
    const response =
        await api.patch<LeadApiResponse>(
            `/super-admin/leads/${id}/archive`,
        );

    return response.data.data.lead;
};