import { useEffect, useMemo, useRef, useState } from "react";

import { nearestLandingFloor } from "./landingFloors";
import { landingScrollState } from "./landingScrollState";

const FLOOR_NARRATIONS: Record<number, string> = {
  0: "Every day, tens of thousands of New York City seniors rely on home-delivered care. And every day, their caregivers navigate a city where elevators fail without warning — leaving workers stranded and seniors without food. This tool changes that.",
  6: "The Dashboard surfaces every active risk in one place: at-risk stops, complaints by borough, heat advisories. Everything a dispatcher needs to act before a worker reaches the lobby.",
  5: "The Outage Map lays live elevator complaints over active senior-care routes. Each outage carries a half-mile proximity ring — so dispatchers can see at a glance which stops are inside the danger zone.",
  4: "The Complaints Feed pulls live from NYC's Department of Buildings open data — filtered and flagged for what matters most: chronic offenders, and single-elevator buildings where any outage means total inaccessibility.",
  3: "The Providers Directory maps every DFTA-contracted care provider in the five boroughs — location, client count, assigned routes. When a building goes dark, dispatchers can find the nearest available provider in seconds.",
  2: "Elevator Advocate is built for tenants, organizers, and care teams tracking elevator accountability from the outside. If that's your work, this is where to go.",
  1: "The Senior-Care Exploratory Analysis is the research behind this tool — the 79% proximity rate, the heat-week complaint spike, the Bronx concentration, the 135 single-elevator buildings. To understand where the numbers come from, start here.",
};

export function AudioOverlay() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [offset, setOffset] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTarget = useRef<number>(0.25);
  const lastSpokenBeat = useRef<number | null>(null);

  // Initialize background music
  useEffect(() => {
    const audio = new Audio("/RiseUp.mp3");
    audio.loop = true;
    audio.volume = 0.0;
    audioRef.current = audio;

    // Load speech voices
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }

    return () => {
      audio.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
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
        if (Math.abs(diff) > 0.01) {
          audioRef.current.volume = current + Math.sign(diff) * 0.012;
        } else {
          audioRef.current.volume = target;
        }
      }
      frameId = requestAnimationFrame(adjustVolume);
    };
    frameId = requestAnimationFrame(adjustVolume);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  // Determine active beat based on offset
  const activeBeat = useMemo(() => {
    if (offset <= 0.05) return 0; // Beat 0: Hero
    return nearestLandingFloor(offset).floor; // Beat 1-6
  }, [offset]);

  // Speak beat text
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    // Duck backing track
    fadeTarget.current = 0.05;
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a high quality natural English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Natural")) ||
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.rate = 0.95;
    utterance.volume = 1.0;

    utterance.onend = () => {
      if (!window.speechSynthesis.speaking) {
        fadeTarget.current = 0.25;
        setIsSpeaking(false);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "interrupted" && !window.speechSynthesis.speaking) {
        fadeTarget.current = 0.25;
        setIsSpeaking(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Trigger narration beat changes
  useEffect(() => {
    if (!isPlaying) {
      lastSpokenBeat.current = null;
      return;
    }

    if (lastSpokenBeat.current !== activeBeat) {
      lastSpokenBeat.current = activeBeat;
      const text = FLOOR_NARRATIONS[activeBeat];
      if (text) {
        speakText(text);
      }
    }
  }, [activeBeat, isPlaying]);

  // Handle play/mute toggle click
  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      // Pause
      audioRef.current.pause();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setIsPlaying(false);
    } else {
      // Play
      setIsPlaying(true);
      fadeTarget.current = 0.25;
      audioRef.current.volume = 0.0;
      audioRef.current.play().catch((err) => {
        console.warn("Audio autoplay blocked or failed:", err);
      });
      // Speak current floor beat immediately
      const text = FLOOR_NARRATIONS[activeBeat];
      if (text) {
        speakText(text);
      }
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
              ? `Floor ${activeBeat === 0 ? "G" : activeBeat} Narration`
              : "Rise Up (Ambient)"
            : "Click to Listen"}
        </span>
      </div>
    </div>
  );
}
