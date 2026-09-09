import {
  Activity,
  AlertCircle,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Crown,
  CreditCard,
  Edit,
  Eye,
  EyeOff,
  Hospital,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Ticket,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  activateHospitalSubscription,
  createSuperAdminHospital,
  getHospitalDashboard,
  getHospitalSubscription,
  getHospitalSubscriptionExpiry,
  getSubscriptionRemainingDays,
  getSuperAdminHospital,
  getSuperAdminHospitals,
  updateHospitalStatus,
  updateSuperAdminHospital,

  type ActivateHospitalSubscriptionPayload,
  type CreateHospitalPayload,
  type Hospital as HospitalType,
  type HospitalDashboardData,
  type HospitalPlan,
  type HospitalSubscription,
  type SubscriptionStatus,
  type UpdateHospitalPayload,
} from "../../services/super-admin/superAdmin.api";
import { getDistrictsByState, INDIA_STATES } from "../../store/indiaLocations";

/* ============================================================
   TYPES
============================================================ */

type HospitalStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE";

type PlanFilter =
  | "ALL"
  | "BASIC"
  | "PREMIUM";

type SubscriptionFilter =
  | "ALL"
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED";

type ModalType =
  | "NONE"
  | "CREATE"
  | "EDIT"
  | "DETAILS"
  | "DASHBOARD"
  | "SUBSCRIPTION";

interface CreateHospitalFormState {
  hospitalName: string;

  publicName: string;

  adminName: string;

  email: string;

  phone: string;

  password: string;

  addressLine: string;

  city: string;

  district: string;

  state: string;

  country: string;

  pincode: string;

  publicAddress: string;

  publicBookingEnabled: boolean;

  registrationNumber: string;
}

interface SubscriptionFormState {
  plan: HospitalPlan;

  durationMonths: number;

  amount: string;

  paymentMethod: string;

  paymentReference: string;
}


/* ============================================================
   HELPERS
============================================================ */

const safeNumber = (
  value: unknown,
): number => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
};

const safeString = (
  value: unknown,
): string => {
  return typeof value ===
    "string"
    ? value
    : "";
};

const formatDate = (
  value?:
    | string
    | null,
): string => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Not available";
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

const formatHospitalAddress = (
  address:
    | HospitalType["address"]
    | undefined,
): string => {

  if (!address) {
    return "Not available";
  }

  /* ======================================================
     OLD STRING FORMAT
  ====================================================== */

  if (
    typeof address === "string"
  ) {
    return (
      address.trim() ||
      "Not available"
    );
  }

  /* ======================================================
     NEW OBJECT FORMAT
  ====================================================== */

  const parts = [
    address.addressLine,
    address.city,
    address.state,
    address.country,
    address.pincode,
  ]
    .filter(
      (
        value,
      ): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    )
    .map(
      (
        value,
      ) =>
        value.trim(),
    );

  return (
    parts.join(", ") ||
    "Not available"
  );
};

const getHospitalAddressLine = (
  hospital:
    HospitalType,
): string => {

  if (
    !hospital.address
  ) {
    return "";
  }

  if (
    typeof hospital.address ===
    "string"
  ) {
    return hospital.address;
  }

  return (
    hospital.address.addressLine ??
    ""
  );
};

const getHospitalCity = (
  hospital:
    HospitalType,
): string => {

  if (
    typeof hospital.city ===
    "string" &&
    hospital.city.trim()
  ) {
    return hospital.city;
  }

  if (
    hospital.address &&
    typeof hospital.address ===
    "object"
  ) {
    return (
      hospital.address.city ??
      ""
    );
  }

  return "";
};

const getHospitalState = (
  hospital:
    HospitalType,
): string => {

  if (
    typeof hospital.state ===
    "string" &&
    hospital.state.trim()
  ) {
    return hospital.state;
  }

  if (
    hospital.address &&
    typeof hospital.address ===
    "object"
  ) {
    return (
      hospital.address.state ??
      ""
    );
  }

  return "";
};

const getHospitalPincode = (
  hospital:
    HospitalType,
): string => {

  if (
    typeof hospital.pincode ===
    "string" &&
    hospital.pincode.trim()
  ) {
    return hospital.pincode;
  }

  if (
    hospital.address &&
    typeof hospital.address ===
    "object"
  ) {
    return (
      hospital.address.pincode ??
      ""
    );
  }

  return "";
};

/* ============================================================
   EFFECTIVE SUBSCRIPTION STATUS
============================================================ */

const getEffectiveSubscriptionStatus = (
  hospital:
    HospitalType,
): SubscriptionStatus => {
  const status =
    hospital.subscriptionStatus;

  const expiry =
    getHospitalSubscriptionExpiry(
      hospital,
    );

  if (
    (
      status ===
      "TRIAL" ||
      status ===
      "ACTIVE"
    ) &&
    expiry
  ) {
    const expiryTime =
      new Date(
        expiry,
      ).getTime();

    if (
      !Number.isNaN(
        expiryTime,
      ) &&
      expiryTime <
      Date.now()
    ) {
      return "EXPIRED";
    }
  }

  /*
   * Do not assume old hospitals have
   * a valid trial if subscription fields
   * are missing.
   */
  return (
    status ??
    "EXPIRED"
  );
};

/* ============================================================
   MAIN
============================================================ */

