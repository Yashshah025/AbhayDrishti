import { Router } from 'express';

export function simRouter({ scheduler }) {
  const r = Router();
  r.post('/start', async (_req, res) => { await scheduler.start(); res.json({ message: 'Simulation started', running: true }); });
  r.post('/stop',  async (_req, res) => { scheduler.stop(); res.json({ message: 'Simulation stopped', running: false }); });
  r.post('/reset', async (_req, res) => { await scheduler.reset(); res.json({ message: 'Simulation reset' }); });
  r.post('/burst', async (req, res) => {
    const site = String(req.query.site || req.body?.site || 'SOM').toUpperCase();
    const vehicles = parseInt(req.query.vehicles || req.body?.vehicles || '20', 10);
    const { simulator } = await import('../simulation/simulator.js');
    simulator.triggerBurst(site, vehicles);
    res.json({ message: `Burst injected: +${vehicles} vehicles at ${site}`, site, vehicles });
  });

  // Legacy-compatible aliases used by existing SimulationControls.jsx
  return r;
}
