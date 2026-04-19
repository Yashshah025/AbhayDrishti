FROM python:3.11-slim

WORKDIR /app

# System libs needed by some scientific wheels
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
        libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first for layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=300 -r requirements.txt

# Copy ml-service source
COPY . .

# Models dir (existing pkl mount + new lstm_pressure.pt)
RUN mkdir -p /app/models

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -fsS http://localhost:5000/healthz || exit 1

CMD ["python", "main.py"]
