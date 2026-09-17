// controllers/superAdminLead.controller.ts

import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import {
    ContactLead,
    type ContactLeadStatus,
    type ContactLeadPriority,
} from "../models/ContactLead.model";

const validStatuses: ContactLeadStatus[] = [
    "NEW",
    "CONTACTED",
    "DEMO_SCHEDULED",
    "FOLLOW_UP",
    "CONVERTED",
    "REJECTED",
];

const validPriorities: ContactLeadPriority[] = [
    "LOW",
    "MEDIUM",
    "HIGH",
];

const getId = (value: unknown): string => {
    return Array.isArray(value)
        ? String(value[0] || "")
        : String(value || "");
};

const isValidId = (id: string) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const cleanText = (
    value: unknown,
    maxLength = 1000,
) => {
    return String(value || "")
        .trim()
        .slice(0, maxLength);
};

const formatLead = (lead: any) => {
    const item =
        typeof lead.toObject === "function"
            ? lead.toObject()
            : lead;

    return {
        ...item,

        notes: (item.notes || []).map(
            (note: any) => ({
                text: note.note,
                createdBy:
                    note.createdBy || null,
                createdAt:
                    note.createdAt,
            }),
        ),
    };
};

const sendNotFound = (
    res: Response,
) => {
    return res.status(404).json({
        success: false,
        message: "Contact lead not found",
    });
};

// ============================================================
// GET ALL LEADS
// GET /api/super-admin/leads
// ============================================================

export const getSuperAdminLeads = async (
    req: Request,
    res: Response,
) => {
    try {
        const page = Math.max(
            Number(req.query.page) || 1,
            1,
        );

        const limit = Math.min(
            Math.max(
                Number(req.query.limit) || 10,
                1,
            ),
            100,
        );

        const status =
            String(req.query.status || "ALL");

        const search =
            cleanText(req.query.q, 100);

        const filter: Record<string, any> = {
            isArchived: false,
        };

        if (
            status !== "ALL" &&
            validStatuses.includes(
                status as ContactLeadStatus,
            )
        ) {
            filter.status = status;
        }

        if (search) {
            const escapedSearch =
                search.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&",
                );

            const regex = new RegExp(
                escapedSearch,
                "i",
            );

            filter.$or = [
                { name: regex },
                { phone: regex },
                { email: regex },
                { organization: regex },
                { city: regex },
                { interest: regex },
            ];
        }

        const skip =
            (page - 1) * limit;

        const [
            leads,
            total,
            newCount,
            contactedCount,
            demoScheduledCount,
            followUpCount,
            convertedCount,
            rejectedCount,
        ] = await Promise.all([
            ContactLead.find(filter)
                .sort({
                    priority: -1,
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            ContactLead.countDocuments(filter),

            ContactLead.countDocuments({
                ...filter,
                status: "NEW",
            }),

            ContactLead.countDocuments({
                ...filter,
                status: "CONTACTED",
            }),

            ContactLead.countDocuments({
                ...filter,
                status: "DEMO_SCHEDULED",
            }),

            ContactLead.countDocuments({
                ...filter,
                status: "FOLLOW_UP",
            }),

            ContactLead.countDocuments({
                ...filter,
                status: "CONVERTED",
            }),

            ContactLead.countDocuments({
                ...filter,
                status: "REJECTED",
            }),
        ]);

        return res.status(200).json({
            success: true,

            data: {
                leads: leads.map(formatLead),

                stats: {
                    total,
                    new: newCount,
                    contacted: contactedCount,
                    demoScheduled:
                        demoScheduledCount,
                    followUp: followUpCount,
                    converted: convertedCount,
                    notInterested:
                        rejectedCount,
                    invalid: 0,
                },

                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(
                        total / limit,
                    ),
                },
            },
        });
    } catch (error) {
        console.error(
            "GET SUPER ADMIN LEADS ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load contact leads",
        });
    }
};

// ============================================================
// GET SINGLE LEAD
// GET /api/super-admin/leads/:id
// ============================================================

export const getSuperAdminLeadById = async (
    req: Request,
    res: Response,
) => {
    try {
        const id = getId(req.params.id);

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID",
            });
        }

        const lead =
            await ContactLead.findById(id)
                .populate(
                    "convertedHospitalId",
                    "name email phone",
                )
                .lean();

        if (!lead) {
            return sendNotFound(res);
        }

        return res.status(200).json({
            success: true,
            data: {
                lead: formatLead(lead),
            },
        });
    } catch (error) {
        console.error(
            "GET SUPER ADMIN LEAD ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load contact lead",
        });
    }
};

// ============================================================
// UPDATE STATUS
// PATCH /api/super-admin/leads/:id/status
// ============================================================

export const updateSuperAdminLeadStatus = async (
    req: Request,
    res: Response,
) => {
    try {
        const id = getId(req.params.id);
        const status =
            String(req.body.status || "")
                .trim()
                .toUpperCase() as ContactLeadStatus;

        const note = cleanText(
            req.body.note,
            1000,
        );

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID",
            });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead status",
            });
        }

        const lead =
            await ContactLead.findById(id);

        if (!lead) {
            return sendNotFound(res);
        }

        lead.status = status;

        if (status === "CONTACTED") {
            lead.lastContactedAt =
                new Date();
        }

        if (status === "CONVERTED") {
            lead.convertedAt =
                lead.convertedAt || new Date();
        }

        if (note) {
            lead.notes.push({
                note,
                createdBy:
                    req.user?.userId
                        ? new mongoose.Types.ObjectId(
                              req.user.userId,
                          )
                        : null,
                createdAt: new Date(),
            });
        }

        await lead.save();

        return res.status(200).json({
            success: true,
            message: "Lead status updated",
            data: {
                lead: formatLead(lead),
            },
        });
    } catch (error) {
        console.error(
            "UPDATE LEAD STATUS ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update lead status",
        });
    }
};

