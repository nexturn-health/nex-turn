import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    RefreshCw,
    FlaskConical,
    CheckCircle2,
    Clock3,
    Play,
    TestTube2,
    Search,
    AlertCircle,
    MapPin,
    CalendarDays,
    ChevronRight,
    FileText,
    X,
    ClipboardCheck,
    Upload,
    Eye,
    FileImage,
} from "lucide-react";

import toast from "react-hot-toast";

import {
    getLabTechnicianOrders,
    updateLabOrderItemStatus,
} from "../../services/lab/lab.api";

import type {
    LabOrder,
    LabOrderItem,
} from "../../types/lab.types";

// ============================================================
// SAFE TYPES
// ============================================================

type PopulatedName = {
    _id?: string;
    name?: string;
};

type PopulatedRoom = {
    _id?: string;
    name?: string;
    roomNumber?: string;
};

type PopulatedPatient = {
    _id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
};

type FlexibleValue =
    | string
    | PopulatedName
    | PopulatedRoom
    | PopulatedPatient
    | null
    | undefined;

// ============================================================
// HELPERS
// ============================================================

const getName = (
    value: FlexibleValue,
): string => {
    if (!value) {
        return "—";
    }

    if (
        typeof value ===
        "string"
    ) {
        return "—";
    }

    return value.name || "—";
};

const getRoomName = (
    value: FlexibleValue,
): string => {
    if (!value) {
        return "—";
    }

    if (
        typeof value ===
        "string"
    ) {
        return "—";
    }

    return value.name || "—";
};

const getRoomNumber = (
    value: FlexibleValue,
): string => {
    if (!value) {
        return "—";
    }

    if (
        typeof value ===
        "string"
    ) {
        return "—";
    }

    return "roomNumber" in value
        ? value.roomNumber || "—"
        : "—";
};

const getPatientName = (
    value: FlexibleValue,
): string => {
    if (!value) {
        return "Patient";
    }

    if (
        typeof value ===
        "string"
    ) {
        return "Patient";
    }

    if (
        "firstName" in value ||
        "lastName" in value
    ) {
        const firstName =
            "firstName" in value
                ? value.firstName ||
                ""
                : "";

        const lastName =
            "lastName" in value
                ? value.lastName ||
                ""
                : "";

        const fullName =
            `${firstName} ${lastName}`.trim();

        if (fullName) {
            return fullName;
        }
    }

    return (
        value.name ||
        "Patient"
    );
};

const getPatientInitials = (
    value: FlexibleValue,
): string => {
    const name =
        getPatientName(
            value,
        );

    if (
        !name ||
        name === "Patient"
    ) {
        return "P";
    }

    const parts =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (
        parts.length ===
        1
    ) {
        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[
        parts.length - 1
        ][0]
    ).toUpperCase();
};

// ============================================================
// STATUS
// ============================================================

const getStatusLabel = (
    status: string,
): string => {
    switch (status) {
        case "ORDERED":
            return "Waiting";

        case "SAMPLE_COLLECTED":
            return "Sample Collected";

        case "PROCESSING":
            return "Processing";

        case "COMPLETED":
            return "Completed";

        case "CANCELLED":
            return "Cancelled";

        default:
            return (
                status ||
                "Unknown"
            );
    }
};

const getStatusClass = (
    status: string,
): string => {
    switch (status) {
        case "ORDERED":
            return "bg-amber-50 text-amber-700 border-amber-200";

        case "SAMPLE_COLLECTED":
            return "bg-blue-50 text-blue-700 border-blue-200";

        case "PROCESSING":
            return "bg-violet-50 text-violet-700 border-violet-200";

        case "COMPLETED":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";

        case "CANCELLED":
            return "bg-red-50 text-red-700 border-red-200";

        default:
            return "bg-slate-50 text-slate-600 border-slate-200";
    }
};

// ============================================================
// DATE
// ============================================================

const formatDate = (
    value?:
        | string
        | Date
        | null,
): string => {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        },
    );
};

// ============================================================
// COMPONENT
// ============================================================

