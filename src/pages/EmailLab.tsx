import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Badge, Callout, CodeBlock, Disclosure, PageHead, Panel, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type Mode = 'smtp' | 'imap' | 'pop3';

const NODES: FlowNode[] = [
  {
    id: 'mua',
    label: 'Sender MUA',
    sub: 'mail client',
    tag: 'MUA',
    address: '10.10.4.87',
    kind: 'client',
    detail:
      'Mail User Agent: the application that composes the message. It writes RFC 5322 headers and a MIME body, then hands the message to a submission server — it does not deliver mail itself.',
  },
  {
    id: 'msa',
    label: 'Submission server',
    sub: 'smtp.example.com',
    tag: 'SMTP · MSA',
    address: '203.0.113.20:587',
    kind: 'server',
    detail:
      'Authenticated submission (port 587) with STARTTLS. It checks the sender is allowed to relay, adds a Received header and queues the message for delivery.',
  },
  {
    id: 'mx',
    label: 'Recipient MX',
    sub: 'mx.recipient.net',
    tag: 'SMTP · MTA',
    address: '203.0.113.25:25',
    kind: 'server',
    detail:
      'The mail transfer agent published in the recipient domain\'s MX record. It accepts the message for that domain, applies spam and policy checks, then hands it to the mailbox store.',
  },
  {
    id: 'store',
    label: 'Mailbox store',
    sub: 'IMAP / Maildir',
    tag: 'MDA',
    address: '203.0.113.25:993',
    kind: 'service',
    detail:
      'The message store that keeps mail until a client retrieves it. IMAP exposes folders, flags and server-side search; POP3 exposes only a single inbox and downloads messages.',
  },
  {
    id: 'mub',
    label: 'Recipient MUA',
    sub: 'mail client',
    tag: 'MUA',
    address: '10.10.9.14',
    kind: 'client',
    detail:
      'The recipient\'s client. It authenticates to the store over IMAP or POP3 and reads the message — a completely separate protocol from the SMTP path that delivered it.',
  },
];

const MODE_LABEL: Record<Mode, string> = {
  smtp: 'Delivery · SMTP',
  imap: 'Retrieval · IMAP',
  pop3: 'Retrieval · POP3',
};

