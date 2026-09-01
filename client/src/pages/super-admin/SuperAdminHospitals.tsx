import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Edit,
  Eye,
  Hospital,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Ticket,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  createSuperAdminHospital,
  getHospitalDashboard,
  getSuperAdminHospitals,
  getSuperAdminHospital,
  updateHospitalStatus,
  updateSuperAdminHospital,
  type Hospital as HospitalType,
  type CreateHospitalPayload,
  type UpdateHospitalPayload,
} from "../../services/superAdmin.api";

/* =========================================================
   TYPES
========================================================= */

type FilterType = "ALL" | "ACTIVE" | "INACTIVE";

type ModalType =
  | "NONE"
  | "DETAILS"
  | "CREATE"
  | "EDIT"
  | "DASHBOARD";

type HospitalFormPayload =
  | CreateHospitalPayload
  | UpdateHospitalPayload;

/* =========================================================
   HELPERS
========================================================= */

const safeNumber = (value: unknown): number => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

const safeString = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const SuperAdminHospitals = () => {
  const [hospitals, setHospitals] = useState<HospitalType[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<FilterType>("ALL");

  const [modal, setModal] = useState<ModalType>("NONE");

  const [selectedHospital, setSelectedHospital] =
    useState<HospitalType | null>(null);

  /* =======================================================
     LOAD HOSPITALS
  ======================================================= */

  const loadHospitals = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const response = await getSuperAdminHospitals();

        if (!response.success) {
          throw new Error(
            response.message || "Unable to load hospitals",
          );
        }

        setHospitals(response.data ?? []);
      } catch (error: any) {
        console.error("Hospital loading error:", error);

        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load hospitals",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  /* =======================================================
     FILTERED HOSPITALS
  ======================================================= */

  const filteredHospitals = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return hospitals.filter((hospital) => {
      const matchesSearch =
        !searchValue ||
        safeString(hospital.name)
          .toLowerCase()
          .includes(searchValue) ||
        safeString(hospital.email)
          .toLowerCase()
          .includes(searchValue) ||
        safeString(hospital.city)
          .toLowerCase()
          .includes(searchValue) ||
        safeString(hospital.phone)
          .toLowerCase()
          .includes(searchValue) ||
        safeString(hospital.registrationNumber)
          .toLowerCase()
          .includes(searchValue);

      const matchesFilter =
        filter === "ALL" ||
        (filter === "ACTIVE" && hospital.isActive) ||
        (filter === "INACTIVE" && !hospital.isActive);

      return matchesSearch && matchesFilter;
    });
  }, [hospitals, search, filter]);

  /* =======================================================
     HOSPITAL STATISTICS
  ======================================================= */

  const totalHospitals = hospitals.length;

  const activeHospitals = hospitals.filter(
    (hospital) => hospital.isActive,
  ).length;

  const inactiveHospitals = hospitals.filter(
    (hospital) => !hospital.isActive,
  ).length;

  /* =======================================================
     STATUS CHANGE
  ======================================================= */

  const handleStatusChange = async (hospital: HospitalType) => {
    const newStatus = !hospital.isActive;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        newStatus ? "activate" : "deactivate"
      } ${hospital.name}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await updateHospitalStatus(
        hospital._id,
        newStatus,
      );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to update hospital status",
        );
      }

      setHospitals((current) =>
        current.map((item) =>
          item._id === hospital._id
            ? {
                ...item,
                isActive: newStatus,
              }
            : item,
        ),
      );
    } catch (error: any) {
      console.error("Status update error:", error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to update hospital status",
      );
    }
  };

  /* =======================================================
     VIEW HOSPITAL DETAILS
  ======================================================= */

  const handleViewDetails = async (
    hospital: HospitalType,
  ) => {
    setSelectedHospital(hospital);
    setModal("DETAILS");

    try {
      const response = await getSuperAdminHospital(
        hospital._id,
      );

      if (response.success && response.data) {
        setSelectedHospital(response.data);
      }
    } catch (error) {
      console.error(
        "Hospital details error:",
        error,
      );
    }
  };

  /* =======================================================
     CREATE HOSPITAL
  ======================================================= */

  const handleCreate = async (
    payload: CreateHospitalPayload,
  ) => {
    const response =
      await createSuperAdminHospital(payload);

    if (!response.success) {
      throw new Error(
        response.message ||
          "Unable to create hospital",
      );
    }

    setModal("NONE");
    setSelectedHospital(null);

    await loadHospitals(false);

    alert("Hospital created successfully");
  };

  /* =======================================================
     EDIT HOSPITAL
  ======================================================= */

  const handleEdit = async (
    payload: UpdateHospitalPayload,
  ) => {
    if (!selectedHospital) {
      throw new Error(
        "No hospital selected",
      );
    }

    const response =
      await updateSuperAdminHospital(
        selectedHospital._id,
        payload,
      );

    if (!response.success) {
      throw new Error(
        response.message ||
          "Unable to update hospital",
      );
    }

    setModal("NONE");

    await loadHospitals(false);

    alert("Hospital updated successfully");
  };

  /* =======================================================
     IMPORTANT:
     SINGLE FORM SUBMIT HANDLER
     
     This fixes:
     CreateHospitalPayload vs UpdateHospitalPayload
     TypeScript incompatibility.
  ======================================================= */

  const handleHospitalFormSubmit = async (
    payload: HospitalFormPayload,
  ) => {
    if (modal === "CREATE") {
      await handleCreate(
        payload as CreateHospitalPayload,
      );

      return;
    }

    if (modal === "EDIT") {
      await handleEdit(
        payload as UpdateHospitalPayload,
      );

      return;
    }

    throw new Error(
      "Invalid hospital form action",
    );
  };

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  const handleOpenEdit = (
    hospital: HospitalType,
  ) => {
    setSelectedHospital(hospital);
    setModal("EDIT");
  };

  /* =======================================================
     OPEN DASHBOARD
  ======================================================= */

  const handleHospitalDashboard = (
    hospital: HospitalType,
  ) => {
    setSelectedHospital(hospital);
    setModal("DASHBOARD");
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal = () => {
    setModal("NONE");
    setSelectedHospital(null);
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={34}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading hospitals...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <XCircle
          size={42}
          className="mx-auto text-red-500"
        />

        <h2 className="mt-4 text-lg font-bold text-red-900">
          Unable to load hospitals
        </h2>

        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>

        <button
          type="button"
          onClick={() => loadHospitals()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw size={17} />
          Try Again
        </button>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hospital Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage all hospitals registered
            on NexTurn.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              loadHospitals(false)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedHospital(null);
              setModal("CREATE");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={18} />

            Add Hospital
          </button>
        </div>
      </div>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <HospitalStat
          title="Total Hospitals"
          value={totalHospitals}
          icon={<Building2 size={21} />}
          className="bg-blue-50 text-blue-600"
        />

        <HospitalStat
          title="Active Hospitals"
          value={activeHospitals}
          icon={<CheckCircle2 size={21} />}
          className="bg-emerald-50 text-emerald-600"
        />

        <HospitalStat
          title="Inactive Hospitals"
          value={inactiveHospitals}
          icon={<XCircle size={21} />}
          className="bg-red-50 text-red-600"
        />
      </div>

      {/* =================================================
          SEARCH + FILTER
      ================================================= */}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search hospital, email, city..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              label="All"
              count={totalHospitals}
              active={filter === "ALL"}
              onClick={() => setFilter("ALL")}
            />

            <FilterButton
              label="Active"
              count={activeHospitals}
              active={filter === "ACTIVE"}
              onClick={() =>
                setFilter("ACTIVE")
              }
            />

            <FilterButton
              label="Inactive"
              count={inactiveHospitals}
              active={filter === "INACTIVE"}
              onClick={() =>
                setFilter("INACTIVE")
              }
            />
          </div>
        </div>
      </div>

      {/* =================================================
          HOSPITAL TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {filteredHospitals.length === 0 ? (
          <EmptyHospitals />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <TableHeader>
                    Hospital
                  </TableHeader>

                  <TableHeader>
                    Contact
                  </TableHeader>

                  <TableHeader>
                    Doctors
                  </TableHeader>

                  <TableHeader>
                    Patients
                  </TableHeader>

                  <TableHeader>
                    Departments
                  </TableHeader>

                  <TableHeader>
                    Today's Tokens
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <TableHeader align="right">
                    Actions
                  </TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredHospitals.map(
                  (hospital) => (
                    <HospitalRow
                      key={hospital._id}
                      hospital={hospital}
                      onDetails={
                        handleViewDetails
                      }
                      onEdit={
                        handleOpenEdit
                      }
                      onStatusChange={
                        handleStatusChange
                      }
                      onDashboard={
                        handleHospitalDashboard
                      }
                    />
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          CREATE MODAL
      ================================================= */}

      {modal === "CREATE" && (
        <HospitalFormModal
          title="Add Hospital"
          onClose={closeModal}
          onSubmit={
            handleHospitalFormSubmit
          }
        />
      )}

      {/* =================================================
          EDIT MODAL
      ================================================= */}

      {modal === "EDIT" &&
        selectedHospital && (
          <HospitalFormModal
            title="Edit Hospital"
            hospital={selectedHospital}
            onClose={closeModal}
            onSubmit={
              handleHospitalFormSubmit
            }
          />
        )}

      {/* =================================================
          DETAILS MODAL
      ================================================= */}

      {modal === "DETAILS" &&
        selectedHospital && (
          <HospitalDetailsModal
            hospital={selectedHospital}
            onClose={closeModal}
            onEdit={() =>
              setModal("EDIT")
            }
            onDashboard={() =>
              handleHospitalDashboard(
                selectedHospital,
              )
            }
          />
        )}

      {/* =================================================
          HOSPITAL DASHBOARD
      ================================================= */}

      {modal === "DASHBOARD" &&
        selectedHospital && (
          <HospitalDashboardModal
            hospital={selectedHospital}
            onClose={closeModal}
          />
        )}
    </>
  );
};

export default SuperAdminHospitals;

/* =========================================================
   TABLE HEADER
========================================================= */

const TableHeader = ({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) => (
  <th
    className={`px-6 py-4 text-${align} text-xs font-semibold uppercase tracking-wider text-slate-500`}
  >
    {children}
  </th>
);

/* =========================================================
   HOSPITAL STAT
========================================================= */

const HospitalStat = ({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  className: string;
}) => {
  const safeValue = safeNumber(value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${className}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {safeValue.toLocaleString()}
      </p>
    </div>
  );
};

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
        ? "bg-blue-600 text-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`}
  >
    {label}

    <span className="ml-1 opacity-75">
      {safeNumber(count)}
    </span>
  </button>
);

/* =========================================================
   HOSPITAL ROW
========================================================= */

const HospitalRow = ({
  hospital,
  onDetails,
  onEdit,
  onStatusChange,
  onDashboard,
}: {
  hospital: HospitalType;
  onDetails: (hospital: HospitalType) => void;
  onEdit: (hospital: HospitalType) => void;
  onStatusChange: (hospital: HospitalType) => void;
  onDashboard: (hospital: HospitalType) => void;
}) => {
  const stats = hospital.stats;

  const doctors = safeNumber(
    stats?.doctors ??
      hospital.totalDoctors,
  );

  const patients = safeNumber(
    stats?.patients ??
      hospital.totalPatients,
  );

  const departments = safeNumber(
    stats?.departments ??
      hospital.totalDepartments,
  );

  const tokens = safeNumber(
    stats?.todayTokens ??
      hospital.todayTokens,
  );

  return (
    <tr className="transition hover:bg-slate-50">
      {/* HOSPITAL */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Hospital size={21} />
          </div>

          <div>
            <p className="font-semibold text-slate-900">
              {hospital.name ||
                "Unnamed Hospital"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {hospital.registrationNumber ||
                "No registration number"}
            </p>
          </div>
        </div>
      </td>

      {/* CONTACT */}

      <td className="px-6 py-5">
        <p className="text-sm text-slate-700">
          {hospital.email ||
            "No email"}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {hospital.phone ||
            "No phone"}
        </p>
      </td>

      {/* DOCTORS */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <Stethoscope
            size={17}
            className="text-blue-500"
          />

          <span className="font-semibold text-slate-900">
            {doctors.toLocaleString()}
          </span>
        </div>
      </td>

      {/* PATIENTS */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <Users
            size={17}
            className="text-purple-500"
          />

          <span className="font-semibold text-slate-900">
            {patients.toLocaleString()}
          </span>
        </div>
      </td>

      {/* DEPARTMENTS */}

      <td className="px-6 py-5">
        <span className="font-semibold text-slate-900">
          {departments.toLocaleString()}
        </span>
      </td>

      {/* TOKENS */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <Ticket
            size={17}
            className="text-orange-500"
          />

          <span className="font-semibold text-slate-900">
            {tokens.toLocaleString()}
          </span>
        </div>
      </td>

      {/* STATUS */}

      <td className="px-6 py-5">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            hospital.isActive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              hospital.isActive
                ? "bg-emerald-500"
                : "bg-red-500"
            }`}
          />

          {hospital.isActive
            ? "Active"
            : "Inactive"}
        </span>
      </td>

      {/* ACTIONS */}

      <td className="px-6 py-5">
        <div className="flex items-center justify-end gap-1">
          <ActionButton
            title="View details"
            onClick={() =>
              onDetails(hospital)
            }
          >
            <Eye size={17} />
          </ActionButton>

          <ActionButton
            title="Hospital dashboard"
            onClick={() =>
              onDashboard(hospital)
            }
          >
            <ChevronRight size={17} />
          </ActionButton>

          <ActionButton
            title="Edit hospital"
            onClick={() =>
              onEdit(hospital)
            }
          >
            <Edit size={17} />
          </ActionButton>

          <button
            type="button"
            onClick={() =>
              onStatusChange(hospital)
            }
            className={`rounded-lg p-2 transition ${
              hospital.isActive
                ? "text-red-500 hover:bg-red-50"
                : "text-emerald-500 hover:bg-emerald-50"
            }`}
            title={
              hospital.isActive
                ? "Deactivate"
                : "Activate"
            }
          >
            {hospital.isActive ? (
              <XCircle size={17} />
            ) : (
              <CheckCircle2 size={17} />
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
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
  >
    {children}
  </button>
);

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyHospitals = () => (
  <div className="px-6 py-16 text-center">
    <Building2
      size={42}
      className="mx-auto text-slate-300"
    />

    <h3 className="mt-4 text-lg font-semibold text-slate-900">
      No hospitals found
    </h3>

    <p className="mt-1 text-sm text-slate-500">
      Try changing your search or filter.
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
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
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

const HospitalDetailsModal = ({
  hospital,
  onClose,
  onEdit,
  onDashboard,
}: {
  hospital: HospitalType;
  onClose: () => void;
  onEdit: () => void;
  onDashboard: () => void;
}) => {
  const stats = hospital.stats;

  const doctors = safeNumber(
    stats?.doctors ??
      hospital.totalDoctors,
  );

  const receptionists = safeNumber(
    stats?.receptionists ??
      hospital.totalReceptionists,
  );

  const patients = safeNumber(
    stats?.patients ??
      hospital.totalPatients,
  );

  const departments = safeNumber(
    stats?.departments ??
      hospital.totalDepartments,
  );

  const todayTokens = safeNumber(
    stats?.todayTokens ??
      hospital.todayTokens,
  );

  return (
    <ModalWrapper onClose={onClose}>
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Hospital size={27} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {hospital.name}
              </h2>

              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  hospital.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {hospital.isActive
                  ? "Active"
                  : "Inactive"}
              </span>
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <DetailStat
            label="Doctors"
            value={doctors}
            icon={<Stethoscope size={18} />}
          />

          <DetailStat
            label="Receptionists"
            value={receptionists}
            icon={<Users size={18} />}
          />

          <DetailStat
            label="Patients"
            value={patients}
            icon={<Users size={18} />}
          />

          <DetailStat
            label="Departments"
            value={departments}
            icon={<Building2 size={18} />}
          />

          <DetailStat
            label="Today's Tokens"
            value={todayTokens}
            icon={<Ticket size={18} />}
          />
        </div>

        <div className="mt-7">
          <h3 className="font-bold text-slate-900">
            Hospital Information
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem
              label="Email"
              value={hospital.email}
            />

            <InfoItem
              label="Phone"
              value={hospital.phone}
              icon={<Phone size={16} />}
            />

            <InfoItem
              label="Registration Number"
              value={
                hospital.registrationNumber
              }
            />

            <InfoItem
              label="City"
              value={hospital.city}
              icon={<MapPin size={16} />}
            />

            <InfoItem
              label="State"
              value={hospital.state}
            />

            <InfoItem
              label="Pincode"
              value={hospital.pincode}
            />
          </div>

          <div className="mt-4">
            <InfoItem
              label="Address"
              value={hospital.address}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
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
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-100"
          >
            <Edit size={17} />
            Edit
          </button>

          <button
            type="button"
            onClick={onDashboard}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Eye size={17} />
            Open Dashboard
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

/* =========================================================
   DETAIL STAT
========================================================= */

const DetailStat = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) => {
  const safeValue = safeNumber(value);

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {safeValue.toLocaleString()}
      </p>
    </div>
  );
};

/* =========================================================
   INFO ITEM
========================================================= */

const InfoItem = ({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon?: ReactNode;
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
        {value || "Not available"}
      </p>
    </div>
  </div>
);

/* =========================================================
   HOSPITAL FORM MODAL
========================================================= */

const HospitalFormModal = ({
  title,
  hospital,
  onClose,
  onSubmit,
}: {
  title: string;
  hospital?: HospitalType;
  onClose: () => void;

  /*
    IMPORTANT:
    The modal accepts both payload types.
    Parent handles which one should be used.
  */
  onSubmit: (
    payload: HospitalFormPayload,
  ) => Promise<void>;
}) => {
  const [form, setForm] =
    useState<CreateHospitalPayload>({
      name: hospital?.name ?? "",
      email: hospital?.email ?? "",
      phone: hospital?.phone ?? "",
      address: hospital?.address ?? "",
      city: hospital?.city ?? "",
      state: hospital?.state ?? "",
      pincode: hospital?.pincode ?? "",
      registrationNumber:
        hospital?.registrationNumber ?? "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     CHANGE
  ======================================================= */

  const handleChange = (
    field: keyof CreateHospitalPayload,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError(
        "Hospital name is required",
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload: CreateHospitalPayload = {
        ...form,
        name,
      };

      await onSubmit(payload);
    } catch (error: any) {
      console.error(
        "Hospital form error:",
        error,
      );

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save hospital",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {hospital
                ? "Update hospital information."
                : "Add a new hospital to NexTurn."}
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
        onSubmit={handleSubmit}
        className="space-y-5 p-6"
      >
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput
            label="Hospital Name"
            required
            value={form.name ?? ""}
            onChange={(value) =>
              handleChange(
                "name",
                value,
              )
            }
          />

          <FormInput
            label="Registration Number"
            value={
              form.registrationNumber ??
              ""
            }
            onChange={(value) =>
              handleChange(
                "registrationNumber",
                value,
              )
            }
          />

          <FormInput
            label="Email"
            type="email"
            value={form.email ?? ""}
            onChange={(value) =>
              handleChange(
                "email",
                value,
              )
            }
          />

          <FormInput
            label="Phone"
            value={form.phone ?? ""}
            onChange={(value) =>
              handleChange(
                "phone",
                value,
              )
            }
          />

          <FormInput
            label="City"
            value={form.city ?? ""}
            onChange={(value) =>
              handleChange(
                "city",
                value,
              )
            }
          />

          <FormInput
            label="State"
            value={form.state ?? ""}
            onChange={(value) =>
              handleChange(
                "state",
                value,
              )
            }
          />

          <FormInput
            label="Pincode"
            value={form.pincode ?? ""}
            onChange={(value) =>
              handleChange(
                "pincode",
                value,
              )
            }
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Address
          </label>

          <textarea
            value={form.address ?? ""}
            onChange={(event) =>
              handleChange(
                "address",
                event.target.value,
              )
            }
            rows={3}
            placeholder="Hospital full address"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {hospital
              ? "Update Hospital"
              : "Create Hospital"}
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
  onChange: (value: string) => void;
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
        onChange(event.target.value)
      }
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
    />
  </div>
);

/* =========================================================
   HOSPITAL DASHBOARD MODAL
========================================================= */

interface HospitalDashboardData {
  doctors?: number;
  receptionists?: number;
  patients?: number;
  departments?: number;
  todayTokens?: number;

  queue?: {
    waiting?: number;
    called?: number;
    serving?: number;
    completed?: number;
    skipped?: number;
  };
}

const HospitalDashboardModal = ({
  hospital,
  onClose,
}: {
  hospital: HospitalType;
  onClose: () => void;
}) => {
  const [data, setData] =
    useState<HospitalDashboardData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getHospitalDashboard(
            hospital._id,
          );

        if (!response.success) {
          throw new Error(
            response.message ||
              "Unable to load hospital dashboard",
          );
        }

        if (mounted) {
          setData(
            response.data as HospitalDashboardData,
          );
        }
      } catch (error: any) {
        console.error(
          "Hospital dashboard error:",
          error,
        );

        if (mounted) {
          setError(
            error?.response?.data?.message ||
              error?.message ||
              "Unable to load dashboard",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [hospital._id]);

  return (
    <ModalWrapper
      onClose={onClose}
      width="max-w-5xl"
    >
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Hospital Dashboard
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {hospital.name}
            </h2>
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
        {loading && (
          <div className="py-16 text-center">
            <Loader2
              size={32}
              className="mx-auto animate-spin text-blue-600"
            />

            <p className="mt-3 text-sm text-slate-500">
              Loading hospital statistics...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <DetailStat
                label="Doctors"
                value={safeNumber(
                  data.doctors,
                )}
                icon={
                  <Stethoscope size={18} />
                }
              />

              <DetailStat
                label="Receptionists"
                value={safeNumber(
                  data.receptionists,
                )}
                icon={
                  <Users size={18} />
                }
              />

              <DetailStat
                label="Patients"
                value={safeNumber(
                  data.patients,
                )}
                icon={
                  <Users size={18} />
                }
              />

              <DetailStat
                label="Departments"
                value={safeNumber(
                  data.departments,
                )}
                icon={
                  <Building2 size={18} />
                }
              />

              <DetailStat
                label="Today's Tokens"
                value={safeNumber(
                  data.todayTokens,
                )}
                icon={
                  <Ticket size={18} />
                }
              />
            </div>

            <div className="mt-7">
              <h3 className="font-bold text-slate-900">
                Today's Queue
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <QueueValue
                  label="Waiting"
                  value={safeNumber(
                    data.queue?.waiting,
                  )}
                />

                <QueueValue
                  label="Called"
                  value={safeNumber(
                    data.queue?.called,
                  )}
                />

                <QueueValue
                  label="Serving"
                  value={safeNumber(
                    data.queue?.serving,
                  )}
                />

                <QueueValue
                  label="Completed"
                  value={safeNumber(
                    data.queue?.completed,
                  )}
                />

                <QueueValue
                  label="Skipped"
                  value={safeNumber(
                    data.queue?.skipped,
                  )}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </ModalWrapper>
  );
};

/* =========================================================
   QUEUE VALUE
========================================================= */

const QueueValue = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => {
  const safeValue = safeNumber(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {safeValue.toLocaleString()}
      </p>
    </div>
  );
};