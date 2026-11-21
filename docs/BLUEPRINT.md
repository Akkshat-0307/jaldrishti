# JalDrishti: Build Blueprint for ASTRA 2026

From satellite pixel to last-mile rescue, in one flood-intelligence platform. Hand this entire document to Antigravity.

## 0. How to use this with Antigravity

1. Create the repo, save this document as docs/BLUEPRINT.md, and save the rules in Section 8.3 as AGENTS.md at the repo root.
2. Paste the master prompt below into Antigravity's agent manager, then feed it ONE phase at a time from Section 9. Do not ask for the whole project at once; agents drift on huge tasks.
3. After each phase, ask the agent to run the app, test it in the browser, and list what is REAL, DERIVED or SIMULATED on screen.
4. Keep a human check: you must be able to explain every module using the Q&A bank in Section 11. AI-written code you cannot defend loses the Presentation marks.

Master prompt:

```
You are the lead engineer for JalDrishti, a flood-intelligence platform for the ASTRA 2026 hackathon (theme: Space). Read docs/BLUEPRINT.md completely before writing code. Build phase by phase (Section 9). For each phase: implement, write tests, run the app, verify the acceptance criteria in a browser, then summarise what is REAL, DERIVED or SIMULATED. Never invent metrics or data: every number in the UI must come from a file in /data or from code. If something in the blueprint is impossible (an API changed, a dataset is unavailable), propose the closest alternative and ask before proceeding. Optimise for demo stability, honesty, and a premium UI with purposeful motion.
```

## 1. Strategy: how this scores 100/100

Premise: every team will ship a polished AI-built app. Marks therefore go to depth (real data, real metrics), completeness (sensing to action), reliability (zero demo failures) and the defence in Q&A.

| Criterion | Marks | What we build | Proof the judge sees |
| --- | --- | --- | --- |
| Technical Implementation | 25 | 7+ integrated datasets, trained segmentation model with reported IoU/F1, risk model with spatial cross-validation, routing engine, typed API, tests, CI, Docker, model card | Architecture slide, OpenAPI docs page, repo with CI badge, metrics table |
| Working Prototype & Demo | 20 | Deployed app, 3 pre-processed real events, offline-safe demo mode, guided tour button, health page | Live URL, 3-minute scripted tour, backup video |
| Presentation & Demo | 15 | 5-minute script, rehearsed Q&A bank, one-page poster | Section 11 |
| Innovation & Creativity | 10 | Detect + predict + isolate + route + alert + beacon in one loop; cut-off villages metric; rainfall what-if slider; terrain-based false-positive suppression; explainable priority score | Combination nobody else will have |
| Problem Relevance | 10 | Named users, Indian events, district officer workflow, baseline comparison | Persona slide, before/after on a real event |
| UI/UX | 10 | Design system, scroll-story landing, command center, mobile PWA, 4 languages, WCAG AA, reduced-motion support | Lighthouse and accessibility scores on a slide |
| Scalability & Feasibility | 10 | Cloud-native design, cost estimate, path to NDMA/SDMA integration, reuse for cyclone and fire | Architecture and roadmap slide |

Honesty rule (a scoring strategy, not only ethics): every layer in the UI carries a badge. REAL = direct satellite or public data. DERIVED = our model output. SIMULATED = prototype of a channel we cannot access, such as NavIC messaging. Judges trust teams that label.

## 2. Product definition

**Name:** JalDrishti ('water vision'). Backups if taken: BaadhNetra, FloodSense.

**Users**

- District Disaster Management Officer: decides where to send resources during a flood.
- SDRF/NDRF team leader: needs routes and the locations of stranded people.
- Villager in a low-connectivity area: needs a warning in their own language and a way to call for help.

**Core loop:** SENSE (detect flood extent) -> PREDICT (where it spreads next) -> ASSESS (who and what is affected, who is cut off) -> ACT (prioritise and route) -> REACH (alerts and rescue beacon).

**Domain coverage:** Domain 3 (core), Domain 2 (land cover, cropland impact), Domain 4 (beacon, offline alerts, NavIC-style channel).

**Indian space link (use in the pitch):** NavIC for positioning and short-message delivery; ISRO/NRSC flood-mapping practice (Bhuvan flood hazard atlas) as a benchmark; a documented integration path for EOS-04 (RISAT-1A) SAR data via NRSC/Bhuvan. That data access is registration-gated, so present it as roadmap, never as built.

