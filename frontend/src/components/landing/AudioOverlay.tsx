import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_BG_VOLUME,
  globalAudio,
  initGlobalAudio,
  playNarrationBeat,
  toggleGlobalAudio,
} from "../../lib/globalAudio";
import { nearestLandingFloor } from "./landingFloors";
import { landingScrollState } from "./landingScrollState";

export function AudioOverlay() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [offset, setOffset] = useState(0);

  const lastSpokenBeat = useRef<number | null>(null);

  // Initialize and sync global audio state
  useEffect(() => {
    initGlobalAudio();
    setIsPlaying(globalAudio.isPlaying);
    setIsSpeaking(globalAudio.isSpeaking);

    const handleSync = () => {
      setIsPlaying(globalAudio.isPlaying);
      setIsSpeaking(globalAudio.isSpeaking);
    };

    window.addEventListener("global-audio-change", handleSync);
    return () => {
      window.removeEventListener("global-audio-change", handleSync);

      // Stop narration when leaving the landing page, but let background music keep playing!
      if (globalAudio.narrationAudio) {
        globalAudio.narrationAudio.pause();
      }
      globalAudio.isSpeaking = false;
      globalAudio.fadeTarget = DEFAULT_BG_VOLUME;
      window.dispatchEvent(new Event("global-audio-change"));
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

  return (
    <div className="landing-audio-widget">
      <button
        onClick={toggleGlobalAudio}
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
