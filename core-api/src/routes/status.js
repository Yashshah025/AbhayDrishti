import { Router } from 'express';
import { SITES, siteById } from '../config/sites.js';
import { simulator } from '../simulation/simulator.js';

export function statusRouter({ scheduler }) {
  const r = Router();

  r.get('/healthz', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // Macro state map snapshot — one row per site for the Leaflet view
  r.get('/state-overview', (_req, res) => {
    const snaps = scheduler.getAllSnapshots();
    const byId = Object.fromEntries(snaps.map((s) => [s.siteId, s]));
    const sites = SITES.map((site) => {
      const s = byId[site.id];
      return {
        id: site.id, name: site.name, lat: site.lat, lon: site.lon,
        district: site.district,
        riskLevel: s?.prediction?.risk_level || 'Low',
        pressure:  s?.tick?.pressure_index   || 0,
        futurePressure: s?.prediction?.future_pressure || 0,
        confidence:     s?.prediction?.confidence     || 0,
        tickCount: s?.tickCount || 0,
      };
    });
    res.json({ sites, tickCount: scheduler.tickCount });
  });

  // Per-site current state — preserves the legacy /status payload shape so the
  // existing dashboard components keep working unchanged.
  r.get('/', (req, res) => {
    const siteId = String(req.query.site || 'SOM').toUpperCase();
    const site = siteById(siteId);
    if (!site) return res.status(404).json({ error: `unknown site ${siteId}` });
    const snap = scheduler.getSnapshot(siteId);
    const tick = snap?.tick || {};
    const pred = snap?.prediction || { risk_level: 'Low', risk_numeric: 0, confidence: 0, future_pressure: 0 };
    res.json({
      status: 'online',
      model_ready: (snap?.prediction?.confidence > 0) || (scheduler.tickCount > 0),
      site:   { id: site.id, name: site.name, lat: site.lat, lon: site.lon },
      simulation_running: simulator.running,
      progress_pct: snap?.progressPct || 0,
      pressure_index: tick.pressure_index || 0,
      entry_rate:     tick.entry_flow_rate_pax_per_min || 0,
      exit_rate:      tick.exit_flow_rate_pax_per_min  || 0,
      density:        tick.queue_density_pax_per_m2    || 0,
      vehicle_count:  tick.vehicle_count || 0,
      location:       site.name,
      timestamp:      tick.timestamp || '—',
      corridor_width: tick.corridor_width_m || 0,
      rolling_mean:      tick.rolling_mean_pressure_5 || 0,
      pressure_gradient: tick.pressure_gradient || 0,
      sudden_spike:      Boolean(tick.sudden_spike_flag),
      risk_level:    pred.risk_level,
      risk_numeric:  pred.risk_numeric,
      confidence:    pred.confidence,
      future_pressure: pred.future_pressure,
      forecast15:    snap?.forecast || [],
    });
  });

  return r;
}
