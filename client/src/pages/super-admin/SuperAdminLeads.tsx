import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Archive,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock3,
    Filter,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    RefreshCw,
    Search,
    Star,
    UserRound,
} from "lucide-react";

import {
    addSuperAdminLeadNote,
    archiveSuperAdminLead,
    getSuperAdminLeads,
    markSuperAdminLeadContacted,
    updateSuperAdminLeadFollowUp,
    updateSuperAdminLeadPriority,
    updateSuperAdminLeadStatus,
    type ContactLeadPriority,
    type ContactLeadStatus,
    type LeadStats,
    type SuperAdminLead,
} from "../../services/super-admin/SuperAdminLead.api";

const statuses: Array<{
    label: string;
    value: ContactLeadStatus | "ALL";
}> = [
        { label: "All", value: "ALL" },
        { label: "New", value: "NEW" },
        { label: "Contacted", value: "CONTACTED" },
        { label: "Demo scheduled", value: "DEMO_SCHEDULED" },
        { label: "Follow up", value: "FOLLOW_UP" },
        { label: "Converted", value: "CONVERTED" },
        { label: "Rejected", value: "REJECTED" },
    ];

const priorityOptions: ContactLeadPriority[] = [
    "LOW",
    "MEDIUM",
    "HIGH",
];

const statusOptions: ContactLeadStatus[] = [
    "NEW",
    "CONTACTED",
    "DEMO_SCHEDULED",
    "FOLLOW_UP",
];

const emptyStats: LeadStats = {
    total: 0,
    new: 0,
    contacted: 0,
    demoScheduled: 0,
    followUp: 0,
    converted: 0,
    rejected: 0
};

function formatDateTime(
    value?: string | null,
) {
    if (!value) {
        return "Not set";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not set";
    }

    return date.toLocaleString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}

function formatStatus(
    value: ContactLeadStatus,
) {
    return value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) =>
            char.toUpperCase(),
        );
}

function getInitials(
    name?: string,
) {
    const cleanName =
        name?.trim() || "Lead";

    return cleanName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((item) => item[0]?.toUpperCase())
        .join("") || "L";
}

function getWhatsAppLink(
    phone?: string,
) {
    const digits =
        String(phone || "").replace(/\D/g, "");

    if (!digits) {
        return "";
    }

    const phoneWithCountry =
        digits.length === 10
            ? `91${digits}`
            : digits;

    const message =
        encodeURIComponent(
            "Hello, thank you for contacting NextSynq Health. I received your demo request.",
        );

    return `https://wa.me/${phoneWithCountry}?text=${message}`;
}

function getTomorrowDateTimeLocal() {
    const date =
        new Date();

    date.setDate(
        date.getDate() + 1,
    );

    date.setHours(
        11,
        0,
        0,
        0,
    );

    const offset =
        date.getTimezoneOffset();

    const local =
        new Date(
            date.getTime() - offset * 60 * 1000,
        );

    return local
        .toISOString()
        .slice(0, 16);
}

function getErrorMessage(
    error: unknown,
    fallback: string,
) {
    const maybeAxios =
        error as {
            response?: {
                data?: {
                    message?: string;
                };
            };
            message?: string;
        };

    return (
        maybeAxios.response?.data?.message ||
        maybeAxios.message ||
        fallback
    );
}

