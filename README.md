# JalDrishti 🌊

**Flood-intelligence platform — from satellite pixel to last-mile rescue.**

Built for ASTRA 2026 (Theme: Space). JalDrishti uses SAR satellite imagery to detect floods through monsoon clouds, predict risk, identify cut-off villages, route rescue teams, and deliver multilingual alerts.

---

## Quick Start

```bash
# Install dependencies
make install

# Run the web app (Next.js, port 3000)
make dev-web

# Run the API (FastAPI, port 8000)
make dev-api
```

## Phone Testing & Rescue Beacon PWA (`/beacon`)

The **Rescue Beacon PWA** is designed for citizens stranded without cellular data. It encodes distress signals into a 16-byte packed binary payload with CRC-16/CCITT checksum, caches the app shell via Service Worker, queues packets in IndexedDB when offline, and falls back to GSM SMS (to a configurable demo placeholder number `+91 00000 00000`). *Note: In this demo environment, SMS directs to a dummy recipient for testing; it does not integrate with any live emergency dispatch or government 1077 helpline.*

### 1. Running Over HTTPS on Mobile

Service Workers and the Geolocation API require a secure origin (`https://` or `localhost`). To test on a physical smartphone:

```bash
# Option A: Cloudflare Tunnel (Free, zero config)
cloudflared tunnel --url http://localhost:3000

# Option B: ngrok
ngrok http 3000

# Option C: Local LAN with Chrome port forwarding / local SSL
# On Android: Connect via USB, open chrome://inspect -> Port Forwarding -> 3000 to localhost:3000
```

### 2. Installing the PWA

- **iOS (Safari):**
  1. Navigate to `https://<your-tunnel-url>/beacon`.
  2. Tap the **Share** button (box with upward arrow).
  3. Scroll down and tap **Add to Home Screen**.
  4. Launch **JalDrishti SOS** directly from the home screen in standalone mode.

- **Android (Chrome):**
  1. Navigate to `https://<your-tunnel-url>/beacon`.
  2. Tap the **Install** prompt banner or open the three-dot menu $\rightarrow$ **Install app** (or **Add to Home screen**).
  3. Launch the app icon from your launcher.

### 3. Offline SOS Simulation Workflow

1. **Pre-cache:** Open `/beacon` on your mobile device while connected. The service worker installs and precaches all shell assets.
2. **Disconnect:** Turn on **Airplane Mode** (disable Wi-Fi and mobile data).
3. **Trigger SOS:** Select your need (Medical, Boat Rescue, Food/Water) and group size, then **press and hold the red SOS button for 1.5 seconds** (haptic vibration activates).
4. **Offline Queue:** The client encodes your coordinates and distress state into a 16-byte binary payload, signs it with CRC-16, and enqueues it in IndexedDB.
5. **SMS Fallback:** If offline, a 1-tap **Send Demo SMS** button opens your device's native SMS composer with the compact hex code pre-filled to the demo number (+91 00000 00000).
6. **Auto-Reconnection:** Turn off Airplane Mode. The client detects the network `online` event and flushes the IndexedDB queue to the backend. The responder console at `/command-center` updates in real time via Server-Sent Events (SSE).

## Docker

```bash
docker compose up --build
```

Both services start in `DEMO_MODE=1` by default — zero network dependencies.

## Project Structure

```
apps/web/       Next.js frontend (landing, command center, beacon PWA)
apps/api/       FastAPI backend
pipeline/       GEE export, preprocessing, ML models
notebooks/      Training & evaluation notebooks
data/events/    Static artefacts per event
tests/          pytest & Playwright
docs/           Blueprint, model card, architecture
```

## Documentation

- [Build Blueprint](docs/BLUEPRINT.md) — full architecture, phases, and acceptance criteria.

## License

TBD
