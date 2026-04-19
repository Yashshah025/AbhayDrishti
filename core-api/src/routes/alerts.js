import { Router } from 'express';
import { Alert }    from '../models/Alert.js';
import { AlertLog } from '../models/AlertLog.js';
import { Authority } from '../models/Authority.js';
import { acknowledge, resolve } from '../engine/escalation.js';

export function alertsRouter() {
  const r = Router();

  // List recent alerts (optionally per site). Shape backwards-compatible with
  // the existing AlertPanel.jsx (id, level, type, actions, acknowledged map).
  r.get('/', async (req, res) => {
    const q = {};
    if (req.query.site) q.siteId = String(req.query.site).toUpperCase();
    if (req.query.status) q.status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const alerts = await Alert.find(q).sort({ createdAt: -1 }).limit(limit).lean();

    const ids = alerts.map((a) => a._id);
    const logs = await AlertLog.find({ alertId: { $in: ids } }).lean();
    const logsByAlert = logs.reduce((acc, l) => {
      (acc[l.alertId.toString()] ||= []).push(l);
      return acc;
    }, {});

    const out = alerts.map((a) => {
      const myLogs = logsByAlert[a._id.toString()] || [];
      const actions = {};
      const acknowledged = {};
      const ack_times = {};
      const authorities = [];
      for (const l of myLogs) {
        actions[l.agency] = l.action;
        acknowledged[l.agency] = Boolean(l.ackAt);
        if (l.ackAt) ack_times[l.agency] = new Date(l.ackAt).toLocaleTimeString();
        authorities.push({
          authorityId: l.authorityId,
          authorityName: l.authorityName,
          agency: l.agency,
          tier: l.tier,
          notifiedAt: l.notifiedAt,
          ackAt: l.ackAt,
          responseTimeSeconds: l.responseTimeSeconds,
          action: l.action,
        });
      }
      return {
        id: a._id,
        _id: a._id,
        siteId: a.siteId,
        timestamp: new Date(a.createdAt).toLocaleTimeString(),
        timestamp_epoch: new Date(a.createdAt).getTime() / 1000,
        location: a.siteId,
        level: a.level,
        type: a.type,
        pressure_now: a.pressureNow,
        future_pressure: a.futurePressureT10,
        pressure_gradient: a.pressureGradient,
        confidence: a.confidence,
        forecast: a.forecast,
        currentTier: a.currentTier,
        status: a.status,
        actions,
        acknowledged,
        ack_times,
        authorities,
      };
    });
    res.json(out);
  });

  r.get('/stats', async (req, res) => {
    const q = {};
    if (req.query.site) q.siteId = String(req.query.site).toUpperCase();
    const [total, genuine, high, medium, openCount, tier3] = await Promise.all([
      Alert.countDocuments(q),
      Alert.countDocuments({ ...q, type: 'GENUINE CRUSH RISK' }),
      Alert.countDocuments({ ...q, level: 'High' }),
      Alert.countDocuments({ ...q, level: 'Medium' }),
      Alert.countDocuments({ ...q, status: 'open' }),
      Alert.countDocuments({ ...q, currentTier: 3 }),
    ]);
    res.json({
      total_alerts: total,
      genuine_crush: genuine,
      momentary_surge: total - genuine,
      high_risk: high,
      medium_risk: medium,
      open: openCount,
      tier3: tier3,
    });
  });

  // Legacy ack: ?alert_id=&agency= — looks up authority by (siteId, agency)
  r.post('/acknowledge', async (req, res) => {
    try {
      const alertId = req.query.alert_id || req.body?.alertId;
      const agency  = req.query.agency   || req.body?.agency;
      let authorityId = req.body?.authorityId;

      if (!authorityId) {
        const alert = await Alert.findById(alertId);
        if (!alert) return res.status(404).json({ error: 'alert not found' });
        const auth = await Authority.findOne({ siteId: alert.siteId, agency });
        if (!auth) return res.status(404).json({ error: `no authority for ${agency}` });
        authorityId = auth._id;
      }
      const log = await acknowledge(alertId, authorityId);
      res.json({ success: true, alertId, authorityId, log });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.post('/resolve', async (req, res) => {
    try {
      const alertId = req.body?.alertId || req.query.alert_id;
      const by = req.body?.by || req.query.by || 'operator';
      const a = await resolve(alertId, by);
      res.json({ success: true, alert: a });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Audit trail dump (useful for the auditor view + tests)
  r.get('/audit', async (req, res) => {
    const q = {};
    if (req.query.site) q.siteId = String(req.query.site).toUpperCase();
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
    const logs = await AlertLog.find(q).sort({ notifiedAt: -1 }).limit(limit).lean();
    res.json(logs);
  });

  return r;
}
