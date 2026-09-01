import {
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  User,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getQueues,
} from "../../services/queue.api";

import type {
  QueueData,
} from "../../services/queue.api";

const Queue = () => {
  // ==============================
  // STATE
  // ==============================

  const [queues, setQueues] =
    useState<QueueData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | QueueData["status"]>(
      "ALL",
    );

  // ==============================
  // LOAD QUEUE
  // ==============================

  const loadQueues = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const data =
          await getQueues();

        setQueues(data || []);
      } catch (error: any) {
        console.error(
          "Load queue error:",
          error,
        );

        setError(
          error?.response?.data?.message ||
            "Failed to load today's queue",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // ==============================
  // LOAD ON MOUNT
  // ==============================

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  // ==============================
  // FILTER QUEUES
  // ==============================

  const filteredQueues =
    useMemo(() => {
      if (statusFilter === "ALL") {
        return queues;
      }

      return queues.filter(
        (queue) =>
          queue.status === statusFilter,
      );
    }, [queues, statusFilter]);

  // ==============================
  // STATUS COUNTS
  // ==============================

  const waitingCount =
    queues.filter(
      (queue) =>
        queue.status === "WAITING",
    ).length;

  const calledCount =
    queues.filter(
      (queue) =>
        queue.status === "CALLED",
    ).length;

  const servingCount =
    queues.filter(
      (queue) =>
        queue.status === "SERVING",
    ).length;

  const completedCount =
    queues.filter(
      (queue) =>
        queue.status === "COMPLETED",
    ).length;

  // ==============================
  // STATUS STYLE
  // ==============================

  const getStatusStyle = (
    status: QueueData["status"],
  ) => {
    switch (status) {
      case "WAITING":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";

      case "CALLED":
        return "bg-blue-50 text-blue-700 border-blue-200";

      case "SERVING":
        return "bg-purple-50 text-purple-700 border-purple-200";

      case "COMPLETED":
        return "bg-green-50 text-green-700 border-green-200";

      case "SKIPPED":
        return "bg-orange-50 text-orange-700 border-orange-200";

      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200";

      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // ==============================
  // STATUS LABEL
  // ==============================

  const getStatusLabel = (
    status: QueueData["status"],
  ) => {
    return status.charAt(0) +
      status.slice(1).toLowerCase();
  };

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">

          <Loader2
            size={35}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-4 text-sm text-slate-500">
            Loading today's queue...
          </p>

        </div>
      </div>
    );
  }

  // ==============================
  // PAGE
  // ==============================

  return (
    <div className="space-y-6">

      {/* ============================== */}
      {/* HEADER */}
      {/* ============================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Queue & Tokens
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage today's patient queue.
          </p>
        </div>

        <button
          onClick={() =>
            loadQueues(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={18}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>

      </div>

      {/* ============================== */}
      {/* ERROR */}
      {/* ============================== */}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">

          <AlertCircle size={20} />

          <span>
            {error}
          </span>

        </div>
      )}

      {/* ============================== */}
      {/* STATS */}
      {/* ============================== */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        <button
          onClick={() =>
            setStatusFilter("WAITING")
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-yellow-300"
        >
          <p className="text-sm text-slate-500">
            Waiting
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {waitingCount}
          </p>
        </button>

        <button
          onClick={() =>
            setStatusFilter("CALLED")
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300"
        >
          <p className="text-sm text-slate-500">
            Called
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {calledCount}
          </p>
        </button>

        <button
          onClick={() =>
            setStatusFilter("SERVING")
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-purple-300"
        >
          <p className="text-sm text-slate-500">
            Serving
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {servingCount}
          </p>
        </button>

        <button
          onClick={() =>
            setStatusFilter("COMPLETED")
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-green-300"
        >
          <p className="text-sm text-slate-500">
            Completed
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {completedCount}
          </p>
        </button>

      </div>

      {/* ============================== */}
      {/* FILTER */}
      {/* ============================== */}

      <div className="flex flex-wrap gap-2">

        {[
          "ALL",
          "WAITING",
          "CALLED",
          "SERVING",
          "COMPLETED",
          "SKIPPED",
        ].map((status) => (
          <button
            key={status}
            onClick={() =>
              setStatusFilter(
                status as
                  | "ALL"
                  | QueueData["status"],
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {status === "ALL"
              ? "All"
              : status.charAt(0) +
                status
                  .slice(1)
                  .toLowerCase()}
          </button>
        ))}

      </div>

      {/* ============================== */}
      {/* QUEUE TABLE */}
      {/* ============================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {filteredQueues.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-10 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Clock size={26} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No queue patients
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              There are no patients matching
              this filter.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="border-b border-slate-200 bg-slate-50">

                <tr>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Token
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Patient
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Department
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Priority
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Created
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredQueues.map(
                  (queue) => (
                    <tr
                      key={queue._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >

                      {/* TOKEN */}

                      <td className="px-6 py-4">

                        <span className="text-lg font-bold text-blue-600">
                          {queue.tokenLabel}
                        </span>

                      </td>

                      {/* PATIENT */}

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <User size={17} />
                          </div>

                          <div>

                            <p className="font-semibold text-slate-900">
                              {
                                queue
                                  .patientId
                                  ?.name
                              }
                            </p>

                            <p className="text-xs text-slate-500">
                              {
                                queue
                                  .patientId
                                  ?.phone
                              }
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* DEPARTMENT */}

                      <td className="px-6 py-4">

                        <p className="font-medium text-slate-700">
                          {
                            queue
                              .departmentId
                              ?.name
                          }
                        </p>

                      </td>

                      {/* PRIORITY */}

                      <td className="px-6 py-4">

                        {queue.priority ===
                        "EMERGENCY" ? (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                            Emergency
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            Normal
                          </span>
                        )}

                      </td>

                      {/* STATUS */}

                      <td className="px-6 py-4">

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            queue.status,
                          )}`}
                        >
                          {getStatusLabel(
                            queue.status,
                          )}
                        </span>

                      </td>

                      {/* CREATED */}

                      <td className="px-6 py-4 text-sm text-slate-500">

                        {new Date(
                          queue.createdAt,
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}

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
  );
};

export default Queue;