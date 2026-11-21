"use client";

import React, { useState, useEffect } from "react";
import { Navigation, Smartphone, Radio } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";

interface AlertContent {
  lang: string;
  label: string;
  text: string;
  encoding: string;
  charCount: number;
  parts: number;
}

const ALERTS: Record<string, AlertContent> = {
  as: {
    lang: "as",
    label: "অসমীয়া (Assamese)",
    text: "সাৱধান: আপোনাৰ এলেকাত বানপানীৰ সতৰ্কতা। তৎকালীনভাৱে ওখ আশ্ৰয় শিবিৰলৈ যাওক। সুৰক্ষিত পথ: এনএইচ৩৭ / বদৰপুৰ হৈ। জৰুৰী সহায়ৰ বাবে ১০৭৭ নম্বৰত যোগাযোগ কৰক।",
    encoding: "UCS-2 (Unicode)",
    charCount: 147,
    parts: 1,
  },
  bn: {
    lang: "bn",
    label: "বাংলা (Bengali)",
    text: "সাবধান: আপনার এলাকায় বন্যার সতর্কতা। অবিলম্বে উঁচু আশ্রয় কেন্দ্রে যান। নিরাপদ রুট: এনএইচ৩৭ / বদরপুর হয়ে। জরুরি সহায়তার জন্য ১০৭৭ নম্বরে যোগাযোগ করুন।",
    encoding: "UCS-2 (Unicode)",
    charCount: 149,
    parts: 1,
  },
  hi: {
    lang: "hi",
    label: "हिन्दी (Hindi)",
    text: "सावधान: आपके क्षेत्र में बाढ़ की गंभीर चेतावनी। तत्काल ऊंचे राहत शिविर में जाएं। सुरक्षित निकासी मार्ग: NH-37 बदरपुर। आपातकालीन सहायता के लिए 1077 डायल करें।",
    encoding: "UCS-2 (Unicode)",
    charCount: 152,
    parts: 1,
  },
  en: {
    lang: "en",
    label: "English",
    text: "EMERGENCY FLOOD WARNING: Inundation detected in your area. Evacuate immediately to designated relief shelters. Safe corridor: via NH-37. For emergency rescue dial 1077.",
    encoding: "GSM-7",
    charCount: 168,
    parts: 2,
  },
};

