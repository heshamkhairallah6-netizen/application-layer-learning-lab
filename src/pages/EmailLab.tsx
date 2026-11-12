import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Disclosure, LessonHead, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type Mode = 'smtp' | 'imap' | 'pop3';

const MODES: { id: Mode; label: string }[] = [
  { id: 'smtp', label: 'Send mail' },
  { id: 'imap', label: 'Read (IMAP)' },
  { id: 'pop3', label: 'Fetch (POP3)' },
];

const NODES: FlowNode[] = [
  {
    id: 'sender',
    label: 'Your laptop',
    sub: 'mail client',
    tag: 'SENDER',
    address: 'laptop.local',
    kind: 'client',
    detail: 'The mail client that writes the message and hands it to a server for delivery.',
  },
  {
    id: 'submission',
    label: 'Sending server',
    sub: 'smtp.example.com :587',
    tag: 'SUBMISSION',
    address: '203.0.113.20',
    kind: 'server',
    detail: 'Accepts mail from you after login, then queues it for delivery. Port 587 is the submission port.',
  },
  {
    id: 'mx',
    label: 'Receiving server',
    sub: 'mx.gmail.com :25',
    tag: 'MX',
    address: '142.250.27.26',
    kind: 'server',
    detail: 'Found through the domain MX record. It accepts mail for that domain on port 25.',
  },
  {
    id: 'mailbox',
    label: 'Mailbox',
    sub: 'INBOX storage',
    tag: 'STORE',
    address: '/var/mail/student',
    kind: 'service',
    detail: 'Holds the delivered message until a client reads it with IMAP or downloads it with POP3.',
  },
  {
    id: 'reader',
    label: 'Recipient',
    sub: 'phone / webmail',
    tag: 'READER',
    address: 'student@gmail.com',
    kind: 'client',
    detail: 'Reads the mailbox over IMAP on port 993, or downloads it with POP3 on port 995.',
  },
];

