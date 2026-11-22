/**
 * Capture high-resolution presentation screenshots using headless Chrome via CDP.
 * Resolution: 1920x1080 (deviceScaleFactor: 2) for desktop; 390x844 (scale: 2) for beacon mobile.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = 9224;
const OUTPUT_DIR = path.resolve("docs/presentation/assets");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function run() {
  console.log("Launching headless Chrome on port", CDP_PORT);
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1920,1080",
    "about:blank",
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 25; i++) {
      try {
        const list = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
        if (Array.isArray(list) && list.length > 0 && list[0].webSocketDebuggerUrl) {
          wsUrl = list[0].webSocketDebuggerUrl;
          break;
        }
      } catch {}
      await sleep(250);
    }

    if (!wsUrl) throw new Error("Could not connect to Chrome DevTools WebSocket");

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result?.value;
    }

    async function setViewport(width, height, deviceScaleFactor = 2, mobile = false) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor,
        mobile,
      });
    }

    async function capture(filename) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const buffer = Buffer.from(data, "base64");
      const dest = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(dest, buffer);
      console.log(`Saved screenshot: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }

    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");

    // 1. Capture Command Center - Default view
    console.log("Navigating to Command Center...");
    await setViewport(1920, 1080, 2, false);
    await send("Page.navigate", { url: "http://localhost:3000/command-center" });
    await sleep(4000); // Allow MapLibre PMTiles basemap and GeoJSON layers to render
    await capture("command_center_main.png");

    // 2. Capture Villages Tab with zone selected
    console.log("Selecting Villages tab and Masimpur (zone_20)...");
    await evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const villageTab = tabs.find(b => b.textContent && b.textContent.includes('Villages'));
        if (villageTab) villageTab.click();
      })()
    `);
    await sleep(1000);
    // Click on the first or specific village button in list
    await evaluate(`
      (() => {
        const villageBtns = Array.from(document.querySelectorAll('div, button')).filter(el => el.textContent && el.textContent.includes('Masimpur'));
        if (villageBtns.length > 0) villageBtns[villageBtns.length - 1].click();
      })()
    `);
    await sleep(1500);
    await capture("command_center_villages.png");

    // 3. Capture Routes Tab
    console.log("Selecting Routes tab...");
    await evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const routeTab = tabs.find(b => b.textContent && b.textContent.includes('Routes'));
        if (routeTab) routeTab.click();
      })()
    `);
    await sleep(1500);
    await capture("command_center_routes.png");

    // 4. Capture Alerts Tab (multilingual preview)
    console.log("Selecting Alerts tab...");
    await evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const alertTab = tabs.find(b => b.textContent && b.textContent.includes('Alerts'));
        if (alertTab) alertTab.click();
      })()
    `);
    await sleep(1500);
    await capture("command_center_alerts.png");

    // 5. Capture What-If Tab
    console.log("Selecting What-If tab...");
    await evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const whatifTab = tabs.find(b => b.textContent && b.textContent.includes('What-If'));
        if (whatifTab) whatifTab.click();
      })()
    `);
    await sleep(1500);
    await capture("command_center_whatif.png");

    // 6. Capture Beacon PWA on mobile viewport (390x844)
    console.log("Navigating to Beacon PWA on mobile viewport...");
    await setViewport(390, 844, 2, true);
    await send("Page.navigate", { url: "http://localhost:3000/beacon" });
    await sleep(2500);
    await capture("beacon_mobile.png");

    // 7. Capture Landing Page radar schematic / hero
    console.log("Navigating to Landing Page...");
    await setViewport(1920, 1080, 2, false);
    await send("Page.navigate", { url: "http://localhost:3000/#radar" });
    await sleep(2500);
    await capture("landing_radar_schematic.png");

    console.log("All screenshots captured successfully into", OUTPUT_DIR);
    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