function smtpSteps(): SimStep[] {
  return [
    {
      id: 'compose',
      title: 'Message is composed',
      phase: 'COMPOSE',
      node: 0,
      status: 'info',
      detail:
        'The client builds a message with envelope information (MAIL FROM, RCPT TO) and message content (headers plus body). These are separate: the envelope routes the mail, the headers are what the recipient sees.',
      payloadTitle: 'Message headers',
      rows: [
        ['From', 'alice@example.com'],
        ['To', 'bob@recipient.net'],
        ['Subject', 'Q3 interface audit'],
        ['Date', 'Tue, 04 Mar 2025 09:12:44 +0000'],
        ['Message-ID', '<9f2c1a@example.com>'],
        ['MIME', 'text/plain; charset=utf-8'],
      ],
      raw: 'From: Alice <alice@example.com>\nTo: Bob <bob@recipient.net>\nSubject: Q3 interface audit\nDate: Tue, 04 Mar 2025 09:12:44 +0000\nMessage-ID: <9f2c1a@example.com>\nMIME-Version: 1.0\nContent-Type: text/plain; charset=utf-8\n\nHi Bob,\n\nAttachment schedule confirmed for Thursday.\n\nAlice',
      packetLabel: 'Message',
    },
    {
      id: 'mx-lookup',
      title: 'Sender looks up the recipient MX record',
      phase: 'DNS',
      node: 0,
      detail:
        'SMTP does not use a fixed destination: the sending server resolves the MX record of the recipient domain and tries the lowest preference first, falling back to the next on connection failure.',
      payloadTitle: 'DNS · MX recipient.net',
      rows: [
        ['Query', 'recipient.net MX'],
        ['Preference 10', 'mx.recipient.net'],
        ['Preference 20', 'mx2.recipient.net (fallback)'],
        ['Resolution', '203.0.113.25'],
        ['Result', 'connect to port 25'],
      ],
      raw: 'recipient.net.\t3600\tIN\tMX\t10 mx.recipient.net.\nrecipient.net.\t3600\tIN\tMX\t20 mx2.recipient.net.\nmx.recipient.net.\t3600\tIN\tA\t203.0.113.25',
      packetLabel: 'MX query',
    },
    {
      id: 'ehlo',
      title: 'TCP connect and EHLO',
      phase: 'SMTP',
      node: 1,
      detail:
        'The client opens a TCP session and identifies itself. EHLO (extended hello) returns the capabilities the server supports, including STARTTLS, AUTH and the maximum message size.',
      payloadTitle: 'SMTP session',
      rows: [
        ['Transport', 'TCP 587 (submission)'],
        ['Server greeting', '220 smtp.example.com ESMTP'],
        ['Client', 'EHLO mail.example.com'],
        ['Capabilities', '250-STARTTLS, 250-AUTH PLAIN LOGIN, 250-SIZE 35882577'],
        ['Port 25', 'server-to-server relay only'],
      ],
      raw: 'S: 220 smtp.example.com ESMTP ready\nC: EHLO mail.example.com\nS: 250-smtp.example.com\nS: 250-STARTTLS\nS: 250-AUTH PLAIN LOGIN\nS: 250-SIZE 35882577\nS: 250 8BITMIME',
      packetLabel: 'EHLO',
    },
    {
      id: 'tls-auth',
      title: 'STARTTLS and authentication',
      phase: 'SMTP',
      node: 1,
      status: 'ok',
      detail:
        'STARTTLS upgrades the plaintext session to TLS before any credentials are sent. The client then authenticates, which is what separates submission (587) from relay between servers (25).',
      payloadTitle: 'Security',
      rows: [
        ['Command', 'STARTTLS'],
        ['Response', '220 Ready to start TLS'],
        ['TLS', 'TLS 1.3 · AES-256-GCM'],
        ['AUTH', 'PLAIN over TLS'],
        ['Result', '235 2.7.0 Authentication successful'],
      ],
      raw: 'C: STARTTLS\nS: 220 2.0.0 Ready to start TLS\n<TLS handshake>\nC: AUTH PLAIN <base64>\nS: 235 2.7.0 Authentication successful',
      packetLabel: 'STARTTLS',
    },
    {
      id: 'envelope',
      title: 'MAIL FROM and RCPT TO',
      phase: 'SMTP',
      node: 1,
      detail:
        'The envelope is declared. Each command is answered individually, so a rejected recipient is reported precisely instead of failing the whole message silently.',
      payloadTitle: 'Envelope',
      rows: [
        ['MAIL FROM', 'alice@example.com → 250 OK'],
        ['RCPT TO', 'bob@recipient.net → 250 OK'],
        ['Relaying', 'allowed: authenticated sender'],
        ['Rejected recipient', 'would return 550'],
      ],
      raw: 'C: MAIL FROM:<alice@example.com>\nS: 250 2.1.0 Ok\nC: RCPT TO:<bob@recipient.net>\nS: 250 2.1.5 Ok',
      packetLabel: 'Envelope',
    },
    {
      id: 'data',
      title: 'DATA and message transfer',
      phase: 'SMTP',
      node: 1,
      detail:
        'The server accepts the message body until a line containing only a period. It replies with a queue ID, which is the identifier to quote in a delivery investigation.',
      payloadTitle: 'Transfer',
      rows: [
        ['Command', 'DATA → 354 End data with <CR><LF>.<CR><LF>'],
        ['Headers', 'added: Received, Return-Path'],
        ['Terminator', 'CRLF . CRLF'],
        ['Response', '250 2.0.0 Ok: queued as 4F2A91C3'],
        ['Queue ID', '4F2A91C3'],
      ],
      raw: 'C: DATA\nS: 354 End data with <CR><LF>.<CR><LF>\nC: <message headers and body>\nC: .\nS: 250 2.0.0 Ok: queued as 4F2A91C3',
      packetLabel: 'DATA',
    },
    {
      id: 'queue',
      title: 'Queue, retry and bounce semantics',
      phase: 'QUEUE',
      node: 1,
      status: 'warn',
      detail:
        'A 4xx reply is temporary: the message stays queued and is retried with backoff. A 5xx reply is permanent: the sender receives a bounce. This distinction explains most "mail is delayed" reports.',
      payloadTitle: 'Delivery state',
      rows: [
        ['250 / 2xx', 'accepted'],
        ['4xx', 'temporary — retry with backoff (typically 4 h, then 5 min)'],
        ['5xx', 'permanent — bounce to envelope sender'],
        ['Queue lifetime', 'often 5 days before final bounce'],
        ['Retry target', 'next MX preference on connection failure'],
      ],
    },
    {
      id: 'relay',
      title: 'Relay to the recipient domain',
      phase: 'SMTP',
      node: 2,
      detail:
        'The submission server relays to the recipient MX over port 25, repeating EHLO, MAIL FROM, RCPT TO and DATA. A Received header is prepended at every hop, which is why headers read bottom-up.',
      payloadTitle: 'Hop 2 · SMTP',
      rows: [
        ['Destination', 'mx.recipient.net:25'],
        ['TLS', 'opportunistic STARTTLS (MTA-STS may require it)'],
        ['Received', 'from smtp.example.com by mx.recipient.net'],
        ['Policy checks', 'SPF, DKIM, DMARC'],
        ['Response', '250 2.0.0 accepted'],
      ],
      raw: 'Received: from smtp.example.com (203.0.113.20)\n  by mx.recipient.net with ESMTPS id 7Q2L\n  for <bob@recipient.net>; Tue, 04 Mar 2025 09:12:47 +0000',
      packetLabel: 'Relay',
    },
    {
      id: 'deliver',
      title: 'MDA stores the message in the mailbox',
      phase: 'STORE',
      node: 3,
      status: 'ok',
      detail:
        'The mail delivery agent applies filters (Sieve rules) and writes the message into the recipient\'s mailbox, where it becomes visible to IMAP or POP3 clients.',
      payloadTitle: 'Mailbox',
      rows: [
        ['Folder', 'INBOX'],
        ['Flags', '\\Recent'],
        ['Filter', 'no match — default INBOX'],
        ['Spam score', '0.4 (below threshold)'],
        ['Storage', 'Maildir: cur/, new/, tmp/'],
      ],
    },
    {
      id: 'notify',
      title: 'Recipient client retrieves the message',
      phase: 'RETRIEVE',
      node: 4,
      detail:
        'Delivery is complete; retrieval is a different protocol. An IMAP client with IDLE is notified immediately, while a POP3 client only sees the message on its next poll.',
      payloadTitle: 'Retrieval',
      rows: [
        ['IMAP', 'IDLE notification → fetch headers'],
        ['POP3', 'poll on interval; message downloaded'],
        ['Sender success', 'message accepted by recipient MX'],
        ['Bounces after this point', 'generated by the recipient server'],
      ],
    },
  ];
}

