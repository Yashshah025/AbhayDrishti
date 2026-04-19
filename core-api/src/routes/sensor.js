import { Router } from 'express';
import { SensorHistory } from '../models/SensorHistory.js';

export function sensorRouter() {
  const r = Router();

  // Time-window history for charts. Default last 120 minutes per site.
  r.get('/history', async (req, res) => {
    const siteId = String(req.query.site || 'SOM').toUpperCase();
    const limit = Math.min(parseInt(req.query.minutes || '120', 10), 500);
    const rows = await SensorHistory.find({ siteId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    // Return in chronological order
    const sorted = rows.reverse();
    // Backwards-compatible field names for the existing chart components
    // sorted already contains the transformed rows
    res.json(
      sorted.map((r) => ({
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

  r.get('/heatmap', async (req, res) => {
    try {
      // Get the date of the latest available data to display in the chart corner
      const latestRecord = await SensorHistory.findOne().sort({ timestamp: -1 }).select('timestamp').lean();
      const latestDateStr = latestRecord 
        ? latestRecord.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const data = await SensorHistory.aggregate([
        {
          $group: {
            _id: { 
              siteId: '$siteId', 
              hour: { $hour: '$timestamp' } 
            },
            avgPressure: { $avg: '$pressure' }
          }
        },
        {
          $project: {
            _id: 0,
            siteId: '$_id.siteId',
            hour: '$_id.hour',
            pressure: { $round: ['$avgPressure', 2] }
          }
        },
        { $sort: { siteId: 1, hour: 1 } }
      ]);
      res.json({ data, date: latestDateStr });
    } catch (err) {
      console.error('[sensor] heatmap aggregation failed:', err);
      res.status(500).json({ error: 'aggregation failed' });
    }
  });

  return r;
}
