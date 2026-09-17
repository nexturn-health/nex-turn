import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getDisplayBoard,
  type DisplayLanguage,
  type DisplayQueue,
  type DisplayResponse,
} from "../../services/display.api";

const LANGUAGE_NAMES: Record<DisplayLanguage, string> = {
  EN: "English",
  HI: "हिन्दी",
  BN: "বাংলা",
  MR: "मराठी",
  TA: "தமிழ்",
  TE: "తెలుగు",
  KN: "ಕನ್ನಡ",
  GU: "ગુજરાતી",
  PA: "ਪੰਜਾਬੀ",
  ML: "മലയാളം",
};

const VOICE_LOCALES: Record<DisplayLanguage, string> = {
  EN: "en-IN",
  HI: "hi-IN",
  BN: "bn-IN",
  MR: "mr-IN",
  TA: "ta-IN",
  TE: "te-IN",
  KN: "kn-IN",
  GU: "gu-IN",
  PA: "pa-IN",
  ML: "ml-IN",
};

const HINDI_LETTERS: Record<string, string> = {
  A: "ए", B: "बी", C: "सी", D: "डी", E: "ई", F: "एफ", G: "जी", H: "एच",
  I: "आई", J: "जे", K: "के", L: "एल", M: "एम", N: "एन", O: "ओ", P: "पी",
  Q: "क्यू", R: "आर", S: "एस", T: "टी", U: "यू", V: "वी", W: "डब्ल्यू",
  X: "एक्स", Y: "वाई", Z: "ज़ेड",
};

const HINDI_DIGITS: Record<string, string> = {
  "0": "शून्य", "1": "एक", "2": "दो", "3": "तीन", "4": "चार",
  "5": "पाँच", "6": "छह", "7": "सात", "8": "आठ", "9": "नौ",
};

/** Spells a token out phonetically for Hindi TTS (e.g. "A1" -> "ए एक"). */
const toHindiSpeech = (token: string): string =>
  token
    .toUpperCase()
    .split("")
    .map((ch) => HINDI_LETTERS[ch] ?? HINDI_DIGITS[ch] ?? (ch === "-" ? "" : ch))
    .filter(Boolean)
    .join(" ");

const ANNOUNCEMENT_TEXT: Record<DisplayLanguage, (token: string, dept: string) => string> = {
  EN: (t, d) => `Token ${t}, please proceed to ${d}.`,
  HI: (t, d) => `कृपया ध्यान दें। टोकन ${toHindiSpeech(t)}, ${d} में आगे आएं।`,
  BN: (t, d) => `টোকেন ${t}, ${d} এর জন্য অনুগ্রহ করে এগিয়ে আসুন।`,
  MR: (t, d) => `टोकन ${t}, ${d} साठी कृपया पुढे या.`,
  TA: (t, d) => `டோக்கன் ${t}, ${d} தயவுசெய்து முன் வாருங்கள்.`,
  TE: (t, d) => `టోకెన్ ${t}, ${d} దయచేసి ముందుకు రండి.`,
  KN: (t, d) => `ಟೋಕನ್ ${t}, ${d} ದಯವಿಟ್ಟು ಮುಂದೆ ಬನ್ನಿ.`,
  GU: (t, d) => `ટોકન ${t}, ${d} માટે કૃપા કરીને આગળ આવો.`,
  PA: (t, d) => `ਟੋਕਨ ${t}, ${d} ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਅੱਗੇ ਆਓ.`,
  ML: (t, d) => `ടോക്കൺ ${t}, ${d} ദയവായി മുന്നോട്ട് വരിക.`,
};



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

const DOCTOR_OFFLINE_TEXT: Record<DisplayLanguage, (name: string) => string> = {
  EN: (n) => `Doctor ${n} is currently offline. Please wait for the doctor to come online.`,
  HI: (n) => `डॉक्टर ${n} अभी ऑफलाइन हैं। कृपया डॉक्टर के ऑनलाइन आने तक प्रतीक्षा करें।`,
  BN: (n) => `ডাক্তার ${n} এখন অফলাইনে আছেন। অনুগ্রহ করে অপেক্ষা করুন।`,
  MR: (n) => `डॉक्टर ${n} सध्या ऑफलाइन आहेत. कृपया प्रतीक्षा करा.`,
  TA: (n) => `டாக்டர் ${n} தற்போது ஆஃப்லைனில் உள்ளார். தயவுசெய்து காத்திருக்கவும்.`,
  TE: (n) => `డాక్టర్ ${n} ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉన్నారు. దయచేసి వేచి ఉండండి.`,
  KN: (n) => `ಡಾಕ್ಟರ್ ${n} ಪ್ರಸ್ತುತ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ಕಾಯಿರಿ.`,
  GU: (n) => `ડૉક્ટર ${n} હાલમાં ઑફલાઇન છે. કૃપા કરીને રાહ જુઓ.`,
  PA: (n) => `ਡਾਕਟਰ ${n} ਇਸ ਸਮੇਂ ਔਫਲਾਈਨ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ।`,
  ML: (n) => `ഡോക്ടർ ${n} നിലവിൽ ഓഫ്‌ലൈനിലാണ്. ദയവായി കാത്തിരിക്കുക.`,
};



