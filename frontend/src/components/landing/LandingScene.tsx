import { ScrollControls, useScroll } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef } from "react";

import type { Group, PerspectiveCamera } from "three";
import { MathUtils, Vector3 } from "three";

import { Elevator3D } from "./Elevator3D";
import { CARD_ORBIT_POSITIONS } from "./cardOrbit";
import { landingScrollState } from "./landingScrollState";

const PAGES = 8;
const SHAFT_HEIGHT = 9.6;
const ELEVATOR_BASE_Y = -SHAFT_HEIGHT / 2 + 0.15;
const CABIN_TOP_Y = 6.0;
const CABIN_LANDING_Y = 0.12;
const CABIN_TRAVEL_END_SCROLL = 0.58;
const IDLE_ORBIT_EXIT_SCROLL = 0.035;

interface LandingSceneProps {
  selectedTab: number | null;
}

export function LandingScene({ selectedTab }: LandingSceneProps) {
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startRotation: 0,
    startX: 0,
  });

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startRotation: landingScrollState.dragRotation,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    landingScrollState.dragRotation = drag.startRotation + (event.clientX - drag.startX) * 0.008;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (
      drag.pointerId === event.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current.active = false;
  };

  return (
    <Canvas
      dpr={1}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      shadows
      style={{ position: "absolute", inset: 0 }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 15, 48]} />

      <ambientLight intensity={0.66} />
      <hemisphereLight args={["#ffffff", "#5a3b84", 0.98]} />
      <directionalLight position={[-3.5, 8, 5]} intensity={3.35} color="#ffffff" />
      <spotLight
        position={[0.6, 8.2, 4.9]}
        angle={0.34}
        penumbra={0.66}
        intensity={15.2}
        color="#ffffff"
        castShadow
      />
      <spotLight
        position={[-4.8, 5.2, 3.2]}
        angle={0.52}
        penumbra={0.82}
        intensity={10.2}
        color="#9f6bff"
      />
      <spotLight
        position={[5.2, 2.2, 5.4]}
        angle={0.5}
        penumbra={0.86}
        intensity={7.7}
        color="#ffffff"
      />
      <pointLight position={[3.2, 4.8, 1.8]} intensity={12.4} color="#7c3aed" distance={11} />
      <pointLight position={[-3.6, 0.75, 3.8]} intensity={8.4} color="#ffffff" distance={9} />
      <pointLight position={[0.9, 0.35, 4.4]} intensity={8.8} color="#f8fafc" distance={8} />

      <ScrollControls pages={PAGES} damping={0.22}>
        <ScrollableScene selectedTab={selectedTab} />
      </ScrollControls>
    </Canvas>
  );
}

interface ScrollableSceneProps {
  selectedTab: number | null;
}

function ScrollableScene({ selectedTab }: ScrollableSceneProps) {
  const scroll = useScroll();
  const { camera } = useThree();
  const elevatorRef = useRef<Group>(null);
  const camPos = useMemo(() => new Vector3(), []);
  const idleLook = useMemo(() => new Vector3(), []);
  const idlePos = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const currentLook = useMemo(() => new Vector3(0, 2.45, 0), []);
  const targetZoomOutPos = useMemo(() => new Vector3(4.8, 3.65, 7.6), []);
  const targetZoomOutLook = useMemo(() => new Vector3(0, 0.45, 0), []);
  const cardVecs = useMemo(() => CARD_ORBIT_POSITIONS.map(([x, y, z]) => new Vector3(x, y, z)), []);
  const keys = useMemo(() => buildKeyframes(cardVecs), [cardVecs]);

  useEffect(() => {
    const pCam = camera as PerspectiveCamera;
    if (pCam.isPerspectiveCamera) {
      pCam.fov = 48;
      pCam.near = 0.1;
      pCam.far = 140;
      pCam.updateProjectionMatrix();
    }
    camera.position.set(0.8, 0.8, 3.2);
    camera.lookAt(0, 2.45, 0);
    camera.updateMatrixWorld();
  }, [camera]);

  useFrame(({ clock }) => {
    if (selectedTab !== null) {
      camera.position.lerp(targetZoomOutPos, 0.06);
      currentLook.lerp(targetZoomOutLook, 0.06);
      camera.lookAt(currentLook);
    } else {
      const offset = scroll.offset;
      landingScrollState.offset = offset;
      sampleKeys(keys, offset, camPos, lookTarget);
      const idleBlend =
        1 - MathUtils.smoothstep(MathUtils.clamp(offset / IDLE_ORBIT_EXIT_SCROLL, 0, 1), 0, 1);

      if (idleBlend > 0) {
        const idleAngle = clock.getElapsedTime() * 0.18 + 0.24;
        idlePos.set(Math.sin(idleAngle) * 3.0, 1.72, Math.cos(idleAngle) * 6.55);
        idleLook.set(-0.18, 1.9, 0);
        camPos.lerp(idlePos, idleBlend);
        lookTarget.lerp(idleLook, idleBlend);
      }

      camera.position.lerp(camPos, 0.085);
      currentLook.lerp(lookTarget, 0.085);
      camera.lookAt(currentLook);
    }
    if (elevatorRef.current) {
      elevatorRef.current.rotation.y = MathUtils.lerp(
        elevatorRef.current.rotation.y,
        landingScrollState.dragRotation,
        0.12
      );
    }
    camera.updateMatrixWorld();
  });

  return (
    <group ref={elevatorRef}>
      <Elevator3D />
    </group>
  );
}

