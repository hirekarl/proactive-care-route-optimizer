import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { landingFacts } from "./landingFacts";
import { landingScrollState } from "./landingScrollState";

interface FactCardsOverlayProps {
  onSelectTab: (tabIndex: number) => void;
  previewing?: boolean;
}

const CARD_PLACEMENTS = [
  {
    angle: 28,
    compact: { left: 67, top: 29 },
    desktop: { left: 73, top: 28 },
    tiltX: -6,
    tiltZ: 1,
  },
  {
    angle: -72,
    compact: { left: 33, top: 44 },
    desktop: { left: 43, top: 36 },
    tiltX: 4,
    tiltZ: -2.5,
  },
  {
    angle: 82,
    compact: { left: 68, top: 58 },
    desktop: { left: 74, top: 58 },
    tiltX: 6,
    tiltZ: 2,
  },
  {
    angle: 168,
    compact: { left: 50, top: 72 },
    desktop: { left: 52, top: 72 },
    tiltX: 10,
    tiltZ: -1,
  },
];

const START_T = 0.05;
const END_T = 0.86;
const FOCUS_RANGE = 0.12;
const RAD_TO_DEG = 180 / Math.PI;

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
    const dragDegrees = dragRotation * RAD_TO_DEG;

    return landingFacts.map((fact, index) => {
      const tZoom = START_T + totalSpan * ((index + 0.5) / landingFacts.length);
      const delta = Math.abs(offset - tZoom);
      const focus = Math.max(0, 1 - delta / FOCUS_RANGE);
      const easedFocus = focus * focus * (3 - 2 * focus);
      const surface = CARD_PLACEMENTS[index];
      const placement = compact ? surface.compact : surface.desktop;
      const angle = ((surface.angle + dragDegrees) * Math.PI) / 180;
      const side = Math.sin(angle);
      const face = Math.cos(angle);
      const driftX = side * (compact ? 5 : 3.6);
      const driftY = Math.sin(angle * 0.7) * (compact ? 2.4 : 1.7);

      return {
        depth: (face + 1) / 2,
        fact,
        focus: easedFocus,
        placement: {
          left: placement.left + driftX,
          top: placement.top + driftY,
        },
        rotateX: surface.tiltX + face * 6,
        rotateY: -side * 48,
        rotateZ: surface.tiltZ + side * 3,
      };
    });
  }, [compact, dragRotation, offset]);

  return (
    <div className="landing__cards" data-previewing={previewing}>
      {cards.map(({ depth, fact, focus, placement, rotateX, rotateY, rotateZ }) => {
        const active = focus > 0.42;
        const cardOpacity = Math.min(0.98, Math.max(0.08, 0.06 + depth * 0.08 + focus * 0.86));
        const cardScale = 0.74 + focus * 0.28;
        const cardY = (1 - focus) * 14;
        const orbitDepth = Math.round(8 + depth * 4 + focus * 12);

        return (
          <button
            key={fact.id}
            className="landing__card glass-card group"
            type="button"
            data-active={active}
            disabled={previewing || !active}
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
