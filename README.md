# Network Packet Loss & Latency Monitoring Dashboard

Full-stack student project built with React + Vite, Node.js + Express, and MongoDB.

## Features
- Dashboard KPIs: average latency, packet loss, uptime, and monitored targets
- Add/remove host or IP targets
- Start/stop monitoring each target
- Backend ping probes (Windows and Linux/macOS)
- Live refresh, latency history chart, packet status table
- MongoDB persistence; app remains usable with in-memory storage if MongoDB is unavailable
- Automata state diagram and transition table in `docs/automata.md`

## Requirements
- Node.js 18+
- MongoDB Community Server (optional but recommended)

## Run locally
### 1. Backend
```bash
cd backend
copy .env.example .env   # Windows; on macOS/Linux: cp .env.example .env
npm install
npm run dev
```
Set `MONGO_URI` in `.env` if needed. Default: `mongodb://127.0.0.1:27017/network_packet_monitor`.

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

## Notes
- Monitoring uses the operating system's `ping` command. ICMP may be blocked by firewalls or networks.
- For a safe demo, start with `8.8.8.8` or `1.1.1.1`. Only monitor systems you own or are authorized to test.
- If MongoDB is unavailable, data is kept in memory until the backend restarts.
