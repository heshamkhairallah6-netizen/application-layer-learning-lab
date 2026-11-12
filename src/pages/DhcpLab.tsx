import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Badge, Callout, CodeBlock, Disclosure, PageHead, Panel, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type Mode = 'dora' | 'renew' | 'nak';

const NODES: FlowNode[] = [
  {
    id: 'client',
    label: 'Client host',
    sub: 'no configuration',
    tag: 'CLIENT',
    address: '0.0.0.0:68',
    kind: 'client',
    detail:
      'A host with no usable IPv4 configuration. It has a MAC address and a broadcast-capable interface, so it can ask for a lease but cannot yet reach anything by address.',
  },
  {
    id: 'segment',
    label: 'Broadcast domain',
    sub: 'VLAN 40 · switch',
    tag: 'L2',
    address: 'ff:ff:ff:ff:ff:ff',
    kind: 'network',
    detail:
      'Layer 2 forwards the DHCP broadcast to every port in the VLAN. Broadcasts do not cross a router, which is why a separate subnet needs a DHCP relay (giaddr).',
  },
  {
    id: 'server',
    label: 'DHCP server',
    sub: '10.10.4.2',
    tag: 'SERVER',
    address: '10.10.4.2:67',
    kind: 'server',
    detail:
      'Owns the scope, allocates leases, performs conflict detection and supplies options: mask, gateway, DNS servers, domain name and timers.',
  },
  {
    id: 'scope',
    label: 'Scope and lease store',
    sub: '10.10.4.100 – 10.10.4.199',
    tag: 'DATABASE',
    address: 'lease file / SQL',
    kind: 'service',
    detail:
      'Records which address is bound to which client identifier and when it expires. A lease is a stateful commitment, not a permanent assignment.',
  },
];

const MODE_LABEL: Record<Mode, string> = {
  dora: 'New lease · DORA',
  renew: 'Renewal · T1',
  nak: 'Conflict · DHCPNAK',
};

