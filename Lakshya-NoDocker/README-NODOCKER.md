# CrowdShield C2 — No-Docker Setup

This is the same project as the Docker version, but each service runs as a
separate local process. Use this if you can't or don't want to install Docker.

## Prerequisites

Install these once on your machine:

| Tool | Version | Why | Download |
|---|---|---|---|
| **Python** | 3.11+ | ml-service | https://www.python.org/downloads/ |
| **Node.js** | 20+ | core-api & frontend | https://nodejs.org/ |
| **MongoDB** | 7+ | persistence | see options below |

> During Python install, **check "Add Python to PATH"**.
> During Node install, accept all defaults.

### MongoDB — pick one option

**Option A — Native install (recommended):**
Download MongoDB Community Edition: https://www.mongodb.com/try/download/community
- Choose Windows MSI installer
- Accept all defaults
- The installer will run Mongo as a Windows service on port 27017 automatically.

**Option B — Docker (if you have Docker but want to skip the full stack):**
Run `start-mongo-docker.bat` once. This launches only Mongo in a container.

**Option C — MongoDB Atlas (free cloud tier):**
Sign up at https://www.mongodb.com/cloud/atlas, create a free cluster, copy the
connection string, then create `core-api/.env` with:
```
MONGO_URL=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/crowdshield
```

---

## First-time setup (run once)

Double-click **`install.bat`** in this folder. It installs:
- Python deps for ml-service (FastAPI, XGBoost, pandas, etc.)
- npm deps for core-api (Express, Socket.io, Mongoose)
- npm deps for frontend (React, Leaflet, Plotly)

Takes ~3–5 minutes depending on internet speed.

---

## Run the project

1. Make sure MongoDB is running (Option A: it auto-runs as a Windows service).
2. Double-click **`start-all.bat`** — this opens 3 terminal windows:
   - `ml-service` on http://localhost:5000
   - `core-api`   on http://localhost:4000
   - `frontend`   on http://localhost:5173

3. Wait ~15 seconds for all services to fully start, then open
   **http://localhost:5173** in your browser.

> The frontend dev server picks port **5173** by default (Vite), not 3000.

To stop everything: close the 3 terminal windows (or Ctrl+C in each).

---

## Manual run (alternative to start-all.bat)

If you prefer running services in your own terminals:

```bash
# Terminal 1 — ml-service
cd ml-service
python main.py

# Terminal 2 — core-api
cd core-api
node src/index.js

# Terminal 3 — frontend
cd frontend
npm run dev
```

---

## Verify it's working

```bash
# ml-service
curl http://localhost:5000/healthz

# core-api
curl http://localhost:4000/healthz

# state overview (should show 4 sites)
curl http://localhost:4000/status/state-overview
```

---

## Troubleshooting

### "MongoServerSelectionError" when starting core-api
MongoDB isn't running. Check Windows Services (`services.msc`), find
"MongoDB Server", and start it. Or run `start-mongo-docker.bat`.

### "Module not found" errors
You forgot to run `install.bat`. Run it from this folder.

### Frontend stuck on "Awaiting sensor history…"
1. Confirm core-api terminal shows `[ticks] starting scheduler`.
2. Confirm ml-service terminal shows `Uvicorn running on http://0.0.0.0:5000`.
3. In a 4th terminal:
   ```bash
   curl "http://localhost:4000/sensor/history?site=SOM&minutes=120"
   ```
   - If empty `[]` → simulator hasn't ticked yet (wait 60s) or Mongo write failed.
   - If real data → frontend issue (check browser DevTools Console).

### Port already in use
Edit `core-api/.env` (copy from `.env.example`) to change `PORT`. For ml-service
edit `ml-service/main.py` last line. For frontend, Vite picks the next free port
automatically.

### Python install fails on torch
There's no torch in this version — only fastapi, pandas, xgboost, scikit-learn.
If you see torch errors, you have an old `requirements.txt` from somewhere else.

---

## Same features as the Docker version

Everything works identically:

- Macro Gujarat Leaflet map with 4 pulsing site markers (Somnath, Ambaji, Dwarka, Pavagadh)
- Click marker → site dashboard with metrics, risk gauge, pressure chart, tactical floor map
- Inject burst → alert appears → Tier 1 → 2 (after 5 min) → 3 (after 10 min)
- Tier 3 → full-screen Red Alert overlay
- Plotly linked-brushing analytics at `/analytics/SOM`
- Audit trail in MongoDB (`db.alertlogs.find()`)

For a quick demo, edit `core-api/.env`:
```
TICK_SECONDS=2
```
Now ticks fire every 2 seconds, so Tier 2 escalation hits in ~10 sec
and Tier 3 in ~20 sec instead of 5/10 minutes.
