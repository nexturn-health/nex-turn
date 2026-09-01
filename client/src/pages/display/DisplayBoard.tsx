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
const CHIME_TO_SPEECH_DELAY_MS = 900;

/**
 * Plays a two-tone descending chime (like Indian metro/PA systems) before an
 * announcement, using the Web Audio API — no audio file needed. Resolves
 * once the chime has finished so the caller can start speaking after it.
 */
function playAnnouncementChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }

      const ctx = new AudioContextClass();
      const startTime = ctx.currentTime;

      const playTone = (frequency: number, start: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0, startTime + start);
        gain.gain.linearRampToValueAtTime(0.25, startTime + start + 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + start + duration);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(startTime + start);
        oscillator.stop(startTime + start + duration + 0.05);
      };

      // "Ding" (G5) then "dong" (E5) — a calm, familiar two-tone chime.
      playTone(784, 0, 0.35);
      playTone(659, 0.32, 0.45);

      window.setTimeout(() => {
        ctx.close();
        resolve();
      }, CHIME_TO_SPEECH_DELAY_MS);
    } catch (err) {
      console.error("CHIME ERROR:", err);
      resolve();
    }
  });
}

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
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("nexturn-display-voice") ?? "" : "",
  );

  const findVoice = (locale: DisplayLanguage) => {
    const voiceCode = VOICE_LOCALES[locale] ?? DEFAULT_VOICE_LOCALE;
    const voices = voicesRef.current.length > 0
      ? voicesRef.current
      : (voicesRef.current = window.speechSynthesis.getVoices());

    // If the user selected a specific browser voice, always use it.
    // This makes the voice selector work independently from the display language.
    if (selectedVoiceName) {
      const selectedVoice = voices.find((v) => v.name === selectedVoiceName);
      if (selectedVoice) {
        return { voiceCode: selectedVoice.lang || voiceCode, voice: selectedVoice };
      }
    }

    // Prefer Google's voices where available — noticeably clearer and calmer
    // than most default OS voices, which tends to matter most for Hindi.
    const preferGoogle = (candidates: SpeechSynthesisVoice[]) =>
      candidates.find((v) => v.name.toLowerCase().includes("google")) ?? candidates[0];

    let match = preferGoogle(voices.filter((v) => v.lang.toLowerCase() === voiceCode.toLowerCase()));

    if (!match) {
      const prefix = voiceCode.split("-")[0].toLowerCase();
      match = preferGoogle(voices.filter((v) => v.lang.toLowerCase().startsWith(prefix)));
    }

    // Some Android/Chrome voice packs expose Hindi without a matching BCP-47 tag.
    if (!match && locale === "HI") {
      match = preferGoogle(
        voices.filter((v) => {
          const name = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          return lang.includes("hi") || name.includes("hindi") || name.includes("हिंदी");
        }),
      );
    }

    return { voiceCode, voice: match };
  };

  const speak = async (text: string, locale: DisplayLanguage, repeatCount = 1) => {
    if (!enabled || !text.trim() || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    const { voiceCode, voice } = findVoice(locale);
    const repeats = Math.min(Math.max(repeatCount, 1), MAX_SPEECH_REPEATS);

    synth.cancel();

    // The metro-style chime + slower pacing is specifically for Hindi
    // announcements. Every other language speaks immediately, same as before.
    if (locale === "HI") {
      await playAnnouncementChime();
    }

    const speakOnce = (count: number) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceCode;
      utterance.rate = locale === "HI" ? 0.66 : 0.82;
      utterance.pitch = locale === "HI" ? 0.95 : 1;
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

  const selectVoice = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    localStorage.setItem("nexturn-display-voice", voiceName);

    if (!voiceName || !("speechSynthesis" in window)) return;

    const voice = voicesRef.current.find((v) => v.name === voiceName);
    if (!voice) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Voice selected.");
    utterance.voice = voice;
    utterance.lang = voice.lang || DEFAULT_VOICE_LOCALE;
    utterance.rate = 0.85;
    utterance.volume = 1;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("VOICE TEST ERROR:", err);
    }
  };

  const testVoice = (locale: DisplayLanguage) => {
    if (!("speechSynthesis" in window)) return;

    const { voiceCode, voice } = findVoice(locale);
    const text = locale === "HI"
      ? "यह नेक्सटर्न वॉइस टेस्ट है।"
      : "This is a NexTurn voice test.";

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceCode;
    utterance.rate = locale === "HI" ? 0.72 : 0.85;
    utterance.pitch = locale === "HI" ? 0.95 : 1;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("VOICE TEST ERROR:", err);
    }
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

  return {
    enabled,
    speak,
    activate,
    voices: voicesRef.current,
    selectedVoiceName,
    selectVoice,
    testVoice,
  };
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white" style={{ fontFeatureSettings: '"tnum" 1' }}>
      <TickerStyles />
      <BackgroundDecoration />

      <div className="relative z-10 flex min-h-screen flex-col">
        <TopBar display={display} time={time} date={date} doctorName={doctorName} doctorOnline={doctorOnline} />

        {display.voiceEnabled && !announcer.enabled && <VoicePrompt onEnable={announcer.activate} />}

        <VoiceSettings
          enabled={announcer.enabled}
          voices={announcer.voices}
          selectedVoiceName={announcer.selectedVoiceName}
          displayLanguage={display.displayLanguage}
          onSelectVoice={announcer.selectVoice}
          onTestVoice={announcer.testVoice}
        />

        <main className="grid flex-1 grid-cols-1 gap-5 p-4 md:p-6 lg:grid-cols-[1fr_380px] lg:gap-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:gap-6">
            {display.showCurrent && (
              <NowServingPanel current={current} doctorName={doctorName} doctorOnline={doctorOnline} />
            )}

            {display.showWaiting && <StatusStrip waiting={waiting} emergency={display.showEmergency ? emergency : []} />}
          </div>

          {display.showNext && <UpNextPanel next={next} />}
        </main>

        <Ticker items={tickerItems} time={time} />
      </div>
    </div>
  );
};

