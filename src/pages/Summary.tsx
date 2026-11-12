import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PROTOCOLS } from '../data/protocols';
import { QUIZ_LEVELS } from '../data/quiz';
import { SCENARIOS } from '../data/troubleshooting';
import { ALL_NAV_ITEMS } from '../lib/nav';
import { useProgress } from '../lib/progress';
import { Badge, Callout, PageHead, Panel } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon, CheckIcon } from '../components/ui/icons';

const TAKEAWAYS = [
  [
    'Layer 7 is where the user contract lives',
    'Everything below layer 7 moves bytes between hosts. Layer 7 decides what those bytes mean: which resource, which identity, which representation, which error.',
  ],
  [
    'Every application protocol rides on a transport',
    'HTTP, DNS, DHCP, SMTP and SSH differ far more in their transport choice than in their purpose. TCP gives ordered, reliable streams; UDP gives cheap, fast datagrams.',
  ],
  [
    'Names are resolved before anything is connected',
    'DNS is a distributed, cached hierarchy. When a browser “cannot reach a site”, the failure is usually naming or TLS — not the web server itself.',
  ],
  [
    'Addresses are leased, not assigned by hand',
    'DHCP DORA gives a client an address, mask, gateway, resolver and lease time. Renewal is unicast; a NAK means the client must start over.',
  ],
  [
    'Mail is two different protocols in sequence',
    'SMTP submits and relays between servers; IMAP or POP3 retrieves for the client. A mailbox problem and a delivery problem are never the same diagnosis.',
  ],
  [
    'Status codes are a contract, not a mood',
    '2xx succeeded, 3xx moved, 4xx is the caller or the request, 5xx is the server. Idempotency decides whether a retry is safe.',
  ],
];

const PITFALLS = [
  ['HTTPS is HTTP on 443, not a different protocol', 'It is HTTP semantics carried over a TLS session. Headers, methods and status codes are unchanged.'],
  ['DNS over UDP is not “unreliable DNS”', 'Truncated answers set TC and the client retries over TCP; that retry is normal behaviour.'],
  ['DHCP is not just an address', 'A lease without a gateway or resolver produces a host that pings its gateway but cannot browse.'],
  ['Port 25 is server-to-server', 'Submission uses 587 with STARTTLS; IMAP 143 vs 993 and POP3 110 vs 995 follow the same pattern.'],
  ['PUT replaces, PATCH modifies', 'PUT is a full representation and is idempotent; PATCH is partial and is not required to be.'],
  ['404 and 500 point in opposite directions', '404 means the route or resource is missing; 500 means the server accepted the request and then failed.'],
];