const LabTechnicianDashboard =
    () => {
        const [
            orders,
            setOrders,
        ] =
            useState<
                LabOrder[]
            >([]);

        const [
            loading,
            setLoading,
        ] =
            useState(true);

        const [
            refreshing,
            setRefreshing,
        ] =
            useState(false);

        const [
            updating,
            setUpdating,
        ] =
            useState<
                string | null
            >(null);

        const [
            search,
            setSearch,
        ] =
            useState("");

        const [
            statusFilter,
            setStatusFilter,
        ] =
            useState<
                | "ALL"
                | "ORDERED"
                | "SAMPLE_COLLECTED"
                | "PROCESSING"
                | "COMPLETED"
            >("ALL");

        // ========================================================
        // COMPLETE MODAL
        // ========================================================

        const [
            selectedItem,
            setSelectedItem,
        ] =
            useState<{
                order: LabOrder;
                item: LabOrderItem;
            } | null>(null);

        const [
            result,
            setResult,
        ] =
            useState("");

        const [
            notes,
            setNotes,
        ] =
            useState("");

        const [
            reportFile,
            setReportFile,
        ] =
            useState<File | null>(
                null,
            );

        // ========================================================
        // VIEW REPORT
        // ========================================================

        // const [
        //     setViewingReport,
        // ] =
        //     useState<
        //         string | null
        //     >(null);

        // ========================================================
        // LOAD ORDERS
        // ========================================================

        const loadOrders =
            useCallback(
                async (
                    showRefresh = false,
                ) => {
                    try {
                        if (
                            showRefresh
                        ) {
                            setRefreshing(
                                true,
                            );
                        } else {
                            setLoading(
                                true,
                            );
                        }

                        const data =
                            await getLabTechnicianOrders();

                        console.log(
                            "LAB TECHNICIAN ORDERS:",
                            data,
                        );

                        setOrders(
                            Array.isArray(
                                data,
                            )
                                ? data
                                : [],
                        );
                    } catch (error) {
                        console.error(
                            "LOAD TECHNICIAN ORDERS ERROR:",
                            error,
                        );

                        setOrders(
                            [],
                        );

                        toast.error(
                            "Unable to load laboratory work.",
                        );
                    } finally {
                        setLoading(
                            false,
                        );

                        setRefreshing(
                            false,
                        );
                    }
                },
                [],
            );

        useEffect(() => {
            loadOrders();
        }, [
            loadOrders,
        ]);

        // ========================================================
        // FLATTEN
        // ========================================================

        const allItems =
            useMemo(() => {
                const result: {
                    order: LabOrder;
                    item: LabOrderItem;
                }[] = [];

                orders.forEach(
                    (
                        order,
                    ) => {
                        if (
                            !Array.isArray(
                                order.items,
                            )
                        ) {
                            return;
                        }

                        order.items.forEach(
                            (
                                item,
                            ) => {
                                result.push(
                                    {
                                        order,
                                        item,
                                    },
                                );
                            },
                        );
                    },
                );

                return result;
            }, [
                orders,
            ]);

        // ========================================================
        // COUNTS
        // ========================================================

        const counts =
            useMemo(() => {
                let total = 0;
                let pending = 0;
                let processing = 0;
                let completed = 0;
                let collected = 0;

                allItems.forEach(
                    ({
                        item,
                    }) => {
                        total++;

                        if (
                            item.status ===
                            "ORDERED"
                        ) {
                            pending++;
                        }

                        if (
                            item.status ===
                            "SAMPLE_COLLECTED"
                        ) {
                            collected++;
                        }

                        if (
                            item.status ===
                            "PROCESSING"
                        ) {
                            processing++;
                        }

                        if (
                            item.status ===
                            "COMPLETED"
                        ) {
                            completed++;
                        }
                    },
                );

                return {
                    total,
                    pending,
                    collected,
                    processing,
                    completed,
                };
            }, [
                allItems,
            ]);

        // ========================================================
        // FILTER
        // ========================================================

        const activeItems =
            useMemo(() => {
                const query =
                    search
                        .trim()
                        .toLowerCase();

                return allItems.filter(
                    ({
                        order,
                        item,
                    }) => {
                        if (
                            statusFilter !==
                            "ALL" &&
                            item.status !==
                            statusFilter
                        ) {
                            return false;
                        }

                        if (
                            !query
                        ) {
                            return true;
                        }

                        const patient =
                            getPatientName(
                                order.patientId,
                            ).toLowerCase();

                        const test =
                            (
                                item.testName ||
                                ""
                            ).toLowerCase();

                        const code =
                            (
                                item.testCode ||
                                ""
                            ).toLowerCase();

                        const department =
                            getName(
                                item.labDepartmentId,
                            ).toLowerCase();

                        const room =
                            getRoomName(
                                item.labRoomId,
                            ).toLowerCase();

                        return (
                            patient.includes(
                                query,
                            ) ||
                            test.includes(
                                query,
                            ) ||
                            code.includes(
                                query,
                            ) ||
                            department.includes(
                                query,
                            ) ||
                            room.includes(
                                query,
                            )
                        );
                    },
                );
            }, [
                allItems,
                search,
                statusFilter,
            ]);

        // ========================================================
        // RECENT COMPLETED
        // ========================================================

        const recentCompleted =
            useMemo(
                () =>
                    allItems
                        .filter(
                            ({
                                item,
                            }) =>
                                item.status ===
                                "COMPLETED",
                        )
                        .slice(
                            0,
                            6,
                        ),
                [
                    allItems,
                ],
            );

        // ========================================================
        // UPDATE STATUS
        // ========================================================

        const updateStatus =
            async (
                order: LabOrder,
                item: LabOrderItem,
                status:
                    | "SAMPLE_COLLECTED"
                    | "PROCESSING",
            ) => {
                const key =
                    `${order._id}-${item._id}`;

                try {
                    setUpdating(
                        key,
                    );

                    await updateLabOrderItemStatus(
                        order._id,
                        item._id,
                        {
                            status,
                        },
                    );

                    toast.success(
                        "Test status updated.",
                    );

                    await loadOrders(
                        true,
                    );
                } catch (error) {
                    console.error(
                        "UPDATE LAB ITEM STATUS ERROR:",
                        error,
                    );

                    toast.error(
                        "Unable to update test status.",
                    );
                } finally {
                    setUpdating(
                        null,
                    );
                }
            };

        // ========================================================
        // OPEN COMPLETE
        // ========================================================

        const openComplete =
            (
                order: LabOrder,
                item: LabOrderItem,
            ) => {
                setSelectedItem(
                    {
                        order,
                        item,
                    },
                );

                setResult(
                    item.result ||
                    "",
                );

                setNotes(
                    item.notes ||
                    "",
                );

                setReportFile(
                    null,
                );
            };

        // ========================================================
        // CLOSE COMPLETE
        // ========================================================

        const closeComplete =
            () => {
                setSelectedItem(
                    null,
                );

                setResult(
                    "",
                );

                setNotes(
                    "",
                );

                setReportFile(
                    null,
                );
            };

        // ========================================================
        // SELECT FILE
        // ========================================================

        const handleReportFile =
            (
                file?: File,
            ) => {
                if (!file) {
                    return;
                }

                const allowedTypes =
                    [
                        "application/pdf",
                        "image/jpeg",
                        "image/png",
                    ];

                if (
                    !allowedTypes.includes(
                        file.type,
                    )
                ) {
                    toast.error(
                        "Only PDF, JPG and PNG files are allowed.",
                    );

                    return;
                }

                const maxSize =
                    10 *
                    1024 *
                    1024;

                if (
                    file.size >
                    maxSize
                ) {
                    toast.error(
                        "Report file must be smaller than 10 MB.",
                    );

                    return;
                }

                setReportFile(
                    file,
                );
            };

        // ========================================================
        // COMPLETE REPORT
        // ========================================================

        const handleComplete =
            async () => {
                if (
                    !selectedItem
                ) {
                    return;
                }

                if (
                    !result.trim()
                ) {
                    toast.error(
                        "Please enter the test result.",
                    );

                    return;
                }

                if (
                    !reportFile
                ) {
                    toast.error(
                        "Please upload the laboratory report.",
                    );

                    return;
                }

                const {
                    order,
                    item,
                } =
                    selectedItem;

                const key =
                    `${order._id}-${item._id}`;

                try {
                    setUpdating(
                        key,
                    );

                    await updateLabOrderItemStatus(
                        order._id,
                        item._id,
                        {
                            status:
                                "COMPLETED",

                            result:
                                result.trim(),

                            notes:
                                notes.trim(),

                            reportFile,
                        },
                    );

                    toast.success(
                        "Lab report completed successfully.",
                    );

                    closeComplete();

                    await loadOrders(
                        true,
                    );
                } catch (error) {
                    console.error(
                        "COMPLETE LAB REPORT ERROR:",
                        error,
                    );

                    toast.error(
                        "Unable to complete lab report.",
                    );
                } finally {
                    setUpdating(
                        null,
                    );
                }
            };

        // ========================================================
        // VIEW REPORT
        // ========================================================

        const viewReport =
            (
                item: LabOrderItem,
            ) => {
                if (
                    !item.reportFileName
                ) {
                    toast.error(
                        "No report has been uploaded.",
                    );

                    return;
                }

                // setViewingReport(
                //     item.reportFileName,
                // );

                window.open(
                    item.reportFileName,
                    "_blank",
                    "noopener,noreferrer",
                );
            };

        // ========================================================
        // RENDER
        // ========================================================

        return (
            <div className="min-h-screen bg-slate-50">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="border-b bg-white">
                    <div className="mx-auto max-w-[1600px] px-5 py-5 sm:px-6 lg:px-8">

                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                            <div className="flex items-center gap-4">

                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                                    <FlaskConical
                                        size={
                                            24
                                        }
                                    />
                                </div>

                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                        Laboratory Dashboard
                                    </h1>

                                    <p className="mt-0.5 text-sm text-slate-500">
                                        Manage assigned laboratory tests and patient reports
                                    </p>
                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    loadOrders(
                                        true,
                                    )
                                }
                                disabled={
                                    loading ||
                                    refreshing
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={
                                        16
                                    }
                                    className={
                                        refreshing
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                {refreshing
                                    ? "Refreshing..."
                                    : "Refresh"}
                            </button>

                        </div>
                    </div>
                </div>

                <main className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 lg:px-8">

                    {/* ==================================================
                        STATS
                    ================================================== */}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        Total Tests
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-slate-900">
                                        {
                                            counts.total
                                        }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        Assigned to you
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                                    <TestTube2
                                        size={
                                            21
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        Waiting
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-slate-900">
                                        {
                                            counts.pending
                                        }
                                    </p>

                                    <p className="mt-1 text-xs text-amber-600">
                                        Sample collection
                                    </p>
                                </div>

                                <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                                    <Clock3
                                        size={
                                            21
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        Processing
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-slate-900">
                                        {
                                            counts.processing
                                        }
                                    </p>

                                    <p className="mt-1 text-xs text-violet-600">
                                        Tests in progress
                                    </p>
                                </div>

                                <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                                    <Play
                                        size={
                                            21
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        Completed
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-slate-900">
                                        {
                                            counts.completed
                                        }
                                    </p>

                                    <p className="mt-1 text-xs text-emerald-600">
                                        Reports completed
                                    </p>
                                </div>

                                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                                    <CheckCircle2
                                        size={
                                            21
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ==================================================
                        WORKFLOW
                    ================================================== */}

                    {!loading &&
                        counts.total >
                        0 && (
                            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                                <div className="mb-4 flex items-center justify-between">

                                    <div>
                                        <h2 className="font-semibold text-slate-900">
                                            Today's Workflow
                                        </h2>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Current laboratory workload
                                        </p>
                                    </div>

                                    <ClipboardCheck
                                        size={
                                            20
                                        }
                                        className="text-slate-400"
                                    />

                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

                                    {[
                                        {
                                            label: "Waiting",
                                            count: counts.pending,
                                        },
                                        {
                                            label: "Collected",
                                            count: counts.collected,
                                        },
                                        {
                                            label: "Processing",
                                            count: counts.processing,
                                        },
                                        {
                                            label: "Completed",
                                            count: counts.completed,
                                        },
                                    ].map(
                                        ({
                                            label,
                                            count,
                                        }) => (
                                            <div
                                                key={
                                                    label
                                                }
                                            >
                                                <div className="mb-2 flex justify-between text-xs">
                                                    <span className="font-medium text-slate-600">
                                                        {
                                                            label
                                                        }
                                                    </span>

                                                    <span className="font-semibold text-slate-800">
                                                        {
                                                            count
                                                        }
                                                    </span>
                                                </div>

                                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-slate-700"
                                                        style={{
                                                            width: `${counts.total
                                                                    ? Math.min(
                                                                        100,
                                                                        (count /
                                                                            counts.total) *
                                                                        100,
                                                                    )
                                                                    : 0
                                                                }%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ),
                                    )}

                                </div>
                            </div>
                        )}

                    {/* ==================================================
                        WORK QUEUE
                    ================================================== */}

                    <div className="mt-6">

                        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Laboratory Work Queue
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Tests assigned to your laboratory workspace
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">

                                <div className="relative">
                                    <Search
                                        size={
                                            17
                                        }
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        value={
                                            search
                                        }
                                        onChange={(
                                            e,
                                        ) =>
                                            setSearch(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Search patient or test..."
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-64"
                                    />
                                </div>

                                <select
                                    value={
                                        statusFilter
                                    }
                                    onChange={(
                                        e,
                                    ) =>
                                        setStatusFilter(
                                            e.target.value as typeof statusFilter,
                                        )
                                    }
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
                                >
                                    <option value="ALL">
                                        All Status
                                    </option>

                                    <option value="ORDERED">
                                        Waiting
                                    </option>

                                    <option value="SAMPLE_COLLECTED">
                                        Sample Collected
                                    </option>

                                    <option value="PROCESSING">
                                        Processing
                                    </option>

                                    <option value="COMPLETED">
                                        Completed
                                    </option>
                                </select>

                            </div>
                        </div>

                        {/* ==================================================
                            LOADING
                        ================================================== */}

                        {loading ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                                <RefreshCw
                                    size={
                                        32
                                    }
                                    className="mx-auto animate-spin text-slate-400"
                                />

                                <p className="mt-4 font-medium text-slate-700">
                                    Loading laboratory work...
                                </p>

                                <p className="mt-1 text-sm text-slate-400">
                                    Please wait
                                </p>
                            </div>
                        ) : activeItems.length ===
                            0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">

                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    {search ||
                                        statusFilter !==
                                        "ALL" ? (
                                        <Search
                                            size={
                                                28
                                            }
                                        />
                                    ) : (
                                        <FlaskConical
                                            size={
                                                28
                                            }
                                        />
                                    )}
                                </div>

                                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                                    {search ||
                                        statusFilter !==
                                        "ALL"
                                        ? "No matching tests"
                                        : "No laboratory work assigned"}
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                    {search ||
                                        statusFilter !==
                                        "ALL"
                                        ? "Try changing your search or status filter."
                                        : "When a paid laboratory order is assigned to your department and room, it will appear here automatically."}
                                </p>

                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                                {/* Desktop Header */}

                                <div className="hidden border-b bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[2fr_1.5fr_1.2fr_1fr_1.2fr_auto] lg:gap-4">

                                    <div>
                                        Patient / Test
                                    </div>

                                    <div>
                                        Department
                                    </div>

                                    <div>
                                        Room
                                    </div>

                                    <div>
                                        Status
                                    </div>

                                    <div>
                                        Order
                                    </div>

                                    <div>
                                        Action
                                    </div>

                                </div>

                                <div className="divide-y divide-slate-100">

                                    {activeItems.map(
                                        ({
                                            order,
                                            item,
                                        }) => {
                                            const key =
                                                `${order._id}-${item._id}`;

                                            const isUpdating =
                                                updating ===
                                                key;

                                            const patientName =
                                                getPatientName(
                                                    order.patientId,
                                                );

                                            const roomName =
                                                getRoomName(
                                                    item.labRoomId,
                                                );

                                            const roomNumber =
                                                getRoomNumber(
                                                    item.labRoomId,
                                                );

                                            return (
                                                <div
                                                    key={
                                                        key
                                                    }
                                                    className="p-5 transition hover:bg-slate-50/70"
                                                >

                                                    {/* Desktop */}

                                                    <div className="hidden items-center lg:grid lg:grid-cols-[2fr_1.5fr_1.2fr_1fr_1.2fr_auto] lg:gap-4">

                                                        <div className="min-w-0">

                                                            <div className="flex items-center gap-3">

                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                                                                    {getPatientInitials(
                                                                        order.patientId,
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0">

                                                                    <p className="truncate font-semibold text-slate-900">
                                                                        {
                                                                            patientName
                                                                        }
                                                                    </p>

                                                                    <p className="mt-0.5 truncate text-sm text-slate-500">
                                                                        {
                                                                            item.testName
                                                                        }
                                                                    </p>

                                                                    {item.testCode && (
                                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                                            {
                                                                                item.testCode
                                                                            }
                                                                        </p>
                                                                    )}

                                                                </div>

                                                            </div>

                                                        </div>

                                                        <div className="text-sm text-slate-600">

                                                            <div className="flex items-center gap-2">

                                                                <FlaskConical
                                                                    size={
                                                                        15
                                                                    }
                                                                    className="text-slate-400"
                                                                />

                                                                <span>
                                                                    {getName(
                                                                        item.labDepartmentId,
                                                                    )}
                                                                </span>

                                                            </div>

                                                        </div>

                                                        <div className="text-sm text-slate-600">

                                                            <div className="flex items-center gap-2">

                                                                <MapPin
                                                                    size={
                                                                        15
                                                                    }
                                                                    className="text-slate-400"
                                                                />

                                                                <span>
                                                                    {
                                                                        roomName
                                                                    }

                                                                    {roomNumber !==
                                                                        "—" &&
                                                                        ` (${roomNumber})`}
                                                                </span>

                                                            </div>

                                                        </div>

                                                        <div>

                                                            <span
                                                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                                                                    item.status,
                                                                )}`}
                                                            >
                                                                {getStatusLabel(
                                                                    item.status,
                                                                )}
                                                            </span>

                                                        </div>

                                                        <div>

                                                            <p className="text-sm font-medium text-slate-700">
                                                                {formatDate(
                                                                    (
                                                                        order as LabOrder & {
                                                                            createdAt?: string;
                                                                        }
                                                                    ).createdAt,
                                                                )}
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-slate-400">
                                                                Order #
                                                                {
                                                                    order._id
                                                                }
                                                            </p>

                                                        </div>

                                                        <div className="flex justify-end">

                                                            {item.status ===
                                                                "ORDERED" && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            isUpdating
                                                                        }
                                                                        onClick={() =>
                                                                            updateStatus(
                                                                                order,
                                                                                item,
                                                                                "SAMPLE_COLLECTED",
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                                                                    >
                                                                        {isUpdating
                                                                            ? "..."
                                                                            : "Collect Sample"}

                                                                        <ChevronRight
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                    </button>
                                                                )}

                                                            {item.status ===
                                                                "SAMPLE_COLLECTED" && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            isUpdating
                                                                        }
                                                                        onClick={() =>
                                                                            updateStatus(
                                                                                order,
                                                                                item,
                                                                                "PROCESSING",
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                                                                    >
                                                                        {isUpdating
                                                                            ? "..."
                                                                            : "Start Test"}

                                                                        <Play
                                                                            size={
                                                                                13
                                                                            }
                                                                        />
                                                                    </button>
                                                                )}

                                                            {item.status ===
                                                                "PROCESSING" && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            isUpdating
                                                                        }
                                                                        onClick={() =>
                                                                            openComplete(
                                                                                order,
                                                                                item,
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                                                    >
                                                                        Complete

                                                                        <CheckCircle2
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                    </button>
                                                                )}

                                                            {item.status ===
                                                                "COMPLETED" && (
                                                                    <div className="flex items-center gap-2">

                                                                        {item.reportFileName ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    viewReport(
                                                                                        item,
                                                                                    )
                                                                                }
                                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                                                            >
                                                                                <Eye
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />

                                                                                View Report
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-xs text-slate-400">
                                                                                No report
                                                                            </span>
                                                                        )}

                                                                        <CheckCircle2
                                                                            size={
                                                                                16
                                                                            }
                                                                            className="text-emerald-600"
                                                                        />

                                                                    </div>
                                                                )}

                                                        </div>

                                                    </div>

                                                    {/* Mobile */}

                                                    <div className="lg:hidden">

                                                        <div className="flex items-start justify-between gap-4">

                                                            <div className="flex min-w-0 items-center gap-3">

                                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                                                                    {getPatientInitials(
                                                                        order.patientId,
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0">

                                                                    <h3 className="truncate font-semibold text-slate-900">
                                                                        {
                                                                            patientName
                                                                        }
                                                                    </h3>

                                                                    <p className="mt-0.5 truncate text-sm text-slate-500">
                                                                        {
                                                                            item.testName
                                                                        }
                                                                    </p>

                                                                </div>

                                                            </div>

                                                            <span
                                                                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                                                    item.status,
                                                                )}`}
                                                            >
                                                                {getStatusLabel(
                                                                    item.status,
                                                                )}
                                                            </span>

                                                        </div>

                                                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

                                                            <div className="rounded-xl bg-slate-50 p-3">
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Department
                                                                </p>

                                                                <p className="mt-1 truncate text-sm font-medium text-slate-700">
                                                                    {getName(
                                                                        item.labDepartmentId,
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <div className="rounded-xl bg-slate-50 p-3">
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Room
                                                                </p>

                                                                <p className="mt-1 truncate text-sm font-medium text-slate-700">
                                                                    {
                                                                        roomName
                                                                    }

                                                                    {roomNumber !==
                                                                        "—" &&
                                                                        ` (${roomNumber})`}
                                                                </p>
                                                            </div>

                                                            <div className="rounded-xl bg-slate-50 p-3">
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Date
                                                                </p>

                                                                <p className="mt-1 text-sm font-medium text-slate-700">
                                                                    {formatDate(
                                                                        (
                                                                            order as LabOrder & {
                                                                                createdAt?: string;
                                                                            }
                                                                        ).createdAt,
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <div className="rounded-xl bg-slate-50 p-3">
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                                    Order
                                                                </p>

                                                                <p className="mt-1 truncate text-sm font-medium text-slate-700">
                                                                    #
                                                                    {
                                                                        order._id
                                                                    }
                                                                </p>
                                                            </div>

                                                        </div>

                                                        <div className="mt-4">

                                                            {item.status ===
                                                                "ORDERED" && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            isUpdating
                                                                        }
                                                                        onClick={() =>
                                                                            updateStatus(
                                                                                order,
                                                                                item,
                                                                                "SAMPLE_COLLECTED",
                                                                            )
                                                                        }
                                                                        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                                                    >
                                                                        {isUpdating
                                                                            ? "Updating..."
                                                                            : "Mark Sample Collected"}
                                                                    </button>
                                                                )}

                                                            {item.status ===
                                                                "SAMPLE_COLLECTED" && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            isUpdating
                                                                        }
                                                                        onClick={() =>
                                                                            updateStatus(
                                                                                order,
                                                                                item,
                                                                                "PROCESSING",
                                                                            )
                                                                        }
                                                                        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                                                    >
                                                                        {isUpdating
                                                                            ? "Updating..."
                                                                            : "Start Processing"}
                                                                    </button>
                                                                )}

                                                            {item.status ===
                                                                "PROCESSING" && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            isUpdating
                                                                        }
                                                                        onClick={() =>
                                                                            openComplete(
                                                                                order,
                                                                                item,
                                                                            )
                                                                        }
                                                                        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                                                    >
                                                                        Complete Report
                                                                    </button>
                                                                )}

                                                            {item.status ===
                                                                "COMPLETED" && (
                                                                    item.reportFileName ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                viewReport(
                                                                                    item,
                                                                                )
                                                                            }
                                                                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                                                        >
                                                                            <Eye
                                                                                size={
                                                                                    16
                                                                                }
                                                                            />

                                                                            View Report
                                                                        </button>
                                                                    ) : (
                                                                        <div className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-400">
                                                                            Report not uploaded
                                                                        </div>
                                                                    )
                                                                )}

                                                        </div>

                                                    </div>

                                                </div>
                                            );
                                        },
                                    )}

                                </div>
                            </div>
                        )}

                    </div>

                    {/* ==================================================
                        RECENT COMPLETED
                    ================================================== */}

                    {!loading &&
                        recentCompleted.length >
                        0 && (
                            <div className="mt-8">

                                <div className="mb-4">

                                    <h2 className="text-lg font-bold text-slate-900">
                                        Recently Completed
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Latest laboratory reports
                                    </p>

                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                                    {recentCompleted.map(
                                        ({
                                            order,
                                            item,
                                        }) => (
                                            <div
                                                key={`${order._id}-${item._id}`}
                                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                            >

                                                <div className="flex items-start justify-between gap-3">

                                                    <div className="flex items-center gap-3">

                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                                            <CheckCircle2
                                                                size={
                                                                    19
                                                                }
                                                            />
                                                        </div>

                                                        <div>

                                                            <p className="font-semibold text-slate-900">
                                                                {
                                                                    item.testName
                                                                }
                                                            </p>

                                                            <p className="text-xs text-slate-500">
                                                                {getPatientName(
                                                                    order.patientId,
                                                                )}
                                                            </p>

                                                        </div>

                                                    </div>

                                                    <span className="text-xs font-medium text-emerald-600">
                                                        Completed
                                                    </span>

                                                </div>

                                                {item.result && (
                                                    <div className="mt-4 rounded-xl bg-slate-50 p-3">

                                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">

                                                            <FileText
                                                                size={
                                                                    14
                                                                }
                                                            />

                                                            Result

                                                        </div>

                                                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">
                                                            {
                                                                item.result
                                                            }
                                                        </p>

                                                    </div>
                                                )}

                                                {item.reportFileName && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            viewReport(
                                                                item,
                                                            )
                                                        }
                                                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                    >
                                                        <Eye
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        View Report

                                                    </button>
                                                )}

                                            </div>
                                        ),
                                    )}

                                </div>
                            </div>
                        )}

                </main>

                {/* ==================================================
                    COMPLETE REPORT MODAL
                ================================================== */}

                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">

                        <div className="my-8 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">

                            {/* Header */}

                            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">

                                <div className="flex items-center gap-3">

                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                        <FileText
                                            size={
                                                21
                                            }
                                        />
                                    </div>

                                    <div>

                                        <h2 className="text-xl font-bold text-slate-900">
                                            Complete Lab Report
                                        </h2>

                                        <p className="mt-0.5 text-sm text-slate-500">
                                            Enter result and upload the final report
                                        </p>

                                    </div>

                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        closeComplete
                                    }
                                    disabled={
                                        updating !==
                                        null
                                    }
                                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                >
                                    <X
                                        size={
                                            20
                                        }
                                    />
                                </button>

                            </div>

                            <div className="p-6">

                                {/* Patient */}

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-3">

                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-600 shadow-sm">
                                            {getPatientInitials(
                                                selectedItem.order.patientId,
                                            )}
                                        </div>

                                        <div>

                                            <p className="font-semibold text-slate-900">
                                                {getPatientName(
                                                    selectedItem.order.patientId,
                                                )}
                                            </p>

                                            <p className="mt-0.5 text-sm text-slate-500">
                                                {
                                                    selectedItem.item.testName
                                                }
                                            </p>

                                        </div>

                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

                                        <div className="rounded-xl bg-white p-3">

                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <FlaskConical
                                                    size={
                                                        13
                                                    }
                                                />
                                                Department
                                            </div>

                                            <p className="mt-1 text-sm font-medium text-slate-700">
                                                {getName(
                                                    selectedItem.item.labDepartmentId,
                                                )}
                                            </p>

                                        </div>

                                        <div className="rounded-xl bg-white p-3">

                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <MapPin
                                                    size={
                                                        13
                                                    }
                                                />
                                                Room
                                            </div>

                                            <p className="mt-1 text-sm font-medium text-slate-700">
                                                {getRoomName(
                                                    selectedItem.item.labRoomId,
                                                )}

                                                {getRoomNumber(
                                                    selectedItem.item.labRoomId,
                                                ) !==
                                                    "—" &&
                                                    ` (${getRoomNumber(
                                                        selectedItem.item.labRoomId,
                                                    )})`}
                                            </p>

                                        </div>

                                        <div className="rounded-xl bg-white p-3">

                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <CalendarDays
                                                    size={
                                                        13
                                                    }
                                                />
                                                Order
                                            </div>

                                            <p className="mt-1 text-sm font-medium text-slate-700">
                                                {formatDate(
                                                    (
                                                        selectedItem.order as LabOrder & {
                                                            createdAt?: string;
                                                        }
                                                    ).createdAt,
                                                )}
                                            </p>

                                        </div>

                                    </div>

                                </div>

                                {/* ==================================================
                                    RESULT
                                ================================================== */}

                                <div className="mt-5">

                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Test Result

                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <textarea
                                        value={
                                            result
                                        }
                                        onChange={(
                                            e,
                                        ) =>
                                            setResult(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Enter the final laboratory test result..."
                                        rows={
                                            6
                                        }
                                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />

                                </div>

                                {/* ==================================================
                                    NOTES
                                ================================================== */}

                                <div className="mt-4">

                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Technician Notes

                                        <span className="ml-1 text-xs font-normal text-slate-400">
                                            Optional
                                        </span>
                                    </label>

                                    <textarea
                                        value={
                                            notes
                                        }
                                        onChange={(
                                            e,
                                        ) =>
                                            setNotes(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Add additional laboratory notes..."
                                        rows={
                                            3
                                        }
                                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />

                                </div>

                                {/* ==================================================
                                    REPORT UPLOAD
                                ================================================== */}

                                <div className="mt-5">

                                    <label className="mb-2 block text-sm font-semibold text-slate-700">

                                        Upload Laboratory Report

                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>

                                    </label>

                                    <label
                                        htmlFor="lab-report-file"
                                        className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-7 text-center transition hover:border-slate-400 hover:bg-slate-100"
                                    >

                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                                            <Upload
                                                size={
                                                    21
                                                }
                                            />
                                        </div>

                                        <p className="mt-3 text-sm font-semibold text-slate-700">
                                            Click to upload report
                                        </p>

                                        <p className="mt-1 text-xs text-slate-400">
                                            PDF, JPG or PNG • Maximum 10 MB
                                        </p>

                                        <input
                                            id="lab-report-file"
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                            className="hidden"
                                            onChange={(
                                                e,
                                            ) =>
                                                handleReportFile(
                                                    e.target.files?.[0],
                                                )
                                            }
                                        />

                                    </label>

                                    {reportFile && (
                                        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-3">

                                            <div className="flex min-w-0 items-center gap-3">

                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
                                                    {reportFile.type ===
                                                        "application/pdf" ? (
                                                        <FileText
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    ) : (
                                                        <FileImage
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    )}
                                                </div>

                                                <div className="min-w-0">

                                                    <p className="truncate text-sm font-semibold text-emerald-800">
                                                        {
                                                            reportFile.name
                                                        }
                                                    </p>

                                                    <p className="text-xs text-emerald-600">
                                                        {(
                                                            reportFile.size /
                                                            1024 /
                                                            1024
                                                        ).toFixed(
                                                            2,
                                                        )}{" "}
                                                        MB
                                                    </p>

                                                </div>

                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReportFile(
                                                        null,
                                                    )
                                                }
                                                className="rounded-lg p-2 text-emerald-600 transition hover:bg-white"
                                            >
                                                <X
                                                    size={
                                                        17
                                                    }
                                                />
                                            </button>

                                        </div>
                                    )}

                                </div>

                                {/* ==================================================
                                    WARNING
                                ================================================== */}

                                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">

                                    <AlertCircle
                                        size={
                                            17
                                        }
                                        className="mt-0.5 shrink-0 text-amber-600"
                                    />

                                    <p className="text-xs leading-5 text-amber-700">
                                        Once you submit this report, the test will be marked as completed. Make sure the result and uploaded report are correct.
                                    </p>

                                </div>

                                {/* ==================================================
                                    ACTIONS
                                ================================================== */}

                                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                                    <button
                                        type="button"
                                        disabled={
                                            updating !==
                                            null
                                        }
                                        onClick={
                                            closeComplete
                                        }
                                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            !result.trim() ||
                                            !reportFile ||
                                            updating !==
                                            null
                                        }
                                        onClick={
                                            handleComplete
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >

                                        {updating !==
                                            null ? (
                                            <>
                                                <RefreshCw
                                                    size={
                                                        16
                                                    }
                                                    className="animate-spin"
                                                />

                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Upload
                                                    size={
                                                        16
                                                    }
                                                />

                                                Submit Report
                                            </>
                                        )}

                                    </button>

                                </div>

                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    };

export default LabTechnicianDashboard;