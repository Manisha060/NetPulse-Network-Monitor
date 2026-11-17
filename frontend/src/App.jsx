
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import {
  Activity,
  Wifi,
  Clock,
  Plus,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Globe,
  ArrowDownUp,
  LayoutDashboard,
  Server,
  GitBranch
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

import './style.css';

const API =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const fmt = value =>
  value == null ? '—' : `${Number(value).toFixed(1)} ms`;

/* =========================
   MAIN APPLICATION
========================= */

function App() {
  const [targets, setTargets] = useState([]);

  const [name, setName] = useState('Google DNS');
  const [host, setHost] = useState('8.8.8.8');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [db, setDb] = useState('checking');
  const [now, setNow] = useState(new Date());

  const [activePage, setActivePage] = useState('overview');

  const load = async () => {
    try {
      const [targetResponse, healthResponse] =
        await Promise.all([
          axios.get(`${API}/targets`),
          axios.get(`${API}/health`)
        ]);

      setTargets(targetResponse.data);
      setDb(healthResponse.data.database);
    } catch (err) {
      setError(
        'Backend not reachable. Start the backend server.'
      );
    }
  };

  useEffect(() => {
    load();

    const timer = setInterval(() => {
      load();
      setNow(new Date());
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const add = async e => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await axios.post(`${API}/targets`, {
        name,
        host
      });

      setName('');
      setHost('');

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to add target'
      );
    } finally {
      setLoading(false);
    }
  };

  const action = async (id, type) => {
    try {
      await axios.post(
        `${API}/targets/${id}/${type}`
      );

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Action failed'
      );
    }
  };

  const remove = async id => {
    try {
      await axios.delete(`${API}/targets/${id}`);
      await load();
    } catch {
      setError('Could not remove target');
    }
  };

  const probe = async id => {
    try {
      await axios.post(`${API}/targets/${id}/probe`);
      await load();
    } catch {
      setError('Probe failed');
    }
  };

  const stats = useMemo(() => {
    const sent = targets.reduce(
      (a, t) => a + (t.sent || 0), 0
    );

    const lost = targets.reduce(
      (a, t) => a + (t.lost || 0), 0
    );

    const values = targets
      .map(t => t.lastLatency)
      .filter(v => v != null);

    return {
      sent,
      lost,

      loss: sent
        ? (lost / sent) * 100
        : 0,

      lat: values.length
        ? values.reduce((a, b) => a + b, 0) /
          values.length
        : 0,

      online: targets.filter(t =>
        ['HEALTHY', 'DEGRADED'].includes(t.status)
      ).length
    };
  }, [targets]);

  const history = useMemo(() => {
    return targets
      .flatMap(t =>
        (t.history || []).map(h => ({
          time: new Date(h.at).toLocaleTimeString(),
          latency: h.latency,
          host: t.name
        }))
      )
      .slice(-30);
  }, [targets]);

  const nav = page => {
    setActivePage(page);
    setError('');
  };

  const statusClass = status =>
    status?.toLowerCase() || 'idle';

  return (
    <div className="app">

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            <Activity size={22} />
          </div>

          <div>
            <b>NetPulse</b>
            <small>NETWORK INTELLIGENCE</small>
          </div>
        </div>

        <div className="side-label">
          WORKSPACE
        </div>

        <button
          className={`nav ${
            activePage === 'overview' ? 'active' : ''
          }`}
          onClick={() => nav('overview')}
        >
          <LayoutDashboard size={18} />
          Overview
        </button>

        <button
          className={`nav ${
            activePage === 'hosts' ? 'active' : ''
          }`}
          onClick={() => nav('hosts')}
        >
          <Server size={18} />
          Host Monitors
        </button>

        <button
          className={`nav ${
            activePage === 'automata' ? 'active' : ''
          }`}
          onClick={() => nav('automata')}
        >
          <GitBranch size={18} />
          Automata Status
        </button>

        <div className="side-bottom">
          <div className="live-dot" />
          Monitoring engine
          <span>v1.0</span>
        </div>

      </aside>

      <main className="main">

        <header>
          <div>
            <div className="eyebrow">
              NETWORK OPERATIONS / {activePage.toUpperCase()}
            </div>

            <h1>
              {activePage === 'overview' &&
                'Packet Loss & Latency'}

              {activePage === 'hosts' &&
                'Host Monitors'}

              {activePage === 'automata' &&
                'Automata Status'}
            </h1>

            <p className="sub">
              {activePage === 'overview' &&
                'Monitor network health, response times and packet delivery.'}

              {activePage === 'hosts' &&
                'Manage and monitor your network endpoints.'}

              {activePage === 'automata' &&
                'Network monitoring state transition system.'}
            </p>
          </div>

          <div className="header-right">

            <span className="db-pill">
              <i />
              DB {db}
            </span>

            <button className="refresh" onClick={load}>
              <RefreshCw size={16} />
              Refresh
            </button>

          </div>
        </header>

        {error && (
          <div className="error">
            {error}
            <button onClick={() => setError('')}>
              ×
            </button>
          </div>
        )}

        {activePage === 'overview' && (
          <Overview
            targets={targets}
            stats={stats}
            history={history}
            onHosts={() => nav('hosts')}
          />
        )}

        {activePage === 'hosts' && (
          <HostPage
            targets={targets}
            name={name}
            host={host}
            setName={setName}
            setHost={setHost}
            add={add}
            loading={loading}
            action={action}
            remove={remove}
            probe={probe}
            statusClass={statusClass}
          />
        )}

        {activePage === 'automata' && (
          <AutomataPage targets={targets} />
        )}

        <footer>
          <span>
            NETPULSE · NETWORK MONITORING DASHBOARD
          </span>

          <span>
            Last refreshed {now.toLocaleTimeString()}
          </span>
        </footer>

      </main>
    </div>
  );
}

/* =========================
   STATISTICS COMPONENT
========================= */

function Stat({ icon, label, value, note, tone }) {
  return (
    <div className="stat">

      <div className={`stat-icon ${tone}`}>
        {icon}
      </div>

      <div>
        <label>{label}</label>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>

    </div>
  );
}

/* =========================
   OVERVIEW PAGE
========================= */

function Overview({
  targets,
  stats,
  history,
  onHosts
}) {
  return (
    <>

      <section className="stats">

        <Stat
          icon={<Globe />}
          label="MONITORED TARGETS"
          value={targets.length}
          note={`${stats.online} reachable`}
          tone="blue"
        />

        <Stat
          icon={<Clock />}
          label="AVG. LATENCY"
          value={fmt(stats.lat)}
          note="Across successful probes"
          tone="purple"
        />

        <Stat
          icon={<ArrowDownUp />}
          label="PACKET LOSS"
          value={`${stats.loss.toFixed(1)}%`}
          note={`${stats.lost} packets lost`}
          tone="orange"
        />

        <Stat
          icon={<Wifi />}
          label="PACKETS SENT"
          value={stats.sent}
          note="Total probe attempts"
          tone="green"
        />

      </section>

      <section className="panel chart-panel">

        <div className="panel-head">
          <div>
            <h2>Latency Overview</h2>
            <p>Recent network response time</p>
          </div>
        </div>

        <div className="chart">

          {history.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart data={history}>

                <defs>
                  <linearGradient
                    id="latencyFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#6488f5"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="100%"
                      stopColor="#6488f5"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#edf0f6"
                />

                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  tick={{ fontSize: 11 }}
                />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#6488f5"
                  strokeWidth={2}
                  fill="url(#latencyFill)"
                  connectNulls
                />

              </AreaChart>
            </ResponsiveContainer>

          ) : (

            <div className="empty-chart">
              <Activity size={30} />
              <b>Waiting for probe data</b>
              <span>
                Start a target to see latency trends.
              </span>
            </div>

          )}

        </div>

      </section>

      <section className="panel quick-panel">

        <h2>Network Endpoints</h2>

        <p>
          {targets.length} configured targets
        </p>

        <button
          className="primary"
          onClick={onHosts}
        >
          <Server size={17} />
          Manage Host Monitors
        </button>

      </section>

    </>
  );
}

