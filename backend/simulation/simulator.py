"""
simulator.py
============
CrowdSimulator: reads minute_level_dataset.csv row-by-row (per minute),
enriching each row with rolling/derived features, and calls a callback
with the latest enriched tick dict.

Key design decisions:
  - Data is sorted by timestamp on load → chronological replay guaranteed
  - Replay runs in a daemon thread at configurable speed (default 2 s / tick)
  - "What-if" burst injects +20 vehicles into the current tick
  - Enriched history is stored for /replay endpoint
"""

import os
import time
import threading
import logging

import pandas as pd
import numpy as np

from ml.features import calculate_features

logger = logging.getLogger(__name__)

# ─── Path resolution ─────────────────────────────────────────────────────────
_HERE      = os.path.dirname(os.path.abspath(__file__))
_ROOT      = os.path.dirname(_HERE)
_DATA_PATH = os.path.join(_ROOT, 'minute_level_dataset.csv')


class CrowdSimulator:
    def __init__(self, tick_seconds: float = 2.0):
        self._tick_seconds   = tick_seconds
        self._df             = None          # full sorted dataset
        self._current_index  = 0
        self._history        = []            # list of raw row DataFrames
        self._enriched_hist  = []            # list of enriched row dicts
        self.is_running      = False
        self._burst_pending  = False
        self._thread         = None

    # ── Data Load ─────────────────────────────────────────────────────────────

    def load_data(self, path: str | None = None):
        target = path or _DATA_PATH
        if not os.path.exists(target):
            raise FileNotFoundError(f"Dataset not found: {target}")
        logger.info(f"Loading dataset from {target} …")
        df = pd.read_csv(target, parse_dates=['timestamp'])
        # Sort chronologically
        df = df.sort_values('timestamp').reset_index(drop=True)
        self._df = df
        # Start at the 90% mark (the test set) as requested
        self._test_start_index = int(len(df) * 0.9)
        self._current_index    = self._test_start_index
        logger.info(f"Simulator loaded {len(self._df):,} rows. Starting at test set (index {self._current_index}).")

    # ── Simulation Control ────────────────────────────────────────────────────

    def start(self, callback):
        if self.is_running:
            return
        if self._df is None:
            raise RuntimeError("Call load_data() before start().")
        self.is_running = True
        self._thread    = threading.Thread(
            target=self._run_loop, args=(callback,), daemon=True)
        self._thread.start()
        logger.info("Simulation started.")

    def stop(self):
        self.is_running = False
        logger.info("Simulation stopped.")

    def reset(self):
        self.stop()
        self._current_index = getattr(self, '_test_start_index', 0)
        self._history.clear()
        self._enriched_hist.clear()
        logger.info("Simulation reset.")

    def trigger_burst(self, extra_vehicles: int = 20):
        """Inject a sudden transport arrival burst on the next tick."""
        self._burst_pending  = True
        self._burst_vehicles = extra_vehicles
        logger.info(f"What-if burst scheduled: +{extra_vehicles} vehicles.")

    # ── Internal Loop ─────────────────────────────────────────────────────────

    def _run_loop(self, callback):
        while self.is_running and self._current_index < len(self._df):
            row = self._df.iloc[[self._current_index]].copy()

            # Apply burst if pending
            if self._burst_pending:
                row['vehicle_count']           = row['vehicle_count'] + self._burst_vehicles
                row['transport_arrival_burst'] = 1
                self._burst_pending            = False

            self._history.append(row)

            # Re-enrich running history (rolling features see full past)
            history_df       = pd.concat(self._history, ignore_index=True)
            enriched_df      = calculate_features(history_df)

            latest_tick      = enriched_df.tail(1).to_dict('records')[0]
            self._enriched_hist.append(latest_tick)

            # Fire callback (main.py handles prediction + alert)
            try:
                callback(latest_tick, enriched_df)
            except Exception as e:
                logger.error(f"Callback error at index {self._current_index}: {e}")

            self._current_index += 1
            time.sleep(self._tick_seconds)

        if self._current_index >= len(self._df):
            logger.info("Simulation complete — end of dataset reached.")
            self.is_running = False

    # ── Query ─────────────────────────────────────────────────────────────────

    def get_replay_data(self) -> pd.DataFrame:
        if not self._enriched_hist:
            return pd.DataFrame()
        return pd.DataFrame(self._enriched_hist)

    def get_latest_tick(self) -> dict | None:
        if not self._enriched_hist:
            return None
        return self._enriched_hist[-1]

    @property
    def progress_pct(self) -> float:
        if self._df is None or len(self._df) == 0:
            return 0.0
        return round(self._current_index / len(self._df) * 100, 2)
