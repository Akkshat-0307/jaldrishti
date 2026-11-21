# JalDrishti Phase 6 Report: Command Center Polish, Multi-Temporal Timeline, and Accessibility

**Date:** November 22, 2026  
**Platform:** JalDrishti Space-Enabled Flood Intelligence (ASTRA 2026 Hackathon)  
**Status:** Accepted & Verified  

---

## 1. Executive Summary & Verification Highlights

Phase 6 completes the production-grade hardening, accessibility compliance, and visual polish of the JalDrishti Command Center. Key achievements include:
- **100% Zone Status Reconciliation:** Disambiguated duplicate village names and resolved origin coordinates, achieving mathematically proven 100% consistency across `villages.geojson`, `routes.json`, and `impact_summary.json` (exactly 8 cut-off zones, 12 connected zones).
- **Area-Matched What-If Calibration:** Calibrated HAND inundation baseline stage $h^*_{\text{area}} = 1.50\text{ m}$ to match the empirical U-Net flood footprint ($10,408\text{ ha}$ vs $9,976\text{ ha}$, $\Delta = +4.3\%$), replacing the over-predicting IoU-optimal stage ($19,327\text{ ha}$) as the operational $\Delta h = 0$ baseline while retaining the IoU-optimal baseline as a selectable benchmark.
- **Multi-Temporal Satellite Timeline:** Integrated a real Sentinel-1 recession scene (`2022-06-30`), processed through U-Net ResNet34 and post-processing filters ($4,994.68\text{ ha}$ flood extent, a $49.9\%$ drop from peak), and deployed an interactive time scrubber stepping across Dry Baseline (`2022-05-01`), Peak Flood (`2022-06-18`), and Flood Recession (`2022-06-30`).
- **River Outlook Polish:** Removed arbitrary subjective severity badges; surfaced authentic GloFAS discharge metrics ($499.0\text{ m}^3/\text{s}$ current, $503.7\text{ m}^3/\text{s}$ peak) tagged explicitly as `"nearest GloFAS river cell"` and `"current outlook (not the 2022 event)"`.
- **Modular Frontend Architecture:** Refactored the monolithic 2,325-line page into 14 cohesive components under `apps/web/components/command-center/`, each strictly $< 350\text{ lines}`, powered by unified TanStack Query hooks with zero-network `DEMO_MODE=1` fallback.
- **Accessibility & Judge Tools:** Introduced a screen-reader accessible data table view, keyboard-driven Command Palette (`Ctrl+K`), and an automated 8-step guided demo tour.
- **Verification:** All 47 pytest tests pass (`pytest tests/ -v`), `make lint` has 0 errors/0 warnings, `npm run build` succeeds, and automated Chrome DevTools Protocol (CDP) headless testing verified all interactive workflows.

---

## 2. Reconciled Settlement Zone Table (All 20 Zones)

The table below presents the reconciled ground-truth state across all 20 Voronoi settlement zones in Cachar.

| Zone ID | Settlement Name | Status | Has Route | Has Alternate | Touches Edge | Total Pop | Exposed Pop | Flooded (ha) | Priority Score |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `zone_20` | Debpāra | **CUT OFF** | No | No | No (Interior) | 44,734 | 13,629 | 1,376.0 ha | **59.3** |
| `zone_12` | Māsimpur (North) | **CUT OFF** | No | No | No (Interior) | 39,267 | 7,656 | 973.9 ha | **54.8** |
| `zone_16` | Dudhpatli | **CUT OFF** | No | No | No (Interior) | 16,309 | 4,142 | 415.7 ha | **45.0** |
| `zone_01` | Ratpur | **CUT OFF** | No | No | **Yes (Edge)** | 35,699 | 14,037 | 1,080.4 ha | **67.0** |
| `zone_09` | Badripāra | **CUT OFF** | No | No | **Yes (Edge)** | 32,845 | 9,997 | 647.2 ha | **58.6** |
| `zone_13` | Kirishanpur | **CUT OFF** | No | No | **Yes (Edge)** | 23,288 | 13,858 | 851.3 ha | **64.0** |
| `zone_17` | Gossaipur | **CUT OFF** | No | No | **Yes (Edge)** | 29,864 | 11,213 | 864.8 ha | **60.3** |
| `zone_19` | Khoril | **CUT OFF** | No | No | **Yes (Edge)** | 19,564 | 6,564 | 450.4 ha | **49.8** |
| `zone_00` | Bhangarpar | CONNECTED | Yes | Yes | Yes (Edge) | 33,027 | 3,923 | 550.2 ha | 33.6 |
| `zone_02` | Khelma (North) | CONNECTED | Yes | Yes | Yes (Edge) | 20,402 | 1,768 | 293.9 ha | 23.3 |
| `zone_03` | Bikrampur | CONNECTED | Yes | Yes | Yes (Edge) | 13,598 | 1,027 | 258.9 ha | 19.9 |
| `zone_04` | Srikona | CONNECTED | Yes | Yes | No (Interior) | 26,056 | 400 | 83.1 ha | 16.5 |
| `zone_05` | Masimpur (South) | CONNECTED | Yes | Yes | No (Interior) | 10,724 | 473 | 91.1 ha | 13.9 |
| `zone_06` | Niz-Joynagar | CONNECTED | Yes | Yes | No (Interior) | 12,504 | 1,844 | 227.0 ha | 20.3 |
| `zone_07` | Arkatipur | CONNECTED | Yes | Yes | No (Interior) | 22,176 | 2,752 | 415.8 ha | 24.3 |
| `zone_08` | Khelma (South) | CONNECTED | Yes | Yes | Yes (Edge) | 10,028 | 1,180 | 185.3 ha | 18.0 |
| `zone_10` | Bihara | CONNECTED | Yes | Yes | Yes (Edge) | 31,108 | 3,195 | 454.7 ha | 28.9 |
| `zone_11` | Rāmnagar (East) | CONNECTED | Yes | Yes | No (Interior) | 24,710 | 1,202 | 340.9 ha | 20.5 |
| `zone_14` | Tarapur | CONNECTED | Yes | Yes | No (Interior) | 15,223 | 1,705 | 224.2 ha | 20.1 |
| `zone_18` | Rāmnagar (West) | CONNECTED | Yes | Yes | No (Interior) | 19,103 | 1,421 | 190.5 ha | 19.5 |

### Status Consistency Audit:
- **Total Settlement Zones:** 20
- **Cut-Off Zones Count:** 8
  - **Robust Interior Cut-Offs:** Exactly **3** (`Debpāra`, `Māsimpur (North)`, `Dudhpatli`). These zones lie entirely inside the study window, isolated purely by flooded internal road links.
  - **Window-Edge Cut-Offs:** Exactly **5** (`Ratpur`, `Badripāra`, `Kirishanpur`, `Gossaipur`, `Khoril`). Roads leaving the 20 km × 16 km window are truncated; external egress paths may exist beyond the perimeter.
- **Connected Zones Count:** 12 (all have verified Dijkstra evacuation paths to safe shelters).
- **Agreement Across Datasets:** **100.0%** (`villages.geojson`, `routes.json`, and `impact_summary.json` match identically on zone IDs, names, cut-off status, and route existence).

---

## 3. What-If Calibrated Baseline & Scenarios

### Calibration Analysis
The HAND stage ($h$) was evaluated against the observed 2022-06-18 U-Net flood mask ($9,975.59\text{ ha}$):
1. **Area-Matched Baseline ($h^*_{\text{area}} = 1.50\text{ m}$):**
   - Inundation Extent: **$10,408.34\text{ ha}$** (only $+4.3\%$ relative to U-Net observed area).
   - Serves as the calibrated operational $\Delta h = 0.0\text{ m}$ baseline.
   - Spatial Metrics: IoU = **0.3708**, Precision = **0.7812**, Recall = **0.4285**.
2. **IoU-Optimal Baseline ($h^*_{\text{iou}} = 3.25\text{ m}$):**
   - Inundation Extent: **$19,327.39\text{ ha}$** (almost $2\times$ observed extent).
   - While optimizing intersection-over-union across the full domain (IoU = **0.4705**), it over-predicts shallow ponding in flat terrain. Preserved as a selectable benchmark in `metrics.json`.

> **Mandatory Planning Aid Disclaimer:**  
> *"Water-level scenarios are a planning aid, not a forecast. They model terrain ponding along drainage channels under hypothetical river stage anomalies."*

### Precomputed Scenarios Table ($\Delta h$ relative to $h^*_{\text{area}} = 1.50\text{ m}$)

| Scenario ($\Delta h$) | Effective $h$ | Flooded Area (ha) | Exposed Population | Cropland Waterlogged (ha) | Roads Potentially Cut (km) | Cut-off Zones (Total / Robust) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **$-1.0\text{ m}$** | $0.50\text{ m}$ | 5,273.18 ha | 62,356 | 3,600.90 ha | 339.65 km | 14 / 6 |
| **$-0.5\text{ m}$** | $1.00\text{ m}$ | 7,760.25 ha | 94,371 | 5,400.54 ha | 446.82 km | 18 / 10 |
| **$0.0\text{ m}$ (Area-Matched)** | $1.50\text{ m}$ | 10,408.34 ha | 128,959 | 7,277.40 ha | 568.58 km | 18 / 10 |
| **$+0.5\text{ m}$** | $2.00\text{ m}$ | 13,206.02 ha | 163,184 | 9,047.88 ha | 683.80 km | 19 / 10 |
| **$+1.0\text{ m}$** | $2.50\text{ m}$ | 15,690.42 ha | 195,527 | 10,415.25 ha | 805.40 km | 19 / 10 |
| **$+2.0\text{ m}$** | $3.50\text{ m}$ | 20,247.27 ha | 248,990 | 12,352.14 ha | 992.41 km | 18 / 10 |

---

## 4. Multi-Temporal Satellite Flood Timeline

JalDrishti tracks flood dynamics using authentic Copernicus Sentinel-1 acquisitions across three temporal stages:

| Date | Stage | Satellite Scene ID | Flooded Area (ha) | Exposed Pop | Status Badge |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **2022-05-01** | Dry Baseline | `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234737` | 0.0 ha | 0 | `REAL (S1 Baseline Dry)` |
| **2022-06-18** | Peak Flood | `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234743` | 9,975.59 ha | 101,986 | `DERIVED (U-Net Peak)` |
| **2022-06-30** | Flood Recession | `COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220630T234744` | 4,994.68 ha | 83,393 | `DERIVED (U-Net Recession)` |

### Recession Inundation Dynamics:
- Between June 18 and June 30 (12 days), inundated area receded by **$4,980.91\text{ ha}$** (an exact **$49.9\%$ drop** in standing water).
- Exposed population reduced from 101,986 to 83,393 as floodwaters drained into low-lying agricultural depressions.
- Full GeoJSON vector polygons for the recession scene are cached in `data/events/assam-2022/flood_polygons_recession.geojson` and mirrored to `apps/web/public/data/events/assam-2022/`.

---

## 5. River Discharge Outlook Polish

In accordance with JalDrishti honesty rules:
- **Removal of Subjective Badges:** The uncalibrated `"Moderate Flood Severity"` tag was removed.
- **Direct Metric Reporting:** The raw discharge values are displayed cleanly:
  - Current Discharge: **$499.0\text{ m}^3/\text{s}$**
  - Peak Forecast Discharge: **$503.7\text{ m}^3/\text{s}$**
  - Forecast Trend: **Stable**
- **Spatial & Temporal Labeling:**
  - Spatial Location: Explicitly labeled `"nearest GloFAS river cell (lat: 24.825, lon: 92.800)"` on the Barak River.
  - Temporal Scope: Tagged prominently as `"current outlook (not the 2022 event)"`.
  - Fetch Timestamp: Recorded and rendered in UTC.

---

## 6. Frontend Modular Architecture & Accessibility

The Command Center was refactored into 14 modular components under `apps/web/components/command-center/`, all strictly adhering to `< 350 lines`:

```
apps/web/components/command-center/
├── types.ts                   (283 lines) - Unified TypeScript schemas
├── TopBar.tsx                 (143 lines) - Header, tour trigger, table toggle
├── KpiStrip.tsx               (142 lines) - 6 provenance-badged metrics
├── LayerPanel.tsx             (216 lines) - Map layer and opacity controls
├── TimeScrubber.tsx           (173 lines) - Multi-temporal timeline scrubber
├── ZoneDetail.tsx             (184 lines) - Settlement zone inspector card
├── AccessibleDataTable.tsx    (313 lines) - Screen-reader data table view
├── CommandPalette.tsx         (198 lines) - Quick navigation (Ctrl+K)
├── GuidedTour.tsx             (196 lines) - 8-step interactive walkthrough
├── TabDrawer.tsx              (131 lines) - Sliding panel container
└── tabs/
    ├── ImpactTab.tsx          (163 lines) - Zonal and meteorological impact
    ├── VillagesTab.tsx        (154 lines) - 20-zone table with edge filter
    ├── RoutesTab.tsx          (188 lines) - Dijkstra routing & staging hints
    ├── AlertsTab.tsx          (244 lines) - CAP v1.2 XML & offline packet SOS
    ├── WhatIfTab.tsx          (191 lines) - HAND slider & planning disclaimer
    └── ModelTab.tsx           (131 lines) - Model card & ablation benchmarks
