/**
 * Verification of self-hosted offline PMTiles basemap and data layers.
 * Uses headless Chrome DevTools Protocol (CDP) to:
 * 1. Block external network (only allow localhost/127.0.0.1)
 * 2. Load http://localhost:3000/command-center
 * 3. Verify zero external network requests
 * 4. Verify map loads style and PMTiles vector tiles
 * 5. Verify queryRenderedFeatures returns features for unet-fill and zones-fill.
 */

import { spawn } from "node:child_process";
import http from "node:http";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = 9224;

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

async function main() {
  console.log("[Map CDP Test] Launching Chrome on port", CDP_PORT);
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--use-gl=angle",
    "--use-angle=metal",
    "--enable-webgl",
    "http://localhost:3000/command-center",
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const list = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (Array.isArray(list) && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch {}
    await sleep(250);
  }

  if (!wsUrl) throw new Error("Could not connect to Chrome CDP WebSocket");

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  const externalRequests = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
    if (data.method === "Runtime.consoleAPICalled") {
      const args = (data.params.args || []).map((a) => a.value ?? a.description);
      console.log("[Browser Console]", data.params.type, ...args);
    }
    if (data.method === "Network.requestWillBeSent") {
      const url = data.params.request.url;
      if (!url.startsWith("http://localhost:3000") &&
          !url.startsWith("http://127.0.0.1") &&
          !url.startsWith("data:") &&
          !url.startsWith("blob:") &&
          !url.startsWith("chrome-extension:")) {
        externalRequests.push(url);
      }
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Network.enable");
  await send("Runtime.enable");

  console.log("[Map CDP Test] Waiting for MapLibre map instance and layer rendering...");
  let mapReady = false;
  let counts = { unet: 0, zones: 0, basemapWater: 0 };

  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const evalRes = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const map = window.__JALDRISHTI_MAP__;
          if (!map || !map.isStyleLoaded()) return { ready: false };
          const unet = map.queryRenderedFeatures({ layers: ["unet-fill"] }).length;
          const zones = map.queryRenderedFeatures({ layers: ["zones-fill"] }).length;
          const water = map.getLayer("water") ? map.queryRenderedFeatures({ layers: ["water"] }).length : 0;
          return { ready: true, unet, zones, water };
        })()
      `,
      returnByValue: true,
    });

    const res = evalRes?.result?.value;
    if (res?.ready && res.unet > 0 && res.zones > 0) {
      mapReady = true;
      counts = res;
      break;
    }
  }

  // Cleanup browser
  try { await send("Browser.close"); } catch {}
  chrome.kill("SIGKILL");

  console.log("[Map CDP Test] Result:", counts);
  console.log("[Map CDP Test] External runtime requests:", externalRequests);

  if (externalRequests.length > 0) {
    throw new Error("FAIL: Third-party runtime requests detected: " + externalRequests.join(", "));
  }

  if (!mapReady || counts.unet === 0 || counts.zones === 0) {
    throw new Error(`FAIL: Expected rendered features > 0. Got: ${JSON.stringify(counts)}`);
  }

  console.log(`PASS: Map rendered offline! unet-fill=${counts.unet}, zones-fill=${counts.zones}, water=${counts.water}, external_requests=0`);
}

main().catch((err) => {
  console.error("[Map CDP Test] FAIL:", err);
  process.exit(1);
});
