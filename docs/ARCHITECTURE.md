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
   - Full-domain calibration converges to optimal baseline $h^*_{\text{iou}} = 3.25\text{ m}$ with IoU = **0.4705** and F1 = **0.6399**.
5. **Area-Matched Baseline Calibration ($h^*_{\text{area}} = 1.50\text{ m}$):**
   - While $h^*_{\text{iou}} = 3.25\text{ m}$ optimizes IoU, it produces $19,327\text{ ha}$ of inundation—almost double the observed U-Net extent ($9,976\text{ ha}$).
   - In Phase 6, an Area-Matched stage $h^*_{\text{area}} = 1.50\text{ m}$ was calibrated, producing $10,408.34\text{ ha}$ (+4.3% of U-Net footprint) as the operational $\Delta h = 0.0\text{ m}$ baseline. Both baselines are preserved in `metrics.json`.
   - A mandatory planning aid disclaimer is attached: *"Water-level scenarios are a planning aid, not a forecast."*
6. **Discrepancy Between Area-Matched HAND and U-Net Impact Metrics:**
   - Even though the Area-Matched stage $h^*_{\text{area}} = 1.50\text{ m}$ produces nearly identical flooded area ($10,408\text{ ha}$ vs U-Net's $9,976\text{ ha}$), the resulting infrastructure impact differs significantly:
     - **U-Net Observed:** 8 cut-off settlement zones, 196.4 km roads potentially severed.
     - **HAND Area-Matched ($h=1.50\text{ m}$):** 18 cut-off settlement zones, 569.1 km roads potentially severed.
   - **Root Physical Cause:** MERIT-Hydro HAND is derived from a 30 m digital elevation model (DEM) representing bare-earth elevation relative to drainage lines. The DEM lacks fine 3D vertical cross-sections for built transport infrastructure, such as raised road embankments, highway bunds, and culverts/bridges. When water levels rise, the 30 m DEM contours sheet across low-lying terrain, intersecting road centerlines that in reality run atop raised embankments. Sentinel-1 SAR backscatter directly observes the physical specular reflection of the actual surface, detecting that elevated embankments remained dry even when surrounding fields were submerged.
7. **Monotonic Cut-Off Enforcement:**
   - As water stage rises monotonically ($\Delta h \in [-1.0, -0.5, 0.0, +0.5, +1.0, +1.5, +2.0]\text{ m}$), the set of severed roads expands monotonically. However, if settlement isolation is evaluated independently per stage using road-network nearest-neighbor snapping, an edge case can occur where a village zone deemed severed at $\Delta h_1$ spuriously re-snaps to a distant unflooded road segment at $\Delta h_2 > \Delta h_1$ if its nearest road segment changes.
   - To enforce physical realism, `pipeline/whatif.py` tracks the **cumulative severed zone set**: once a village is cut off at a lower stage, it remains cut off at all higher stages ($\text{CutOff}(\Delta h_2) \supseteq \text{CutOff}(\Delta h_1)$).
8. **Role of Rainfall and River Forecasts:**
   - NASA IMERG V07 rainfall is preserved and displayed as **REAL satellite meteorological context** (1d: 67.18 mm, 3d: 205.28 mm, 7d: 276.76 mm).
   - ECMWF GloFAS v4.0 is integrated via the Open-Meteo Flood API as **REAL modelled river outlook** for the nearest river cell (`lat=24.825, lon=92.800`). Arbitrary severity tags were removed in Phase 6, showing pure discharge metrics (499.0 m³/s current, 503.7 m³/s peak) tagged with temporal scope (`current outlook (not the 2022 event)`).

---

## 2. Evacuation Routing & Cut-off Identification

1. **Dual-Graph Reachability Analysis:**
   - A settlement zone is classified as **CUT OFF** if and only if it possesses a viable road path to a safe shelter in the pre-flood road graph ($G_{dry}$), but becomes disconnected in the flooded road graph ($G_{flooded}$).
   - Routes originate from verified OSM village coordinates (`z["center"]`) rather than unbounded Voronoi centroids, ensuring 100% agreement between zonal impact and Dijkstra reachability.
   - Roads intersecting a 50 m floodwater buffer are treated as severed.
   - Roads within 200 m of floodwaters experience a 0.5× speed reduction and a 1.5× impedance penalty.
2. **Boundary Truncation & Robust Cut-Off Breakdown:**
   - The study bounding box artificially truncates roads exiting the region.
   - Of the 8 identified cut-off settlement zones:
     - **5 zones** (`Ratpur`, `Badripāra`, `Kirishanpur`, `Gossaipur`, `Khoril`) intersect the bounding box edge (`touches_window_edge: true`). Because roads exiting the window cannot be traced outside the study area, cut-off status for these zones may be overstated.
     - **3 zones** (`Debpāra`, `Māsimpur (North)`, `Dudhpatli`) lie entirely within the interior and are **robustly cut off**.
   - Duplicate village names in Cachar are formally disambiguated: `Masimpur (South)` vs `Māsimpur (North)`, `Khelma (South)` vs `Khelma (North)`, `Rāmnagar (West)` vs `Rāmnagar (East)`.
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
| U-Net AI Segmentation Mask | `DERIVED` | U-Net ResNet34, Sen1Floods11 Pretrained (Peak: 9,976 ha, Recession: 4,995 ha) |
| Multi-temporal Satellite Timeline | `DERIVED` | Sentinel-1 (2022-05-01 Dry, 2022-06-18 Peak, 2022-06-30 Recession) |
| HAND Water-Level Scenarios | `SIMULATED` | MERIT-Hydro HAND ($h^*_{\text{area}} = 1.50\text{ m}$, $\Delta h \in [-1.0, +2.0]\text{ m}$) |
| Satellite Rainfall Context | `REAL` | NASA GPM IMERG V07 Half-Hourly Precipitation (0.1°) |
| GloFAS River Outlook | `REAL (modelled)` | ECMWF GloFAS v4.0 River Discharge via Open-Meteo API |
| Safe Facilities & Road Graph | `REAL` | OpenStreetMap (Hospitals, Schools, Drivable Highway Network) |
| Population Exposure | `DERIVED` | WorldPop 2020 100m Constrained UN-Adjusted Population |
| Cropland Waterlogging | `DERIVED` | ESA WorldCover 2021 v200 (Class 40 Cropland, Class 50 Built-up) |
| Evacuation Routes | `DERIVED` | Multi-Target Dijkstra on Flooded OSM Road Network |
| Staging Transfer Vectors | `DERIVED` | Nearest Topological Component Egress Hint |
| Emergency Alerts & CAP v1.2 | `DERIVED` | Multi-lingual SMS Templates & OASIS CAP v1.2 XML |

---

## 4. Frontend Component Architecture (Phase 6)

The Command Center UI was refactored in Phase 6 from a monolithic page into high-cohesion, modular components under `apps/web/components/command-center/`, each strictly adhering to `< 350 lines`:

- **Data Layer (`hooks/useEventData.ts`):** Unified TanStack Query hooks fetching event details, impacts, routes, scenarios, timeline, and river forecast, with automatic offline fallback to `/data/events/assam-2022/*.json` for `DEMO_MODE=1`.
- **TopBar (`TopBar.tsx`):** Event selector, status badges (`REAL/DERIVED`), demo tour trigger, accessible table view toggle, language selector (EN, HI, AS, BN), and system health indicator.
- **KPI Strip (`KpiStrip.tsx`):** 6 key operational metrics with provenance badges: Flooded Area, Exposed Population, Cut-Off Zones, Cropland Waterlogged, Potentially Severed Roads, and Safe Shelters.
- **TimeScrubber (`TimeScrubber.tsx`):** Multi-temporal satellite scrubber stepping through May 1 Dry, June 18 Peak Flood, and June 30 Recession scenes with auto-play support.
- **TabDrawer (`TabDrawer.tsx` & `tabs/*`):** Collapsible right-hand drawer hosting 6 specialized tab views:
  - `ImpactTab`: Inundation breakdown, land cover, rainfall accumulation, and river discharge.
  - `VillagesTab`: 20-zone impact table with sorting, search, edge-touch toggle, and priority scores.
  - `RoutesTab`: Dijkstra evacuation paths, distance/ETA physics breakdown, alternate corridors, and boat/air staging hints.
  - `AlertsTab`: Multilingual SMS broadcast previews (GSM-7/UCS-2), CAP v1.2 XML feed viewer, and offline packet SOS beacon monitor.
  - `WhatIfTab`: HAND water-level delta slider ($\Delta h \in [-1.0, +2.0]\text{ m}$), delta vs observed comparison, and planning aid disclaimer.
  - `ModelTab`: Complete model card, Sen1Floods11 ablation benchmarks, and failure mode analysis.
- **Accessible Data Table (`AccessibleDataTable.tsx`):** High-contrast, screen-reader optimized data table for accessibility compliance and hackathon judges who prefer tabular inspection over map interactions.
- **Guided Demo Tour (`GuidedTour.tsx`):** 8-step interactive tour guiding judges through every core system capability.
- **Command Palette (`CommandPalette.tsx`):** Fast keyboard-driven navigation (`Ctrl+K` / `Cmd+K`) across views, zones, and operations.
