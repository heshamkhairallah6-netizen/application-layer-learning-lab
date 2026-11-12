import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Callout, PageHead, Panel, Stat } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon, ShieldIcon, TerminalIcon } from '../components/ui/icons';
import { useProgress } from '../lib/progress';

const LAYERS = [
  { n: 7, name: 'Application', hint: 'HTTP · DNS · SMTP · SSH · REST', pdu: 'Data' },
  { n: 6, name: 'Presentation', hint: 'TLS records · encoding · serialization', pdu: 'Data' },
  { n: 5, name: 'Session', hint: 'TLS session · cookies · connection state', pdu: 'Data' },
  { n: 4, name: 'Transport', hint: 'TCP · UDP · ports · segmentation', pdu: 'Segment' },
  { n: 3, name: 'Network', hint: 'IP addressing · routing', pdu: 'Packet' },
  { n: 2, name: 'Data link', hint: 'Ethernet · MAC · switching', pdu: 'Frame' },
  { n: 1, name: 'Physical', hint: 'Cabling · radio · signalling', pdu: 'Bits' },
];

const LABS = [
  {
    index: '03',
    path: '/http',
    name: 'HTTP / HTTPS Laboratory',
    body: 'Method semantics, request and response headers, status codes, TCP/TLS handshake and cache behaviour — step by step.',
    tags: ['GET', 'POST', 'PUT', 'DELETE', 'TLS 1.3'],
  },
  {
    index: '04',
    path: '/dns',
    name: 'DNS Laboratory',
    body: 'Walk the resolution hierarchy from stub resolver to root, TLD and authoritative servers, across six record scenarios.',
    tags: ['A', 'AAAA', 'CNAME', 'MX', 'NXDOMAIN'],
  },
  {
    index: '05',
    path: '/dhcp',
    name: 'DHCP Laboratory',
    body: 'Inspect the full DORA exchange, every message field and option, then replay a lease renewal at T1.',
    tags: ['DORA', 'Lease', 'Options'],
  },
  {
    index: '06',
    path: '/email',
    name: 'Email Protocol Laboratory',
    body: 'Follow a message from composition through SMTP submission and relay to IMAP synchronisation on the recipient device.',
    tags: ['SMTP', 'IMAP', 'POP3', 'MIME'],
  },
  {
    index: '07',
    path: '/api-lab',
    name: 'API Communication Laboratory',
    body: 'Animate REST request lifecycles through gateway, service and database — plus a live endpoint you can call yourself.',
    tags: ['REST', 'JSON', '201', '401', '422'],
  },
  {
    index: '08',
    path: '/troubleshooting',
    name: 'Practical Troubleshooting',
    body: 'Six production-style tickets. Run simulated diagnostics, form a diagnosis and verify the resolution.',
    tags: ['dig', 'curl', 'ipconfig', 'sshd'],
  },
];

type Health = {
  service?: string;
  status?: string;
  uptimeSeconds?: number;
  uptime?: number;
  runtime?: string;
  node?: string;
  endpoints?: string[];
};