export default DisplayBoard;

// Ambient background: blurred glow orbs + faint grid, matching the brand's login screen

function BackgroundDecoration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="absolute right-20 top-20 h-32 w-32 rounded-full border border-white/10" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#93c5fd 1px, transparent 1px), linear-gradient(90deg, #93c5fd 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700">
      <BackgroundDecoration />
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-300" />
        <p className="text-xl font-semibold text-white">Connecting to hospital display…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, displayKey }: { message: string; displayKey?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-6">
      <BackgroundDecoration />
      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/10 bg-white p-8 text-center shadow-[0_20px_60px_-20px_rgba(15,23,42,0.5)]">
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
    <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md md:px-8">
      <div className="flex min-w-0 items-center gap-4">
        {display.logoUrl ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1">
            <img src={display.logoUrl} alt={display.hospitalName} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-lg font-bold text-blue-700">
            {display.hospitalName.charAt(0)}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-white md:text-xl">{display.hospitalName}</h1>
          <p className="truncate text-sm text-blue-200">{display.heading}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <LivePill />
        <DoctorPill doctorName={doctorName} doctorOnline={doctorOnline} />

        <div className="hidden text-right sm:block">
          <p className="text-2xl font-bold tabular-nums text-white">{time}</p>
          <p className="text-xs text-blue-200">{date}</p>
        </div>
      </div>
    </header>
  );
}

function LivePill() {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-md md:flex">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </span>
      <span className="text-xs font-medium text-white">Live</span>
    </div>
  );
}

