import mongoose from 'mongoose';

// One row per (alert × authority) notification. ackAt populated when authority acks.
const AlertLogSchema = new mongoose.Schema(
  {
    alertId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true, index: true },
    siteId:        { type: String, required: true, index: true },
    authorityId:   { type: String, required: true, index: true },
    authorityName: { type: String, required: true },
    agency:        { type: String, required: true },         // "District Police" | ...
    tier:          { type: Number, enum: [1, 2, 3], required: true },
    action:        { type: String, default: '' },            // template instruction text
    notifiedAt:    { type: Date, required: true, default: () => new Date() },
    ackAt:         { type: Date, default: null },
    responseTimeSeconds: { type: Number, default: null },
  },
  { timestamps: true },
);

AlertLogSchema.index({ alertId: 1, authorityId: 1 }, { unique: true });

export const AlertLog = mongoose.model('AlertLog', AlertLogSchema);