function imapSteps(): SimStep[] {
  return [
    {
      id: 'connect',
      title: 'Client opens IMAP over TLS',
      phase: 'CONNECT',
      node: 4,
      status: 'info',
      detail:
        'IMAP uses TCP 993 with implicit TLS. The server presents a certificate for the mail hostname, and the client verifies it against its trust store before sending credentials.',
      payloadTitle: 'Connection',
      rows: [
        ['Transport', 'TCP 993 (IMAPS)'],
        ['Plaintext port', '143, upgraded with STARTTLS'],
        ['Greeting', '* OK [CAPABILITY IMAP4rev1 IDLE] ready'],
        ['TLS', 'TLS 1.3'],
      ],
      raw: '* OK [CAPABILITY IMAP4rev1 STARTTLS IDLE MOVE] mail.recipient.net ready',
      packetLabel: 'Greeting',
    },
    {
      id: 'auth',
      title: 'Authenticate the session',
      phase: 'AUTH',
      node: 4,
      detail:
        'Credentials are exchanged inside the TLS tunnel. Modern deployments require OAuth 2.0 or an app password instead of the account password, often with MFA.',
      payloadTitle: 'IMAP AUTH',
      rows: [
        ['Command', 'a1 LOGIN bob@recipient.net ••••••'],
        ['Response', 'a1 OK authenticated'],
        ['Failure', 'a1 NO [AUTHENTICATIONFAILED]'],
        ['Best practice', 'OAuth 2.0 / app password with MFA'],
      ],
      raw: 'C: a1 LOGIN bob@recipient.net <credentials>\nS: a1 OK [CAPABILITY IMAP4rev1] authenticated',
      packetLabel: 'LOGIN',
    },
    {
      id: 'select',
      title: 'Select the mailbox',
      phase: 'SELECT',
      node: 3,
      detail:
        'SELECT INBOX returns the mailbox state: message count, unseen count and UID validity. The UID is stable for the life of the mailbox, unlike sequence numbers.',
      payloadTitle: 'SELECT INBOX',
      rows: [
        ['EXISTS', '42 messages'],
        ['RECENT', '1'],
        ['UNSEEN', '3'],
        ['UIDVALIDITY', '1712000000'],
        ['UIDNEXT', '1184'],
      ],
      raw: 'C: a2 SELECT INBOX\nS: * 42 EXISTS\nS: * 1 RECENT\nS: * OK [UNSEEN 3] first unseen\nS: * OK [UIDVALIDITY 1712000000] UIDs valid\nS: a2 OK [READ-WRITE] SELECT completed',
      packetLabel: 'SELECT',
    },
    {
      id: 'fetch',
      title: 'Fetch headers, then bodies on demand',
      phase: 'FETCH',
      node: 3,
      detail:
        'IMAP is selective. The client downloads envelope headers and flags for the mailbox listing, and fetches a full body or attachment only when the user opens a message.',
      payloadTitle: 'FETCH',
      rows: [
        ['Command', 'a3 FETCH 42 (FLAGS BODY.PEEK[HEADER])'],
        ['Returned', 'Subject, From, Date, size'],
        ['Body', 'not downloaded yet'],
        ['Attachment', 'fetched on open (BODYSTRUCTURE)'],
      ],
      raw: 'C: a3 FETCH 42 (FLAGS BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])\nS: * 42 FETCH (FLAGS (\\Seen) BODY[HEADER.FIELDS] {86}\nS: From: Alice <alice@example.com>\nS: Subject: Q3 interface audit\nS: )\nS: a3 OK FETCH completed',
      packetLabel: 'FETCH',
    },
    {
      id: 'flags',
      title: 'Flags are stored on the server',
      phase: 'FLAGS',
      node: 3,
      status: 'ok',
      detail:
        'Read, replied and deleted states live on the server, so every device sees the same mailbox. This is the core difference from POP3, where state is local to one machine.',
      payloadTitle: 'Flags',
      rows: [
        ['\\Seen', 'message has been read'],
        ['\\Answered', 'replied to'],
        ['\\Flagged', 'starred'],
        ['\\Deleted', 'pending EXPUNGE'],
        ['Sync', 'shared across all IMAP clients'],
      ],
    },
    {
      id: 'idle',
      title: 'IDLE keeps the client in sync',
      phase: 'IDLE',
      node: 4,
      status: 'ok',
      detail:
        'IDLE lets the server push changes instead of the client polling. The connection stays open, which is why mobile clients can show new mail within seconds.',
      payloadTitle: 'IDLE',
      rows: [
        ['Command', 'a4 IDLE'],
        ['Response', '+ idling'],
        ['Push', '* 43 EXISTS (new message)'],
        ['End', 'DONE'],
        ['Fallback', 'poll every 60 s without IDLE'],
      ],
    },
  ];
}

