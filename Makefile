.PHONY: dev-web dev-api install build test lint clean

# ── Development ──────────────────────────────────────────────

dev-web:
	cd apps/web && npm run dev

dev-api:
	cd apps/api && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# ── Setup ────────────────────────────────────────────────────

install:
	cd apps/web && npm install
	cd apps/api && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

# ── Build ────────────────────────────────────────────────────

build:
	cd apps/web && npm run build

# ── Quality ──────────────────────────────────────────────────

test:
	apps/api/.venv/bin/pytest tests/ -v
	cd apps/web && npm run build

lint:
	cd apps/web && npx eslint . && npx tsc --noEmit
	cd apps/api && . .venv/bin/activate && python3 -m py_compile main.py

# ── Cleanup ──────────────────────────────────────────────────

clean:
	rm -rf apps/web/.next apps/web/out apps/web/node_modules/.cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
