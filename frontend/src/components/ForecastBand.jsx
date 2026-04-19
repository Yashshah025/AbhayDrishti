import { useMemo } from 'react'

/** Mini sparkline showing the XGBoost-anchored 15-minute pressure forecast band. */
export default function ForecastBand({ forecast = [], pressureNow = 0 }) {
  const data = forecast.length ? forecast : []

  const { points, max, min, peak } = useMemo(() => {
    if (!data.length) return { points: '', max: 0, min: 0, peak: 0 }
    const max = Math.max(pressureNow, ...data, 1)
    const min = Math.min(pressureNow, ...data, 0)
    const range = Math.max(max - min, 0.001)
    const series = [pressureNow, ...data]
    const w = 100, h = 28
    const pts = series.map((v, i) => {
      const x = (i / (series.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return { points: pts.join(' '), max, min, peak: Math.max(...data) }
  }, [data, pressureNow])

  if (!data.length) {
    return (
      <p className="mt-3 text-[10px] text-slate-500 font-mono">
        Forecast unavailable — awaiting XGBoost output…
      </p>
    )
  }

  const peakColor = peak > pressureNow * 1.3 ? '#ef4444'
                  : peak > pressureNow * 1.1 ? '#f59e0b' : '#22c55e'

  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
          15-min XGBoost Forecast
        </p>
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-7">
          <polyline
            fill="none"
            stroke="url(#forecastGrad)"
            strokeWidth="1.5"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <linearGradient id="forecastGrad" x1="0" x2="1">
              <stop offset="0%"  stopColor="#06b6d4" />
              <stop offset="100%" stopColor={peakColor} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-slate-500 uppercase">Peak T+15</p>
        <p className="text-lg font-black font-mono" style={{ color: peakColor }}>
          {peak.toFixed(1)}
        </p>
      </div>
    </div>
  )
}
