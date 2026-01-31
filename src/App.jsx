import { useState, useEffect } from "react";
import Map from "./components/Map";
import "./App.css";

function App() {
  const [potholeData, setPotholeData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/potholes.json")
      .then((response) => response.json())
      .then((data) => {
        setPotholeData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, []);

  const filteredData = potholeData.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const openCount = potholeData.filter((p) => p.status === "Open").length;
  const closedCount = potholeData.filter((p) => p.status === "Closed").length;

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
          All Potholes
        </button>
        <button
          className={`filter-btn ${filter === "Open" ? "active" : ""}`}
          onClick={() => setFilter("Open")}
        >
          Open Only
        </button>
        <button
          className={`filter-btn ${filter === "Closed" ? "active" : ""}`}
          onClick={() => setFilter("Closed")}
        >
          Closed Only
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
        at SpartaHack 2024 ☕
      </div>
    </div>
  );
}

export default App;
