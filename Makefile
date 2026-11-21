.PHONY: dev-web dev-api install build test lint demo clean

# ── Development ──────────────────────────────────────────────

dev-web:
	cd apps/web && npm run dev

dev-api:
	cd apps/api && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# ── Demo (offline-safe) ──────────────────────────────────────

demo:
	@echo "▶ Starting JalDrishti in DEMO_MODE (zero network required)"
	@echo "  API  → http://127.0.0.1:8000"
	@echo "  Web  → http://localhost:3000"
	@trap 'kill 0' INT; \
	 cd apps/api && DEMO_MODE=1 .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 & \
	 cd apps/web && npm run start -- -p 3000 & \
	 wait

# ── Setup ────────────────────────────────────────────────────

install:
	cd apps/web && npm install
	cd apps/api && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

# ── Build ────────────────────────────────────────────────────

build:
	cd apps/web && npm run build

# ── Quality ──────────────────────────────────────────────────

test:
	python3 -m pytest tests/ -v
	cd apps/web && npm run build

lint:
	cd apps/web && npx eslint . && npx tsc --noEmit
	cd apps/api && . .venv/bin/activate && python3 -m py_compile main.py

# ── Cleanup ──────────────────────────────────────────────────

clean:
	rm -rf apps/web/.next apps/web/out apps/web/node_modules/.cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
