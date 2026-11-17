import express from 'express';
import Target from '../models/Target.js';
import { pingHost } from '../services/monitor.js';

const router = express.Router();
const memory = new Map();
let mongoReady = false;
export function setMongoReady(value) { mongoReady = value; }
const all = async () => mongoReady ? await Target.find().sort({ createdAt: -1 }) : [...memory.values()];
const get = async id => mongoReady ? await Target.findById(id) : memory.get(id);
const save = async doc => mongoReady ? await doc.save() : (memory.set(String(doc._id), doc), doc);
const asPlain = d => d?.toObject ? d.toObject() : d;

router.get('/', async (_req,res) => res.json((await all()).map(asPlain)));
router.post('/', async (req,res) => {
  const { name, host } = req.body || {};
  if (!name?.trim() || !host?.trim()) return res.status(400).json({ message: 'Name and host are required.' });
  if (!/^[a-zA-Z0-9.-]+$/.test(host.trim())) return res.status(400).json({ message: 'Enter a valid hostname or IP address.' });
  try {
    const exists = (await all()).some(t => t.host.toLowerCase() === host.trim().toLowerCase());
    if (exists) return res.status(409).json({ message: 'This host is already added.' });
    const doc = mongoReady ? new Target({ name: name.trim(), host: host.trim() }) : { _id: `local-${Date.now()}`, name:name.trim(), host:host.trim(), status:'IDLE', sent:0, received:0, lost:0, lastLatency:null, history:[], createdAt:new Date() };
    await save(doc); res.status(201).json(asPlain(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.post('/:id/start', async (req,res) => {
  const t = await get(req.params.id); if (!t) return res.status(404).json({message:'Target not found'});
  t.status = 'MONITORING'; await save(t); req.app.locals.startMonitor?.(String(t._id)); res.json(asPlain(t));
});
router.post('/:id/stop', async (req,res) => {
  const t = await get(req.params.id); if (!t) return res.status(404).json({message:'Target not found'});
  req.app.locals.stopMonitor?.(String(t._id)); t.status='STOPPED'; await save(t); res.json(asPlain(t));
});
router.post('/:id/probe', async (req,res) => {
  const t = await get(req.params.id); if (!t) return res.status(404).json({message:'Target not found'});
  const result = await pingHost(t.host);
  t.sent=(t.sent||0)+1; t.received=(t.received||0)+(result.success?1:0); t.lost=(t.lost||0)+(result.success?0:1);
  t.lastLatency=result.latency;
  const threshold=Number(process.env.LATENCY_THRESHOLD_MS||100);
  t.status=result.success ? (result.latency<=threshold?'HEALTHY':'DEGRADED') : 'OFFLINE';
  t.history=[...(t.history||[]),{latency:result.latency,success:result.success,at:new Date()}].slice(-30);
  await save(t); res.json({ target:asPlain(t), result });
});
router.delete('/:id', async (req,res) => {
  req.app.locals.stopMonitor?.(req.params.id);
  if (mongoReady) await Target.findByIdAndDelete(req.params.id); else memory.delete(req.params.id);
  res.json({message:'Target removed'});
});
export default router;
