import {
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";

import {
    AlertTriangle,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Hospital,
    Loader2,
    MapPin,
    Stethoscope,
    Ticket,
    UserRound,
} from "lucide-react";

import {
    getPublicAppointmentStatus,
    type PublicAppointmentStatus,
} from "../../services/appointment/appointmentStatus.api";

function formatDate(
    value:
        string,
): string {
    if (
        !value
    ) {
        return "Not available";
    }

    return new Date(
        `${String(
            value,
        ).slice(
            0,
            10,
        )}T00:00:00`,
    ).toLocaleDateString(
        "en-IN",
        {
            day:
                "numeric",
            month:
                "short",
            year:
                "numeric",
        },
    );
}

function statusLabel(
    status:
        string,
): string {
    return String(
        status ||
        "",
    )
        .replace(
            /_/g,
            " ",
        )
        .toLowerCase()
        .replace(
            /\b\w/g,
            (
                char,
            ) =>
                char.toUpperCase(),
        );
}

function doctorName(
    name:
        string,
): string {
    if (
        /^dr\.?\s/i.test(
            name,
        )
    ) {
        return name;
    }

    return `Dr. ${name}`;
}

function getErrorMessage(
    error:
        unknown,
): string {
    const responseMessage =
        (
            error as {
                response?: {
                    data?: {
                        message?: unknown;
                    };
                };
            }
        )?.response?.data?.message;

    if (
        typeof responseMessage ===
        "string" &&
        responseMessage.trim()
    ) {
        return responseMessage;
    }

    const message =
        (
            error as {
                message?: unknown;
            }
        )?.message;

    if (
        typeof message ===
        "string" &&
        message.trim()
    ) {
        return message;
    }

    return "Unable to load appointment status.";
}

export default function AppointmentStatus() {
    const {
        appointmentCode,
    } =
        useParams();

    const [
        searchParams,
    ] =
        useSearchParams();

    const navigate =
        useNavigate();

    const phone =
        searchParams.get(
            "phone",
        ) ||
        "";

    const [
        data,
        setData,
    ] =
        useState<PublicAppointmentStatus | null>(
            null,
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true,
        );

    const [
        error,
        setError,
    ] =
        useState(
            "",
        );

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

                        setError(
                            "",
                        );

                        if (
                            !appointmentCode ||
                            !phone
                        ) {
                            setError(
                                "Appointment code or phone number is missing.",
                            );

                            return;
                        }

                        const result =
                            await getPublicAppointmentStatus(
                                appointmentCode,
                                phone,
                            );

                        if (
                            active
                        ) {
                            setData(
                                result,
                            );
                        }
                    } catch (
                        err
                    ) {
                        if (
                            active
                        ) {
                            setError(
                                getErrorMessage(
                                    err,
                                ),
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

            void load();

            return () => {
                active =
                    false;
            };
        },
        [
            appointmentCode,
            phone,
        ],
    );

    const queueTrackingUrl =
        data?.queue?.trackingToken
            ? `/track/${data.queue.trackingToken}`
            : "";

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
            <div className="mx-auto max-w-2xl">
                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/book-appointment",
                        )
                    }
                    className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft size={16} />
                    Book appointment
                </button>

                {loading && (
                    <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <Loader2
                            className="mx-auto animate-spin text-teal-600"
                            size={34}
                        />

                        <p className="mt-4 text-sm font-semibold text-slate-600">
                            Loading appointment status...
                        </p>
                    </section>
                )}

                {!loading &&
                    error && (
                        <section className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <AlertTriangle size={30} />
                            </div>

                            <h1 className="mt-5 text-2xl font-bold text-slate-900">
                                Appointment not found
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                {error}
                            </p>
                        </section>
                    )}

                {!loading &&
                    data && (
                        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="bg-teal-700 px-6 py-8 text-center text-white">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                                    <CheckCircle2 size={36} />
                                </div>

                                <h1 className="mt-5 text-2xl font-bold">
                                    Appointment status
                                </h1>

                                <p className="mt-2 text-sm text-teal-50">
                                    Show this code at hospital reception.
                                </p>
                            </div>

                            <div className="p-6">
                                <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5 text-center">
                                    <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
                                        Appointment code
                                    </p>

                                    <p className="mt-2 break-words text-3xl font-black tracking-wide text-teal-800">
                                        {data.appointmentCode}
                                    </p>

                                    <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-700">
                                        {statusLabel(
                                            data.status,
                                        )}
                                    </span>
                                </div>

                                <div className="mt-6 grid gap-3">
                                    <InfoRow
                                        icon={
                                            <Hospital size={18} />
                                        }
                                        label="Hospital"
                                        value={
                                            data.hospital?.publicName ||
                                            data.hospital?.name ||
                                            "Hospital"
                                        }
                                    />

                                    <InfoRow
                                        icon={
                                            <MapPin size={18} />
                                        }
                                        label="Location"
                                        value={
                                            [
                                                data.hospital?.district,
                                                data.hospital?.state,
                                            ]
                                                .filter(
                                                    Boolean,
                                                )
                                                .join(
                                                    ", ",
                                                ) ||
                                            "Not available"
                                        }
                                    />

                                    <InfoRow
                                        icon={
                                            <Stethoscope size={18} />
                                        }
                                        label="Doctor"
                                        value={doctorName(
                                            data.doctor?.name ||
                                            "Doctor",
                                        )}
                                    />

                                    <InfoRow
                                        icon={
                                            <UserRound size={18} />
                                        }
                                        label="Patient"
                                        value={`${data.patient?.name || "Patient"} · ${data.patient?.phone || phone}`}
                                    />

                                    <InfoRow
                                        icon={
                                            <CalendarDays size={18} />
                                        }
                                        label="Date"
                                        value={formatDate(
                                            data.date,
                                        )}
                                    />

                                    <InfoRow
                                        icon={
                                            <Clock3 size={18} />
                                        }
                                        label="Time"
                                        value={`${data.startTime || ""}${data.endTime ? ` - ${data.endTime}` : ""}`}
                                    />

                                    <InfoRow
                                        icon={
                                            <Ticket size={18} />
                                        }
                                        label="Queue token"
                                        value={
                                            data.queue?.tokenLabel ||
                                            "Will be generated after reception check-in"
                                        }
                                    />
                                </div>

                                {queueTrackingUrl ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                queueTrackingUrl,
                                            )
                                        }
                                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800"
                                    >
                                        Track live queue
                                    </button>
                                ) : (
                                    <p className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                                        Your live queue tracking link will be available after reception marks you arrived, collects payment, and checks you in.
                                    </p>
                                )}
                            </div>
                        </section>
                    )}
            </div>
        </main>
    );
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon:
        ReactNode;
    label:
        string;
    value:
        string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500">
                    {label}
                </p>

                <p className="mt-1 break-words text-sm font-bold text-slate-900">
                    {value}
                </p>
            </div>
        </div>
    );
}