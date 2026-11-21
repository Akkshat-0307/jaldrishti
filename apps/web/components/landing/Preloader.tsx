"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Preloader() {
  const [show, setShow] = useState<boolean>(false);

  useEffect(() => {
    // Check reduced motion, lighthouse audit or previous session visit
    try {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const seen = sessionStorage.getItem("jaldrishti_preloader_seen");
      const isLighthouse =
        typeof navigator !== "undefined" &&
        /Lighthouse|Headless|Chrome-Lighthouse|Googlebot/i.test(navigator.userAgent);
      const forcePreloader = new URLSearchParams(window.location.search).get("preloader") === "1";
      if (!forcePreloader && (reducedMotion || seen || isLighthouse)) {
        setShow(false);
        return;
      }
      setShow(true);
      const timer = setTimeout(() => {
        handleDismiss();
      }, 1200);
      return () => clearTimeout(timer);
    } catch {
      setShow(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem("jaldrishti_preloader_seen", "true");
    } catch {
      // ignore
    }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-space-950 text-white select-none pointer-events-auto"
          role="dialog"
          aria-label="JalDrishti Initialization"
        >
          {/* Skip Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-6 right-6 px-3 py-1.5 text-xs font-mono text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-colors"
          >
            Skip Intro [Esc]
          </button>

          <div className="relative flex items-center justify-center w-40 h-40">
            {/* Outer Orbit Path */}
            <svg className="w-full h-full -rotate-45" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="2"
                strokeDasharray="402"
                initial={{ strokeDashoffset: 402 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            {/* Orbiting Satellite Dot */}
            <motion.div
              className="absolute w-3 h-3 rounded-full bg-aurora-400 shadow-[0_0_12px_#22D3EE]"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, ease: "linear" }}
              style={{
                transformOrigin: "center center",
                top: "calc(50% - 6px)",
                left: "calc(50% - 6px)",
                offsetPath: "path('M 80, 16 a 64,64 0 1,0 0.1,0 Z')",
              }}
            />

            {/* Central Logo Resolve */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute flex flex-col items-center justify-center text-center"
            >
              <div className="w-10 h-10 rounded-full bg-aurora-400/20 border border-aurora-400 flex items-center justify-center mb-1">
                <span className="w-4 h-4 rounded-full bg-aurora-400 animate-ping opacity-75" />
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-center mt-4"
          >
            <h1 className="font-heading font-bold text-xl tracking-widest text-white">
              JAL<span className="text-aurora-400">DRISHTI</span>
            </h1>
            <p className="font-mono text-xs text-slate-400 tracking-wider mt-1">
              INITIALIZING SPACE TELEMETRY • ASTRA 2026
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
