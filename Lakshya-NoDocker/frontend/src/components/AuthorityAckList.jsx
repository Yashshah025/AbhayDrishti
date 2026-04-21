import { useState } from 'react'
import { api } from '../api'

const TIER_BADGE = {
  1: { label: 'T1', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  2: { label: 'T2', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  3: { label: 'T3', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

export default function AuthorityAckList({ alert, onAcked, onResolved }) {
  const [busy, setBusy] = useState({})
  const auths = alert?.authorities || []

  const handleAck = async (a) => {
    setBusy((b) => ({ ...b, [a.authorityId]: true }))
    try {
      await api.acknowledge(alert.id, { authorityId: a.authorityId })
      onAcked?.()
    } finally {
      setBusy((b) => ({ ...b, [a.authorityId]: false }))
    }
  }

  const handleResolve = async () => {
    setBusy((b) => ({ ...b, _resolve: true }))
    try {
      await api.resolve(alert.id)
      onResolved?.()
      onAcked?.()
    } finally {
      setBusy((b) => ({ ...b, _resolve: false }))
    }
  }

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Authority Roster ({auths.length})
        </p>
        <button
          onClick={handleResolve}
          disabled={busy._resolve}
          className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
        >
          {busy._resolve ? '…' : '✓ RESOLVE'}
        </button>
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        {auths.map((a) => {
          const badge = TIER_BADGE[a.tier]
          const acked = Boolean(a.ackAt)
          return (
            <div key={a.authorityId}
                 className="flex items-center gap-2 glass-dark rounded-lg p-2 px-3 border"
                 style={{ borderColor: acked ? '#22c55e40' : badge.color + '40' }}>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{a.authorityName}</p>
                <p className="text-[10px] text-slate-500 truncate">{a.agency}</p>
              </div>
              {acked ? (
                <div className="text-right">
                  <span className="text-emerald-400 text-xs font-mono">✓</span>
                  <p className="text-[9px] text-slate-500">{a.responseTimeSeconds}s</p>
                </div>
              ) : (
                <button
                  onClick={() => handleAck(a)}
                  disabled={busy[a.authorityId]}
                  className="text-[10px] font-bold px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                >
                  {busy[a.authorityId] ? '…' : 'ACK'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
