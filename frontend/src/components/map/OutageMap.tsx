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
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `<div style="
      width: 14px;
      height: 14px;
      background-color: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 10px ${color}, 0 0 20px ${color};
      transform: translate(-3px, -3px);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
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

        {/* Provider Depots Markers */}
        {providers.map((provider) => (
          <Marker
            key={`provider-${provider.id}`}
            position={[provider.lat, provider.lng]}
            icon={providerIcon}
          >
            <Popup>
              <div className="p-1 font-sans text-xs">
                <h3 className="text-sm font-bold text-sky-600">{provider.name}</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">{provider.borough}</p>
                <div className="my-1.5 border-t border-slate-100" />
                <p>
                  <strong>Address:</strong> {provider.address}
                </p>
                <p className="mt-1">
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                    {provider.seniorsServed.toLocaleString()} seniors served
                  </span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* DFTA Care Stop Markers */}
        {stops.map((stop) => (
          <Marker key={`stop-${stop.id}`} position={[stop.lat, stop.lng]} icon={stopIcon}>
            <Popup>
              <div className="p-1 font-sans text-xs">
                <h3 className="text-sm font-bold text-amber-600">{stop.recipientName}</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">DFTA Care Stop</p>
                <div className="my-1.5 border-t border-slate-100" />
                <p>
                  <strong>Address:</strong> {stop.address}
                </p>
                <p className="mt-1">
                  <strong>Floor:</strong> {stop.floor}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Active Elevator Outage Markers */}
        {outages.map((outage) => (
          <Marker key={`outage-${outage.id}`} position={[outage.lat, outage.lng]} icon={outageIcon}>
            <Popup>
              <div className="p-1 font-sans text-xs">
                <h3 className="text-sm font-bold text-red-600">Active Elevator Outage</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Complaint #{outage.complaintNumber}
                </p>
                <div className="my-1.5 border-t border-slate-100" />
                <p>
                  <strong>Address:</strong> {outage.address}
                </p>
                <p>
                  <strong>Borough:</strong> {outage.borough}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {outage.singleElevator && (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                      Single Elevator Bldg
                    </span>
                  )}
                  {outage.chronicOffender && (
                    <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                      Chronic Offender
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Elevator Advocate Hotspots Markers */}
        {advocateHotspots.map((building) => (
          <Marker
            key={`hotspot-${building.bin}`}
            position={[building.lat, building.lng]}
            icon={hotspotIcon}
          >
            <Popup>
              <div className="p-1 font-sans text-xs">
                <h3 className="text-sm font-bold text-fuchsia-600">Vulnerability Hotspot</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">{building.address}</p>
                <div className="my-1.5 border-t border-slate-100" />
                <p>
                  <strong>Borough:</strong> {building.borough}
                </p>
                <p>
                  <strong>Council District:</strong> {building.councilDistrict}
                </p>
                <p className="mt-1">
                  <strong>DOB Complaints (3yr):</strong> {building.count}
                </p>
                <p>
                  <strong>Risk Score:</strong> {building.riskScore.toFixed(2)}
                </p>
                <p>
                  <strong>Confidence:</strong> {building.riskConfidence}%
                </p>
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
