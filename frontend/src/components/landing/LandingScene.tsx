import { PerspectiveCamera, ScrollControls, Sparkles, useScroll } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

import { useMemo, useRef } from "react";

import type { PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { Raycaster, Vector3 } from "three";

import { Elevator3D } from "./Elevator3D";
import { CARD_ORBIT_POSITIONS } from "./cardOrbit";
import { elevatorRef } from "./elevatorRef";
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
      <fog attach="fog" args={["#020617", 16, 48]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 4]} intensity={0.9} />
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
  const lookTarget = useMemo(() => new Vector3(0, 0, 0), []);
  const camPos = useMemo(() => new Vector3(), []);
  const orbitVecs = useMemo(
    () => CARD_ORBIT_POSITIONS.map(([x, y, z]) => new Vector3(x, y, z)),
    []
  );

  useFrame(() => {
    const offset = scroll.offset;
    landingScrollState.offset = offset;
    landingScrollState.carouselAngle = computeCarouselAngle(offset);

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
        fov={48}
        position={[0, 1.2, 13]}
        near={0.1}
        far={120}
      />

      <Elevator3D />

      <Sparkles count={180} size={3} scale={[10, 14, 10]} speed={0.4} color="#7dd3fc" />
      <Sparkles count={90} size={5} scale={[6, 10, 6]} speed={0.6} color="#fbcfe8" opacity={0.7} />
      <Sparkles count={60} size={8} scale={[4, 8, 4]} speed={0.3} color="#fde68a" opacity={0.4} />

      <CardPositionSyncer orbitVecs={orbitVecs} />
    </>
  );
}

interface SyncerProps {
  orbitVecs: Vector3[];
}

function CardPositionSyncer({ orbitVecs }: SyncerProps) {
  const { camera, size } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const tmp = useMemo(() => new Vector3(), []);
  const rayDir = useMemo(() => new Vector3(), []);
  const cameraPos = useMemo(() => new Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const carouselAngle = landingScrollState.carouselAngle;
    const cos = Math.cos(carouselAngle);
    const sin = Math.sin(carouselAngle);
    cameraPos.copy(camera.position);
    const elev = elevatorRef.current;

    landingScrollState.cards = orbitVecs.map((basePos, idx) => {
      const rx = basePos.x * cos - basePos.z * sin;
      const rz = basePos.x * sin + basePos.z * cos;
      const bob = Math.sin(t * 0.5 + idx) * 0.18;
      tmp.set(rx, basePos.y + bob, rz);

      const distFromCamera = tmp.distanceTo(cameraPos);

      let occluded = false;
      if (elev) {
        rayDir.copy(tmp).sub(cameraPos).normalize();
        raycaster.set(cameraPos, rayDir);
        raycaster.far = distFromCamera;
        const hits = raycaster.intersectObject(elev, true);
        const blocker = hits.find((h) => h.distance < distFromCamera - 0.3);
        if (blocker) occluded = true;
      }

      const cardWorldAngle = Math.atan2(rx, rz);
      let tiltRad = cardWorldAngle;
      if (tiltRad > Math.PI) tiltRad -= Math.PI * 2;
      if (tiltRad < -Math.PI) tiltRad += Math.PI * 2;
      const tiltDeg = (-(tiltRad * 180) / Math.PI) * 0.7;

      const featured = Math.max(0, Math.cos(cardWorldAngle));

      tmp.project(camera);
      const inFrustum = tmp.z < 1 && tmp.z > -1;
      const facingAway = Math.cos(cardWorldAngle) < -0.15;
      const visible = inFrustum && !occluded && !facingAway;
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;

      const near = 4;
      const far = 14;
      const depthNorm = Math.max(0, Math.min(1, (distFromCamera - near) / (far - near)));
      const baseScale = lerp(1.25, 0.55, depthNorm);
      const scale = baseScale * lerp(0.85, 1.05, featured);
      const opacity = visible ? lerp(0.55, 1.0, featured) * lerp(1, 0.6, depthNorm) : 0;
      const zIndex = Math.round(2000 - distFromCamera * 30);
      return { x, y, scale, opacity, visible, depth: distFromCamera, zIndex, tiltDeg, featured };
    });
  });

  return null;
}

function cameraPath(t: number, outPos: Vector3, outLook: Vector3): void {
  const INTRO_END = 0.06;
  const OUTRO_START = 0.92;

  if (t <= INTRO_END) {
    const p = smoothstep(t / INTRO_END);
    outPos.set(0, lerp(10, 1.2, p), lerp(15, 13, p));
    outLook.set(0, lerp(2.5, 0.3, p), 0);
    return;
  }

  if (t >= OUTRO_START) {
    const p = smoothstep((t - OUTRO_START) / (1 - OUTRO_START));
    outPos.set(0, lerp(1.2, -5.5, p), lerp(13, 8.5, p));
    outLook.set(0, lerp(0.3, -3.5, p), 0);
    return;
  }

  const mainT = (t - INTRO_END) / (OUTRO_START - INTRO_END);
  const bob = Math.sin(mainT * Math.PI * 2) * 0.25;
  outPos.set(Math.sin(mainT * Math.PI * 2) * 0.4, 1.2 + bob, 13 - Math.sin(mainT * Math.PI) * 0.8);
  outLook.set(0, 0.2, 0);
}

function computeCarouselAngle(t: number): number {
  const INTRO_END = 0.06;
  const OUTRO_START = 0.92;
  if (t <= INTRO_END) return 0;
  if (t >= OUTRO_START) return Math.PI * 2;
  const mainT = (t - INTRO_END) / (OUTRO_START - INTRO_END);
  return easeInOutSine(mainT) * Math.PI * 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
