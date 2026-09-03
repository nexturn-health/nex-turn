import {
  CalendarDays,
  CheckCircle2,
  Plus,
  Search,
  Ticket,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { toast } from "react-hot-toast";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getPatients,
  getTodayPatients,
  createPatient,
} from "../../services/patient.api";

import type {
  Patient,
  CreatePatientPayload,
} from "../../types/patient";

import api from "../../services/api";

/* ============================================================
   TYPES
============================================================ */

interface Department {
  _id: string;
  name: string;
  tokenPrefix?: string;
  description?: string;
  isActive?: boolean;
}

type Priority =
  | "NORMAL"
  | "EMERGENCY";

/* ============================================================
   TOKEN SUCCESS DATA
============================================================ */

interface TokenSuccessData {
  tokenLabel: string;
  patientName: string;
}

/* ============================================================
   COMPONENT
============================================================ */

const Patients = () => {
  /* ==========================================================
     PATIENT DATA
  ========================================================== */

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [allPatients, setAllPatients] =
    useState<Patient[]>([]);

  /* ==========================================================
     SEARCH
  ========================================================== */

  const [search, setSearch] =
    useState("");

  const [allPatientsSearch, setAllPatientsSearch] =
    useState("");

  /* ==========================================================
     LOADING
  ========================================================== */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [registering, setRegistering] =
    useState(false);

  /* ==========================================================
     MODALS
  ========================================================== */

  const [showModal, setShowModal] =
    useState(false);

  const [showRegisterModal, setShowRegisterModal] =
    useState(false);

  /* ==========================================================
     SELECTED PATIENT
  ========================================================== */

  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  /* ==========================================================
     DEPARTMENTS
  ========================================================== */

  const [departments, setDepartments] =
    useState<Department[]>([]);

  /* ==========================================================
     REGISTER FORM
  ========================================================== */

  const [departmentId, setDepartmentId] =
    useState("");

  const [priority, setPriority] =
    useState<Priority>("NORMAL");

  /* ==========================================================
     ERROR
  ========================================================== */

  const [error, setError] =
    useState("");

  /* ==========================================================
     TOKEN SUCCESS POPUP
  ========================================================== */

  const [tokenSuccess, setTokenSuccess] =
    useState<TokenSuccessData | null>(
      null
    );

  /* ==========================================================
     NEW PATIENT FORM
  ========================================================== */

  const [formData, setFormData] =
    useState<CreatePatientPayload>({
      name: "",
      phone: "",
      age: 0,
      gender: "MALE",
      address: "",
      departmentId: "",
    });

  /* ==========================================================
     LOAD PATIENTS
  ========================================================== */

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        todayData,
        allData,
      ] = await Promise.all([
        getTodayPatients(),
        getPatients(),
      ]);

      setPatients(todayData);
      setAllPatients(allData);
    } catch (err) {
      console.error(
        "❌ Failed to load patients:",
        err
      );

      setError(
        "Unable to load patient data."
      );

      toast.error(
        "Failed to load patients"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     LOAD DEPARTMENTS
  ========================================================== */

  const loadDepartments = async () => {
    try {
      const response =
        await api.get("/departments");

      setDepartments(
        response.data?.data ?? []
      );
    } catch (error) {
      console.error(
        "❌ Failed to load departments:",
        error
      );

      toast.error(
        "Failed to load departments"
      );
    }
  };

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadPatients();
    loadDepartments();
  }, []);

  /* ==========================================================
     AUTO HIDE TOKEN SUCCESS POPUP
  ========================================================== */

  useEffect(() => {
    if (!tokenSuccess) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setTokenSuccess(null);
      }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [tokenSuccess]);

  /* ==========================================================
     TODAY SEARCH
  ========================================================== */

  const filteredPatients = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return patients;
    }

    return patients.filter(
      (patient) =>
        patient.name
          ?.toLowerCase()
          .includes(value) ||
        patient.phone
          ?.toLowerCase()
          .includes(value) ||
        patient.patientCode
          ?.toLowerCase()
          .includes(value)
    );
  }, [patients, search]);

  /* ==========================================================
     ALL PATIENT SEARCH
  ========================================================== */

  const filteredAllPatients = useMemo(() => {
    const value =
      allPatientsSearch
        .trim()
        .toLowerCase();

    if (!value) {
      return allPatients;
    }

    return allPatients.filter(
      (patient) =>
        patient.name
          ?.toLowerCase()
          .includes(value) ||
        patient.phone
          ?.toLowerCase()
          .includes(value) ||
        patient.patientCode
          ?.toLowerCase()
          .includes(value) ||
        patient._id
          ?.toLowerCase()
          .includes(value)
    );
  }, [
    allPatients,
    allPatientsSearch,
  ]);

  /* ==========================================================
     CREATE NEW PATIENT
  ========================================================== */

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error(
        "Patient name is required"
      );
      return;
    }

    if (!formData.phone.trim()) {
      toast.error(
        "Phone number is required"
      );
      return;
    }

    if (
      formData.age === undefined ||
      formData.age === null ||
      formData.age < 0
    ) {
      toast.error(
        "Please enter a valid age"
      );
      return;
    }

    try {
      setSaving(true);

      await createPatient(formData);

      toast.success(
        "Patient created successfully"
      );

      closeNewPatientModal();

      await loadPatients();
    } catch (error: any) {
      console.error(
        "❌ Create patient error:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to create patient"
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================
     OPEN REGISTER MODAL
  ========================================================== */

  const handleRegisterToday = (
    patient: Patient
  ) => {
    setSelectedPatient(patient);

    setDepartmentId("");

    setPriority("NORMAL");

    setShowRegisterModal(true);
  };

  /* ==========================================================
     CLOSE REGISTER MODAL
  ========================================================== */

  const closeRegisterModal = () => {
    if (registering) {
      return;
    }

    setShowRegisterModal(false);

    setSelectedPatient(null);

    setDepartmentId("");

    setPriority("NORMAL");
  };

  /* ==========================================================
     GENERATE TOKEN FOR EXISTING PATIENT
  ========================================================== */

  const handleGenerateToken = async () => {
    if (!selectedPatient) {
      toast.error(
        "Patient not selected"
      );
      return;
    }

    if (!departmentId) {
      toast.error(
        "Please select a department"
      );
      return;
    }

    try {
      setRegistering(true);

      const response =
        await api.post(
          "/queues",
          {
            patientId:
              selectedPatient._id,

            departmentId,

            priority,
          }
        );

      /*
       * 200 and 201 are both successful
       * HTTP responses for token creation.
       */

      if (
        response.status !== 200 &&
        response.status !== 201
      ) {
        throw new Error(
          "Token generation failed"
        );
      }

      const data =
        response.data?.data;

      /*
       * Depending on your Queue response,
       * tokenLabel should be here.
       */

      const tokenLabel =
        data?.tokenLabel ||
        data?.token ||
        data?.tokenNumber
          ? String(
              data?.tokenLabel ||
                data?.token ||
                data?.tokenNumber
            )
          : "Generated";

      /* ======================================================
         CLOSE REGISTRATION MODAL
      ====================================================== */

      setShowRegisterModal(false);

      setSelectedPatient(null);

      setDepartmentId("");

      setPriority("NORMAL");

      /* ======================================================
         REFRESH TODAY + ALL PATIENTS
         
         This is the important part.
         
         getTodayPatients() must be backed by Queue
         so an existing patient immediately appears
         in Today's Patients.
      ====================================================== */

      await loadPatients();

      /* ======================================================
         SHOW SUCCESS POPUP
      ====================================================== */

      setTokenSuccess({
        tokenLabel,
        patientName:
          selectedPatient.name,
      });
    } catch (error: any) {
      console.error(
        "❌ Generate token error:",
        error
      );

      const message =
        error?.response?.data?.message ||
        "Failed to generate token";

      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  /* ==========================================================
     CLOSE TOKEN POPUP
  ========================================================== */

  const closeTokenPopup = () => {
    setTokenSuccess(null);
  };

  /* ==========================================================
     DATE FORMATTER
  ========================================================== */

  const formatDate = (
    date?: string
  ) => {
    if (!date) {
      return "—";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /* ==========================================================
     RESET NEW PATIENT MODAL
  ========================================================== */

  const closeNewPatientModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);

    setFormData({
      name: "",
      phone: "",
      age: 0,
      gender: "MALE",
      address: "",
      departmentId: "",
    });
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="relative space-y-6">

      {/* ======================================================
          TOKEN SUCCESS POPUP
      ====================================================== */}

      {tokenSuccess && (
        <div className="fixed right-5 top-5 z-[100] w-[360px] max-w-[calc(100vw-40px)]">

          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl">

            {/* TOP CONTENT */}

            <div className="flex items-start gap-4 p-5">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">

                <CheckCircle2
                  size={24}
                />

              </div>

              <div className="min-w-0 flex-1">

                <div className="flex items-start justify-between gap-3">

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Token Generated
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Patient registered
                      successfully
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeTokenPopup
                    }
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close notification"
                  >
                    <X size={18} />
                  </button>

                </div>

                <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3">

                  <p className="text-xs font-medium text-emerald-600">
                    Token Number
                  </p>

                  <p className="mt-0.5 text-2xl font-black tracking-wide text-emerald-700">
                    {tokenSuccess.tokenLabel}
                  </p>

                  <p className="mt-1 truncate text-xs text-emerald-600">
                    {tokenSuccess.patientName}
                  </p>

                </div>

              </div>

            </div>

            {/* 3 SECOND PROGRESS BAR */}

            <div className="h-1 w-full bg-emerald-100">

              <div
                className="h-full origin-left bg-emerald-500"
                style={{
                  animation:
                    "nexturn-toast-progress 3s linear forwards",
                }}
              />

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users size={22} />
            </div>

            <div>

              <h1 className="text-2xl font-bold text-slate-900">
                Patients
              </h1>

              <p className="text-sm text-slate-500">
                Manage registered patients
                and today's visits
              </p>

            </div>

          </div>

        </div>

        <button
          type="button"
          onClick={() =>
            setShowModal(true)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />

          Add New Patient
        </button>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ======================================================
          TODAY'S PATIENTS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 px-5 py-5">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <CalendarDays
                  size={19}
                  className="text-blue-600"
                />

                <h2 className="text-lg font-bold text-slate-900">
                  Today's Patients
                </h2>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                  {patients.length}
                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Patients with a queue
                registration today
              </p>

            </div>

            <div className="relative w-full lg:w-80">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search today's patients..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[850px]">

            <thead>

              <tr className="border-b border-slate-200 bg-slate-50">

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  #
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Age
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gender
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Address
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (

                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Loading patients...
                  </td>
                </tr>

              ) : filteredPatients.length === 0 ? (

                <tr>

                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center"
                  >

                    <Users
                      size={30}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-sm font-medium text-slate-500">
                      No patients registered
                      today
                    </p>

                  </td>

                </tr>

              ) : (

                filteredPatients.map(
                  (patient, index) => (

                    <tr
                      key={patient._id}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <UserRound
                              size={17}
                            />
                          </div>

                          <div>

                            <p className="font-semibold text-slate-900">
                              {patient.name}
                            </p>

                            {patient.patientCode && (
                              <p className="text-xs text-slate-400">
                                {patient.patientCode}
                              </p>
                            )}

                          </div>

                        </div>

                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {patient.phone ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {patient.age ??
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {patient.gender ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {patient.address ||
                          "—"}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* ======================================================
          ALL PATIENTS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 px-5 py-5">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <Users
                  size={19}
                  className="text-indigo-600"
                />

                <h2 className="text-lg font-bold text-slate-900">
                  All Patients
                </h2>

                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                  {allPatients.length}
                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Search existing patients
                and register them for
                today's queue
              </p>

            </div>

            <div className="relative w-full lg:w-96">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={
                  allPatientsSearch
                }
                onChange={(event) =>
                  setAllPatientsSearch(
                    event.target.value
                  )
                }
                placeholder="Search by name, phone or patient ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />

            </div>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px]">

            <thead>

              <tr className="border-b border-slate-200 bg-slate-50">

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  #
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient ID
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Age
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Registration Date
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (

                <tr>

                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Loading patients...
                  </td>

                </tr>

              ) : filteredAllPatients.length === 0 ? (

                <tr>

                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center"
                  >

                    <Users
                      size={32}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-sm font-medium text-slate-500">
                      No patients found
                    </p>

                  </td>

                </tr>

              ) : (

                filteredAllPatients.map(
                  (patient, index) => (

                    <tr
                      key={patient._id}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <UserRound
                              size={18}
                            />
                          </div>

                          <div>

                            <p className="font-semibold text-slate-900">
                              {patient.name}
                            </p>

                            {patient.address && (
                              <p className="max-w-[220px] truncate text-xs text-slate-400">
                                {patient.address}
                              </p>
                            )}

                          </div>

                        </div>

                      </td>

                      <td className="px-5 py-4">

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {patient.patientCode ||
                            patient._id}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {patient.phone ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {patient.age ??
                          "—"}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-600">

                          <CalendarDays
                            size={15}
                            className="text-slate-400"
                          />

                          {formatDate(
                            patient.createdAt
                          )}

                        </div>

                      </td>

                      <td className="px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            handleRegisterToday(
                              patient
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                        >

                          <Ticket
                            size={15}
                          />

                          Register Today

                        </button>

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* ======================================================
          ADD NEW PATIENT MODAL
      ====================================================== */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>

                <h3 className="text-lg font-bold text-slate-900">
                  Add New Patient
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Create a new patient
                  record
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeNewPatientModal
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      name:
                        event.target.value,
                    })
                  }
                  placeholder="Enter patient name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>

                <input
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      phone:
                        event.target.value,
                    })
                  }
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Age
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      formData.age || ""
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        age: Number(
                          event.target.value
                        ),
                      })
                    }
                    placeholder="Age"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Gender
                  </label>

                  <select
                    value={
                      formData.gender
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        gender:
                          event.target
                            .value as
                            "MALE" |
                            "FEMALE" |
                            "OTHER",
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >

                    <option value="MALE">
                      Male
                    </option>

                    <option value="FEMALE">
                      Female
                    </option>

                    <option value="OTHER">
                      Other
                    </option>

                  </select>

                </div>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Address
                </label>

                <textarea
                  value={
                    formData.address
                  }
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      address:
                        event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Enter address"
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={
                    closeNewPatientModal
                  }
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Create Patient"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ======================================================
          REGISTER EXISTING PATIENT MODAL
      ====================================================== */}

      {showRegisterModal &&
        selectedPatient && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                <div>

                  <h3 className="text-lg font-bold text-slate-900">
                    Register Patient Today
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Generate a queue token
                    for this patient
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    closeRegisterModal
                  }
                  disabled={registering}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <X size={20} />
                </button>

              </div>

              <div className="space-y-5 p-6">

                {/* PATIENT SUMMARY */}

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                      <UserRound
                        size={21}
                      />
                    </div>

                    <div>

                      <p className="font-bold text-slate-900">
                        {selectedPatient.name}
                      </p>

                      <p className="text-sm text-slate-600">
                        {selectedPatient.phone}
                      </p>

                      <p className="mt-1 text-xs font-medium text-blue-600">
                        {selectedPatient.patientCode ||
                          selectedPatient._id}
                      </p>

                    </div>

                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">

                    <div className="rounded-xl bg-white p-3">

                      <p className="text-xs text-slate-400">
                        Age
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {selectedPatient.age ??
                          "—"}
                      </p>

                    </div>

                    <div className="rounded-xl bg-white p-3">

                      <p className="text-xs text-slate-400">
                        Gender
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {selectedPatient.gender ||
                          "—"}
                      </p>

                    </div>

                  </div>

                </div>

                {/* DEPARTMENT */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Department
                  </label>

                  <select
                    value={departmentId}
                    onChange={(event) =>
                      setDepartmentId(
                        event.target.value
                      )
                    }
                    disabled={registering}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >

                    <option value="">
                      Select Department
                    </option>

                    {departments
                      .filter(
                        (department) =>
                          department.isActive !==
                          false
                      )
                      .map(
                        (department) => (

                          <option
                            key={
                              department._id
                            }
                            value={
                              department._id
                            }
                          >
                            {department.name}
                          </option>

                        )
                      )}

                  </select>

                </div>

                {/* PRIORITY */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Priority
                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        setPriority(
                          "NORMAL"
                        )
                      }
                      disabled={registering}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        priority ===
                        "NORMAL"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Normal
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPriority(
                          "EMERGENCY"
                        )
                      }
                      disabled={registering}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        priority ===
                        "EMERGENCY"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Emergency
                    </button>

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                  <button
                    type="button"
                    onClick={
                      closeRegisterModal
                    }
                    disabled={registering}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleGenerateToken
                    }
                    disabled={
                      registering ||
                      !departmentId
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    <Ticket
                      size={17}
                    />

                    {registering
                      ? "Generating..."
                      : "Generate Token"}

                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

      {/* ======================================================
          LOCAL ANIMATION
      ====================================================== */}

      <style>
        {`
          @keyframes nexturn-toast-progress {
            from {
              transform: scaleX(1);
            }

            to {
              transform: scaleX(0);
            }
          }
        `}
      </style>

    </div>
  );
};

export default Patients;