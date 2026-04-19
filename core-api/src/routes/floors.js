import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { siteById } from '../config/sites.js';

export function floorsRouter() {
  const r = Router();
  r.get('/:siteId.geojson', (req, res) => {
    const site = siteById(String(req.params.siteId).toUpperCase());
    if (!site) return res.status(404).json({ error: 'unknown site' });
    const file = path.join(env.floorsDir, `${site.id.toLowerCase()}.geojson`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'floor geojson missing' });
    res.type('application/geo+json').sendFile(file);
  });
  return r;
}
