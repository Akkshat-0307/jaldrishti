# JalDrishti Production Deployment Guide

**Target Audience:** Operators deploying JalDrishti to public cloud platforms (Vercel & Render or Fly.io).  
**Architecture:** Next.js frontend deployed to Vercel; FastAPI containerized backend deployed to Render or Fly.io.  
**Operational Mode:** `DEMO_MODE=1` enabled by default (zero external network dependency, pre-computed spatial artifacts, SQLite on ephemeral disk).

---

## 1. Prerequisites

1. **GitHub Account:** To host the repository and trigger CI/CD workflows.
2. **Vercel Account:** Free Hobby or Pro tier for hosting the frontend (`apps/web`).
3. **Render or Fly.io Account:** Free or standard tier for hosting the containerized API (`apps/api`).
4. **Git CLI & Python 3.10+:** Installed on your local machine.

---

## 2. Step 1: GitHub Repository Setup & Push

1. Open [GitHub](https://github.com/new) and click **New Repository**.
   - **Repository Name:** `jaldrishti` (or your preferred name).
   - **Visibility:** Public (required for free Vercel / Render builds).
   - **Initialize repository with:** Do *not* check README, `.gitignore`, or license (they already exist locally).
   - Click **Create repository**.
2. Link your local repository and push:
   ```bash
   git remote add origin git@github.com:<your-username>/jaldrishti.git
   git branch -M main
   git push -u origin main
   ```
3. Confirm GitHub Actions CI:
   - Navigate to the **Actions** tab on your GitHub repository.
   - Confirm that the `CI (Lint, Test, Build)` workflow is running and turns **green** (all 70 unit tests, linter, and static build pass).

---

## 3. Step 2: Deploy FastAPI Backend (Render or Fly.io)

### Option A: Render (Recommended for Free Tier)

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select **Build and deploy from a Git repository** $\rightarrow$ Connect your `jaldrishti` repo.
4. Configure the Web Service:
   - **Name:** `jaldrishti-api`
   - **Region:** `Oregon (US West)` or `Frankfurt (EU)` or closest available.
   - **Branch:** `main`
   - **Root Directory:** Leave blank (root).
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `./apps/api/Dockerfile`
   - **Docker Build Context:** `.` (root context).
   - **Instance Type:** `Free` ($0/month).
5. Add Environment Variables:
   - `DEMO_MODE` = `1`
   - `DATA_DIR` = `/app/data`
   - `PORT` = `8000`
6. Click **Create Web Service**.
7. Wait 2–3 minutes for the Docker container to build and start.
8. Copy your live API URL (e.g., `https://jaldrishti-api.onrender.com`).
9. Verify health check in your browser:
   `https://jaldrishti-api.onrender.com/health` $\rightarrow$ should return `{"status":"ok","demo_mode":true,...}`.

> [!NOTE]
> **Ephemeral Disk & Sleep:** Render free tier services automatically sleep after 15 minutes of inactivity. When a request arrives, the service wakes up in ~30–50 seconds. The JalDrishti web frontend features an automatic warm-up ping that displays a friendly *"Waking Server..."* indicator. All map layers, routes, and what-if scenarios are 100% functional from static fallbacks even while the server wakes. Beacons created during a session are stored in local SQLite and reset on container redeploy.

---

### Option B: Fly.io (Fast Worldwide Edge)

1. Install `flyctl` CLI and authenticate:
   ```bash
   fly auth login
   ```
2. Launch the app using the pre-configured [fly.toml](file:///Users/akkshatgoel/Documents/jaldrishti/fly.toml):
   ```bash
   fly launch --config fly.toml --no-deploy
   ```
3. Deploy the container:
   ```bash
   fly deploy
   ```
4. Copy your live API URL (e.g., `https://jaldrishti-api.fly.dev`).

---

## 4. Step 3: Deploy Next.js Frontend (Vercel)

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository (`jaldrishti`).
4. Configure the Project:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click **Edit** and select `apps/web`.
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** `.next` (default).
5. Add Environment Variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your live API URL from Step 2 (e.g. `https://jaldrishti-api.onrender.com`).
   - `DEMO_MODE`: `1`
   - `NEXT_PUBLIC_DEMO_SMS_NUMBER`: `+91 00000 00000`
6. Click **Deploy**.
7. Wait ~1 minute for the build to finish. Vercel will assign a production domain (e.g., `https://jaldrishti.vercel.app`).

---

## 5. Step 4: Verification via Automated Smoke Test

Once both the Web app and API are live, run the automated smoke test script from your local terminal:

```bash
python scripts/smoke_test.py \
  --web-url https://jaldrishti.vercel.app \
  --api-url https://jaldrishti-api.onrender.com
```

### Expected Smoke Test Output:

```text
================================================================================
🌊 JalDrishti Smoke Test Suite
Web Frontend: https://jaldrishti.vercel.app
API Backend:  https://jaldrishti-api.onrender.com
================================================================================
[PASS]  Landing Page (/)                               -> HTTP 200 ( 120.3 ms) : OK
[PASS]  Command Center (/command-center)               -> HTTP 200 (  45.0 ms) : OK
[PASS]  About Page (/about)                            -> HTTP 200 (  38.1 ms) : OK
[PASS]  Model Card (/model)                            -> HTTP 200 (  41.0 ms) : OK
[PASS]  Rescue Beacon PWA (/beacon)                    -> HTTP 200 (  35.8 ms) : OK
[PASS]  Beacon Privacy (/beacon/privacy)               -> HTTP 200 (  33.6 ms) : OK
[PASS]  Web App Manifest                               -> HTTP 200 (  28.7 ms) : OK
[PASS]  API Health Check (GET /health)                 -> HTTP 200 (  85.4 ms) : OK
[PASS]  Event Detail (GET /events/assam-2022)          -> HTTP 200 (  90.2 ms) : OK
[PASS]  Routing Zone 20 (GET /events/.../route?from=zone_20) -> HTTP 200 (  95.1 ms) : OK
[PASS]  Alerts Preview (POST /alerts/preview)          -> HTTP 200 ( 110.5 ms) : OK
[PASS]  What-If Scenario (GET /events/.../whatif)      -> HTTP 200 (  88.3 ms) : OK
[PASS]  Beacon List (GET /beacons)                     -> HTTP 200 (  92.1 ms) : OK
[PASS]  Beacon Ingest (POST /beacons)                  -> HTTP 201 ( 115.4 ms) : OK
================================================================================
Overall Result: 14/14 Passed (100% SUCCESS)
================================================================================
```

---

## 6. Post-Deployment Verification Checklist

- [ ] **Landing Page Scroll Story:** Open `https://jaldrishti.vercel.app`. Verify that 3D Earth renders and scenes 0–9 scroll smoothly.
- [ ] **Command Center Live Feed:** Open `/command-center`. Check that the top bar displays *"API Live"* (or *"Waking Server..."* if Render was asleep).
- [ ] **What-If Slider:** Adjust the stage slider from $-1.0\text{m}$ to $+2.0\text{m}$. Verify that cut-off counts update monotonically.
- [ ] **Mobile Beacon SOS:** Open `/beacon` on a smartphone. Hold the red SOS button for 1.5 seconds. Confirm that the beacon appears on the Command Center console in real time via Server-Sent Events.
