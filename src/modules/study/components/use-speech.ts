"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Đọc tiếng Anh bằng giọng của trình duyệt (Text-to-speech) cho bài nghe & câu mẫu.
 * Có file mp3 của giáo trình thì component tự phát file, không gọi hook này.
 */
export function useSpeech() {
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices();
      voice.current =
        vs.find((v) => /en[-_]US/i.test(v.lang) && /female|samantha|aria|jenny|zira|google us/i.test(v.name)) ??
        vs.find((v) => /en[-_](US|GB)/i.test(v.lang)) ??
        null;
    };
    pick();
    speechSynthesis.addEventListener("voiceschanged", pick);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", pick);
      speechSynthesis.cancel();
    };
  }, [supported]);

  const say = useCallback(
    (text: string, rate = 0.9, tag = "default") => {
      if (!supported) return false;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = rate;
      if (voice.current) u.voice = voice.current;
      u.onend = u.onerror = () => setPlaying(null);
      setPlaying(tag);
      speechSynthesis.speak(u);
      return true;
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (supported) speechSynthesis.cancel();
    setPlaying(null);
  }, [supported]);

  return { say, stop, playing, supported };
}