**Out of scope (say so openly):** hydrodynamic flood-depth modelling and certified operational forecasting. We provide decision support.

## 3. Events and data

### 3.1 Events (pre-processed offline, shipped as static files)

- Primary: Assam, June 2022 (Barak and Brahmaputra basins; Cachar/Silchar and Kamrup/Nalbari areas).
- Secondary: Kerala, August 2018.
- Tertiary: a Bihar (Kosi or Gandak basin) monsoon event. Pick the date after checking Sentinel-1 coverage.

Agent task per event: query Earth Engine for Sentinel-1 IW GRD scenes with the same orbit direction, one dry-period baseline and one to three during-flood acquisitions. Record scene IDs and dates in data/events/EVENT\_ID/manifest.json.

### 3.2 Data sources

| Dataset | Use | Access |
| --- | --- | --- |
| Sentinel-1 GRD (VV, VH) | Flood detection | Earth Engine, COPERNICUS/S1\_GRD |
| Sen1Floods11 | Training and validation labels (includes an Indian event and a held-out Bolivia test set) | Public GitHub and Google Cloud bucket |
| JRC Global Surface Water | Remove permanent water | Earth Engine, JRC/GSW1\_4 |
| MERIT Hydro (HAND, upstream area) | Suppress false positives, risk features | Earth Engine, MERIT/Hydro |
| Copernicus DEM GLO-30 | Slope, radar shadow | Earth Engine |
| GPM IMERG | Rainfall features | Earth Engine, NASA/GPM\_L3 |
| ESA WorldCover 2021 | Cropland and built-up | Earth Engine, ESA/WorldCover/v200 |
| WorldPop | Population | Earth Engine, WorldPop/GP/100m/pop |
| OpenStreetMap | Roads, hospitals, schools, shelters | OSMnx or Overpass |
| Admin boundaries | Village and block ranking | geoBoundaries or OSM |
| Open-Meteo Flood API | Live river-discharge outlook (GloFAS-based) | Free REST API, with cached fallback |
| Copernicus EMS or NRSC flood maps | Independent validation, if one exists for the event | Public portals |

Notes for the agent: dataset IDs and versions change, so verify each in the Earth Engine catalog first. Earth Engine needs a registered Google Cloud project (free for non-commercial use). Store every export with a manifest recording source, date, resolution and licence, and show attributions in the UI footer.

## 4. Architecture

```
OFFLINE PIPELINE (Python, once per event)            SERVING LAYER                       CLIENTS
GEE export -> preprocess -> flood model              Static CDN: raster tiles,           Landing story (Next.js)
  -> risk model -> zonal stats -> OSM graph  ------> PMTiles, GeoJSON, JSON         ---> Command Center (Next.js)
                                                     FastAPI: /route /impact /whatif     Beacon PWA (mobile)
                                                     /alerts /beacons (SSE) /forecast
```

Principles:

- Heavy compute is offline. The demo reads pre-computed artefacts, so it never depends on live downloads or venue Wi-Fi.
- The API is stateless except for beacons (SQLite or in-memory), so it runs on any free tier.
- Raster results are pre-rendered XYZ tiles; vectors are PMTiles or GeoJSON, hosted on a CDN (Cloudflare R2, Vercel or GitHub Pages).
- Every API call has a static JSON fallback in the frontend (graceful degradation, with a visible 'offline mode' chip).
- Docker Compose for local; GitHub Actions for lint, test and build; Vercel for the frontend; Render, Fly.io or Railway for the API.
- Scalability story: tiles and COGs scale on a CDN, the API is horizontally scalable and stateless, new events are a pipeline run rather than code changes, and the same pipeline extends to cyclone surge and forest-fire hazards.

## 5. ML and geospatial pipeline

### 5.1 Flood detection (three tiers; keep each lower tier working as a fallback)

