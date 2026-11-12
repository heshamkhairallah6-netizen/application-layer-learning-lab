import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Callout, PageHead, Panel } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon } from '../components/ui/icons';

type Layer = {
  n: number;
  name: string;
  pdu: string;
  summary: string;
  detail: string;
  examples: string;
};

const LAYERS: Layer[] = [
  {
    n: 7,
    name: 'Application',
    pdu: 'Data',
    summary: 'Protocols that give data meaning',
    detail:
      'Where applications speak to each other: request methods, names, leases, mail envelopes, API resources. Layer 7 defines message syntax, semantics and the sequence of exchanges — not how the bytes travel.',
    examples: 'HTTP, DNS, DHCP, SMTP, IMAP, SSH, SNMP',
  },
  {
    n: 6,
    name: 'Presentation',
    pdu: 'Data',
    summary: 'Encoding, compression, TLS records',
    detail:
      'Transforms data between representations: character sets, serialisation (JSON, XML, MIME), compression, and the TLS record layer that encrypts application payloads. A JSON document is a presentation encoding of Layer 7 semantics.',
    examples: 'UTF-8, JSON, MIME, TLS record layer',
  },
  {
    n: 5,
    name: 'Session',
    pdu: 'Data',
    summary: 'Dialogue state and resumption',
    detail:
      'Manages the lifetime of a conversation: opening, maintaining and closing a session, plus resumption. In practice TLS session tickets, HTTP cookies and IMAP mailbox sessions carry this responsibility.',
    examples: 'TLS session tickets, HTTP cookies, SSH channels',
  },
  {
    n: 4,
    name: 'Transport',
    pdu: 'Segment',
    summary: 'Ports, reliability, ordering',
    detail:
      'Delivers data between processes. TCP provides ordered, reliable, congestion-controlled streams; UDP provides minimal, unreliable datagrams. Port numbers are how a host decides which application receives the payload.',
    examples: 'TCP 443, UDP 53, TCP 25',
  },
  {
    n: 3,
    name: 'Network',
    pdu: 'Packet',
    summary: 'Addressing and routing',
    detail:
      'Moves packets between networks using IP addresses and routing decisions. Layer 7 never sees this: a DNS answer simply supplies the destination address the network layer will use.',
    examples: 'IPv4, IPv6, ICMP, BGP, OSPF',
  },
  {
    n: 2,
    name: 'Data link',
    pdu: 'Frame',
    summary: 'Local delivery on a segment',
    detail:
      'Frames data for a single link: MAC addressing, VLAN tags, error detection. DHCP broadcasts at Layer 7 are carried in Layer 2 broadcast frames, which is why a VLAN boundary needs a relay.',
    examples: 'Ethernet, Wi-Fi 802.11, ARP, VLAN',
  },
  {
    n: 1,
    name: 'Physical',
    pdu: 'Bits',
    summary: 'Signals on a medium',
    detail:
      'Transmits raw bits as electrical, optical or radio signals, including line coding and connector specifications. A bad cable can look like an application outage, which is why link state is checked early.',
    examples: '1000BASE-T, fibre, radio',
  },
];

const RESPONSIBILITIES = [
  {
    code: 'ID',
    title: 'Naming and identity',
    body: 'Resolving names to addresses, verifying server identity with certificates, and authenticating users or services before data is exchanged.',
  },
  {
    code: 'SYNTAX',
    title: 'Message format',
    body: 'Defining exactly how a request is structured: start line, header fields, body, and the encoding rules that both peers must follow.',
  },
  {
    code: 'SEM',
    title: 'Semantics',
    body: 'Agreeing what a message means: GET is safe, POST creates, 404 is a missing resource, 401 is a missing credential.',
  },
  {
    code: 'SEQ',
    title: 'Dialogue sequencing',
    body: 'Ordering exchanges: DNS referral chains, the DHCP DORA sequence, SMTP command/reply pairs, API request then response.',
  },
  {
    code: 'STATE',
    title: 'Application state',
    body: 'Managing sessions, cookies, leases, mailbox flags and caches — the state that makes a stateless protocol usable in practice.',
  },
  {
    code: 'ERR',
    title: 'Error signalling',
    body: 'Reporting failures in a machine-readable way: HTTP status codes, SMTP enhanced codes, DNS RCODEs, DHCP NAKs.',
  },
];

