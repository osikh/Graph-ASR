"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { DURATION } from "@/lib/data";

interface PlaybackState {
  t: number;
  playing: boolean;
  speed: number;
  setT: (v: number) => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  onPlay: () => void;
  onSeek: (v: number) => void;
  onRestart: () => void;
}

const PlaybackCtx = createContext<PlaybackState | null>(null);

function load<T>(key: string, def: T): T {
  if (typeof window === "undefined") return def;
  try {
    const v = localStorage.getItem("ars_" + key);
    return v === null ? def : JSON.parse(v);
  } catch {
    return def;
  }
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [t, setTState] = useState(() => load("t", 0));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => load("speed", 1));
  const tRef = useRef(t);

  const setT = useCallback((v: number) => { setTState(v); tRef.current = v; }, []);

  useEffect(() => { localStorage.setItem("ars_t", JSON.stringify(t)); }, [t]);
  useEffect(() => { localStorage.setItem("ars_speed", JSON.stringify(speed)); }, [speed]);

  useEffect(() => {
    if (!playing) return;
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const nt = tRef.current + dt * speed;
      if (nt >= DURATION) { setT(DURATION); setPlaying(false); return; }
      setT(nt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, setT]);

  const onPlay = useCallback(() => {
    if (tRef.current >= DURATION - 0.05) { setT(0); }
    setPlaying(p => !p);
  }, [setT]);

  const onSeek = useCallback((v: number) => setT(v), [setT]);

  const onRestart = useCallback(() => { setT(0); setPlaying(true); }, [setT]);

  return (
    <PlaybackCtx.Provider value={{ t, playing, speed, setT, setPlaying, setSpeed, onPlay, onSeek, onRestart }}>
      {children}
    </PlaybackCtx.Provider>
  );
}

export function usePlayback(): PlaybackState {
  const ctx = useContext(PlaybackCtx);
  if (!ctx) throw new Error("usePlayback must be inside PlaybackProvider");
  return ctx;
}
