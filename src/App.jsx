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
          console.log(`Loaded ${data.length} potholes from cache`);
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
        eventSource.close();
        console.log(`Stream complete: ${data.total} potholes`);
      } else if (data.error) {
        console.error("Stream error:", data.error);
        eventSource.close();
        fetch("/potholes.json")
          .then((res) => res.json())
          .then((localData) => {
            setPotholeData(localData);
            setDataSource("local");
            setLoading(false);
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
      case "7days":
        cutoffDate = now - 7 * dayMs;
        break;
      case "30days":
        cutoffDate = now - 30 * dayMs;
        break;
      case "90days":
        cutoffDate = now - 90 * dayMs;
        break;
      case "1year":
        cutoffDate = now - yearMs;
        break;
      case "2025":
        return potholeData.filter((p) => {
          if (!p.created_at) return false;
          const year = new Date(p.created_at).getFullYear();
          return year === 2025;
        });
      case "2024":
        return potholeData.filter((p) => {
          if (!p.created_at) return false;
          const year = new Date(p.created_at).getFullYear();
          return year === 2024;
        });
      case "2023":
        return potholeData.filter((p) => {
          if (!p.created_at) return false;
          const year = new Date(p.created_at).getFullYear();
          return year === 2023;
        });
      default:
        return potholeData;
    }

    return potholeData.filter(
      (p) => p.created_at && p.created_at >= cutoffDate,
    );
  };

  const dateFilteredData = getDateFilteredData();

  // Then filter by status
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

  return (
    <div className="App">
      <div className="header">
        <div className="header-left">
          <h1>
            <span className="icon">🕳️</span>
            Detroit Pothole Heatmap
          </h1>
          <p>
            {dataSource === "streaming"
              ? `Loading ${loadingProgress.toLocaleString()} pothole reports...`
              : `Visualizing ${filteredData.length.toLocaleString()} pothole reports across Detroit to help identify infrastructure priorities.`}
          </p>
          {dataSource && (
            <span className={`data-badge ${dataSource}`}>
              {dataSource === "live" && "🟢 Live Data"}
              {dataSource === "local" && "📁 Cached Data"}
              {dataSource === "streaming" && "⏳ Loading..."}
            </span>
          )}
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <div className="label">Total Reports</div>
            <div className="value">{filteredData.length.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Open</div>
            <div className="value accent">{openCount.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Closed</div>
            <div className="value">{closedCount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="filter-section">
        <span className="filter-label">Time Period:</span>
        <button
          className={`filter-btn ${dateFilter === "all" ? "active" : ""}`}
          onClick={() => setDateFilter("all")}
        >
          All Time
        </button>
        <button
          className={`filter-btn ${dateFilter === "7days" ? "active" : ""}`}
          onClick={() => setDateFilter("7days")}
        >
          Last 7 Days
        </button>
        <button
          className={`filter-btn ${dateFilter === "30days" ? "active" : ""}`}
          onClick={() => setDateFilter("30days")}
        >
          Last 30 Days
        </button>
        <button
          className={`filter-btn ${dateFilter === "90days" ? "active" : ""}`}
          onClick={() => setDateFilter("90days")}
        >
          Last 90 Days
        </button>
        <button
          className={`filter-btn ${dateFilter === "1year" ? "active" : ""}`}
          onClick={() => setDateFilter("1year")}
        >
          Last Year
        </button>
        <button
          className={`filter-btn ${dateFilter === "2025" ? "active" : ""}`}
          onClick={() => setDateFilter("2025")}
        >
          2025
        </button>
        <button
          className={`filter-btn ${dateFilter === "2024" ? "active" : ""}`}
          onClick={() => setDateFilter("2024")}
        >
          2024
        </button>
        <button
          className={`filter-btn ${dateFilter === "2023" ? "active" : ""}`}
          onClick={() => setDateFilter("2023")}
        >
          2023
        </button>
      </div>

      {/* Status Filter */}
      <div className="filter-section">
        <span className="filter-label">Status:</span>
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({dateFilteredData.length.toLocaleString()})
        </button>
        <button
          className={`filter-btn ${filter === "Open" ? "active" : ""}`}
          onClick={() => setFilter("Open")}
        >
          Open ({openCount})
        </button>
        <button
          className={`filter-btn ${filter === "Acknowledged" ? "active" : ""}`}
          onClick={() => setFilter("Acknowledged")}
        >
          Acknowledged ({acknowledgedCount})
        </button>
        <button
          className={`filter-btn ${filter === "Closed" ? "active" : ""}`}
          onClick={() => setFilter("Closed")}
        >
          Closed ({closedCount})
        </button>
        <button
          className={`filter-btn ${filter === "Archived" ? "active" : ""}`}
          onClick={() => setFilter("Archived")}
        >
          Archived ({archivedCount})
        </button>
      </div>

      <div className="map-section">
        <div className="map-container">
          <Map potholes={filteredData} />
        </div>
      </div>

      <div className="footer">
        Built by{" "}
        <a href="https://github.com/syedoma/Team---ColdBlackCoffee">
          Team ColdBlackCoffee
        </a>{" "}
        at SpartaHack 2026 ☕
      </div>
    </div>
  );
}

export default App;
