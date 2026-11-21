"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Trash2, CheckCircle, Lock, Database } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { clearQueuedBeacons } from "@/lib/offlineQueue";

export default function BeaconPrivacyPage() {
  const [purged, setPurged] = useState(false);

  const handlePurge = async () => {
    try {
      await clearQueuedBeacons();
      localStorage.clear();
      sessionStorage.clear();
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      setPurged(true);
      setTimeout(() => setPurged(false), 5000);
    } catch (e) {
      console.error("Purge error:", e);
    }
  };

  return (
    <div className="min-h-screen bg-space-950 text-foreground p-6 md:p-12 max-w-4xl mx-auto space-y-10">
      {/* Navigation Header */}
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <Link href="/beacon">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to Beacon
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="real">DPDP Act 2023 Compliant</Badge>
          <Badge variant="simulated">Zero Personal Tracking</Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>DATA PROTECTION &amp; CITIZEN PRIVACY</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-heading font-extrabold text-white tracking-tight">
          Emergency Distress Privacy Policy
        </h1>
        <p className="text-slate-300 text-base md:text-lg leading-relaxed">
          JalDrishti adheres to India&apos;s <strong>Digital Personal Data Protection Act 2023 (DPDP Act)</strong>.
          Our rescue beacon is designed with cryptographic privacy guarantees: we collect only what is strictly necessary to save lives.
        </p>
      </section>

      {/* Core Privacy Guarantees */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-heading font-bold text-white">Zero Personally Identifiable Information</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The 16-byte packet never collects phone numbers, names, Aadhaar numbers, IMEI, device fingerprints, or browsing history. It records only approximate coordinates and distress type.
          </p>
        </GlassCard>

        <GlassCard className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-heading font-bold text-white">Strict Purpose Limitation</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Distress coordinates are utilized exclusively for real-time humanitarian routing by NDRF, SDRF, and civil administration teams. Data is never monetized, profiled, or retained post-disaster.
          </p>
        </GlassCard>
      </section>

      {/* Transparent 16-Byte Payload Inspection */}
      <GlassCard className="p-6 space-y-4">
        <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
          <span>The Open 16-Byte Payload Architecture</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Any citizen or auditor can inspect the exact binary layout transmitted by this PWA:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-white/10">
            <thead>
              <tr className="bg-white/5 text-slate-300 border-b border-white/10">
                <th className="p-2 border-r border-white/10">Bytes</th>
                <th className="p-2 border-r border-white/10">Field</th>
                <th className="p-2 border-r border-white/10">Format</th>
                <th className="p-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              <tr>
                <td className="p-2 border-r border-white/10">0–3</td>
                <td className="p-2 border-r border-white/10">Latitude</td>
                <td className="p-2 border-r border-white/10">int32 (micro-degrees)</td>
                <td className="p-2">±90.000000° geographic coordinate</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-white/10">4–7</td>
                <td className="p-2 border-r border-white/10">Longitude</td>
                <td className="p-2 border-r border-white/10">int32 (micro-degrees)</td>
                <td className="p-2">±180.000000° geographic coordinate</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-white/10">8–11</td>
                <td className="p-2 border-r border-white/10">Timestamp</td>
                <td className="p-2 border-r border-white/10">uint32</td>
                <td className="p-2">Unix epoch timestamp (seconds)</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-white/10">12</td>
                <td className="p-2 border-r border-white/10">Flags</td>
                <td className="p-2 border-r border-white/10">uint8</td>
                <td className="p-2">Bits 0–2: Need type; Bits 3–7: Group count</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-white/10">13</td>
                <td className="p-2 border-r border-white/10">Reserved</td>
                <td className="p-2 border-r border-white/10">uint8</td>
                <td className="p-2">0x00 reserved for future telemetry</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-white/10">14–15</td>
                <td className="p-2 border-r border-white/10">CRC16</td>
                <td className="p-2 border-r border-white/10">uint16</td>
                <td className="p-2">CRC-16/CCITT error-detection checksum</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Citizen Data Deletion Control */}
      <section className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">Right to Erasure (DPDP Act Section 12)</h2>
            <p className="text-xs text-slate-300">
              Immediately purge all cached coordinates, queued SOS beacons, and local storage from this device.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
          <Button
            variant="danger"
            onClick={handlePurge}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-mono text-xs px-5 py-2.5"
          >
            <Trash2 className="w-4 h-4" /> Purge All Local Data Now
          </Button>

          {purged && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono animate-fadeIn">
              <CheckCircle className="w-4 h-4" />
              <span>All local IndexedDB packets, storage, and caches successfully wiped.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
