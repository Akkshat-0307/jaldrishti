# JalDrishti Platform Architecture

JalDrishti is an end-to-end space-enabled flood intelligence and evacuation decision-support platform built for the ASTRA 2026 hackathon (Theme: Space).

```
                      SPACE DATA & EARTH OBSERVATION
   ┌───────────────────────┬─────────────────────────┬──────────────────────┐
   │ Sentinel-1 SAR (GRD)  │ NASA GPM IMERG V07      │ ECMWF GloFAS v4.0    │
   │ C-band Synthetic      │ Half-hourly 0.1° GPM    │ Global Flood Aware-  │
   │ Aperture Radar (IW)   │ Precipitation (mm/hr)   │ ness System (River)  │
   └──────────┬────────────┴────────────┬────────────┴──────────┬───────────┘
              │                         │                       │
              ▼                         ▼                       ▼
   ┌───────────────────────┐ ┌─────────────────────┐ ┌──────────────────────┐
   │ U-Net ResNet34        │ │ IMERG Accumulation  │ │ Open-Meteo Flood     │
   │ Flood Segmentation    │ │ 1d, 3d, 7d Context  │ │ 7-day River Forecast │
   │ (Sen1Floods11 Train)  │ │ (REAL Satellite)    │ │ (REAL Modelled)      │
   └──────────┬────────────┘ └──────────┬──────────┘ └──────────┬───────────┘
              │                         │                       │
              ▼                         │                       │
   ┌──────────────────────────────────┐ │                       │
   │ Physical Post-Processing         │ │                       │
   │ JRC Water Mask (>= 80%)          │ │                       │
   │ HAND Filtering (h <= 15m)        │ │                       │
   │ Slope Suppression (< 5°)         │ │                       │
   │ Blob Min-Area Filter (>= 0.5 ha) │ │                       │
   └──────────┬───────────────────────┘ │                       │
              │                         │                       │
              ▼                         │                       │
   ┌──────────────────────────────────┐ │                       │
   │ HAND Water-Level What-If Model   │◄┘                       │
   │ Drainage Connectivity Rule       │                         │
   │ Calibrated Baseline (h* = 3.25m) │                         │
   │ Scenarios: Δh ∈ [-1.0m, +2.0m]   │                         │
   └──────────┬───────────────────────┘                         │
              │                                                 │
              ▼                                                 ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Zonal Impact, Dual-Graph Isolation, & Evacuation Routing Engine        │
   │ - WorldPop 100m Population Exposure Integration                        │
   │ - ESA WorldCover Cropland Waterlogging & Built-up Inundation (ha)      │
   │ - OSM Dual-Graph Reachability (G_dry vs G_flooded with 50m buffer)     │
   │ - Robust Cut-Off vs Window Boundary Edge Breakdown (3 robust, 5 edge) │
   │ - Multi-Target Dijkstra Routing to 32 Safe Shelters                    │
   │ - Alternate Corridors (<= 80% shared length divergence check)          │
   │ - Boat / Air Staging Transfer Vectors for Cut-Off Zones                │
   └────────────────────────────────────┬───────────────────────────────────┘
                                        │
                                        ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Action & Dissemination Engine                                          │
   │ - Multilingual SMS Generator (EN, HI, AS, BN with GSM-7 / UCS-2)       │
   │ - OASIS Common Alerting Protocol (CAP v1.2) XML Validator              │
   │ - Next.js 14 Command Center UI (Dark Space Glassmorphic Design)        │
   └────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Architectural Decisions & Deviations from Blueprint

### Phase 5 Inundation Modeling: HAND Water-Level Scenarios vs. LightGBM Rainfall Model

The original project blueprint suggested training a LightGBM or XGBoost machine learning model on IMERG rainfall features (24h, 72h, 7d) to predict flood susceptibility across five rainfall increments.

During Phase 5 development, this architecture was updated to a **physically-grounded HAND (Height Above Nearest Drainage) water-level what-if model** for the following rigorous scientific reasons:

1. **Severe Spatial Coarseness of Satellite Rainfall:**
   - The Cachar/Silchar event study area is a 20 km × 16 km window (`[92.70, 24.75, 92.90, 24.90]`).
   - NASA GPM IMERG V07 operates on a 0.1° × 0.1° grid (~10 km resolution). Across our entire study bounding box, there are only 2–4 coarse rainfall grid cells.
   - The 72-hour rainfall preceding the June 18, 2022 peak had a regional mean of 205.28 mm with minimal internal spatial variance (min: 159.09 mm, max: 264.29 mm).
2. **Elimination of Methodological Circularity:**
   - Training a statistical regressor on 2–4 uniform rainfall inputs to predict our own U-Net SAR-derived flood footprint would be statistically circular.
   - The model would simply memorize the elevation profile and spatial mean of a single event, producing ungeneralizable pseudo-forecasts.
3. **Physical Fidelity of Hydrological Connectivity:**
   - In low-gradient river basins like the Barak River valley, flood inundation is driven by river stage elevation and hydraulic connectivity rather than local cell precipitation.
   - Using MERIT-Hydro HAND at 30 m resolution with topological 8-connectivity to the drainage network seed (`(hand <= 0.05m) | (jrc >= 80%)`) ensures that only pixels with physical hydraulic access to river waters are inundated. Disconnected depressions and radar shadow artifacts on steep slopes (`slope >= 5.0°`) are cleanly suppressed.
4. **Spatial Cross-Validation Rigor:**
   - The HAND model is calibrated against the observed U-Net flood mask by sweeping stage level $h \in [0.25, 15.0]\text{ m}$ in $0.25\text{ m}$ increments.
   - Calibrating on the West half of the scene ($x < 338$) and testing on the East half ($x \ge 338$) yields an East test IoU of **0.4550** (F1: **0.6254**).
   - Calibrating on the East half and testing on the West half yields a West test IoU of **0.4799** (F1: **0.6486**).
   - Full-domain calibration converges to optimal baseline $h^* = 3.25\text{ m}$ with IoU = **0.4705** and F1 = **0.6399**.
5. **Role of Rainfall and River Forecasts:**
   - NASA IMERG V07 rainfall is preserved and displayed as **REAL satellite meteorological context** (1d: 67.18 mm, 3d: 205.28 mm, 7d: 276.76 mm).
   - ECMWF GloFAS v4.0 is integrated via the Open-Meteo Flood API as **REAL modelled river outlook** for the Barak River (discharge forecast, 7-day hydrograph, trend).

---

## 2. Evacuation Routing & Cut-off Identification

1. **Dual-Graph Reachability Analysis:**
   - A settlement zone is classified as **CUT OFF** if and only if it possesses a viable road path to a safe shelter in the pre-flood road graph ($G_{dry}$), but becomes disconnected in the flooded road graph ($G_{flooded}$).
   - Roads intersecting a 50 m floodwater buffer are treated as severed.
   - Roads within 200 m of floodwaters experience a 0.5× speed reduction and a 1.5× impedance penalty.
2. **Boundary Truncation & Robust Cut-Off Breakdown:**
   - The study bounding box artificially truncates roads exiting the region.
   - Of the 8 identified cut-off settlement zones:
     - **5 zones** (`Ratpur`, `Badripāra`, `Kirishanpur`, `Gossaipur`, `Khoril`) intersect the bounding box edge (`touches_window_edge: true`). Because roads exiting the window cannot be traced outside the study area, cut-off status for these zones may be overstated.
     - **3 zones** (`Debpāra`, `Māsimpur`, `Dudhpatli`) lie entirely within the interior and are **robustly cut off**.
3. **Alternate Route Divergence Constraint:**
   - Candidate alternate routes must share $\le 80\%$ of their length with the primary route corridor. If the shared fraction exceeds 80%, the system explicitly returns `has_alternate: false` ("no distinct alternate route") to prevent misleading users with near-duplicate paths.
4. **Boat / Air Staging Disclaimer:**
   - Staging transfer vectors for severed zones represent mathematical nearest-neighbor Euclidean links to the passable highway network.
   - All boat and air staging hints are strictly labeled: **"Decision-support suggestion, not an official procedure."**

---

## 3. Data Provenance & Badging Standards

| Layer / Component | Provenance Tag | Source Dataset / Technique |
| :--- | :--- | :--- |
| Baseline Thresholding Mask | `DERIVED` | Sentinel-1 GRD IW, Otsu + Change Detection + JRC + HAND |
| U-Net AI Segmentation Mask | `DERIVED` | U-Net ResNet34, Sen1Floods11 Pretrained |
| HAND Water-Level Scenarios | `DERIVED` | MERIT-Hydro HAND ($h^* = 3.25\text{ m}$, $\Delta h \in [-1.0, +2.0]\text{ m}$) |
| Satellite Rainfall Context | `REAL` | NASA GPM IMERG V07 Half-Hourly Precipitation (0.1°) |
| GloFAS River Outlook | `REAL (modelled)` | ECMWF GloFAS v4.0 River Discharge via Open-Meteo API |
| Safe Facilities & Road Graph | `REAL` | OpenStreetMap (Hospitals, Schools, Drivable Highway Network) |
| Population Exposure | `DERIVED` | WorldPop 2020 100m Constrained UN-Adjusted Population |
| Cropland Waterlogging | `DERIVED` | ESA WorldCover 2021 v200 (Class 40 Cropland, Class 50 Built-up) |
| Evacuation Routes | `DERIVED` | Multi-Target Dijkstra on Flooded OSM Road Network |
| Staging Transfer Vectors | `DERIVED` | Nearest Topological Component Egress Hint |
| Emergency Alerts & CAP v1.2 | `DERIVED` | Multi-lingual SMS Templates & OASIS CAP v1.2 XML |
