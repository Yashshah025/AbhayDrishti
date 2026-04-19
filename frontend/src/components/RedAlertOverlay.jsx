import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStateSocket } from '../hooks/useSiteSocket.js'
import { api } from '../api'

export default function RedAlertOverlay() {
  const { tier3Alert, clearTier3 } = useStateSocket()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const alert = tier3Alert?.alert
  const siteId = tier3Alert?.siteId

  const handleAck = async () => {
    setLoading(true)
    // Acknowledge via the lead Tier-3 authority (GSDMA)
    try { 
      await api.acknowledge(alert._id, { authorityId: 'GSDMA' }) 
      clearTier3()
    } catch (e) {
      console.error('[overlay] ack failed:', e)
    }
    setLoading(false)
  }
  const handleResolve = async () => {
    setLoading(true)
    try { 
      await api.resolve(alert._id) 
      clearTier3()
    } catch (e) {
      console.error('[overlay] resolve failed:', e)
    }
    setLoading(false)
  }
  const handleOpen = () => {
    if (siteId) navigate(`/site/${siteId}`)
  }

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(15, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          {/* Pulsing red border frame */}
          <motion.div
            className="absolute inset-4 rounded-3xl pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 60px rgba(239,68,68,0.4) inset, 0 0 60px rgba(239,68,68,0.4)',
                '0 0 120px rgba(239,68,68,0.9) inset, 0 0 120px rgba(239,68,68,0.9)',
                '0 0 60px rgba(239,68,68,0.4) inset, 0 0 60px rgba(239,68,68,0.4)',
              ],
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            initial={{ scale: 0.85, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 40 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative max-w-2xl w-full mx-4 glass-bright rounded-3xl p-8 border-2 border-red-500/60"
            style={{ boxShadow: '0 0 80px rgba(239,68,68,0.6)' }}
          >
            <div className="flex items-start gap-4 mb-6">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 8, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-6xl"
              >
                🚨
              </motion.div>
              <div className="flex-1">
                <p className="text-xs font-mono uppercase tracking-widest text-red-400 mb-1">
                  TIER 3 — STATE-LEVEL ESCALATION
                </p>
                <h1 className="text-3xl font-black text-red-300 leading-tight">
                  CRUSH RISK · {alert.level} · {siteId}
                </h1>
                <p className="text-sm text-slate-300 mt-1">{alert.type}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <Stat label="Pressure"   value={Number(alert.pressureNow).toFixed(1)} color="cyan" />
              <Stat label="T+10"       value={Number(alert.futurePressureT10 || 0).toFixed(1)} color="red" />
              <Stat label="Confidence" value={`${Math.round((alert.confidence || 0) * 100)}%`} color="emerald" />
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-xs text-red-300 font-bold mb-2">ACTIVATED RESPONSE CHAIN</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                GSDMA emergency control activated. SDRF unit en route. NDRF Battalion on standby.
                District Collector EOC open. Health Dept ambulances positioned at gates.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAck}
                disabled={loading}
                className="flex-1 py-4 rounded-xl bg-amber-500/25 border-2 border-amber-500/60 text-amber-200 font-black tracking-wide hover:bg-amber-500/40 transition-colors disabled:opacity-50"
              >
                {loading ? '⏳ PROCESSING...' : '🛡 ACKNOWLEDGE (GSDMA)'}
              </button>
              <button
                onClick={handleResolve}
                disabled={loading}
                className="flex-1 py-4 rounded-xl bg-emerald-500/25 border-2 border-emerald-500/60 text-emerald-200 font-black tracking-wide hover:bg-emerald-500/40 transition-colors disabled:opacity-50"
              >
                {loading ? '⏳ PROCESSING...' : '✓ RESOLVE INCIDENT'}
              </button>
            </div>

            <div className="flex justify-between items-center mt-4 text-xs">
              <button onClick={handleOpen}
                      className="text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline">
                Open {siteId} site dashboard →
              </button>
              <button onClick={clearTier3}
                      className="text-slate-500 hover:text-slate-300">
                Dismiss overlay
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="glass-dark rounded-xl p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-2xl font-black text-${color}-300`}>{value}</p>
    </div>
  )
}