function doraSteps(): SimStep[] {
  return [
    {
      id: 'discover',
      title: 'DHCPDISCOVER — client broadcasts',
      phase: 'DISCOVER',
      node: 0,
      status: 'info',
      detail:
        'The interface has no address, so the client sends from 0.0.0.0:68 to 255.255.255.255:67. It proposes nothing; it only asks which servers are available and which options they offer.',
      payloadTitle: 'DHCPDISCOVER',
      rows: [
        ['Message type', 'DHCPDISCOVER (option 53 = 1)'],
        ['Source → destination', '0.0.0.0:68 → 255.255.255.255:67'],
        ['Transaction ID', '0x3f9a21c4'],
        ['chaddr', '00:1a:2b:3c:4d:5e'],
        ['Requested options', '1, 3, 6, 15, 51, 58, 59'],
      ],
      raw: 'DHCP Message type 1 (DISCOVER)\nClient MAC 00:1a:2b:3c:4d:5e\nTransaction ID 0x3f9a21c4\nFlags: broadcast\nParameter request list: subnet-mask, router, domain-name-server, domain-name, lease-time, renewal, rebinding',
      packetLabel: 'DISCOVER',
    },
    {
      id: 'broadcast',
      title: 'Broadcast reaches every DHCP server on the segment',
      phase: 'DISCOVER',
      node: 1,
      detail:
        'The frame is flooded within VLAN 40. Multiple servers may answer, which is why the next two steps exist: the client must choose exactly one offer.',
      payloadTitle: 'Layer 2 delivery',
      rows: [
        ['Destination MAC', 'ff:ff:ff:ff:ff:ff'],
        ['VLAN', '40'],
        ['Servers on segment', '1 (10.10.4.2)'],
        ['Relay', 'not required'],
        ['UDP', '68 → 67'],
      ],
    },
    {
      id: 'select',
      title: 'Server selects a candidate lease',
      phase: 'OFFER',
      node: 2,
      detail:
        'The server finds the scope for the receiving subnet, picks an available address and checks it is not already in use (ARP or ICMP probe) before offering it.',
      payloadTitle: 'Allocation logic',
      rows: [
        ['Matched scope', '10.10.4.0/24'],
        ['Free addresses', '63 of 100'],
        ['Selected address', '10.10.4.142'],
        ['Conflict check', 'ARP probe — no reply'],
        ['Existing lease for MAC', 'none'],
      ],
    },
    {
      id: 'offer',
      title: 'DHCPOFFER — server proposes a configuration',
      phase: 'OFFER',
      node: 2,
      status: 'ok',
      detail:
        'The offer is still not binding: it reserves the address briefly and returns the full option set the client asked for, plus the server identifier.',
      payloadTitle: 'DHCPOFFER',
      rows: [
        ['Message type', 'DHCPOFFER (53 = 2)'],
        ['yiaddr', '10.10.4.142'],
        ['Server identifier', '10.10.4.2 (54)'],
        ['Lease time', '86400 s (51)'],
        ['Subnet mask', '255.255.255.0 (1)'],
        ['Router', '10.10.4.1 (3)'],
        ['DNS', '10.10.4.53, 10.10.4.54 (6)'],
        ['T1 / T2', '43200 s / 75600 s (58 / 59)'],
      ],
      raw: 'DHCP Message type 2 (OFFER)\nyiaddr 10.10.4.142\nServer identifier 10.10.4.2\nSubnet mask 255.255.255.0\nRouter 10.10.4.1\nDomain name servers 10.10.4.53, 10.10.4.54\nIP address lease time 86400s\nRenewal time 43200s\nRebinding time 75600s',
      packetLabel: 'OFFER',
    },
    {
      id: 'request',
      title: 'DHCPREQUEST — client claims the offer',
      phase: 'REQUEST',
      node: 0,
      detail:
        'The client formally requests the offered address and names the selected server in option 54. Because the request is broadcast, the other servers see it and withdraw their offers.',
      payloadTitle: 'DHCPREQUEST',
      rows: [
        ['Message type', 'DHCPREQUEST (53 = 3)'],
        ['Requested IP', '10.10.4.142 (50)'],
        ['Server identifier', '10.10.4.2 (54)'],
        ['Source', '0.0.0.0:68 (still unconfigured)'],
        ['Broadcast', 'yes — informs other servers'],
      ],
      raw: 'DHCP Message type 3 (REQUEST)\nRequested IP address 10.10.4.142\nServer identifier 10.10.4.2\nClient MAC 00:1a:2b:3c:4d:5e',
      packetLabel: 'REQUEST',
    },
    {
      id: 'commit',
      title: 'Server commits the lease',
      phase: 'ACK',
      node: 3,
      detail:
        'The binding is written to the lease store with the client identifier and expiry. From this moment the address is reserved for this MAC until the lease ends or is released.',
      payloadTitle: 'Lease record',
      rows: [
        ['Client identifier', '00:1a:2b:3c:4d:5e'],
        ['Address', '10.10.4.142'],
        ['Starts', 'now'],
        ['Expires', 'now + 86400 s'],
        ['T1 / T2', '43200 s / 75600 s'],
        ['State', 'ACTIVE'],
      ],
    },
    {
      id: 'ack',
      title: 'DHCPACK — configuration confirmed',
      phase: 'ACK',
      node: 2,
      status: 'ok',
      detail:
        'The ACK is the binding confirmation. It repeats the options so a client that lost the OFFER can still configure itself completely.',
      payloadTitle: 'DHCPACK',
      rows: [
        ['Message type', 'DHCPACK (53 = 5)'],
        ['yiaddr', '10.10.4.142'],
        ['Subnet mask', '255.255.255.0'],
        ['Router', '10.10.4.1'],
        ['DNS', '10.10.4.53, 10.10.4.54'],
        ['Domain name', 'lab.example.com (15)'],
        ['Broadcast address', '10.10.4.255 (28)'],
      ],
      raw: 'DHCP Message type 5 (ACK)\nyiaddr 10.10.4.142\nSubnet mask 255.255.255.0\nRouter 10.10.4.1\nDomain name servers 10.10.4.53, 10.10.4.54\nDomain name lab.example.com\nBroadcast address 10.10.4.255',
      packetLabel: 'ACK',
    },
    {
      id: 'apply',
      title: 'Client configures the interface',
      phase: 'CONFIGURED',
      node: 0,
      status: 'ok',
      detail:
        'The address and options are applied to the interface. The client performs duplicate address detection with a gratuitous ARP before it starts using the address for real traffic.',
      payloadTitle: 'Interface state',
      rows: [
        ['Address', '10.10.4.142/24'],
        ['Default gateway', '10.10.4.1'],
        ['DNS servers', '10.10.4.53, 10.10.4.54'],
        ['Lease remaining', '86399 s'],
        ['Next event', 'T1 renew at 43200 s'],
      ],
    },
    {
      id: 'lifecycle',
      title: 'Lease lifecycle after the ACK',
      phase: 'LIFECYCLE',
      node: 3,
      detail:
        'At T1 (50% of the lease) the client tries to renew with the original server. At T2 (87.5%) it broadcasts to any server. At expiry it must stop using the address and start again at DISCOVER.',
      payloadTitle: 'Timers',
      rows: [
        ['T1 · renew', '43200 s — unicast DHCPREQUEST'],
        ['T2 · rebind', '75600 s — broadcast DHCPREQUEST'],
        ['Expiry', '86400 s — address released'],
        ['Early release', 'DHCPRELEASE (53 = 7)'],
        ['Retry on NAK', 'restart at DISCOVER'],
      ],
    },
  ];
}

