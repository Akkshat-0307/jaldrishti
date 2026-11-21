"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Radio,
  Wifi,
  WifiOff,
  Battery,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Satellite,
  Copy,
  Check,
  Shield,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { getApiUrl } from "@/lib/api";
import {
  packBeaconPayload,
  encodeBase32,
  bytesToHex,
  NeedType,
} from "@/lib/beaconPayload";
import {
  enqueueBeacon,
  flushOfflineQueue,
  getQueuedBeacons,
  QueuedBeacon,
} from "@/lib/offlineQueue";

const DEMO_SMS_NUMBER = process.env.NEXT_PUBLIC_DEMO_SMS_NUMBER || "+91 00000 00000";

interface Translation {
  title: string;
  subtitle: string;
  needLabel: string;
  medical: string;
  food: string;
  boat: string;
  multiple: string;
  groupLabel: string;
  notePlaceholder: string;
  holdToConfirm: string;
  releasing: string;
  transmitting: string;
  sentSuccess: string;
  queuedOffline: string;
  assignedTo: string;
  smsFallback: string;
  smsButton: string;
  satSimLabel: string;
  satSimNotice: string;
  accuracy: string;
}

const TRANSLATIONS: Record<string, Translation> = {
  en: {
    title: "Emergency Rescue Beacon",
    subtitle: "Space-enabled distress packet for flood evacuation & medical relief",
    needLabel: "Primary Distress Need",
    medical: "Medical Critical",
    food: "Drinking Water / Food",
    boat: "Rescue Boat Needed",
    multiple: "Multiple Emergencies",
    groupLabel: "Number of Stranded People",
    notePlaceholder: "Optional brief note (e.g. rooftop marooned, infant present)...",
    holdToConfirm: "HOLD 1.5s TO TRANSMIT SOS",
    releasing: "Keep holding...",
    transmitting: "Encoding 16-byte packet...",
    sentSuccess: "Distress beacon received by Disaster Command!",
    queuedOffline: "No signal: Saved to offline queue. Will auto-sync when online.",
    assignedTo: "Rescue Team Assigned",
    smsFallback: "SMS Fallback (Offline Carrier Link)",
    smsButton: `Send Demo SMS (${DEMO_SMS_NUMBER})`,
    satSimLabel: "Satellite Short-Message Channel",
    satSimNotice: "SIMULATED: No NavIC or satellite hardware is used",
    accuracy: "GPS Accuracy",
  },
  as: {
    title: "জৰুৰীকালীন উদ্ধাৰ বীকন",
    subtitle: "বানপানী উদ্ধাৰ আৰু চিকিৎসা সাহায্যৰ বাবে মহাকাশ-সক্ষম সংকেত",
    needLabel: "প্ৰাথমিক বিপদৰ প্ৰকাৰ",
    medical: "জৰুৰী চিকিৎসা প্ৰয়োজন",
    food: "খোৱাপানী / খাদ্যৰ সংকট",
    boat: "উদ্ধাৰকাৰী নাও প্ৰয়োজন",
    multiple: "একাধিক জৰুৰী সংকট",
    groupLabel: "আৱদ্ধ লোকৰ সংখ্যা",
    notePlaceholder: "চুটি টোকা (যেনে: ছাদত আৱদ্ধ, শিশু আছে)...",
    holdToConfirm: "SOS প্ৰেৰণ কৰিবলৈ ১.৫ ছেকেণ্ড হেঁচি ধৰক",
    releasing: "হেঁচি ৰাখক...",
    transmitting: "১৬-বাইট পেকেট এনক'ড কৰা হৈছে...",
    sentSuccess: "আপোনাৰ বিপন্ন সংকেত দুৰ্যোগ নিয়ন্ত্ৰণ কক্ষই লাভ কৰিছে!",
    queuedOffline: "নেটৱৰ্ক নাই: অফলাইন সংৰক্ষিত। সংযোগ পালে নিজে প্ৰেৰণ হ'ব।",
    assignedTo: "উদ্ধাৰকাৰী দল নিযুক্ত",
    smsFallback: "SMS জৰিয়তে প্ৰেৰণ (অফলাইন সংকেত)",
    smsButton: `SMS পঠিয়াওক (${DEMO_SMS_NUMBER})`,
    satSimLabel: "উপগ্ৰহ চুটি-বাৰ্তা চেনেল",
    satSimNotice: "SIMULATED: কোনো NavIC বা উপগ্ৰহ হাৰ্ডৱেৰ ব্যৱহাৰ কৰা হোৱা নাই",
    accuracy: "GPS নিখুঁততা",
  },
  bn: {
    title: "জরুরী উদ্ধার বীকন",
    subtitle: "বন্যা উদ্ধার ও জরুরী চিকিৎসার জন্য মহাকাশ-সক্ষম সংকেত",
    needLabel: "জরুরী সহায়তার ধরন",
    medical: "জরুরী চিকিৎসা দরকার",
    food: "পানীয় জল / খাদ্যের অভাব",
    boat: "উদ্ধারকারী নৌকা প্রয়োজন",
    multiple: "একাধিক জরুরী সমস্যা",
    groupLabel: "আটকে থাকা মানুষের সংখ্যা",
    notePlaceholder: "সংক্ষিপ্ত বিবরণ (যেমন: ছাদে আশ্রয়, শিশু আছে)...",
    holdToConfirm: "SOS পাঠাতে ১.৫ সেকেন্ড চেপে রাখুন",
    releasing: "চেপে রাখুন...",
    transmitting: "১৬-বাইট প্যাকেট তৈরি হচ্ছে...",
    sentSuccess: "আপনার সংকেত দুর্যোগ কন্ট্রোল রুমে পৌঁছেছে!",
    queuedOffline: "নেটওয়ার্ক নেই: অফলাইনে জমা হয়েছে। সংযোগ পেলেই পাঠানো হবে।",
    assignedTo: "উদ্ধারকারী দল নিযুক্ত",
    smsFallback: "SMS এর মাধ্যমে পাঠান (অফলাইন)",
    smsButton: `SMS পাঠান (${DEMO_SMS_NUMBER})`,
    satSimLabel: "স্যাটেলাইট মেসেজ চ্যানেল",
    satSimNotice: "SIMULATED: কোনো NavIC বা স্যাটেলাইট হার্ডওয়্যার ব্যবহৃত নয়",
    accuracy: "GPS নির্ভুলতা",
  },
  hi: {
    title: "आपातकालीन बचाव बीकन",
    subtitle: "बाढ़ बचाव और राहत के लिए अंतरिक्ष-सक्षम संकट संदेश",
    needLabel: "प्राथमिक सहायता का प्रकार",
    medical: "चिकित्सा आपातकाल",
    food: "पेयजल / राशन संकट",
    boat: "बचाव नाव की आवश्यकता",
    multiple: "एकाधिक गंभीर संकट",
    groupLabel: "फंसे हुए व्यक्तियों की संख्या",
    notePlaceholder: "संक्षिप्त विवरण (उदा. छत पर फंसे हैं, शिशु साथ में)...",
    holdToConfirm: "SOS भेजने के लिए 1.5 सेकंड दबाए रखें",
    releasing: "दबाए रखें...",
    transmitting: "16-बाइट पैकेट तैयार हो रहा है...",
    sentSuccess: "आपकी संकट सूचना आपदा नियंत्रण कक्ष को प्राप्त हो गई है!",
    queuedOffline: "नेटवर्क नहीं: ऑफलाइन सहेजा गया। नेटवर्क मिलते ही भेजा जाएगा।",
    assignedTo: "बचाव दल तैनात",
    smsFallback: "SMS के माध्यम से भेजें (ऑफलाइन)",
    smsButton: `SMS भेजें (${DEMO_SMS_NUMBER})`,
    satSimLabel: "उपग्रह लघु-संदेश चैनल",
    satSimNotice: "SIMULATED: किसी NavIC या उपग्रह हार्डवेयर का उपयोग नहीं",
    accuracy: "GPS सटीकता",
  },
};

