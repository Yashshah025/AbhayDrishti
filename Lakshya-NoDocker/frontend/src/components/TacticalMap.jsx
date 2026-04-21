import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet'
import { api } from '../api'

const ZONE_BASE_COLOR = {
  corridor: '#06b6d4',
  hall:     '#a855f7',
  holding:  '#f59e0b',
  entry:    '#22c55e',
  exit:     '#ef4444',
}

// Density (pax/m²) → color heat (white → yellow → red)
function heatColor(density) {
  const d = Math.min(Math.max(density / 6, 0), 1)
  const r = Math.round(255)
  const g = Math.round(255 * (1 - d))
  const b = Math.round(80 * (1 - d))
  return `rgb(${r}, ${g}, ${b})`
}

export default function TacticalMap({ site, live }) {
  const [floor, setFloor] = useState(null)

  useEffect(() => {
    fetch(api.floorUrl(site.id))
      .then((r) => r.ok ? r.json() : null)
      .then(setFloor)
      .catch(() => setFloor(null))
  }, [site.id])

  // Per-zone density derived from live density (corridor highest, others fractional)
  const baseDensity = live?.density || 0
  const zoneDensity = (zone) => {
    switch (zone) {
      case 'corridor': return baseDensity
      case 'hall':     return baseDensity * 0.85
      case 'holding':  return baseDensity * 0.45
      case 'entry':    return baseDensity * 1.15
      case 'exit':     return baseDensity * 0.6
      default:         return baseDensity
    }
  }

  const styleFn = (feat) => {
    const zone = feat.properties.zone
    const d = zoneDensity(zone)
    return {
      color: ZONE_BASE_COLOR[zone] || '#06b6d4',
      weight: 2,
      fillColor: d > 1 ? heatColor(d) : (ZONE_BASE_COLOR[zone] || '#06b6d4'),
      fillOpacity: 0.55,
    }
  }

  const onEachFeature = (feat, layer) => {
    const z = feat.properties.zone
    const d = zoneDensity(z)
    layer.bindTooltip(
      `<b>${feat.properties.name}</b><br/>Zone: ${z}<br/>Density: ${d.toFixed(2)} pax/m²<br/>Capacity: ${feat.properties.capacity}`,
      { sticky: true },
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 280 }}>
      <MapContainer
        center={[site.lat, site.lon]}
        zoom={18}
        style={{ height: '100%', width: '100%', background: '#0a1628' }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='© OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        />
        {floor && (
          <GeoJSON
            data={floor}
            style={styleFn}
            onEachFeature={onEachFeature}
            // remount when density changes so styles refresh
            key={baseDensity.toFixed(2)}
          />
        )}
      </MapContainer>
      <div className="flex gap-3 mt-2 text-[10px] text-slate-400 justify-center flex-wrap">
        {Object.entries(ZONE_BASE_COLOR).map(([z, c]) => (
          <div key={z} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: c, opacity: 0.7 }} />
            <span className="capitalize">{z}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
