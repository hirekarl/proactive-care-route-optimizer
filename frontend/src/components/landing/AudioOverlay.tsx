import { useEffect, useMemo, useRef, useState } from "react";

import { nearestLandingFloor } from "./landingFloors";
import { landingScrollState } from "./landingScrollState";

const DEFAULT_BG_VOLUME = 0.55;
const DUCKED_BG_VOLUME = 0.18;

export function AudioOverlay() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [offset, setOffset] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTarget = useRef<number>(DEFAULT_BG_VOLUME);
  const lastSpokenBeat = useRef<number | null>(null);

  // Initialize background music and pre-recorded narration audio
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const bgMusicUrl = origin + "/RiseUp.mp3";

    // Setup background ambient audio
    const bgAudio = new Audio(bgMusicUrl);
    bgAudio.loop = true;
    bgAudio.preload = "auto";
    bgAudio.volume = 0.0;

    bgAudio.onerror = (e) => {
      console.error("Background music failed to load source:", bgMusicUrl, e);
    };
    audioRef.current = bgAudio;

    // Setup voice narration audio
    const narrationAudio = new Audio();
    narrationAudio.preload = "auto";
    narrationAudio.volume = 1.0;

    narrationAudio.onplay = () => {
      fadeTarget.current = DUCKED_BG_VOLUME;
      setIsSpeaking(true);
    };

    narrationAudio.onended = () => {
      fadeTarget.current = DEFAULT_BG_VOLUME;
      setIsSpeaking(false);
    };

    narrationAudio.onerror = (e) => {
      console.error("Narration playback error or source missing:", e);
      fadeTarget.current = DEFAULT_BG_VOLUME;
      setIsSpeaking(false);
    };

    narrationAudioRef.current = narrationAudio;

    return () => {
      bgAudio.pause();
      narrationAudio.pause();
    };
  }, []);

  // Sync scroll offset
  useEffect(() => {
    let frameId = 0;
    const syncOffset = () => {
      setOffset(landingScrollState.offset);
      frameId = requestAnimationFrame(syncOffset);
    };
    frameId = requestAnimationFrame(syncOffset);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Smooth background music volume interpolation (audio ducking)
  useEffect(() => {
    let frameId = 0;
    const adjustVolume = () => {
      if (audioRef.current && isPlaying) {
        const current = audioRef.current.volume;
        const target = fadeTarget.current;
        const diff = target - current;
        if (Math.abs(diff) > 0.005) {
          audioRef.current.volume = current + Math.sign(diff) * 0.015;
        } else {
          audioRef.current.volume = target;
        }
      }
      frameId = requestAnimationFrame(adjustVolume);
    };
    frameId = requestAnimationFrame(adjustVolume);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  // Determine active floor (0 for Hero, 1-6 for floors)
  const activeFloor = useMemo(() => {
    if (offset <= 0.05) return 0; // Hero
    return nearestLandingFloor(offset).floor; // Floor 1 to 6
  }, [offset]);

  // Map floor number to the correct pre-recorded audio beat index
  const activeBeatIndex = useMemo(() => {
    if (activeFloor === 0) return 0; // Hero -> Beat 0
    // Floor 6 (Dashboard) -> Beat 1
    // Floor 5 (Outage Map) -> Beat 2
    // Floor 4 (DOB Feed) -> Beat 3
    // Floor 3 (Providers) -> Beat 4
    // Floor 2 (Elevator Advocate) -> Beat 5
    // Floor 1 (Senior-Care EDA) -> Beat 6
    const mapping: Record<number, number> = {
      6: 1,
      5: 2,
      4: 3,
      3: 4,
      2: 5,
      1: 6,
    };
    return mapping[activeFloor] ?? 0;
  }, [activeFloor]);

  // Play pre-recorded narration beat and duck background music
  const playNarrationBeat = (beatIndex: number) => {
    if (!narrationAudioRef.current) return;

    // Stop current narration
    narrationAudioRef.current.pause();

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const narrationUrl = `${origin}/landing-page-beat${beatIndex}.m4a`;

    // Load and play new track
    narrationAudioRef.current.src = narrationUrl;
    narrationAudioRef.current.load();

    // Duck the background music immediately
    fadeTarget.current = DUCKED_BG_VOLUME;
    setIsSpeaking(true);

    narrationAudioRef.current.play().catch((err) => {
      console.warn("Narration playback blocked or failed:", err);
      fadeTarget.current = DEFAULT_BG_VOLUME;
      setIsSpeaking(false);
    });
  };

  // Trigger narration beat changes
  useEffect(() => {
    if (!isPlaying) {
      lastSpokenBeat.current = null;
      return;
    }

    if (lastSpokenBeat.current !== activeBeatIndex) {
      lastSpokenBeat.current = activeBeatIndex;
      playNarrationBeat(activeBeatIndex);
    }
  }, [activeBeatIndex, isPlaying]);

  // Handle play/mute toggle click
  const toggleAudio = () => {
    if (!audioRef.current || !narrationAudioRef.current) return;

    if (isPlaying) {
      // Pause all audio
      audioRef.current.pause();
      narrationAudioRef.current.pause();
      setIsSpeaking(false);
      setIsPlaying(false);
    } else {
      // Start background music
      setIsPlaying(true);
      fadeTarget.current = DEFAULT_BG_VOLUME;
      audioRef.current.volume = 0.0;
      audioRef.current.play().catch((err) => {
        console.warn("Background music autoplay blocked or failed:", err);
      });

      // Play current active floor beat narration
      playNarrationBeat(activeBeatIndex);
    }
  };

  return (
    <div className="landing-audio-widget">
      <button
        onClick={toggleAudio}
        type="button"
        className="landing-audio-widget__btn"
        data-muted={!isPlaying}
        aria-label={isPlaying ? "Mute audio presentation" : "Play audio presentation"}
      >
        {isPlaying ? (
          <div className="audio-waves" aria-hidden="true">
            <div
              className="audio-waves__bar"
              style={{ animationPlayState: isSpeaking ? "running" : "paused" }}
            />
            <div
              className="audio-waves__bar"
              style={{ animationPlayState: isSpeaking ? "running" : "paused" }}
            />
            <div
              className="audio-waves__bar"
              style={{ animationPlayState: isSpeaking ? "running" : "paused" }}
            />
            <div
              className="audio-waves__bar"
              style={{ animationPlayState: isSpeaking ? "running" : "paused" }}
            />
          </div>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>
      <div className="landing-audio-widget__info">
        <span className="landing-audio-widget__status" data-active={isPlaying}>
          {isPlaying ? (isSpeaking ? "Speaking" : "Background Music") : "Audio Presentation"}
        </span>
        <span className="landing-audio-widget__title">
          {isPlaying
            ? isSpeaking
              ? `Floor ${activeFloor === 0 ? "G" : activeFloor} Narration`
              : "Rise Up (Ambient)"
            : "Click to Listen"}
        </span>
      </div>
    </div>
  );
}