function DoctorPill({ doctorName, doctorOnline }: { doctorName: string; doctorOnline: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 backdrop-blur-md">
      <span className={`h-2 w-2 rounded-full ${doctorOnline ? "animate-pulse bg-cyan-300" : "bg-white/30"}`} />
      <span className="text-sm font-medium text-white">Dr. {doctorName}</span>
      <span className={`text-xs font-medium ${doctorOnline ? "text-cyan-300" : "text-blue-200"}`}>
        {doctorOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}

function VoicePrompt({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 border-b border-white/10 bg-amber-400/90 px-4 py-2.5 text-sm font-semibold text-amber-950 backdrop-blur-md">
      <span>Turn on voice announcements for this screen</span>
      <button
        type="button"
        onClick={onEnable}
        className="rounded-lg bg-blue-950 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-900"
      >
        Enable voice
      </button>
    </div>
  );
}

function VoiceSettings({
  enabled,
  voices,
  selectedVoiceName,
  displayLanguage,
  onSelectVoice,
  onTestVoice,
}: {
  enabled: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  displayLanguage: DisplayLanguage;
  onSelectVoice: (voiceName: string) => void;
  onTestVoice: (locale: DisplayLanguage) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!enabled || voices.length === 0) return null;

  const sortedVoices = [...voices].sort((a, b) =>
    `${a.lang} ${a.name}`.localeCompare(`${b.lang} ${b.name}`),
  );

  return (
    <div className="fixed bottom-16 right-4 z-30 md:bottom-20 md:right-6">
      {open && (
        <div className="mb-3 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-white p-4 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Voice settings</p>
              <p className="mt-0.5 text-xs text-slate-500">Choose the voice used for announcements.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close voice settings"
            >
              ×
            </button>
          </div>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Voice
          </label>
          <select
            value={selectedVoiceName}
            onChange={(event) => onSelectVoice(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Automatic — best voice for language</option>
            {sortedVoices.map((voice) => (
              <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onTestVoice(displayLanguage)}
            className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
          >
            🔊 Test selected voice
          </button>

          <p className="mt-2 text-[11px] leading-4 text-slate-400">
            The available voices depend on the browser/device. Your selection is saved on this display device.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-blue-950/90 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-blue-900"
        aria-label="Open voice settings"
      >
        <span className="text-base">🔊</span>
        <span>Voice</span>
        <span className="text-blue-300">⚙</span>
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
    <section className="flex flex-1 flex-col rounded-[28px] border border-white/10 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(2,6,23,0.6)] md:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Now serving</p>

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
      className={`rounded-3xl p-8 text-center ${
        doctorOnline ? "bg-gradient-to-br from-blue-50 to-cyan-50" : "bg-slate-50"
      }`}
    >
      <p
        className={`bg-clip-text font-extrabold leading-none tabular-nums tracking-tight text-transparent ${
          solo ? "text-[9rem] md:text-[11rem]" : "text-7xl md:text-8xl"
        } ${doctorOnline ? "bg-gradient-to-br from-blue-700 to-cyan-500" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}
      >
        {queue.tokenLabel}
      </p>
      <p className="mt-4 text-xl font-semibold text-slate-900 md:text-2xl">{queue.departmentId?.name || "OPD"}</p>
      {queue.doctorId?.name && <p className="mt-1 text-sm text-slate-500">Dr. {queue.doctorId.name}</p>}
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
    <section className="flex flex-col rounded-[28px] border border-white/10 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(2,6,23,0.6)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Up next</p>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          {next.length}
        </span>
      </div>

      {next.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-400">No upcoming tokens</p>
      ) : (
        <div className="mt-2 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {next.map((queue) => (
            <div key={queue._id} className="flex items-center justify-between gap-3 py-3.5">
              <span className="text-2xl font-bold tabular-nums text-blue-700">{queue.tokenLabel}</span>
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
    <section className="rounded-[28px] border border-white/10 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(2,6,23,0.6)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Waiting</p>
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
              className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 px-3 py-1.5 text-sm font-semibold tabular-nums text-blue-700"
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
    <footer className="flex items-center gap-4 border-t border-white/10 bg-white/5 py-3 backdrop-blur-md">
      <div className="shrink-0 border-r border-white/10 px-5 text-sm font-bold tabular-nums text-cyan-300">
        {time}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="ticker-track flex w-max gap-16 whitespace-nowrap">
          {doubled.map((item, index) => (
            <span
              key={index}
              className={`text-sm font-medium ${item.emphasis === "amber" ? "text-amber-300" : "text-blue-100"}`}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>

      <div className="hidden shrink-0 border-l border-white/10 px-5 text-xs text-blue-300 md:block">
        NexTurn Smart Hospital Queue
      </div>
    </footer>
  );
}