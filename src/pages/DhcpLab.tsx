import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Disclosure, LessonHead, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type Mode = 'dora' | 'renew' | 'conflict';

const MODES: { id: Mode; label: string }[] = [
  { id: 'dora', label: 'New device' },
  { id: 'renew', label: 'Renewal' },
  { id: 'conflict', label: 'Conflict' },
];

const NODES: FlowNode[] = [
  {
    id: 'client',
    label: 'New device',
    sub: 'no address yet',
    tag: 'CLIENT',
    address: '00:1a:2b:3c:4d:5e',
    kind: 'client',
    detail: 'Has a MAC address but no IP address, so it cannot talk to anything until it gets one.',
  },
  {
    id: 'switch',
    label: 'Switch',
    sub: 'broadcast domain',
    tag: 'LAN',
    address: 'vlan 10',
    kind: 'network',
    detail: 'Copies the broadcast to every port, because the client does not know the server address yet.',
  },
  {
    id: 'server',
    label: 'DHCP server',
    sub: '10.0.0.1 :67',
    tag: 'SERVER',
    address: '10.0.0.1',
    kind: 'server',
    detail: 'Chooses an unused address from the pool and sends back the settings that go with it.',
  },
  {
    id: 'pool',
    label: 'Lease pool',
    sub: 'address database',
    tag: 'DATA',
    address: '10.0.0.50-200',
    kind: 'service',
    detail: 'Remembers which address is leased to which MAC address and for how long.',
  },
];