- **Tier A, baseline (build first):** convert Sentinel-1 VV/VH to dB, apply a speckle filter (median 3x3 or refined Lee), do change detection (post minus pre, threshold near -3 dB) combined with an Otsu threshold on post-flood VV, then morphological clean-up and a minimum-area filter.
- **Tier B, main model:** U-Net (segmentation\_models\_pytorch, ResNet34 encoder, ImageNet-pretrained, first convolution adapted) with inputs VV, VH, VV-VH, HAND and slope. Train on the hand-labelled Sen1Floods11 Sentinel-1 split with Dice + BCE loss. Augmentations: flips, rotations, speckle noise. Use a free Colab or Kaggle GPU. Save weights and write a model card.
- **Tier C, stretch:** IBM-NASA Prithvi-EO foundation model. The published Sen1Floods11 recipe uses optical bands, so check its inputs; if it does not take SAR, skip it and say so.
- **Post-processing:** remove permanent water (JRC occurrence above about 90 percent), suppress pixels with HAND above roughly 15 m and slope above roughly 5 degrees (radar shadow and hill false positives; tune per region), drop blobs under about 0.5 ha, fill small holes.
- **Outputs:** flood mask GeoTIFF, polygons GeoJSON, and a model-probability raster rendered as an uncertainty overlay.
- **Metrics (measure, never assume):** IoU, F1, precision and recall on the Sen1Floods11 test and Bolivia held-out sets; an ablation table (baseline vs U-Net vs U-Net with post-processing); per-event overlays; agreement with an independent reference map if available. Show the real numbers in the UI on a Model Card page, including failure cases.

### 5.2 Flood risk and the what-if slider

- Build a susceptibility model: positives from our detected flood masks across several events, negatives sampled outside them. Features: HAND, slope, elevation, upstream area, distance to river, land cover, and IMERG rainfall (24 h, 72 h, 7 day).
- Model: LightGBM or XGBoost with spatial block cross-validation (random splits leak spatially and inflate scores; mention this in the pitch).
- Pre-render risk rasters at five rainfall scenarios (for example +0, +25, +50, +100, +150 mm) and let the UI slider blend between them. This is the what-if feature.
- Add a live river-discharge outlook for the nearest river point from the Open-Meteo Flood API, with a cached fallback.
- Label all of it as decision support, not an operational forecast.

### 5.3 Impact and prioritisation

- Zonal statistics per village or block from the flood mask: flooded area (km2), cropland (ha), built-up (ha), population exposed, road length cut, hospitals/schools/shelters flooded or safe.
- **Cut-off villages (signature metric):** a village is isolated when no road path from it to any non-flooded shelter or hospital remains. Report isolated population. This is more actionable than raw flooded area.
- **Priority score (explainable):** weighted sum of exposed population, flooded fraction, isolation, and critical facilities hit. Show the formula and weight sliders in the UI so officers can retune, and show a per-village breakdown bar.

### 5.4 Routing

- Build the road graph with OSMnx for the district. Remove edges that intersect flood polygons (50 m buffer) and add a cost penalty proportional to flood risk on nearby edges.
- Shelters: OSM schools, community centres and hospitals that are unflooded and on higher ground (HAND above a threshold). Run a multi-target shortest path from any selected village to the nearest safe shelter.
- Return polyline, distance and ETA (speed assumptions by road class, stated in the UI), and an alternate route.
- Stretch: suggest boat staging points near isolated villages.

### 5.5 Alerts

- Generate alerts in English, Hindi, Assamese and Bengali from templates (zone, severity, action, nearest shelter, time).
- Respect SMS limits: about 160 characters in GSM-7, about 70 when Unicode is needed (Indian scripts). Show a character counter and a split warning.
- Export a CAP v1.2 (Common Alerting Protocol) XML file for each alert, the standard format used for public alerting.
- Channels are simulated in a phone mock-up: SMS, voice (IVR script) and app push.

### 5.6 Rescue Beacon (Domain 4, SIMULATED where noted)

- Mobile PWA with a one-tap SOS: GPS fix (Geolocation API), battery level, group size, need type (medical, food, boat).
- Compact payload of about 16 to 32 bytes: latitude and longitude as int32 micro-degrees, timestamp, flag byte, count byte, checksum. Show the encoded string.
- Delivery path: online API; if offline, queue in IndexedDB and retry with background sync; SMS fallback through an sms: link carrying the compact code.
- A SIMULATED NavIC-style satellite short-message channel with latency and fix-quality visuals. State clearly that no NavIC hardware is used.
- Responder console: live feed on the map (Server-Sent Events), auto-clustering, assign to team, status workflow (new, assigned, en route, rescued).

