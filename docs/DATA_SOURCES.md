# Data Sources — JalDrishti

All data layers are labelled **REAL**, **DERIVED**, or **SIMULATED** per `AGENTS.md`.

## Satellite Imagery (SAR)

Sentinel-1 inputs are the exact **single scenes** listed in `data/events/assam-2022/manifest.json` (Relative Orbit 77, Descending pass, Instrument Mode IW, Polarisation VV + VH), **not** date-range composites:

| Role | Scene ID | Acquisition Timestamp | Polarisation | Orbit / Pass | Label |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Baseline (Reference)** | `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234740_20220501T234805_043024_05231C_1E38` | 2022-05-01T23:47:40Z | VV, VH | Rel. Orbit 77 / Descending | **REAL** |
| **Flood Peak** | `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_05385D_E87E` | 2022-06-18T23:47:43Z | VV, VH | Rel. Orbit 77 / Descending | **REAL** |
| **Flood Recession** | `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220630T234744_20220630T234809_043899_053D9A_3654` | 2022-06-30T23:47:44Z | VV, VH | Rel. Orbit 77 / Descending | **REAL** |

*Note on Training Chips:* 252 train, 89 val, 88 evaluated test chips, and 15 held-out Bolivia chips from the official Sen1Floods11 dataset (`gs://sen1floods11`, CC BY 4.0).

---

## Terrain & Ancillary Data

| Layer | Source / Collection | Band / Resolution | Pipeline Parameters & Usage | CRS | Label |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **DEM & Slope** | Copernicus DEM GLO-30 (`COPERNICUS/DEM/GLO30_2024_1`) | `DEM`, 30 m | Derived via `ee.Terrain.slope(dem)`. Slope > 5.0° masked out to suppress radar shadow false positives. | UTM Zone 46N (`EPSG:32646`) | **REAL** |
| **HAND** | MERIT Hydro v1.0.1 (`MERIT/Hydro/v1_0_1`) | `hnd`, 30 m | Relative elevation above drainage network. HAND > 15.0 m masked out. Used for what-if scenarios. | UTM Zone 46N (`EPSG:32646`) | **REAL** |
| **Permanent Water** | EC JRC Global Surface Water v1.4 (`JRC/GSW1_4/GlobalSurfaceWater`) | `occurrence`, 30 m | Occurrence threshold > 80.0% (`perm_water_threshold_pct = 80.0`) in `pipeline/baseline.py` & `pipeline/infer_unet.py`. | UTM Zone 46N (`EPSG:32646`) | **REAL** |

---

## Hydrological Outlook & Rainfall

| Layer | Provider | Specification & Horizon | Purpose & Scope | Label |
| :--- | :--- | :--- | :--- | :---: |
| **River Discharge Outlook** | Open-Meteo Flood API (ECMWF GloFAS v4.0) | 7-day daily forecast horizon (`forecast_days=7`); daily discharge (mean, max, min) for Barak River cell at Silchar (`24.825° N, 92.800° E`) | Current temporal outlook (not the 2022 hindcast); cached fallback in `river_outlook_cached.json`. | **MODELLED** |
| **Rainfall History** | NASA GPM IMERG V07 (`NASA/GPM_L3/IMERG_V07`) | 0.1° half-hourly precipitation accumulations (24h: 67.18 mm, 72h: 205.28 mm, 168h: 276.76 mm) | Hydrometeorological context during June 2022 event window. | **REAL** |

---

## Population & Land Cover

| Layer | Source / Collection | Specification | Metrics in Cachar Study Window (`[92.70, 24.75, 92.90, 24.90]`) | Label |
| :--- | :--- | :--- | :--- | :---: |
| **Population Grid** | WorldPop 2020 (`WorldPop/GP/100m/pop`) | 100 m unconstrained spatial distribution | Total window population: 427,338; Exposed: 101,986; Cut-off zones: 100,310 (38,481 exposed). | **MODELLED** |
| **Land Cover** | ESA WorldCover 2021 v200 (`ESA/WorldCover/v200`) | 10 m resolution (Class 40: Cropland, Class 50: Built-up) | 8,169.66 ha cropland flooded or waterlogged; 9.0 ha built-up flooded. | **REAL** |

