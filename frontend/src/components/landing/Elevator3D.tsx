import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

import type { RefObject } from "react";
import { useRef } from "react";

import type { Group, MeshStandardMaterial } from "three";
import { DoubleSide } from "three";

type Vec3 = [number, number, number];

const SHAFT_WIDTH = 2.9;
const SHAFT_DEPTH = 2.35;
const SHAFT_HEIGHT = 9.6;
const FLOOR_COUNT = 4;
const TRAVEL_Y = 6.75;
const BLACK = "#050507";
const BLACK_SOFT = "#101014";
const PURPLE = "#7c3aed";
const GLASS = "#12151a";
const SILVER = "#d8dbe0";
const FLOOR = "#d4d1d2";

export function Elevator3D() {
  const scroll = useScroll();
  const cabinRef = useRef<Group>(null);
  const doorRef = useRef<Group>(null);
  const screenMatRef = useRef<MeshStandardMaterial>(null);
  const callButtonRef = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (doorRef.current) {
      const open = (Math.sin(t * 0.38) + 1) / 2;
      doorRef.current.rotation.y = -open * 1.08;
    }
    if (screenMatRef.current) {
      screenMatRef.current.emissiveIntensity = 1.2 + Math.sin(t * 1.1) * 0.18;
    }
    if (callButtonRef.current) {
      callButtonRef.current.emissiveIntensity = 2.6 + Math.sin(t * 2.2) * 0.75;
    }
    if (cabinRef.current) {
      cabinRef.current.position.y = (1 - scroll.offset) * TRAVEL_Y;
    }
  });

  return (
    <group position={[0, -SHAFT_HEIGHT / 2 + 0.15, 0]}>
      <StudioSet />
      <TowerFrame />
      <SmokedGlassPanels />
      <GuideRails />
      <RightBraceFrame />
      <PurpleAccentLights />

      <group ref={cabinRef} position={[0, TRAVEL_Y, 0]}>
        <pointLight
          position={[0, 2.35, 0.45]}
          intensity={7.5}
          color="#ffffff"
          distance={4.8}
          decay={1.8}
        />
        <CabinInterior screenMatRef={screenMatRef} />
        <CabinPortal />
        <HingedGlassDoor doorRef={doorRef} />
      </group>

      <CallPanel buttonMatRef={callButtonRef} />
    </group>
  );
}

function StudioSet() {
  return (
    <group>
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial color="#77717e" metalness={0.05} roughness={0.92} />
      </mesh>
      <mesh position={[3.15, 3.7, -2.05]} rotation={[0, -0.62, 0]}>
        <planeGeometry args={[6.2, 10.4]} />
        <meshStandardMaterial
          color="#211632"
          emissive="#1b0b36"
          emissiveIntensity={0.18}
          roughness={0.82}
          side={DoubleSide}
        />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`wall-seam-${i}`}
          position={[3.16 - i * 0.55, 3.7, -2.02 - i * 0.35]}
          rotation={[0, -0.62, 0]}
        >
          <boxGeometry args={[0.025, 10.2, 0.025]} />
          <meshStandardMaterial
            color="#3a2b52"
            emissive="#31145f"
            emissiveIntensity={0.16}
            roughness={0.7}
          />
        </mesh>
      ))}
      <mesh position={[1.8, 0.01, 2.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.4, 64]} />
        <meshStandardMaterial
          color="#f8f7ff"
          emissive="#ffffff"
          emissiveIntensity={0.26}
          transparent
          opacity={0.34}
        />
      </mesh>
    </group>
  );
}

