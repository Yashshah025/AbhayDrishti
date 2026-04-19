import { useEffect, useRef, useState } from 'react'
import Plotly from 'plotly.js-dist-min'
import { api, SITES } from '../api'

export default function DensityHeatmap() {
  const chartRef = useRef(null)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.heatmap()
      .then(setData)
      .catch(err => console.error('[heatmap] fetch failed:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!chartRef.current || !data.length) return

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const siteIds = SITES.map(s => s.id)
    const siteNames = SITES.map(s => s.name)

    // Build Z-matrix [SiteIndex][HourIndex]
    const z = siteIds.map(sid => {
      const row = new Array(24).fill(0)
      data.filter(d => d.siteId === sid).forEach(d => {
        row[d.hour] = d.pressure
      })
      return row
    })

    const trace = {
      x: hours.map(h => `${h}:00`),
      y: siteNames,
      z: z,
      type: 'heatmap',
      colorscale: [
        [0, 'rgba(6, 182, 212, 0.1)'],    // Cyan-ish transparent
        [0.3, 'rgba(34, 197, 94, 0.5)'],  // Green
        [0.6, 'rgba(245, 158, 11, 0.8)'], // Amber
        [1, 'rgba(239, 68, 68, 1)']       // Red
      ],
      showscale: true,
      hoverongaps: false,
      hovertemplate: '<b>%{y}</b><br>Hour: %{x}<br>Pressure: %{z:.1f}<extra></extra>'
    }

    const layout = {
      title: { 
        text: 'State-wide Hourly Pressure Matrix', 
        font: { color: '#06b6d4', size: 14, family: 'Inter, sans-serif' },
        x: 0.05
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(10,22,40,0.5)',
      font: { color: '#94a3b8', size: 11 },
      margin: { l: 100, r: 20, t: 50, b: 50 },
      xaxis: { 
        title: 'Hour of Day',
        color: '#64748b', 
        gridcolor: '#1e293b',
        dtick: 2
      },
      yaxis: { 
        color: '#64748b', 
        gridcolor: '#1e293b',
        autorange: 'reversed' // Top-to-bottom site list
      }
    }

    const config = { responsive: true, displaylogo: false }

    Plotly.newPlot(chartRef.current, [trace], layout, config)
  }, [data])

  if (loading) return (
    <div className="glass h-64 flex items-center justify-center rounded-2xl animate-pulse">
      <p className="text-slate-500 font-mono text-xs">AGGREGATING HISTORICAL METRICS...</p>
    </div>
  )

  return (
    <div className="glass p-4 rounded-2xl overflow-hidden">
      <div ref={chartRef} style={{ width: '100%', height: 320 }} />
    </div>
  )
}
