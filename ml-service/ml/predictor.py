"""
predictor.py
============
CrowdRiskPredictor: loads the trained classifier + regressor and runs
inference on a feature-enriched DataFrame produced by the simulator.

Returns:
    {
        "risk_level":   "Low" | "Medium" | "High",
        "risk_numeric": 0 | 1 | 2,
        "confidence":   float  in [0.0, 1.0],
        "future_pressure": float  (raw regressor output in pressure units)
    }
"""

import os
import logging
import numpy as np
import pandas as pd
import joblib

from ml.features import (CLASSIFIER_FEATURES, REGRESSOR_FEATURES,
                         classify_risk_label)

logger = logging.getLogger(__name__)

# Root directory (one level up from /app/ml/)
_HERE      = os.path.dirname(os.path.abspath(__file__))
_ROOT      = os.path.dirname(_HERE)


def _find(filename: str) -> str:
    """Search root → /app → /app/models for the file."""
    candidates = [
        os.path.join(_ROOT, filename),
        os.path.join('/app', filename),
        os.path.join('/app', 'models', filename),
        os.path.join(_HERE, '..', '..', filename),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"Cannot find model file: {filename}")


class CrowdRiskPredictor:
    def __init__(self):
        self._ready      = False
        self._clf        = None
        self._scaler     = None
        self._pca        = None
        self._reg        = None
        self._p_max      = 100.0   # fallback
        self._load()

    def _load(self):
        try:
            self._scaler  = joblib.load(_find('scaler.pkl'))
            self._pca     = joblib.load(_find('pca.pkl'))
            self._clf     = joblib.load(_find('xgb_classifier.pkl'))
            self._reg     = joblib.load(_find('confidence_regressor.pkl'))
            meta          = joblib.load(_find('regressor_meta.pkl'))
            self._p_max   = meta.get('p_max', 100.0)
            self._ready   = True
            logger.info("CrowdRiskPredictor loaded successfully.")
        except FileNotFoundError as e:
            logger.warning(f"Model files not found — predictor disabled. {e}")

    @property
    def is_ready(self) -> bool:
        return self._ready

    def predict(self, history_df: pd.DataFrame) -> dict:
        """
        Run prediction on the last row of a feature-enriched history DataFrame.
        Returns a dict with risk_level, risk_numeric, confidence, future_pressure.
        """
        if not self._ready or history_df.empty:
            return {
                "risk_level": "Low",
                "risk_numeric": 0,
                "confidence": 0.0,
                "future_pressure": 0.0,
            }

        row = history_df.tail(1)

        # ── Classifier ────────────────────────────────────────────────
        try:
            X_clf = self._ensure_cols(row, CLASSIFIER_FEATURES)
            X_sc  = self._scaler.transform(X_clf)
            X_pca = self._pca.transform(X_sc)
            risk_num  = int(self._clf.predict(X_pca)[0])
            risk_prob = self._clf.predict_proba(X_pca)[0]
            clf_conf  = float(risk_prob[risk_num])
        except Exception as e:
            logger.error(f"Classifier error: {e}")
            risk_num, clf_conf = 0, 0.5

        # ── Regressor (pressure_index prediction → confidence score) ───
        # Regressor trained with w_Heat / w_Rain column names
        try:
            reg_row = row.copy()
            if 'weather_Heat' in reg_row.columns:
                reg_row['w_Heat'] = reg_row['weather_Heat']
                reg_row['w_Rain'] = reg_row['weather_Rain']
            # Map REGRESSOR_FEATURES weather names to w_ prefix as trained
            reg_feats_mapped = [
                f.replace('weather_Heat', 'w_Heat').replace('weather_Rain', 'w_Rain')
                for f in REGRESSOR_FEATURES
            ]
            X_reg         = self._ensure_cols(reg_row, reg_feats_mapped)
            future_press  = float(self._reg.predict(X_reg)[0])
            # Normalise to [0, 1] — sigmoid-like, anchored by training max
            norm_press    = max(0.0, future_press) / max(self._p_max, 1.0)
            reg_conf      = float(1 / (1 + np.exp(-6 * (norm_press - 0.5))))
        except Exception as e:
            logger.error(f"Regressor error: {e}")
            future_press, reg_conf = 0.0, 0.0

        # Blend classifier max-prob + regressor sigmoid as final confidence
        confidence = round(0.5 * clf_conf + 0.5 * reg_conf, 4)

        return {
            "risk_level":      classify_risk_label(risk_num),
            "risk_numeric":    risk_num,
            "confidence":      confidence,
            "future_pressure": round(future_press, 2),
        }

    # ── helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _ensure_cols(df: pd.DataFrame, cols: list) -> np.ndarray:
        """Fill missing columns with 0 and return numpy array."""
        out = pd.DataFrame(index=df.index)
        for c in cols:
            out[c] = df[c] if c in df.columns else 0.0
        return out.values.astype(float)
