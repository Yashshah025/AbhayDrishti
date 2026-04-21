/**
 * escalation.js — Tier 1/2/3 state machine.
 *
 * 1 tick = env.tickSeconds (default 60s).
 *
 *   Tier 1 (tick 0)   : District Police, Temple Trust, GSRTC.
 *   Tier 2 (+5 ticks) : if any Tier 1 unacked → +District Collector, Health Dept.
 *   Tier 3 (+10 ticks): if level==='High' and not all acked → +GSDMA, SDRF, NDRF.
 *
 * Emits via socket emitter:
 *   alert_created   { siteId, alert }
 *   alert_escalated { siteId, alert, tier }
 *   alert_acked     { siteId, alert, log }
 *   alert_resolved  { siteId, alert }
 */
import { Alert }     from '../models/Alert.js';
import { AlertLog }  from '../models/AlertLog.js';
import { Authority } from '../models/Authority.js';
import { classifyAlert, tier2ActionsFor, tier3ActionFor } from './alertBuilder.js';
import { env } from '../config/env.js';

let emitter = null;
export function bindEmitter(em) { emitter = em; }

const safeEmit = (event, payload) => {
  if (emitter?.emitToSite) emitter.emitToSite(payload.siteId, event, payload);
  if (emitter?.emitToState) emitter.emitToState(event, payload);
};

const lowRiskCounters = {};

/**
 * Per-tick evaluation: decides if a new alert should be created and
 * whether existing open alerts should escalate. Also handles auto-resolution.
 *
 * @param {string} rawSiteId
 * @param {object} tick    enriched simulator row
 * @param {object} pred    ml-service /predict response
 * @param {number[]} forecast 15-min forecast (or [])
 * @param {number} currentTick global tick counter
 */
export async function evaluate(rawSiteId, tick, pred, forecast, currentTick) {
  const siteId = rawSiteId.toUpperCase();

  // 1) Existing open alerts → check escalation
  const openAlerts = await Alert.find({ siteId, status: 'open' });
  for (const a of openAlerts) await maybeEscalate(a, currentTick);

  // 2) New alert?
  const cls = classifyAlert(tick, pred);

  // 3) Smart Auto-Resolution Logic
  // If risk is 'Low' for 3 consecutive ticks, resolve any open alerts for this site.
  if (pred.risk_level === 'Low') {
    lowRiskCounters[siteId] = (lowRiskCounters[siteId] || 0) + 1;
    if (lowRiskCounters[siteId] >= 3 && openAlerts.length > 0) {
      console.log(`[escalation] Auto-resolving ${openAlerts.length} alerts for ${siteId} after 3 mins of safety.`);
      for (const a of openAlerts) {
        await resolve(a._id, 'system-auto');
      }
      lowRiskCounters[siteId] = 0; // reset after resolution
    }
  } else {
    // Risk is Med or High — reset the safety counter
    lowRiskCounters[siteId] = 0;
  }

  if (!cls) return;

  // Suppress duplicate: if open alert of same level exists within last 5 ticks, skip.
  const recent = openAlerts.find(
    (a) => a.level === cls.level && currentTick - a.createdTick < 5,
  );
  if (recent) return;

  const alert = await Alert.create({
    siteId,
    createdTick: currentTick,
    level:       cls.level,
    type:        cls.type,
    pressureNow:       Number(tick.pressure_index || 0),
    futurePressureT10: Number(pred.future_pressure || 0),
    pressureGradient:  Number(tick.pressure_gradient || 0),
    confidence:        Number(pred.confidence || 0),
    forecast:          Array.isArray(forecast) ? forecast : [],
    currentTier: 1,
  });

  // Notify all Tier 1 authorities for this site
  const tier1 = await Authority.find({ tier: 1, siteId });
  await notifyAuthorities(alert, tier1, 1, cls.actions);

  safeEmit('alert_created', { siteId, alert: alert.toObject() });
}

async function notifyAuthorities(alert, authorities, tier, actionsByAgency) {
  if (!authorities.length) return;
  const docs = authorities.map((a) => ({
    alertId:       alert._id,
    siteId:        alert.siteId,
    authorityId:   a._id,
    authorityName: a.name,
    agency:        a.agency,
    tier,
    action: actionsByAgency?.[a.agency] || tier3ActionFor(a.agency),
    notifiedAt: new Date(),
  }));
  // upsert each (alertId, authorityId) pair
  await Promise.all(
    docs.map((d) =>
      AlertLog.updateOne(
        { alertId: d.alertId, authorityId: d.authorityId },
        { $setOnInsert: d },
        { upsert: true },
      ),
    ),
  );
}

async function maybeEscalate(alert, currentTick) {
  const ageTicks = currentTick - alert.createdTick;

  // Are all Tier 1 acked?
  const tier1Logs = await AlertLog.find({ alertId: alert._id, tier: 1 });
  const allTier1Acked = tier1Logs.length > 0 && tier1Logs.every((l) => l.ackAt);

  // Tier 2 trigger
  if (
    alert.currentTier < 2 &&
    ageTicks >= env.tier2AfterTicks &&
    !allTier1Acked
  ) {
    const t2 = await Authority.find({ tier: 2, siteId: alert.siteId });
    await notifyAuthorities(alert, t2, 2, tier2ActionsFor(alert.level));
    alert.currentTier = 2;
    await alert.save();
    safeEmit('alert_escalated', { siteId: alert.siteId, alert: alert.toObject(), tier: 2 });
  }

  // Tier 3 trigger (state-wide; ignores siteId for authorities)
  const tier12Logs = await AlertLog.find({ alertId: alert._id, tier: { $in: [1, 2] } });
  const allLowerAcked = tier12Logs.length > 0 && tier12Logs.every((l) => l.ackAt);

  if (
    alert.currentTier < 3 &&
    ageTicks >= env.tier3AfterTicks &&
    alert.level === 'High' &&
    !allLowerAcked
  ) {
    const t3 = await Authority.find({ tier: 3 });
    await notifyAuthorities(alert, t3, 3, null);
    alert.currentTier = 3;
    await alert.save();
    safeEmit('alert_escalated', { siteId: alert.siteId, alert: alert.toObject(), tier: 3 });
  }
}

export async function acknowledge(alertId, authorityId) {
  const log = await AlertLog.findOne({ alertId, authorityId });
  if (!log) throw new Error('AlertLog not found');
  if (log.ackAt) return log; // already acked — idempotent

  const now = new Date();
  log.ackAt = now;
  log.responseTimeSeconds = Math.round((now - log.notifiedAt) / 1000);
  await log.save();

  const alert = await Alert.findById(alertId);
  safeEmit('alert_acked', {
    siteId: alert.siteId,
    alert: alert?.toObject(),
    log: log.toObject(),
  });
  return log;
}

export async function resolve(alertId, by = 'operator') {
  const alert = await Alert.findById(alertId);
  if (!alert || alert.status === 'resolved') return alert;
  alert.status = 'resolved';
  alert.resolvedAt = new Date();
  alert.resolvedBy = by;
  await alert.save();
  safeEmit('alert_resolved', { siteId: alert.siteId, alert: alert.toObject() });
  return alert;
}
