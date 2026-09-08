import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Mic,
  MicOff,
  Square,
  RotateCcw,
} from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete?: (
    audioBlob: Blob,
  ) => void;

  disabled?: boolean;
}

const VoiceRecorder = ({
  onRecordingComplete,
  disabled = false,
}: VoiceRecorderProps) => {
  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const chunksRef =
    useRef<Blob[]>([]);

  const timerRef =
    useRef<number | null>(null);

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingTime, setRecordingTime] =
    useState(0);

  const [audioBlob, setAudioBlob] =
    useState<Blob | null>(null);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (
    seconds: number,
  ) => {
    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // ============================================================
  // START RECORDING
  // ============================================================

  const startRecording = async () => {
    try {
      setError(null);

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        throw new Error(
          "Your browser does not support microphone recording.",
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          },
        );

      streamRef.current = stream;

      chunksRef.current = [];

      let options: MediaRecorderOptions =
        {};

      // --------------------------------------------------------
      // Browser-compatible MIME type
      // --------------------------------------------------------

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus",
        )
      ) {
        options = {
          mimeType:
            "audio/webm;codecs=opus",
        };
      } else if (
        MediaRecorder.isTypeSupported(
          "audio/webm",
        )
      ) {
        options = {
          mimeType: "audio/webm",
        };
      } else if (
        MediaRecorder.isTypeSupported(
          "audio/mp4",
        )
      ) {
        options = {
          mimeType: "audio/mp4",
        };
      }

      const recorder =
        new MediaRecorder(
          stream,
          options,
        );

      mediaRecorderRef.current =
        recorder;

      recorder.ondataavailable = (
        event,
      ) => {
        if (event.data.size > 0) {
          chunksRef.current.push(
            event.data,
          );
        }
      };

      recorder.onstop = () => {
        const mimeType =
          recorder.mimeType ||
          "audio/webm";

        const blob = new Blob(
          chunksRef.current,
          {
            type: mimeType,
          },
        );

        setAudioBlob(blob);

        const url =
          URL.createObjectURL(blob);

        setAudioUrl(url);

        onRecordingComplete?.(
          blob,
        );

        // Stop microphone
        stream
          .getTracks()
          .forEach((track) =>
            track.stop(),
          );
      };

      recorder.onerror = () => {
        setError(
          "An error occurred while recording audio.",
        );

        stopStream();
      };

      recorder.start(1000);

      setRecordingTime(0);

      setIsRecording(true);

      timerRef.current =
        window.setInterval(() => {
          setRecordingTime(
            (previous) =>
              previous + 1,
          );
        }, 1000);
    } catch (err: any) {
      console.error(
        "MICROPHONE ERROR:",
        err,
      );

      if (
        err?.name ===
        "NotAllowedError"
      ) {
        setError(
          "Microphone permission was denied. Please allow microphone access in your browser.",
        );
      } else if (
        err?.name ===
        "NotFoundError"
      ) {
        setError(
          "No microphone was found on this device.",
        );
      } else {
        setError(
          err?.message ||
            "Unable to access microphone.",
        );
      }
    }
  };

  // ============================================================
  // STOP STREAM
  // ============================================================

  const stopStream = () => {
    streamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop(),
      );

    streamRef.current = null;
  };

  // ============================================================
  // STOP RECORDING
  // ============================================================

  const stopRecording = () => {
    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !==
        "inactive"
    ) {
      recorder.stop();
    }

    setIsRecording(false);

    if (timerRef.current) {
      window.clearInterval(
        timerRef.current,
      );

      timerRef.current = null;
    }
  };

  // ============================================================
  // RESET
  // ============================================================

  const resetRecording = () => {
    if (isRecording) {
      stopRecording();
    }

    if (audioUrl) {
      URL.revokeObjectURL(
        audioUrl,
      );
    }

    setAudioBlob(null);

    setAudioUrl(null);

    setRecordingTime(0);

    setError(null);

    chunksRef.current = [];
  };

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(
          timerRef.current,
        );
      }

      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop(),
        );

      if (audioUrl) {
        URL.revokeObjectURL(
          audioUrl,
        );
      }
    };
  }, [audioUrl]);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="ns-recorder" data-recording={isRecording}>
      <RecorderDesignStyles />
      <div className="ns-recorder-heading">
        <div className="ns-recorder-icon"><Mic size={22} strokeWidth={1.7} /></div>
        <div>
          <h3>Consultation audio</h3>
          <p>Record the conversation, then review your audio.</p>
        </div>
      </div>

      <div className="ns-recorder-session">
        <div className="ns-recorder-status" role="status" aria-live="polite">
          <span className="ns-recorder-status-dot" aria-hidden="true" />
          {isRecording ? "Recording in progress" : audioBlob ? "Recording ready" : "Ready when you are"}
        </div>
        <div className="ns-recorder-clock" aria-label={`Recording duration ${formatTime(recordingTime)}`}>
          {formatTime(recordingTime)}
        </div>
        <p className="ns-recorder-hint">
          {isRecording
            ? "Speak naturally. Stop when the conversation is finished."
            : audioBlob
              ? "Listen back before generating your transcript."
              : "Start recording to capture the consultation."}
        </p>

        <div className="ns-recorder-controls">
          {!isRecording ? (
            <button type="button" onClick={startRecording} disabled={disabled} className="ns-recorder-start">
              <Mic size={18} />
              {audioBlob ? "Record again" : "Start recording"}
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="ns-recorder-stop">
              <Square size={16} fill="currentColor" /> Stop recording
            </button>
          )}
          {audioBlob && !isRecording && (
            <button type="button" onClick={resetRecording} className="ns-recorder-reset">
              <RotateCcw size={16} /> Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="ns-recorder-error" role="alert">
          <MicOff size={18} /><span>{error}</span>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="ns-recorder-preview">
          <div><h4>Your recording</h4><span>Audio preview</span></div>
          <audio controls src={audioUrl} aria-label="Consultation recording playback" />
        </div>
      )}
      <p className="ns-recorder-footnote">
        {isRecording
          ? "Microphone is active."
          : audioBlob
            ? "Recording ready for transcription."
            : "Your browser may ask for microphone access."}
      </p>
    </div>
  );
};

