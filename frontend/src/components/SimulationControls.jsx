import { useState } from 'react'
import { Play, Square, RotateCcw, Zap, Settings, ShieldCheck, Database, Radio } from 'lucide-react'
import { api } from '../api'

export default function SimulationControls({ status, onAction, site = 'SOM' }) {
  const [loading, setLoading] = useState({})
  const [burstVehicles, setBurstVehicles] = useState(20)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const run = async (name, fn) => {
    setLoading(p => ({ ...p, [name]: true }))
    try { await fn(); onAction?.(name) }
    catch { /* error handled elsewhere */ }
    setLoading(p => ({ ...p, [name]: false }))
  }

  const isRunning = status?.simulation_running

  return (
    <div className="glass-premium p-5 rounded-2xl space-y-5 border border-white/5 relative overflow-hidden">
      {/* Decorative pulse glow in corner */}
      <div className={`absolute -right-8 -top-8 w-16 h-16 blur-2xl rounded-full transition-colors duration-1000 ${isRunning ? 'bg-green-500/20' : 'bg-slate-500/10'}`} />

      <p className="section-heading"><span>🎮</span> Tactical Engine Control</p>

      {/* Engine Status & Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between glass-dark rounded-xl px-4 py-4 border border-white/5 relative bg-scan">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-slate-600'}`} />
            <span className={`text-xs font-black tracking-widest ${isRunning ? 'text-green-400' : 'text-slate-500'}`}>
              ENGINE {isRunning ? 'OPERATIONAL' : 'OFFLINE'}
            </span>
          </div>
          {isRunning && (
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-1">Sim Progress</p>
              <p className="text-sm font-black font-mono text-cyan-400 text-glow-cyan">
                {status?.progress_pct?.toFixed(1) || 0}%
              </p>
            </div>
          )}
        </div>

        {/* Tactical Progress rail */}
        {isRunning && (
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 shadow-[0_0_10px_rgba(0,212,255,0.4)] transition-all duration-500"
                 style={{ width: `${status?.progress_pct || 0}%` }} />
          </div>
        )}
      </div>

      {/* Primary Commands */}
      <div className="grid grid-cols-3 gap-3">
        <button className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${isRunning ? 'bg-slate-900/40 border-white/5 text-slate-600 cursor-not-allowed' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 active:scale-95'}`}
                onClick={() => run('start', api.startSim)}
                disabled={isRunning || loading.start}>
          <Play size={18} fill={!isRunning ? "currentColor" : "none"} />
          <span className="text-[10px] font-black uppercase tracking-widest">Initialise</span>
        </button>

        <button className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${!isRunning ? 'bg-slate-900/40 border-white/5 text-slate-600 cursor-not-allowed' : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95 animate-pulse-glow'}`}
                onClick={() => run('stop', api.stopSim)}
                disabled={!isRunning || loading.stop}>
          <Square size={18} fill={isRunning ? "currentColor" : "none"} />
          <span className="text-[10px] font-black uppercase tracking-widest">Abort</span>
        </button>

        <button className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 active:scale-95 transition-all"
                onClick={() => run('reset', api.resetSim)}
                disabled={loading.reset}>
          <RotateCcw size={18} className={loading.reset ? 'animate-spin' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
        </button>
      </div>

      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-500" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex-1">Insertion Layer</p>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-700/50 to-transparent" />
        </div>
        
        <p className="text-[10px] text-slate-600 mb-4 italic leading-tight">
          Force-inject transport surges to validate edge-case risk classification logic.
        </p>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-bold font-mono px-1">
              <span className="text-slate-500 uppercase">Input Volume</span>
              <span className="text-amber-400">{burstVehicles} PAX/UNIT</span>
            </div>
            <input
              type="range" min={5} max={50} step={5}
              value={burstVehicles}
              onChange={e => setBurstVehicles(+e.target.value)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <button
            className={`w-full py-3 rounded-xl border text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${!isRunning ? 'bg-slate-900 border-white/5 text-slate-700 cursor-not-allowed' : 'bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]'}`}
            onClick={() => run('burst', () => api.burst(burstVehicles, site))}
            disabled={!isRunning || loading.burst}
          >
            {loading.burst ? 'INJECTING...' : (
              <>
                <Radio size={14} className="animate-pulse" />
                Trigger Burst Event
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Toggle */}
      <div className="pt-2 border-t border-white/5">
        <button className="flex items-center justify-between w-full text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                onClick={() => setShowAdvanced(v => !v)}>
          <div className="flex items-center gap-2">
            <Settings size={12} />
            Diagnostics {showAdvanced ? '(-)' : '(+)'}
          </div>
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {[
              { label: 'ML Prediction', val: status?.model_ready ? 'Sync OK' : 'No Sync', icon: ShieldCheck, ok: status?.model_ready },
              { label: 'Data Source',  val: 'LOCAL_CSV', icon: Database, ok: true },
              { label: 'Resolution',  val: '1 Min/Tick', icon: Radio, ok: true },
            ].map(i => (
              <div key={i.label} className="bg-black/20 rounded-lg p-2.5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i.icon size={12} className={i.ok ? 'text-cyan-400' : 'text-red-400'} />
                  <span className="text-slate-500 font-bold tracking-tight">{i.label}</span>
                </div>
                <span className={`font-mono font-bold ${i.ok ? 'text-slate-300' : 'text-red-400'}`}>{i.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