```

### Accessibility Features:
1. **Screen-Reader Data Table:** Toggle button in top bar renders a full HTML5 `<table>` with semantic `<caption>`, `<thead>`, `<th scope="col">`, and formatted cells for all 20 zones, allowing keyboard and screen-reader users to inspect all data without interacting with WebGL.
2. **Keyboard Command Palette (`Ctrl+K` / `Cmd+K`):** Jump to any settlement zone, toggle views, run the tour, or trigger emergency alerts.
3. **Automated Guided Tour:** 8-step modal walkthrough with step progress, titles, descriptions, and keyboard `Back`/`Next` controls.
4. **WebGL Graceful Fallback:** Added explicit WebGL detection and try-catch handling in `FloodMap.tsx`; if WebGL is unavailable (e.g. in headless environments), the page displays a non-blocking notification and provides direct one-click access to the Accessible Data Table.

---

## 7. Data Provenance Summary (REAL, DERIVED, SIMULATED)

| Component / Layer | Provenance Badge | Description & Source |
| :--- | :---: | :--- |
| **Sentinel-1 SAR Scenes** | `REAL` | Raw Copernicus S1 IW GRD acquisitions (May 1, June 18, June 30, 2022). |
| **NASA IMERG Precipitation** | `REAL` | NASA GPM IMERG V07 satellite rainfall accumulations (1d: 67.2mm, 3d: 205.3mm, 7d: 276.8mm). |
| **GloFAS River Discharge** | `REAL (modelled)` | ECMWF GloFAS v4.0 discharge forecast (499.0 m³/s current, 503.7 m³/s peak) for nearest Barak River cell. |
| **DEM & Slope** | `REAL` | Copernicus GLO-30 Digital Elevation Model (30 m). |
| **Topographical HAND** | `REAL` | MERIT-Hydro Height Above Nearest Drainage (30 m). |
| **Permanent Water** | `REAL` | JRC Global Surface Water occurrence ($\ge 80\%$). |
| **Settlement & Road Network** | `REAL` | OpenStreetMap drivable highway graph, hospital and school facility coordinates. |
| **U-Net Flood Masks** | `DERIVED` | U-Net ResNet34 inference on June 18 peak ($9,976\text{ ha}$) and June 30 recession ($4,995\text{ ha}$). |
| **Voronoi Settlement Zones** | `DERIVED` | Voronoi tessellation of OSM village points clipped to Cachar study window. |
| **Zonal Multi-Criteria Priority** | `DERIVED` | Weighted score ($P = 0.40 \cdot N(\text{pop}) + 0.35 \cdot \text{isolated} + 0.15 \cdot N(\text{dist}) + 0.10 \cdot (1 - N(\text{density}))$). |
| **Evacuation Routes & Cut-Offs** | `DERIVED` | Dual-graph Dijkstra routing on passable road network (8 cut off, 12 connected). |
| **HAND What-If Scenarios** | `SIMULATED` | Inundation footprint under stage anomalies ($\Delta h \in [-1.0, +2.0]\text{ m}$) relative to Area-Matched baseline ($h^* = 1.50\text{ m}$). |
| **CAP v1.2 Emergency Alerts** | `SIMULATED` | Standard OASIS CAP XML and multi-lingual SMS broadcasts (EN, HI, AS, BN). |
| **Offline Emergency Beacons** | `SIMULATED` | Compact binary packet-radio SOS transmissions. |

---

## 8. Automated Verification & Quality Assurance

### Automated CDP Headless Browser Verification
Executed via `scripts/verify_command_center.py` using Chrome DevTools Protocol over WebSocket:
- **Page Mount & Hydration:** Page title loaded (`JalDrishti — Flood Intelligence Platform`), header present, 6 KPI cards verified.
- **Guided Tour Traversal:** Verified all **8 of 8 steps** sequentially (`1. Space-Enabled Flood Intelligence` through `8. Multi-temporal Satellite Timeline`).
- **Accessible Data Table Toggle:** Successfully opened table view, verified **20 rows**, validated column headers and data formatting, and toggled back to map view.
- **TimeScrubber Date Stepping:** Tested clicking May 1 (`0 ha (Normal conditions)`), June 30 (`4,994.68 ha (49.95 km²)`), and June 18 (`9,976 ha (99.76 km²)`).
- **What-If Planning Disclaimer:** Verified presence of the planning aid disclaimer (*"Water-level scenarios are a planning aid, not a forecast"*).
- **Accessibility DOM Audit:** **587 semantic accessibility tree nodes** extracted with proper roles and labels.
- **Screenshot:** Captured high-resolution screenshot stored at `docs/screenshots/command_center_phase6.png`.

### Code Quality & Unit Tests
- `pytest tests/ -v`: **47 of 47 tests passed (100%)** in 2.46s.
  - Tests verify Otsu baseline, U-Net architecture, zonal population math, dual-graph cut-off logic, Dijkstra routing, ETA physics, CAP v1.2 XML compliance, SMS GSM-7/UCS-2 segmentation, HAND connectivity, and status consistency across all 20 zones.
- `make lint`:
  - `npx eslint .`: 0 errors, 0 warnings.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - Python byte-compilation: clean pass.
- `apps/web` Next.js production build (`npm run build`): Completed in 1.0s, generating optimized static bundles.

---

## 9. Known Limitations & Gaps

1. **Boundary Edge Truncation:** Of the 8 cut-off zones, 5 touch the rectangular study window edge (`Ratpur`, `Badripāra`, `Kirishanpur`, `Gossaipur`, `Khoril`). Because OpenStreetMap roads exiting the window cannot be traced outside the study bounds, isolation for these 5 zones may be overstated. The UI explicitly flags this with an edge-touch indicator and a toggle to inspect robust interior cut-offs only.
2. **Road Vertical Elevation Profiles:** Roads intersecting the 50 m flood buffer are marked as severed because OpenStreetMap lacks 3D vertical elevation data for bridge decks and raised embankments.
3. **Cropland & Rice Paddy Waterlogging:** Agricultural fields in Assam (predominantly lowland rice paddies) naturally retain water during the monsoon, creating low radar backscatter signatures that overlap with floodwaters. The metric is therefore accurately labeled as *cropland flooded or waterlogged*.
4. **Staging Hints as Decision-Support Only:** Boat and air transfer vectors for cut-off settlements are calculated via Euclidean nearest-neighbor search to the nearest dry highway node. They are strictly decision-support recommendations, not surveyed helicopter landing zones or boat ramps.
5. **Real-Time River Forecast Independence:** The Open-Meteo GloFAS river discharge forecast represents current river conditions on the Barak River, whereas the satellite flood masks and impact layers correspond to the historical June 2022 flood event. This temporal distinction is explicitly disclosed in the UI and API schemas.
