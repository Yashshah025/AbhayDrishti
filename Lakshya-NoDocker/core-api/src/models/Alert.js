import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    siteId:        { type: String, required: true, index: true },
    createdTick:   { type: Number, required: true },
    level:         { type: String, enum: ['Medium', 'High'], required: true },
    type:          { type: String, enum: ['GENUINE CRUSH RISK', 'MOMENTARY SURGE'], required: true },
    pressureNow:       { type: Number, required: true },
    futurePressureT10: { type: Number, default: 0 },
    pressureGradient:  { type: Number, default: 0 },
    confidence:        { type: Number, default: 0 },
    forecast:          { type: [Number], default: [] },   // 15-min LSTM
    currentTier:   { type: Number, enum: [1, 2, 3], default: 1, index: true },
    status:        { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    resolvedAt:    { type: Date },
    resolvedBy:    { type: String },
  },
  { timestamps: true },
);

AlertSchema.index({ siteId: 1, status: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', AlertSchema);
