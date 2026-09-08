import {
    useEffect,
    useState,
} from "react";

import {
    Plus,
    Pencil,
    Trash2,
    DoorOpen,
    RefreshCw,
} from "lucide-react";

import toast from "react-hot-toast";

import {
    createLabRoom,
    deactivateLabRoom,
    getLabDepartments,
    getLabRooms,
    updateLabRoom,
} from "../../services/lab/lab.api";

import type {
    LabDepartment,
    LabRoom,
} from "../../types/lab.types";

// ============================================================
// HELPERS
// ============================================================

const getDepartmentName = (
    room: LabRoom,
): string => {
    if (
        typeof room.labDepartmentId ===
        "string"
    ) {
        return "—";
    }

    return room.labDepartmentId
        ?.name || "—";
};

// ============================================================
// COMPONENT
// ============================================================

const LabRooms = () => {
    const [
        rooms,
        setRooms,
    ] = useState<LabRoom[]>([]);

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
        useState<LabRoom | null>(
            null,
        );

    const [
        departmentId,
        setDepartmentId,
    ] = useState("");

    const [
        name,
        setName,
    ] = useState("");

    const [
        roomNumber,
        setRoomNumber,
    ] = useState("");

    const [
        building,
        setBuilding,
    ] = useState("");

    const [
        floor,
        setFloor,
    ] = useState("");

    const [
        description,
        setDescription,
    ] = useState("");

    // ========================================================
    // LOAD
    // ========================================================

    const loadData =
        async () => {
            try {
                setLoading(true);

                const [
                    roomData,
                    departmentData,
                ] =
                    await Promise.all([
                        getLabRooms(),
                        getLabDepartments(
                            true,
                        ),
                    ]);

                setRooms(
                    roomData,
                );

                setDepartments(
                    departmentData,
                );
            } catch (error) {
                console.error(
                    error,
                );

                toast.error(
                    "Unable to load lab rooms.",
                );
            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        loadData();
    }, []);

    // ========================================================
    // RESET
    // ========================================================

    const resetForm =
        () => {
            setEditing(null);
            setDepartmentId("");
            setName("");
            setRoomNumber("");
            setBuilding("");
            setFloor("");
            setDescription("");
        };

    // ========================================================
    // EDIT
    // ========================================================

    const openEdit = (
        room: LabRoom,
    ) => {
        setEditing(room);

        setDepartmentId(
            typeof room.labDepartmentId ===
                "string"
                ? room.labDepartmentId
                : room
                      .labDepartmentId
                      ._id,
        );

        setName(
            room.name,
        );

        setRoomNumber(
            room.roomNumber,
        );

        setBuilding(
            room.building,
        );

        setFloor(
            room.floor,
        );

        setDescription(
            room.description ||
                "",
        );

        setShowModal(true);
    };

    // ========================================================
    // SAVE
    // ========================================================

    const handleSave =
        async () => {
            if (
                !departmentId ||
                !name.trim() ||
                !roomNumber.trim() ||
                !building.trim() ||
                !floor.trim()
            ) {
                toast.error(
                    "Please fill all required fields.",
                );

                return;
            }

            try {
                if (
                    editing
                ) {
                    await updateLabRoom(
                        editing._id,
                        {
                            labDepartmentId:
                                departmentId,
                            name: name.trim(),
                            roomNumber:
                                roomNumber
                                    .trim()
                                    .toUpperCase(),
                            building:
                                building.trim(),
                            floor:
                                floor.trim(),
                            description:
                                description.trim(),
                        },
                    );

                    toast.success(
                        "Lab room updated.",
                    );
                } else {
                    await createLabRoom(
                        {
                            labDepartmentId:
                                departmentId,
                            name: name.trim(),
                            roomNumber:
                                roomNumber
                                    .trim()
                                    .toUpperCase(),
                            building:
                                building.trim(),
                            floor:
                                floor.trim(),
                            description:
                                description.trim(),
                        },
                    );

                    toast.success(
                        "Lab room created.",
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
                    "Unable to save lab room.",
                );
            }
        };

    // ========================================================
    // DEACTIVATE
    // ========================================================

    const handleDeactivate =
        async (
            room: LabRoom,
        ) => {
            if (
                !window.confirm(
                    `Deactivate "${room.name}"?`,
                )
            ) {
                return;
            }

            try {
                await deactivateLabRoom(
                    room._id,
                );

                toast.success(
                    "Lab room deactivated.",
                );

                await loadData();
            } catch (error) {
                console.error(
                    error,
                );

                toast.error(
                    "Unable to deactivate lab room.",
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
                            <DoorOpen size={22} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold">
                                Lab Rooms
                            </h1>

                            <p className="text-sm text-slate-500">
                                Manage laboratory rooms
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

                            Add Room
                        </button>
                    </div>
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
                                            Room
                                        </th>

                                        <th className="px-6 py-4 text-left text-xs uppercase text-slate-500">
                                            Department
                                        </th>

                                        <th className="px-6 py-4 text-left text-xs uppercase text-slate-500">
                                            Location
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
                                    {rooms.map(
                                        (
                                            room,
                                        ) => (
                                            <tr
                                                key={
                                                    room._id
                                                }
                                                className="hover:bg-slate-50"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold">
                                                        {
                                                            room.name
                                                        }
                                                    </div>

                                                    <div className="text-sm text-slate-500">
                                                        {
                                                            room.roomNumber
                                                        }
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-sm">
                                                    {getDepartmentName(
                                                        room,
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {
                                                        room.building
                                                    }

                                                    {" • "}

                                                    {
                                                        room.floor
                                                    }
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                                                        {room.isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() =>
                                                                openEdit(
                                                                    room,
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

                                                        {room.isActive && (
                                                            <button
                                                                onClick={() =>
                                                                    handleDeactivate(
                                                                        room,
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6">
                        <h2 className="mb-5 text-xl font-bold">
                            {editing
                                ? "Edit Lab Room"
                                : "Create Lab Room"}
                        </h2>

                        <div className="space-y-3">
                            <select
                                value={
                                    departmentId
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setDepartmentId(
                                        e.target.value,
                                    )
                                }
                                className="w-full rounded-xl border px-4 py-3"
                            >
                                <option value="">
                                    Select lab department
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
                                placeholder="Room name"
                                className="w-full rounded-xl border px-4 py-3"
                            />

                            <input
                                value={
                                    roomNumber
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setRoomNumber(
                                        e.target.value,
                                    )
                                }
                                placeholder="Room number e.g. H-01"
                                className="w-full rounded-xl border px-4 py-3 uppercase"
                            />

                            <input
                                value={
                                    building
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setBuilding(
                                        e.target.value,
                                    )
                                }
                                placeholder="Building"
                                className="w-full rounded-xl border px-4 py-3"
                            />

                            <input
                                value={
                                    floor
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setFloor(
                                        e.target.value,
                                    )
                                }
                                placeholder="Floor e.g. 2nd Floor"
                                className="w-full rounded-xl border px-4 py-3"
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
                                    3
                                }
                                className="w-full rounded-xl border px-4 py-3"
                            />
                        </div>

                        <div className="mt-5 flex justify-end gap-3">
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

export default LabRooms;