"""
ml/forecaster.py
================
5-minute pressure forecaster — physics-grounded heuristic.

Combines recent gradient extrapolation with mean-reversion toward the
5-minute baseline. No deep learning, no model weights, no GPU/PyTorch
required. Deterministic and fast (microseconds per call).

Input window (per site, last 30 minutes):
    pressure_index           : list[30]
    entry_flow_rate_pax_per_min: list[30]
    exit_flow_rate_pax_per_min : list[30]
    queue_density_pax_per_m2 : list[30]
    vehicle_count            : list[30]
    pressure_gradient        : list[30] | None

Output: list[horizon] — pressure_index forecast (default horizon=5).
"""

import logging
from typing import Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

WINDOW_SIZE = 30
HORIZON_MAX = 5


class PhysicsForecaster:
    """A pure heuristic pressure forecaster — no neural network."""

    def __init__(self):
        self.is_ready = True   # always ready, no model file to load
        logger.info("Forecaster initialized (heuristic mode — no PyTorch).")

    def predict(self, window: Dict[str, Optional[List[float]]],
                horizon: int = 5) -> List[float]:
        horizon = max(1, min(horizon, HORIZON_MAX))
        x = self._build_window(window)
        return self._forecast(x, horizon)

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

        entry   = take("entry_flow_rate_pax_per_min")
        exit_   = take("exit_flow_rate_pax_per_min")
        density = take("queue_density_pax_per_m2")
        vehicles = take("vehicle_count")

        return np.column_stack([pressure, entry, exit_, density, vehicles, gradient])

    def _forecast(self, x: np.ndarray, horizon: int) -> List[float]:
        """Physics-grounded forecast.

        Combines:
          • gradient persistence (recent slope continues, decaying with time)
          • mean reversion toward the 5-minute baseline
          • net-flow pressure (entry > exit drives pressure up)
        """
        pressure = x[:, 0]
        entry    = x[:, 1]
        exit_    = x[:, 2]
        density  = x[:, 3]
        gradient = x[:, 5]

        recent_grad = float(np.mean(gradient[-5:]))
        baseline    = float(np.mean(pressure[-5:]))
        net_flow    = float(np.mean(entry[-5:] - exit_[-5:]))
        density_now = float(density[-1]) if len(density) else 0.0
        last        = float(pressure[-1])

        # Density amplifies pressure change (more crowded → faster spike)
        density_factor = 1.0 + min(density_now / 6.0, 0.6)

        # Net inflow contributes pressure per minute (small but real)
        flow_pressure = max(net_flow, 0) * 0.04

        out: List[float] = []
        cur = last
        for k in range(1, horizon + 1):
            decay     = 0.85 ** k
            mean_pull = (1 - decay) * (baseline - cur) * 0.3
            cur = cur + (recent_grad * decay * density_factor) + flow_pressure + mean_pull
            cur = max(0.0, cur)
            out.append(round(cur, 3))
        return out
