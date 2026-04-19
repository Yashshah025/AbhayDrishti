import { ShieldCheck, Activity, MapPin, Wifi } from 'lucide-react'

const LOCATIONS = ['Ambaji', 'Dwarka', 'Somnath', 'Pavagadh']

export default function Header({ status, connected }) {
  const riskColor =
    status?.risk_level === 'High'   ? 'text-red-400' :
    status?.risk_level === 'Medium' ? 'text-amber-400' : 'text-green-400'

  return (
    <header className="relative z-10 glass-bright px-6 py-4 flex items-center justify-between mb-4">
      {/* Logo + Title */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700
                          flex items-center justify-center glow-cyan">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {/* Online dot */}
          <span className={`absolute -top-1 -right-1 pulse-dot ${connected ? 'pulse-green' : 'pulse-gray'}`} />
        </div>

        <div>
          <h1 className="text-xl font-black tracking-tight text-white text-glow-cyan">
            AbhayDrishti
          </h1>
          <p className="text-xs text-slate-400 leading-3 mt-0.5">
            Stampede Window Predictor · TS-11
          </p>
        </div>
      </div>

      {/* Location tags */}
      <div className="hidden md:flex items-center gap-2">
        {LOCATIONS.map(loc => (
          <span key={loc}
                className={`flex items-center gap-1 glass-dark px-3 py-1 rounded-full text-xs
                            font-medium transition-all duration-300
                            ${status?.location === loc
                              ? 'text-cyan-300 border border-cyan-500/40 glow-cyan'
                              : 'text-slate-500'}`}>
            <MapPin className="w-3 h-3" />
            {loc}
          </span>
        ))}
      </div>

      {/* Right: status */}
      <div className="flex items-center gap-4">
        {/* Overall risk badge */}
        {status?.risk_level && (
          <span className={`risk-badge risk-${(status.risk_level || 'low').toLowerCase()}`}>
            <Activity className="w-3.5 h-3.5" />
            {status.risk_level} Risk
          </span>
        )}

        {/* Connection */}
        <div className="flex items-center gap-2 text-xs">
          <Wifi className={`w-4 h-4 ${connected ? 'text-green-400' : 'text-red-400'}`} />
          <span className={connected ? 'text-green-400' : 'text-red-400'}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </header>
  )
}
