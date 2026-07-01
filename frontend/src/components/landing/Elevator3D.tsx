import { Html, MeshReflectorMaterial, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";

import type { RefObject } from "react";
import { useMemo, useRef, useState } from "react";

import type { Group, MeshStandardMaterial } from "three";
import {
  AdditiveBlending,
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  LinearFilter,
  MathUtils,
  SRGBColorSpace,
} from "three";

import { CABIN_TOP_Y, cabinLocalYAt } from "./landingFloors";
import { landingScrollState } from "./landingScrollState";

type Vec3 = [number, number, number];

const SHAFT_WIDTH = 2.9;
const SHAFT_DEPTH = 2.35;
const SHAFT_HEIGHT = 9.6;
const FLOOR_COUNT = 6;
const BLACK = "#0a0a0e";
const BLACK_SOFT = "#17171d";
const PURPLE = "#7c3aed";
const GLASS = "#12151a";
const SILVER = "#d8dbe0";

export function Elevator3D() {
  const scroll = useScroll();
  const cabinRef = useRef<Group>(null);
  const leftDoorRef = useRef<Group>(null);
  const rightDoorRef = useRef<Group>(null);
  const screenMatRef = useRef<MeshStandardMaterial>(null);
  const [doorsOpen, setDoorsOpen] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    const isAtBottom = scroll.offset > 0.975;
    if (isAtBottom !== doorsOpen) {
      setDoorsOpen(isAtBottom);
    }

    const targetOpen = doorsOpen ? 1.12 : 0;
    let currentOpen = 0;
    if (leftDoorRef.current) {
      leftDoorRef.current.rotation.y = MathUtils.lerp(
        leftDoorRef.current.rotation.y,
        targetOpen,
        0.08 // slightly slower majestic door opening
      );
      currentOpen = leftDoorRef.current.rotation.y;
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.rotation.y = MathUtils.lerp(
        rightDoorRef.current.rotation.y,
        -targetOpen,
        0.08
      );
    }

    landingScrollState.doorsOpenProgress = Math.max(0, Math.min(1, currentOpen / 1.12));

    if (screenMatRef.current) {
      screenMatRef.current.emissiveIntensity = 1.2 + Math.sin(t * 1.1) * 0.18;
    }
    if (cabinRef.current) {
      cabinRef.current.position.y = cabinLocalYAt(scroll.offset);
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

      <group ref={cabinRef} position={[0, CABIN_TOP_Y, 0]}>
        <pointLight
          position={[0, 2.35, 0.45]}
          intensity={10.8}
          color="#ffffff"
          distance={5.4}
          decay={1.8}
        />
        <CabinInterior screenMatRef={screenMatRef} />
        <CabinPortal />
        <DoubleHingedGlassDoors
          leftDoorRef={leftDoorRef}
          rightDoorRef={rightDoorRef}
          onToggle={() => setDoorsOpen((open) => !open)}
        />
      </group>

      <CallPanel />
    </group>
  );
}

function StudioSet() {
  const { alphaMap, colorMap } = useMemo(createGroundMaps, []);
  const floorVeins = [
    [-5.2, -2.7, 0.18, 8.4],
    [-3.1, 1.2, -0.22, 7.2],
    [-0.8, -3.4, 0.11, 6.8],
    [1.7, 2.7, -0.18, 8.8],
    [4.1, -1.1, 0.24, 7.4],
    [5.5, 3.8, -0.2, 5.4],
  ];

  return (
    <group>
      <mesh position={[0, -0.09, 1.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[42, 256]} />
        <MeshReflectorMaterial
          map={colorMap}
          alphaMap={alphaMap}
          color="#b2abba"
          transparent
          opacity={0.98}
          metalness={0.52}
          roughness={0.44}
          emissive="#302342"
          emissiveIntensity={0.28}
          blur={[860, 280]}
          mixBlur={1.28}
          mixStrength={0.78}
          mixContrast={1.02}
          mirror={0.39}
          depthScale={0.52}
          minDepthThreshold={0.36}
          maxDepthThreshold={1.65}
          reflectorOffset={0.018}
        />
      </mesh>
      <pointLight position={[-3.2, 0.22, 3.4]} intensity={3.8} color="#8b5cf6" distance={8.4} />
      <pointLight position={[3.6, 0.24, 4.2]} intensity={2.8} color="#d7d2df" distance={7.2} />
      <mesh
        position={[-3.1, -0.052, 2.55]}
        rotation={[-Math.PI / 2, 0, -0.08]}
        scale={[1.34, 0.58, 1]}
      >
        <circleGeometry args={[8.2, 128]} />
        <meshBasicMaterial
          alphaMap={alphaMap}
          color="#8b5cf6"
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh position={[3.2, -0.049, 3.45]} rotation={[-Math.PI / 2, 0, 0.2]} scale={[1.5, 0.62, 1]}>
        <circleGeometry args={[5.2, 128]} />
        <meshBasicMaterial
          alphaMap={alphaMap}
          color="#d7d2df"
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh
        position={[0.2, -0.047, -2.45]}
        rotation={[-Math.PI / 2, 0, -0.04]}
        scale={[1.65, 0.74, 1]}
      >
        <circleGeometry args={[6.5, 128]} />
        <meshBasicMaterial
          alphaMap={alphaMap}
          color="#4c2d74"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {floorVeins.map(([x, z, angle, length], i) => (
        <mesh
          key={`floor-vein-${i}`}
          position={[x, -0.038 + i * 0.001, z]}
          rotation={[-Math.PI / 2, 0, angle]}
        >
          <planeGeometry args={[length, 0.026]} />
          <meshBasicMaterial
            color="#e6e1f2"
            transparent
            opacity={0.09}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function createGroundMaps() {
  const size = 512;
  const colorCanvas = document.createElement("canvas");
  const alphaCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  alphaCanvas.width = size;
  alphaCanvas.height = size;

  const colorContext = colorCanvas.getContext("2d");
  const alphaContext = alphaCanvas.getContext("2d");

  if (colorContext) {
    const base = colorContext.createRadialGradient(
      size * 0.5,
      size * 0.54,
      size * 0.04,
      size * 0.5,
      size * 0.54,
      size * 0.64
    );
    base.addColorStop(0, "#9a95a4");
    base.addColorStop(0.36, "#6d6678");
    base.addColorStop(0.72, "#2b2634");
    base.addColorStop(1, "#06050a");
    colorContext.fillStyle = base;
    colorContext.fillRect(0, 0, size, size);

    colorContext.globalCompositeOperation = "screen";
    const purple = colorContext.createRadialGradient(
      size * 0.28,
      size * 0.58,
      0,
      size * 0.28,
      size * 0.58,
      size * 0.42
    );
    purple.addColorStop(0, "rgba(139, 92, 246, 0.82)");
    purple.addColorStop(0.44, "rgba(91, 55, 164, 0.34)");
    purple.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorContext.fillStyle = purple;
    colorContext.fillRect(0, 0, size, size);

    const silver = colorContext.createRadialGradient(
      size * 0.72,
      size * 0.44,
      0,
      size * 0.72,
      size * 0.44,
      size * 0.36
    );
    silver.addColorStop(0, "rgba(235, 231, 242, 0.7)");
    silver.addColorStop(0.46, "rgba(130, 125, 143, 0.24)");
    silver.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorContext.fillStyle = silver;
    colorContext.fillRect(0, 0, size, size);

    const sheen = colorContext.createLinearGradient(
      size * 0.2,
      size * 0.7,
      size * 0.85,
      size * 0.3
    );
    sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
    sheen.addColorStop(0.48, "rgba(255, 255, 255, 0.2)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
    colorContext.fillStyle = sheen;
    colorContext.fillRect(0, 0, size, size);
  }

  if (alphaContext) {
    const alpha = alphaContext.createRadialGradient(
      size * 0.5,
      size * 0.54,
      size * 0.02,
      size * 0.5,
      size * 0.54,
      size * 0.58
    );
    alpha.addColorStop(0, "#ffffff");
    alpha.addColorStop(0.5, "#eeeeee");
    alpha.addColorStop(0.78, "#777777");
    alpha.addColorStop(1, "#000000");
    alphaContext.fillStyle = alpha;
    alphaContext.fillRect(0, 0, size, size);
  }

  const colorMap = new CanvasTexture(colorCanvas);
  colorMap.colorSpace = SRGBColorSpace;
  const alphaMap = new CanvasTexture(alphaCanvas);
  [colorMap, alphaMap].forEach((texture) => {
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    texture.needsUpdate = true;
  });

  return { alphaMap, colorMap };
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
        <boxGeometry args={[0.035, 7.2, 0.035]} />
        <meshStandardMaterial
          color={PURPLE}
          emissive={PURPLE}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-halfW - 0.016, 4.8, halfD + 0.025]}>
        <boxGeometry args={[0.026, 6.7, 0.026]} />
        <meshStandardMaterial
          color="#c084fc"
          emissive="#a855f7"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 6.9, halfD + 0.04]}>
        <boxGeometry args={[SHAFT_WIDTH * 0.75, 0.035, 0.025]} />
        <meshStandardMaterial
          color="#f5f3ff"
          emissive="#ffffff"
          emissiveIntensity={1.35}
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
  const panelX = halfW - 0.34;

  return (
    <group position={[0, 0.04, 0]}>
      <MetalBox
        position={[0, 0.03, 0]}
        args={[halfW * 2, 0.06, halfD * 2]}
        color="#e6e3df"
        metalness={0.05}
        roughness={0.74}
      />
      {Array.from({ length: 11 }).map((_, i) => (
        <MetalBox
          key={`floor-groove-${i}`}
          position={[0, 0.075, -halfD + 0.11 + i * 0.14]}
          args={[halfW * 1.82, 0.012, 0.012]}
          color="#aaa7ab"
          metalness={0.02}
          roughness={0.9}
        />
      ))}
      <MetalBox
        position={[0, 1.32, -halfD]}
        args={[halfW * 2, 2.54, 0.08]}
        color="#66696a"
        metalness={0.24}
        roughness={0.42}
      />
      <MetalBox
        position={[-halfW, 1.32, 0]}
        args={[0.08, 2.54, halfD * 2]}
        color="#55585a"
        metalness={0.35}
        roughness={0.42}
      />
      <MetalBox
        position={[halfW, 1.32, 0]}
        args={[0.08, 2.54, halfD * 2]}
        color="#55585a"
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
        <boxGeometry args={[1.46, 0.035, 0.62]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={8.5}
          toneMapped={false}
        />
      </mesh>
      {[-0.58, 0.58].map((x) => (
        <MetalBox
          key={`interior-rib-${x}`}
          position={[x, 1.34, displayZ + 0.025]}
          args={[0.052, 2.18, 0.05]}
          color="#babdc2"
          metalness={0.76}
          roughness={0.18}
        />
      ))}

      <MetalBox
        position={[panelX, 1.22, displayZ]}
        args={[0.42, 2.22, 0.055]}
        color="#55585c"
        metalness={0.28}
        roughness={0.42}
      />
      <mesh position={[panelX, 1.76, displayZ + 0.032]}>
        <planeGeometry args={[0.32, 0.42]} />
        <meshStandardMaterial
          ref={screenMatRef}
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[panelX, 1.3, displayZ + 0.034]}>
        <planeGeometry args={[0.31, 0.34]} />
        <meshStandardMaterial color="#dbeafe" emissive="#8ec5ff" emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[panelX, 0.88, displayZ + 0.034]}>
        <planeGeometry args={[0.31, 0.32]} />
        <meshStandardMaterial color="#111217" emissive="#0a0a12" emissiveIntensity={0.35} />
      </mesh>
      {[-0.12, 0, 0.12].map((x) => (
        <mesh key={`control-button-${x}`} position={[panelX + x, 0.83, displayZ + 0.04]}>
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

interface DoubleHingedGlassDoorsProps {
  leftDoorRef: RefObject<Group | null>;
  rightDoorRef: RefObject<Group | null>;
  onToggle: () => void;
}

function DoubleHingedGlassDoors({
  leftDoorRef,
  rightDoorRef,
  onToggle,
}: DoubleHingedGlassDoorsProps) {
  const leftHingeX = -SHAFT_WIDTH / 2 + 0.27;
  const rightHingeX = SHAFT_WIDTH / 2 - 0.27;
  const frontZ = SHAFT_DEPTH / 2 + 0.11;
  const doorWidth = 1.08;
  const doorHeight = 2.68;
  const pressDoors = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
  };
  const releaseDoors = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onToggle();
  };
  const showPointer = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
  };
  const hidePointer = () => {
    document.body.style.cursor = "";
  };

  return (
    <group onPointerOut={hidePointer}>
      <mesh
        position={[0, 1.38, frontZ + 0.28]}
        onPointerDown={pressDoors}
        onPointerUp={releaseDoors}
        onPointerOver={showPointer}
      >
        <boxGeometry args={[2.65, doorHeight + 0.42, 0.44]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide} />
      </mesh>
      <DoorLeaf
        refObject={leftDoorRef}
        hingeX={leftHingeX}
        frontZ={frontZ}
        side="left"
        width={doorWidth}
        height={doorHeight}
        onPointerDown={pressDoors}
        onPointerUp={releaseDoors}
        onPointerOver={showPointer}
      />
      <DoorLeaf
        refObject={rightDoorRef}
        hingeX={rightHingeX}
        frontZ={frontZ}
        side="right"
        width={doorWidth}
        height={doorHeight}
        onPointerDown={pressDoors}
        onPointerUp={releaseDoors}
        onPointerOver={showPointer}
      />
    </group>
  );
}

interface DoorLeafProps {
  refObject: RefObject<Group | null>;
  hingeX: number;
  frontZ: number;
  side: "left" | "right";
  width: number;
  height: number;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void;
}

function DoorLeaf({
  refObject,
  hingeX,
  frontZ,
  side,
  width,
  height,
  onPointerDown,
  onPointerUp,
  onPointerOver,
}: DoorLeafProps) {
  const direction = side === "left" ? 1 : -1;
  const panelCenterX = (direction * width) / 2;
  const outerEdgeX = direction * width;
  const handleX = direction * (width - 0.18);

  return (
    <group
      ref={refObject}
      position={[hingeX, 1.38, frontZ]}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerOver={onPointerOver}
    >
      <mesh position={[panelCenterX, 0, 0.002]}>
        <planeGeometry args={[width - 0.24, height - 0.28]} />
        <meshStandardMaterial
          color="#8e969a"
          transparent
          opacity={0.28}
          metalness={0.18}
          roughness={0.04}
          side={DoubleSide}
        />
      </mesh>
      <MetalBox
        position={[panelCenterX, height / 2, 0.012]}
        args={[width, 0.12, 0.1]}
        color={BLACK}
      />
      <MetalBox
        position={[panelCenterX, -height / 2, 0.012]}
        args={[width, 0.12, 0.1]}
        color={BLACK}
      />
      <MetalBox position={[0, 0, 0.012]} args={[0.12, height, 0.1]} color={BLACK} />
      <MetalBox position={[outerEdgeX, 0, 0.012]} args={[0.12, height, 0.1]} color={BLACK} />
      <MetalBox
        position={[panelCenterX, height / 2 - 0.17, 0.055]}
        args={[width - 0.24, 0.035, 0.035]}
        color="#d8dbe0"
        metalness={0.72}
        roughness={0.14}
      />
      <MetalBox
        position={[handleX, -0.28, 0.12]}
        args={[0.07, 0.68, 0.11]}
        color="#0c0c10"
        metalness={0.82}
        roughness={0.18}
      />
      {[-0.58, 0.02].map((y) => (
        <MetalBox
          key={`${side}-door-handle-mount-${y}`}
          position={[handleX, y, 0.18]}
          args={[0.16, 0.06, 0.08]}
          color="#0c0c10"
          metalness={0.82}
          roughness={0.18}
        />
      ))}
    </group>
  );
}

function CallPanel() {
  const halfW = SHAFT_WIDTH / 2;
  const halfD = SHAFT_DEPTH / 2;

  return (
    <group position={[-halfW - 0.03, 1.2, halfD + 0.08]}>
      <MetalBox position={[0, 0, 0]} args={[0.18, 0.42, 0.06]} color="#0a0a0d" />
      <Html transform position={[0, 0.04, 0.032]} center distanceFactor={0.5}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (landingScrollState.scrollElement) {
              landingScrollState.scrollElement.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }
          }}
          className="flex h-12 w-12 cursor-pointer select-none items-center justify-center rounded border-2 border-white bg-[#b66cff] text-lg font-black text-white shadow-[0_0_15px_#9d4edd,_inset_0_0_8px_#ffffff] transition-all hover:scale-[1.08] active:scale-[0.94]"
          style={{ pointerEvents: "auto" }}
          title="Go to 6th floor"
        >
          &uarr;
        </button>
      </Html>
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
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={color === BLACK || color === BLACK_SOFT ? 0.12 : 0.025}
        metalness={metalness}
        roughness={roughness}
      />
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
