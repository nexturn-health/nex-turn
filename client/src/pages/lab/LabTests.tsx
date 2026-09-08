import {
    useEffect,
    useMemo,
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
    createLabTest,
    deactivateLabTest,
    getLabDepartments,
    getLabRooms,
    getLabTests,
    updateLabTest,
} from "../../services/lab/lab.api";

import type {
    LabDepartment,
    LabRoom,
    LabTest,
} from "../../types/lab.types";

// ============================================================
// HELPERS
// ============================================================

const getId = (
    value:
        | string
        | {
            _id: string;
        }
        | null
        | undefined,
): string => {
    if (!value) {
        return "";
    }

    return typeof value === "string"
        ? value
        : value._id;
};

// ============================================================
// COMPONENT
// ============================================================

const LabTests = () => {
    const [
        tests,
        setTests,
    ] = useState<LabTest[]>([]);

    const [
        departments,
        setDepartments,
    ] =
        useState<
            LabDepartment[]
        >([]);

    const [
        rooms,
        setRooms,
    ] = useState<LabRoom[]>([]);

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
        useState<LabTest | null>(
            null,
        );

    const [
        name,
        setName,
    ] = useState("");

    const [
        code,
        setCode,
    ] = useState("");

    const [
        category,
        setCategory,
    ] = useState("");

    const [
        description,
        setDescription,
    ] = useState("");

    const [
        price,
        setPrice,
    ] = useState("");

    const [
        sampleType,
        setSampleType,
    ] = useState("");

    const [
        turnaround,
        setTurnaround,
    ] = useState("");

    const [
        departmentId,
        setDepartmentId,
    ] = useState("");

    const [
        roomId,
        setRoomId,
    ] = useState("");

    // ========================================================
    // LOAD
    // ========================================================

    const loadData =
        async () => {
            try {
                setLoading(true);

                const [
                    testData,
                    departmentData,
                    roomData,
                ] =
                    await Promise.all([
                        getLabTests(),
                        getLabDepartments(
                            true,
                        ),
                        getLabRooms({
                            isActive:
                                true,
                        }),
                    ]);

                setTests(
                    testData,
                );

                setDepartments(
                    departmentData,
                );

                setRooms(
                    roomData,
                );
            } catch (error) {
                console.error(
                    error,
                );

                toast.error(
                    "Unable to load lab tests.",
                );
            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        loadData();
    }, []);

    // ========================================================
    // FILTER ROOMS
    // ========================================================

    const availableRooms =
        useMemo(
            () =>
                rooms.filter(
                    (
                        room,
                    ) =>
                        getId(
                            room.labDepartmentId,
                        ) ===
                        departmentId,
                ),
            [
                rooms,
                departmentId,
            ],
        );

    // ========================================================
    // DEPARTMENT CHANGE
    // ========================================================

    const handleDepartmentChange =
        (
            value: string,
        ) => {
            setDepartmentId(
                value,
            );

            setRoomId("");
        };

    // ========================================================
    // RESET
    // ========================================================

    const resetForm =
        () => {
            setEditing(null);
            setName("");
            setCode("");
            setCategory("");
            setDescription("");
            setPrice("");
            setSampleType("");
            setTurnaround("");
            setDepartmentId("");
            setRoomId("");
        };

    // ========================================================
    // EDIT
    // ========================================================

    const openEdit = (
        test: LabTest,
    ) => {
        setEditing(test);

        setName(
            test.name,
        );

        setCode(
            test.code || "",
        );

        setCategory(
            test.category ||
            "",
        );

        setDescription(
            test.description ||
            "",
        );

        setPrice(
            String(
                test.price,
            ),
        );

        setSampleType(
            test.sampleType ||
            "",
        );

        setTurnaround(
            test.turnaroundTimeMinutes
                ? String(
                    test.turnaroundTimeMinutes,
                )
                : "",
        );

        setDepartmentId(
            getId(
                test.labDepartmentId,
            ),
        );

        setRoomId(
            getId(
                test.labRoomId,
            ),
        );

        setShowModal(true);
    };

    // ========================================================
    // SAVE
    // ========================================================

    const handleSave =
        async () => {
            if (
                !name.trim() ||
                !departmentId ||
                !roomId ||
                !price
            ) {
                toast.error(
                    "Please fill all required fields.",
                );

                return;
            }

            try {
                const payload = {
                    name: name.trim(),

                    code: code
                        .trim()
                        .toUpperCase(),

                    category:
                        category.trim(),

                    description:
                        description.trim(),

                    price: Number(
                        price,
                    ),

                    sampleType:
                        sampleType.trim(),

                    turnaroundTimeMinutes:
                        turnaround
                            ? Number(
                                turnaround,
                            )
                            : undefined,

                    labDepartmentId:
                        departmentId,

                    labRoomId:
                        roomId,
                };

                if (
                    editing
                ) {
                    await updateLabTest(
                        editing._id,
                        payload,
                    );

                    toast.success(
                        "Lab test updated.",
                    );
                } else {
                    await createLabTest(
                        payload,
                    );

                    toast.success(
                        "Lab test created.",
                    );
                }

                setShowModal(
                    false,
                );

                resetForm();

                await loadData();
            } catch (error) {
                console.error(
                    error,
                );

                toast.error(
                    "Unable to save lab test.",
                );
            }
        };

    // ========================================================
    // DEACTIVATE
    // ========================================================

    const handleDeactivate =
        async (
            test: LabTest,
        ) => {
            if (
                !window.confirm(
                    `Deactivate "${test.name}"?`,
                )
            ) {
                return;
            }

            try {
                await deactivateLabTest(
                    test._id,
                );

                toast.success(
                    "Lab test deactivated.",
                );

                await loadData();
            } catch (error) {
                console.error(
                    error,
                );

                toast.error(
                    "Unable to deactivate test.",
                );
            }
        };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-7xl">
                {/* HEADER */}

                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-slate-900 p-3 text-white">
                            <FlaskConical size={22} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold">
                                Lab Tests
                            </h1>

                            <p className="text-sm text-slate-500">
                                Configure tests and automatic routing
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={
                                loadData
                            }
                            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5"
                        >
                            <RefreshCw
                                size={
                                    16
                                }
                            />

                            Refresh
                        </button>

                        <button
                            onClick={() => {
                                resetForm();
                                setShowModal(
                                    true,
                                );
                            }}
                            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white"
                        >
                            <Plus
                                size={
                                    17
                                }
                            />

                            Add Test
                        </button>
                    </div>
                </div>

                {/* INFO */}

                <div className="mb-6 rounded-2xl border bg-white p-5">
                    <div className="font-semibold text-slate-900">
                        Automatic routing
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        Assign every test to a lab
                        department and room. Doctors
                        will only select the test.
                        NexTurn automatically routes the
                        order to the configured location.
                    </p>
                </div>

                {/* TABLE */}

                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center">
                            Loading...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs uppercase text-slate-500">
                                            Test
                                        </th>

                                        <th className="px-6 py-4 text-left text-xs uppercase text-slate-500">
                                            Price
                                        </th>

                                        <th className="px-6 py-4 text-left text-xs uppercase text-slate-500">
                                            Department
                                        </th>

                                        <th className="px-6 py-4 text-left text-xs uppercase text-slate-500">
                                            Room
                                        </th>

                                        <th className="px-6 py-4 text-left text-xs uppercase text-slate-500">
                                            Status
                                        </th>

                                        <th className="px-6 py-4 text-right text-xs uppercase text-slate-500">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {tests.map(
                                        (
                                            test,
                                        ) => (
                                            <tr
                                                key={
                                                    test._id
                                                }
                                                className="hover:bg-slate-50"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold">
                                                        {
                                                            test.name
                                                        }
                                                    </div>

                                                    <div className="text-xs text-slate-500">
                                                        {test.code ||
                                                            "No code"}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 font-medium">
                                                    ₹
                                                    {test.price.toLocaleString(
                                                        "en-IN",
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {test.labDepartmentId &&
                                                        typeof test.labDepartmentId !== "string"
                                                        ? test.labDepartmentId.name
                                                        : "—"}
                                                </td>

                                                <td className="px-6 py-4 text-sm">
                                                    {test.labRoomId &&
                                                        typeof test.labRoomId !== "string"
                                                        ? `${test.labRoomId.name} (${test.labRoomId.roomNumber})`
                                                        : "—"}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                                                        {test.isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() =>
                                                                openEdit(
                                                                    test,
                                                                )
                                                            }
                                                            className="rounded-lg border p-2"
                                                        >
                                                            <Pencil
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </button>

                                                        {test.isActive && (
                                                            <button
                                                                onClick={() =>
                                                                    handleDeactivate(
                                                                        test,
                                                                    )
                                                                }
                                                                className="rounded-lg border p-2 text-red-600"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
                    <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6">
                        <h2 className="mb-5 text-xl font-bold">
                            {editing
                                ? "Edit Lab Test"
                                : "Create Lab Test"}
                        </h2>

                        <div className="grid gap-3 sm:grid-cols-2">
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
                                placeholder="Test name *"
                                className="rounded-xl border px-4 py-3"
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
                                placeholder="Test code"
                                className="rounded-xl border px-4 py-3 uppercase"
                            />

                            <input
                                value={
                                    category
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setCategory(
                                        e.target.value,
                                    )
                                }
                                placeholder="Category"
                                className="rounded-xl border px-4 py-3"
                            />

                            <input
                                type="number"
                                min="0"
                                value={
                                    price
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setPrice(
                                        e.target.value,
                                    )
                                }
                                placeholder="Price *"
                                className="rounded-xl border px-4 py-3"
                            />

                            <input
                                value={
                                    sampleType
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setSampleType(
                                        e.target.value,
                                    )
                                }
                                placeholder="Sample type e.g. Blood"
                                className="rounded-xl border px-4 py-3"
                            />

                            <input
                                type="number"
                                min="1"
                                value={
                                    turnaround
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setTurnaround(
                                        e.target.value,
                                    )
                                }
                                placeholder="Turnaround minutes"
                                className="rounded-xl border px-4 py-3"
                            />

                            {/* DEPARTMENT */}

                            <select
                                value={
                                    departmentId
                                }
                                onChange={(
                                    e,
                                ) =>
                                    handleDepartmentChange(
                                        e.target.value,
                                    )
                                }
                                className="rounded-xl border px-4 py-3"
                            >
                                <option value="">
                                    Select lab department *
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

                            {/* ROOM */}

                            <select
                                value={
                                    roomId
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setRoomId(
                                        e.target.value,
                                    )
                                }
                                disabled={
                                    !departmentId
                                }
                                className="rounded-xl border px-4 py-3 disabled:bg-slate-100"
                            >
                                <option value="">
                                    {departmentId
                                        ? "Select lab room *"
                                        : "Select department first"}
                                </option>

                                {availableRooms.map(
                                    (
                                        room,
                                    ) => (
                                        <option
                                            key={
                                                room._id
                                            }
                                            value={
                                                room._id
                                            }
                                        >
                                            {
                                                room.name
                                            }{" "}
                                            (
                                            {
                                                room.roomNumber
                                            }
                                            )
                                        </option>
                                    ),
                                )}
                            </select>

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
                                    3
                                }
                                className="sm:col-span-2 rounded-xl border px-4 py-3"
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
                                className="rounded-xl border px-5 py-2.5"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={
                                    handleSave
                                }
                                className="rounded-xl bg-slate-900 px-5 py-2.5 text-white"
                            >
                                {editing
                                    ? "Update Test"
                                    : "Create Test"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabTests;