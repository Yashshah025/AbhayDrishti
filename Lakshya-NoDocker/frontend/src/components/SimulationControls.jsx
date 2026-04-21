import { useState } from 'react'
import { Play, Square, RotateCcw, Zap, Settings } from 'lucide-react'
import { api } from '../api'

export default function SimulationControls({ status, onAction, site = 'SOM' }) {
  const [loading, setLoading] = useState({})
  const [burstVehicles, setBurstVehicles] = useState(20)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const run = async (name, fn) => {
    setLoading(p => ({ ...p, [name]: true }))
    try { await fn(); onAction?.() }
    catch { /* error handled elsewhere */ }
    setLoading(p => ({ ...p, [name]: false }))
  }

  const isRunning = status?.simulation_running

  return (
    <div className="glass p-5 rounded-2xl space-y-4">
      <p className="section-heading"><span>🎮</span> Simulation Control</p>

      {/* Status */}
      <div className="flex items-center justify-between glass-dark rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`pulse-dot ${isRunning ? 'pulse-green' : 'pulse-gray'}`} />
          <span className="text-sm font-semibold">
            {isRunning ? 'RUNNING' : 'STOPPED'}
          </span>
        </div>
        {isRunning && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Progress</p>
            <p className="text-sm font-mono text-cyan-400">
              {status?.progress_pct?.toFixed(1) || 0}%
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="conf-bar-track">
          <div className="conf-bar-fill"
               style={{
                 width: `${status?.progress_pct || 0}%`,
                 background: 'linear-gradient(90deg, #0070c8, #00d4ff)',
               }} />
        </div>
      )}

      {/* Main buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button className="btn-primary btn-sm"
                onClick={() => run('start', api.startSim)}
                disabled={isRunning || loading.start}>
          <Play className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
          Start
        </button>
        <button className="btn-danger btn-sm"
                onClick={() => run('stop', api.stopSim)}
                disabled={!isRunning || loading.stop}>
          <Square className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
          Stop
        </button>
        <button className="btn-ghost btn-sm"
                onClick={() => run('reset', api.resetSim)}
                disabled={loading.reset}>
          <RotateCcw className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
          Reset
        </button>
      </div>

      <hr className="border-slate-700/50" />

      {/* What-if Burst */}
      <div>
        <p className="section-heading"><span>⚡</span> What-If Scenario</p>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Simulate a sudden GSRTC transport arrival burst — tests system resilience
          and validates genuine-crush vs surge classification.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-slate-400 whitespace-nowrap">Vehicles:</label>
          <input
            type="range" min={5} max={50} step={5}
            value={burstVehicles}
            onChange={e => setBurstVehicles(+e.target.value)}
            className="flex-1 accent-cyan-400"
          />
          <span className="text-sm font-bold text-cyan-400 w-8 text-right">{burstVehicles}</span>
        </div>

        <button
          className="w-full btn-danger"
          onClick={() => run('burst', () => api.burst(burstVehicles, site))}
          disabled={!isRunning || loading.burst}
        >
          <Zap className="w-4 h-4 inline -mt-0.5 mr-2" />
          Inject Burst (+{burstVehicles} Vehicles)
        </button>
      </div>

      <hr className="border-slate-700/50" />

      {/* System info */}
      <button className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-400"
              onClick={() => setShowAdvanced(v => !v)}>
        <Settings className="w-3.5 h-3.5" />
        System Info {showAdvanced ? '▲' : '▼'}
      </button>

      {showAdvanced && (
        <div className="glass-dark rounded-xl p-3 space-y-1.5 text-xs animate-fade-in">
          {[
            ['Model Ready',   status?.model_ready ? '✅ Yes' : '❌ No'],
            ['Location',      status?.location || '—'],
            ['Corridor',      status?.corridor_width ? `${status.corridor_width} m` : '—'],
            ['Tick Speed',    '2 s / minute'],
            ['Dataset',       'minute_level_dataset.csv'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-slate-500">{k}</span>
              <span className="text-slate-300 font-mono">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
