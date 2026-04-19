"""
main.py
=======
FastAPI backend for CrowdShield — Stampede Window Predictor.

Endpoints:
  GET  /status          → latest tick + prediction
  POST /simulation/start
  POST /simulation/stop
  POST /simulation/reset
  POST /simulation/burst → inject what-if transport burst
  GET  /alerts          → last 20 alerts
  GET  /alerts/stats    → aggregated alert statistics
  POST /alerts/acknowledge?alert_id=&agency=
  GET  /replay          → full enriched history as JSON array
  POST /predict         → single-row inference (manual input)
"""

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ml.predictor import CrowdRiskPredictor
from engine import AlertEngine
from simulation.simulator import CrowdSimulator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Global state ─────────────────────────────────────────────────────────────

predictor    = CrowdRiskPredictor()
alert_engine = AlertEngine()
simulator    = CrowdSimulator(tick_seconds=2.0)

current_state: dict = {
    "latest_tick":  None,
    "prediction":   None,
    "latest_alert": None,
}


# ─── Simulation callback ───────────────────────────────────────────────────────

def simulation_callback(tick: dict, enriched_df):
    """Called by simulator after every tick."""
    prediction             = predictor.predict(enriched_df)
    alert                  = alert_engine.process_state(tick, prediction)
    current_state["latest_tick"]  = tick
    current_state["prediction"]   = prediction
    current_state["latest_alert"] = alert


# ─── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    simulator.load_data()
    logger.info("Dataset loaded. Backend ready.")
    yield
    simulator.stop()


app = FastAPI(title="CrowdShield API", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/status")
def get_status():
    tick = current_state["latest_tick"] or {}
    pred = current_state["prediction"]  or {
        "risk_level": "Low", "risk_numeric": 0,
        "confidence": 0.0, "future_pressure": 0.0
    }
    return {
        "status":            "online",
        "model_ready":       predictor.is_ready,
        "simulation_running": simulator.is_running,
        "progress_pct":      simulator.progress_pct,
        # raw sensor data
        "pressure_index":    tick.get("pressure_index", 0.0),
        "entry_rate":        tick.get("entry_flow_rate_pax_per_min", 0.0),
        "exit_rate":         tick.get("exit_flow_rate_pax_per_min", 0.0),
        "density":           tick.get("queue_density_pax_per_m2", 0.0),
        "vehicle_count":     tick.get("vehicle_count", 0),
        "location":          tick.get("location", "—"),
        "timestamp":         tick.get("timestamp", "—"),
        "corridor_width":    tick.get("corridor_width_m", 0),
        # rolling / derived
        "rolling_mean":      tick.get("rolling_mean_pressure_5", 0.0),
        "pressure_gradient": tick.get("pressure_gradient", 0.0),
        "sudden_spike":      bool(tick.get("sudden_spike_flag", 0)),
        # ML predictions
        "risk_level":        pred["risk_level"],
        "risk_numeric":      pred["risk_numeric"],
        "confidence":        pred["confidence"],
        "future_pressure":   pred["future_pressure"],
    }


# ── Simulation control ────────────────────────────────────────────────────────

@app.post("/simulation/start")
def start_simulation():
    if not simulator.is_running:
        simulator.start(simulation_callback)
    return {"message": "Simulation started", "running": True}


@app.post("/simulation/stop")
def stop_simulation():
    simulator.stop()
    return {"message": "Simulation stopped", "running": False}


@app.post("/simulation/reset")
def reset_simulation():
    simulator.reset()
    current_state.update(latest_tick=None, prediction=None, latest_alert=None)
    return {"message": "Simulation reset"}


@app.post("/simulation/burst")
def trigger_burst(vehicles: int = 20):
    simulator.trigger_burst(extra_vehicles=vehicles)
    return {"message": f"What-if burst injected: +{vehicles} vehicles on next tick"}


# ── Alerts ────────────────────────────────────────────────────────────────────

@app.get("/alerts")
def get_alerts():
    return alert_engine.get_active_alerts()


@app.get("/alerts/stats")
def get_alert_stats():
    return alert_engine.get_stats()


@app.post("/alerts/acknowledge")
def acknowledge_alert(alert_id: int, agency: str):
    ok = alert_engine.acknowledge(alert_id, agency)
    if not ok:
        raise HTTPException(404, f"Alert {alert_id} not found")
    return {"success": True, "alert_id": alert_id, "agency": agency}


# ── Replay ────────────────────────────────────────────────────────────────────

@app.get("/replay")
def get_replay(limit: int = 200):
    df = simulator.get_replay_data()
    if df.empty:
        return []
    # Return last `limit` rows
    keep_cols = [
        "timestamp", "location", "pressure_index",
        "rolling_mean_pressure_5", "entry_flow_rate_pax_per_min",
        "exit_flow_rate_pax_per_min", "queue_density_pax_per_m2",
        "vehicle_count", "corridor_width_m", "pressure_gradient",
        "sudden_spike_flag", "weather",
    ]
    available = [c for c in keep_cols if c in df.columns]
    return df[available].tail(limit).fillna(0).to_dict("records")


# ── Manual Inference ──────────────────────────────────────────────────────────

class InferenceRequest(BaseModel):
    corridor_width_m:             float = 6.0
    entry_flow_rate_pax_per_min:  float = 80.0
    exit_flow_rate_pax_per_min:   float = 60.0
    transport_arrival_burst:      int   = 0
    vehicle_count:                float = 5.0
    queue_density_pax_per_m2:     float = 3.0
    festival_peak:                int   = 0
    hour:                         int   = 12
    weather:                      str   = "Clear"
    pressure_index:               float = 10.0


@app.post("/predict")
def manual_predict(req: InferenceRequest):
    import pandas as pd
    from ml.features import calculate_features

    df = pd.DataFrame([req.dict()])
    enriched = calculate_features(df)
    result   = predictor.predict(enriched)
    return result


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=False)
