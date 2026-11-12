import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Badge, Callout, CodeBlock, PageHead, Panel } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type DnsScenario = {
  id: string;
  label: string;
  qname: string;
  qtype: string;
  ttl: number;
  rcode: 'NOERROR' | 'NXDOMAIN';
  answerLines: string[];
  authority?: string;
  summary: string;
  warm?: boolean;
  resolution: string;
};

const SCENARIOS: DnsScenario[] = [
  {
    id: 'a',
    label: 'A record · cold cache',
    qname: 'www.example.com',
    qtype: 'A',
    ttl: 300,
    rcode: 'NOERROR',
    answerLines: ['www.example.com.\t300\tIN\tA\t203.0.113.10'],
    summary: 'The full hierarchy: root, TLD and authoritative servers are all consulted because nothing is cached.',
    resolution: '203.0.113.10',
  },
  {
    id: 'aaaa',
    label: 'AAAA record · IPv6',
    qname: 'www.example.com',
    qtype: 'AAAA',
    ttl: 300,
    rcode: 'NOERROR',
    answerLines: ['www.example.com.\t300\tIN\tAAAA\t2001:db8:4::10'],
    summary: 'The same name resolves to an IPv6 address. Happy Eyeballs clients race both families and keep the faster path.',
    resolution: '2001:db8:4::10',
  },
  {
    id: 'cname',
    label: 'CNAME alias chain',
    qname: 'shop.example.com',
    qtype: 'A',
    ttl: 120,
    rcode: 'NOERROR',
    answerLines: [
      'shop.example.com.\t120\tIN\tCNAME\tstore.example.net.',
      'store.example.net.\t120\tIN\tA\t198.51.100.44',
    ],
    summary: 'The alias points to another name, so the resolver must follow the chain and resolve the canonical name too.',
    resolution: '198.51.100.44',
  },
  {
    id: 'mx',
    label: 'MX record · mail routing',
    qname: 'example.com',
    qtype: 'MX',
    ttl: 3600,
    rcode: 'NOERROR',
    answerLines: ['example.com.\t3600\tIN\tMX\t10 mail.example.com.', 'mail.example.com.\t3600\tIN\tA\t203.0.113.25'],
    summary: 'Mail routing uses preference values: the lowest number wins, and the others become fallbacks.',
    resolution: 'mail.example.com (preference 10)',
  },
  {
    id: 'nxdomain',
    label: 'NXDOMAIN · name does not exist',
    qname: 'api.example.org',
    qtype: 'A',
    ttl: 900,
    rcode: 'NXDOMAIN',
    answerLines: [],
    authority: 'example.org.\t900\tIN\tSOA\tns1.example.org. hostmaster.example.org. 2024030401 7200 3600 1209600 900',
    summary: 'The authoritative server is definitive: the name does not exist. The resolver caches that negative answer for the SOA minimum TTL.',
    resolution: 'no address — NXDOMAIN',
  },
  {
    id: 'warm',
    label: 'Warm cache · no recursion',
    qname: 'cdn.example.com',
    qtype: 'A',
    ttl: 214,
    rcode: 'NOERROR',
    answerLines: ['cdn.example.com.\t214\tIN\tA\t203.0.113.77'],
    summary: 'The stub resolver already holds a valid answer, so no query reaches the recursive resolver at all.',
    warm: true,
    resolution: '203.0.113.77',
  },
];

