import {
    Plus,
    Search,
    Users,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import {
    useEffect,
    useState,
} from "react";

import {
    getTodayPatients,
    createPatient,
    getPatientById,
    updatePatient,
} from "../../services/patient.api";

import type {
    UpdatePatientPayload,
} from "../../services/patient.api";

import type {
    Patient,
    CreatePatientPayload,
} from "../../types/patient";

const Patients = () => {

    /* ============================== */
    /* STATE */
    /* ============================== */

    const [patients, setPatients] =
        useState<Patient[]>([]);

    const [search, setSearch] =
        useState("");

    const [loading, setLoading] =
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
            departmentId: ""
        });


    /* ============================== */
    /* LOAD PATIENTS */
    /* ============================== */

const loadPatients = async () => {
    try {
        setLoading(true);

        const data = await getTodayPatients();

        setPatients(data || []);

    } catch (error: unknown) {
        console.error(
            "Load patients error:",
            error,
        );

        const message =
            axios.isAxiosError(error)
                ? error.response?.data?.message ||
                  "Failed to load patients"
                : "Failed to load patients";

        toast.error(message);

    } finally {
        setLoading(false);
    }
};

    /* ============================== */
    /* LOAD ON MOUNT */
    /* ============================== */

    useEffect(() => {

        loadPatients();

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
            await createPatient(formData);

        toast.success(
            response?.message ||
            "Patient registered successfully",
        );

        await loadPatients();

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
                ? error.response?.data?.message ||
                  "Failed to create patient"
                : "Failed to create patient";

        toast.error(message);

    } finally {
        setSaving(false);
    }
};
    /* ============================== */
    /* FILTER PATIENTS */
    /* ============================== */

    const filteredPatients =
        patients.filter(
            (patient) =>
                patient.name
                    .toLowerCase()
                    .includes(
                        search.toLowerCase(),
                    ) ||
                patient.phone.includes(
                    search,
                ),
        );


    return (

        <div className="space-y-6">

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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >

                    <Plus size={18} />

                    Add Patient

                </button>

            </div>


            {/* ============================== */}
            {/* SEARCH */}
            {/* ============================== */}

            <div className="relative">

                <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={(e) =>
                        setSearch(
                            e.target.value,
                        )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

            </div>


            {/* ============================== */}
            {/* ERROR */}
            {/* ============================== */}

            {error && !showModal && (

                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">

                    {error}

                </div>
            )}


            {/* ============================== */}
            {/* PATIENT LIST */}
            {/* ============================== */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {loading ? (

                    <div className="p-10 text-center text-sm text-slate-500">

                        Loading patients...

                    </div>

                ) : filteredPatients.length === 0 ? (

                    <div className="flex flex-col items-center justify-center p-12 text-center">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">

                            <Users size={26} />

                        </div>

                        <h3 className="mt-4 font-semibold text-slate-900">

                            No patients found

                        </h3>

                        <p className="mt-1 text-sm text-slate-500">

                            Add your first patient to get started.

                        </p>

                    </div>

                ) : (

                    <div className="overflow-x-auto">

                        <table className="w-full">

                            <thead className="border-b border-slate-200 bg-slate-50">

                                <tr>

                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">

                                        Patient

                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">

                                        Phone

                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">

                                        Age

                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">

                                        Gender

                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">

                                        Address

                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {filteredPatients.map(
                                    (patient) => (

                                        <tr
                                            key={
                                                patient._id
                                            }
                                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                        >

                                            <td className="px-6 py-4">

                                                <p className="font-medium text-slate-900">

                                                    {
                                                        patient.name
                                                    }

                                                </p>

                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-600">

                                                {
                                                    patient.phone
                                                }

                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-600">

                                                {
                                                    patient.age
                                                }

                                            </td>

                                            <td className="px-6 py-4">

                                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">

                                                    {
                                                        patient.gender
                                                    }

                                                </span>

                                            </td>

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

                )}

            </div>


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

                                <X size={20} />

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
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                                    disabled={saving}
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