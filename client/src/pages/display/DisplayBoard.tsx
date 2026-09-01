import { useEffect, useMemo, useRef, useState } from "react";
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
  HI: (t, d) => `टोकन ${toHindiSpeech(t)}, ${d} के लिए कृपया आगे आएं।`,
  BN: (t, d) => `টোকেন ${t}, ${d} এর জন্য অনুগ্রহ করে এগিয়ে আসুন।`,
  MR: (t, d) => `टोकन ${t}, ${d} साठी कृपया पुढे या.`,
  TA: (t, d) => `டோக்கன் ${t}, ${d} தயவுசெய்து முன் வாருங்கள்.`,
  TE: (t, d) => `టోకెన్ ${t}, ${d} దయచేసి ముందుకు రండి.`,
  KN: (t, d) => `ಟೋಕನ್ ${t}, ${d} ದಯವಿಟ್ಟು ಮುಂದೆ ಬನ್ನಿ.`,
  GU: (t, d) => `ટોકન ${t}, ${d} માટે કૃપા કરીને આગળ આવો.`,
  PA: (t, d) => `ਟੋਕਨ ${t}, ${d} ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਅੱਗੇ ਆਓ.`,
  ML: (t, d) => `ടോക്കൺ ${t}, ${d} ദയവായി മുന്നോട്ട് വരിക.`,
};

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

const DOCTOR_ONLINE_TEXT: Record<DisplayLanguage, (name: string) => string> = {
  EN: (n) => `Doctor ${n} is now online.`,
  HI: (n) => `डॉक्टर ${n} अब ऑनलाइन हैं।`,
  BN: (n) => `ডাক্তার ${n} এখন অনলাইনে আছেন।`,
  MR: (n) => `डॉक्टर ${n} आता ऑनलाइन आहेत.`,
  TA: (n) => `டாக்டர் ${n} இப்போது ஆன்லைனில் உள்ளார்.`,
  TE: (n) => `డాక్టర్ ${n} ఇప్పుడు ఆన్‌లైన్‌లో ఉన్నారు.`,
  KN: (n) => `ಡಾಕ್ಟರ್ ${n} ಈಗ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದಾರೆ.`,
  GU: (n) => `ડૉક્ટર ${n} હવે ઑનલાઇન છે.`,
  PA: (n) => `ਡਾਕਟਰ ${n} ਹੁਣ ਔਨਲਾਈਨ ਹਨ.`,
  ML: (n) => `ഡോക്ടർ ${n} ഇപ്പോൾ ഓൺലൈനിലാണ്.`,
};

const POLL_INTERVAL_MS = 1_000;
const SPEECH_REPEAT_DELAY_MS = 600;
const MAX_SPEECH_REPEATS = 3;
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

        // Keep showing the last good snapshot; only surface an error
        // (and the loading screen) on the very first fetch.
        if (isInitial) setError("Unable to connect to hospital display");
      } finally {
        requestInFlight = false;
        if (isInitial) setLoading(false);
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

function useSpeechAnnouncer(voicesRef: React.MutableRefObject<SpeechSynthesisVoice[]>) {
  const [enabled, setEnabled] = useState(false);

  const findVoice = (locale: DisplayLanguage) => {
    const voiceCode = VOICE_LOCALES[locale] ?? DEFAULT_VOICE_LOCALE;
    const voices = voicesRef.current.length > 0
      ? voicesRef.current
      : (voicesRef.current = window.speechSynthesis.getVoices());

    let match = voices.find((v) => v.lang.toLowerCase() === voiceCode.toLowerCase());

    if (!match) {
      const prefix = voiceCode.split("-")[0].toLowerCase();
      match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    }

    // Some Android/Chrome voice packs expose Hindi without a matching BCP-47 tag.
    if (!match && locale === "HI") {
      match = voices.find((v) => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        return lang.includes("hi") || name.includes("hindi") || name.includes("हिंदी");
      });
    }

    return { voiceCode, voice: match };
  };

  const speak = (text: string, locale: DisplayLanguage, repeatCount = 1) => {
    if (!enabled || !text.trim() || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    const { voiceCode, voice } = findVoice(locale);
    const repeats = Math.min(Math.max(repeatCount, 1), MAX_SPEECH_REPEATS);

    synth.cancel();

    const speakOnce = (count: number) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceCode;
      utterance.rate = locale === "HI" ? 0.72 : 0.82;
      utterance.pitch = 1;
      utterance.volume = 1;
      if (voice) utterance.voice = voice;

      utterance.onerror = (event) => console.error("VOICE ERROR:", event);
      utterance.onend = () => {
        if (count < repeats) {
          window.setTimeout(() => speakOnce(count + 1), SPEECH_REPEAT_DELAY_MS);
        }
      };

      try {
        synth.speak(utterance);
      } catch (err) {
        console.error("SPEECH ERROR:", err);
      }
    };

    speakOnce(1);
  };

  const activate = () => {
    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    const synth = window.speechSynthesis;
    voicesRef.current = synth.getVoices();
    setEnabled(true);

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance("Voice announcements enabled.");
    utterance.lang = DEFAULT_VOICE_LOCALE;
    utterance.rate = 0.85;
    utterance.volume = 1;

    try {
      synth.speak(utterance);
    } catch (err) {
      console.error("VOICE ACTIVATION ERROR:", err);
    }
  };

  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return { enabled, speak, activate };
}