const ENCAPSULATION = [
  { layer: 'L7 Application', unit: 'Data', adds: 'HTTP request line, headers, JSON body', example: 'GET /catalog HTTP/2 + headers' },
  { layer: 'L4 Transport', unit: 'Segment', adds: 'Source/destination port, sequence, flags', example: 'TCP 51422 → 443, PSH+ACK' },
  { layer: 'L3 Network', unit: 'Packet', adds: 'Source/destination IP, TTL, protocol', example: '10.10.4.87 → 203.0.113.10' },
  { layer: 'L2 Data link', unit: 'Frame', adds: 'MAC addresses, VLAN tag, FCS', example: 'aa:bb:cc → 11:22:33, VLAN 40' },
  { layer: 'L1 Physical', unit: 'Bits', adds: 'Line coding and signalling', example: 'Ethernet symbol stream' },
];

const PORTS = [
  ['20 / 21', 'FTP', 'TCP', 'File transfer: control on 21, active data on 20'],
  ['22', 'SSH / SFTP', 'TCP', 'Encrypted remote shell, tunnels, file transfer'],
  ['25', 'SMTP', 'TCP', 'Mail relay between servers'],
  ['53', 'DNS', 'UDP / TCP', 'Name resolution; TCP for truncation and zone transfer'],
  ['67 / 68', 'DHCP', 'UDP', 'Server and client ports for address configuration'],
  ['80', 'HTTP', 'TCP', 'Cleartext web and API traffic'],
  ['110 / 995', 'POP3', 'TCP', 'Mailbox download, cleartext / TLS'],
  ['123', 'NTP', 'UDP', 'Clock synchronisation'],
  ['143 / 993', 'IMAP', 'TCP', 'Mailbox synchronisation, STARTTLS / TLS'],
  ['161 / 162', 'SNMP', 'UDP', 'Agent queries / traps and informs'],
  ['443', 'HTTPS', 'TCP', 'HTTP inside TLS; also DNS over HTTPS'],
  ['587 / 465', 'SMTP submission', 'TCP', 'Authenticated client submission, STARTTLS / implicit TLS'],
];

const VOCAB = [
  ['Client', 'The initiator of a Layer 7 exchange: browser, mail client, API consumer, monitoring probe.'],
  ['Server', 'The responder that owns the resource or service: web server, resolver, DHCP server, mail exchanger.'],
  ['Payload', 'The application data carried inside a protocol message, excluding transport and network headers.'],
  ['Header', 'Metadata that controls interpretation: Host, Content-Type, Authorization, Accept.'],
  ['Idempotent', 'A method that can be repeated with the same resulting state: GET, PUT, DELETE.'],
  ['Stateless', 'Each request carries everything needed to interpret it; the server keeps no per-request memory.'],
  ['TTL', 'Time to live: how long a DNS answer may be cached, or how many hops remain for a packet.'],
  ['Lease', 'A time-limited grant of an IP configuration from a DHCP server.'],
];

