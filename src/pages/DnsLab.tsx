import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Disclosure, LessonHead, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type ScenarioId = 'new' | 'cached' | 'nxdomain';

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'new', label: 'New name' },
  { id: 'cached', label: 'Cached' },
  { id: 'nxdomain', label: 'Bad name' },
];

const NODES: FlowNode[] = [
  {
    id: 'stub',
    label: 'Browser',
    sub: 'stub resolver',
    tag: 'CLIENT',
    address: '10.10.4.87',
    kind: 'client',
    detail: 'Asks one question: which IP address belongs to this name?',
  },
  {
    id: 'resolver',
    label: 'Recursive resolver',
    sub: '8.8.8.8 :53',
    tag: 'RESOLVER',
    address: '8.8.8.8',
    kind: 'server',
    detail: 'Does the walking for you: it queries root, TLD and authoritative servers until it has the answer, then caches it.',
  },
  {
    id: 'root',
    label: 'Root server',
    sub: 'a.root-servers.net',
    tag: 'ROOT',
    address: '198.41.0.4',
    kind: 'service',
    detail: 'Knows only where each top-level domain lives, such as who runs .com.',
  },
  {
    id: 'tld',
    label: 'TLD server',
    sub: '.com',
    tag: 'TLD',
    address: '192.5.6.30',
    kind: 'service',
    detail: 'Knows which name servers are authoritative for example.com.',
  },
  {
    id: 'auth',
    label: 'Authoritative',
    sub: 'ns1.example.com',
    tag: 'TRUTH',
    address: '203.0.113.53',
    kind: 'server',
    detail: 'Holds the real records for example.com. Its answer is the final one.',
  },
];

