# Phase 8 Report: Rescue Beacon PWA & Responder Console

**Platform:** JalDrishti — Space-Enabled Flood Intelligence  
**Phase:** 8 (Rescue Beacon PWA, Offline Queue, Responder Console)  
**Date:** November 2026  
**Status:** Complete & Verified  

---

## 1. Executive Summary

Phase 8 implements the citizen-facing **Rescue Beacon Progressive Web App (PWA)** at `/beacon` and the operational **Responder Console** within the Command Center (`/command-center` Beacons tab). 

The module provides an end-to-end distress communication pipeline designed for extreme low-bandwidth and zero-connectivity post-disaster environments. It features a compact 16-byte packed binary payload with CRC-16/CCITT checksum integrity, offline queueing via IndexedDB and Service Worker caching, 1-tap GSM SMS fallback to a configured placeholder dummy number (`+91 00000 00000`), real-time Server-Sent Events (SSE) streaming, and strict state-machine triage.

---

## 2. REAL / DERIVED / SIMULATED Data Audit

In compliance with `AGENTS.md`, every component, layer, and metric is classified:

| Layer / Feature | Classification | Description & Provenance |
| :--- | :--- | :--- |
| **Safe Shelters & Relief Camps** | **REAL** | Coordinates of relief centers, schools, and hospitals queried from OpenStreetMap (`amenity=hospital`, `amenity=school`, `amenity=community_centre`) in Cachar District. |
| **Settlement Centroids** | **REAL** | 20 village points from OpenStreetMap (`place=village`, `place=hamlet`). |
| **Zone Population Totals** | **REAL** | Population counts derived from WorldPop 2020 (`WorldPop/GP/100m/pop`), clipped and re-projected to UTM Zone 46N (`EPSG:32646`). |
| **Hardware Telemetry** | **REAL** | GPS coordinates acquired via HTML5 Geolocation API (`navigator.geolocation`) and device battery status via Battery Status API (`navigator.getBattery()`). |
| **SMS Fallback Format** | **SIMULATED** | GSM-7 compliant URI (`sms:+910000000000?body=...`) directed to a configurable demo dummy placeholder number (`NEXT_PUBLIC_DEMO_SMS_NUMBER`). No government or 1077 helpline integration. |
| **Local Offline Cache** | **REAL** | Service Worker (`public/sw.js`) and IndexedDB transactional store caching the PWA app shell and queueing packets when offline. |
| **16-Byte Binary Payload** | **DERIVED** | Packed 16-byte struct: lat/lon micro-degrees (int32), epoch timestamp (uint32), need flags & group size (uint8), reserved (uint8), CRC-16/CCITT checksum (uint16). Bit-for-bit parity verified across TypeScript and Python. |
| **Spatial Matching & Prioritization** | **DERIVED** | Reverse-geocoding of beacon coordinates against the 20 Cachar flood zones (`villages.geojson`) and Dijkstra routing graph (`routes.json`). Beacons in cut-off zones receive elevated triage weight. |
| **Triage Ordering Engine** | **DERIVED** | Deterministic multi-factor sort: Status rank (`new` $\rightarrow$ `assigned` $\rightarrow$ `en_route` $\rightarrow$ `rescued`) $\rightarrow$ Cut-off isolation status $\rightarrow$ Need category severity (`medical` > `boat` > `food` > `multiple`) $\rightarrow$ Group size descending. |
| **State Machine Transitions** | **DERIVED** | Validated transitions (`new` $\rightarrow$ `assigned` $\rightarrow$ `en_route` $\rightarrow$ `rescued`) with HTTP 409 Conflict rejection for illegal or backward steps, with undo capability. |
| **Distress Beacons Feed** | **SIMULATED** | Pre-seeded and injected synthetic distress signals (`SIMULATED` badge) representing flood-stranded citizens in Cachar. |
| **Satellite Short-Message Uplink** | **SIMULATED** | Emulated satellite messaging uplink channel (e.g. NavIC / GSAT disaster messaging channel) operating via software WebSocket/SSE transport. No physical satellite transceiver hardware is attached. |
| **Rescue Teams & Dispatch Logs** | **SIMULATED** | Field units (`NDRF Team 1-Silchar`, `SDRF Boat Unit A`, `Civil Defence Team C`) and assignment state records. |

---

## 3. Architecture & Verification Summary

### 3.1 16-Byte Binary Payload Specification

The payload encodes all essential distress information in exactly 16 bytes:

