import { useState, useEffect } from "react";
import Map from "./components/Map";
import "./App.css";

function App() {
  const [potholeData, setPotholeData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("");

  useEffect(() => {
    // Try to fetch from our backend API first
    fetch("http://localhost:3001/api/potholes")
      .then((response) => response.json())
      .then((data) => {
        console.log("Received data:", data);
        console.log("Data length:", data.length);
        console.log("Is array:", Array.isArray(data));

        if (Array.isArray(data) && data.length > 0) {
          // Log unique status values
          const statuses = [...new Set(data.map((p) => p.status))];
          console.log("Unique statuses:", statuses);
          console.log("Sample record:", data[0]);

          setPotholeData(data);
          setDataSource("live");
          console.log(`Loaded ${data.length} potholes from live API`);
        } else {
          throw new Error("Invalid data format");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Backend API failed, using local file:", error);
        // Fallback to local file
        fetch("/potholes.json")
          .then((response) => response.json())
          .then((data) => {
            setPotholeData(data);
            setDataSource("local");
            console.log(`Loaded ${data.length} potholes from local file`);
            setLoading(false);
          });
      });
  }, []);

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
            Visualizing {potholeData.length.toLocaleString()} pothole reports
            across Detroit to help identify infrastructure priorities.
          </p>
          {dataSource && (
            <span className={`data-badge ${dataSource}`}>
              {dataSource === "live" ? "🟢 Live Data" : "📁 Cached Data"}
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
        {loading ? (
          <div className="loading">Loading pothole data</div>
        ) : (
          <div className="map-container">
            <Map potholes={filteredData} />
          </div>
        )}
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
