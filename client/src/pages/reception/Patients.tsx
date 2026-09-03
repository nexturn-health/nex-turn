import {
    Plus,
    Search,
    Users,
    X,
    CalendarDays,
    UserRound,
    Phone,
    Mail,
    Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    getTodayPatients,
    getPatients,
    createPatient,
} from "../../services/patient.api";

import type {
    Patient,
    CreatePatientPayload,
} from "../../types/patient";

const Patients = () => {
    /* ============================== */
    /* STATE */
    /* ============================== */

    // Today's patients
    const [patients, setPatients] =
        useState<Patient[]>([]);

    // All hospital patients
    const [allPatients, setAllPatients] =
        useState<Patient[]>([]);

    // Search for today's patients
    const [search, setSearch] =
        useState("");

    // Search for all patients
    const [allPatientsSearch, setAllPatientsSearch] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [loadingAllPatients, setLoadingAllPatients] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [showModal, setShowModal] =
        useState(false);

    const [error, setError] =
        useState("");

    const [formData, setFormData] =
        useState<CreatePatientPayload>({
            name: "",
            phone: "",
            age: 0,
            gender: "MALE",
            address: "",
            departmentId: "",
        });

    /* ============================== */
    /* LOAD TODAY'S PATIENTS */
    /* ============================== */

    const loadPatients = async () => {
        try {
            setLoading(true);

            const data =
                await getTodayPatients();

            setPatients(data || []);
        } catch (error: unknown) {
            console.error(
                "Load today's patients error:",
                error,
            );

            const message =
                axios.isAxiosError(error)
                    ? error.response?.data
                          ?.message ||
                      "Failed to load patients"
                    : "Failed to load patients";

            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    /* ============================== */
    /* LOAD ALL PATIENTS */
    /* ============================== */

    const loadAllPatients = async () => {
        try {
            setLoadingAllPatients(true);

            const data =
                await getPatients();

            setAllPatients(data || []);
        } catch (error: unknown) {
            console.error(
                "Load all patients error:",
                error,
            );

            const message =
                axios.isAxiosError(error)
                    ? error.response?.data
                          ?.message ||
                      "Failed to load all patients"
                    : "Failed to load all patients";

            toast.error(message);
        } finally {
            setLoadingAllPatients(false);
        }
    };

    /* ============================== */
    /* LOAD ON MOUNT */
    /* ============================== */

    useEffect(() => {
        loadPatients();
        loadAllPatients();
    }, []);

    /* ============================== */
    /* FORM CHANGE */
    /* ============================== */

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement |
            HTMLSelectElement
        >,
    ) => {
        const {
            name,
            value,
        } = e.target;

        setFormData(
            (previous) => ({
                ...previous,

                [name]:
                    name === "age"
                        ? Number(value)
                        : value,
            }),
        );
    };

    /* ============================== */
    /* CREATE PATIENT */
    /* ============================== */

    const handleSubmit = async (
        e: React.FormEvent,
    ) => {
        e.preventDefault();

        try {
            setSaving(true);

            setError("");

            const response =
                await createPatient(
                    formData,
                );

            toast.success(
                response?.message ||
                    "Patient registered successfully",
            );

            // Refresh both tables
            await Promise.all([
                loadPatients(),
                loadAllPatients(),
            ]);

            setShowModal(false);

            setFormData({
                name: "",
                phone: "",
                age: 0,
                gender: "MALE",
                address: "",
                departmentId: "",
            });
        } catch (error: unknown) {
            console.error(
                "Create patient error:",
                error,
            );

            const message =
                axios.isAxiosError(error)
                    ? error.response?.data
                          ?.message ||
                      "Failed to create patient"
                    : "Failed to create patient";

            setError(message);

            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    /* ============================== */
    /* FILTER TODAY'S PATIENTS */
    /* ============================== */

    const filteredPatients =
        patients.filter(
            (patient) => {
                const query =
                    search
                        .trim()
                        .toLowerCase();

                return (
                    patient.name
                        .toLowerCase()
                        .includes(query) ||
                    patient.phone.includes(
                        query,
                    )
                );
            },
        );

    /* ============================== */
    /* FILTER ALL PATIENTS */
    /* ============================== */

    const filteredAllPatients =
        useMemo(() => {
            const query =
                allPatientsSearch
                    .trim()
                    .toLowerCase();

            if (!query) {
                return allPatients;
            }

            return allPatients.filter(
                (patient) => {
                    const name =
                        patient.name
                            ?.toLowerCase() ||
                        "";

                    const phone =
                        patient.phone
                            ?.toLowerCase() ||
                        "";

                    const patientCode =
                        patient.patientCode
                            ?.toLowerCase() ||
                        "";

                    return (
                        name.includes(query) ||
                        phone.includes(query) ||
                        patientCode.includes(
                            query,
                        )
                    );
                },
            );
        }, [
            allPatients,
            allPatientsSearch,
        ]);

    return (
        <div className="space-y-8">
            {/* ============================== */}
            {/* HEADER */}
            {/* ============================== */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Patients
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Register and manage hospital patients.
                    </p>
                </div>

                <button
                    onClick={() =>
                        setShowModal(true)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                    <Plus size={18} />

                    Add Patient
                </button>
            </div>

            {/* ============================== */}
            {/* SUMMARY CARDS */}
            {/* ============================== */}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Today's Patients
                            </p>

                            <p className="mt-2 text-3xl font-bold text-slate-900">
                                {patients.length}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <CalendarDays
                                size={21}
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Total Patients
                            </p>

                            <p className="mt-2 text-3xl font-bold text-slate-900">
                                {
                                    allPatients.length
                                }
                            </p>
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Users
                                size={21}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================== */}
            {/* TODAY'S PATIENTS */}
            {/* ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* SECTION HEADER */}

                <div className="border-b border-slate-200 p-5 sm:p-6">
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
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                                Patients registered today.
                            </p>
                        </div>

                        {/* TODAY SEARCH */}

                        <div className="relative w-full lg:w-80">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="text"
                                placeholder="Search today's patients..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target
                                            .value,
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </div>
                    </div>
                </div>

                {/* TABLE */}

                {loading ? (
                    <TableLoading />
                ) : filteredPatients.length ===
                  0 ? (
                    <EmptyPatients
                        message="No patients found"
                    />
                ) : (
                    <PatientTable
                        patients={
                            filteredPatients
                        }
                    />
                )}
            </section>

            {/* ================================================== */}
            {/* ALL PATIENTS */}
            {/* ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* SECTION HEADER */}

                <div className="border-b border-slate-200 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Users
                                    size={19}
                                    className="text-emerald-600"
                                />

                                <h2 className="text-lg font-bold text-slate-900">
                                    All Patients
                                </h2>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                                Complete patient records for your hospital.
                            </p>
                        </div>

                        {/* ALL PATIENTS SEARCH */}

                        <div className="relative w-full lg:w-96">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="text"
                                placeholder="Search by name, phone or patient ID..."
                                value={
                                    allPatientsSearch
                                }
                                onChange={(e) =>
                                    setAllPatientsSearch(
                                        e.target
                                            .value,
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </div>
                    </div>
                </div>

                {/* RESULT COUNT */}

                {!loadingAllPatients && (
                    <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
                        <p className="text-xs font-medium text-slate-500">
                            Showing{" "}
                            <span className="font-semibold text-slate-700">
                                {
                                    filteredAllPatients.length
                                }
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-slate-700">
                                {
                                    allPatients.length
                                }
                            </span>{" "}
                            patients
                        </p>
                    </div>
                )}

                {/* TABLE */}

                {loadingAllPatients ? (
                    <TableLoading />
                ) : filteredAllPatients.length ===
                  0 ? (
                    <EmptyPatients
                        message={
                            allPatientsSearch
                                ? `No patients found for "${allPatientsSearch}"`
                                : "No patients found"
                        }
                    />
                ) : (
                    <AllPatientsTable
                        patients={
                            filteredAllPatients
                        }
                    />
                )}
            </section>

            {/* ============================== */}
            {/* ADD PATIENT MODAL */}
            {/* ============================== */}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
                        {/* MODAL HEADER */}

                        <div className="flex items-center justify-between border-b border-slate-200 p-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Add Patient
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Enter patient information.
                                </p>
                            </div>

                            <button
                                onClick={() =>
                                    setShowModal(
                                        false,
                                    )
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X
                                    size={20}
                                />
                            </button>
                        </div>

                        {/* FORM */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="space-y-5 p-5"
                        >
                            {error && (
                                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                                    {error}
                                </div>
                            )}

                            {/* NAME */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Patient Name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={
                                        formData.name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter patient name"
                                    className={INPUT_CLASSES}
                                />
                            </div>

                            {/* PHONE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={
                                        formData.phone
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter phone number"
                                    className={INPUT_CLASSES}
                                />
                            </div>

                            {/* AGE + GENDER */}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Age
                                    </label>

                                    <input
                                        type="number"
                                        name="age"
                                        required
                                        min="1"
                                        max="150"
                                        value={
                                            formData.age ||
                                            ""
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Age"
                                        className={INPUT_CLASSES}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Gender
                                    </label>

                                    <select
                                        name="gender"
                                        value={
                                            formData.gender
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className={INPUT_CLASSES}
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

                            {/* ADDRESS */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Address
                                </label>

                                <input
                                    type="text"
                                    name="address"
                                    value={
                                        formData.address
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter address"
                                    className={INPUT_CLASSES}
                                />
                            </div>

                            {/* BUTTONS */}

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowModal(
                                            false,
                                        )
                                    }
                                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save Patient"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Patients;

/* =========================================================
   TODAY'S PATIENT TABLE
========================================================= */

function PatientTable({
    patients,
}: {
    patients: Patient[];
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                        <th className={TH_CLASSES}>
                            #
                        </th>

                        <th className={TH_CLASSES}>
                            Patient
                        </th>

                        <th className={TH_CLASSES}>
                            Phone
                        </th>

                        <th className={TH_CLASSES}>
                            Age
                        </th>

                        <th className={TH_CLASSES}>
                            Gender
                        </th>

                        <th className={TH_CLASSES}>
                            Address
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {patients.map(
                        (
                            patient,
                            index,
                        ) => (
                            <tr
                                key={
                                    patient._id
                                }
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                            >
                                {/* NUMBER */}

                                <td className="px-6 py-4 text-sm font-semibold text-slate-400">
                                    {index + 1}
                                </td>

                                {/* PATIENT */}

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <PatientAvatar />

                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                {
                                                    patient.name
                                                }
                                            </p>

                                            {patient.patientCode && (
                                                <p className="mt-0.5 text-xs text-slate-400">
                                                    {
                                                        patient.patientCode
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                {/* PHONE */}

                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {
                                        patient.phone
                                    }
                                </td>

                                {/* AGE */}

                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {
                                        patient.age
                                    }
                                </td>

                                {/* GENDER */}

                                <td className="px-6 py-4">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                                        {
                                            patient.gender
                                        }
                                    </span>
                                </td>

                                {/* ADDRESS */}

                                <td className="max-w-[250px] truncate px-6 py-4 text-sm text-slate-600">
                                    {
                                        patient.address ||
                                        "-"
                                    }
                                </td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}

/* =========================================================
   ALL PATIENTS TABLE
========================================================= */

function AllPatientsTable({
    patients,
}: {
    patients: Patient[];
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                        <th className={TH_CLASSES}>
                            #
                        </th>

                        <th className={TH_CLASSES}>
                            Patient
                        </th>

                        <th className={TH_CLASSES}>
                            Phone
                        </th>

                        <th className={TH_CLASSES}>
                            Patient ID
                        </th>

                        <th className={TH_CLASSES}>
                            Age / Gender
                        </th>

                        <th className={TH_CLASSES}>
                            Email
                        </th>

                        <th className={TH_CLASSES}>
                            Address
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {patients.map(
                        (
                            patient,
                            index,
                        ) => (
                            <tr
                                key={
                                    patient._id
                                }
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                            >
                                {/* NUMBER */}

                                <td className="px-6 py-4 text-sm font-semibold text-slate-400">
                                    {index + 1}
                                </td>

                                {/* PATIENT */}

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <PatientAvatar />

                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                {
                                                    patient.name
                                                }
                                            </p>

                                            <p className="mt-0.5 text-xs text-slate-400">
                                                Patient
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* PHONE */}

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Phone
                                            size={
                                                15
                                            }
                                            className="text-slate-400"
                                        />

                                        {
                                            patient.phone
                                        }
                                    </div>
                                </td>

                                {/* PATIENT ID */}

                                <td className="px-6 py-4">
                                    {patient.patientCode ? (
                                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                                            {
                                                patient.patientCode
                                            }
                                        </span>
                                    ) : (
                                        <span className="text-sm text-slate-400">
                                            -
                                        </span>
                                    )}
                                </td>

                                {/* AGE / GENDER */}

                                <td className="px-6 py-4">
                                    <div className="text-sm text-slate-600">
                                        {
                                            patient.age
                                        }{" "}
                                        yrs

                                        {patient.gender && (
                                            <span className="ml-2 text-xs text-slate-400">
                                                •{" "}
                                                {
                                                    patient.gender
                                                }
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* EMAIL */}

                                <td className="px-6 py-4">
                                    {patient.email ? (
                                        <div className="flex max-w-[220px] items-center gap-2">
                                            <Mail
                                                size={
                                                    15
                                                }
                                                className="shrink-0 text-slate-400"
                                            />

                                            <span className="truncate text-sm text-slate-600">
                                                {
                                                    patient.email
                                                }
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-slate-400">
                                            -
                                        </span>
                                    )}
                                </td>

                                {/* ADDRESS */}

                                <td className="max-w-[220px] truncate px-6 py-4 text-sm text-slate-600">
                                    {
                                        patient.address ||
                                        "-"
                                    }
                                </td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}

/* =========================================================
   PATIENT AVATAR
========================================================= */

function PatientAvatar() {
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserRound size={18} />
        </div>
    );
}

/* =========================================================
   LOADING
========================================================= */

function TableLoading() {
    return (
        <div className="flex min-h-[240px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2
                    size={24}
                    className="animate-spin text-blue-600"
                />

                Loading patients...
            </div>
        </div>
    );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyPatients({
    message,
}: {
    message: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Users size={26} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
                {message}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
                Patient records will appear here.
            </p>
        </div>
    );
}

/* =========================================================
   STYLES
========================================================= */

const TH_CLASSES =
    "px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";

const INPUT_CLASSES =
    "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";