import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// API endpoint to fetch potholes from Detroit
app.get("/api/potholes", async (req, res) => {
  try {
    const apiUrl =
      "https://services2.arcgis.com/qvkbeam7Wirps6zC/arcgis/rest/services/improve_detroit/FeatureServer/0/query";

    console.log("Fetching from Detroit API...");

    let allPotholes = [];
    let offset = 0;
    const batchSize = 1000;
    let keepGoing = true;

    while (keepGoing) {
      console.log(`Fetching batch at offset ${offset}...`);

      const response = await axios.get(apiUrl, {
        params: {
          where: "request_type LIKE '%Pothole%'",
          outFields: "*",
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
          id: f.attributes.ObjectId || f.attributes.issue_id,
          status: f.attributes.status,
          address: f.attributes.address,
          neighborhood: f.attributes.neighborhood,
          council_district: f.attributes.council_district,
          zip_code: f.attributes.zip_code,
          created_at: f.attributes.created_at,
          closed_at: f.attributes.closed_at,
          latitude: f.attributes.latitude,
          longitude: f.attributes.longitude,
        }));

        allPotholes = allPotholes.concat(potholes);
        console.log(
          `Got ${potholes.length} potholes (total: ${allPotholes.length})`,
        );

        // If we got a full batch, there might be more
        if (potholes.length === batchSize) {
          offset += batchSize;
        } else {
          // Got less than a full batch, we're done
          keepGoing = false;
        }
      } else {
        // No features returned, we're done
        keepGoing = false;
      }
    }

    console.log(
      `Fetched ${allPotholes.length} total potholes from Detroit API`,
    );
    res.json(allPotholes);
  } catch (error) {
    console.error("CATCH ERROR:", error.message);
    res.status(500).json({ error: "Failed to fetch pothole data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
