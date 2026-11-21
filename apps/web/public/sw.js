// JalDrishti Rescue Beacon Service Worker
// Versioned Cache Architecture
const CACHE_VERSION = "jaldrishti-v2";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;

const OFFLINE_URLS = [
  "/beacon",
  "/beacon/privacy",
  "/manifest.json",
  "/assets/beacon-icon-192.svg",
  "/assets/beacon-icon-512.svg"
];

// Precache essential application shell on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn("[SW] Cache preload warning:", err);
      });
    })
  );
  // Do NOT skipWaiting automatically; let UI prompt the user to reload
});

// User or UI trigger to activate waiting worker
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Delete old cache stores on activation
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== SHELL_CACHE) {
            console.log("[SW] Deleting stale cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intelligent fetch handling:
// - Non-GET requests (POST, PATCH) bypass cache completely
// - API routes (/api/*, /beacons/*, /stream) bypass cache completely
// - Navigation requests use network-first with offline fallback
// - Shell assets use cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never intercept or cache non-GET requests (e.g. POST /api/beacons)
  if (req.method !== "GET") {
    return;
  }

  // 2. Never serve API endpoints or SSE streams from stale cache
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/stream") ||
    url.pathname.includes("/beacons") ||
    url.pathname.includes("/events")
  ) {
    return;
  }

  // 3. Navigation requests for /beacon: Network-first, offline fallback
  if (req.mode === "navigate" && url.pathname.startsWith("/beacon")) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // If valid response, clone into cache
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            return cached || caches.match("/beacon");
          });
        })
    );
    return;
  }

  // 4. Static assets in cache
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Return cached asset, revalidate in background
        fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              caches.open(SHELL_CACHE).then((c) => c.put(req, networkRes));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(req);
    })
  );
});

// Background sync support
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-beacons") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "REPLAY_OFFLINE_BEACONS" });
        });
      })
    );
  }
});
