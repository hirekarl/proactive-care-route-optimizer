import { PerspectiveCamera, ScrollControls, Sparkles, useScroll } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

import { useMemo, useRef } from "react";

import type { PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { Vector3 } from "three";

import { Elevator3D } from "./Elevator3D";
import { CARD_ORBIT_POSITIONS } from "./cardOrbit";
import { landingScrollState } from "./landingScrollState";

const PAGES = 8;

export function LandingScene() {
  return (
    <Canvas
      dpr={1}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#06030f"]} />
      <fog attach="fog" args={["#06030f", 14, 50]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 12, 4]} intensity={0.7} color="#f5f0ff" />
      <pointLight position={[-8, 4, -2]} intensity={3.0} color="#7c3aed" />
      <pointLight position={[8, 6, 2]} intensity={2.2} color="#a78bfa" />
      <pointLight position={[0, -2, 8]} intensity={1.4} color="#c4b5fd" />
      <pointLight position={[0, 9, 0]} intensity={1.6} color="#e9d5ff" />

      <ScrollControls pages={PAGES} damping={0.22}>
        <ScrollableScene />
      </ScrollControls>
    </Canvas>
  );
}

function ScrollableScene() {
  const scroll = useScroll();
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const camPos = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const cardVecs = useMemo(() => CARD_ORBIT_POSITIONS.map(([x, y, z]) => new Vector3(x, y, z)), []);
  const keys = useMemo(() => buildKeyframes(cardVecs), [cardVecs]);

  useFrame(() => {
    const offset = scroll.offset;
    landingScrollState.offset = offset;
    if (!cameraRef.current) return;
    sampleKeys(keys, offset, camPos, lookTarget);
    cameraRef.current.position.copy(camPos);
    cameraRef.current.lookAt(lookTarget);
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={48}
        position={[0, 9, 5]}
        near={0.1}
        far={140}
      />

      <Elevator3D />

      <Sparkles count={160} size={3} scale={[14, 18, 14]} speed={0.4} color="#c4b5fd" />
      <Sparkles count={80} size={5} scale={[8, 12, 8]} speed={0.6} color="#f0abfc" opacity={0.7} />
      <Sparkles count={50} size={8} scale={[5, 9, 5]} speed={0.3} color="#fde68a" opacity={0.35} />

      <CardPositionSyncer cardVecs={cardVecs} />
    </>
  );
}

interface SyncerProps {
  cardVecs: Vector3[];
}

function CardPositionSyncer({ cardVecs }: SyncerProps) {
  const { camera, size } = useThree();
  const tmp = useMemo(() => new Vector3(), []);
  const cameraPos = useMemo(() => new Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    cameraPos.copy(camera.position);
    landingScrollState.cards = cardVecs.map((basePos, idx) => {
      tmp.set(basePos.x, basePos.y + Math.sin(t * 0.5 + idx) * 0.18, basePos.z);
      const distFromCamera = tmp.distanceTo(cameraPos);
      tmp.project(camera);
      const inFrustum = tmp.z < 1 && tmp.z > -1;
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      const near = 2.5;
      const far = 16;
      const depthNorm = Math.max(0, Math.min(1, (distFromCamera - near) / (far - near)));
      const scale = lerp(1.35, 0.45, depthNorm);
      const opacity = inFrustum ? lerp(1, 0.2, depthNorm) : 0;
      const zIndex = Math.round(1500 - distFromCamera * 25);
      return {
        x,
        y,
        scale,
        opacity,
        visible: inFrustum,
        depth: distFromCamera,
        zIndex,
      };
    });
  });

  return null;
}

interface CamKey {
  t: number;
  pos: [number, number, number];
  look: [number, number, number];
}

function buildKeyframes(cards: Vector3[]): CamKey[] {
  const keys: CamKey[] = [];

  keys.push({ t: 0.0, pos: [0, 9.0, 4.5], look: [0, 5.5, 0] });
  keys.push({ t: 0.05, pos: [1.6, 7.5, 5.5], look: [0, 4.8, 0] });

  const N = cards.length;
  const startT = 0.05;
  const endT = 0.86;
  const totalSpan = endT - startT;

  for (let i = 0; i < N; i += 1) {
    const tZoom = startT + totalSpan * ((i + 0.5) / N);
    const tCrawl = startT + totalSpan * ((i + 1) / N);
    const c = cards[i];
    const r = Math.hypot(c.x, c.z);
    const zoomScale = (r + 2.0) / Math.max(r, 0.001);
    const camZoom: [number, number, number] = [c.x * zoomScale, c.y + 0.35, c.z * zoomScale];
    keys.push({ t: tZoom, pos: camZoom, look: [c.x, c.y, c.z] });

    if (i < N - 1) {
      const next = cards[i + 1];
      const midX = (c.x + next.x) / 2;
      const midZ = (c.z + next.z) / 2;
      const midY = (c.y + next.y) / 2;
      const midR = Math.hypot(midX, midZ);
      const crawlScale = (midR + 6.5) / Math.max(midR, 0.001);
      const crawlPos: [number, number, number] = [midX * crawlScale, midY + 1.0, midZ * crawlScale];
      keys.push({ t: tCrawl, pos: crawlPos, look: [0, midY, 0] });
    }
  }

  keys.push({ t: 0.93, pos: [0.6, -5.0, 3.5], look: [0, 3.0, 0] });
  keys.push({ t: 1.0, pos: [0.6, -6.5, 3.2], look: [0, 4.5, 0] });

  keys.sort((a, b) => a.t - b.t);
  return keys;
}

function sampleKeys(keys: CamKey[], t: number, outPos: Vector3, outLook: Vector3): void {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t < t) i += 1;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const range = Math.max(k1.t - k0.t, 1e-6);
  const segT = (t - k0.t) / range;
  const e = smoothstep(Math.max(0, Math.min(1, segT)));
  outPos.set(
    lerp(k0.pos[0], k1.pos[0], e),
    lerp(k0.pos[1], k1.pos[1], e),
    lerp(k0.pos[2], k1.pos[2], e)
  );
  outLook.set(
    lerp(k0.look[0], k1.look[0], e),
    lerp(k0.look[1], k1.look[1], e),
    lerp(k0.look[2], k1.look[2], e)
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
