import { SITES } from '../config/sites.js';
import { Authority } from '../models/Authority.js';

// Tier 1 — per-site immediate responders
function tier1ForSite(site) {
  return [
    { _id: `POL_${site.id}`,   agency: 'District Police', name: `${site.district} District Police`,         tier: 1, siteId: site.id, contact: `police-${site.id.toLowerCase()}@gj.gov.in` },
    { _id: `TEMP_${site.id}`,  agency: 'Temple Trust',    name: `${site.name} Temple Trust`,                tier: 1, siteId: site.id, contact: `trust-${site.id.toLowerCase()}@gj.gov.in` },
    { _id: `GSRTC_${site.id}`, agency: 'GSRTC Transport', name: `GSRTC ${site.district} Depot`,             tier: 1, siteId: site.id, contact: `gsrtc-${site.id.toLowerCase()}@gj.gov.in` },
  ];
}

// Tier 2 — per-district escalation
function tier2ForSite(site) {
  return [
    { _id: `COLL_${site.id}`,   agency: 'District Collector', name: `${site.district} District Collector`, tier: 2, siteId: site.id, contact: `collector-${site.id.toLowerCase()}@gj.gov.in` },
    { _id: `HEALTH_${site.id}`, agency: 'Health Dept',        name: `${site.district} Health (Ambulance)`, tier: 2, siteId: site.id, contact: `health-${site.id.toLowerCase()}@gj.gov.in` },
  ];
}

// Tier 3 — state-wide disaster management
const TIER3 = [
  { _id: 'GSDMA',  agency: 'GSDMA', name: 'Gujarat State Disaster Mgmt Authority', tier: 3, siteId: null, contact: 'control@gsdma.org' },
  { _id: 'SDRF',   agency: 'SDRF',  name: 'State Disaster Response Force',          tier: 3, siteId: null, contact: 'sdrf@gj.gov.in' },
  { _id: 'NDRF',   agency: 'NDRF',  name: 'National Disaster Response Force',       tier: 3, siteId: null, contact: 'ndrf-control@nic.in' },
];

export async function seedAuthorities() {
  const docs = [
    ...SITES.flatMap(tier1ForSite),
    ...SITES.flatMap(tier2ForSite),
    ...TIER3,
  ];
  // Idempotent upsert
  await Promise.all(
    docs.map((d) => Authority.updateOne({ _id: d._id }, { $set: d }, { upsert: true })),
  );
  return docs.length;
}