function buildSteps(scenario: ScenarioId): SimStep[] {
  if (scenario === 'cached') {
    return [
      {
        id: 'ask',
        title: 'Browser asks for the name',
        phase: 'QUERY',
        node: 0,
        packetLabel: 'QUERY',
        detail: 'The browser needs an address for www.example.com, so it asks the resolver.',
        raw: ';; question\nwww.example.com. IN A\n;; to 8.8.8.8:53 (UDP)',
        payloadTitle: 'Query',
        rows: [
          ['Name', 'www.example.com'],
          ['Type', 'A'],
          ['Transport', 'UDP 53'],
        ],
      },
      {
        id: 'hit',
        title: 'Resolver answers from cache',
        phase: 'CACHE HIT',
        node: 1,
        status: 'ok',
        packetLabel: 'CACHED',
        detail: 'The resolver still holds this answer, so no other server is contacted at all.',
        raw: ';; response  rcode=NOERROR  aa=0\nwww.example.com. 214 IN A 203.0.113.10\n;; from cache, 214 s of TTL left',
        payloadTitle: 'Cached record',
        rows: [
          ['Answer', '203.0.113.10'],
          ['TTL left', '214 s'],
          ['Servers contacted', '1'],
        ],
      },
      {
        id: 'done',
        title: 'Browser opens the connection',
        phase: 'DONE',
        node: 0,
        status: 'ok',
        detail: 'The browser connects to 203.0.113.10 and asks for the page.',
        payloadTitle: 'Result',
        rows: [
          ['Address used', '203.0.113.10'],
          ['Time taken', '~2 ms'],
        ],
      },
    ];
  }

  if (scenario === 'nxdomain') {
    return [
      {
        id: 'ask',
        title: 'Browser asks for a misspelled name',
        phase: 'QUERY',
        node: 0,
        packetLabel: 'QUERY',
        detail: 'The user typed exampel.com instead of example.com.',
        raw: ';; question\nwww.exampel.com. IN A\n;; to 8.8.8.8:53',
        payloadTitle: 'Query',
        rows: [
          ['Name', 'www.exampel.com'],
          ['Type', 'A'],
        ],
      },
      {
        id: 'root',
        title: 'Root server points at .com',
        phase: 'ROOT',
        node: 2,
        detail: 'The root server does not judge the name; it only sends the resolver to the .com servers.',
        raw: ';; question\nwww.exampel.com. IN A\n;; to 198.41.0.4:53',
        payloadTitle: 'Root',
        rows: [['Server', '198.41.0.4']],
      },
      {
        id: 'nx',
        title: '.com says the name does not exist',
        phase: 'NXDOMAIN',
        node: 3,
        status: 'bad',
        packetLabel: 'NXDOMAIN',
        detail: 'The .com servers know every registered domain, and exampel.com is not one of them.',
        raw: ';; response  rcode=NXDOMAIN\nwww.exampel.com. IN A\n;; name does not exist',
        payloadTitle: 'Response code',
        rows: [
          ['rcode', 'NXDOMAIN (3)'],
          ['Meaning', 'this name is not registered'],
        ],
      },
      {
        id: 'fail',
        title: 'Browser shows an error',
        phase: 'FAILED',
        node: 0,
        status: 'bad',
        detail: 'The browser has no address to connect to, so it reports that the server cannot be found.',
        payloadTitle: 'What to check',
        rows: [
          ['Symptom', 'server not found'],
          ['Likely cause', 'typo in the name'],
          ['Command', 'dig www.example.com'],
        ],
      },
    ];
  }

  return [
    {
      id: 'ask',
      title: 'Browser asks the resolver',
      phase: 'QUERY',
      node: 0,
      packetLabel: 'QUERY',
      detail: 'One question leaves the browser: which address belongs to www.example.com?',
      raw: ';; question\nwww.example.com. IN A\n;; to 8.8.8.8:53 (UDP)',
      payloadTitle: 'Query',
      rows: [
        ['Name', 'www.example.com'],
        ['Type', 'A (IPv4)'],
        ['Server', '8.8.8.8:53'],
      ],
    },
    {
      id: 'root',
      title: 'Resolver asks a root server',
      phase: 'ROOT',
      node: 2,
      packetLabel: 'ROOT',
      detail: 'The resolver has nothing cached, so it starts at the top of the DNS tree.',
      raw: ';; question\nwww.example.com. IN A\n;; to 198.41.0.4:53',
      payloadTitle: 'Root query',
      rows: [
        ['Root server', 'a.root-servers.net'],
        ['Address', '198.41.0.4'],
      ],
    },
    {
      id: 'root-ref',
      title: 'Root points to the .com servers',
      phase: 'REFERRAL',
      node: 1,
      packetLabel: 'REFERRAL',
      detail: 'The root server does not store the answer; it refers the resolver to .com.',
      raw: ';; answer count=0\ncom. 172800 IN NS a.gtld-servers.net.\n;; glue 192.5.6.30',
      payloadTitle: 'Referral',
      rows: [
        ['Delegated zone', 'com.'],
        ['Next server', '192.5.6.30'],
      ],
    },
    {
      id: 'tld',
      title: 'Resolver asks the .com server',
      phase: 'TLD',
      node: 3,
      packetLabel: 'TLD',
      detail: 'Same question, one level deeper in the tree.',
      raw: ';; question\nwww.example.com. IN A\n;; to 192.5.6.30:53',
      payloadTitle: 'TLD query',
      rows: [
        ['TLD server', '192.5.6.30'],
        ['Zone', 'com.'],
      ],
    },
    {
      id: 'tld-ref',
      title: '.com points to example.com',
      phase: 'REFERRAL',
      node: 1,
      packetLabel: 'REFERRAL',
      detail: 'The TLD server knows who is authoritative for example.com.',
      raw: ';; answer count=0\nexample.com. 172800 IN NS ns1.example.com.\n;; glue 203.0.113.53',
      payloadTitle: 'Referral',
      rows: [
        ['Name servers', 'ns1.example.com'],
        ['Next server', '203.0.113.53'],
      ],
    },
    {
      id: 'auth',
      title: 'Authoritative server gives the address',
      phase: 'ANSWER',
      node: 4,
      status: 'ok',
      packetLabel: 'A',
      detail: 'This server owns the zone, so its answer is the final truth.',
      raw: ';; response  aa=1  rcode=NOERROR\nwww.example.com. 300 IN A 203.0.113.10',
      payloadTitle: 'Record',
      rows: [
        ['Type', 'A'],
        ['Value', '203.0.113.10'],
        ['TTL', '300 s'],
        ['Authoritative', 'yes'],
      ],
    },
    {
      id: 'done',
      title: 'Browser receives the address',
      phase: 'DONE',
      node: 0,
      status: 'ok',
      detail: 'The browser now connects to 203.0.113.10, and the resolver caches the answer for 5 minutes.',
      raw: ';; answer  1 record\nwww.example.com. 300 IN A 203.0.113.10\n;; total time: 42 ms',
      payloadTitle: 'Result',
      rows: [
        ['IP address', '203.0.113.10'],
        ['Cached for', '300 s'],
        ['Servers asked', '4'],
      ],
    },
  ];
}

