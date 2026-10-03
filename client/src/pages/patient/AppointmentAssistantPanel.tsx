import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Bot,
  CalendarDays,
  ChevronRight,
  Loader2,
  MapPin,
  Mic,
  Search,
  Square,
  UserRound,
} from "lucide-react";

import {
  searchAppointmentsWithAI,
  type AppointmentAssistantResponse,
  type AppointmentAssistantResult,
} from "../../services/appointment/appointmentAssistant.api";

export type {
  AppointmentAssistantResult,
};

interface Props {
  onSelectResult: (
    result: AppointmentAssistantResult,
    date: string,
  ) => void;
}

type SpeechResultItem = {
  transcript: string;
};

type SpeechResult = {
  length: number;
  isFinal: boolean;
  [index: number]: SpeechResultItem;
};

type SpeechResults = {
  length: number;
  [index: number]: SpeechResult;
};

type SpeechEvent = {
  resultIndex?: number;
  results: SpeechResults;
};

type SpeechErrorEvent = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: SpeechEvent) => void)
    | null;
  onerror:
    | ((event: SpeechErrorEvent) => void)
    | null;
  onend:
    | (() => void)
    | null;
};

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor():
  | SpeechRecognitionConstructor
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow =
    window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

  return (
    browserWindow.SpeechRecognition ||
    browserWindow.webkitSpeechRecognition ||
    null
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      weekday: "short",
      timeZone: "Asia/Kolkata",
    },
  ).format(
    new Date(`${value}T00:00:00+05:30`),
  );
}

