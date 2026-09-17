import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCheck, ChevronDown, Loader2, Phone, RefreshCw, X } from "lucide-react";
import {
    getSuperAdminNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    type SuperAdminNotification,
} from "../../services/super-admin/superAdminNotification.api";

// Keep the existing API refresh interval; prevent overlapping requests below.
const REFRESH_INTERVAL = 10_000;

function relativeTime(value: string) {
    const elapsed = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(elapsed)) return "";
    const minutes = Math.max(0, Math.floor(elapsed / 60_000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SuperAdminNotifications() {
    const panelId = useId();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const fetchingRef = useRef(false);
    const mountedRef = useRef(false);
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [notifications, setNotifications] = useState<SuperAdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [fetching, setFetching] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [pending, setPending] = useState<string | null>(null);
    const actionRef = useRef(false);
    const [error, setError] = useState("");

    const loadNotifications = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setFetching(true);
        try {
            const data = await getSuperAdminNotifications();
            if (!mountedRef.current) return;
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
            setLoaded(true);
            setError("");
        } catch (cause) {
            if (mountedRef.current) {
                setError(cause instanceof Error ? cause.message : "Could not load notifications. Try again.");
            }
        } finally {
            fetchingRef.current = false;
            if (mountedRef.current) setFetching(false);
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        void loadNotifications();
        const interval = window.setInterval(() => {
            if (!actionRef.current) void loadNotifications();
        }, REFRESH_INTERVAL);
        return () => {
            mountedRef.current = false;
            window.clearInterval(interval);
        };
    }, [loadNotifications]);

    // Dismiss the panel without trapping focus or blocking the rest of the page.
    useEffect(() => {
        if (!open) return;
        closeRef.current?.focus();
        function onPointerDown(event: PointerEvent) {
            if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) setOpen(false);
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        }
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    async function markRead(id?: string) {
        if (actionRef.current || fetchingRef.current) return;
        actionRef.current = true;
        setPending(id ?? "all");
        setError("");
        try {
            if (id) await markNotificationRead(id);
            else await markAllNotificationsRead();
            await loadNotifications();
        } catch {
            if (mountedRef.current) setError("Could not mark notifications as read. Please try again.");
        } finally {
            actionRef.current = false;
            if (mountedRef.current) setPending(null);
        }
    }

    const visible = notifications.filter((item) => filter === "all" || !item.isRead);
    const busy = pending !== null || fetching;

    return (
        <div className="snn" ref={wrapperRef} onBlur={(event) => {
            if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}>
            <NotificationStyles />
            <button ref={triggerRef} className="snn-trigger" type="button"
                aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={open}
                aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
                <Bell size={21} aria-hidden="true" />
                {unreadCount > 0 && <span className="snn-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </button>

            {open && (
                <section id={panelId} className="snn-panel" aria-label="Notifications">
                    <header className="snn-header">
                        <div><h2>Notifications</h2><p>Contact enquiries & demo requests</p></div>
                        <button ref={closeRef} type="button" className="snn-icon" aria-label="Close notifications"
                            onClick={() => { setOpen(false); triggerRef.current?.focus(); }}><X size={20} /></button>
                    </header>
                    <div className="snn-toolbar">
                        <div className="snn-filters" role="group" aria-label="Filter notifications">
                            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
                            <button type="button" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>
                                Unread {unreadCount > 0 && <span>{unreadCount}</span>}
                            </button>
                        </div>
                        <button className="snn-mark-all" type="button" disabled={busy || unreadCount === 0}
                            onClick={() => void markRead()}>
                            {pending === "all" ? <Loader2 className="snn-spin" size={16} /> : <CheckCheck size={16} />}
                            Mark all read
                        </button>
                    </div>
                    {error && <div className="snn-error" role="alert">{error}
                        <button type="button" disabled={busy} onClick={() => void loadNotifications()}>
                            <RefreshCw size={14} /> Retry
                        </button>
                    </div>}
                    <div className="snn-list" aria-busy={fetching}>
                        {!loaded && fetching ? (
                            <div className="snn-empty" role="status"><Loader2 className="snn-spin" size={26} /><strong>Loading notifications</strong></div>
                        ) : visible.length === 0 ? (
                            <div className="snn-empty">
                                <span className="snn-empty-icon"><Bell size={25} /></span>
                                <strong>{error && !loaded ? "Notifications unavailable" : filter === "unread" ? "You're all caught up" : "Nothing here yet"}</strong>
                                <p>{error && !loaded ? "Use Retry to load your updates." : "New enquiries and demo requests will appear here."}</p>
                            </div>
                        ) : visible.map((item) => (
                            <NotificationRow key={item._id} item={item} disabled={busy}
                                pending={pending === item._id} onMarkRead={() => void markRead(item._id)} />
                        ))}
                    </div>
                    <footer className="snn-footer"><span className="snn-live-dot" />Updates refresh automatically</footer>
                </section>
            )}
        </div>
    );
}

// Each row stays compact; contact information expands only when needed.
function NotificationRow({ item, disabled, pending, onMarkRead }: {
    item: SuperAdminNotification;
    disabled: boolean;
    pending: boolean;
    onMarkRead: () => void;
}) {
    const metadata = item.metadata;
    const name = metadata?.name || metadata?.organization || "NextSynq";
    const phone = metadata?.phone?.replace(/[^\d+]/g, "");
    const date = new Date(item.createdAt);
    const validDate = Number.isFinite(date.getTime());
    return (
        <article className="snn-row" data-unread={!item.isRead}>
            <div className="snn-avatar" aria-hidden="true">{name.trim().charAt(0).toUpperCase() || "N"}</div>
            <div className="snn-content">
                <div className="snn-row-heading"><h3>{item.title}</h3>{!item.isRead && <span className="snn-unread-dot" aria-label="Unread" />}</div>
                <p className="snn-message">{item.message}</p>
                <time dateTime={validDate ? date.toISOString() : undefined} title={validDate ? date.toLocaleString() : undefined}>
                    {relativeTime(item.createdAt)}
                </time>
                {metadata && <details className="snn-details">
                    <summary>Contact details <ChevronDown size={14} aria-hidden="true" /></summary>
                    <dl>{[
                        ["Name", metadata.name], ["Phone", metadata.phone],
                        ["Hospital / clinic", metadata.organization], ["City", metadata.city],
                        ["Interest", metadata.interest], ["Message", metadata.message],
                    ].map(([label, value]) => value ? <div key={label}><dt>{label}</dt><dd>{value}</dd></div> : null)}</dl>
                </details>}
                <div className="snn-row-actions">
                    {phone && <a href={`tel:${phone}`} aria-label={`Call ${name}`}><Phone size={14} />Call</a>}
                    {!item.isRead && <button type="button" disabled={disabled} onClick={onMarkRead}>
                        {pending ? <Loader2 size={14} className="snn-spin" /> : <CheckCheck size={14} />}Mark read
                    </button>}
                </div>
            </div>
        </article>
    );
}

function NotificationStyles() {
    return <style>{`
        .snn { position:relative; display:inline-flex; font-family:inherit; color:#173d39; }
        .snn * { box-sizing:border-box; }
        .snn button,.snn a { font:inherit; -webkit-tap-highlight-color:transparent; }
        .snn button { cursor:pointer; }
        .snn button:disabled { opacity:.45; cursor:not-allowed; }
        .snn button:focus-visible,.snn a:focus-visible,.snn summary:focus-visible { outline:3px solid #78a795; outline-offset:2px; }
        .snn-trigger,.snn-icon { display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; flex-shrink:0; border:0; border-radius:50%; color:#173d39; background:#f1f5ef; }
        .snn-trigger { position:relative; }
        .snn-trigger:hover,.snn-icon:hover { background:#e5eee2; }
        .snn-badge { position:absolute; right:-3px; top:-3px; min-width:20px; height:20px; padding:0 5px; border:2px solid white; border-radius:20px; background:#c84444; color:white; font-size:10px; font-weight:800; line-height:16px; }
        .snn-panel { position:absolute; top:54px; right:0; z-index:1000; width:min(440px,calc(100vw - 24px)); max-height:min(720px,80dvh); display:flex; flex-direction:column; overflow:hidden; background:#fff; border:1px solid #e0e7e2; border-radius:20px; box-shadow:0 18px 60px #173d3929; animation:snn-enter .18s ease-out; }
        .snn-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:21px 20px 16px; }
        .snn-header h2 { margin:0; font-size:22px; font-weight:750; line-height:1.3; letter-spacing:-.6px; color:#173d39; }
        .snn-header p { margin:5px 0 0; font-size:12px; line-height:1.5; color:#6c7b73; }
        .snn-icon { width:36px; height:36px; background:transparent; }
        .snn-toolbar { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:0 16px 14px; border-bottom:1px solid #edf0ed; }
        .snn-filters { display:flex; gap:4px; }
        .snn-filters button { display:flex; align-items:center; gap:6px; min-height:40px; padding:8px 12px; border:0; border-radius:20px; background:transparent; color:#66766e; font-size:13px; font-weight:650; }
        .snn-filters button[aria-pressed=true] { background:#e8f1e4; color:#176957; }
        .snn-filters span { font-size:11px; }
        .snn-mark-all { display:flex; align-items:center; gap:5px; min-height:40px; padding:5px; border:0; background:transparent; color:#176957; font-size:11px!important; font-weight:650!important; }
        .snn-list { min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:#c9d6cb transparent; }
        .snn-row { display:flex; align-items:flex-start; gap:12px; padding:18px 20px; border-bottom:1px solid #edf0ed; }
        .snn-row[data-unread=true] { background:#f1f6ee; }
        .snn-avatar { display:flex; align-items:center; justify-content:center; flex-shrink:0; width:42px; height:42px; border-radius:50%; background:#e2ece0; color:#31654f; font-size:17px; font-weight:700; }
        .snn-content { flex:1; min-width:0; overflow-wrap:anywhere; }
        .snn-row-heading { display:flex; align-items:center; gap:10px; justify-content:space-between; }
        .snn-row h3 { margin:0; font-size:13px; line-height:1.5; font-weight:650; color:#203e34; }
        .snn-row[data-unread=true] h3 { font-weight:750; }
        .snn-unread-dot { width:7px; height:7px; background:#176957; border-radius:50%; flex-shrink:0; }
        .snn-message { margin:4px 0 6px; font-size:12px; line-height:1.6; color:#596b62; white-space:pre-line; }
        .snn-row time { display:block; color:#75857b; font-size:11px; line-height:1.5; }
        .snn-row[data-unread=true] time { color:#176957; font-weight:600; }
        .snn-details { margin-top:8px; }
        .snn-details summary { display:flex; align-items:center; gap:6px; width:fit-content; min-height:36px; color:#52685c; cursor:pointer; list-style:none; font-size:11px; font-weight:650; }
        .snn-details summary::-webkit-details-marker { display:none; }
        .snn-details[open] summary svg { transform:rotate(180deg); }
        .snn-details dl { margin:4px 0 10px; padding:12px; background:#fff; border:1px solid #e1e8de; border-radius:10px; }
        .snn-details dl>div+div { margin-top:9px; }
        .snn-details dt { color:#78877d; font-size:10px; }
        .snn-details dd { margin:2px 0 0; font-size:12px; line-height:1.5; color:#244638; white-space:pre-line; }
        .snn-row-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
        .snn-row-actions:empty { display:none; }
        .snn-row-actions a,.snn-row-actions button { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:36px; padding:6px 10px; border:1px solid #dce6d8; border-radius:8px; background:#fff; color:#176957; font-size:11px; text-decoration:none; }
        .snn-row-actions a:hover,.snn-row-actions button:hover:not(:disabled) { background:#e7f0e3; }
        .snn-empty { display:flex; align-items:center; flex-direction:column; gap:12px; padding:46px 24px; text-align:center; }
        .snn-empty-icon { display:grid; place-items:center; width:60px; height:60px; border-radius:50%; background:#edf3e8; color:#658365; }
        .snn-empty strong { font-size:15px; }
        .snn-empty p { margin:0; max-width:250px; font-size:12px; color:#758078; line-height:1.6; }
        .snn-error { margin:10px 14px; padding:10px 12px; border-radius:8px; background:#fff1ed; color:#a13629; font-size:12px; line-height:1.5; }
        .snn-error button { display:inline-flex; align-items:center; gap:5px; padding:7px; border:0; background:transparent; color:inherit; font-weight:700; }
        .snn-footer { display:flex; align-items:center; justify-content:center; gap:7px; padding:12px; border-top:1px solid #edf0ed; color:#79877c; font-size:10px; background:#fafbf8; }
        .snn-live-dot { height:5px; width:5px; border-radius:50%; background:#8bab86; }
        .snn-spin { animation:snn-spin 1s linear infinite; }
        @keyframes snn-spin { to { transform:rotate(360deg); } }
        @keyframes snn-enter { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @media(max-width:540px) {
            .snn-panel { position:fixed; top:calc(env(safe-area-inset-top,0px) + 12px); right:12px; left:12px; width:auto; max-height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 24px); border-radius:18px; }
            .snn-header { padding:18px 16px 12px; }
            .snn-row { padding:16px; gap:10px; }
            .snn-icon,.snn-filters button,.snn-mark-all,.snn-row-actions a,.snn-row-actions button,.snn-details summary { min-height:44px; }
            .snn-avatar { width:38px; height:38px; }
        }
        @media(prefers-reduced-motion:reduce) { .snn-panel,.snn-spin { animation:none; } }
    `}</style>;
}
