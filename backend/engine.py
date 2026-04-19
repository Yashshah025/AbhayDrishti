"""
engine.py
=========
AlertEngine: receives per-tick data + ML prediction, decides whether
to generate an alert, classifies it (Genuine Crush vs Momentary Surge),
and dispatches agency-specific actions.

Risk scale:
    Low    → no alert
    Medium → SURGE WATCH
    High   → CRUSH RISK (genuine or temporary depending on gradient).
"""

import time
from datetime import datetime


# Per-agency action templates
_AGENCY_ACTIONS = {
    "High": {
        "genuine": {
            "District Police":      "Deploy officers immediately to chokepoint. Force-exit overflow.",
            "Temple Trust":         "HALT darshan entry NOW. Activate overflow holding zone.",
            "GSRTC Transport":      "HOLD all incoming vehicles at 3 km checkpoint. No new arrivals.",
        },
        "surge": {
            "District Police":      "Monitor corridor exits. Prepare rapid response.",
            "Temple Trust":         "Slow darshan entry — reduce gate throughput by 40 %.",
            "GSRTC Transport":      "Delay bus departures by 15 minutes. Advise passengers.",
        },
    },
    "Medium": {
        "genuine": {
            "District Police":      "Increase visibility at corridor; begin crowd diversion.",
            "Temple Trust":         "Redirect pilgrims to alternate entry. Slow inner gate.",
            "GSRTC Transport":      "Stage vehicles at holding area. Await further instructions.",
        },
        "surge": {
            "District Police":      "Monitor and log — no action required yet.",
            "Temple Trust":         "Observe flow; prepared to slow inner gate if needed.",
            "GSRTC Transport":      "Standard operations — track arrival schedule.",
        },
    },
}


class AlertEngine:
    def __init__(self):
        self.alerts    = []
        self._alert_id = 0

    # ── Core ─────────────────────────────────────────────────────────────────

    def process_state(self, tick: dict, prediction: dict) -> dict | None:
        """
        tick       : latest enriched row dict from simulator
        prediction : output from CrowdRiskPredictor.predict()

        Returns an alert dict if one was generated, else None.
        """
        risk_level    = prediction.get('risk_level', 'Low')
        confidence    = prediction.get('confidence', 0.0)
        future_press  = prediction.get('future_pressure', 0.0)
        pressure_now  = tick.get('pressure_index', 0.0)
        gradient      = tick.get('pressure_gradient', 0.0)
        density       = tick.get('queue_density_pax_per_m2', 0.0)

        if risk_level == 'Low':
            return None   # No alert needed

        # Distinguish genuine crush from momentary surge
        is_genuine = (
            risk_level == 'High'
            and gradient > 2.0
            and density > 3.5
        ) or (
            risk_level == 'Medium'
            and gradient > 3.0
            and density > 4.0
        )

        alert = self._build_alert(
            risk_level     = risk_level,
            is_genuine     = is_genuine,
            confidence     = confidence,
            pressure_now   = pressure_now,
            future_pressure= future_press,
            gradient       = gradient,
            location       = tick.get('location', 'Unknown'),
        )
        self.alerts.append(alert)
        return alert

    # ── Builders ──────────────────────────────────────────────────────────────

    def _build_alert(self, risk_level, is_genuine, confidence,
                     pressure_now, future_pressure, gradient, location) -> dict:
        self._alert_id += 1
        now_ts = datetime.now().strftime("%H:%M:%S")
        alert_type = "GENUINE CRUSH RISK" if is_genuine else "MOMENTARY SURGE"

        actions = (_AGENCY_ACTIONS
                   .get(risk_level, _AGENCY_ACTIONS['Medium'])
                   .get('genuine' if is_genuine else 'surge',
                        _AGENCY_ACTIONS['Medium']['surge']))

        return {
            "id":              self._alert_id,
            "timestamp":       now_ts,
            "timestamp_epoch": time.time(),
            "location":        location,
            "level":           risk_level,       # "Low" | "Medium" | "High"
            "type":            alert_type,
            "pressure_now":    round(pressure_now, 2),
            "future_pressure": round(future_pressure, 2),
            "pressure_gradient": round(gradient, 2),
            "confidence":      round(confidence, 3),
            "actions":         actions,
            "acknowledged": {
                "District Police": False,
                "Temple Trust":    False,
                "GSRTC Transport": False,
            },
            "ack_times": {},
        }

    # ── Query ─────────────────────────────────────────────────────────────────

    def acknowledge(self, alert_id: int, agency: str) -> bool:
        for alert in self.alerts:
            if alert['id'] == alert_id:
                alert['acknowledged'][agency] = True
                alert['ack_times'][agency]    = datetime.now().strftime("%H:%M:%S")
                return True
        return False

    def get_active_alerts(self) -> list:
        return self.alerts[-20:]   # last 20

    def get_stats(self) -> dict:
        total   = len(self.alerts)
        genuine = sum(1 for a in self.alerts if 'GENUINE' in a['type'])
        high    = sum(1 for a in self.alerts if a['level'] == 'High')
        medium  = sum(1 for a in self.alerts if a['level'] == 'Medium')
        return {
            "total_alerts": total,
            "genuine_crush": genuine,
            "momentary_surge": total - genuine,
            "high_risk": high,
            "medium_risk": medium,
        }
