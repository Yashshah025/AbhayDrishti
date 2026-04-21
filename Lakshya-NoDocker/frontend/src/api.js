// API base — in Docker, nginx proxies /api → core-api:4000
// Locally (vite dev), set VITE_API_URL=http://localhost:4000
import { io } from 'socket.io-client'

const BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:4000' : '/api')

const SOCKET_BASE =
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin)

const req = (path, opts = {}) =>
  fetch(`${BASE}${path}`, opts).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

const json = (path, body, method = 'POST') =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

export const SITES = [
  { id: 'SOM', name: 'Somnath',  lat: 20.888, lon: 70.401 },
  { id: 'AMB', name: 'Ambaji',   lat: 24.333, lon: 72.850 },
  { id: 'DWA', name: 'Dwarka',   lat: 22.238, lon: 68.968 },
  { id: 'PAV', name: 'Pavagadh', lat: 22.461, lon: 73.513 },
]

export const api = {
  // State / status
  stateOverview:  ()       => req('/status/state-overview'),
  status:         (site = 'SOM') => req(`/status?site=${site}`),

  // Alerts
  alerts:         (site)   => req(`/alerts${site ? `?site=${site}` : ''}`),
  alertStats:     (site)   => req(`/alerts/stats${site ? `?site=${site}` : ''}`),
  audit:          (site, limit = 200) =>
    req(`/alerts/audit?${site ? `site=${site}&` : ''}limit=${limit}`),

  // Acknowledge — supports both legacy (agency) and new (authorityId) paths
  acknowledge:    (id, agencyOrPayload) => {
    if (typeof agencyOrPayload === 'string') {
      return req(`/alerts/acknowledge?alert_id=${id}&agency=${encodeURIComponent(agencyOrPayload)}`,
                 { method: 'POST' })
    }
    return json('/alert/acknowledge', { alertId: id, ...agencyOrPayload })
  },
  resolve:        (id, by = 'operator') => json('/alert/resolve', { alertId: id, by }),

  // Sensor history (chart data)
  sensorHistory:  (site = 'SOM', minutes = 120) =>
    req(`/sensor/history?site=${site}&minutes=${minutes}`),
  replay:         (limit = 150, site = 'SOM') =>
    req(`/replay?site=${site}&limit=${limit}`),

  // Simulation control
  startSim:       () => req('/sim/start',  { method: 'POST' }),
  stopSim:        () => req('/sim/stop',   { method: 'POST' }),
  resetSim:       () => req('/sim/reset',  { method: 'POST' }),
  burst:          (vehicles = 20, site = 'SOM') =>
    req(`/sim/burst?site=${site}&vehicles=${vehicles}`, { method: 'POST' }),

  // Floor geojson (M5 tactical map)
  floorUrl:       (site) => `${BASE}/floors/${site}.geojson`,
}

// ── Socket helpers ──────────────────────────────────────────────────────────
let socket
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_BASE, { transports: ['websocket', 'polling'] })
  }
  return socket
}