function pop3Steps(): SimStep[] {
  return [
    {
      id: 'connect',
      title: 'Client connects to the POP3 server',
      phase: 'CONNECT',
      node: 4,
      status: 'info',
      detail:
        'POP3 is a simple download protocol. It opens TCP 110, or 995 with implicit TLS. The server answers with a single +OK greeting.',
      payloadTitle: 'Connection',
      rows: [
        ['Transport', 'TCP 995 (POP3S) or 110 + STLS'],
        ['Greeting', '+OK POP3 server ready'],
        ['Session model', 'one mailbox, one client at a time'],
        ['State', 'AUTHORIZATION'],
      ],
      raw: '+OK POP3 mail.recipient.net v1.1 ready',
      packetLabel: 'Greeting',
    },
    {
      id: 'auth',
      title: 'Authorise the session',
      phase: 'AUTH',
      node: 4,
      detail:
        'The client sends USER and PASS. On port 110 these travel in plaintext unless STLS is negotiated first, which is why 995 or STLS is mandatory in practice.',
      payloadTitle: 'AUTHORIZATION',
      rows: [
        ['USER', 'bob@recipient.net → +OK'],
        ['PASS', '•••••• → +OK mailbox locked'],
        ['Failure', '-ERR authentication failed'],
        ['State', 'TRANSACTION'],
      ],
      raw: 'C: USER bob@recipient.net\nS: +OK\nC: PASS <credentials>\nS: +OK mailbox locked and ready',
      packetLabel: 'AUTH',
    },
    {
      id: 'stat',
      title: 'STAT and LIST reveal the mailbox',
      phase: 'TRANSACTION',
      node: 3,
      detail:
        'POP3 exposes only a flat list of messages with sizes. There are no folders, no server-side search and no per-message flags beyond a local deleted mark.',
      payloadTitle: 'STAT / LIST',
      rows: [
        ['STAT', '+OK 42 5839201 (count, bytes)'],
        ['LIST', '42 lines: number and size'],
        ['Folders', 'not supported'],
        ['Server search', 'not supported'],
      ],
      raw: 'C: STAT\nS: +OK 42 5839201\nC: LIST\nS: +OK 42 messages\nS: 1 12844\nS: 2 9021\n...',
      packetLabel: 'STAT',
    },
    {
      id: 'retr',
      title: 'RETR downloads and DELE marks',
      phase: 'TRANSACTION',
      node: 3,
      detail:
        'The message is transferred in full. DELE only marks it; the mailbox is changed when the session ends with QUIT. Many clients keep a copy on the server for a set number of days.',
      payloadTitle: 'RETR / DELE',
      rows: [
        ['RETR 42', '+OK 12844 octets'],
        ['Transfer', 'full message including attachments'],
        ['DELE 42', '+OK marked for deletion'],
        ['Persistence', 'deletion applied at QUIT'],
        ['Keep on server', 'client option — default varies'],
      ],
      raw: 'C: RETR 42\nS: +OK 12844 octets\nS: <full RFC 5322 message>\nS: .\nC: DELE 42\nS: +OK message 42 deleted',
      packetLabel: 'RETR',
    },
    {
      id: 'quit',
      title: 'QUIT ends the session',
      phase: 'UPDATE',
      node: 4,
      status: 'ok',
      detail:
        'QUIT moves the session to the UPDATE state and commits deletions. Because state is local, the same message read on a second device will look unread unless the client leaves copies on the server.',
      payloadTitle: 'UPDATE',
      rows: [
        ['Command', 'QUIT'],
        ['Response', '+OK bye'],
        ['Effect', 'marked messages removed'],
        ['Multi-device', 'no synchronisation'],
        ['Best for', 'single-device download, offline reading'],
      ],
    },
  ];
}