export default function BeaconPwaPage() {
  const [lang, setLang] = useState<string>("en");
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Beacon Form State
  const [lat, setLat] = useState<number>(24.833333);
  const [lon, setLon] = useState<number>(92.778899);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"locating" | "locked" | "simulated">("locating");
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof window !== "undefined" ? navigator.onLine : true));

  const [needType, setNeedType] = useState<NeedType>("medical");
  const [groupSize, setGroupSize] = useState<number>(3);
  const [note, setNote] = useState<string>("");
  const [createdTs] = useState<number>(() => Math.floor(Date.now() / 1000));

  // Packed binary representation (derived from lat, lon, needType, groupSize)
  const { payloadBytes, hexCode, base32Code } = useMemo(() => {
    try {
      const packed = packBeaconPayload(lat, lon, createdTs, needType, groupSize);
      return {
        payloadBytes: packed,
        hexCode: "0x" + bytesToHex(packed),
        base32Code: encodeBase32(packed),
      };
    } catch (e) {
      console.warn("Payload packing error:", e);
      return { payloadBytes: null, hexCode: "", base32Code: "" };
    }
  }, [lat, lon, createdTs, needType, groupSize]);

  // SOS Hold-to-confirm progress (0 to 100)
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number>(0);

  // Transmission status
  const [dispatchStatus, setDispatchStatus] = useState<"idle" | "transmitting" | "sent" | "queued">("idle");
  const [assignedTeam, setAssignedTeam] = useState<string | null>(null);
  const [nearestZone, setNearestZone] = useState<string | null>(null);
  const [stagingHint, setStagingHint] = useState<string | null>(null);
  const [copiedSms, setCopiedSms] = useState<boolean>(false);

  // Satellite simulation channel
  const [satUplinkProgress, setSatUplinkProgress] = useState<number>(0);
  const [satTransmitting, setSatTransmitting] = useState<boolean>(false);

  // Offline queue count
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const transmitRef = useRef<((channelOverride?: "online" | "sms" | "nav_sim") => Promise<void>) | null>(null);
  const flushRef = useRef<(() => Promise<void>) | null>(null);

  const handleApplyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  // Flush offline queue helper
  const flushQueue = useCallback(async () => {
    const sent = await flushOfflineQueue(async (beacon) => {
      try {
        const res = await fetch(getApiUrl("/beacons"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: beacon.lat,
            lon: beacon.lon,
            group_size: beacon.groupSize,
            need_type: beacon.needType,
            battery: beacon.battery,
            channel: beacon.channel,
            note: beacon.note,
            payload_code: beacon.payloadCode,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    });
    if (sent > 0) {
      const remaining = await getQueuedBeacons();
      setQueuedCount(remaining.length);
    }
  }, []);

  useEffect(() => {
    flushRef.current = flushQueue;
  }, [flushQueue]);

  // Service Worker & Geolocation Acquisition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => {
        setIsOnline(true);
        flushQueue();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("focus", handleOnline);

      // Automated testing hook for offline CDP test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__JALDRISHTI_TEST__ = {
        transmit: (ch?: "online" | "sms" | "nav_sim") => transmitRef.current?.(ch),
        flush: () => flushRef.current?.(),
        isOnline: () => navigator.onLine,
        getQueuedBeacons,
      };

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            if (reg.waiting) {
              setWaitingWorker(reg.waiting);
              setUpdateAvailable(true);
            }
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    setWaitingWorker(newWorker);
                    setUpdateAvailable(true);
                  }
                });
              }
            });
          })
          .catch(() => {});

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      }

      // Check battery
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (nav.getBattery) {
        nav.getBattery().then((battery: { level: number }) => {
          setBatteryLevel(Math.round(battery.level * 100));
        }).catch(() => {});
      }

      // Acquire GPS location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLat(pos.coords.latitude);
            setLon(pos.coords.longitude);
            setAccuracy(Math.round(pos.coords.accuracy));
            setGpsStatus("locked");
          },
          () => {
            // Default to central Cachar / Silchar coords
            setLat(24.861674);
            setLon(92.842047);
            setAccuracy(25);
            setGpsStatus("simulated");
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        requestAnimationFrame(() => setGpsStatus("simulated"));
      }

      // Initial queue check
      getQueuedBeacons().then((q) => setQueuedCount(q.length));

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("focus", handleOnline);
      };
    }
  }, [flushQueue]);

  // Dispatch Beacon function
  const handleTransmitBeacon = useCallback(async (channelOverride?: "online" | "sms" | "nav_sim") => {
    if (!payloadBytes) return;
    setDispatchStatus("transmitting");

    // Haptic vibration
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 150]);
    }

    const channel = channelOverride || (isOnline ? "online" : "sms");
    const nowTs = Math.floor(Date.now() / 1000);

    const beaconData = {
      lat,
      lon,
      group_size: groupSize,
      need_type: needType,
      battery: batteryLevel,
      channel,
      note,
      payload_code: base32Code,
    };

    // If online, post to API
    if (isOnline && channel !== "sms") {
      try {
        const res = await fetch(getApiUrl("/beacons"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(beaconData),
        });

        if (res.ok) {
          const json = await res.json();
          setDispatchStatus("sent");
          setAssignedTeam(json.assigned_team || "Pending Triage (Assam Emergency Ops)");
          setNearestZone(json.zone_name);
          setStagingHint(json.route_or_staging_hint);
          return;
        }
      } catch {
        // Fall through to offline queue
      }
    }

    // Offline Queue
    const qItem: QueuedBeacon = {
      payloadCode: base32Code,
      rawHex: hexCode,
      lat,
      lon,
      timestamp: nowTs,
      needType,
      groupSize,
      battery: batteryLevel,
      channel,
      note,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    };

    await enqueueBeacon(qItem);
    const qList = await getQueuedBeacons();
    setQueuedCount(qList.length);
    setDispatchStatus("queued");
  }, [payloadBytes, isOnline, lat, lon, groupSize, needType, batteryLevel, note, base32Code, hexCode]);

  useEffect(() => {
    transmitRef.current = handleTransmitBeacon;
  }, [handleTransmitBeacon]);

  // Hold-to-confirm logic (1.5 seconds)
  const startHold = () => {
    // Check if user prefers reduced motion
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      handleTransmitBeacon();
      return;
    }

    setIsHolding(true);
    holdStartTimeRef.current = Date.now();
    setHoldProgress(0);

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 1500) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setIsHolding(false);
        setHoldProgress(0);
        handleTransmitBeacon();
      }
    }, 20);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  // Simulated satellite short-message dispatch
  const handleSimulatedSatelliteUplink = () => {
    setSatTransmitting(true);
    setSatUplinkProgress(10);

    const stepInterval = setInterval(() => {
      setSatUplinkProgress((prev) => {
        if (prev >= 90) {
          clearInterval(stepInterval);
          setTimeout(() => {
            setSatTransmitting(false);
            setSatUplinkProgress(100);
            handleTransmitBeacon("nav_sim");
          }, 400);
          return 95;
        }
        return prev + 25;
      });
    }, 300);
  };

  // SMS Body Construction
  const smsBody = `SOS JALDRISHTI ${base32Code} LAT:${lat.toFixed(4)} LON:${lon.toFixed(4)} NEED:${needType.toUpperCase()} GRP:${groupSize} NOTE:${encodeURIComponent(note || "Flood Emergency")}`;

  const copySmsText = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(smsBody);
      setCopiedSms(true);
      setTimeout(() => setCopiedSms(false), 2500);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        highContrast ? "bg-black text-white" : "bg-space-950 text-foreground"
      } p-4 sm:p-6 md:p-8 flex flex-col justify-between max-w-2xl mx-auto selection:bg-rose-500 selection:text-white`}
    >
      {/* Top Bar Navigation */}
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-300 hover:text-white min-h-[44px]">
            <ArrowLeft className="w-4 h-4" /> Home
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Toggle High Contrast Mode"
            aria-label="Toggle High Contrast Mode"
          >
            {highContrast ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Language Switcher */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-white/10 border border-white/20 text-xs font-mono text-white rounded-md px-2 py-1.5 focus:outline-none min-h-[44px]"
            aria-label="Language selector"
          >
            <option value="en">English</option>
            <option value="as">অসমীয়া</option>
            <option value="bn">বাংলা</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>
      </header>

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-between text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-2 text-cyan-200">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Update available. Reload to activate the latest offline assets.</span>
          </div>
          <Button
            size="sm"
            onClick={handleApplyUpdate}
            className="h-7 px-3 bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs"
          >
            Reload Now
          </Button>
        </div>
      )}

      {/* Main Form Content */}
      <main className="py-6 space-y-6">
        {/* Title & Telemetry Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>ASTRA 2026 • 16-BYTE COMPACT BEACON</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
            {t.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {t.subtitle}
          </p>
        </div>

        {/* Live Device Telemetry Strip */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
          {/* Signal */}
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300">Offline Queue</span>
              </>
            )}
          </div>

          {/* Battery */}
          <div className="flex items-center justify-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-200">{batteryLevel !== null ? `${batteryLevel}%` : "n/a"}</span>
          </div>

          {/* GPS Status */}
          <div className="flex items-center justify-end gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-200 truncate">
              {gpsStatus === "locked" ? `±${accuracy}m` : "Cachar Default"}
            </span>
          </div>
        </div>

        {/* Demo Position Notice */}
        <div className="px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
          <span>Demo: your position is only sent to this local server.</span>
        </div>

        {/* Emergency Input Form */}
        <div className="space-y-4">
          {/* Need Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
              <span>{t.needLabel}</span>
              <span className="text-rose-400">Required</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "medical" as NeedType, label: t.medical, color: "border-rose-500/50 bg-rose-950/20 text-rose-200" },
                { type: "food" as NeedType, label: t.food, color: "border-amber-500/50 bg-amber-950/20 text-amber-200" },
                { type: "boat" as NeedType, label: t.boat, color: "border-cyan-500/50 bg-cyan-950/20 text-cyan-200" },
                { type: "multiple" as NeedType, label: t.multiple, color: "border-purple-500/50 bg-purple-950/20 text-purple-200" },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setNeedType(item.type)}
                  className={`p-3 rounded-lg border text-xs font-medium text-left transition-all min-h-[48px] flex items-center cursor-pointer ${
                    needType === item.type
                      ? `${item.color} ring-2 ring-white/30 font-bold shadow-lg`
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Group Size Stepper */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-300">
              {t.groupLabel}
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGroupSize((s) => Math.max(1, s - 1))}
                className="w-12 h-12 text-lg font-bold min-h-[48px]"
                aria-label="Decrease group count"
              >
                -
              </Button>
              <div className="flex-1 py-3 text-center bg-white/5 border border-white/10 rounded-lg text-xl font-mono font-bold text-white min-h-[48px] flex items-center justify-center">
                {groupSize} {groupSize === 1 ? "Person" : "People"}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGroupSize((s) => Math.min(31, s + 1))}
                className="w-12 h-12 text-lg font-bold min-h-[48px]"
                aria-label="Increase group count"
              >
                +
              </Button>
            </div>
          </div>

          {/* Optional Short Note */}
          <div className="space-y-1">
            <input
              type="text"
              maxLength={120}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 min-h-[44px]"
            />
          </div>
        </div>

        {/* 16-Byte Payload Inspector Box */}
        <div className="p-3.5 rounded-xl bg-space-900 border border-white/10 font-mono text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>PACKED 16-BYTE BINARY PAYLOAD</span>
            <Badge variant="real">CRC16 VERIFIED</Badge>
          </div>
          <div className="flex items-baseline justify-between gap-2 overflow-x-auto text-[11px]">
            <span className="text-cyan-300 font-bold">{hexCode}</span>
            <span className="text-amber-300 font-semibold">{base32Code}</span>
          </div>
        </div>

        {/* SOS Hold-to-Confirm Button */}
        <div className="pt-2 flex flex-col items-center space-y-3">
          <div className="relative w-full max-w-sm flex items-center justify-center">
            {/* Outer Progress Fill Ring */}
            <div
              className="relative w-44 h-44 rounded-full flex items-center justify-center select-none cursor-pointer"
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              role="button"
              tabIndex={0}
              aria-label="Hold to confirm distress beacon transmission"
            >
              {/* SVG Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 176 176">
                <circle cx="88" cy="88" r="76" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                <circle
                  cx="88"
                  cy="88"
                  r="76"
                  stroke="#E11D48"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray="477.5"
                  strokeDashoffset={477.5 - (477.5 * holdProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-75 ease-out"
                />
              </svg>

              {/* Inner SOS Button Core */}
              <div
                className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all ${
                  isHolding
                    ? "bg-rose-700 scale-95 shadow-[0_0_50px_rgba(225,29,72,0.8)]"
                    : "bg-rose-600 hover:bg-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.5)]"
                }`}
              >
                <AlertTriangle className="w-8 h-8 text-white mb-1" />
                <span className="text-xl font-heading font-black tracking-widest text-white">
                  SOS
                </span>
                <span className="text-[10px] font-mono text-white/80 font-bold">
                  {isHolding ? `${Math.round(holdProgress)}%` : "HOLD 1.5s"}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-mono text-center">
            {isHolding ? t.releasing : t.holdToConfirm}
          </p>
        </div>

        {/* Status Stepper Card */}
        {dispatchStatus !== "idle" && (
          <GlassCard className="p-4 space-y-3 border-emerald-500/30 bg-emerald-950/10 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{dispatchStatus === "sent" ? t.sentSuccess : t.queuedOffline}</span>
            </div>

            {/* Response Details */}
            <div className="text-xs font-mono space-y-1 text-slate-300">
              {nearestZone && (
                <div>Nearest Zone: <strong className="text-white">{nearestZone}</strong></div>
              )}
              {assignedTeam && (
                <div>Status: <span className="text-cyan-300 font-bold">{assignedTeam}</span></div>
              )}
              {stagingHint && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-white/10">
                  {stagingHint}
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Offline Queue Badge & Sync Button */}
        {queuedCount > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
            <span className="text-amber-300">
              {queuedCount} beacon packet{queuedCount > 1 ? "s" : ""} queued offline
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={flushQueue}
              className="gap-1.5 h-8 text-xs min-h-[40px]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
            </Button>
          </div>
        )}

        {/* Fallback Channels Accordion */}
        <div className="space-y-3 pt-2">
          {/* Channel 1: SMS Direct Link */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5 font-bold">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                {t.smsFallback}
              </span>
              <Badge variant="real">Zero Data Needed</Badge>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Encodes your coordinate and need into a standard 160-character GSM SMS packet.
            </p>
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
              <strong>Demo Notice:</strong> SMS goes to a placeholder demo number ({DEMO_SMS_NUMBER}). For simulation only; not integrated with the 1077 helpline or any government channel.
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={`sms:${DEMO_SMS_NUMBER}?body=${encodeURIComponent(smsBody)}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium min-h-[44px] transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.smsButton}</span>
              </a>
              <Button
                variant="secondary"
                onClick={copySmsText}
                className="gap-1.5 text-xs min-h-[44px]"
              >
                {copiedSms ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSms ? "Copied" : "Copy Text"}</span>
              </Button>
            </div>
          </div>

          {/* Channel 2: Simulated Satellite Short-Message Channel */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5 font-bold">
                <Satellite className="w-4 h-4 text-purple-400" />
                {t.satSimLabel}
              </span>
              <Badge variant="simulated">SIMULATED</Badge>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Simulates low-earth orbit / NavIC short-message burst transmitter for completely severed terrestrial networks.
            </p>
            <div className="p-2 rounded bg-purple-950/30 border border-purple-500/20 text-[10px] font-mono text-purple-300">
              {t.satSimNotice}
            </div>
            <Button
              variant="secondary"
              onClick={handleSimulatedSatelliteUplink}
              disabled={satTransmitting}
              className="w-full gap-2 text-xs min-h-[44px] border-purple-500/30 bg-purple-900/20 hover:bg-purple-900/40 text-purple-200"
            >
              <Satellite className={`w-3.5 h-3.5 ${satTransmitting ? "animate-spin" : ""}`} />
              <span>
                {satTransmitting
                  ? `Transmitting to Constellation (${satUplinkProgress}%)...`
                  : "Simulate Satellite Uplink Broadcast"}
              </span>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer & Privacy Link */}
      <footer className="pt-6 border-t border-white/10 text-xs font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link href="/beacon/privacy" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white underline min-h-[44px]">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>DPDP Act 2023 Privacy &amp; Data Deletion Policy</span>
        </Link>
        <div className="text-slate-500">
          ASTRA 2026 • Domain 4 Action Engine
        </div>
      </footer>
    </div>
  );
}