function renewSteps(): SimStep[] {
  return [
    {
      id: 't1',
      title: 'T1 reached: client renews unicast',
      phase: 'RENEW',
      node: 0,
      status: 'info',
      detail:
        'At 50% of the lease the client sends a unicast DHCPREQUEST to the server that granted it. The interface keeps its address throughout, so traffic is not interrupted.',
      payloadTitle: 'DHCPREQUEST (renewing)',
      rows: [
        ['Message type', 'DHCPREQUEST (53 = 3)'],
        ['Source → destination', '10.10.4.142:68 → 10.10.4.2:67'],
        ['ciaddr', '10.10.4.142'],
        ['Server identifier', '10.10.4.2'],
        ['Elapsed', '43200 s'],
      ],
      raw: 'DHCP Message type 3 (REQUEST)\nciaddr 10.10.4.142\nServer identifier 10.10.4.2\nRenewal (unicast)',
      packetLabel: 'REQUEST',
    },
    {
      id: 'validate',
      title: 'Server validates the existing binding',
      phase: 'RENEW',
      node: 3,
      detail:
        'The server confirms the lease still belongs to this client identifier, that the address is still inside the scope and that policy has not changed.',
      payloadTitle: 'Validation',
      rows: [
        ['Lease found', 'yes'],
        ['Client match', 'yes'],
        ['Address free of conflict', 'yes'],
        ['Policy change', 'none'],
      ],
    },
    {
      id: 'extend',
      title: 'DHCPACK extends the lease',
      phase: 'ACK',
      node: 2,
      status: 'ok',
      detail:
        'A new lease time is granted and the timers are recalculated. Only the changed options are sent; the client keeps the rest of its configuration.',
      payloadTitle: 'DHCPACK',
      rows: [
        ['Message type', 'DHCPACK (53 = 5)'],
        ['New lease time', '86400 s'],
        ['T1 / T2', '43200 s / 75600 s'],
        ['yiaddr', 'not set — address unchanged'],
        ['Downtime', 'none'],
      ],
      raw: 'DHCP Message type 5 (ACK)\nIP address lease time 86400s\nRenewal time 43200s\nRebinding time 75600s',
      packetLabel: 'ACK',
    },
    {
      id: 'rebind',
      title: 'If the server is silent: rebind at T2',
      phase: 'REBIND',
      node: 1,
      status: 'warn',
      detail:
        'With no answer by T2 (87.5%), the client broadcasts to any server. If nothing answers before expiry, the address is dropped and the host falls back to DISCOVER — or to an APIPA address if no server responds at all.',
      payloadTitle: 'Failure path',
      rows: [
        ['T2', '75600 s'],
        ['Scope of request', 'broadcast to any server'],
        ['On expiry', 'release address, restart DISCOVER'],
        ['No server at all', '169.254.0.0/16 APIPA'],
      ],
    },
  ];
}

