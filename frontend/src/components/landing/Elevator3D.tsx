import { useFrame } from "@react-three/fiber";

import { useRef } from "react";

import type { Group, MeshStandardMaterial } from "three";
import { DoubleSide } from "three";

const SHAFT_WIDTH = 2.8;
const SHAFT_DEPTH = 2.4;
const SHAFT_HEIGHT = 9.0;
const FLOOR_COUNT = 4;
const FRAME_THICKNESS = 0.07;
const FRAME_COLOR = "#0a0a0c";
const GLASS_COLOR = "#1a1f2e";

export function Elevator3D() {
  const doorRef = useRef<Group>(null);
  const screenMatRef = useRef<MeshStandardMaterial>(null);
  const callButtonRef = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (doorRef.current) {
      const open = (Math.sin(t * 0.45) + 1) / 2;
      doorRef.current.rotation.y = -open * 1.05;
    }
    if (screenMatRef.current) {
      screenMatRef.current.emissiveIntensity = 1.6 + Math.sin(t * 1.2) * 0.2;
    }
    if (callButtonRef.current) {
      callButtonRef.current.emissiveIntensity = 1.8 + Math.sin(t * 2.5) * 0.6;
    }
  });

  return (
    <group position={[0, -SHAFT_HEIGHT / 2 + 0.2, 0]}>
      <GroundPlane />
      <ShaftFrame />
      <GlassWalls />
      <FloorPanels />
      <CabinInterior screenMatRef={screenMatRef} />
      <CabinDoorFrame />
      <group ref={doorRef} position={[SHAFT_WIDTH / 2 - 0.03, 1.4, SHAFT_DEPTH / 2 + 0.01]}>
        <mesh position={[-0.85, 0, 0]}>
          <boxGeometry args={[1.7, 2.6, 0.04]} />
          <meshStandardMaterial
            color={GLASS_COLOR}
            transparent
            opacity={0.35}
            metalness={0.2}
            roughness={0.05}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[-1.6, 0, 0.02]}>
          <boxGeometry args={[0.04, 2.6, 0.06]} />
          <meshStandardMaterial color={FRAME_COLOR} metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[-1.5, 0, 0.05]}>
          <boxGeometry args={[0.12, 0.18, 0.06]} />
          <meshStandardMaterial color="#1c1c20" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      <CallPanel buttonMatRef={callButtonRef} />
    </group>
  );
}

function GroundPlane() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#0f0a18" metalness={0.55} roughness={0.4} />
    </mesh>
  );
}

