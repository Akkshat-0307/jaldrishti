import React from "react";
import Link from "next/link";
import { Database, Scale, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

interface Attribution {
  dataset: string;
  provider: string;
  license: string;
  licenseUrl: string;
  usage: string;
  badge: "real" | "derived" | "simulated";
  details: string;
}

const ATTRIBUTIONS: Attribution[] = [
  {
    dataset: "Copernicus Sentinel-1 SAR (IW GRD)",
    provider: "European Space Agency (ESA) / Copernicus Programme",
    license: "Copernicus Open Access Policy",
    licenseUrl: "https://sentinels.copernicus.eu/web/sentinel/sentinel-data-access/access-to-sentinel-data",
    usage: "Dual-polarization (VV + VH) microwave backscatter for cloud-penetrating water detection.",
    badge: "real",
    details:
      "Captured at C-band (5.405 GHz) in Interferometric Wide Swath mode at 10m resolution. Single scene acquisitions: May 1 baseline (S1A...1E38), June 18 peak flood (S1A...E87E), and June 30 recession (S1A...3654), Relative Orbit 77, Descending pass (not composites).",
  },
  {
    dataset: "Copernicus DEM GLO-30 (30m)",
    provider: "Copernicus Space Component / ESA",
    license: "Copernicus Open Access Policy",
    licenseUrl: "https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model",
    usage: "30m global digital elevation model for calculating terrain slope and radar shadow masking.",
    badge: "real",
    details:
      "Terrain slope computed via ee.Terrain.slope(dem). Slopes > 5.0° are masked out in pipeline/baseline.py and pipeline/infer_unet.py to eliminate radar shadow false positives.",
  },
  {
    dataset: "WorldPop Gridded Population (100m)",
    provider: "WorldPop Research Group, University of Southampton",
    license: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    usage: "High-resolution UN-adjusted population distribution for exposure and cut-off aggregation.",
    badge: "real",
    details:
      "100m raster clipped strictly to the Cachar study window. Reconciled to exactly 427,338 inhabitants across all 20 village zones with zero pixel double-counting (101,986 exposed).",
  },
  {
    dataset: "ESA WorldCover 10m 2021 v200",
    provider: "European Space Agency (ESA) WorldCover Consortium",
    license: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    licenseUrl: "https://esa-worldcover.org/en",
    usage: "Land cover classification for cropland (class 40) and built-up infrastructure (class 50).",
    badge: "real",
    details:
      "Used to compute agricultural waterlogging (8,169.66 ha) and settlement exposure (9.0 ha built-up). Note: Rice paddies may overlap with detected water in early monsoon crop stages.",
  },
  {
    dataset: "OpenStreetMap (OSM) & Protomaps Vector Basemap",
    provider: "© OpenStreetMap contributors, Protomaps",
    license: "Open Database License (ODbL 1.0) & BSD-3-Clause",
    licenseUrl: "https://www.openstreetmap.org/copyright",
    usage: "Self-hosted offline vector basemap (PMTiles) covering Cachar study window, drivable road network, emergency shelters, and facilities.",
    badge: "real",
    details:
      "Extracted via OSMnx and Protomaps daily OpenStreetMap build. Exactly 6,918 drivable road segments (5,945 passable, 973 potentially cut / 196.35 km), 32 emergency shelters, and 20 Voronoi village settlement zones.",
  },
  {
    dataset: "JRC Global Surface Water (Occurrence & Seasonality)",
    provider: "European Commission Joint Research Centre (JRC)",
    license: "Open Access / JRC Data Policy",
    licenseUrl: "https://global-surface-water.appspot.com/",
    usage: "Permanent water masking to isolate episodic flood inundation from perennial rivers and lakes.",
    badge: "real",
    details:
      "Pixels with water occurrence > 80.0% (perm_water_threshold_pct = 80.0) are excluded from emergency flood masks to prevent false alarms on natural river courses.",
  },
  {
    dataset: "MERIT Hydro / Height Above Nearest Drainage (HAND)",
    provider: "Yamazaki et al., University of Tokyo",
    license: "CC BY 4.0",
    licenseUrl: "http://hydro.iis.u-tokyo.ac.jp/~yamadai/MERIT_Hydro/",
    usage: "Relative elevation above the drainage network for terrain hydrologic what-if simulations.",
    badge: "real",
    details:
      "Used to gate steep terrain radar shadow (< 15m HAND) and drive hydrodynamic stage anomaly scenarios (-1.0m to +2.0m relative to area-matched h* = 1.50m).",
  },
  {
    dataset: "NASA Visible Earth — Blue Marble Next Generation",
    provider: "NASA Earth Observatory / GSFC",
    license: "Public Domain (US Government Work)",
    licenseUrl: "https://visibleearth.nasa.gov/",
    usage: "Global equirectangular Earth texture for 3D space globe visualization on Landing page.",
    badge: "real",
    details:
      "Public-domain Blue Marble composite downsampled and optimized to 123 KB JPEG for offline, zero-network WebGL rendering.",
  },
  {
    dataset: "Open-Meteo Flood API (ECMWF GloFAS v4.0) & NASA GPM IMERG",
    provider: "Open-Meteo API / ECMWF / NASA Earth Science Data Systems",
    license: "Open-Meteo Non-Commercial / NASA Open Data",
    licenseUrl: "https://open-meteo.com/",
    usage: "Rainfall accumulation histories and 7-day river basin discharge outlooks.",
    badge: "real",
    details:
      "7-day daily forecast horizon (forecast_days=7) for Barak River cell at Silchar (24.825° N, 92.800° E). Statically cached in river_outlook_cached.json for zero-network resilience. Note: This provides current temporal river discharge outlook, not the 2022 event hindcast.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-space-950 text-foreground selection:bg-aurora-400 selection:text-space-950 pb-20">
      {/* Navigation Top Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-space-950/80 border-b border-white/10 px-6 md:px-16 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
          <span className="font-heading font-bold text-lg tracking-wider text-white">
            JAL<span className="text-aurora-400">DRISHTI</span>
          </span>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-xs text-slate-400 uppercase">About &amp; Attributions</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/model">
            <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white">
              Model Card
            </Button>
          </Link>
          <Link href="/command-center">
            <Button size="sm" className="text-xs">
              Command Center
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-12 space-y-16">
        {/* Page Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aurora-400/10 border border-aurora-400/20 text-aurora-400 text-xs font-mono font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>OPEN DATA ATTRIBUTION &amp; METHODOLOGY</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
            Data Provenance, <br />
            <span className="text-aurora-400">Licensing &amp; Operational Safety</span>.
          </h1>

          <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed max-w-3xl">
            JalDrishti adheres to strict scientific honesty and data governance. Every metric in the
            interface traces directly to verified code and authoritative public data sources.
          </p>
        </div>

        {/* Data Governance Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-6 space-y-3 border-safe-400/30">
            <div className="flex items-center gap-2">
              <Badge variant="real">REAL</Badge>
              <h2 className="font-heading font-bold text-white">Direct Observation</h2>
            </div>
            <p className="text-xs font-body text-slate-300 leading-relaxed">
              Measured physical data from satellites, calibrated DEMs, ground census records, or verified
              OpenStreetMap road geometries.
            </p>
          </GlassCard>

          <GlassCard className="p-6 space-y-3 border-amber-400/30">
            <div className="flex items-center gap-2">
              <Badge variant="derived">DERIVED</Badge>
              <h2 className="font-heading font-bold text-white">Algorithmic Output</h2>
            </div>
            <p className="text-xs font-body text-slate-300 leading-relaxed">
              Outputs produced by code running on real data: U-Net segmentation masks, NetworkX shortest paths,
              HAND stage simulations, and priority ranks.
            </p>
          </GlassCard>

          <GlassCard className="p-6 space-y-3 border-alert-500/30">
            <div className="flex items-center gap-2">
              <Badge variant="simulated">SIMULATED</Badge>
              <h2 className="font-heading font-bold text-white">Synthetic Delivery</h2>
            </div>
            <p className="text-xs font-body text-slate-300 leading-relaxed">
              Components modeling hardware channels without live physical links: satellite short-message delivery,
              SMS transmissions, and rescue beacons.
            </p>
          </GlassCard>
        </div>

        {/* Full Attributions List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-aurora-400" /> Source Datasets &amp; Licenses
            </h2>
            <span className="font-mono text-xs text-slate-400">8 Primary Public Catalogues</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {ATTRIBUTIONS.map((item) => (
              <GlassCard key={item.dataset} className="p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Badge variant={item.badge}>{item.badge.toUpperCase()}</Badge>
                    <h3 className="font-heading font-bold text-white text-base">{item.dataset}</h3>
                  </div>
                  <a
                    href={item.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-aurora-400 hover:underline"
                  >
                    <span>{item.license}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs font-mono text-slate-400">
                  <strong className="text-slate-300">Provider:</strong> {item.provider}
                </p>

                <p className="text-sm font-body text-slate-200">{item.usage}</p>

                <p className="text-xs font-body text-slate-400 bg-space-900/60 p-3 rounded-lg border border-white/10">
                  {item.details}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Known Limitations & Responsible AI Guidelines */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-heading font-bold text-white">
              System Limitations &amp; Operational Safety
            </h2>
          </div>

          <GlassCard className="p-6 space-y-4 border-amber-400/30 text-xs font-mono text-slate-300">
            <div className="space-y-2">
              <strong className="text-amber-400 text-sm block">1. 2D Road Graph &amp; Bridge Elevation</strong>
              <p>
                OpenStreetMap roads are modeled as 2D geometries. High bridges, raised bunds, and elevated causeways
                are not vertically distinguished from surface terrain. A 50m flood buffer assumption is applied.
                In reality, high bridges may remain traversable while water flows beneath.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <strong className="text-amber-400 text-sm block">2. Study Window Boundary Truncation</strong>
              <p>
                All analysis is strictly bounded within the Cachar study window (92.70°E–92.90°E, 24.75°N–24.90°N).
                Roads leaving this bounding box are truncated at the border. Consequently, 5 of the 8 cut-off zones
                touch the window edge, which may overstate isolation if external bypass corridors exist outside the window.
                Exactly 3 zones (Masimpur, Dudhpatil, Tupkhana) are robust interior isolations.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <strong className="text-amber-400 text-sm block">3. Revisit Latency vs. Flash Floods</strong>
              <p>
                Sentinel-1 SAR has an orbital revisit interval of several days. Satellite radar detection is best
                suited for synoptic emergency response, recovery prioritization, and macro-inundation mapping rather
                than minute-by-minute flash flood warnings.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <strong className="text-amber-400 text-sm block">4. What-If Planning Aid Status</strong>
              <p>
                The HAND water-level simulation is an interactive terrain heuristic. It is NOT a hydrodynamic or
                meteorological forecast, has not been calibrated for localized culvert discharge, and must be treated
                as a relative decision-support exercise.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