/* =========================
   HOST MONITORS PAGE
========================= */

function HostPage({
  targets,
  name,
  host,
  setName,
  setHost,
  add,
  loading,
  action,
  remove,
  probe,
  statusClass
}) {
  return (
    <>

      <section className="panel add-panel">

        <div className="panel-head">

          <div>
            <h2>Add Network Target</h2>
            <p>
              Enter a hostname or IP address to monitor.
            </p>
          </div>

          <Plus />

        </div>

        <form onSubmit={add}>

          <label>DISPLAY NAME</label>

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Google DNS"
            required
          />

          <label>HOSTNAME / IP ADDRESS</label>

          <input
            value={host}
            onChange={e => setHost(e.target.value)}
            placeholder="8.8.8.8"
            required
          />

          <button
            className="primary"
            disabled={loading}
          >
            <Plus size={17} />
            {loading ? 'Adding...' : 'Add Target'}
          </button>

        </form>

        <div className="hint">
          Only monitor hosts you own or have permission to test.
        </div>

      </section>

      <section className="panel targets-panel">

        <div className="panel-head">

          <div>
            <h2>All Monitored Hosts</h2>
            <p>
              Start, stop, test or remove endpoints.
            </p>
          </div>

          <span className="count">
            {targets.length} TARGETS
          </span>

        </div>

        {targets.length === 0 ? (

          <div className="empty">
            <Globe size={30} />
            <b>No targets configured</b>
            <span>Add a host to start monitoring.</span>
          </div>

        ) : (

          <div className="table-wrap">

            <table>

              <thead>
                <tr>
                  <th>ENDPOINT</th>
                  <th>STATUS</th>
                  <th>LATENCY</th>
                  <th>PACKET LOSS</th>
                  <th>PACKETS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>

                {targets.map(t => (

                  <tr key={t._id}>

                    <td>
                      <div className="endpoint">

                        <div className="host-icon">
                          <Globe size={17} />
                        </div>

                        <div>
                          <b>{t.name}</b>
                          <small>{t.host}</small>
                        </div>

                      </div>
                    </td>

                    <td>
                      <span
                        className={`status ${statusClass(t.status)}`}
                      >
                        <i />
                        {t.status}
                      </span>
                    </td>

                    <td className="latency">
                      {fmt(t.lastLatency)}
                    </td>

                    <td>
                      {t.sent
                        ? `${((t.lost || 0) / t.sent * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>

                    <td>
                      {t.received || 0} / {t.sent || 0}
                    </td>

                    <td>
                      <div className="actions">

                        {[
                          'MONITORING',
                          'HEALTHY',
                          'DEGRADED',
                          'OFFLINE'
                        ].includes(t.status) ? (

                          <button
                            title="Stop monitoring"
                            onClick={() =>
                              action(t._id, 'stop')
                            }
                          >
                            <Square size={15} />
                          </button>

                        ) : (

                          <button
                            title="Start monitoring"
                            onClick={() =>
                              action(t._id, 'start')
                            }
                          >
                            <Play size={15} />
                          </button>

                        )}

                        <button
                          title="Probe once"
                          onClick={() => probe(t._id)}
                        >
                          <RefreshCw size={15} />
                        </button>

                        <button
                          className="danger"
                          title="Delete target"
                          onClick={() => remove(t._id)}
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </>
  );
}

/* =========================
   AUTOMATA STATUS PAGE
========================= */

function AutomataPage({ targets }) {

  const transitions = [
    ['IDLE', 'START', 'MONITORING', 'Begin periodic ping'],
    ['STOPPED', 'START', 'MONITORING', 'Resume monitoring'],

    ['MONITORING', 'PROBE_OK_FAST', 'HEALTHY', 'Latency <= 100 ms'],
    ['MONITORING', 'PROBE_OK_SLOW', 'DEGRADED', 'Latency > 100 ms'],
    ['MONITORING', 'PROBE_FAIL', 'OFFLINE', 'Probe timeout'],

    ['HEALTHY', 'PROBE_OK_FAST', 'HEALTHY', 'Update metrics'],
    ['HEALTHY', 'PROBE_OK_SLOW', 'DEGRADED', 'Raise latency warning'],
    ['HEALTHY', 'PROBE_FAIL', 'OFFLINE', 'Mark unreachable'],

    ['DEGRADED', 'PROBE_OK_FAST', 'HEALTHY', 'Clear warning'],
    ['DEGRADED', 'PROBE_OK_SLOW', 'DEGRADED', 'Keep warning'],
    ['DEGRADED', 'PROBE_FAIL', 'OFFLINE', 'Mark unreachable'],

    ['OFFLINE', 'PROBE_OK_FAST', 'HEALTHY', 'Reachable again'],
    ['OFFLINE', 'PROBE_OK_SLOW', 'DEGRADED', 'Reachable with warning'],
    ['OFFLINE', 'PROBE_FAIL', 'OFFLINE', 'Remain offline'],

    [
      'MONITORING / HEALTHY / DEGRADED / OFFLINE',
      'STOP',
      'STOPPED',
      'Stop monitoring'
    ]
  ];

  return (
    <>

      {/* SIMPLE STATE TRANSITION DIAGRAM */}

      <section className="panel automata-panel">

        <div className="panel-head">
          <div>
            <h2>Network Monitoring State Machine</h2>
            <p>Simple State Transition Diagram</p>
          </div>

          <GitBranch color="#536ff0" size={22} />
        </div>

        <div className="simple-automata">

          <div className="simple-state idle">
            <span className="state-dot gray-dot" />
            <b>IDLE</b>
            <small>Target configured, not started</small>
          </div>

          <div className="simple-arrow">
            <span>↓</span>
            <small>START</small>
          </div>

          <div className="simple-state monitoring">
            <span className="state-dot blue-dot" />
            <b>MONITORING</b>
            <small>Periodic network probes running</small>
          </div>

          <div className="simple-arrow">
            <span>↓</span>
            <small>PROBE RESULT</small>
          </div>

          <div className="simple-results">

            <div className="simple-state healthy">
              <span className="state-dot green-dot" />
              <b>HEALTHY</b>
              <small>Latency ≤ 100 ms</small>
              <span className="result-label green-label">
                Successful response
              </span>
            </div>

            <div className="simple-state degraded">
              <span className="state-dot orange-dot" />
              <b>DEGRADED</b>
              <small>Latency above 100 ms</small>
              <span className="result-label orange-label">
                Slow response
              </span>
            </div>

            <div className="simple-state offline">
              <span className="state-dot red-dot" />
              <b>OFFLINE</b>
              <small>Probe failed or timed out</small>
              <span className="result-label red-label">
                No response
              </span>
            </div>

          </div>

          <div className="simple-arrow">
            <span>↓</span>
            <small>STOP</small>
          </div>

          <div className="simple-state stopped">
            <span className="state-dot gray-dot" />
            <b>STOPPED</b>
            <small>Monitoring stopped by user</small>
          </div>

        </div>

        <div className="simple-legend">
          <span><i className="gray-dot" /> Idle / Stopped</span>
          <span><i className="blue-dot" /> Monitoring</span>
          <span><i className="green-dot" /> Healthy</span>
          <span><i className="orange-dot" /> Degraded</span>
          <span><i className="red-dot" /> Offline</span>
        </div>

        <div className="automata-note">
          <b>Transition Logic</b>
          <p>
            IDLE → MONITORING. A successful probe with latency ≤ 100 ms
            leads to HEALTHY. A successful probe above 100 ms leads to
            DEGRADED. A failed probe leads to OFFLINE. STOP moves an
            active monitoring state to STOPPED. START resumes monitoring.
          </p>
        </div>

      </section>

      {/* STATE TRANSITION TABLE */}

      <section className="panel">

        <div className="panel-head">
          <div>
            <h2>State Transition Table</h2>
            <p>Current state, input event and next state</p>
          </div>

          <span className="count">
            {transitions.length} TRANSITIONS
          </span>
        </div>

        <div className="table-wrap">

          <table>

            <thead>
              <tr>
                <th>CURRENT STATE</th>
                <th>INPUT / EVENT</th>
                <th>NEXT STATE</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {transitions.map((transition, index) => (
                <tr key={index}>
                  <td><b>{transition[0]}</b></td>
                  <td>{transition[1]}</td>
                  <td>
                    <span className={`status ${transition[2].toLowerCase()}`}>
                      {transition[2]}
                    </span>
                  </td>
                  <td>{transition[3]}</td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

      </section>

      {/* CURRENT TARGET STATES */}

      <section className="panel">

        <div className="panel-head">
          <div>
            <h2>Current Target States</h2>
            <p>Live state of configured monitoring endpoints</p>
          </div>

          <span className="count">
            {targets.length} TARGETS
          </span>
        </div>

        {targets.length === 0 ? (

          <div className="empty">
            No targets available. Add a host to start monitoring.
          </div>

        ) : (

          targets.map(target => (
            <div
              className="current-state"
              key={target._id}
            >
              <div>
                <b>{target.name}</b>
                <small>{target.host}</small>
              </div>

              <span
                className={`status ${
                  target.status?.toLowerCase() || 'idle'
                }`}
              >
                <i />
                {target.status || 'IDLE'}
              </span>
            </div>
          ))

        )}

      </section>

    </>
  );
}

export default App;