## 6. API and data contracts

**Static artefacts per event** (data/events/EVENT\_ID/): manifest.json, metrics.json, timeline.json, flood\_mask.tif, flood\_polygons.geojson, risk\_0.tif to risk\_150.tif (rainfall scenarios), villages.geojson (with stats), shelters.geojson, roads.pmtiles, and pre-rendered XYZ tile folders for flood, confidence and risk.

**FastAPI endpoints** (typed with Pydantic, OpenAPI at /docs, consistent error body with code and message, CORS enabled, rate limiting on write routes):

| Endpoint | Purpose |
| --- | --- |
| GET /health | Liveness plus data-version check |
| GET /events and GET /events/{id} | Event list; manifest, bounds and summary |
| GET /events/{id}/impact | Ranked villages; accepts weight parameters for the priority score |
| GET /events/{id}/route | From a lat/lon to a shelter id or auto-nearest; returns GeoJSON, distance, ETA, alternate |
| GET /events/{id}/whatif | Rainfall in mm; returns blended risk tile URL and stats |
| GET /forecast/river | Open-Meteo river-discharge outlook for a point, with cached fallback |
| POST /alerts/preview | Zone, severity, language; returns text, character count, SMS segments, CAP XML |
| POST /beacons, PATCH /beacons/{id}, GET /beacons/stream | Create, update status, live Server-Sent Events feed |

**Village feature properties:** village\_id, name, block, population, flooded\_fraction, flooded\_area\_ha, cropland\_flooded\_ha, built\_up\_flooded\_ha, roads\_cut\_km, isolated (boolean), isolated\_population, facilities\_flooded, priority\_score, priority\_breakdown, nearest\_safe\_shelter\_id.

**Beacon fields:** id, lat, lon, timestamp, group\_size, need\_type, battery, channel (online, sms, nav\_sim), status (new, assigned, en\_route, rescued), payload\_code.

## 7. UI/UX specification

Goal: a first impression that reads as a funded product, and a demo that feels like mission control. Beauty must serve comprehension; every animation explains something.

### 7.1 Design language

- Mood: mission-control meets editorial. Dark space-navy canvas, luminous data layers, generous spacing, large confident type.
- Surfaces: glass cards (blurred translucent panels, 1 px hairline borders), subtle film-grain noise, faint grid lines, soft glows on interactive elements.
- Fonts (self-hosted): Space Grotesk for headings, Inter for body, JetBrains Mono for numbers and coordinates. Noto Sans Devanagari and Noto Sans Bengali for Hindi, Assamese and Bengali.
- Icons: Lucide. Illustrations: custom SVG in the palette.

| Token | Value | Use |
| --- | --- | --- |
| space-950 | #050A18 | Page background |
| space-900 | #0B1226 | Panels |
| flood-500 | #3B82F6 | Detected water |
| aurora-400 | #22D3EE | Accents, links, active states |
| saffron-400 | #FF9933 | Routes and highlights (nod to ISRO) |
| amber-400 | #FBBF24 | Warnings |
| alert-500 | #F43F5E | Critical, SOS |
| safe-400 | #34D399 | Safe shelters, rescued |

Colour is never the only signal: pair it with shape, pattern or label (colour-blind safe).

### 7.2 Tech for visuals and motion

Next.js (App Router) with TypeScript, Tailwind, shadcn/ui with Radix, Framer Motion, GSAP with ScrollTrigger, Lenis smooth scroll, React Three Fiber with drei for the globe, MapLibre GL JS with deck.gl for the map, Zustand for state, TanStack Query for data, Recharts or visx for charts, next-intl for languages.

### 7.3 Landing page: a scroll-driven story (each scene is pinned or scrubbed)

