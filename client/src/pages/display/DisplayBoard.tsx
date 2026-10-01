import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";

import {
  getDisplayBoard,
  type DisplayQueue,
  type DisplayResponse,
} from "../../services/display.api";

type DisplayTokenSource = "WALK_IN" | "APPOINTMENT" | "EMERGENCY";

type BreakAwareDoctor = {
  name?: string | null;
  isOnline?: boolean | null;
  isOnBreak?: boolean | null;
  breakStartedAt?: string | Date | null;
  breakReason?: string | null;
};

type EmergencyAwareDisplayQueue = DisplayQueue & {
  priority?: "NORMAL" | "EMERGENCY";
  source?: DisplayTokenSource;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  appointmentCallStatus?: "UPCOMING" | "PRIORITY" | "MISSED" | null;
  doctorId?: (DisplayQueue["doctorId"] & BreakAwareDoctor) | null;
};

type BreakAwareDisplayResponse = DisplayResponse & {
  doctorOnBreak?: boolean | null;
  doctorBreakStartedAt?: string | Date | null;
  doctorBreakReason?: string | null;
  breakStartedAt?: string | Date | null;
  breakReason?: string | null;
  doctorStatus?: {
    isOnBreak?: boolean | null;
    breakStartedAt?: string | Date | null;
    breakReason?: string | null;
  } | null;
  current?: EmergencyAwareDisplayQueue[];
  next?: EmergencyAwareDisplayQueue[];
  waiting?: EmergencyAwareDisplayQueue[];
  emergency?: EmergencyAwareDisplayQueue[];
};

function isEmergencyQueue(queue?: DisplayQueue | null): boolean {
  const item = queue as EmergencyAwareDisplayQueue | null | undefined;

  return item?.priority === "EMERGENCY" || item?.source === "EMERGENCY";
}

const POLL_INTERVAL_MS = 1_000;

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

// Hook: polls the display endpoint, tolerating transient failures

function useDisplayPolling(displayKey: string | undefined) {
  const [data, setData] = useState<DisplayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayKey) {
      setData(null);
      setError("Display key is missing");
      setLoading(false);
      return;
    }

    let mounted = true;
    let requestInFlight = false;

    setData(null);
    setError(null);
    setLoading(true);

    const load = async (isInitial: boolean) => {
      if (requestInFlight) return;
      requestInFlight = true;

      try {
        const response = await getDisplayBoard(displayKey);
        if (!mounted) return;

        setData(response);
        setError(null);
      } catch (err) {
        console.error("DISPLAY BOARD ERROR:", err);
        if (!mounted) return;

        // Keep the last snapshot, but tell viewers it may be out of date.
        setError("Unable to connect to hospital display");
      } finally {
        requestInFlight = false;
        if (mounted && isInitial) setLoading(false);
      }
    };

    load(true);
    const intervalId = window.setInterval(() => load(false), POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [displayKey]);

  return { data, loading, error };
}

function getQueueSource(queue?: DisplayQueue | null): DisplayTokenSource {
  const item = queue as EmergencyAwareDisplayQueue | null | undefined;

  if (
    item?.priority === "EMERGENCY" ||
    item?.source === "EMERGENCY"
  ) {
    return "EMERGENCY";
  }

  if (
    item?.source === "APPOINTMENT" ||
    String(item?.tokenLabel || "").includes("-A")
  ) {
    return "APPOINTMENT";
  }

  return "WALK_IN";
}

function tokenTypeLabel(queue?: DisplayQueue | null) {
  const source = getQueueSource(queue);

  if (source === "EMERGENCY") return "Emergency";
  if (source === "APPOINTMENT") return "Appointment";
  return "Walk-in";
}

function tokenTypeClass(queue?: DisplayQueue | null) {
  const source = getQueueSource(queue);

  if (source === "EMERGENCY") return "emergency";
  if (source === "APPOINTMENT") return "appointment";
  return "walkin";
}

function getDoctorBreakInfo(data?: DisplayResponse | null) {
  const item = data as BreakAwareDisplayResponse | null | undefined;

  const allQueues = [
    ...(item?.current || []),
    ...(item?.next || []),
    ...(item?.waiting || []),
    ...(item?.emergency || []),
  ];

  const queueDoctor = allQueues.find(
    (queue) =>
      Boolean(
        (queue as EmergencyAwareDisplayQueue)?.doctorId &&
          typeof (queue as EmergencyAwareDisplayQueue).doctorId === "object",
      ),
  )?.doctorId as BreakAwareDoctor | null | undefined;

  const isOnBreak = Boolean(
    item?.doctorOnBreak ??
      item?.doctorStatus?.isOnBreak ??
      queueDoctor?.isOnBreak ??
      false,
  );

  const breakStartedAt =
    item?.doctorBreakStartedAt ??
    item?.breakStartedAt ??
    item?.doctorStatus?.breakStartedAt ??
    queueDoctor?.breakStartedAt ??
    null;

  const breakReason =
    item?.doctorBreakReason ??
    item?.breakReason ??
    item?.doctorStatus?.breakReason ??
    queueDoctor?.breakReason ??
    null;

  return {
    isOnBreak,
    breakStartedAt,
    breakReason,
  };
}

