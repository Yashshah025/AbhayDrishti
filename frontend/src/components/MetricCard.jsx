export default function MetricCard({ icon, label, value, unit = '', sub, accent = 'cyan', trend }) {
  const accentMap = {
    cyan:   'from-cyan-500/20 to-transparent border-cyan-500/20',
    green:  'from-green-500/20 to-transparent border-green-500/20',
    amber:  'from-amber-500/20 to-transparent border-amber-500/20',
    red:    'from-red-500/20 to-transparent border-red-500/20',
    purple: 'from-purple-500/20 to-transparent border-purple-500/20',
  }
  const textMap = {
    cyan:   'text-cyan-600 dark:text-cyan-300',
    green:  'text-green-600 dark:text-green-400',
    amber:  'text-amber-600 dark:text-amber-400',
    red:    'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
  }

  return (
    <div className={`metric-card glass p-4 border bg-gradient-to-br bg-scan ${accentMap[accent] || accentMap.cyan}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        <span className={`text-xl drop-shadow-[0_0_8px_rgba(0,212,255,0.4)] ${textMap[accent] || textMap.cyan}`}>{icon}</span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5 relative z-10">
        <span className={`text-3xl font-black tabular-nums tracking-tighter ${textMap[accent] || textMap.cyan} text-glow-cyan`}>
          {value}
        </span>
        {unit && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{unit}</span>}
        {trend !== undefined && (
          <span className={`text-[10px] font-black ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/5 ${trend >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
          </span>
        )}
      </div>

      {/* Sub */}
      {sub && <p className="text-[10px] text-slate-500 mt-2 truncate font-medium border-t border-white/5 pt-2 uppercase tracking-tighter">{sub}</p>}
    </div>
  )
}