0. **Preloader (first visit only, skippable):** an orbit ring draws, logo resolves, about 1.2 s.
1. **Hero:** a 3D globe with night lights and a starfield, a small satellite on a visible orbit path, headline revealed word by word, magnetic CTA buttons (Launch Command Center, Watch the 90-second tour). On scroll the camera dives from orbit down to Assam, and the globe cross-fades into the flat map.
2. **The problem:** pinned scene with large count-up numbers. Do NOT invent statistics. Leave clearly marked TODO placeholders and fill them from NDMA, CWC or official reports, with a small source footnote.
3. **Seeing through clouds:** a drag handle splits optical (blocked by monsoon cloud) from SAR (clear). One-line explanation: radar sees through cloud, day and night.
4. **Detect:** before/after swipe on real Assam imagery; scrubbing the timeline makes the water expand across acquisition dates. Metric chips show the measured IoU and F1.
5. **Predict:** a rain-particle canvas and the what-if slider; the risk heatmap shifts as the slider moves.
6. **Assess:** horizontally scrolled pinned cards with ranked villages, count-ups, and pulsing rings on cut-off villages.
7. **Act and Reach:** the evacuation route draws itself (stroke-dashoffset animation); a phone mock-up receives an Assamese alert with a typewriter effect; a beacon ripples on the map.
8. **Proof:** measured metrics, the stack marquee, and the REAL / DERIVED / SIMULATED legend.
9. **Launch:** aurora-gradient call to action, links to the repo, model card and about page (data attributions).

### 7.4 Command Center (the demo workhorse)

- **Top bar:** logo, event selector (also a Ctrl+K command palette), Replay/Live chip, language switcher, guided-tour button.
- **Left rail:** layer panel with toggles, opacity sliders and REAL/DERIVED/SIMULATED badges. **Bottom:** time scrubber with play/pause, satellite-acquisition ticks and forecast ticks.
- **Centre:** MapLibre map with deck.gl layers, optional terrain, animated flood fill (gentle opacity pulse and flow), before/after swipe tool, measure tool.
- **Right drawer (tabs):** Impact, Villages, Routes, Alerts, Beacons, Model. Above the map, a KPI strip of five animated counters (flooded km2, people exposed, cropland ha, roads cut, isolated villages).
- **Village panel:** priority breakdown bar, buttons Generate route and Send alert.
- **Interactions:** click a village to fly to it with eased motion and slide in its panel; hover tooltips; the route draws animated; the alert preview opens a modal containing the phone mock-up; keyboard shortcuts; undo toasts; shimmer skeletons while loading; designed empty states.
- **Data view:** a toggle that shows the same information as an accessible table.
- **Mobile:** bottom sheet replaces the right drawer.

### 7.5 Beacon PWA (mobile-first)

Installable (manifest and service worker). A large SOS button with hold-to-confirm (1.5 s ring fill) so it cannot be triggered by accident; vibration feedback; status stepper (sent, queued, received, assigned); offline banner; language toggle; high-contrast mode; the encoded payload shown for transparency.

### 7.6 Motion rules and catalogue

| Element | Effect | Notes |
| --- | --- | --- |
| Smooth scroll | Lenis | Disabled under reduced motion |
| Section reveals | Fade and rise, 60 ms stagger | transform and opacity only |
| Headlines | Split-by-word reveal | Framer Motion |
| Counters | Count-up, 1.2 s ease-out | Triggered in view |
| Buttons | Magnetic hover, glow | Subtle, under 8 px travel |
| Cards | Hover tilt, border glow | Pointer only, not touch |
| Background | Parallax starfield, cursor glow | Canvas, pauses when hidden |
| Pinned scenes | GSAP ScrollTrigger scrub | One pin per scene |
| Page transitions | 400 ms, cubic-bezier(0.22, 1, 0.36, 1) | Shared easing everywhere |
| Map | Eased fly-to, animated route line | MapLibre and deck.gl |

Rules: animate only transform and opacity; keep 60 fps; honour prefers-reduced-motion (drop parallax and pinning, keep simple fades); fall back to a static hero image if WebGL is unavailable; lazy-load three.js after first paint; use AVIF or WebP images; self-host fonts with swap. Targets: Lighthouse performance 90 or more on desktop and 80 or more on mobile, accessibility 95 or more.

### 7.7 Accessibility and languages

WCAG 2.2 AA contrast; visible focus rings; keyboard-operable map controls, drawers and tabs; aria-live regions for new alerts and beacons; the table data view for the map; plain-language copy. Languages: English, Hindi, Assamese and Bengali (Assamese uses the Bengali script, so verify the font renders it).

### 7.8 Visual assets

Globe textures from NASA Blue Marble (public domain), a procedural starfield, a low-poly satellite built procedurally or CC0, custom SVG illustrations, Lottie for loaders. Mention ISRO, NavIC and Sentinel in text only; do not use logos without permission. Credit all data sources on the about page.

