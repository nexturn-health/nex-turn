import {
    CalendarDays,
    Clock,
    RefreshCw,
    Trash2,
    User,
} from "lucide-react";

import {
    useEffect,
    useState,
} from "react";

import {
    deleteAppointment,
    getAppointments,
    updateAppointmentStatus,
    type Appointment,
} from "../../services/appointment.api";

const Appointments = () => {

    const [appointments, setAppointments] =
        useState<Appointment[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [updatingId, setUpdatingId] =
        useState<string | null>(null);

    // =====================================
    // FETCH APPOINTMENTS
    // =====================================

    const fetchAppointments = async () => {

        try {

            setLoading(true);

            const data =
                await getAppointments();

            setAppointments(data);

        } catch (error) {

            console.error(
                "Failed to fetch appointments:",
                error,
            );

            setError(
                "Failed to load appointments",
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchAppointments();

    }, []);

    // =====================================
    // GET APPOINTMENT ID
    // =====================================

    const getAppointmentId = (
        appointment: Appointment,
    ) => {

        return (
            appointment._id ||
            appointment.id ||
            ""
        );

    };

    // =====================================
    // UPDATE STATUS
    // =====================================

    const handleStatusChange = async (
        appointment: Appointment,
        status: Appointment["status"],
    ) => {

        const id =
            getAppointmentId(
                appointment,
            );

        if (!id) {
            alert(
                "Appointment ID not found",
            );

            return;
        }

        try {

            setUpdatingId(id);

            await updateAppointmentStatus(
                id,
                status,
            );

            await fetchAppointments();

        } catch (error) {

            console.error(
                "Failed to update appointment:",
                error,
            );

            alert(
                "Failed to update appointment",
            );

        } finally {

            setUpdatingId(null);

        }

    };

    // =====================================
    // DELETE APPOINTMENT
    // =====================================

    const handleDelete = async (
        appointment: Appointment,
    ) => {

        const id =
            getAppointmentId(
                appointment,
            );

        if (!id) {

            alert(
                "Appointment ID not found",
            );

            return;

        }

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this appointment?",
            );

        if (!confirmed) {
            return;
        }

        try {

            await deleteAppointment(id);

            await fetchAppointments();

        } catch (error) {

            console.error(
                "Failed to delete appointment:",
                error,
            );

            alert(
                "Failed to delete appointment",
            );

        }

    };

    // =====================================
    // STATUS STYLE
    // =====================================

    const getStatusStyle = (
        status: string,
    ) => {

        switch (status) {

            case "BOOKED":
                return "bg-blue-50 text-blue-600";

            case "CONFIRMED":
                return "bg-emerald-50 text-emerald-600";

            case "COMPLETED":
                return "bg-slate-100 text-slate-600";

            case "CANCELLED":
                return "bg-red-50 text-red-600";

            default:
                return "bg-slate-100 text-slate-600";

        }

    };

    // =====================================
    // LOADING
    // =====================================

    if (loading) {

        return (

            <div className="flex min-h-[400px] items-center justify-center">

                <RefreshCw
                    size={30}
                    className="animate-spin text-blue-600"
                />

            </div>

        );

    }

    // =====================================
    // UI
    // =====================================

    return (

        <div>

            {/* ============================== */}
            {/* HEADER */}
            {/* ============================== */}

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                    <h1 className="text-2xl font-bold text-slate-900">

                        Appointments

                    </h1>

                    <p className="mt-1 text-sm text-slate-500">

                        Manage patient appointments

                    </p>

                </div>

                <button
                    onClick={fetchAppointments}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >

                    <RefreshCw size={17} />

                    Refresh

                </button>

            </div>

            {/* ============================== */}
            {/* ERROR */}
            {/* ============================== */}

            {error && (

                <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">

                    {error}

                </div>

            )}

            {/* ============================== */}
            {/* APPOINTMENTS */}
            {/* ============================== */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {/* TABLE HEADER */}

                <div className="hidden grid-cols-6 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">

                    <div>
                        Patient
                    </div>

                    <div>
                        Department
                    </div>

                    <div>
                        Doctor
                    </div>

                    <div>
                        Date & Time
                    </div>

                    <div>
                        Status
                    </div>

                    <div className="text-right">
                        Actions
                    </div>

                </div>

                {/* EMPTY */}

                {appointments.length === 0 && (

                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">

                        <CalendarDays
                            size={45}
                            className="text-slate-300"
                        />

                        <h3 className="mt-4 font-semibold text-slate-900">

                            No appointments found

                        </h3>

                        <p className="mt-1 text-sm text-slate-500">

                            Patient appointments will appear here.

                        </p>

                    </div>

                )}

                {/* LIST */}

                {appointments.map(
                    (appointment) => {

                        const id =
                            getAppointmentId(
                                appointment,
                            );

                        return (

                            <div
                                key={id}
                                className="border-b border-slate-100 last:border-none"
                            >

                                {/* DESKTOP */}

                                <div className="hidden grid-cols-6 items-center gap-4 px-6 py-5 lg:grid">

                                    {/* PATIENT */}

                                    <div className="flex items-center gap-3">

                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">

                                            <User size={18} />

                                        </div>

                                        <div>

                                            <p className="text-sm font-semibold text-slate-900">

                                                {appointment.patientId?.name ||
                                                    "Unknown Patient"}

                                            </p>

                                            <p className="text-xs text-slate-500">

                                                {appointment.patientId?.phone ||
                                                    "No phone"}

                                            </p>

                                        </div>

                                    </div>

                                    {/* DEPARTMENT */}

                                    <div>

                                        <p className="text-sm font-medium text-slate-700">

                                            {appointment.departmentId?.name ||
                                                "-"}

                                        </p>

                                    </div>

                                    {/* DOCTOR */}

                                    <div>

                                        <p className="text-sm text-slate-700">

                                            {appointment.doctorId?.name ||
                                                "Not assigned"}

                                        </p>

                                    </div>

                                    {/* DATE */}

                                    <div>

                                        <div className="flex items-center gap-2 text-sm text-slate-700">

                                            <CalendarDays
                                                size={15}
                                            />

                                            {appointment.appointmentDate}

                                        </div>

                                        {appointment.appointmentTime && (

                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">

                                                <Clock
                                                    size={14}
                                                />

                                                {appointment.appointmentTime}

                                            </div>

                                        )}

                                    </div>

                                    {/* STATUS */}

                                    <div>

                                        <select
                                            value={
                                                appointment.status
                                            }
                                            disabled={
                                                updatingId === id
                                            }
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    appointment,
                                                    event.target.value as Appointment["status"],
                                                )
                                            }
                                            className={`rounded-lg px-3 py-2 text-xs font-semibold outline-none ${getStatusStyle(
                                                appointment.status,
                                            )}`}
                                        >

                                            <option value="BOOKED">
                                                BOOKED
                                            </option>

                                            <option value="CONFIRMED">
                                                CONFIRMED
                                            </option>

                                            <option value="COMPLETED">
                                                COMPLETED
                                            </option>

                                            <option value="CANCELLED">
                                                CANCELLED
                                            </option>

                                        </select>

                                    </div>

                                    {/* ACTION */}

                                    <div className="flex justify-end">

                                        <button
                                            onClick={() =>
                                                handleDelete(
                                                    appointment,
                                                )
                                            }
                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                            title="Delete"
                                        >

                                            <Trash2
                                                size={17}
                                            />

                                        </button>

                                    </div>

                                </div>

                                {/* ============================== */}
                                {/* MOBILE / TABLET CARD */}
                                {/* ============================== */}

                                <div className="p-5 lg:hidden">

                                    <div className="flex items-start justify-between gap-4">

                                        <div className="flex items-center gap-3">

                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">

                                                <User size={19} />

                                            </div>

                                            <div>

                                                <h3 className="font-semibold text-slate-900">

                                                    {appointment.patientId?.name ||
                                                        "Unknown Patient"}

                                                </h3>

                                                <p className="text-xs text-slate-500">

                                                    {appointment.patientId?.phone ||
                                                        "No phone"}

                                                </p>

                                            </div>

                                        </div>

                                        <button
                                            onClick={() =>
                                                handleDelete(
                                                    appointment,
                                                )
                                            }
                                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                        >

                                            <Trash2 size={18} />

                                        </button>

                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-4 text-sm">

                                        <div>

                                            <p className="text-xs text-slate-400">

                                                Department

                                            </p>

                                            <p className="mt-1 font-medium text-slate-700">

                                                {appointment.departmentId?.name ||
                                                    "-"}

                                            </p>

                                        </div>

                                        <div>

                                            <p className="text-xs text-slate-400">

                                                Doctor

                                            </p>

                                            <p className="mt-1 font-medium text-slate-700">

                                                {appointment.doctorId?.name ||
                                                    "Not assigned"}

                                            </p>

                                        </div>

                                        <div>

                                            <p className="text-xs text-slate-400">

                                                Date

                                            </p>

                                            <p className="mt-1 font-medium text-slate-700">

                                                {appointment.appointmentDate}

                                            </p>

                                        </div>

                                        <div>

                                            <p className="text-xs text-slate-400">

                                                Time

                                            </p>

                                            <p className="mt-1 font-medium text-slate-700">

                                                {appointment.appointmentTime ||
                                                    "-"}

                                            </p>

                                        </div>

                                    </div>

                                    <div className="mt-5">

                                        <select
                                            value={
                                                appointment.status
                                            }
                                            disabled={
                                                updatingId === id
                                            }
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    appointment,
                                                    event.target.value as Appointment["status"],
                                                )
                                            }
                                            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none ${getStatusStyle(
                                                appointment.status,
                                            )}`}
                                        >

                                            <option value="BOOKED">
                                                BOOKED
                                            </option>

                                            <option value="CONFIRMED">
                                                CONFIRMED
                                            </option>

                                            <option value="COMPLETED">
                                                COMPLETED
                                            </option>

                                            <option value="CANCELLED">
                                                CANCELLED
                                            </option>

                                        </select>

                                    </div>

                                </div>

                            </div>

                        );

                    },
                )}

            </div>

        </div>

    );

};

export default Appointments;