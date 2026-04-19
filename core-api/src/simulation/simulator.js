/**
 * simulator.js — JS port of backend/simulation/simulator.py.
 *
 * Loads minute_level_dataset.csv once, partitions rows by `location` →
 * { siteId: rows[] }. Maintains a per-site cursor that advances one row
 * per tick (driven externally by tickScheduler).
 *
 * Per-site `historyWindow` keeps the last 30 enriched rows (used as
 * predict context AND as the LSTM forecast window).
 */
import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { SITES, siteByCsvName } from '../config/sites.js';

const HISTORY_WINDOW = 30;            // rows kept per site for ML context
const SITE_BY_ID     = Object.fromEntries(SITES.map((s) => [s.id, s]));

function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function rawRowFromCsv(r) {
  return {
    timestamp:                  r.timestamp,
    location:                   r.location,
    corridor_width_m:           toNum(r.corridor_width_m, 6),
    entry_flow_rate_pax_per_min: toNum(r.entry_flow_rate_pax_per_min),
    exit_flow_rate_pax_per_min:  toNum(r.exit_flow_rate_pax_per_min),
    transport_arrival_burst:    toNum(r.transport_arrival_burst),
    vehicle_count:              toNum(r.vehicle_count),
    queue_density_pax_per_m2:   toNum(r.queue_density_pax_per_m2),
    weather:                    r.weather || 'Clear',
    festival_peak:              toNum(r.festival_peak),
    pressure_index:             toNum(r.pressure_index),
    hour:                       toNum(r.hour, new Date(r.timestamp).getHours()),
  };
}

export class MultiSiteSimulator {
  constructor() {
    this.sitesData = {};       // { siteId: rows[] (raw) }
    this.cursor    = {};       // { siteId: idx }
    this.startIdx  = {};       // { siteId: testSetStart }
    this.history   = {};       // { siteId: enrichedRow[] (rolling window) }
    this.burst     = {};       // { siteId: extraVehicles | 0 }
    this.loaded    = false;
    this.running   = false;
  }

  load(csvPath) {
    if (this.loaded) return;
    if (!fs.existsSync(csvPath)) {
      console.warn(`[sim] dataset not found at ${csvPath} — running with synthetic seed.`);
      this._seedSynthetic();
      this.loaded = true;
      return;
    }
    console.log(`[sim] loading ${csvPath} ...`);
    const buf = fs.readFileSync(csvPath, 'utf8');
    const rows = parse(buf, { columns: true, skip_empty_lines: true });

    // Partition by location → site id
    for (const r of rows) {
      const site = siteByCsvName(r.location);
      if (!site) continue;
      (this.sitesData[site.id] ||= []).push(rawRowFromCsv(r));
    }

    // Sort each site chronologically
    for (const id of Object.keys(this.sitesData)) {
      this.sitesData[id].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      // Start cursor at the 90% mark (test-set window) like the original sim
      this.startIdx[id] = Math.floor(this.sitesData[id].length * 0.9);
      this.cursor[id]   = this.startIdx[id];
      this.history[id]  = [];
      this.burst[id]    = 0;
    }

    // Sites with no data → seed synthetic
    for (const s of SITES) {
      if (!this.sitesData[s.id]) {
        console.warn(`[sim] no rows for ${s.csvName} — using synthetic seed.`);
        this._seedOneSynthetic(s.id);
      }
    }

    this.loaded = true;
    const summary = SITES.map((s) => `${s.id}=${this.sitesData[s.id]?.length || 0}`).join(' ');
    console.log(`[sim] loaded. rows: ${summary}`);
  }

  _seedSynthetic() {
    for (const s of SITES) this._seedOneSynthetic(s.id);
  }