export default function DnsLab() {
  const [scenario, setScenario] = useState<ScenarioId>('new');
  const steps = useMemo(() => buildSteps(scenario), [scenario]);

  return (
    <>
      <LessonHead
        eyebrow="04 · DNS laboratory"
        title="A name becomes an address"
        sentence="Computers use IP addresses, so DNS looks the name up for you."
      />

      <SimulationShell
        simId="dns"
        title="Resolve a name"
        sub="www.example.com → ? · UDP port 53"
        nodes={NODES}
        steps={steps}
        resetKey={scenario}
        playLabel="Resolve name"
        controls={
          <Tabs
            items={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))}
            active={scenario}
            onChange={setScenario}
            pill
            label="DNS scenario"
          />
        }
        caption="Click any server to see what it knows."
      />

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>

        <Disclosure title="Record types" meta="A · AAAA · CNAME · MX · TXT · NS">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Answers</th>
                <th>Example value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">A</td>
                <td>IPv4 address</td>
                <td className="mono">203.0.113.10</td>
              </tr>
              <tr>
                <td className="mono">AAAA</td>
                <td>IPv6 address</td>
                <td className="mono">2001:db8::10</td>
              </tr>
              <tr>
                <td className="mono">CNAME</td>
                <td>Another name</td>
                <td className="mono">shop.example.com</td>
              </tr>
              <tr>
                <td className="mono">MX</td>
                <td>Mail server for a domain</td>
                <td className="mono">10 mx.gmail.com</td>
              </tr>
              <tr>
                <td className="mono">TXT</td>
                <td>Text, used by SPF and verification</td>
                <td className="mono">v=spf1 include:...</td>
              </tr>
              <tr>
                <td className="mono">NS</td>
                <td>Which servers own the zone</td>
                <td className="mono">ns1.example.com</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="Ports and transport" meta="53 · 853 · 443">
          <table className="table">
            <thead>
              <tr>
                <th>Use</th>
                <th>Port</th>
                <th>Transport</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Normal queries</td>
                <td className="mono">53</td>
                <td>UDP</td>
              </tr>
              <tr>
                <td>Large answers, zone transfers</td>
                <td className="mono">53</td>
                <td>TCP</td>
              </tr>
              <tr>
                <td>DNS over TLS</td>
                <td className="mono">853</td>
                <td>TCP + TLS</td>
              </tr>
              <tr>
                <td>DNS over HTTPS</td>
                <td className="mono">443</td>
                <td>HTTPS</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="Why caching matters" meta="TTL">
          <ul className="checklist checklist--teal">
            <li>
              <strong>TTL</strong> — how many seconds a resolver may reuse the answer.
            </li>
            <li>
              <strong>Low TTL</strong> — fast changes, more queries.
            </li>
            <li>
              <strong>High TTL</strong> — fewer queries, slow changes.
            </li>
            <li>
              <strong>Common failure</strong> — you changed the record, but the old TTL is still running.
            </li>
          </ul>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
