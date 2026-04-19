import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// project root is core-api/../  (i.e. the Lakshya-NoDocker folder)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/crowdshield',
  mlUrl:    process.env.ML_URL    || 'http://localhost:5000',
  // 1 tick = 60s in production. Override via TICK_SECONDS for fast demos.
  tickSeconds: parseFloat(process.env.TICK_SECONDS || '2'),
  // Path to the dataset — defaults to project root
  datasetPath: process.env.DATASET_PATH ||
    path.join(PROJECT_ROOT, 'minute_level_dataset.csv'),
  // Floors directory inside core-api
  floorsDir: process.env.FLOORS_DIR ||
    path.join(__dirname, '..', '..', 'data', 'floors'),
  // Tier escalation thresholds (in ticks)
  tier2AfterTicks: parseInt(process.env.TIER2_AFTER || '5', 10),
  tier3AfterTicks: parseInt(process.env.TIER3_AFTER || '10', 10),
};