  _seedOneSynthetic(siteId) {
    // Generate 1440 minutes of plausible data so the demo runs even without CSV
    const out = [];
    const base = Date.now() - 1440 * 60_000;
    for (let i = 0; i < 1440; i++) {
      const t = new Date(base + i * 60_000).toISOString();
      const surge = Math.sin(i / 60) * 8 + Math.random() * 4;
      out.push({
        timestamp: t,
        location: SITE_BY_ID[siteId].csvName,
        corridor_width_m: 6,
        entry_flow_rate_pax_per_min: 60 + surge,
        exit_flow_rate_pax_per_min:  55 + surge * 0.8,
        transport_arrival_burst: 0,
        vehicle_count: 4 + Math.floor(Math.random() * 4),
        queue_density_pax_per_m2: 2.5 + Math.max(0, surge / 6),
        weather: 'Clear',
        festival_peak: 0,
        pressure_index: 8 + Math.max(0, surge),
        hour: new Date(t).getHours(),
      });
    }
    this.sitesData[siteId] = out;
    this.startIdx[siteId]  = 0;
    this.cursor[siteId]    = 0;
    this.history[siteId]   = [];
    this.burst[siteId]     = 0;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  start() { this.running = true; }
  stop()  { this.running = false; }
  reset() {
    for (const id of Object.keys(this.sitesData)) {
      this.cursor[id]  = this.startIdx[id] ?? 0;
      this.history[id] = [];
      this.burst[id]   = 0;
    }
  }

  triggerBurst(siteId, extraVehicles = 20) {
    if (this.sitesData[siteId]) this.burst[siteId] = extraVehicles;
  }

  // ── Tick advancement ──────────────────────────────────────────────────────
  /** Advance one row for the given site and return the enriched tick. */
  advance(siteId) {
    const data = this.sitesData[siteId];
    if (!data || data.length === 0) return null;

    let idx = this.cursor[siteId] ?? 0;
    if (idx >= data.length) idx = this.startIdx[siteId] ?? 0;   // loop dataset
    const raw = { ...data[idx] };

    // Apply pending burst
    const burst = this.burst[siteId] || 0;
    if (burst > 0) {
      raw.vehicle_count = (raw.vehicle_count || 0) + burst;
      raw.transport_arrival_burst = 1;
      this.burst[siteId] = 0;
    }

    this.cursor[siteId] = idx + 1;
    const enriched = this._enrich(siteId, raw);

    // Maintain rolling window
    const hist = this.history[siteId];
    hist.push(enriched);
    if (hist.length > HISTORY_WINDOW) hist.shift();
    return enriched;
  }

  /** Append one row to per-site history and recompute rolling features. */
  _enrich(siteId, raw) {
    const hist = this.history[siteId];
    const prev = hist[hist.length - 1];

    const pressure = raw.pressure_index || 0;
    const prevPressure = prev?.pressure_index ?? pressure;
    const gradient = pressure - prevPressure;

    const last5 = hist.slice(-4).concat([{ ...raw }]);
    const meanEntry5 =
      last5.reduce((s, r) => s + (r.entry_flow_rate_pax_per_min || 0), 0) / last5.length;
    const meanPress5 =
      last5.reduce((s, r) => s + (r.pressure_index || 0), 0) / last5.length;

    return {
      ...raw,
      net_flow: (raw.entry_flow_rate_pax_per_min || 0) - (raw.exit_flow_rate_pax_per_min || 0),
      weather_Heat: raw.weather === 'Heat' ? 1 : 0,
      weather_Rain: raw.weather === 'Rain' ? 1 : 0,
      rolling_mean_entry_5:    meanEntry5,
      rolling_mean_pressure_5: meanPress5,
      pressure_gradient: gradient,
      sudden_spike_flag: gradient > 2.0 ? 1 : 0,
    };
  }

  /** Returns the recent history window for a site (for /predict and /forecast). */
  getHistory(siteId) {
    return this.history[siteId] || [];
  }

  /** Build the forecast window from the rolling history. */
  getForecastWindow(siteId) {
    const h = this.history[siteId] || [];
    const last = h[h.length - 1] || {};
    return {
      pressure_index:              h.map((r) => r.pressure_index || 0),
      entry_flow_rate_pax_per_min: h.map((r) => r.entry_flow_rate_pax_per_min || 0),
      exit_flow_rate_pax_per_min:  h.map((r) => r.exit_flow_rate_pax_per_min  || 0),
      queue_density_pax_per_m2:    h.map((r) => r.queue_density_pax_per_m2    || 0),
      vehicle_count:               h.map((r) => r.vehicle_count               || 0),
      pressure_gradient:           h.map((r) => r.pressure_gradient           || 0),
      // Context for XGBoost anchor
      corridor_width_m:        last.corridor_width_m || 6.0,
      transport_arrival_burst: last.transport_arrival_burst || 0,
      festival_peak:           last.festival_peak || 0,
      hour:                    last.hour || 12,
      weather:                 last.weather || 'Clear',
    };
  }

  progressPct(siteId) {
    const data = this.sitesData[siteId];
    if (!data?.length) return 0;
    return Math.round((this.cursor[siteId] / data.length) * 1000) / 10;
  }
}

// Module-level singleton
export const simulator = new MultiSiteSimulator();