function buildSteps(mode: Mode): SimStep[] {
  if (mode === 'imap') {
    return [
      {
        id: 'login',
        title: 'Phone connects to the mailbox',
        phase: 'CONNECT',
        node: 4,
        packetLabel: 'TLS',
        detail: 'IMAP opens an encrypted connection on port 993 and logs in.',
        raw: '* OK [CAPABILITY IMAP4rev1] ready\na1 LOGIN student@gmail.com ********\na1 OK Logged in',
        payloadTitle: 'Session',
        rows: [
          ['Port', '993'],
          ['Encryption', 'TLS 1.3'],
          ['Mode', 'IMAP4rev1'],
        ],
      },
      {
        id: 'select',
        title: 'Client selects the inbox',
        phase: 'SELECT',
        node: 4,
        packetLabel: 'SELECT',
        detail: 'The server reports how many messages are in the folder.',
        raw: 'a2 SELECT INBOX\n* 3 EXISTS\n* OK [UIDVALIDITY 1284] UIDs valid\na2 OK [READ-WRITE] SELECT completed',
        payloadTitle: 'Folder',
        rows: [
          ['Folder', 'INBOX'],
          ['Messages', '3'],
        ],
      },
      {
        id: 'fetch',
        title: 'Client fetches one message',
        phase: 'FETCH',
        node: 3,
        packetLabel: 'FETCH',
        detail: 'Only the requested message is downloaded, not the whole mailbox.',
        raw: 'a3 FETCH 3 BODY.PEEK[HEADER.FIELDS (SUBJECT FROM)]\n* 3 FETCH (Subject: Lab 7 notes\nFrom: Hesham <hesham@example.com>)\na3 OK FETCH completed',
        payloadTitle: 'Message 3',
        rows: [
          ['Subject', 'Lab 7 notes'],
          ['From', 'hesham@example.com'],
        ],
      },
      {
        id: 'flag',
        title: 'Message marked as read',
        phase: 'FLAGS',
        node: 3,
        status: 'ok',
        packetLabel: 'STORE',
        detail: 'The read flag is stored on the server, so your laptop will show the same state.',
        raw: 'a4 STORE 3 +FLAGS (\\Seen)\n* 3 FETCH (FLAGS (\\Seen))\na4 OK STORE completed',
        payloadTitle: 'Flag',
        rows: [['Flag', '\\Seen']],
      },
      {
        id: 'done',
        title: 'Inbox is synced everywhere',
        phase: 'DONE',
        node: 4,
        status: 'ok',
        detail: 'The message never left the server, so every device shows the same inbox.',
        payloadTitle: 'Result',
        rows: [
          ['Stored on', 'server'],
          ['Copies', 'synced'],
        ],
      },
    ];
  }

  if (mode === 'pop3') {
    return [
      {
        id: 'login',
        title: 'Client logs in to the mailbox',
        phase: 'CONNECT',
        node: 4,
        packetLabel: 'USER',
        detail: 'POP3 opens an encrypted connection on port 995 and logs in with a username and password.',
        raw: '+OK POP3 server ready\nUSER student\n+OK\nPASS ********\n+OK mailbox locked and ready',
        payloadTitle: 'Session',
        rows: [
          ['Port', '995'],
          ['Encryption', 'TLS 1.3'],
        ],
      },
      {
        id: 'stat',
        title: 'Client asks what is waiting',
        phase: 'STAT',
        node: 3,
        packetLabel: 'STAT',
        detail: 'The server reports two messages and their total size.',
        raw: 'STAT\n+OK 2 3140',
        payloadTitle: 'Mailbox',
        rows: [
          ['Messages', '2'],
          ['Total size', '3140 bytes'],
        ],
      },
      {
        id: 'retr',
        title: 'Message is downloaded',
        phase: 'RETR',
        node: 3,
        packetLabel: 'RETR',
        detail: 'The full message, headers and body, is transferred to the device.',
        raw: 'RETR 1\n+OK 1580 octets\nFrom: Hesham <hesham@example.com>\nSubject: Lab 7 notes\n\nHere are the notes from today.\n.\n+OK message follows',
        payloadTitle: 'Downloaded',
        rows: [
          ['Message', '1 of 2'],
          ['Size', '1580 bytes'],
        ],
      },
      {
        id: 'dele',
        title: 'Message is deleted from the server',
        phase: 'DELE',
        node: 3,
        status: 'warn',
        packetLabel: 'DELE',
        detail: 'POP3 is download-and-remove by default, which is why the phone copy becomes the only copy.',
        raw: 'DELE 1\n+OK message 1 deleted\nQUIT\n+OK bye',
        payloadTitle: 'Deletion',
        rows: [
          ['Deleted on server', 'yes'],
          ['Remaining', '1 message'],
        ],
      },
      {
        id: 'done',
        title: 'One device owns the mail',
        phase: 'DONE',
        node: 4,
        status: 'warn',
        detail: 'That message now exists only on this device, so another device will never see it.',
        payloadTitle: 'Result',
        rows: [
          ['Server copy', 'gone'],
          ['Other devices', 'cannot see it'],
        ],
      },
    ];
  }

  return [
    {
      id: 'ehlo',
      title: 'Client connects and says hello',
      phase: 'CONNECT',
      node: 0,
      packetLabel: 'EHLO',
      detail: 'The client opens the connection and asks which features the server supports.',
      raw: '220 smtp.example.com ESMTP Postfix\nEHLO laptop.local\n250-smtp.example.com\n250-STARTTLS\n250 AUTH PLAIN LOGIN',
      payloadTitle: 'Session',
      rows: [
        ['Server', 'smtp.example.com'],
        ['Port', '587'],
        ['Features', 'STARTTLS, AUTH'],
      ],
    },
    {
      id: 'auth',
      title: 'Connection is encrypted and logged in',
      phase: 'AUTH',
      node: 1,
      packetLabel: 'AUTH',
      detail: 'TLS starts first, then the client authenticates so the server knows who is sending.',
      raw: 'STARTTLS\n220 2.0.0 Ready to start TLS\nAUTH PLAIN AGhlc2hhbQ==\n235 2.7.0 Authentication successful',
      payloadTitle: 'Security',
      rows: [
        ['Encryption', 'TLS 1.3'],
        ['Auth', 'PLAIN over TLS'],
      ],
    },
    {
      id: 'envelope',
      title: 'Envelope says who sends to whom',
      phase: 'ENVELOPE',
      node: 0,
      packetLabel: 'MAIL FROM',
      detail: 'The envelope is separate from the message: it tells the server who to deliver to.',
      raw: 'MAIL FROM:<hesham@example.com>\n250 2.1.0 Ok\nRCPT TO:<student@gmail.com>\n250 2.1.5 Ok',
      payloadTitle: 'Envelope',
      rows: [
        ['From', 'hesham@example.com'],
        ['To', 'student@gmail.com'],
      ],
    },
    {
      id: 'data',
      title: 'The message itself is sent',
      phase: 'DATA',
      node: 0,
      packetLabel: 'DATA',
      detail: 'Headers and body are sent, and a single dot on its own line ends the message.',
      raw: 'DATA\n354 End data with <CR><LF>.<CR><LF>\nFrom: Hesham <hesham@example.com>\nTo: student@gmail.com\nSubject: Lab 7 notes\nDate: Tue, 12 Nov 2026 10:04:11 +0000\n\nHere are the notes from today.\n.\n250 2.0.0 Ok: queued as 4Wx2',
      payloadTitle: 'Message',
      rows: [
        ['Subject', 'Lab 7 notes'],
        ['Size', '412 bytes'],
        ['Queue id', '4Wx2'],
      ],
    },
    {
      id: 'relay',
      title: 'Server relays it to the MX host',
      phase: 'RELAY',
      node: 2,
      packetLabel: 'SMTP',
      detail: 'The sending server looks up the MX record for gmail.com and forwards the message there.',
      raw: ';; MX lookup\ngmail.com. MX 5 gmail-smtp-in.l.google.com.\n;; connect port 25\n220 mx.google.com ESMTP\n250 2.0.0 OK',
      payloadTitle: 'Relay',
      rows: [
        ['MX target', 'gmail-smtp-in.l.google.com'],
        ['Port', '25'],
        ['Result', 'accepted'],
      ],
    },
    {
      id: 'delivered',
      title: 'Message lands in the inbox',
      phase: 'DELIVERED',
      node: 3,
      status: 'ok',
      detail: 'The receiving server stores the message in the mailbox, where the recipient can read it.',
      payloadTitle: 'Delivery',
      rows: [
        ['Mailbox', 'INBOX'],
        ['Spam score', '0.4'],
        ['Read with', 'IMAP 993 or POP3 995'],
      ],
    },
  ];
}

