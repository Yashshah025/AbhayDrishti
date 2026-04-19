import mongoose from 'mongoose';

const AuthoritySchema = new mongoose.Schema(
  {
    _id:      { type: String },                   // e.g. "POL_SOM" — stable, human-readable
    name:     { type: String, required: true },
    tier:     { type: Number, enum: [1, 2, 3], required: true, index: true },
    agency:   { type: String, required: true },   // "District Police" | "Temple Trust" | ...
    siteId:   { type: String, index: true },      // null = state-wide (Tier 3)
    contact:  { type: String, default: '' },
  },
  { timestamps: true, _id: false },
);

export const Authority = mongoose.model('Authority', AuthoritySchema);
