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
      radius: 8,
      blur: 10,
      maxZoom: 15,
      minOpacity: 0.3,
      gradient: {
        0.0: "#0d0221",
        0.2: "#3d1a78",
        0.4: "#7b2a95",
        0.5: "#c94b8c",
        0.6: "#e16a52",
        0.75: "#f39c12",
        0.9: "#f7dc6f",
        1.0: "#fffef2",
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

  // Detroit bounding box - locks the map to this area
  const detroitBounds = [
    [42.25, -83.3], // Southwest corner
    [42.5, -82.9], // Northeast corner
  ];

  const points = potholes
    .filter((p) => p.latitude && p.longitude)
    .map((p) => [p.latitude, p.longitude, 0.3]);

  return (
    <MapContainer
      center={detroitCenter}
      zoom={12}
      minZoom={11}
      maxZoom={18}
      maxBounds={detroitBounds}
      maxBoundsViscosity={1.0}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
    >
      {/* Dark base layer without labels */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
      />

      {/* Heatmap */}
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
