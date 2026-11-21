# Demo Checklist — JalDrishti

> Use this before every live demo or judge presentation.

## Pre-flight (15 min before)

- [ ] `cd /path/to/jaldrishti && make build` — confirm build succeeds
- [ ] `make demo` — both servers start (API :8000, web :3000)
- [ ] Open <http://localhost:3000> — globe loads, scroll story runs
- [ ] Open <http://localhost:3000/command-center> — map tiles load, impact numbers visible
- [ ] Open <http://localhost:3000/beacon> — demo SMS notice visible ("Demo Notice: SMS goes to placeholder demo number")
- [ ] In Command Center → Routing tab → select zone_20 → route appears on map
- [ ] In Command Center → What-if tab → move slider → flooded area updates
- [ ] In Command Center → Alerts tab → Preview → alert text in EN/HI/AS/BN visible
- [ ] `python3 scripts/smoke_test.py` → 15/15 PASS

## Backup Video Recording Instructions

1. Open QuickTime Player (macOS) → **File** → **New Screen Recording**.
2. Select display window (1440x900 or 1280x720 recommended).
3. Set Audio to "Built-in Microphone" or system audio.
4. Rehearse the 5-Minute Demo Script below once before recording.
5. Record one continuous 5-minute take following the script timings.
6. Export as `jaldrishti_backup_demo_1080p.mp4` and store on a local USB drive or cloud drive for offline contingency.

## 5-Minute Demo Script

| Time | Action | Expected |
|------|--------|----------|
| 0:00 | Open landing page, let scroll story run to end | Globe → satellite → Silchar |
| 0:45 | Click "Open Command Center" | Map with flood mask and zone polygons |
| 1:00 | Impact tab → read numbers aloud | Population exposed, cut-off zones, cropland |
| 1:30 | Routing tab → select Zone 20 → show route | Route line + ETA badge |
| 2:00 | What-if tab → drag slider to +0.5 m | More area flooded, counters update |
| 2:30 | Alerts tab → Preview → switch language | Alert text changes language |
| 3:00 | Open Beacon page → show SOS button | Demo notice visible; click SOS |
| 3:30 | Back to Command Center → Beacons tab | New beacon appears in list |
| 4:00 | Model page → show metrics table | Test-split IoU, Bolivia IoU |
| 4:30 | Q & A | Use `docs/QA_BANK.md` for answers |

## Failure Fallbacks

| Failure | Action |
|---------|--------|
| API server asleep / cold start | TopBar shows "Waking Server…" then "API Live". Wait 15 s. |
| API stays down | Command Center falls back to static JSON (all data visible, write ops queued) |
| Wi-Fi lost mid-demo | DEMO_MODE=1 serves everything locally; no external calls needed |
| Globe does not load | Pre-load fallback: open `/command-center` (2-D map only) |
| Beacon SOS fails | Offline queue holds the beacon; flush fires when API recovers |
| Flood mask tile missing | Check `data/events/assam-2022/` — tif files are not git-tracked; re-run Phase 1 pipeline or restore from local backup |

## Study-window caveats to state upfront

- Results cover a **~100 km × 80 km Cachar study window** only; district-level figures are not extrapolated.
- Population figures are **WorldPop 2020 modelled estimates**, not census.
- Roads, hospital and school counts are from OSM and may be incomplete.
- 5 of 8 cut-off zones touch the window edge; **only 3 are robustly cut off**.
- All routing ETAs are **estimates** based on OSM highway class speed limits.
