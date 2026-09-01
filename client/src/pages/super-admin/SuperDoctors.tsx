import {
    CheckCircle2,
    Edit,
    Eye,
    Hospital,
    Loader2,
    Mail,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    Stethoscope,
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
    createDoctor,
    getDoctors,
    updateDoctor,
    updateDoctorStatus,
    type CreateDoctorPayload,
    type Doctor,
    type DoctorStatus,
    type UpdateDoctorPayload,
} from "../../services/super-admin/doctor.api";

import {
    getSuperAdminHospitals,
    type Hospital as HospitalType,
} from "../../services/superAdmin.api";

import {
    getDepartments,
    type Department,
} from "../../services/department.api";

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
   SAFE STRING
========================================================= */

const safeString = (
    value: unknown,
): string => {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number") {
        return String(value);
    }

    return "";
};

/* =========================================================
   HOSPITAL NAME
========================================================= */

const getDoctorHospitalName = (
    doctor: Doctor,
): string => {
    if (
        doctor.hospital &&
        typeof doctor.hospital === "object" &&
        typeof doctor.hospital.name === "string"
    ) {
        return doctor.hospital.name;
    }

    return "Hospital not assigned";
};

/* =========================================================
   DEPARTMENT NAME
========================================================= */

const getDepartmentName = (
    doctor: Doctor,
): string => {
    if (
        doctor.department &&
        typeof doctor.department === "object" &&
        typeof doctor.department.name === "string"
    ) {
        return doctor.department.name;
    }

    return "Department not assigned";
};

/* =========================================================
   COMPONENT
========================================================= */

