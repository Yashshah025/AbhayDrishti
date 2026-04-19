/**
 * sockets/emitter.js — thin wrapper around Socket.io for clean DI.
 *
 * Rooms:
 *   site:SOM | site:AMB | site:DWA | site:PAV — per-site dashboards
 *   state                                       — macro overview
 *
 * Events:
 *   tick            { siteId, tick, prediction, forecast }
 *   risk_change     { siteId, from, to }
 *   alert_created   { siteId, alert }
 *   alert_escalated { siteId, alert, tier }
 *   alert_acked     { siteId, alert, log }
 *   alert_resolved  { siteId, alert }
 *   state_overview  { sites: [...] }
 */
export class SocketEmitter {
  constructor(io) { this.io = io; }
  emitToSite(siteId, event, payload)  { this.io.to(`site:${siteId}`).emit(event, payload); }
  emitToState(event, payload)         { this.io.to('state').emit(event, payload); }
  broadcast(event, payload)           { this.io.emit(event, payload); }
}

export function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.join('state');
    socket.on('subscribe_site', (siteId) => {
      if (typeof siteId === 'string') socket.join(`site:${siteId}`);
    });
    socket.on('unsubscribe_site', (siteId) => {
      if (typeof siteId === 'string') socket.leave(`site:${siteId}`);
    });
  });
}
