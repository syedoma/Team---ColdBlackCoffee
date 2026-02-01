import {
  MapContainer,
  TileLayer,
  useMap,
  CircleMarker,
  Popup,
} from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";

function HeatmapLayer({ points, visible }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!visible || points.length === 0) return;

    const count = points.length;
    let radius, blur, intensity;

    if (count < 100) {
      radius = 25;
      blur = 30;
      intensity = 1.0;
    } else if (count < 500) {
      radius = 18;
      blur = 20;
      intensity = 0.7;
    } else if (count < 2000) {
      radius = 12;
      blur = 15;
      intensity = 0.5;
    } else {
      radius = 8;
      blur = 10;
      intensity = 0.3;
    }

    const adjustedPoints = points.map((p) => [p.lat, p.lng, intensity]);

    heatLayerRef.current = L.heatLayer(adjustedPoints, {
      radius: radius,
      blur: blur,
      maxZoom: 15,
      minOpacity: 0.4,
      gradient: {
        0.0: "#581c87",
        0.2: "#7c3aed",
        0.4: "#c026d3",
        0.5: "#e11d48",
        0.65: "#ea580c",
        0.8: "#f59e0b",
        1.0: "#fbbf24",
      },
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points, visible]);

  return null;
}

function ZoomWatcher({ onZoomChange }) {
  const map = useMap();

  useEffect(() => {
    const handleZoom = () => {
      onZoomChange(map.getZoom());
    };

    map.on("zoomend", handleZoom);
    handleZoom(); // Initial call

    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

function MarkersLayer({ points, visible }) {
  if (!visible || points.length === 0) return null;

  // Limit markers for performance
  const displayPoints = points.slice(0, 500);

  const getStatusColor = (status) => {
    switch (status) {
      case "Open":
        return "#22c55e";
      case "Acknowledged":
        return "#3b82f6";
      case "Closed":
        return "#fbbf24";
      case "Archived":
        return "#6b7280";
      default:
        return "#fbbf24";
    }
  };

  return (
    <>
      {displayPoints.map((point, index) => (
        <CircleMarker
          key={point.id || index}
          center={[point.lat, point.lng]}
          radius={6}
          fillColor={getStatusColor(point.status)}
          fillOpacity={0.8}
          stroke={true}
          color="#000"
          weight={1}
        >
          <Popup>
            <div style={{ fontSize: "12px", minWidth: "150px" }}>
              <strong style={{ color: getStatusColor(point.status) }}>
                {point.status || "Unknown"}
              </strong>
              <br />
              {point.address && (
                <span>
                  {point.address}
                  <br />
                </span>
              )}
              {point.neighborhood && (
                <span>
                  📍 {point.neighborhood}
                  <br />
                </span>
              )}
              {point.created_at && (
                <span style={{ color: "#666", fontSize: "11px" }}>
                  Reported: {new Date(point.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

function Map({ potholes }) {
  const detroitCenter = [42.3514, -83.0658];
  const [zoomLevel, setZoomLevel] = useState(12);

  const detroitBounds = [
    [42.25, -83.3],
    [42.5, -82.9],
  ];

  const points = potholes
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      id: p.id,
      status: p.status,
      address: p.address,
      neighborhood: p.neighborhood,
      created_at: p.created_at,
    }));

  // Show heatmap when zoomed out, markers when zoomed in
  const showHeatmap = zoomLevel < 15;
  const showMarkers = zoomLevel >= 15;

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
      {/* Better contrast dark map - Carto Dark Matter */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      />

      <ZoomWatcher onZoomChange={setZoomLevel} />

      <HeatmapLayer points={points} visible={showHeatmap} />
      <MarkersLayer points={points} visible={showMarkers} />
    </MapContainer>
  );
}

export default Map;
