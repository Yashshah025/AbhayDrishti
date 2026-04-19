/**
 * alertBuilder.js — JS port of backend/engine.py.
 *
 * Decides whether a tick + ML prediction warrants creating a new alert,
 * and builds the agency action templates (kept identical to the original
 * Python templates so existing AlertPanel.jsx renders unchanged).
 */

const AGENCY_ACTIONS = {
  High: {
    genuine: {
      'District Police':  'Deploy officers immediately to chokepoint. Force-exit overflow.',
      'Temple Trust':     'HALT darshan entry NOW. Activate overflow holding zone.',
      'GSRTC Transport':  'HOLD all incoming vehicles at 3 km checkpoint. No new arrivals.',
    },
    surge: {
      'District Police':  'Monitor corridor exits. Prepare rapid response.',
      'Temple Trust':     'Slow darshan entry — reduce gate throughput by 40 %.',
      'GSRTC Transport':  'Delay bus departures by 15 minutes. Advise passengers.',
    },
  },
  Medium: {
    genuine: {
      'District Police':  'Increase visibility at corridor; begin crowd diversion.',
      'Temple Trust':     'Redirect pilgrims to alternate entry. Slow inner gate.',
      'GSRTC Transport':  'Stage vehicles at holding area. Await further instructions.',
    },
    surge: {
      'District Police':  'Monitor and log — no action required yet.',
      'Temple Trust':     'Observe flow; prepared to slow inner gate if needed.',
      'GSRTC Transport':  'Standard operations — track arrival schedule.',
    },
  },
};

// Templates for higher tiers (added when escalation fires)
const TIER2_ACTIONS = {
  High: {
    'District Collector': 'Activate emergency operations centre. Coordinate cross-agency response.',
    'Health Dept':        'Position 4+ ambulances at temple gates. Standby trauma team.',
  },
  Medium: {
    'District Collector': 'Open situation room. Brief key stakeholders.',
    'Health Dept':        'Position 2 ambulances at staging zone.',
  },
};

const TIER3_ACTIONS = {
  GSDMA: 'Initiate state-level response protocol. Brief Home Department.',
  SDRF:  'Mobilize SDRF crowd-control unit to site within 30 minutes.',
  NDRF:  'Place NDRF Battalion on standby for deployment.',
};

export function classifyAlert(tick, prediction) {
  const level    = prediction.risk_level;
  const gradient = tick.pressure_gradient ?? 0;
  const density  = tick.queue_density_pax_per_m2 ?? 0;

  if (level === 'Low') return null;

  const isGenuine =
    (level === 'High'   && gradient > 2.0 && density > 3.5) ||
    (level === 'Medium' && gradient > 3.0 && density > 4.0);

  const type = isGenuine ? 'GENUINE CRUSH RISK' : 'MOMENTARY SURGE';
  const tableForLevel = AGENCY_ACTIONS[level] || AGENCY_ACTIONS.Medium;
  const actions = tableForLevel[isGenuine ? 'genuine' : 'surge'];

  return { level, type, isGenuine, actions };
}

export function tier2ActionsFor(level) {
  return TIER2_ACTIONS[level] || TIER2_ACTIONS.Medium;
}

export function tier3ActionFor(agency) {
  return TIER3_ACTIONS[agency] || 'Stand by for instructions.';
}
