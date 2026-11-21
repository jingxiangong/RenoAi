import { useEffect, useRef, useState } from "react";
import { MAX_REPAIR_DESCRIPTION_LENGTH } from "@/lib/repair-limits";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function useVoiceInput(onDescriptionChange: (value: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognitionRef.current = null;
    recognition.abort();
  }, []);

  function start(description: string) {
    if (recognitionRef.current) return;
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      alert("Voice input isn't supported in this browser. Try Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new Recognition();
    const initialDescription = description.trim();
    const onEnd = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-SG";
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      const spokenText = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const combined = [initialDescription, spokenText].filter(Boolean).join(" ");
      onDescriptionChange(combined.slice(0, MAX_REPAIR_DESCRIPTION_LENGTH));
    };
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      onEnd();
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        alert("Microphone access is blocked. Allow microphone permission and try again.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        alert("Voice input stopped unexpectedly. Please try again.");
      }
    };
    recognition.onend = onEnd;

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setListening(recognitionRef.current === recognition);
    } catch {
      onEnd();
      alert("Voice input couldn't start. Please try again.");
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { listening, start, stop };
}
