"""
features.py
===========
Feature engineering for inference on minute_level_dataset schema.
Called by the simulator after each new row is appended to history.
"""

import numpy as np
import pandas as pd

# Feature columns expected by classifier (must match train_new_models.py)
CLASSIFIER_FEATURES = [
    'corridor_width_m',
    'entry_flow_rate_pax_per_min',
    'exit_flow_rate_pax_per_min',
    'transport_arrival_burst',
    'vehicle_count',
    'queue_density_pax_per_m2',
    'festival_peak',
    'hour',
    'weather_Heat',
    'weather_Rain',
    'net_flow',
    'rolling_mean_entry_5',
    'rolling_mean_pressure_5',
    'pressure_gradient',
    'sudden_spike_flag',
    'pressure_index',
]

# Feature columns expected by regressor (raw corridor inputs only - no pressure_index)
# Target: pressure_index (R2=0.89 on test set, 70/15/15 chronological split)
REGRESSOR_FEATURES = [
    'corridor_width_m',
    'entry_flow_rate_pax_per_min',
    'exit_flow_rate_pax_per_min',
    'transport_arrival_burst',
    'vehicle_count',
    'queue_density_pax_per_m2',
    'festival_peak',
    'hour',
    'weather_Heat',
    'weather_Rain',
    'net_flow',
]

RISK_LABELS = {0: 'Low', 1: 'Medium', 2: 'High'}


def calculate_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enriches the running simulation history with derived / rolling features.
    Input df must already contain the raw minute_level_dataset columns.
    Returns an enriched copy.
    """
    df = df.copy()

    # ── Weather one-hot ────────────────────────────────────────────────
    if 'weather' in df.columns:
        df['weather_Heat']  = (df['weather'] == 'Heat').astype(int)
        df['weather_Rain']  = (df['weather'] == 'Rain').astype(int)
    else:
        df['weather_Heat']  = 0
        df['weather_Rain']  = 0

    # ── Net flow ───────────────────────────────────────────────────────
    df['net_flow'] = (df['entry_flow_rate_pax_per_min']
                      - df['exit_flow_rate_pax_per_min'])

    # ── Rolling features ───────────────────────────────────────────────
    df['rolling_mean_entry_5']    = (
        df['entry_flow_rate_pax_per_min'].rolling(5, min_periods=1).mean())
    df['rolling_mean_pressure_5'] = (
        df['pressure_index'].rolling(5, min_periods=1).mean())
    df['pressure_gradient']       = df['pressure_index'].diff().fillna(0)
    df['sudden_spike_flag']       = (df['pressure_gradient'] > 2.0).astype(int)

    return df


def classify_risk_label(numeric: int) -> str:
    """Convert numeric label (0/1/2) to string."""
    return RISK_LABELS.get(int(numeric), 'Low')