function TowerFrame() {
  const halfW = SHAFT_WIDTH / 2;
  const halfD = SHAFT_DEPTH / 2;
  const floorSpacing = SHAFT_HEIGHT / FLOOR_COUNT;

  return (
    <group>
      <MetalBox
        position={[-halfW, SHAFT_HEIGHT / 2, halfD]}
        args={[0.26, SHAFT_HEIGHT, 0.22]}
        color={BLACK}
      />
      <MetalBox
        position={[halfW, SHAFT_HEIGHT / 2, halfD]}
        args={[0.26, SHAFT_HEIGHT, 0.22]}
        color={BLACK}
      />
      <MetalBox
        position={[-halfW, SHAFT_HEIGHT / 2, -halfD]}
        args={[0.12, SHAFT_HEIGHT, 0.12]}
        color={BLACK_SOFT}
      />
      <MetalBox
        position={[halfW, SHAFT_HEIGHT / 2, -halfD]}
        args={[0.12, SHAFT_HEIGHT, 0.12]}
        color={BLACK_SOFT}
      />
      <MetalBox
        position={[0, SHAFT_HEIGHT - 0.1, halfD]}
        args={[SHAFT_WIDTH + 0.28, 0.22, 0.22]}
        color={BLACK}
      />
      <MetalBox position={[0, 6.9, halfD]} args={[SHAFT_WIDTH + 0.16, 0.34, 0.2]} color={BLACK} />
      <MetalBox position={[0, 3.88, halfD]} args={[SHAFT_WIDTH + 0.18, 0.42, 0.22]} color={BLACK} />
      <MetalBox position={[0, 0.08, halfD]} args={[SHAFT_WIDTH + 0.22, 0.18, 0.22]} color={BLACK} />

      {Array.from({ length: FLOOR_COUNT + 1 }).map((_, i) => {
        const y = i * floorSpacing;
        return (
          <group key={`floor-frame-${i}`}>
            <MetalBox
              position={[0, y, -halfD]}
              args={[SHAFT_WIDTH, 0.08, 0.1]}
              color={BLACK_SOFT}
            />
            <MetalBox
              position={[-halfW, y, 0]}
              args={[0.08, 0.08, SHAFT_DEPTH]}
              color={BLACK_SOFT}
            />
            <MetalBox
              position={[halfW, y, 0]}
              args={[0.08, 0.08, SHAFT_DEPTH]}
              color={BLACK_SOFT}
            />
            <MetalBox
              position={[0, y, 0]}
              args={[SHAFT_WIDTH - 0.5, 0.055, 0.08]}
              color="#71737a"
              metalness={0.7}
            />
          </group>
        );
      })}
    </group>
  );
}