function formatBreakTime(value?: string | Date | null) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  );
}

function DoctorBreakPanel({
  doctorName,
  breakStartedAt,
  breakReason,
  current,
}: {
  doctorName?: string | null;
  breakStartedAt?: string | Date | null;
  breakReason?: string | null;
  current: DisplayQueue[];
}) {
  const breakTime =
    formatBreakTime(
      breakStartedAt,
    );

  const pausedToken =
    current[0];

  return (
    <div className="tv-break-panel">
      <span className="tv-break-pill">
        Doctor on break
      </span>

      <h2>
        {doctorLabel(doctorName)} is on break
      </h2>

      <p>
        Queue is paused. Please wait for the doctor to resume duty.
      </p>

      {pausedToken && (
        <div className="tv-paused-token">
          <span>Current paused token</span>
          <strong>{pausedToken.tokenLabel}</strong>
        </div>
      )}

      <div className="tv-break-meta">
        {breakTime && (
          <span>Started at {breakTime}</span>
        )}

        {breakReason && (
          <span>Reason: {breakReason}</span>
        )}
      </div>
    </div>
  );
}

type VoiceLanguage = "HI" | "EN";
type VoiceName = "marin" | "cedar";
type AnnouncementRequest = {
  kind: "call" | "next" | "break" | "offline" | "test";
  queueId?: string;
  doctorId?: string;
};
type AudioJob = { request: AnnouncementRequest; language: VoiceLanguage; repeats: number; valid: () => boolean };

// One audio queue. AudioContext is unlocked by the Enable sound click.
function useSpeechAnnouncer(displayKey: string | undefined) {
  const [enabled, setEnabled] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<VoiceName>("marin");
  const [speechError, setSpeechError] = useState("");
  const enabledRef = useRef(false);
  const voiceRef = useRef<VoiceName>("marin");
  const context = useRef<AudioContext | null>(null);
  const jobs = useRef<AudioJob[]>([]);
  const running = useRef(false);
  const version = useRef(0);
  const active = useRef<AudioJob | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const release = useRef<(() => void) | null>(null);

  function stopActive() {
    requestController.current?.abort();
    requestController.current = null;
    try { source.current?.stop(); } catch { /* The clip may already have ended. */ }
    source.current = null;
    release.current?.();
    release.current = null;
  }

  function cancel() {
    version.current += 1;
    jobs.current = [];
    active.current = null;
    running.current = false;
    stopActive();
  }

  function invalidate() {
    jobs.current = jobs.current.filter(job => job.valid());
    if (active.current && !active.current.valid()) stopActive();
  }

  async function drain() {
    if (running.current || !enabledRef.current || !displayKey) return;
    running.current = true;
    const ownVersion = version.current;
    while (jobs.current.length && ownVersion === version.current && enabledRef.current) {
      const job = jobs.current.shift()!;
      if (!job.valid()) continue;
      active.current = job;
      const controller = new AbortController();
      requestController.current = controller;
      const valid = () => ownVersion === version.current && enabledRef.current
        && !controller.signal.aborted && job.valid();
      try {
        // Reuses the same Axios instance/baseURL as the application's other APIs.
        const response = await api.post<ArrayBuffer>(
          `/display/public/${encodeURIComponent(displayKey)}/announcement`,
          { ...job.request, language: job.language, voice: voiceRef.current },
          { responseType: "arraybuffer", signal: controller.signal, timeout: 30_000 },
        );
        if (!valid()) continue;
        const audioContext = context.current;
        if (!audioContext || audioContext.state !== "running") {
          throw new Error("Audio is paused. Click Enable sound or Test voice again.");
        }
        const buffer = await audioContext.decodeAudioData(response.data.slice(0));
        setSpeechError("");
        for (let repeat = 0; repeat < job.repeats && valid(); repeat += 1) {
          await new Promise<void>((resolve) => {
            const clip = audioContext.createBufferSource();
            clip.buffer = buffer;
            clip.connect(audioContext.destination);
            source.current = clip;
            let finished = false;
            const finish = () => {
              if (finished) return;
              finished = true;
              window.clearTimeout(timer);
              clip.disconnect();
              if (source.current === clip) source.current = null;
              if (release.current === finish) release.current = null;
              resolve();
            };
            const timer = window.setTimeout(() => {
              try { clip.stop(); } catch { /* Already stopped. */ }
              finish();
            }, Math.ceil(buffer.duration * 1000) + 3000);
            release.current = finish;
            clip.onended = finish;
            try { clip.start(); } catch { finish(); }
          });
          if (repeat + 1 < job.repeats && valid()) {
            await new Promise<void>((resolve) => {
              const finish = () => {
                window.clearTimeout(timer);
                if (release.current === finish) release.current = null;
                resolve();
              };
              const timer = window.setTimeout(finish, 1500);
              release.current = finish;
            });
          }
        }
      } catch (error: unknown) {
        if (valid()) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status !== 409) {
            setSpeechError(status === 503 ? "AI voice is not configured on the server."
              : status === 429 ? "Voice service is busy. Please test again shortly."
              : status === 403 ? "Announcements are disabled by the hospital."
              : "Audio could not play. Check the connection and click Test voice again.");
          }
        }
      } finally {
        if (ownVersion === version.current) {
          active.current = null;
          requestController.current = null;
        }
      }
    }
    if (ownVersion === version.current) running.current = false;
  }

  function speak(request: AnnouncementRequest, language: VoiceLanguage, repeats = 1, valid = () => true) {
    if (!enabledRef.current || !displayKey) return;
    jobs.current.push({ request, language, repeats: Math.min(2, Math.max(1, repeats)), valid });
    void drain();
  }

  async function activate(): Promise<boolean> {
    try {
      if (!context.current || context.current.state === "closed") context.current = new AudioContext();
      await context.current.resume();
      if (context.current.state !== "running") throw new Error("Audio blocked");
      enabledRef.current = true;
      setEnabled(true);
      setSpeechError("");
      return true;
    } catch {
      setSpeechError("Audio could not start. Use a supported browser and click Enable sound again.");
      return false;
    }
  }
  function deactivate() { enabledRef.current = false; setEnabled(false); cancel(); }
  function selectVoice(voice: VoiceName) {
    cancel();
    voiceRef.current = voice;
    setSelectedVoiceName(voice);
  }
  async function testVoice(language: VoiceLanguage) {
    if (!(await activate())) return;
    cancel();
    speak({ kind: "test" }, language);
  }
  useEffect(() => () => {
    enabledRef.current = false;
    cancel();
    void context.current?.close();
    context.current = null;
  }, []);
  return { enabled, selectedVoiceName, speechError, activate, deactivate, selectVoice, testVoice, speak, cancel, invalidate };
}

