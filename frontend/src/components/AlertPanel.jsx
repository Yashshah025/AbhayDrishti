import { useState } from 'react'
import { api } from '../api'
import { ShieldAlert, Activity, Gauge, Clock, Fingerprint, CheckCircle2 } from 'lucide-react'

const AGENCY_CONFIG = {
  'District Police':  { icon: '🚔', colorClass: 'border-blue-500/50', textColor: 'text-blue-400', bg: 'bg-blue-500/5' },
  'Temple Trust':     { icon: '🛕', colorClass: 'border-purple-500/50', textColor: 'text-purple-400', bg: 'bg-purple-500/5' },
  'GSRTC Transport':  { icon: '🚌', colorClass: 'border-orange-500/50',  textColor: 'text-orange-400', bg: 'bg-orange-500/5' },
}

function AlertCard({ alert, onAcknowledge }) {
  const [acking, setAcking] = useState({})

  const isHigh   = alert.level === 'High'
  const isGenuine = alert.type?.includes('GENUINE')

  const handleAck = async (agency) => {
    setAcking(p => ({ ...p, [agency]: true }))
    try {
      await api.acknowledge(alert.id, agency)
      onAcknowledge(alert.id, agency)
    } catch { /* already ack'd or error */ }
    setAcking(p => ({ ...p, [agency]: false }))
  }

  return (
    <div className={`alert-card glass-premium border-l-4 mb-4 overflow-hidden relative ${isHigh ? 'border-l-red-500 animate-pulse-glow' : 'border-l-amber-500'}`}>
      {/* Decorative vertical lines */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${isHigh ? 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-amber-500/20 text-amber-400'}`}>
                {alert.level} Priority
              </span>
              <span className="text-slate-500 text-[10px] font-mono">#{alert.id.slice(-6)}</span>
            </div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <ShieldAlert size={14} className={isHigh ? 'text-red-500' : 'text-amber-500'} />
              {alert.type}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter flex items-center justify-end gap-1">
              <Clock size={10} /> {alert.timestamp}
            </p>
          </div>
        </div>

        {/* Metrics Pill Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Current', value: (alert.pressure_now || 0).toFixed(1), icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'T+10 Forecast', value: (alert.future_pressure || 0).toFixed(1), icon: Gauge, color: isHigh ? 'text-red-400' : 'text-amber-400', bg: isHigh ? 'bg-red-500/10' : 'bg-amber-500/10' },
            { label: 'Confidence', value: `${((alert.confidence || 0) * 100).toFixed(0)}%`, icon: Fingerprint, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(m => (
            <div key={m.label} className={`${m.bg} rounded-lg p-2 border border-white/5 flex flex-col items-center justify-center`}>
               <div className="flex items-center gap-1 mb-0.5">
                 <m.icon size={10} className="text-slate-500" />
                 <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{m.label}</span>
               </div>
               <span className={`text-sm font-black font-mono ${m.color}`}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* Tactical Info */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 bg-black/20 rounded-md px-3 py-1.5 mb-4 border border-white/5 font-mono">
           <span className="flex items-center gap-1">📍 {alert.location || 'Unknown'}</span>
           <span className="flex items-center gap-1">
             <span className="text-slate-600">Gradient:</span>
             <span className={alert.pressure_gradient > 0 ? 'text-red-400' : 'text-green-400'}>
               {alert.pressure_gradient > 0 ? '+' : ''}{(alert.pressure_gradient || 0).toFixed(2)}
             </span>
           </span>
        </div>

        {/* Agency Action Queue */}
        <div className="space-y-2">
          {Object.entries(alert.actions || {}).map(([agency, action]) => {
            const cfg   = AGENCY_CONFIG[agency] || {}
            const isAck = alert.acknowledged?.[agency]
            const ackTime = alert.ack_times?.[agency]
            return (
              <div key={agency}
                   className={`rounded-lg p-3 border ${isAck ? 'bg-green-500/5 border-green-500/20' : `${cfg.bg} ${cfg.colorClass}`} transition-all duration-300 hover:brightness-125`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">{cfg.icon}</span>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${isAck ? 'text-green-400' : cfg.textColor}`}>
                        {agency}
                      </p>
                      {isAck && <CheckCircle2 size={10} className="text-green-400" />}
                    </div>
                    <p className={`text-[11px] leading-tight ${isAck ? 'text-slate-500 italic' : 'text-slate-300'}`}>
                      {isAck ? `Response coordinated at ${ackTime}` : action}
                    </p>
                  </div>
                  {!isAck && (
                    <button
                      className="btn-ack px-3 py-1.5 rounded-md text-[10px] font-black border uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                      onClick={() => handleAck(agency)}
                      disabled={acking[agency]}
                    >
                      {acking[agency] ? '⏳' : 'Acknowledge'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AlertPanel({ alerts, onAcknowledge, stats }) {
  const displayAlerts = [...alerts].reverse().slice(0, 10)

  return (
    <div className="flex flex-col h-full">
      {/* Stats Header */}
      <div className="flex items-center justify-between mb-4 glass-dark p-3 rounded-2xl border border-white/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        {[
          { label: 'Total Alerts', value: stats?.total_alerts || 0, color: 'text-cyan-400' },
          { label: 'Genuine Crush', value: stats?.genuine_crush || 0, color: 'text-red-400' },
          { label: 'Momentary Surges', value: stats?.momentary_surge || 0, color: 'text-amber-400' },
        ].map((s, idx) => (
          <div key={s.label} className={`flex flex-col items-center px-4 ${idx < 2 ? 'border-r border-white/5' : ''}`}>
            <span className={`text-xl font-black font-mono leading-none ${s.color}`}>
              {s.value < 10 ? `0${s.value}` : s.value}
            </span>
            <span className="text-[8px] uppercase font-bold text-slate-500 tracking-widest mt-1">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Alert List Container */}
      <div className="scroll-panel flex-1 pr-1" style={{ maxHeight: '600px' }}>
        <p className="section-heading mb-4"><span>🛰️</span> Tactical Alert Monitor</p>
        
        {displayAlerts.length === 0 ? (
          <div className="glass-premium rounded-2xl p-8 text-center border-emerald-500/20 bg-emerald-500/5">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="text-emerald-400" size={24} />
              </div>
            </div>
            <h4 className="text-emerald-400 font-black uppercase text-sm tracking-widest">Sector Clear</h4>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">All corridor systems reporting low risk</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onAcknowledge={onAcknowledge} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
