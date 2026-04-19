FROM node:20-alpine

WORKDIR /app

# Curl for the healthcheck
RUN apk add --no-cache curl

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Generate floor GeoJSON at build time so they're baked into the image
RUN node scripts/generate_floors.js || true

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=20s \
  CMD curl -fsS http://localhost:4000/healthz || exit 1

CMD ["node", "src/index.js"]