export default function SuperAdminLeads() {
    const [leads, setLeads] =
        useState<SuperAdminLead[]>([]);

    const [stats, setStats] =
        useState<LeadStats>(emptyStats);

    const [status, setStatus] =
        useState<ContactLeadStatus | "ALL">("ALL");

    const [search, setSearch] =
        useState("");

    const [selectedLeadId, setSelectedLeadId] =
        useState<string | null>(null);

    const [noteText, setNoteText] =
        useState("");

    const [followUpAt, setFollowUpAt] =
        useState("");

    const [followUpNote, setFollowUpNote] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [actionLoading, setActionLoading] =
        useState("");

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const selectedLead =
        useMemo(
            () =>
                leads.find(
                    (lead) => lead._id === selectedLeadId,
                ) || leads[0] || null,
            [
                leads,
                selectedLeadId,
            ],
        );

    const loadLeads =
        useCallback(async () => {
            try {
                setLoading(true);
                setError("");

                const data =
                    await getSuperAdminLeads({
                        status,
                        q: search.trim(),
                        page: 1,
                        limit: 50,
                    });

                setLeads(data.leads);
                setStats(data.stats);

                if (
                    selectedLeadId &&
                    !data.leads.some(
                        (lead) => lead._id === selectedLeadId,
                    )
                ) {
                    setSelectedLeadId(
                        data.leads[0]?._id || null,
                    );
                }

                if (
                    !selectedLeadId &&
                    data.leads[0]
                ) {
                    setSelectedLeadId(data.leads[0]._id);
                }
            } catch (loadError) {
                setError(
                    getErrorMessage(
                        loadError,
                        "Unable to load leads.",
                    ),
                );
            } finally {
                setLoading(false);
            }
        }, [
            search,
            selectedLeadId,
            status,
        ]);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    useEffect(() => {
        if (!selectedLead) {
            setFollowUpAt("");
            setFollowUpNote("");
            return;
        }

        setFollowUpAt(
            selectedLead.followUpAt
                ? new Date(selectedLead.followUpAt)
                    .toISOString()
                    .slice(0, 16)
                : "",
        );

        // Follow-up notes are stored in the notes array
        setFollowUpNote("");
    }, [selectedLead]);

    async function runAction(
        label: string,
        work: () => Promise<void>,
    ) {
        try {
            setActionLoading(label);
            setError("");
            setSuccess("");

            await work();

            setSuccess(label);
            await loadLeads();
        } catch (actionError) {
            setError(
                getErrorMessage(
                    actionError,
                    "Action failed.",
                ),
            );
        } finally {
            setActionLoading("");
        }
    }

    async function changeStatus(
        lead: SuperAdminLead,
        nextStatus: ContactLeadStatus,
    ) {
        await runAction(
            "Lead status updated.",
            async () => {
                await updateSuperAdminLeadStatus(
                    lead._id,
                    nextStatus,
                );
            },
        );
    }

    async function changePriority(
        lead: SuperAdminLead,
        priority: ContactLeadPriority,
    ) {
        await runAction(
            "Lead priority updated.",
            async () => {
                await updateSuperAdminLeadPriority(
                    lead._id,
                    priority,
                );
            },
        );
    }

    async function addNote() {
        if (!selectedLead) {
            return;
        }

        const text =
            noteText.trim();

        if (!text) {
            setError("Enter note before saving.");
            return;
        }

        await runAction(
            "Note saved.",
            async () => {
                await addSuperAdminLeadNote(
                    selectedLead._id,
                    text,
                );
                setNoteText("");
            },
        );
    }

    async function saveFollowUp() {
        if (!selectedLead) {
            return;
        }

        await runAction(
            "Follow-up saved.",
            async () => {
                await updateSuperAdminLeadFollowUp(
                    selectedLead._id,
                    followUpAt
                        ? new Date(followUpAt).toISOString()
                        : null,
                    followUpNote.trim(),
                );
            },
        );
    }

    async function markContacted(
        lead: SuperAdminLead,
    ) {
        await runAction(
            "Lead marked as contacted.",
            async () => {
                await markSuperAdminLeadContacted(
                    lead._id,
                    "Called / contacted from Super Admin CRM.",
                );
            },
        );
    }

    async function archiveLead(
        lead: SuperAdminLead,
    ) {
        const confirmed =
            window.confirm(
                `Archive ${lead.name}? This will hide the lead from CRM.`,
            );

        if (!confirmed) {
            return;
        }

        await runAction(
            "Lead archived.",
            async () => {
                await archiveSuperAdminLead(
                    lead._id,
                );

                if (selectedLeadId === lead._id) {
                    setSelectedLeadId(null);
                }
            },
        );
    }

    return (
        <section className="sa-crm">
            <CRMStyles />

            <div className="sa-crm-header">
                <div>
                    <span className="sa-crm-eyebrow">
                        SUPER ADMIN CRM
                    </span>

                    <h1>
                        Lead management
                    </h1>

                    <p>
                        Manage website demo requests, call follow-ups,
                        conversion status and notes.
                    </p>
                </div>

                <button
                    type="button"
                    className="sa-crm-refresh"
                    onClick={() => loadLeads()}
                    disabled={loading}
                >
                    <RefreshCw
                        size={17}
                        className={
                            loading
                                ? "sa-crm-spin"
                                : ""
                        }
                    />
                    Refresh
                </button>
            </div>

            <div className="sa-crm-stats">
                <StatCard label="Total leads" value={stats.total} />
                <StatCard label="New" value={stats.new} />
                <StatCard label="Contacted" value={stats.contacted} />
                <StatCard label="Demo scheduled" value={stats.demoScheduled} />
                <StatCard label="Follow up" value={stats.followUp} />
                <StatCard label="Converted" value={stats.converted} />
            </div>

            <div className="sa-crm-toolbar">
                <div className="sa-crm-search">
                    <Search size={17} />
                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                loadLeads();
                            }
                        }}
                        placeholder="Search name, phone, hospital, city..."
                    />
                </div>

                <div className="sa-crm-filter">
                    <Filter size={16} />
                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(
                                event.target.value as ContactLeadStatus | "ALL",
                            )
                        }
                    >
                        {statuses.map((item) => (
                            <option
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="sa-crm-alert error">
                    {error}
                </div>
            )}

            {success && (
                <div className="sa-crm-alert success">
                    {success}
                </div>
            )}

            <div className="sa-crm-layout">
                <div className="sa-crm-list">
                    {leads.length === 0 ? (
                        <div className="sa-crm-empty">
                            No leads found.
                        </div>
                    ) : (
                        leads.map((lead) => {
                            const active =
                                selectedLead?._id === lead._id;

                            return (
                                <button
                                    type="button"
                                    key={lead._id}
                                    className="sa-crm-lead-card"
                                    data-active={active}
                                    onClick={() =>
                                        setSelectedLeadId(lead._id)
                                    }
                                >
                                    <span className="sa-crm-avatar">
                                        {getInitials(lead.name)}
                                    </span>

                                    <span className="sa-crm-lead-main">
                                        <strong>
                                            {lead.name}
                                        </strong>

                                        <small>
                                            {lead.organization ||
                                                "Hospital / clinic not added"}
                                        </small>

                                        <span>
                                            <Phone size={13} />
                                            {lead.phone}
                                        </span>
                                    </span>

                                    <span
                                        className="sa-crm-status"
                                        data-status={lead.status}
                                    >
                                        {formatStatus(lead.status)}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="sa-crm-detail">
                    {!selectedLead ? (
                        <div className="sa-crm-empty detail">
                            Select a lead to manage.
                        </div>
                    ) : (
                        <>
                            <div className="sa-crm-detail-head">
                                <div className="sa-crm-detail-title">
                                    <span className="sa-crm-avatar large">
                                        {getInitials(selectedLead.name)}
                                    </span>

                                    <div>
                                        <h2>
                                            {selectedLead.name}
                                        </h2>

                                        <p>
                                            {selectedLead.organization ||
                                                "Hospital / clinic"}
                                            {selectedLead.city
                                                ? ` · ${selectedLead.city}`
                                                : ""}
                                        </p>
                                    </div>
                                </div>

                                <div className="sa-crm-detail-actions">
                                    <a
                                        href={`tel:${selectedLead.phone}`}
                                    >
                                        <Phone size={16} />
                                        Call
                                    </a>

                                    <a
                                        href={getWhatsAppLink(selectedLead.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        WhatsApp
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            markContacted(selectedLead)
                                        }
                                        disabled={Boolean(actionLoading)}
                                    >
                                        <CheckCircle2 size={16} />
                                        Mark contacted
                                    </button>
                                </div>
                            </div>

                            <div className="sa-crm-info-grid">
                                <InfoItem icon={Phone} label="Phone" value={selectedLead.phone} />
                                <InfoItem icon={Mail} label="Email" value={selectedLead.email || "NA"} />
                                <InfoItem icon={Building2} label="Hospital / Clinic" value={selectedLead.organization || "NA"} />
                                <InfoItem icon={MapPin} label="City" value={selectedLead.city || "NA"} />
                                <InfoItem icon={Star} label="Interest" value={selectedLead.interest || "NA"} />
                                <InfoItem icon={Clock3} label="Submitted" value={formatDateTime(selectedLead.createdAt)} />
                            </div>

                            <div className="sa-crm-controls">
                                <label>
                                    <span>Status</span>
                                    <select
                                        value={selectedLead.status}
                                        onChange={(event) =>
                                            changeStatus(
                                                selectedLead,
                                                event.target.value as ContactLeadStatus,
                                            )
                                        }
                                        disabled={Boolean(actionLoading)}
                                    >
                                        {statusOptions.map((item) => (
                                            <option key={item} value={item}>
                                                {formatStatus(item)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span>Priority</span>
                                    <select
                                        value={selectedLead.priority}
                                        onChange={(event) =>
                                            changePriority(
                                                selectedLead,
                                                event.target.value as ContactLeadPriority,
                                            )
                                        }
                                        disabled={Boolean(actionLoading)}
                                    >
                                        {priorityOptions.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span>Follow-up date</span>
                                    <input
                                        type="datetime-local"
                                        value={followUpAt}
                                        onChange={(event) =>
                                            setFollowUpAt(event.target.value)
                                        }
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setFollowUpAt(
                                            getTomorrowDateTimeLocal(),
                                        );
                                    }}
                                >
                                    Tomorrow 11 AM
                                </button>
                            </div>

                            <div className="sa-crm-message-box">
                                <span>
                                    <MessageSquare size={17} />
                                    Customer message
                                </span>

                                <p>
                                    {selectedLead.message}
                                </p>
                            </div>

                            <div className="sa-crm-followup">
                                <label>
                                    <span>Follow-up note</span>
                                    <textarea
                                        value={followUpNote}
                                        onChange={(event) =>
                                            setFollowUpNote(event.target.value)
                                        }
                                        placeholder="Example: Call again tomorrow after 11 AM."
                                        rows={3}
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={saveFollowUp}
                                    disabled={Boolean(actionLoading)}
                                >
                                    <CalendarClock size={16} />
                                    Save follow-up
                                </button>
                            </div>

                            <div className="sa-crm-notes">
                                <div className="sa-crm-section-title">
                                    <h3>
                                        Notes
                                    </h3>

                                    <small>
                                        {selectedLead.notes?.length || 0} saved
                                    </small>
                                </div>

                                <div className="sa-crm-add-note">
                                    <textarea
                                        value={noteText}
                                        onChange={(event) =>
                                            setNoteText(event.target.value)
                                        }
                                        placeholder="Write call discussion, pricing response, demo timing..."
                                        rows={3}
                                    />

                                    <button
                                        type="button"
                                        onClick={addNote}
                                        disabled={Boolean(actionLoading)}
                                    >
                                        Save note
                                    </button>
                                </div>

                                <div className="sa-crm-note-list">
                                    {selectedLead.notes?.length ? (
                                        [...selectedLead.notes]
                                            .reverse()
                                            .map((note, index) => (
                                                <article key={`${note.createdAt}-${index}`}>
                                                    <p>
                                                        {note.text}
                                                    </p>

                                                    <small>
                                                        {formatDateTime(note.createdAt)}
                                                    </small>
                                                </article>
                                            ))
                                    ) : (
                                        <p className="sa-crm-muted">
                                            No notes yet.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="sa-crm-danger">
                                <button
                                    type="button"
                                    onClick={() =>
                                        archiveLead(selectedLead)
                                    }
                                    disabled={Boolean(actionLoading)}
                                >
                                    <Archive size={16} />
                                    Archive lead
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

function StatCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <article className="sa-crm-stat">
            <span>{label}</span>
            <strong>{value}</strong>
        </article>
    );
}

function InfoItem({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof UserRound;
    label: string;
    value: string;
}) {
    return (
        <div className="sa-crm-info-item">
            <Icon size={17} />
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function CRMStyles() {
    return (
        <style>{`
            .sa-crm {
                min-height: 100vh;
                padding: 24px;
                background: #f7faf6;
                color: #173d39;
            }

            .sa-crm * {
                box-sizing: border-box;
            }

            .sa-crm button,
            .sa-crm input,
            .sa-crm select,
            .sa-crm textarea,
            .sa-crm a {
                font: inherit;
            }

            .sa-crm-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 18px;
                padding: 22px;
                border: 1px solid #dce5d4;
                border-radius: 24px;
                background:
                    radial-gradient(circle at top right, #dcebd5 0, transparent 34%),
                    #ffffff;
                box-shadow: 0 18px 50px #173d3910;
            }

            .sa-crm-eyebrow {
                display: inline-flex;
                margin-bottom: 8px;
                padding: 6px 11px;
                border-radius: 999px;
                background: #edf3e4;
                color: #176957;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 0.12em;
            }

            .sa-crm-header h1 {
                margin: 0;
                font-size: clamp(28px, 4vw, 42px);
                line-height: 1.08;
                letter-spacing: -1px;
            }

            .sa-crm-header p {
                margin: 8px 0 0;
                color: #64775c;
                font-size: 14px;
                line-height: 1.6;
            }

            .sa-crm-refresh,
            .sa-crm-detail-actions a,
            .sa-crm-detail-actions button,
            .sa-crm-followup button,
            .sa-crm-add-note button,
            .sa-crm-controls button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 40px;
                padding: 9px 14px;
                border: 1px solid #176957;
                border-radius: 999px;
                background: #176957;
                color: #ffffff;
                font-size: 13px;
                font-weight: 850;
                text-decoration: none;
                cursor: pointer;
            }

            .sa-crm-refresh:disabled,
            .sa-crm-detail-actions button:disabled,
            .sa-crm-followup button:disabled,
            .sa-crm-add-note button:disabled {
                cursor: not-allowed;
                opacity: 0.65;
            }

            .sa-crm-spin {
                animation: crmSpin 0.9s linear infinite;
            }

            @keyframes crmSpin {
                to {
                    transform: rotate(360deg);
                }
            }

            .sa-crm-stats {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 12px;
                margin-top: 18px;
            }

            .sa-crm-stat {
                padding: 17px;
                border: 1px solid #dce5d4;
                border-radius: 18px;
                background: #ffffff;
                box-shadow: 0 10px 24px #173d3908;
            }

            .sa-crm-stat span {
                display: block;
                color: #64775c;
                font-size: 12px;
                font-weight: 800;
            }

            .sa-crm-stat strong {
                display: block;
                margin-top: 7px;
                color: #173d39;
                font-size: 28px;
                line-height: 1;
            }

            .sa-crm-toolbar {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 260px;
                gap: 12px;
                margin-top: 18px;
            }

            .sa-crm-search,
            .sa-crm-filter {
                display: flex;
                align-items: center;
                gap: 10px;
                height: 48px;
                padding: 0 14px;
                border: 1px solid #dce5d4;
                border-radius: 16px;
                background: #ffffff;
                color: #64775c;
            }

            .sa-crm-search input,
            .sa-crm-filter select,
            .sa-crm-controls select,
            .sa-crm-controls input,
            .sa-crm textarea {
                width: 100%;
                border: 0;
                outline: 0;
                background: transparent;
                color: #173d39;
            }

            .sa-crm-layout {
                display: grid;
                grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.2fr);
                gap: 18px;
                margin-top: 18px;
            }

            .sa-crm-list,
            .sa-crm-detail {
                border: 1px solid #dce5d4;
                border-radius: 24px;
                background: #ffffff;
                box-shadow: 0 18px 44px #173d390a;
            }

            .sa-crm-list {
                max-height: calc(100vh - 285px);
                overflow-y: auto;
                padding: 12px;
            }

            .sa-crm-lead-card {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr) auto;
                align-items: center;
                gap: 12px;
                width: 100%;
                margin-bottom: 10px;
                padding: 13px;
                border: 1px solid #e4ece0;
                border-radius: 17px;
                background: #fbfdf9;
                color: #173d39;
                text-align: left;
                cursor: pointer;
            }

            .sa-crm-lead-card[data-active="true"] {
                border-color: #176957;
                background: #edf6e9;
            }

            .sa-crm-avatar {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background: #176957;
                color: #ffffff;
                font-size: 13px;
                font-weight: 950;
            }

            .sa-crm-avatar.large {
                width: 58px;
                height: 58px;
                font-size: 16px;
            }

            .sa-crm-lead-main {
                display: grid;
                gap: 3px;
                min-width: 0;
            }

            .sa-crm-lead-main strong {
                overflow: hidden;
                color: #173d39;
                font-size: 14px;
                font-weight: 900;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .sa-crm-lead-main small,
            .sa-crm-lead-main span {
                overflow: hidden;
                color: #64775c;
                font-size: 12px;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .sa-crm-lead-main span {
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }

            .sa-crm-status {
                padding: 6px 9px;
                border-radius: 999px;
                background: #edf3e4;
                color: #176957;
                font-size: 10px;
                font-weight: 900;
                white-space: nowrap;
            }

            .sa-crm-status[data-status="CONVERTED"] {
                background: #dcfce7;
                color: #15803d;
            }

            .sa-crm-status[data-status="INVALID"],
            .sa-crm-status[data-status="NOT_INTERESTED"] {
                background: #fff1f2;
                color: #be123c;
            }

            .sa-crm-detail {
                min-height: 620px;
                padding: 18px;
            }

            .sa-crm-detail-head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 14px;
                padding-bottom: 16px;
                border-bottom: 1px solid #edf2ea;
            }

            .sa-crm-detail-title {
                display: flex;
                align-items: center;
                gap: 13px;
                min-width: 0;
            }

            .sa-crm-detail-title h2 {
                margin: 0;
                color: #173d39;
                font-size: 25px;
                line-height: 1.2;
            }

            .sa-crm-detail-title p {
                margin: 4px 0 0;
                color: #64775c;
                font-size: 13px;
            }

            .sa-crm-detail-actions {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
                justify-content: flex-end;
            }

            .sa-crm-detail-actions a:nth-child(2),
            .sa-crm-detail-actions button {
                border-color: #dce5d4;
                background: #ffffff;
                color: #176957;
            }

            .sa-crm-info-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 10px;
                margin-top: 16px;
            }

            .sa-crm-info-item {
                display: grid;
                gap: 5px;
                padding: 13px;
                border: 1px solid #edf2ea;
                border-radius: 15px;
                background: #fbfdf9;
            }

            .sa-crm-info-item svg {
                color: #176957;
            }

            .sa-crm-info-item span {
                color: #64775c;
                font-size: 11px;
                font-weight: 800;
            }

            .sa-crm-info-item strong {
                overflow-wrap: anywhere;
                color: #173d39;
                font-size: 13px;
                font-weight: 850;
            }

            .sa-crm-controls {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 10px;
                margin-top: 16px;
            }

            .sa-crm-controls label,
            .sa-crm-followup label {
                display: grid;
                gap: 7px;
            }

            .sa-crm-controls span,
            .sa-crm-followup span {
                color: #64775c;
                font-size: 11px;
                font-weight: 900;
            }

            .sa-crm-controls select,
            .sa-crm-controls input,
            .sa-crm textarea {
                min-height: 42px;
                padding: 10px 12px;
                border: 1px solid #dce5d4;
                border-radius: 13px;
                background: #ffffff;
            }

            .sa-crm-controls button {
                align-self: end;
                border-color: #dce5d4;
                background: #edf3e4;
                color: #176957;
            }

            .sa-crm-message-box,
            .sa-crm-followup,
            .sa-crm-notes,
            .sa-crm-danger {
                margin-top: 16px;
                padding: 15px;
                border: 1px solid #edf2ea;
                border-radius: 18px;
                background: #fbfdf9;
            }

            .sa-crm-message-box > span {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                color: #176957;
                font-size: 12px;
                font-weight: 900;
            }

            .sa-crm-message-box p {
                margin: 10px 0 0;
                color: #415146;
                font-size: 13px;
                line-height: 1.65;
            }

            .sa-crm-followup {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 12px;
                align-items: end;
            }

            .sa-crm textarea {
                resize: vertical;
                line-height: 1.55;
            }

            .sa-crm-section-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 10px;
            }

            .sa-crm-section-title h3 {
                margin: 0;
                font-size: 18px;
            }

            .sa-crm-section-title small {
                color: #64775c;
                font-size: 12px;
            }

            .sa-crm-add-note {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 10px;
                align-items: end;
            }

            .sa-crm-note-list {
                display: grid;
                gap: 10px;
                margin-top: 12px;
            }

            .sa-crm-note-list article {
                padding: 12px;
                border: 1px solid #edf2ea;
                border-radius: 14px;
                background: #ffffff;
            }

            .sa-crm-note-list p {
                margin: 0;
                color: #415146;
                font-size: 13px;
                line-height: 1.55;
            }

            .sa-crm-note-list small {
                display: block;
                margin-top: 7px;
                color: #7d8b81;
                font-size: 11px;
            }

            .sa-crm-danger {
                display: flex;
                justify-content: flex-end;
                background: #fffafa;
            }

            .sa-crm-danger button {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                min-height: 38px;
                padding: 8px 12px;
                border: 1px solid #fecaca;
                border-radius: 999px;
                background: #ffffff;
                color: #be123c;
                font-size: 12px;
                font-weight: 900;
                cursor: pointer;
            }

            .sa-crm-alert {
                margin-top: 14px;
                padding: 12px 14px;
                border-radius: 14px;
                font-size: 13px;
                font-weight: 800;
            }

            .sa-crm-alert.error {
                border: 1px solid #fecaca;
                background: #fff1f2;
                color: #be123c;
            }

            .sa-crm-alert.success {
                border: 1px solid #bbf7d0;
                background: #f0fdf4;
                color: #15803d;
            }

            .sa-crm-empty {
                padding: 34px 18px;
                color: #64775c;
                text-align: center;
                font-size: 13px;
            }

            .sa-crm-empty.detail {
                display: grid;
                place-items: center;
                min-height: 580px;
            }

            .sa-crm-muted {
                margin: 0;
                color: #64775c;
                font-size: 13px;
            }

            @media (max-width: 1150px) {
                .sa-crm-stats {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }

                .sa-crm-layout {
                    grid-template-columns: 1fr;
                }

                .sa-crm-list {
                    max-height: none;
                }
            }

            @media (max-width: 760px) {
                .sa-crm {
                    padding: 14px;
                }

                .sa-crm-header,
                .sa-crm-detail-head {
                    display: grid;
                }

                .sa-crm-stats {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .sa-crm-toolbar,
                .sa-crm-info-grid,
                .sa-crm-controls,
                .sa-crm-followup,
                .sa-crm-add-note {
                    grid-template-columns: 1fr;
                }

                .sa-crm-detail-actions {
                    justify-content: flex-start;
                }

                .sa-crm-detail-actions a,
                .sa-crm-detail-actions button {
                    flex: 1;
                }
            }
        `}</style>
    );
}
