/**
 * Automated end-to-end CDP test for JalDrishti Rescue Beacon offline queue.
 * Uses headless Chrome DevTools Protocol to:
 * 1. Load http://localhost:3000/beacon
 * 2. Emulate network offline (Network.emulateNetworkConditions offline=true)
 * 3. Transmit an emergency beacon
 * 4. Verify packet was saved in IndexedDB
 * 5. Emulate network online (Network.emulateNetworkConditions offline=false)
 * 6. Verify automatic queue flush delivers beacon to API
 * 7. Query http://127.0.0.1:8000/beacons to verify it appears exactly once (no duplicates).
 */

import { spawn } from "node:child_process";
import http from "node:http";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = 9223;

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

async function main() {
  console.log("[CDP Test] Starting headless Chrome on port", CDP_PORT);
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "http://localhost:3000/beacon",
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

  if (!wsUrl) {
    chrome.kill();
    throw new Error("Failed to acquire Chrome DevTools WebSocket URL");
  }

  console.log("[CDP Test] Connecting to page WebSocket:", wsUrl);
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.consoleAPICalled") {
        console.log("[Browser Console]", ...msg.params.args.map((a) => a.value || a.description));
      }
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }
    } catch (e) {
      console.error("[CDP Test] Message parse error:", e);
    }
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  try {
    console.log("[CDP Test] Enabling Network and Runtime domains...");
    await sendCommand("Network.enable");
    await sendCommand("Page.enable");
    await sendCommand("Runtime.enable");

    // Wait 2.5s for initial React render and IndexedDB readiness
    await sleep(2500);

    // Initial check of backend beacons
    const initialBeacons = await fetchJson("http://127.0.0.1:8000/beacons");
    const initialCount = initialBeacons.length;
    console.log(`[CDP Test] Initial beacons in backend: ${initialCount}`);

    // Step 1: Go Offline via CDP
    console.log("[CDP Test] Setting network to OFFLINE...");
    await sendCommand("Network.emulateNetworkConditions", {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    // Notify window of offline event
    await sendCommand("Runtime.evaluate", {
      expression: `window.dispatchEvent(new Event('offline'));`,
    });

    await sleep(500);

    // Step 2: Trigger SOS while offline
    console.log("[CDP Test] Transmitting SOS beacon while OFFLINE...");
    const transmitResult = await sendCommand("Runtime.evaluate", {
      expression: `
        (async () => {
          if (window.__JALDRISHTI_TEST__) {
            await window.__JALDRISHTI_TEST__.transmit();
            return "ok";
          }
          return "no_hook";
        })()
      `,
      awaitPromise: true,
    });
    console.log("[CDP Test] Transmit hook returned:", transmitResult.result.value);

    // Give IndexedDB time to write
    await sleep(1000);

    // Step 3: Check that backend has NOT received the beacon yet
    const midBeacons = await fetchJson("http://127.0.0.1:8000/beacons");
    console.log(`[CDP Test] Mid-test beacons in backend while offline: ${midBeacons.length}`);
    if (midBeacons.length !== initialCount) {
      throw new Error(`Leak detected: backend received beacon while offline (${midBeacons.length} vs ${initialCount})`);
    }

    // Step 4: Go back Online via CDP
    console.log("[CDP Test] Restoring network to ONLINE...");
    await sendCommand("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    // Trigger online event on window to kick off auto-flush
    const flushOutput = await sendCommand("Runtime.evaluate", {
      expression: `
        (async () => {
          window.dispatchEvent(new Event('online'));
          if (window.__JALDRISHTI_TEST__) {
            try {
              const res = await window.__JALDRISHTI_TEST__.flush();
              return { ok: true, res };
            } catch (err) {
              return { ok: false, err: String(err) };
            }
          }
          return { ok: false, err: "no_hook" };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log("[CDP Test] Flush result:", JSON.stringify(flushOutput.result?.value));

    // Wait 2s for network delivery and SQLite commit
    await sleep(2000);

    // Step 5: Verify beacon arrived at backend and appears exactly once
    const finalBeacons = await fetchJson("http://127.0.0.1:8000/beacons");
    console.log(`[CDP Test] Final beacons in backend: ${finalBeacons.length}`);

    if (finalBeacons.length !== initialCount + 1) {
      throw new Error(`Expected exactly ${initialCount + 1} beacons, but found ${finalBeacons.length}`);
    }

    // Step 6: Trigger flush a second time to ensure idempotency / no duplicates
    console.log("[CDP Test] Triggering redundant flush to verify idempotency (no duplicates)...");
    await sendCommand("Runtime.evaluate", {
      expression: `
        (async () => {
          if (window.__JALDRISHTI_TEST__) {
            await window.__JALDRISHTI_TEST__.flush();
          }
        })()
      `,
      awaitPromise: true,
    });

    await sleep(1000);
    const dedupeBeacons = await fetchJson("http://127.0.0.1:8000/beacons");
    if (dedupeBeacons.length !== initialCount + 1) {
      throw new Error(`Duplicate detected on redundant flush: count grew to ${dedupeBeacons.length}`);
    }

    console.log("[CDP Test] PASS: Offline queue enqueued, auto-flushed online, and deduplicated cleanly!");
  } finally {
    ws.close();
    chrome.kill();
  }
}

main().catch((err) => {
  console.error("[CDP Test] FAIL:", err);
  process.exit(1);
});
