# JalDrishti Model Card: U-Net ResNet34 Flood Segmentation

## 1. Model Details
- **Model Name:** JalDrishti U-Net ResNet34
- **Architecture:** U-Net encoder-decoder architecture with a ResNet34 backbone (`segmentation_models_pytorch`), initialized from ImageNet weights.
- **Trained Checkpoint Metadata:**
  - `epoch`: 10
  - `val_iou`: 0.6405 (64.05% validation IoU)
  - `architecture`: `unet_resnet34`
  - `checkpoint_path`: `pipeline/weights/unet_resnet34.pth`
- **Input Channels:** 3 channels (SAR Sentinel-1 IW GRD):
  1. Band 0: `VV` polarization in decibels (dB)
  2. Band 1: `VH` polarization in decibels (dB)
  3. Band 2: Dual-polarization difference `(VV - VH)` in dB
- **Normalization:** Per-channel mean and standard deviation derived strictly from the **train split**:
  - `vv_mean: -9.6400 dB`, `vv_std: 2.7252 dB`
  - `vh_mean: -15.9661 dB`, `vh_std: 3.1531 dB`
  - `diff_mean: 6.3261 dB`, `diff_std: 2.8825 dB`
- **Output:** 1-channel probability map via Sigmoid activation ($p \in [0.0, 1.0]$), thresholded at 0.5 for binary water/flood classification.
- **Target Task:** High-fidelity pixel-level flood water segmentation in cloud-covered monsoon SAR scenes.

---

## 2. Training Setup & Methodology
- **Loss Function:** Masked Dice + Binary Cross-Entropy Loss (`MaskedDiceBCELoss`):
  $$\mathcal{L} = 0.5 \cdot \text{BCE}(p, y) + 0.5 \cdot \text{Dice}(p, y)$$
  *Strict ignore-index handling:* Sen1Floods11 label pixels with value `-1` (unclear/cloud/no-data) are strictly masked out from both BCE and Dice loss terms.
- **Optimization:** AdamW optimizer ($\text{lr} = 3 \times 10^{-4}$, $\text{weight\_decay} = 10^{-4}$) with a `CosineAnnealingLR` scheduler over 10 epochs.
- **Model Selection:** Model checkpoint selected strictly based on peak validation IoU on the official `valid` split (`val_iou = 0.6405`).
- **Data Augmentation:** Random $256 \times 256$ spatial crops from $512 \times 512$ chips, horizontal flips, vertical flips, random $90^\circ$ orthogonal rotations, and Gaussian speckle noise perturbations.
- **Hardware & Environment:** Trained with NVIDIA CUDA GPU acceleration on Google Colab; inference executable on Apple Silicon MPS (`torch.backends.mps`) and CPU. Standalone training script: `pipeline/train_unet.py`; Colab notebook: `notebooks/train_unet.ipynb`.

---

## 3. Data Splits & Leakage Prevention
Trained and evaluated on the official **Sen1Floods11** hand-labelled dataset (`v1.1`):
- **Train Split (`flood_train_data.csv`):** 252 chips. Model parameters and input normalization statistics were computed solely from this split.
- **Valid Split (`flood_valid_data.csv`):** 89 chips. Used strictly for validation monitoring and checkpoint selection.
- **Test Split (`flood_test_data.csv`):** 90 chips listed in the official index; exactly **88 valid chips** were evaluated. Two chips (`USA_426315` and `USA_431713`) either failed GCS retrieval or contained zero valid pixels under the `(label >= 0) & is_finite` criterion. Completely held out during model training and hyperparameter selection.
- **Bolivia Held-Out Split (`flood_bolivia_data.csv`):** 15 chips. Geographic generalization split representing an unseen continent/climate regime. **Bolivia was never touched during training or validation checkpoint selection.**

> **Note on Evaluation Evolution:**
> In Phase 1, an initial benchmark test was recorded on an ad-hoc 10-chip subset (yielding a baseline IoU of 0.4609). In Phase 2, this was superseded by systematic, rigorous evaluation across the entire 88-chip official test split and the 15-chip Bolivia held-out split for all model variants.

---