function buildSteps(mode: Mode): SimStep[] {
  if (mode === 'renew') {
    return [
      {
        id: 'renew',
        title: 'Client renews its lease',
        phase: 'REQUEST',
        node: 0,
        packetLabel: 'REQUEST',
        detail: 'Half the lease time has passed, so the client asks the same server to extend it.',
        raw: 'DHCPREQUEST  xid=0x91c4aa\nciaddr=10.0.0.57\noption 53 = 3 (REQUEST)\noption 54 = 10.0.0.1 (server id)\n;; unicast to 10.0.0.1:67',
        payloadTitle: 'Renewal request',
        rows: [
          ['From', '10.0.0.57'],
          ['To', '10.0.0.1:67'],
          ['Type', 'unicast, not broadcast'],
        ],
      },
      {
        id: 'ack',
        title: 'Server extends the lease',
        phase: 'ACK',
        node: 2,
        status: 'ok',
        packetLabel: 'ACK',
        detail: 'The address is still free, so the server resets the lease timer.',
        raw: 'DHCPACK  xid=0x91c4aa\nyiaddr=10.0.0.57\noption 53 = 5 (ACK)\noption 51 = 86400 (lease, s)',
        payloadTitle: 'Lease',
        rows: [
          ['Address', '10.0.0.57'],
          ['New lease', '86400 s'],
        ],
      },
      {
        id: 'done',
        title: 'Same address, new timer',
        phase: 'DONE',
        node: 0,
        status: 'ok',
        detail: 'Nothing changes on the device except the expiry time; the connection is never interrupted.',
        payloadTitle: 'Result',
        rows: [
          ['Address', '10.0.0.57'],
          ['Interruption', 'none'],
        ],
      },
    ];
  }

  if (mode === 'conflict') {
    return [
      {
        id: 'request',
        title: 'Client asks for an address',
        phase: 'REQUEST',
        node: 0,
        packetLabel: 'REQUEST',
        detail: 'The client asks to keep 10.0.0.57 after moving from another network.',
        raw: 'DHCPREQUEST  xid=0x91c4aa\noption 53 = 3 (REQUEST)\noption 50 = 10.0.0.57 (requested)\noption 54 = 10.0.0.1 (server id)',
        payloadTitle: 'Request',
        rows: [
          ['Requested', '10.0.0.57'],
          ['Server', '10.0.0.1'],
        ],
      },
      {
        id: 'nak',
        title: 'Server refuses the address',
        phase: 'NAK',
        node: 2,
        status: 'bad',
        packetLabel: 'NAK',
        detail: 'That address already belongs to another device, so the server refuses it.',
        raw: 'DHCPNAK  xid=0x91c4aa\noption 53 = 6 (NAK)\noption 56 = "address in use"\n;; lease refused',
        payloadTitle: 'Refusal',
        rows: [
          ['Type', 'DHCPNAK'],
          ['Reason', 'address in use'],
        ],
      },
      {
        id: 'restart',
        title: 'Client starts over',
        phase: 'DISCOVER',
        node: 0,
        packetLabel: 'DISCOVER',
        detail: 'The client throws away its old address and broadcasts from scratch.',
        raw: 'DHCPDISCOVER  xid=0x7a02be\nciaddr=0.0.0.0\noption 53 = 1 (DISCOVER)\n;; broadcast 255.255.255.255:67',
        payloadTitle: 'Restart',
        rows: [['Address now', '0.0.0.0']],
      },
      {
        id: 'offer',
        title: 'Server offers a free address',
        phase: 'OFFER',
        node: 2,
        status: 'ok',
        packetLabel: 'OFFER',
        detail: 'The pool returns the next unused address instead.',
        raw: 'DHCPOFFER  xid=0x7a02be\nyiaddr=10.0.0.58\noption 53 = 2 (OFFER)\noption 51 = 86400',
        payloadTitle: 'New offer',
        rows: [
          ['Address', '10.0.0.58'],
          ['Lease', '86400 s'],
        ],
      },
    ];
  }

  return [
    {
      id: 'discover',
      title: 'Device shouts for a server',
      phase: 'DISCOVER',
      node: 0,
      packetLabel: 'DISCOVER',
      detail: 'With no address, the only thing the device can do is broadcast to the whole network.',
      raw: 'DHCPDISCOVER  xid=0x3d1f9c\nchaddr=00:1a:2b:3c:4d:5e\nciaddr=0.0.0.0  yiaddr=0.0.0.0\nflags=0x8000 (broadcast)\noption 53 = 1 (DISCOVER)',
      payloadTitle: 'Discover',
      rows: [
        ['From', '0.0.0.0'],
        ['To', '255.255.255.255:67'],
        ['Identifies itself by', 'MAC address'],
      ],
    },
    {
      id: 'offer',
      title: 'Server offers an address',
      phase: 'OFFER',
      node: 2,
      packetLabel: 'OFFER',
      detail: 'The server picks a free address from the pool and offers it with its settings.',
      raw: 'DHCPOFFER  xid=0x3d1f9c\nyiaddr=10.0.0.57\noption 53 = 2 (OFFER)\noption 54 = 10.0.0.1\noption 1  = 255.255.255.0\noption 3  = 10.0.0.1\noption 6  = 1.1.1.1, 8.8.8.8',
      payloadTitle: 'Offer',
      rows: [
        ['Offered IP', '10.0.0.57'],
        ['Mask', '255.255.255.0'],
        ['Gateway', '10.0.0.1'],
      ],
    },
    {
      id: 'request',
      title: 'Client requests that address',
      phase: 'REQUEST',
      node: 0,
      packetLabel: 'REQUEST',
      detail: 'The client asks for this exact offer, which tells any other server to withdraw.',
      raw: 'DHCPREQUEST  xid=0x3d1f9c\noption 53 = 3 (REQUEST)\noption 50 = 10.0.0.57 (requested)\noption 54 = 10.0.0.1 (server id)',
      payloadTitle: 'Request',
      rows: [
        ['Requested IP', '10.0.0.57'],
        ['Chosen server', '10.0.0.1'],
      ],
    },
    {
      id: 'ack',
      title: 'Server confirms the lease',
      phase: 'ACK',
      node: 2,
      status: 'ok',
      packetLabel: 'ACK',
      detail: 'The server commits the address and starts the lease clock.',
      raw: 'DHCPACK  xid=0x3d1f9c\nyiaddr=10.0.0.57\noption 53 = 5 (ACK)\noption 51 = 86400 (lease, s)\noption 58 = 43200 (T1, renew)\noption 59 = 75600 (T2, rebind)',
      payloadTitle: 'Lease timers',
      rows: [
        ['Lease', '86400 s'],
        ['T1 renew at', '50%'],
        ['T2 rebind at', '87.5%'],
      ],
    },
    {
      id: 'done',
      title: 'Device is configured',
      phase: 'DONE',
      node: 0,
      status: 'ok',
      detail: 'The device applies the settings and can now send normal IP traffic.',
      raw: 'ip addr: 10.0.0.57/24\ndefault via 10.0.0.1\ndns 1.1.1.1\nlease 86400 s',
      payloadTitle: 'Interface',
      rows: [
        ['Address', '10.0.0.57/24'],
        ['Gateway', '10.0.0.1'],
        ['DNS', '1.1.1.1'],
        ['Valid for', '24 h'],
      ],
    },
  ];
}

