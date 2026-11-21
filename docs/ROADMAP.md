# Future Roadmap — JalDrishti

> **Notice:** None of the capabilities listed here are currently deployed in JalDrishti. They represent research horizons and future engineering milestones. Every item below is **ROADMAP / NOT BUILT**.

## 1. Space Systems Integration (ISRO / NASA)

- **ISRO EOS-04 (RISAT-1A) C-band SAR:** Ingest level-1 GRD imagery from ISRO Bhoovikram to eliminate dependency on Sentinel-1 revisit gaps over India.
- **NISAR (NASA-ISRO SAR):** L-band + S-band dual-frequency polarimetric SAR for penetrate-canopy flood detection and soil saturation mapping.
- **INSAT-3D/3DR & 3DS:** Rapid-refresh (15-minute) thermal IR and cloud-motion vectors to forecast convective cloud bursts in near-real-time.

## 2. Satellite Direct Messaging

- **NavIC (IRNSS) Short Messaging Service:** Push localized evacuation coordinates directly to handheld NavIC-enabled emergency receivers without cellular towers.
- **ISRO MSS (Mobile Satellite Services) Transponders:** Direct-to-satellite uplink for emergency beacons in deep shadow regions where cellular networks are destroyed.

## 3. Hydrodynamic & Physics Modelling

- **Coupled 2D Hydrodynamic Solver:** Replace the static HAND thresholding proxy with shallow-water equation solvers (e.g. LISFLOOD-FP or Telemac-2D) driven by upstream gauge discharge.
- **River Discharge Calibration:** Connect Central Water Commission (CWC) telemetry at Annapurna Ghat gauge for live water-stage calibration.
- **Embankment Breach Simulation:** High-resolution drone LiDAR DEM to simulate breached levee scenarios (such as Bethukandi in 2022).

## 4. Multi-Hazard Extensibility

- **Landslide Susceptibility:** Joint precipitation-slope susceptibility index for the Barak Valley fringe hills (Haflong–Dima Hasao corridor).
- **Post-Flood Siltation & Disease Risk:** Optical/SAR multi-temporal tracking of standing water pools correlated with vector-borne outbreak vulnerability.
