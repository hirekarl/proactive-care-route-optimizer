import { useMemo } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { ElevatorAdvocateTopBuilding } from "../../api/elevatorAdvocateData";
import type { Outage, Provider, RouteStop } from "../../types";

interface OutageMapProps {
  outages: Outage[];
  stops: RouteStop[];
  providers: Provider[];
  advocateHotspots?: ElevatorAdvocateTopBuilding[];
  height?: number;
}

// Create custom glowing markers to avoid Vite marker 404 bugs and match dark neon theme
const createMarkerIcon = (color: string, size = 14) => {
  const half = size / 2;
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 10px ${color},0 0 20px ${color};"></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
};

export function OutageMap({
  outages,
  stops,
  providers,
  advocateHotspots = [],
  height = 520,
}: OutageMapProps) {
  const outageIcon = useMemo(() => createMarkerIcon("#f43f5e"), []); // Neon Rose/Pink-Red
  const singleElevatorIcon = useMemo(() => createMarkerIcon("#ffffff", 20), []); // White, larger — single-elevator buildings
  const stopIcon = useMemo(() => createMarkerIcon("#fbbf24"), []); // Neon Amber
  const providerIcon = useMemo(() => createMarkerIcon("#0ea5e9"), []); // Neon Blue
  const hotspotIcon = useMemo(() => createMarkerIcon("#ff3ec8"), []); // Neon Magenta/Pink

  const defaultCenter: [number, number] = [40.7128, -73.96]; // NYC center

  return (
    <div
      className="leaflet-map-wrapper overflow-hidden rounded-xl border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.5),_0_0_30px_rgba(236,72,153,0.25),_inset_0_0_10px_rgba(236,72,153,0.15)]"
      style={{ height, width: "100%" }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        {/* CartoDB Dark Matter Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* 0.5-mile Proximity Rings (dashed fuchsia/pink circles) around Care Stops */}
        {stops.map((stop) => (
          <Circle
            key={`ring-${stop.id}`}
            center={[stop.lat, stop.lng]}
            radius={804.672} // 0.5 miles in meters
            pathOptions={{
              color: "#ff3ec8", // Neon pink border
              fillColor: "#ff3ec8", // Neon pink fill
              fillOpacity: 0.05,
              weight: 1.5,
              dashArray: "5, 6",
            }}
          />
        ))}

        {providers.map((provider) => (
          <Marker
            key={`provider-${provider.id}`}
            position={[provider.lat, provider.lng]}
            icon={providerIcon}
          >
            <Popup>
              <div className="p-0.5 font-sans text-xs">
                <h3 className="text-sm font-bold leading-tight text-sky-400">{provider.name}</h3>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                  {provider.borough} Depot
                </p>
                <div className="my-2 border-t border-white/10" />
                <p className="text-slate-300">
                  <strong className="text-slate-400">Address:</strong> {provider.address}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {stops.map((stop) => (
          <Marker key={`stop-${stop.id}`} position={[stop.lat, stop.lng]} icon={stopIcon}>
            <Popup>
              <div className="p-0.5 font-sans text-xs">
                <h3 className="text-sm font-bold leading-tight text-amber-400">
                  {stop.recipientName}
                </h3>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                  DFTA Care Recipient
                </p>
                <div className="my-2 border-t border-white/10" />
                <p className="text-slate-300">
                  <strong className="text-slate-400">Address:</strong> {stop.address}
                </p>
                <p className="mt-1 text-slate-300">
                  <strong className="text-slate-400">Floor:</strong> {stop.floor}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {outages.map((outage) => (
          <Marker
            key={`outage-${outage.id}`}
            position={[outage.lat, outage.lng]}
            icon={outage.singleElevator ? singleElevatorIcon : outageIcon}
          >
            <Popup>
              <div className="p-0.5 font-sans text-xs">
                <h3 className="text-sm font-bold leading-tight text-rose-400">Active Outage</h3>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                  DOB Complaint #{outage.complaintNumber}
                </p>
                <div className="my-2 border-t border-white/10" />
                <p className="text-slate-300">
                  <strong className="text-slate-400">Address:</strong> {outage.address}
                </p>
                <p className="text-slate-300">
                  <strong className="text-slate-400">Borough:</strong> {outage.borough}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {outage.singleElevator && (
                    <span className="rounded border border-red-500/20 bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                      Single Elevator Bldg
                    </span>
                  )}
                  {outage.chronicOffender && (
                    <span className="rounded border border-purple-500/20 bg-purple-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                      Chronic Offender
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {advocateHotspots.map((building) => (
          <Marker
            key={`hotspot-${building.bin}`}
            position={[building.lat, building.lng]}
            icon={hotspotIcon}
          >
            <Popup>
              <div className="p-0.5 font-sans text-xs">
                <h3 className="text-sm font-bold leading-tight text-fuchsia-400">
                  Vulnerability Hotspot
                </h3>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                  {building.address}
                </p>
                <div className="my-2 border-t border-white/10" />
                <p className="text-slate-300">
                  <strong className="text-slate-400">Borough:</strong> {building.borough} (CD{" "}
                  {building.councilDistrict})
                </p>
                <p className="text-slate-300">
                  <strong className="text-slate-400">Complaints (3yr):</strong> {building.count}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded border border-fuchsia-500/20 bg-fuchsia-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                    Risk: {building.riskScore.toFixed(2)}
                  </span>
                  <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                    Conf: {building.riskConfidence}%
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export function MapLegend({ showAdvocateHotspots = false }: { showAdvocateHotspots?: boolean }) {
  const items = [
    { color: "#f43f5e", label: "Active outage" },
    { color: "#ffffff", label: "Single elevator (critical)" },
    { color: "#fbbf24", label: "At-risk care stop" },
    { color: "#0ea5e9", label: "Provider depot" },
    ...(showAdvocateHotspots ? [{ color: "#ff3ec8", label: "Elevator Advocate hotspot" }] : []),
  ];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 text-xs font-medium text-slate-500"
          >
            <span
              className="h-3 w-3 rounded-full ring-2 ring-slate-100"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
      </div>
      <span className="text-xs text-slate-400">Interactive map view</span>
    </div>
  );
}
