/**
 * Capture screenshots of Command Center at required responsive viewports:
 * 1. 1440x900 (Desktop large)
 * 2. 1280x720 (Desktop standard / HD)
 * 3. 390x844  (iPhone 12/13/14 mobile viewport)
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = 9226;

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

const VIEWPORTS = [
  { name: "command_center_1440x900.png", width: 1440, height: 900, isMobile: false },
  { name: "command_center_1280x720.png", width: 1280, height: 720, isMobile: false },
  { name: "command_center_390x844.png",  width: 390,  height: 844, isMobile: true  },
];

async function capture() {
  const outDir = path.resolve("docs/screenshots");
  fs.mkdirSync(outDir, { recursive: true });

  for (const vp of VIEWPORTS) {
    console.log(`[Screenshot] Capturing ${vp.name} (${vp.width}x${vp.height})...`);
    const chrome = spawn(CHROME_PATH, [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--window-size=${vp.width},${vp.height}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--use-gl=angle",
      "--use-angle=metal",
      "http://localhost:3000/command-center",
    ]);

    await sleep(1500);
    const list = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise((res) => (ws.onopen = res));

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.id && pending.has(d.id)) {
        pending.get(d.id)(d.result);
        pending.delete(d.id);
      }
    };

    const send = (method, params = {}) =>
      new Promise((res, rej) => {
        const id = msgId++;
        pending.set(id, res);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.isMobile,
    });

    // Wait for map and tiles to render
    for (let t = 0; t < 15; t++) {
      await sleep(500);
      const res = await send("Runtime.evaluate", {
        expression: "Boolean(window.__JALDRISHTI_MAP__ && window.__JALDRISHTI_MAP__.isStyleLoaded())",
        returnByValue: true,
      });
      if (res?.result?.value) break;
    }
    await sleep(1000); // Allow tiles & canvas draw

    const snap = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(snap.data, "base64");
    const dest = path.join(outDir, vp.name);
    fs.writeFileSync(dest, buffer);
    console.log(`[Screenshot] Saved ${dest} (${(buffer.length / 1024).toFixed(1)} KB)`);

    try { await send("Browser.close"); } catch {}
    chrome.kill("SIGKILL");
    await sleep(1000);
  }
  console.log("All screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
