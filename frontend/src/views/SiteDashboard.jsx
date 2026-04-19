import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3 } from 'lucide-react'

import Header             from '../components/Header.jsx'
import MetricCard         from '../components/MetricCard.jsx'
import RiskGauge          from '../components/RiskGauge.jsx'
import PressureChart      from '../components/PressureChart.jsx'
import AlertPanel         from '../components/AlertPanel.jsx'
import SimulationControls from '../components/SimulationControls.jsx'
import EscalationTimeline from '../components/EscalationTimeline.jsx'
import AuthorityAckList   from '../components/AuthorityAckList.jsx'
import TacticalMap        from '../components/TacticalMap.jsx'
import ForecastBand       from '../components/ForecastBand.jsx'

import { api, SITES }     from '../api'
import { useSiteSocket }  from '../hooks/useSiteSocket.js'

const POLL_FALLBACK_MS = 5000  // when sockets fail, fall back to polling every 5s

export default function SiteDashboard() {
  const { siteId = 'SOM' } = useParams()
  const site = SITES.find((s) => s.id === siteId.toUpperCase()) || SITES[0]

  const [status, setStatus] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [stats,  setStats]  = useState({})
  const [history, setHistory] = useState([])

  const { snapshot, lastEvent, connected } = useSiteSocket(site.id)

  // ── REST fetchers ───────────────────────────────────────────────────────
  const fetchAlerts = useCallback(() => {
    Promise.all([api.alerts(site.id), api.alertStats(site.id)])
      .then(([a, st]) => { setAlerts(a); setStats(st) })
      .catch(() => {})
  }, [site.id])

  const fetchHistory = useCallback(() => {
    api.sensorHistory(site.id, 120).then(setHistory).catch(() => {})
  }, [site.id])

  const fetchStatus = useCallback(() => {
    api.status(site.id).then(setStatus).catch(() => {})
  }, [site.id])

  // Initial load + polling fallback for alerts/history
  useEffect(() => {
    fetchStatus(); fetchAlerts(); fetchHistory()
    const t = setInterval(() => { fetchAlerts(); fetchHistory() }, POLL_FALLBACK_MS)
    return () => clearInterval(t)
  }, [fetchAlerts, fetchHistory, fetchStatus])

  // Refresh alerts on socket events
  useEffect(() => { if (lastEvent) fetchAlerts() }, [lastEvent, fetchAlerts])

  // Live snapshot from socket overrides metrics, but we preserve engine flags (simulation_running, model_ready) from REST status
  const liveStatus = snapshot 
    ? { ...status, ...buildStatusFromSnapshot(snapshot, site) } 
    : status
  const live = liveStatus || {}

  // Derived
  const riskLevel    = live.risk_level     || 'Low'
  const confidence   = live.confidence     || 0
  const futurePress  = live.future_pressure || 0
  const pressureNow  = live.pressure_index  || 0
  const prevPressure = history.length > 1
    ? parseFloat(history[history.length - 2]?.pressure_index || 0) : 0
  const pressTrend   = pressureNow - prevPressure

  const handleAck = useCallback((alertId, agency) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId
        ? { ...a, acknowledged: { ...a.acknowledged, [agency]: true },
                  ack_times: { ...(a.ack_times || {}), [agency]: new Date().toLocaleTimeString() } }
        : a))
  }, [])

  const openAlert = alerts.find((a) => a.status === 'open')

  return (
    <motion.div
      layoutId={`site-card-${site.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col p-3 md:p-4 gap-3"
    >
      {/* Top bar with back button */}
      <div className="flex items-center gap-3">
        <Link to="/" className="glass-dark px-3 py-2 rounded-xl text-cyan-300 hover:text-cyan-200 flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> State Map
        </Link>
        <Header status={liveStatus} connected={connected || Boolean(status)} />
        <Link to={`/analytics/${site.id}`} className="glass-dark px-3 py-2 rounded-xl text-cyan-300 hover:text-cyan-200 flex items-center gap-2 text-sm whitespace-nowrap">
          <BarChart3 size={16} /> Analytics
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <MetricCard icon="🔴" label="Pressure Now" accent="cyan"
                    value={pressureNow.toFixed(1)} trend={pressTrend}
                    sub="Corridor pressure index" />
        <MetricCard icon="🔮" label="Predicted T+10"
                    accent={riskLevel === 'High' ? 'red' : riskLevel === 'Medium' ? 'amber' : 'green'}
                    value={futurePress.toFixed(1)} sub="Future pressure (XGBoost)" />
        <MetricCard icon="🎯" label="Confidence" accent="purple"
                    value={`${(confidence * 100).toFixed(0)}%`}
                    sub="Blended classifier+regressor" />
        <MetricCard icon="🚶" label="Entry Flow" accent="green"
                    value={(live.entry_rate || 0).toFixed(0)} unit="pax/min"
                    sub="Corridor entry rate" />
        <MetricCard icon="🌊" label="Density" accent="amber"
                    value={(live.density || 0).toFixed(2)} unit="pax/m²"
                    sub="Queue density" />
        <MetricCard icon="🚌" label="Vehicles" accent="cyan"
                    value={live.vehicle_count || 0} sub="Current vehicle count" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 flex-1">
        {/* Left column */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3">
            <div className="glass p-5 rounded-2xl flex flex-col items-center justify-center">
              <p className="section-heading w-full mb-4"><span>🎯</span> Risk Gauge</p>
              <RiskGauge riskLevel={riskLevel} confidence={confidence} futurePress={futurePress} />
            </div>
            <div className="glass p-5 rounded-2xl">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="text-4xl animate-pulse-slow">⏳</div>
                  <p className="text-slate-400 text-sm">Awaiting sensor history…</p>
                </div>
              ) : (
                <PressureChart data={history} />
              )}
              <ForecastBand forecast={live.forecast15 || liveStatus?.forecast15 || snapshot?.forecast || []} pressureNow={pressureNow} />
            </div>
          </div>

          {/* Tactical map + escalation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="glass p-5 rounded-2xl">
              <p className="section-heading mb-3"><span>🗺️</span> Tactical Floor — {site.name}</p>
              <TacticalMap site={site} live={live} />
            </div>
            <div className="glass p-5 rounded-2xl">
              <p className="section-heading mb-3"><span>📈</span> Escalation Status</p>
              {openAlert ? (
                <>
                  <EscalationTimeline alert={openAlert} />
                  <AuthorityAckList alert={openAlert} onAcked={fetchAlerts} />
                </>
              ) : (
                <div className="text-center py-8 text-sm text-slate-500">
                  No open alert. Tier 1 / 2 / 3 chain idle.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <SimulationControls 
            status={liveStatus} 
            onAction={(action) => { 
              if (action === 'reset') {
                setHistory([]);
                setAlerts([]);
                setStatus(null);
              }
              fetchStatus(); 
              fetchAlerts();
              fetchHistory();
            }} 
            site={site.id} 
          />
          <div className="glass p-5 rounded-2xl">
            <AlertPanel alerts={alerts} onAcknowledge={handleAck} stats={stats} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Build a legacy-compatible status payload from a socket snapshot
function buildStatusFromSnapshot(snap, site) {
  const t = snap?.tick || {}
  const p = snap?.prediction || {}
  return {
    status: 'online',
    site,
    location: site.name,
    timestamp: t.timestamp || '—',
    pressure_index: t.pressure_index || 0,
    entry_rate:     t.entry_flow_rate_pax_per_min || 0,
    exit_rate:      t.exit_flow_rate_pax_per_min  || 0,
    density:        t.queue_density_pax_per_m2    || 0,
    vehicle_count:  t.vehicle_count || 0,
    corridor_width: t.corridor_width_m || 0,
    rolling_mean:      t.rolling_mean_pressure_5 || 0,
    pressure_gradient: t.pressure_gradient || 0,
    sudden_spike:      Boolean(t.sudden_spike_flag),
    risk_level:    p.risk_level || 'Low',
    risk_numeric:  p.risk_numeric || 0,
    confidence:    p.confidence || 0,
    future_pressure: p.future_pressure || 0,
    forecast15:    snap?.forecast || [],
    progress_pct:  snap?.progressPct || 0,
    model_ready:   (p.confidence > 0) || (snap?.tickCount > 0),
  }
}
