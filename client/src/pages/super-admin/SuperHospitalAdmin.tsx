import {
    CheckCircle2,
    Edit,
    Eye,
    Hospital as HospitalIcon,
    Loader2,
    Mail,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    UserCog,
    Users,
    X,
    XCircle,
} from "lucide-react";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    createHospitalAdmin,
    getHospitalAdmins,
    updateHospitalAdmin,
    updateHospitalAdminStatus,
    type HospitalAdmin,
    type AdminStatus,
    type CreateAdminFormPayload,
    type CreateHospitalAdminPayload,
    type UpdateHospitalAdminPayload,
} from "../../services/super-admin/hospitalAdmin.api";

import {
    getSuperAdminHospitals,
    type Hospital,
} from "../../services/superAdmin.api";

import socket, {
    connectSocket,
    disconnectSocket,
} from "../../socket/socket";
import { useAuthStore } from "../../store/authStore";

/* =========================================================
   TYPES
========================================================= */

type FilterType =
    | "ALL"
    | "ACTIVE"
    | "INACTIVE";

type ModalType =
    | "NONE"
    | "DETAILS"
    | "CREATE"
    | "EDIT";

/* =========================================================
   SAFE STRING HELPERS
========================================================= */

const safeString = (
    value: unknown,
    fallback = "",
): string => {
    if (typeof value === "string") {
        return value;
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    return fallback;
};

/* =========================================================
   GET HOSPITAL NAME
========================================================= */

const getHospitalName = (
    admin: HospitalAdmin,
): string => {
    if (
        typeof admin.hospitalName === "string" &&
        admin.hospitalName.trim()
    ) {
        return admin.hospitalName;
    }

    if (
        admin.hospitalName &&
        typeof admin.hospitalName === "object" &&
        "name" in admin.hospitalName
    ) {
        const name =
            admin.hospitalName.name;

        if (
            typeof name === "string" &&
            name.trim()
        ) {
            return name;
        }
    }

    if (
        admin.hospital &&
        typeof admin.hospital === "object" &&
        typeof admin.hospital.name === "string"
    ) {
        return admin.hospital.name;
    }

    return "Hospital not assigned";
};

/* =========================================================
   GET HOSPITAL ID
========================================================= */

const getHospitalId = (
    admin: HospitalAdmin,
): string => {
    if (
        typeof admin.hospitalId === "string" &&
        admin.hospitalId
    ) {
        return admin.hospitalId;
    }

    if (
        admin.hospital &&
        typeof admin.hospital === "object" &&
        typeof admin.hospital._id === "string"
    ) {
        return admin.hospital._id;
    }

    if (
        admin.hospitalName &&
        typeof admin.hospitalName === "object" &&
        "_id" in admin.hospitalName &&
        typeof admin.hospitalName._id === "string"
    ) {
        return admin.hospitalName._id;
    }

    return "";
};

/* =========================================================
   COMPONENT
========================================================= */

const SuperHospitalAdmin = () => {

    /* =======================================================
       ADMIN STATE
    ======================================================= */

    const [admins, setAdmins] =
        useState<HospitalAdmin[]>([]);

    /* =======================================================
       HOSPITAL STATE
    ======================================================= */

    const [hospitals, setHospitals] =
        useState<Hospital[]>([]);

    const [hospitalsLoading, setHospitalsLoading] =
        useState(false);

    /* =======================================================
       UI STATE
    ======================================================= */

    const [search, setSearch] =
        useState("");

    const [filter, setFilter] =
        useState<FilterType>("ALL");

    const [modal, setModal] =
        useState<ModalType>("NONE");

    const [selectedAdmin, setSelectedAdmin] =
        useState<HospitalAdmin | null>(
            null,
        );

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [saving, setSaving] =
        useState(false);

    /* =======================================================
       LOAD ADMINS
    ======================================================= */

    const loadAdmins =
        useCallback(async () => {
            try {
                setLoading(true);
                setError("");

                const data =
                    await getHospitalAdmins();

                setAdmins(
                    Array.isArray(data)
                        ? data
                        : [],
                );
            } catch (error) {
                console.error(
                    "Failed to load hospital admins:",
                    error,
                );

                setError(
                    "Unable to load hospital admins.",
                );
            } finally {
                setLoading(false);
            }
        }, []);

    /* =======================================================
       LOAD HOSPITALS
    ======================================================= */

    const loadHospitals =
        useCallback(async () => {
            try {
                setHospitalsLoading(true);

                const response =
                    await getSuperAdminHospitals();

                setHospitals(
                    Array.isArray(
                        response.data,
                    )
                        ? response.data
                        : [],
                );
            } catch (error) {
                console.error(
                    "Failed to load hospitals:",
                    error,
                );

                setError(
                    "Unable to load hospitals.",
                );
            } finally {
                setHospitalsLoading(false);
            }
        }, []);

    /* =======================================================
       INITIAL LOAD + SOCKET
    ======================================================= */

const { user } = useAuthStore();

useEffect(() => {
    loadAdmins();
    loadHospitals();

    if (user?.id && user?.hospitalId) {
        connectSocket(user.id, user.hospitalId);
    }

    // socket listeners...

    return () => {
        // socket listeners cleanup...
        disconnectSocket();
    };
}, [
    loadAdmins,
    loadHospitals,
    user?.id,
    user?.hospitalId,
]);

    /* =======================================================
       SOCKET DEBUG
    ======================================================= */

    useEffect(() => {

        const handleConnect = () => {

            console.log(
                "🟢 Super Admin Socket connected:",
                socket.id,
            );
        };

        const handleDisconnect = (
            reason: string,
        ) => {

            console.log(
                "🔴 Super Admin Socket disconnected:",
                reason,
            );
        };

        const handleConnectError = (
            error: Error,
        ) => {

            console.error(
                "❌ Socket connection error:",
                error.message,
            );
        };

        socket.on(
            "connect",
            handleConnect,
        );

        socket.on(
            "disconnect",
            handleDisconnect,
        );

        socket.on(
            "connect_error",
            handleConnectError,
        );

        return () => {

            socket.off(
                "connect",
                handleConnect,
            );

            socket.off(
                "disconnect",
                handleDisconnect,
            );

            socket.off(
                "connect_error",
                handleConnectError,
            );
        };

    }, []);

    /* =======================================================
       STATS
    ======================================================= */

    const totalAdmins =
        admins.length;

    const activeAdmins =
        admins.filter(
            (admin) =>
                admin.status === "ACTIVE",
        ).length;

    const inactiveAdmins =
        admins.filter(
            (admin) =>
                admin.status === "INACTIVE",
        ).length;

    /* =======================================================
       FILTERED ADMINS
    ======================================================= */

    const filteredAdmins =
        useMemo(() => {

            const query =
                search
                    .trim()
                    .toLowerCase();

            return admins.filter(
                (admin) => {

                    const hospitalName =
                        getHospitalName(
                            admin,
                        );

                    const phone =
                        safeString(
                            admin.phone,
                        );

                    const matchesSearch =
                        !query ||
                        admin.name
                            .toLowerCase()
                            .includes(query) ||
                        admin.email
                            .toLowerCase()
                            .includes(query) ||
                        hospitalName
                            .toLowerCase()
                            .includes(query) ||
                        phone
                            .toLowerCase()
                            .includes(query);

                    const matchesFilter =
                        filter === "ALL" ||
                        admin.status === filter;

                    return (
                        matchesSearch &&
                        matchesFilter
                    );
                },
            );

        }, [
            admins,
            search,
            filter,
        ]);

    /* =======================================================
       STATUS CHANGE
    ======================================================= */

    const handleStatusChange =
        async (
            admin: HospitalAdmin,
        ): Promise<void> => {

            const newStatus: AdminStatus =
                admin.status === "ACTIVE"
                    ? "INACTIVE"
                    : "ACTIVE";

            const action =
                newStatus === "ACTIVE"
                    ? "activate"
                    : "deactivate";

            const confirmed =
                window.confirm(
                    `Are you sure you want to ${action} ${admin.name}?`,
                );

            if (!confirmed) {
                return;
            }

            try {

                setSaving(true);

                const updatedAdmin =
                    await updateHospitalAdminStatus(
                        admin._id,
                        newStatus,
                    );

                setAdmins(
                    (current) =>
                        current.map(
                            (item) =>
                                item._id ===
                                    updatedAdmin._id
                                    ? updatedAdmin
                                    : item,
                        ),
                );

                setSelectedAdmin(
                    (current) =>
                        current?._id ===
                            updatedAdmin._id
                            ? updatedAdmin
                            : current,
                );

            } catch (error) {

                console.error(
                    "Status update failed:",
                    error,
                );

                window.alert(
                    "Unable to update admin status.",
                );

            } finally {

                setSaving(false);

            }
        };

    /* =======================================================
       VIEW
    ======================================================= */

    const handleView = (
        admin: HospitalAdmin,
    ) => {

        setSelectedAdmin(admin);
        setModal("DETAILS");
    };

    /* =======================================================
       EDIT
    ======================================================= */

    const handleEdit = (
        admin: HospitalAdmin,
    ) => {

        setSelectedAdmin(admin);
        setModal("EDIT");
    };

    /* =======================================================
       CREATE
    ======================================================= */

    const handleCreate = async (
        formPayload: CreateAdminFormPayload,
    ): Promise<void> => {

        try {

            setSaving(true);

            if (
                !formPayload.password.trim()
            ) {
                throw new Error(
                    "Password is required.",
                );
            }

            const payload: CreateHospitalAdminPayload =
            {
                name:
                    formPayload.name.trim(),

                email:
                    formPayload.email.trim(),

                phone:
                    formPayload.phone.trim() ||
                    undefined,

                password:
                    formPayload.password,

                hospitalId:
                    formPayload.hospitalId,
            };

            const newAdmin =
                await createHospitalAdmin(
                    payload,
                );

            setAdmins(
                (current) => {

                    const exists =
                        current.some(
                            (admin) =>
                                admin._id ===
                                newAdmin._id,
                        );

                    if (exists) {
                        return current;
                    }

                    return [
                        newAdmin,
                        ...current,
                    ];
                },
            );

            setModal("NONE");

        } catch (error) {

            console.error(
                "Create admin failed:",
                error,
            );

            throw error;

        } finally {

            setSaving(false);

        }
    };

    /* =======================================================
       UPDATE
    ======================================================= */

    const handleUpdate = async (
        formPayload: CreateAdminFormPayload,
    ): Promise<void> => {

        if (!selectedAdmin) {
            return;
        }

        try {

            setSaving(true);

            const payload: UpdateHospitalAdminPayload =
            {
                name:
                    formPayload.name.trim(),

                email:
                    formPayload.email.trim(),

                phone:
                    formPayload.phone.trim() ||
                    undefined,

                hospitalId:
                    formPayload.hospitalId,
            };

            const updatedAdmin =
                await updateHospitalAdmin(
                    selectedAdmin._id,
                    payload,
                );

            setAdmins(
                (current) =>
                    current.map(
                        (admin) =>
                            admin._id ===
                                updatedAdmin._id
                                ? updatedAdmin
                                : admin,
                    ),
            );

            setSelectedAdmin(
                updatedAdmin,
            );

            setModal("NONE");

        } catch (error) {

            console.error(
                "Update admin failed:",
                error,
            );

            throw error;

        } finally {

            setSaving(false);

        }
    };

    /* =======================================================
       RENDER
    ======================================================= */

    return (
        <>
            {/* HEADER */}

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>

                    <div className="flex items-center gap-2">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <ShieldCheck
                                size={21}
                            />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900">
                            Hospital Admin Management
                        </h1>

                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                        Manage hospital administrators
                        and their access across
                        NexTurn hospitals.
                    </p>

                </div>

                <button
                    type="button"
                    onClick={() =>
                        setModal("CREATE")
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                    <Plus size={18} />
                    Add Admin
                </button>

            </div>

            {/* ERROR */}

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* CONTENT */}

            {loading ? (

                <div className="flex min-h-[300px] items-center justify-center">

                    <Loader2
                        size={30}
                        className="animate-spin text-blue-600"
                    />

                </div>

            ) : (

                <>

                    {/* STATS */}

                    <div className="mb-6 grid gap-4 sm:grid-cols-3">

                        <AdminStat
                            title="Total Admins"
                            value={
                                totalAdmins
                            }
                            icon={
                                <Users
                                    size={21}
                                />
                            }
                            className="bg-blue-50 text-blue-600"
                        />

                        <AdminStat
                            title="Active Admins"
                            value={
                                activeAdmins
                            }
                            icon={
                                <CheckCircle2
                                    size={21}
                                />
                            }
                            className="bg-emerald-50 text-emerald-600"
                        />

                        <AdminStat
                            title="Inactive Admins"
                            value={
                                inactiveAdmins
                            }
                            icon={
                                <XCircle
                                    size={21}
                                />
                            }
                            className="bg-red-50 text-red-600"
                        />

                    </div>

                    {/* SEARCH */}

                    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                            <div className="relative w-full lg:max-w-md">

                                <Search
                                    size={19}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="text"
                                    value={
                                        search
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setSearch(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="Search admin..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />

                            </div>

                            <div className="flex flex-wrap gap-2">

                                <FilterButton
                                    label="All"
                                    count={
                                        totalAdmins
                                    }
                                    active={
                                        filter ===
                                        "ALL"
                                    }
                                    onClick={() =>
                                        setFilter(
                                            "ALL",
                                        )
                                    }
                                />

                                <FilterButton
                                    label="Active"
                                    count={
                                        activeAdmins
                                    }
                                    active={
                                        filter ===
                                        "ACTIVE"
                                    }
                                    onClick={() =>
                                        setFilter(
                                            "ACTIVE",
                                        )
                                    }
                                />

                                <FilterButton
                                    label="Inactive"
                                    count={
                                        inactiveAdmins
                                    }
                                    active={
                                        filter ===
                                        "INACTIVE"
                                    }
                                    onClick={() =>
                                        setFilter(
                                            "INACTIVE",
                                        )
                                    }
                                />

                            </div>

                        </div>

                    </div>

                    {/* TABLE */}

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                        {filteredAdmins.length ===
                        0 ? (

                            <EmptyState />

                        ) : (

                            <div className="overflow-x-auto">

                                <table className="w-full min-w-[1050px]">

                                    <thead>

                                        <tr className="border-b border-slate-200 bg-slate-50">

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Admin
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Email
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Hospital
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Phone
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Status
                                            </th>

                                            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Actions
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-slate-100">

                                        {filteredAdmins.map(
                                            (
                                                admin,
                                            ) => (

                                                <AdminRow
                                                    key={
                                                        admin._id
                                                    }
                                                    admin={
                                                        admin
                                                    }
                                                    onView={
                                                        handleView
                                                    }
                                                    onEdit={
                                                        handleEdit
                                                    }
                                                    onStatusChange={
                                                        handleStatusChange
                                                    }
                                                />

                                            ),
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </div>

                </>

            )}

            {/* DETAILS */}

            {modal === "DETAILS" &&
                selectedAdmin && (

                    <AdminDetailsModal
                        admin={
                            selectedAdmin
                        }
                        onClose={() => {
                            setModal("NONE");
                            setSelectedAdmin(
                                null,
                            );
                        }}
                        onEdit={() =>
                            setModal("EDIT")
                        }
                    />

                )}

            {/* CREATE */}

            {modal === "CREATE" && (

                <AdminFormModal
                    title="Add Hospital Admin"
                    hospitals={
                        hospitals
                    }
                    hospitalsLoading={
                        hospitalsLoading
                    }
                    saving={
                        saving
                    }
                    onClose={() =>
                        setModal("NONE")
                    }
                    onSubmit={
                        handleCreate
                    }
                />

            )}

            {/* EDIT */}

            {modal === "EDIT" &&
                selectedAdmin && (

                    <AdminFormModal
                        title="Edit Hospital Admin"
                        admin={
                            selectedAdmin
                        }
                        hospitals={
                            hospitals
                        }
                        hospitalsLoading={
                            hospitalsLoading
                        }
                        saving={
                            saving
                        }
                        onClose={() =>
                            setModal("NONE")
                        }
                        onSubmit={
                            handleUpdate
                        }
                    />

                )}

        </>
    );
};

export default SuperHospitalAdmin;

/* =========================================================
   ADMIN STAT
========================================================= */

const AdminStat = ({
    title,
    value,
    icon,
    className,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    className: string;
}) => (

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${className}`}
        >
            {icon}
        </div>

        <p className="mt-4 text-sm text-slate-500">
            {title}
        </p>

        <p className="mt-1 text-3xl font-bold text-slate-900">
            {value.toLocaleString()}
        </p>

    </div>
);

/* =========================================================
   FILTER BUTTON
========================================================= */

const FilterButton = ({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) => (

    <button
        type="button"
        onClick={onClick}
        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            active
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
    >
        {label}

        <span className="ml-1 opacity-75">
            {count}
        </span>

    </button>
);

/* =========================================================
   ADMIN ROW
========================================================= */

const AdminRow = ({
    admin,
    onView,
    onEdit,
    onStatusChange,
}: {
    admin: HospitalAdmin;
    onView: (
        admin: HospitalAdmin,
    ) => void;
    onEdit: (
        admin: HospitalAdmin,
    ) => void;
    onStatusChange: (
        admin: HospitalAdmin,
    ) => void;
}) => {

    const isActive =
        admin.status === "ACTIVE";

    const hospitalName =
        getHospitalName(admin);

    const hospitalId =
        getHospitalId(admin);

    return (

        <tr className="transition hover:bg-slate-50">

            {/* ADMIN */}

            <td className="px-6 py-5">

                <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">

                        {safeString(
                            admin.name,
                            "A",
                        )
                            .charAt(0)
                            .toUpperCase()}

                    </div>

                    <div>

                        <p className="font-semibold text-slate-900">
                            {safeString(
                                admin.name,
                                "Unknown Admin",
                            )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Hospital Admin
                        </p>

                    </div>

                </div>

            </td>

            {/* EMAIL */}

            <td className="px-6 py-5">

                <div className="flex items-center gap-2">

                    <Mail
                        size={16}
                        className="shrink-0 text-slate-400"
                    />

                    <span className="text-sm text-slate-700">
                        {safeString(
                            admin.email,
                            "Not available",
                        )}
                    </span>

                </div>

            </td>

            {/* HOSPITAL */}

            <td className="px-6 py-5">

                <div className="flex items-center gap-2">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">

                        <HospitalIcon
                            size={17}
                        />

                    </div>

                    <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-slate-800">
                            {hospitalName}
                        </p>

                        {hospitalId && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                                ID: {hospitalId}
                            </p>
                        )}

                    </div>

                </div>

            </td>

            {/* PHONE */}

            <td className="px-6 py-5">

                <div className="flex items-center gap-2">

                    <Phone
                        size={16}
                        className="shrink-0 text-slate-400"
                    />

                    <span className="text-sm text-slate-700">
                        {safeString(
                            admin.phone,
                            "Not available",
                        )}
                    </span>

                </div>

            </td>

            {/* STATUS */}

            <td className="px-6 py-5">

                <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                    }`}
                >

                    <span
                        className={`h-2 w-2 rounded-full ${
                            isActive
                                ? "bg-emerald-500"
                                : "bg-red-500"
                        }`}
                    />

                    {isActive
                        ? "Active"
                        : "Inactive"}

                </span>

            </td>

            {/* ACTIONS */}

            <td className="px-6 py-5">

                <div className="flex items-center justify-end gap-1">

                    <ActionButton
                        title="View admin"
                        onClick={() =>
                            onView(admin)
                        }
                    >
                        <Eye size={17} />
                    </ActionButton>

                    <ActionButton
                        title="Edit admin"
                        onClick={() =>
                            onEdit(admin)
                        }
                    >
                        <Edit size={17} />
                    </ActionButton>

                    <button
                        type="button"
                        title={
                            isActive
                                ? "Deactivate admin"
                                : "Activate admin"
                        }
                        onClick={() =>
                            onStatusChange(
                                admin,
                            )
                        }
                        className={`rounded-lg p-2 transition ${
                            isActive
                                ? "text-red-500 hover:bg-red-50"
                                : "text-emerald-500 hover:bg-emerald-50"
                        }`}
                    >

                        {isActive ? (
                            <XCircle
                                size={17}
                            />
                        ) : (
                            <CheckCircle2
                                size={17}
                            />
                        )}

                    </button>

                </div>

            </td>

        </tr>
    );
};

/* =========================================================
   ACTION BUTTON
========================================================= */

const ActionButton = ({
    title,
    onClick,
    children,
}: {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
}) => (

    <button
        type="button"
        title={title}
        onClick={onClick}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
    >
        {children}
    </button>
);

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyState = () => (

    <div className="px-6 py-16 text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

            <UserCog size={27} />

        </div>

        <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No admins found
        </h3>

        <p className="mt-1 text-sm text-slate-500">
            Try changing your search or
            filter.
        </p>

    </div>
);

/* =========================================================
   MODAL WRAPPER
========================================================= */

const ModalWrapper = ({
    children,
    onClose,
    width = "max-w-2xl",
}: {
    children: React.ReactNode;
    onClose: () => void;
    width?: string;
}) => (

    <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        onMouseDown={(event) => {

            if (
                event.target ===
                event.currentTarget
            ) {
                onClose();
            }

        }}
    >

        <div
            className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-2xl bg-white shadow-2xl`}
        >
            {children}
        </div>

    </div>
);

/* =========================================================
   DETAILS MODAL
========================================================= */

const AdminDetailsModal = ({
    admin,
    onClose,
    onEdit,
}: {
    admin: HospitalAdmin;
    onClose: () => void;
    onEdit: () => void;
}) => {

    const hospitalName =
        getHospitalName(admin);

    const hospitalId =
        getHospitalId(admin);

    return (

        <ModalWrapper
            onClose={onClose}
        >

            <div className="border-b border-slate-200 p-6">

                <div className="flex items-start justify-between">

                    <div className="flex items-center gap-4">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">

                            {safeString(
                                admin.name,
                                "A",
                            )
                                .charAt(0)
                                .toUpperCase()}

                        </div>

                        <div>

                            <h2 className="text-xl font-bold text-slate-900">
                                {safeString(
                                    admin.name,
                                    "Unknown Admin",
                                )}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Hospital Administrator
                            </p>

                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={21} />
                    </button>

                </div>

            </div>

            <div className="p-6">

                <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <div>

                        <p className="text-xs text-slate-500">
                            Account Status
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                            {admin.status ===
                            "ACTIVE"
                                ? "Active"
                                : "Inactive"}
                        </p>

                    </div>

                    <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            admin.status ===
                            "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                        }`}
                    >

                        <span
                            className={`h-2 w-2 rounded-full ${
                                admin.status ===
                                "ACTIVE"
                                    ? "bg-emerald-500"
                                    : "bg-red-500"
                            }`}
                        />

                        {admin.status ===
                        "ACTIVE"
                            ? "Active"
                            : "Inactive"}

                    </span>

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                    <InfoItem
                        label="Full Name"
                        value={safeString(
                            admin.name,
                            "Not available",
                        )}
                    />

                    <InfoItem
                        label="Email"
                        value={safeString(
                            admin.email,
                            "Not available",
                        )}
                        icon={
                            <Mail size={16} />
                        }
                    />

                    <InfoItem
                        label="Phone"
                        value={safeString(
                            admin.phone,
                            "Not available",
                        )}
                        icon={
                            <Phone size={16} />
                        }
                    />

                    <InfoItem
                        label="Hospital"
                        value={
                            hospitalName
                        }
                        icon={
                            <HospitalIcon
                                size={16}
                            />
                        }
                    />

                    <InfoItem
                        label="Hospital ID"
                        value={
                            hospitalId ||
                            "Not available"
                        }
                    />

                    <InfoItem
                        label="Role"
                        value="Hospital Admin"
                        icon={
                            <ShieldCheck
                                size={16}
                            />
                        }
                    />

                    <InfoItem
                        label="Created On"
                        value={formatDate(
                            admin.createdAt,
                        )}
                    />

                    <InfoItem
                        label="Last Login"
                        value={
                            admin.lastLogin
                                ? formatDate(
                                      admin.lastLogin,
                                  )
                                : "Never"
                        }
                    />

                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        onClick={onEdit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        <Edit size={17} />
                        Edit Admin
                    </button>

                </div>

            </div>

        </ModalWrapper>
    );
};

/* =========================================================
   FORM MODAL
========================================================= */

const AdminFormModal = ({
    title,
    admin,
    hospitals,
    hospitalsLoading,
    saving,
    onClose,
    onSubmit,
}: {
    title: string;
    admin?: HospitalAdmin;
    hospitals: Hospital[];
    hospitalsLoading: boolean;
    saving: boolean;
    onClose: () => void;
    onSubmit: (
        payload: CreateAdminFormPayload,
    ) => Promise<void>;
}) => {

    const existingHospitalId =
        admin
            ? getHospitalId(admin)
            : "";

    const existingHospitalName =
        admin
            ? getHospitalName(admin)
            : "";

    const [form, setForm] =
        useState<CreateAdminFormPayload>(
            {
                name:
                    admin?.name ?? "",

                email:
                    admin?.email ?? "",

                phone:
                    admin?.phone ?? "",

                hospitalId:
                    existingHospitalId,

                hospitalName:
                    existingHospitalName,

                password: "",
            },
        );

    const [error, setError] =
        useState("");

    /* =======================================================
       SET EDIT HOSPITAL AFTER HOSPITALS LOAD
    ======================================================= */

    useEffect(() => {

        if (
            !admin ||
            !form.hospitalId ||
            hospitals.length === 0
        ) {
            return;
        }

        const selectedHospital =
            hospitals.find(
                (hospital) =>
                    hospital._id ===
                    form.hospitalId,
            );

        if (!selectedHospital) {
            return;
        }

        setForm(
            (current) => ({
                ...current,
                hospitalName:
                    selectedHospital.name,
            }),
        );

    }, [
        admin,
        hospitals,
        form.hospitalId,
    ]);

    /* =======================================================
       HANDLE CHANGE
    ======================================================= */

    const handleChange = (
        field: keyof CreateAdminFormPayload,
        value: string,
    ) => {

        setForm(
            (current) => ({
                ...current,
                [field]: value,
            }),
        );
    };

    /* =======================================================
       HOSPITAL CHANGE
    ======================================================= */

    const handleHospitalChange = (
        hospitalId: string,
    ) => {

        const selectedHospital =
            hospitals.find(
                (hospital) =>
                    hospital._id ===
                    hospitalId,
            );

        setForm(
            (current) => ({
                ...current,
                hospitalId,
                hospitalName:
                    selectedHospital?.name ??
                    "",
            }),
        );
    };

    /* =======================================================
       SUBMIT
    ======================================================= */

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {

        event.preventDefault();

        if (!form.name.trim()) {

            setError(
                "Admin name is required.",
            );

            return;
        }

        if (!form.email.trim()) {

            setError(
                "Email is required.",
            );

            return;
        }

        if (!form.hospitalId.trim()) {

            setError(
                "Hospital is required.",
            );

            return;
        }

        if (
            !admin &&
            !form.password.trim()
        ) {

            setError(
                "Password is required.",
            );

            return;
        }

        try {

            setError("");

            await onSubmit(form);

        } catch (error) {

            console.error(error);

            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to save admin.",
            );
        }
    };

    return (

        <ModalWrapper
            onClose={onClose}
        >

            <div className="border-b border-slate-200 p-6">

                <div className="flex items-center justify-between">

                    <div>

                        <h2 className="text-xl font-bold text-slate-900">
                            {title}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {admin
                                ? "Update hospital administrator information."
                                : "Create a new hospital administrator."}
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={21} />
                    </button>

                </div>

            </div>

            <form
                onSubmit={
                    handleSubmit
                }
                className="space-y-5 p-6"
            >

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">

                    <FormInput
                        label="Admin Name"
                        required
                        value={
                            form.name
                        }
                        onChange={(value) =>
                            handleChange(
                                "name",
                                value,
                            )
                        }
                    />

                    <FormInput
                        label="Email"
                        type="email"
                        required
                        value={
                            form.email
                        }
                        onChange={(value) =>
                            handleChange(
                                "email",
                                value,
                            )
                        }
                    />

                    <FormInput
                        label="Phone"
                        value={
                            form.phone
                        }
                        onChange={(value) =>
                            handleChange(
                                "phone",
                                value,
                            )
                        }
                    />

                    {/* DYNAMIC HOSPITAL */}

                    <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">

                            Hospital

                            <span className="ml-1 text-red-500">
                                *
                            </span>

                        </label>

                        <select
                            value={
                                form.hospitalId
                            }
                            onChange={(
                                event,
                            ) =>
                                handleHospitalChange(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            disabled={
                                hospitalsLoading ||
                                saving
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >

                            <option value="">
                                {hospitalsLoading
                                    ? "Loading hospitals..."
                                    : "Select hospital"}
                            </option>

                            {hospitals
                                .filter(
                                    (
                                        hospital,
                                    ) =>
                                        hospital.isActive ||
                                        hospital._id ===
                                            form.hospitalId,
                                )
                                .map(
                                    (
                                        hospital,
                                    ) => (

                                        <option
                                            key={
                                                hospital._id
                                            }
                                            value={
                                                hospital._id
                                            }
                                        >
                                            {
                                                hospital.name
                                            }
                                        </option>

                                    ),
                                )}

                        </select>

                        {!hospitalsLoading &&
                            hospitals.length ===
                                0 && (

                                <p className="mt-2 text-xs text-red-500">
                                    No hospitals
                                    available.
                                </p>

                            )}

                    </div>

                    {/* PASSWORD */}

                    {!admin && (

                        <FormInput
                            label="Temporary Password"
                            type="password"
                            required
                            value={
                                form.password
                            }
                            onChange={(
                                value,
                            ) =>
                                handleChange(
                                    "password",
                                    value,
                                )
                            }
                        />

                    )}

                </div>

                {!admin && (

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

                        <div className="flex gap-3">

                            <ShieldCheck
                                size={19}
                                className="mt-0.5 shrink-0 text-blue-600"
                            />

                            <div>

                                <p className="text-sm font-semibold text-blue-900">
                                    Admin Access
                                </p>

                                <p className="mt-1 text-xs leading-5 text-blue-700">
                                    This account
                                    will be able
                                    to manage
                                    doctors,
                                    receptionists,
                                    patients,
                                    departments
                                    and queues
                                    for the
                                    selected
                                    hospital.
                                </p>

                            </div>

                        </div>

                    </div>

                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={
                            saving ||
                            hospitalsLoading ||
                            hospitals.length === 0
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                        {saving && (
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                        )}

                        {admin
                            ? "Update Admin"
                            : "Create Admin"}

                    </button>

                </div>

            </form>

        </ModalWrapper>
    );
};

/* =========================================================
   FORM INPUT
========================================================= */

const FormInput = ({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (
        value: string,
    ) => void;
    type?: string;
    required?: boolean;
}) => (

    <div>

        <label className="mb-2 block text-sm font-medium text-slate-700">

            {label}

            {required && (
                <span className="ml-1 text-red-500">
                    *
                </span>
            )}

        </label>

        <input
            type={type}
            value={value}
            required={required}
            onChange={(event) =>
                onChange(
                    event.target.value,
                )
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
        />

    </div>
);

/* =========================================================
   INFO ITEM
========================================================= */

const InfoItem = ({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
}) => (

    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

        <p className="text-xs font-medium text-slate-500">
            {label}
        </p>

        <div className="mt-1 flex items-center gap-2">

            {icon && (
                <span className="shrink-0 text-slate-400">
                    {icon}
                </span>
            )}

            <p className="break-all text-sm font-semibold text-slate-900">
                {value ||
                    "Not available"}
            </p>

        </div>

    </div>
);

/* =========================================================
   DATE FORMAT
========================================================= */

const formatDate = (
    date?: string,
): string => {

    if (!date) {
        return "Not available";
    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime(),
        )
    ) {
        return "Not available";
    }

    return parsedDate.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        },
    );
};

