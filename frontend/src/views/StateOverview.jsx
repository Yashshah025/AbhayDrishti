import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { api, SITES } from '../api'
import { useStateSocket } from '../hooks/useSiteSocket.js'

// Gujarat bounding box centroid
const GUJARAT_CENTER = [22.5, 71.5]

const RISK_COLOR = {
  Low:    { fill: '#22c55e', glow: '0 0 24px rgba(34,197,94,0.7)' },
  Medium: { fill: '#f59e0b', glow: '0 0 28px rgba(245,158,11,0.85)' },
  High:   { fill: '#ef4444', glow: '0 0 36px rgba(239,68,68,0.95)' },
}

export default function StateOverview() {
  const [overview, setOverview] = useState(null)
  const { overview: socketOv, riskEvent, connected } = useStateSocket()
  const navigate = useNavigate()

  // Initial fetch
  useEffect(() => {
    api.stateOverview().then(setOverview).catch(() => setOverview(null))
  }, [])

  // Keep state fresh from sockets
  useEffect(() => { if (socketOv) setOverview(socketOv) }, [socketOv])

  const sites = (overview?.sites?.length ? overview.sites : SITES.map((s) => ({
    ...s, riskLevel: 'Low', pressure: 0, futurePressure: 0, confidence: 0,
  })))

  const counts = sites.reduce((acc, s) => {
    acc[s.riskLevel] = (acc[s.riskLevel] || 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Top bar */}
      <header className="glass rounded-2xl px-5 py-4 flex items-center gap-4">
        <div className="text-3xl">🛡️</div>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-black text-cyan-300 tracking-tight">
            AbhayDrishti C2 — Gujarat State Command
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Home Department · Real-Time Crowd Intelligence ·
            <span className={connected ? 'text-green-400' : 'text-red-400'}>
              {' '}{connected ? '● LIVE' : '● OFFLINE'}
            </span>
            {riskEvent && (
              <span className="text-amber-400 ml-3 animate-pulse">
                ⚠ {riskEvent.siteId}: {riskEvent.from} → {riskEvent.to}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 text-center">
          {['Low', 'Medium', 'High'].map((lvl) => (
            <div key={lvl} className="glass-dark rounded-xl px-3 py-2 min-w-[64px]">
              <p className="text-2xl font-black"
                 style={{ color: RISK_COLOR[lvl].fill }}>
                {counts[lvl] || 0}
              </p>
              <p className="text-[10px] uppercase text-slate-500 tracking-wider">{lvl}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Map + side panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 flex-1 min-h-[600px]">
        {/* Leaflet macro map */}
        <div className="glass rounded-2xl overflow-hidden relative">
          <MapContainer
            center={GUJARAT_CENTER}
            zoom={7}
            style={{ height: '100%', width: '100%', minHeight: 600, background: '#0a1628' }}
            scrollWheelZoom
            zoomControl
          >
            <TileLayer
              attribution='© OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {sites.map((s) => {
              const color = RISK_COLOR[s.riskLevel] || RISK_COLOR.Low
              const scale = s.riskLevel === 'High' ? 1.4 : s.riskLevel === 'Medium' ? 1.2 : 1.0
              const size = 32 * scale

              const customIcon = L.divIcon({
                className: 'custom-pin-marker',
                html: `
                  <div class="pulse-marker risk-${s.riskLevel.toLowerCase()}" style="width: ${size}px; height: ${size}px;">
                    <svg viewBox="0 0 24 24" fill="${color.fill}" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(${color.glow.replace('0 0 24px', '0 0 8px')})">
                      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" stroke="white" stroke-width="0.5"/>
                    </svg>
                  </div>
                `,
                iconSize: [size, size],
                iconAnchor: [size / 2, size],
              })

              return (
                <Marker
                  key={s.id}
                  position={[s.lat, s.lon]}
                  icon={customIcon}
                  eventHandlers={{ click: () => navigate(`/site/${s.id}`) }}
                >
                  <Tooltip direction="top" offset={[0, -size]} opacity={1} permanent={false}>
                    <div className="tooltip-content w-[160px] overflow-hidden">
                      <img 
                        src={`/sites/${s.id}.png`} 
                        alt={s.name} 
                        className="w-full h-24 object-cover border-b border-cyan-500/30"
                      />
                      <div className="p-2">
                        <div className="font-bold text-cyan-200 mb-1">{s.name}</div>
                        <div className="grid grid-cols-2 text-[10px] gap-1">
                          <span className="text-slate-400">Risk Level</span>
                          <b style={{ color: color.fill }}>{s.riskLevel}</b>
                          <span className="text-slate-400">Pressure</span>
                          <span className="font-mono text-cyan-300">{Number(s.pressure).toFixed(1)}</span>
                          <span className="text-slate-400">T+10 Forecast</span>
                          <span className="font-mono" style={{ color: color.fill }}>{Number(s.futurePressure).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              )
            })}
            {/* Connect sites with subtle lines for visual cohesion */}
            <Polyline
              positions={sites.map((s) => [s.lat, s.lon])}
              pathOptions={{ color: '#00d4ff', weight: 1, opacity: 0.25, dashArray: '4 6' }}
            />
          </MapContainer>
        </div>

        {/* Site cards */}
        <aside className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '80vh' }}>
          <p className="section-heading mb-2"><span>📍</span> Monitored Sites</p>
          {sites.map((s) => {
            const color = RISK_COLOR[s.riskLevel] || RISK_COLOR.Low
            return (
              <Link to={`/site/${s.id}`} key={s.id} className="block">
                <motion.div
                  layoutId={`site-card-${s.id}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-dark rounded-xl p-4 border transition-all"
                  style={{ borderColor: color.fill + '40', boxShadow: color.glow }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛕</span>
                      <div>
                        <p className="font-bold text-cyan-200">{s.name}</p>
                        <p className="text-[11px] text-slate-500">{s.district || '—'}</p>
                      </div>
                    </div>
                    <span
                      className="text-xs font-black uppercase px-2 py-1 rounded"
                      style={{ background: color.fill + '22', color: color.fill }}
                    >
                      {s.riskLevel}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Now</p>
                      <p className="text-sm font-mono text-cyan-300">{Number(s.pressure).toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">T+10</p>
                      <p className="text-sm font-mono" style={{ color: color.fill }}>
                        {Number(s.futurePressure).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Conf</p>
                      <p className="text-sm font-mono text-emerald-400">
                        {(Number(s.confidence) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </aside>
      </div>


      <footer className="text-center text-xs text-slate-700 pb-2 mt-2">
        AbhayDrishti C2 · Gujarat Home Department · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
