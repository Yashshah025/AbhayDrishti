import { useEffect, useState } from 'react'
import { getSocket } from '../api'

/**
 * Subscribe to a specific site's socket room and surface the latest tick
 * snapshot + a stream of alert events. Returns:
 *   { snapshot, lastEvent, connected }
 */
export function useSiteSocket(siteId) {
  const [snapshot,  setSnapshot]  = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!siteId) return
    const s = getSocket()

    const onConnect    = () => { setConnected(true);  s.emit('subscribe_site', siteId) }
    const onDisconnect = () => setConnected(false)
    const onTick       = (payload) => { if (payload?.siteId === siteId) setSnapshot(payload) }
    const onAlertCreated   = (p) => p?.siteId === siteId && setLastEvent({ type: 'alert_created',   ...p })
    const onAlertEscalated = (p) => p?.siteId === siteId && setLastEvent({ type: 'alert_escalated', ...p })
    const onAlertAcked     = (p) => p?.siteId === siteId && setLastEvent({ type: 'alert_acked',     ...p })
    const onAlertResolved  = (p) => p?.siteId === siteId && setLastEvent({ type: 'alert_resolved',  ...p })

    if (s.connected) onConnect()
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('tick', onTick)
    s.on('alert_created',   onAlertCreated)
    s.on('alert_escalated', onAlertEscalated)
    s.on('alert_acked',     onAlertAcked)
    s.on('alert_resolved',  onAlertResolved)

    return () => {
      s.emit('unsubscribe_site', siteId)
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('tick', onTick)
      s.off('alert_created',   onAlertCreated)
      s.off('alert_escalated', onAlertEscalated)
      s.off('alert_acked',     onAlertAcked)
      s.off('alert_resolved',  onAlertResolved)
    }
  }, [siteId])

  return { snapshot, lastEvent, connected }
}

/**
 * Subscribe to global state-overview events (macro map).
 */
export function useStateSocket() {
  const [overview,  setOverview]  = useState(null)
  const [riskEvent, setRiskEvent] = useState(null)
  const [tier3Alert, setTier3Alert] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s = getSocket()
    const onConnect    = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onOverview   = (p) => setOverview(p)
    const onRiskChange = (p) => setRiskEvent(p)
    const onEscalated  = (p) => { if (p?.tier === 3) setTier3Alert(p) }
    const onResolved   = (p) => setTier3Alert((cur) => cur?.alert?._id === p?.alert?._id ? null : cur)

    if (s.connected) onConnect()
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('state_overview', onOverview)
    s.on('risk_change',    onRiskChange)
    s.on('alert_escalated', onEscalated)
    s.on('alert_resolved',  onResolved)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('state_overview', onOverview)
      s.off('risk_change',    onRiskChange)
      s.off('alert_escalated', onEscalated)
      s.off('alert_resolved',  onResolved)
    }
  }, [])

  return { overview, riskEvent, tier3Alert, connected, clearTier3: () => setTier3Alert(null) }
}
