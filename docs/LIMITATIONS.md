# Limitations — JalDrishti

This document catalogues known limitations. Every known gap is listed; nothing is hidden.

## Study-Window Scope

- All results (flood mask, impact metrics, routing, what-if) are computed within a **~100 km × 80 km Cachar study window** (approx. 24.0–25.1 °N, 92.5–93.4 °E).
- Roads, zones, and populations that cross the window boundary are **truncated**.
- **5 of the 8 cut-off zones touch the window edge** (zone_01, zone_03, zone_05, zone_07, zone_08); only zones 11, 14, and 20 are robustly interior.
- District-level statistics are **not extrapolated** from this window.

## Flood Mask Accuracy

- The U-Net was trained and evaluated on **Sen1Floods11** hand-labelled Sentinel-1 chips.
- Test-split IoU = **0.6804** (88 chips); Bolivia held-out IoU = **0.6879** (15 chips).
- The Assam scene extent has **not been independently validated** against field surveys or optical imagery; treat it as an AI estimate.
- SAR backscatter from flooded areas with surface roughness, vegetation, or urban structure can be misclassified.

## HAND What-If Scenarios

- Water level h* is **not calibrated** against gauge readings for the June 2022 event. It is a HAND threshold, not a hydraulic model.
- The baseline h* = 1.5 m was set to match the U-Net flood extent by area; it is not an observed water level.
- Scenarios are **linearly monotonic** (more water → more area); lateral flow, embankments, and dam operations are not modelled.

## Population Estimates

- Population data come from **WorldPop GP 2020** (100 m modelled estimate), not census.
- Zone populations are **Voronoi-based** (each pixel assigned to nearest road intersection); this is a spatial proxy, not administrative.
- Population of cut-off zones ≠ population exposed (inside the flood mask). Both are reported separately.

## Infrastructure Data

- Roads, hospitals, and schools come from **OpenStreetMap** and may be incomplete or outdated, especially for rural Assam.
- Road severance uses a **50 m buffer** around the flood mask; bridges and raised roads are **not distinguished**.
- Routes use OSM highway class speed estimates; actual travel time varies with road condition, traffic, and flooding depth.

## Cropland / Land Cover

- Cropland metric is "**cropland flooded or waterlogged**" (ESA WorldCover class 40 intersected with flood mask).
- Rice paddies are frequently inundated during cultivation; some detected water may be intentional irrigation.

## Beacon / Alert System

- The Rescue Beacon PWA sends SOS to a **demo placeholder number** (`NEXT_PUBLIC_DEMO_SMS_NUMBER`), not to any government emergency channel.
- It is **not integrated** with 1077 Helpline or any official disaster response system.
- Multilingual alert text is machine-drafted and has **not been reviewed** by native Assamese or Bengali speakers.
- The SMS fallback is **SIMULATED**; actual SMS delivery would require a third-party gateway with proper licensing.

## Optical Cloud Coverage

- Cloud cover for the June 2022 event over Silchar has not been computed from Sentinel-2 within this pipeline.
- The claim "0 % optical visibility" is **removed**; no cloud-mask computation was performed.
