"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ImpactSummary,
  RiverOutlook,
  RouteItem,
  ScenariosIndex,
  ShelterFeature,
  TimelineData,
  ZoneFeature,
} from "@/components/command-center/types";

async function fetchWithFallback<T>(apiEndpoint: string, fallbackUrl: string): Promise<T> {
  // If in DEMO_MODE or directly preferring static files, load static fallback first
  try {
    const res = await fetch(apiEndpoint);
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // Network or API unavailable, fall through to static fallback
  }

  const fallbackRes = await fetch(fallbackUrl);
  if (!fallbackRes.ok) {
    throw new Error(`Failed to load data from ${apiEndpoint} and fallback ${fallbackUrl}`);
  }
  return (await fallbackRes.json()) as T;
}

export function useImpactSummary() {
  return useQuery<ImpactSummary>({
    queryKey: ["impact-summary"],
    queryFn: () =>
      fetchWithFallback<ImpactSummary>(
        "/api/events/assam-2022/impact-summary",
        "/data/events/assam-2022/impact_summary.json"
      ),
    staleTime: 1000 * 60 * 10,
  });
}

export function useVillages() {
  return useQuery<{ type: string; features: ZoneFeature[] }>({
    queryKey: ["villages"],
    queryFn: () =>
      fetchWithFallback<{ type: string; features: ZoneFeature[] }>(
        "/api/events/assam-2022/villages",
        "/data/events/assam-2022/villages.geojson"
      ),
    staleTime: 1000 * 60 * 10,
  });
}

export function useShelters() {
  return useQuery<{ type: string; features: ShelterFeature[] }>({
    queryKey: ["shelters"],
    queryFn: () =>
      fetchWithFallback<{ type: string; features: ShelterFeature[] }>(
        "/api/events/assam-2022/shelters",
        "/data/events/assam-2022/shelters.geojson"
      ),
    staleTime: 1000 * 60 * 10,
  });
}

export function useRoutes() {
  return useQuery<Record<string, RouteItem>>({
    queryKey: ["routes"],
    queryFn: () =>
      fetchWithFallback<Record<string, RouteItem>>(
        "/api/events/assam-2022/routes",
        "/data/events/assam-2022/routes.json"
      ),
    staleTime: 1000 * 60 * 10,
  });
}

export function useWhatIfScenarios() {
  return useQuery<ScenariosIndex>({
    queryKey: ["whatif-scenarios"],
    queryFn: () =>
      fetchWithFallback<ScenariosIndex>(
        "/api/events/assam-2022/scenarios",
        "/data/events/assam-2022/scenarios/index.json"
      ),
    staleTime: 1000 * 60 * 10,
  });
}

export function useRiverOutlook() {
  return useQuery<RiverOutlook>({
    queryKey: ["river-outlook"],
    queryFn: () =>
      fetchWithFallback<RiverOutlook>(
        "/api/forecast/river",
        "/data/events/assam-2022/river_outlook_cached.json"
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTimeline() {
  return useQuery<TimelineData>({
    queryKey: ["timeline"],
    queryFn: () =>
      fetchWithFallback<TimelineData>(
        "/data/events/assam-2022/timeline.json",
        "/data/events/assam-2022/timeline.json"
      ),
    staleTime: 1000 * 60 * 10,
  });
}
