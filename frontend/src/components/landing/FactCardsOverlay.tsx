import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { CARD_ORBIT_POSITIONS } from "./cardOrbit";
import { landingFacts } from "./landingFacts";
import { landingScrollState } from "./landingScrollState";

interface FactCardsOverlayProps {
  onSelectTab: (tabIndex: number) => void;
  previewing?: boolean;
}

const START_T = 0.05;
const END_T = 0.86;
const FOCUS_RANGE = 0.12;
const ORBIT_REVEAL_START = 0.035;
const ORBIT_REVEAL_END = 0.09;

export function FactCardsOverlay({ onSelectTab, previewing = false }: FactCardsOverlayProps) {
  const [offset, setOffset] = useState(landingScrollState.offset);
  const [dragRotation, setDragRotation] = useState(landingScrollState.dragRotation);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let frameId = 0;
    let lastOffset = landingScrollState.offset;
    let lastRotation = landingScrollState.dragRotation;
    const syncViewport = () => setCompact(window.innerWidth < 800);

    const syncOffset = () => {
      const nextOffset = landingScrollState.offset;
      const nextRotation = landingScrollState.dragRotation;
      if (Math.abs(nextOffset - lastOffset) > 0.001) {
        lastOffset = nextOffset;
        setOffset(nextOffset);
      }
      if (Math.abs(nextRotation - lastRotation) > 0.001) {
        lastRotation = nextRotation;
        setDragRotation(nextRotation);
      }
      frameId = window.requestAnimationFrame(syncOffset);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    frameId = window.requestAnimationFrame(syncOffset);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const cards = useMemo(() => {
    const totalSpan = END_T - START_T;
    const orbitReveal = Math.min(
      1,
      Math.max(0, (offset - ORBIT_REVEAL_START) / (ORBIT_REVEAL_END - ORBIT_REVEAL_START))
    );
    const orbit = compact
      ? { centerX: 50, centerY: 54, radiusX: 18, radiusY: 31, swayY: 4.4 }
      : { centerX: 61, centerY: 53, radiusX: 24, radiusY: 30, swayY: 3.2 };
    const yValues = CARD_ORBIT_POSITIONS.map(([, y]) => y);
    const maxY = Math.max(...yValues);
    const minY = Math.min(...yValues);
    const yRange = Math.max(maxY - minY, 0.001);

    return landingFacts.map((fact, index) => {
      const tZoom = START_T + totalSpan * ((index + 0.5) / landingFacts.length);
      const delta = Math.abs(offset - tZoom);
      const focus = Math.max(0, 1 - delta / FOCUS_RANGE);
      const easedFocus = focus * focus * (3 - 2 * focus);
      const [x, y, z] = CARD_ORBIT_POSITIONS[index];
      const angle = Math.atan2(z, x) + dragRotation - 0.26;
      const side = Math.sin(angle);
      const face = Math.cos(angle);
      const yNorm = ((y - minY) / yRange) * 2 - 1;
      const orbitRotateY = -side * 62;

      return {
        depth: (face + 1) / 2,
        fact,
        focus: easedFocus,
        orbitReveal,
        placement: {
          left: orbit.centerX + Math.cos(angle) * orbit.radiusX,
          top: orbit.centerY - yNorm * orbit.radiusY + Math.sin(angle) * orbit.swayY,
        },
        rotateX: -yNorm * 7 + face * 3,
        rotateY: orbitRotateY * (1 - easedFocus * 0.92),
        rotateZ: side * 4 * (1 - easedFocus * 0.62),
      };
    });
  }, [compact, dragRotation, offset]);

  const orbitReveal = Math.min(
    1,
    Math.max(0, (offset - ORBIT_REVEAL_START) / (ORBIT_REVEAL_END - ORBIT_REVEAL_START))
  );
  const orbitPath = compact
    ? { centerX: 50, centerY: 54, height: 62, width: 52 }
    : { centerX: 61, centerY: 53, height: 60, width: 48 };

  return (
    <div
      className="landing__cards"
      data-previewing={previewing}
      style={
        {
          "--orbit-center-x": `${orbitPath.centerX}%`,
          "--orbit-center-y": `${orbitPath.centerY}%`,
          "--orbit-height": `${orbitPath.height}%`,
          "--orbit-opacity": (orbitReveal * 0.62).toFixed(3),
          "--orbit-width": `${orbitPath.width}%`,
        } as CSSProperties
      }
    >
      <div className="landing__orbit-path" aria-hidden="true" />
      {cards.map(({ depth, fact, focus, orbitReveal, placement, rotateX, rotateY, rotateZ }) => {
        const active = focus > 0.42;
        const cardOpacity =
          orbitReveal * Math.min(0.98, Math.max(0.08, 0.05 + depth * 0.08 + focus * 0.86));
        const cardScale = 0.74 + focus * 0.28;
        const cardY = (1 - focus) * 14;
        const orbitDepth = Math.round(8 + depth * 4 + focus * 12);

        return (
          <button
            key={fact.id}
            className="landing__card glass-card group"
            type="button"
            data-active={active}
            disabled={previewing || !active || orbitReveal < 0.95}
            aria-label={`Open ${fact.eyebrow} tab preview`}
            onClick={() => onSelectTab(fact.tabIndex)}
            style={
              {
                "--accent": fact.hue,
                "--focus": cardOpacity.toFixed(3),
                "--card-scale": cardScale.toFixed(3),
                "--card-y": `${cardY.toFixed(1)}px`,
                "--card-left": `${placement.left}%`,
                "--card-top": `${placement.top}%`,
                "--card-rotate-x": `${rotateX.toFixed(1)}deg`,
                "--card-rotate-y": `${rotateY.toFixed(1)}deg`,
                "--card-rotate-z": `${rotateZ.toFixed(1)}deg`,
                zIndex: orbitDepth,
              } as CSSProperties
            }
          >
            <div className="glass-card__eyebrow">
              <span className="glass-card__dot" />
              {fact.eyebrow}
            </div>
            <div className="glass-card__value text-glow">{fact.value}</div>
            <div className="glass-card__label">{fact.label}</div>
            <p className="glass-card__detail">{fact.detail}</p>
            <div className="glass-card__action">
              <span>Open tab</span>
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}