const NODES: FlowNode[] = [
  {
    id: 'stub',
    label: 'Stub resolver',
    sub: 'OS resolver cache',
    tag: 'CLIENT',
    address: '10.10.4.87',
    kind: 'client',
    detail:
      'The operating system resolver on the client. It reads /etc/hosts first, then its own cache, then forwards the query to the nameserver listed in /etc/resolv.conf.',
  },
  {
    id: 'resolver',
    label: 'Recursive resolver',
    sub: 'ISP · 198.51.100.53',
    tag: 'RESOLVER',
    address: '198.51.100.53:53',
    kind: 'service',
    detail:
      'Performs recursion on the client\'s behalf: follows referrals, caches each answer for its TTL and returns a single response with the recursion-available flag set.',
  },
  {
    id: 'root',
    label: 'Root server',
    sub: 'a.root-servers.net',
    tag: 'ROOT',
    address: '198.41.0.4',
    kind: 'server',
    detail:
      'Knows only the delegation for each top-level domain. It returns a referral — the TLD name servers and glue addresses — never the final answer.',
  },
  {
    id: 'tld',
    label: '.com TLD server',
    sub: 'a.gtld-servers.net',
    tag: 'TLD',
    address: '192.5.6.30',
    kind: 'server',
    detail:
      'Holds the delegation records for every .com domain. It refers the resolver to the authoritative name servers for example.com.',
  },
  {
    id: 'auth',
    label: 'Authoritative NS',
    sub: 'ns1.example.com',
    tag: 'AUTHORITATIVE',
    address: '203.0.113.53',
    kind: 'server',
    detail:
      'Owns the zone file for example.com. Its answers carry the AA (authoritative answer) flag, including negative answers for names that do not exist.',
  },
];

