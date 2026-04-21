import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Plotly from 'plotly.js-dist-min'
import { api, SITES } from '../api'

/**
 * Linked-brushing analytics across pressure / entry-rate / density.
 * Brush range on any chart highlights the same window in the others —
 * implemented via Plotly relayout events sharing xaxis ranges.
 */
export default function Analytics() {
  const { siteId = 'SOM' } = useParams()
  const site = SITES.find((s) => s.id === siteId.toUpperCase()) || SITES[0]

  const [history, setHistory] = useState([])
  const refs = { pressure: useRef(null), flow: useRef(null), density: useRef(null) }
  const syncing = useRef(false)

  useEffect(() => {
    api.sensorHistory(site.id, 480).then(setHistory).catch(() => {})
  }, [site.id])

  const traces = useMemo(() => {
    if (!history.length) return null
    const x = history.map((h) => h.timestamp)
    return {
      x,
      pressure: history.map((h) => h.pressure_index),
      forecast: history.map((h) => h.future_pressure || null),
      entry:    history.map((h) => h.entry_flow_rate_pax_per_min),
      exit:     history.map((h) => h.exit_flow_rate_pax_per_min),
      density:  history.map((h) => h.queue_density_pax_per_m2),
      risk:     history.map((h) => h.risk_level),
    }
  }, [history])

  useEffect(() => {
    if (!traces) return
    const baseLayout = (title, color) => ({
      title: { text: title, font: { color: '#06b6d4', size: 13 } },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor:  'rgba(10,22,40,0.45)',
      font: { color: '#94a3b8', size: 11 },
      margin: { l: 40, r: 20, t: 32, b: 30 },
      dragmode: 'select',
      xaxis: { color: '#64748b', gridcolor: '#1e293b' },
      yaxis: { color: '#64748b', gridcolor: '#1e293b' },
      shapes: [],
    })

    const cfg = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d'] }

    Plotly.react(refs.pressure.current,
      [
        { x: traces.x, y: traces.pressure, type: 'scatter', mode: 'lines',
          name: 'Pressure', line: { color: '#06b6d4', width: 2 } },
        { x: traces.x, y: traces.forecast, type: 'scatter', mode: 'lines',
          name: 'T+10 forecast', line: { color: '#f59e0b', width: 1.5, dash: 'dot' } },
      ],
      baseLayout('Pressure Index'), cfg)

    Plotly.react(refs.flow.current,
      [
        { x: traces.x, y: traces.entry, type: 'scatter', mode: 'lines',
          name: 'Entry pax/min', line: { color: '#22c55e', width: 1.7 } },
        { x: traces.x, y: traces.exit, type: 'scatter', mode: 'lines',
          name: 'Exit pax/min',  line: { color: '#a855f7', width: 1.7 } },
      ],
      baseLayout('Entry / Exit Flow Rate'), cfg)

    Plotly.react(refs.density.current,
      [{ x: traces.x, y: traces.density, type: 'scatter', mode: 'lines',
         name: 'Queue density', line: { color: '#ef4444', width: 2 },
         fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.15)' }],
      baseLayout('Queue Density (pax/m²)'), cfg)

    // Linked brushing: when xaxis range changes on one chart, mirror on the others.
    const others = (src) => Object.entries(refs).filter(([k]) => k !== src).map(([, r]) => r.current)
    const wireSync = (key) => {
      const el = refs[key].current
      if (!el || !el.on) return
      el.on('plotly_relayout', (ev) => {
        if (syncing.current) return
        const x0 = ev['xaxis.range[0]']
        const x1 = ev['xaxis.range[1]']
        if (x0 == null || x1 == null) return
        syncing.current = true
        others(key).forEach((o) => Plotly.relayout(o, { 'xaxis.range': [x0, x1] }))
        setTimeout(() => { syncing.current = false }, 50)
      })
      el.on('plotly_doubleclick', () => {
        syncing.current = true
        others(key).forEach((o) => Plotly.relayout(o, { 'xaxis.autorange': true }))
        setTimeout(() => { syncing.current = false }, 50)
      })
    }
    Object.keys(refs).forEach(wireSync)
  }, [traces])

  return (
    <div className="flex flex-col gap-3 p-3 md:p-4">
      <div className="flex items-center gap-3">
        <Link to={`/site/${site.id}`} className="glass-dark px-3 py-2 rounded-xl text-cyan-300 hover:text-cyan-200 flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> Site Dashboard
        </Link>
        <header className="glass rounded-2xl px-5 py-3 flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-cyan-300">
              📊 {site.name} — Linked Analytics
            </h1>
            <p className="text-xs text-slate-500">
              Drag-select on any chart to brush — others sync the time window automatically.
              Double-click any chart to reset all.
            </p>
          </div>
          <p className="text-xs font-mono text-slate-500">{history.length} samples</p>
        </header>
      </div>

      <div className="grid grid-cols-1 gap-3 flex-1">
        <div className="glass p-4 rounded-2xl">
          <div ref={refs.pressure} style={{ width: '100%', height: 280 }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="glass p-4 rounded-2xl">
            <div ref={refs.flow} style={{ width: '100%', height: 240 }} />
          </div>
          <div className="glass p-4 rounded-2xl">
            <div ref={refs.density} style={{ width: '100%', height: 240 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
