import { useMemo } from "react";

import type { ElevatorAdvocateTopBuilding } from "../../api/elevatorAdvocateData";
import type { Outage, Provider, RouteStop } from "../../types";

type Point = [number, number];

interface OutageMapProps {
  outages: Outage[];
  stops: RouteStop[];
  providers: Provider[];
  advocateHotspots?: ElevatorAdvocateTopBuilding[];
  height?: number;
}

interface NeonLine {
  id: string;
  points: Point[];
  width: number;
  tone: "pink" | "coral" | "magenta";
  opacity: number;
}

interface NeonMarker {
  id: string;
  point: Point;
  color: string;
  radius: number;
  halo: number;
  label: string;
}

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 1180;
const LNG_MIN = -74.12;
const LNG_MAX = -73.72;
const LAT_MIN = 40.56;
const LAT_MAX = 40.94;

export function OutageMap({
  outages,
  stops,
  providers,
  advocateHotspots = [],
  height = 520,
}: OutageMapProps) {
  const roadLines = useMemo(createRoadLines, []);
  const markers = useMemo(
    () => [
      ...advocateHotspots.map((building): NeonMarker => {
        const point = toPosterPoint(building.lat, building.lng);
        return {
          id: `hotspot-${building.bin}`,
          point,
          color: "#ff3ec8",
          radius: Math.min(17, 7 + building.count / 3.5),
          halo: Math.min(44, 20 + building.count / 1.5),
          label: `${building.address}, ${building.count} complaints`,
        };
      }),
      ...outages.map((outage): NeonMarker => {
        const point = toPosterPoint(outage.lat, outage.lng);
        return {
          id: `outage-${outage.id}`,
          point,
          color: "#ff5b72",
          radius: 8,
          halo: 24,
          label: `Active elevator complaint ${outage.complaintNumber}`,
        };
      }),
      ...providers.map((provider): NeonMarker => {
        const point = toPosterPoint(provider.lat, provider.lng);
        return {
          id: `provider-${provider.id}`,
          point,
          color: "#38bdf8",
          radius: 6,
          halo: 16,
          label: provider.name,
        };
      }),
      ...stops.map((stop): NeonMarker => {
        const point = toPosterPoint(stop.lat, stop.lng);
        return {
          id: `stop-${stop.id}`,
          point,
          color: "#fbbf24",
          radius: 5,
          halo: 13,
          label: `${stop.recipientName}, floor ${stop.floor}`,
        };
      }),
    ],
    [advocateHotspots, outages, providers, stops]
  );

  return (
    <div
      className="neon-map-frame overflow-hidden rounded-lg border border-white/10"
      style={{ height }}
    >
      <svg
        className="neon-map"
        role="img"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        aria-label="Neon New York outage map"
      >
        <defs>
          <linearGradient id="neon-road-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff2fc8" />
            <stop offset="52%" stopColor="#ff3f7d" />
            <stop offset="100%" stopColor="#ff8a45" />
          </linearGradient>
          <linearGradient id="neon-title-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ff32bb" />
            <stop offset="50%" stopColor="#ff4d98" />
            <stop offset="100%" stopColor="#ff8a45" />
          </linearGradient>
          <filter
            id="neon-glow"
            colorInterpolationFilters="sRGB"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur stdDeviation="3.8" result="blurred" />
            <feColorMatrix
              in="blurred"
              result="bright"
              type="matrix"
              values="1.4 0 0 0 0  0 0.22 0 0 0  0 0 0.84 0 0  0 0 0 1 0"
            />
            <feMerge>
              <feMergeNode in="bright" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id="marker-glow"
            colorInterpolationFilters="sRGB"
            x="-120%"
            y="-120%"
            width="340%"
            height="340%"
          >
            <feGaussianBlur stdDeviation="7" result="blurred" />
            <feMerge>
              <feMergeNode in="blurred" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="neon-vignette" cx="50%" cy="48%" r="72%">
            <stop offset="0%" stopColor="#0b0715" stopOpacity="0" />
            <stop offset="78%" stopColor="#020205" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.88" />
          </radialGradient>
        </defs>

        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#05030a" />
        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#neon-vignette)" />

        <g opacity="0.95">
          {roadLines.map((line) => (
            <path
              key={line.id}
              d={pointsToPath(line.points)}
              fill="none"
              filter={line.width > 2.1 ? "url(#neon-glow)" : undefined}
              opacity={line.opacity}
              stroke={
                line.tone === "coral"
                  ? "#ff7559"
                  : line.tone === "magenta"
                    ? "#ff35d0"
                    : "url(#neon-road-gradient)"
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={line.width}
            />
          ))}
        </g>

        <g>
          {markers.map((marker) => (
            <g
              key={marker.id}
              className="neon-map__marker"
              transform={`translate(${marker.point[0]} ${marker.point[1]})`}
            >
              <title>{marker.label}</title>
              <circle
                r={marker.halo}
                fill={marker.color}
                filter="url(#marker-glow)"
                opacity="0.13"
              />
              <circle
                r={marker.radius * 1.55}
                fill="none"
                opacity="0.46"
                stroke={marker.color}
                strokeWidth="2.4"
              />
              <circle
                r={marker.radius}
                fill={marker.color}
                filter="url(#marker-glow)"
                opacity="0.94"
              />
              <circle r={Math.max(2, marker.radius * 0.32)} fill="#fff" opacity="0.9" />
            </g>
          ))}
        </g>

        <g className="neon-map__title" textAnchor="middle">
          <text x="500" y="1027" fill="url(#neon-title-gradient)" filter="url(#neon-glow)">
            NEW YORK
          </text>
          <text className="neon-map__subtitle" x="500" y="1073">
            ELEVATOR OUTAGE WATCH
          </text>
          <text className="neon-map__coords" x="500" y="1108">
            40.7128 N / 74.0060 W
          </text>
        </g>
      </svg>
    </div>
  );
}

function createRoadLines(): NeonLine[] {
  const lines: NeonLine[] = [];
  lines.push(...createGrid("manhattan", [496, 138], 210, 790, -9, 18, 54, 0.72));
  lines.push(...createGrid("jersey", [118, 120], 245, 790, 10, 10, 36, 0.56));
  lines.push(...createGrid("brooklyn", [490, 688], 400, 300, 18, 15, 28, 0.58));
  lines.push(...createGrid("queens", [680, 286], 370, 390, 14, 15, 30, 0.58));
  lines.push(...createGrid("bronx", [587, 20], 295, 220, 8, 13, 18, 0.48));

  const arterials: NeonLine[] = [
    {
      id: "hudson-river-drive",
      points: [
        [370, 120],
        [358, 270],
        [356, 424],
        [378, 610],
        [405, 885],
      ],
      width: 5.5,
      tone: "magenta",
      opacity: 0.9,
    },
    {
      id: "east-river-drive",
      points: [
        [604, 100],
        [598, 260],
        [604, 410],
        [584, 590],
        [548, 895],
      ],
      width: 5,
      tone: "pink",
      opacity: 0.88,
    },
    {
      id: "fdr-bridge",
      points: [
        [558, 810],
        [642, 806],
        [760, 784],
        [932, 756],
      ],
      width: 3.8,
      tone: "coral",
      opacity: 0.82,
    },
    {
      id: "cross-hudson",
      points: [
        [72, 428],
        [222, 506],
        [368, 528],
        [522, 520],
      ],
      width: 4.7,
      tone: "magenta",
      opacity: 0.82,
    },
    {
      id: "queens-arterial",
      points: [
        [612, 342],
        [748, 330],
        [870, 374],
        [968, 466],
      ],
      width: 4.3,
      tone: "coral",
      opacity: 0.82,
    },
    {
      id: "brooklyn-arterial",
      points: [
        [446, 732],
        [572, 714],
        [720, 735],
        [945, 842],
      ],
      width: 4.3,
      tone: "coral",
      opacity: 0.8,
    },
    {
      id: "harlem-river",
      points: [
        [500, 120],
        [575, 132],
        [664, 164],
        [765, 212],
      ],
      width: 4.6,
      tone: "magenta",
      opacity: 0.82,
    },
  ];
  lines.push(...arterials);

  return lines;
}

function createGrid(
  prefix: string,
  origin: Point,
  width: number,
  height: number,
  rotateDeg: number,
  columns: number,
  rows: number,
  opacity: number
): NeonLine[] {
  const lines: NeonLine[] = [];
  const center: Point = [origin[0] + width / 2, origin[1] + height / 2];

  for (let column = 0; column <= columns; column += 1) {
    const x = origin[0] + (column / columns) * width;
    lines.push({
      id: `${prefix}-ave-${column}`,
      points: rotatePoints(
        [
          [x, origin[1]],
          [x + Math.sin(column * 0.8) * 5, origin[1] + height],
        ],
        center,
        rotateDeg
      ),
      width: column % 5 === 0 ? 2.2 : 1.05,
      tone: column % 6 === 0 ? "magenta" : "pink",
      opacity: column % 5 === 0 ? opacity + 0.18 : opacity,
    });
  }

  for (let row = 0; row <= rows; row += 1) {
    const y = origin[1] + (row / rows) * height;
    lines.push({
      id: `${prefix}-street-${row}`,
      points: rotatePoints(
        [
          [origin[0], y],
          [origin[0] + width, y + Math.cos(row * 0.55) * 4],
        ],
        center,
        rotateDeg
      ),
      width: row % 7 === 0 ? 2.1 : 0.95,
      tone: row % 8 === 0 ? "coral" : "pink",
      opacity: row % 7 === 0 ? opacity + 0.14 : opacity,
    });
  }

  return lines;
}

function rotatePoints(points: Point[], center: Point, degrees: number): Point[] {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return points.map(([x, y]) => {
    const dx = x - center[0];
    const dy = y - center[1];
    return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos];
  });
}

function toPosterPoint(lat: number, lng: number): Point {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * VIEWBOX_WIDTH;
  const y = VIEWBOX_HEIGHT - 150 - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 960;
  return [Math.max(72, Math.min(VIEWBOX_WIDTH - 72, x)), Math.max(78, Math.min(952, y))];
}

function pointsToPath(points: Point[]): string {
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

export function MapLegend({ showAdvocateHotspots = false }: { showAdvocateHotspots?: boolean }) {
  const items = [
    { color: "#ff5b72", label: "Active outage" },
    { color: "#fbbf24", label: "At-risk care stop" },
    { color: "#38bdf8", label: "Provider depot" },
    ...(showAdvocateHotspots ? [{ color: "#ff3ec8", label: "Elevator Advocate hotspot" }] : []),
  ];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className="h-3 w-3 rounded-full ring-2 ring-white/30"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
      </div>
      <span className="text-xs text-slate-600">Neon NYC line-map view</span>
    </div>
  );
}
