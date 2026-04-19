import { motion } from 'framer-motion'

const TIERS = [
  { tier: 1, label: 'Tier 1 — District',  desc: 'Police · Temple · GSRTC' },
  { tier: 2, label: 'Tier 2 — Collector', desc: 'Collector · Health (Ambulance)' },
  { tier: 3, label: 'Tier 3 — State',     desc: 'GSDMA · SDRF · NDRF' },
]

export default function EscalationTimeline({ alert }) {
  const current = alert?.currentTier || 1

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Alert #{String(alert?.id || '').slice(-6)} · {alert?.level} · {alert?.type}
        </div>
        <div className="text-xs font-mono text-cyan-400">Tier {current} / 3</div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-slate-800/60 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${(current / 3) * 100}%`,
            backgroundColor: current === 3 ? '#ef4444' : current === 2 ? '#f59e0b' : '#22c55e',
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      </div>

      {/* Tier rows */}
      <div className="space-y-2 pt-1">
        {TIERS.map((t) => {
          const reached = current >= t.tier
          const active  = current === t.tier
          const colour  = t.tier === 3 ? '#ef4444' : t.tier === 2 ? '#f59e0b' : '#22c55e'
          return (
            <motion.div key={t.tier}
              animate={active ? { scale: [1, 1.02, 1] } : { scale: 1 }}
              transition={active ? { duration: 1.2, repeat: Infinity } : {}}
              className="flex items-center gap-3 glass-dark rounded-xl p-2 px-3"
              style={{
                borderLeft: `3px solid ${reached ? colour : '#334155'}`,
                opacity:   reached ? 1 : 0.45,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                style={{
                  background: reached ? colour + '22' : '#1e293b',
                  color: reached ? colour : '#64748b',
                  border: `2px solid ${reached ? colour : '#334155'}`,
                }}
              >
                {t.tier}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: reached ? colour : '#64748b' }}>
                  {t.label}
                </p>
                <p className="text-[10px] text-slate-500">{t.desc}</p>
              </div>
              {reached && <span className="text-[10px] font-mono text-slate-400">ACTIVE</span>}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