## 4. Empirical Benchmark & Ablation Evaluation
All metrics below are **empirically measured** by `pipeline/evaluate.py` directly against the hand-labelled ground truth using the Colab-trained checkpoint. No metric is invented or simulated.

| Split | Method | IoU (Jaccard) | F1-Score | Precision | Recall |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Test Split** (88 chips) | **Tier A Baseline** (Speckle + Otsu) | 0.2168 | 0.3563 | 0.2358 | 0.7289 |
| | **U-Net ResNet34** (Raw) | **0.6804** | **0.8098** | **0.8199** | **0.7999** |
| | **U-Net + Postprocessing** (Min-Area + Morph) | 0.6691 | 0.8018 | 0.7917 | 0.8121 |
| **Bolivia Held-Out** (15 chips) | **Tier A Baseline** (Speckle + Otsu) | 0.3736 | 0.5440 | 0.3978 | 0.8599 |
| | **U-Net ResNet34** (Raw) | **0.6879** | **0.8151** | **0.8590** | **0.7755** |
| | **U-Net + Postprocessing** (Min-Area + Morph) | **0.6917** | **0.8178** | **0.8449** | **0.7923** |

### Analysis of Ablation Results:
1. **Dramatic Generalization Gain over Tier A:**
   The trained U-Net demonstrates outstanding improvements over the Otsu baseline:
   - On the global Test Split: IoU increases from **0.2168** to **0.6804** (+46.36 IoU points); Precision jumps from **0.2358** to **0.8199** (+58.41 points).
   - On the held-out Bolivia set: IoU increases from **0.3736** to **0.6879** (+31.43 IoU points); Precision reaches **0.8590**.
2. **Impact of Chip Post-Processing:**
   On the unseen Bolivia split, morphological cleanup and small-object filtering boost IoU further to **0.6917** and F1 to **0.8178**, demonstrating effective removal of isolated speckle artifacts.

---

## 5. Application to Assam (June 2022 Event)
- **Scene:** Sentinel-1 IW GRD composite covering Cachar / Silchar, Assam (92.70°E–92.90°E, 24.75°N–24.90°N).
- **Post-Processing Applied:**
  1. Permanent water masking: JRC Global Surface Water occurrence > 80% excluded.
  2. HAND terrain gating: Height Above Nearest Drainage > 15 m excluded.
  3. Slope gating: Slope > 5° excluded (suppresses mountain radar shadow false positives).
  4. Minimum area threshold: Blobs < 0.5 ha filtered in projected UTM Zone 46N (`EPSG:32646`).
- **Measurements:**
  - **U-Net Flood Extent:** 9,975.59 ha (99.76 km²) across 215 polygons.
  - **Tier A Baseline Flood Extent:** 12,617.47 ha (126.17 km²) across 680 polygons.
  - **Spatial Mask Agreement:**
    - Jaccard Agreement (IoU between masks): **0.6459** (64.59%)
    - Dice Agreement: **0.7849** (78.49%)
    - Overlapping flood pixels: 98,304 pixels (30 m resolution).
- **Honest Provenance Disclosure:**
  Because no published high-resolution Copernicus EMS or NRSC vector shapefile exists for this exact localized bounding box, the comparison between Tier A and U-Net is **strictly reported as spatial agreement**, never as accuracy.

---

## 6. Failure Case Analysis & Limitations

### Concrete Failure Examples (from `metrics.json`):
1. **Radar Shadow in Mountainous Relief (`Bolivia_195474`):**
   - *Metrics:* U-Net IoU = 0.0000, FP = 319 pixels, FN = 1,551 pixels.
   - *Cause:* Steep terrain slopes angled away from the SAR sensor cast dark radar shadows. On standalone chips lacking DEM/HAND data, low backscatter regions can cause localized misclassification. In full scene inference, this is successfully mitigated by slope and HAND post-processing.
2. **Smooth Non-Water Surfaces (`Bolivia_233925`):**
   - *Metrics:* U-Net IoU = 0.0000, FP = 1,318 pixels, FN = 1 pixel.
   - *Cause:* Large, smooth airport runways, asphalt highways, and flat compacted dry soils reflect radar pulses away specularly, producing low backscatter that triggers false alarms in raw chips.
