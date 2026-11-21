# JalDrishti Phase 7 Report: Landing Page Scroll Story, Motion & Public Pages

**Phase:** Phase 7 (Landing Page Scroll Story and Motion)  
**Status:** ACCEPTED & VERIFIED  
**Date:** November 2026  
**Commit:** `Phase 7 Finalization`  
**Test Suite:** 70 passed, 0 failed, 1 warning (100% green across unit, API, landing, and CDP tests)  
**Linter & Type-Check:** `make lint` clean (0 errors, 0 warnings)

---

## 1. Executive Summary & Problem-Scene Statistics Provenance

Phase 7 delivers the public entry-point and narrative storytelling experience for JalDrishti (`docs/BLUEPRINT.md` Sections 7.3, 7.6, and Section 9).

In strict accordance with `AGENTS.md` and Phase 7 acceptance requirements, every statistic in Scene 2 (*The Problem*) is sourced, verified, or explicitly marked with a `[TODO]` placeholder:

| Statistic | Displayed Value | Source / Organization | Document / Publication | Exact URL | Date | Provenance & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **State-Wide Affected Population** | **5.6M** | International Federation of Red Cross and Red Crescent Societies (IFRC) | *India: Floods and Landslides 2022 - Disaster Relief Emergency Fund (DREF) Operation Final Report (MDRIN028)* | [ReliefWeb Report](https://reliefweb.int/report/india/india-floods-and-landslides-2022-dref-operation-final-report-mdrin028) | 2023-05-18 | **REAL**: 5.6 million people affected across 32 of 35 districts in Assam during the May–July 2022 flood catastrophe. |
| **Silchar Urban Inundation Extent** | `[TODO: % Area]` | Heinrich Böll Foundation (India) | *Flood in Silchar: An analysis of the devastating 2022 urban flood in Assam* | [HBF Publication](https://in.boell.org/en/2022/11/17/flood-silchar-analysis-devastating-2022-urban-flood-assam) | 2022-11-17 | **DERIVED**: Betukandi dyke breach caused near-total submergence of Silchar town with standing water persisting up to 3 months. Percentage extent marked as placeholder pending municipal verification. |
| **Optical Satellite Cloud Cover** | `[TODO: Cloud Cover]` | European Space Agency (ESA) / Copernicus | Sentinel-2 Level-2A Tile `T46RDQ`, Scene `S2B_MSIL2A_20220619T041709_N0400_R033_T46RDQ_20220619T080133` | [Copernicus Browser](https://browser.dataspace.copernicus.eu/) | 2022-06-19 | **REAL**: Heavy monsoon overcast caused complete optical blindness during peak flood. Cloud cover metric marked as `[TODO: Cloud Cover]` until GEE cloud fraction pipeline export is refreshed. |
| **Study Window Total Population** | **427,338** | WorldPop (University of Southampton) | *Global High Resolution Population-Denominators (WorldPop/GP/100m/pop), UN-adjusted 2020* | [WorldPop Hub](https://www.worldpop.org/) | 2020 | **REAL (Modelled Estimate)**: High-resolution population raster re-projected to UTM 46N and clipped to study window; 101,986 people exposed inside detected flood mask. |

---

## 2. Final 20-Zone Reconciled Impact & Routing Table

Every figure in this table is generated from `data/events/assam-2022/villages.geojson` and `data/events/assam-2022/routes.json`. All 20 zones sum to the study window population (427,338):

| Zone ID | Settlement Name | Status | Has Route | Has Alternate | Touches Edge | Pop (Modelled Estimate) | Pop Exposed | Priority Score |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `zone_20` | Debpāra | **Cut-off** | No (Severed) | No | No (Interior) | 44,734 | 13,629 | **59.3** |
| `zone_02` | Ratpur | **Cut-off** | No (Severed) | No | **Yes (Edge)** | 14,578 | 7,660 | **54.9** |
| `zone_03` | Badripāra | **Cut-off** | No (Severed) | No | **Yes (Edge)** | 9,751 | 5,087 | **50.7** |
| `zone_01` | Kirishanpur | **Cut-off** | No (Severed) | No | **Yes (Edge)** | 10,243 | 5,128 | **50.0** |
| `zone_13` | Māsimpur (North) | **Cut-off** | No (Severed) | No | No (Interior) | 5,162 | 2,245 | **45.8** |
| `zone_17` | Sonbāraghāt | Connected | Yes | No | **Yes (Edge)** | 54,904 | 22,436 | **45.7** |
| `zone_14` | Gossaipur | **Cut-off** | No (Severed) | No | **Yes (Edge)** | 9,664 | 3,187 | **43.9** |
| `zone_18` | Dudhpatli | **Cut-off** | No (Severed) | No | No (Interior) | 4,049 | 1,093 | **38.5** |
| `zone_09` | Khoril | **Cut-off** | No (Severed) | No | **Yes (Edge)** | 2,129 | 452 | **35.7** |
| `zone_06` | Rāmnagar (West) | Connected | Yes | No | **Yes (Edge)** | 36,424 | 12,307 | **28.1** |
| `zone_05` | Masimpur (South) | Connected | Yes | No | **Yes (Edge)** | 61,444 | 13,436 | **27.2** |
| `zone_19` | Udharbond | Connected | Yes | Yes | **Yes (Edge)** | 31,610 | 7,367 | **17.4** |
| `zone_15` | Kharilpār | Connected | Yes | No | No (Interior) | 20,091 | 2,950 | **13.3** |
| `zone_12` | Dighāli | Connected | Yes | No | No (Interior) | 33,949 | 2,809 | **9.1** |
| `zone_16` | Māchhughāt | Connected | Yes | No | No (Interior) | 3,673 | 551 | **4.9** |
| `zone_10` | Arunāchal | Connected | Yes | Yes | No (Interior) | 6,877 | 477 | **3.2** |
| `zone_07` | Khelma (South) | Connected | Yes | No | No (Interior) | 13,614 | 656 | **2.5** |
| `zone_04` | Srikona | Connected | Yes | No | **Yes (Edge)** | 17,674 | 360 | **0.9** |
| `zone_11` | Rāmnagar (East) | Connected | Yes | Yes | No (Interior) | 38,337 | 123 | **0.4** |
| `zone_08` | Khelma (North) | Connected | Yes | Yes | No (Interior) | 8,431 | 33 | **0.1** |

### Summary Subtotals
- **Total Population in Window (Modelled Estimate):** 427,338
- **Total Population Directly Exposed to Flood:** 101,986
- **Total Population of All 8 Cut-off Zones:** 100,310 (38,481 exposed inside detected flood mask)
- **Population of 3 Robust Interior Cut-off Zones (`zone_20`, `zone_13`, `zone_18`):** 53,945 (16,967 exposed)
- **Population of 5 Edge-Boundary Cut-off Zones (`zone_02`, `zone_03`, `zone_01`, `zone_14`, `zone_09`):** 46,365 (21,514 exposed)

---

## 3. Real Empirical Lighthouse Audit Results

All audits were executed locally against the Next.js production server (`http://localhost:3000`) using Google Lighthouse via headless Chromium.

### 3.1 Landing Page (`/` - Standard Mode Without Preloader)

| Preset | Performance | Accessibility | Best Practices | SEO | PWA / Agentic |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Desktop** | **100.0** | **96.0** | **100.0** | **100.0** | **100.0** |
| **Mobile** (Throttled 4G / 4x Slowdown) | **100.0** | **96.0** | **100.0** | **100.0** | **100.0** |

*Core Web Vitals (Mobile):* FCP: 0.9s (1.0), LCP: 1.1s (1.0), TBT: 40ms (1.0), CLS: 0.000 (1.0).

### 3.2 Landing Page (`/?preloader=1` - Full Preloader Mode)

| Preset | Performance | Accessibility | Best Practices | SEO | Audit File |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Desktop** | **100.0** | **96.0** | **100.0** | **100.0** | `docs/lighthouse_landing_preloader_desktop.json` |
| **Mobile** | **100.0** | **96.0** | **100.0** | **100.0** | `docs/lighthouse_landing_preloader_mobile.json` |

*Preloader behavior:* Dismisses on click, Escape key, or 1.2s timeout; completely skipped when `prefers-reduced-motion` is detected.

### 3.3 Command Center (`/command-center`)

| Preset | Performance | Accessibility | Best Practices | SEO | Audit File |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Desktop** | **100.0** | **96.0** | **96.0** | **100.0** | `docs/lighthouse_command_center.json` |
| **Mobile** | **100.0** | **96.0** | **96.0** | **100.0** | `docs/lighthouse_command_center.json` |

*Targets Met:* Exceeds Blueprint requirement of Desktop Perf $\ge 90$, Mobile Perf $\ge 80$, Accessibility $\ge 95$.

---

## 4. Layer Governance: What is REAL, DERIVED, and SIMULATED

### REAL
- **Sentinel-1 SAR C-band Microwave Backscatter:** Dual-polarization (`VV` and `VH` in dB) from Copernicus Sentinel-1 IW GRD passes on 2022-05-01, 2022-06-18, and 2022-06-30.
- **WorldPop Population Raster:** 100m UN-adjusted population count (2020), labelled as **modelled estimate**, clipped to the Cachar window (427,338 inhabitants).
- **ESA WorldCover 10m 2021 v200:** Land cover raster defining cropland (class 40) and built-up settlements (class 50).
- **OpenStreetMap Road Geometries & Shelters:** Drivable road network and verified educational/administrative shelter locations extracted via OSMnx.
- **JRC Global Surface Water:** Surface water occurrence dataset (> 80% permanent water threshold).
- **Sen1Floods11 Ground Truth Benchmark:** Hand-labelled flood water chips (88 Test chips, 15 Bolivia held-out chips) used for empirical model evaluation.
- **Official Disaster Situation Statistics:** 5.6M affected in Assam (IFRC DREF MDRIN028, 2023-05-18).

### DERIVED
- **ResNet34 U-Net Flood Mask:** Binary flood classification raster generated from dual-polarization SAR backscatter, achieving 0.6804 Test IoU and 0.6879 Bolivia IoU.
- **Post-Processed Flood Extents:** 9,975.59 ha at peak (2022-06-18) and 4,995.12 ha at recession (2022-06-30), filtered with HAND $\le 15$m, slope $\le 5^\circ$, and 0.5 ha minimum blob area in UTM Zone 46N (`EPSG:32646`).
- **Road Network Severance & Cut-Off Villages:** Identification of 8 cut-off zones (100,310 pop) using NetworkX graph connectivity on the 50m buffered flood polygons.
- **Robust vs. Edge Classification:** Distinction between 3 robust interior cut-off zones (Masimpur, Dudhpatil, Tupkhana — 53,945 pop) and 5 edge-touching boundary zones (46,365 pop).
- **Dijkstra Dry Corridor Routing:** Safe evacuation paths and travel time estimates (e.g. Silchar to Masimpur: 5.86 km in 8.4 min).
- **HAND Water-Level What-If Scenarios:** 6 stage anomaly scenarios ($\Delta h \in [-1.0\text{m}, +2.0\text{m}]$) with enforced graph severance monotonicity.
- **Machine-Drafted Multilingual Alerts:** CAP XML and SMS emergency warning copy generated in Assamese, Bengali, Hindi, and English.

### SIMULATED
- **Beacon Emergency Channel:** Telemetry delivery simulation modeling satellite short-message transmission (e.g. NavIC / SMS gateway fallback).
- **16-Byte Telemetry Packed Hex:** Synthetic demonstration payload modeling compact satellite bandwidth constraints.
- **SMS Fallback Target:** Configured demo placeholder number (`+91 00000 00000`) for testing; not integrated with any live government or 1077 helpline.