// Hook: derives voice announcements from display state changes

function useAnnouncements(
  displayKey: string | undefined,
  data: DisplayResponse | null,
  announcer: ReturnType<typeof useSpeechAnnouncer>,
) {
  const lastAnnouncedToken = useRef<string | null>(null);
  const lastDoctorId = useRef<string | null>(null);
  const lastDoctorOnline = useRef<boolean | null>(null);
  const isFirstLoad = useRef(true);

  // Reset announcement state whenever we switch to a different display.
  useEffect(() => {
    lastAnnouncedToken.current = null;
    lastDoctorId.current = null;
    lastDoctorOnline.current = null;
    isFirstLoad.current = true;
  }, [displayKey]);

  useEffect(() => {
    if (!data) return;

    const { display, current = [] } = data;
    if (!display.voiceEnabled || !display.announcementEnabled) return;

    // Doctor presence is authoritative from the API root, not the queue payload.
    const doctorOnline = data.doctorOnline === true;
    const doctorId = data.doctorId ?? "display-doctor";
    const doctorName = data.doctorName ?? "Doctor";

    if (lastDoctorId.current !== doctorId) {
      // New doctor session — establish a baseline without announcing.
      lastDoctorId.current = doctorId;
      lastDoctorOnline.current = doctorOnline;
    } else {
      if (lastDoctorOnline.current === true && doctorOnline === false) {
        announcer.speak(DOCTOR_OFFLINE_TEXT[display.displayLanguage](doctorName), display.displayLanguage, 2);
      }
      if (lastDoctorOnline.current === false && doctorOnline === true) {
        announcer.speak(DOCTOR_ONLINE_TEXT[display.displayLanguage](doctorName), display.displayLanguage, 1);
      }
    }
    lastDoctorOnline.current = doctorOnline;

    if (current.length === 0) {
      lastAnnouncedToken.current = null;
      return;
    }
    if (!doctorOnline) return;

    const token = current[0]?.tokenLabel;
    if (!token) return;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      lastAnnouncedToken.current = token;
      return;
    }
    if (lastAnnouncedToken.current === token) return;

    lastAnnouncedToken.current = token;
    const department = current[0].departmentId?.name ?? "OPD";
    announcer.speak(
      ANNOUNCEMENT_TEXT[display.displayLanguage](token, department),
      display.displayLanguage,
      display.announcementRepeat,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, announcer.enabled]);
}

// Root component

const DisplayBoard = () => {
  const { displayKey } = useParams<{ displayKey: string }>();

  const now = useClock();
  const { voicesRef } = useSpeechVoices();
  const { data, loading, error } = useDisplayPolling(displayKey);
  const announcer = useSpeechAnnouncer(voicesRef);

  useAnnouncements(displayKey, data, announcer);

  if (loading) return <LoadingScreen />;
  if (error && !data) return <ErrorScreen message={error} displayKey={displayKey} />;
  if (!data) return null;

  const { display, current = [], next = [], waiting = [], emergency = [] } = data;
  const doctorOnline = data.doctorOnline === true;
  const doctorName = data.doctorName || "Doctor";

  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });

  const tickerItems = buildTickerItems({ display, waiting: waiting.length, doctorName, doctorOnline });

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#F3F7FC] text-slate-900" style={{ fontFeatureSettings: '"tnum" 1' }}>
      <TickerStyles />

      <TopBar display={display} time={time} date={date} doctorName={doctorName} doctorOnline={doctorOnline} />

      {display.voiceEnabled && !announcer.enabled && <VoicePrompt onEnable={announcer.activate} />}

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 md:p-6 lg:grid-cols-[1fr_360px] lg:gap-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:gap-6">
          {display.showCurrent && (
            <NowServingPanel current={current} doctorName={doctorName} doctorOnline={doctorOnline} />
          )}

          {display.showWaiting && <StatusStrip waiting={waiting} emergency={display.showEmergency ? emergency : []} />}
        </div>

        {display.showNext && <UpNextPanel next={next} />}
      </main>

      <Ticker items={tickerItems} time={time} />
    </div>
  );
};