export default function EmailLab() {
  const [mode, setMode] = useState<Mode>('smtp');
  const steps = useMemo(() => buildSteps(mode), [mode]);

  return (
    <>
      <LessonHead
        eyebrow="06 · Email laboratory"
        title="How email actually travels"
        sentence="Sending and reading are two different protocols, and neither one is the other."
      />

      <SimulationShell
        simId="email"
        title={mode === 'smtp' ? 'Send a message' : mode === 'imap' ? 'Read with IMAP' : 'Fetch with POP3'}
        sub={mode === 'smtp' ? 'SMTP 587 → 25' : mode === 'imap' ? 'IMAP 993' : 'POP3 995'}
        nodes={NODES}
        steps={steps}
        resetKey={mode}
        playLabel={mode === 'smtp' ? 'Send message' : mode === 'imap' ? 'Open inbox' : 'Fetch mail'}
        controls={
          <Tabs
            items={MODES.map((m) => ({ id: m.id, label: m.label }))}
            active={mode}
            onChange={setMode}
            pill
            label="Email scenario"
          />
        }
        caption="Click a server to see what it does."
      />

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>

        <Disclosure title="Ports" meta="25 · 587 · 993 · 995">
          <table className="table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Port</th>
                <th>Job</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">SMTP</td>
                <td className="mono">25</td>
                <td>Server-to-server delivery</td>
              </tr>
              <tr>
                <td className="mono">SMTP submission</td>
                <td className="mono">587</td>
                <td>Your client hands mail to your provider</td>
              </tr>
              <tr>
                <td className="mono">IMAP</td>
                <td className="mono">143 / 993</td>
                <td>Read and manage mail on the server</td>
              </tr>
              <tr>
                <td className="mono">POP3</td>
                <td className="mono">110 / 995</td>
                <td>Download mail to one device</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="SMTP vs IMAP vs POP3" meta="3 protocols">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>SMTP</th>
                <th>IMAP</th>
                <th>POP3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Direction</td>
                <td>Send</td>
                <td>Read</td>
                <td>Read</td>
              </tr>
              <tr>
                <td>Mail stays on server</td>
                <td>—</td>
                <td>Yes</td>
                <td>No, by default</td>
              </tr>
              <tr>
                <td>Multiple devices</td>
                <td>—</td>
                <td>Synced</td>
                <td>Not synced</td>
              </tr>
              <tr>
                <td>Folders</td>
                <td>—</td>
                <td>Yes</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="Why mail lands in spam" meta="MX · SPF · DKIM · DMARC">
          <ul className="checklist checklist--teal">
            <li>
              <strong>MX</strong> — the DNS record that names the server accepting mail for a domain.
            </li>
            <li>
              <strong>SPF</strong> — lists which servers may send for that domain.
            </li>
            <li>
              <strong>DKIM</strong> — a signature that proves the message was not altered.
            </li>
            <li>
              <strong>DMARC</strong> — says what to do when SPF or DKIM fails.
            </li>
          </ul>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
