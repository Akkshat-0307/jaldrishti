# Data Sources — JalDrishti

All data layers are labelled **REAL**, **DERIVED**, or **SIMULATED** per AGENTS.md.

## Satellite Imagery

| Layer | Source | Dataset ID | License | Date |
|-------|--------|-----------|---------|------|
| Sentinel-1 SAR (training chips) | ESA Copernicus via Google Earth Engine | `COPERNICUS/S1_GRD` | Copernicus Open Access | 2016–2022 |
| Sentinel-1 Assam composite (June 2022) | ESA Copernicus via GEE | `COPERNICUS/S1_GRD` | Copernicus Open Access | 2022-06-16 to 2022-06-22 |
| Sentinel-1 reference composite (May 2022) | ESA Copernicus via GEE | `COPERNICUS/S1_GRD` | Copernicus Open Access | 2022-05-01 to 2022-05-10 |

**Label:** REAL

## Flood Labels (Training)

| Layer | Source | URL | License |
|-------|--------|-----|---------|
| Sen1Floods11 hand-labelled chips | Bonafilia et al. 2020 | `gs://sen1floods11` | CC BY 4.0 |
| Official train/valid/test splits | Sen1Floods11 authors | Same bucket | CC BY 4.0 |
| Bolivia held-out split | Sen1Floods11 authors | Same bucket | CC BY 4.0 |

**Label:** REAL

## Terrain & Ancillary

| Layer | Source | Dataset ID | License | CRS |
|-------|--------|-----------|---------|-----|
| HAND (Height Above Nearest Drainage) | Yamazaki et al. via GEE | `MERIT/Hydro` | CC BY 4.0 | UTM 46N |
| Slope | SRTM 30 m via GEE | `USGS/SRTMGL1_003` | Public domain | UTM 46N |
| JRC Surface Water | EC JRC via GEE | `JRC/GSW1_4/GlobalSurfaceWater` | CC BY 4.0 | WGS84 |

**Label:** REAL

## Population & Land Cover

| Layer | Source | Dataset ID | License | Year |
|-------|--------|-----------|---------|------|
| Population density | WorldPop — GP 100 m | `WorldPop/GP/100m/pop` | CC BY 4.0 | 2020 (latest available via GEE) |
| Land cover | ESA WorldCover v200 | `ESA/WorldCover/v200` | CC BY 4.0 | 2021 |

**Label:** REAL (modelled estimates for WorldPop)

## Infrastructure (OSM)

| Layer | Source | Query | License |
|-------|--------|-------|---------|
| Road network | OpenStreetMap via OSMnx | `drive` network, Cachar window | ODbL 1.0 |
| Hospitals | OSM Overpass API | `amenity=hospital\|clinic` | ODbL 1.0 |
| Schools | OSM Overpass API | `amenity=school\|college` | ODbL 1.0 |

**Label:** REAL (OSM completeness varies; treat as indicative)

## Derived Layers

| Layer | Source Data | Method | Label |
|-------|------------|--------|-------|
| Flood mask (Assam) | Sentinel-1 composite → U-Net | Deep learning segmentation | DERIVED |
| HAND what-if scenarios | HAND raster + threshold h* | HAND ≤ h* → flooded | DERIVED |
| Cut-off zones | Road graph + flood mask | 50 m buffer intersection | DERIVED |
| Priority scores | Population + hospital + school + isolation | Weighted sum (see docs/BLUEPRINT.md §4) | DERIVED |
| Voronoi zones | Road intersections | `shapely.voronoi_diagram` | DERIVED |
| Routing ETAs | OSM speeds + shortest path | NetworkX Dijkstra | DERIVED |
