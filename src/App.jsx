import { useState, useEffect, useRef } from "react";
import Map from "./components/Map";
import "./App.css";

function App() {
  const [potholeData, setPotholeData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasStartedFetching = useRef(false);

  useEffect(() => {
    if (hasStartedFetching.current) return;
    hasStartedFetching.current = true;

    fetch("http://localhost:3001/api/potholes")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPotholeData(data);
          setDataSource("live");
          setLoading(false);
          setLastUpdated(new Date());
        } else {
          streamPotholes();
        }
      })
      .catch((error) => {
        console.error("API failed, trying stream:", error);
        streamPotholes();
      });
  }, []);

  const streamPotholes = () => {
    setDataSource("streaming");
    setPotholeData([]);

    const eventSource = new EventSource(
      "http://localhost:3001/api/potholes/stream",
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.done) {
        setLoading(false);
        setDataSource("live");
        setLastUpdated(new Date());
        eventSource.close();
      } else if (data.error) {
        eventSource.close();
        fetch("/potholes.json")
          .then((res) => res.json())
          .then((localData) => {
            setPotholeData(localData);
            setDataSource("local");
            setLoading(false);
            setLastUpdated(new Date());
          });
      } else if (data.batch) {
        setPotholeData((prev) => [...prev, ...data.batch]);
        setLoadingProgress(data.total);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      fetch("/potholes.json")
        .then((res) => res.json())
        .then((localData) => {
          setPotholeData(localData);
          setDataSource("local");
          setLoading(false);
          setLastUpdated(new Date());
        });
    };
  };

  const getDateFilteredData = () => {
    if (dateFilter === "all") return potholeData;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const yearMs = 365 * dayMs;

    let cutoffDate;
    switch (dateFilter) {
      case "7d":
        cutoffDate = now - 7 * dayMs;
        break;
      case "30d":
        cutoffDate = now - 30 * dayMs;
        break;
      case "90d":
        cutoffDate = now - 90 * dayMs;
        break;
      case "1y":
        cutoffDate = now - yearMs;
        break;
      case "2025":
        return potholeData.filter((p) => {
          if (!p.created_at) return false;
          return new Date(p.created_at).getFullYear() === 2025;
        });
      case "2024":
        return potholeData.filter((p) => {
          if (!p.created_at) return false;
          return new Date(p.created_at).getFullYear() === 2024;
        });
      default:
        return potholeData;
    }

    return potholeData.filter(
      (p) => p.created_at && p.created_at >= cutoffDate,
    );
  };

  const dateFilteredData = getDateFilteredData();

  const filteredData = dateFilteredData.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const openCount = dateFilteredData.filter((p) => p.status === "Open").length;
  const closedCount = dateFilteredData.filter(
    (p) => p.status === "Closed",
  ).length;
  const acknowledgedCount = dateFilteredData.filter(
    (p) => p.status === "Acknowledged",
  ).length;
  const archivedCount = dateFilteredData.filter(
    (p) => p.status === "Archived",
  ).length;

  const timeFilters = [
    { id: "all", label: "All" },
    { id: "7d", label: "7d" },
    { id: "30d", label: "30d" },
    { id: "90d", label: "90d" },
    { id: "2025", label: "2025" },
    { id: "2024", label: "2024" },
  ];

  const statusFilters = [
    {
      id: "all",
      label: "All",
      count: dateFilteredData.length,
      color: "#fbbf24",
    },
    { id: "Open", label: "Open", count: openCount, color: "#22c55e" },
    { id: "Closed", label: "Closed", count: closedCount, color: "#fbbf24" },
    {
      id: "Archived",
      label: "Archived",
      count: archivedCount,
      color: "#6b7280",
    },
  ];

  const getTimeSince = () => {
    if (!lastUpdated) return "Loading...";
    const seconds = Math.floor((new Date() - lastUpdated) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="app">
      {/* Full-screen map */}
      <div className="map-fullscreen">
        {loading && potholeData.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Loading {loadingProgress.toLocaleString()} reports...</span>
          </div>
        ) : (
          <Map potholes={filteredData} />
        )}
      </div>

      {/* Floating header */}
      <header className="floating-header">
        <div className="header-content">
          <div className="logo">
            <svg viewBox="0 0 36 36" fill="none">
              <path
                d="M18 2L32 10V26L18 34L4 26V10L18 2Z"
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
              />
              <circle cx="18" cy="18" r="5" fill="#d97706" />
              <circle cx="18" cy="18" r="2" fill="#0d0d0d" />
            </svg>
          </div>
          <div className="title">
            <h1>Detroit Pothole Tracker</h1>
            <div className="sync-status">
              <div
                className={`sync-dot ${dataSource === "live" ? "live" : ""}`}
              />
              <span>{getTimeSince()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Side panel */}
      <aside className="side-panel">
        {/* Stats */}
        <div className="stats-section">
          <div className="stat-main">
            <span className="stat-value">
              {filteredData.length.toLocaleString()}
            </span>
            <span className="stat-label">Reports</span>
          </div>
          <div className="stat-row">
            <div className="stat-mini open">
              <span className="mini-value">{openCount}</span>
              <span className="mini-label">Open</span>
            </div>
            <div className="stat-mini closed">
              <span className="mini-value">{closedCount.toLocaleString()}</span>
              <span className="mini-label">Closed</span>
            </div>
          </div>
        </div>

        {/* Time filters */}
        <div className="filter-section">
          <span className="section-label">Time Period</span>
          <div className="filter-chips">
            {timeFilters.map((f) => (
              <button
                key={f.id}
                className={`chip ${dateFilter === f.id ? "active" : ""}`}
                onClick={() => setDateFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status filters */}
        <div className="filter-section">
          <span className="section-label">Status</span>
          <div className="status-list">
            {statusFilters.map((f) => (
              <button
                key={f.id}
                className={`status-item ${filter === f.id ? "active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                <span
                  className="status-dot"
                  style={{ backgroundColor: f.color }}
                />
                <span className="status-label">{f.label}</span>
                <span className="status-count">{f.count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="legend-section">
          <span className="section-label">Density</span>
          <div className="legend-bar">
            <div className="legend-gradient" />
            <div className="legend-labels">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
          <p className="legend-hint">Zoom in to see individual reports</p>
        </div>

        {/* Footer */}
        <div className="panel-footer">
          <span>SpartaHack XI</span>
          <span>Team ColdBlackCoffee</span>
        </div>
      </aside>
    </div>
  );
}

export default App;