// Drive announcements from authoritative queue status, never from a simulated cycle.
function useAnnouncements(
  displayKey: string | undefined,
  data: DisplayResponse | null,
  announcer: ReturnType<typeof useSpeechAnnouncer>,
  connectionError: string | null,
  language: VoiceLanguage,
) {
  const latest = useRef(data);
  latest.current = data;
  const errorRef = useRef(connectionError);
  errorRef.current = connectionError;
  const previous = useRef(new Set<string>());
  const nextSignature = useRef("");
  const nextTimer = useRef<number | null>(null);
  const pauseState = useRef("");

  function clearTimer() {
    if (nextTimer.current !== null) window.clearTimeout(nextTimer.current);
    nextTimer.current = null;
  }
  function healthy() {
    const snapshot = latest.current;
    return !!snapshot && !errorRef.current && snapshot.display.voiceEnabled
      && snapshot.display.announcementEnabled;
  }
  function doctorReady(queue: DisplayQueue) {
    const doctor = queue.doctorId as BreakAwareDoctor | undefined;
    return doctor?.isOnline === true && doctor.isOnBreak !== true;
  }
  function status(queue: DisplayQueue) {
    return (queue as DisplayQueue & { status?: string }).status;
  }

  useEffect(() => {
    previous.current.clear();
    pauseState.current = "";
    nextSignature.current = "";
    return () => { clearTimer(); announcer.cancel(); };
  }, [displayKey, announcer.selectedVoiceName, language]);

  useEffect(() => {
    announcer.invalidate();
    if (!announcer.enabled) {
      previous.current.clear();
      pauseState.current = "";
      nextSignature.current = "";
      clearTimer();
      return;
    }
    if (!data) return;
    if (!healthy()) {
      announcer.cancel();
      clearTimer();
      previous.current.clear();
      nextSignature.current = "";
      pauseState.current = "";
      return;
    }
    const info = data as DisplayResponse & { doctorId?: string | null };
    const paused = getDoctorBreakInfo(data).isOnBreak;
    const state = paused ? "break" : data.doctorOnline !== true ? "offline" : "ready";
    const stateKey = `${state}:${info.doctorId ?? ""}`;
    if (stateKey !== pauseState.current) {
      pauseState.current = stateKey;
      if ((state === "break" || state === "offline") && info.doctorId) {
        const doctorId = info.doctorId;
        announcer.speak({ kind: state, doctorId }, language, 1, () => {
          const current = latest.current as (DisplayResponse & { doctorId?: string | null }) | null;
          return healthy() && current?.doctorId === doctorId && (state === "break"
            ? getDoctorBreakInfo(current).isOnBreak : current?.doctorOnline !== true);
        });
      }
    }
    // Per-doctor eligibility allows another doctor's queue to continue during a break.
    const called = (data.current || []).filter(q => status(q) === "CALLED" && doctorReady(q));
    const signature = new Set(called.map(q => `${q._id}:${q.tokenLabel}:${q.doctorId?.name ?? ""}`));
    for (const queue of called) {
      const key = `${queue._id}:${queue.tokenLabel}:${queue.doctorId?.name ?? ""}`;
      if (previous.current.has(key)) continue;
      const valid = () => healthy() && !!latest.current?.current?.some(q =>
        q._id === queue._id && q.tokenLabel === queue.tokenLabel && q.doctorId?.name === queue.doctorId?.name
        && status(q) === "CALLED" && doctorReady(q));
      announcer.speak({ kind: "call", queueId: queue._id }, language, 2, valid);
    }
    previous.current = signature;

    const candidate = data.next?.[0] as EmergencyAwareDisplayQueue | undefined;
    const isDue = (q: EmergencyAwareDisplayQueue) => {
      if (q.source !== "APPOINTMENT" && !q.tokenLabel.includes("-A")) return true;
      const time = q.scheduledStartTime ? new Date(q.scheduledStartTime).getTime() : NaN;
      return Number.isFinite(time) && time <= Date.now();
    };
    const nextValid = () => healthy() && !!candidate && doctorReady(candidate) && isDue(candidate)
      && latest.current?.next?.[0]?._id === candidate._id
      && doctorReady(latest.current.next[0])
      && !(latest.current.current || []).some(q => status(q) === "CALLED");
    const nextKey = candidate && nextValid() ? `${candidate._id}:${candidate.tokenLabel}` : "";
    if (nextKey !== nextSignature.current) {
      clearTimer();
      nextSignature.current = nextKey;
      if (candidate && nextKey) {
        nextTimer.current = window.setTimeout(() => {
          if (nextValid()) announcer.speak({ kind: "next", queueId: candidate._id }, language, 1, nextValid);
        }, 15_000);
      }
    }
  }, [data, connectionError, announcer.enabled, announcer.selectedVoiceName, language]);
}