const SuperAdminHospitals =
  () => {
    /* ========================================================
       DATA
    ======================================================== */

    const [
      hospitals,
      setHospitals,
    ] =
      useState<
        HospitalType[]
      >([]);

    const [
      selectedHospital,
      setSelectedHospital,
    ] =
      useState<
        HospitalType | null
      >(null);

    const [
      expandedHospitalId,
      setExpandedHospitalId,
    ] =
      useState<
        string | null
      >(null);

    /* ========================================================
       PAGE STATE
    ======================================================== */

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
      error,
      setError,
    ] =
      useState("");

    const [
      modal,
      setModal,
    ] =
      useState<
        ModalType
      >("NONE");

    /* ========================================================
       FILTERS
    ======================================================== */

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
        HospitalStatusFilter
      >("ALL");

    const [
      planFilter,
      setPlanFilter,
    ] =
      useState<
        PlanFilter
      >("ALL");

    const [
      subscriptionFilter,
      setSubscriptionFilter,
    ] =
      useState<
        SubscriptionFilter
      >("ALL");

    /* ========================================================
       LOAD HOSPITALS
    ======================================================== */

    const loadHospitals =
      useCallback(
        async (
          fullLoader = true,
        ) => {
          try {
            if (
              fullLoader
            ) {
              setLoading(
                true,
              );
            } else {
              setRefreshing(
                true,
              );
            }

            setError("");

            const response =
              await getSuperAdminHospitals();

            if (
              !response.success
            ) {
              throw new Error(
                response.message ||
                "Unable to load hospitals",
              );
            }

            setHospitals(
              Array.isArray(
                response.data,
              )
                ? response.data
                : [],
            );

          } catch (
          error: any
          ) {
            console.error(
              "LOAD HOSPITALS ERROR:",
              error,
            );

            setError(
              error
                ?.response
                ?.data
                ?.message ||
              error?.message ||
              "Unable to load hospitals",
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

    useEffect(
      () => {
        loadHospitals();
      },
      [
        loadHospitals,
      ],
    );

    /* ========================================================
       FILTER
    ======================================================== */

    const filteredHospitals =
      useMemo(
        () => {
          const query =
            search
              .trim()
              .toLowerCase();

          return hospitals.filter(
            (
              hospital,
            ) => {
              const matchesSearch =
                !query ||
                safeString(
                  hospital.name,
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                safeString(
                  hospital.email,
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                safeString(
                  hospital.phone,
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                safeString(
                  hospital.city,
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                safeString(
                  hospital.registrationNumber,
                )
                  .toLowerCase()
                  .includes(
                    query,
                  );

              const matchesHospitalStatus =
                statusFilter ===
                "ALL" ||
                (
                  statusFilter ===
                  "ACTIVE" &&
                  hospital.isActive
                ) ||
                (
                  statusFilter ===
                  "INACTIVE" &&
                  !hospital.isActive
                );

              const currentPlan =
                hospital.plan ??
                "BASIC";

              const matchesPlan =
                planFilter ===
                "ALL" ||
                currentPlan ===
                planFilter;

              const subscriptionStatus =
                getEffectiveSubscriptionStatus(
                  hospital,
                );

              const matchesSubscription =
                subscriptionFilter ===
                "ALL" ||
                subscriptionStatus ===
                subscriptionFilter;

              return (
                matchesSearch &&
                matchesHospitalStatus &&
                matchesPlan &&
                matchesSubscription
              );
            },
          );
        },
        [
          hospitals,
          search,
          statusFilter,
          planFilter,
          subscriptionFilter,
        ],
      );

    /* ========================================================
       STATS
    ======================================================== */

    const totalHospitals =
      hospitals.length;

    const activeHospitals =
      hospitals.filter(
        (
          hospital,
        ) =>
          hospital.isActive,
      ).length;

    const premiumHospitals =
      hospitals.filter(
        (
          hospital,
        ) =>
          hospital.plan ===
          "PREMIUM",
      ).length;

    const trialHospitals =
      hospitals.filter(
        (
          hospital,
        ) =>
          getEffectiveSubscriptionStatus(
            hospital,
          ) ===
          "TRIAL",
      ).length;

    const expiredHospitals =
      hospitals.filter(
        (
          hospital,
        ) =>
          getEffectiveSubscriptionStatus(
            hospital,
          ) ===
          "EXPIRED",
      ).length;

    const expiringSoon =
      hospitals.filter(
        (
          hospital,
        ) => {
          const status =
            getEffectiveSubscriptionStatus(
              hospital,
            );

          if (
            status !==
            "ACTIVE" &&
            status !==
            "TRIAL"
          ) {
            return false;
          }

          const expiry =
            getHospitalSubscriptionExpiry(
              hospital,
            );

          const days =
            getSubscriptionRemainingDays(
              expiry,
            );

          return (
            days >
            0 &&
            days <=
            7
          );
        },
      ).length;

    /* ========================================================
       CREATE
    ======================================================== */

    const handleCreate =
      async (
        payload:
          CreateHospitalPayload,
      ) => {
        const response =
          await createSuperAdminHospital(
            payload,
          );

        if (
          !response.success
        ) {
          throw new Error(
            response.message ||
            "Unable to create hospital",
          );
        }

        setModal(
          "NONE",
        );

        setSelectedHospital(
          null,
        );

        await loadHospitals(
          false,
        );
      };

    /* ========================================================
       EDIT
    ======================================================== */

    const handleEdit =
      async (
        payload:
          UpdateHospitalPayload,
      ) => {
        if (
          !selectedHospital
        ) {
          throw new Error(
            "No hospital selected",
          );
        }

        const response =
          await updateSuperAdminHospital(
            selectedHospital._id,
            payload,
          );

        if (
          !response.success
        ) {
          throw new Error(
            response.message ||
            "Unable to update hospital",
          );
        }

        setModal(
          "NONE",
        );

        setSelectedHospital(
          null,
        );

        await loadHospitals(
          false,
        );
      };

    /* ========================================================
       STATUS
    ======================================================== */

    const handleStatusChange =
      async (
        hospital:
          HospitalType,
      ) => {
        const newStatus =
          !hospital.isActive;

        const confirmed =
          window.confirm(
            `Are you sure you want to ${newStatus
              ? "activate"
              : "deactivate"
            } ${hospital.name}?`,
          );

        if (
          !confirmed
        ) {
          return;
        }

        try {
          const response =
            await updateHospitalStatus(
              hospital._id,
              newStatus,
            );

          if (
            !response.success
          ) {
            throw new Error(
              response.message ||
              "Unable to update hospital status",
            );
          }

          setHospitals(
            (
              current,
            ) =>
              current.map(
                (
                  item,
                ) =>
                  item._id ===
                    hospital._id
                    ? {
                      ...item,
                      isActive:
                        newStatus,
                    }
                    : item,
              ),
          );

        } catch (
        error: any
        ) {
          window.alert(
            error
              ?.response
              ?.data
              ?.message ||
            error?.message ||
            "Unable to update hospital",
          );
        }
      };

    /* ========================================================
       VIEW
    ======================================================== */

    const handleView =
      async (
        hospital:
          HospitalType,
      ) => {
        setSelectedHospital(
          hospital,
        );

        setModal(
          "DETAILS",
        );

        try {
          const response =
            await getSuperAdminHospital(
              hospital._id,
            );

          if (
            response.success &&
            response.data
          ) {
            setSelectedHospital(
              response.data,
            );
          }
        } catch (
        error
        ) {
          console.error(
            "HOSPITAL DETAILS ERROR:",
            error,
          );
        }
      };

    /* ========================================================
       OPEN ACTIONS
    ======================================================== */

    const openEdit =
      (
        hospital:
          HospitalType,
      ) => {
        setSelectedHospital(
          hospital,
        );

        setModal(
          "EDIT",
        );
      };

    const openDashboard =
      (
        hospital:
          HospitalType,
      ) => {
        setSelectedHospital(
          hospital,
        );

        setModal(
          "DASHBOARD",
        );
      };

    const openSubscription =
      (
        hospital:
          HospitalType,
      ) => {
        setSelectedHospital(
          hospital,
        );

        setModal(
          "SUBSCRIPTION",
        );
      };

    const closeModal =
      () => {
        setModal(
          "NONE",
        );

        setSelectedHospital(
          null,
        );
      };

    /* ========================================================
       SUBSCRIPTION UPDATED

       Do not automatically close modal.
       This lets Super Admin see the new dates.
    ======================================================== */

    const handleSubscriptionUpdated =
      async () => {
        await loadHospitals(
          false,
        );
      };

    /* ========================================================
       CLEAR FILTERS
    ======================================================== */

    const clearFilters =
      () => {
        setSearch("");

        setStatusFilter(
          "ALL",
        );

        setPlanFilter(
          "ALL",
        );

        setSubscriptionFilter(
          "ALL",
        );
      };

    const filtersActive =
      Boolean(
        search ||
        statusFilter !==
        "ALL" ||
        planFilter !==
        "ALL" ||
        subscriptionFilter !==
        "ALL",
      );

    /* ========================================================
       LOADING
    ======================================================== */

    if (loading) {
      return (
        <div className="flex min-h-[520px] items-center justify-center bg-[#F7F4EA]">
          <div className="text-center">

            <Loader2
              size={30}
              className="mx-auto animate-spin text-[#0F766E]"
            />

            <p className="mt-4 text-sm font-semibold text-[#355B53]">
              Loading hospitals
            </p>

          </div>
        </div>
      );
    }

    /* ========================================================
       PAGE
    ======================================================== */

    return (
      <>

        <div className="min-h-full bg-[#F7F4EA]">

          <div className="space-y-5">

            {/* ==================================================
                COMPACT HEADER
            ================================================== */}

            <section className="rounded-2xl border border-[#DCE6E0] bg-[#FFFCF5] px-5 py-5 sm:px-6">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0F766E]">

                    <Building2
                      size={14}
                    />

                    Hospital Network

                  </div>

                  <h1 className="text-2xl font-bold tracking-tight text-[#173C36]">
                    Hospital Management
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#688078]">
                    Manage hospitals, subscriptions, access and operational activity.
                  </p>

                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex">

                  <button
                    type="button"
                    disabled={
                      refreshing
                    }
                    onClick={() =>
                      loadHospitals(
                        false,
                      )
                    }
                    className="
                      inline-flex
                      min-h-12
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-[#CFE0D9]
                      bg-[#FFFCF5]
                      px-4
                      text-sm
                      font-semibold
                      text-[#355B53]
                      hover:bg-[#F1F7F3]
                      disabled:opacity-50
                    "
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
                      setSelectedHospital(
                        null,
                      );

                      setModal(
                        "CREATE",
                      );
                    }}
                    className="
                      inline-flex
                      min-h-12
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[#0F766E]
                      px-5
                      text-sm
                      font-semibold
                      text-white
                      hover:bg-[#115E59]
                    "
                  >

                    <Plus
                      size={18}
                    />

                    Add Hospital

                  </button>

                </div>

              </div>

            </section>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0 text-red-500"
                />

                <p className="text-sm text-red-700">
                  {error}
                </p>

              </div>
            )}

            {/* ==================================================
                COMPACT STATS
            ================================================== */}

            <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">

              <StatCard
                label="Hospitals"
                value={
                  totalHospitals
                }
                hint={`${activeHospitals} active`}
                icon={
                  <Building2
                    size={18}
                  />
                }
              />

              <StatCard
                label="Premium"
                value={
                  premiumHospitals
                }
                hint="Paid premium"
                icon={
                  <Crown
                    size={18}
                  />
                }
              />

              <StatCard
                label="Trials"
                value={
                  trialHospitals
                }
                hint="Current trials"
                icon={
                  <Clock3
                    size={18}
                  />
                }
              />

              <StatCard
                label="Expiring"
                value={
                  expiringSoon
                }
                hint="Next 7 days"
                icon={
                  <CalendarDays
                    size={18}
                  />
                }
              />

              <div className="col-span-2 xl:col-span-1">

                <StatCard
                  label="Expired"
                  value={
                    expiredHospitals
                  }
                  hint="Need renewal"
                  icon={
                    <AlertCircle
                      size={18}
                    />
                  }
                  danger
                />

              </div>

            </section>

            {/* ==================================================
                STICKY MANAGEMENT BAR

                Tablet / desktop remains available
                while scrolling.
            ================================================== */}

            <section
              className="
                rounded-2xl
                border
                border-[#DCE6E0]
                bg-[#FFFCF5]
                p-3
                md:sticky
                md:top-4
                md:z-20
                md:shadow-[0_6px_24px_rgba(20,78,70,0.06)]
              "
            >

              <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_160px_150px_170px_auto]">

                {/* SEARCH */}

                <div className="relative">

                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7B928A]"
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
                    placeholder="Search hospitals..."
                    className="
                      min-h-12
                      w-full
                      rounded-xl
                      border
                      border-[#DCE6E0]
                      bg-[#F9F7F0]
                      pl-10
                      pr-4
                      text-sm
                      text-[#173C36]
                      outline-none
                      placeholder:text-[#8DA098]
                      focus:border-[#0F766E]
                      focus:bg-white
                      focus:ring-2
                      focus:ring-[#D8EFE8]
                    "
                  />

                </div>

                <FilterSelect
                  value={
                    statusFilter
                  }
                  onChange={(
                    value,
                  ) =>
                    setStatusFilter(
                      value as
                      HospitalStatusFilter,
                    )
                  }
                >
                  <option value="ALL">
                    All hospitals
                  </option>

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </FilterSelect>

                <FilterSelect
                  value={
                    planFilter
                  }
                  onChange={(
                    value,
                  ) =>
                    setPlanFilter(
                      value as
                      PlanFilter,
                    )
                  }
                >
                  <option value="ALL">
                    All plans
                  </option>

                  <option value="BASIC">
                    Basic
                  </option>

                  <option value="PREMIUM">
                    Premium
                  </option>
                </FilterSelect>

                <FilterSelect
                  value={
                    subscriptionFilter
                  }
                  onChange={(
                    value,
                  ) =>
                    setSubscriptionFilter(
                      value as
                      SubscriptionFilter,
                    )
                  }
                >
                  <option value="ALL">
                    All subscriptions
                  </option>

                  <option value="TRIAL">
                    Trial
                  </option>

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="EXPIRED">
                    Expired
                  </option>
                </FilterSelect>

                {filtersActive ? (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="
                      min-h-12
                      rounded-xl
                      border
                      border-[#DCE6E0]
                      px-4
                      text-sm
                      font-semibold
                      text-[#0F766E]
                      hover:bg-[#EFF7F3]
                    "
                  >
                    Clear
                  </button>
                ) : (
                  <div className="hidden items-center justify-end px-2 text-xs font-medium text-[#71867E] lg:flex">
                    {
                      filteredHospitals.length
                    }{" "}
                    hospitals
                  </div>
                )}

              </div>

            </section>

            {/* ==================================================
                MOBILE / TABLET CARDS
            ================================================== */}

            <section className="space-y-3 lg:hidden">

              {filteredHospitals.length ===
                0 ? (
                <EmptyState
                  onClear={
                    clearFilters
                  }
                />
              ) : (
                filteredHospitals.map(
                  (
                    hospital,
                  ) => (
                    <HospitalMobileCard
                      key={
                        hospital._id
                      }
                      hospital={
                        hospital
                      }
                      expanded={
                        expandedHospitalId ===
                        hospital._id
                      }
                      onToggle={() =>
                        setExpandedHospitalId(
                          (
                            current,
                          ) =>
                            current ===
                              hospital._id
                              ? null
                              : hospital._id,
                        )
                      }
                      onDetails={() =>
                        handleView(
                          hospital,
                        )
                      }
                      onSubscription={() =>
                        openSubscription(
                          hospital,
                        )
                      }
                      onDashboard={() =>
                        openDashboard(
                          hospital,
                        )
                      }
                      onEdit={() =>
                        openEdit(
                          hospital,
                        )
                      }
                      onStatus={() =>
                        handleStatusChange(
                          hospital,
                        )
                      }
                    />
                  ),
                )
              )}

            </section>

            {/* ==================================================
                DESKTOP TABLE
            ================================================== */}

            <section className="hidden overflow-hidden rounded-2xl border border-[#DCE6E0] bg-[#FFFCF5] lg:block">

              <div className="flex items-center justify-between border-b border-[#E5ECE8] px-5 py-4">

                <div>

                  <h2 className="text-sm font-bold text-[#173C36]">
                    Registered Hospitals
                  </h2>

                  <p className="mt-0.5 text-xs text-[#7B8E87]">
                    Click the arrow to expand team and operational information.
                  </p>

                </div>

                <span className="rounded-lg bg-[#EDF5F1] px-3 py-1.5 text-xs font-bold text-[#0F766E]">
                  {
                    filteredHospitals.length
                  }
                </span>

              </div>

              {filteredHospitals.length ===
                0 ? (
                <EmptyState
                  onClear={
                    clearFilters
                  }
                />
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1180px]">

                    <thead className="bg-[#F6F5EE]">

                      <tr>

                        <TableHeader />

                        <TableHeader>
                          Hospital
                        </TableHeader>

                        <TableHeader>
                          Plan
                        </TableHeader>

                        <TableHeader>
                          Subscription
                        </TableHeader>

                        <TableHeader>
                          Expires
                        </TableHeader>

                        <TableHeader>
                          Doctors
                        </TableHeader>

                        <TableHeader>
                          Patients
                        </TableHeader>

                        <TableHeader>
                          Status
                        </TableHeader>

                        <TableHeader align="right">
                          Actions
                        </TableHeader>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-[#E8EEEA]">

                      {filteredHospitals.map(
                        (
                          hospital,
                        ) => (
                          <HospitalDesktopRow
                            key={
                              hospital._id
                            }
                            hospital={
                              hospital
                            }
                            expanded={
                              expandedHospitalId ===
                              hospital._id
                            }
                            onToggle={() =>
                              setExpandedHospitalId(
                                (
                                  current,
                                ) =>
                                  current ===
                                    hospital._id
                                    ? null
                                    : hospital._id,
                              )
                            }
                            onDetails={() =>
                              handleView(
                                hospital,
                              )
                            }
                            onSubscription={() =>
                              openSubscription(
                                hospital,
                              )
                            }
                            onDashboard={() =>
                              openDashboard(
                                hospital,
                              )
                            }
                            onEdit={() =>
                              openEdit(
                                hospital,
                              )
                            }
                            onStatus={() =>
                              handleStatusChange(
                                hospital,
                              )
                            }
                          />
                        ),
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </section>

          </div>

        </div>

        {/* ==================================================
            CREATE
        ================================================== */}

        {modal ===
          "CREATE" && (
            <CreateHospitalModal
              onClose={
                closeModal
              }
              onSubmit={
                handleCreate
              }
            />
          )}

        {/* ==================================================
            EDIT
        ================================================== */}

        {modal ===
          "EDIT" &&
          selectedHospital && (
            <EditHospitalModal
              hospital={
                selectedHospital
              }
              onClose={
                closeModal
              }
              onSubmit={
                handleEdit
              }
            />
          )}

        {/* ==================================================
            DETAILS
        ================================================== */}

        {modal ===
          "DETAILS" &&
          selectedHospital && (
            <HospitalDetailsModal
              hospital={
                selectedHospital
              }
              onClose={
                closeModal
              }
              onSubscription={() =>
                setModal(
                  "SUBSCRIPTION",
                )
              }
              onDashboard={() =>
                setModal(
                  "DASHBOARD",
                )
              }
              onEdit={() =>
                setModal(
                  "EDIT",
                )
              }
            />
          )}

        {/* ==================================================
            DASHBOARD
        ================================================== */}

        {modal ===
          "DASHBOARD" &&
          selectedHospital && (
            <HospitalDashboardModal
              hospital={
                selectedHospital
              }
              onClose={
                closeModal
              }
            />
          )}

        {/* ==================================================
            SUBSCRIPTION
        ================================================== */}

        {modal ===
          "SUBSCRIPTION" &&
          selectedHospital && (
            <SubscriptionModal
              hospital={
                selectedHospital
              }
              onClose={
                closeModal
              }
              onUpdated={
                handleSubscriptionUpdated
              }
            />
          )}

      </>
    );
  };

export default SuperAdminHospitals;

/* ============================================================
   STAT CARD
============================================================ */

const StatCard = ({
  label,
  value,
  hint,
  icon,
  danger = false,
}: {
  label: string;

  value: number;

  hint: string;

  icon: ReactNode;

  danger?: boolean;
}) => {
  return (
    <div className="h-full rounded-xl border border-[#DCE6E0] bg-[#FFFCF5] p-4">

      <div className="flex items-start justify-between">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${danger
            ? "bg-red-50 text-red-600"
            : "bg-[#E5F2ED] text-[#0F766E]"
            }`}
        >
          {icon}
        </div>

        <p
          className={`text-2xl font-bold ${danger
            ? "text-red-700"
            : "text-[#173C36]"
            }`}
        >
          {
            safeNumber(
              value,
            ).toLocaleString()
          }
        </p>

      </div>

      <p className="mt-3 text-sm font-bold text-[#355B53]">
        {label}
      </p>

      <p className="mt-0.5 text-xs text-[#80928B]">
        {hint}
      </p>

    </div>
  );
};

/* ============================================================
   FILTER SELECT
============================================================ */

const FilterSelect = ({
  value,
  onChange,
  children,
}: {
  value: string;

  onChange:
  (
    value: string,
  ) => void;

  children:
  ReactNode;
}) => {
  return (
    <select
      value={
        value
      }
      onChange={(
        event,
      ) =>
        onChange(
          event
            .target
            .value,
        )
      }
      className="
        min-h-12
        w-full
        rounded-xl
        border
        border-[#DCE6E0]
        bg-[#F9F7F0]
        px-3
        text-sm
        font-medium
        text-[#355B53]
        outline-none
        focus:border-[#0F766E]
        focus:ring-2
        focus:ring-[#D8EFE8]
      "
    >
      {children}
    </select>
  );
};

/* ============================================================
   DESKTOP TABLE HEADER
============================================================ */

const TableHeader = ({
  children,
  align = "left",
}: {
  children?: ReactNode;

  align?:
  | "left"
  | "right";
}) => {
  return (
    <th
      className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#81948C] ${align ===
        "right"
        ? "text-right"
        : "text-left"
        }`}
    >
      {children}
    </th>
  );
};

/* ============================================================
   DESKTOP ROW
============================================================ */

const HospitalDesktopRow = ({
  hospital,
  expanded,
  onToggle,
  onDetails,
  onSubscription,
  onDashboard,
  onEdit,
  onStatus,
}: {
  hospital:
  HospitalType;

  expanded:
  boolean;

  onToggle:
  () => void;

  onDetails:
  () => void;

  onSubscription:
  () => void;

  onDashboard:
  () => void;

  onEdit:
  () => void;

  onStatus:
  () => void;
}) => {
  const expiry =
    getHospitalSubscriptionExpiry(
      hospital,
    );

  const status =
    getEffectiveSubscriptionStatus(
      hospital,
    );

  const remaining =
    getSubscriptionRemainingDays(
      expiry,
    );

  return (
    <Fragment>

      <tr className="hover:bg-[#FAF9F3]">

        <td className="px-3 py-4">

          <button
            type="button"
            onClick={
              onToggle
            }
            title="Expand details"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71857D] hover:bg-[#EAF3EF] hover:text-[#0F766E]"
          >

            {expanded ? (
              <ChevronUp
                size={17}
              />
            ) : (
              <ChevronDown
                size={17}
              />
            )}

          </button>

        </td>

        <td className="px-4 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F2EE] text-[#0F766E]">

              <Hospital
                size={19}
              />

            </div>

            <div className="min-w-0">

              <p className="max-w-[230px] truncate text-sm font-bold text-[#173C36]">
                {
                  hospital.name
                }
              </p>

              <p className="mt-0.5 max-w-[230px] truncate text-xs text-[#7C9189]">
                {
                  hospital.email ||
                  hospital.city ||
                  "No contact information"
                }
              </p>

            </div>

          </div>

        </td>

        <td className="px-4 py-4">

          <PlanBadge
            plan={
              hospital.plan ??
              "BASIC"
            }
          />

        </td>

        <td className="px-4 py-4">

          <SubscriptionBadge
            status={
              status
            }
          />

        </td>

        <td className="px-4 py-4">

          {expiry ? (
            <div>

              <p className="text-sm font-semibold text-[#355B53]">
                {
                  formatDate(
                    expiry,
                  )
                }
              </p>

              <p
                className={`mt-0.5 text-xs ${status ===
                  "EXPIRED"
                  ? "font-semibold text-red-600"
                  : remaining <=
                    7
                    ? "font-semibold text-amber-700"
                    : "text-[#81948C]"
                  }`}
              >
                {status ===
                  "EXPIRED"
                  ? "Expired"
                  : `${remaining} days left`}
              </p>

            </div>
          ) : (
            <span className="text-sm text-[#9AA9A3]">
              —
            </span>
          )}

        </td>

        <td className="px-4 py-4">

          <CountValue
            icon={
              <Stethoscope
                size={15}
              />
            }
            value={
              safeNumber(
                hospital.totalDoctors ??
                hospital.doctors,
              )
            }
          />

        </td>

        <td className="px-4 py-4">

          <CountValue
            icon={
              <Users
                size={15}
              />
            }
            value={
              safeNumber(
                hospital.totalPatients ??
                hospital.patients,
              )
            }
          />

        </td>

        <td className="px-4 py-4">

          <HospitalStatusBadge
            active={
              hospital.isActive
            }
          />

        </td>

        <td className="px-4 py-4">

          <div className="flex items-center justify-end gap-1">

            <IconAction
              title="View hospital"
              onClick={
                onDetails
              }
            >
              <Eye
                size={16}
              />
            </IconAction>

            <IconAction
              title="Manage subscription"
              onClick={
                onSubscription
              }
              primary
            >
              <CreditCard
                size={16}
              />
            </IconAction>

            <IconAction
              title="Hospital dashboard"
              onClick={
                onDashboard
              }
            >
              <Activity
                size={16}
              />
            </IconAction>

            <IconAction
              title="Edit hospital"
              onClick={
                onEdit
              }
            >
              <Edit
                size={16}
              />
            </IconAction>

            <button
              type="button"
              title={
                hospital.isActive
                  ? "Deactivate"
                  : "Activate"
              }
              onClick={
                onStatus
              }
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${hospital.isActive
                ? "text-red-500 hover:bg-red-50"
                : "text-emerald-600 hover:bg-emerald-50"
                }`}
            >
              {hospital.isActive ? (
                <XCircle
                  size={16}
                />
              ) : (
                <CheckCircle2
                  size={16}
                />
              )}
            </button>

          </div>

        </td>

      </tr>

      {expanded && (
        <tr>

          <td
            colSpan={
              9
            }
            className="bg-[#F4F6F0] px-5 py-4"
          >

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#799087]">
                  Team & activity
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

                  <MiniMetric
                    label="Doctors"
                    value={
                      safeNumber(
                        hospital.totalDoctors ??
                        hospital.doctors,
                      )
                    }
                  />

                  <MiniMetric
                    label="Patients"
                    value={
                      safeNumber(
                        hospital.totalPatients ??
                        hospital.patients,
                      )
                    }
                  />

                  <MiniMetric
                    label="Departments"
                    value={
                      safeNumber(
                        hospital.totalDepartments ??
                        hospital.departments,
                      )
                    }
                  />

                  <MiniMetric
                    label="Today's Tokens"
                    value={
                      safeNumber(
                        hospital.totalTokensToday ??
                        hospital.todayTokens,
                      )
                    }
                  />

                </div>

              </div>

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#799087]">
                  Hospital details
                </p>

                <div className="mt-3 grid gap-2 text-sm text-[#46665E]">

                  <p>
                    <span className="font-semibold">
                      Phone:
                    </span>{" "}
                    {
                      hospital.phone ||
                      "Not available"
                    }
                  </p>

                  <p>
                    <span className="font-semibold">
                      Location:
                    </span>{" "}
                    {[
                      hospital.city,
                      hospital.state,
                    ]
                      .filter(
                        (
                          value,
                        ): value is string =>
                          typeof value === "string" &&
                          value.trim().length > 0,
                      )
                      .join(", ") ||
                      formatHospitalAddress(
                        hospital.address,
                      )}
                  </p>

                </div>

              </div>

              <div className="flex items-end">

                <button
                  type="button"
                  onClick={
                    onSubscription
                  }
                  className="min-h-11 rounded-xl bg-[#0F766E] px-5 text-sm font-semibold text-white hover:bg-[#115E59]"
                >
                  Manage Subscription
                </button>

              </div>

            </div>

          </td>

        </tr>
      )}

    </Fragment>
  );
};

/* ============================================================
   MOBILE CARD
============================================================ */

const HospitalMobileCard = ({
  hospital,
  expanded,
  onToggle,
  onDetails,
  onSubscription,
  onDashboard,
  onEdit,
  onStatus,
}: {
  hospital:
  HospitalType;

  expanded:
  boolean;

  onToggle:
  () => void;

  onDetails:
  () => void;

  onSubscription:
  () => void;

  onDashboard:
  () => void;

  onEdit:
  () => void;

  onStatus:
  () => void;
}) => {
  const status =
    getEffectiveSubscriptionStatus(
      hospital,
    );

  const expiry =
    getHospitalSubscriptionExpiry(
      hospital,
    );

  const remaining =
    getSubscriptionRemainingDays(
      expiry,
    );

  return (
    <article className="rounded-2xl border border-[#DCE6E0] bg-[#FFFCF5] p-4">

      <div className="flex items-start gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E5F2ED] text-[#0F766E]">
          <Hospital
            size={20}
          />
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <h3 className="truncate text-base font-bold text-[#173C36]">
                {
                  hospital.name
                }
              </h3>

              <p className="mt-0.5 truncate text-xs text-[#7F918B]">
                {
                  hospital.email ||
                  hospital.phone ||
                  "No contact details"
                }
              </p>

            </div>

            <button
              type="button"
              onClick={
                onToggle
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DCE6E0] text-[#5F7B72]"
            >
              {expanded ? (
                <ChevronUp
                  size={18}
                />
              ) : (
                <ChevronDown
                  size={18}
                />
              )}
            </button>

          </div>

          <div className="mt-3 flex flex-wrap gap-2">

            <PlanBadge
              plan={
                hospital.plan ??
                "BASIC"
              }
            />

            <SubscriptionBadge
              status={
                status
              }
            />

            <HospitalStatusBadge
              active={
                hospital.isActive
              }
            />

          </div>

        </div>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">

        <MobileInfo
          label="Expires"
          value={
            expiry
              ? formatDate(
                expiry,
              )
              : "—"
          }
        />

        <MobileInfo
          label="Remaining"
          value={
            status ===
              "EXPIRED"
              ? "Expired"
              : expiry
                ? `${remaining} days`
                : "—"
          }
        />

      </div>

      {expanded && (
        <div className="mt-4 border-t border-[#E5ECE8] pt-4">

          <div className="grid grid-cols-4 gap-2">

            <MiniMetric
              label="Doctors"
              value={
                safeNumber(
                  hospital.totalDoctors ??
                  hospital.doctors,
                )
              }
            />

            <MiniMetric
              label="Patients"
              value={
                safeNumber(
                  hospital.totalPatients ??
                  hospital.patients,
                )
              }
            />

            <MiniMetric
              label="Depts"
              value={
                safeNumber(
                  hospital.totalDepartments ??
                  hospital.departments,
                )
              }
            />

            <MiniMetric
              label="Tokens"
              value={
                safeNumber(
                  hospital.totalTokensToday ??
                  hospital.todayTokens,
                )
              }
            />

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">

            <LargeMobileAction
              onClick={
                onDetails
              }
              icon={
                <Eye
                  size={17}
                />
              }
            >
              Details
            </LargeMobileAction>

            <LargeMobileAction
              onClick={
                onDashboard
              }
              icon={
                <Activity
                  size={17}
                />
              }
            >
              Dashboard
            </LargeMobileAction>

            <LargeMobileAction
              onClick={
                onEdit
              }
              icon={
                <Edit
                  size={17}
                />
              }
            >
              Edit
            </LargeMobileAction>

            <LargeMobileAction
              onClick={
                onStatus
              }
              danger={
                hospital.isActive
              }
              icon={
                hospital.isActive ? (
                  <XCircle
                    size={17}
                  />
                ) : (
                  <CheckCircle2
                    size={17}
                  />
                )
              }
            >
              {hospital.isActive
                ? "Deactivate"
                : "Activate"}
            </LargeMobileAction>

          </div>

        </div>
      )}

      <button
        type="button"
        onClick={
          onSubscription
        }
        className="
          mt-4
          inline-flex
          min-h-12
          w-full
          items-center
          justify-center
          gap-2
          rounded-xl
          bg-[#0F766E]
          px-4
          text-sm
          font-semibold
          text-white
          hover:bg-[#115E59]
        "
      >
        <CreditCard
          size={17}
        />

        Manage Subscription
      </button>

    </article>
  );
};

/* ============================================================
   CREATE HOSPITAL MODAL

   FIXES YOUR API ERROR.
============================================================ */

const CreateHospitalModal = ({
  onClose,
  onSubmit,
}: {
  onClose:
  () => void;

  onSubmit:
  (
    payload:
      CreateHospitalPayload,
  ) => Promise<void>;
}) => {
  const [
    form,
    setForm,
  ] =
    useState<
      CreateHospitalFormState
    >({
      hospitalName: "",
      publicName: "",
      adminName: "",
      email: "",
      phone: "",
      password: "",
      addressLine: "",
      city: "",
      district: "",
      state: "",
      country: "India",
      pincode: "",
      publicAddress: "",
      publicBookingEnabled: true,
      registrationNumber: "",
    });

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const districtOptions =
    useMemo(
      () =>
        form.state
          ? getDistrictsByState(
            form.state,
          )
          : [],
      [
        form.state,
      ],
    );

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      const hospitalName =
        form.hospitalName.trim();

      const publicName =
        form.publicName.trim() ||
        hospitalName;

      const adminName =
        form.adminName.trim();

      const email =
        form.email.trim();

      const phone =
        form.phone.trim();

      const addressLine =
        form.addressLine.trim();

      const city =
        form.city.trim();

      const district =
        form.district.trim();

      const state =
        form.state.trim();

      const country =
        form.country.trim() ||
        "India";

      const pincode =
        form.pincode.trim();

      const registrationNumber =
        form.registrationNumber.trim();

      const publicAddress =
        form.publicAddress.trim() ||
        [
          addressLine,
          city,
          district,
          state,
          pincode,
        ]
          .filter(Boolean)
          .join(", ");

      if (
        !hospitalName ||
        !adminName ||
        !email ||
        !phone ||
        !form.password
      ) {
        setError(
          "Hospital name, admin name, email, phone and password are required.",
        );

        return;
      }

      if (
        !state ||
        !district ||
        !city ||
        !pincode
      ) {
        setError(
          "State, district, city and pincode are required for public appointment booking.",
        );

        return;
      }

      if (
        form.password.length <
        6
      ) {
        setError(
          "Password must be at least 6 characters.",
        );

        return;
      }

      try {
        setSaving(
          true,
        );

        setError("");

        const payload:
          CreateHospitalPayload =
        {
          hospitalName,

          /*
           * Backend field "name"
           * means Hospital Admin name.
           */
          name:
            adminName,

          email,

          phone,

          password:
            form.password,

          publicName,

          address:
            addressLine ||
            undefined,

          city,

          district,

          state,

          country,

          pincode,

          publicAddress:
            publicAddress ||
            undefined,

          publicBookingEnabled:
            Boolean(
              form.publicBookingEnabled,
            ),

          registrationNumber:
            registrationNumber ||
            undefined,
        };

        await onSubmit(
          payload,
        );

      } catch (
      error: any
      ) {
        setError(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          "Unable to create hospital",
        );

      } finally {
        setSaving(
          false,
        );
      }
    };

  return (
    <ModalWrapper
      onClose={
        onClose
      }
      width="max-w-4xl"
    >

      <ModalHeader
        icon={
          <Building2
            size={21}
          />
        }
        eyebrow="New hospital"
        title="Register Hospital"
        description="Create hospital, appointment location and first administrator."
        onClose={
          onClose
        }
      />

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-6 p-5 sm:p-6"
      >

        {error && (
          <FormError
            message={
              error
            }
          />
        )}

        {/* TRIAL NOTICE */}

        <div className="rounded-xl border border-[#CFE3DB] bg-[#EAF4EF] p-4">

          <div className="flex gap-3">

            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-[#0F766E]"
            />

            <div>

              <p className="text-sm font-bold text-[#174E47]">
                Automatic Basic trial
              </p>

              <p className="mt-1 text-xs leading-5 text-[#58766D]">
                The hospital will start on the Basic plan with a 14-day trial. You can upgrade or activate a paid subscription later.
              </p>

            </div>

          </div>

        </div>

        {/* HOSPITAL */}

        <FormSection
          title="Hospital"
          description="Information shown in admin panel and patient appointment booking."
        >

          <TextInput
            label="Hospital Name"
            required
            value={
              form.hospitalName
            }
            placeholder="e.g. City Care Hospital"
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  hospitalName:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Public Display Name"
            value={
              form.publicName
            }
            placeholder="Shown to patients, optional"
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  publicName:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Registration Number"
            value={
              form.registrationNumber
            }
            placeholder="Optional"
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  registrationNumber:
                    value,
                }),
              )
            }
          />

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#355B53]">
              Public Appointment Booking
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <select
              value={
                form.publicBookingEnabled
                  ? "YES"
                  : "NO"
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    publicBookingEnabled:
                      event.target.value ===
                      "YES",
                  }),
                )
              }
              className="min-h-12 w-full rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] px-4 text-sm text-[#173C36] outline-none focus:border-[#0F766E] focus:bg-white focus:ring-2 focus:ring-[#D8EFE8]"
            >
              <option value="YES">
                Enabled
              </option>

              <option value="NO">
                Disabled
              </option>
            </select>
          </div>

        </FormSection>

        {/* LOCATION */}

        <FormSection
          title="Appointment Location"
          description="Patients use this location to find hospitals while booking appointments."
        >

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#355B53]">
              State
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81948C]">
                <MapPin size={16} />
              </div>

              <select
                required
                value={
                  form.state
                }
                onChange={(
                  event,
                ) => {
                  const selectedState =
                    event.target.value;

                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      state:
                        selectedState,

                      district:
                        "",
                    }),
                  );
                }}
                className="min-h-12 w-full rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] px-4 pl-10 text-sm text-[#173C36] outline-none focus:border-[#0F766E] focus:bg-white focus:ring-2 focus:ring-[#D8EFE8]"
              >
                <option value="">
                  Select state
                </option>

                {INDIA_STATES.map(
                  (
                    stateName,
                  ) => (
                    <option
                      key={
                        stateName
                      }
                      value={
                        stateName
                      }
                    >
                      {stateName}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#355B53]">
              District
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81948C]">
                <MapPin size={16} />
              </div>

              <select
                required
                value={
                  form.district
                }
                disabled={
                  !form.state
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      district:
                        event.target.value,
                    }),
                  )
                }
                className="min-h-12 w-full rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] px-4 pl-10 text-sm text-[#173C36] outline-none focus:border-[#0F766E] focus:bg-white focus:ring-2 focus:ring-[#D8EFE8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {form.state
                    ? "Select district"
                    : "Select state first"}
                </option>

                {districtOptions.map(
                  (
                    districtName,
                  ) => (
                    <option
                      key={
                        districtName
                      }
                      value={
                        districtName
                      }
                    >
                      {districtName}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <TextInput
            label="City"
            required
            value={
              form.city
            }
            placeholder="e.g. Varanasi"
            icon={
              <MapPin
                size={16}
              />
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  city:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Pincode"
            required
            value={
              form.pincode
            }
            placeholder="e.g. 221001"
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  pincode:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Country"
            value={
              form.country
            }
            placeholder="India"
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  country:
                    value,
                }),
              )
            }
          />

          <div className="sm:col-span-2">
            <TextArea
              label="Hospital Address"
              value={
                form.addressLine
              }
              placeholder="Full hospital address"
              onChange={(
                value,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    addressLine:
                      value,
                  }),
                )
              }
            />
          </div>

          <div className="sm:col-span-2">
            <TextArea
              label="Public Address"
              value={
                form.publicAddress
              }
              placeholder="Shown to patients. Leave blank to auto-create from address, city, district and state."
              onChange={(
                value,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    publicAddress:
                      value,
                  }),
                )
              }
            />
          </div>

        </FormSection>

        {/* ADMIN */}

        <FormSection
          title="Primary Administrator"
          description="This person receives the Hospital Admin account."
        >

          <TextInput
            label="Admin Name"
            required
            value={
              form.adminName
            }
            placeholder="Administrator full name"
            icon={
              <UserRound
                size={16}
              />
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  adminName:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Email"
            type="email"
            required
            value={
              form.email
            }
            placeholder="admin@hospital.com"
            icon={
              <Mail
                size={16}
              />
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  email:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Phone"
            required
            value={
              form.phone
            }
            placeholder="9876543210"
            icon={
              <Phone
                size={16}
              />
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  phone:
                    value,
                }),
              )
            }
          />

          <PasswordInput
            label="Temporary Password"
            required
            value={
              form.password
            }
            showPassword={
              showPassword
            }
            onToggle={() =>
              setShowPassword(
                (
                  current,
                ) =>
                  !current,
              )
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  password:
                    value,
                }),
              )
            }
          />

        </FormSection>

        <ModalActions
          saving={
            saving
          }
          cancelLabel="Cancel"
          submitLabel="Create Hospital"
          loadingLabel="Creating..."
          onCancel={
            onClose
          }
        />

      </form>

    </ModalWrapper>
  );
};

/* ============================================================
   EDIT HOSPITAL
============================================================ */

const EditHospitalModal = ({
  hospital,
  onClose,
  onSubmit,
}: {
  hospital:
  HospitalType;

  onClose:
  () => void;

  onSubmit:
  (
    payload:
      UpdateHospitalPayload,
  ) => Promise<void>;
}) => {
  const [
    form,
    setForm,
  ] =
    useState({
      name:
        hospital.name ??
        "",

      email:
        hospital.email ??
        "",

      phone:
        hospital.phone ??
        "",

      address:
        getHospitalAddressLine(
          hospital,
        ),

      city:
        getHospitalCity(
          hospital,
        ),

      state:
        getHospitalState(
          hospital,
        ),

      pincode:
        getHospitalPincode(
          hospital,
        ),

      registrationNumber:
        hospital.registrationNumber ??
        "",
    });

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        !form.name.trim()
      ) {
        setError(
          "Hospital name is required.",
        );

        return;
      }

      try {
        setSaving(
          true,
        );

        setError("");

        const payload:
          UpdateHospitalPayload =
        {
          name:
            form.name.trim(),

          email:
            form.email.trim(),

          phone:
            form.phone.trim(),

          address:
            form.address.trim(),

          city:
            form.city.trim(),

          state:
            form.state.trim(),

          pincode:
            form.pincode.trim(),

          registrationNumber:
            form.registrationNumber.trim(),
        };

        await onSubmit(
          payload,
        );

      } catch (
      error: any
      ) {
        setError(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          "Unable to update hospital",
        );

      } finally {
        setSaving(
          false,
        );
      }
    };

  return (
    <ModalWrapper
      onClose={
        onClose
      }
      width="max-w-3xl"
    >

      <ModalHeader
        icon={
          <Edit
            size={20}
          />
        }
        eyebrow="Hospital profile"
        title={`Edit ${hospital.name}`}
        description="Update hospital information."
        onClose={
          onClose
        }
      />

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-6 p-5 sm:p-6"
      >

        {error && (
          <FormError
            message={
              error
            }
          />
        )}

        <FormSection
          title="Hospital information"
        >

          <TextInput
            label="Hospital Name"
            required
            value={
              form.name
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  name:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Registration Number"
            value={
              form.registrationNumber
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  registrationNumber:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Email"
            type="email"
            value={
              form.email
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  email:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Phone"
            value={
              form.phone
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  phone:
                    value,
                }),
              )
            }
          />

        </FormSection>

        <FormSection
          title="Location"
        >

          <TextInput
            label="City"
            value={
              form.city
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  city:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="State"
            value={
              form.state
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  state:
                    value,
                }),
              )
            }
          />

          <TextInput
            label="Pincode"
            value={
              form.pincode
            }
            onChange={(
              value,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,
                  pincode:
                    value,
                }),
              )
            }
          />

          <div className="sm:col-span-2">

            <TextArea
              label="Address"
              value={
                form.address
              }
              onChange={(
                value,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    address:
                      value,
                  }),
                )
              }
            />

          </div>

        </FormSection>

        <ModalActions
          saving={
            saving
          }
          cancelLabel="Cancel"
          submitLabel="Save Changes"
          loadingLabel="Saving..."
          onCancel={
            onClose
          }
        />

      </form>

    </ModalWrapper>
  );
};

/* ============================================================
   DETAILS
============================================================ */

const HospitalDetailsModal = ({
  hospital,
  onClose,
  onSubscription,
  onDashboard,
  onEdit,
}: {
  hospital:
  HospitalType;

  onClose:
  () => void;

  onSubscription:
  () => void;

  onDashboard:
  () => void;

  onEdit:
  () => void;
}) => {
  const expiry =
    getHospitalSubscriptionExpiry(
      hospital,
    );

  const status =
    getEffectiveSubscriptionStatus(
      hospital,
    );

  const remaining =
    getSubscriptionRemainingDays(
      expiry,
    );

  return (
    <ModalWrapper
      onClose={
        onClose
      }
      width="max-w-4xl"
    >

      <ModalHeader
        icon={
          <Hospital
            size={21}
          />
        }
        eyebrow="Hospital profile"
        title={
          hospital.name
        }
        description={
          hospital.registrationNumber ||
          hospital.email ||
          "Hospital information"
        }
        onClose={
          onClose
        }
      />

      <div className="space-y-6 p-5 sm:p-6">

        {/* SUBSCRIPTION */}

        <div className="rounded-xl border border-[#D7E5DF] bg-[#EEF5F1] p-4">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#728A81]">
                Subscription
              </p>

              <div className="mt-2 flex flex-wrap gap-2">

                <PlanBadge
                  plan={
                    hospital.plan ??
                    "BASIC"
                  }
                />

                <SubscriptionBadge
                  status={
                    status
                  }
                />

              </div>

            </div>

            <div className="flex items-center gap-6">

              <div>

                <p className="text-xs text-[#789087]">
                  Expires
                </p>

                <p className="mt-0.5 text-sm font-bold text-[#173C36]">
                  {
                    expiry
                      ? formatDate(
                        expiry,
                      )
                      : "—"
                  }
                </p>

              </div>

              <div>

                <p className="text-xs text-[#789087]">
                  Remaining
                </p>

                <p className="mt-0.5 text-sm font-bold text-[#173C36]">
                  {
                    status ===
                      "EXPIRED"
                      ? "Expired"
                      : expiry
                        ? `${remaining} days`
                        : "—"
                  }
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ACTIVITY */}

        <section>

          <SectionHeading
            title="Activity"
          />

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">

            <DetailMetric
              icon={
                <Stethoscope
                  size={17}
                />
              }
              label="Doctors"
              value={
                safeNumber(
                  hospital.totalDoctors ??
                  hospital.doctors,
                )
              }
            />

            <DetailMetric
              icon={
                <Users
                  size={17}
                />
              }
              label="Patients"
              value={
                safeNumber(
                  hospital.totalPatients ??
                  hospital.patients,
                )
              }
            />

            <DetailMetric
              icon={
                <Building2
                  size={17}
                />
              }
              label="Departments"
              value={
                safeNumber(
                  hospital.totalDepartments ??
                  hospital.departments,
                )
              }
            />

            <DetailMetric
              icon={
                <Ticket
                  size={17}
                />
              }
              label="Tokens"
              value={
                safeNumber(
                  hospital.totalTokensToday ??
                  hospital.todayTokens,
                )
              }
            />

          </div>

        </section>

        {/* CONTACT */}

        <section>

          <SectionHeading
            title="Hospital information"
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">

            <InfoBox
              label="Email"
              value={
                hospital.email
              }
              icon={
                <Mail
                  size={15}
                />
              }
            />

            <InfoBox
              label="Phone"
              value={
                hospital.phone
              }
              icon={
                <Phone
                  size={15}
                />
              }
            />

            <InfoBox
              label="Registration Number"
              value={
                hospital.registrationNumber
              }
            />

            <InfoBox
              label="Location"
              value={
                [
                  hospital.city,
                  hospital.state,
                  hospital.pincode,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    ", ",
                  ) ||
                undefined
              }
              icon={
                <MapPin
                  size={15}
                />
              }
            />

            <div className="sm:col-span-2">

              <InfoBox
                label="Address"
                value={
                  formatHospitalAddress(
                    hospital.address,
                  )
                }
              />

            </div>

          </div>

        </section>

        <div className="grid gap-2 border-t border-[#E2EAE6] pt-5 sm:grid-cols-4">

          <ModalSecondaryButton
            onClick={
              onClose
            }
          >
            Close
          </ModalSecondaryButton>

          <ModalSecondaryButton
            onClick={
              onEdit
            }
          >
            <Edit
              size={16}
            />

            Edit
          </ModalSecondaryButton>

          <ModalSecondaryButton
            onClick={
              onDashboard
            }
          >
            <Activity
              size={16}
            />

            Dashboard
          </ModalSecondaryButton>

          <button
            type="button"
            onClick={
              onSubscription
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 text-sm font-semibold text-white hover:bg-[#115E59]"
          >
            <CreditCard
              size={16}
            />

            Subscription
          </button>

        </div>

      </div>

    </ModalWrapper>
  );
};

/* ============================================================
   SUBSCRIPTION MODAL
============================================================ */

const SubscriptionModal = ({
  hospital,
  onClose,
  onUpdated,
}: {
  hospital:
  HospitalType;

  onClose:
  () => void;

  onUpdated:
  () => Promise<void>;
}) => {
  const [
    subscription,
    setSubscription,
  ] =
    useState<
      HospitalSubscription | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    showPayment,
    setShowPayment,
  ] =
    useState(false);

  const [
    form,
    setForm,
  ] =
    useState<
      SubscriptionFormState
    >({
      plan:
        hospital.plan ??
        "BASIC",

      durationMonths:
        1,

      amount:
        "",

      paymentMethod:
        "",

      paymentReference:
        "",
    });

  /* ========================================================
     LOAD
  ======================================================== */

  useEffect(
    () => {
      let active =
        true;

      const load =
        async () => {
          try {
            setLoading(
              true,
            );

            setError("");

            const response =
              await getHospitalSubscription(
                hospital._id,
              );

            if (
              !response.success
            ) {
              throw new Error(
                response.message ||
                "Unable to load subscription",
              );
            }

            if (
              !active
            ) {
              return;
            }

            setSubscription(
              response
                .data
                .subscription,
            );

            setForm(
              (
                current,
              ) => ({
                ...current,

                plan:
                  response
                    .data
                    .subscription
                    .plan,
              }),
            );

          } catch (
          error: any
          ) {
            if (
              active
            ) {
              setError(
                error
                  ?.response
                  ?.data
                  ?.message ||
                error?.message ||
                "Unable to load subscription",
              );
            }

          } finally {
            if (
              active
            ) {
              setLoading(
                false,
              );
            }
          }
        };

      load();

      return () => {
        active =
          false;
      };
    },
    [
      hospital._id,
    ],
  );

  const currentExpiry =
    subscription?.status ===
      "TRIAL"
      ? subscription
        .trialEndsAt
      : subscription
        ?.subscriptionEndsAt;

  const remaining =
    getSubscriptionRemainingDays(
      currentExpiry,
    );

  /* ========================================================
     SUBMIT
  ======================================================== */

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      try {
        setSaving(
          true,
        );

        setError("");

        setSuccess("");

        const amount =
          form.amount.trim()
            ? Number(
              form.amount,
            )
            : undefined;

        if (
          amount !==
          undefined &&
          (
            !Number.isFinite(
              amount,
            ) ||
            amount <
            0
          )
        ) {
          setError(
            "Enter a valid amount.",
          );

          return;
        }

        const payload:
          ActivateHospitalSubscriptionPayload =
        {
          plan:
            form.plan,

          durationMonths:
            form.durationMonths,

          amount,

          paymentMethod:
            form.paymentMethod.trim() ||
            undefined,

          paymentReference:
            form.paymentReference.trim() ||
            undefined,
        };

        const response =
          await activateHospitalSubscription(
            hospital._id,
            payload,
          );

        if (
          !response.success
        ) {
          throw new Error(
            response.message ||
            "Unable to update subscription",
          );
        }

        /*
         * Immediately update the modal rather
         * than closing it.
         */

        setSubscription({
          plan:
            response.data.plan,

          status:
            response
              .data
              .subscriptionStatus,

          trialStartedAt:
            null,

          trialEndsAt:
            null,

          subscriptionStartedAt:
            response
              .data
              .subscriptionStartedAt,

          subscriptionEndsAt:
            response
              .data
              .subscriptionEndsAt,
        });

        setSuccess(
          response.message ||
          "Subscription updated successfully.",
        );

        await onUpdated();

      } catch (
      error: any
      ) {
        setError(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          "Unable to update subscription",
        );

      } finally {
        setSaving(
          false,
        );
      }
    };

  return (
    <ModalWrapper
      onClose={
        onClose
      }
      width="max-w-4xl"
    >

      <ModalHeader
        icon={
          <CreditCard
            size={21}
          />
        }
        eyebrow="Subscription"
        title={
          hospital.name
        }
        description="View, activate, renew or change the hospital plan."
        onClose={
          onClose
        }
      />

      <div className="p-5 sm:p-6">

        {loading ? (
          <div className="py-16 text-center">

            <Loader2
              size={28}
              className="mx-auto animate-spin text-[#0F766E]"
            />

            <p className="mt-3 text-sm text-[#789087]">
              Loading subscription
            </p>

          </div>
        ) : (
          <>

            {error && (
              <FormError
                message={
                  error
                }
              />
            )}

            {success && (
              <div className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-sm font-medium text-emerald-700">
                  {success}
                </p>

              </div>
            )}

            {/* CURRENT */}

            <section>

              <SectionHeading
                title="Current subscription"
                description="The hospital's current plan and access period."
              />

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">

                <SubscriptionInfo
                  label="Plan"
                >
                  <PlanBadge
                    plan={
                      subscription?.plan ??
                      hospital.plan ??
                      "BASIC"
                    }
                  />
                </SubscriptionInfo>

                <SubscriptionInfo
                  label="Status"
                >
                  <SubscriptionBadge
                    status={
                      subscription?.status ??
                      "EXPIRED"
                    }
                  />
                </SubscriptionInfo>

                <SubscriptionInfo
                  label="Expires"
                >
                  <p className="text-sm font-bold text-[#173C36]">
                    {
                      currentExpiry
                        ? formatDate(
                          currentExpiry,
                        )
                        : "—"
                    }
                  </p>
                </SubscriptionInfo>

                <SubscriptionInfo
                  label="Remaining"
                >
                  <p className="text-sm font-bold text-[#173C36]">
                    {
                      currentExpiry
                        ? `${remaining} days`
                        : "—"
                    }
                  </p>
                </SubscriptionInfo>

              </div>

            </section>

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-7 border-t border-[#E1EAE5] pt-6"
            >

              {/* PLAN */}

              <SectionHeading
                title="Choose plan"
                description="Plan changes take effect when this activation is saved."
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">

                <PlanChoice
                  plan="BASIC"
                  title="Basic"
                  selected={
                    form.plan ===
                    "BASIC"
                  }
                  features={[
                    "Token generation",
                    "Live patient tracking",
                    "Doctor call / serve / complete",
                    "Basic queue workflow",
                  ]}
                  onClick={() =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        plan:
                          "BASIC",
                      }),
                    )
                  }
                />

                <PlanChoice
                  plan="PREMIUM"
                  title="Premium"
                  selected={
                    form.plan ===
                    "PREMIUM"
                  }
                  features={[
                    "Everything in Basic",
                    "AI-assisted consultation",
                    "Prescription & clinical records",
                    "Laboratory workflows",
                  ]}
                  onClick={() =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        plan:
                          "PREMIUM",
                      }),
                    )
                  }
                />

              </div>

              {/* DURATION */}

              <div className="mt-6">

                <label className="text-sm font-bold text-[#294F47]">
                  Subscription duration
                </label>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

                  {[
                    1,
                    3,
                    6,
                    12,
                  ].map(
                    (
                      months,
                    ) => (
                      <button
                        type="button"
                        key={
                          months
                        }
                        onClick={() =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              durationMonths:
                                months,
                            }),
                          )
                        }
                        className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${form.durationMonths ===
                          months
                          ? "border-[#0F766E] bg-[#E4F1EC] text-[#0F766E]"
                          : "border-[#DCE6E0] bg-[#FFFCF5] text-[#607B72] hover:bg-[#F5F6F0]"
                          }`}
                      >
                        {
                          months
                        }{" "}
                        {months ===
                          1
                          ? "Month"
                          : "Months"}
                      </button>
                    ),
                  )}

                </div>

              </div>

              {/* RENEWAL MESSAGE */}

              {subscription?.status ===
                "ACTIVE" &&
                subscription
                  .subscriptionEndsAt &&
                new Date(
                  subscription.subscriptionEndsAt,
                ).getTime() >
                Date.now() && (
                  <div className="mt-5 flex gap-3 rounded-xl border border-[#CEE2DA] bg-[#EDF5F1] p-4">

                    <CalendarDays
                      size={18}
                      className="mt-0.5 shrink-0 text-[#0F766E]"
                    />

                    <p className="text-xs leading-5 text-[#58766D]">
                      This subscription is currently active. Your backend will extend the selected duration from the existing expiry date.
                    </p>

                  </div>
                )}

              {/* PAYMENT - COLLAPSIBLE */}

              <div className="mt-6 rounded-xl border border-[#DCE6E0]">

                <button
                  type="button"
                  onClick={() =>
                    setShowPayment(
                      (
                        current,
                      ) =>
                        !current,
                    )
                  }
                  className="flex min-h-12 w-full items-center justify-between px-4 text-left"
                >

                  <div>

                    <p className="text-sm font-bold text-[#294F47]">
                      Payment details
                    </p>

                    <p className="mt-0.5 text-xs text-[#81948C]">
                      Optional internal record
                    </p>

                  </div>

                  {showPayment ? (
                    <ChevronUp
                      size={18}
                      className="text-[#688078]"
                    />
                  ) : (
                    <ChevronDown
                      size={18}
                      className="text-[#688078]"
                    />
                  )}

                </button>

                {showPayment && (
                  <div className="grid gap-4 border-t border-[#E2EAE6] p-4 sm:grid-cols-2">

                    <TextInput
                      label="Amount"
                      type="number"
                      value={
                        form.amount
                      }
                      placeholder="e.g. 15000"
                      onChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            amount:
                              value,
                          }),
                        )
                      }
                    />

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-[#355B53]">
                        Payment Method
                      </label>

                      <select
                        value={
                          form.paymentMethod
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              paymentMethod:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="min-h-12 w-full rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] px-3 text-sm text-[#294F47] outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#D8EFE8]"
                      >

                        <option value="">
                          Select method
                        </option>

                        <option value="UPI">
                          UPI
                        </option>

                        <option value="BANK_TRANSFER">
                          Bank Transfer
                        </option>

                        <option value="CARD">
                          Card
                        </option>

                        <option value="CASH">
                          Cash
                        </option>

                        <option value="OTHER">
                          Other
                        </option>

                      </select>

                    </div>

                    <div className="sm:col-span-2">

                      <TextInput
                        label="Payment Reference"
                        value={
                          form.paymentReference
                        }
                        placeholder="Transaction / invoice reference"
                        onChange={(
                          value,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              paymentReference:
                                value,
                            }),
                          )
                        }
                      />

                    </div>

                  </div>
                )}

              </div>

              {/* SUMMARY */}

              <div className="mt-5 flex flex-col gap-3 rounded-xl bg-[#F3F5EF] p-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-xs font-semibold text-[#789087]">
                    New subscription
                  </p>

                  <div className="mt-2 flex items-center gap-2">

                    <PlanBadge
                      plan={
                        form.plan
                      }
                    />

                    <span className="text-sm font-semibold text-[#45675E]">
                      {
                        form.durationMonths
                      }{" "}
                      {form.durationMonths ===
                        1
                        ? "month"
                        : "months"}
                    </span>

                  </div>

                </div>

                {form.amount && (
                  <p className="text-xl font-bold text-[#173C36]">
                    ₹
                    {
                      Number(
                        form.amount,
                      ).toLocaleString(
                        "en-IN",
                      )
                    }
                  </p>
                )}

              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]">

                <button
                  type="button"
                  onClick={
                    onClose
                  }
                  disabled={
                    saving
                  }
                  className="min-h-12 rounded-xl border border-[#DCE6E0] px-5 text-sm font-semibold text-[#45675E] hover:bg-[#F4F5EF]"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex min-h-12 min-w-[210px] items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 text-sm font-semibold text-white hover:bg-[#115E59] disabled:opacity-50"
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />

                      {subscription?.status ===
                        "ACTIVE"
                        ? "Renew Subscription"
                        : "Activate Subscription"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </>
        )}

      </div>

    </ModalWrapper>
  );
};

/* ============================================================
   DASHBOARD MODAL
============================================================ */

const HospitalDashboardModal = ({
  hospital,
  onClose,
}: {
  hospital:
  HospitalType;

  onClose:
  () => void;
}) => {
  const [
    data,
    setData,
  ] =
    useState<
      HospitalDashboardData | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(
    () => {
      let active =
        true;

      const load =
        async () => {
          try {
            setLoading(
              true,
            );

            const response =
              await getHospitalDashboard(
                hospital._id,
              );

            if (
              !response.success
            ) {
              throw new Error(
                response.message ||
                "Unable to load dashboard",
              );
            }

            if (
              active
            ) {
              setData(
                response.data,
              );
            }

          } catch (
          error: any
          ) {
            if (
              active
            ) {
              setError(
                error
                  ?.response
                  ?.data
                  ?.message ||
                error?.message ||
                "Unable to load dashboard",
              );
            }

          } finally {
            if (
              active
            ) {
              setLoading(
                false,
              );
            }
          }
        };

      load();

      return () => {
        active =
          false;
      };
    },
    [
      hospital._id,
    ],
  );

  const doctors =
    safeNumber(
      data
        ?.users
        ?.totalDoctors ??
      data
        ?.users
        ?.doctors ??
      data?.doctors,
    );

  const receptionists =
    safeNumber(
      data
        ?.users
        ?.totalReceptionists ??
      data
        ?.users
        ?.receptionists ??
      data?.receptionists,
    );

  const patients =
    safeNumber(
      data
        ?.patients
        ?.total ??
      data?.patientsCount,
    );

  const departments =
    safeNumber(
      data
        ?.departments
        ?.total ??
      data?.departmentsCount,
    );

  const tokens =
    safeNumber(
      data
        ?.queues
        ?.totalTokensToday ??
      data?.todayTokens,
    );

  const queue =
    data?.queues ??
    data?.queue;

  return (
    <ModalWrapper
      onClose={
        onClose
      }
      width="max-w-5xl"
    >

      <ModalHeader
        icon={
          <Activity
            size={21}
          />
        }
        eyebrow="Operational view"
        title={
          hospital.name
        }
        description="Compact hospital activity and queue preview."
        onClose={
          onClose
        }
      />

      <div className="p-5 sm:p-6">

        {loading ? (
          <div className="py-16 text-center">

            <Loader2
              size={28}
              className="mx-auto animate-spin text-[#0F766E]"
            />

          </div>
        ) : error ? (
          <FormError
            message={
              error
            }
          />
        ) : (
          <div className="space-y-6">

            {/* COMPACT METRICS */}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">

              <DetailMetric
                icon={
                  <Stethoscope
                    size={17}
                  />
                }
                label="Doctors"
                value={
                  doctors
                }
              />

              <DetailMetric
                icon={
                  <Users
                    size={17}
                  />
                }
                label="Receptionists"
                value={
                  receptionists
                }
              />

              <DetailMetric
                icon={
                  <Users
                    size={17}
                  />
                }
                label="Patients"
                value={
                  patients
                }
              />

              <DetailMetric
                icon={
                  <Building2
                    size={17}
                  />
                }
                label="Departments"
                value={
                  departments
                }
              />

              <div className="col-span-2 sm:col-span-1">

                <DetailMetric
                  icon={
                    <Ticket
                      size={17}
                    />
                  }
                  label="Today's Tokens"
                  value={
                    tokens
                  }
                />

              </div>

            </div>

            {/* COMPACT QUEUE PREVIEW */}

            <section className="rounded-xl border border-[#DCE6E0] bg-[#F8F6EF] p-4">

              <div className="flex items-center justify-between">

                <div>

                  <h3 className="text-sm font-bold text-[#294F47]">
                    Queue Preview
                  </h3>

                  <p className="mt-0.5 text-xs text-[#80928B]">
                    Today's patient flow
                  </p>

                </div>

                <Ticket
                  size={19}
                  className="text-[#0F766E]"
                />

              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">

                <QueueChip
                  label="Waiting"
                  value={
                    safeNumber(
                      queue?.waiting,
                    )
                  }
                />

                <QueueChip
                  label="Called"
                  value={
                    safeNumber(
                      queue?.called,
                    )
                  }
                />

                <QueueChip
                  label="Serving"
                  value={
                    safeNumber(
                      queue?.serving,
                    )
                  }
                />

                <QueueChip
                  label="Done"
                  value={
                    safeNumber(
                      queue?.completed,
                    )
                  }
                />

                <QueueChip
                  label="Skipped"
                  value={
                    safeNumber(
                      queue?.skipped,
                    )
                  }
                />

              </div>

            </section>

          </div>
        )}

      </div>

    </ModalWrapper>
  );
};

/* ============================================================
   SHARED COMPONENTS
============================================================ */

const ModalWrapper = ({
  children,
  onClose,
  width =
  "max-w-2xl",
}: {
  children:
  ReactNode;

  onClose:
  () => void;

  width?:
  string;
}) => {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#173C36]/45 p-3 sm:p-5"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-[#DCE6E0] bg-[#FFFCF5] shadow-[0_24px_80px_rgba(23,60,54,0.22)] ${width}`}
      >
        {children}
      </div>
    </div>
  );
};

/* ============================================================
   MODAL HEADER
============================================================ */

const ModalHeader = ({
  icon,
  eyebrow,
  title,
  description,
  onClose,
}: {
  icon:
  ReactNode;

  eyebrow:
  string;

  title:
  string;

  description?:
  string;

  onClose:
  () => void;
}) => {
  return (
    <div className="border-b border-[#E2EAE6] px-5 py-5 sm:px-6">

      <div className="flex items-start justify-between gap-4">

        <div className="flex gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E5F2ED] text-[#0F766E]">
            {icon}
          </div>

          <div>

            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F766E]">
              {eyebrow}
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#173C36]">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm text-[#789087]">
                {description}
              </p>
            )}

          </div>

        </div>

        <button
          type="button"
          onClick={
            onClose
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DCE6E0] text-[#70867E] hover:bg-[#F1F5F1]"
        >
          <X
            size={19}
          />
        </button>

      </div>

    </div>
  );
};

/* ============================================================
   FORM SECTION
============================================================ */

const FormSection = ({
  title,
  description,
  children,
}: {
  title:
  string;

  description?:
  string;

  children:
  ReactNode;
}) => {
  return (
    <section>

      <SectionHeading
        title={
          title
        }
        description={
          description
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {children}
      </div>

    </section>
  );
};

/* ============================================================
   TEXT INPUT
============================================================ */

const TextInput = ({
  label,
  value,
  onChange,
  type =
  "text",
  required =
  false,
  placeholder,
  icon,
}: {
  label:
  string;

  value:
  string;

  onChange:
  (
    value:
      string,
  ) => void;

  type?:
  string;

  required?:
  boolean;

  placeholder?:
  string;

  icon?:
  ReactNode;
}) => {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-[#355B53]">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      <div className="relative">

        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81948C]">
            {icon}
          </div>
        )}

        <input
          type={
            type
          }
          required={
            required
          }
          value={
            value
          }
          placeholder={
            placeholder
          }
          onChange={(
            event,
          ) =>
            onChange(
              event
                .target
                .value,
            )
          }
          className={`min-h-12 w-full rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] px-4 text-sm text-[#173C36] outline-none placeholder:text-[#9AA9A3] focus:border-[#0F766E] focus:bg-white focus:ring-2 focus:ring-[#D8EFE8] ${icon
            ? "pl-10"
            : ""
            }`}
        />

      </div>

    </div>
  );
};

/* ============================================================
   PASSWORD
============================================================ */

const PasswordInput = ({
  label,
  value,
  onChange,
  required,
  showPassword,
  onToggle,
}: {
  label:
  string;

  value:
  string;

  onChange:
  (
    value:
      string,
  ) => void;

  required?:
  boolean;

  showPassword:
  boolean;

  onToggle:
  () => void;
}) => {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-[#355B53]">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      <div className="relative">

        <LockKeyhole
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81948C]"
        />

        <input
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={
            value
          }
          required={
            required
          }
          minLength={
            6
          }
          onChange={(
            event,
          ) =>
            onChange(
              event
                .target
                .value,
            )
          }
          placeholder="Minimum 6 characters"
          className="min-h-12 w-full rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] pl-10 pr-12 text-sm text-[#173C36] outline-none focus:border-[#0F766E] focus:bg-white focus:ring-2 focus:ring-[#D8EFE8]"
        />

        <button
          type="button"
          onClick={
            onToggle
          }
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6F857D] hover:bg-[#EAF1ED]"
        >
          {showPassword ? (
            <EyeOff
              size={17}
            />
          ) : (
            <Eye
              size={17}
            />
          )}
        </button>

      </div>

    </div>
  );
};

/* ============================================================
   TEXTAREA
============================================================ */

const TextArea = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label:
  string;

  value:
  string;

  onChange:
  (
    value:
      string,
  ) => void;

  placeholder?:
  string;
}) => {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-[#355B53]">
        {label}
      </label>

      <textarea
        value={
          value
        }
        rows={
          3
        }
        placeholder={
          placeholder
        }
        onChange={(
          event,
        ) =>
          onChange(
            event
              .target
              .value,
          )
        }
        className="w-full resize-none rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] px-4 py-3 text-sm text-[#173C36] outline-none placeholder:text-[#9AA9A3] focus:border-[#0F766E] focus:bg-white focus:ring-2 focus:ring-[#D8EFE8]"
      />

    </div>
  );
};

/* ============================================================
   MODAL ACTIONS
============================================================ */

const ModalActions = ({
  saving,
  cancelLabel,
  submitLabel,
  loadingLabel,
  onCancel,
}: {
  saving:
  boolean;

  cancelLabel:
  string;

  submitLabel:
  string;

  loadingLabel:
  string;

  onCancel:
  () => void;
}) => {
  return (
    <div className="grid gap-2 border-t border-[#E2EAE6] pt-5 sm:grid-cols-[1fr_auto]">

      <button
        type="button"
        disabled={
          saving
        }
        onClick={
          onCancel
        }
        className="min-h-12 rounded-xl border border-[#DCE6E0] px-5 text-sm font-semibold text-[#45675E] hover:bg-[#F4F5EF] disabled:opacity-50"
      >
        {cancelLabel}
      </button>

      <button
        type="submit"
        disabled={
          saving
        }
        className="inline-flex min-h-12 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 text-sm font-semibold text-white hover:bg-[#115E59] disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2
              size={17}
              className="animate-spin"
            />

            {loadingLabel}
          </>
        ) : (
          <>
            <Check
              size={17}
            />

            {submitLabel}
          </>
        )}
      </button>

    </div>
  );
};

/* ============================================================
   PLAN BADGE
============================================================ */

const PlanBadge = ({
  plan,
}: {
  plan:
  HospitalPlan;
}) => {
  if (
    plan ===
    "PREMIUM"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF2D8] px-2.5 py-1.5 text-xs font-bold text-[#8A6417]">

        <Crown
          size={12}
        />

        Premium

      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#E5F2ED] px-2.5 py-1.5 text-xs font-bold text-[#0F766E]">

      <ShieldCheck
        size={12}
      />

      Basic

    </span>
  );
};

/* ============================================================
   SUBSCRIPTION BADGE
============================================================ */

const SubscriptionBadge = ({
  status,
}: {
  status:
  SubscriptionStatus;
}) => {
  if (
    status ===
    "ACTIVE"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">

        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

        Active

      </span>
    );
  }

  if (
    status ===
    "TRIAL"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEE9FF] px-2.5 py-1.5 text-xs font-bold text-[#6750A4]">

        <Clock3
          size={12}
        />

        Trial

      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">

      <AlertCircle
        size={12}
      />

      Expired

    </span>
  );
};

