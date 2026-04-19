import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-dark px-3 py-2 text-xs border border-cyan-500/20 rounded-xl shadow-xl">
      <p className="text-slate-400 mb-1 font-mono">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function PressureChart({ data = [] }) {
  const sliced = data.slice(-120) // last 120 ticks visible

  // Format timestamp
  const formatted = sliced.map((d, i) => ({
    ...d,
    _tick: i,
    _label: d.timestamp ? String(d.timestamp).slice(11, 16) : `t-${sliced.length - i}`,
    pressure_index:        parseFloat(d.pressure_index || 0),
    rolling_mean_pressure_5: parseFloat(d.rolling_mean_pressure_5 || 0),
    entry_flow_rate_pax_per_min: parseFloat(d.entry_flow_rate_pax_per_min || 0),
    exit_flow_rate_pax_per_min:  parseFloat(d.exit_flow_rate_pax_per_min  || 0),
  }))

  const maxPressure = Math.max(...formatted.map(d => d.pressure_index), 50)

  return (
    <div className="space-y-4">
      {/* Pressure Chart */}
      <div>
        <p className="section-heading">
          <span>📈</span> Live Pressure Index
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="rollGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
            <XAxis dataKey="_label" tick={{ fontSize: 10 }}
                   interval={Math.max(1, Math.floor(formatted.length / 10))}
                   stroke="transparent" />
            <YAxis domain={[0, maxPressure * 1.15]} tick={{ fontSize: 10 }} stroke="transparent" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={60}  stroke="#ef4444" strokeDasharray="6 3"
                           label={{ value: 'HIGH RISK', fill: '#ef4444', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={30}  stroke="#f59e0b" strokeDasharray="6 3"
                           label={{ value: 'WARN',      fill: '#f59e0b', fontSize: 9, position: 'right' }} />
            <Area type="monotone" dataKey="pressure_index"
                  name="Pressure" stroke="#00d4ff" strokeWidth={2.5}
                  fill="url(#pressGrad)" dot={false} activeDot={{ r: 4, fill: '#00d4ff' }} />
            <Area type="monotone" dataKey="rolling_mean_pressure_5"
                  name="5-min Avg" stroke="#f59e0b" strokeWidth={1.5}
                  fill="url(#rollGrad)" dot={false} strokeDasharray="5 3" />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '4px' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Flow Chart */}
      <div>
        <p className="section-heading">
          <span>🚶</span> Entry vs Exit Flow
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={formatted} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
            <XAxis dataKey="_label" tick={{ fontSize: 10 }}
                   interval={Math.max(1, Math.floor(formatted.length / 10))}
                   stroke="transparent" />
            <YAxis tick={{ fontSize: 10 }} stroke="transparent" />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="entry_flow_rate_pax_per_min"
                  name="Entry (pax/min)" stroke="#22c55e" strokeWidth={2}
                  dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="exit_flow_rate_pax_per_min"
                  name="Exit (pax/min)" stroke="#a855f7" strokeWidth={2}
                  dot={false} strokeDasharray="4 2" activeDot={{ r: 3 }} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '4px' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
