/**
 * core-api / index.js — Express + Socket.io bootstrap.
 *
 * Service responsibilities:
 *   • Multi-site simulator (4 sites, 60s ticks)
 *   • REST gateway for the frontend
 *   • Socket.io push for real-time UI
 *   • MongoDB persistence (Alert, AlertLog, Authority, SensorHistory)
 *   • Tier 1/2/3 escalation state machine
 *   • Internal axios client → ml-service for predict + forecast
 */
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server as SocketServer } from 'socket.io';

import { env } from './config/env.js';
import { simulator } from './simulation/simulator.js';
import { TickScheduler } from './simulation/tickScheduler.js';
import { SocketEmitter, attachSocketHandlers } from './sockets/emitter.js';
import { bindEmitter as bindEscalationEmitter } from './engine/escalation.js';
import { seedAuthorities } from './seed/authorities.js';
import { mlHealth } from './services/mlClient.js';

import { statusRouter }  from './routes/status.js';
import { alertsRouter }  from './routes/alerts.js';
import { sensorRouter }  from './routes/sensor.js';
import { simRouter }     from './routes/sim.js';
import { floorsRouter }  from './routes/floors.js';
import { SensorHistory } from './models/SensorHistory.js';

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('tiny'));

  const httpServer = http.createServer(app);
  const io = new SocketServer(httpServer, { cors: { origin: '*' } });
  attachSocketHandlers(io);
  const emitter = new SocketEmitter(io);
  bindEscalationEmitter(emitter);

  const scheduler = new TickScheduler(emitter);

  // ── Mongo ───────────────────────────────────────────────────────────────
  console.log(`[mongo] connecting to ${env.mongoUrl} ...`);
  await mongoose.connect(env.mongoUrl, { serverSelectionTimeoutMS: 10_000 });
  console.log('[mongo] connected');
  const seeded = await seedAuthorities();
  console.log(`[seed] authorities upserted: ${seeded}`);

  // ── Simulator ───────────────────────────────────────────────────────────
  simulator.load(env.datasetPath);

  // ── Routes ──────────────────────────────────────────────────────────────
  app.get('/healthz', async (_req, res) => {
    const ml = await mlHealth();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      tickCount: scheduler.tickCount,
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      ml,
    });
  });

  app.use('/status',       statusRouter({ scheduler }));
  app.use('/alerts',       alertsRouter());
  app.use('/alert',        alertsRouter()); // alias for POST /alert/acknowledge per spec
  app.use('/sensor',       sensorRouter());
  app.use('/sim',          simRouter({ scheduler }));
  app.use('/simulation',   simRouter({ scheduler })); // legacy alias for existing frontend
  app.use('/floors',       floorsRouter());

  // Replay endpoint preserved for backwards compat with existing ReplayView
  app.get('/replay', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
    const siteId = String(req.query.site || 'SOM').toUpperCase();
    const rows = await SensorHistory.find({ siteId }).sort({ timestamp: -1 }).limit(limit).lean();
    res.json(
      rows.reverse().map((r) => ({
        timestamp: r.timestamp,
        location: siteId,
        pressure_index: r.pressure,
        rolling_mean_pressure_5: r.pressure,
        entry_flow_rate_pax_per_min: r.entry,
        exit_flow_rate_pax_per_min:  r.exit,
        queue_density_pax_per_m2:    r.density,
        vehicle_count: r.vehicles,
        weather: 'Clear',
      })),
    );
  });

  app.use((err, _req, res, _next) => {
    console.error('[err]', err);
    res.status(500).json({ error: err.message });
  });

  // ── Start ───────────────────────────────────────────────────────────────
  httpServer.listen(env.port, () => {
    console.log(`[core-api] listening on :${env.port}`);
  });

  // Auto-start simulation so the dashboard has data immediately
  await scheduler.start();
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