/* ============================================================
   HOSPITAL STATUS
============================================================ */

const HospitalStatusBadge = ({
  active,
}: {
  active:
  boolean;
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${active
        ? "bg-[#E7F4EC] text-[#31714E]"
        : "bg-[#EEEDEA] text-[#6F7773]"
        }`}
    >

      <span
        className={`h-1.5 w-1.5 rounded-full ${active
          ? "bg-[#459565]"
          : "bg-[#929A96]"
          }`}
      />

      {active
        ? "Active"
        : "Inactive"}

    </span>
  );
};

/* ============================================================
   ICON ACTION
============================================================ */

const IconAction = ({
  title,
  onClick,
  children,
  primary = false,
}: {
  title:
  string;

  onClick:
  () => void;

  children:
  ReactNode;

  primary?:
  boolean;
}) => {
  return (
    <button
      type="button"
      title={
        title
      }
      onClick={
        onClick
      }
      className={`flex h-9 w-9 items-center justify-center rounded-lg ${primary
        ? "bg-[#E4F1EC] text-[#0F766E] hover:bg-[#D5EAE3]"
        : "text-[#667F76] hover:bg-[#EDF3EF] hover:text-[#0F766E]"
        }`}
    >
      {children}
    </button>
  );
};

/* ============================================================
   COUNT
============================================================ */

const CountValue = ({
  icon,
  value,
}: {
  icon:
  ReactNode;

  value:
  number;
}) => {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-[#355B53]">

      <span className="text-[#82968E]">
        {icon}
      </span>

      {
        safeNumber(
          value,
        ).toLocaleString()
      }

    </div>
  );
};

/* ============================================================
   MINI METRIC
============================================================ */

const MiniMetric = ({
  label,
  value,
}: {
  label:
  string;

  value:
  number;
}) => {
  return (
    <div className="rounded-lg border border-[#DCE6E0] bg-[#FFFCF5] p-3 text-center">

      <p className="text-lg font-bold text-[#173C36]">
        {
          safeNumber(
            value,
          ).toLocaleString()
        }
      </p>

      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#84968F]">
        {label}
      </p>

    </div>
  );
};

/* ============================================================
   MOBILE INFO
============================================================ */

const MobileInfo = ({
  label,
  value,
}: {
  label:
  string;

  value:
  string;
}) => {
  return (
    <div className="rounded-lg bg-[#F4F5EF] p-3">

      <p className="text-[10px] font-bold uppercase tracking-wide text-[#84968F]">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-[#355B53]">
        {value}
      </p>

    </div>
  );
};

/* ============================================================
   MOBILE ACTION
============================================================ */

const LargeMobileAction = ({
  children,
  icon,
  onClick,
  danger = false,
}: {
  children:
  ReactNode;

  icon:
  ReactNode;

  onClick:
  () => void;

  danger?:
  boolean;
}) => {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${danger
        ? "border-red-200 text-red-600"
        : "border-[#DCE6E0] text-[#45675E]"
        }`}
    >
      {icon}

      {children}
    </button>
  );
};