export function ActReachScene() {
  const [selectedLang, setSelectedLang] = useState<string>("as");
  const curAlert = ALERTS[selectedLang];
  const [typedChars, setTypedChars] = useState<number>(curAlert.text.length);

  // Typewriter effect on language switch
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setTypedChars(curAlert.text.length);
      return;
    }

    setTypedChars(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      setTypedChars(current);
      if (current >= curAlert.text.length) {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [selectedLang, curAlert.text]);

  return (
    <section className="py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-12 border-t border-white/10">
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-400/10 border border-saffron-400/20 text-saffron-400 text-xs font-mono font-semibold">
          <Navigation className="w-3.5 h-3.5" />
          <span>SCENE 07 / LIFELINE ROUTING &amp; DISPATCH</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
          Act &amp; Reach: <br />
          <span className="text-saffron-400">Dry Corridors &amp; Multilingual Alerting</span>.
        </h2>

        <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed">
          Routing emergency convoys around dynamic flood polygons with Dijkstra shortest paths, while
          broadcasting machine-drafted Common Alerting Protocol (CAP) emergency SMS warnings and 16-byte
          satellite rescue beacons.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Evacuation Route Animation */}
        <GlassCard className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-saffron-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                Live Road Network Corridor:
              </span>
            </div>
            <Badge variant="derived">NetworkX Dijkstra</Badge>
          </div>

          {/* Animated SVG Path for Dry Route */}
          <div className="relative w-full aspect-[16/10] bg-space-950 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center p-4">
            <svg className="w-full h-full" viewBox="0 0 400 240" fill="none">
              {/* Background flooded water zone */}
              <path
                d="M 120,40 Q 180,90 140,150 T 260,200 L 400,240 L 400,0 L 120,0 Z"
                fill="rgba(59, 130, 246, 0.15)"
              />
              <path
                d="M 200,80 Q 240,120 220,170"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="24"
                strokeLinecap="round"
              />
              <text x="250" y="110" fill="#60A5FA" fontSize="10" fontFamily="monospace">
                Flooded River Channel
              </text>

              {/* Submerged Road (Red Dashed) */}
              <path
                d="M 60,180 L 160,130 L 220,120 L 320,80"
                stroke="#F43F5E"
                strokeWidth="3"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text x="170" y="115" fill="#F43F5E" fontSize="9" fontFamily="monospace">
                Severed Road (50m Buffer)
              </text>

              {/* Safe Dry Evacuation Corridor (Animated Saffron Path) */}
              <path
                d="M 60,180 Q 80,70 180,60 T 320,80"
                stroke="#FF9933"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-route-draw"
                style={{
                  strokeDasharray: "400",
                  animation: "dash 3s ease-in-out infinite",
                }}
              />

              {/* Origin Node (Rāmnagar West zone_06) */}
              <circle cx="60" cy="180" r="7" fill="#3B82F6" />
              <circle cx="60" cy="180" r="14" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
              <text x="20" y="210" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                Rāmnagar (West) [zone_06]
              </text>

              {/* Destination Node (Lions Eye Hospital) */}
              <circle cx="320" cy="80" r="7" fill="#34D399" />
              <circle cx="320" cy="80" r="14" stroke="#34D399" strokeWidth="1.5" opacity="0.5" />
              <text x="240" y="65" fill="#34D399" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                Lions Eye Hospital Shelter
              </text>
            </svg>

            {/* Route Stats Legend */}
            <div className="absolute bottom-3 right-3 p-2.5 rounded bg-space-900/90 border border-white/10 text-[11px] font-mono space-y-0.5">
              <div className="text-saffron-400 font-bold">5.30 km • 6.7 min ETA</div>
              <div className="text-slate-400">Class: Secondary / Trunk Highway</div>
            </div>
          </div>

          <p className="text-xs font-mono text-slate-400 leading-relaxed">
            Corridors strictly avoid detected flood polygons with a 50 m safety buffer. For connected zone
            Rāmnagar (West) (`zone_06`), the engine computes a 5.30 km dry route (6.7 min ETA) to Lions Eye Hospital.
            Alternate routes are only offered when overlap is &le; 80%.
          </p>
        </GlassCard>

        {/* Right: Phone Mockup with Assamese CAP Warning */}
        <GlassCard className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-aurora-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                CAP Emergency Broadcast:
              </span>
            </div>
            <div className="flex gap-1.5">
              <Badge variant="derived">Machine-Drafted</Badge>
              <Badge variant="simulated">SIMULATED SMS</Badge>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex flex-wrap gap-2">
            {Object.values(ALERTS).map((a) => (
              <button
                key={a.lang}
                onClick={() => setSelectedLang(a.lang)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all border ${
                  selectedLang === a.lang
                    ? "bg-aurora-400 text-space-950 border-aurora-300 font-bold"
                    : "bg-space-900 text-slate-400 border-white/10 hover:text-white"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Phone Frame Mockup */}
          <div className="relative mx-auto w-full max-w-sm rounded-[2rem] bg-space-950 p-4 border-2 border-white/20 shadow-2xl space-y-4">
            {/* Phone Speaker Notch */}
            <div className="w-20 h-3 rounded-full bg-white/10 mx-auto" />

            {/* Notification Bubble */}
            <div className="p-4 rounded-2xl bg-space-900/95 border border-alert-500/40 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-alert-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-alert-400 animate-ping" />
                  NDMA / ASDMA ALERT
                </span>
                <span className="text-slate-400">NOW</span>
              </div>

              {/* Typewriter Text Display */}
              <div className="text-sm font-body text-white leading-relaxed min-h-[5.5rem]">
                {curAlert.text.slice(0, typedChars)}
                {typedChars < curAlert.text.length && (
                  <span className="inline-block w-1.5 h-4 bg-aurora-400 ml-0.5 animate-pulse" />
                )}
              </div>

              {/* Telemetry pill */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono text-slate-400">
                <span>Encoding: {curAlert.encoding}</span>
                <span>
                  {curAlert.charCount} Chars ({curAlert.parts} SMS Part)
                </span>
              </div>
            </div>

            {/* Offline Satellite Rescue Beacon Ripple */}
            <div className="p-3 rounded-xl bg-space-900/60 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-safe-400" /> 16-Byte Telemetry Payload:
                </span>
                <span className="text-safe-400 font-bold">0x01A39F4C...</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                Packed binary: GPS lat/lon (float32), 2 medical codes, 1 boat requirement, battery status.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      <style jsx>{`
        @keyframes dash {
          0% {
            stroke-dashoffset: 400;
          }
          50% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -400;
          }
        }
      `}</style>
    </section>
  );
}