// TV layout: large numbers first, with setup controls tucked away.
const DisplayBoard = () => {
  const { displayKey } = useParams<{ displayKey: string }>();
  const now = useClock();
  const { data, loading, error } = useDisplayPolling(displayKey);
  const announcer = useSpeechAnnouncer(displayKey);
  const [languageOverride, setLanguageOverride] = useState<VoiceLanguage | "">("");
  const announcementLanguage: VoiceLanguage = languageOverride || (data?.display.displayLanguage === "HI" ? "HI" : "EN");
  useAnnouncements(displayKey, data, announcer, error, announcementLanguage);

  // Rotate long lists without requiring a mouse or remote to scroll.
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
    const timer = window.setInterval(() => setPage(value => value + 1), 8000);
    return () => window.clearInterval(timer);
  }, [displayKey]);

  const [fullscreenError, setFullscreenError] = useState("");
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreenError("");
    } catch {
      setFullscreenError("Fullscreen is unavailable. Use your browser's fullscreen option.");
    }
  }

  if (loading || !data) {
    return <div className="tv-board tv-start"><TVStyles /><h1>{loading ? "Connecting to hospital display…" : "Display unavailable"}</h1><p role="status">{error || "Loading the latest queue information."}</p>{!loading && <p>Check the display link and connection. This screen retries automatically.</p>}</div>;
  }

  const { display, current = [], next = [], waiting = [], emergency = [] } = data as BreakAwareDisplayResponse;
  const doctorOnline = data.doctorOnline === true;
  const doctorBreak = getDoctorBreakInfo(data);
  const doctorOnBreak = doctorBreak.isOnBreak;
  const doctorStatusLabel = !doctorOnline
    ? "Offline"
    : doctorOnBreak
      ? "On break"
      : "Online";
  const doctorStatusMessage = error
    ? "Connection interrupted · showing last update"
    : !doctorOnline
      ? "Doctor is currently offline"
      : doctorOnBreak
        ? "Queue is paused until doctor resumes duty"
        : "Queue updates automatically";
  const currentPage = getPage(current, page, 2);
  const nextPage = getPage(next, page, 4);
  const waitingPage = getPage(waiting, page, 8);
  const emergencyPage = getPage(emergency, page, 6);
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const date = now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
  const hasMain = display.showCurrent || display.showNext;

  return <div className="tv-board">
    <TVStyles />

    {/* Hospital identity and clock stay visible in every queue state. */}
    <header className="tv-header">
      <div className="tv-brand">
        <div className="tv-logo">{display.logoUrl ? <img src={display.logoUrl} alt="" /> : display.hospitalName.charAt(0)}</div>
        <div><h1>{display.hospitalName}</h1><p>{display.heading}</p></div>
      </div>
      <div className="tv-clock"><strong>{time}</strong><span>{date}</span></div>
      <details className="tv-settings">
        <summary aria-label="Open display settings">Settings</summary>
        <div className="tv-settings-panel">
          <h2>Display settings</h2>
          <button type="button" onClick={toggleFullscreen}>Toggle fullscreen</button>
          {fullscreenError && <p role="alert">{fullscreenError}</p>}
          {display.voiceEnabled ? <>
            <label htmlFor="tv-language">Announcement language</label>
            <select id="tv-language" value={languageOverride} onChange={event => setLanguageOverride(event.target.value as VoiceLanguage | "")}>
              <option value="">Automatic ({display.displayLanguage === "HI" ? "हिन्दी" : "English"})</option>
              <option value="HI">हिन्दी</option><option value="EN">English</option>
            </select>
            {!announcer.enabled ? <button type="button" onClick={announcer.activate}>Enable voice announcements</button> : <button type="button" onClick={announcer.deactivate}>Mute announcements</button>}
            <label htmlFor="tv-voice">Announcement voice</label>
            <select id="tv-voice" value={announcer.selectedVoiceName} onChange={event => announcer.selectVoice(event.target.value as VoiceName)}>
              <option value="marin">Marin — preview this voice</option>
              <option value="cedar">Cedar — preview this voice</option>
            </select>
            <button type="button" onClick={() => announcer.testVoice(announcementLanguage)}>Test voice</button>
            <p>AI-generated voice · Hindi and English. Calls play twice. Next-token reminders ask patients to wait for their call.</p>
            {announcer.speechError && <p role="alert">{announcer.speechError}</p>}
          </> : <p>Voice is disabled in the hospital display configuration.</p>}
        </div>
      </details>
    </header>

    {/* A stale snapshot must never be labelled as a live queue. */}
    <div className="tv-info" data-warning={!!error || !doctorOnline || doctorOnBreak} data-break={doctorOnBreak}>
      <strong>{doctorLabel(data.doctorName)} · {doctorStatusLabel}</strong>
      <span role="status">{doctorStatusMessage}</span>
      {doctorOnBreak && doctorBreak.breakReason && <em>{doctorBreak.breakReason}</em>}
      {display.voiceEnabled && !announcer.enabled && <button type="button" onClick={announcer.activate}>Enable sound</button>}
    </div>

    {/* One or two columns depending on the hospital's display settings. */}
    {hasMain ? <main className="tv-main" data-split={display.showCurrent && display.showNext}>
      {display.showCurrent && <section className="tv-current" data-break={doctorOnBreak}>
        <div className="tv-panel-heading"><h2>{doctorOnBreak ? "Queue paused" : "Now attending · आपका टोकन"}</h2><PageLabel total={current.length} size={2} page={page} /></div>
        {doctorOnBreak ? (
          <DoctorBreakPanel
            doctorName={data.doctorName}
            breakStartedAt={doctorBreak.breakStartedAt}
            breakReason={doctorBreak.breakReason}
            current={currentPage}
          />
        ) : current.length ? <div className="tv-current-grid" data-multiple={currentPage.length > 1}>
          {currentPage.map(queue => {
            const emergency = isEmergencyQueue(queue);
            const typeLabel = tokenTypeLabel(queue);
            const typeClass = tokenTypeClass(queue);

            return (
              <article
                className="tv-current-token"
                data-emergency={emergency}
                data-source={typeClass}
                key={queue._id}
              >
                <span className="tv-token-type">
                  {typeLabel}
                </span>

                {emergency && (
                  <span className="tv-emergency-badge">
                    Emergency patient
                  </span>
                )}

                <strong>{queue.tokenLabel}</strong>
                <h3>{queue.departmentId?.name || "OPD"}</h3>
                {queue.doctorId?.name && <p>{doctorLabel(queue.doctorId.name)}</p>}

                {getQueueSource(queue) === "APPOINTMENT" && (queue as EmergencyAwareDisplayQueue).scheduledStartTime && (
                  <small className="tv-appointment-time">
                    Appointment {(queue as EmergencyAwareDisplayQueue).scheduledStartTime}
                  </small>
                )}

                {emergency && (
                  <em>Please attend immediately</em>
                )}
              </article>
            );
          })}
        </div> : <div className="tv-empty"><strong>{doctorOnline ? "Please wait for your token" : "Doctor is currently offline"}</strong><p>{doctorOnline ? "The next token will appear here." : "Please contact reception for an update."}</p></div>}
        <p className="tv-instruction">{error ? "Please confirm the current token with reception." : !doctorOnline ? "Please wait for the doctor to become available." : doctorOnBreak ? "Doctor is on break. Queue will resume after doctor returns." : "When your token appears, proceed to the doctor’s room shown."}</p>
      </section>}

      {display.showNext && <section className="tv-next">
        <div className="tv-panel-heading"><h2>Up next · तैयार रहें</h2><PageLabel total={next.length} size={4} page={page} /></div>
        {next.length ? <ol className="tv-next-list">
          {nextPage.map(queue => {
            const emergency = isEmergencyQueue(queue);
            const typeLabel = tokenTypeLabel(queue);
            const typeClass = tokenTypeClass(queue);

            return (
              <li data-emergency={emergency} data-source={typeClass} key={queue._id}>
                <strong>{queue.tokenLabel}</strong>
                <span>{typeLabel} · {queue.departmentId?.name || "OPD"}</span>
              </li>
            );
          })}
        </ol> : <div className="tv-empty"><p>No upcoming tokens</p></div>}
      </section>}
    </main> : <main className="tv-empty tv-idle"><h2>{display.heading || "Hospital queue"}</h2><p>Please listen for announcements or contact reception.</p></main>}

    {/* Waiting and emergency visibility each follow their own setting. */}
    {display.showWaiting && <section className="tv-waiting">
      <div className="tv-waiting-title"><h2>Waiting <span>{waiting.length}</span></h2><PageLabel total={waiting.length} size={8} page={page} /></div>
      <div className="tv-waiting-tokens">
        {waitingPage.length ? waitingPage.map(queue => (
          <strong data-emergency={isEmergencyQueue(queue)} data-source={tokenTypeClass(queue)} key={queue._id} title={tokenTypeLabel(queue)}>
            {queue.tokenLabel}
          </strong>
        )) : <p>{doctorOnBreak ? "Queue paused during doctor break" : "No patients waiting"}</p>}
      </div>
    </section>}
    {display.showEmergency && emergency.length > 0 && <section className="tv-emergency">
      <strong>Emergency priority · {emergency.length}</strong>
      <span>{emergencyPage.map(queue => queue.tokenLabel).join(" · ")}</span>
      <PageLabel total={emergency.length} size={6} page={page} />
    </section>}

    {/* Static guidance is easier to read from a distance than a moving ticker. */}
    <footer className="tv-footer"><p>{doctorOnBreak ? "Doctor is on break. Please wait for the next announcement." : "Please keep your token ready. Emergency cases may be prioritised."}</p><span>NextSynq Health · AI voice announcements</span></footer>
  </div>;
};