const SuperDoctors = () => {
    const [doctors, setDoctors] =
        useState<Doctor[]>([]);

    const [hospitals, setHospitals] =
        useState<HospitalType[]>([]);

    const [search, setSearch] =
        useState("");

    const [filter, setFilter] =
        useState<FilterType>("ALL");

    const [hospitalFilter, setHospitalFilter] =
        useState("ALL");

    const [modal, setModal] =
        useState<ModalType>("NONE");

    const [selectedDoctor, setSelectedDoctor] =
        useState<Doctor | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    /* =======================================================
       LOAD DATA
    ======================================================= */

    const loadData = useCallback(
        async () => {
            try {
                setLoading(true);
                setError("");

                const [
                    doctorsData,
                    hospitalsResponse,
                ] = await Promise.all([
                    getDoctors(),
                    getSuperAdminHospitals(),
                ]);

                setDoctors(
                    Array.isArray(doctorsData)
                        ? doctorsData
                        : [],
                );

                setHospitals(
                    Array.isArray(
                        hospitalsResponse.data,
                    )
                        ? hospitalsResponse.data
                        : [],
                );
            } catch (error) {
                console.error(
                    "Failed to load doctors:",
                    error,
                );

                setError(
                    "Unable to load doctors.",
                );
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        loadData();
    }, [loadData]);

    /* =======================================================
       STATS
    ======================================================= */

    const totalDoctors =
        doctors.length;

    const activeDoctors =
        doctors.filter(
            (doctor) =>
                doctor.status === "ACTIVE",
        ).length;

    const inactiveDoctors =
        doctors.filter(
            (doctor) =>
                doctor.status === "INACTIVE",
        ).length;

    /* =======================================================
       FILTER
    ======================================================= */

    const filteredDoctors =
        useMemo(() => {
            const query =
                search.trim().toLowerCase();

            return doctors.filter(
                (doctor) => {
                    const name =
                        safeString(
                            doctor.name,
                        ).toLowerCase();

                    const email =
                        safeString(
                            doctor.email,
                        ).toLowerCase();

                    const phone =
                        safeString(
                            doctor.phone,
                        ).toLowerCase();

                    const hospital =
                        getDoctorHospitalName(
                            doctor,
                        ).toLowerCase();

                    const department =
                        getDepartmentName(
                            doctor,
                        ).toLowerCase();

                    const matchesSearch =
                        !query ||
                        name.includes(query) ||
                        email.includes(query) ||
                        phone.includes(query) ||
                        hospital.includes(query) ||
                        department.includes(query);

                    const matchesStatus =
                        filter === "ALL" ||
                        doctor.status === filter;

                    const matchesHospital =
                        hospitalFilter === "ALL" ||
                        doctor.hospitalId ===
                        hospitalFilter;

                    return (
                        matchesSearch &&
                        matchesStatus &&
                        matchesHospital
                    );
                },
            );
        }, [
            doctors,
            search,
            filter,
            hospitalFilter,
        ]);

    /* =======================================================
       STATUS CHANGE
    ======================================================= */

    const handleStatusChange =
        async (
            doctor: Doctor,
        ): Promise<void> => {
            const newStatus: DoctorStatus =
                doctor.status === "ACTIVE"
                    ? "INACTIVE"
                    : "ACTIVE";

            const action =
                newStatus === "ACTIVE"
                    ? "activate"
                    : "deactivate";

            const confirmed =
                window.confirm(
                    `Are you sure you want to ${action} ${doctor.name}?`,
                );

            if (!confirmed) {
                return;
            }

            try {
                setSaving(true);

                const updatedDoctor =
                    await updateDoctorStatus(
                        doctor._id,
                        newStatus,
                    );

                setDoctors(
                    (current) =>
                        current.map(
                            (item) =>
                                item._id ===
                                    updatedDoctor._id
                                    ? updatedDoctor
                                    : item,
                        ),
                );

                setSelectedDoctor(
                    (current) =>
                        current?._id ===
                            updatedDoctor._id
                            ? updatedDoctor
                            : current,
                );
            } catch (error) {
                console.error(
                    "Doctor status update failed:",
                    error,
                );

                window.alert(
                    "Unable to update doctor status.",
                );
            } finally {
                setSaving(false);
            }
        };

    /* =======================================================
       CREATE DOCTOR
    ======================================================= */

    const handleCreate = async (
        payload: CreateDoctorPayload,
    ): Promise<void> => {
        try {
            setSaving(true);

            const doctor =
                await createDoctor(payload);

            setDoctors(
                (current) => [
                    doctor,
                    ...current,
                ],
            );

            setModal("NONE");
        } catch (error) {
            console.error(
                "Create doctor failed:",
                error,
            );

            throw error;
        } finally {
            setSaving(false);
        }
    };

    /* =======================================================
       UPDATE DOCTOR
    ======================================================= */

    const handleUpdate = async (
        payload: UpdateDoctorPayload,
    ): Promise<void> => {
        if (!selectedDoctor) {
            return;
        }

        try {
            setSaving(true);

            const updatedDoctor =
                await updateDoctor(
                    selectedDoctor._id,
                    payload,
                );

            setDoctors(
                (current) =>
                    current.map(
                        (doctor) =>
                            doctor._id ===
                                updatedDoctor._id
                                ? updatedDoctor
                                : doctor,
                    ),
            );

            setSelectedDoctor(
                updatedDoctor,
            );

            setModal("NONE");
        } catch (error) {
            console.error(
                "Update doctor failed:",
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
            {/* =====================================================
          HEADER
      ===================================================== */}

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Stethoscope size={22} />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900">
                            Doctor Management
                        </h1>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                        Manage doctors across all
                        NexTurn hospitals.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setSelectedDoctor(null);
                        setModal("CREATE");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    <Plus size={18} />
                    Add Doctor
                </button>
            </div>

            {/* =====================================================
          ERROR
      ===================================================== */}

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* =====================================================
          LOADING
      ===================================================== */}

            {loading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                    <Loader2
                        size={30}
                        className="animate-spin text-blue-600"
                    />
                </div>
            ) : (
                <>
                    {/* =================================================
              STATS
          ================================================= */}

                    <div className="mb-6 grid gap-4 sm:grid-cols-3">
                        <DoctorStat
                            title="Total Doctors"
                            value={totalDoctors}
                            icon={
                                <Users size={21} />
                            }
                            className="bg-blue-50 text-blue-600"
                        />

                        <DoctorStat
                            title="Active Doctors"
                            value={activeDoctors}
                            icon={
                                <CheckCircle2
                                    size={21}
                                />
                            }
                            className="bg-emerald-50 text-emerald-600"
                        />

                        <DoctorStat
                            title="Inactive Doctors"
                            value={inactiveDoctors}
                            icon={
                                <XCircle size={21} />
                            }
                            className="bg-red-50 text-red-600"
                        />
                    </div>

                    {/* =================================================
              SEARCH / FILTER
          ================================================= */}

                    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="relative w-full xl:max-w-md">
                                <Search
                                    size={19}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Search doctor, hospital, department..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <FilterButton
                                    label="All"
                                    count={totalDoctors}
                                    active={
                                        filter === "ALL"
                                    }
                                    onClick={() =>
                                        setFilter("ALL")
                                    }
                                />

                                <FilterButton
                                    label="Active"
                                    count={activeDoctors}
                                    active={
                                        filter === "ACTIVE"
                                    }
                                    onClick={() =>
                                        setFilter("ACTIVE")
                                    }
                                />

                                <FilterButton
                                    label="Inactive"
                                    count={inactiveDoctors}
                                    active={
                                        filter === "INACTIVE"
                                    }
                                    onClick={() =>
                                        setFilter("INACTIVE")
                                    }
                                />
                            </div>

                            {/* HOSPITAL FILTER */}

                            <select
                                value={hospitalFilter}
                                onChange={(event) =>
                                    setHospitalFilter(
                                        event.target.value,
                                    )
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="ALL">
                                    All Hospitals
                                </option>

                                {hospitals.map(
                                    (hospital) => (
                                        <option
                                            key={
                                                hospital._id
                                            }
                                            value={
                                                hospital._id
                                            }
                                        >
                                            {hospital.name}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                    </div>

                    {/* =================================================
              TABLE
          ================================================= */}

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {filteredDoctors.length ===
                            0 ? (
                            <EmptyDoctorState />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1100px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Doctor
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Email
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Hospital
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Department
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
                                        {filteredDoctors.map(
                                            (doctor) => (
                                                <DoctorRow
                                                    key={
                                                        doctor._id
                                                    }
                                                    doctor={
                                                        doctor
                                                    }
                                                    onView={() => {
                                                        setSelectedDoctor(
                                                            doctor,
                                                        );

                                                        setModal(
                                                            "DETAILS",
                                                        );
                                                    }}
                                                    onEdit={() => {
                                                        setSelectedDoctor(
                                                            doctor,
                                                        );

                                                        setModal(
                                                            "EDIT",
                                                        );
                                                    }}
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

            {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

            {modal === "DETAILS" &&
                selectedDoctor && (
                    <DoctorDetailsModal
                        doctor={
                            selectedDoctor
                        }
                        onClose={() => {
                            setModal("NONE");
                            setSelectedDoctor(
                                null,
                            );
                        }}
                        onEdit={() =>
                            setModal("EDIT")
                        }
                    />
                )}

            {/* =====================================================
          CREATE MODAL
      ===================================================== */}

            {modal === "CREATE" && (
                <DoctorFormModal
                    mode="create"
                    title="Add Doctor"
                    hospitals={hospitals}
                    saving={saving}
                    onClose={() =>
                        setModal("NONE")
                    }
                    onSubmit={handleCreate}
                />
            )}

            {/* =====================================================
          EDIT MODAL
      ===================================================== */}

            {modal === "EDIT" &&
                selectedDoctor && (
                    <DoctorFormModal
                        mode="edit"
                        title="Edit Doctor"
                        doctor={
                            selectedDoctor
                        }
                        hospitals={hospitals}
                        saving={saving}
                        onClose={() =>
                            setModal("NONE")
                        }
                        onSubmit={handleUpdate}
                    />
                )}
        </>
    );
};

export default SuperDoctors;

/* =========================================================
   STAT
========================================================= */

const DoctorStat = ({
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
            {value}
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
        className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${active
            ? "bg-blue-600 text-white"
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
   DOCTOR ROW
========================================================= */

const DoctorRow = ({
    doctor,
    onView,
    onEdit,
    onStatusChange,
}: {
    doctor: Doctor;
    onView: () => void;
    onEdit: () => void;
    onStatusChange: (
        doctor: Doctor,
    ) => void;
}) => {
    const isActive =
        doctor.status === "ACTIVE";

    return (
        <tr className="transition hover:bg-slate-50">
            {/* DOCTOR */}

            <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
                        {safeString(
                            doctor.name,
                        )
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div>
                        <p className="font-semibold text-slate-900">
                            {safeString(
                                doctor.name,
                            )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Doctor
                        </p>
                    </div>
                </div>
            </td>

            {/* EMAIL */}

            <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                    <Mail
                        size={16}
                        className="text-slate-400"
                    />

                    <span className="text-sm text-slate-700">
                        {safeString(
                            doctor.email,
                        )}
                    </span>
                </div>
            </td>

            {/* HOSPITAL */}

            <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                    <Hospital
                        size={17}
                        className="text-blue-500"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                        {getDoctorHospitalName(
                            doctor,
                        )}
                    </span>
                </div>
            </td>

            {/* DEPARTMENT */}

            <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                    <Stethoscope
                        size={16}
                        className="text-slate-400"
                    />

                    <span className="text-sm text-slate-700">
                        {getDepartmentName(
                            doctor,
                        )}
                    </span>
                </div>
            </td>

            {/* PHONE */}

            <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                    <Phone
                        size={16}
                        className="text-slate-400"
                    />

                    <span className="text-sm text-slate-700">
                        {safeString(
                            doctor.phone,
                        ) ||
                            "Not available"}
                    </span>
                </div>
            </td>

            {/* STATUS */}

            <td className="px-6 py-5">
                <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                        }`}
                >
                    <span
                        className={`h-2 w-2 rounded-full ${isActive
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
                <div className="flex justify-end gap-1">
                    <ActionButton
                        title="View doctor"
                        onClick={onView}
                    >
                        <Eye size={17} />
                    </ActionButton>

                    <ActionButton
                        title="Edit doctor"
                        onClick={onEdit}
                    >
                        <Edit size={17} />
                    </ActionButton>

                    <button
                        type="button"
                        title={
                            isActive
                                ? "Deactivate doctor"
                                : "Activate doctor"
                        }
                        onClick={() =>
                            onStatusChange(
                                doctor,
                            )
                        }
                        className={`rounded-lg p-2 ${isActive
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
        className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
    >
        {children}
    </button>
);

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyDoctorState = () => (
    <div className="px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <UserCog size={27} />
        </div>

        <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No doctors found
        </h3>

        <p className="mt-1 text-sm text-slate-500">
            Try changing your search or
            filters.
        </p>
    </div>
);

/* =========================================================
   MODAL WRAPPER
========================================================= */

const ModalWrapper = ({
    children,
    onClose,
}: {
    children: React.ReactNode;
    onClose: () => void;
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
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {children}
        </div>
    </div>
);

/* =========================================================
   DETAILS MODAL
========================================================= */

const DoctorDetailsModal = ({
    doctor,
    onClose,
    onEdit,
}: {
    doctor: Doctor;
    onClose: () => void;
    onEdit: () => void;
}) => (
    <ModalWrapper
        onClose={onClose}
    >
        <div className="border-b border-slate-200 p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
                        {safeString(
                            doctor.name,
                        )
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            {safeString(
                                doctor.name,
                            )}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Doctor
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
            <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem
                    label="Full Name"
                    value={safeString(
                        doctor.name,
                    )}
                />

                <InfoItem
                    label="Email"
                    value={safeString(
                        doctor.email,
                    )}
                    icon={
                        <Mail size={16} />
                    }
                />

                <InfoItem
                    label="Phone"
                    value={
                        safeString(
                            doctor.phone,
                        ) ||
                        "Not available"
                    }
                    icon={
                        <Phone size={16} />
                    }
                />

                <InfoItem
                    label="Hospital"
                    value={getDoctorHospitalName(
                        doctor,
                    )}
                    icon={
                        <Hospital size={16} />
                    }
                />

                <InfoItem
                    label="Department"
                    value={getDepartmentName(
                        doctor,
                    )}
                    icon={
                        <Stethoscope
                            size={16}
                        />
                    }
                />

                <InfoItem
                    label="Role"
                    value="Doctor"
                    icon={
                        <ShieldCheck
                            size={16}
                        />
                    }
                />

                <InfoItem
                    label="Status"
                    value={
                        doctor.status ===
                            "ACTIVE"
                            ? "Active"
                            : "Inactive"
                    }
                />

                <InfoItem
                    label="Created On"
                    value={formatDate(
                        doctor.createdAt,
                    )}
                />
            </div>

            <div className="mt-7 flex justify-end gap-3">
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
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    <Edit size={17} />
                    Edit Doctor
                </button>
            </div>
        </div>
    </ModalWrapper>
);

/* =========================================================
   FORM PROPS
   IMPORTANT:
   CREATE -> CreateDoctorPayload
   EDIT   -> UpdateDoctorPayload
========================================================= */

type DoctorFormModalProps =
    | {
        mode: "create";
        title: string;
        doctor?: undefined;
        hospitals: HospitalType[];
        saving: boolean;
        onClose: () => void;
        onSubmit: (
            payload: CreateDoctorPayload,
        ) => Promise<void>;
    }
    | {
        mode: "edit";
        title: string;
        doctor: Doctor;
        hospitals: HospitalType[];
        saving: boolean;
        onClose: () => void;
        onSubmit: (
            payload: UpdateDoctorPayload,
        ) => Promise<void>;
    };

/* =========================================================
   FORM MODAL
========================================================= */

const DoctorFormModal = (
    props: DoctorFormModalProps,
) => {
    const {
        title,
        doctor,
        hospitals,
        saving,
        onClose,
    } = props;

    const isEdit =
        props.mode === "edit";

    const [name, setName] =
        useState(
            doctor?.name ?? "",
        );

    const [email, setEmail] =
        useState(
            doctor?.email ?? "",
        );

    const [phone, setPhone] =
        useState(
            doctor?.phone ?? "",
        );

    const [hospitalId, setHospitalId] =
        useState(
            doctor?.hospitalId ?? "",
        );

    const [departmentId, setDepartmentId] =
        useState(
            doctor?.departmentId ?? "",
        );

    const [password, setPassword] =
        useState("");

    const [error, setError] =
        useState("");

    const [departments, setDepartments] =
        useState<Department[]>([]);

    const [loadingDepartments, setLoadingDepartments] =
        useState(false);

    /* =========================================================
       LOAD DEPARTMENTS WHEN HOSPITAL CHANGES
    ========================================================= */

    useEffect(() => {
        let cancelled = false;

        const loadDepartments =
            async () => {
                if (!hospitalId) {
                    setDepartments([]);
                    setDepartmentId("");
                    return;
                }

                try {
                    setLoadingDepartments(
                        true,
                    );

                    setError("");

                    const data =
                        await getDepartments(
                            hospitalId,
                        );

                    if (!cancelled) {
                        setDepartments(
                            Array.isArray(
                                data,
                            )
                                ? data
                                : [],
                        );

                        /*
                         * EDIT MODE:
                         * Keep existing department
                         * only if it belongs to
                         * selected hospital.
                         */
                        if (
                            isEdit &&
                            doctor?.departmentId
                        ) {
                            const exists =
                                data.some(
                                    (
                                        department,
                                    ) =>
                                        department._id ===
                                        doctor.departmentId,
                                );

                            if (
                                exists
                            ) {
                                setDepartmentId(
                                    doctor.departmentId,
                                );
                            } else {
                                setDepartmentId(
                                    "",
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.error(
                        "Failed to load departments:",
                        error,
                    );

                    if (!cancelled) {
                        setDepartments(
                            [],
                        );

                        setDepartmentId(
                            "",
                        );

                        setError(
                            "Unable to load departments for this hospital.",
                        );
                    }
                } finally {
                    if (!cancelled) {
                        setLoadingDepartments(
                            false,
                        );
                    }
                }
            };

        loadDepartments();

        return () => {
            cancelled = true;
        };
    }, [
        hospitalId,
        isEdit,
        doctor?.departmentId,
    ]);

    /* =========================================================
       HOSPITAL CHANGE
    ========================================================= */

    const handleHospitalChange = (
        value: string,
    ) => {
        setHospitalId(value);

        /*
         * Always clear department when
         * hospital changes.
         */
        setDepartmentId("");

        setDepartments([]);

        setError("");
    };

    /* =========================================================
       SUBMIT
    ========================================================= */

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        setError("");

        /* -----------------------------------------
           NAME
        ----------------------------------------- */

        if (!name.trim()) {
            setError(
                "Doctor name is required.",
            );
            return;
        }

        /* -----------------------------------------
           EMAIL
        ----------------------------------------- */

        if (!email.trim()) {
            setError(
                "Email is required.",
            );
            return;
        }

        /* -----------------------------------------
           HOSPITAL
        ----------------------------------------- */

        if (!hospitalId) {
            setError(
                "Hospital is required.",
            );
            return;
        }

        /* -----------------------------------------
           DEPARTMENT
        ----------------------------------------- */

        if (!departmentId) {
            setError(
                "Department is required.",
            );
            return;
        }

        /* -----------------------------------------
           CREATE PASSWORD
        ----------------------------------------- */

        if (
            !isEdit &&
            !password.trim()
        ) {
            setError(
                "Password is required.",
            );
            return;
        }

        try {
            /* =========================================
               EDIT
            ========================================= */

            if (isEdit) {
                const payload: UpdateDoctorPayload =
                    {
                        name:
                            name.trim(),

                        email:
                            email
                                .trim()
                                .toLowerCase(),

                        phone:
                            phone.trim()
                                ? phone.trim()
                                : undefined,

                        hospitalId,

                        departmentId,
                    };

                await props.onSubmit(
                    payload,
                );

                return;
            }

            /* =========================================
               CREATE
            ========================================= */

            const payload: CreateDoctorPayload =
                {
                    name:
                        name.trim(),

                    email:
                        email
                            .trim()
                            .toLowerCase(),

                    phone:
                        phone.trim()
                            ? phone.trim()
                            : undefined,

                    password:
                        password.trim(),

                    hospitalId,

                    departmentId,
                };

            await props.onSubmit(
                payload,
            );
        } catch (error) {
            console.error(
                "Save doctor error:",
                error,
            );

            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to save doctor.",
            );
        }
    };

    return (
        <ModalWrapper
            onClose={onClose}
        >
            {/* HEADER */}

            <div className="border-b border-slate-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            {title}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {isEdit
                                ? "Update doctor information."
                                : "Create a new doctor account."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={21} />
                    </button>
                </div>
            </div>

            {/* FORM */}

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
                    {/* NAME */}

                    <FormInput
                        label="Doctor Name"
                        required
                        value={name}
                        onChange={
                            setName
                        }
                    />

                    {/* EMAIL */}

                    <FormInput
                        label="Email"
                        type="email"
                        required
                        value={email}
                        onChange={
                            setEmail
                        }
                    />

                    {/* PHONE */}

                    <FormInput
                        label="Phone"
                        value={phone}
                        onChange={
                            setPhone
                        }
                    />

                    {/* HOSPITAL */}

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Hospital
                            <span className="ml-1 text-red-500">
                                *
                            </span>
                        </label>

                        <select
                            value={
                                hospitalId
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
                                saving
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <option value="">
                                Select Hospital
                            </option>

                            {hospitals.map(
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
                    </div>

                    {/* DEPARTMENT */}

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Department
                            <span className="ml-1 text-red-500">
                                *
                            </span>
                        </label>

                        <select
                            value={
                                departmentId
                            }
                            onChange={(
                                event,
                            ) =>
                                setDepartmentId(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            disabled={
                                !hospitalId ||
                                loadingDepartments ||
                                saving
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <option value="">
                                {loadingDepartments
                                    ? "Loading departments..."
                                    : "Select Department"}
                            </option>

                            {departments.map(
                                (
                                    department,
                                ) => (
                                    <option
                                        key={
                                            department._id
                                        }
                                        value={
                                            department._id
                                        }
                                    >
                                        {
                                            department.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>

                        {!hospitalId && (
                            <p className="mt-1 text-xs text-slate-400">
                                Select a hospital first.
                            </p>
                        )}

                        {hospitalId &&
                            !loadingDepartments &&
                            departments.length ===
                                0 && (
                                <p className="mt-1 text-xs text-red-500">
                                    No departments available for this hospital.
                                </p>
                            )}
                    </div>

                    {/* PASSWORD */}

                    {!isEdit && (
                        <FormInput
                            label="Temporary Password"
                            type="password"
                            required
                            value={
                                password
                            }
                            onChange={
                                setPassword
                            }
                        />
                    )}
                </div>

                {/* ACCESS INFORMATION */}

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex gap-3">
                        <ShieldCheck
                            size={19}
                            className="mt-0.5 shrink-0 text-blue-600"
                        />

                        <div>
                            <p className="text-sm font-semibold text-blue-900">
                                Doctor Access
                            </p>

                            <p className="mt-1 text-xs leading-5 text-blue-700">
                                The doctor will manage
                                their assigned patient
                                queue for the selected
                                hospital and department.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        disabled={
                            saving
                        }
                        onClick={
                            onClose
                        }
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={
                            saving ||
                            loadingDepartments
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving && (
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                        )}

                        {isEdit
                            ? "Update Doctor"
                            : "Create Doctor"}
                    </button>
                </div>
            </form>
        </ModalWrapper>
    );
};
/* =========================================================
   INPUT
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
                <span className="text-slate-400">
                    {icon}
                </span>
            )}

            <p className="text-sm font-semibold text-slate-900">
                {value ||
                    "Not available"}
            </p>
        </div>
    </div>
);

/* =========================================================
   DATE
========================================================= */

const formatDate = (
    date?: string,
): string => {
    if (!date) {
        return "Not available";
    }

    const parsed =
        new Date(date);

    if (
        Number.isNaN(
            parsed.getTime(),
        )
    ) {
        return "Not available";
    }

    return parsed.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        },
    );
};