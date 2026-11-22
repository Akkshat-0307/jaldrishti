FROM python:3.12-slim AS base

WORKDIR /app

# Install dependencies
COPY apps/api/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and static event data
COPY apps/api /app

# Copy pipeline package modules required by the API at runtime
COPY pipeline/__init__.py /app/pipeline/__init__.py
COPY pipeline/alerts.py /app/pipeline/alerts.py
COPY pipeline/river_outlook.py /app/pipeline/river_outlook.py
COPY pipeline/routing.py /app/pipeline/routing.py

# Copy runtime event data (committed JSON and GeoJSON only; rasters excluded by .dockerignore)
COPY data/events /app/data/events

# Non-root user and permissions for ephemeral SQLite storage
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser

ENV DATA_DIR=/app/data
ENV PYTHONPATH=/app
ENV DEMO_MODE=1
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