```
+---------------+---------------+---------------+---------------+
| Bytes 0-3     | Latitude (int32, micro-degrees, scaled 1e6)   |
+---------------+---------------+---------------+---------------+
| Bytes 4-7     | Longitude (int32, micro-degrees, scaled 1e6)  |
+---------------+---------------+---------------+---------------+
| Bytes 8-11    | Timestamp (uint32, Unix epoch seconds)        |
+---------------+---------------+---------------+---------------+
| Byte 12       | Flags: bits 0-2 = need_type, bits 3-7 = size  |
+---------------+---------------+---------------+---------------+
| Byte 13       | Reserved / Sub-need flags (0x00)              |
+---------------+---------------+---------------+---------------+
| Bytes 14-15   | CRC-16/CCITT Checksum (poly 0x1021, init 0xFFFF)|
+---------------+---------------+---------------+---------------+
```

- **Cross-language Parity:** Complete test coverage in `tests/test_beacon_payload.py` (7 tests) verifying byte-for-byte parity between Python (`apps/api/beacon_payload.py`) and TypeScript (`apps/web/lib/beaconPayload.ts`).
- **Encodings:** Supported as Base64Url (`B64:...`) and Hex (`HEX:...`) strings for SMS text transport.

### 3.2 Offline Queue & Reconnection Resilience

- **IndexedDB Queue (`apps/web/lib/offlineQueue.ts`):** Packets triggered while offline are automatically persisted in an IndexedDB queue with deduplication by CRC-16 checksum.
- **Auto-Flush:** On network recovery (`window.addEventListener("online")`), the queue flushes pending packets sequentially to `/api/beacons`.
- **Unit Testing:** `tests/test_offline_queue.py` (3 tests) validates deduplication, fifo flush semantics, and packet byte integrity.

### 3.3 Backend API & SQLite Persistence

- **FastAPI Router (`apps/api/routers/beacons.py`):**
  - `POST /beacons`: Ingests binary packets or JSON, computes spatial zone match and route hint, commits to SQLite, and broadcasts via SSE. Idempotent on identical `payload_code`.
  - `GET /beacons`: Retrieves all active beacons sorted by triage priority with optional filtering by status, need type, and cut-off zone.
  - `GET /beacons/stream`: SSE feed streaming new beacons and state updates in real time (`Content-Type: text/event-stream`).
  - `PATCH /beacons/{id}`: Enforces state machine rules and returns HTTP 409 on invalid transitions.
- **Unit Testing:** `tests/test_beacon_api.py` (4 tests) validates initial seeding, idempotency, 409 rejections, and priority ordering.

### 3.4 Command Center Integration & Map Layer

- **Responder Console Tab (`BeaconsTab.tsx`):** Provides live KPI counters, triage-ordered distress queue, need and status filter pills, team assignment dropdowns, transition buttons, undo toast, and an accessible screen-reader table view.
- **MapLibre Layer (`FloodMap.tsx`):** Renders interactive clustered and pulsing unclustered rescue beacon markers on the map canvas, color-coded by urgency (`new`: pulsing red, `assigned`: amber, `en_route`: cyan, `rescued`: emerald).

---

## 4. Test Suite & Code Quality Results

- **Python Tests:** 70 passed in 6.02 seconds (`make test`).
- **Next.js Production Build:** Compiled successfully with all routes statically prerendered (`/`, `/about`, `/model`, `/design`, `/command-center`, `/beacon`, `/beacon/privacy`).
- **Linter & Typecheck:** 0 errors, 0 warnings across `apps/web` and `apps/api` (`make lint`).
- **Lighthouse Performance Audits:**
  - Landing Page: Desktop 100/96/100/100, Mobile 100/96/100/100
  - Command Center: Desktop 100/96/96/100, Mobile 100/96/96/100
- **Headless Chrome Browser Tour:** 5 automated UI tests passed (`test_browser_tour.py`).

---

## 5. Known Gaps & Operational Limitations

1. **Physical Satellite Uplink:** Direct smartphone-to-satellite uplink without cellular base stations requires specialized satellite smartphone hardware (e.g., Bullitt Satellite, Snapdragon Satellite, or NavIC handheld dongles). The PWA provides GSM-7 SMS to a configurable placeholder number (`+91 00000 00000`) as a simulated fallback; it is not connected to government helplines.
2. **Battery Status API Support:** Supported across Chromium-based mobile browsers (Chrome, Edge), but restricted on iOS Safari for privacy/fingerprinting reasons (gracefully defaults to `100.0%`).
3. **Offline Basemap Tiles:** While the PWA app shell, logic, and cached distress state work 100% offline, MapLibre vector map basemaps require network access unless pre-cached as local offline PMTiles.