/* ============================================================
   PLAN CHOICE
============================================================ */

const PlanChoice = ({
  plan,
  title,
  features,
  selected,
  onClick,
}: {
  plan:
  HospitalPlan;

  title:
  string;

  features:
  string[];

  selected:
  boolean;

  onClick:
  () => void;
}) => {
  const premium =
    plan ===
    "PREMIUM";

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-xl border p-4 text-left ${selected
        ? "border-[#0F766E] bg-[#EDF5F1]"
        : "border-[#DCE6E0] bg-[#FFFCF5] hover:bg-[#FAF9F3]"
        }`}
    >

      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-2">

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${premium
              ? "bg-[#FFF1D3] text-[#926B19]"
              : "bg-[#E5F2ED] text-[#0F766E]"
              }`}
          >
            {premium ? (
              <Crown
                size={18}
              />
            ) : (
              <ShieldCheck
                size={18}
              />
            )}
          </div>

          <div>

            <p className="text-sm font-bold text-[#173C36]">
              {title}
            </p>

            <p className="mt-0.5 text-xs text-[#7E918A]">
              {premium
                ? "Full clinical platform"
                : "Core queue platform"}
            </p>

          </div>

        </div>

        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected
            ? "border-[#0F766E] bg-[#0F766E] text-white"
            : "border-[#C9D8D2] text-transparent"
            }`}
        >
          <Check
            size={13}
          />
        </div>

      </div>

      <div className="mt-4 space-y-2">

        {features.map(
          (
            feature,
          ) => (
            <div
              key={
                feature
              }
              className="flex items-center gap-2 text-xs text-[#5D776E]"
            >
              <Check
                size={13}
                className="shrink-0 text-[#0F766E]"
              />

              {feature}
            </div>
          ),
        )}

      </div>

    </button>
  );
};

/* ============================================================
   SUBSCRIPTION INFO
============================================================ */

const SubscriptionInfo = ({
  label,
  children,
}: {
  label:
  string;

  children:
  ReactNode;
}) => {
  return (
    <div className="rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] p-3.5">

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#83968E]">
        {label}
      </p>

      {children}

    </div>
  );
};

/* ============================================================
   DETAIL METRIC
============================================================ */

const DetailMetric = ({
  icon,
  label,
  value,
}: {
  icon:
  ReactNode;

  label:
  string;

  value:
  number;
}) => {
  return (
    <div className="rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] p-4">

      <div className="text-[#0F766E]">
        {icon}
      </div>

      <p className="mt-3 text-xs font-semibold text-[#80928B]">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-[#173C36]">
        {
          safeNumber(
            value,
          ).toLocaleString()
        }
      </p>

    </div>
  );
};

/* ============================================================
   QUEUE CHIP
============================================================ */

const QueueChip = ({
  label,
  value,
}: {
  label:
  string;

  value:
  number;
}) => {
  return (
    <div className="rounded-lg bg-[#FFFCF5] px-2 py-3 text-center">

      <p className="text-lg font-bold text-[#173C36]">
        {
          safeNumber(
            value,
          )
        }
      </p>

      <p className="mt-0.5 truncate text-[10px] font-semibold text-[#80928B]">
        {label}
      </p>

    </div>
  );
};

/* ============================================================
   INFO BOX
============================================================ */

const InfoBox = ({
  label,
  value,
  icon,
}: {
  label:
  string;

  value?:
  string;

  icon?:
  ReactNode;
}) => {
  return (
    <div className="rounded-xl border border-[#DCE6E0] bg-[#F9F7F0] p-4">

      <p className="text-[10px] font-bold uppercase tracking-wide text-[#83968E]">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">

        {icon && (
          <span className="text-[#799087]">
            {icon}
          </span>
        )}

        <p className="break-words text-sm font-semibold text-[#355B53]">
          {
            value ||
            "Not available"
          }
        </p>

      </div>

    </div>
  );
};

/* ============================================================
   SECTION HEADING
============================================================ */

const SectionHeading = ({
  title,
  description,
}: {
  title:
  string;

  description?:
  string;
}) => {
  return (
    <div>

      <h3 className="text-sm font-bold text-[#294F47]">
        {title}
      </h3>

      {description && (
        <p className="mt-1 text-xs leading-5 text-[#81948C]">
          {description}
        </p>
      )}

    </div>
  );
};

/* ============================================================
   FORM ERROR
============================================================ */

const FormError = ({
  message,
}: {
  message:
  string;
}) => {
  return (
    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

      <AlertCircle
        size={18}
        className="mt-0.5 shrink-0 text-red-500"
      />

      <p className="text-sm text-red-700">
        {message}
      </p>

    </div>
  );
};

/* ============================================================
   SECONDARY BUTTON
============================================================ */

const ModalSecondaryButton = ({
  children,
  onClick,
}: {
  children:
  ReactNode;

  onClick:
  () => void;
}) => {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#DCE6E0] px-4 text-sm font-semibold text-[#45675E] hover:bg-[#F4F5EF]"
    >
      {children}
    </button>
  );
};

/* ============================================================
   EMPTY
============================================================ */

const EmptyState = ({
  onClear,
}: {
  onClear:
  () => void;
}) => {
  return (
    <div className="rounded-2xl border border-[#DCE6E0] bg-[#FFFCF5] px-5 py-14 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E5F2ED] text-[#0F766E]">

        <Building2
          size={22}
        />

      </div>

      <h3 className="mt-4 text-base font-bold text-[#173C36]">
        No hospitals found
      </h3>

      <p className="mt-1 text-sm text-[#80928B]">
        Try changing your search or filters.
      </p>

      <button
        type="button"
        onClick={
          onClear
        }
        className="mt-5 min-h-11 rounded-xl border border-[#CFE0D9] px-5 text-sm font-semibold text-[#0F766E]"
      >
        Clear Filters
      </button>

    </div>
  );
};