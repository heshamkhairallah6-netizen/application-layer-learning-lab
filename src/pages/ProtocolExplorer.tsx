import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PROTOCOLS, PROTOCOL_CATEGORIES, type ProtocolCategory } from '../data/protocols';
import { Badge, Callout, PageHead, Panel, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon } from '../components/ui/icons';

type Filter = 'All' | ProtocolCategory;
type DetailTab = 'overview' | 'process' | 'troubleshoot';

const SECURITY_TONE = {
  Encrypted: 'teal',
  Cleartext: 'amber',
  'Deployment dependent': 'blue',
  'Not applicable': 'muted',
} as const;

const LAB_LINKS: Record<string, string> = {
  http: '/http',
  https: '/http',
  dns: '/dns',
  dhcp: '/dhcp',
  smtp: '/email',
  imap: '/email',
  pop3: '/email',
};

export default function ProtocolExplorer() {
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('http');
  const [tab, setTab] = useState<DetailTab>('overview');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROTOCOLS.filter((protocol) => {
      const inCategory = filter === 'All' || protocol.category === filter;
      if (!inCategory) return false;
      if (!q) return true;
      return [protocol.name, protocol.full, protocol.ports, protocol.transport, protocol.category, ...protocol.keywords]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [filter, query]);

  const selected = PROTOCOLS.find((protocol) => protocol.id === selectedId) ?? PROTOCOLS[0];
  const labLink = LAB_LINKS[selected.id];

  return (
    <>
      <PageHead
        eyebrow="02 · Reference"
        title="Protocol Explorer"
        lede="Fourteen Layer 7 protocols with their ports, transport, exchange sequence, security posture and the failure modes you will actually meet in operations."
        actions={<Badge tone="blue">{PROTOCOLS.length} PROTOCOLS</Badge>}
      />

      <div className="grid grid--sidebar">
        <Panel
          title="Protocol index"
          sub={`${list.length} of ${PROTOCOLS.length} shown`}
          flush
          actions={
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name, port, keyword…"
              aria-label="Filter protocols"
              style={{ maxWidth: 220, height: 28, fontSize: 11.5 }}
            />
          }
        >
          <div className="panel__body" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <div className="chip-row" role="group" aria-label="Protocol category">
              <button type="button" className={`chip${filter === 'All' ? ' is-active' : ''}`} onClick={() => setFilter('All')}>
                All
              </button>
              {PROTOCOL_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`chip${filter === category ? ' is-active' : ''}`}
                  onClick={() => setFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="scenario-list" style={{ maxHeight: 470, overflowY: 'auto' }}>
            {list.length === 0 ? (
              <div className="panel__body mono dim" style={{ fontSize: 11.5 }}>
                No protocol matches “{query}”. Clear the filter to see all fourteen.
              </div>
            ) : (
              list.map((protocol) => (
                <button
                  key={protocol.id}
                  type="button"
                  className={`scenario-item${protocol.id === selectedId ? ' is-active' : ''}`}
                  onClick={() => {
                    setSelectedId(protocol.id);
                    setTab('overview');
                  }}
                >
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <strong>{protocol.name}</strong>
                    <span className="mono faint" style={{ fontSize: 10 }}>
                      {protocol.ports.split(' ')[0]}
                    </span>
                  </div>
                  <div className="mono faint" style={{ fontSize: 10.2, marginTop: 2 }}>
                    {protocol.full}
                  </div>
                </button>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title={`${selected.name} — ${selected.full}`}
          sub={selected.category}
          actions={<Badge tone={SECURITY_TONE[selected.security]}>{selected.security.toUpperCase()}</Badge>}
          footer={
            <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span className="mono faint" style={{ fontSize: 10.5 }}>
                {selected.standard}
              </span>
              {labLink ? (
                <Link className="link-arrow" to={labLink}>
                  Open matching laboratory <ArrowIcon size={12} />
                </Link>
              ) : (
                <span className="mono faint" style={{ fontSize: 10.5 }}>
                  REFERENCE ONLY
                </span>
              )}
            </div>
          }
        >
          <div className="stack">
            <div className="kv">
              <div className="kv__row">
                <div className="kv__key">Default ports</div>
                <div className="kv__val">{selected.ports}</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Transport</div>
                <div className="kv__val">{selected.transport}</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Security</div>
                <div className="kv__val">{selected.security}</div>
              </div>
            </div>

            <Tabs
              items={[
                { id: 'overview', label: 'Overview' },
                { id: 'process', label: 'Communication' },
                { id: 'troubleshoot', label: 'Troubleshooting' },
              ]}
              active={tab}
              onChange={setTab}
              label="Protocol detail view"
            />

            {tab === 'overview' ? (
              <div className="stack">
                <div>
                  <div className="eyebrow">WHAT IT DOES</div>
                  <p style={{ margin: '4px 0 0', color: '#d3dbe3', fontSize: 12.8, lineHeight: 1.7 }}>{selected.purpose}</p>
                </div>
                <div>
                  <div className="eyebrow">WHY IT IS USED</div>
                  <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.8, lineHeight: 1.7 }}>{selected.why}</p>
                </div>
                <div>
                  <div className="eyebrow">REAL-WORLD EXAMPLES</div>
                  <ul className="checklist" style={{ marginTop: 4 }}>
                    {selected.examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {tab === 'process' ? (
              <div className="stack">
                <div className="eyebrow">EXCHANGE SEQUENCE</div>
                <ol className="checklist checklist--teal">
                  {selected.process.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <Callout tone="info">
                  <span>
                    Each step is an application-level message. The transport beneath only guarantees delivery; the protocol above decides
                    what a message means and what may follow it.
                  </span>
                </Callout>
              </div>
            ) : null}

            {tab === 'troubleshoot' ? (
              <div className="stack">
                <div className="eyebrow">COMMON FAILURE MODES</div>
                <ul className="checklist">
                  {selected.troubleshooting.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Callout tone="warn">
                  <span>
                    Start with the protocol's own signal: a reply code, status code, RCODE or message type identifies which side failed far
                    faster than guessing at the network.
                  </span>
                </Callout>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <h2 className="section-title" style={{ marginTop: 22 }}>
        Protocol comparison
      </h2>
      <p className="section-lede" style={{ marginBottom: 12 }}>
        Sorted by the protocol index. Ports shown are the registered defaults; deployments frequently remap them.
      </p>

      <Panel title="All Layer 7 protocols" sub="ports · transport · security" flush>
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Full name</th>
                <th>Ports</th>
                <th>Transport</th>
                <th>Category</th>
                <th>Security</th>
                <th>Lab</th>
              </tr>
            </thead>
            <tbody>
              {PROTOCOLS.map((protocol) => (
                <tr key={protocol.id}>
                  <td>
                    <button
                      type="button"
                      className="link-arrow"
                      onClick={() => {
                        setSelectedId(protocol.id);
                        setTab('overview');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
                    >
                      {protocol.name}
                    </button>
                  </td>
                  <td>{protocol.full}</td>
                  <td className="mono">{protocol.ports}</td>
                  <td>{protocol.transport}</td>
                  <td>{protocol.category}</td>
                  <td>
                    <Badge tone={SECURITY_TONE[protocol.security]}>{protocol.security}</Badge>
                  </td>
                  <td>
                    {LAB_LINKS[protocol.id] ? (
                      <Link className="link-arrow" to={LAB_LINKS[protocol.id]}>
                        Open <ArrowIcon size={11} />
                      </Link>
                    ) : (
                      <span className="faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid--3" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: '#7fb2d2' }}>
              ENCRYPTION
            </span>
            <div className="section-title">Implicit vs negotiated TLS</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.65 }}>
              HTTPS (443), IMAPS (993) and POP3S (995) begin TLS immediately. SMTP (25), IMAP (143) and SMTP submission (587) usually start
              cleartext and negotiate with STARTTLS — which is why a missing STARTTLS is a real downgrade risk.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: '#7fb2d2' }}>
              TRANSPORT
            </span>
            <div className="section-title">Why DNS and DHCP use UDP</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.65 }}>
              Both must work before a host has a usable configuration or a cached answer. UDP avoids a handshake round trip, and DHCP needs
              broadcast, which TCP cannot provide.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: '#7fb2d2' }}>
              SCOPE
            </span>
            <div className="section-title">SFTP is not FTP over SSH</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.65 }}>
              SFTP is a subsystem of SSH on port 22 with its own file-transfer protocol. FTPS is FTP with TLS on 990/989. They share a
              purpose, not an implementation.
            </p>
          </div>
        </div>
      </div>

      <PageNav />
    </>
  );
}
