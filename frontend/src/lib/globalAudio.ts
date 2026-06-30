export const DEFAULT_BG_VOLUME = 0.55;
export const DUCKED_BG_VOLUME = 0.18;

export const globalAudio: {
  bgAudio: HTMLAudioElement | null;
  narrationAudio: HTMLAudioElement | null;
  isPlaying: boolean;
  isSpeaking: boolean;
  fadeTarget: number;
} = {
  bgAudio: null,
  narrationAudio: null,
  isPlaying: false,
  isSpeaking: false,
  fadeTarget: DEFAULT_BG_VOLUME,
};

let volumeLoopStarted = false;

// Smooth background music volume interpolation (audio ducking loop)
const startVolumeLoop = () => {
  if (volumeLoopStarted) return;
  volumeLoopStarted = true;

  const adjustVolume = () => {
    if (globalAudio.bgAudio && globalAudio.isPlaying) {
      const current = globalAudio.bgAudio.volume;
      const target = globalAudio.fadeTarget;
      const diff = target - current;
      if (Math.abs(diff) > 0.005) {
        globalAudio.bgAudio.volume = Math.max(0, Math.min(1, current + Math.sign(diff) * 0.015));
      } else {
        globalAudio.bgAudio.volume = target;
      }
    }
    requestAnimationFrame(adjustVolume);
  };
  requestAnimationFrame(adjustVolume);
};

export const initGlobalAudio = () => {
  if (typeof window === "undefined" || globalAudio.bgAudio) return;

  const origin = window.location.origin;
  const bgMusicUrl = origin + "/RiseUp.mp3";

  const bgAudio = new Audio(bgMusicUrl);
  bgAudio.loop = true;
  bgAudio.preload = "auto";
  bgAudio.volume = 0.0;

  bgAudio.onerror = (e) => {
    console.error("Background music failed to load source:", bgMusicUrl, e);
  };
  globalAudio.bgAudio = bgAudio;

  const narrationAudio = new Audio();
  narrationAudio.preload = "auto";
  narrationAudio.volume = 1.0;

  narrationAudio.onplay = () => {
    globalAudio.fadeTarget = DUCKED_BG_VOLUME;
    globalAudio.isSpeaking = true;
    window.dispatchEvent(new Event("global-audio-change"));
  };

  narrationAudio.onended = () => {
    globalAudio.fadeTarget = DEFAULT_BG_VOLUME;
    globalAudio.isSpeaking = false;
    window.dispatchEvent(new Event("global-audio-change"));
  };

  narrationAudio.onerror = (e) => {
    console.error("Narration playback error:", e);
    globalAudio.fadeTarget = DEFAULT_BG_VOLUME;
    globalAudio.isSpeaking = false;
    window.dispatchEvent(new Event("global-audio-change"));
  };

  globalAudio.narrationAudio = narrationAudio;
  startVolumeLoop();
};

export const toggleGlobalAudio = () => {
  initGlobalAudio();
  if (!globalAudio.bgAudio || !globalAudio.narrationAudio) return;

  if (globalAudio.isPlaying) {
    // Pause all audio
    globalAudio.bgAudio.pause();
    globalAudio.narrationAudio.pause();
    globalAudio.isSpeaking = false;
    globalAudio.isPlaying = false;
  } else {
    // Start background music
    globalAudio.isPlaying = true;
    globalAudio.fadeTarget = DEFAULT_BG_VOLUME;
    globalAudio.bgAudio.volume = 0.0;
    globalAudio.bgAudio.play().catch((err) => {
      console.warn("Background music autoplay blocked or failed:", err);
    });
  }

  // Dispatch event to sync UI components
  window.dispatchEvent(new Event("global-audio-change"));
};

// Play pre-recorded narration beat
export const playNarrationBeat = (beatIndex: number) => {
  initGlobalAudio();
  if (!globalAudio.narrationAudio) return;

  globalAudio.narrationAudio.pause();

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const narrationUrl = `${origin}/landing-page-beat${beatIndex}.m4a`;

  globalAudio.narrationAudio.src = narrationUrl;
  globalAudio.narrationAudio.load();

  // Duck the background music immediately
  globalAudio.fadeTarget = DUCKED_BG_VOLUME;

  globalAudio.narrationAudio.play().catch((err) => {
    console.warn("Narration playback blocked or failed:", err);
    globalAudio.fadeTarget = DEFAULT_BG_VOLUME;
    globalAudio.isSpeaking = false;
    window.dispatchEvent(new Event("global-audio-change"));
  });
};
