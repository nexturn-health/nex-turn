import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Bell,
    Building2,
    CheckCheck,
    Clock3,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    RefreshCw,
    UserRound,
    X,
} from "lucide-react";

import {
    getSuperAdminNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    type SuperAdminNotification,
} from "../../services/super-admin/superAdminNotification.api";

function getInitials(name?: string) {
    const cleanName =
        name?.trim() || "Lead";

    const parts =
        cleanName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2);

    return parts
        .map((part) => part[0]?.toUpperCase())
        .join("") || "L";
}

function getLeadName(item: SuperAdminNotification) {
    return item.metadata?.name || item.title || "New lead";
}

function getLeadSubtitle(item: SuperAdminNotification) {
    const organization =
        item.metadata?.organization;

    const city =
        item.metadata?.city;

    if (organization && city) {
        return `${organization} · ${city}`;
    }

    return organization || city || "Website demo request";
}

function formatTime(value: string) {
    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}

function getWhatsAppLink(phone?: string) {
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

export default function SuperAdminNotifications() {
    const [open, setOpen] =
        useState(false);

    const [filter, setFilter] =
        useState<"ALL" | "UNREAD">("ALL");

    const [notifications, setNotifications] =
        useState<SuperAdminNotification[]>([]);

    const [unreadCount, setUnreadCount] =
        useState(0);

    const [loading, setLoading] =
        useState(false);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const loadNotifications =
        useCallback(async () => {
            try {
                setError("");

                const data =
                    await getSuperAdminNotifications();

                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            } catch (loadError) {
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Unable to load notifications.",
                );
            }
        }, []);

    useEffect(() => {
        loadNotifications();

        const interval =
            window.setInterval(
                loadNotifications,
                10000,
            );

        return () => {
            window.clearInterval(interval);
        };
    }, [loadNotifications]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const closeOnEscape = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        window.addEventListener(
            "keydown",
            closeOnEscape,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                closeOnEscape,
            );
        };
    }, [open]);

    const filteredNotifications =
        useMemo(() => {
            if (filter === "UNREAD") {
                return notifications.filter(
                    (item) => !item.isRead,
                );
            }

            return notifications;
        }, [
            filter,
            notifications,
        ]);

    const latestLead =
        notifications[0];

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            await loadNotifications();
        } finally {
            setRefreshing(false);
        }
    };

    const handleMarkRead = async (
        id: string,
    ) => {
        try {
            await markNotificationRead(id);
            await loadNotifications();
        } catch {
            // The next polling cycle will retry automatically.
        }
    };

    const handleMarkAllRead = async () => {
        try {
            setLoading(true);
            await markAllNotificationsRead();
            await loadNotifications();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sa-pro-notification-wrap">
            <NotificationStyles />

            <button
                type="button"
                className="sa-pro-bell-button"
                onClick={() =>
                    setOpen((previous) => !previous)
                }
                aria-label="Super admin notifications"
                aria-expanded={open}
            >
                <Bell size={20} />

                {unreadCount > 0 && (
                    <span className="sa-pro-bell-badge">
                        {unreadCount > 99
                            ? "99+"
                            : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <button
                        type="button"
                        className="sa-pro-backdrop"
                        aria-label="Close notifications"
                        onClick={() => setOpen(false)}
                    />

                    <section
                        className="sa-pro-panel"
                        aria-label="Notifications panel"
                    >
                        <div className="sa-pro-panel-top">
                            <div>
                                <span className="sa-pro-kicker">
                                    NextSynq leads
                                </span>

                                <h3>
                                    Notifications
                                </h3>

                                <p>
                                    Demo requests from your website contact form.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="sa-pro-close"
                                onClick={() => setOpen(false)}
                                aria-label="Close notifications"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sa-pro-summary">
                            <div className="sa-pro-summary-avatar">
                                {latestLead
                                    ? getInitials(
                                          latestLead.metadata?.name,
                                      )
                                    : "NS"}
                            </div>

                            <div>
                                <strong>
                                    {unreadCount > 0
                                        ? `${unreadCount} new lead${unreadCount > 1 ? "s" : ""}`
                                        : "No new leads"}
                                </strong>

                                <span>
                                    {latestLead
                                        ? `Latest: ${getLeadName(latestLead)}`
                                        : "New contact requests will appear here."}
                                </span>
                            </div>
                        </div>

                        <div className="sa-pro-toolbar">
                            <div
                                className="sa-pro-tabs"
                                role="tablist"
                                aria-label="Notification filter"
                            >
                                <button
                                    type="button"
                                    data-active={filter === "ALL"}
                                    onClick={() => setFilter("ALL")}
                                >
                                    All
                                </button>

                                <button
                                    type="button"
                                    data-active={filter === "UNREAD"}
                                    onClick={() => setFilter("UNREAD")}
                                >
                                    Unread
                                    {unreadCount > 0 && (
                                        <span>
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <button
                                type="button"
                                className="sa-pro-icon-action"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                aria-label="Refresh notifications"
                            >
                                <RefreshCw size={16} />
                            </button>

                            <button
                                type="button"
                                className="sa-pro-read-all"
                                disabled={
                                    loading ||
                                    unreadCount === 0
                                }
                                onClick={handleMarkAllRead}
                            >
                                <CheckCheck size={16} />
                                Mark all read
                            </button>
                        </div>

                        {error && (
                            <div className="sa-pro-error">
                                {error}
                            </div>
                        )}

                        <div className="sa-pro-list">
                            {filteredNotifications.length === 0 ? (
                                <div className="sa-pro-empty">
                                    <div>
                                        <Bell size={24} />
                                    </div>

                                    <strong>
                                        {filter === "UNREAD"
                                            ? "No unread notifications"
                                            : "No notifications yet"}
                                    </strong>

                                    <p>
                                        When someone submits your contact form,
                                        the lead will appear here instantly.
                                    </p>
                                </div>
                            ) : (
                                filteredNotifications.map((item) => {
                                    const name =
                                        getLeadName(item);

                                    const subtitle =
                                        getLeadSubtitle(item);

                                    const phone =
                                        item.metadata?.phone;

                                    const email =
                                        item.metadata?.email;

                                    const whatsappLink =
                                        getWhatsAppLink(phone);

                                    return (
                                        <article
                                            key={item._id}
                                            className="sa-pro-card"
                                            data-read={item.isRead}
                                        >
                                            <div className="sa-pro-card-main">
                                                <div className="sa-pro-avatar">
                                                    {getInitials(name)}

                                                    {!item.isRead && (
                                                        <span aria-label="Unread notification" />
                                                    )}
                                                </div>

                                                <div className="sa-pro-content">
                                                    <div className="sa-pro-card-title">
                                                        <strong>
                                                            {name}
                                                        </strong>

                                                        <small>
                                                            <Clock3 size={13} />
                                                            {formatTime(
                                                                item.createdAt,
                                                            )}
                                                        </small>
                                                    </div>

                                                    <p className="sa-pro-subtitle">
                                                        {subtitle}
                                                    </p>

                                                    {item.metadata?.interest && (
                                                        <span className="sa-pro-interest">
                                                            {item.metadata.interest}
                                                        </span>
                                                    )}

                                                    <div className="sa-pro-lead-grid">
                                                        <span>
                                                            <UserRound size={14} />
                                                            {item.metadata?.name || "NA"}
                                                        </span>

                                                        <span>
                                                            <Phone size={14} />
                                                            {phone || "NA"}
                                                        </span>

                                                        <span>
                                                            <Building2 size={14} />
                                                            {item.metadata?.organization || "NA"}
                                                        </span>

                                                        <span>
                                                            <MapPin size={14} />
                                                            {item.metadata?.city || "NA"}
                                                        </span>

                                                        {email && (
                                                            <span>
                                                                <Mail size={14} />
                                                                {email}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {item.metadata?.message && (
                                                        <div className="sa-pro-message">
                                                            <MessageSquare size={15} />

                                                            <p>
                                                                {item.metadata.message}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="sa-pro-card-actions">
                                                        {phone && (
                                                            <a href={`tel:${phone}`}>
                                                                <Phone size={15} />
                                                                Call
                                                            </a>
                                                        )}

                                                        {whatsappLink && (
                                                            <a
                                                                href={whatsappLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                WhatsApp
                                                            </a>
                                                        )}

                                                        {!item.isRead && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleMarkRead(
                                                                        item._id,
                                                                    )
                                                                }
                                                            >
                                                                Mark read
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

function NotificationStyles() {
    return (
        <style>{`
            .sa-pro-notification-wrap {
                position: relative;
                display: inline-flex;
                font-family: inherit;
            }

            .sa-pro-bell-button {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border: 1px solid #dce5d4;
                border-radius: 999px;
                background:
                    linear-gradient(#ffffff, #ffffff) padding-box,
                    linear-gradient(135deg, #176957, #88b86f) border-box;
                color: #173d39;
                box-shadow: 0 10px 30px #173d3914;
                cursor: pointer;
                transition:
                    transform 0.18s ease,
                    box-shadow 0.18s ease,
                    background 0.18s ease;
            }

            .sa-pro-bell-button:hover {
                transform: translateY(-1px);
                box-shadow: 0 16px 38px #173d3920;
                background:
                    linear-gradient(#f3f8ef, #ffffff) padding-box,
                    linear-gradient(135deg, #176957, #88b86f) border-box;
            }

            .sa-pro-bell-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 21px;
                height: 21px;
                padding: 0 6px;
                border: 2px solid #ffffff;
                border-radius: 999px;
                background: #ef4444;
                color: #ffffff;
                font-size: 11px;
                font-weight: 800;
                line-height: 17px;
                text-align: center;
                box-shadow: 0 6px 16px #ef444440;
            }

            .sa-pro-backdrop {
                position: fixed;
                inset: 0;
                z-index: 80;
                border: 0;
                background: transparent;
                cursor: default;
            }

            .sa-pro-panel {
                position: absolute;
                top: 54px;
                right: 0;
                z-index: 100;
                width: min(470px, calc(100vw - 24px));
                max-height: min(760px, calc(100vh - 88px));
                overflow: hidden;
                border: 1px solid #dce5d4;
                border-radius: 24px;
                background: #ffffff;
                box-shadow:
                    0 26px 70px #0f241d2e,
                    0 1px 0 #ffffff inset;
                color: #173d39;
            }

            .sa-pro-panel::before {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 5px;
                content: "";
                background: linear-gradient(90deg, #176957, #95bd79, #176957);
            }

            .sa-pro-panel-top {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                padding: 22px 22px 16px;
                background:
                    radial-gradient(circle at top right, #dcebd5 0, transparent 36%),
                    linear-gradient(180deg, #f9fcf6 0%, #ffffff 100%);
                border-bottom: 1px solid #edf2ea;
            }

            .sa-pro-kicker {
                display: inline-flex;
                margin-bottom: 7px;
                padding: 5px 10px;
                border-radius: 999px;
                background: #edf6e9;
                color: #176957;
                font-size: 10px;
                font-weight: 850;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            .sa-pro-panel-top h3 {
                margin: 0;
                color: #173d39;
                font-size: 22px;
                font-weight: 850;
                letter-spacing: -0.4px;
                line-height: 1.1;
            }

            .sa-pro-panel-top p {
                margin: 6px 0 0;
                color: #64775c;
                font-size: 12px;
                line-height: 1.55;
            }

            .sa-pro-close {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 34px;
                height: 34px;
                border: 1px solid #dce5d4;
                border-radius: 999px;
                background: #ffffff;
                color: #173d39;
                cursor: pointer;
            }

            .sa-pro-close:hover {
                background: #edf3e4;
                color: #176957;
            }

            .sa-pro-summary {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 14px 14px 0;
                padding: 14px;
                border: 1px solid #e1eadc;
                border-radius: 18px;
                background: linear-gradient(135deg, #173d39, #176957);
                color: #ffffff;
            }

            .sa-pro-summary-avatar,
            .sa-pro-avatar {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                width: 46px;
                height: 46px;
                border-radius: 50%;
                background:
                    linear-gradient(#ffffff, #ffffff) padding-box,
                    linear-gradient(135deg, #176957, #8fbd75, #ffffff) border-box;
                border: 2px solid transparent;
                color: #176957;
                font-size: 14px;
                font-weight: 900;
            }

            .sa-pro-summary-avatar {
                width: 48px;
                height: 48px;
                background:
                    linear-gradient(#f6fbf3, #ffffff) padding-box,
                    linear-gradient(135deg, #a9d488, #ffffff) border-box;
            }

            .sa-pro-summary strong,
            .sa-pro-summary span {
                display: block;
            }

            .sa-pro-summary strong {
                font-size: 15px;
                line-height: 1.25;
            }

            .sa-pro-summary span {
                margin-top: 4px;
                color: #dcebd5;
                font-size: 12px;
                line-height: 1.45;
            }

            .sa-pro-toolbar {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 14px;
                border-bottom: 1px solid #edf2ea;
            }

            .sa-pro-tabs {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px;
                border: 1px solid #dce5d4;
                border-radius: 999px;
                background: #f6faf3;
            }

            .sa-pro-tabs button {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                min-height: 31px;
                padding: 6px 12px;
                border: 0;
                border-radius: 999px;
                background: transparent;
                color: #64775c;
                font-size: 12px;
                font-weight: 800;
                cursor: pointer;
            }

            .sa-pro-tabs button[data-active="true"] {
                background: #ffffff;
                color: #176957;
                box-shadow: 0 3px 12px #173d3910;
            }

            .sa-pro-tabs span {
                min-width: 18px;
                height: 18px;
                padding: 0 5px;
                border-radius: 999px;
                background: #176957;
                color: #ffffff;
                font-size: 10px;
                line-height: 18px;
                text-align: center;
            }

            .sa-pro-icon-action,
            .sa-pro-read-all {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 35px;
                border: 1px solid #dce5d4;
                border-radius: 999px;
                background: #ffffff;
                color: #176957;
                font-size: 12px;
                font-weight: 800;
                cursor: pointer;
            }

            .sa-pro-icon-action {
                width: 35px;
                margin-left: auto;
            }

            .sa-pro-read-all {
                gap: 6px;
                padding: 7px 11px;
            }

            .sa-pro-icon-action:hover,
            .sa-pro-read-all:hover {
                background: #edf3e4;
            }

            .sa-pro-icon-action:disabled,
            .sa-pro-read-all:disabled {
                cursor: not-allowed;
                opacity: 0.55;
            }

            .sa-pro-icon-action:disabled svg {
                animation: saSpin 0.9s linear infinite;
            }

            @keyframes saSpin {
                to {
                    transform: rotate(360deg);
                }
            }

            .sa-pro-error {
                margin: 12px 14px 0;
                padding: 11px 12px;
                border: 1px solid #fecaca;
                border-radius: 14px;
                background: #fff1f2;
                color: #b42318;
                font-size: 12px;
                font-weight: 750;
                line-height: 1.45;
            }

            .sa-pro-list {
                max-height: calc(min(760px, 100vh - 88px) - 226px);
                overflow-y: auto;
                padding: 12px 14px 14px;
                background: #fbfdf9;
            }

            .sa-pro-list::-webkit-scrollbar {
                width: 8px;
            }

            .sa-pro-list::-webkit-scrollbar-thumb {
                border: 2px solid #fbfdf9;
                border-radius: 999px;
                background: #cddbc7;
            }

            .sa-pro-empty {
                display: grid;
                justify-items: center;
                gap: 8px;
                padding: 44px 22px;
                color: #64775c;
                text-align: center;
            }

            .sa-pro-empty > div {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 54px;
                height: 54px;
                border-radius: 50%;
                background: #edf3e4;
                color: #176957;
            }

            .sa-pro-empty strong {
                color: #173d39;
                font-size: 15px;
            }

            .sa-pro-empty p {
                max-width: 300px;
                margin: 0;
                font-size: 12px;
                line-height: 1.6;
            }

            .sa-pro-card {
                position: relative;
                overflow: hidden;
                margin-bottom: 12px;
                border: 1px solid #e1eadc;
                border-radius: 18px;
                background: #ffffff;
                box-shadow: 0 10px 26px #173d390a;
            }

            .sa-pro-card[data-read="false"] {
                border-color: #b7d5aa;
                background: linear-gradient(180deg, #ffffff 0%, #f3faf0 100%);
            }

            .sa-pro-card::before {
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                width: 4px;
                content: "";
                background: transparent;
            }

            .sa-pro-card[data-read="false"]::before {
                background: linear-gradient(180deg, #176957, #90b970);
            }

            .sa-pro-card-main {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 15px;
            }

            .sa-pro-avatar {
                position: relative;
                margin-top: 1px;
            }

            .sa-pro-avatar > span {
                position: absolute;
                right: -1px;
                bottom: 1px;
                width: 11px;
                height: 11px;
                border: 2px solid #ffffff;
                border-radius: 50%;
                background: #176957;
            }

            .sa-pro-content {
                min-width: 0;
                flex: 1;
            }

            .sa-pro-card-title {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
            }

            .sa-pro-card-title strong {
                min-width: 0;
                color: #173d39;
                font-size: 14px;
                font-weight: 850;
                line-height: 1.3;
            }

            .sa-pro-card-title small {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
                color: #7a897e;
                font-size: 11px;
                white-space: nowrap;
            }

            .sa-pro-subtitle {
                margin: 3px 0 0;
                color: #64775c;
                font-size: 12px;
                line-height: 1.5;
            }

            .sa-pro-interest {
                display: inline-flex;
                width: fit-content;
                margin-top: 9px;
                padding: 5px 9px;
                border-radius: 999px;
                background: #edf3e4;
                color: #176957;
                font-size: 11px;
                font-weight: 850;
            }

            .sa-pro-lead-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                margin-top: 12px;
            }

            .sa-pro-lead-grid span {
                display: flex;
                align-items: center;
                gap: 7px;
                min-width: 0;
                padding: 8px 9px;
                border: 1px solid #edf2ea;
                border-radius: 11px;
                background: #fbfdf9;
                color: #415146;
                font-size: 11px;
                line-height: 1.35;
            }

            .sa-pro-lead-grid svg {
                flex-shrink: 0;
                color: #176957;
            }

            .sa-pro-message {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                margin-top: 12px;
                padding: 11px;
                border-radius: 13px;
                background: #f6faf3;
                color: #415146;
            }

            .sa-pro-message svg {
                flex-shrink: 0;
                margin-top: 2px;
                color: #176957;
            }

            .sa-pro-message p {
                margin: 0;
                font-size: 12px;
                line-height: 1.6;
            }

            .sa-pro-card-actions {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 13px;
            }

            .sa-pro-card-actions a,
            .sa-pro-card-actions button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                min-height: 35px;
                padding: 8px 12px;
                border: 1px solid #dce5d4;
                border-radius: 999px;
                background: #ffffff;
                color: #176957;
                font-size: 12px;
                font-weight: 850;
                text-decoration: none;
                cursor: pointer;
            }

            .sa-pro-card-actions a:first-child {
                background: #176957;
                border-color: #176957;
                color: #ffffff;
            }

            .sa-pro-card-actions a:hover,
            .sa-pro-card-actions button:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 18px #173d3912;
            }

            @media (max-width: 620px) {
                .sa-pro-panel {
                    position: fixed;
                    top: 70px;
                    right: 10px;
                    left: 10px;
                    width: auto;
                    max-height: calc(100vh - 86px);
                    border-radius: 20px;
                }

                .sa-pro-panel-top {
                    padding: 18px 18px 14px;
                }

                .sa-pro-toolbar {
                    flex-wrap: wrap;
                }

                .sa-pro-tabs {
                    width: 100%;
                }

                .sa-pro-tabs button {
                    flex: 1;
                    justify-content: center;
                }

                .sa-pro-icon-action {
                    margin-left: 0;
                }

                .sa-pro-list {
                    max-height: calc(100vh - 330px);
                }

                .sa-pro-card-main {
                    gap: 10px;
                    padding: 13px;
                }

                .sa-pro-card-title {
                    display: grid;
                    gap: 4px;
                }

                .sa-pro-card-title small {
                    white-space: normal;
                }

                .sa-pro-lead-grid {
                    grid-template-columns: 1fr;
                }

                .sa-pro-card-actions a,
                .sa-pro-card-actions button {
                    flex: 1;
                }
            }
        `}</style>
    );
}
