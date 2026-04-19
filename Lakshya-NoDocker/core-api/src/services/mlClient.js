import axios from 'axios';
import { env } from '../config/env.js';

const client = axios.create({
  baseURL: env.mlUrl,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

export async function mlPredict({ siteId, history }) {
  const { data } = await client.post('/predict', { site_id: siteId, history });
  return data;
}

export async function mlForecast({ siteId, window, horizonMinutes = 5 }) {
  const { data } = await client.post('/forecast', {
    site_id: siteId,
    window,
    horizon_minutes: horizonMinutes,
  });
  return data;
}

export async function mlHealth() {
  try {
    const { data } = await client.get('/healthz');
    return data;
  } catch {
    return { status: 'unreachable' };
  }
}
