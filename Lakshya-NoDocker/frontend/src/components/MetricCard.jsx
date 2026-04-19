export default function MetricCard({ icon, label, value, unit = '', sub, accent = 'cyan', trend }) {
  const accentMap = {
    cyan:   'from-cyan-500/20 to-transparent border-cyan-500/20',
    green:  'from-green-500/20 to-transparent border-green-500/20',
    amber:  'from-amber-500/20 to-transparent border-amber-500/20',
    red:    'from-red-500/20 to-transparent border-red-500/20',
    purple: 'from-purple-500/20 to-transparent border-purple-500/20',
  }
  const textMap = {
    cyan:   'text-cyan-300',
    green:  'text-green-400',
    amber:  'text-amber-400',
    red:    'text-red-400',
    purple: 'text-purple-400',
  }

  return (
    <div className={`metric-card glass p-4 border bg-gradient-to-br ${accentMap[accent] || accentMap.cyan}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{label}</span>
        <span className={`text-xl ${textMap[accent] || textMap.cyan}`}>{icon}</span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-black tabular-nums ${textMap[accent] || textMap.cyan}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
        {trend !== undefined && (
          <span className={`text-xs font-semibold ml-auto ${trend >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
          </span>
        )}
      </div>

      {/* Sub */}
      {sub && <p className="text-xs text-slate-500 mt-1 truncate">{sub}</p>}
    </div>
  )
}
