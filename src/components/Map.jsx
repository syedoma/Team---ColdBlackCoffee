import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";

function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const heat = L.heatLayer(points, {
      radius: 18,
      blur: 25,
      maxZoom: 17,
      gradient: {
        0.0: "#3b82f6",
        0.3: "#22d3ee",
        0.5: "#4ade80",
        0.7: "#facc15",
        0.9: "#f97316",
        1.0: "#ef4444",
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

function Map({ potholes }) {
  const detroitCenter = [42.3514, -83.0658];

  const points = potholes
    .filter((p) => p.latitude && p.longitude)
    .map((p) => [p.latitude, p.longitude, 0.5]);

  return (
    <MapContainer
      center={detroitCenter}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
    >
      {/* Dark base layer without labels */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
      />

      {/* Heatmap goes in the middle */}
      <HeatmapLayer points={points} />

      {/* Light labels on top */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
        pane="shadowPane"
      />
    </MapContainer>
  );
}

export default Map;
