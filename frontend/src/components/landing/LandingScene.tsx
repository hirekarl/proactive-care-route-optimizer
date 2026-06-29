import { PerspectiveCamera, ScrollControls, Sparkles, useScroll } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

import { useMemo, useRef } from "react";

import type { PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { Vector3 } from "three";

import { Elevator3D } from "./Elevator3D";
import { CARD_ORBIT_POSITIONS } from "./cardOrbit";
import { landingScrollState } from "./landingScrollState";

const PAGES = 7;

export function LandingScene() {
  return (
    <Canvas
      dpr={1}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 14, 44]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 4]} intensity={1.0} />
      <pointLight position={[0, 0, 6]} intensity={2.2} color="#38bdf8" />
      <pointLight position={[3, 6, -2]} intensity={1.4} color="#a78bfa" />
      <pointLight position={[-3, -6, 2]} intensity={1.2} color="#f472b6" />

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

  useFrame(() => {
    const offset = scroll.offset;
    landingScrollState.offset = offset;
    if (!cameraRef.current) return;
    cameraPath(offset, camPos, lookTarget);
    cameraRef.current.position.copy(camPos);
    cameraRef.current.lookAt(lookTarget);
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={52}
        position={[0, -6, 4]}
        near={0.1}
        far={120}
      />

      <Elevator3D />

      <Sparkles count={180} size={3} scale={[10, 14, 10]} speed={0.4} color="#7dd3fc" />
      <Sparkles count={90} size={5} scale={[6, 10, 6]} speed={0.6} color="#fbcfe8" opacity={0.7} />
      <Sparkles count={60} size={8} scale={[4, 8, 4]} speed={0.3} color="#fde68a" opacity={0.4} />

      <CardPositionSyncer />
    </>
  );
}

function CardPositionSyncer() {
  const { camera, size } = useThree();
  const orbitVecs = useMemo(
    () => CARD_ORBIT_POSITIONS.map(([x, y, z]) => new Vector3(x, y, z)),
    []
  );
  const tmp = useMemo(() => new Vector3(), []);
  const cameraPos = useMemo(() => new Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    cameraPos.copy(camera.position);
    landingScrollState.cards = orbitVecs.map((basePos, idx) => {
      tmp.set(basePos.x, basePos.y + Math.sin(t * 0.5 + idx) * 0.18, basePos.z);
      const distFromCamera = tmp.distanceTo(cameraPos);
      tmp.project(camera);
      const visible = tmp.z < 1 && tmp.z > -1;
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      const near = 3;
      const far = 16;
      const depthNorm = Math.max(0, Math.min(1, (distFromCamera - near) / (far - near)));
      const scale = lerp(1.15, 0.5, depthNorm);
      const opacity = visible ? lerp(1, 0.25, depthNorm) : 0;
      const zIndex = Math.round(1500 - distFromCamera * 20);
      return { x, y, scale, opacity, visible, depth: distFromCamera, zIndex };
    });
  });

  return null;
}

interface CamKey {
  t: number;
  pos: [number, number, number];
  look: [number, number, number];
}

const CAMERA_KEYS: CamKey[] = [
  { t: 0.0, pos: [0.6, -6.5, 3.2], look: [0, 4.5, 0] },
  { t: 0.08, pos: [1.6, -4.5, 5.5], look: [0, 3.2, 0] },
  { t: 0.18, pos: [4.5, -1.8, 6.2], look: [0, 0.8, 0] },
  { t: 0.28, pos: [7.5, 0.6, 3.5], look: [0, 0.2, 0] },
  { t: 0.4, pos: [6.0, 1.8, -4.5], look: [0, 0.2, 0] },
  { t: 0.5, pos: [0, 3.2, -8.5], look: [0, 0.4, 0] },
  { t: 0.6, pos: [-5.8, 2.0, -4.8], look: [0, 0.2, 0] },
  { t: 0.7, pos: [-7.3, 0.5, 3.6], look: [0, 0.2, 0] },
  { t: 0.82, pos: [-2.4, -0.6, 8.6], look: [0, -0.4, 0] },
  { t: 0.92, pos: [0, -1.5, 6.4], look: [0, -1.4, 0] },
  { t: 1.0, pos: [0, -3.8, 6.0], look: [0, -3.6, 0] },
];

function cameraPath(t: number, outPos: Vector3, outLook: Vector3): void {
  const keys = CAMERA_KEYS;
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t < t) i += 1;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const segT = (t - k0.t) / (k1.t - k0.t);
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