function buildSteps(scenario: DnsScenario): SimStep[] {
  const steps: SimStep[] = [];

  if (scenario.warm) {
    steps.push({
      id: 'client-cache',
      title: 'Stub resolver answers from cache',
      phase: 'Client cache',
      node: 0,
      status: 'ok',
      detail: `The client already holds a valid A record for ${scenario.qname} with ${scenario.ttl} seconds of TTL remaining. No packet leaves the host.`,
      payloadTitle: 'Cache lookup',
      rows: [
        ['Question', `${scenario.qname} ${scenario.qtype}`],
        ['Cache state', 'HIT'],
        ['TTL remaining', `${scenario.ttl} s`],
        ['Upstream queries', '0'],
        ['Answer', scenario.resolution],
      ],
    });
    steps.push({
      id: 'hand-off',
      title: 'Address handed to the application',
      phase: 'Resolution',
      node: 0,
      status: 'ok',
      detail: 'The application receives the address from getaddrinfo() and opens its connection. A cache hit is the normal, fast path — most page loads never query DNS.',
      payloadTitle: 'Result',
      rows: [
        ['Resolved', scenario.resolution],
        ['Time', '< 1 ms'],
        ['Next layer', 'TCP connect'],
      ],
    });
    return steps;
  }

  steps.push({
    id: 'client-cache',
    title: 'Stub resolver checks its cache',
    phase: 'Client cache',
    node: 0,
    status: 'info',
    detail: `The application calls getaddrinfo("${scenario.qname}"). /etc/hosts has no entry, the local cache is empty, so the stub resolver forwards the question to 198.51.100.53.`,
    payloadTitle: 'Query origin',
    rows: [
      ['Question', `${scenario.qname} ${scenario.qtype}`],
      ['Cache state', 'MISS'],
      ['/etc/hosts', 'no match'],
      ['Configured server', '198.51.100.53'],
      ['Transport', 'UDP 53'],
    ],
  });

  steps.push({
    id: 'to-resolver',
    title: 'Query sent to the recursive resolver',
    phase: 'Recursion',
    node: 1,
    detail:
      'A single UDP datagram carries the question with RD=1 (recursion desired) and a random transaction ID. The resolver is now responsible for producing an answer.',
    payloadTitle: 'DNS query',
    rows: [
      ['Transaction ID', '0x91f4'],
      ['Flags', 'RD=1'],
      ['Question', `${scenario.qname} ${scenario.qtype}`],
      ['Source → dest', '10.10.4.87:53120 → 198.51.100.53:53'],
      ['Retry policy', '2 attempts, then TCP'],
    ],
    raw: `;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 37364\n;; flags: rd; QUERY: 1, ANSWER: 0\n\n;${scenario.qname}.\t\tIN\t${scenario.qtype}`,
    packetLabel: 'Query',
  });

  steps.push({
    id: 'resolver-cache',
    title: 'Recursive resolver has no cached answer',
    phase: 'Recursion',
    node: 1,
    status: 'warn',
    detail:
      'The resolver checks its own cache and finds nothing usable, so it starts recursion from the root. Its cache is shared by thousands of clients, which is why real-world resolution is usually a single round trip.',
    payloadTitle: 'Resolver state',
    rows: [
      ['Cache', 'MISS'],
      ['Strategy', 'iterate from root'],
      ['DNSSEC validation', 'requested (DO bit set)'],
      ['Client wait budget', '5 s'],
    ],
  });

  steps.push({
    id: 'root',
    title: 'Root server returns a referral',
    phase: 'Root',
    node: 2,
    detail:
      'The root zone does not hold example.com records. It returns the delegation for .com: the TLD name servers plus glue A/AAAA records so the resolver can reach them without another lookup.',
    payloadTitle: 'Referral · .com',
    rows: [
      ['Response', 'NOERROR · 0 answers'],
      ['Authority', '. NS a.gtld-servers.net'],
      ['Glue', '192.5.6.30, 192.5.6.31'],
      ['AA flag', 'not set'],
      ['Transport', 'UDP 53'],
    ],
    raw: ';; AUTHORITY SECTION:\ncom.\t172800\tIN\tNS\ta.gtld-servers.net.\ncom.\t172800\tIN\tNS\tb.gtld-servers.net.\n\n;; ADDITIONAL SECTION:\na.gtld-servers.net.\t172800\tIN\tA\t192.5.6.30',
    packetLabel: 'Referral',
  });

  steps.push({
    id: 'tld',
    title: 'TLD server refers to the zone',
    phase: 'TLD',
    node: 3,
    detail:
      'The .com servers hold the delegation for example.com and answer with its authoritative name servers. Again this is a referral, not the address the client asked for.',
    payloadTitle: 'Referral · example.com',
    rows: [
      ['Response', 'NOERROR · 0 answers'],
      ['Authority', 'example.com. NS ns1.example.com'],
      ['Glue', '203.0.113.53'],
      ['AA flag', 'not set'],
      ['Cache', 'delegation cached 172800 s'],
    ],
    raw: ';; AUTHORITY SECTION:\nexample.com.\t172800\tIN\tNS\tns1.example.com.\nexample.com.\t172800\tIN\tNS\tns2.example.com.\n\n;; ADDITIONAL SECTION:\nns1.example.com.\t172800\tIN\tA\t203.0.113.53',
    packetLabel: 'Referral',
  });

  steps.push({
    id: 'authoritative',
    title: 'Authoritative server answers',
    phase: 'Authoritative',
    node: 4,
    status: scenario.rcode === 'NXDOMAIN' ? 'bad' : 'ok',
    detail:
      scenario.rcode === 'NXDOMAIN'
        ? 'The zone file has no record for this name and no wildcard covers it. The authoritative server returns NXDOMAIN with the zone SOA so the resolver knows how long to cache the negative result.'
        : `The zone file contains the record, so the server returns it with AA set and TTL ${scenario.ttl}. This is the only response in the chain that is authoritative.`,
    payloadTitle: scenario.rcode === 'NXDOMAIN' ? 'NXDOMAIN + SOA' : `Answer · ${scenario.qtype}`,
    rows: [
      ['Response', scenario.rcode],
      ['Answers', String(scenario.answerLines.length)],
      ['AA flag', 'set'],
      ['TTL', `${scenario.ttl} s`],
      ['Result', scenario.resolution],
    ],
    raw: digOutput(scenario),
    packetLabel: scenario.rcode === 'NXDOMAIN' ? 'NXDOMAIN' : 'Answer',
  });

  steps.push({
    id: 'cache-return',
    title: 'Resolver caches and returns the answer',
    phase: 'Recursion',
    node: 1,
    status: scenario.rcode === 'NXDOMAIN' ? 'warn' : 'ok',
    detail:
      scenario.rcode === 'NXDOMAIN'
        ? `The negative answer is cached for the SOA minimum (${scenario.ttl} s). Every client asking for this name during that window gets NXDOMAIN immediately.`
        : `The resolver caches the record for ${scenario.ttl} seconds, decrements the TTL and returns the answer to the stub resolver with RA set.`,
    payloadTitle: 'Recursive response',
    rows: [
      ['Flags', 'QR RD RA'],
      ['Answer', scenario.resolution],
      ['TTL on arrival', `${Math.max(1, scenario.ttl - 1)} s`],
      ['Cached by resolver', 'yes'],
      ['Total queries', '4 (root, TLD, auth, client)'],
    ],
  });

  steps.push({
    id: 'consume',
    title: scenario.rcode === 'NXDOMAIN' ? 'Application reports resolution failure' : 'Application connects to the address',
    phase: 'Application',
    node: 0,
    status: scenario.rcode === 'NXDOMAIN' ? 'bad' : 'ok',
    detail:
      scenario.rcode === 'NXDOMAIN'
        ? 'The browser cannot proceed: there is no address to connect to. This is a naming failure, not a network failure — a TCP connect test to any address will succeed.'
        : `The stub resolver returns ${scenario.resolution} to the application, which opens a connection to port 443. Name resolution ends here; the HTTP exchange begins.`,
    payloadTitle: 'Outcome',
    rows: [
      ['Resolved', scenario.resolution],
      ['Cache TTL', `${scenario.ttl} s`],
      ['Failure mode', scenario.rcode === 'NXDOMAIN' ? 'NXDOMAIN — check the zone' : 'none'],
      ['Next step', scenario.rcode === 'NXDOMAIN' ? 'Verify the record with dig @auth' : 'TCP + TLS handshake'],
    ],
  });

  return steps;
}

