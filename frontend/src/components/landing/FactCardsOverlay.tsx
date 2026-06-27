import { useEffect, useRef } from "react";

import { landingFacts } from "./landingFacts";
import { landingScrollState } from "./landingScrollState";

const ORBIT_POSITIONS: { x: string; y: string }[] = [
  { x: "70%", y: "22%" },
  { x: "22%", y: "30%" },
  { x: "78%", y: "48%" },
  { x: "18%", y: "58%" },
  { x: "72%", y: "72%" },
  { x: "24%", y: "78%" },
];

export function FactCardsOverlay() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const offset = landingScrollState.offset;
      const totalFacts = landingFacts.length;
      landingFacts.forEach((_, idx) => {
        const el = refs.current[idx];
        if (!el) return;
        const revealAt = (idx + 0.6) / (totalFacts + 1);
        const distance = Math.abs(offset - revealAt);
        const opacity = Math.max(0, Math.min(1, 1 - distance * 5));
        const lift = (1 - opacity) * 28;
        const scale = 0.9 + opacity * 0.1;
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate(-50%, calc(-50% + ${lift.toFixed(1)}px)) scale(${scale.toFixed(3)})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="landing__cards" aria-hidden>
      {landingFacts.map((fact, idx) => {
        const pos = ORBIT_POSITIONS[idx % ORBIT_POSITIONS.length];
        return (
          <div
            key={fact.id}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            className="glass-card landing__card"
            style={
              {
                "--accent": fact.hue,
                left: pos.x,
                top: pos.y,
                opacity: 0,
              } as React.CSSProperties
            }
          >
            <div className="glass-card__eyebrow">
              <span className="glass-card__dot" />
              {fact.eyebrow}
            </div>
            <div className="glass-card__value">{fact.value}</div>
            <div className="glass-card__label">{fact.label}</div>
            <p className="glass-card__detail">{fact.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
