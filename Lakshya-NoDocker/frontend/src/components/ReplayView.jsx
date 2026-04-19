import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts'

export default function ReplayView({ data = [] }) {
  if (!data.length) {
    return (
      <div className="glass-dark rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🎞️</div>
        <p className="text-slate-400 font-semibold">No replay data yet</p>
        <p className="text-xs text-slate-600 mt-1">Start the simulation to generate replay data.</p>
      </div>
    )
  }

  // Derived stats for replay
  const pressures = data.map(d => parseFloat(d.pressure_index || 0))
  const maxPress  = Math.max(...pressures)
  const avgPress  = pressures.reduce((a, b) => a + b, 0) / pressures.length

  const spikes    = data.filter(d => +d.sudden_spike_flag === 1)

  // Bucket pressure values for histogram
  const bucketCount = 20
  const bucketSize  = maxPress / bucketCount
  const histogram   = Array.from({ length: bucketCount }, (_, i) => ({
    range: `${(i * bucketSize).toFixed(0)}–${((i + 1) * bucketSize).toFixed(0)}`,
    count: data.filter(d => {
      const p = parseFloat(d.pressure_index || 0)
      return p >= i * bucketSize && p < (i + 1) * bucketSize
    }).length,
  }))

  // Timeline sampled at every 10th point for density chart
  const timeline = data
    .filter((_, i) => i % Math.max(1, Math.floor(data.length / 120)) === 0)
    .map((d, i) => ({
      i,
      pressure: parseFloat(d.pressure_index || 0),
      density:  parseFloat(d.queue_density_pax_per_m2 || 0),
    }))

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Ticks',   value: data.length,         color: 'text-cyan-400' },
          { label: 'Max Pressure',  value: maxPress.toFixed(1), color: 'text-red-400' },
          { label: 'Avg Pressure',  value: avgPress.toFixed(1), color: 'text-amber-400' },
          { label: 'Spike Events',  value: spikes.length,       color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass-dark rounded-xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pressure histogram */}
      <div>
        <p className="section-heading mb-3"><span>📊</span> Pressure Distribution</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={histogram} margin={{ top: 4, right: 8, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
            <XAxis dataKey="range" tick={{ fontSize: 9 }} interval={3} stroke="transparent" />
            <YAxis tick={{ fontSize: 9 }} stroke="transparent" />
            <Tooltip
              contentStyle={{ background: '#0b1629', border: '1px solid rgba(0,212,255,0.2)',
                              borderRadius: '10px', fontSize: '11px' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="count" name="Ticks" fill="#00d4ff" opacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Density vs Pressure scatter */}
      <div>
        <p className="section-heading mb-3"><span>🌡️</span> Density vs Pressure Timeline</p>
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={{ top: 4, right: 8, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
            <XAxis dataKey="i" name="Tick" tick={{ fontSize: 9 }} stroke="transparent" />
            <YAxis dataKey="pressure" name="Pressure" tick={{ fontSize: 9 }} stroke="transparent" />
            <ZAxis dataKey="density" range={[20, 200]} />
            <Tooltip cursor={{ stroke: 'rgba(0,212,255,0.3)' }}
                     contentStyle={{ background: '#0b1629',
                                     border: '1px solid rgba(0,212,255,0.2)',
                                     borderRadius: '10px', fontSize: '11px' }} />
            <Scatter name="Ticks" data={timeline} fill="#a855f7" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Event log */}
      {spikes.length > 0 && (
        <div>
          <p className="section-heading mb-3"><span>⚡</span> Spike Event Log ({spikes.length} events)</p>
          <div className="scroll-panel max-h-48 space-y-1.5">
            {spikes.slice(-20).reverse().map((d, i) => (
              <div key={i} className="glass-dark rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">
                  {String(d.timestamp || '').slice(11, 16)}
                </span>
                <span className="text-slate-400">{d.location || '—'}</span>
                <span className="text-red-400 font-bold">
                  P={parseFloat(d.pressure_index || 0).toFixed(1)}
                </span>
                <span className="text-purple-400">
                  ΔP={parseFloat(d.pressure_gradient || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
