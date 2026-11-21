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
