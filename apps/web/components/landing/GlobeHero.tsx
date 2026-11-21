"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Satellite } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import * as THREE from "three";

export function GlobeHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  useEffect(() => {
    // Test WebGL support
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Set up Three.js Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.2, 5.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Procedural Earth Texture (Monochrome landmass with night city lights - 100% offline)
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 1024;
    texCanvas.height = 512;
    const ctx = texCanvas.getContext("2d");
    if (ctx) {
      // Deep space ocean
      ctx.fillStyle = "#070E22";
      ctx.fillRect(0, 0, 1024, 512);

      // Generalized landmasses (India, Asia, Europe, Africa, Americas)
      ctx.fillStyle = "#0D1E40";
      // Asia & India
      ctx.beginPath();
      ctx.ellipse(650, 220, 180, 100, 0, 0, Math.PI * 2);
      ctx.fill();
      // Indian Subcontinent triangle protrusion
      ctx.beginPath();
      ctx.moveTo(630, 230);
      ctx.lineTo(660, 310);
      ctx.lineTo(690, 240);
      ctx.closePath();
      ctx.fill();
      // Africa
      ctx.beginPath();
      ctx.ellipse(500, 260, 90, 130, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Europe
      ctx.beginPath();
      ctx.ellipse(510, 150, 80, 50, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // Americas
      ctx.beginPath();
      ctx.ellipse(250, 170, 70, 90, -0.2, 0, Math.PI * 2);
      ctx.ellipse(320, 320, 60, 110, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Australia
      ctx.beginPath();
      ctx.ellipse(780, 360, 60, 45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden night lights on populated clusters
      ctx.fillStyle = "#FDE68A"; // amber night lights
      const cities = [
        [660, 275, 4], // Northeast India / Silchar / Guwahati (emphasized)
        [640, 280, 3], // Delhi / North India
        [645, 305, 3], // Mumbai
        [675, 290, 3], // Kolkata
        [720, 260, 2.5], // Bangkok
        [740, 295, 2.5], // Singapore
        [770, 220, 3], // Tokyo
        [520, 140, 2.5], // London / Paris
        [280, 170, 3], // New York
      ];
      cities.forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Silchar / Barak Valley focal beacon pulse
      ctx.fillStyle = "#22D3EE";
      ctx.beginPath();
      ctx.arc(662, 274, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const earthTexture = new THREE.CanvasTexture(texCanvas);
    const earthGeo = new THREE.SphereGeometry(1.8, 48, 48);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 12,
      specular: new THREE.Color(0x1e3a8a),
      bumpScale: 0.05,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    // Orient globe so India and Barak basin face forward-right
    earth.rotation.y = 3.6;
    earth.rotation.x = 0.25;
    scene.add(earth);

    // Atmospheric outer glow
    const atmosGeo = new THREE.SphereGeometry(1.86, 32, 32);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(0.13, 0.83, 0.93, 1.0) * intensity * 0.9;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmos = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmos);

    // Orbit Path Line (Sentinel-1 Sun-Synchronous Polar Inclination ~98 deg)
    const orbitRadius = 2.45;
    const orbitPoints: THREE.Vector3[] = [];
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      // Inclined elliptical orbit
      const x = orbitRadius * Math.cos(theta);
      const y = orbitRadius * Math.sin(theta) * Math.cos(THREE.MathUtils.degToRad(35));
      const z = orbitRadius * Math.sin(theta) * Math.sin(THREE.MathUtils.degToRad(35));
      orbitPoints.push(new THREE.Vector3(x, y, z));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.35,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbitLine);

    // Low-Poly Satellite Model (Bus + Solar Arrays + SAR Aperture)
    const satGroup = new THREE.Group();
    // Cube bus
    const busGeo = new THREE.BoxGeometry(0.08, 0.08, 0.12);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const bus = new THREE.Mesh(busGeo, busMat);
    satGroup.add(bus);

    // Solar panels (left and right)
    const panelGeo = new THREE.BoxGeometry(0.24, 0.01, 0.08);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.5,
      roughness: 0.4,
    });
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.set(-0.16, 0, 0);
    satGroup.add(leftPanel);

    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.set(0.16, 0, 0);
    satGroup.add(rightPanel);

    // SAR Antenna array
    const sarAntennaGeo = new THREE.BoxGeometry(0.06, 0.04, 0.02);
    const sarAntennaMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sarAntenna = new THREE.Mesh(sarAntennaGeo, sarAntennaMat);
    sarAntenna.position.set(0, -0.05, 0);
    satGroup.add(sarAntenna);

    scene.add(satGroup);

    // Starfield Background
    const starsCount = 1000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 40;
      starPos[i + 1] = (Math.random() - 0.5) * 40;
      starPos[i + 2] = (Math.random() - 0.5) * 30 - 5;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(5, 3, 4);
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.4);
    scene.add(ambientLight);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // Visibility Observer to pause when hidden (100% efficient)
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    // Animation Loop
    let animId: number;
    let orbitAngle = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      if (!reducedMotion) {
        earth.rotation.y += 0.0008;

        orbitAngle += 0.006;
        const x = orbitRadius * Math.cos(orbitAngle);
        const y = orbitRadius * Math.sin(orbitAngle) * Math.cos(THREE.MathUtils.degToRad(35));
        const z = orbitRadius * Math.sin(orbitAngle) * Math.sin(THREE.MathUtils.degToRad(35));
        satGroup.position.set(x, y, z);
        satGroup.rotation.y = orbitAngle;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const words = "From satellite pixel to last-mile rescue.".split(" ");

  return (
    <section className="relative min-h-[92vh] flex items-center justify-between overflow-hidden px-6 md:px-16 pt-8 pb-16">
      {/* Background 3D Canvas / WebGL Fallback */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-end">
        {webglSupported ? (
          <div
            ref={containerRef}
            className="w-full md:w-[60vw] h-full opacity-90 transition-opacity duration-700"
            aria-hidden="true"
          />
        ) : (
          <div
            className="w-full md:w-[60vw] h-full flex items-center justify-center relative opacity-80"
            aria-hidden="true"
          >
            <div className="relative w-80 h-80 rounded-full border border-aurora-400/30 flex items-center justify-center bg-gradient-to-tr from-space-950 via-space-900 to-flood-950">
              <div className="w-64 h-64 rounded-full border border-aurora-400/40 shadow-[0_0_60px_rgba(34,211,238,0.2)]" />
              <Satellite className="absolute top-4 right-12 w-8 h-8 text-aurora-400 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 max-w-3xl space-y-8">
        {/* Telemetry pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-space-900/90 border border-white/10 text-xs font-mono text-slate-300 backdrop-blur-md shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-safe-400 animate-ping" />
          <span className="text-aurora-400 font-semibold">ASTRA 2026</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">SENTINEL-1 C-SAR</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">BARAK BASIN PEAK</span>
        </motion.div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold tracking-tight text-white leading-[1.1]">
          {words.map((word, index) => (
            <span
              key={index}
              className={
                word.toLowerCase().includes("rescue") || word.toLowerCase().includes("pixel")
                  ? "text-aurora-400 inline-block mr-3"
                  : "inline-block mr-3"
              }
            >
              {word}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p className="text-slate-300 text-lg md:text-xl font-body leading-relaxed max-w-2xl">
          Space-enabled flood intelligence platform. Sensing through monsoon cloud decks,
          topologically detecting isolated communities, computing dry evacuation corridors, and
          broadcasting offline emergency beacons.
        </p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="flex flex-wrap items-center gap-4 pt-2"
        >
          <Link href="/command-center">
            <Button
              size="lg"
              className="gap-2.5 px-6 py-6 text-base font-semibold shadow-[0_0_30px_rgba(34,211,238,0.25)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-all"
            >
              Launch Command Center <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          <a href="#problem-scene">
            <Button variant="secondary" size="lg" className="gap-2.5 px-6 py-6 text-base">
              <Play className="w-4 h-4 text-aurora-400 fill-aurora-400" /> Watch The Story
            </Button>
          </a>
        </motion.div>

        {/* Key Real System Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/10 text-xs font-mono text-slate-300"
        >
          <div className="flex items-center gap-1.5">
            <Badge variant="real">REAL</Badge>
            <span>Copernicus S1 SAR &amp; WorldPop</span>
          </div>
          <span className="text-slate-400">•</span>
          <div className="flex items-center gap-1.5">
            <Badge variant="derived">DERIVED</Badge>
            <span>U-Net Water Mask &amp; Road Isolation</span>
          </div>
          <span className="text-slate-400">•</span>
          <div className="flex items-center gap-1.5">
            <Badge variant="simulated">SIMULATED</Badge>
            <span>Beacon Emergency Delivery</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
