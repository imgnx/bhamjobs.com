"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "chat_voice_enabled";

export function useSpeechSynthesis({ preferLocale = "en", rate = 1, pitch = 1, volume = 1 } = {}) {
  const [supported, setSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [voices, setVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastUtteranceRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (!supported) return;
    function loadVoices() {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    } catch {}
  }, [enabled]);

  const resolveVoice = useCallback(() => {
    if (!voices.length) return null;
    if (!preferLocale) return voices[0];
    const localeMatch = voices.find((v) => String(v.lang || "").toLowerCase().startsWith(preferLocale.toLowerCase()));
    return localeMatch || voices[0];
  }, [voices, preferLocale]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    lastUtteranceRef.current = null;
    setIsSpeaking(false);
  }, [supported]);

  const speak = useCallback((text) => {
    if (!supported || !enabled) return;
    const trimmed = typeof text === "string" ? text.trim() : "";
    if (!trimmed) return;
    cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    const voice = resolveVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      if (lastUtteranceRef.current === utterance) {
        setIsSpeaking(false);
        lastUtteranceRef.current = null;
      }
    };
    utterance.onerror = () => {
      if (lastUtteranceRef.current === utterance) {
        setIsSpeaking(false);
        lastUtteranceRef.current = null;
      }
    };
    lastUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [supported, enabled, resolveVoice, cancel, rate, pitch, volume]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return {
    supported,
    enabled,
    setEnabled,
    toggleEnabled: toggle,
    isSpeaking,
    speak,
    cancel,
    voices,
  };
}