function ShaftFrame() {
  const halfW = SHAFT_WIDTH / 2;
  const halfD = SHAFT_DEPTH / 2;
  const corners: [number, number][] = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [halfW, halfD],
  ];
  const floorSpacing = SHAFT_HEIGHT / FLOOR_COUNT;
  return (
    <group>
      {corners.map(([x, z], i) => (
        <mesh key={`corner-${i}`} position={[x, SHAFT_HEIGHT / 2, z]}>
          <boxGeometry args={[FRAME_THICKNESS, SHAFT_HEIGHT, FRAME_THICKNESS]} />
          <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: FLOOR_COUNT + 1 }).map((_, i) => {
        const y = i * floorSpacing;
        return (
          <group key={`hframe-${i}`}>
            <mesh position={[0, y, -halfD]}>
              <boxGeometry args={[SHAFT_WIDTH, FRAME_THICKNESS, FRAME_THICKNESS]} />
              <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, y, halfD]}>
              <boxGeometry args={[SHAFT_WIDTH, FRAME_THICKNESS, FRAME_THICKNESS]} />
              <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[-halfW, y, 0]}>
              <boxGeometry args={[FRAME_THICKNESS, FRAME_THICKNESS, SHAFT_DEPTH]} />
              <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[halfW, y, 0]}>
              <boxGeometry args={[FRAME_THICKNESS, FRAME_THICKNESS, SHAFT_DEPTH]} />
              <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, SHAFT_HEIGHT + 0.04, 0]}>
        <boxGeometry args={[SHAFT_WIDTH + 0.1, 0.08, SHAFT_DEPTH + 0.1]} />
        <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function GlassWalls() {
  const halfW = SHAFT_WIDTH / 2;
  const halfD = SHAFT_DEPTH / 2;
  return (
    <group>
      <mesh position={[0, SHAFT_HEIGHT / 2, -halfD]}>
        <planeGeometry args={[SHAFT_WIDTH, SHAFT_HEIGHT]} />
        <meshStandardMaterial
          color={GLASS_COLOR}
          transparent
          opacity={0.18}
          metalness={0.2}
          roughness={0.05}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[-halfW, SHAFT_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SHAFT_DEPTH, SHAFT_HEIGHT]} />
        <meshStandardMaterial
          color={GLASS_COLOR}
          transparent
          opacity={0.18}
          metalness={0.2}
          roughness={0.05}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[halfW, SHAFT_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[SHAFT_DEPTH, SHAFT_HEIGHT]} />
        <meshStandardMaterial
          color={GLASS_COLOR}
          transparent
          opacity={0.18}
          metalness={0.2}
          roughness={0.05}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, SHAFT_HEIGHT * 0.78, halfD]}>
        <planeGeometry args={[SHAFT_WIDTH, SHAFT_HEIGHT * 0.44]} />
        <meshStandardMaterial
          color={GLASS_COLOR}
          transparent
          opacity={0.18}
          metalness={0.2}
          roughness={0.05}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function FloorPanels() {
  const halfW = SHAFT_WIDTH / 2 - FRAME_THICKNESS;
  const halfD = SHAFT_DEPTH / 2 - FRAME_THICKNESS;
  const floorSpacing = SHAFT_HEIGHT / FLOOR_COUNT;
  return (
    <group>
      {Array.from({ length: FLOOR_COUNT + 1 }).map((_, i) => (
        <mesh key={`floor-${i}`} position={[0, i * floorSpacing, 0]}>
          <boxGeometry args={[halfW * 2, 0.04, halfD * 2]} />
          <meshStandardMaterial color="#15151a" metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

interface CabinInteriorProps {
  screenMatRef: React.RefObject<MeshStandardMaterial | null>;
}

function CabinInterior({ screenMatRef }: CabinInteriorProps) {
  const halfW = SHAFT_WIDTH / 2 - FRAME_THICKNESS - 0.02;
  const halfD = SHAFT_DEPTH / 2 - FRAME_THICKNESS - 0.02;
  return (
    <group position={[0, 0.04, 0]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[halfW * 2 * 0.95, 0.03, halfD * 2 * 0.95]} />
        <meshStandardMaterial color="#d8d0c0" metalness={0.1} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[halfW * 1.5, 0.05, halfD * 1.4]} />
        <meshStandardMaterial
          color="#fff8e0"
          emissive="#fff8e0"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-halfW + 0.03, 1.45, 0.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.42, 0.78]} />
        <meshStandardMaterial color="#0a0a10" />
      </mesh>
      <mesh position={[-halfW + 0.035, 1.45, 0.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.36, 0.7]} />
        <meshStandardMaterial
          ref={screenMatRef}
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[halfW * 0.55, 0.05, -halfD + 0.02]}>
        <boxGeometry args={[halfW * 0.5, 0.06, 0.4]} />
        <meshStandardMaterial color="#1f1f23" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function CabinDoorFrame() {
  const halfW = SHAFT_WIDTH / 2;
  return (
    <group position={[0, 1.4, SHAFT_DEPTH / 2]}>
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[SHAFT_WIDTH * 0.92, 0.08, 0.12]} />
        <meshStandardMaterial color="#dcd6c4" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[-halfW + 0.06, 0, 0]}>
        <boxGeometry args={[0.08, 2.6, 0.12]} />
        <meshStandardMaterial color={FRAME_COLOR} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

interface CallPanelProps {
  buttonMatRef: React.RefObject<MeshStandardMaterial | null>;
}

function CallPanel({ buttonMatRef }: CallPanelProps) {
  return (
    <group position={[SHAFT_WIDTH / 2 + 0.05, 1.2, SHAFT_DEPTH / 2 + 0.01]}>
      <mesh>
        <boxGeometry args={[0.12, 0.32, 0.04]} />
        <meshStandardMaterial color="#0c0c10" metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0.025]}>
        <circleGeometry args={[0.04, 24]} />
        <meshStandardMaterial
          ref={buttonMatRef}
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
