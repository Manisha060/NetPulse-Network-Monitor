import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  host: { type: String, required: true, trim: true, unique: true },
  status: { type: String, enum: ['IDLE','MONITORING','HEALTHY','DEGRADED','OFFLINE','STOPPED'], default: 'IDLE' },
  sent: { type: Number, default: 0 },
  received: { type: Number, default: 0 },
  lost: { type: Number, default: 0 },
  lastLatency: { type: Number, default: null },
  history: [{ latency: Number, success: Boolean, at: { type: Date, default: Date.now } }]
}, { timestamps: true });

export default mongoose.model('Target', targetSchema);