function formatUptime(seconds: number | undefined): string {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Overview() {
  const { progress, percent } = useProgress();
  const [health, setHealth] = useState<{ state: 'loading' | 'ok' | 'error'; data?: Health }>({ state: 'loading' });

  useEffect(() => {
    let alive = true;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: Health) => {
        if (alive) setHealth({ state: 'ok', data });
      })
      .catch(() => {
        if (alive) setHealth({ state: 'error' });
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <PageHead
        eyebrow="OSI Layer 7 · Engineering Laboratory"
        title="Application Layer Engineering Lab"
        lede="A hands-on working environment for the protocols that sit closest to the user: HTTP, DNS, DHCP, email, remote access and APIs. Watch every exchange, inspect every field, then diagnose realistic failures."
        actions={
          <>
            <Link className="btn btn--primary" to="/fundamentals">
              Start with fundamentals
              <ArrowIcon />
            </Link>
            <Link className="btn btn--ghost" to="/http">
              Open HTTP lab
            </Link>
          </>
        }
      />

      <div className="grid grid--sidebar">
        <Panel
          title="Layer 7 is where software meets the network"
          sub="scope of this laboratory"
          footer={
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {['HTTP', 'HTTPS', 'DNS', 'DHCP', 'SMTP', 'IMAP', 'POP3', 'SSH', 'FTP', 'SFTP', 'SNMP', 'NTP', 'REST', 'JSON'].map((tag) => (
                <span className="chip" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          }
        >
          <div className="stack">
            <p style={{ margin: 0, color: '#cbd4dd', fontSize: 13.4, lineHeight: 1.7 }}>
              The Application Layer is not the browser, and it is not the web page. It is the set of protocols and encodings that
              applications use to exchange meaning: a request for a document, a name resolved to an address, a mailbox synchronised, a
              configuration lease granted.
            </p>
            <p style={{ margin: 0, color: '#aab4c0', fontSize: 13, lineHeight: 1.7 }}>
              Everything below this layer moves bytes. Layer 7 decides <em>what those bytes mean</em> — and that is where almost every
              real incident is diagnosed.
            </p>

            <div className="grid grid--3" style={{ gap: 10 }}>
              <div className="stat">
                <div className="stat__label">Protocols covered</div>
                <div className="stat__value">14</div>
                <div className="stat__hint">ports, transport, failure modes</div>
              </div>
              <div className="stat">
                <div className="stat__label">Interactive simulations</div>
                <div className="stat__value">5</div>
                <div className="stat__hint">frame-accurate, inspectable</div>
              </div>
              <div className="stat">
                <div className="stat__label">Live tickets</div>
                <div className="stat__value">6</div>
                <div className="stat__hint">diagnose before you reveal</div>
              </div>
            </div>

            <Callout tone="teal">
              <span>
                <strong>How to use the lab.</strong> Read the step explanation, then click any component in a diagram to see its role.
                Every simulation supports play, pause, previous, next, replay and speed control — nothing is pre-rendered video.
              </span>
            </Callout>
          </div>
        </Panel>

        <Panel title="The OSI stack" sub="Layer 7 highlighted" flush>
          <div className="osi-stack" style={{ padding: 12 }}>
            {LAYERS.map((layer) => (
              <div className={`osi-row${layer.n === 7 ? ' is-layer7' : ''}`} key={layer.n}>
                <span className="osi-row__num">{layer.n}</span>
                <span className="stack" style={{ gap: 1 }}>
                  <span className="osi-row__name">{layer.name}</span>
                  <span className="osi-row__hint">{layer.hint}</span>
                </span>
                <span className="mono faint" style={{ fontSize: 9.5 }}>
                  {layer.pdu}
                </span>
              </div>
            ))}
          </div>
          <div className="panel__foot">
            <span className="mono faint" style={{ fontSize: 10.5 }}>
              THIS LABORATORY: LAYER 7 ONLY
            </span>
          </div>
        </Panel>
      </div>

      <div className="grid grid--4" style={{ marginTop: 16 }}>
        <Stat label="Pages visited" value={`${progress.visited.length} / 11`} hint="tracked in this browser" />
        <Stat label="Simulations completed" value={`${progress.sims.length} / 5`} hint="full timeline inspected" />
        <Stat label="Tickets resolved" value={`${progress.scenarios.length} / 6`} hint="correct diagnosis submitted" />
        <Stat label="Overall progress" value={`${percent}%`} hint="saved locally, no account" />
      </div>

      <Panel
        title="Request path"
        sub="what actually happens when you open a URL"
        style={undefined}
        footer={
          <span className="mono faint" style={{ fontSize: 10.5 }}>
            LAYER 7 OPERATES AT EVERY STAGE AFTER ADDRESS RESOLUTION
          </span>
        }
      >
        <div className="scroll-x">
          <svg viewBox="0 0 920 132" role="img" aria-label="Path from browser through DNS, TCP and TLS, HTTP and the application server" style={{ width: '100%', minWidth: 660, display: 'block' }}>
            <defs>
              <marker id="path-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0 0 6 3 0 6z" fill="#5a6776" />
              </marker>
            </defs>
            {[
              { x: 8, title: 'Browser', sub: 'HTTP client', tag: 'L7' },
              { x: 190, title: 'DNS resolver', sub: 'name → address', tag: 'L7' },
              { x: 372, title: 'TCP + TLS', sub: 'ports · certificates', tag: 'L4/L5' },
              { x: 554, title: 'Web server', sub: 'routing · caching', tag: 'L7' },
              { x: 736, title: 'Application', sub: 'business logic', tag: 'L7' },
            ].map((box) => (
              <g key={box.title}>
                <rect x={box.x} y={34} width={160} height={62} rx="4" fill="rgba(255,255,255,0.025)" stroke="#414d5b" />
                <rect x={box.x} y={34} width={160} height={2.5} fill={box.tag === 'L7' ? '#477b9e' : '#438f89'} opacity="0.85" />
                <text x={box.x + 12} y={52} fill="#7f8b99" fontSize="8.5" letterSpacing="1.2">
                  {box.tag}
                </text>
                <text x={box.x + 12} y={70} fill="#e4e9ee" fontSize="12.5" fontWeight="600">
                  {box.title}
                </text>
                <text x={box.x + 12} y={85} fill="#8d99a6" fontSize="9">
                  {box.sub}
                </text>
              </g>
            ))}
            {[168, 350, 532, 714].map((x) => (
              <line key={x} x1={x} y1={65} x2={x + 20} y2={65} stroke="#5a6776" strokeWidth="1.2" markerEnd="url(#path-arrow)">
                <animate attributeName="stroke-dasharray" values="0 22;22 0" dur="2.4s" repeatCount="indefinite" />
              </line>
            ))}
            <text x="8" y="118" fill="#6f7d8c" fontSize="9.5">
              A single page load can involve four or more independent Layer 7 protocols before the first byte of HTML is rendered.
            </text>
          </svg>
        </div>
      </Panel>

      <h2 className="section-title" style={{ marginTop: 22 }}>
        Laboratory map
      </h2>
      <p className="section-lede" style={{ marginBottom: 12 }}>
        Each laboratory is a complete workspace: animated exchange, field-level inspection and a written technical explanation.
      </p>

      <div className="grid grid--3">
        {LABS.map((lab) => (
          <Link key={lab.path} to={lab.path} className="panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
            <div className="panel__body stack" style={{ gap: 9, flex: 1 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="mono faint" style={{ fontSize: 10.5, letterSpacing: '0.12em' }}>
                  LAB {lab.index}
                </span>
                <ArrowIcon size={13} />
              </div>
              <div className="section-title">{lab.name}</div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.4, lineHeight: 1.65 }}>{lab.body}</p>
              <div className="chip-row" style={{ marginTop: 'auto' }}>
                {lab.tags.map((tag) => (
                  <span className="chip" key={tag} style={{ height: 22, fontSize: 10 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Operating notes" sub="how this platform behaves">
          <ul className="checklist">
            <li>Simulations are generated from protocol state machines, not animated videos — every step is addressable.</li>
            <li>Click a component in any diagram to read its role in the current exchange.</li>
            <li>Progress, quiz scores and resolved tickets are stored in this browser only. No account, no tracking.</li>
            <li>Motion respects <span className="mono">prefers-reduced-motion</span>: transitions become instant when requested.</li>
            <li>The API laboratory calls a real endpoint on this server; all other exchanges are deterministic simulations.</li>
          </ul>
        </Panel>

        <Panel
          title="Environment"
          sub="live service check"
          actions={<Badge tone={health.state === 'ok' ? 'green' : health.state === 'error' ? 'red' : 'muted'}>{health.state === 'ok' ? 'ONLINE' : health.state === 'error' ? 'OFFLINE' : 'CHECKING'}</Badge>}
          footer={<span className="mono faint" style={{ fontSize: 10.5 }}>GET /api/health · served by the Node application server</span>}
        >
          {health.state === 'ok' ? (
            <div className="stack">
              <div className="kv">
                <div className="kv__row">
                  <div className="kv__key">Service</div>
                  <div className="kv__val">{health.data?.service ?? 'layer7-lab-api'}</div>
                </div>
                <div className="kv__row">
                  <div className="kv__key">Status</div>
                  <div className="kv__val">{health.data?.status ?? 'ok'}</div>
                </div>
                <div className="kv__row">
                  <div className="kv__key">Uptime</div>
                  <div className="kv__val">{formatUptime(health.data?.uptimeSeconds ?? health.data?.uptime)}</div>
                </div>
                <div className="kv__row">
                  <div className="kv__key">Runtime</div>
                  <div className="kv__val">{health.data?.runtime ?? health.data?.node ?? 'node'}</div>
                </div>
              </div>
              <div className="mono dim" style={{ fontSize: 10.5 }}>
                {(health.data?.endpoints ?? ['/api/health', '/api/protocols', '/api/echo']).join('  ·  ')}
              </div>
            </div>
          ) : health.state === 'error' ? (
            <Callout tone="warn">
              <span>
                The API process is not answering on this origin. Start the production server with <span className="mono">npm start</span> to
                enable the live environment panel and the API laboratory endpoint.
              </span>
            </Callout>
          ) : (
            <div className="mono dim" style={{ fontSize: 11.5 }}>
              Probing /api/health …
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid--3" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 7 }}>
            <TerminalIcon size={16} />
            <div className="section-title">Learn by inspecting</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.6 }}>
              Every step exposes the real message: request lines, header blocks, DHCP options, DNS flags, SMTP replies.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 7 }}>
            <ShieldIcon size={16} />
            <div className="section-title">Learn by breaking</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.6 }}>
              Six tickets cover stale DNS overrides, scope exhaustion, SPF policy failures, pending migrations and StrictModes.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 7 }}>
            <ArrowIcon size={16} />
            <div className="section-title">Learn by proving</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.6 }}>
              Twenty-four questions across three levels, each with an explanation for the correct and the tempting answer.
            </p>
          </div>
        </div>
      </div>

      <PageNav />
    </>
  );
}