export default DisplayBoard;

function doctorLabel(name?: string | null) {
  if (!name) return "Doctor";
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

// Small paging helpers keep all tokens accessible on an unattended TV.
function getPage<T>(items: T[], page: number, size: number): T[] {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const start = (page % pages) * size;
  return items.slice(start, start + size);
}

function PageLabel({ total, size, page }: { total: number; size: number; page: number }) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;
  return <span className="tv-page-label">{page % pages + 1} / {pages}</span>;
}

// All styles are local to this file; no Tailwind or extra stylesheet is needed.
function TVStyles() {
  return <style>{`
    .tv-board { min-height: 100dvh; display: flex; flex-direction: column; background: #f5f6ef; color: #173d39; font-family: "Inter", "Segoe UI", sans-serif; font-variant-numeric: tabular-nums; padding: clamp(14px, 2vw, 38px); gap: clamp(10px, 1.2vh, 18px); }
    .tv-board *, .tv-board *::before, .tv-board *::after { box-sizing: border-box; }
    .tv-board h1, .tv-board h2, .tv-board h3, .tv-board p { margin: 0; }
    .tv-header { display: flex; align-items: center; gap: 24px; }
    .tv-brand { display: flex; align-items: center; gap: 18px; flex: 1; min-width: 0; }
    .tv-logo { display: grid; place-items: center; width: clamp(48px, 4.5vw, 80px); height: clamp(48px, 4.5vw, 80px); border-radius: 14px; background: white; border: 1px solid #d4dfce; font-size: 30px; font-weight: 700; flex-shrink: 0; padding: 6px; }
    .tv-logo img { width: 100%; height: 100%; object-fit: contain; }
    .tv-brand h1 { font-size: clamp(22px, 2vw, 40px); line-height: 1.25; font-weight: 650; overflow-wrap: anywhere; }
    .tv-brand p { margin-top: 5px; font-size: clamp(16px, 1.25vw, 26px); color: #536650; overflow-wrap: anywhere; }
    .tv-clock { text-align: right; flex-shrink: 0; }
    .tv-clock strong { display: block; font-size: clamp(25px, 2.3vw, 46px); line-height: 1.2; }
    .tv-clock span { display: block; font-size: clamp(14px, 1.1vw, 22px); color: #536650; margin-top: 5px; }
    .tv-info { display: flex; align-items: center; justify-content: space-between; gap: 16px; background: #e6edde; border-radius: 10px; padding: 10px 18px; font-size: clamp(16px, 1.2vw, 24px); line-height: 1.5; }
    .tv-info strong { font-weight: 600; }
    .tv-info[data-warning="true"] { background: #faedcf; color: #725018; }
    .tv-main { display: grid; grid-template-columns: minmax(0, 1fr); gap: clamp(14px, 1.5vw, 28px); flex: 1; min-height: 340px; }
    .tv-main[data-split="true"] { grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr); }
    .tv-current, .tv-next { display: flex; flex-direction: column; min-width: 0; border-radius: 18px; padding: clamp(20px, 2vw, 36px); }
    .tv-current { background: #173d39; color: #fff; }
    .tv-next { background: white; border: 1px solid #d6e0cf; }
    .tv-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .tv-panel-heading h2 { font-size: clamp(23px, 2vw, 40px); font-weight: 600; }
    .tv-page-label { font-size: clamp(14px, 1vw, 20px); white-space: nowrap; font-weight: 500; }
    .tv-current-grid { display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; flex: 1; gap: 16px; padding: 16px 0; }
    .tv-current-grid[data-multiple="true"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tv-current-token { text-align: center; min-width: 0; border-radius: 18px; padding: clamp(12px, 1.3vw, 24px); }
    .tv-current-token[data-emergency="true"] { background: #fff1f2; color: #991b1b; border: 5px solid #ef4444; box-shadow: 0 0 0 8px #fecaca55; animation: emergency-pulse 1.15s ease-in-out infinite; }
    .tv-emergency-badge { display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px; border-radius: 999px; background: #dc2626; color: #fff; padding: 10px 20px; font-size: clamp(16px, 1.4vw, 28px); font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
    .tv-current-token > strong { display: block; font-size: clamp(80px, 10vw, 210px); letter-spacing: -.04em; line-height: 1.1; font-weight: 700; overflow-wrap: anywhere; }
    .tv-current-token[data-emergency="true"] > strong { color: #dc2626; text-shadow: 0 8px 18px #fecaca; }
    .tv-current-grid[data-multiple="true"] .tv-current-token > strong { font-size: clamp(50px, 5.7vw, 116px); }
    .tv-current-token h3 { font-size: clamp(24px, 2.1vw, 42px); margin-top: 12px; line-height: 1.3; font-weight: 500; overflow-wrap: anywhere; }
    .tv-current-token p { margin-top: 7px; font-size: clamp(18px, 1.4vw, 28px); color: #d1e2d7; overflow-wrap: anywhere; }
    .tv-current-token[data-emergency="true"] p { color: #7f1d1d; }
    .tv-current-token em { display: inline-block; margin-top: 16px; border-radius: 12px; background: #fee2e2; color: #991b1b; padding: 10px 16px; font-size: clamp(17px, 1.4vw, 30px); font-style: normal; font-weight: 800; }
    .tv-instruction { text-align: center; border-top: 1px solid #ffffff26; padding-top: 14px; font-size: clamp(16px, 1.25vw, 26px); color: #d1e2d7; line-height: 1.5; }
    .tv-next-list { list-style: none; padding: 0; margin: 12px 0 0; display: grid; flex: 1; align-content: start; }
    .tv-next-list li { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: clamp(12px, 1.6vh, 22px) 0; border-bottom: 1px solid #e0e7d9; min-width: 0; }
    .tv-next-list li[data-emergency="true"] { margin: 8px 0; border: 2px solid #fecaca; border-radius: 12px; background: #fff1f2; padding-inline: 12px; color: #991b1b; }
    .tv-next-list li:last-child { border-bottom: 0; }
    .tv-next-list strong { font-size: clamp(30px, 3vw, 62px); line-height: 1.15; overflow-wrap: anywhere; min-width: 0; }
    .tv-next-list li > span { max-width: 48%; font-size: clamp(17px, 1.4vw, 28px); line-height: 1.4; color: #536650; text-align: right; overflow-wrap: anywhere; }
    .tv-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; padding: 28px 12px; }
    .tv-empty strong, .tv-empty h2 { font-size: clamp(30px, 3vw, 58px); font-weight: 600; }
    .tv-empty p { font-size: clamp(20px, 1.6vw, 32px); line-height: 1.6; }
    .tv-waiting { display: flex; align-items: center; gap: 24px; padding: 16px 22px; background: #e8efdf; border: 1px solid #d6e0ca; border-radius: 14px; }
    .tv-waiting-title { flex-shrink: 0; }
    .tv-waiting h2 { font-size: clamp(20px, 1.5vw, 30px); font-weight: 600; }
    .tv-waiting h2 span { margin-left: 6px; }
    .tv-waiting-tokens { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
    .tv-waiting-tokens strong { background: #fff; padding: 8px 14px; border-radius: 8px; font-size: clamp(22px, 1.8vw, 36px); line-height: 1.2; overflow-wrap: anywhere; }
    .tv-waiting-tokens strong[data-emergency="true"] { background: #dc2626; color: white; box-shadow: 0 0 0 3px #fecaca; }
    .tv-waiting-tokens p { font-size: clamp(18px, 1.3vw, 26px); }
    .tv-emergency { display: flex; align-items: center; justify-content: space-between; gap: 18px; border: 1px solid #e6bbaf; background: #f9e6df; color: #8b3426; padding: 12px 22px; border-radius: 12px; font-size: clamp(18px, 1.5vw, 30px); line-height: 1.5; }
    .tv-emergency > span { overflow-wrap: anywhere; }
    .tv-info em { font-style: normal; font-weight: 700; }
    .tv-info[data-break="true"] { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
    .tv-current[data-break="true"] { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
    .tv-break-panel { flex: 1; display: grid; place-items: center; align-content: center; text-align: center; gap: 18px; padding: clamp(28px, 4vw, 70px); }
    .tv-break-pill { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #ea580c; color: #fff; padding: 12px 22px; font-size: clamp(17px, 1.4vw, 28px); font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    .tv-break-panel h2 { font-size: clamp(40px, 5vw, 104px); line-height: 1.12; font-weight: 800; }
    .tv-break-panel p { max-width: 900px; font-size: clamp(22px, 2vw, 42px); line-height: 1.45; }
    .tv-paused-token { display: grid; gap: 8px; border-radius: 18px; background: #fff; border: 2px dashed #fdba74; padding: 18px 28px; }
    .tv-paused-token span { font-size: clamp(16px, 1.25vw, 24px); font-weight: 700; color: #9a3412; }
    .tv-paused-token strong { font-size: clamp(54px, 6vw, 120px); line-height: 1; color: #173d39; }
    .tv-break-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; font-size: clamp(16px, 1.25vw, 24px); }
    .tv-break-meta span { border-radius: 999px; background: #ffedd5; color: #9a3412; padding: 8px 14px; }
    .tv-token-type { display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px; border-radius: 999px; background: #d1e2d7; color: #173d39; padding: 8px 16px; font-size: clamp(14px, 1vw, 20px); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
    .tv-current-token[data-source="appointment"] .tv-token-type, .tv-next-list li[data-source="appointment"] { background: #eff6ff; color: #1d4ed8; }
    .tv-current-token[data-source="emergency"] .tv-token-type { background: #dc2626; color: #fff; }
    .tv-appointment-time { display: inline-block; margin-top: 12px; border-radius: 10px; background: #dbeafe; color: #1d4ed8; padding: 8px 12px; font-size: clamp(15px, 1.05vw, 22px); font-weight: 800; }
    .tv-waiting-tokens strong[data-source="appointment"] { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    @keyframes emergency-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 8px #fecaca55; }
      50% { transform: scale(1.015); box-shadow: 0 0 0 14px #fecaca88; }
    }
    .tv-footer { display: flex; justify-content: space-between; align-items: center; gap: 24px; font-size: clamp(16px, 1.2vw, 24px); color: #536650; line-height: 1.5; }
    .tv-footer > span { flex-shrink: 0; }
    .tv-start { align-items: center; justify-content: center; text-align: center; }
    .tv-start h1 { font-size: clamp(28px, 3vw, 60px); }
    .tv-start p { font-size: clamp(20px, 1.7vw, 34px); }
    /* Setup controls are kept out of the queue panels. */
    .tv-settings { position: relative; flex-shrink: 0; }
    .tv-settings summary, .tv-board button { min-height: 44px; border: 1px solid #cad7c2; border-radius: 8px; background: white; color: #173d39; padding: 10px 14px; font: inherit; font-size: 14px; cursor: pointer; }
    .tv-settings-panel { position: absolute; top: calc(100% + 12px); right: 0; z-index: 10; width: min(360px, calc(100vw - 32px)); max-height: 75dvh; overflow-y: auto; background: white; border: 1px solid #cad7c2; padding: 20px; border-radius: 12px; box-shadow: 0 12px 40px #173d3930; display: grid; gap: 14px; font-size: 14px; line-height: 1.6; }
    .tv-settings-panel h2 { font-size: 20px; }
    .tv-settings-panel label { font-weight: 600; }
    .tv-settings-panel select { width: 100%; min-height: 44px; border: 1px solid #cad7c2; padding: 8px; border-radius: 8px; font: inherit; }
    .tv-board button:focus-visible, .tv-settings summary:focus-visible, .tv-settings select:focus-visible { outline: 3px solid #35947d; outline-offset: 3px; }
    /* Short landscape TVs keep the same hierarchy with tighter spacing. */
    @media (min-width: 900px) and (max-height: 800px) {
      .tv-board { padding: 16px 22px; gap: 10px; }
      .tv-main { min-height: 280px; }
      .tv-current, .tv-next { padding: 18px 22px; }
      .tv-current-token > strong { font-size: clamp(76px, 9vw, 150px); }
      .tv-next-list li { padding: 10px 0; }
      .tv-waiting { padding: 10px 18px; }
      .tv-waiting-tokens strong { padding: 6px 10px; }
    }
    /* A readable stacked preview on tablets and phones. */
    @media (max-width: 899px) {
      .tv-header { flex-wrap: wrap; gap: 12px; }
      .tv-brand { flex-basis: 65%; }
      .tv-clock { margin-left: auto; }
      .tv-info, .tv-waiting, .tv-emergency { flex-wrap: wrap; }
      .tv-main[data-split="true"] { grid-template-columns: minmax(0, 1fr); }
      .tv-current { min-height: 350px; }
      .tv-footer { flex-wrap: wrap; gap: 8px; }
    }

    /* Quiet, high-contrast TV layout: large token, destination, then next tokens. */
    .tv-board { background:#f8f9f3; }
    .tv-current,.tv-next { border-radius:24px; }
    .tv-current { background:#123f39; }
    .tv-panel-heading h2 { font-size:clamp(22px,1.8vw,36px); }
    .tv-current-token > strong { font-size:clamp(80px,11vw,210px); letter-spacing:-.035em; }
    .tv-current-token h3 { color:inherit; font-weight:650; }
    .tv-current-token p { font-size:clamp(22px,1.9vw,36px); }
    .tv-next-list li { display:grid; grid-template-columns:1fr; gap:5px; padding:18px 0; }
    .tv-next-list li > span { max-width:100%; text-align:left; font-size:clamp(16px,1.15vw,23px); }
    .tv-next-list strong { font-size:clamp(32px,3.2vw,62px); }
    .tv-token-type { font-size:clamp(12px,.85vw,17px); padding:6px 12px; letter-spacing:.02em; }
    .tv-current-token[data-emergency="true"] { animation:none; box-shadow:none; border-width:3px; }
    .tv-current[data-break="true"] .tv-instruction { color:#854817; border-color:#e8caa4; }
    .tv-break-panel { padding:24px; gap:14px; }
    .tv-break-panel h2 { font-size:clamp(32px,3.5vw,70px); }
    .tv-break-panel p { font-size:clamp(20px,1.6vw,30px); }
    .tv-info { flex-wrap:wrap; }
    @media(prefers-reduced-motion:reduce) { .tv-board * { animation:none!important; } }
  `}</style>;
}