export default function DhcpLab() {
  const [mode, setMode] = useState<Mode>('dora');
  const steps = useMemo(() => buildSteps(mode), [mode]);

  return (
    <>
      <LessonHead
        eyebrow="05 · DHCP laboratory"
        title="Getting an address automatically"
        sentence="A new device has no IP address, so DHCP hands it one along with the gateway and DNS."
      />

      <SimulationShell
        simId="dhcp"
        title="Watch DORA run"
        sub="Discover → Offer → Request → Acknowledge · UDP 67/68"
        nodes={NODES}
        steps={steps}
        resetKey={mode}
        playLabel="Plug in device"
        controls={
          <Tabs
            items={MODES.map((m) => ({ id: m.id, label: m.label }))}
            active={mode}
            onChange={setMode}
            pill
            label="DHCP scenario"
          />
        }
        caption="Click a component to see its job in the exchange."
      />

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>

        <Disclosure title="The four DORA messages" meta="Discover · Offer · Request · ACK">
          <table className="table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Sent by</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">DISCOVER</td>
                <td>Client, broadcast</td>
                <td>Is there a DHCP server here?</td>
              </tr>
              <tr>
                <td className="mono">OFFER</td>
                <td>Server</td>
                <td>You may have this address.</td>
              </tr>
              <tr>
                <td className="mono">REQUEST</td>
                <td>Client, broadcast</td>
                <td>I want that one.</td>
              </tr>
              <tr>
                <td className="mono">ACK</td>
                <td>Server</td>
                <td>It is yours for this long.</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="The options that carry the settings" meta="53 · 1 · 3 · 6 · 51">
          <table className="table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Carries</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">53</td>
                <td>Message type</td>
                <td className="mono">1, 2, 3, 5, 6</td>
              </tr>
              <tr>
                <td className="mono">1</td>
                <td>Subnet mask</td>
                <td className="mono">255.255.255.0</td>
              </tr>
              <tr>
                <td className="mono">3</td>
                <td>Default gateway</td>
                <td className="mono">10.0.0.1</td>
              </tr>
              <tr>
                <td className="mono">6</td>
                <td>DNS servers</td>
                <td className="mono">1.1.1.1</td>
              </tr>
              <tr>
                <td className="mono">51</td>
                <td>Lease time in seconds</td>
                <td className="mono">86400</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="Why it broadcasts" meta="UDP 67 / 68">
          <ul className="checklist checklist--teal">
            <li>
              <strong>No address yet</strong> — the client cannot be reached directly, so it shouts to the LAN.
            </li>
            <li>
              <strong>Port 67</strong> — the server listens here.
            </li>
            <li>
              <strong>Port 68</strong> — the client listens here for the reply.
            </li>
            <li>
              <strong>No DHCP server</strong> — the device falls back to a 169.254.x.x self-assigned address.
            </li>
          </ul>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