## 8. Stack, repository and agent rules

### 8.1 Stack

Frontend: Next.js, TypeScript, Tailwind, Framer Motion, GSAP, R3F, MapLibre, deck.gl. Backend: FastAPI, Pydantic, NetworkX with OSMnx, SQLite. Pipeline: Python, earthengine-api, rasterio, geopandas, PyTorch, segmentation\_models\_pytorch, LightGBM. Ops: Docker Compose, GitHub Actions, Vercel, Render or Fly.io, Cloudflare R2.

### 8.2 Repository layout

```
jaldrishti/
  apps/web/           Next.js app (landing, command-center, beacon)
  apps/api/           FastAPI service
  pipeline/           GEE export, preprocessing, models, zonal stats, graph build
  notebooks/          Reproducible training and evaluation
  data/events/        Static artefacts per event (git-lfs or R2)
  docs/               BLUEPRINT.md, MODEL_CARD.md, ARCHITECTURE.md, API.md
  tests/              pytest and Playwright
  AGENTS.md  Makefile  docker-compose.yml
```

### 8.3 AGENTS.md (paste into the repo root)

```
- Read docs/BLUEPRINT.md before any task. Work only on the current phase.
- Never hard-code or invent data, metrics or statistics. UI numbers come from /data or code.
- Label every layer REAL, DERIVED or SIMULATED.
- Compute areas in a projected CRS (UTM), never in EPSG:4326.
- Type everything; run lint, type-check and tests before declaring a phase done.
- Every API call needs a static fallback. DEMO_MODE=1 must work with zero network.
- Animate only transform and opacity; respect prefers-reduced-motion.
- No secrets in the repo. Keep Earth Engine credentials in the pipeline only.
- After each phase, write a short REPORT (what is real, what is simulated, known gaps).
```

## 9. Build phases with acceptance criteria

| Phase | Scope | Done when |
| --- | --- | --- |
| P0 | Repo, CI, Docker, design tokens, base layout | Web and API run locally; CI green; a tokens preview page exists |
| P1 | Data export and Tier A baseline for Assam 2022 | Manifest recorded; baseline mask shown on the map; baseline metrics measured against a reference |
| P2 | U-Net training and post-processing | IoU, F1, precision and recall reported on test and Bolivia sets; ablation table; model card written |
| P3 | Impact, isolation, priority score | villages.geojson has all fields; isolation logic unit-tested on a toy graph |
| P4 | Routing and alerts | Tests prove routes avoid flood polygons; CAP XML validates; SMS counter correct for Unicode |
| P5 | Risk model, what-if, river outlook | Spatial CV score reported; slider updates in under 300 ms from pre-rendered tiles |
| P6 | Command Center UI | All tabs work with static fallback; keyboard accessible; accessibility audit passes |
| P7 | Landing scroll story and motion | All scenes built; reduced-motion mode works; performance targets met |
| P8 | Beacon PWA and responder console | Offline queue works in airplane mode; live feed updates; hold-to-confirm works |
| P9 | Second and third events, docs | Event switching works; README with GIF, architecture diagram and model card done |
| P10 | Hardening and deployment | Live URL stable; DEMO\_MODE verified offline; backup video recorded; two full rehearsals done |

First, outside the phases: register for Earth Engine today (approval can take time), check Sentinel-1 coverage for each event, and decide who presents.

## 10. Quality, testing and demo safety

- **Tests:** pytest for isolation, routing, CAP, payload encode/decode and SMS segmentation; Playwright end-to-end run of the guided tour; type-check, lint and pre-commit in CI.
- **Data validation:** schema checks on every artefact; verify CRS, nodata and bounds. Reproducibility through Makefile targets, fixed seeds and notebooks.
- **Performance:** first map paint under 2.5 s; API p95 under 300 ms; long-cache headers on tiles.
- **Demo safety:** DEMO\_MODE serves everything from static files; the service worker caches the app shell; keep a local build on the laptop plus phone hotspot; record a backup video; deploy a second copy on another host.
- **Privacy and security:** the demo uses synthetic beacons; collect no personal data; state this on the Beacon page; rate-limit writes; scan dependencies.
- **Licences and attribution:** OpenStreetMap (ODbL, attribution required), WorldPop and ESA WorldCover (CC BY 4.0), Copernicus Sentinel data, JRC and MERIT Hydro terms. List them all on the about page.

