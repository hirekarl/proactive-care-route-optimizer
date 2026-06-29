import { useEffect, useRef } from "react";

import { landingFacts } from "./landingFacts";
import { landingScrollState } from "./landingScrollState";

export function FactCardsOverlay() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const projections = landingScrollState.cards;
      landingFacts.forEach((_, idx) => {
        const el = refs.current[idx];
        const proj = projections[idx];
        if (!el) return;
        if (!proj || !proj.visible) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          return;
        }
        el.style.transform =
          `translate3d(${proj.x.toFixed(1)}px, ${proj.y.toFixed(1)}px, 0) ` +
          `translate(-50%, -50%) ` +
          `rotateY(${proj.tiltDeg.toFixed(1)}deg) ` +
          `scale(${proj.scale.toFixed(3)})`;
        el.style.opacity = proj.opacity.toFixed(3);
        el.style.zIndex = String(proj.zIndex);
        const glow = (proj.featured * 32).toFixed(0);
        el.style.boxShadow =
          `0 24px 60px -20px rgba(2, 6, 23, 0.7), ` +
          `0 0 0 1px rgba(255, 255, 255, 0.04) inset, ` +
          `0 0 ${glow}px -8px var(--accent)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="landing__cards" aria-hidden>
      {landingFacts.map((fact, idx) => (
        <div
          key={fact.id}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          className="glass-card landing__card"
          style={
            {
              "--accent": fact.hue,
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
      ))}
    </div>
  );
}
