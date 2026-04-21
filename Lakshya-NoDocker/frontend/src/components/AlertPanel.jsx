import { useState } from 'react'
import { api } from '../api'

const AGENCY_CONFIG = {
  'District Police':  { icon: '🚔', colorClass: 'agency-border-police', textColor: 'text-blue-400' },
  'Temple Trust':     { icon: '🛕', colorClass: 'agency-border-temple', textColor: 'text-purple-400' },
  'GSRTC Transport':  { icon: '🚌', colorClass: 'agency-border-gsrtc',  textColor: 'text-orange-400' },
}

function AlertCard({ alert, onAcknowledge }) {
  const [acking, setAcking] = useState({})

  const isHigh   = alert.level === 'High'
  const isGenuine = alert.type?.includes('GENUINE')

  const levelStyle =
    isHigh  ? 'border-red-500/40 bg-red-500/5'   :
              'border-amber-500/40 bg-amber-500/5'

  const badgeStyle = isHigh
    ? 'risk-badge risk-high'
    : 'risk-badge risk-medium'

  const handleAck = async (agency) => {
    setAcking(p => ({ ...p, [agency]: true }))
    try {
      await api.acknowledge(alert.id, agency)
      onAcknowledge(alert.id, agency)
    } catch { /* already ack'd or error */ }
    setAcking(p => ({ ...p, [agency]: false }))
  }

  return (
    <div className={`alert-card glass-dark border rounded-xl p-4 mb-3 ${levelStyle}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={badgeStyle}>
            {isHigh ? '🔴' : '🟡'} {alert.level} — {alert.type}
          </span>
          {isGenuine && (
            <span className="risk-badge risk-high text-[10px] py-0.5">
              ⚠ GENUINE CRUSH
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
          #{alert.id} · {alert.timestamp}
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="glass-dark rounded-lg p-2">
          <p className="text-xs text-slate-500">Now</p>
          <p className="text-sm font-black text-cyan-300">
            {(alert.pressure_now || 0).toFixed(1)}
          </p>
        </div>
        <div className="glass-dark rounded-lg p-2">
          <p className="text-xs text-slate-500">T+10 min</p>
          <p className={`text-sm font-black ${isHigh ? 'text-red-400' : 'text-amber-400'}`}>
            {(alert.future_pressure || 0).toFixed(1)}
          </p>
        </div>
        <div className="glass-dark rounded-lg p-2">
          <p className="text-xs text-slate-500">Confidence</p>
          <p className="text-sm font-black text-emerald-400">
            {((alert.confidence || 0) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Location */}
      {alert.location && (
        <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
          📍 {alert.location} &nbsp;|&nbsp;
          Gradient: <span className="font-mono text-cyan-400">
            {(alert.pressure_gradient || 0).toFixed(2)}
          </span>
        </p>
      )}

      {/* Agency Actions */}
      <div className="space-y-2">
        {Object.entries(alert.actions || {}).map(([agency, action]) => {
          const cfg   = AGENCY_CONFIG[agency] || {}
          const isAck = alert.acknowledged?.[agency]
          const ackTime = alert.ack_times?.[agency]
          return (
            <div key={agency}
                 className={`agency-action-card glass-dark rounded-lg p-3 ${cfg.colorClass}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold mb-1 ${cfg.textColor}`}>
                    {cfg.icon} {agency}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">{action}</p>
                  {isAck && ackTime && (
                    <p className="text-xs text-green-400 mt-1 font-mono">
                      ✅ Acknowledged at {ackTime}
                    </p>
                  )}
                </div>
                {isAck ? (
                  <span className="text-green-400 text-lg">✓</span>
                ) : (
                  <button
                    className="btn-ack flex-shrink-0"
                    onClick={() => handleAck(agency)}
                    disabled={acking[agency]}
                  >
                    {acking[agency] ? '…' : 'ACK'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AlertPanel({ alerts, onAcknowledge, stats }) {
  const displayAlerts = [...alerts].reverse().slice(0, 8)

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Total',   value: stats?.total_alerts  || 0, color: 'text-cyan-400' },
          { label: 'Genuine', value: stats?.genuine_crush || 0, color: 'text-red-400' },
          { label: 'Surges',  value: stats?.momentary_surge || 0, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="glass-dark rounded-xl p-2 text-center">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="scroll-panel flex-1" style={{ maxHeight: '520px' }}>
        <p className="section-heading mb-3"><span>🚨</span> Active Alerts</p>
        {displayAlerts.length === 0 ? (
          <div className="glass-dark rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-400 font-semibold">All Systems Normal</p>
            <p className="text-xs text-slate-500 mt-1">No active alerts</p>
          </div>
        ) : (
          displayAlerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} onAcknowledge={onAcknowledge} />
          ))
        )}
      </div>
    </div>
  )
}