## 11. Pitch and defence

**Deck (10 slides):** hook story, problem and user, why existing tools leave a gap, solution loop, live demo, how it works (architecture), measured results, scalability and cost, roadmap with ISRO integration path, close.

**Five-minute script**

- 0:00 to 0:30: hook. A district officer at 2 a.m., clouds everywhere, no optical imagery, hundreds of villages.
- 0:30 to 1:30: problem, user and the one-sentence solution (sense, predict, assess, act, reach).
- 1:30 to 3:30: live demo. Select the Assam event, scrub the timeline as water expands, show the KPI strip, click a cut-off village, generate the route, preview the Assamese alert, trigger a beacon from a phone and watch it appear.
- 3:30 to 4:15: measured IoU and F1 against the baseline, spatial cross-validation, honest limitations.
- 4:15 to 4:45: scalability, cost, path to state disaster management authorities, extension to other hazards.
- 4:45 to 5:00: close with the ask and the one thing to remember.

**Q&A bank (rehearse every answer)**

1. Why SAR instead of optical? Monsoon clouds block optical sensors exactly when floods happen; SAR works through cloud, day and night.
2. How do you handle false positives? Permanent-water mask, HAND and slope filters for shadow and hills, minimum-area filter, and a confidence overlay; remaining failure cases are shown on the model card.
3. How accurate is it? Quote the measured IoU and F1 on the test and Bolivia held-out sets, and the baseline comparison. Never quote a number you have not measured.
4. Is it real time? Not truly: Sentinel-1 revisit is days, so detection supports the response and recovery phase, while the risk model supports preparedness. The roadmap adds more SAR sources, including EOS-04, to cut latency.
5. What is simulated? The satellite short-message channel and SMS delivery. Everything simulated is badged.
6. How is this different from Bhuvan, GloFAS or Copernicus EMS? Those provide maps or forecasts. We join detection, prediction, isolation analysis, routing, multilingual alerts and last-mile reporting in one explainable workflow. Acknowledge their value and the interoperability path (CAP, GeoJSON).
7. Why spatial cross-validation? Random splits leak neighbouring pixels between train and test and inflate scores.
8. Cost and scale? Static tiles on a CDN, a stateless API, per-event pipeline runs on free or low-cost tiers; show the estimate.
9. What about flood depth? Out of scope here; roadmap pairs the DEM with a hydrodynamic model.
10. What if no satellite pass is available at the peak? Fall back to the risk layer, river outlook and earlier passes; add other sensors.
11. How did you use AI? Honestly: AI-assisted engineering. We defined the architecture, data and validation, reviewed the code, and wrote tests.
12. Beacon privacy? Demo data is synthetic; a real deployment needs consent, minimal data and local data-protection compliance.

**Assets to prepare:** README with a GIF, 90-second demo video, one-page poster, architecture diagram, model card.

## 12. Risks, cut list and final checklist

| Risk | Mitigation |
| --- | --- |
| Earth Engine approval delay | Register today; keep a manual Sentinel-1 download path |
| Scene gaps in time or place | Check coverage first, pick events accordingly |
| Model underperforms | Keep the baseline, report honestly, show ablations |
| Sparse OSM data in rural areas | State it, supplement shelters manually and show that as an input |
| WebGL or hardware issues | Static hero fallback, reduced scenes on low-power devices |
| Venue Wi-Fi fails | DEMO\_MODE, local build, hotspot, backup video |
| Agent drift or scope creep | One phase at a time, tests and reports per phase |

**Cut order if time slips (cut first to last):** Prithvi tier, boat staging, third event, risk rainfall scenarios beyond three, then landing extras. Never cut: measured metrics, routing, isolation metric, the demo-mode fallback, accessibility.

**Final checklist**

- [ ] Live URL works on mobile and desktop
- [ ] DEMO\_MODE verified with the network off
- [ ] Every metric on screen traces to metrics.json
- [ ] REAL, DERIVED and SIMULATED badges on every layer
- [ ] Model card, README, architecture diagram and about page published
- [ ] Backup video recorded
- [ ] Two full timed rehearsals with Q&A
