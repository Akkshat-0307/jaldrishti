"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  CloudRain,
  Compass,
  Copy,
  Download,
  Info,
  Layers,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
} from "lucide-react";

// Dynamically import MapLibre component to disable SSR
const FloodMap = dynamic(() => import("@/components/map/FloodMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[650px] rounded-2xl border border-white/10 bg-space-950 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-aurora-400 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs text-slate-400">Loading MapLibre WebGL Canvas...</span>
    </div>
  ),
});

interface VillageProperties {
  zone_id: string;
  rank: number;
  name: string;
  block: string;
  place_type?: string;
  population: number;
  population_exposed: number;
  population_of_cutoff_zone?: number;
  population_exposed_in_cutoff_zone?: number;
  flooded_fraction: number;
  flooded_area_ha: number;
  total_area_ha: number;
  cropland_flooded_ha: number;
  cropland_flooded_or_waterlogged_ha?: number;
  built_up_flooded_ha: number;
  roads_cut_km: number;
  roads_potentially_cut_km?: number;
  isolated: boolean;
  dry_disconnected: boolean;
  isolated_population: number;
  is_on_boundary_edge?: boolean;
  facilities_flooded: number;
  priority_score: number;
  priority_breakdown: {
    population_exposed_term: number;
    flooded_fraction_term: number;
    isolation_term: number;
    critical_facilities_term: number;
  };
  nearest_safe_shelter_id?: string;
  safe_shelter_distance_km?: number;
  layer_type?: string;
  methodology_note?: string;
}

interface StagingHint {
  available: boolean;
  zone_staging_coordinates?: number[];
  safe_network_entry_coordinates?: number[];
  straight_line_distance_km?: number;
  recommended_mode?: string;
  evacuation_protocol?: string;
}

interface RouteItem {
  has_route: boolean;
  status: string;
  origin: { label: string; lon: number; lat: number };
  destination_shelter?: {
    shelter_id: string;
    name: string;
    facility_type: string;
    coordinates: number[];
  };
  distance_km: number;
  eta_minutes: number;
  polyline: number[][];
  alternate: number[][];
  alternate_distance_km?: number;
  alternate_eta_minutes?: number;
  has_alternate?: boolean;
  assumptions: string[];
  staging_hint?: StagingHint;
  geojson?: GeoJSON.FeatureCollection;
}

const DELTA_TAGS: Record<number, string> = {
  [-1.0]: "m10",
  [-0.5]: "m05",
  0.0: "p00",
  0.5: "p05",
  1.0: "p10",
  2.0: "p20",
};