function digOutput(scenario: DnsScenario): string {
  const lines = [
    `; <<>> DiG 9.18.24 <<>> ${scenario.qname} ${scenario.qtype}`,
    ';; global options: +cmd',
    ';; Got answer:',
    `;; ->>HEADER<<- opcode: QUERY, status: ${scenario.rcode}, id: 41823`,
    `;; flags: qr rd ra${scenario.rcode === 'NOERROR' ? ' aa' : ''}; QUERY: 1, ANSWER: ${scenario.answerLines.length}, AUTHORITY: ${scenario.rcode === 'NXDOMAIN' ? 1 : 0}, ADDITIONAL: 0`,
    '',
    ';; QUESTION SECTION:',
    `;${scenario.qname}.\t\tIN\t${scenario.qtype}`,
    '',
    ';; ANSWER SECTION:',
    ...(scenario.answerLines.length > 0 ? scenario.answerLines : ['(empty)']),
  ];
  if (scenario.authority) {
    lines.push('', ';; AUTHORITY SECTION:', scenario.authority);
  }
  lines.push(
    '',
    ';; Query time: 24 msec',
    ';; SERVER: 198.51.100.53#53(198.51.100.53) (UDP)',
    `;; MSG SIZE  rcvd: ${52 + scenario.answerLines.join('').length}`,
  );
  return lines.join('\n');
}

const RECORD_TYPES = [
  ['A', 'IPv4 address', 'www.example.com → 203.0.113.10'],
  ['AAAA', 'IPv6 address', 'www.example.com → 2001:db8:4::10'],
  ['CNAME', 'Canonical name alias', 'shop → store.example.net'],
  ['MX', 'Mail exchanger + preference', '10 mail.example.com'],
  ['NS', 'Authoritative name server', 'example.com NS ns1.example.com'],
  ['TXT', 'Arbitrary text; SPF, DKIM, verification', 'v=spf1 include:_spf.example.net -all'],
  ['SRV', 'Service location: host and port', '_imaps._tcp → mail:993'],
  ['PTR', 'Reverse lookup: address → name', '10.113.0.203.in-addr.arpa'],
  ['CAA', 'Which CAs may issue certificates', '0 issue "letsencrypt.org"'],
  ['SOA', 'Zone authority, timers, negative TTL', 'ns1.example.com hostmaster…'],
];