3. **Emergent Flooded Vegetation (`Ghana_141271`):**
   - *Metrics:* U-Net IoU = 0.0000, FP = 0 pixels, FN = 1,636 pixels.
   - *Cause:* Water under dense agricultural canopies or emergent aquatic plants causes double-bounce dihedral scattering, elevating backscatter and preventing single-date SAR thresholding or raw 2D convolutions from segmenting shallow water beneath vegetation.

### Operational Limitations:
- **Wind-Roughened Water:** Strong winds during monsoon storms create surface capillary waves, elevating SAR backscatter and causing false-negative dropouts.
- **Urban Layover & Corner Reflectors:** High-density concrete structures create corner-reflector dihedral and trihedral returns that obscure standing water in narrow urban streets.
- **Cropland Waterlogging Overlap:** Rice paddies and low-lying alluvial agricultural fields naturally retain water or become saturated during monsoons, creating low radar backscatter signatures that overlap with detected floodwater. The cropland metric is therefore formally designated as *cropland flooded or waterlogged*.
- **Study Window Boundary Truncation:** Analysis is strictly bounded within the Cachar geographic window (92.70°E–92.90°E, 24.75°N–24.90°N). Drivable roads exiting the study bounds are truncated; 10 of 20 settlement zones touch the bounding perimeter, meaning isolation status for border zones may be overstated if egress routes exist outside the analysis window.
- **Road Elevation & Bridge Profiles:** The 50 m spatial safety buffer applied to road severing treats all intersecting segments as impassable because OpenStreetMap roads lack vertical elevation profiles (bridge decks, viaducts, and raised embankments are not explicitly modelled).
- **Alternate Route Corridor Divergence:** Alternate routes that share > 80% of their length with the primary route corridor are suppressed and reported as "no distinct alternate route" to avoid presenting near-duplicate options during emergency operations.
- **Decision-Support Staging Hints:** Boat and air staging vectors generated for severed zones are mathematical nearest-neighbor Euclidean connections to the passable highway network, provided strictly as decision-support suggestions rather than surveyed operational landing zones.

---

## 7. HAND Inundation Model & What-If Water-Level Scenarios

### Architectural Decision: HAND Water-Level Model vs. LightGBM
Rather than training a LightGBM or XGBoost model on satellite rainfall grids, JalDrishti implements a physically-grounded Height Above Nearest Drainage (HAND) water-level inundation model.
- **Reason:** Across the localized 20 km × 16 km Cachar study bounding box (`[92.70, 24.75, 92.90, 24.90]`), NASA IMERG 0.1° satellite rainfall spans only 2–4 coarse cells with negligible spatial variance (mean: 205.28 mm, range: 159.09–264.29 mm). Training a statistical regressor on near-uniform rainfall to predict our own derived SAR mask would be statistically circular.
- **Physical Solution:** The HAND model simulates stage fluctuations ($h$) along the 30 m MERIT-Hydro physical drainage network, enforcing 8-connectivity to the river channel seed (`(hand <= 0.05m) | (jrc >= 80%)`) and slope filtering (< 5°).

### Calibration & Spatial Cross-Validation
The relative water-level $h$ was calibrated against the observed U-Net flood mask by sweeping $h \in [0.25, 15.0]\text{ m}$ in $0.25\text{ m}$ increments.
- **Area-Matched Baseline Water-Level ($h^*_{\text{area}}$):** $1.50\text{ m}$
  - Calibrated by matching the HAND connected inundation area ($10,408.34\text{ ha}$) to the observed U-Net extent ($9,975.59\text{ ha}$, $\Delta = +4.3\%$).
  - Serves as the primary operational $\Delta h = 0.0\text{ m}$ baseline for what-if simulations.
  - IoU at $h = 1.50\text{ m}$: **0.3708**, Precision: **0.7812**, Recall: **0.4285**.
- **IoU-Optimal Baseline Water-Level ($h^*_{\text{iou}}$):** $3.25\text{ m}$
  - Full-Domain IoU: **0.4705**, Full-Domain F1 Score: **0.6399**, Precision: **0.5401**, Recall: **0.7845**.
  - Inundated Area: $19,327.39\text{ ha}$ (almost $2\times$ observed extent).
  - Preserved as a selectable alternative baseline in `metrics.json`.