const DOCTOR_BREAK_TEXT: Record<DisplayLanguage, (name: string) => string> = {
  EN: (n) => `Doctor ${n} is on break. Queue is paused. Please wait for the next announcement.`,
  HI: (n) => `डॉक्टर ${n} ब्रेक पर हैं। कतार अभी रुकी हुई है। कृपया अगले अनाउंसमेंट की प्रतीक्षा करें।`,
  BN: (n) => `ডাক্তার ${n} বিরতিতে আছেন। অনুগ্রহ করে পরবর্তী ঘোষণার জন্য অপেক্ষা করুন।`,
  MR: (n) => `डॉक्टर ${n} ब्रेकवर आहेत. कृपया पुढील घोषणेची प्रतीक्षा करा.`,
  TA: (n) => `டாக்டர் ${n} இடைவேளையில் உள்ளார். அடுத்த அறிவிப்புக்காக காத்திருக்கவும்.`,
  TE: (n) => `డాక్టర్ ${n} విరామంలో ఉన్నారు. దయచేసి తదుపరి ప్రకటన కోసం వేచి ఉండండి.`,
  KN: (n) => `ಡಾಕ್ಟರ್ ${n} ವಿರಾಮದಲ್ಲಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ಮುಂದಿನ ಘೋಷಣೆಗೆ ಕಾಯಿರಿ.`,
  GU: (n) => `ડૉક્ટર ${n} બ્રેક પર છે. કૃપા કરીને આગળની જાહેરાતની રાહ જુઓ.`,
  PA: (n) => `ਡਾਕਟਰ ${n} ਬ੍ਰੇਕ 'ਤੇ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਅਗਲੀ ਘੋਸ਼ਣਾ ਦੀ ਉਡੀਕ ਕਰੋ।`,
  ML: (n) => `ഡോക്ടർ ${n} ഇടവേളയിലാണ്. ദയവായി അടുത്ത പ്രഖ്യാപനം കാത്തിരിക്കുക.`,
};



const POLL_INTERVAL_MS = 1_000;
// Announcements repeat twice with a short, natural pause.
const SPEECH_REPEAT_DELAY_MS = 1500;
const DEFAULT_VOICE_LOCALE = "en-IN";

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

// Hook: keeps the browser's TTS voice list warm (it loads async)

function useSpeechVoices() {
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    const refresh = () => {
      const voices = synth.getVoices();
      voicesRef.current = voices;
      if (voices.length > 0) setReady(true);
    };

    refresh();
    synth.addEventListener("voiceschanged", refresh);

    return () => {
      synth.removeEventListener("voiceschanged", refresh);
      synth.cancel();
    };
  }, []);

  return { voicesRef, ready };
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

// Hook: text-to-speech announcer

type SpeechJob = { text: string; locale: DisplayLanguage; repeats: number; valid: () => boolean };