export default function DnsLab() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0];
  const steps = useMemo(() => buildSteps(scenario), [scenario]);

  return (
    <>
      <PageHead
        eyebrow="04 · Laboratory"
        title="DNS Laboratory"
        lede="Follow a name through the resolution hierarchy — stub resolver, recursive resolver, root, TLD and authoritative server — and see exactly which server is allowed to give a definitive answer."
        actions={
          <>
            <Badge tone={scenario.rcode === 'NXDOMAIN' ? 'red' : 'teal'}>{scenario.rcode}</Badge>
            <Badge tone="blue">{steps.length} STEPS</Badge>
          </>
        }
      />

      <div className="grid grid--sidebar">
        <SimulationShell
          simId="dns"
          title="Resolution path"
          sub={`${scenario.qname} · ${scenario.qtype}`}
          nodes={NODES}
          steps={steps}
          resetKey={scenario.id}
          caption="Click any server in the diagram to read its role. A referral is not an answer: only the authoritative server owns the record."
          controls={
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {SCENARIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip${item.id === scenarioId ? ' is-active' : ''}`}
                  onClick={() => setScenarioId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />

        <Panel title="Scenario brief" sub={scenario.label} actions={<Badge tone="muted">{scenario.qtype}</Badge>}>
          <div className="stack">
            <p style={{ margin: 0, color: '#d3dbe3', fontSize: 12.7, lineHeight: 1.7 }}>{scenario.summary}</p>
            <div className="kv">
              <div className="kv__row">
                <div className="kv__key">Question</div>
                <div className="kv__val mono">
                  {scenario.qname} {scenario.qtype}
                </div>
              </div>
              <div className="kv__row">
                <div className="kv__key">RCODE</div>
                <div className="kv__val">{scenario.rcode}</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">TTL</div>
                <div className="kv__val">{scenario.ttl} s</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Result</div>
                <div className="kv__val mono">{scenario.resolution}</div>
              </div>
            </div>
            <CodeBlock title="dig output" code={digOutput(scenario)} />
            <Callout tone={scenario.rcode === 'NXDOMAIN' ? 'warn' : 'teal'}>
              <span>
                {scenario.rcode === 'NXDOMAIN'
                  ? 'NXDOMAIN is definitive: the name does not exist in the zone. Do not retry — fix the record or the spelling.'
                  : 'The AA flag marks the only authoritative response in the chain. Everything else was a referral or a cache.'}
              </span>
            </Callout>
          </div>
        </Panel>
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Record types" sub="what each answer means">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                {RECORD_TYPES.map(([type, purpose, example]) => (
                  <tr key={type}>
                    <td className="mono">
                      <strong>{type}</strong>
                    </td>
                    <td>{purpose}</td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Transport and flags" sub="why DNS is not only UDP">
          <div className="stack">
            <ul className="checklist">
              <li>
                <strong>UDP 53</strong> carries ordinary queries and responses. A single datagram avoids a handshake, which matters because
                DNS often gates the first connection.
              </li>
              <li>
                <strong>TCP 53</strong> is used when the response sets TC (truncated), for zone transfers (AXFR/IXFR) and for DNS over TLS on
                853.
              </li>
              <li>
                <strong>RD</strong> asks the server to recurse; <strong>RA</strong> reports that it can. A resolver that refuses recursion is
                usually an authoritative-only server.
              </li>
              <li>
                <strong>AA</strong> marks an authoritative answer. Only the zone owner may set it.
              </li>
              <li>
                <strong>TC</strong> means the answer was truncated and the client must retry over TCP.
              </li>
            </ul>
            <Callout tone="info">
              <span>
                DNSSEC adds RRSIG and DNSKEY records so a validating resolver can prove an answer was not forged. Validation failure produces
                SERVFAIL — which looks like an outage but is a trust failure.
              </span>
            </Callout>
          </div>
        </Panel>
      </div>

      <div className="grid grid--3" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: '#7fb2d2' }}>
              DIAGNOSTIC
            </span>
            <div className="section-title">Cache is the first suspect</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.65 }}>
              Compare <span className="mono">dig name</span> (uses the resolver and its cache) with{' '}
              <span className="mono">dig @ns1.zone name</span> (bypasses it). A difference proves propagation or caching, not a broken zone.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: '#7fb2d2' }}>
              TTL
            </span>
            <div className="section-title">Lower TTL before a migration</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.65 }}>
              A 3600 s TTL means a change can take an hour to be seen everywhere. Drop to 60 s a day before the change, then raise it after
              verification.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel__body stack" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: '#7fb2d2' }}>
              LOCAL OVERRIDES
            </span>
            <div className="section-title">/etc/hosts outranks DNS</div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.3, lineHeight: 1.65 }}>
              The stub resolver checks the hosts file before any query. A stale entry produces a "DNS is broken" ticket that no resolver test
              will reproduce.
            </p>
          </div>
        </div>
      </div>

      <PageNav />
    </>
  );
}
