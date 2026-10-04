import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
  UserRound,
  X,
} from "lucide-react";

import {
  useParams,
} from "react-router-dom";

import {
  bookPublicAppointment,
  getPublicDepartments,
  getPublicDoctors,
  getPublicHospitals,
  getPublicHospitalBySlug,
  getPublicSlots,
  holdPublicSlot,
  releasePublicSlot,
  type PublicBookingResult,
  type PublicDepartment,
  type PublicDoctor,
  type PublicHospital,
  type PublicSlot,
} from "../../services/appointment/publicAppointment.api";

import AppointmentAssistantPanel, {
  type AppointmentAssistantResult,
} from "./AppointmentAssistantPanel";

import {
  INDIA_STATES,
  getDistrictsByState,
} from "../../store/indiaLocations";

import HospitalSeo from "../../components/seo/HospitalSeo";

// Dates use the patient's local calendar, rather than UTC.
const INDIA_TIME_ZONE = "Asia/Kolkata";

// Patients can book today and the following six calendar days.
const APPOINTMENT_BOOKING_WINDOW_DAYS = 7;

type ActiveSlotHold = {
  hospitalId: string;
  doctorId: string;
  departmentId: string;
  slotId: string;
  date: string;
  holdToken: string;
};

function indiaDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: INDIA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(value);

  const year =
    parts.find(
      (part) => part.type === "year",
    )?.value || "";

  const month =
    parts.find(
      (part) => part.type === "month",
    )?.value || "";

  const day =
    parts.find(
      (part) => part.type === "day",
    )?.value || "";

  return `${year}-${month}-${day}`;
}

function today(): string {
  return indiaDate();
}

function addCalendarDays(
  dateValue: string,
  days: number,
): string {
  const [
    year,
    month,
    day,
  ] = dateValue
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  date.setUTCDate(
    date.getUTCDate() + days,
  );

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getUTCDate(),
    ).padStart(2, "0"),
  ].join("-");
}

function lastBookableDate(
  value = new Date(),
): string {
  return addCalendarDays(
    indiaDate(value),
    APPOINTMENT_BOOKING_WINDOW_DAYS - 1,
  );
}

function isDateWithinBookingWindow(
  selectedDate: string,
  value = new Date(),
): boolean {
  const currentDate = indiaDate(value);
  const finalDate = lastBookableDate(value);

  return (
    selectedDate >= currentDate &&
    selectedDate <= finalDate
  );
}

function parseTimeToMinutes(
  value: string,
): number | null {
  const match = String(value)
    .trim()
    .match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i,
    );

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    minutes > 59
  ) {
    return null;
  }

  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

function currentIndiaMinutes(
  value = new Date(),
): number {
  const time =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: INDIA_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).format(value);

  const [
    hours,
    minutes,
  ] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function isSlotStillBookable(
  slot: PublicSlot,
  selectedDate: string,
  value = new Date(),
): boolean {
  const currentDate =
    indiaDate(value);

  if (
    !isDateWithinBookingWindow(
      selectedDate,
      value,
    )
  ) {
    return false;
  }

  if (selectedDate > currentDate) {
    return true;
  }

  if (selectedDate < currentDate) {
    return false;
  }

  const slotMinutes =
    parseTimeToMinutes(
      slot.startTime,
    );

  if (slotMinutes === null) {
    return false;
  }

  return (
    slotMinutes >
    currentIndiaMinutes(value)
  );
}

