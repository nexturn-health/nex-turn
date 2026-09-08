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

const EMERGENCY_ANNOUNCEMENT_TEXT: Record<DisplayLanguage, (token: string, dept: string) => string> = {
  EN: (t, d) => `Emergency token ${t}, please proceed immediately to ${d}.`,
  HI: (t, d) => `आपातकालीन टोकन ${toHindiSpeech(t)}, कृपया तुरंत ${d} में आगे आएं।`,
  BN: (t, d) => `জরুরি টোকেন ${t}, অনুগ্রহ করে এখনই ${d} এর জন্য এগিয়ে আসুন।`,
  MR: (t, d) => `आपत्कालीन टोकन ${t}, कृपया त्वरित ${d} मध्ये पुढे या.`,
  TA: (t, d) => `அவசர டோக்கன் ${t}, ${d} தயவுசெய்து உடனே முன் வாருங்கள்.`,
  TE: (t, d) => `ఎమర్జెన్సీ టోకెన్ ${t}, ${d} కు వెంటనే ముందుకు రండి.`,
  KN: (t, d) => `ತುರ್ತು ಟೋಕನ್ ${t}, ದಯವಿಟ್ಟು ತಕ್ಷಣ ${d} ಗೆ ಬನ್ನಿ.`,
  GU: (t, d) => `ઇમરજન્સી ટોકન ${t}, કૃપા કરીને તરત ${d} માટે આગળ આવો.`,
  PA: (t, d) => `ਐਮਰਜੈਂਸੀ ਟੋਕਨ ${t}, ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ ${d} ਲਈ ਅੱਗੇ ਆਓ।`,
  ML: (t, d) => `അടിയന്തര ടോക്കൺ ${t}, ദയവായി ഉടൻ ${d} ലേക്ക് വരിക.`,
};

type EmergencyAwareDisplayQueue = DisplayQueue & {
  priority?: "NORMAL" | "EMERGENCY";
  source?: "WALK_IN" | "APPOINTMENT" | "EMERGENCY";
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

function useSpeechAnnouncer(voicesRef: { current: SpeechSynthesisVoice[] }) {
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

    const currentQueue = current[0];
    const department = currentQueue.departmentId?.name ?? "OPD";
    const isEmergency = isEmergencyQueue(currentQueue);

    announcer.speak(
      isEmergency
        ? EMERGENCY_ANNOUNCEMENT_TEXT[display.displayLanguage](token, department)
        : ANNOUNCEMENT_TEXT[display.displayLanguage](token, department),
      display.displayLanguage,
      display.announcementRepeat,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, announcer.enabled]);
}

// TV layout: large numbers first, with setup controls tucked away.
const DisplayBoard = () => {
  const { displayKey } = useParams<{ displayKey: string }>();
  const now = useClock();
  const { voicesRef } = useSpeechVoices();
  const { data, loading, error } = useDisplayPolling(displayKey);
  const announcer = useSpeechAnnouncer(voicesRef);
  useAnnouncements(displayKey, data, announcer);

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

  const { display, current = [], next = [], waiting = [], emergency = [] } = data;
  const doctorOnline = data.doctorOnline === true;
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
            <p>Announcement language: {LANGUAGE_NAMES[display.displayLanguage]}</p>
            {!announcer.enabled ? <button type="button" onClick={announcer.activate}>Enable voice announcements</button> : <p>Voice announcements enabled</p>}
            <label htmlFor="tv-voice">Announcement voice</label>
            <select id="tv-voice" value={announcer.selectedVoiceName} onChange={event => announcer.selectVoice(event.target.value)}>
              <option value="">Automatic — match language</option>
              {[...announcer.voices].sort((a, b) => a.name.localeCompare(b.name)).map(voice => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}
            </select>
            <button type="button" onClick={() => announcer.testVoice(display.displayLanguage)}>Test voice</button>
            <p>Available voices depend on this device.</p>
          </> : <p>Voice is disabled in the hospital display configuration.</p>}
        </div>
      </details>
    </header>

    {/* A stale snapshot must never be labelled as a live queue. */}
    <div className="tv-info" data-warning={!!error || !doctorOnline}>
      <strong>{doctorLabel(data.doctorName)} · {doctorOnline ? "Online" : "Offline"}</strong>
      <span role="status">{error ? "Connection interrupted · showing last update" : "Queue updates automatically"}</span>
      {display.voiceEnabled && !announcer.enabled && <button type="button" onClick={announcer.activate}>Enable sound</button>}
    </div>

    {/* One or two columns depending on the hospital's display settings. */}
    {hasMain ? <main className="tv-main" data-split={display.showCurrent && display.showNext}>
      {display.showCurrent && <section className="tv-current">
        <div className="tv-panel-heading"><h2>Now serving</h2><PageLabel total={current.length} size={2} page={page} /></div>
        {current.length ? <div className="tv-current-grid" data-multiple={currentPage.length > 1}>
          {currentPage.map(queue => {
            const emergency = isEmergencyQueue(queue);

            return (
              <article
                className="tv-current-token"
                data-emergency={emergency}
                key={queue._id}
              >
                {emergency && (
                  <span className="tv-emergency-badge">
                    Emergency patient
                  </span>
                )}

                <strong>{queue.tokenLabel}</strong>
                <h3>{queue.departmentId?.name || "OPD"}</h3>
                {queue.doctorId?.name && <p>{doctorLabel(queue.doctorId.name)}</p>}

                {emergency && (
                  <em>Please attend immediately</em>
                )}
              </article>
            );
          })}
        </div> : <div className="tv-empty"><strong>{doctorOnline ? "Please wait for your token" : "Doctor is currently offline"}</strong><p>{doctorOnline ? "The next token will appear here." : "Please contact reception for an update."}</p></div>}
        <p className="tv-instruction">{error ? "Please confirm the current token with reception." : doctorOnline ? "When your token appears, proceed to the department shown." : "Please wait for the doctor to become available."}</p>
      </section>}

      {display.showNext && <section className="tv-next">
        <div className="tv-panel-heading"><h2>Up next</h2><PageLabel total={next.length} size={4} page={page} /></div>
        {next.length ? <ol className="tv-next-list">
          {nextPage.map(queue => {
            const emergency = isEmergencyQueue(queue);

            return (
              <li data-emergency={emergency} key={queue._id}>
                <strong>{queue.tokenLabel}</strong>
                <span>{emergency ? "Emergency · " : ""}{queue.departmentId?.name || "OPD"}</span>
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
          <strong data-emergency={isEmergencyQueue(queue)} key={queue._id}>
            {queue.tokenLabel}
          </strong>
        )) : <p>No patients waiting</p>}
      </div>
    </section>}
    {display.showEmergency && emergency.length > 0 && <section className="tv-emergency">
      <strong>Emergency priority · {emergency.length}</strong>
      <span>{emergencyPage.map(queue => queue.tokenLabel).join(" · ")}</span>
      <PageLabel total={emergency.length} size={6} page={page} />
    </section>}

    {/* Static guidance is easier to read from a distance than a moving ticker. */}
    <footer className="tv-footer"><p>Please keep your token ready. Emergency cases may be prioritised.</p><span>NextSynq Health</span></footer>
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
  `}</style>;
}