// One speech queue prevents announcements from cutting each other off.
function useSpeechAnnouncer(voicesRef: { current: SpeechSynthesisVoice[] }) {
  const [enabled, setEnabled] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [speechError, setSpeechError] = useState("");
  const enabledRef = useRef(false);
  const selectedRef = useRef("");
  const jobs = useRef<SpeechJob[]>([]);
  const running = useRef(false);
  const generation = useRef(0);
  const release = useRef<(() => void) | null>(null);
  const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  function cancel() {
    generation.current += 1;
    jobs.current = [];
    running.current = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    release.current?.();
    release.current = null;
    activeUtterance.current = null;
  }

  function findVoice(locale: DisplayLanguage) {
    const code = VOICE_LOCALES[locale] || DEFAULT_VOICE_LOCALE;
    const prefix = code.split("-")[0].toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    voicesRef.current = voices;
    // Never use an English voice to read Hindi just because it was selected earlier.
    const compatible = voices.filter(v => v.lang.toLowerCase().split(/[-_]/)[0] === prefix);
    return compatible.find(v => v.name === selectedRef.current)
      || compatible.find(v => /natural|neural|google/i.test(v.name))
      || compatible.find(v => v.lang.toLowerCase() === code.toLowerCase())
      || compatible[0];
  }

  async function drain() {
    if (running.current) return;
    running.current = true;
    const version = generation.current;
    while (jobs.current.length && version === generation.current) {
      const job = jobs.current.shift()!;
      for (let count = 0; count < job.repeats; count += 1) {
        if (!enabledRef.current || version !== generation.current || !job.valid()) break;
        const voice = findVoice(job.locale);
        if (!voice) {
          setSpeechError(`Install a ${LANGUAGE_NAMES[job.locale]} voice on this device, then try again.`);
          break;
        }
        await new Promise<void>(resolve => {
          const utterance = new SpeechSynthesisUtterance(job.text);
          activeUtterance.current = utterance;
          utterance.voice = voice;
          utterance.lang = voice.lang;
          utterance.rate = job.locale === "HI" ? 0.9 : 0.94;
          utterance.pitch = 1;
          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            window.clearTimeout(watchdog);
            resolve();
          };
          const watchdog = window.setTimeout(() => {
            if (version === generation.current) window.speechSynthesis.cancel();
            finish();
          }, 45000);
          release.current = finish;
          utterance.onend = finish;
          utterance.onerror = event => {
            if (event.error !== "canceled" && event.error !== "interrupted") setSpeechError("Voice could not play. Check the device sound and test the voice.");
            finish();
          };
          try { window.speechSynthesis.speak(utterance); } catch { finish(); }
        });
        if (version !== generation.current) return;
        if (count + 1 < job.repeats) await new Promise<void>(resolve => {
          const timer = window.setTimeout(resolve, SPEECH_REPEAT_DELAY_MS);
          release.current = () => { window.clearTimeout(timer); resolve(); };
        });
      }
    }
    if (version === generation.current) running.current = false;
  }

  function speak(text: string, locale: DisplayLanguage, repeatCount = 1, valid = () => true) {
    if (!enabledRef.current || !text.trim()) return;
    jobs.current.push({ text, locale, repeats: Math.min(2, Math.max(1, repeatCount)), valid });
    void drain();
  }
  function activate() {
    if (!("speechSynthesis" in window)) { setSpeechError("This browser does not support voice announcements."); return; }
    enabledRef.current = true;
    setEnabled(true);
    setSpeechError("");
    window.speechSynthesis.resume();
  }
  function deactivate() { enabledRef.current = false; setEnabled(false); cancel(); }
  function selectVoice(name: string) { selectedRef.current = name; setSelectedVoiceName(name); }
  function testVoice(locale: DisplayLanguage) {
    activate();
    if (!("speechSynthesis" in window)) return;
    cancel();
    speak(locale === "HI" ? "टोकन नंबर एच शून्य एक दो। कृपया डॉक्टर के कमरे में जाएँ।" : "Token number H zero one two. Please proceed to the doctor's room.", locale);
  }
  useEffect(() => () => { enabledRef.current = false; cancel(); }, []);
  return { enabled, speak, cancel, activate, deactivate, speechError, voices: voicesRef.current, selectedVoiceName, selectVoice, testVoice };
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

// Hook: derives voice announcements from display state changes

