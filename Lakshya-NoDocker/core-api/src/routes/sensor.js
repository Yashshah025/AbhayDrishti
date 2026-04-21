import { Router } from 'express';
import { SensorHistory } from '../models/SensorHistory.js';

export function sensorRouter() {
  const r = Router();

  // Time-window history for charts. Default last 120 minutes per site.
  r.get('/history', async (req, res) => {
    const siteId = String(req.query.site || 'SOM').toUpperCase();
    const minutes = Math.min(parseInt(req.query.minutes || '120', 10), 1440);
    const since = new Date(Date.now() - minutes * 60_000);
    const rows = await SensorHistory.find({ siteId, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .limit(2000)
      .lean();
    // Backwards-compatible field names for the existing chart components
    res.json(
      rows.map((r) => ({
        timestamp: r.timestamp,
        location:  siteId,
        pressure_index: r.pressure,
        rolling_mean_pressure_5: r.pressure,
        entry_flow_rate_pax_per_min: r.entry,
        exit_flow_rate_pax_per_min:  r.exit,
        queue_density_pax_per_m2:    r.density,
        vehicle_count: r.vehicles,
        risk_level: r.riskLevel,
        confidence: r.confidence,
        future_pressure: r.futurePressureT10,
        forecast15: r.forecast15,
      })),
    );
  });

  return r;
}