export default function Summary() {
  const { progress, percent, resetProgress } = useProgress();
  const [confirming, setConfirming] = useState(false);

  const quizLevelsDone = QUIZ_LEVELS.filter((level) => progress.best[level.id] !== undefined).length;
  const averageBest = quizLevelsDone
    ? Math.round(
        QUIZ_LEVELS.reduce((total, level) => total + (progress.best[level.id] ?? 0), 0) / quizLevelsDone,
      )
    : 0;

  return (
    <>
      <PageHead
        eyebrow="10 · Wrap-up"
        title="Learning Summary"
        lede="A consolidated view of what you have covered, the facts worth memorising, the mistakes that cost marks and time, and your own recorded progress through the lab."
        actions={
          <>
            <Badge tone="teal">{percent}% lab complete</Badge>
            <Badge tone="muted">stored on this device</Badge>
          </>
        }
      />

      <Panel title="Your progress" sub="recorded locally in this browser">
        <div className="grid grid--4">
          <div className="stat">
            <div className="stat__label">Pages visited</div>
            <div className="stat__value">
              {progress.visited.length}/{ALL_NAV_ITEMS.length}
            </div>
            <div className="stat__hint">all eleven routes</div>
          </div>
          <div className="stat">
            <div className="stat__label">Simulations completed</div>
            <div className="stat__value">{progress.sims.length}/5</div>
            <div className="stat__hint">HTTP · DNS · DHCP · email · API</div>
          </div>
          <div className="stat">
            <div className="stat__label">Tickets resolved</div>
            <div className="stat__value">
              {progress.scenarios.length}/{SCENARIOS.length}
            </div>
            <div className="stat__hint">troubleshooting lab</div>
          </div>
          <div className="stat">
            <div className="stat__label">Average best score</div>
            <div className="stat__value">{averageBest}%</div>
            <div className="stat__hint">{quizLevelsDone}/3 levels attempted</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <div
              style={{
                height: '100%',
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #477b9e, #438f89)',
                borderRadius: 2,
                transition: 'width 400ms ease',
              }}
            />
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              11 pages · 5 simulations · 6 tickets · 3 quiz levels
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              {percent}%
            </span>
          </div>
        </div>

        <div className="stack" style={{ gap: 8, marginTop: 16 }}>
          {QUIZ_LEVELS.map((level) => (
            <div key={level.id} className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 12.4, color: '#dfe5ea' }}>{level.name}</span>
              <span className="row" style={{ gap: 8 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {progress.best[level.id] !== undefined ? `best ${progress.best[level.id]}%` : 'not attempted'}
                </span>
                <Link className="link-arrow" to="/quiz" style={{ fontSize: 11 }}>
                  {progress.best[level.id] !== undefined ? 'Improve' : 'Start'}
                  <ArrowIcon size={11} />
                </Link>
              </span>
            </div>
          ))}
        </div>

        <div className="divider" />
        {confirming ? (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              This clears visits, simulations, resolved tickets and quiz scores on this device.
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                resetProgress();
                setConfirming(false);
              }}
            >
              Confirm reset
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(true)}>
            Reset saved progress
          </button>
        )}
      </Panel>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Six things worth remembering" sub="the ideas behind every lab in this platform">
          <ol className="checklist checklist--teal">
            {TAKEAWAYS.map(([title, body]) => (
              <li key={title}>
                <strong>{title}</strong> — {body}
              </li>
            ))}
          </ol>
        </Panel>

        <div className="stack" style={{ gap: 16 }}>
          <Panel title="Common pitfalls" sub="where marks and hours are lost">
            <ul className="checklist">
              {PITFALLS.map(([wrong, right]) => (
                <li key={wrong}>
                  <strong>{wrong}</strong> — {right}
                </li>
              ))}
            </ul>
          </Panel>
          <Callout tone="teal">
            <span>
              <strong>Next step:</strong> re-run one simulation with the speed at 0.5× and predict each step before it plays.
              If your prediction matches the packet, the concept is yours.
            </span>
          </Callout>
        </div>
      </div>

      <Panel
        title="Application layer quick reference"
        sub="ports and transport for everything covered"
        flush
        actions={<Badge tone="blue">{PROTOCOLS.length} protocols</Badge>}
        className="mt-lg"
      >
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Transport</th>
                <th>Ports</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {PROTOCOLS.map((protocol) => (
                <tr key={protocol.id}>
                  <td style={{ whiteSpace: 'nowrap', color: '#e6eaee' }}>{protocol.name}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{protocol.transport}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{protocol.ports}</td>
                  <td style={{ fontSize: 12 }}>{protocol.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Continue practising" sub="jump straight back into a lab" className="mt-lg">
        <div className="grid grid--3">
          {[
            { to: '/http', title: 'HTTP / HTTPS Laboratory', hint: 'Methods, headers, status codes, TLS' },
            { to: '/dns', title: 'DNS Laboratory', hint: 'Recursive resolution, record types' },
            { to: '/dhcp', title: 'DHCP Laboratory', hint: 'DORA, renewal, NAK' },
            { to: '/email', title: 'Email Protocol Laboratory', hint: 'SMTP, IMAP, POP3' },
            { to: '/api', title: 'API Communication Laboratory', hint: 'REST, JSON, idempotency' },
            { to: '/troubleshooting', title: 'Practical Troubleshooting', hint: 'Six tickets to resolve' },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="link-arrow" style={{ display: 'block', lineHeight: 1.5 }}>
              <span style={{ display: 'block', color: '#e6eaee', fontSize: 12.6 }}>{item.title}</span>
              <span style={{ display: 'block', color: 'var(--muted)', fontSize: 11.4, marginTop: 2 }}>{item.hint}</span>
              <span className="row" style={{ gap: 4, marginTop: 6 }}>
                <CheckIcon size={11} />
                <span style={{ fontSize: 10.5 }}>open lab</span>
              </span>
            </Link>
          ))}
        </div>
      </Panel>

      <PageNav />
    </>
  );
}
