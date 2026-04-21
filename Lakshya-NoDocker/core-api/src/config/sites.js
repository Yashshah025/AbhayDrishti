// Gujarat pilgrimage sites monitored by CrowdShield C2.
// `csvName` matches the `location` column in minute_level_dataset.csv.
export const SITES = [
  {
    id: 'SOM',
    name: 'Somnath',
    csvName: 'Somnath',
    lat: 20.888,
    lon: 70.401,
    district: 'Gir Somnath',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'AMB',
    name: 'Ambaji',
    csvName: 'Ambaji',
    lat: 24.333,
    lon: 72.850,
    district: 'Banaskantha',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'DWA',
    name: 'Dwarka',
    csvName: 'Dwarka',
    lat: 22.238,
    lon: 68.968,
    district: 'Devbhumi Dwarka',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'PAV',
    name: 'Pavagadh',
    csvName: 'Pavagadh',
    lat: 22.461,
    lon: 73.513,
    district: 'Panchmahal',
    timezone: 'Asia/Kolkata',
  },
];

export const SITE_IDS = SITES.map((s) => s.id);
export const siteById = (id) => SITES.find((s) => s.id === id);
export const siteByCsvName = (name) =>
  SITES.find((s) => s.csvName.toLowerCase() === String(name).toLowerCase());
