import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Crown,
  Loader2,
  LockKeyhole,
  Phone,
  RefreshCw,
  SkipForward,
  Sparkles,
  Stethoscope,
  Ticket,
  User,
  Users,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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

import api from "../../services/api";

import {
  useAuthStore,
} from "../../store/authStore";

import StartConsultation from "./DoctorConsultation";

/* ============================================================
   TYPES
============================================================ */

interface StartConsultationResponse {
  success: boolean;

  message?: string;

  data?: {
    _id?: string;
    id?: string;
    consultationId?: string;
  };
}

const isAppointmentPatient = (
  queue?: DoctorQueueItem | null,
) => {
  if (!queue) {
    return false;
  }

  return (
    queue.source === "APPOINTMENT" ||
    Boolean(queue.appointmentId) ||
    Boolean(queue.scheduledStartTime) ||
    queue.tokenLabel?.includes("-A")
  );
};

/* ============================================================
   DOCTOR QUEUE
============================================================ */

const DoctorQueue = () => {

  /* ========================================================
     SUBSCRIPTION
  ======================================================== */

  const subscription =
    useAuthStore(
      (state) =>
        state.subscription,
    );

  const isPremium =
    subscription?.plan ===
    "PREMIUM";

  /* ========================================================
     STATE
  ======================================================== */

  const [
    queues,
    setQueues,
  ] =
    useState<
      DoctorQueueItem[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    consultationLoading,
    setConsultationLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    consultationId,
    setConsultationId,
  ] =
    useState<
      string | null
    >(null);

  const [
    premiumNotice,
    setPremiumNotice,
  ] =
    useState(false);

  /* ========================================================
     LOAD QUEUE
  ======================================================== */

  const loadQueue =
    useCallback(
      async () => {

        try {

          setError("");

          const data =
            await getDoctorQueue();

          setQueues(
            data ?? [],
          );

        } catch (
        error: any
        ) {

          console.error(
            "Load doctor queue error:",
            error,
          );

          setError(
            error
              ?.response
              ?.data
              ?.message ||
            "Failed to load queue",
          );

        } finally {

          setLoading(
            false,
          );
        }
      },
      [],
    );

  /* ========================================================
     INITIAL LOAD
  ======================================================== */

  useEffect(
    () => {

      loadQueue();

    },
    [
      loadQueue,
    ],
  );

  /* ========================================================
     AUTO REFRESH
  ======================================================== */

  useEffect(
    () => {

      const interval =
        window.setInterval(
          () => {

            /*
             * Don't refresh queue while the
             * consultation modal is open.
             */

            if (
              !consultationId
            ) {

              loadQueue();
            }

          },
          5000,
        );

      return () => {

        window.clearInterval(
          interval,
        );
      };

    },
    [
      loadQueue,
      consultationId,
    ],
  );

  /* ========================================================
     CURRENT PATIENT
  ======================================================== */

  const currentPatient =
    useMemo(
      () => {

        return queues.find(
          (
            queue,
          ) =>
            queue.status ===
            "CALLED" ||
            queue.status ===
            "SERVING",
        );

      },
      [
        queues,
      ],
    );

  const currentPatientIsAppointment =
    isAppointmentPatient(
      currentPatient,
    );

  const currentPatientIsEmergency =
    currentPatient?.priority ===
    "EMERGENCY";

  /* ========================================================
     WAITING PATIENTS
  ======================================================== */
  const waitingPatients =
    useMemo(
      () => {
        return queues
          .filter(
            (
              queue,
            ) =>
              queue.status ===
              "WAITING",
          )
          .sort(
            (
              first,
              second,
            ) => {
              const firstPriority =
                first.priority ===
                  "EMERGENCY"
                  ? 0
                  : 1;

              const secondPriority =
                second.priority ===
                  "EMERGENCY"
                  ? 0
                  : 1;

              if (
                firstPriority !==
                secondPriority
              ) {
                return (
                  firstPriority -
                  secondPriority
                );
              }

              return (
                Number(
                  first.tokenNumber,
                ) -
                Number(
                  second.tokenNumber,
                )
              );
            },
          );
      },
      [
        queues,
      ],
    );

  /* ========================================================
     COMPLETED PATIENTS
  ======================================================== */

  const completedPatients =
    useMemo(
      () => {

        return queues.filter(
          (
            queue,
          ) =>
            queue.status ===
            "COMPLETED",
        );

      },
      [
        queues,
      ],
    );

  /* ========================================================
     CALL NEXT

     BASIC + PREMIUM

     WAITING
        ↓
     CALLED
  ======================================================== */

  const handleCallNext =
    async () => {

      try {

        setActionLoading(
          true,
        );

        setError("");

        await callNextPatient();

        await loadQueue();

      } catch (
      error: any
      ) {

        console.error(
          "Call next patient error:",
          error,
        );

        setError(
          error
            ?.response
            ?.data
            ?.message ||
          "Failed to call next patient",
        );

      } finally {

        setActionLoading(
          false,
        );
      }
    };

  /* ========================================================
     BASIC — START SERVING

     BASIC ONLY

     CALLED
        ↓
     SERVING
  ======================================================== */

  const handleBasicStartServing =
    async () => {

      if (
        !currentPatient
      ) {
        return;
      }

      try {

        setActionLoading(
          true,
        );

        setError("");

        await startServingPatient(
          currentPatient._id,
        );

        await loadQueue();

      } catch (
      error: any
      ) {

        console.error(
          "Start serving error:",
          error,
        );

        setError(
          error
            ?.response
            ?.data
            ?.message ||
          "Failed to start serving patient",
        );

      } finally {

        setActionLoading(
          false,
        );
      }
    };

  /* ========================================================
     PREMIUM — START CONSULTATION WITH AI

     ONE CLICK FLOW

     CALLED
        ↓
     START SERVING API
        ↓
     SERVING
        ↓
     START CONSULTATION API
        ↓
     OPEN CONSULTATION MODAL

     If already SERVING:
     skip start-serving API and reopen consultation.
  ======================================================== */

  const handleStartPremiumConsultation =
    async () => {

      if (
        !currentPatient
      ) {
        return;
      }

      if (
        !isPremium
      ) {

        setPremiumNotice(
          true,
        );

        return;
      }

      try {

        setConsultationLoading(
          true,
        );

        setError("");

        /* ============================================
           STEP 1
           CALLED → SERVING
        ============================================ */

        if (
          currentPatient.status ===
          "CALLED"
        ) {

          await startServingPatient(
            currentPatient._id,
          );
        }

        /* ============================================
           STEP 2
           START / GET CONSULTATION
        ============================================ */

        const response =
          await api.post<
            StartConsultationResponse
          >(
            "/consultations/start",
            {
              queueId:
                currentPatient._id,
            },
          );

        const responseData =
          response.data;

        const consultation =
          responseData.data;

        const id =
          consultation?._id ||
          consultation?.id ||
          consultation
            ?.consultationId;

        if (!id) {

          console.error(
            "START CONSULTATION RESPONSE:",
            responseData,
          );

          throw new Error(
            "Consultation ID was not returned by server.",
          );
        }

        /* ============================================
           STEP 3
           UPDATE QUEUE STATE LOCALLY
        ============================================ */

        setQueues(
          (
            currentQueues,
          ) =>
            currentQueues.map(
              (
                queue,
              ) =>
                queue._id ===
                  currentPatient._id
                  ? {
                    ...queue,
                    status:
                      "SERVING",
                  }
                  : queue,
            ),
        );

        /* ============================================
           STEP 4
           OPEN MODAL
        ============================================ */

        setConsultationId(
          id,
        );

      } catch (
      error: any
      ) {

        console.error(
          "Start consultation error:",
          error,
        );

        const code =
          error
            ?.response
            ?.data
            ?.code;

        if (
          code ===
          "PREMIUM_REQUIRED"
        ) {

          setPremiumNotice(
            true,
          );

          return;
        }

        setError(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          "Unable to start consultation.",
        );

        /*
         * Start Serving may already have succeeded
         * before consultation creation failed.
         *
         * Reload to show the real queue state.
         */

        await loadQueue();

      } finally {

        setConsultationLoading(
          false,
        );
      }
    };

  /* ========================================================
     BASIC — COMPLETE PATIENT

     BASIC ONLY

     SERVING
        ↓
     COMPLETED
  ======================================================== */

  const handleBasicComplete =
    async () => {

      if (
        !currentPatient
      ) {
        return;
      }

      if (
        currentPatient.status !==
        "SERVING"
      ) {

        setError(
          "Patient must be serving before completion.",
        );

        return;
      }

      try {

        setActionLoading(
          true,
        );

        setError("");

        await completePatient(
          currentPatient._id,
        );

        await loadQueue();

      } catch (
      error: any
      ) {

        console.error(
          "Complete patient error:",
          error,
        );

        setError(
          error
            ?.response
            ?.data
            ?.message ||
          "Failed to complete patient",
        );

      } finally {

        setActionLoading(
          false,
        );
      }
    };

  /* ========================================================
     PREMIUM — CONSULTATION MODAL COMPLETE

     DoctorConsultation modal has:

     Complete Consultation
            ↓
     completeConsultation()
            ↓
     onCompleted()
            ↓
     completePatient()
            ↓
     Queue COMPLETED

     Premium therefore has NO external
     Complete Patient button.
  ======================================================== */

  const handlePremiumConsultationCompleted =
    async () => {

      if (
        !currentPatient
      ) {

        setConsultationId(
          null,
        );

        await loadQueue();

        return;
      }

      try {

        setActionLoading(
          true,
        );

        setError("");

        await completePatient(
          currentPatient._id,
        );

        setConsultationId(
          null,
        );

        await loadQueue();

      } catch (
      error: any
      ) {

        console.error(
          "Complete premium consultation queue error:",
          error,
        );

        setError(
          error
            ?.response
            ?.data
            ?.message ||
          "Consultation was saved but queue completion failed.",
        );

      } finally {

        setActionLoading(
          false,
        );
      }
    };

  /* ========================================================
     SKIP

     BASIC + PREMIUM
  ======================================================== */

  const handleSkip =
    async () => {

      if (
        !currentPatient
      ) {
        return;
      }

      try {

        setActionLoading(
          true,
        );

        setError("");

        await skipPatient(
          currentPatient._id,
        );

        setConsultationId(
          null,
        );

        await loadQueue();

      } catch (
      error: any
      ) {

        console.error(
          "Skip patient error:",
          error,
        );

        setError(
          error
            ?.response
            ?.data
            ?.message ||
          "Failed to skip patient",
        );

      } finally {

        setActionLoading(
          false,
        );
      }
    };

  /* ========================================================
     CLOSE CONSULTATION

     Closing does NOT complete queue.
     Patient remains SERVING.

     Doctor can click Open Consultation again.
  ======================================================== */

  const handleCloseConsultation =
    async () => {

      setConsultationId(
        null,
      );

      await loadQueue();
    };

  /* ========================================================
     LOADING
  ======================================================== */

  if (loading) {

    return (
      <div className="dq-design dq-loading flex min-h-[420px] items-center justify-center">
        <DoctorQueueStyles />

        <div className="text-center">

          <Loader2
            size={32}
            className="mx-auto animate-spin text-teal-600"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading doctor queue...
          </p>

        </div>

      </div>
    );
  }

  /* ========================================================
     UI
  ======================================================== */

  return (
    <>
      <DoctorQueueStyles />

      {/* ==================================================
          BASIC → PREMIUM FEATURE POPUP
      ================================================== */}

      {premiumNotice && (

        <PremiumConsultationModal
          onClose={() =>
            setPremiumNotice(
              false,
            )
          }
        />

      )}

      {/* ==================================================
          PREMIUM CONSULTATION MODAL
      ================================================== */}

      {consultationId && (

        <StartConsultation
          consultationId={
            consultationId
          }
          onClose={
            handleCloseConsultation
          }
          onCompleted={
            handlePremiumConsultationCompleted
          }
        />

      )}

      <div className="dq-design space-y-6">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="dq-heading flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <h1 className="text-2xl font-bold text-slate-900">
                My Patient Queue
              </h1>

              {isPremium ? (

                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">

                  <Crown
                    size={12}
                  />

                  Premium

                </span>

              ) : (

                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">

                  Basic

                </span>

              )}

            </div>

            <p className="mt-1 text-sm text-slate-500">

              {isPremium
                ? "Manage your queue and start AI-assisted consultations."
                : "Call and serve patients in your OPD queue."}

            </p>

          </div>

          <button
            type="button"
            onClick={
              loadQueue
            }
            disabled={
              actionLoading ||
              consultationLoading
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-slate-700
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >

            <RefreshCw
              size={17}
            />

            Refresh

          </button>

        </div>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (

          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0 text-red-500"
            />

            <p className="text-sm text-red-700">
              {error}
            </p>

          </div>

        )}

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <div className="grid gap-4 sm:grid-cols-3">

          <QueueSummaryCard
            title="Waiting"
            value={
              waitingPatients.length
            }
            icon={
              <Users
                size={21}
              />
            }
          />

          <QueueSummaryCard
            title="Serving"
            value={
              currentPatient?.status ===
                "SERVING"
                ? 1
                : 0
            }
            icon={
              <Stethoscope
                size={21}
              />
            }
          />

          <QueueSummaryCard
            title="Completed Today"
            value={
              completedPatients.length
            }
            icon={
              <CheckCircle2
                size={21}
              />
            }
          />

        </div>

        {/* ==================================================
            CURRENT PATIENT
        ================================================== */}

        <div className="dq-panel dq-current overflow-hidden rounded-2xl border border-slate-200 bg-white">

          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="font-bold text-slate-900">
                Current Patient
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Patient currently called or being served.
              </p>

            </div>

            {currentPatient && (

              <StatusBadge
                status={
                  currentPatient.status
                }
              />

            )}

          </div>

          {/* ==================================================
              NO CURRENT PATIENT
          ================================================== */}

          {!currentPatient ? (

            <div className="dq-empty p-8 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">

                <Ticket
                  size={25}
                />

              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No active patient
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Call the next patient when you are ready.
              </p>

              <button
                type="button"
                onClick={
                  handleCallNext
                }
                disabled={
                  actionLoading ||
                  consultationLoading ||
                  waitingPatients.length ===
                  0
                }
                className="
                  mt-5
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-teal-600
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-teal-700
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                {actionLoading ? (

                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                ) : (

                  <Ticket
                    size={18}
                  />

                )}

                Call Next Patient

              </button>

            </div>

          ) : (

            /* ==================================================
               CURRENT PATIENT
            ================================================== */

            <div className="dq-patient p-5 sm:p-6">

              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">

                {/* ==========================================
                    PATIENT INFORMATION
                ========================================== */}

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-3">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">

                      <User
                        size={22}
                      />

                    </div>

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-lg font-bold text-slate-900">

                          {
                            currentPatient
                              .patientId
                              ?.name ||
                            "Patient"
                          }

                        </h3>

                        <span className="dq-token rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">

                          {
                            currentPatient
                              .tokenLabel
                          }

                        </span>

                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">

                        {currentPatient
                          .patientId
                          ?.phone && (

                            <span className="flex items-center gap-1">

                              <Phone
                                size={13}
                              />

                              {
                                currentPatient
                                  .patientId
                                  .phone
                              }

                            </span>

                          )}

                        {currentPatient
                          .departmentId
                          ?.name && (
                            <span className="flex items-center gap-1">
                              <Stethoscope size={13} />

                              {
                                currentPatient
                                  .departmentId
                                  .name
                              }
                            </span>
                          )}
                        {currentPatientIsAppointment &&
                          !currentPatientIsEmergency && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                              Appointment patient
                            </span>
                          )}

                        {currentPatientIsEmergency && (
                          <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                            Emergency patient
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* ==========================================
                      CALLED INFO
                  ========================================== */}

                  {currentPatientIsEmergency && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />

                        <p className="text-sm font-bold text-red-800">
                          Emergency patient
                        </p>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-red-700">
                        This patient was marked as emergency by reception. Please attend on priority.
                      </p>
                    </div>
                  )}

                  {currentPatient.status ===
                    "CALLED" && (

                      <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4">

                        <p className="text-sm font-semibold text-teal-800">
                          Patient has been called
                        </p>

                        <p className="mt-1 text-xs leading-5 text-teal-600">

                          {isPremium
                            ? "When the patient arrives, click Start Consultation with AI. NexTurn will automatically mark the patient as serving."
                            : "When the patient arrives, click Start Serving. AI consultation is available with Premium."}

                        </p>

                      </div>

                    )}

                  {/* ==========================================
                      SERVING INFO
                  ========================================== */}

                  {currentPatient.status ===
                    "SERVING" && (

                      <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">

                        <div className="flex items-center gap-2">

                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

                          <p className="text-sm font-bold text-emerald-800">
                            Patient is being served
                          </p>

                        </div>

                        <p className="mt-1 text-xs leading-5 text-emerald-700">

                          {isPremium
                            ? "Continue the AI consultation and complete it from the consultation window."
                            : "Complete the patient when serving is finished. Upgrade to Premium for AI-assisted consultation."}

                        </p>

                      </div>

                    )}

                </div>

                {/* ==========================================
                    ACTIONS
                ========================================== */}

                <div className="dq-actions flex min-w-0 flex-col gap-2 lg:min-w-[250px]">

                  {/* ======================================
                      BASIC — CALLED

                      START SERVING
                  ====================================== */}

                  {!isPremium &&
                    currentPatient.status ===
                    "CALLED" && (

                      <>
                        <button
                          type="button"
                          onClick={
                            handleBasicStartServing
                          }
                          disabled={
                            actionLoading
                          }
                          className="
                          inline-flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          bg-teal-600
                          px-5
                          py-3
                          text-sm
                          font-semibold
                          text-white
                          transition
                          hover:bg-teal-700
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                        >

                          {actionLoading ? (

                            <Loader2
                              size={17}
                              className="animate-spin"
                            />

                          ) : (

                            <Stethoscope
                              size={17}
                            />

                          )}

                          Start Serving

                        </button>

                        {/* ==================================
                          BASIC LOCKED AI FEATURE

                          CLICK OPENS PREMIUM POPUP
                      ================================== */}

                        <button
                          type="button"
                          onClick={() =>
                            setPremiumNotice(
                              true,
                            )
                          }
                          className="
                          inline-flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-amber-200
                          bg-amber-50
                          px-5
                          py-3
                          text-sm
                          font-semibold
                          text-amber-700
                          transition
                          hover:border-amber-300
                          hover:bg-amber-100
                        "
                        >

                          <LockKeyhole
                            size={16}
                          />

                          Start Consultation with AI

                          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[9px] font-bold uppercase">
                            Premium
                          </span>

                        </button>

                      </>

                    )}

                  {/* ======================================
                      PREMIUM — CALLED

                      ONE CLICK:
                      1. Start Serving
                      2. Start Consultation
                      3. Open Modal
                  ====================================== */}

                  {isPremium &&
                    currentPatient.status ===
                    "CALLED" && (

                      <button
                        type="button"
                        onClick={
                          handleStartPremiumConsultation
                        }
                        disabled={
                          consultationLoading ||
                          actionLoading
                        }
                        className="
                        inline-flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-teal-600
                        px-5
                        py-3
                        text-sm
                        font-semibold
                        text-white
                        shadow-sm
                        transition
                        hover:bg-teal-700
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                      >

                        {consultationLoading ? (

                          <Loader2
                            size={17}
                            className="animate-spin"
                          />

                        ) : (

                          <Sparkles
                            size={17}
                          />

                        )}

                        Start Consultation with AI

                      </button>

                    )}

                  {/* ======================================
                      BASIC — SERVING

                      COMPLETE
                      +
                      LOCKED AI
                  ====================================== */}

                  {!isPremium &&
                    currentPatient.status ===
                    "SERVING" && (

                      <>
                        <button
                          type="button"
                          onClick={
                            handleBasicComplete
                          }
                          disabled={
                            actionLoading
                          }
                          className="
                          inline-flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          bg-emerald-600
                          px-5
                          py-3
                          text-sm
                          font-semibold
                          text-white
                          transition
                          hover:bg-emerald-700
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                        >

                          {actionLoading ? (

                            <Loader2
                              size={17}
                              className="animate-spin"
                            />

                          ) : (

                            <CheckCircle2
                              size={17}
                            />

                          )}

                          Complete Patient

                        </button>

                        {/* ==================================
                          BASIC LOCKED AI FEATURE

                          CLICK OPENS PREMIUM POPUP
                      ================================== */}

                        <button
                          type="button"
                          onClick={() =>
                            setPremiumNotice(
                              true,
                            )
                          }
                          className="
                          inline-flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-amber-200
                          bg-amber-50
                          px-5
                          py-3
                          text-sm
                          font-semibold
                          text-amber-700
                          transition
                          hover:border-amber-300
                          hover:bg-amber-100
                        "
                        >

                          <LockKeyhole
                            size={16}
                          />

                          Start Consultation with AI

                          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[9px] font-bold uppercase">
                            Premium
                          </span>

                        </button>

                      </>

                    )}

                  {/* ======================================
                      PREMIUM — SERVING

                      Reopen existing consultation
                  ====================================== */}

                  {isPremium &&
                    currentPatient.status ===
                    "SERVING" && (

                      <button
                        type="button"
                        onClick={
                          handleStartPremiumConsultation
                        }
                        disabled={
                          consultationLoading ||
                          actionLoading
                        }
                        className="
                        inline-flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-teal-600
                        px-5
                        py-3
                        text-sm
                        font-semibold
                        text-white
                        shadow-sm
                        transition
                        hover:bg-teal-700
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                      >

                        {consultationLoading ? (

                          <Loader2
                            size={17}
                            className="animate-spin"
                          />

                        ) : (

                          <Sparkles
                            size={17}
                          />

                        )}

                        Open Consultation

                      </button>

                    )}

                  {/* ======================================
                      SKIP

                      BASIC + PREMIUM
                  ====================================== */}

                  <button
                    type="button"
                    onClick={
                      handleSkip
                    }
                    disabled={
                      actionLoading ||
                      consultationLoading
                    }
                    className="
                      inline-flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-5
                      py-3
                      text-sm
                      font-semibold
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >

                    <SkipForward
                      size={17}
                    />

                    Skip Patient

                  </button>

                </div>

              </div>

            </div>

          )}

        </div>

        {/* ==================================================
            WAITING PATIENTS
        ================================================== */}

        <div className="dq-panel dq-list overflow-hidden rounded-2xl border border-slate-200 bg-white">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

            <div>

              <h2 className="font-bold text-slate-900">
                Waiting Patients
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Patients waiting for their turn.
              </p>

            </div>

            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">

              {
                waitingPatients.length
              }{" "}
              waiting

            </span>

          </div>

          {waitingPatients.length ===
            0 ? (

            <div className="dq-empty p-8 text-center text-sm text-slate-500">
              No patients waiting.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    <th className="px-5 py-3">
                      Token
                    </th>

                    <th className="px-5 py-3">
                      Patient
                    </th>

                    <th className="px-5 py-3">
                      Phone
                    </th>

                    <th className="px-5 py-3">
                      Priority
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {waitingPatients.map(
                    (
                      queue,
                    ) => (

                      <tr
                        key={
                          queue._id
                        }
                        className="text-sm"
                      >

                        <td className="px-5 py-4 font-bold text-teal-600">

                          {
                            queue.tokenLabel
                          }

                        </td>

                        <td className="px-5 py-4">

                          <p className="font-semibold text-slate-800">

                            {
                              queue
                                .patientId
                                ?.name ||
                              "-"
                            }

                          </p>

                          {queue
                            .patientId
                            ?.patientCode && (

                              <p className="mt-0.5 text-xs text-slate-400">

                                {
                                  queue
                                    .patientId
                                    .patientCode
                                }

                              </p>

                            )}

                        </td>

                        <td className="px-5 py-4 text-slate-500">

                          {
                            queue
                              .patientId
                              ?.phone ||
                            "-"
                          }

                        </td>

                        <td className="px-5 py-4">

                          <PriorityBadge
                            priority={
                              queue.priority
                            }
                          />

                        </td>

                        <td className="px-5 py-4">

                          <StatusBadge
                            status={
                              queue.status
                            }
                          />

                        </td>

                      </tr>

                    ),
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

        {/* ==================================================
            COMPLETED PATIENTS
        ================================================== */}

        <div className="dq-panel dq-list overflow-hidden rounded-2xl border border-slate-200 bg-white">

          <div className="border-b border-slate-100 px-5 py-4">

            <h2 className="font-bold text-slate-900">
              Completed Today
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Patients completed today.
            </p>

          </div>

          {completedPatients.length ===
            0 ? (

            <div className="dq-empty p-8 text-center text-sm text-slate-500">
              No completed patients yet.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    <th className="px-5 py-3">
                      Token
                    </th>

                    <th className="px-5 py-3">
                      Patient
                    </th>

                    <th className="px-5 py-3">
                      Phone
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {completedPatients.map(
                    (
                      queue,
                    ) => (

                      <tr
                        key={
                          queue._id
                        }
                        className="text-sm"
                      >

                        <td className="px-5 py-4 font-bold text-slate-700">

                          {
                            queue.tokenLabel
                          }

                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-800">

                          {
                            queue
                              .patientId
                              ?.name ||
                            "-"
                          }

                        </td>

                        <td className="px-5 py-4 text-slate-500">

                          {
                            queue
                              .patientId
                              ?.phone ||
                            "-"
                          }

                        </td>

                        <td className="px-5 py-4">

                          <StatusBadge
                            status={
                              queue.status
                            }
                          />

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

    </>
  );
};

/* ============================================================
   SUMMARY CARD
============================================================ */

interface QueueSummaryCardProps {
  title: string;
  value: number;
  icon: ReactNode;
}

const QueueSummaryCard = ({
  title,
  value,
  icon,
}: QueueSummaryCardProps) => {

  return (
    <div data-summary={title} className="dq-summary rounded-2xl border border-slate-200 bg-white p-5">

      <div className="flex items-center justify-between">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">

          {icon}

        </div>

        <span className="text-3xl font-bold text-slate-900">
          {value}
        </span>

      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {title}
      </p>

    </div>
  );
};

/* ============================================================
   PRIORITY BADGE
============================================================ */

const PriorityBadge = ({
  priority,
}: {
  priority?: string;
}) => {

  if (
    priority ===
    "EMERGENCY"
  ) {

    return (
      <span className="dq-emergency rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
        Emergency
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      Normal
    </span>
  );
};

/* ============================================================
   STATUS BADGE
============================================================ */

const StatusBadge = ({
  status,
}: {
  status: string;
}) => {

  switch (
  status
  ) {

    case "CALLED":

      return (
        <span data-status="CALLED" className="dq-status inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">

          <Ticket
            size={12}
          />

          Patient Called

        </span>
      );

    case "SERVING":

      return (
        <span data-status="SERVING" className="dq-status inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">

          <Stethoscope
            size={12}
          />

          Serving

        </span>
      );

    case "WAITING":

      return (
        <span data-status="WAITING" className="dq-status inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">

          <Clock
            size={12}
          />

          Waiting

        </span>
      );

    case "COMPLETED":

      return (
        <span data-status="COMPLETED" className="dq-status inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">

          <CheckCircle2
            size={12}
          />

          Completed

        </span>
      );

    case "SKIPPED":

      return (
        <span data-status="SKIPPED" className="dq-status inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">

          <SkipForward
            size={12}
          />

          Skipped

        </span>
      );

    default:

      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">

          {status}

        </span>
      );
  }
};

/* ============================================================
   PREMIUM CONSULTATION POPUP

   SHOWN WHEN BASIC USER CLICKS:
   "START CONSULTATION WITH AI"
============================================================ */

interface PremiumConsultationModalProps {
  onClose:
  () => void;
}

const PremiumConsultationModal = ({
  onClose,
}: PremiumConsultationModalProps) => {

  return (
    <div
      className="
        dq-design dq-modal fixed
        inset-0
        z-[150]
        flex
        items-center
        justify-center
        bg-slate-950/50
        p-4
        backdrop-blur-sm
      "
      onMouseDown={
        onClose
      }
    >

      <div
        onMouseDown={(
          event,
        ) => {
          event.stopPropagation();
        }}
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-3xl
          bg-white
          shadow-2xl
        "
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="border-b border-slate-100 p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">

                <Sparkles
                  size={23}
                />

              </div>

              <div>

                <div className="flex items-center gap-2">

                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600">
                    Premium Feature
                  </span>

                  <Crown
                    size={14}
                    className="text-amber-500"
                  />

                </div>

                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Start Consultation with AI
                </h3>

              </div>

            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="
                shrink-0
                rounded-xl
                p-2
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-700
              "
            >

              <X
                size={18}
              />

            </button>

          </div>

        </div>

        {/* ==================================================
            BODY
        ================================================== */}

        <div className="p-6">

          <p className="text-sm leading-6 text-slate-600">

            Upgrade to NexTurn Premium to use
            AI-assisted clinical consultation and
            maintain complete digital patient records.

          </p>

          {/* ==================================================
              FEATURES
          ================================================== */}

          <div className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">

            <PremiumFeature
              text="AI consultation transcription"
            />

            <PremiumFeature
              text="Symptoms and clinical notes"
            />

            <PremiumFeature
              text="AI clinical analysis"
            />

            <PremiumFeature
              text="Diagnosis and prescription"
            />

            <PremiumFeature
              text="Lab test ordering"
            />

            <PremiumFeature
              text="Patient consultation history"
            />

          </div>

          {/* ==================================================
              BASIC INFO
          ================================================== */}

          <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4">

            <p className="text-xs font-semibold text-teal-800">
              Your Basic plan still includes
            </p>

            <p className="mt-1 text-xs leading-5 text-teal-600">

              Patient queue tracking, Call Next,
              Start Serving, Skip Patient and
              Complete Patient.

            </p>

          </div>

          {/* ==================================================
              CLOSE
          ================================================== */}

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              mt-6
              inline-flex
              w-full
              items-center
              justify-center
              rounded-xl
              bg-slate-900
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-slate-800
            "
          >
            Close
          </button>

        </div>

      </div>

    </div>
  );
};

/* ============================================================
   PREMIUM FEATURE ROW
============================================================ */

const PremiumFeature = ({
  text,
}: {
  text: string;
}) => {

  return (
    <div className="flex items-center gap-3">

      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">

        <CheckCircle2
          size={14}
        />

      </div>

      <span className="text-sm font-medium text-slate-700">
        {text}
      </span>

    </div>
  );
};


const DoctorQueueStyles = () => (
  <style>{`
    .dq-design {
      color: #173d3b;
      font-family: "Inter", "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .dq-design *, .dq-design *::before, .dq-design *::after { box-sizing: border-box; }
    .dq-design button { min-height: 44px; border-radius: 12px; }
    .dq-design button:not(:disabled) { cursor: pointer; }
    .dq-design button:focus-visible { outline: 3px solid #38bdb0; outline-offset: 3px; }
    .dq-design button:disabled { cursor: not-allowed; opacity: .5; }
    .dq-design button[class~="bg-teal-600"] { background: #176957; box-shadow: 0 3px 8px #173d3b0d; }
    .dq-design button[class~="bg-teal-600"]:hover:not(:disabled) { background: #104f42; }
    .dq-heading {
      position: relative; overflow: hidden; border: 1px solid #dbe5d7;
      padding: 28px 30px; border-radius: 20px;
      background: linear-gradient(110deg, #eaf0e1, #eef4e9 58%, #d6e8dc);
    }
    .dq-heading::after {
      content: "+"; position: absolute; right: 140px; top: -55px;
      color: #8bb49c25; font-size: 200px; font-weight: 300; line-height: 1;
      pointer-events: none;
    }
    .dq-heading > * { position: relative; z-index: 1; }
    .dq-heading > div::before {
      content: "CONSULTATION WORKSPACE"; display: block; margin-bottom: 12px;
      color: #4e7662; font-size: 10px; font-weight: 800; letter-spacing: 2px;
    }
    .dq-heading h1 { color: #204638; font-size: 28px; font-weight: 600; letter-spacing: -.9px; }
    .dq-heading p { color: #5c7167; line-height: 1.7; margin-top: 8px; }
    .dq-heading button { border-color: #c6d8c8; background: #ffffffb8; color: #315e4f; flex-shrink: 0; }
    .dq-summary {
      position: relative; overflow: hidden; border: 1px solid #e0e7df;
      border-radius: 16px; padding: 24px; background: #fff;
      box-shadow: 0 4px 20px #173d3b03;
    }
    .dq-summary::before {
      content: ""; position: absolute; top: 0; left: 24px;
      width: 36px; height: 3px; border-radius: 0 0 4px 4px; background: #c39a48;
    }
    .dq-summary > div > div { background: #f8f2e5; color: #977331; border-radius: 14px; }
    .dq-summary[data-summary="Serving"]::before { background: #bf8b68; }
    .dq-summary[data-summary="Serving"] > div > div { background: #fbefe8; color: #b17659; }
    .dq-summary[data-summary="Completed Today"]::before { background: #5a9a76; }
    .dq-summary[data-summary="Completed Today"] > div > div { background: #edf6ef; color: #468364; }
    .dq-summary > div > span { color: #203e37; font-size: 38px; letter-spacing: -1.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .dq-summary > p { border-top: 1px solid #eef1eb; padding-top: 15px; color: #596e66; font-size: 13px; }
    .dq-panel { border-color: #e0e7df; border-radius: 18px; box-shadow: 0 4px 24px #173d3b03; }
    .dq-panel > div:first-child { padding: 20px 24px; border-color: #e7ece4; }
    .dq-panel h2 { color: #23463c; font-size: 16px; letter-spacing: -.3px; }
    .dq-current { border-color: #b9d0c0; }
    .dq-current > div:first-child { background: #f0f5ed; }
    .dq-patient { padding: 26px; }
    .dq-patient h3 { color: #204638; font-size: 22px; letter-spacing: -.5px; overflow-wrap: anywhere; }
    .dq-patient .dq-token {
      background: #173d39; color: #e3f4e6; padding: 7px 12px;
      letter-spacing: .8px; font-variant-numeric: tabular-nums;
    }
    .dq-actions { padding: 18px; background: #f7f9f4; border: 1px solid #e4eade; border-radius: 16px; }
    .dq-actions button { line-height: 1.5; }
    .dq-actions button[class~="bg-amber-50"] { flex-wrap: wrap; font-size: 12px; }
    .dq-empty { padding: 40px 24px; background: linear-gradient(180deg, #fff, #fafbf7); color: #65776b; }
    .dq-empty > div { background: #edf4e9; color: #4d7a5d; border-radius: 18px; }
    .dq-empty h3 { color: #244638; }
    .dq-list table { width: 100%; min-width: 620px; border-collapse: collapse; }
    .dq-list thead { background: #f6f8f2; }
    .dq-list th { color: #728072; font-size: 10px; letter-spacing: 1.2px; padding: 14px 24px; white-space: nowrap; }
    .dq-list td { padding: 18px 24px; border-color: #edf0e9; }
    .dq-list tbody tr { transition: background .15s; }
    .dq-list tbody tr:hover { background: #f7faf5; }
    .dq-list td:first-child { color: #326854; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .dq-list td:nth-child(2) { min-width: 180px; }
    .dq-status { white-space: nowrap; border: 1px solid transparent; font-size: 11px; padding: 6px 10px; }
    .dq-status[data-status="CALLED"] { background: #eef4f8; color: #527995; border-color: #dfe9f0; }
    .dq-status[data-status="SERVING"] { background: #f9efe8; color: #97653e; border-color: #eeded0; }
    .dq-status[data-status="WAITING"] { background: #faf4e6; color: #926e28; border-color: #eee3c7; }
    .dq-status[data-status="COMPLETED"] { background: #edf6ef; color: #3e7854; border-color: #daeadf; }
    .dq-emergency { display: inline-flex; border: 1px solid #fecaca; color: #b91c1c; white-space: nowrap; }
    .dq-modal { background: #102c2866; overflow-y: auto; }
    .dq-modal > div { max-height: calc(100dvh - 32px); overflow-y: auto; border: 1px solid #dce6d9; border-radius: 22px; }
    .dq-modal > div > div:first-child { background: #eef4e8; border-color: #dce6d9; }
    .dq-modal h3 { color: #204638; letter-spacing: -.5px; }
    .dq-modal button[class~="bg-slate-900"] { background: #173d39; }
    .dq-loading { background: #f5f6f2; border: 1px solid #e0e7df; border-radius: 18px; }
    @media (max-width: 639px) {
      .dq-heading { padding: 22px 20px; border-radius: 16px; }
      .dq-heading h1 { font-size: 24px; }
      .dq-heading::after { right: -15px; }
      .dq-summary { padding: 20px; }
      .dq-panel > div:first-child { padding: 18px 20px; }
      .dq-patient { padding: 20px; }
      .dq-actions { padding: 12px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .dq-design *, .dq-design *::before, .dq-design *::after { animation: none !important; transition: none !important; }
    }
  `}</style>
);

export default DoctorQueue;