function nakSteps(): SimStep[] {
  return [
    {
      id: 'wrong-subnet',
      title: 'Client requests an address from the wrong subnet',
      phase: 'REQUEST',
      node: 0,
      status: 'warn',
      detail:
        'A host moved between VLANs but kept a static request or a stale lease. It asks for 192.168.1.50 on a segment served by 10.10.4.0/24.',
      payloadTitle: 'DHCPREQUEST',
      rows: [
        ['Requested IP', '192.168.1.50 (50)'],
        ['Server identifier', '10.10.4.2 (54)'],
        ['Client MAC', '00:1a:2b:3c:4d:5e'],
        ['Segment', '10.10.4.0/24'],
      ],
      raw: 'DHCP Message type 3 (REQUEST)\nRequested IP address 192.168.1.50\nServer identifier 10.10.4.2',
      packetLabel: 'REQUEST',
    },
    {
      id: 'reject',
      title: 'Server rejects with DHCPNAK',
      phase: 'NAK',
      node: 2,
      status: 'bad',
      detail:
        'The requested address is not valid on this segment, so the server refuses with a NAK. A NAK is a definitive instruction to stop using the address immediately.',
      payloadTitle: 'DHCPNAK',
      rows: [
        ['Message type', 'DHCPNAK (53 = 6)'],
        ['Reason', 'requested address not on this subnet'],
        ['Server identifier', '10.10.4.2'],
        ['Client action', 'drop address, restart DISCOVER'],
      ],
      raw: 'DHCP Message type 6 (NAK)\nServer identifier 10.10.4.2\nRequested address 192.168.1.50 is invalid on this network',
      packetLabel: 'NAK',
    },
    {
      id: 'reset',
      title: 'Client abandons the address and restarts',
      phase: 'RECOVERY',
      node: 0,
      detail:
        'The interface is reset to 0.0.0.0 and the client begins again at DISCOVER. This is why a NAK produces a brief loss of connectivity rather than a wrong configuration.',
      payloadTitle: 'Recovery',
      rows: [
        ['Address state', 'cleared'],
        ['Next message', 'DHCPDISCOVER'],
        ['Expected outcome', 'correct lease for 10.10.4.0/24'],
      ],
    },
    {
      id: 'recover',
      title: 'New lease on the correct subnet',
      phase: 'RECOVERY',
      node: 2,
      status: 'ok',
      detail:
        'The normal DORA exchange completes and the host receives a valid address for the segment it is actually attached to.',
      payloadTitle: 'Outcome',
      rows: [
        ['New address', '10.10.4.143/24'],
        ['Gateway', '10.10.4.1'],
        ['DNS', '10.10.4.53, 10.10.4.54'],
        ['Lease', '86400 s'],
      ],
    },
  ];
}

const OPTIONS = [
  ['1', 'Subnet mask', '255.255.255.0'],
  ['3', 'Router (default gateway)', '10.10.4.1'],
  ['6', 'Domain name servers', '10.10.4.53, 10.10.4.54'],
  ['12', 'Host name', 'lab-ws-142'],
  ['15', 'Domain name', 'lab.example.com'],
  ['28', 'Broadcast address', '10.10.4.255'],
  ['50', 'Requested IP address', 'client → server'],
  ['51', 'IP address lease time', '86400 s'],
  ['53', 'DHCP message type', '1 DISCOVER … 6 NAK'],
  ['54', 'Server identifier', '10.10.4.2'],
  ['55', 'Parameter request list', 'client → server'],
  ['58', 'Renewal time (T1)', '43200 s'],
  ['59', 'Rebinding time (T2)', '75600 s'],
];

