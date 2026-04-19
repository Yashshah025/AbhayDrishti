"""
ml/forecaster.py
================
XGBoost-anchored 15-minute pressure forecaster.

Uses the existing XGBoost regressor (which predicts T+10 pressure) to anchor
 a smooth 15-minute forecast curve. Removes the need for heavy LSTM weights.
"""

import logging
from typing import Dict, List, Optional
import numpy as np

logger = logging.getLogger(__name__)

WINDOW_SIZE = 30   # minutes of history
HORIZON_MAX = 15

class XGBoostForecaster:
    def __init__(self):
        self.is_ready = True
        logger.info("XGBoost-anchored forecaster initialized.")

    def predict(self, window: Dict[str, Optional[List[float]]], 
                future_pressure_t10: float,
                horizon: int = 15) -> List[float]:
        """
        Generates a 15-minute forecast anchored by the XGBoost T+10 prediction.
        """
        horizon = max(1, min(horizon, HORIZON_MAX))
        x = self._build_window(window)
        
        pressure = x[:, 0]
        gradient = x[:, 5]
        last_val = float(pressure[-1])
        recent_grad = float(np.mean(gradient[-5:]))
        
        # We have an anchor point at T+10 from XGBoost
        anchor_t10 = future_pressure_t10
        
        out: List[float] = []
        for k in range(1, horizon + 1):
            if k <= 10:
                # Linear interpolation from last_val to anchor_t10
                # Plus a bit of the current momentum for the first few minutes
                momentum_weight = max(0, (5 - k) / 5) # fade momentum over 5 mins
                linear_val = last_val + (anchor_t10 - last_val) * (k / 10)
                momentum_val = last_val + recent_grad * k
                
                val = (1 - momentum_weight) * linear_val + momentum_weight * momentum_val
            else:
                # Beyond T+10, continue the trend from T+9 to T+10 but dampened
                trend = (anchor_t10 - last_val) / 10
                val = anchor_t10 + trend * (k - 10) * 0.5 # dampening
            
            val = max(0.0, val)
            out.append(round(float(val), 3))
            
        return out

    def _build_window(self, w: Dict[str, Optional[List[float]]]) -> np.ndarray:
        def take(key: str) -> np.ndarray:
            arr = np.asarray(w.get(key) or [], dtype=float)
            if arr.size == 0:
                return np.zeros(WINDOW_SIZE)
            if arr.size < WINDOW_SIZE:
                arr = np.concatenate([np.full(WINDOW_SIZE - arr.size, arr[0]), arr])
            return arr[-WINDOW_SIZE:]

        pressure = take("pressure_index")
        gradient = w.get("pressure_gradient")
        if gradient is None or len(gradient) == 0:
            gradient = np.diff(pressure, prepend=pressure[0])
        else:
            gradient = take("pressure_gradient")

        return np.column_stack([
            pressure,
            take("entry_flow_rate_pax_per_min"),
            take("exit_flow_rate_pax_per_min"),
            take("queue_density_pax_per_m2"),
            take("vehicle_count"),
            gradient,
        ])
