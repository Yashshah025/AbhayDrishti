/**
 * generate_floors.js — emit deterministic synthetic floor GeoJSON for each site.
 *
 * Each file contains polygons for: corridor, entry gates (2-3), exit gate,
 * holding zone, darshan hall. Coordinates are local (small offsets from the
 * site's lat/lon) so they render as a stylized floor overlay on Leaflet.
 *
 * Output: data/floors/{som,amb,dwa,pav}.geojson
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITES } from '../src/config/sites.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'data', 'floors');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Tiny seeded PRNG so layouts are deterministic per site ─────────────────
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function rect(cx, cy, w, h, rotDeg = 0) {
  const r = (rotDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const sn = Math.sin(r);
  const corners = [
    [-w / 2, -h / 2],
    [ w / 2, -h / 2],
    [ w / 2,  h / 2],
    [-w / 2,  h / 2],
    [-w / 2, -h / 2],
  ].map(([x, y]) => [cx + x * c - y * sn, cy + x * sn + y * c]);
  return corners;
}

function polyFeature(props, ring) {
  return {
    type: 'Feature',
    properties: props,
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

function buildFloor(site) {
  const r = rng(site.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0));
  // Lat/lon → use small degree offsets (~0.0005° = ~55m). Leaflet handles it fine.
  const cx = site.lon, cy = site.lat;

  const features = [];

  // Corridor — a long rectangle
  const corridorW = 0.0006 + r() * 0.0002;
  const corridorH = 0.0014 + r() * 0.0004;
  const corridorRot = (r() * 60) - 30;
  features.push(polyFeature(
    { id: 'corridor', name: 'Main Darshan Corridor', zone: 'corridor', capacity: 1500 },
    rect(cx, cy, corridorW, corridorH, corridorRot),
  ));

  // Darshan hall — square at one end
  const hallSide = 0.0008;
  features.push(polyFeature(
    { id: 'hall', name: 'Darshan Hall', zone: 'hall', capacity: 800 },
    rect(cx, cy + corridorH * 0.7, hallSide, hallSide, corridorRot),
  ));

  // Holding zone — wider rectangle at the entry end
  features.push(polyFeature(
    { id: 'holding', name: 'Pilgrim Holding Zone', zone: 'holding', capacity: 3000 },
    rect(cx, cy - corridorH * 0.7, corridorW * 2, corridorH * 0.5, corridorRot),
  ));

  // Entry gates (2-3)
  const nEntries = 2 + Math.floor(r() * 2);
  for (let i = 0; i < nEntries; i++) {
    const offset = (i - (nEntries - 1) / 2) * corridorW * 0.7;
    features.push(polyFeature(
      { id: `entry_${i + 1}`, name: `Entry Gate ${i + 1}`, zone: 'entry', capacity: 200 },
      rect(cx + offset, cy - corridorH * 0.55, corridorW * 0.25, corridorH * 0.05, corridorRot),
    ));
  }

  // Exit gate
  features.push(polyFeature(
    { id: 'exit_1', name: 'Exit Gate', zone: 'exit', capacity: 250 },
    rect(cx + corridorW * 0.6, cy + corridorH * 0.45, corridorW * 0.3, corridorH * 0.06, corridorRot),
  ));

  return {
    type: 'FeatureCollection',
    properties: { siteId: site.id, siteName: site.name },
    features,
  };
}

for (const site of SITES) {
  const fc = buildFloor(site);
  const file = path.join(OUT_DIR, `${site.id.toLowerCase()}.geojson`);
  fs.writeFileSync(file, JSON.stringify(fc));
  console.log(`[floors] wrote ${file} — ${fc.features.length} features`);
}
