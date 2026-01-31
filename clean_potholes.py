import pandas as pd
from shapely import wkb

# ---- LOAD DATA ----
df = pd.read_csv("improve_detroit_issues.csv", low_memory=False)

# ---- FILTER: potholes only ----
pothole_mask = (
    df["request_type_title"].str.lower().str.contains("pothole", na=False)
    | df["description"].str.lower().str.contains("pothole", na=False)
)

potholes = df[pothole_mask].copy()

# ---- EXTRACT LAT/LON FROM geom (WKB hex) ----
def extract_coords(wkb_hex):
    try:
        geom = wkb.loads(bytes.fromhex(wkb_hex))
        return pd.Series([geom.y, geom.x])  # lat, lon
    except:
        return pd.Series([None, None])

potholes[["latitude", "longitude"]] = potholes["geom"].apply(extract_coords)

# ---- DROP BROKEN ROWS ----
potholes = potholes.dropna(subset=["latitude", "longitude"])

# ---- SAVE OUTPUTS ----
potholes.to_csv("potholes_clean.csv", index=False)
potholes.to_json("potholes.json", orient="records")

print("Cleaned pothole data saved")
print("Rows:", len(potholes))
