// JalDrishti Rescue Beacon Service Worker
const CACHE_NAME = "jaldrishti-beacon-v1";
const OFFLINE_URLS = [
  "/beacon",
  "/beacon/privacy",
  "/manifest.json",
  "/assets/beacon-icon-192.svg",
  "/assets/beacon-icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn("[SW] Cache preload error:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Navigation requests for /beacon fall back to cache when offline
  if (event.request.mode === "navigate" && event.request.url.includes("/beacon")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((response) => {
          return response || caches.match("/beacon");
        });
      })
    );
    return;
  }

  // Network-first for other requests, falling back to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
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