function SmokedGlassPanels() {
  const halfW = SHAFT_WIDTH / 2;
  const halfD = SHAFT_DEPTH / 2;

  return (
    <group>
      <GlassPane position={[0, 8.05, halfD + 0.012]} args={[2.34, 2.62]} />
      <GlassPane position={[0, 5.32, halfD + 0.012]} args={[2.36, 2.45]} />
      <GlassPane position={[0, 2.08, halfD + 0.014]} args={[2.22, 2.58]} opacity={0.28} />
      <GlassPane
        position={[-halfW - 0.012, 5.55, 0]}
        args={[SHAFT_DEPTH, 7.6]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <GlassPane
        position={[halfW + 0.012, 5.55, 0]}
        args={[SHAFT_DEPTH, 7.6]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <GlassPane
        position={[0, 5.7, -halfD - 0.012]}
        args={[SHAFT_WIDTH - 0.28, 7.4]}
        opacity={0.2}
      />
      <MetalBox position={[0, 8.05, halfD + 0.03]} args={[0.08, 2.56, 0.08]} color="#121216" />
      <MetalBox position={[0, 5.32, halfD + 0.03]} args={[0.08, 2.38, 0.08]} color="#121216" />
    </group>
  );
}

function GuideRails() {
  const railZ = -SHAFT_DEPTH / 2 + 0.35;

  return (
    <group>
      {[-0.48, 0.48].map((x) => (
        <mesh key={`guide-${x}`} position={[x, SHAFT_HEIGHT / 2, railZ]}>
          <cylinderGeometry args={[0.035, 0.035, SHAFT_HEIGHT - 0.5, 24]} />
          <meshStandardMaterial color={SILVER} metalness={0.84} roughness={0.18} />
        </mesh>
      ))}
      {[-0.64, 0.64].map((x) => (
        <mesh key={`dark-guide-${x}`} position={[x, SHAFT_HEIGHT / 2, railZ + 0.08]}>
          <cylinderGeometry args={[0.025, 0.025, SHAFT_HEIGHT - 0.8, 18]} />
          <meshStandardMaterial color="#1b1b20" metalness={0.7} roughness={0.22} />
        </mesh>
      ))}
    </group>
  );
}

function RightBraceFrame() {
  const x = SHAFT_WIDTH / 2 + 0.2;

  return (
    <group>
      <MetalBox
        position={[x, SHAFT_HEIGHT / 2, -0.98]}
        args={[0.08, SHAFT_HEIGHT - 0.2, 0.08]}
        color={SILVER}
      />
      <MetalBox
        position={[x, SHAFT_HEIGHT / 2, 0.92]}
        args={[0.08, SHAFT_HEIGHT - 0.2, 0.08]}
        color={SILVER}
      />
      {Array.from({ length: 5 }).map((_, i) => (
        <MetalBox
          key={`side-rung-${i}`}
          position={[x, 1.05 + i * 1.72, -0.03]}
          args={[0.08, 0.08, 1.9]}
          color={SILVER}
        />
      ))}
      <SideBrace position={[x, 2.0, -0.03]} rotation={0.58} />
      <SideBrace position={[x, 4.8, -0.03]} rotation={-0.58} />
      <SideBrace position={[x, 7.2, -0.03]} rotation={0.58} />
    </group>
  );
}

function PurpleAccentLights() {
  const halfW = SHAFT_WIDTH / 2;
  const halfD = SHAFT_DEPTH / 2;

  return (
    <group>
      <mesh position={[halfW + 0.018, 6.5, halfD + 0.02]}>
        <boxGeometry args={[0.035, 6.2, 0.035]} />
        <meshStandardMaterial
          color={PURPLE}
          emissive={PURPLE}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-halfW + 0.12, 8.95, halfD + 0.04]}>
        <boxGeometry args={[0.36, 0.12, 0.035]} />
        <meshStandardMaterial
          color="#c084fc"
          emissive="#c084fc"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

interface CabinInteriorProps {
  screenMatRef: RefObject<MeshStandardMaterial | null>;
}

function CabinInterior({ screenMatRef }: CabinInteriorProps) {
  const halfW = SHAFT_WIDTH / 2 - 0.42;
  const halfD = SHAFT_DEPTH / 2 - 0.32;
  const displayZ = -halfD + 0.048;

  return (
    <group position={[0, 0.04, 0]}>
      <MetalBox
        position={[0, 0.03, 0]}
        args={[halfW * 2, 0.06, halfD * 2]}
        color={FLOOR}
        metalness={0.05}
        roughness={0.82}
      />
      {Array.from({ length: 8 }).map((_, i) => (
        <MetalBox
          key={`floor-groove-${i}`}
          position={[0, 0.075, -halfD + 0.18 + i * 0.18]}
          args={[halfW * 1.75, 0.012, 0.014]}
          color="#aaa7ab"
          metalness={0.02}
          roughness={0.9}
        />
      ))}
      <MetalBox
        position={[0, 1.32, -halfD]}
        args={[halfW * 2, 2.54, 0.08]}
        color="#4f5055"
        metalness={0.24}
        roughness={0.52}
      />
      <MetalBox
        position={[-halfW, 1.32, 0]}
        args={[0.08, 2.54, halfD * 2]}
        color="#3c3d42"
        metalness={0.35}
        roughness={0.42}
      />
      <MetalBox
        position={[halfW, 1.32, 0]}
        args={[0.08, 2.54, halfD * 2]}
        color="#3c3d42"
        metalness={0.35}
        roughness={0.42}
      />
      <MetalBox
        position={[0, 2.62, 0]}
        args={[halfW * 2, 0.1, halfD * 2]}
        color="#202126"
        metalness={0.4}
        roughness={0.35}
      />
      <mesh position={[0, 2.57, 0.24]}>
        <boxGeometry args={[1.58, 0.035, 0.7]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={6.5}
          toneMapped={false}
        />
      </mesh>

      <MetalBox
        position={[0, 1.25, displayZ]}
        args={[0.46, 2.32, 0.055]}
        color="#5e5f65"
        metalness={0.28}
        roughness={0.42}
      />
      <mesh position={[0, 1.74, displayZ + 0.032]}>
        <planeGeometry args={[0.36, 0.48]} />
        <meshStandardMaterial
          ref={screenMatRef}
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 1.28, displayZ + 0.034]}>
        <planeGeometry args={[0.34, 0.38]} />
        <meshStandardMaterial color="#dbeafe" emissive="#8ec5ff" emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[0, 0.82, displayZ + 0.034]}>
        <planeGeometry args={[0.34, 0.36]} />
        <meshStandardMaterial color="#111217" emissive="#0a0a12" emissiveIntensity={0.35} />
      </mesh>
      {[-0.12, 0, 0.12].map((x) => (
        <mesh key={`control-button-${x}`} position={[x, 0.79, displayZ + 0.04]}>
          <circleGeometry args={[0.027, 24]} />
          <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function CabinPortal() {
  const halfW = SHAFT_WIDTH / 2;
  const frontZ = SHAFT_DEPTH / 2 + 0.025;

  return (
    <group position={[0, 1.36, frontZ]}>
      <MetalBox position={[0, 1.38, 0]} args={[SHAFT_WIDTH * 0.86, 0.16, 0.16]} color={BLACK} />
      <MetalBox position={[0, -1.35, 0]} args={[SHAFT_WIDTH * 0.82, 0.13, 0.14]} color={BLACK} />
      <MetalBox position={[-halfW + 0.24, 0, 0]} args={[0.18, 2.74, 0.16]} color={BLACK} />
      <MetalBox position={[halfW - 0.24, 0, 0]} args={[0.18, 2.74, 0.16]} color={BLACK} />
    </group>
  );
}

interface HingedGlassDoorProps {
  doorRef: RefObject<Group | null>;
}

function HingedGlassDoor({ doorRef }: HingedGlassDoorProps) {
  const hingeX = SHAFT_WIDTH / 2 - 0.28;
  const frontZ = SHAFT_DEPTH / 2 + 0.11;

  return (
    <group ref={doorRef} position={[hingeX, 1.38, frontZ]}>
      <mesh position={[-0.56, 0, 0]}>
        <planeGeometry args={[1.12, 2.62]} />
        <meshStandardMaterial
          color={GLASS}
          transparent
          opacity={0.36}
          metalness={0.32}
          roughness={0.08}
          side={DoubleSide}
        />
      </mesh>
      <MetalBox position={[-0.56, 1.33, 0.01]} args={[1.18, 0.08, 0.08]} color={BLACK} />
      <MetalBox position={[-0.56, -1.33, 0.01]} args={[1.18, 0.08, 0.08]} color={BLACK} />
      <MetalBox position={[-1.13, 0, 0.01]} args={[0.08, 2.66, 0.08]} color={BLACK} />
      <MetalBox position={[0, 0, 0.01]} args={[0.08, 2.66, 0.08]} color={BLACK} />
      <MetalBox
        position={[-1.03, -0.12, 0.08]}
        args={[0.055, 0.72, 0.09]}
        color="#0c0c10"
        metalness={0.82}
        roughness={0.18}
      />
    </group>
  );
}

interface CallPanelProps {
  buttonMatRef: RefObject<MeshStandardMaterial | null>;
}

function CallPanel({ buttonMatRef }: CallPanelProps) {
  const halfW = SHAFT_WIDTH / 2;
  const halfD = SHAFT_DEPTH / 2;

  return (
    <group position={[-halfW - 0.03, 1.2, halfD + 0.08]}>
      <MetalBox position={[0, 0, 0]} args={[0.18, 0.42, 0.06]} color="#0a0a0d" />
      <mesh position={[0, 0.04, 0.04]}>
        <boxGeometry args={[0.12, 0.12, 0.022]} />
        <meshStandardMaterial
          ref={buttonMatRef}
          color="#b66cff"
          emissive="#9d4edd"
          emissiveIntensity={2.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.04, 0.055]}>
        <circleGeometry args={[0.036, 24]} />
        <meshStandardMaterial
          color="#f3e8ff"
          emissive="#ffffff"
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

interface GlassPaneProps {
  position: Vec3;
  args: [number, number];
  rotation?: Vec3;
  opacity?: number;
}

function GlassPane({ position, args, rotation = [0, 0, 0], opacity = 0.24 }: GlassPaneProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={args} />
      <meshStandardMaterial
        color={GLASS}
        transparent
        opacity={opacity}
        metalness={0.55}
        roughness={0.05}
        side={DoubleSide}
      />
    </mesh>
  );
}

interface MetalBoxProps {
  position: Vec3;
  args: Vec3;
  color: string;
  metalness?: number;
  roughness?: number;
}

function MetalBox({ position, args, color, metalness = 0.86, roughness = 0.2 }: MetalBoxProps) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

interface SideBraceProps {
  position: Vec3;
  rotation: number;
}

function SideBrace({ position, rotation }: SideBraceProps) {
  return (
    <mesh position={position} rotation={[rotation, 0, 0]}>
      <boxGeometry args={[0.08, 2.35, 0.08]} />
      <meshStandardMaterial color={SILVER} metalness={0.78} roughness={0.18} />
    </mesh>
  );
}
