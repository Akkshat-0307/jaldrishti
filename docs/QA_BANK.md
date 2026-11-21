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
Within a ~100 km × 80 km single-event study window, IMERG rainfall has almost zero spatial gradient (virtually identical across all 20 zones). Training a supervised ML model on our own derived U-Net mask would have been circular. HAND (Height Above Nearest Drainage) provides a physics-based, hydrologically conditioned topographic elevation proxy where water stage changes monotonically follow natural drainage lines.