- **Spatial Block Cross-Validation (Longitude Half Split at $x = 338$):**
  - *Fold 1 (Calibrate West, Test East):* Calibrated $h = 3.25\text{ m}$, Train IoU = 0.4882 $\rightarrow$ **East Test IoU: 0.4550**, Test F1: **0.6254**
  - *Fold 2 (Calibrate East, Test West):* Calibrated $h = 2.50\text{ m}$, Train IoU = 0.4571 $\rightarrow$ **West Test IoU: 0.4799**, Test F1: **0.6486**
  - **Mean Spatial Test IoU:** **0.4674** | **Mean Spatial Test F1:** **0.6370**

> **Planning Aid Disclaimer:**
> Water-level scenarios are a planning aid, not a forecast. They model terrain ponding along drainage channels under hypothetical river stage anomalies.

### Precomputed Scenarios Table ($\Delta h$ relative to Area-Matched $h^*_{\text{area}} = 1.50\text{ m}$)

| Scenario ($\Delta h$) | Effective $h$ | Flooded Area (ha) | Exposed Population | Cropland Waterlogged (ha) | Roads Potentially Cut (km) | Cut-off Zones (Total / Robust) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **$-1.0\text{ m}$** | $0.50\text{ m}$ | 5,273.18 ha | 62,356 | 3,600.90 ha | 339.65 km | 14 / 6 |
| **$-0.5\text{ m}$** | $1.00\text{ m}$ | 7,760.25 ha | 94,371 | 5,400.54 ha | 446.82 km | 18 / 10 |
| **$0.0\text{ m}$ (Area-Matched Baseline)** | $1.50\text{ m}$ | 10,408.34 ha | 128,959 | 7,277.40 ha | 568.58 km | 18 / 10 |
| **$+0.5\text{ m}$** | $2.00\text{ m}$ | 13,206.02 ha | 163,184 | 9,047.88 ha | 683.80 km | 19 / 10 |
| **$+1.0\text{ m}$** | $2.50\text{ m}$ | 15,690.42 ha | 195,527 | 10,415.25 ha | 805.40 km | 19 / 10 |
| **$+2.0\text{ m}$** | $3.50\text{ m}$ | 20,247.27 ha | 248,990 | 12,352.14 ha | 992.41 km | 18 / 10 |

*Note on $0.0\text{ m}$ Scenario vs U-Net Mask:* Scenario $0.0\text{ m}$ represents the topographically-simulated HAND equilibrium footprint at $h^*_{\text{area}} = 1.50\text{ m}$ (10,408.34 ha), closely mirroring the observed U-Net extent (9,975.59 ha). Both layers are distinctly preserved, labeled, and selectable.

---

## 8. Rainfall Context & GloFAS River Outlook

- **Satellite Rainfall Context (`REAL`):**
  - Dataset: NASA GPM IMERG V07 (`NASA/GPM_L3/IMERG_V07`) half-hourly 0.1° precipitation.
  - 1-day (24h) accumulation (2022-06-17 to 2022-06-18): **67.18 mm** (min: 58.94 mm, max: 85.02 mm).
  - 3-day (72h) accumulation (2022-06-15 to 2022-06-18): **205.28 mm** (min: 159.09 mm, max: 264.29 mm).
  - 7-day (168h) accumulation (2022-06-11 to 2022-06-18): **276.76 mm** (min: 219.01 mm, max: 358.33 mm).
- **River Discharge Outlook (`MODELLED`):**
  - Source: ECMWF GloFAS v4.0 model output via Open-Meteo Flood API for nearest Barak River cell (`lat=24.825, lon=92.800`).
  - Scope: Tagged explicitly as `current outlook (not the 2022 event)`.
  - Current Discharge: **499.0 m³/s**, Peak Forecast Discharge: **503.7 m³/s**.
  - Trend: **Stable**. Uncalibrated severity tags removed in Phase 6; raw discharge numbers displayed directly. Cached snapshot provided for offline `DEMO_MODE=1` execution.
