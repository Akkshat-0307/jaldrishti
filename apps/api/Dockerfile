FROM python:3.12-slim AS base

WORKDIR /app

# Install dependencies
COPY apps/api/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and static event data
COPY apps/api /app
COPY data /app/data

# Non-root user and permissions for ephemeral SQLite storage
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser

ENV DATA_DIR=/app/data
ENV DEMO_MODE=1
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
