import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  RefreshCw,
  SkipForward,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  callNextPatient,
  completePatient,
  skipPatient,
  startServingPatient,
} from "../../services/queue.api";

import {
  getDoctorQueue,
  type DoctorQueueItem,
} from "../../services/doctor.api";

// ============================================================
// DOCTOR QUEUE
// ============================================================

const DoctorQueue = () => {
  const [queues, setQueues] = useState<DoctorQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD QUEUE
  // ==========================================================

  const loadQueue = useCallback(async () => {
    try {
      setError("");

      const data = await getDoctorQueue();

      console.log("DOCTOR QUEUE API DATA:", data);

      setQueues(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Load doctor queue error:", error);

      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load queue",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // ==========================================================
  // CURRENT PATIENT
  // ==========================================================

  const currentPatient = useMemo(() => {
    return queues.find(
      (queue) =>
        queue.status === "CALLED" ||
        queue.status === "SERVING",
    );
  }, [queues]);

  // ==========================================================
  // WAITING PATIENTS
  // ==========================================================

  const waitingPatients = useMemo(() => {
    return queues.filter(
      (queue) => queue.status === "WAITING",
    );
  }, [queues]);



  // ==========================================================
  // COMPLETED PATIENTS
  // ==========================================================

  const completedPatients = useMemo(() => {
    return queues.filter(
      (queue) => queue.status === "COMPLETED",
    );
  }, [queues]);

  // ==========================================================
  // CALL NEXT PATIENT
  // ==========================================================

  const handleCallNext = async () => {
    try {
      setActionLoading(true);
      setError("");

      await callNextPatient();

      await loadQueue();
    } catch (error: any) {
      console.error(
        "Call next patient error:",
        error,
      );

      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to call next patient",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================
  // START SERVING
  // ==========================================================

  const handleStartServing = async () => {
    if (!currentPatient) return;

    try {
      setActionLoading(true);
      setError("");

      await startServingPatient(
        currentPatient._id,
      );

      await loadQueue();
    } catch (error: any) {
      console.error(
        "Start serving error:",
        error,
      );

      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to start serving",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================
  // COMPLETE PATIENT
  // ==========================================================

  const handleComplete = async () => {
    if (!currentPatient) return;

    try {
      setActionLoading(true);
      setError("");

      await completePatient(
        currentPatient._id,
      );

      await loadQueue();
    } catch (error: any) {
      console.error(
        "Complete patient error:",
        error,
      );

      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to complete patient",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================
  // SKIP PATIENT
  // ==========================================================

  const handleSkip = async () => {
    if (!currentPatient) return;

    try {
      setActionLoading(true);
      setError("");

      await skipPatient(
        currentPatient._id,
      );

      await loadQueue();
    } catch (error: any) {
      console.error(
        "Skip patient error:",
        error,
      );

      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to skip patient",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={35}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-4 text-sm text-slate-500">
            Loading your queue...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================
  console.log("QUEUE DATA:", queues);
  return (
    <div className="mx-auto max-w-7xl">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Queue
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your patients and today's queue.
          </p>
        </div>

        <button
          onClick={loadQueue}
          disabled={actionLoading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              actionLoading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {/* ======================================================
          STATS
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-3">

        <StatCard
          title="Waiting"
          value={waitingPatients.length}
          icon={<Users size={21} />}
        />

        <StatCard
          title="Current Patient"
          value={currentPatient ? 1 : 0}
          icon={<Stethoscope size={21} />}
        />

        <StatCard
          title="Completed Today"
          value={completedPatients.length}
          icon={<CheckCircle2 size={21} />}
        />

      </div>

      {/* ======================================================
          CURRENT PATIENT
      ====================================================== */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        {/* HEADER */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Current Patient
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage the patient currently assigned to you
            </p>
          </div>

          <Stethoscope
            size={22}
            className="text-blue-600"
          />
        </div>

        {/* =========================================================
           SINGLE ROW
          ========================================================= */}

        <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 xl:flex-row xl:items-center">

          {/* PATIENT */}

          <div className="flex min-w-0 flex-1 items-center gap-4">

            {/* PATIENT ICON */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
              <User size={22} />
            </div>

            <div className="min-w-0 flex-1">

              {currentPatient ? (
                <>
                  {/* NAME + TOKEN */}
                  <div className="flex items-center gap-5">

                    <h3 className="truncate text-base font-bold text-slate-900">
                      {currentPatient.patientId?.name ||
                        currentPatient.patient?.name ||
                        "Unknown Patient"}
                    </h3>

                    <span className="shrink-0  rounded-xl bg-blue-600 px-5 py-2 text-base font-extrabold tracking-wide text-white shadow-sm">
                      {currentPatient.tokenLabel}
                    </span>

                  </div>

                  {/* PHONE + PATIENT CODE */}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">

                    {(
                      currentPatient.patientId?.phone ||
                      currentPatient.patient?.phone
                    ) && (
                        <span className="flex items-center gap-1.5">
                          <Phone size={13} />

                          {currentPatient.patientId?.phone ||
                            currentPatient.patient?.phone}
                        </span>
                      )}

                  

                  </div>
                </>
              ) : (
                <div>
                  <h3 className="font-semibold text-slate-700">
                    No patient currently assigned
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Call the next patient when you're ready.
                  </p>
                </div>
              )}

            </div>

          </div>


          {/* STATUS */}
          <div className="shrink-0">
            {currentPatient ? (
              <StatusBadge status={currentPatient.status} />
            ) : (
              <span className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                AVAILABLE
              </span>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">

            {/* START SERVING */}
            {currentPatient?.status === "CALLED" && (
              <button
                onClick={handleStartServing}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Stethoscope size={17} />
                )}

                Start Serving
              </button>
            )}

            {/* COMPLETE */}
            {currentPatient?.status === "SERVING" && (
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle2 size={17} />
                )}

                Complete
              </button>
            )}

            {/* SKIP */}
            {currentPatient && (
              <button
                onClick={handleSkip}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <SkipForward size={17} />
                )}

                Skip
              </button>
            )}

            {/* NEXT PATIENT */}
            {!currentPatient && (
              <button
                onClick={handleCallNext}
                disabled={
                  actionLoading ||
                  waitingPatients.length === 0
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Phone size={17} />
                )}

                Next Patient
              </button>
            )}

          </div>

        </div>

      </div>

      {/* ======================================================
          WAITING QUEUE
      ====================================================== */}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <div className="flex items-center gap-2">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Users
                  size={19}
                  className="text-blue-600"
                />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Waiting Queue
              </h2>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {waitingPatients.length}
              </span>

            </div>

            <p className="mt-1 text-sm text-slate-500">
              Patients waiting for your department
            </p>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />

            <span className="text-sm font-semibold text-blue-700">
              {waitingPatients.length} waiting
            </span>
          </div>

        </div>

        {/* Empty State */}
        {waitingPatients.length === 0 ? (

          <div className="px-6 py-14 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
              <Users
                size={28}
                className="text-slate-300"
              />
            </div>

            <p className="mt-4 font-semibold text-slate-700">
              No patients waiting
            </p>

            <p className="mt-1 text-sm text-slate-500">
              The queue is currently empty.
            </p>

          </div>

        ) : (

          /* Table */
          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/80">

                  <th className="w-12 px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    #
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Token
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Patient
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Phone
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Priority
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Estimated Wait
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {waitingPatients.map((queue, index) => (

                  <tr
                    key={queue._id}
                    className="group transition-colors hover:bg-slate-50/70"
                  >

                    {/* NUMBER */}

                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-medium text-slate-400">
                        {index + 1}
                      </span>
                    </td>

                    {/* TOKEN */}

                    <td className="px-5 py-4">

                      <span className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                        {queue.tokenLabel}
                      </span>

                    </td>

                    {/* PATIENT */}

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                          {queue.patientId?.name
                            ?.charAt(0)
                            ?.toUpperCase() || "P"}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-slate-900">
                            {queue.patientId?.name ||
                              "Unknown Patient"}
                          </p>

                          {queue.patientId?.patientCode && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {queue.patientId.patientCode}
                            </p>
                          )}

                        </div>

                      </div>

                    </td>

                    {/* PHONE */}

                    <td className="px-5 py-4">

                      <span className="text-sm font-medium text-slate-600">
                        {queue.patientId?.phone || "N/A"}
                      </span>

                    </td>

                    {/* PRIORITY */}

                    <td className="px-5 py-4">

                      {queue.priority === "EMERGENCY" ? (

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">

                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />

                          Emergency

                        </span>

                      ) : (

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">

                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />

                          Normal

                        </span>

                      )}

                    </td>

                    {/* ESTIMATED WAIT */}

                    <td className="px-5 py-4">

                      {typeof queue.estimatedWaitMinutes === "number" ? (

                        queue.estimatedWaitMinutes === 0 ? (

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Now
                          </span>

                        ) : (

                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              {queue.estimatedWaitMinutes} min
                            </p>

                            {queue.estimatedTurnTime && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                Around{" "}
                                {new Date(
                                  queue.estimatedTurnTime
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>

                        )

                      ) : (

                        <span className="text-sm font-medium text-slate-400">
                          Calculating...
                        </span>

                      )}

                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-4">
                      <StatusBadge status={queue.status} />
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {/* Footer */}

        {waitingPatients.length > 0 && (

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">

            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {waitingPatients.length}
              </span>{" "}
              patients currently waiting
            </p>

            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              Queue active
            </div>

          </div>

        )}

      </div>

      {/* ======================================================
          COMPLETED
      ====================================================== */}

      {completedPatients.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle2
                    size={19}
                    className="text-emerald-600"
                  />
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  Completed Today
                </h2>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {completedPatients.length}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Patients who have completed their consultation today
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <CheckCircle2
                size={16}
                className="text-emerald-600"
              />

              <span className="text-sm font-semibold text-slate-700">
                Completed
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="w-12 px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    #
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Patient
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Token
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Department
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Doctor
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Priority
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Completed At
                  </th>

                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {completedPatients.map((queue, index) => (
                  <tr
                    key={queue._id}
                    className="group transition-colors hover:bg-slate-50/70"
                  >

                    {/* Number */}
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-medium text-slate-400">
                        {index + 1}
                      </span>
                    </td>

                    {/* Patient */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                          {queue.patientId?.name
                            ?.charAt(0)
                            ?.toUpperCase() || "P"}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {queue.patientId?.name || "Unknown Patient"}
                          </p>

                          <div className="mt-0.5 flex items-center gap-2">
                            {queue.patientId?.patientCode && (
                              <span className="text-xs text-slate-500">
                                {queue.patientId.patientCode}
                              </span>
                            )}

                            {queue.patientId?.phone && (
                              <>
                                <span className="text-slate-300">•</span>

                                <span className="text-xs text-slate-400">
                                  {queue.patientId.phone}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    </td>

                    {/* Token */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                        {queue.tokenLabel}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">
                        {queue.departmentId?.name || "N/A"}
                      </p>
                    </td>

                    {/* Doctor */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-700">
                          {queue.doctorId?.name || "N/A"}
                        </p>

                        {queue.doctorId?.email && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {queue.doctorId.email}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="px-5 py-4">
                      {queue.priority === "EMERGENCY" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Emergency
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Normal
                        </span>
                      )}
                    </td>

                    {/* Completed At */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {queue.completedAt
                            ? new Date(queue.completedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            : "N/A"}
                        </p>

                        {queue.completedAt && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {new Date(queue.completedAt).toLocaleDateString([], {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={queue.status} />
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {completedPatients.length}
              </span>{" "}
              completed patients
            </p>

            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              All consultations completed
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

// ============================================================
// STAT CARD
// ============================================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

const StatCard = ({
  title,
  value,
  icon,
}: StatCardProps) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

      </div>

      <p className="mt-4 text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
};

// ============================================================
// STATUS
// ============================================================

type QueueStatus = DoctorQueueItem["status"];

const statusConfig: Record<
  QueueStatus,
  {
    text: string;
    className: string;
  }
> = {
  CALLED: {
    text: "Patient Called",
    className: "bg-orange-50 text-orange-600",
  },

  SERVING: {
    text: "Currently Serving",
    className: "bg-emerald-50 text-emerald-600",
  },

  WAITING: {
    text: "Waiting",
    className: "bg-blue-50 text-blue-600",
  },

  COMPLETED: {
    text: "Completed",
    className: "bg-emerald-50 text-emerald-600",
  },

  SKIPPED: {
    text: "Skipped",
    className: "bg-red-50 text-red-600",
  },

  CANCELLED: {
    text: "Cancelled",
    className: "bg-slate-100 text-slate-600",
  },
};

// ============================================================
// STATUS BADGE
// ============================================================

const StatusBadge = ({
  status,
}: {
  status: QueueStatus;
}) => {
  const item = statusConfig[status];

  if (!item) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
        {status}
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.className}`}
    >
      {item.text}
    </span>
  );
};

export default DoctorQueue;