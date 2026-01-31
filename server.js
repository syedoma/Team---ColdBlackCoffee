import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Cache storage
let cachedPotholes = null;
let lastFetchTime = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Regular endpoint (returns cached data instantly if available)
app.get("/api/potholes", async (req, res) => {
  if (
    cachedPotholes &&
    lastFetchTime &&
    Date.now() - lastFetchTime < CACHE_DURATION
  ) {
    console.log("Serving cached data");
    return res.json(cachedPotholes);
  }

  // No cache, return empty and let client use streaming endpoint
  res.json([]);
});

// Streaming endpoint - sends data as it's fetched
app.get("/api/potholes/stream", async (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const apiUrl =
    "https://services2.arcgis.com/qvkbeam7Wirps6zC/arcgis/rest/services/improve_detroit/FeatureServer/0/query";

  let allPotholes = [];
  let offset = 0;
  const batchSize = 1000;
  let keepGoing = true;

  try {
    while (keepGoing) {
      const response = await axios.get(apiUrl, {
        params: {
          where: "request_type LIKE '%Pothole%'",
          outFields:
            "ObjectId,status,address,neighborhood,council_district,zip_code,created_at,closed_at,latitude,longitude",
          outSR: "4326",
          f: "json",
          resultRecordCount: batchSize,
          resultOffset: offset,
        },
      });

      const data = response.data;

      if (
        data.features &&
        Array.isArray(data.features) &&
        data.features.length > 0
      ) {
        const potholes = data.features.map((f) => ({
          id: f.attributes.ObjectId,
          status: f.attributes.status,
          address: f.attributes.address,
          neighborhood: f.attributes.neighborhood,
          latitude: f.attributes.latitude,
          longitude: f.attributes.longitude,
        }));

        allPotholes = allPotholes.concat(potholes);

        // Send this batch to the client
        res.write(
          `data: ${JSON.stringify({ batch: potholes, total: allPotholes.length })}\n\n`,
        );

        console.log(
          `Streamed batch: ${potholes.length} (total: ${allPotholes.length})`,
        );

        if (potholes.length === batchSize) {
          offset += batchSize;
        } else {
          keepGoing = false;
        }
      } else {
        keepGoing = false;
      }
    }

    // Update cache
    cachedPotholes = allPotholes;
    lastFetchTime = Date.now();

    // Send done signal
    res.write(
      `data: ${JSON.stringify({ done: true, total: allPotholes.length })}\n\n`,
    );
    res.end();
  } catch (error) {
    console.error("Stream error:", error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