export default DisplayBoard;

// Shared style injection for the ticker animation

function TickerStyles() {
  return (
    <style>{`
      @keyframes ticker-scroll {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      .ticker-track {
        animation: ticker-scroll 38s linear infinite;
      }
    `}</style>
  );
}

// Loading / error states

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F7FC]">
      <div className="text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-[#0757B8]" />
        <p className="text-xl font-semibold text-slate-700">Connecting to hospital display…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, displayKey }: { message: string; displayKey?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F7FC] px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
          ⚠
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Display offline</h1>
        <p className="mt-2 text-slate-500">{message}</p>
        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Display key</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">{displayKey}</p>
        </div>
      </div>
    </div>
  );
}

// Top bar

type DisplaySettings = DisplayResponse["display"];

function TopBar({
  display,
  time,
  date,
  doctorName,
  doctorOnline,
}: {
  display: DisplaySettings;
  time: string;
  date: string;
  doctorName: string;
  doctorOnline: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-blue-100 bg-white px-5 py-4 shadow-sm md:px-8">
      <div className="flex min-w-0 items-center gap-4">
        {display.logoUrl ? (
          <img
            src={display.logoUrl}
            alt={display.hospitalName}
            className="h-12 w-12 shrink-0 rounded-xl border border-blue-100 object-contain p-1"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0757B8] text-lg font-bold text-white">
            {display.hospitalName.charAt(0)}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900 md:text-xl">{display.hospitalName}</h1>
          <p className="truncate text-sm text-slate-500">{display.heading}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <DoctorPill doctorName={doctorName} doctorOnline={doctorOnline} />

        <div className="hidden text-right sm:block">
          <p className="text-2xl font-bold tabular-nums text-slate-900">{time}</p>
          <p className="text-xs text-slate-500">{date}</p>
        </div>
      </div>
    </header>
  );
}

function DoctorPill({ doctorName, doctorOnline }: { doctorName: string; doctorOnline: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 ${
        doctorOnline ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${doctorOnline ? "animate-pulse bg-[#0757B8]" : "bg-slate-400"}`} />
      <span className="text-sm font-medium text-slate-900">Dr. {doctorName}</span>
      <span className={`text-xs font-medium ${doctorOnline ? "text-[#0757B8]" : "text-slate-500"}`}>
        {doctorOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}

function VoicePrompt({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      <span>
        Turn on voice announcements for this screen
      </span>
      <button
        type="button"
        onClick={onEnable}
        className="rounded-xl bg-[#172554] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-950"
      >
        Enable voice
      </button>
    </div>
  );
}

// Now serving

function NowServingPanel({
  current,
  doctorName,
  doctorOnline,
}: {
  current: DisplayQueue[];
  doctorName: string;
  doctorOnline: boolean;
}) {
  return (
    <section className="flex flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_15px_45px_rgba(15,64,120,0.08)] md:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Now serving</p>

      <div className="mt-4 flex flex-1 items-center">
        {current.length === 0 ? (
          <EmptyServingState doctorName={doctorName} doctorOnline={doctorOnline} />
        ) : (
          <div className={`grid w-full gap-5 ${current.length > 1 ? "md:grid-cols-2" : ""}`}>
            {current.map((queue) => (
              <CurrentTokenCard key={queue._id} queue={queue} doctorOnline={doctorOnline} solo={current.length === 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CurrentTokenCard({ queue, doctorOnline, solo }: { queue: DisplayQueue; doctorOnline: boolean; solo: boolean }) {
  return (
    <div
      className={`rounded-2xl p-8 text-center text-white shadow-[0_15px_35px_rgba(7,87,184,0.25)] ${
        doctorOnline
          ? "bg-gradient-to-br from-[#0757B8] to-[#0B78E3]"
          : "bg-gradient-to-br from-slate-500 to-slate-600"
      }`}
    >
      <p
        className={`font-extrabold leading-none tabular-nums tracking-tight ${
          solo ? "text-[9rem] md:text-[11rem]" : "text-7xl md:text-8xl"
        }`}
      >
        {queue.tokenLabel}
      </p>
      <p className="mt-4 text-xl font-semibold md:text-2xl">{queue.departmentId?.name || "OPD"}</p>
      {queue.doctorId?.name && <p className="mt-1 text-sm text-blue-100">Dr. {queue.doctorId.name}</p>}
    </div>
  );
}

function EmptyServingState({ doctorName, doctorOnline }: { doctorName: string; doctorOnline: boolean }) {
  return (
    <div className="w-full py-12 text-center">
      <p className="text-4xl font-bold text-slate-900 md:text-5xl">
        {doctorOnline ? "Waiting for the next patient" : "Doctor is offline"}
      </p>
      <p className="mt-3 text-lg text-slate-500">
        {doctorOnline ? "Please stay seated — you'll be called shortly." : `Dr. ${doctorName} will be back online soon.`}
      </p>
    </div>
  );
}

// Up next (transit-board style list)

function UpNextPanel({ next }: { next: DisplayQueue[] }) {
  return (
    <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_15px_45px_rgba(15,64,120,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Up next</p>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#0757B8]">
          {next.length}
        </span>
      </div>

      {next.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-400">No upcoming tokens</p>
      ) : (
        <div className="mt-2 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {next.map((queue) => (
            <div key={queue._id} className="flex items-center justify-between gap-3 py-3.5">
              <span className="text-2xl font-bold tabular-nums text-[#0757B8]">{queue.tokenLabel}</span>
              <span className="truncate text-sm text-slate-500">{queue.departmentId?.name || "OPD"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Status strip: waiting pills + emergency

function StatusStrip({ waiting, emergency }: { waiting: DisplayQueue[]; emergency: DisplayQueue[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_15px_45px_rgba(15,64,120,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Waiting</p>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-600">
          {waiting.length} {waiting.length === 1 ? "patient" : "patients"}
        </span>
      </div>

      {waiting.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No patients waiting</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {waiting.slice(0, 24).map((queue) => (
            <span
              key={queue._id}
              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold tabular-nums text-[#0757B8]"
            >
              {queue.tokenLabel}
            </span>
          ))}
          {waiting.length > 24 && (
            <span className="px-3 py-1.5 text-sm text-slate-400">+{waiting.length - 24} more</span>
          )}
        </div>
      )}

      {emergency.length > 0 && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
          <p className="text-sm font-semibold text-red-700">
            {emergency.length} emergency {emergency.length === 1 ? "token" : "tokens"} in queue —{" "}
            {emergency.map((q) => q.tokenLabel).join(", ")}
          </p>
        </div>
      )}
    </section>
  );
}

// Bottom ticker

interface TickerItem {
  text: string;
  emphasis?: "amber" | "red";
}

function buildTickerItems({
  display,
  waiting,
  doctorName,
  doctorOnline,
}: {
  display: DisplaySettings;
  waiting: number;
  doctorName: string;
  doctorOnline: boolean;
}): TickerItem[] {
  const items: TickerItem[] = [
    { text: "Keep your token visible and listen for your number to be called." },
    { text: "Proceed to the department shown as soon as your token appears." },
  ];

  if (!doctorOnline) {
    items.push({ text: `Dr. ${doctorName} is currently offline — thank you for your patience.`, emphasis: "amber" });
  }

  if (waiting > 0) {
    items.push({ text: `${waiting} ${waiting === 1 ? "patient is" : "patients are"} currently waiting.` });
  }

  if (display.voiceEnabled) {
    items.push({ text: `Announcements are read in ${LANGUAGE_NAMES[display.displayLanguage]}.` });
  }

  return items;
}

function Ticker({ items, time }: { items: TickerItem[]; time: string }) {
  const doubled = [...items, ...items];

  return (
    <footer className="flex items-center gap-4 border-t border-slate-200 bg-white py-3">
      <div className="shrink-0 border-r border-slate-200 px-5 text-sm font-bold tabular-nums text-[#0757B8]">
        {time}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="ticker-track flex w-max gap-16 whitespace-nowrap">
          {doubled.map((item, index) => (
            <span
              key={index}
              className={`text-sm font-medium ${item.emphasis === "amber" ? "text-amber-600" : "text-slate-500"}`}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>

      <div className="hidden shrink-0 border-l border-slate-200 px-5 text-xs text-slate-400 md:block">
        NexTurn Smart Hospital OPD Queue
      </div>
    </footer>
  );
}