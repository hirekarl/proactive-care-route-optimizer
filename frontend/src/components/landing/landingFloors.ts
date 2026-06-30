import { landingFacts } from "./landingFacts";

type Vec3 = [number, number, number];

export interface LandingFloor {
  floor: number;
  id: string;
  eyebrow: string;
  value: string;
  label: string;
  detail: string;
  hue: string;
  scrollOffset: number;
  position: Vec3;
  panelLabel: string;
  kind: "tab" | "external";
  tabIndex?: number;
  href?: string;
}

export const CABIN_TOP_Y = 6.0;
export const CABIN_LANDING_Y = 0.12;
export const ELEVATOR_BASE_Y = -4.65;

export const landingFloors: LandingFloor[] = [
  {
    ...landingFacts[0],
    floor: 1,
    kind: "tab",
    panelLabel: "Dashboard",
    position: [3.2, 3.2, 2.2],
    scrollOffset: 0.1,
  },
  {
    ...landingFacts[1],
    floor: 2,
    kind: "tab",
    panelLabel: "Outage Map",
    position: [-3.15, 2.0, 1.35],
    scrollOffset: 0.26,
  },
  {
    ...landingFacts[2],
    floor: 3,
    kind: "tab",
    panelLabel: "DOB Feed",
    position: [3.15, 0.78, -1.75],
    scrollOffset: 0.42,
  },
  {
    ...landingFacts[3],
    floor: 4,
    kind: "tab",
    panelLabel: "Providers",
    position: [-2.85, -0.58, 2.25],
    scrollOffset: 0.58,
  },
  {
    floor: 5,
    id: "advocate",
    eyebrow: "Elevator Advocate",
    value: "NYC Advocacy",
    label: "Public Elevator Rights",
    detail:
      "A community-facing resource for tenants, organizers, and care teams tracking elevator-access accountability.",
    hue: "#f472b6",
    href: "https://elevatoradvocate.nyc/",
    kind: "external",
    panelLabel: "Advocate NYC",
    position: [2.8, -1.86, 2.1],
    scrollOffset: 0.74,
  },
  {
    floor: 6,
    id: "eda",
    eyebrow: "Senior Care EDA",
    value: "Risk Explorer",
    label: "Senior-Care Data Story",
    detail:
      "Open the companion exploratory analysis for senior-care vulnerability, heat risk, and access patterns.",
    hue: "#60a5fa",
    href: "https://senior-care-eda.netlify.app/",
    kind: "external",
    panelLabel: "Senior EDA",
    position: [-2.65, -3.02, 1.75],
    scrollOffset: 0.9,
  },
];

export function cabinLocalYAt(scrollOffset: number): number {
  const firstFloor = landingFloors[0];
  const lastFloor = landingFloors[landingFloors.length - 1];

  if (scrollOffset <= firstFloor.scrollOffset) return CABIN_TOP_Y;
  if (scrollOffset >= lastFloor.scrollOffset) return CABIN_LANDING_Y;

  const nextIndex = landingFloors.findIndex((floor) => floor.scrollOffset >= scrollOffset);
  const nextFloor = landingFloors[nextIndex];
  const previousFloor = landingFloors[Math.max(nextIndex - 1, 0)];
  const segment = Math.max(nextFloor.scrollOffset - previousFloor.scrollOffset, 0.001);
  const segmentProgress = smoothstep((scrollOffset - previousFloor.scrollOffset) / segment);
  const previousY = floorCabinY(previousFloor.floor);
  const nextY = floorCabinY(nextFloor.floor);

  return lerp(previousY, nextY, segmentProgress);
}

export function cabinWorldYAt(scrollOffset: number): number {
  return ELEVATOR_BASE_Y + cabinLocalYAt(scrollOffset);
}

export function nearestLandingFloor(scrollOffset: number): LandingFloor {
  return landingFloors.reduce((nearest, floor) => {
    const nearestDelta = Math.abs(nearest.scrollOffset - scrollOffset);
    const floorDelta = Math.abs(floor.scrollOffset - scrollOffset);

    return floorDelta < nearestDelta ? floor : nearest;
  }, landingFloors[0]);
}

function floorCabinY(floor: number): number {
  const progress = (floor - 1) / (landingFloors.length - 1);
  return lerp(CABIN_TOP_Y, CABIN_LANDING_Y, progress);
}

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
