import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { landingFloors, nearestLandingFloor } from "./landingFloors";
import { landingScrollState } from "./landingScrollState";

interface FloorControlOverlayProps {
  previewing?: boolean;
}

type Direction = "up" | "down" | "idle";

export function FloorControlOverlay({ previewing = false }: FloorControlOverlayProps) {
  const [offset, setOffset] = useState(landingScrollState.offset);
  const [direction, setDirection] = useState<Direction>("idle");

  useEffect(() => {
    let frameId = 0;
    let lastOffset = landingScrollState.offset;
    let lastChangeAt = 0;
    let currentDirection: Direction = "idle";

    const syncOffset = (now: number) => {
      const nextOffset = landingScrollState.offset;
      const delta = nextOffset - lastOffset;
      if (Math.abs(delta) > 0.001) {
        lastOffset = nextOffset;
        setOffset(nextOffset);
        const nextDirection: Direction = delta > 0 ? "down" : "up";
        if (nextDirection !== currentDirection) {
          currentDirection = nextDirection;
          setDirection(nextDirection);
        }
        lastChangeAt = now;
      } else if (currentDirection !== "idle" && now - lastChangeAt > 320) {
        currentDirection = "idle";
        setDirection("idle");
      }
      frameId = window.requestAnimationFrame(syncOffset);
    };

    frameId = window.requestAnimationFrame(syncOffset);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const activeFloor = useMemo(() => nearestLandingFloor(offset), [offset]);
  const panelFloors = useMemo(() => [...landingFloors], []);
  const panelOpacity = Math.min(1, Math.max(0, (offset - 0.035) / 0.055));
  const visibleOpacity = previewing ? panelOpacity * 0.36 : panelOpacity;

  const scrollToFloor = (scrollOffset: number) => {
    const scroller = landingScrollState.scrollElement;
    if (!scroller) return;

    scroller.scrollTo({
      behavior: "smooth",
      top: scrollOffset * (scroller.scrollHeight - scroller.clientHeight),
    });
  };

  return (
    <aside
      className="landing-floor-panel"
      data-ready={panelOpacity > 0.98}
      data-previewing={previewing}
      aria-label="Elevator floor selector"
      style={
        {
          "--active-accent": activeFloor.hue,
          opacity: visibleOpacity,
        } as CSSProperties
      }
    >
      <div className="landing-floor-panel__screen" data-direction={direction}>
        <span>{activeFloor.floor}F</span>
        <strong className="landing-floor-panel__direction" aria-label={`Elevator ${direction}`}>
          {direction === "down" ? "▼ DOWN" : direction === "up" ? "▲ UP" : "—"}
        </strong>
      </div>

      <div className="landing-floor-panel__rows">
        {panelFloors.map((floor) => (
          <button
            key={floor.id}
            type="button"
            className="landing-floor-panel__row"
            data-active={floor.floor === activeFloor.floor}
            data-floor={floor.floor}
            aria-label={`Go to floor ${floor.floor}, ${floor.panelLabel}`}
            onClick={() => scrollToFloor(floor.scrollOffset)}
          >
            <span className="landing-floor-panel__button">{floor.floor}</span>
            <span className="landing-floor-panel__label">{floor.panelLabel}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