function formatDate(
  value: string,
): string {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function doctorName(
  name: string,
): string {
  return /^dr\.?\s/i.test(
    name,
  )
    ? name
    : `Dr. ${name}`;
}

function errorMessage(
  error: unknown,
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

  const normalMessage =
    (
      error as {
        message?: unknown;
      }
    )?.message;

  if (
    typeof normalMessage ===
    "string" &&
    normalMessage.trim()
  ) {
    return normalMessage;
  }

  return "Something went wrong. Please try again.";
}

function errorStatus(
  error: unknown,
): number | null {
  const status =
    (
      error as {
        response?: {
          status?: unknown;
        };
      }
    )?.response?.status;

  return typeof status === "number"
    ? status
    : null;
}

function errorCode(
  error: unknown,
): string {
  const code =
    (
      error as {
        response?: {
          data?: {
            code?: unknown;
          };
        };
      }
    )?.response?.data?.code;

  return typeof code === "string"
    ? code
    : "";
}

function isSlotUnavailableError(
  error: unknown,
): boolean {
  return (
    errorStatus(error) === 409 ||
    [
      "SLOT_UNAVAILABLE",
      "SLOT_HELD",
      "SLOT_HOLD_EXPIRED",
    ].includes(
      errorCode(error),
    )
  );
}

function formatHoldTime(
  seconds: number,
): string {
  const minutes = Math.floor(
    seconds / 60,
  );

  const remainingSeconds =
    seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

function useBookingList<T>(
  load: () => Promise<T[]>,
  onError?: (
    message: string,
  ) => void,
) {
  const [
    items,
    setItems,
  ] = useState<T[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    retryCount,
    setRetryCount,
  ] = useState(0);

  useEffect(() => {
    let active = true;

    setItems([]);
    setLoading(true);
    setError("");

    const timer =
      window.setTimeout(
        async () => {
          try {
            const result =
              await load();

            if (active) {
              setItems(result);
            }
          } catch (err) {
            const message =
              errorMessage(err);

            if (active) {
              setError(message);
              onError?.(message);
            }
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        },
        250,
      );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    load,
    retryCount,
    onError,
  ]);

  const retry = useCallback(
    () =>
      setRetryCount(
        (value) => value + 1,
      ),
    [],
  );

  return {
    items,
    loading,
    error,
    retry,
  };
}

export default function PatientBookAppointment() {
  const {
    hospitalSlug,
  } = useParams<{
    hospitalSlug?: string;
  }>();

  const isDirectHospitalPage =
    Boolean(hospitalSlug);

  const [
    step,
    setStep,
  ] = useState<1 | 2 | 3>(1);

  const [
    state,
    setState,
  ] = useState("");

  const [
    district,
    setDistrict,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    hospital,
    setHospital,
  ] = useState<PublicHospital | null>(
    null,
  );

  const [
    department,
    setDepartment,
  ] = useState<PublicDepartment | null>(
    null,
  );

  const [
    doctor,
    setDoctor,
  ] = useState<PublicDoctor | null>(
    null,
  );

  const [
    date,
    setDate,
  ] = useState(today);

  const [
    slot,
    setSlot,
  ] = useState<PublicSlot | null>(
    null,
  );

  const [
    holdToken,
    setHoldToken,
  ] = useState("");

  const [
    holdExpiresAt,
    setHoldExpiresAt,
  ] = useState<string | null>(
    null,
  );

  const [
    holdSeconds,
    setHoldSeconds,
  ] = useState<number | null>(
    null,
  );

  const [
    holdingSlot,
    setHoldingSlot,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    age,
    setAge,
  ] = useState("");

  const [
    gender,
    setGender,
  ] = useState("MALE");

  const [
    clockTick,
    setClockTick,
  ] = useState(() => Date.now());

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    bookingError,
    setBookingError,
  ] = useState("");

  const [
    popupError,
    setPopupError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState<PublicBookingResult | null>(
    null,
  );

  const [
    directHospitalLoading,
    setDirectHospitalLoading,
  ] = useState(
    Boolean(hospitalSlug),
  );

  const [
    directHospitalError,
    setDirectHospitalError,
  ] = useState("");

  const savingRef =
    useRef(false);

  const activeHoldRef =
    useRef<ActiveSlotHold | null>(
      null,
    );

  const headingRef =
    useRef<HTMLHeadingElement>(
      null,
    );

  const showErrorPopup =
    useCallback(
      (message: string) => {
        const finalMessage =
          message.trim() ||
          "Something went wrong. Please try again.";

        setPopupError(finalMessage);
      },
      [],
    );

  useEffect(() => {
    if (!hospitalSlug) {
      setDirectHospitalLoading(false);
      return;
    }

    let cancelled = false;

    const loadHospitalBySlug =
      async () => {
        try {
          setDirectHospitalLoading(true);
          setDirectHospitalError("");

          const response =
            await getPublicHospitalBySlug(
              hospitalSlug,
            );

          if (cancelled) {
            return;
          }

          const loadedHospital =
            response.data;

          setHospital(loadedHospital);
          setState(
            loadedHospital.state || "",
          );
          setDistrict(
            loadedHospital.district || "",
          );
          setStep(2);
        } catch {
          if (!cancelled) {
            setDirectHospitalError(
              "This hospital booking page is not available.",
            );
          }
        } finally {
          if (!cancelled) {
            setDirectHospitalLoading(false);
          }
        }
      };

    void loadHospitalBySlug();

    return () => {
      cancelled = true;
    };
  }, [hospitalSlug]);

  const showBookingError =
    useCallback(
      (message: string) => {
        const finalMessage =
          message.trim() ||
          "Something went wrong. Please try again.";

        setBookingError(finalMessage);
        showErrorPopup(finalMessage);
      },
      [showErrorPopup],
    );

  const states = {
    items: INDIA_STATES,
    loading: false,
    error: "",
    retry: () => { },
  };

  const districts = {
    items: state
      ? getDistrictsByState(state)
      : [],
    loading: false,
    error: "",
    retry: () => { },
  };

  const hospitals =
    useBookingList<PublicHospital>(
      useCallback(
        async () => {
          const query =
            search.trim();

          const canSearch =
            query.length >= 2 ||
            Boolean(state && district);

          if (!canSearch) {
            return [];
          }

          return (
            await getPublicHospitals({
              state:
                state || undefined,
              district:
                district || undefined,
              q:
                query || undefined,
            })
          ).data || [];
        },
        [
          state,
          district,
          search,
        ],
      ),
      showErrorPopup,
    );

  const departments =
    useBookingList<PublicDepartment>(
      useCallback(
        async () =>
          hospital
            ? (
              await getPublicDepartments(
                hospital._id,
              )
            ).data || []
            : [],
        [hospital],
      ),
      showErrorPopup,
    );

  const doctors =
    useBookingList<PublicDoctor>(
      useCallback(
        async () =>
          hospital && department
            ? (
              await getPublicDoctors(
                hospital._id,
                department._id,
              )
            ).data || []
            : [],
        [
          hospital,
          department,
        ],
      ),
      showErrorPopup,
    );

  const slots =
    useBookingList<PublicSlot>(
      useCallback(
        async () =>
          hospital &&
            doctor &&
            date &&
            isDateWithinBookingWindow(date)
            ? (
              await getPublicSlots(
                hospital._id,
                doctor._id,
                date,
              )
            ).data.slots || []
            : [],
        [
          hospital,
          doctor,
          date,
        ],
      ),
      showErrorPopup,
    );

  const visibleSlots = [
    ...slots.items.filter((item) =>
      isSlotStillBookable(
        item,
        date,
        new Date(clockTick),
      ),
    ),
    ...(slot &&
      activeHoldRef.current?.slotId ===
      slot._id &&
      !slots.items.some(
        (item) => item._id === slot._id,
      )
      ? [slot]
      : []),
  ];

  const clearHoldState =
    useCallback(() => {
      setHoldToken("");
      setHoldExpiresAt(null);
      setHoldSeconds(null);
    }, []);

  const forgetHoldState =
    useCallback(() => {
      activeHoldRef.current = null;
      clearHoldState();
    }, [clearHoldState]);

  const releaseCurrentHold =
    useCallback(() => {
      const activeHold =
        activeHoldRef.current;

      activeHoldRef.current = null;
      clearHoldState();

      if (!activeHold) {
        return;
      }

      void releasePublicSlot(
        activeHold.hospitalId,
        {
          doctorId:
            activeHold.doctorId,
          departmentId:
            activeHold.departmentId,
          slotId:
            activeHold.slotId,
          date:
            activeHold.date,
          holdToken:
            activeHold.holdToken,
        },
      ).catch(() => undefined);
    }, [clearHoldState]);

  async function selectSlot(
    nextSlot: PublicSlot,
  ): Promise<void> {
    if (
      holdingSlot ||
      !hospital ||
      !department ||
      !doctor
    ) {
      return;
    }

    if (
      activeHoldRef.current?.slotId ===
      nextSlot._id
    ) {
      setSlot(nextSlot);
      return;
    }

    releaseCurrentHold();
    setHoldingSlot(true);
    setBookingError("");

    try {
      const response =
        await holdPublicSlot(
          hospital._id,
          {
            doctorId: doctor._id,
            departmentId:
              department._id,
            slotId: nextSlot._id,
            date,
          },
        );

      const hold = response.data;

      if (
        !hold?.holdToken ||
        !hold?.expiresAt
      ) {
        throw new Error(
          "The slot could not be reserved. Please choose another time.",
        );
      }

      activeHoldRef.current = {
        hospitalId: hospital._id,
        doctorId: doctor._id,
        departmentId:
          department._id,
        slotId: nextSlot._id,
        date,
        holdToken: hold.holdToken,
      };

      setSlot(hold.slot || nextSlot);
      setHoldToken(hold.holdToken);
      setHoldExpiresAt(hold.expiresAt);
    } catch (error) {
      setSlot(null);
      slots.retry();

      showBookingError(
        isSlotUnavailableError(error)
          ? "This time was just selected by another patient. Please choose another available slot."
          : errorMessage(error),
      );
    } finally {
      setHoldingSlot(false);
    }
  }

  useEffect(() => {
    if (!holdExpiresAt) {
      setHoldSeconds(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(
            holdExpiresAt,
          ).getTime() -
            Date.now()) /
          1000,
        ),
      );

      if (remaining === 0) {
        releaseCurrentHold();
        setSlot(null);
        setStep(2);
        slots.retry();

        const message =
          "Your selected time expired. Please choose another available slot. Your entered details are still saved.";

        setBookingError(message);
        showErrorPopup(message);
        return;
      }

      setHoldSeconds(remaining);
    };

    updateCountdown();

    const timer =
      window.setInterval(
        updateCountdown,
        1000,
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    holdExpiresAt,
    releaseCurrentHold,
    showErrorPopup,
    slots.retry,
  ]);

  useEffect(() => {
    return () => {
      const activeHold =
        activeHoldRef.current;

      if (!activeHold) {
        return;
      }

      void releasePublicSlot(
        activeHold.hospitalId,
        {
          doctorId:
            activeHold.doctorId,
          departmentId:
            activeHold.departmentId,
          slotId:
            activeHold.slotId,
          date:
            activeHold.date,
          holdToken:
            activeHold.holdToken,
        },
      ).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, success]);

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setClockTick(Date.now());
      }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function resetHospital(): void {
    releaseCurrentHold();

    setHospital(null);
    setDepartment(null);
    setDoctor(null);
    setSlot(null);
    setBookingError("");
  }

  function chooseHospital(
    value: PublicHospital,
  ): void {
    resetHospital();
    setHospital(value);
    setStep(2);
  }

  function chooseAIResult(
    result: AppointmentAssistantResult,
    selectedDate: string,
  ): void {
    releaseCurrentHold();

    setHospital(result.hospital);
    setState(result.hospital.state || "");
    setDistrict(
      result.hospital.district || "",
    );

    setDepartment(result.department);

    setDoctor({
      _id: result.doctor._id,
      name: result.doctor.name,
      department: {
        _id: result.department._id,
        name: result.department.name,
      },
    });

    setDate(selectedDate);
    setSlot(null);
    setBookingError("");
    setStep(2);
  }

  async function book(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (savingRef.current) {
      return;
    }

    if (
      !hospital ||
      !department ||
      !doctor ||
      !slot ||
      !holdToken
    ) {
      setStep(2);

      showBookingError(
        "Please choose an available appointment time before entering patient details.",
      );

      return;
    }

    let digits = phone.replace(
      /\D/g,
      "",
    );

    if (
      digits.length === 12 &&
      digits.startsWith("91")
    ) {
      digits = digits.slice(2);
    }

    if (name.trim().length < 2) {
      showBookingError(
        "Please enter the patient's full name.",
      );

      return;
    }

    if (digits.length !== 10) {
      showBookingError(
        "Please enter a valid 10-digit mobile number.",
      );

      return;
    }

    if (date < today()) {
      showBookingError(
        "Please choose an appointment date from today onwards.",
      );

      return;
    }

    if (
      !isDateWithinBookingWindow(date)
    ) {
      showBookingError(
        `Appointments can be booked only within the next ${APPOINTMENT_BOOKING_WINDOW_DAYS} days.`,
      );

      return;
    }

    savingRef.current = true;
    setSaving(true);
    setBookingError("");

    try {
      const response =
        await bookPublicAppointment(
          hospital._id,
          {
            doctorId: doctor._id,
            departmentId:
              department._id,
            slotId: slot._id,
            holdToken,
            name: name.trim(),
            phone: digits,
            age: age || undefined,
            gender,
            reason:
              reason.trim() ||
              "Appointment booking",
            notes: "",
          },
        );

      forgetHoldState();
      setSuccess(response.data);
    } catch (err) {
      if (isSlotUnavailableError(err)) {
        releaseCurrentHold();
        setSlot(null);
        slots.retry();
        setStep(2);

        showBookingError(
          "This time was just booked by another patient. Please choose another available slot. Your entered details are still saved.",
        );
      } else {
        showBookingError(errorMessage(err));
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="pb-page">
      <BookingStyles />

      {hospital && hospitalSlug && (
        <HospitalSeo
          hospital={hospital}
          hospitalSlug={hospitalSlug}
        />
      )}

      <ErrorPopup
        message={popupError}
        onClose={() =>
          setPopupError("")
        }
      />

      <header className="pb-header">
        <a
          href="/book-appointment"
          className="pb-brand"
          aria-label="NextSynq Health appointment booking"
        >
          <img
            src="/nexturn.png"
            alt="NextSynq Health"
          />
        </a>

        <span>
          Book an appointment
        </span>
      </header>

      <main className="pb-main">
        {directHospitalLoading ? (
          <section className="pb-panel">
            <p
              className="pb-loading"
              role="status"
            >
              <Loader2
                size={18}
                className="pb-spin"
              />
              Loading hospital booking page…
            </p>
          </section>
        ) : directHospitalError ? (
          <section className="pb-panel">
            <h1
              ref={headingRef}
              tabIndex={-1}
            >
              Hospital booking unavailable
            </h1>

            <p className="pb-note">
              {directHospitalError}
            </p>

            <a
              href="/book-appointment"
              className="pb-button pb-primary"
            >
              Search all hospitals
            </a>
          </section>
        ) : success ? (
          <section className="pb-panel pb-success">
            <span className="pb-success-icon">
              <CheckCircle2 size={32} />
            </span>

            <h1
              ref={headingRef}
              tabIndex={-1}
            >
              Appointment booked
            </h1>

            <p>
              Save this code and show it at reception when you arrive.
            </p>

            <div className="pb-code">
              <span>
                APPOINTMENT CODE
              </span>

              <strong>
                {success.appointmentCode}
              </strong>

              <p>
                {success.status}
              </p>
            </div>

            <dl className="pb-summary-list">
              <div>
                <dt>Hospital</dt>
                <dd>
                  {success.hospital.name}
                </dd>
              </div>

              <div>
                <dt>Doctor</dt>
                <dd>
                  {doctorName(
                    success.doctor.name,
                  )}
                </dd>
              </div>

              <div>
                <dt>Department</dt>
                <dd>
                  {success.department.name}
                </dd>
              </div>

              <div>
                <dt>Date & time</dt>
                <dd>
                  {formatDate(success.date)} ·{" "}
                  {success.startTime}
                </dd>
              </div>
            </dl>

            <p className="pb-note">
              Please arrive before your appointment time. Reception will check you in and provide your live queue token. Consultation times may vary.
            </p>

            <button
              type="button"
              className="pb-button pb-primary"
              onClick={() =>
                window.location.reload()
              }
            >
              Book another appointment
            </button>
          </section>
        ) : (
          <>
            <div className="pb-intro">
              <p className="pb-eyebrow">
                CARE, AT YOUR CONVENIENCE
              </p>

              <h1
                ref={headingRef}
                tabIndex={-1}
              >
                {isDirectHospitalPage && hospital
                  ? `${hospital.name} Online Appointment Booking`
                  : step === 1
                    ? "Find your hospital"
                    : step === 2
                      ? "Choose your doctor & time"
                      : "You're almost booked"}
              </h1>

              <p>
                {step === 1
                  ? "Choose a location to see hospitals accepting appointments."
                  : step === 2
                    ? isDirectHospitalPage && hospital
                      ? "Select a department, doctor and available appointment time at this hospital."
                      : "Select a department, doctor and available appointment time."
                    : "Add the patient's details and confirm your appointment."}
              </p>
            </div>

            <ol
              className="pb-progress"
              aria-label="Booking progress"
            >
              {[
                "Hospital",
                "Doctor & time",
                "Your details",
              ].map((label, index) => (
                <li
                  key={label}
                  aria-current={
                    step === index + 1
                      ? "step"
                      : undefined
                  }
                  data-done={
                    step > index + 1
                  }
                >
                  <span>
                    {step > index + 1 ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      index + 1
                    )}
                  </span>

                  {label}
                </li>
              ))}
            </ol>

            {step > 1 && hospital && (
              <div className="pb-selection">
                <Building2 size={20} />

                <div>
                  <strong>
                    {hospital.name}
                  </strong>

                  <p>
                    {step === 3 &&
                      doctor &&
                      slot
                      ? `${doctorName(
                        doctor.name,
                      )} · ${formatDate(
                        date,
                      )} · ${slot.startTime}`
                      : hospital.address ||
                      `${hospital.district}, ${hospital.state}`}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setBookingError("");

                    setStep(
                      step === 3
                        ? 2
                        : 1,
                    );
                  }}
                >
                  Change
                </button>
              </div>
            )}

            {isDirectHospitalPage && hospital && (
              <section
                className="pb-seo-hospital"
                aria-labelledby="pb-seo-hospital-title"
              >
                <p className="pb-seo-label">
                  ONLINE HOSPITAL APPOINTMENTS
                </p>

                <h2 id="pb-seo-hospital-title">
                  Book an appointment at {hospital.name}
                </h2>

                <p>
                  Book your appointment online with {hospital.name}. Choose a department, doctor, date and available time slot.
                </p>

                <address>
                  {[
                    hospital.address,
                    hospital.city,
                    hospital.district,
                    hospital.state,
                    hospital.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </address>
              </section>
            )}

            <section className="pb-panel">
              {step === 1 && (
                <>
                  <AppointmentAssistantPanel
                    onSelectResult={
                      chooseAIResult
                    }
                  />

                  <div className="pb-fields">
                    <div className="pb-field">
                      <label htmlFor="pb-state">
                        State
                      </label>

                      <select
                        id="pb-state"
                        value={state}
                        disabled={states.loading}
                        onChange={(event) => {
                          setState(
                            event.target.value,
                          );

                          setDistrict("");
                          resetHospital();
                        }}
                      >
                        <option value="">
                          Select state
                        </option>

                        {states.items.map(
                          (item) => (
                            <option
                              key={item}
                              value={item}
                            >
                              {item}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="pb-field">
                      <label htmlFor="pb-district">
                        District / city
                      </label>

                      <select
                        id="pb-district"
                        value={district}
                        disabled={
                          !state ||
                          districts.loading
                        }
                        onChange={(event) => {
                          setDistrict(
                            event.target.value,
                          );

                          resetHospital();
                        }}
                      >
                        <option value="">
                          Select district / city
                        </option>

                        {districts.items.map(
                          (item) => (
                            <option
                              key={item}
                              value={item}
                            >
                              {item}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>

                  <ListFeedback
                    loading={states.loading}
                    error={states.error}
                    retry={states.retry}
                    showPopup={showErrorPopup}
                  />

                  {state && (
                    <ListFeedback
                      loading={districts.loading}
                      error={districts.error}
                      retry={districts.retry}
                      showPopup={showErrorPopup}
                    />
                  )}

                  <div className="pb-search">
                    <Search size={18} />

                    <input
                      type="search"
                      aria-label="Search hospitals"
                      placeholder="Search hospital name"
                      value={search}
                      onChange={(event) => {
                        setSearch(
                          event.target.value,
                        );

                        resetHospital();
                      }}
                    />
                  </div>

                  {(search.trim().length >= 2 ||
                    Boolean(state && district)) && (
                      <>
                        <ListFeedback
                          loading={hospitals.loading}
                          error={hospitals.error}
                          retry={hospitals.retry}
                          showPopup={showErrorPopup}
                        />

                        {!hospitals.loading &&
                          !hospitals.error && (
                            <div className="pb-options">
                              {hospitals.items.map(
                                (item) => (
                                  <button
                                    type="button"
                                    className="pb-option"
                                    key={item._id}
                                    onClick={() =>
                                      chooseHospital(
                                        item,
                                      )
                                    }
                                  >
                                    <span className="pb-option-icon">
                                      <Building2 size={21} />
                                    </span>

                                    <span className="pb-option-text">
                                      <strong>
                                        {item.name}
                                      </strong>

                                      <span>
                                        {item.address ||
                                          item.city ||
                                          "Address not available"}
                                      </span>

                                      <small>
                                        <MapPin size={12} />
                                        {item.district},{" "}
                                        {item.state}
                                      </small>
                                    </span>

                                    <ChevronRight size={18} />
                                  </button>
                                ),
                              )}
                            </div>
                          )}

                        {!hospitals.loading &&
                          !hospitals.error &&
                          !hospitals.items.length && (
                            <p className="pb-empty">
                              No hospitals found. Try another name or location.
                            </p>
                          )}
                      </>
                    )}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="pb-field">
                    <label htmlFor="pb-department">
                      Department
                    </label>

                    <select
                      id="pb-department"
                      disabled={departments.loading}
                      value={
                        department?._id || ""
                      }
                      onChange={(event) => {
                        releaseCurrentHold();

                        setDepartment(
                          departments.items.find(
                            (item) =>
                              item._id ===
                              event.target.value,
                          ) || null,
                        );

                        setDoctor(null);
                        setSlot(null);
                      }}
                    >
                      <option value="">
                        Select department
                      </option>

                      {departments.items.map(
                        (item) => (
                          <option
                            key={item._id}
                            value={item._id}
                          >
                            {item.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <ListFeedback
                    loading={departments.loading}
                    error={departments.error}
                    retry={departments.retry}
                    showPopup={showErrorPopup}
                  />

                  {!departments.loading &&
                    !departments.error &&
                    !departments.items.length && (
                      <p className="pb-empty">
                        No departments are accepting appointments here. Choose another hospital.
                      </p>
                    )}

                  {department && (
                    <div className="pb-section">
                      <h2>
                        Choose a doctor
                      </h2>

                      <ListFeedback
                        loading={doctors.loading}
                        error={doctors.error}
                        retry={doctors.retry}
                        showPopup={showErrorPopup}
                      />

                      {!doctors.loading &&
                        !doctors.error && (
                          <div className="pb-options">
                            {doctors.items.map(
                              (item) => (
                                <button
                                  type="button"
                                  className="pb-option"
                                  aria-pressed={
                                    doctor?._id ===
                                    item._id
                                  }
                                  key={item._id}
                                  onClick={() => {
                                    releaseCurrentHold();
                                    setDoctor(item);
                                    setSlot(null);
                                  }}
                                >
                                  <span className="pb-option-icon">
                                    <UserRound size={21} />
                                  </span>

                                  <span className="pb-option-text">
                                    <strong>
                                      {doctorName(
                                        item.name,
                                      )}
                                    </strong>

                                    <span>
                                      {department.name}
                                    </span>
                                  </span>

                                  {doctor?._id ===
                                    item._id ? (
                                    <CheckCircle2 size={19} />
                                  ) : (
                                    <ChevronRight size={18} />
                                  )}
                                </button>
                              ),
                            )}
                          </div>
                        )}

                      {!doctors.loading &&
                        !doctors.error &&
                        !doctors.items.length && (
                          <p className="pb-empty">
                            No doctors are available for booking in this department.
                          </p>
                        )}
                    </div>
                  )}

                  {doctor && (
                    <div className="pb-section">
                      <div className="pb-date-heading">
                        <h2>
                          Choose a time
                        </h2>

                        <div className="pb-field">
                          <label htmlFor="pb-date">
                            Appointment date
                          </label>

                          <input
                            id="pb-date"
                            type="date"
                            min={today()}
                            max={lastBookableDate()}
                            value={date}
                            onChange={(event) => {
                              releaseCurrentHold();

                              setDate(
                                event.target.value,
                              );

                              setSlot(null);
                            }}
                          />

                          <small className="pb-date-hint">
                            Online appointments are available for the next{" "}
                            {APPOINTMENT_BOOKING_WINDOW_DAYS} days only.
                          </small>
                        </div>
                      </div>

                      <ListFeedback
                        loading={slots.loading}
                        error={slots.error}
                        retry={slots.retry}
                        showPopup={showErrorPopup}
                      />

                      {bookingError && (
                        <div
                          className="pb-error"
                          role="alert"
                        >
                          {bookingError}
                        </div>
                      )}

                      {!slots.loading &&
                        !slots.error && (
                          <div className="pb-times">
                            {visibleSlots.map(
                              (item) => (
                                <button
                                  type="button"
                                  key={item._id}
                                  aria-pressed={
                                    slot?._id ===
                                    item._id
                                  }
                                  disabled={holdingSlot}
                                  aria-busy={
                                    holdingSlot &&
                                    slot?._id ===
                                    item._id
                                  }
                                  onClick={() =>
                                    void selectSlot(
                                      item,
                                    )
                                  }
                                >
                                  <strong>
                                    {item.startTime}
                                  </strong>

                                  <span>
                                    to {item.endTime}
                                  </span>
                                </button>
                              ),
                            )}
                          </div>
                        )}

                      {holdingSlot && (
                        <p className="pb-hint">
                          Reserving your selected time…
                        </p>
                      )}

                      {!slots.loading &&
                        !slots.error &&
                        !visibleSlots.length && (
                          <p className="pb-empty">
                            No times available. Try another date or doctor.
                          </p>
                        )}

                      <p className="pb-hint">
                        Appointment times are approximate. Emergency cases or longer consultations can affect the queue.
                      </p>
                    </div>
                  )}

                  <div className="pb-actions">
                    <button
                      type="button"
                      className="pb-button pb-secondary"
                      onClick={() => {
                        releaseCurrentHold();
                        setSlot(null);
                        setStep(1);
                      }}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>

                    <button
                      type="button"
                      className="pb-button pb-primary"
                      disabled={
                        !slot ||
                        !holdToken ||
                        slots.loading ||
                        !!slots.error ||
                        !date ||
                        !isDateWithinBookingWindow(
                          date,
                        )
                      }
                      onClick={() =>
                        setStep(3)
                      }
                    >
                      Continue
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <form
                  onSubmit={book}
                  aria-busy={saving}
                >
                  {bookingError && (
                    <div
                      className="pb-error"
                      role="alert"
                    >
                      {bookingError}
                    </div>
                  )}

                  {holdSeconds !== null && (
                    <p className="pb-note">
                      This time is reserved for you for{" "}
                      {formatHoldTime(holdSeconds)}.
                    </p>
                  )}

                  <fieldset
                    className="pb-form"
                    disabled={saving}
                  >
                    <div className="pb-fields">
                      <div className="pb-field">
                        <label htmlFor="pb-name">
                          Patient name
                        </label>

                        <input
                          id="pb-name"
                          required
                          minLength={2}
                          autoComplete="name"
                          value={name}
                          onChange={(event) =>
                            setName(
                              event.target.value,
                            )
                          }
                          placeholder="Full name"
                        />
                      </div>

                      <div className="pb-field">
                        <label htmlFor="pb-phone">
                          Mobile number
                        </label>

                        <input
                          id="pb-phone"
                          required
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(event) =>
                            setPhone(
                              event.target.value,
                            )
                          }
                          placeholder="10-digit mobile number"
                        />
                      </div>
                    </div>

                    <div className="pb-fields">
                      <div className="pb-field">
                        <label htmlFor="pb-age">
                          Age{" "}
                          <span>
                            (optional)
                          </span>
                        </label>

                        <input
                          id="pb-age"
                          type="number"
                          min="0"
                          step="1"
                          value={age}
                          onChange={(event) =>
                            setAge(
                              event.target.value,
                            )
                          }
                          placeholder="Age in years"
                        />
                      </div>

                      <div className="pb-field">
                        <label htmlFor="pb-gender">
                          Gender
                        </label>

                        <select
                          id="pb-gender"
                          value={gender}
                          onChange={(event) =>
                            setGender(
                              event.target.value,
                            )
                          }
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

                    <div className="pb-field">
                      <label htmlFor="pb-reason">
                        Reason for visit{" "}
                        <span>
                          (optional)
                        </span>
                      </label>

                      <textarea
                        id="pb-reason"
                        rows={2}
                        value={reason}
                        onChange={(event) =>
                          setReason(
                            event.target.value,
                          )
                        }
                        placeholder="Briefly describe why you're visiting"
                      />
                    </div>
                  </fieldset>

                  <p className="pb-note">
                    After booking, show your appointment code at reception to check in and receive your queue token.
                  </p>

                  <div className="pb-actions">
                    <button
                      type="button"
                      className="pb-button pb-secondary"
                      disabled={saving}
                      onClick={() => {
                        setBookingError("");
                        setStep(2);
                      }}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>

                    <button
                      type="submit"
                      className="pb-button pb-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2
                          size={17}
                          className="pb-spin"
                        />
                      ) : (
                        <CalendarDays size={17} />
                      )}

                      {saving
                        ? "Booking…"
                        : "Confirm appointment"}
                    </button>
                  </div>
                </form>
              )}
            </section>

            <p className="pb-bottom-note">
              Your live queue begins after check-in at the hospital.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function ErrorPopup({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div
      className="pb-popup-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pb-error-popup-title"
    >
      <div className="pb-popup">
        <button
          type="button"
          className="pb-popup-close"
          aria-label="Close error popup"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <span className="pb-popup-icon">
          <AlertTriangle size={28} />
        </span>

        <h2 id="pb-error-popup-title">
          Booking alert
        </h2>

        <p>{message}</p>

        <button
          type="button"
          className="pb-button pb-primary pb-popup-button"
          onClick={onClose}
        >
          Okay
        </button>
      </div>
    </div>
  );
}

function ListFeedback({
  loading,
  error,
  retry,
  showPopup,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
  showPopup?: (
    message: string,
  ) => void;
}) {
  if (loading) {
    return (
      <p
        className="pb-loading"
        role="status"
      >
        <Loader2
          size={18}
          className="pb-spin"
        />
        Loading available options…
      </p>
    );
  }

  if (error) {
    return (
      <div
        className="pb-error"
        role="alert"
      >
        <span>{error}</span>

        <button
          type="button"
          onClick={() => {
            showPopup?.(error);
            retry();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return null;
}

function BookingStyles() {
  return (
    <style>{`
      .pb-page {
        min-height: 100dvh;
        color: #173d39;
        background: #f5f6f2;
        font-family: "Inter", "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      .pb-page *,
      .pb-page *::before,
      .pb-page *::after {
        box-sizing: border-box;
      }

      .pb-page h1,
      .pb-page h2,
      .pb-page p {
        margin: 0;
      }

      .pb-page button,
      .pb-page input,
      .pb-page select,
      .pb-page textarea {
        font: inherit;
      }

      .pb-page button {
        cursor: pointer;
        touch-action: manipulation;
      }

      .pb-page button:disabled {
        opacity: .5;
        cursor: not-allowed;
      }

      .pb-page svg {
        flex-shrink: 0;
      }

      .pb-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        max-width: 1060px;
        padding: 22px 28px;
        margin: auto;
        border-bottom: 1px solid #dce5d5;
      }

      .pb-brand {
        display: flex;
        align-items: center;
        min-width: 0;
        text-decoration: none;
      }

      .pb-brand img {
        display: block;
        width: auto;
        height: 42px;
        max-width: 190px;
        object-fit: contain;
      }

      .pb-header > span {
        color: #6a7b61;
        font-size: 12px;
      }

      .pb-main {
        max-width: 820px;
        margin: auto;
        padding: 32px 24px 40px;
      }

      .pb-intro {
        padding: 24px;
        border: 1px solid #dce5d5;
        border-radius: 18px;
        background: linear-gradient(
          110deg,
          #eaf0e1,
          #eef4e9,
          #dcebdd
        );
      }

      .pb-eyebrow {
        color: #647c57;
        font-size: 9px;
        letter-spacing: 1.6px;
        font-weight: 700;
      }

      .pb-intro h1 {
        margin-top: 9px;
        font-size: 28px;
        line-height: 1.3;
        letter-spacing: -.7px;
        font-weight: 600;
      }

      .pb-intro > p:last-child {
        margin-top: 8px;
        font-size: 13px;
        color: #67795e;
        line-height: 1.7;
      }

      .pb-intro h1:focus,
      .pb-success h1:focus {
        outline: none;
      }

      .pb-progress {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        list-style: none;
        padding: 0;
        gap: 12px;
        margin: 22px 0;
      }

      .pb-progress li {
        display: flex;
        align-items: center;
        gap: 9px;
        font-size: 12px;
        color: #7a8970;
      }

      .pb-progress li > span {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        background: #e7ecdf;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .pb-progress li[aria-current="step"] {
        color: #176957;
        font-weight: 600;
      }

      .pb-progress li[aria-current="step"] > span {
        background: #176957;
        color: white;
      }

      .pb-progress li[data-done="true"] > span {
        background: #e2eeda;
        color: #507547;
      }

      .pb-panel {
        padding: 26px;
        background: #fff;
        border: 1px solid #dfe6d7;
        border-radius: 18px;
      }

      .pb-selection {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 18px;
        margin-bottom: 14px;
        background: #edf3e6;
        border: 1px solid #dce6d4;
        border-radius: 13px;
      }

      .pb-selection > div {
        flex: 1;
        min-width: 0;
      }

      .pb-selection strong {
        font-size: 13px;
        overflow-wrap: anywhere;
      }

      .pb-selection p {
        font-size: 12px;
        color: #6c7e60;
        margin-top: 5px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      .pb-selection button {
        border: 0;
        color: #176957;
        background: transparent;
        text-decoration: underline;
        font-size: 12px;
        min-height: 44px;
      }

      .pb-seo-hospital {
        margin: 0 0 14px;
        padding: 18px 20px;
        border: 1px solid #dce6d4;
        border-radius: 15px;
        background: #f0f5eb;
      }

      .pb-seo-label {
        color: #5c7850;
        font-size: 10px;
        letter-spacing: 1.2px;
        font-weight: 700;
      }

      .pb-seo-hospital h2 {
        margin-top: 7px;
        color: #173d39;
        font-size: 19px;
        line-height: 1.35;
      }

      .pb-seo-hospital p:not(.pb-seo-label) {
        margin-top: 8px;
        color: #5f7159;
        font-size: 13px;
        line-height: 1.65;
      }

      .pb-seo-hospital address {
        margin-top: 8px;
        color: #536a4d;
        font-size: 12px;
        font-style: normal;
        line-height: 1.6;
      }

      .pb-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .pb-field {
        display: grid;
        gap: 8px;
        min-width: 0;
      }

      .pb-field label {
        font-size: 12px;
        color: #4c6746;
        font-weight: 600;
      }

      .pb-field label > span {
        color: #7d8c71;
        font-weight: 400;
      }

      .pb-field input,
      .pb-field select,
      .pb-field textarea,
      .pb-search input {
        width: 100%;
        min-height: 48px;
        border: 1px solid #d9e3d0;
        border-radius: 10px;
        background: #fafbf7;
        color: #264d39;
        padding: 12px;
        font-size: 14px;
      }

      .pb-field textarea {
        resize: vertical;
      }

      .pb-field input:focus,
      .pb-field select:focus,
      .pb-field textarea:focus,
      .pb-search input:focus {
        outline: 2px solid #85aa76;
        outline-offset: 1px;
        background: white;
      }

      .pb-page button:focus-visible {
        outline: 3px solid #38a992;
        outline-offset: 3px;
      }

      .pb-field input::placeholder,
      .pb-field textarea::placeholder,
      .pb-search input::placeholder {
        color: #8a9980;
      }

      .pb-ai-card {
        display: grid;
        gap: 16px;
        margin-bottom: 24px;
        padding: 18px;
        border: 1px solid #cde1d4;
        border-radius: 15px;
        background: linear-gradient(
          135deg,
          #f3faf4,
          #eef7f1
        );
      }

      .pb-ai-heading {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .pb-ai-icon {
        display: grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: #d9eee2;
        color: #176957;
        flex-shrink: 0;
      }

      .pb-ai-kicker {
        color: #267765;
        font-size: 9px;
        letter-spacing: 1.3px;
        font-weight: 700;
      }

      .pb-ai-heading h2 {
        margin-top: 4px;
        color: #174e42;
        font-size: 16px;
        font-weight: 700;
      }

      .pb-ai-heading p:last-child {
        margin-top: 5px;
        color: #64806e;
        font-size: 12px;
        line-height: 1.6;
      }

      .pb-ai-form {
        display: grid;
        gap: 9px;
      }

      .pb-ai-form textarea {
        width: 100%;
        border: 1px solid #cfe0d4;
        border-radius: 10px;
        background: #fff;
        color: #244b3b;
        padding: 12px;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
      }

      .pb-ai-form textarea:focus {
        outline: 2px solid #72a98a;
        outline-offset: 1px;
      }

      .pb-ai-form textarea::placeholder {
        color: #8a9b8d;
      }

      .pb-ai-form-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .pb-ai-form-footer small {
        color: #6d8574;
        font-size: 10px;
        line-height: 1.5;
      }

      .pb-ai-button {
        min-height: 42px;
        padding: 9px 14px;
        background: #247866;
        color: #fff;
      }

      .pb-ai-button:hover:not(:disabled) {
        background: #185c4f;
      }

      .pb-ai-error {
        color: #974b3b;
        font-size: 12px;
        line-height: 1.6;
      }

      .pb-ai-results {
        display: grid;
        gap: 12px;
        border-top: 1px solid #d9e9dd;
        padding-top: 14px;
      }

      .pb-ai-message {
        color: #486d59;
        font-size: 12px;
        line-height: 1.6;
      }

      .pb-ai-result-list {
        display: grid;
        gap: 12px;
      }

      .pb-ai-result {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid #d8e6da;
        border-radius: 12px;
        background: #fff;
      }

      .pb-ai-result-top,
      .pb-ai-doctor {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        color: #63836f;
      }

      .pb-ai-result-top > div,
      .pb-ai-doctor > span {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .pb-ai-result strong,
      .pb-ai-doctor strong {
        color: #25523f;
        font-size: 13px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .pb-ai-result small,
      .pb-ai-doctor small {
        color: #718579;
        font-size: 10px;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .pb-ai-doctor {
        justify-content: flex-start;
        padding-top: 10px;
        border-top: 1px solid #edf2eb;
      }

      .pb-ai-date {
        display: grid;
        gap: 8px;
      }

      .pb-ai-date-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: #557a62;
        font-size: 11px;
        font-weight: 700;
      }

      .pb-ai-date-heading > span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .pb-ai-date-heading small {
        color: #809285;
        font-weight: 500;
      }

      .pb-ai-slots {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .pb-ai-slots button {
        min-height: 36px;
        padding: 7px 10px;
        border: 1px solid #cfe0d4;
        border-radius: 8px;
        background: #f7fbf6;
        color: #27634b;
        font-size: 11px;
      }

      .pb-ai-slots button:hover {
        border-color: #70a282;
        background: #eaf5ed;
      }

      .pb-ai-use-result {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 40px;
        border: 0;
        border-radius: 9px;
        background: #e7f2e9;
        color: #176957;
        font-size: 12px;
        font-weight: 700;
      }

      .pb-search {
        position: relative;
        margin: 22px 0 16px;
      }

      .pb-search > svg {
        position: absolute;
        top: 15px;
        left: 13px;
        color: #869879;
      }

      .pb-search input {
        padding-left: 40px;
      }

      .pb-options {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(min(100%, 270px), 1fr)
        );
        gap: 12px;
      }

      .pb-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        min-width: 0;
        text-align: left;
        border: 1px solid #dce5d3;
        border-radius: 12px;
        background: white;
        color: #31553d;
        transition:
          background .15s,
          border-color .15s;
      }

      .pb-option:hover {
        background: #f4f8ee;
        border-color: #9ab48b;
      }

      .pb-option[aria-pressed="true"] {
        background: #edf5e6;
        border-color: #62885e;
      }

      .pb-option-icon {
        display: grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 11px;
        background: #edf3e6;
        color: #668355;
        flex-shrink: 0;
      }

      .pb-option-text {
        display: grid;
        gap: 5px;
        min-width: 0;
        flex: 1;
      }

      .pb-option-text strong {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .pb-option-text > span,
      .pb-option-text small {
        font-size: 11px;
        color: #718363;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      .pb-option-text small {
        display: flex;
        align-items: center;
        gap: 4px;
      }
        .pb-ai-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pb-ai-voice {
  background: white;
  color: #176957;
  border: 1px solid #b9d6c1;
}

.pb-ai-voice:hover:not(:disabled) {
  background: #eaf5ed;
}

.pb-ai-voice-listening {
  background: #fff0eb;
  border-color: #e3a494;
  color: #a04435;
}

@media (max-width: 639px) {
  .pb-ai-actions {
    width: 100%;
    flex-direction: column;
  }

  .pb-ai-actions button {
    width: 100%;
  }
}

      .pb-section {
        margin-top: 24px;
        border-top: 1px solid #e8eddf;
        padding-top: 22px;
      }

      .pb-section h2 {
        margin-bottom: 14px;
        font-size: 16px;
        font-weight: 600;
      }

      .pb-date-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }

      .pb-date-heading h2 {
        margin: 0;
      }

      .pb-date-hint {
        display: block;
        color: #71816b;
        font-size: 11px;
        line-height: 1.5;
      }

      .pb-times {
        display: grid;
        grid-template-columns: repeat(
          auto-fill,
          minmax(100px, 1fr)
        );
        gap: 10px;
      }

      .pb-times button {
        padding: 12px;
        border: 1px solid #d9e3d0;
        border-radius: 10px;
        background: #fafbf7;
        color: #345c42;
      }

      .pb-times strong {
        display: block;
        font-size: 15px;
        font-weight: 600;
      }

      .pb-times span {
        display: block;
        margin-top: 5px;
        font-size: 11px;
      }

      .pb-times button[aria-pressed="true"] {
        background: #176957;
        border-color: #176957;
        color: white;
      }

      .pb-hint,
      .pb-bottom-note {
        font-size: 11px;
        color: #75856a;
        line-height: 1.7;
      }

      .pb-hint {
        margin-top: 14px !important;
      }

      .pb-bottom-note {
        text-align: center;
        margin-top: 18px !important;
      }

      .pb-actions {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border-top: 1px solid #e6ecdd;
        padding-top: 18px;
        margin-top: 24px;
      }

      .pb-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 48px;
        padding: 12px 18px;
        border-radius: 10px;
        border: 1px solid transparent;
        font-size: 13px !important;
        font-weight: 600 !important;
      }

      .pb-primary {
        background: #176957;
        color: white;
      }

      .pb-primary:hover:not(:disabled) {
        background: #104e40;
      }

      .pb-secondary {
        background: white;
        color: #5b744e;
        border-color: #d7e2cc;
      }

      .pb-form {
        display: grid;
        gap: 18px;
        border: 0;
        padding: 0;
        margin: 0;
        min-width: 0;
      }

      .pb-note {
        padding: 15px;
        background: #f0f5e9;
        border-radius: 11px;
        color: #637b55;
        font-size: 12px;
        line-height: 1.8;
        margin-top: 20px !important;
      }

      .pb-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        padding: 22px;
        font-size: 12px;
        color: #6c845f;
      }

      .pb-error {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        background: #fcf0eb;
        border: 1px solid #eed4ca;
        color: #974b3b;
        border-radius: 10px;
        padding: 14px;
        margin: 12px 0;
        font-size: 13px;
        line-height: 1.6;
      }

      .pb-error button {
        background: transparent;
        border: 0;
        color: inherit;
        text-decoration: underline;
        min-height: 44px;
        flex-shrink: 0;
      }

      .pb-empty {
        padding: 24px 12px;
        text-align: center;
        color: #74836a;
        font-size: 13px;
        line-height: 1.8;
      }

      .pb-success {
        max-width: 600px;
        margin: auto;
        text-align: center;
      }

      .pb-success-icon {
        display: inline-grid;
        place-items: center;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        background: #edf4e5;
        color: #176957;
      }

      .pb-success h1 {
        font-size: 27px;
        font-weight: 600;
        margin: 18px 0 8px;
      }

      .pb-success > p {
        color: #728568;
        font-size: 13px;
        line-height: 1.8;
      }

      .pb-code {
        background: #eaf0e1;
        border-radius: 14px;
        padding: 22px;
        margin-top: 22px;
      }

      .pb-code > span {
        font-size: 10px;
        letter-spacing: 1.5px;
        color: #647b57;
      }

      .pb-code strong {
        display: block;
        font-size: 30px;
        margin: 10px 0;
        overflow-wrap: anywhere;
      }

      .pb-code p {
        font-size: 12px;
      }

      .pb-summary-list {
        text-align: left;
        margin: 20px 0;
      }

      .pb-summary-list > div {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid #e5ebdc;
        font-size: 13px;
      }

      .pb-summary-list dt {
        color: #7a8a6c;
      }

      .pb-summary-list dd {
        margin: 0;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .pb-success > button {
        width: 100%;
        margin-top: 20px;
      }

      .pb-popup-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(15, 23, 42, .48);
        backdrop-filter: blur(5px);
      }

      .pb-popup {
        position: relative;
        width: min(100%, 430px);
        padding: 26px;
        border-radius: 20px;
        background: #fffaf7;
        border: 1px solid #f1d3c9;
        box-shadow: 0 24px 70px rgba(15, 23, 42, .24);
        text-align: center;
        animation: pb-popup-in .16s ease-out;
      }

      .pb-popup-close {
        position: absolute;
        right: 14px;
        top: 14px;
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid #efd7cf;
        background: #fff;
        color: #995140;
      }

      .pb-popup-icon {
        display: inline-grid;
        place-items: center;
        width: 62px;
        height: 62px;
        border-radius: 18px;
        background: #fff1eb;
        color: #b4533f;
      }

      .pb-popup h2 {
        margin-top: 16px;
        color: #743b30;
        font-size: 21px;
        font-weight: 700;
      }

      .pb-popup p {
        margin-top: 10px;
        color: #875246;
        font-size: 14px;
        line-height: 1.7;
      }

      .pb-popup-button {
        width: 100%;
        margin-top: 22px;
      }

      @keyframes pb-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes pb-popup-in {
        from {
          opacity: 0;
          transform: translateY(10px) scale(.98);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .pb-spin {
        animation: pb-spin 1s linear infinite;
      }

      @media (max-width: 639px) {
        .pb-header {
          padding: 18px 16px;
        }

        .pb-header > span {
          display: none;
        }

        .pb-brand img {
          height: 36px;
          max-width: 160px;
        }

        .pb-main {
          padding: 20px 14px 28px;
        }

        .pb-intro {
          padding: 20px;
          border-radius: 15px;
        }

        .pb-intro h1 {
          font-size: 25px;
        }

        .pb-progress {
          gap: 6px;
          margin: 18px 0;
        }

        .pb-progress li {
          gap: 5px;
          font-size: 10px;
        }

        .pb-progress li > span {
          width: 24px;
          height: 24px;
        }

        .pb-panel {
          padding: 18px;
          border-radius: 14px;
        }

        .pb-fields {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .pb-field input,
        .pb-field select,
        .pb-field textarea,
        .pb-search input {
          font-size: 16px;
        }

        .pb-selection {
          padding: 12px;
        }

        .pb-ai-form-footer {
          align-items: stretch;
          flex-direction: column;
        }

        .pb-ai-button {
          width: 100%;
        }

        .pb-date-heading {
          align-items: stretch;
          flex-direction: column;
        }

        .pb-actions {
          position: sticky;
          bottom: 0;
          background: #fff;
          padding-bottom: max(
            12px,
            env(safe-area-inset-bottom)
          );
        }

        .pb-actions .pb-primary {
          flex: 1;
          padding-left: 10px;
          padding-right: 10px;
        }

        .pb-actions .pb-secondary {
          padding-left: 12px;
          padding-right: 12px;
        }

        .pb-popup {
          padding: 24px 18px 20px;
          border-radius: 18px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .pb-spin {
          animation: none;
        }

        .pb-option {
          transition: none;
        }

        .pb-popup {
          animation: none;
        }
      }
    `}</style>
  );
}
