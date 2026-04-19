import { useEffect, useRef } from 'react'

const RISK_CONFIG = {
  Low:    { color: '#22c55e', glow: 'rgba(34,197,94,0.5)',   label: 'SAFE',      arc: 0.28 },
  Medium: { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)',  label: 'SURGE',     arc: 0.58 },
  High:   { color: '#ef4444', glow: 'rgba(239,68,68,0.6)',   label: 'CRUSH RISK',arc: 0.92 },
}

export default function RiskGauge({ riskLevel = 'Low', confidence = 0, futurePress = 0 }) {
  const canvasRef = useRef(null)
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.Low

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H * 0.65
    const R  = W * 0.38

    ctx.clearRect(0, 0, W, H)

    const startAngle = Math.PI * 0.75
    const endAngle   = Math.PI * 2.25

    // Track
    ctx.beginPath()
    ctx.arc(cx, cy, R, startAngle, endAngle)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth   = 18
    ctx.lineCap     = 'round'
    ctx.stroke()

    // Colored zones
    const zones = [
      { from: 0,    to: 0.33, color: 'rgba(34,197,94,0.35)' },
      { from: 0.33, to: 0.66, color: 'rgba(245,158,11,0.35)' },
      { from: 0.66, to: 1.0,  color: 'rgba(239,68,68,0.35)' },
    ]
    const totalArc = endAngle - startAngle
    zones.forEach(z => {
      ctx.beginPath()
      ctx.arc(cx, cy, R, startAngle + z.from * totalArc, startAngle + z.to * totalArc)
      ctx.strokeStyle = z.color
      ctx.lineWidth   = 18
      ctx.lineCap     = 'butt'
      ctx.stroke()
    })

    // Active arc
    const arcEnd = startAngle + cfg.arc * totalArc
    const grad   = ctx.createLinearGradient(cx - R, cy, cx + R, cy)
    grad.addColorStop(0, cfg.color + '88')
    grad.addColorStop(1, cfg.color)
    ctx.beginPath()
    ctx.arc(cx, cy, R, startAngle, arcEnd)
    ctx.strokeStyle = grad
    ctx.lineWidth   = 18
    ctx.lineCap     = 'round'
    ctx.shadowColor = cfg.glow
    ctx.shadowBlur  = 20
    ctx.stroke()
    ctx.shadowBlur  = 0

    // Center label
    ctx.fillStyle = cfg.color
    ctx.font      = `900 22px Inter`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor  = cfg.glow
    ctx.shadowBlur   = 12
    ctx.fillText(cfg.label, cx, cy - 4)
    ctx.shadowBlur   = 0

    // Confidence %
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font      = '500 12px Inter'
    ctx.fillText(`${(confidence * 100).toFixed(0)}% confidence`, cx, cy + 22)

    // Needle (pointer at arc end)
    const needleAngle = arcEnd
    const nx = cx + (R + 14) * Math.cos(needleAngle)
    const ny = cy + (R + 14) * Math.sin(needleAngle)
    ctx.beginPath()
    ctx.arc(nx, ny, 5, 0, Math.PI * 2)
    ctx.fillStyle   = cfg.color
    ctx.shadowColor = cfg.glow
    ctx.shadowBlur  = 16
    ctx.fill()
    ctx.shadowBlur  = 0

  }, [riskLevel, confidence])

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} width={240} height={160}
              className="gauge-svg w-full max-w-[240px]" />

      {/* Future pressure */}
      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase tracking-widest">Predicted T+10 min</p>
        <p className="text-2xl font-black tabular-nums"
           style={{ color: RISK_CONFIG[riskLevel]?.color || '#00d4ff' }}>
          {futurePress.toFixed(1)}
          <span className="text-xs font-normal text-slate-500 ml-1">pressure units</span>
        </p>
      </div>

      {/* Confidence bar */}
      <div className="w-full px-2">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Confidence Score</span>
          <span className="font-mono" style={{ color: RISK_CONFIG[riskLevel]?.color }}>
            {(confidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="conf-bar-track">
          <div className="conf-bar-fill"
               style={{
                 width:      `${Math.min(100, confidence * 100)}%`,
                 background: `linear-gradient(90deg, ${RISK_CONFIG[riskLevel]?.color}88, ${RISK_CONFIG[riskLevel]?.color})`,
               }} />
        </div>
      </div>
    </div>
  )
}
