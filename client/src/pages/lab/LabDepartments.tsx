import {
    useEffect,
    useState,
} from "react";

import {
    Plus,
    Pencil,
    Trash2,
    FlaskConical,
    RefreshCw,
} from "lucide-react";

import toast from "react-hot-toast";

import {
    createLabDepartment,
    deactivateLabDepartment,
    getLabDepartments,
    updateLabDepartment,
} from "../../services/lab/lab.api";

import type {
    LabDepartment,
} from "../../types/lab.types";

// ============================================================
// COMPONENT
// ============================================================

const LabDepartments =
    () => {
        const [
            departments,
            setDepartments,
        ] =
            useState<
                LabDepartment[]
            >([]);

        const [
            loading,
            setLoading,
        ] = useState(true);

        const [
            showModal,
            setShowModal,
        ] = useState(false);

        const [
            editing,
            setEditing,
        ] =
            useState<
                LabDepartment | null
            >(null);

        const [
            name,
            setName,
        ] = useState("");

        const [
            code,
            setCode,
        ] = useState("");

        const [
            description,
            setDescription,
        ] = useState("");

        // ======================================================
        // LOAD
        // ======================================================

        const loadDepartments =
            async () => {
                try {
                    setLoading(true);

                    const data =
                        await getLabDepartments();

                    setDepartments(
                        data,
                    );
                } catch (error) {
                    console.error(
                        error,
                    );

                    toast.error(
                        "Unable to load lab departments.",
                    );
                } finally {
                    setLoading(false);
                }
            };

        useEffect(() => {
            loadDepartments();
        }, []);

        // ======================================================
        // RESET
        // ======================================================

        const resetForm =
            () => {
                setName("");
                setCode("");
                setDescription("");
                setEditing(null);
            };

        // ======================================================
        // OPEN CREATE
        // ======================================================

        const openCreate =
            () => {
                resetForm();
                setShowModal(true);
            };

        // ======================================================
        // OPEN EDIT
        // ======================================================

        const openEdit = (
            department: LabDepartment,
        ) => {
            setEditing(
                department,
            );

            setName(
                department.name,
            );

            setCode(
                department.code ||
                    "",
            );

            setDescription(
                department.description ||
                    "",
            );

            setShowModal(true);
        };

        // ======================================================
        // SAVE
        // ======================================================

        const handleSave =
            async () => {
                if (
                    !name.trim()
                ) {
                    toast.error(
                        "Department name is required.",
                    );

                    return;
                }

                try {
                    if (
                        editing
                    ) {
                        await updateLabDepartment(
                            editing._id,
                            {
                                name: name.trim(),
                                code: code
                                    .trim()
                                    .toUpperCase(),
                                description:
                                    description.trim(),
                            },
                        );

                        toast.success(
                            "Lab department updated.",
                        );
                    } else {
                        await createLabDepartment(
                            {
                                name: name.trim(),
                                code: code
                                    .trim()
                                    .toUpperCase(),
                                description:
                                    description.trim(),
                            },
                        );

                        toast.success(
                            "Lab department created.",
                        );
                    }

                    setShowModal(
                        false,
                    );

                    resetForm();

                    await loadDepartments();
                } catch (error) {
                    console.error(
                        error,
                    );

                    toast.error(
                        "Unable to save lab department.",
                    );
                }
            };

        // ======================================================
        // DELETE
        // ======================================================

        const handleDeactivate =
            async (
                department: LabDepartment,
            ) => {
                if (
                    !window.confirm(
                        `Deactivate "${department.name}"?`,
                    )
                ) {
                    return;
                }

                try {
                    await deactivateLabDepartment(
                        department._id,
                    );

                    toast.success(
                        "Lab department deactivated.",
                    );

                    await loadDepartments();
                } catch (error) {
                    console.error(
                        error,
                    );

                    toast.error(
                        "Unable to deactivate department.",
                    );
                }
            };

        // ======================================================
        // RENDER
        // ======================================================

        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-7xl">
                    {/* HEADER */}

                    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-slate-900 p-3 text-white">
                                    <FlaskConical size={22} />
                                </div>

                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        Lab Departments
                                    </h1>

                                    <p className="text-sm text-slate-500">
                                        Manage laboratory departments
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={
                                    loadDepartments
                                }
                                className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                            >
                                <RefreshCw
                                    size={
                                        16
                                    }
                                />

                                Refresh
                            </button>

                            <button
                                onClick={
                                    openCreate
                                }
                                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                            >
                                <Plus
                                    size={
                                        17
                                    }
                                />

                                Add Department
                            </button>
                        </div>
                    </div>

                    {/* TABLE */}

                    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500">
                                Loading...
                            </div>
                        ) : departments.length ===
                          0 ? (
                            <div className="p-12 text-center text-slate-500">
                                No lab departments found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                                                Department
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                                                Code
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                                                Description
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                                                Status
                                            </th>

                                            <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {departments.map(
                                            (
                                                department,
                                            ) => (
                                                <tr
                                                    key={
                                                        department._id
                                                    }
                                                    className="hover:bg-slate-50"
                                                >
                                                    <td className="px-6 py-4 font-medium text-slate-900">
                                                        {
                                                            department.name
                                                        }
                                                    </td>

                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {department.code ||
                                                            "—"}
                                                    </td>

                                                    <td className="max-w-md px-6 py-4 text-sm text-slate-500">
                                                        {department.description ||
                                                            "—"}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                                department.isActive
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-slate-100 text-slate-500"
                                                            }`}
                                                        >
                                                            {department.isActive
                                                                ? "Active"
                                                                : "Inactive"}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    openEdit(
                                                                        department,
                                                                    )
                                                                }
                                                                className="rounded-lg border p-2 hover:bg-slate-100"
                                                            >
                                                                <Pencil
                                                                    size={
                                                                        16
                                                                    }
                                                                />
                                                            </button>

                                                            {department.isActive && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleDeactivate(
                                                                            department,
                                                                        )
                                                                    }
                                                                    className="rounded-lg border p-2 text-red-600 hover:bg-red-50"
                                                                >
                                                                    <Trash2
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL */}

                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                            <h2 className="mb-5 text-xl font-bold text-slate-900">
                                {editing
                                    ? "Edit Lab Department"
                                    : "Create Lab Department"}
                            </h2>

                            <div className="space-y-4">
                                <input
                                    value={
                                        name
                                    }
                                    onChange={(
                                        e,
                                    ) =>
                                        setName(
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Department name"
                                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-slate-500"
                                />

                                <input
                                    value={
                                        code
                                    }
                                    onChange={(
                                        e,
                                    ) =>
                                        setCode(
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Code e.g. HEM"
                                    className="w-full rounded-xl border px-4 py-3 uppercase outline-none focus:border-slate-500"
                                />

                                <textarea
                                    value={
                                        description
                                    }
                                    onChange={(
                                        e,
                                    ) =>
                                        setDescription(
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Description"
                                    rows={
                                        4
                                    }
                                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-slate-500"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowModal(
                                            false,
                                        );

                                        resetForm();
                                    }}
                                    className="rounded-xl border px-5 py-2.5 font-medium"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={
                                        handleSave
                                    }
                                    className="rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white"
                                >
                                    {editing
                                        ? "Update"
                                        : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

export default LabDepartments;