export default function AppointmentAssistantPanel({
  onSelectResult,
}: Props) {
  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [listening, setListening] =
    useState(false);

  const [error, setError] =
    useState("");

  const [response, setResponse] =
    useState<AppointmentAssistantResponse | null>(
      null,
    );

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(
      null,
    );

  async function performSearch(
    value: string,
  ): Promise<void> {
    const trimmed = value.trim();

    if (trimmed.length < 2) {
      setError(
        "Please enter a hospital, doctor, department, city, or date.",
      );
      return;
    }

    if (trimmed.length > 300) {
      setError(
        "Please keep your request under 300 characters.",
      );
      return;
    }

    try {
      setError("");
      setResponse(null);
      setLoading(true);

      const result =
        await searchAppointmentsWithAI(
          trimmed,
        );

      setResponse(result);
    } catch (requestError: any) {
      const serverMessage =
        requestError?.response?.data?.message;

      setError(
        serverMessage ||
          requestError?.message ||
          "Search failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function submit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    void performSearch(message);
  }

  function toggleVoiceSearch(): void {
    if (loading) {
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setError(
        "Voice search is not supported in this browser. Please use Google Chrome or Microsoft Edge.",
      );
      return;
    }

    setError("");
    setResponse(null);
    setMessage("");

    const recognition =
      new SpeechRecognition();

    let spokenText = "";

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (
      event: SpeechEvent,
    ) => {
      let transcript = "";

      const startIndex =
        event.resultIndex || 0;

      for (
        let index = startIndex;
        index < event.results.length;
        index += 1
      ) {
        transcript +=
          event.results[index]?.[0]
            ?.transcript || "";
      }

      spokenText = transcript.trim();

      if (spokenText) {
        setMessage(spokenText);
      }
    };

    recognition.onerror = (
      event: SpeechErrorEvent,
    ) => {
      setListening(false);
      recognitionRef.current = null;

      if (event.error === "not-allowed") {
        setError(
          "Microphone permission was denied. Please allow microphone access.",
        );
      } else {
        setError(
          "Voice search could not understand your request. Please try again.",
        );
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;

      if (spokenText.trim()) {
        setMessage(spokenText.trim());
        void performSearch(spokenText.trim());
      }
    };

    recognitionRef.current = recognition;
    setListening(true);

    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setError(
        "Unable to start microphone. Please try again.",
      );
    }
  }

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore microphone cleanup errors.
      }

      recognitionRef.current = null;
    };
  }, []);

  return (
    <section
      className="pb-ai-card"
      aria-labelledby="pb-ai-title"
    >
      <div className="pb-ai-heading">
        <span className="pb-ai-icon">
          <Bot size={20} />
        </span>

        <div>
          <p className="pb-ai-kicker">
            AI APPOINTMENT ASSISTANT
          </p>

          <h2 id="pb-ai-title">
            Find your appointment using AI
          </h2>

          <p>
            Example: Find a cardiologist at NexTurn Hospital tomorrow
          </p>
        </div>
      </div>

      <form
        className="pb-ai-form"
        onSubmit={submit}
      >
        <label
          className="pb-sr-only"
          htmlFor="pb-ai-request"
        >
          Describe your appointment request
        </label>

        <textarea
          id="pb-ai-request"
          value={message}
          maxLength={300}
          rows={3}
          placeholder="Type or speak: Find a cardiologist at NexTurn Hospital tomorrow"
          onChange={(event) => {
            setMessage(event.target.value);
            setError("");
          }}
        />

        <div className="pb-ai-form-footer">
          <small>
            {message.length}/300
          </small>

          <div className="pb-ai-actions">
            <button
              type="button"
              className={`pb-button pb-ai-voice ${
                listening
                  ? "pb-ai-voice-listening"
                  : ""
              }`}
              disabled={loading}
              onClick={toggleVoiceSearch}
            >
              {listening ? (
                <Square size={16} />
              ) : (
                <Mic size={17} />
              )}

              {listening
                ? "Listening..."
                : "Speak"}
            </button>

            <button
              type="submit"
              className="pb-button pb-ai-button"
              disabled={loading || listening}
            >
              {loading ? (
                <Loader2
                  size={17}
                  className="pb-spin"
                />
              ) : (
                <Search size={17} />
              )}

              {loading
                ? "Searching..."
                : "Find appointments"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <p
          className="pb-ai-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {response && (
        <div className="pb-ai-results">
          <p className="pb-ai-message">
            {response.message}
          </p>

          {!response.results.length &&
            response.hospitals.length > 0 && (
              <div className="pb-ai-hospitals">
                <p>
                  Matching hospitals:
                </p>

                {response.hospitals.map(
                  (hospital) => (
                    <div
                      className="pb-ai-hospital"
                      key={hospital._id}
                    >
                      <MapPin size={16} />

                      <span>
                        <strong>
                          {hospital.name}
                        </strong>

                        <small>
                          {hospital.city ||
                            hospital.district ||
                            hospital.state}
                        </small>
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}

          <div className="pb-ai-result-list">
            {response.results.map(
              (result) => (
                <article
                  className="pb-ai-result"
                  key={`${result.hospital._id}-${result.doctor._id}-${result.department._id}`}
                >
                  <div className="pb-ai-result-top">
                    <div>
                      <strong>
                        {result.hospital.name}
                      </strong>

                      <small>
                        {result.hospital.address ||
                          result.hospital.city ||
                          result.hospital.district}
                      </small>
                    </div>

                    <MapPin size={16} />
                  </div>

                  <div className="pb-ai-doctor">
                    <UserRound size={16} />

                    <span>
                      <strong>
                        {result.doctor.name}
                      </strong>

                      <small>
                        {result.department.name}
                      </small>
                    </span>
                  </div>

                  {result.dates.map(
                    (date) => (
                      <div
                        className="pb-ai-date"
                        key={date.date}
                      >
                        <div className="pb-ai-date-heading">
                          <span>
                            <CalendarDays size={14} />
                            {formatDate(
                              date.date,
                            )}
                          </span>

                          <small>
                            {date.slots.length} available
                          </small>
                        </div>

                        <div className="pb-ai-slots">
                          {date.slots.map(
                            (slot) => (
                              <button
                                type="button"
                                key={slot._id}
                                onClick={() =>
                                  onSelectResult(
                                    result,
                                    date.date,
                                  )
                                }
                              >
                                {slot.startTime}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ),
                  )}

                  <button
                    type="button"
                    className="pb-ai-use-result"
                    onClick={() =>
                      onSelectResult(
                        result,
                        result.dates[0]?.date ||
                          response.bookingWindow.from,
                      )
                    }
                  >
                    Choose this doctor
                    <ChevronRight size={16} />
                  </button>
                </article>
              ),
            )}
          </div>

          {!response.results.length &&
            !response.hospitals.length && (
              <p className="pb-empty">
                No matching hospital, doctor, or available slot was found.
              </p>
            )}
        </div>
      )}
    </section>
  );
}