// ============================================================
// UPDATE PRIORITY
// PATCH /api/super-admin/leads/:id/priority
// ============================================================

export const updateSuperAdminLeadPriority =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const id = getId(req.params.id);

            const priority =
                String(
                    req.body.priority || "",
                )
                    .trim()
                    .toUpperCase() as ContactLeadPriority;

            if (!isValidId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid lead ID",
                });
            }

            if (
                !validPriorities.includes(
                    priority,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid lead priority",
                });
            }

            const lead =
                await ContactLead.findByIdAndUpdate(
                    id,
                    { priority },
                    {
                        new: true,
                        runValidators: true,
                    },
                );

            if (!lead) {
                return sendNotFound(res);
            }

            return res.status(200).json({
                success: true,
                message:
                    "Lead priority updated",
                data: {
                    lead: formatLead(lead),
                },
            });
        } catch (error) {
            console.error(
                "UPDATE LEAD PRIORITY ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update lead priority",
            });
        }
    };

// ============================================================
// ADD NOTE
// POST /api/super-admin/leads/:id/notes
// ============================================================

export const addSuperAdminLeadNote = async (
    req: Request,
    res: Response,
) => {
    try {
        const id = getId(req.params.id);
        const note = cleanText(
            req.body.text || req.body.note,
            1000,
        );

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID",
            });
        }

        if (!note) {
            return res.status(400).json({
                success: false,
                message: "Note is required",
            });
        }

        const lead =
            await ContactLead.findById(id);

        if (!lead) {
            return sendNotFound(res);
        }

        lead.notes.push({
            note,
            createdBy:
                req.user?.userId
                    ? new mongoose.Types.ObjectId(
                          req.user.userId,
                      )
                    : null,
            createdAt: new Date(),
        });

        await lead.save();

        return res.status(200).json({
            success: true,
            message: "Note added successfully",
            data: {
                lead: formatLead(lead),
            },
        });
    } catch (error) {
        console.error(
            "ADD LEAD NOTE ERROR:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to add lead note",
        });
    }
};

// ============================================================
// UPDATE FOLLOW-UP
// PATCH /api/super-admin/leads/:id/follow-up
// ============================================================

export const updateSuperAdminLeadFollowUp =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const id = getId(req.params.id);

            const followUpAt =
                req.body.followUpAt
                    ? new Date(
                          req.body.followUpAt,
                      )
                    : null;

            const followUpNote = cleanText(
                req.body.followUpNote,
                1000,
            );

            if (!isValidId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid lead ID",
                });
            }

            if (
                followUpAt &&
                Number.isNaN(
                    followUpAt.getTime(),
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid follow-up date",
                });
            }

            const lead =
                await ContactLead.findById(id);

            if (!lead) {
                return sendNotFound(res);
            }

            lead.followUpAt = followUpAt;

            if (
                followUpAt &&
                lead.status === "NEW"
            ) {
                lead.status = "FOLLOW_UP";
            }

            if (followUpNote) {
                lead.notes.push({
                    note: followUpNote,
                    createdBy:
                        req.user?.userId
                            ? new mongoose.Types.ObjectId(
                                  req.user.userId,
                              )
                            : null,
                    createdAt: new Date(),
                });
            }

            await lead.save();

            return res.status(200).json({
                success: true,
                message:
                    "Follow-up updated successfully",
                data: {
                    lead: formatLead(lead),
                },
            });
        } catch (error) {
            console.error(
                "UPDATE FOLLOW-UP ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update follow-up",
            });
        }
    };

// ============================================================
// MARK CONTACTED
// PATCH /api/super-admin/leads/:id/contacted
// ============================================================

export const markSuperAdminLeadContacted =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const id = getId(req.params.id);
            const note = cleanText(
                req.body.note,
                1000,
            );

            if (!isValidId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid lead ID",
                });
            }

            const lead =
                await ContactLead.findById(id);

            if (!lead) {
                return sendNotFound(res);
            }

            lead.status = "CONTACTED";
            lead.lastContactedAt =
                new Date();

            if (note) {
                lead.notes.push({
                    note,
                    createdBy:
                        req.user?.userId
                            ? new mongoose.Types.ObjectId(
                                  req.user.userId,
                              )
                            : null,
                    createdAt: new Date(),
                });
            }

            await lead.save();

            return res.status(200).json({
                success: true,
                message:
                    "Lead marked as contacted",
                data: {
                    lead: formatLead(lead),
                },
            });
        } catch (error) {
            console.error(
                "MARK CONTACTED ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to mark lead as contacted",
            });
        }
    };

// ============================================================
// ARCHIVE LEAD
// PATCH /api/super-admin/leads/:id/archive
// ============================================================

export const archiveSuperAdminLead =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const id = getId(req.params.id);

            if (!isValidId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid lead ID",
                });
            }

            const lead =
                await ContactLead.findByIdAndUpdate(
                    id,
                    {
                        isArchived: true,
                    },
                    {
                        new: true,
                    },
                );

            if (!lead) {
                return sendNotFound(res);
            }

            return res.status(200).json({
                success: true,
                message: "Lead archived successfully",
                data: {
                    lead: formatLead(lead),
                },
            });
        } catch (error) {
            console.error(
                "ARCHIVE LEAD ERROR:",
                error,
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to archive lead",
            });
        }
    };