interface CamKey {
  t: number;
  pos: [number, number, number];
  look: [number, number, number];
}

function buildKeyframes(cards: Vector3[]): CamKey[] {
  const keys: CamKey[] = [];

  keys.push({ t: 0.0, pos: [2.75, 1.55, 6.7], look: [-0.42, 1.88, 0] });
  keys.push({ t: 0.04, pos: [2.95, 2.75, 6.85], look: [-0.32, 1.95, 0] });

  const startT = 0.05;
  const endT = 0.86;
  const totalSpan = endT - startT;

  for (let i = 0; i < cards.length; i += 1) {
    const tZoom = startT + totalSpan * ((i + 0.5) / cards.length);
    const tCrawl = startT + totalSpan * ((i + 1) / cards.length);
    const card = cards[i];
    const radius = Math.hypot(card.x, card.z);
    const zoomScale = (radius + 3.05) / Math.max(radius, 0.001);
    const camZoom: [number, number, number] = [
      card.x * zoomScale,
      card.y + 0.12,
      card.z * zoomScale,
    ];

    keys.push({ t: tZoom - 0.035, pos: camZoom, look: [card.x, card.y, card.z] });
    keys.push({ t: tZoom + 0.04, pos: camZoom, look: [card.x, card.y, card.z] });

    if (i < cards.length - 1) {
      const next = cards[i + 1];
      const midX = (card.x + next.x) / 2;
      const midZ = (card.z + next.z) / 2;
      const midY = (card.y + next.y) / 2;
      const midRadius = Math.hypot(midX, midZ);
      const crawlScale = (midRadius + 5.15) / Math.max(midRadius, 0.001);
      const crawlPos: [number, number, number] = [
        midX * crawlScale,
        midY + 0.72,
        midZ * crawlScale,
      ];
      const cabinYAtCrawl = cabinWorldYAt(tCrawl);

      keys.push({ t: tCrawl, pos: crawlPos, look: [0, cabinYAtCrawl + 1.2, 0] });
    }
  }

  keys.push({ t: 0.9, pos: [-3.1, -0.25, 5.2], look: [0, -2.55, 0] });
  keys.push({ t: 0.96, pos: [3.25, -0.05, 5.35], look: [0, -2.65, 0] });
  keys.push({ t: 1.0, pos: [0.65, 0.15, 6.1], look: [0, -2.7, 0] });

  keys.sort((a, b) => a.t - b.t);
  return keys;
}

function cabinWorldYAt(scrollOffset: number): number {
  const cabinProgress = MathUtils.smoothstep(
    MathUtils.clamp(scrollOffset / CABIN_TRAVEL_END_SCROLL, 0, 1),
    0,
    1
  );

  return ELEVATOR_BASE_Y + MathUtils.lerp(CABIN_TOP_Y, CABIN_LANDING_Y, cabinProgress);
}

function sampleKeys(keys: CamKey[], t: number, outPos: Vector3, outLook: Vector3): void {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t < t) i += 1;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const range = Math.max(k1.t - k0.t, 1e-6);
  const segT = (t - k0.t) / range;
  const e = MathUtils.smoothstep(MathUtils.clamp(segT, 0, 1), 0, 1);
  outPos.set(
    MathUtils.lerp(k0.pos[0], k1.pos[0], e),
    MathUtils.lerp(k0.pos[1], k1.pos[1], e),
    MathUtils.lerp(k0.pos[2], k1.pos[2], e)
  );
  outLook.set(
    MathUtils.lerp(k0.look[0], k1.look[0], e),
    MathUtils.lerp(k0.look[1], k1.look[1], e),
    MathUtils.lerp(k0.look[2], k1.look[2], e)
  );
}
