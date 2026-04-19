import 'dotenv/config';

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUrl: process.env.MONGO_URL || 'mongodb://mongo:27017/crowdshield',
  mlUrl:    process.env.ML_URL    || 'http://ml-service:5000',
  // 1 tick = 60s in production. Override via TICK_SECONDS for fast demos.
  tickSeconds: parseFloat(process.env.TICK_SECONDS || '60'),
  // Path to the existing dataset (mounted into container in compose)
  datasetPath: process.env.DATASET_PATH || '/data/minute_level_dataset.csv',
  // Floors directory
  floorsDir: process.env.FLOORS_DIR || '/app/data/floors',
  // Tier escalation thresholds (in ticks)
  tier2AfterTicks: parseInt(process.env.TIER2_AFTER || '5', 10),
  tier3AfterTicks: parseInt(process.env.TIER3_AFTER || '10', 10),
};
