FROM python:3.11-slim

WORKDIR /app

# Install deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Copy backend source
COPY . .

# Ensure models dir exists (models come via volume mount)
RUN mkdir -p /app/models

EXPOSE 5000

CMD ["python", "main.py"]