export default function DhcpLab() {
  const [mode, setMode] = useState<Mode>('dora');
  const steps = useMemo(() => (mode === 'dora' ? doraSteps() : mode === 'renew' ? renewSteps() : nakSteps()), [mode]);

  return (
    <>
      <PageHead
        eyebrow="05 · Laboratory"
        title="DHCP Laboratory"
        lede="Inspect the DORA exchange message by message, including the option fields that actually configure a host. Then replay a renewal and a NAK to see how a lease is maintained and repaired."
        actions={
          <>
            <Badge tone="blue">{steps.length} STEPS</Badge>
            <Badge tone="teal">UDP 67 / 68</Badge>
          </>
        }
      />

      <SimulationShell
        simId="dhcp"
        title="Lease acquisition"
        sub={MODE_LABEL[mode]}
        nodes={NODES}
        steps={steps}
        resetKey={mode}
        controls={
          <Tabs
            items={[
              { id: 'dora', label: 'New lease' },
              { id: 'renew', label: 'Renewal' },
              { id: 'nak', label: 'Conflict / NAK' },
            ]}
            active={mode}
            onChange={setMode}
            pill
            label="DHCP scenario"
          />
        }
        caption="A lease is stateful: the server remembers the binding, and the client must renew it at T1 or lose the address at expiry."
      />

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="DORA at a glance" sub="four messages, two directions">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Direction</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">DISCOVER</td>
                  <td>Client → broadcast</td>
                  <td>Find available DHCP servers. Sent with no address configured.</td>
                </tr>
                <tr>
                  <td className="mono">OFFER</td>
                  <td>Server → client</td>
                  <td>Propose an address and the option set. Not yet binding.</td>
                </tr>
                <tr>
                  <td className="mono">REQUEST</td>
                  <td>Client → broadcast</td>
                  <td>Claim one offer and implicitly decline the others.</td>
                </tr>
                <tr>
                  <td className="mono">ACK</td>
                  <td>Server → client</td>
                  <td>Confirm the binding and repeat the configuration.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Callout tone="info">
            <span>
              DHCP uses two well-known ports: the server listens on <span className="mono">UDP 67</span>, the client on{' '}
              <span className="mono">UDP 68</span>. Both messages are often sent to the broadcast address, which is why the client may send
              before it has an IP at all.
            </span>
          </Callout>
        </Panel>

        <Panel title="Why broadcast is required" sub="a chicken-and-egg problem">
          <div className="stack">
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.6, lineHeight: 1.7 }}>
              A host without an address cannot route to a server by IP, and it does not know the server's address. DHCP therefore starts with a
              link-local broadcast that every host on the segment receives. That is also its main limitation: broadcasts stop at a router.
            </p>
            <div className="kv">
              <div className="kv__row">
                <div className="kv__key">Same subnet</div>
                <div className="kv__val">Broadcast reaches the server directly</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Routed network</div>
                <div className="kv__val">Requires a DHCP relay agent (option 82 / giaddr)</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Relay operation</div>
                <div className="kv__val">Relay sets giaddr so the server can pick the right scope</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Firewall</div>
                <div className="kv__val">UDP 67/68 must be permitted for the relay to work</div>
              </div>
            </div>
            <Callout tone="warn">
              <span>
                An address in <span className="mono">169.254.0.0/16</span> means the client gave up: no DHCP server answered. Check the VLAN,
                the relay and the scope before blaming the client.
              </span>
            </Callout>
          </div>
        </Panel>
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="DHCP options" sub="the fields that configure a host">
          <div className="scroll-x">
            <table className="table table--mono">
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Meaning</th>
                  <th>Example value</th>
                </tr>
              </thead>
              <tbody>
                {OPTIONS.map(([code, meaning, value]) => (
                  <tr key={code}>
                    <td>{code}</td>
                    <td style={{ fontFamily: 'var(--font-sans)' }}>{meaning}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Raw DORA exchange" sub="what the packets carry">
          <CodeBlock
            title="OFFER and ACK (abridged)"
            code={'→ DISCOVER  0.0.0.0:68 → 255.255.255.255:67  type=1 xid=0x3f9a21c4\n← OFFER     10.10.4.2:67 → 10.10.4.142:68  type=2 yiaddr=10.10.4.142\n→ REQUEST   0.0.0.0:68 → 255.255.255.255:67  type=3 option50=10.10.4.142\n← ACK       10.10.4.2:67 → 10.10.4.142:68  type=5 lease=86400 t1=43200 t2=75600\n\noptions: 1=mask 3=router 6=dns 15=domain 51=lease 58=t1 59=t2'}
          />
          <Callout tone="teal">
            <span>
              Read a DHCP log by message type and transaction ID: DISCOVER and REQUEST share an xid, so you can match a client's attempt to the
              server's answer even on a busy segment.
            </span>
          </Callout>
        </Panel>
      </div>

      <div style={{ marginTop: 24 }}>
        <Disclosure title="Going deeper: leases, timers and relay agents" meta="Advanced reference">
          <div className="stack" style={{ gap: 14 }}>
            <ul style={{ margin: 0 }}>
              <li>
                DHCP uses UDP: the server listens on port 67 and the client on port 68. Discover is sent to the broadcast address
                255.255.255.255 because the client has no usable IP address yet.
              </li>
              <li>
                Beyond DORA the protocol also defines DHCPRELEASE, DHCPDECLINE for a duplicate address, DHCPNAK for a refused request
                and DHCPINFORM for clients that already have an address.
              </li>
              <li>
                The lease has two renewal timers: T1 at 50% of the lease, when the client unicasts a renewal request to its original
                server, and T2 at 87.5%, when it broadcasts to any available server.
              </li>
              <li>
                Common options are option 1 subnet mask, option 3 default gateway, option 6 DNS servers, option 51 lease time and
                option 54 the DHCP server identifier.
              </li>
              <li>
                A DHCP relay agent forwards requests between subnets, because the original broadcast does not cross a router.
              </li>
            </ul>
          </div>
        </Disclosure>
      </div>

      <PageNav />
    </>
  );
}
