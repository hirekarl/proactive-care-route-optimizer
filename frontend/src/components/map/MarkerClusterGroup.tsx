import type { ReactNode } from "react";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

interface MarkerClusterGroupProps {
  children: ReactNode;
  chunkedLoading?: boolean;
  maxClusterRadius?: number;
  disableClusteringAtZoom?: number;
  showCoverageOnHover?: boolean;
}

/**
 * Thin wrapper that mounts a Leaflet.markercluster group on the parent map,
 * then re-parents any child `<Marker>` layers into that group so hundreds of
 * markers collapse into cluster bubbles at low zoom instead of all rendering
 * to DOM at once.
 */
export function MarkerClusterGroup({
  children,
  chunkedLoading = true,
  maxClusterRadius = 55,
  disableClusteringAtZoom = 16,
  showCoverageOnHover = false,
}: MarkerClusterGroupProps) {
  const map = useMap();

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      chunkedLoading,
      maxClusterRadius,
      disableClusteringAtZoom,
      showCoverageOnHover,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
    });

    map.addLayer(cluster);

    const originalAddLayer = map.addLayer.bind(map);
    const trackedMarkers: L.Layer[] = [];

    map.addLayer = ((layer: L.Layer) => {
      if (layer instanceof L.Marker) {
        cluster.addLayer(layer);
        trackedMarkers.push(layer);
        return map;
      }
      return originalAddLayer(layer);
    }) as typeof map.addLayer;

    return () => {
      map.addLayer = originalAddLayer;
      trackedMarkers.forEach((layer) => cluster.removeLayer(layer));
      map.removeLayer(cluster);
    };
  }, [map, chunkedLoading, maxClusterRadius, disableClusteringAtZoom, showCoverageOnHover]);

  return <>{children}</>;
}
