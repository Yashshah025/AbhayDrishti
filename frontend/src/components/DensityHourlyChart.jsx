import { useEffect, useRef, useState } from 'react'
import Plotly from 'plotly.js-dist-min'
import { api, SITES } from '../api'

export default function DensityHourlyChart() {
  const chartRef = useRef(null)
  const [data, setData] = useState([])
  const [dateStr, setDateStr] = useState('')
  const [loading, setLoading] = useState(true)

  const SITE_COLORS = {
    'SOM': '#06b6d4', // Cyan
    'AMB': '#22c55e', // Green
    'DWA': '#f59e0b', // Amber
    'PAV': '#ef4444'  // Red
  }

  useEffect(() => {
    api.heatmap()
      .then(res => {
        setData(res.data || [])
        setDateStr(res.date || '')
      })
      .catch(err => console.error('[hourly-chart] fetch failed:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!chartRef.current || !data.length) return

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const siteIds = SITES.map(s => s.id)

    const traces = siteIds.map(sid => {
      const site = SITES.find(s => s.id === sid)
      const siteData = data.filter(d => d.siteId === sid)
      
      // Map hourly values, fill gaps with 0
      const yValues = hours.map(h => {
        const found = siteData.find(d => d.hour === h)
        return found ? found.pressure : 0
      })

      return {
        x: hours.map(h => `${h}:00`),
        y: yValues,
        name: site.name,
        type: 'scatter',
        mode: 'lines+markers', // "pivot points"
        line: { color: SITE_COLORS[sid], width: 3, shape: 'spline' },
        marker: { size: 6, color: SITE_COLORS[sid], symbol: 'circle' },
        hovertemplate: `<b>${site.name}</b><br>Hour: %{x}<br>Pressure: %{y}<extra></extra>`
      }
    })

    const layout = {
      title: { 
        text: 'Comparative Hourly Density Trends', 
        font: { color: '#06b6d4', size: 14, family: 'Inter, sans-serif' },
        x: 0.05
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(10,22,40,0.5)',
      font: { color: '#94a3b8', size: 11 },
      margin: { l: 40, r: 40, t: 50, b: 50 },
      xaxis: { 
        title: 'Hour segment (0-23h)',
        color: '#64748b', 
        gridcolor: '#1e293b',
        dtick: 2
      },
      yaxis: { 
        title: 'Crowd Density (Pressure)',
        color: '#64748b', 
        gridcolor: '#1e293b',
        zeroline: false
      },
      legend: {
        orientation: 'h',
        y: -0.2,
        x: 0.5,
        xanchor: 'center',
        font: { color: '#94a3b8' }
      },
      hovermode: 'closest'
    }

    const config = { responsive: true, displaylogo: false }

    Plotly.newPlot(chartRef.current, traces, layout, config)
  }, [data])

  if (loading) return (
    <div className="glass h-64 flex items-center justify-center rounded-2xl animate-pulse">
      <p className="text-slate-500 font-mono text-xs">ANALYZING TEMPORAL PATTERNS...</p>
    </div>
  )

  return (
    <div className="glass p-4 rounded-2xl overflow-hidden relative">
      {/* Date display in the corner */}
      <div className="absolute top-4 right-6 pointer-events-none z-10 flex flex-col items-end">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Report Date</p>
        <p className="text-xs font-mono text-cyan-400">{dateStr}</p>
      </div>

      <div ref={chartRef} style={{ width: '100%', height: 320 }} />
    </div>
  )
}
