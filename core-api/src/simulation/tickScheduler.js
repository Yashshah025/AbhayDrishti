/**
 * tickScheduler.js — drives the multi-site simulation loop.
 *
 * Every `env.tickSeconds` seconds, for each site:
 *   1. simulator.advance(siteId)         → enriched tick
 *   2. mlClient.predict()                → risk + T+10 pressure
 *   3. mlClient.forecast() (every 5 ticks) → 15-min LSTM forecast
 *   4. SensorHistory.create()            → persistence
 *   5. emitter.emitToSite('tick', ...)
 *   6. risk_change emission if changed
 *   7. escalation.evaluate() → alerts + escalation
 */
import { simulator } from './simulator.js';
import { mlPredict, mlForecast } from '../services/mlClient.js';
import { SITES } from '../config/sites.js';
import { env } from '../config/env.js';
import { SensorHistory } from '../models/SensorHistory.js';
import { evaluate as evaluateEscalation } from '../engine/escalation.js';

const FORECAST_EVERY_N_TICKS = 5;       // re-forecast every 5 ticks (5 min @ 60s)

export class TickScheduler {
  constructor(emitter) {
    this.emitter = emitter;
    this.tickCount = 0;
    this.timer = null;
    this.lastRisk = {};                  // { siteId: 'Low'|'Medium'|'High' }
    this.lastForecast = {};              // { siteId: number[] }
    this.latestSnapshot = {};            // { siteId: { tick, prediction, forecast } }
  }

  async start() {
    if (this.timer) return;
    simulator.start();
    const ms = Math.max(250, env.tickSeconds * 1000);
    console.log(`[ticks] starting scheduler — ${env.tickSeconds}s per tick`);
    this.timer = setInterval(() => this._runOnce().catch(console.error), ms);
    // Run an immediate tick on start so demo isn't waiting for first interval
    setImmediate(() => this._runOnce().catch(console.error));
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    simulator.stop();
    console.log('[ticks] scheduler stopped');
  }

  async reset() {
    this.stop(); // Always stop first on reset
    this.tickCount = 0;
    this.lastRisk = {};
    this.lastForecast = {};
    this.latestSnapshot = {};
    simulator.reset();
    
    // Wipe sensor history so charts start fresh
    try {
      await SensorHistory.deleteMany({});
      console.log('[ticks] sensor history wiped');
      this.emitter.emitToState('sim_reset', { siteId: 'ALL' });
    } catch (e) {
      console.warn('[ticks] failed to wipe sensor history:', e.message);
    }
  }

  async _runOnce() {
    this.tickCount += 1;
    const stateSummary = [];
    for (const site of SITES) {
      try {
        const snap = await this._tickOneSite(site, this.tickCount);
        if (snap) stateSummary.push(snap);
      } catch (err) {
        console.error(`[ticks] site=${site.id} error:`, err.message);
      }
    }
    this.emitter.emitToState('state_overview', { sites: stateSummary, tickCount: this.tickCount });
  }

  async _tickOneSite(site, tickCount) {
    const enriched = simulator.advance(site.id);
    if (!enriched) return null;

    // Send last 30 enriched rows as `history` for predictor (it only uses last)
    const history = simulator.getHistory(site.id).map((r) => ({
      corridor_width_m:           r.corridor_width_m,
      entry_flow_rate_pax_per_min: r.entry_flow_rate_pax_per_min,
      exit_flow_rate_pax_per_min:  r.exit_flow_rate_pax_per_min,
      transport_arrival_burst:    r.transport_arrival_burst,
      vehicle_count:              r.vehicle_count,
      queue_density_pax_per_m2:   r.queue_density_pax_per_m2,
      festival_peak:              r.festival_peak,
      hour:                       r.hour,
      weather:                    r.weather,
      pressure_index:             r.pressure_index,
    }));

    let prediction;
    try {
      prediction = await mlPredict({ siteId: site.id, history });
    } catch (e) {
      console.warn(`[ml] predict failed for ${site.id}: ${e.message} — using fallback.`);
      prediction = { risk_level: 'Low', risk_numeric: 0, confidence: 0, future_pressure: 0 };
    }

    // Forecast every N ticks (or every tick if no cached forecast yet)
    let forecast = this.lastForecast[site.id] || [];
    if (tickCount % FORECAST_EVERY_N_TICKS === 0 || forecast.length === 0) {
      try {
        const window = simulator.getForecastWindow(site.id);
        const fc = await mlForecast({ siteId: site.id, window, horizonMinutes: 15 });
        forecast = fc.forecast || [];
        this.lastForecast[site.id] = forecast;
      } catch (e) {
        console.warn(`[ml] forecast failed for ${site.id}: ${e.message}`);
      }
    }

    // Persist sensor history
    SensorHistory.create({
      siteId: site.id,
      timestamp: new Date(enriched.timestamp || Date.now()),
      pressure: enriched.pressure_index,
      entry:    enriched.entry_flow_rate_pax_per_min,
      exit:     enriched.exit_flow_rate_pax_per_min,
      density:  enriched.queue_density_pax_per_m2,
      vehicles: enriched.vehicle_count,
      riskLevel: prediction.risk_level,
      confidence: prediction.confidence,
      futurePressureT10: prediction.future_pressure,
      forecast15: forecast,
    }).catch((e) => console.warn(`[sensorhistory] insert failed: ${e.message}`));

    // Build snapshot
    const snapshot = {
      siteId: site.id,
      siteName: site.name,
      lat: site.lat,
      lon: site.lon,
      tick: enriched,
      prediction,
      forecast,
      tickCount,
      progressPct: simulator.progressPct(site.id),
    };
    this.latestSnapshot[site.id] = snapshot;

    // Emit per-site tick
    this.emitter.emitToSite(site.id, 'tick', snapshot);

    // Risk change?
    const prevRisk = this.lastRisk[site.id];
    if (prevRisk && prevRisk !== prediction.risk_level) {
      const payload = { siteId: site.id, from: prevRisk, to: prediction.risk_level };
      this.emitter.emitToSite(site.id, 'risk_change', payload);
      this.emitter.emitToState('risk_change', payload);
    }
    this.lastRisk[site.id] = prediction.risk_level;

    // Run escalation engine (creates/escalates alerts as needed)
    await evaluateEscalation(site.id.toUpperCase(), enriched, prediction, forecast, tickCount);

    return {
      siteId: site.id,
      siteName: site.name,
      lat: site.lat,
      lon: site.lon,
      riskLevel: prediction.risk_level,
      pressure: enriched.pressure_index,
      futurePressure: prediction.future_pressure,
      confidence: prediction.confidence,
    };
  }

  getSnapshot(siteId) { return this.latestSnapshot[siteId] || null; }
  getAllSnapshots()   { return Object.values(this.latestSnapshot); }
}