export default function CommandCenterPage() {
  const [activeTab, setActiveTab] = useState<
    "map" | "villages" | "routes" | "alerts" | "whatif" | "ablation" | "failure_cases" | "manifest"
  >("map");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>("zone_20");
  const [robustCutoffsOnly, setRobustCutoffsOnly] = useState<boolean>(false);
  const [mapModel, setMapModel] = useState<"tier_a" | "unet" | "whatif">("unet");

  // Priority formula dynamic weights (defaults from Blueprint Section 6)
  const [wPop, setWPop] = useState<number>(0.35);
  const [wFlood, setWFlood] = useState<number>(0.25);
  const [wIso, setWIso] = useState<number>(0.30);
  const [wFac, setWFac] = useState<number>(0.10);

  // Raw zones data
  const [rawVillages, setRawVillages] = useState<VillageProperties[]>([]);
  const [loadingVillages, setLoadingVillages] = useState<boolean>(true);

  // Precomputed routes data
  const [routesMap, setRoutesMap] = useState<Record<string, RouteItem>>({});

  // What-If & Context Data
  const [selectedDeltaM, setSelectedDeltaM] = useState<number>(0.0);
  const [scenariosIndex, setScenariosIndex] = useState<{
    scenarios_count: number;
    available_deltas_m: number[];
    h_star_baseline_m: number;
    observed_reference: {
      flooded_area_ha: number;
      exposed_population: number;
      cutoff_zones_count: number;
    };
    scenarios: Array<{
      delta_m: number;
      delta_tag: string;
      effective_water_level_m: number;
      flooded_area_ha: number;
      exposed_population: number;
      cropland_waterlogged_ha: number;
      roads_potentially_cut_km: number;
      cutoff_zones_count: number;
      cutoff_zones_robust_count: number;
      isolated_population: number;
    }>;
  } | null>(null);
  const [currentScenario, setCurrentScenario] = useState<{
    delta_m: number;
    delta_tag: string;
    effective_water_level_m: number;
    h_star_baseline_m: number;
    geojson_file: string;
    metrics: {
      flooded_area_ha: number;
      flooded_area_km2: number;
      exposed_population: number;
      cropland_waterlogged_ha: number;
      built_up_flooded_ha: number;
      roads_potentially_cut_km: number;
      cutoff_zones_count: number;
      cutoff_zones_robust_count: number;
      cutoff_zones_touching_edge_count: number;
      cutoff_zones_robust: string[];
      cutoff_zones_touching_edge: string[];
      isolated_population: number;
    };
    comparison_with_observed_unet: {
      observed_flood_area_ha: number;
      delta_area_ha: number;
      observed_exposed_population: number;
      delta_exposed_population: number;
      observed_cutoff_zones_count: number;
      delta_cutoff_zones_count: number;
    };
    zones: Array<{
      zone_id: string;
      rank: number;
      name: string;
      population: number;
      population_exposed: number;
      flooded_fraction: number;
      flooded_area_ha: number;
      cropland_flooded_or_waterlogged_ha: number;
      roads_potentially_cut_km: number;
      isolated: boolean;
      touches_window_edge: boolean;
      priority_score: number;
    }>;
    methodology_note: string;
  } | null>(null);
  const [rainfallData, setRainfallData] = useState<{
    provenance: string;
    dataset_id: string;
    rainfall_summary: {
      accum_1day_mm: number;
      accum_3day_mm: number;
      accum_7day_mm: number;
    };
    daily_timeline: Array<{ date: string; rainfall_mm: number }>;
  } | null>(null);
  const [riverData, setRiverData] = useState<{
    river_name: string;
    station_location: string;
    model_source: string;
    layer_provenance: string;
    current_discharge_m3s: number;
    peak_forecast_discharge_m3s: number;
    trend: string;
    flood_severity: string;
    daily_forecast: Array<{
      date: string;
      discharge_m3s: number;
      mean_m3s: number;
      max_m3s: number;
      min_m3s: number;
    }>;
  } | null>(null);

  // Alerts tab state
  const [alertSeverity, setAlertSeverity] = useState<"advisory" | "warning" | "evacuate">("warning");
  const [alertLang, setAlertLang] = useState<"en" | "hi" | "as" | "bn">("en");
  const [copiedXml, setCopiedXml] = useState(false);

  // Load static settlement zones, routes, scenarios, rainfall, and river data
  useEffect(() => {
    async function fetchData() {
      try {
        const [vRes, rRes, sIdxRes, sInitRes, rfRes, rvRes] = await Promise.all([
          fetch("/data/events/assam-2022/villages.geojson"),
          fetch("/data/events/assam-2022/routes.json"),
          fetch("/data/events/assam-2022/scenarios/index.json"),
          fetch("/data/events/assam-2022/scenarios/scenario_p00.json"),
          fetch("/data/events/assam-2022/rainfall_imerg.json"),
          fetch("/data/events/assam-2022/river_outlook_cached.json"),
        ]);
        if (vRes.ok) {
          const data = await vRes.json();
          const items: VillageProperties[] = (data.features || []).map(
            (f: { properties: VillageProperties }) => f.properties
          );
          setRawVillages(items);
        }
        if (rRes.ok) {
          const rData = await rRes.json();
          setRoutesMap(rData);
        }
        if (sIdxRes.ok) {
          const sIdx = await sIdxRes.json();
          setScenariosIndex(sIdx);
        }
        if (sInitRes.ok) {
          const sInit = await sInitRes.json();
          setCurrentScenario(sInit);
        }
        if (rfRes.ok) {
          const rf = await rfRes.json();
          setRainfallData(rf);
        }
        if (rvRes.ok) {
          const rv = await rvRes.json();
          setRiverData(rv);
        }
      } catch (err) {
        console.error("Error loading event data:", err);
      } finally {
        setLoadingVillages(false);
      }
    }
    fetchData();
  }, []);

  // Sync scenario when delta changes
  useEffect(() => {
    async function loadScenario() {
      const tag = DELTA_TAGS[selectedDeltaM] || "p00";
      try {
        const res = await fetch(`/data/events/assam-2022/scenarios/scenario_${tag}.json`);
        if (res.ok) {
          const data = await res.json();
          setCurrentScenario(data);
        }
      } catch (err) {
        console.error("Error loading scenario:", err);
      }
    }
    loadScenario();
  }, [selectedDeltaM]);

  // Dynamically re-calculate priority scores and re-rank whenever weights or data change
  const rankedVillages = useMemo(() => {
    if (!rawVillages.length) return [];

    const totalWeight = (wPop + wFlood + wIso + wFac) || 1.0;

    const scored = rawVillages.map((v) => {
      const pNorm = Math.min(1.0, v.population_exposed / 20000.0);
      const fNorm = Math.min(1.0, Math.max(0.0, v.flooded_fraction));
      const iTerm = v.isolated ? 1.0 : 0.0;
      const cNorm = Math.min(1.0, (v.facilities_flooded || 0) / 5.0);

      const pTerm = (wPop * pNorm / totalWeight) * 100.0;
      const fTerm = (wFlood * fNorm / totalWeight) * 100.0;
      const iTermVal = (wIso * iTerm / totalWeight) * 100.0;
      const cTerm = (wFac * cNorm / totalWeight) * 100.0;

      const priorityScore = parseFloat((pTerm + fTerm + iTermVal + cTerm).toFixed(1));

      return {
        ...v,
        priority_score: priorityScore,
        priority_breakdown: {
          population_exposed_term: parseFloat(pTerm.toFixed(1)),
          flooded_fraction_term: parseFloat(fTerm.toFixed(1)),
          isolation_term: parseFloat(iTermVal.toFixed(1)),
          critical_facilities_term: parseFloat(cTerm.toFixed(1)),
        },
      };
    });

    scored.sort((a, b) => b.priority_score - a.priority_score);

    return scored.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [rawVillages, wPop, wFlood, wIso, wFac]);

  const displayedVillages = useMemo(() => {
    if (!robustCutoffsOnly) return rankedVillages;
    return rankedVillages.filter((v) => !v.isolated || !v.is_on_boundary_edge);
  }, [rankedVillages, robustCutoffsOnly]);

  const activeZone = useMemo(() => {
    if (!rankedVillages.length) return null;
    if (!selectedZoneId) return rankedVillages[0];
    return rankedVillages.find((v) => v.zone_id === selectedZoneId) || rankedVillages[0];
  }, [rankedVillages, selectedZoneId]);

  const activeRoute = useMemo<RouteItem | null>(() => {
    if (!activeZone) return null;
    return routesMap[activeZone.zone_id] || null;
  }, [activeZone, routesMap]);

  const resetWeights = () => {
    setWPop(0.35);
    setWFlood(0.25);
    setWIso(0.30);
    setWFac(0.10);
  };

  // Multilingual alert text computation for active zone
  const alertDetails = useMemo(() => {
    if (!activeZone) return null;

    const zName = activeZone.name;
    const isCutoff = activeZone.isolated;
    const shelter = activeRoute?.destination_shelter?.name || "District Relief Center";
    const dist = activeRoute?.distance_km ? activeRoute.distance_km.toFixed(1) : "5.0";
    const stagingDist = activeRoute?.staging_hint?.straight_line_distance_km
      ? activeRoute.staging_hint.straight_line_distance_km.toFixed(1)
      : "1.5";

    let text = "";
    if (alertLang === "en") {
      if (alertSeverity === "advisory") {
        text = isCutoff
          ? `[JalDrishti] ${zName}: Flood level rising. Roads cut off. High ground staging: ${stagingDist}km.`
          : `[JalDrishti] ${zName}: Flood level rising. Monitor alerts. Nearest shelter: ${shelter} (${dist}km).`;
      } else if (alertSeverity === "warning") {
        text = isCutoff
          ? `[JalDrishti Warning] ${zName}: Road egress severed. Pack essentials. Prepare for boat/air staging: ${stagingDist}km.`
          : `[JalDrishti Warning] ${zName}: Flood water approaching. Pack medication & docs. Move to ${shelter} (${dist}km).`;
      } else {
        text = isCutoff
          ? `[JalDrishti EVACUATE] ${zName}: Severe flood isolation. Do not drive. Move to elevated ground. Staging: ${stagingDist}km.`
          : `[JalDrishti EVACUATE] ${zName}: Extreme flooding. Evacuate now via safe route to ${shelter} (${dist}km). Follow NDRF.`;
      }
    } else if (alertLang === "hi") {
      if (alertSeverity === "advisory") {
        text = isCutoff
          ? `[जलदृष्टि सूचना] ${zName}: बाढ़ स्तर बढ़ रहा है। सड़क मार्ग अवरुद्ध। सुरक्षित दूरी: ${stagingDist}km।`
          : `[जलदृष्टि सूचना] ${zName}: बाढ़ स्तर बढ़ रहा है। आश्रय: ${shelter} (${dist}km)।`;
      } else if (alertSeverity === "warning") {
        text = isCutoff
          ? `[जलदृष्टि चेतावनी] ${zName}: सड़क मार्ग जलमग्न। नाव बचाव दूरी: ${stagingDist}km। ऊंचे स्थल पर रहें।`
          : `[जलदृष्टि चेतावनी] ${zName}: बाढ़ आ रही है। आवश्यक दवाएं लेकर ${shelter} (${dist}km) जाएं।`;
      } else {
        text = isCutoff
          ? `[जलदृष्टि आपात] ${zName}: सड़क बंद। छत/ऊंचे स्थान पर जाएं। राहत बिंदु: ${stagingDist}km।`
          : `[जलदृष्टि आपात] ${zName}: तुरंत ${shelter} (${dist}km) पहुंचें। एनडीआरएफ का सहयोग करें।`;
      }
    } else if (alertLang === "as") {
      if (alertSeverity === "advisory") {
        text = isCutoff
          ? `[জলদৃষ্টি সতৰ্কবাণী] ${zName}: বান বৃদ্ধি পাইছে। পথ বন্ধ। ওখ স্থানলৈ যাওক: ${stagingDist}km।`
          : `[জলদৃষ্টি সতৰ্কবাণী] ${zName}: বান বৃদ্ধি পাইছে। সুৰক্ষিত আশ্ৰয়: ${shelter} (${dist}km)।`;
      } else if (alertSeverity === "warning") {
        text = isCutoff
          ? `[জলদৃষ্টি সঁকীয়নি] ${zName}: পথ বিচ্ছিন্ন। নাও উদ্ধাৰ স্থলী: ${stagingDist}km দূৰত।`
          : `[জলদৃষ্টি সঁকীয়নি] ${zName}: পানী বাঢ়িছে। ঔষধ লৈ ${shelter}লৈ আঁতৰি যাওক (${dist}km)।`;
      } else {
        text = isCutoff
          ? `[জলদৃষ্টি জৰুৰী] ${zName}: পথ প্লাৱিত। ওখ ঠাইত আশ্ৰয় লওক। নাও স্থলী: ${stagingDist}km।`
          : `[জলদৃষ্টি জৰুৰী] ${zName}: তৎকালীনভাৱে ${shelter}লৈ যাওক (${dist}km)। সুৰক্ষা নিৰ্দেশ মানক।`;
      }
    } else {
      // bn (Bengali)
      if (alertSeverity === "advisory") {
        text = isCutoff
          ? `[জলদৃষ্টি সতর্কতা] ${zName}: বন্যার জল বাড়ছে। সড়ক পথ বিচ্ছিন্ন। উঁচু স্থানে যান: ${stagingDist}km।`
          : `[জলদৃষ্টি সতর্কতা] ${zName}: বন্যার জল বাড়ছে। নিরাপদ আশ্রয়: ${shelter} (${dist}km)।`;
      } else if (alertSeverity === "warning") {
        text = isCutoff
          ? `[জলদৃষ্টি সাবধানতা] ${zName}: সড়ক পথ বন্ধ। নৌকা উদ্ধার স্থলী: ${stagingDist}km দূরে।`
          : `[জলদৃষ্টি সাবধানতা] ${zName}: জলমগ্ন হচ্ছে এলাকা। ঔষধপত্র নিয়ে ${shelter} (${dist}km) আশ্রয়ে যান।`;
      } else {
        text = isCutoff
          ? `[জলদৃষ্টি জরুরি] ${zName}: সড়ক বিচ্ছিন্ন। উঁচু স্থানে যান। উদ্ধার কেন্দ্র: ${stagingDist}km।`
          : `[জলদৃষ্টি জরুরি] ${zName}: দ্রুত নিরাপদ আশ্রয় ${shelter} (${dist}km) যান। নির্দেশ মানুন।`;
      }
    }

    // Encoding check (GSM-7 vs Unicode)
    const GSM7_CHARS = new Set(
      "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
    );
    const isGsm7 = Array.from(text).every((c) => GSM7_CHARS.has(c));
    const encoding = isGsm7 ? "GSM-7" : "Unicode";
    const singleLimit = isGsm7 ? 160 : 70;
    const multiLimit = isGsm7 ? 153 : 67;

    const charCount = text.length;
    let segments = 1;
    let remaining = singleLimit - charCount;

    if (charCount > singleLimit) {
      segments = Math.ceil(charCount / multiLimit);
      remaining = segments * multiLimit - charCount;
    }

    // CAP v1.2 XML
    const capXml = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>JALDRISHTI-2022-CACHAR-${activeZone.zone_id.toUpperCase()}-${alertSeverity.toUpperCase()}</identifier>
  <sender>alert@jaldrishti.in</sender>
  <sent>2022-06-18T23:48:00+05:30</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <language>${alertLang}</language>
    <category>Safety</category>
    <event>Flash Flood &amp; Infrastructure Severing</event>
    <urgency>${alertSeverity === "evacuate" ? "Immediate" : "Expected"}</urgency>
    <severity>${alertSeverity === "evacuate" ? "Extreme" : alertSeverity === "warning" ? "Moderate" : "Minor"}</severity>
    <certainty>Observed</certainty>
    <headline>Flood ${alertSeverity.toUpperCase()}: ${zName}, Cachar</headline>
    <description>Sentinel-1 SAR analysis indicates hydraulic severing and inundation in zone ${zName}. Isolation status: ${isCutoff ? "CUT OFF (Road egress severed)" : "CONNECTED"}.</description>
    <instruction>${text}</instruction>
    <area>
      <areaDesc>${zName}, Cachar, Assam</areaDesc>
    </area>
  </info>
</alert>`;

    return {
      text,
      charCount,
      encoding,
      segments,
      remaining,
      singleLimit,
      isMachineDrafted: alertLang !== "en",
      capXml,
    };
  }, [activeZone, activeRoute, alertSeverity, alertLang]);

  const downloadCapXml = () => {
    if (!alertDetails || !activeZone) return;
    const blob = new Blob([alertDetails.capXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cap_alert_${activeZone.zone_id}_${alertSeverity}_${alertLang}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyXmlToClipboard = () => {
    if (!alertDetails) return;
    navigator.clipboard.writeText(alertDetails.capXml);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  return (
    <div className="min-h-screen bg-space-950 text-foreground p-4 md:p-8 flex flex-col justify-between max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between border-b border-white/10 pb-5 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Home
            </Button>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-aurora-400 motion-safe:animate-pulse" />
            <h1 className="text-white font-heading font-bold text-lg tracking-wide">
              Command Center
            </h1>
          </div>
          <Badge variant="real">Sentinel-1 SAR</Badge>
          <Badge variant="derived">Phase 5 Scenarios &amp; Outlook</Badge>
          <Badge variant="derived">HAND Model</Badge>
          <Badge variant="real">GPM IMERG</Badge>
          <Badge variant="derived">ECMWF GloFAS</Badge>
          <Badge variant="derived">CAP v1.2</Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-space-900 border border-white/10 text-xs font-mono text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-aurora-400" />
            <span>Assam, India (Cachar / Silchar)</span>
          </div>
          <Link href="/design">
            <Button variant="secondary" size="sm">Design Tokens</Button>
          </Link>
        </div>
      </header>

      {/* KPI Summary Strip with Precise Labeling per Phase 4 Fixes */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <GlassCard className="p-4" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Flooded Extent</span>
            <Badge variant="derived" className="text-[10px] py-0 px-1.5">DERIVED</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-aurora-400 mt-2">99.76 km²</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">9,976 ha (215 polys)</p>
        </GlassCard>

        <GlassCard className="p-4" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">People Exposed</span>
            <Badge variant="derived" className="text-[10px] py-0 px-1.5">INSIDE FLOOD</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-2">101,986</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Directly inundated pop</p>
        </GlassCard>

        <GlassCard className="p-4" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Cut-Off Population</span>
            <Badge variant="derived" className="text-[10px] py-0 px-1.5">SEVERED ZONES</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-alert-500 mt-2">100,310</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Whole pop of 8 cut-off zones</p>
        </GlassCard>

        <GlassCard className="p-4" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Cropland Waterlogged</span>
            <Badge variant="derived" className="text-[10px] py-0 px-1.5">DERIVED</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-blue-400 mt-2">8,170 ha</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Rice paddies / flooded crop</p>
        </GlassCard>

        <GlassCard className="p-4 col-span-2 sm:col-span-1 lg:col-span-1" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Roads Potentially Cut</span>
            <Badge variant="derived" className="text-[10px] py-0 px-1.5">50M BUFFER</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-purple-400 mt-2">196.4 km</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Bridges unmodelled</p>
        </GlassCard>
      </section>

      {/* Navigation Tabs */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-aurora-400" />
            <h2 className="text-lg font-heading font-semibold text-white">
              Cachar Flood Intelligence, Routing &amp; CAP Alerts
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "map" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("map")}
            >
              Interactive Map
            </Button>
            <Button
              variant={activeTab === "villages" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("villages")}
              className="gap-1.5"
            >
              <Users className="w-4 h-4 text-aurora-400" />
              Villages &amp; Impact
            </Button>
            <Button
              variant={activeTab === "routes" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("routes")}
              className="gap-1.5"
            >
              <Navigation className="w-4 h-4 text-cyan-400" />
              Evacuation Routes
            </Button>
            <Button
              variant={activeTab === "alerts" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("alerts")}
              className="gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              Alerts &amp; CAP v1.2
            </Button>
            <Button
              variant={activeTab === "whatif" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("whatif")}
              className="gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              What-If Scenarios
            </Button>
            <Button
              variant={activeTab === "ablation" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("ablation")}
            >
              Ablation Table
            </Button>
            <Button
              variant={activeTab === "failure_cases" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("failure_cases")}
            >
              Failure Cases
            </Button>
            <Button
              variant={activeTab === "manifest" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("manifest")}
            >
              Scene Manifest
            </Button>
          </div>
        </div>

        {/* Tab 1: Interactive Map */}
        {activeTab === "map" && (
          <FloodMap
            initialModel={mapModel}
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
            routeGeojson={activeRoute?.geojson || null}
            whatifGeojsonUrl={
              currentScenario
                ? `/data/events/assam-2022/scenarios/${currentScenario.geojson_file}`
                : "/data/events/assam-2022/scenarios/scenario_p00.geojson"
            }
            whatifAreaHa={currentScenario?.metrics.flooded_area_ha || null}
            robustCutoffsOnly={robustCutoffsOnly}
          />
        )}

        {/* Tab 2: Villages & Priority Impact Ranking */}
        {activeTab === "villages" && (
          <div className="space-y-5">
            {/* Window Edge Truncation Disclosure Callout */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-[11px] text-amber-300 font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Study Window Boundary Disclosure:</strong> 10 of 20 settlement zones touch the study window perimeter.
                  Of the 8 cut-off zones, exactly 5 touch the border edge (<strong>Ratpur, Badripāra, Kirishanpur, Gossaipur, Khoril</strong>) where road truncation may overstate isolation.
                  Exactly 3 zones (<strong>Debpāra, Māsimpur, Dudhpatli</strong>) are robust interior cut-offs.
                </span>
              </div>
              <Button
                variant={robustCutoffsOnly ? "primary" : "secondary"}
                size="sm"
                onClick={() => setRobustCutoffsOnly(!robustCutoffsOnly)}
                className="gap-1.5 font-mono text-xs whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {robustCutoffsOnly ? "Showing 3 Robust Interior Cut-Offs" : "Toggle Robust Cut-Offs Only"}
              </Button>
            </div>

            {/* Priority Weight Tuning Controls */}
            <GlassCard className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-aurora-400" />
                    <h3 className="text-sm font-semibold font-heading text-white">
                      Dynamic Priority Weight Optimization
                    </h3>
                    <Badge variant="derived">FORMULA PARAMETERS</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Adjust rescue priority weights in real time. Changes immediately re-rank all 20 settlement zones.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={resetWeights} className="gap-1.5 font-mono text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Defaults
                </Button>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Exposed Population</span>
                    <span className="text-aurora-400 font-bold">{wPop.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wPop}
                    onChange={(e) => setWPop(parseFloat(e.target.value))}
                    className="w-full accent-aurora-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Low (0.0)</span>
                    <span>High (1.0)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Flooded Fraction</span>
                    <span className="text-blue-400 font-bold">{wFlood.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wFlood}
                    onChange={(e) => setWFlood(parseFloat(e.target.value))}
                    className="w-full accent-blue-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Low (0.0)</span>
                    <span>High (1.0)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Road Isolation</span>
                    <span className="text-red-400 font-bold">{wIso.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wIso}
                    onChange={(e) => setWIso(parseFloat(e.target.value))}
                    className="w-full accent-red-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Low (0.0)</span>
                    <span>High (1.0)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Facilities Flooded</span>
                    <span className="text-amber-400 font-bold">{wFac.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wFac}
                    onChange={(e) => setWFac(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Low (0.0)</span>
                    <span>High (1.0)</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Split View: Ranked Zone List and Detail Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <GlassCard className="p-4 lg:col-span-7 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-semibold text-white">
                    Ranked Settlement Zones ({displayedVillages.length}
                    {robustCutoffsOnly ? " displayed - Robust Cut-Offs Only" : ""})
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-400 motion-safe:animate-pulse" />
                      {robustCutoffsOnly ? "Robust (3)" : "Cut-off (8)"}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Connected (12)
                    </span>
                  </div>
                </div>

                {loadingVillages ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-aurora-400 border-t-transparent rounded-full animate-spin" />
                    <span>Loading zonal impact calculations...</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                    {displayedVillages.map((zone) => {
                      const isSelected = activeZone?.zone_id === zone.zone_id;
                      return (
                        <div
                          key={zone.zone_id}
                          onClick={() => setSelectedZoneId(zone.zone_id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                            isSelected
                              ? "bg-aurora-500/15 border-aurora-400/50 shadow-lg"
                              : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                  zone.rank <= 3
                                    ? "bg-red-500/30 text-red-300 border border-red-500/40"
                                    : zone.rank <= 8
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-white/10 text-slate-300"
                                }`}
                              >
                                #{zone.rank}
                              </span>
                              <div>
                                <span className="font-semibold text-white text-sm">
                                  {zone.name}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-1.5 capitalize">
                                  ({zone.place_type || "village"})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {zone.isolated ? (
                                zone.is_on_boundary_edge ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    CUT OFF (BORDER EDGE)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 motion-safe:animate-pulse">
                                    CUT OFF (ROBUST INTERIOR)
                                  </span>
                                )
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  CONNECTED
                                </span>
                              )}
                              <span className="text-sm font-bold text-aurora-400">
                                {zone.priority_score.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-space-950 h-2 rounded-full overflow-hidden flex my-2 border border-white/10">
                            <div
                              style={{ width: `${zone.priority_breakdown.population_exposed_term}%` }}
                              className="bg-aurora-400 h-full"
                            />
                            <div
                              style={{ width: `${zone.priority_breakdown.flooded_fraction_term}%` }}
                              className="bg-blue-400 h-full"
                            />
                            <div
                              style={{ width: `${zone.priority_breakdown.isolation_term}%` }}
                              className="bg-red-500 h-full"
                            />
                            <div
                              style={{ width: `${zone.priority_breakdown.critical_facilities_term}%` }}
                              className="bg-amber-400 h-full"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-0.5">
                            <div>
                              <span>Pop Exposed: </span>
                              <strong className="text-white">
                                {zone.population_exposed.toLocaleString()}
                              </strong>
                            </div>
                            <div>
                              <span>Flooded Area: </span>
                              <strong className="text-white">
                                {zone.flooded_area_ha.toFixed(0)} ha
                              </strong>
                            </div>
                            <div>
                              <span>Roads Potentially Cut: </span>
                              <strong className={zone.roads_cut_km > 0 ? "text-red-400 font-bold" : "text-slate-300"}>
                                {zone.roads_cut_km.toFixed(1)} km
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              {/* Right Column: Active Zone Detail Inspector */}
              <div className="lg:col-span-5 space-y-4">
                {activeZone ? (
                  <GlassCard className="p-5 space-y-4 font-mono text-xs">
                    <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-aurora-500/20 text-aurora-300 font-bold border border-aurora-500/30">
                            Rank #{activeZone.rank}
                          </span>
                          <h3 className="text-lg font-bold text-white font-heading">
                            {activeZone.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Zone ID: {activeZone.zone_id} • Block: {activeZone.block}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveTab("routes");
                          }}
                          className="gap-1.5 text-xs font-mono"
                        >
                          <Route className="w-3.5 h-3.5" />
                          Route
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setActiveTab("map");
                          }}
                          className="gap-1.5 text-xs font-mono"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Locate
                        </Button>
                      </div>
                    </div>

                    {/* Population Breakdown Card */}
                    <div className="p-3.5 rounded-xl bg-space-900 border border-white/10 space-y-2">
                      <span className="font-semibold text-white block text-xs">
                        Population Categorization
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">
                            Population Exposed (In Flood)
                          </span>
                          <span className="text-amber-400 font-bold text-sm">
                            {activeZone.population_exposed.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">
                            Whole Zone Population
                          </span>
                          <span className="text-white font-bold text-sm">
                            {activeZone.population.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-white/5">
                        {activeZone.isolated
                          ? `All ${activeZone.population.toLocaleString()} residents in this zone are classified as cut-off population because road access to emergency facilities is severed. ${activeZone.population_exposed.toLocaleString()} residents are directly within the flood footprint.`
                          : `${activeZone.population_exposed.toLocaleString()} residents are within the flood footprint, while vehicular evacuation routes remain passable for the settlement.`}
                      </p>
                    </div>

                    {/* Quantitative Zonal Impact Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          Flooded Fraction
                        </span>
                        <span className="text-lg font-bold text-aurora-400 block mt-0.5">
                          {(activeZone.flooded_fraction * 100).toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {activeZone.flooded_area_ha.toFixed(1)} ha / {activeZone.total_area_ha.toFixed(1)} ha
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          Cropland Flooded or Waterlogged
                        </span>
                        <span className="text-lg font-bold text-blue-400 block mt-0.5">
                          {activeZone.cropland_flooded_ha.toFixed(1)} ha
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Rice paddies may overlap with water
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          Roads Potentially Cut
                        </span>
                        <span className="text-lg font-bold text-red-400 block mt-0.5">
                          {activeZone.roads_cut_km.toFixed(1)} km
                        </span>
                        <span className="text-[10px] text-slate-500">
                          50m flood buffer (bridges unmodelled)
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          Study Boundary Note
                        </span>
                        <span className="text-xs font-semibold text-white block mt-1">
                          {activeZone.is_on_boundary_edge ? "Perimeter Zone" : "Interior Zone"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {activeZone.is_on_boundary_edge
                            ? "Roads truncated at edge; cut-off status may be overstated"
                            : "Fully inside window; cut-off status is robust"}
                        </span>
                      </div>
                    </div>

                    {/* Methodological Caveats */}
                    <div className="p-3 rounded bg-space-900 border border-white/10 text-[10px] text-slate-400 space-y-1">
                      <div className="flex items-center gap-1 text-slate-300 font-semibold">
                        <Info className="w-3.5 h-3.5 text-aurora-400" />
                        <span>Methodology &amp; Provenance Notice</span>
                      </div>
                      <p>
                        Settlement zones synthesized via Voronoi tessellation of OpenStreetMap village/hamlet points (not official administrative boundaries). Areas computed in UTM Zone 46N (EPSG:32646). 10 of 20 zones touch the study window perimeter.
                      </p>
                    </div>
                  </GlassCard>
                ) : (
                  <GlassCard className="p-8 text-center text-slate-400 text-xs font-mono">
                    Select a settlement zone to view impact metrics and isolation analysis.
                  </GlassCard>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Evacuation Routes */}
        {activeTab === "routes" && (
          <div className="space-y-5 font-mono text-xs">
            {/* Zone Selector Strip */}
            <GlassCard className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Evacuation Routing &amp; High-Ground Egress Engine
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Multi-target shortest path avoiding 50m flood buffer with 0.5x speed degradation within 200m flood proximity.
                    </p>
                  </div>
                </div>
                <Badge variant="derived">DIJKSTRA + FLOOD PENALTY</Badge>
              </div>

              {/* Horizontal Zone Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {rankedVillages.map((z) => {
                  const isSel = activeZone?.zone_id === z.zone_id;
                  return (
                    <button
                      key={z.zone_id}
                      onClick={() => setSelectedZoneId(z.zone_id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSel
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-md"
                          : z.isolated
                          ? "bg-red-500/10 text-red-300 border-red-500/20 hover:border-red-500/40"
                          : "bg-white/5 text-slate-300 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span>#{z.rank} {z.name}</span>
                      {z.isolated ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 motion-safe:animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </GlassCard>

            {/* Route Status Split */}
            {activeRoute ? (
              activeRoute.has_route ? (
                /* Connected Route State */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  <div className="lg:col-span-7 space-y-4">
                    <GlassCard className="p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <div>
                            <span className="text-white font-bold text-sm block">
                              Passable Evacuation Corridor Identified
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              From: {activeZone?.name} → Destination: {activeRoute.destination_shelter?.name}
                            </span>
                          </div>
                        </div>
                        <Badge variant="real">ROAD VIABLE</Badge>
                      </div>

                      {/* Metrics Badges */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                          <span className="text-slate-400 text-[10px] uppercase block">Primary Distance</span>
                          <span className="text-2xl font-bold text-cyan-400 block mt-1">
                            {activeRoute.distance_km} km
                          </span>
                          <span className="text-[10px] text-slate-400">Via intact roads</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                          <span className="text-slate-400 text-[10px] uppercase block">Estimated ETA</span>
                          <span className="text-2xl font-bold text-emerald-400 block mt-1">
                            {activeRoute.eta_minutes} min
                          </span>
                          <span className="text-[10px] text-slate-400">Speed degraded near water</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30">
                          <span className="text-slate-400 text-[10px] uppercase block">Alternate Route</span>
                          {activeRoute.has_alternate && activeRoute.alternate_distance_km ? (
                            <>
                              <span className="text-2xl font-bold text-amber-400 block mt-1">
                                {activeRoute.alternate_distance_km} km
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {activeRoute.alternate_eta_minutes} min (Divergent corridor)
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-slate-400 block mt-2">
                                No distinct alternate
                              </span>
                              <span className="text-[10px] text-amber-400/80">
                                &gt;80% corridor overlap
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Destination Details */}
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 font-semibold text-xs">
                            Designated Safe Emergency Shelter
                          </span>
                          <Badge variant="real">SAFE FACILITY</Badge>
                        </div>
                        <p className="text-white font-bold text-sm">
                          {activeRoute.destination_shelter?.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Facility Type: {activeRoute.destination_shelter?.facility_type} • ID: {activeRoute.destination_shelter?.shelter_id}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Coordinates: [{activeRoute.destination_shelter?.coordinates[0].toFixed(5)}, {activeRoute.destination_shelter?.coordinates[1].toFixed(5)}]
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setActiveTab("map")}
                          className="gap-1.5 text-xs font-mono"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          View Animated Route on Map
                        </Button>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Assumptions List Panel */}
                  <div className="lg:col-span-5 space-y-4">
                    <GlassCard className="p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="font-semibold text-white text-xs">
                          Routing Model Assumptions &amp; Physics
                        </span>
                        <Badge variant="derived">DERIVED ALGORITHM</Badge>
                      </div>
                      <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                        {activeRoute.assumptions.map((assump, idx) => (
                          <div key={idx} className="p-2.5 rounded bg-white/5 border border-white/10 flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{assump}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              ) : (
                /* Cut-Off Zone: No Road Route State with Staging Hint */
                <div className="space-y-4">
                  <GlassCard className="p-6 border-red-500/30 bg-red-950/20 space-y-4">
                    <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
                      <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-6 h-6 text-red-400 motion-safe:animate-pulse" />
                        <div>
                          <h4 className="text-base font-bold text-red-300 font-heading">
                            NO PASSABLE ROAD ROUTE — Zone is Hydraulically Severed
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Zone: {activeZone?.name} (Population: {activeZone?.population.toLocaleString()})
                          </span>
                        </div>
                      </div>
                      <Badge variant="simulated">ROAD IMPASSABLE</Badge>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">
                      All drivable road corridors exiting this settlement zone intersect the 50 m floodwater safety buffer.
                      Vehicular evacuation is completely blocked. Do not attempt road egress.
                    </p>

                    {/* Staging Hint Box (DERIVED) */}
                    {activeRoute.staging_hint && (
                      <div className="p-4 rounded-xl bg-space-900 border border-pink-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Compass className="w-4 h-4 text-pink-400" />
                            <span className="text-pink-300 font-bold text-xs uppercase">
                              Air / Boat Staging Recommendation (Decision-Support Suggestion)
                            </span>
                          </div>
                          <Badge variant="derived">DECISION-SUPPORT SUGGESTION</Badge>
                        </div>

                        <div className="p-2.5 rounded-lg bg-pink-950/40 border border-pink-500/30 text-[11px] text-pink-200 font-medium">
                          <strong>Advisory Notice:</strong> Decision-support suggestion, not an official procedure. Staging hint provides a mathematical Euclidean transfer coordinate to the nearest intact road network component.
                        </div>

                        <p className="text-white text-xs leading-relaxed font-semibold">
                          {activeRoute.staging_hint.evacuation_protocol}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
                          <div className="p-2.5 rounded bg-white/5 border border-white/10">
                            <span className="text-slate-400 block text-[10px]">Recommended Mode</span>
                            <span className="text-pink-400 font-bold text-xs">
                              {activeRoute.staging_hint.recommended_mode}
                            </span>
                          </div>
                          <div className="p-2.5 rounded bg-white/5 border border-white/10">
                            <span className="text-slate-400 block text-[10px]">Straight-Line Egress Distance</span>
                            <span className="text-white font-bold text-xs">
                              {activeRoute.staging_hint.straight_line_distance_km} km
                            </span>
                          </div>
                          <div className="p-2.5 rounded bg-white/5 border border-white/10">
                            <span className="text-slate-400 block text-[10px]">Action Protocol</span>
                            <span className="text-amber-300 font-bold text-xs">
                              Move to high ground, await boats
                            </span>
                          </div>
                        </div>

                        <div className="p-2 rounded bg-pink-950/30 border border-pink-500/20 text-[10px] text-slate-400">
                          <strong>Operational Disclosure:</strong> The staging egress vector is a mathematical nearest-neighbor transfer between the severed component and the intact highway network. It is not an official evacuation route or procedure.
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab("alerts")}
                        className="gap-1.5 text-xs font-mono"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Draft Emergency Broadcast
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveTab("map")}
                        className="gap-1.5 text-xs font-mono"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        View Staging Vector on Map
                      </Button>
                    </div>
                  </GlassCard>
                </div>
              )
            ) : (
              <GlassCard className="p-8 text-center text-slate-400 text-xs">
                Select a settlement zone to compute evacuation routing or staging recommendations.
              </GlassCard>
            )}
          </div>
        )}

        {/* Tab 4: Multilingual Alerts & CAP v1.2 */}
        {activeTab === "alerts" && (
          <div className="space-y-5 font-mono text-xs">
            {/* Controls Bar */}
            <GlassCard className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Multilingual Public Alert Generator &amp; CAP v1.2 Authoring
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Compliant OASIS CAP v1.2 XML with strict GSM-7 and Unicode SMS multi-part segment boundaries.
                    </p>
                  </div>
                </div>
                <Badge variant="real">CAP v1.2 OASIS STANDARD</Badge>
              </div>

              {/* Selector Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Zone selector */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-[11px] block">Target Settlement Zone:</span>
                  <select
                    value={selectedZoneId || ""}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-space-900 border border-white/10 text-white text-xs cursor-pointer focus:border-aurora-400 focus:outline-none"
                  >
                    {rankedVillages.map((z) => (
                      <option key={z.zone_id} value={z.zone_id}>
                        #{z.rank} {z.name} ({z.isolated ? "Cut off" : "Connected"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity Selector */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-[11px] block">Alert Severity Level:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setAlertSeverity("advisory")}
                      className={`py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        alertSeverity === "advisory"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      Advisory
                    </button>
                    <button
                      onClick={() => setAlertSeverity("warning")}
                      className={`py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        alertSeverity === "warning"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      Warning
                    </button>
                    <button
                      onClick={() => setAlertSeverity("evacuate")}
                      className={`py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        alertSeverity === "evacuate"
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      Evacuate
                    </button>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-[11px] block">Broadcast Language:</span>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => setAlertLang("en")}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        alertLang === "en"
                          ? "bg-aurora-500/20 text-aurora-300 border-aurora-500/40"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setAlertLang("hi")}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        alertLang === "hi"
                          ? "bg-aurora-500/20 text-aurora-300 border-aurora-500/40"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      हिंदी
                    </button>
                    <button
                      onClick={() => setAlertLang("as")}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        alertLang === "as"
                          ? "bg-aurora-500/20 text-aurora-300 border-aurora-500/40"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      অসমীয়া
                    </button>
                    <button
                      onClick={() => setAlertLang("bn")}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        alertLang === "bn"
                          ? "bg-aurora-500/20 text-aurora-300 border-aurora-500/40"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>
                </div>
              </div>

              {/* Machine-Drafted Disclosure Banner */}
              {alertDetails?.isMachineDrafted && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px] text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Quality Control Notice:</strong> This non-English template is machine-drafted and needs native-speaker review prior to official broadcast.
                    </span>
                  </div>
                  <Badge variant="simulated">NEEDS REVIEW</Badge>
                </div>
              )}
            </GlassCard>

            {/* Main Alert Grid: Phone Mockup (Left) and CAP XML / Export (Right) */}
            {alertDetails && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Phone Mock-Up (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <GlassCard className="p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-aurora-400" />
                        Citizen SMS Delivery Preview
                      </span>
                      <Badge variant="simulated">SIMULATED DELIVERY</Badge>
                    </div>

                    {/* Smartphone Chassis Frame */}
                    <div className="mx-auto max-w-[320px] rounded-[32px] p-3.5 bg-space-900 border-4 border-slate-700 shadow-2xl space-y-3">
                      {/* Phone Notch & Status bar */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 px-2 pt-1">
                        <span>18:48</span>
                        <div className="w-16 h-3.5 rounded-full bg-space-950 mx-auto" />
                        <span className="flex items-center gap-1">
                          <span>4G</span>
                          <span>100%</span>
                        </span>
                      </div>

                      {/* Messaging Header */}
                      <div className="text-center border-b border-white/10 pb-2 pt-1">
                        <span className="text-xs font-bold text-white block">JalDrishti Emergency</span>
                        <span className="text-[10px] text-slate-500">Government of Assam Disaster Cell</span>
                      </div>

                      {/* SMS Chat Bubble */}
                      <div className="min-h-[160px] flex flex-col justify-end p-2 space-y-2">
                        <div
                          className={`p-3 rounded-2xl rounded-bl-sm text-xs leading-relaxed space-y-1 shadow-md ${
                            alertSeverity === "evacuate"
                              ? "bg-red-950/80 text-red-100 border border-red-500/40"
                              : alertSeverity === "warning"
                              ? "bg-amber-950/80 text-amber-100 border border-amber-500/40"
                              : "bg-blue-950/80 text-blue-100 border border-blue-500/40"
                          }`}
                        >
                          <p className="font-sans whitespace-pre-wrap">{alertDetails.text}</p>
                          <div className="text-[9px] text-right text-slate-400 pt-0.5">
                            Just now • SMS
                          </div>
                        </div>
                      </div>

                      {/* Live Counter Pill inside phone */}
                      <div className="p-2 rounded-xl bg-space-950/80 border border-white/10 text-[10px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Encoding / Segment:</span>
                          <span className="text-white font-bold">
                            {alertDetails.encoding} • {alertDetails.segments} {alertDetails.segments === 1 ? "Segment" : "Segments"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Length:</span>
                          <span className={alertDetails.segments > 1 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                            {alertDetails.charCount} chars ({alertDetails.remaining} left in seg)
                          </span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Right: CAP v1.2 XML Document & Download (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <GlassCard className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          OASIS CAP v1.2 XML Document
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Standard interoperable payload for national emergency alert gateways
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={copyXmlToClipboard}
                          className="gap-1.5 text-xs font-mono"
                        >
                          {copiedXml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedXml ? "Copied" : "Copy XML"}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={downloadCapXml}
                          className="gap-1.5 text-xs font-mono"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download CAP XML
                        </Button>
                      </div>
                    </div>

                    {/* Syntax-highlighted XML Box */}
                    <div className="p-3.5 rounded-xl bg-space-950 border border-white/10 overflow-x-auto max-h-[380px] font-mono text-[11px] text-slate-300">
                      <pre className="whitespace-pre leading-relaxed">{alertDetails.capXml}</pre>
                    </div>

                    {/* CAP Validation Indicators */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      <div className="p-2.5 rounded bg-white/5 border border-white/10">
                        <span className="text-slate-400 block">XML Schema</span>
                        <span className="text-emerald-400 font-bold">OASIS CAP v1.2</span>
                      </div>
                      <div className="p-2.5 rounded bg-white/5 border border-white/10">
                        <span className="text-slate-400 block">Status / Scope</span>
                        <span className="text-white font-bold">Actual / Public</span>
                      </div>
                      <div className="p-2.5 rounded bg-white/5 border border-white/10">
                        <span className="text-slate-400 block">Urgency / Severity</span>
                        <span className="text-amber-400 font-bold capitalize">
                          {alertSeverity}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-white/5 border border-white/10">
                        <span className="text-slate-400 block">Language Tag</span>
                        <span className="text-cyan-400 font-bold uppercase">{alertLang}</span>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: HAND Inundation Scenarios & River Outlook */}
        {activeTab === "whatif" && (
          <div className="space-y-5 font-mono text-xs">
            {/* Top Control Header Card */}
            <GlassCard className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="text-base font-bold text-white font-heading">
                      HAND Inundation Model &amp; Hydro-Meteorological What-If Engine
                    </h3>
                    <Badge variant="derived">HAND MODEL</Badge>
                    <Badge variant="derived">CALIBRATED h* = 3.25m</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Physical Height Above Nearest Drainage (HAND) inundation simulation with 8-connected drainage network propagation and slope filtering (&lt; 5°).
                    Strictly monotonic stage scaling precomputed across {scenariosIndex?.scenarios_count || 6} discrete water levels.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setMapModel("whatif");
                      setActiveTab("map");
                    }}
                    className="gap-1.5 text-xs font-mono"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Inspect Scenario on Map
                  </Button>
                </div>
              </div>

              {/* Interactive Water-Level Controls */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-semibold">Water Level Adjustment (Δh):</span>
                    <span className="text-purple-400 font-bold text-base px-2.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30">
                      {selectedDeltaM >= 0 ? `+${selectedDeltaM.toFixed(1)}` : selectedDeltaM.toFixed(1)} m
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      (Effective Stage: {((currentScenario?.h_star_baseline_m || 3.25) + selectedDeltaM).toFixed(2)} m)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-400">Calibrated Baseline:</span>
                    <span className="text-emerald-400 font-bold">h* = 3.25 m</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Spatial CV IoU:</span>
                    <span className="text-white font-bold">0.4674</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">F1:</span>
                    <span className="text-white font-bold">0.6370</span>
                  </div>
                </div>

                {/* Preset Pill Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { delta: -1.0, label: "Recession (-1.0m)", desc: "2.25m stage" },
                    { delta: -0.5, label: "Minor Drop (-0.5m)", desc: "2.75m stage" },
                    { delta: 0.0, label: "Calibrated (0.0m)", desc: "3.25m baseline" },
                    { delta: 0.5, label: "Surge (+0.5m)", desc: "3.75m stage" },
                    { delta: 1.0, label: "Severe (+1.0m)", desc: "4.25m stage" },
                    { delta: 2.0, label: "Catastrophic (+2.0m)", desc: "5.25m stage" },
                  ].map((item) => {
                    const isSel = selectedDeltaM === item.delta;
                    return (
                      <button
                        key={item.delta}
                        onClick={() => setSelectedDeltaM(item.delta)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? "bg-purple-500/25 border-purple-400 text-white shadow-lg"
                            : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs ${isSel ? "text-purple-300" : "text-white"}`}>
                            {item.label}
                          </span>
                          {isSel && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </GlassCard>

            {/* Scenario Metrics KPI Grid */}
            {currentScenario && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <GlassCard className="p-3.5 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase text-slate-400">Flooded Extent</span>
                    <Badge variant="derived" className="text-[9px] px-1 py-0">HAND</Badge>
                  </div>
                  <p className="text-xl font-bold text-purple-400 mt-1">
                    {currentScenario.metrics.flooded_area_km2.toFixed(2)} km²
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {currentScenario.metrics.flooded_area_ha.toLocaleString()} ha
                  </span>
                </GlassCard>

                <GlassCard className="p-3.5 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase text-slate-400">Exposed Pop</span>
                    <Badge variant="derived" className="text-[9px] px-1 py-0">WORLDPOP</Badge>
                  </div>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    {currentScenario.metrics.exposed_population.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Inside scenario flood</span>
                </GlassCard>

                <GlassCard className="p-3.5 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase text-slate-400">Cropland Flooded</span>
                    <Badge variant="derived" className="text-[9px] px-1 py-0">WORLDCOVER</Badge>
                  </div>
                  <p className="text-xl font-bold text-blue-400 mt-1">
                    {currentScenario.metrics.cropland_waterlogged_ha.toFixed(0)} ha
                  </p>
                  <span className="text-[10px] text-slate-400">Waterlogged paddies</span>
                </GlassCard>

                <GlassCard className="p-3.5 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase text-slate-400">Roads Potentially Cut</span>
                    <Badge variant="derived" className="text-[9px] px-1 py-0">OSM GRAPH</Badge>
                  </div>
                  <p className="text-xl font-bold text-red-400 mt-1">
                    {currentScenario.metrics.roads_potentially_cut_km.toFixed(1)} km
                  </p>
                  <span className="text-[10px] text-slate-400">50m buffer intersection</span>
                </GlassCard>

                <GlassCard className="p-3.5 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase text-slate-400">Cut-Off Zones</span>
                    <Badge variant="derived" className="text-[9px] px-1 py-0">ISOLATION</Badge>
                  </div>
                  <p className="text-xl font-bold text-rose-400 mt-1">
                    {currentScenario.metrics.cutoff_zones_count} of 20
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {currentScenario.metrics.cutoff_zones_robust_count} robust • {currentScenario.metrics.cutoff_zones_touching_edge_count} border edge
                  </span>
                </GlassCard>

                <GlassCard className="p-3.5 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase text-slate-400">Isolated Population</span>
                    <Badge variant="derived" className="text-[9px] px-1 py-0">SEVERED ZONES</Badge>
                  </div>
                  <p className="text-xl font-bold text-alert-500 mt-1">
                    {currentScenario.metrics.isolated_population.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Whole pop of cut-off zones</span>
                </GlassCard>
              </div>
            )}

            {/* Comparison Callout vs Observed Sentinel-1 U-Net */}
            {currentScenario && (
              <div className="p-4 rounded-xl bg-space-900 border border-white/10 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <span className="text-white font-semibold text-xs flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-purple-400" />
                    Hydraulic Physical Model vs Observed Sentinel-1 Peak SAR (June 18, 2022)
                  </span>
                  <Badge variant="derived">MODEL COMPARISON</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
                  <div className="p-2.5 rounded bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Area Difference</span>
                    <span className="text-white font-bold text-xs">
                      {currentScenario.comparison_with_observed_unet.delta_area_ha >= 0 ? "+" : ""}
                      {currentScenario.comparison_with_observed_unet.delta_area_ha.toFixed(1)} ha
                    </span>
                    <span className="text-slate-500 block text-[10px]">
                      (Observed U-Net: {currentScenario.comparison_with_observed_unet.observed_flood_area_ha.toFixed(0)} ha)
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Exposed Pop Difference</span>
                    <span className="text-white font-bold text-xs">
                      {currentScenario.comparison_with_observed_unet.delta_exposed_population >= 0 ? "+" : ""}
                      {currentScenario.comparison_with_observed_unet.delta_exposed_population.toLocaleString()}
                    </span>
                    <span className="text-slate-500 block text-[10px]">
                      (Observed U-Net: {currentScenario.comparison_with_observed_unet.observed_exposed_population.toLocaleString()})
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Cut-Off Zones Difference</span>
                    <span className="text-white font-bold text-xs">
                      {currentScenario.comparison_with_observed_unet.delta_cutoff_zones_count >= 0 ? "+" : ""}
                      {currentScenario.comparison_with_observed_unet.delta_cutoff_zones_count} zones
                    </span>
                    <span className="text-slate-500 block text-[10px]">
                      (Observed U-Net: {currentScenario.comparison_with_observed_unet.observed_cutoff_zones_count} zones)
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                  <strong>Physics &amp; Methodology Disclosure:</strong> HAND assumes steady-state hydrostatic equilibrium along the connected river network.
                  Satellite SAR captures dynamic, transient surface backscatter during the actual storm event.
                  Calibrated baseline stage h* = 3.25m maximizes overlap with SAR (Full Domain IoU: 0.4705, F1: 0.6399; Spatial Block Cross-Validation Test IoU: 0.4674).
                </p>
              </div>
            )}

            {/* Hydro-Meteorological Satellite Context Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Card A: NASA GPM IMERG Satellite Rainfall */}
              <GlassCard className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white font-heading">
                      NASA GPM IMERG Satellite Precipitation Context
                    </h4>
                  </div>
                  <Badge variant="real">REAL SATELLITE (GPM V07)</Badge>
                </div>

                {rainfallData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                        <span className="text-[10px] text-slate-400 block uppercase">1-Day (24h)</span>
                        <span className="text-lg font-bold text-cyan-400 block mt-0.5">
                          {rainfallData.rainfall_summary.accum_1day_mm.toFixed(1)} mm
                        </span>
                        <span className="text-[9px] text-slate-500">Peak storm intensity</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/30">
                        <span className="text-[10px] text-slate-400 block uppercase">3-Day (72h)</span>
                        <span className="text-lg font-bold text-blue-400 block mt-0.5">
                          {rainfallData.rainfall_summary.accum_3day_mm.toFixed(1)} mm
                        </span>
                        <span className="text-[9px] text-slate-500">Pre-flood saturation</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30">
                        <span className="text-[10px] text-slate-400 block uppercase">7-Day (168h)</span>
                        <span className="text-lg font-bold text-indigo-400 block mt-0.5">
                          {rainfallData.rainfall_summary.accum_7day_mm.toFixed(1)} mm
                        </span>
                        <span className="text-[9px] text-slate-500">Cumulative monsoon</span>
                      </div>
                    </div>

                    {/* Daily timeline */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Daily Accumulation Leading up to June 18, 2022 SAR Overpass:
                      </span>
                      <div className="space-y-1">
                        {rainfallData.daily_timeline.map((day) => (
                          <div key={day.date} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-white/5 border border-white/5">
                            <span className="text-slate-300 font-mono">{day.date}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-space-950 h-1.5 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(100, (day.rainfall_mm / 100.0) * 100)}%` }}
                                  className="bg-cyan-400 h-full rounded-full"
                                />
                              </div>
                              <span className="text-cyan-300 font-bold w-14 text-right">
                                {day.rainfall_mm.toFixed(1)} mm
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed border-t border-white/5 pt-2">
                      <strong>Atmospheric Rationale:</strong> Satellite precipitation across the 20 km × 16 km Cachar study bounding box is spatially uniform (0.1° grid spacing).
                      Rather than fitting a circular statistical model on uniform rainfall, the HAND water-level engine models hydraulic flood expansion directly from physical terrain and drainage geometry.
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Loading satellite rainfall telemetry...
                  </div>
                )}
              </GlassCard>

              {/* Card B: ECMWF GloFAS Barak River Outlook */}
              <GlassCard className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white font-heading">
                      ECMWF GloFAS v4.0 Barak River Hydrograph Outlook
                    </h4>
                  </div>
                  <Badge variant="derived">MODELLED FORECAST</Badge>
                </div>

                {riverData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[9px] text-slate-400 block uppercase">Current Discharge</span>
                        <span className="text-base font-bold text-emerald-400 block mt-0.5">
                          {riverData.current_discharge_m3s.toFixed(1)} m³/s
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[9px] text-slate-400 block uppercase">Peak Forecast</span>
                        <span className="text-base font-bold text-amber-400 block mt-0.5">
                          {riverData.peak_forecast_discharge_m3s.toFixed(1)} m³/s
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[9px] text-slate-400 block uppercase">Discharge Trend</span>
                        <span className="text-base font-bold text-cyan-400 block mt-0.5 capitalize">
                          {riverData.trend}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[9px] text-slate-400 block uppercase">Severity Level</span>
                        <span className="text-base font-bold text-amber-400 block mt-0.5 capitalize">
                          {riverData.flood_severity}
                        </span>
                      </div>
                    </div>

                    {/* Daily forecast table */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        7-Day Discharge Projection (Barak River at Silchar, lat=24.825, lon=92.800):
                      </span>
                      <div className="space-y-1">
                        {riverData.daily_forecast.map((f) => (
                          <div key={f.date} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-white/5 border border-white/5">
                            <span className="text-slate-300 font-mono">{f.date}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-space-950 h-1.5 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(100, (f.discharge_m3s / 600.0) * 100)}%` }}
                                  className="bg-emerald-400 h-full rounded-full"
                                />
                              </div>
                              <span className="text-emerald-300 font-bold w-16 text-right font-mono">
                                {f.discharge_m3s.toFixed(1)} m³/s
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed border-t border-white/5 pt-2">
                      <strong>Source Provenance:</strong> ECMWF Global Flood Awareness System (GloFAS v4.0) via Open-Meteo Flood API.
                      Discharge forecast indicates stable to moderate flood conditions along the Barak River basin.
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Loading river forecast telemetry...
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Scenario Impacted Zones Table */}
            {currentScenario && (
              <GlassCard className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Settlement Zones Impact &amp; Rescue Priority under Δh = {selectedDeltaM >= 0 ? `+${selectedDeltaM.toFixed(1)}` : selectedDeltaM.toFixed(1)}m
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Re-computed hydraulic priority scores and road egress status for all 20 zones
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      {currentScenario.metrics.cutoff_zones_robust_count} Robust Cut-off
                    </span>
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {currentScenario.metrics.cutoff_zones_touching_edge_count} Border Edge Cut-off
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-slate-300 text-[11px]">
                        <th className="p-2.5">Rank</th>
                        <th className="p-2.5">Zone Name</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Flooded Fraction</th>
                        <th className="p-2.5">Exposed Pop</th>
                        <th className="p-2.5">Cropland Inundated</th>
                        <th className="p-2.5">Roads Cut</th>
                        <th className="p-2.5">Priority Score</th>
                        <th className="p-2.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300 text-xs font-mono">
                      {currentScenario.zones.map((zone) => (
                        <tr key={zone.zone_id} className="hover:bg-white/[0.04]">
                          <td className="p-2.5 font-bold text-slate-400">#{zone.rank}</td>
                          <td className="p-2.5 font-semibold text-white">{zone.name}</td>
                          <td className="p-2.5">
                            {zone.isolated ? (
                              zone.touches_window_edge ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  CUT OFF (EDGE)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                  CUT OFF (ROBUST)
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                CONNECTED
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-aurora-400">
                            {(zone.flooded_fraction * 100).toFixed(1)}% ({zone.flooded_area_ha.toFixed(0)} ha)
                          </td>
                          <td className="p-2.5 text-white">{zone.population_exposed.toLocaleString()}</td>
                          <td className="p-2.5 text-blue-400">{zone.cropland_flooded_or_waterlogged_ha.toFixed(1)} ha</td>
                          <td className="p-2.5 text-red-400">{zone.roads_potentially_cut_km.toFixed(1)} km</td>
                          <td className="p-2.5 font-bold text-aurora-400">{zone.priority_score.toFixed(1)}</td>
                          <td className="p-2.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedZoneId(zone.zone_id);
                                setActiveTab("villages");
                              }}
                              className="text-[10px] py-1 px-2 h-auto"
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {/* Tab 5: Ablation Table */}
        {activeTab === "ablation" && (
          <GlassCard className="p-5 space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-white font-semibold text-sm">
                  Official Sen1Floods11 Ground-Truth Ablation Study
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Trained strictly on train split (252 chips); tuned on valid (89 chips); evaluated on held-out test and Bolivia sets.
                </p>
              </div>
              <Badge variant="real">REAL GROUND TRUTH</Badge>
            </div>

            {/* Test Split Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-aurora-400 font-semibold">1. Official Test Split (88 hand-labeled chips)</span>
                <span className="text-slate-400 text-[11px]">Held-out during training &amp; tuning</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-slate-300">
                      <th className="p-2.5">Model Variant</th>
                      <th className="p-2.5">IoU (Jaccard)</th>
                      <th className="p-2.5">F1-Score</th>
                      <th className="p-2.5">Precision</th>
                      <th className="p-2.5">Recall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    <tr>
                      <td className="p-2.5 font-semibold text-blue-300">Tier A Baseline (Otsu + Speckle)</td>
                      <td className="p-2.5 text-white">0.2168</td>
                      <td className="p-2.5 text-white">0.3563</td>
                      <td className="p-2.5 text-white">0.2358</td>
                      <td className="p-2.5 text-white">0.7289</td>
                    </tr>
                    <tr className="bg-aurora-950/20">
                      <td className="p-2.5 font-semibold text-aurora-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-aurora-400" />
                        U-Net ResNet34 (Raw)
                      </td>
                      <td className="p-2.5 font-bold text-aurora-400">0.6804</td>
                      <td className="p-2.5 font-bold text-aurora-400">0.8098</td>
                      <td className="p-2.5 text-white">0.8199</td>
                      <td className="p-2.5 font-bold text-safe-400">0.7999</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-300">U-Net + Chip Post-Processing (Fill + Min-Area)</td>
                      <td className="p-2.5 text-white">0.6691</td>
                      <td className="p-2.5 text-white">0.8018</td>
                      <td className="p-2.5 text-white">0.7917</td>
                      <td className="p-2.5 text-white">0.8121</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bolivia Split Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-400 font-semibold">2. Bolivia Held-Out Split (15 chips)</span>
                <span className="text-slate-400 text-[11px]">Unseen geographic &amp; climate continent</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-slate-300">
                      <th className="p-2.5">Model Variant</th>
                      <th className="p-2.5">IoU (Jaccard)</th>
                      <th className="p-2.5">F1-Score</th>
                      <th className="p-2.5">Precision</th>
                      <th className="p-2.5">Recall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    <tr>
                      <td className="p-2.5 font-semibold text-blue-300">Tier A Baseline (Otsu + Speckle)</td>
                      <td className="p-2.5 text-white">0.3736</td>
                      <td className="p-2.5 text-white">0.5440</td>
                      <td className="p-2.5 text-white">0.3978</td>
                      <td className="p-2.5 text-white">0.8599</td>
                    </tr>
                    <tr className="bg-purple-950/20">
                      <td className="p-2.5 font-semibold text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        U-Net ResNet34 (Raw)
                      </td>
                      <td className="p-2.5 font-bold text-purple-400">0.6879</td>
                      <td className="p-2.5 font-bold text-purple-400">0.8151</td>
                      <td className="p-2.5 text-white">0.8590</td>
                      <td className="p-2.5 font-bold text-safe-400">0.7755</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-300">U-Net + Chip Post-Processing (Fill + Min-Area)</td>
                      <td className="p-2.5 text-white">0.6917</td>
                      <td className="p-2.5 text-white">0.8178</td>
                      <td className="p-2.5 text-white">0.8449</td>
                      <td className="p-2.5 text-white">0.7923</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Tab 6: Failure Cases */}
        {activeTab === "failure_cases" && (
          <GlassCard className="p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-white font-semibold text-sm">
                  Known Failure Cases &amp; Error Analysis
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Empirical failure modes discovered on Sen1Floods11 ground-truth chips.
                </p>
              </div>
              <Badge variant="simulated">PHYSICAL LIMITS</Badge>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-white/5 border border-red-500/20 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-red-400 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Chip Bolivia_195474 (Rugged Terrain Shadow / Relief)
                  </span>
                  <span className="text-slate-400">FP: 319 px | FN: 1,551 px | IoU: 0.0000</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  <strong>Failure Mechanism:</strong> Steep terrain slopes angled away from the Sentinel-1 line-of-sight cast dark radar shadows. In single chips lacking elevation/HAND data, localized misclassifications occur on mountain relief.
                </p>
                <p className="text-aurora-400 text-[10px]">
                  <em>Mitigation in JalDrishti:</em> Full scene inference gates pixels with HAND &gt; 15m and slope &gt; 5°, eliminating terrain shadow false positives.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white/5 border border-amber-500/20 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Chip Bolivia_233925 (Smooth Asphalt / Compacted Dry Soil)
                  </span>
                  <span className="text-slate-400">FP: 1,318 px | FN: 1 px | IoU: 0.0000</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  <strong>Failure Mechanism:</strong> Airport runways, multi-lane asphalt highways, and flat compacted dry soils reflect radar pulses away specularly, mimicking the low backscatter signature of calm standing water.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white/5 border border-blue-500/20 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-blue-400 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Chip Ghana_141271 (Flooded Wetland / Emergent Canopy)
                  </span>
                  <span className="text-slate-400">FP: 0 px | FN: 1,636 px | IoU: 0.0000</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  <strong>Failure Mechanism:</strong> Dense emergent wetland vegetation and tree trunks sitting in water form right-angle corner reflectors (double-bounce), causing bright radar backscatter that conceals the underlying floodwater from single-date optical or SAR masks.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Tab 7: Manifest */}
        {activeTab === "manifest" && (
          <GlassCard className="p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-white font-semibold text-sm">
                Authentic Earth Engine Scene Records
              </span>
              <Badge variant="real">COPERNICUS/S1_GRD</Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-aurora-400 font-semibold">[Cachar/Silchar Flood Peak]</span>
                <p className="text-slate-300 select-all">COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_05385D_E87E</p>
                <span className="text-slate-500">Date: 2022-06-18T23:47:43Z | Rel Orbit: 77 | Pass: DESCENDING | Mode: IW (VV+VH)</span>
              </div>
              <div className="p-3 rounded bg-white/5 border border-slate-700">
                <span className="text-slate-400 font-semibold">[Cachar/Silchar Dry Baseline]</span>
                <p className="text-slate-300 select-all">COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234740_20220501T234805_043024_05231C_1E38</p>
                <span className="text-slate-500">Date: 2022-05-01T23:47:40Z | Rel Orbit: 77 | Pass: DESCENDING | Mode: IW (VV+VH)</span>
              </div>
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-amber-400 font-semibold">[Cachar/Silchar Flood Recession]</span>
                <p className="text-slate-300 select-all">COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220630T234744_20220630T234809_043899_053D9A_3654</p>
                <span className="text-slate-500">Date: 2022-06-30T23:47:44Z | Rel Orbit: 77 | Pass: DESCENDING | Mode: IW (VV+VH)</span>
              </div>
            </div>
          </GlassCard>
        )}
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-white/10 text-xs font-mono text-slate-500 flex flex-wrap justify-between items-center gap-4">
        <span>JalDrishti Platform • Phase 4 Routing &amp; Alerts</span>
        <span>Honesty Rule: All numbers derived from Earth Engine pixels, WorldPop, ESA WorldCover &amp; OSM graphs</span>
      </footer>
    </div>
  );
}
