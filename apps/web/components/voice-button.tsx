"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone } from "@phosphor-icons/react";

interface RecognitionResult {
  0: { transcript: string };
  readonly isFinal: boolean;
}

interface RecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionConstructor = new () => RecognitionInstance;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * Push-to-talk dictation using the browser's built-in speech recognition.
 * No audio leaves the device except through the browser's own recognizer,
 * and nothing is sent to our servers until you press send.
 */
export function VoiceButton({
  value,
  onTranscript,
  disabled,
}: {
  value: string;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}): React.JSX.Element | null {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<RecognitionInstance | null>(null);
  const prefixRef = useRef("");
  const finalsRef = useRef<string[]>([]);

  useEffect(() => {
    setSupported(getRecognitionConstructor() !== null);
  }, []);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // Already stopped; nothing to do.
      }
    };
  }, []);

  if (!supported) return null;

  function toggle(): void {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        // Already stopped; onend resets the state.
      }
      return;
    }
    const Ctor = getRecognitionConstructor();
    if (!Ctor || disabled) return;
    const rec = new Ctor();
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    prefixRef.current = value;
    finalsRef.current = [];
    rec.onresult = (event) => {
      const results = Array.from({ length: event.results.length }, (_, i) => event.results[i] as RecognitionResult);
      finalsRef.current = results.filter((r) => r.isFinal).map((r) => r[0].transcript);
      const interim = results.filter((r) => !r.isFinal).map((r) => r[0].transcript).join(" ");
      const spoken = [...finalsRef.current, interim].filter(Boolean).join(" ");
      onTranscript(prefixRef.current ? `${prefixRef.current} ${spoken}`.trim() : spoken);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? "Stop dictation" : "Dictate with your microphone"}
      title={listening ? "Listening, click to stop" : "Dictate with your microphone"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
        listening ? "bg-[#B83C34] text-white" : "bg-[#EFECE5] text-[#4E4C46] hover:bg-[#D8D3C9]"
      }`}
    >
      <Microphone size={16} weight={listening ? "fill" : "regular"} />
    </button>
  );
}
