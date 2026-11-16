# Keep the Python patch version aligned with .python-version (used by CI).
FROM python:3.12.16-slim-bookworm@sha256:935c3c5b12357a7e10caa9c1e6ca5692344d97cf229832ef584be2cec9fc03df

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
# Use the same hashed lock and wheel-only installation as backend CI.
# Torch/TorchVision are pinned CPU builds; there is no floating install step.
RUN python -m pip install --require-hashes --only-binary=:all: -r requirements.txt \
    && python -m pip check

COPY . /app

RUN python scripts/check_recognition.py

RUN mkdir -p /app/staticfiles /app/media
