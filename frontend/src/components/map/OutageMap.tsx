import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import type { Outage, Provider, RouteStop } from "../../types";

const NYC_CENTER: [number, number] = [40.758, -73.91];
const HALF_MILE_METERS = 804.672;

interface OutageMapProps {
  outages: Outage[];
  stops: RouteStop[];
  providers: Provider[];
  height?: number;
}

export function OutageMap({ outages, stops, providers, height = 560 }: OutageMapProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
      <MapContainer
        center={NYC_CENTER}
        zoom={11}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {outages.map((outage) => (
          <Circle
            key={`ring-${outage.id}`}
            center={[outage.lat, outage.lng]}
            radius={HALF_MILE_METERS}
            pathOptions={{ color: "#ef4444", weight: 1, fillColor: "#ef4444", fillOpacity: 0.06 }}
          />
        ))}

        {providers.map((provider) => (
          <CircleMarker
            key={provider.id}
            center={[provider.lat, provider.lng]}
            radius={7}
            pathOptions={{ color: "#fff", weight: 2, fillColor: "#0ea5e9", fillOpacity: 1 }}
          >
            <Tooltip>{provider.name}</Tooltip>
            <Popup>
              <strong>{provider.name}</strong>
              <br />
              {provider.address}
              <br />
              {provider.seniorsServed.toLocaleString()} seniors served
            </Popup>
          </CircleMarker>
        ))}

        {stops.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lng]}
            radius={6}
            pathOptions={{ color: "#fff", weight: 2, fillColor: "#f59e0b", fillOpacity: 1 }}
          >
            <Tooltip>
              {stop.recipientName} · Floor {stop.floor}
            </Tooltip>
            <Popup>
              <strong>{stop.recipientName}</strong>
              <br />
              {stop.address}
              <br />
              Route {stop.routeId} · Floor {stop.floor}
            </Popup>
          </CircleMarker>
        ))}

        {outages.map((outage) => (
          <CircleMarker
            key={outage.id}
            center={[outage.lat, outage.lng]}
            radius={9}
            pathOptions={{ color: "#fff", weight: 2, fillColor: "#ef4444", fillOpacity: 1 }}
          >
            <Tooltip>Outage · {outage.address}</Tooltip>
            <Popup>
              <strong>Active elevator outage</strong>
              <br />
              {outage.address}
              <br />
              Complaint #{outage.complaintNumber}
              {outage.singleElevator && (
                <>
                  <br />⚠ Single-elevator building
                </>
              )}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export function MapLegend() {
  const items = [
    { color: "#ef4444", label: "Active outage (0.5 mi ring)" },
    { color: "#f59e0b", label: "At-risk care stop" },
    { color: "#0ea5e9", label: "Provider depot" },
  ];
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs text-slate-600">
          <span
            className="h-3 w-3 rounded-full ring-2 ring-white"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}
