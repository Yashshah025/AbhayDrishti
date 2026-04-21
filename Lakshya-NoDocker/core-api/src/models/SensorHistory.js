import mongoose from 'mongoose';

const SensorHistorySchema = new mongoose.Schema(
  {
    siteId:    { type: String, required: true, index: true },
    timestamp: { type: Date,   required: true },
    pressure:  { type: Number, default: 0 },
    entry:     { type: Number, default: 0 },
    exit:      { type: Number, default: 0 },
    density:   { type: Number, default: 0 },
    vehicles:  { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    confidence: { type: Number, default: 0 },
    futurePressureT10: { type: Number, default: 0 },
    forecast15: { type: [Number], default: [] },
  },
  { versionKey: false },
);

SensorHistorySchema.index({ siteId: 1, timestamp: -1 });
// TTL: drop sensor rows older than 7 days
SensorHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export const SensorHistory = mongoose.model('SensorHistory', SensorHistorySchema);
