"""
ml-service / main.py
====================
Slim FastAPI ML microservice for CrowdShield C2.

Endpoints:
  GET  /healthz   -> service liveness + model readiness
  POST /predict   -> XGBoost classifier (Low/Med/High) + regressor (T+10 pressure)
  POST /forecast  -> LSTM next-15-minute pressure forecast

The orchestration layer (alerts, simulation, sockets, escalation, persistence)
lives in core-api/ (Node + Express + Mongo + Socket.io). This service does ML only.
"""

import logging
from contextlib import asynccontextmanager
from typing import List, Optional

import pandas as pd
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml.predictor import CrowdRiskPredictor
from ml.features import calculate_features
from ml.forecaster import XGBoostForecaster

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Singletons ───────────────────────────────────────────────────────────────
predictor  = CrowdRiskPredictor()
forecaster = XGBoostForecaster()


# ─── App ──────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "ml-service ready. predictor=%s forecaster=%s",
        predictor.is_ready, forecaster.is_ready,
    )
    yield


app = FastAPI(title="CrowdShield C2 — ML Service", version="3.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


# ─── Schemas ──────────────────────────────────────────────────────────────────
class PredictRow(BaseModel):
    """Single tick of raw sensor data; rolling features computed server-side."""
    corridor_width_m: float = 6.0
    entry_flow_rate_pax_per_min: float = 80.0
    exit_flow_rate_pax_per_min: float = 60.0
    transport_arrival_burst: int = 0
    vehicle_count: float = 5.0
    queue_density_pax_per_m2: float = 3.0
    festival_peak: int = 0
    hour: int = 12
    weather: str = "Clear"
    pressure_index: float = 10.0


class PredictRequest(BaseModel):
    """Up to N ticks of recent history. Last row is the one being predicted."""
    site_id: str = "SOM"
    history: List[PredictRow] = Field(default_factory=list)


class ForecastWindow(BaseModel):
    """Window of features for forecasting. Anchored by XGBoost T+10 prediction."""
    pressure_index: List[float]
    entry_flow_rate_pax_per_min: List[float]
    exit_flow_rate_pax_per_min: List[float]
    queue_density_pax_per_m2: List[float]
    vehicle_count: List[float]
    pressure_gradient: Optional[List[float]] = None
    # Contextual features for XGBoost anchor
    corridor_width_m: float = 6.0
    transport_arrival_burst: int = 0
    festival_peak: int = 0
    hour: int = 12
    weather: str = "Clear"


class ForecastRequest(BaseModel):
    site_id: str = "SOM"
    window: ForecastWindow
    horizon_minutes: int = 15


# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "predictor_ready": predictor.is_ready,
        "forecaster_ready": forecaster.is_ready,
    }


@app.post("/predict")
def predict(req: PredictRequest):
    rows = req.history if req.history else [PredictRow()]
    df = pd.DataFrame([r.dict() for r in rows])
    enriched = calculate_features(df)
    result = predictor.predict(enriched)
    result["site_id"] = req.site_id
    last = enriched.tail(1).iloc[0].to_dict()
    result["pressure_gradient"] = float(last.get("pressure_gradient", 0.0))
    result["sudden_spike"] = bool(last.get("sudden_spike_flag", 0))
    result["rolling_mean_pressure_5"] = float(last.get("rolling_mean_pressure_5", 0.0))
    return result


@app.post("/forecast")
def forecast(req: ForecastRequest):
    # 1. Get T+10 anchor from XGBoost regressor
    # Reconstruct a PredictRow from the last window state
    last_row = PredictRow(
        corridor_width_m=req.window.corridor_width_m,
        entry_flow_rate_pax_per_min=req.window.entry_flow_rate_pax_per_min[-1] if req.window.entry_flow_rate_pax_per_min else 80,
        exit_flow_rate_pax_per_min=req.window.exit_flow_rate_pax_per_min[-1] if req.window.exit_flow_rate_pax_per_min else 60,
        transport_arrival_burst=req.window.transport_arrival_burst,
        vehicle_count=req.window.vehicle_count[-1] if req.window.vehicle_count else 5,
        queue_density_pax_per_m2=req.window.queue_density_pax_per_m2[-1] if req.window.queue_density_pax_per_m2 else 3,
        festival_peak=req.window.festival_peak,
        hour=req.window.hour,
        weather=req.window.weather,
        pressure_index=req.window.pressure_index[-1] if req.window.pressure_index else 10
    )
    
    df = pd.DataFrame([last_row.dict()])
    enriched = calculate_features(df)
    pred = predictor.predict(enriched)
    anchor_t10 = pred.get("future_pressure", last_row.pressure_index)

    # 2. Run the anchored forecast
    series = forecaster.predict(
        req.window.dict(), 
        future_pressure_t10=anchor_t10,
        horizon=req.horizon_minutes
    )
    
    return {
        "site_id": req.site_id,
        "horizon_minutes": req.horizon_minutes,
        "forecast": series,
        "model": "xgboost-anchored-linear",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=False)