export default function Fundamentals() {
  const [selected, setSelected] = useState(7);
  const layer = LAYERS.find((l) => l.n === selected) ?? LAYERS[0];

  return (
    <>
      <PageHead
        eyebrow="01 · Foundations"
        title="Application Layer Fundamentals"
        lede="Before the laboratories, establish exactly what Layer 7 is responsible for, what it delegates, and how application data is carried down the stack."
        actions={
          <Link className="btn btn--ghost" to="/protocols">
            Protocol reference
            <ArrowIcon />
          </Link>
        }
      />

      <div className="grid grid--sidebar">
        <Panel title="The seven layers" sub="select a layer to inspect its responsibility" flush>
          <div className="osi-stack" style={{ padding: 12 }}>
            {LAYERS.map((item) => (
              <button
                key={item.n}
                type="button"
                className={`osi-row${item.n === 7 ? ' is-layer7' : ''}`}
                onClick={() => setSelected(item.n)}
                aria-pressed={item.n === selected}
                style={{
                  width: '100%',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: item.n === selected ? 'rgba(94,151,189,0.75)' : undefined,
                  background: item.n === selected && item.n !== 7 ? 'rgba(71,123,158,0.13)' : undefined,
                }}
              >
                <span className="osi-row__num">{item.n}</span>
                <span className="stack" style={{ gap: 1 }}>
                  <span className="osi-row__name">{item.name}</span>
                  <span className="osi-row__hint">{item.summary}</span>
                </span>
                <span className="mono faint" style={{ fontSize: 9.5 }}>
                  {item.pdu}
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title={`Layer ${layer.n} · ${layer.name}`}
          sub={layer.n === 7 ? 'scope of this laboratory' : 'context'}
          actions={<Badge tone={layer.n === 7 ? 'blue' : 'muted'}>{layer.pdu}</Badge>}
        >
          <div className="stack">
            <p style={{ margin: 0, color: '#d3dbe3', fontSize: 13.2, lineHeight: 1.7 }}>{layer.detail}</p>
            <div className="kv">
              <div className="kv__row">
                <div className="kv__key">Protocols</div>
                <div className="kv__val">{layer.examples}</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Data unit</div>
                <div className="kv__val">{layer.pdu}</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">In this lab</div>
                <div className="kv__val">{layer.n === 7 ? 'Full coverage' : 'Referenced where it affects Layer 7'}</div>
              </div>
            </div>
            {layer.n !== 7 ? (
              <Callout tone="info">
                <span>
                  Layer {layer.n} is outside the laboratory scope, but it explains Layer 7 symptoms: MTU limits, blocked ports, VLAN
                  boundaries and routing failures all surface as application errors.
                </span>
              </Callout>
            ) : (
              <Callout tone="teal">
                <span>
                  Layer 7 assumes a working path below it. When a request fails, first prove the path (address, port, TLS), then debug the
                  application exchange.
                </span>
              </Callout>
            )}
          </div>
        </Panel>
      </div>

      <h2 className="section-title" style={{ marginTop: 22 }}>
        Six responsibilities of Layer 7
      </h2>
      <p className="section-lede" style={{ marginBottom: 12 }}>
        These are the jobs that must be solved by a protocol, not by the network beneath it.
      </p>
      <div className="grid grid--3">
        {RESPONSIBILITIES.map((item) => (
          <div className="panel" key={item.code}>
            <div className="panel__body stack" style={{ gap: 6 }}>
              <span className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: '#7fb2d2' }}>
                {item.code}
              </span>
              <div className="section-title">{item.title}</div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.65 }}>{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Encapsulation" sub="Layer 7 data moving down the stack">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Unit</th>
                  <th>What is added</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                {ENCAPSULATION.map((row) => (
                  <tr key={row.layer}>
                    <td>
                      <strong>{row.layer}</strong>
                    </td>
                    <td className="mono">{row.unit}</td>
                    <td>{row.adds}</td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {row.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout tone="info">
            <span>
              Decapsulation is the reverse: each layer strips its own header before handing the payload up. A web server never parses an
              Ethernet frame; the kernel does that and delivers a socket stream to the HTTP process.
            </span>
          </Callout>
        </Panel>

        <Panel title="Client–server and peer-to-peer" sub="two shapes of Layer 7 conversation">
          <div className="stack">
            <div>
              <div className="eyebrow">CLIENT–SERVER</div>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.65 }}>
                A client initiates; a server owns a resource and responds. Roles are asymmetric: the browser does not serve the catalogue,
                and the web server does not resolve its own public name. HTTP, DNS, DHCP, SMTP submission and REST all follow this shape.
              </p>
            </div>
            <div className="divider" />
            <div>
              <div className="eyebrow">PEER-TO-PEER</div>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.65 }}>
                Both endpoints can initiate and respond. SMTP relay is a useful middle case: a mail server is a server to its clients and a
                client to the next hop. BGP sessions and BitTorrent are symmetric at the protocol level.
              </p>
            </div>
            <div className="divider" />
            <div>
              <div className="eyebrow">STATELESS VS STATEFUL</div>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.65 }}>
                HTTP is stateless by design, so identity must be carried in every request (cookies, bearer tokens). IMAP is stateful: the
                selected mailbox and message flags persist across commands within a session.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="TCP or UDP?" sub="choosing the transport for a Layer 7 protocol">
          <table className="table">
            <thead>
              <tr>
                <th>Transport</th>
                <th>Guarantees</th>
                <th>Typical Layer 7 use</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>TCP</strong>
                </td>
                <td>Ordered, reliable byte stream, congestion control, connection state</td>
                <td>HTTP, HTTPS, SMTP, IMAP, POP3, SSH, FTP, SFTP</td>
              </tr>
              <tr>
                <td>
                  <strong>UDP</strong>
                </td>
                <td>Datagrams, no delivery guarantee, minimal overhead, supports broadcast</td>
                <td>DNS (standard queries), DHCP, SNMP, NTP, DNS over QUIC</td>
              </tr>
            </tbody>
          </table>
          <Callout tone="info">
            <span>
              Reliability can be built above UDP when latency matters more than retransmission cost. DHCP and DNS both implement their own
              retry logic; HTTP/3 (QUIC) adds reliability and encryption over UDP.
            </span>
          </Callout>
        </Panel>

        <Panel title="Well-known ports" sub="memorise the Layer 7 defaults">
          <div className="scroll-x">
            <table className="table table--mono">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Protocol</th>
                  <th>Transport</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {PORTS.map(([port, protocol, transport, purpose]) => (
                  <tr key={port}>
                    <td>{port}</td>
                    <td>
                      <strong>{protocol}</strong>
                    </td>
                    <td>{transport}</td>
                    <td>{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Terminology you will need" sub="used throughout the laboratories">
        <div className="grid grid--2" style={{ gap: 10 }}>
          {VOCAB.map(([term, meaning]) => (
            <div className="kv" key={term} style={{ border: '1px solid var(--border-soft)', borderRadius: 4, padding: '8px 10px' }}>
              <div className="kv__row" style={{ gridTemplateColumns: '110px minmax(0,1fr)' }}>
                <div className="kv__key" style={{ color: '#cfe3ef' }}>
                  {term}
                </div>
                <div className="kv__val">{meaning}</div>
              </div>
            </div>
          ))}
        </div>
        <Callout tone="warn">
          <span>
            <strong>Common misconception.</strong> "The application layer" is not the application itself. Chrome is an application; HTTP is
            the Layer 7 protocol it speaks. A bug in Chrome is not an HTTP failure, and an HTTP 500 is not a network failure.
          </span>
        </Callout>
      </Panel>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Diagnostic order" sub="prove each layer before moving up">
          <ol className="checklist">
            <li>Is the name resolving to the address you expect? Compare the OS resolver with an authoritative query.</li>
            <li>Does the port answer at all? A TCP connect test separates reachability from application behaviour.</li>
            <li>Is TLS valid and complete? Certificate, hostname, protocol version.</li>
            <li>What does the protocol itself say? Status code, reply code, RCODE, DHCP message type.</li>
            <li>Only then inspect application logs and state: database, permissions, quotas, policy.</li>
          </ol>
        </Panel>
        <Panel title="Continue" sub="apply the fundamentals">
          <div className="stack">
            <Link className="link-arrow" to="/protocols">
              Browse all 14 protocols with ports and failure modes <ArrowIcon size={12} />
            </Link>
            <Link className="link-arrow" to="/http">
              Start with the HTTP / HTTPS laboratory <ArrowIcon size={12} />
            </Link>
            <Link className="link-arrow" to="/dns">
              Move to name resolution in the DNS laboratory <ArrowIcon size={12} />
            </Link>
            <Link className="link-arrow" to="/troubleshooting">
              Test your judgement on six production tickets <ArrowIcon size={12} />
            </Link>
          </div>
        </Panel>
      </div>

      <PageNav />
    </>
  );
}