const RecorderDesignStyles = () => (
  <style>{`
    .ns-recorder { width: 100%; min-width: 0; border: 1px solid #dce5d5; border-radius: 16px; background: #fff; padding: 22px; color: #173d39; font-family: "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
    .ns-recorder *, .ns-recorder *::before, .ns-recorder *::after { box-sizing: border-box; }
    .ns-recorder-heading { display: flex; align-items: center; gap: 12px; }
    .ns-recorder-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: #edf3e6; color: #54774b; flex-shrink: 0; }
    .ns-recorder-heading h3 { font-size: 14px; font-weight: 600; letter-spacing: -.2px; color: #294a36; margin: 0; }
    .ns-recorder-heading p { margin: 5px 0 0; font-size: 12px; line-height: 1.6; color: #75816e; }
    .ns-recorder-session { margin-top: 20px; border: 1px solid #e6ebdf; border-radius: 13px; background: #f8faf4; text-align: center; padding: 24px 18px; }
    .ns-recorder-status { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 500; color: #6b7d60; }
    .ns-recorder-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #91ab7f; }
    .ns-recorder-clock { margin: 12px 0 8px; font-size: 42px; font-weight: 500; font-variant-numeric: tabular-nums; letter-spacing: -1px; line-height: 1.2; color: #254832; }
    .ns-recorder-hint { margin: 0 auto; max-width: 350px; font-size: 12px; line-height: 1.7; color: #7b8572; }
    .ns-recorder-controls { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 22px; }
    .ns-recorder .ns-recorder-controls button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 46px; padding: 11px 20px; border-radius: 10px; border: 1px solid transparent; font-size: 13px; font-weight: 600; line-height: 1.5; cursor: pointer; touch-action: manipulation; transition: background .15s ease, border-color .15s ease; }
    .ns-recorder .ns-recorder-controls button:focus-visible { outline: 3px solid #85ad72; outline-offset: 3px; }
    .ns-recorder .ns-recorder-controls button:disabled { opacity: .5; cursor: not-allowed; }
    .ns-recorder .ns-recorder-start { background: #176957; color: #fff; }
    .ns-recorder .ns-recorder-start:hover:not(:disabled) { background: #104e40; }
    .ns-recorder .ns-recorder-stop { background: #b8493d; color: #fff; }
    .ns-recorder .ns-recorder-stop:hover { background: #963b32; }
    .ns-recorder .ns-recorder-reset { background: #fff; border-color: #d9e2d0; color: #66765b; }
    .ns-recorder .ns-recorder-reset:hover { background: #eef3e7; border-color: #b6c9a8; }
    .ns-recorder[data-recording="true"] .ns-recorder-session { background: #fcf6f2; border-color: #efdcd1; }
    .ns-recorder[data-recording="true"] .ns-recorder-status { color: #a34d3c; }
    .ns-recorder[data-recording="true"] .ns-recorder-status-dot { background: #bd5d47; }
    .ns-recorder[data-recording="true"] .ns-recorder-clock { color: #974939; }
    .ns-recorder-error { display: flex; align-items: flex-start; gap: 10px; margin-top: 16px; padding: 12px 14px; border: 1px solid #efd4cc; border-radius: 10px; background: #fcf1ed; font-size: 12px; line-height: 1.7; color: #a2493b; overflow-wrap: anywhere; }
    .ns-recorder-error svg { flex-shrink: 0; margin-top: 2px; }
    .ns-recorder-preview { margin-top: 16px; padding: 16px; border: 1px solid #e4eadc; border-radius: 12px; background: #fff; }
    .ns-recorder-preview > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
    .ns-recorder-preview h4 { margin: 0; color: #42603b; font-size: 12px; font-weight: 600; }
    .ns-recorder-preview span { color: #859178; font-size: 10px; }
    .ns-recorder-preview audio { display: block; width: 100%; min-width: 0; max-width: 100%; height: 44px; color-scheme: light; }
    .ns-recorder-preview audio:focus-visible { outline: 3px solid #85ad72; outline-offset: 3px; border-radius: 10px; }
    .ns-recorder-footnote { margin: 13px 0 0; text-align: center; color: #849077; font-size: 11px; line-height: 1.6; }
    @media (max-width: 479px) {
      .ns-recorder { padding: 16px; border-radius: 13px; }
      .ns-recorder-session { padding: 20px 12px; }
      .ns-recorder-heading { align-items: flex-start; }
      .ns-recorder-controls { flex-direction: column; gap: 8px; }
      .ns-recorder .ns-recorder-controls button { width: 100%; min-height: 48px; }
      .ns-recorder-clock { font-size: 38px; }
      .ns-recorder-preview { padding: 12px; }
    }
    @media (prefers-reduced-motion: reduce) { .ns-recorder *, .ns-recorder *::before, .ns-recorder *::after { transition: none !important; animation: none !important; } }
  `}</style>
);

export default VoiceRecorder;
