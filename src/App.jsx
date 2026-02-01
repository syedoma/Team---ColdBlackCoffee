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

  // Filter by date
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
    { id: "all", label: "All Time" },
    { id: "7d", label: "7d" },
    { id: "30d", label: "30d" },
    { id: "90d", label: "90d" },
    { id: "2025", label: "2025" },
    { id: "2024", label: "2024" },
  ];

  const statusFilters = [
    { id: "all", label: "All", count: dateFilteredData.length },
    { id: "Open", label: "Open", count: openCount },
    { id: "Closed", label: "Closed", count: closedCount },
    { id: "Archived", label: "Archived", count: archivedCount },
  ];

  const getTimeSince = () => {
    if (!lastUpdated) return "Loading...";
    const seconds = Math.floor((new Date() - lastUpdated) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="app">
      {/* Grid texture overlay */}
      <div className="grid-overlay" />

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo-section">
            {/* Hexagonal logo */}
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
            <div className="title-section">
              <h1>Detroit Pothole Tracker</h1>
              <p className="subtitle">
                City Infrastructure Dashboard · Wayne County
              </p>
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* Primary stat */}
          <div className="primary-stat">
            <div className="stat-label">Total Reports</div>
            <div className="stat-value-large">
              {dataSource === "streaming"
                ? loadingProgress.toLocaleString()
                : dateFilteredData.length.toLocaleString()}
            </div>
          </div>

          {/* Secondary stats */}
          <div className="secondary-stats">
            <div className="stat-badge open">
              <div className="badge-dot green" />
              <span className="badge-label">Open</span>
              <span className="badge-value green">{openCount}</span>
            </div>
            <div className="stat-badge closed">
              <div className="badge-dot yellow" />
              <span className="badge-label">Closed</span>
              <span className="badge-value yellow">
                {closedCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="filter-bar">
        {/* Time filters */}
        <div className="filter-group">
          <span className="filter-group-label">Period</span>
          {timeFilters.map((f) => (
            <button
              key={f.id}
              className={`time-filter-btn ${dateFilter === f.id ? "active" : ""}`}
              onClick={() => setDateFilter(f.id)}
            >
              {f.label}
              {dateFilter === f.id && <div className="active-indicator" />}
            </button>
          ))}
        </div>

        <div className="filter-divider" />

        {/* Status filters */}
        <div className="filter-group">
          <span className="filter-group-label">Status</span>
          {statusFilters.map((f) => (
            <button
              key={f.id}
              className={`status-filter-btn ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="filter-count">{f.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div className="map-wrapper">
        <div className="map-container">
          {loading && potholeData.length === 0 ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <span>Loading pothole data...</span>
            </div>
          ) : (
            <Map potholes={filteredData} />
          )}
        </div>

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-title">Report Density</div>
          <div className="legend-content">
            <span className="legend-label">Low</span>
            <div className="legend-gradient" />
            <span className="legend-label">High</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-left">
          <div className="sync-status">
            <div
              className={`sync-dot ${dataSource === "live" ? "live" : ""}`}
            />
            <span>
              {dataSource === "streaming"
                ? "Syncing with Detroit Open Data Portal..."
                : "Synced with Detroit Open Data Portal"}
            </span>
          </div>
          <span className="footer-divider">|</span>
          <span className="last-updated">Last updated: {getTimeSince()}</span>
        </div>
        <div className="footer-right">SpartaHack XI · Team ColdBlackCoffee</div>
      </footer>
    </div>
  );
}

export default App;
