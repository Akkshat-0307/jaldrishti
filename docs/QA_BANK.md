# Defense & Judge Q&A Bank — JalDrishti

> **Guideline:** Under questioning, answer truthfully with exact numbers from the pipeline. Never extrapolate or invent precision.

---

### Q1: What makes your flood detection better than standard thresholding?
**Answer:**
On the Sen1Floods11 hand-labelled benchmark test split (88 chips), our U-Net with ResNet34 encoder achieves **0.6804 IoU (80.98% F1)**, compared to **0.2168 IoU (35.63% F1)** for Otsu thresholding. On the held-out Bolivia split (15 chips), the U-Net achieves **0.6879 IoU**, proving robust generalization across continents and sensors. Otsu suffers from high false alarms in specular low-backscatter surfaces.

### Q2: What is the exact difference between "exposed population" and "isolated population"?
**Answer:**
- **Population exposed (101,986):** Modelled number of residents whose dwellings sit directly within the flooded satellite mask (WorldPop 2020 cells).
- **Population of cut-off zones (100,310):** Total residents residing within the 8 settlement zones whose road network to regional emergency shelters has been severed. Of these 100,310 cut-off residents, **38,481** are also directly exposed to water.

### Q3: Are all 8 cut-off zones genuinely trapped?
**Answer:**
No, and we disclose this prominently. **5 of the 8 cut-off zones** (zone_01, zone_02, zone_03, zone_09, zone_14) touch the study window perimeter. Because roads leaving our bounding box are truncated by the data pipeline, their cut-off status could be an artifact of boundary clipping. **Only 3 zones (zone_13, zone_18, zone_20)** are robustly cut off inside the interior of the study window.

### Q4: Why is cropland labelled "flooded or waterlogged"?
**Answer:**
SAR backscatter cannot reliably separate floodwater from standing water in active rice paddies (monsoon season in Assam). Intersecting the flood mask with ESA WorldCover class 40 yields **8,169.66 ha**, but some portion consists of naturally waterlogged or irrigated paddy fields.

### Q5: How realistic are your evacuation routes and travel times?
**Answer:**
Routes use Dijkstra's shortest path over drivable OSM highways, avoiding road segments within a **50 m safety buffer** of flood polygons. Travel speeds are assigned by OSM highway class (e.g. primary 50 km/h, residential 25 km/h, reduced by 30% near water). They are mathematical approximations; real-world conditions like mud, debris, or bridge collapse cannot be verified from satellite SAR alone.

### Q6: Does your Beacon PWA actually send live SMS to the 1077 disaster helpline?
**Answer:**
No. The SMS fallback sends a pre-formatted SOS payload to a placeholder demo number (`NEXT_PUBLIC_DEMO_SMS_NUMBER`, default `+91 00000 00000`). It is clearly badged in the UI as **SIMULATED** for live demonstration purposes and does not interface with government dispatch.

### Q7: Why did you use HAND instead of LightGBM for the what-if simulation?
**Answer:**
Within the ~20 km × 16 km Cachar study bounding box (`[92.70, 24.75, 92.90, 24.90]`), NASA IMERG 0.1° rainfall has almost zero spatial gradient (mean: 205.28 mm, range: 159.09–264.29 mm across only 2–4 cells). Training a supervised ML model on our own derived U-Net mask would have been statistically circular. HAND (Height Above Nearest Drainage) provides a physics-based, hydrologically conditioned topographic elevation proxy where water stage changes monotonically follow natural drainage lines.

### Q8: What exact satellite scenes, DEM, and ancillary thresholds are used?
**Answer:**
- **Sentinel-1 SAR:** Single scenes listed in `manifest.json` (Relative Orbit 77, Descending pass, VV+VH), NOT date-range composites:
  - Baseline: `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234740_20220501T234805_043024_05231C_1E38` (2022-05-01)
  - Flood Peak: `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_05385D_E87E` (2022-06-18)
  - Flood Recession: `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220630T234744_20220630T234809_043899_053D9A_3654` (2022-06-30)
- **Slope DEM:** Copernicus DEM GLO-30 (`COPERNICUS/DEM/GLO30_2024_1`), 30 m resolution, derived via `ee.Terrain.slope(dem)`. Slopes > 5.0° masked out. (Not SRTM).
- **Permanent Water:** EC JRC Global Surface Water v1.4 (`occurrence > 80.0%`).
- **River Outlook:** Open-Meteo Flood API (ECMWF GloFAS v4.0), 7-day daily forecast horizon (`forecast_days=7`) for Barak River cell at Silchar (`24.825° N, 92.800° E`), current temporal outlook (not 2022 hindcast).
- **Road Network:** Exactly 6,918 LineString features in `roads.geojson` (5,945 passable, 973 potentially cut / 196.35 km cut under 50 m flood buffer in UTM Zone 46N).
