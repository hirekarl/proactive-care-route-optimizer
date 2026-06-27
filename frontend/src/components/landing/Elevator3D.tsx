import { useFrame } from "@react-three/fiber";

import { useRef } from "react";

import type { Group, MeshStandardMaterial } from "three";

export function Elevator3D() {
  const cabinRef = useRef<Group>(null);
  const doorLeftRef = useRef<Group>(null);
  const doorRightRef = useRef<Group>(null);
  const glowMatRef = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (cabinRef.current) {
      cabinRef.current.position.y = Math.sin(t * 0.6) * 0.15;
    }
    const doorPulse = (Math.sin(t * 0.8) + 1) / 2;
    if (doorLeftRef.current) doorLeftRef.current.position.x = -0.55 - doorPulse * 0.35;
    if (doorRightRef.current) doorRightRef.current.position.x = 0.55 + doorPulse * 0.35;
    if (glowMatRef.current) {
      glowMatRef.current.emissiveIntensity = 1.2 + Math.sin(t * 1.5) * 0.4;
    }
  });

  return (
    <group>
      <ElevatorShaft />
      <group ref={cabinRef}>
        <ElevatorCabin />
        <group ref={doorLeftRef} position={[-0.55, 0, 1.01]}>
          <mesh>
            <boxGeometry args={[1.1, 2.6, 0.06]} />
            <meshStandardMaterial
              color="#0f172a"
              metalness={0.85}
              roughness={0.18}
              envMapIntensity={1.4}
            />
          </mesh>
        </group>
        <group ref={doorRightRef} position={[0.55, 0, 1.01]}>
          <mesh>
            <boxGeometry args={[1.1, 2.6, 0.06]} />
            <meshStandardMaterial
              color="#0f172a"
              metalness={0.85}
              roughness={0.18}
              envMapIntensity={1.4}
            />
          </mesh>
        </group>
        <mesh position={[0, 0, 0.5]}>
          <planeGeometry args={[2, 2.4]} />
          <meshStandardMaterial
            ref={glowMatRef}
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      </group>
      <FloorIndicator />
      <CablePair />
    </group>
  );
}

function ElevatorShaft() {
  return (
    <group>
      <mesh position={[-1.6, 0, 0]}>
        <boxGeometry args={[0.15, 8, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[1.6, 0, 0]}>
        <boxGeometry args={[0.15, 8, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, -1.1]}>
        <boxGeometry args={[3.35, 8, 0.1]} />
        <meshStandardMaterial color="#0b1220" metalness={0.4} roughness={0.55} />
      </mesh>
      <mesh position={[0, 4.05, 0]}>
        <boxGeometry args={[3.6, 0.2, 2.4]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -4.05, 0]}>
        <boxGeometry args={[3.6, 0.2, 2.4]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function ElevatorCabin() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[2.4, 2.8, 2]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.7}
          roughness={0.25}
          envMapIntensity={1.5}
        />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[2.1, 0.05, 1.7]} />
        <meshStandardMaterial
          color="#fef9c3"
          emissive="#fde68a"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[2.2, 0.08, 1.8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

function FloorIndicator() {
  return (
    <group position={[0, 1.7, 1.02]}>
      <mesh>
        <boxGeometry args={[0.5, 0.2, 0.04]} />
        <meshStandardMaterial color="#020617" />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.45, 0.16]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function CablePair() {
  return (
    <group>
      <mesh position={[-0.5, 3, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 2, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0.5, 3, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 2, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}
