import { useEffect, useRef } from "react";

import { landingScrollState } from "./landingScrollState";

interface EnterButtonOverlayProps {
  onEnter: () => void;
}

export function EnterButtonOverlay({ onEnter }: EnterButtonOverlayProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const opacity = Math.max(0, Math.min(1, (landingScrollState.offset - 0.93) * 12));
      if (buttonRef.current) {
        buttonRef.current.style.opacity = opacity.toFixed(3);
        const lift = (1 - opacity) * 24;
        buttonRef.current.style.transform = `translateY(${lift.toFixed(1)}px)`;
      }
      if (wrapperRef.current) {
        wrapperRef.current.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrapperRef} className="landing__enter" style={{ pointerEvents: "none" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onEnter}
        className="enter-button"
        style={{ opacity: 0 }}
      >
        <span className="enter-button__inner">
          <span className="enter-button__chev" aria-hidden="true">
            &darr;
          </span>
          Enter Dispatcher Dashboard
        </span>
      </button>
    </div>
  );
}