const PORTS = [
  ['SMTP', '25', 'TCP', 'Server-to-server relay; often blocked by ISPs'],
  ['SMTP submission', '587', 'TCP', 'Authenticated client submission with STARTTLS'],
  ['SMTPS', '465', 'TCP', 'Implicit TLS submission (legacy name, still used)'],
  ['IMAP', '143', 'TCP', 'Mailbox access, STARTTLS upgrade'],
  ['IMAPS', '993', 'TCP', 'Mailbox access with implicit TLS'],
  ['POP3', '110', 'TCP', 'Download mailbox, STLS upgrade'],
  ['POP3S', '995', 'TCP', 'Download mailbox with implicit TLS'],
];

export default function EmailLab() {
  const [mode, setMode] = useState<Mode>('smtp');
  const steps = useMemo(() => (mode === 'smtp' ? smtpSteps() : mode === 'imap' ? imapSteps() : pop3Steps()), [mode]);

  return (
    <>
      <PageHead
        eyebrow="06 · Laboratory"
        title="Email Protocol Laboratory"
        lede="Delivery and retrieval are separate protocols with separate ports. Follow an SMTP message from composition to the recipient mailbox, then compare how IMAP and POP3 expose that same mailbox."
        actions={
          <>
            <Badge tone="blue">{steps.length} STEPS</Badge>
            <Badge tone="teal">SMTP · IMAP · POP3</Badge>
          </>
        }
      />

      <SimulationShell
        simId="email"
        title="Message path"
        sub={MODE_LABEL[mode]}
        nodes={NODES}
        steps={steps}
        resetKey={mode}
        controls={
          <Tabs
            items={[
              { id: 'smtp', label: 'SMTP delivery' },
              { id: 'imap', label: 'IMAP retrieval' },
              { id: 'pop3', label: 'POP3 retrieval' },
            ]}
            active={mode}
            onChange={setMode}
            pill
            label="Email protocol scenario"
          />
        }
        caption="SMTP pushes mail between servers. IMAP and POP3 only let a client read what SMTP already delivered — they never send anything."
      />

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Ports and roles" sub="which protocol does what">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th>Port</th>
                  <th>Transport</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {PORTS.map(([name, port, transport, role]) => (
                  <tr key={name + port}>
                    <td className="mono">{name}</td>
                    <td className="mono">{port}</td>
                    <td>{transport}</td>
                    <td style={{ fontSize: 11.5 }}>{role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout tone="info">
            <span>
              Port 25 is for server-to-server relay. Clients submit on 587 (with authentication) or 465 (implicit TLS). A client that cannot send
              mail is usually blocked on 25 by its ISP or is trying to relay without authenticating.
            </span>
          </Callout>
        </Panel>

        <Panel title="IMAP vs POP3" sub="state on the server or on the device">
          <div className="stack">
            <div className="kv">
              <div className="kv__row">
                <div className="kv__key">Storage</div>
                <div className="kv__val">IMAP keeps mail on the server; POP3 downloads it to the device</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Devices</div>
                <div className="kv__val">IMAP syncs folders and flags across devices; POP3 does not</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Search</div>
                <div className="kv__val">IMAP supports server-side search; POP3 has none</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Partial fetch</div>
                <div className="kv__val">IMAP fetches headers or one MIME part; POP3 fetches whole messages</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Typical use</div>
                <div className="kv__val">IMAP for modern multi-device mail, POP3 for single-device offline access</div>
              </div>
            </div>
            <Callout tone="teal">
              <span>
                "Mail disappeared from my phone" is usually POP3 configured with "remove from server", or an IMAP client that moved messages to
                an archive folder. Check the account type before touching the mailbox.
              </span>
            </Callout>
          </div>
        </Panel>
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="SMTP reply codes" sub="temporary versus permanent">
          <div className="scroll-x">
            <table className="table table--mono">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Meaning</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>220</td>
                  <td>Service ready</td>
                  <td>Send EHLO</td>
                </tr>
                <tr>
                  <td>250</td>
                  <td>Requested action completed</td>
                  <td>Continue</td>
                </tr>
                <tr>
                  <td>354</td>
                  <td>Start mail input</td>
                  <td>Send DATA, end with .</td>
                </tr>
                <tr>
                  <td>421</td>
                  <td>Service not available</td>
                  <td>Retry later</td>
                </tr>
                <tr>
                  <td>450 / 451</td>
                  <td>Mailbox busy / local error</td>
                  <td>Retry with backoff</td>
                </tr>
                <tr>
                  <td>550</td>
                  <td>Mailbox unavailable or rejected</td>
                  <td>Permanent — bounce</td>
                </tr>
                <tr>
                  <td>554</td>
                  <td>Transaction failed / policy</td>
                  <td>Permanent — check reputation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Why mail is rejected" sub="authentication, not delivery">
          <div className="stack">
            <CodeBlock
              title="Authentication results header"
              code={'Authentication-Results: mx.recipient.net;\n  spf=pass smtp.mailfrom=example.com;\n  dkim=pass header.d=example.com;\n  dmarc=pass (p=reject) header.from=example.com'}
            />
            <ul className="checklist">
              <li>
                <strong>SPF</strong> authorises the sending IP for the envelope domain. A mismatch is reported as <span className="mono">spf=softfail</span>.
              </li>
              <li>
                <strong>DKIM</strong> signs selected headers so the message cannot be altered in transit without invalidating the signature.
              </li>
              <li>
                <strong>DMARC</strong> tells the receiver what to do when SPF and DKIM both fail: none, quarantine or reject.
              </li>
              <li>
                A 550 with <span className="mono">SPF/DKIM</span> in the text is a policy rejection — retrying will not help.
              </li>
            </ul>
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 24 }}>
        <Disclosure title="Going deeper: submission ports and mail authentication" meta="Advanced reference">
          <div className="stack" style={{ gap: 14 }}>
            <ul style={{ margin: 0 }}>
              <li>
                Port 25 is for server-to-server relay. Port 587 is the client submission port and upgrades to encryption with
                STARTTLS. Port 465 runs SMTP inside TLS from the first byte.
              </li>
              <li>
                IMAP uses 143, or 993 with TLS, and keeps mail on the server so several devices stay in sync. POP3 uses 110, or 995
                with TLS, and typically downloads messages then removes them from the server.
              </li>
              <li>
                SMTP pushes mail from sender to destination server. IMAP and POP3 pull mail from the mailbox, which is why sending and
                reading use different protocols.
              </li>
              <li>
                The SMTP envelope sender used during the transaction can differ from the From header the reader sees. Receiving servers
                check the envelope for bounce routing.
              </li>
              <li>
                SPF authorises sending IP addresses, DKIM signs the message cryptographically, and DMARC tells receivers what to do when
                either check fails.
              </li>
            </ul>
          </div>
        </Disclosure>
      </div>

      <PageNav />
    </>
  );
}
