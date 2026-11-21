/**
 * IndexedDB Offline Queue for JalDrishti Rescue Beacons.
 * Stores distress packets offline and syncs them automatically when connectivity resumes.
 */

export interface QueuedBeacon {
  payloadCode: string;
  rawHex: string;
  lat: number;
  lon: number;
  timestamp: number;
  needType: string;
  groupSize: number;
  battery: number | null;
  channel: "online" | "sms" | "nav_sim";
  note: string;
  queuedAt: string;
  retryCount: number;
}

const DB_NAME = "jaldrishti_beacons_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_queue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "payloadCode" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueBeacon(beacon: QueuedBeacon): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(beacon);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[OfflineQueue] Failed to enqueue to IndexedDB:", err);
    // Fallback to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem("jaldrishti_offline_beacons") || "[]");
      const filtered = existing.filter((b: QueuedBeacon) => b.payloadCode !== beacon.payloadCode);
      filtered.push(beacon);
      localStorage.setItem("jaldrishti_offline_beacons", JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }
}

export async function getQueuedBeacons(): Promise<QueuedBeacon[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      return JSON.parse(localStorage.getItem("jaldrishti_offline_beacons") || "[]");
    } catch {
      return [];
    }
  }
}

export async function removeQueuedBeacon(payloadCode: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(payloadCode);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }

  try {
    const existing = JSON.parse(localStorage.getItem("jaldrishti_offline_beacons") || "[]");
    const filtered = existing.filter((b: QueuedBeacon) => b.payloadCode !== payloadCode);
    localStorage.setItem("jaldrishti_offline_beacons", JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export async function clearQueuedBeacons(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem("jaldrishti_offline_beacons");
  } catch {
    // ignore
  }
}

export async function flushOfflineQueue(
  sendFn: (beacon: QueuedBeacon) => Promise<boolean>
): Promise<number> {
  const queued = await getQueuedBeacons();
  if (queued.length === 0) return 0;

  let sentCount = 0;
  for (const b of queued) {
    try {
      const success = await sendFn(b);
      if (success) {
        await removeQueuedBeacon(b.payloadCode);
        sentCount++;
      }
    } catch (err) {
      console.warn("[OfflineQueue] Failed to flush beacon:", b.payloadCode, err);
    }
  }
  return sentCount;
}
