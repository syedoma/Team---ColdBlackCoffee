import { useState, useEffect, useRef } from "react";
import Map from "./components/Map";
import "./App.css";

function App() {
  const [potholeData, setPotholeData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const hasStartedFetching = useRef(false);

  useEffect(() => {
    // Prevent double-fetch in React Strict Mode
    if (hasStartedFetching.current) return;
    hasStartedFetching.current = true;

    // First try to get cached data
    fetch("http://localhost:3001/api/potholes")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Cache hit - use it immediately
          setPotholeData(data);
          setDataSource("live");
          setLoading(false);
          console.log(`Loaded ${data.length} potholes from cache`);
        } else {
          // No cache - use streaming endpoint
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
    setPotholeData([]); // Clear any existing data

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
        // Fallback to local file
        fetch("/potholes.json")
          .then((res) => res.json())
          .then((localData) => {
            setPotholeData(localData);
            setDataSource("local");
            setLoading(false);
          });
      } else if (data.batch) {
        // Add new batch to existing data
        setPotholeData((prev) => [...prev, ...data.batch]);
        setLoadingProgress(data.total);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Fallback to local file
      fetch("/potholes.json")
        .then((res) => res.json())
        .then((localData) => {
          setPotholeData(localData);
          setDataSource("local");
          setLoading(false);
        });
    };
  };

  const filteredData = potholeData.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const openCount = potholeData.filter((p) => p.status === "Open").length;
  const closedCount = potholeData.filter((p) => p.status === "Closed").length;
  const acknowledgedCount = potholeData.filter(
    (p) => p.status === "Acknowledged",
  ).length;
  const archivedCount = potholeData.filter(
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
              : `Visualizing ${potholeData.length.toLocaleString()} pothole reports across Detroit to help identify infrastructure priorities.`}
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
            <div className="value">{potholeData.length.toLocaleString()}</div>
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

      <div className="filter-section">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({potholeData.length.toLocaleString()})
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