// Queue status is authoritative: never advance or call a patient with a timer.
function useAnnouncements(
  displayKey: string | undefined,
  data: DisplayResponse | null,
  announcer: ReturnType<typeof useSpeechAnnouncer>,
  connectionError: string | null,
  language: DisplayLanguage,
) {
  const latest = useRef(data);
  latest.current = data;
  const previous = useRef(new Map<string, string>());
  const pauseState = useRef("");
  const nextTimer = useRef<number | null>(null);
  const nextSignature = useRef("");
  const errorRef = useRef(connectionError);
  errorRef.current = connectionError;

  useEffect(() => {
    previous.current.clear();
    pauseState.current = "";
    nextSignature.current = "";
    return () => {
      if (nextTimer.current !== null) window.clearTimeout(nextTimer.current);
      announcer.cancel();
    };
  }, [displayKey, announcer.enabled, language]);

  useEffect(() => {
    if (!data || !announcer.enabled) return;
    const canAnnounce = data.display.voiceEnabled && data.display.announcementEnabled;
    const paused = getDoctorBreakInfo(data).isOnBreak;
    const state = !canAnnounce ? "disabled" : connectionError ? "stale" : paused ? "break" : data.doctorOnline !== true ? "offline" : "ready";
    if (state !== pauseState.current) {
      announcer.cancel();
      if (nextTimer.current !== null) window.clearTimeout(nextTimer.current);
      nextSignature.current = "";
      if (state === "break") announcer.speak(DOCTOR_BREAK_TEXT[language](data.doctorName || ""), language);
      else if (state === "offline") announcer.speak(DOCTOR_OFFLINE_TEXT[language](data.doctorName || ""), language);
      pauseState.current = state;
    }
    if (state !== "ready") { previous.current.clear(); return; }

    const current = data.current || [];
    const statusOf = (queue: DisplayQueue) => String((queue as DisplayQueue & { status?: string }).status || "CURRENT");
    const snapshot = new Map(current.map(queue => [queue._id, statusOf(queue)]));
    const changed = [...snapshot].some(([id, status]) => previous.current.get(id) !== status)
      || [...previous.current.keys()].some(id => !snapshot.has(id));
    if (changed) announcer.cancel();
    for (const queue of current) {
      const status = statusOf(queue);
      // SERVING means the patient has already entered. Do not call them again.
      if (status === "SERVING" || (status !== "CALLED" && status !== "CURRENT")) continue;
      if (previous.current.get(queue._id) === status) continue;
      const rawName = queue.doctorId?.name || data.doctorName || "";
      const name = rawName.replace(/^dr\.?\s*/i, "");
      const token = language === "HI" ? toHindiSpeech(queue.tokenLabel) : queue.tokenLabel.replace(/-/g, " ").split("").join(" ");
      const text = language === "HI"
        ? `टोकन नंबर ${token}। कृपया ${name ? `डॉक्टर ${name} के` : "डॉक्टर के"} कमरे में जाएँ।`
        : language === "EN"
          ? `Token number ${token}. Please proceed to ${name ? `Doctor ${name}'s` : "the doctor's"} room.`
          : ANNOUNCEMENT_TEXT[language](queue.tokenLabel, queue.departmentId?.name || "OPD");
      announcer.speak(text, language, 2, () => !errorRef.current && !!latest.current?.current?.some(q => q._id === queue._id && statusOf(q) === status) && !getDoctorBreakInfo(latest.current).isOnBreak);
    }
    previous.current = snapshot;

    // After 15 seconds of a stable serving/empty state, tell the next patient
    // to be ready. This is not a call to enter the room. Announce once per change.
    const candidate = data.next?.[0];
    const hasCalled = current.some(q => statusOf(q) === "CALLED" || statusOf(q) === "CURRENT");
    const signature = !hasCalled && candidate ? `${candidate._id}:${[...snapshot.keys()].join(",")}` : "";
    if (signature !== nextSignature.current) {
      if (nextTimer.current !== null) window.clearTimeout(nextTimer.current);
      nextSignature.current = signature;
      if (candidate && signature && (language === "HI" || language === "EN")) {
        nextTimer.current = window.setTimeout(() => {
          const valid = () => !errorRef.current && latest.current?.next?.[0]?._id === candidate._id
            && !getDoctorBreakInfo(latest.current).isOnBreak && latest.current?.doctorOnline === true
            && !(latest.current.current || []).some(q => statusOf(q) === "CALLED" || statusOf(q) === "CURRENT");
          if (!valid()) return;
          announcer.speak(language === "HI"
            ? `अगला नंबर टोकन ${toHindiSpeech(candidate.tokenLabel)} का है। कृपया तैयार रहें। बुलाए जाने पर ही डॉक्टर के कमरे में जाएँ।`
            : `Up next, token number ${candidate.tokenLabel.replace(/-/g, " ")}. Please be ready. Wait for your call before entering the doctor's room.`, language, 1, valid);
        }, 15000);
      }
    }
  }, [data, connectionError, announcer.enabled, language]);
}

// TV layout: large numbers first, with setup controls tucked away.
const DisplayBoard = () => {
  const { displayKey } = useParams<{ displayKey: string }>();
  const now = useClock();
  const { voicesRef } = useSpeechVoices();
  const { data, loading, error } = useDisplayPolling(displayKey);
  const announcer = useSpeechAnnouncer(voicesRef);
  const [languageOverride, setLanguageOverride] = useState<DisplayLanguage | "">("");
  const announcementLanguage = languageOverride || data?.display.displayLanguage || "EN";
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
            <select id="tv-language" value={languageOverride} onChange={event => setLanguageOverride(event.target.value as DisplayLanguage | "")}>
              <option value="">Hospital setting ({LANGUAGE_NAMES[display.displayLanguage]})</option>
              <option value="HI">हिन्दी</option><option value="EN">English</option>
            </select>
            {!announcer.enabled ? <button type="button" onClick={announcer.activate}>Enable voice announcements</button> : <button type="button" onClick={announcer.deactivate}>Mute announcements</button>}
            <label htmlFor="tv-voice">Announcement voice</label>
            <select id="tv-voice" value={announcer.selectedVoiceName} onChange={event => announcer.selectVoice(event.target.value)}>
              <option value="">Automatic — match language</option>
              {[...announcer.voices].sort((a, b) => a.name.localeCompare(b.name)).map(voice => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}
            </select>
            <button type="button" onClick={() => announcer.testVoice(announcementLanguage)}>Test voice</button>
            <p>Calls play twice. Next-token reminders play after 15 seconds. Voice quality depends on installed device voices.</p>
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
    <footer className="tv-footer"><p>{doctorOnBreak ? "Doctor is on break. Please wait for the next announcement." : "Please keep your token ready. Emergency cases may be prioritised."}</p><span>NextSynq Health</span></footer>
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
