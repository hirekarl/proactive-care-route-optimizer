import { PerspectiveCamera, ScrollControls, Sparkles, useScroll } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

import { useMemo, useRef } from "react";

import type { PerspectiveCamera as PerspectiveCameraImpl, Vector3 } from "three";
import { Vector3 as Vector3Impl } from "three";

import { Elevator3D } from "./Elevator3D";
import { CARD_ORBIT_POSITIONS } from "./cardOrbit";
import { landingScrollState } from "./landingScrollState";

const PAGES = 6;

export function LandingScene() {
  return (
    <Canvas
      dpr={1}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 14, 42]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 10, 4]} intensity={1.0} />
      <pointLight position={[0, 0, 6]} intensity={2.2} color="#38bdf8" />
      <pointLight position={[3, 6, -2]} intensity={1.4} color="#a78bfa" />
      <pointLight position={[-3, -6, 2]} intensity={1.2} color="#f472b6" />

      <ScrollControls pages={PAGES} damping={0.18}>
        <ScrollableScene />
      </ScrollControls>
    </Canvas>
  );
}

function ScrollableScene() {
  const scroll = useScroll();
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const lookTarget = useMemo(() => new Vector3Impl(0, 0, 0), []);

  useFrame(() => {
    const offset = scroll.offset;
    landingScrollState.offset = offset;
    if (!cameraRef.current) return;
    const pos = cameraPath(offset);
    cameraRef.current.position.set(pos.x, pos.y, pos.z);
    lookTarget.set(0, lerp(4, -4, smoother(offset)), 0);
    cameraRef.current.lookAt(lookTarget);
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={55}
        position={[0, 8, 9]}
        near={0.1}
        far={100}
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
    () => CARD_ORBIT_POSITIONS.map(([x, y, z]) => new Vector3Impl(x, y, z)),
    []
  );
  const tmp = useMemo(() => new Vector3Impl(), []);
  const cameraPos = useMemo(() => new Vector3Impl(), []);

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
      const near = 4;
      const far = 18;
      const depthNorm = Math.max(0, Math.min(1, (distFromCamera - near) / (far - near)));
      const scale = lerp(1.05, 0.55, depthNorm);
      const opacity = visible ? lerp(1, 0.25, depthNorm) : 0;
      const zIndex = Math.round(1000 - distFromCamera * 10);
      return { x, y, scale, opacity, visible, depth: distFromCamera, zIndex };
    });
  });

  return null;
}

function cameraPath(t: number): Vector3 {
  const s = smoother(t);
  const angle = s * Math.PI * 2.5;
  const radius = lerp(8.5, 5.5, s) - Math.sin(s * Math.PI) * 1.2;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const y = lerp(8.5, -7.5, s);
  return new Vector3Impl(x, y, z);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoother(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