---

## Infrastructure & Transport Network (OSM)

| Layer | Source | Geometry & Features | Processing & Rules | Label |
| :--- | :--- | :--- | :--- | :---: |
| **Road Network** | OpenStreetMap via OSMnx & Protomaps PMTiles (`cachar.pmtiles`, 2.5 MB) | Exactly 6,918 LineString features in `roads.geojson` (5,945 passable, 973 potentially cut) | 196.35 km potentially cut by 50 m flood buffer in UTM Zone 46N. Slimmed to 1.91 MB via Shapely linemerge. | **REAL** |
| **Emergency Shelters** | OpenStreetMap Overpass API (`amenity=school\|hospital`) | 32 Point facilities in `shelters.geojson` | Designated destination nodes for Dijkstra routing. All 32 outside flooded mask. | **REAL** |
| **Settlement Zones** | Voronoi tessellation of 20 OSM village seed points | 20 Polygon zones in `villages.geojson` | 8 cut-off zones (3 robust interior: zone_13, zone_18, zone_20; 5 perimeter: zone_01, zone_02, zone_03, zone_09, zone_14). | **DERIVED** |

---

## Algorithmic & Modelled Layers

| Layer | Source Data | Method & Resolution | Extent / Results | Label |
| :--- | :--- | :--- | :--- | :---: |
| **U-Net Flood Mask** | Sentinel-1 Single Scene (`...E87E`) | ResNet34 U-Net (PyTorch) + terrain filters | 9,975.59 ha (99.76 km²), 215 polygons in `flood_polygons_unet.geojson`. | **DERIVED** |
| **Tier A Baseline Mask** | Sentinel-1 Single Scenes | 3×3 median filter + Otsu VV + change detection | 12,617.47 ha (126.17 km²), 680 polygons in `flood_polygons.geojson`. | **DERIVED** |
| **HAND What-If Scenarios** | MERIT Hydro HAND raster | Connected stage simulation relative to $h^*_{\text{area}} = 1.50\text{ m}$ ($\Delta h \in [-1.0\text{ m}, +2.0\text{ m}]$) | 5,273 ha ($-1.0\text{ m}$) to 20,247 ha ($+2.0\text{ m}$) in `scenarios/`. | **DERIVED** |
| **Evacuation Routes & ETAs** | Passable OSM edges + 50 m buffer | NetworkX Dijkstra shortest path with highway class speeds | Primary safe path + secondary path (> 20% corridor divergence). | **DERIVED** |
| **Priority Ranking Score** | Population, Flood ha, Isolation, Facilities | Weighted multi-criteria formula: $0.35 P_{\text{norm}} + 0.25 F_{\text{norm}} + 0.30 \text{Iso} + 0.10 C_{\text{norm}}$ | Normalized priority scores 0–100 per village zone. | **DERIVED** |

---

## Emergency Beacons & Telemetry

| Layer | Source / Delivery | Details & Constraints | Label |
| :--- | :--- | :--- | :---: |
| **Distress Beacons** | User-submitted or demo seeded beacons | PWA client binary packed payload (16 bytes + CRC-16). Displayed on Command Center map with demo indicator. | **SIMULATED** |
| **SMS Fallback** | Native device SMS URI (`sms:+910000000000?body=...`) | Formatted hex string sent to demo placeholder number `+91 00000 00000` (`NEXT_PUBLIC_DEMO_SMS_NUMBER`). **No integration with government 1077 or official dispatch.** | **SIMULATED** |

*(Note: Rescue Beacon offline caching via IndexedDB and Service Worker Cache API is a client-side architecture component, not a geospatial data layer.)*
