import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import targetsRouter, { setMongoReady } from './routes/targets.js';

const app=express();
app.use(cors({origin:process.env.CLIENT_URL || true}));
app.use(express.json());
app.get('/api/health',(_req,res)=>res.json({status:'ok',database:mongoose.connection.readyState===1?'connected':'memory'}));
app.use('/api/targets',targetsRouter);

const timers=new Map();
app.locals.startMonitor=(id)=>{
  if(timers.has(id)) return;
  const run=async()=>{ try { await fetch(`http://127.0.0.1:${process.env.PORT||5000}/api/targets/${id}/probe`,{method:'POST'}); } catch(e){ console.error('Probe error:',e.message); } };
  run(); timers.set(id,setInterval(run,Number(process.env.PING_INTERVAL_MS||5000)));
};
app.locals.stopMonitor=(id)=>{ if(timers.has(id)){clearInterval(timers.get(id));timers.delete(id);} };

const port=process.env.PORT||5000;
try { await mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/network_packet_monitor',{serverSelectionTimeoutMS:2500}); setMongoReady(true); console.log('MongoDB connected'); }
catch(e){ setMongoReady(false); console.warn('MongoDB unavailable; using in-memory storage:',e.message); }
app.listen(port,()=>console.log(`API running at http://localhost:${port}`));
