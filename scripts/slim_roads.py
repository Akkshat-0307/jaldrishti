#!/usr/bin/env python3
"""
Slim roads.geojson for high-performance offline mapping:
1. Filters drivable roads inside Cachar bbox plus small margin.
2. Merges continuous road edges by (is_cut, highway, name) via shapely linemerge.
3. Drops unused properties (keeps only is_cut, highway, and real names).
4. Rounds coordinates to 5 decimal places (~1.1 meter precision).
5. Writes compact JSON to both data/events and apps/web/public/data/events.
"""

import json
import os
import sys
from pathlib import Path
import shapely.geometry as sg
from shapely.ops import linemerge

BBOX = (92.58, 24.63, 93.02, 25.02)  # Cachar bbox [92.60, 24.65, 93.00, 25.00] + 0.02 margin

DRIVABLE_HIGHWAYS = {
    "residential",
    "unclassified",
    "service",
    "tertiary",
    "trunk",
    "secondary",
    "primary",
    "living_street",
}

def slim_roads():
    root = Path(__file__).resolve().parent.parent
    src_path = root / "data" / "events" / "assam-2022" / "roads.geojson"
    web_dst_path = root / "apps" / "web" / "public" / "data" / "events" / "assam-2022" / "roads.geojson"

    if not src_path.exists():
        print(f"Source file {src_path} not found.")
        sys.exit(1)

    orig_size_bytes = os.path.getsize(src_path)
    print(f"Reading {src_path} (original size: {orig_size_bytes / (1024 * 1024):.2f} MB)...")

    with open(src_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    orig_count = len(data.get("features", []))

    # Group valid drivable lines inside window by (is_cut, highway, name)
    groups = {}
    bbox_poly = sg.box(*BBOX)

    for feat in data.get("features", []):
        props = feat.get("properties", {})
        highway = str(props.get("highway", "residential")).lower()
        if highway not in DRIVABLE_HIGHWAYS:
            continue

        coords = feat.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            continue

        line = sg.LineString(coords)
        if not line.intersects(bbox_poly):
            continue

        is_cut = bool(props.get("is_cut", False))
        name = props.get("name", "")
        if name and name.startswith("Unnamed Road"):
            name = ""

        key = (is_cut, highway, name)
        groups.setdefault(key, []).append(line)

    slim_features = []
    for (is_cut, highway, name), lines in groups.items():
        merged = linemerge(lines)
        if merged.geom_type == "LineString":
            geoms = [merged]
        elif merged.geom_type == "MultiLineString":
            geoms = list(merged.geoms)
        else:
            continue

        for g in geoms:
            rounded_coords = [[round(pt[0], 5), round(pt[1], 5)] for pt in g.coords]
            p = {"highway": highway, "is_cut": is_cut}
            if name:
                p["name"] = name
            slim_features.append({
                "type": "Feature",
                "properties": p,
                "geometry": {
                    "type": "LineString",
                    "coordinates": rounded_coords,
                },
            })

    output_geojson = {
        "type": "FeatureCollection",
        "features": slim_features,
    }

    compact_json = json.dumps(output_geojson, separators=(",", ":"))
    new_size_bytes = len(compact_json.encode("utf-8"))

    # Write to source and web public copies
    with open(src_path, "w", encoding="utf-8") as f:
        f.write(compact_json)

    web_dst_path.parent.mkdir(parents=True, exist_ok=True)
    with open(web_dst_path, "w", encoding="utf-8") as f:
        f.write(compact_json)

    print(f"Features: {orig_count} micro-segments -> {len(slim_features)} merged LineStrings")
    print(f"Size: {orig_size_bytes / (1024 * 1024):.2f} MB -> {new_size_bytes / (1024 * 1024):.2f} MB")
    print(f"Reduction: {(1.0 - (new_size_bytes / orig_size_bytes)) * 100:.1f}%")

if __name__ == "__main__":
    slim_roads()
