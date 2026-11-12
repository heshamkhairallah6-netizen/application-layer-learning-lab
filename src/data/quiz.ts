import type { QuizLevel } from '../lib/progress';

export type QuizQuestion = {
  id: string;
  level: QuizLevel;
  topic: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  /* ---------------- beginner ---------------- */
  {
    id: 'b1',
    level: 'beginner',
    topic: 'OSI model',
    prompt: 'Which OSI layer is the Application Layer?',
    options: ['Layer 4', 'Layer 5', 'Layer 6', 'Layer 7'],
    answer: 3,
    explanation:
      'The Application Layer is Layer 7, the topmost layer. It provides the interface between network-aware software (browsers, mail clients, API clients) and the transport services underneath.',
  },
  {
    id: 'b2',
    level: 'beginner',
    topic: 'HTTPS',
    prompt: 'Which TCP port does HTTPS use by default?',
    options: ['21', '80', '443', '8080'],
    answer: 2,
    explanation: 'HTTPS is HTTP carried inside TLS and listens on TCP 443. Port 80 is cleartext HTTP; 21 is FTP control.',
  },
  {
    id: 'b3',
    level: 'beginner',
    topic: 'DNS',
    prompt: 'What is the primary job of DNS?',
    options: [
      'Assign IP addresses automatically to new hosts',
      'Translate domain names into IP addresses and service records',
      'Encrypt web traffic between client and server',
      'Synchronise mail folders between devices',
    ],
    answer: 1,
    explanation:
      'DNS is a distributed naming system. It resolves names to addresses (A/AAAA) and publishes service data such as MX, TXT and SRV records. Automatic addressing is DHCP; encryption is TLS.',
  },
  {
    id: 'b4',
    level: 'beginner',
    topic: 'DHCP',
    prompt: 'Which transport protocol does DHCP use?',
    options: ['TCP', 'UDP', 'SCTP', 'ICMP'],
    answer: 1,
    explanation:
      'DHCP uses UDP: the client broadcasts from port 68 and the server listens on port 67. UDP works here because the client has no IP address yet and broadcast delivery is required.',
  },
  {
    id: 'b5',
    level: 'beginner',
    topic: 'HTTP methods',
    prompt: 'Which HTTP method is defined to retrieve a resource without changing server state?',
    options: ['POST', 'PUT', 'GET', 'PATCH'],
    answer: 2,
    explanation:
      'GET is a safe, read-only method: it retrieves a representation. POST creates or triggers processing, PUT replaces a resource, and PATCH applies a partial modification.',
  },
  {
    id: 'b6',
    level: 'beginner',
    topic: 'Email',
    prompt: 'Which port is used for SMTP relay between mail servers?',
    options: ['25', '110', '143', '993'],
    answer: 0,
    explanation:
      'Server-to-server SMTP relay uses TCP 25. Port 587 is authenticated client submission, 110 is POP3 and 143 is IMAP.',
  },
  {
    id: 'b7',
    level: 'beginner',
    topic: 'Status codes',
    prompt: 'What does an HTTP 404 response mean?',
    options: [
      'The server had an internal failure',
      'The client is not authenticated',
      'The requested resource was not found',
      'The request succeeded but there is no body',
    ],
    answer: 2,
    explanation:
      '404 Not Found means the server was reached but no resource matches the request target. A 500 means the handler failed; 401 means authentication is missing or invalid; 204 is success with no content.',
  },
  {
    id: 'b8',
    level: 'beginner',
    topic: 'Email',
    prompt: 'Which mail protocol keeps folders and read state synchronised across multiple devices?',
    options: ['SMTP', 'POP3', 'IMAP', 'SNMP'],
    answer: 2,
    explanation:
      'IMAP stores the mailbox on the server and synchronises folders, flags and read state. POP3 is a download-oriented model; SMTP only moves messages between servers.',
  },

  /* ---------------- intermediate ---------------- */
  {
    id: 'i1',
    level: 'intermediate',
    topic: 'DNS transport',
    prompt: 'When does a DNS query normally switch from UDP to TCP?',
    options: [
      'Never — DNS is UDP only',
      'When the UDP response is truncated (TC flag) or for zone transfers',
      'Only for IPv6 lookups',
      'Whenever the TTL is above 3600 seconds',
    ],
    answer: 1,
    explanation:
      'Standard queries use UDP 53. If the response does not fit (TC=1, common with DNSSEC or many records) the client retries over TCP 53. Zone transfers (AXFR) also use TCP.',
  },
  {
    id: 'i2',
    level: 'intermediate',
    topic: 'DHCP',
    prompt: 'What is the correct order of the DHCP DORA exchange?',
    options: [
      'Offer → Discover → Acknowledge → Request',
      'Discover → Offer → Request → Acknowledge',
      'Request → Offer → Discover → Acknowledge',
      'Discover → Request → Offer → Acknowledge',
    ],
    answer: 1,
    explanation:
      'The client broadcasts DHCPDISCOVER, the server responds with DHCPOFFER, the client sends DHCPREQUEST selecting that offer, and the server confirms with DHCPACK.',
  },
  {
    id: 'i3',
    level: 'intermediate',
    topic: 'Status codes',
    prompt: 'A REST API successfully creates a new resource. Which status code is most appropriate?',
    options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
    answer: 1,
    explanation:
      '201 Created confirms a new resource was created and is usually paired with a Location header. 204 is used when the operation succeeded and no body is returned, typically for DELETE.',
  },
  {
    id: 'i4',
    level: 'intermediate',
    topic: 'DNS records',
    prompt: 'Which DNS record type maps a hostname to an IPv4 address?',
    options: ['AAAA', 'CNAME', 'A', 'MX'],
    answer: 2,
    explanation: 'An A record maps a name to an IPv4 address; AAAA maps to IPv6. CNAME creates an alias, and MX points to mail exchangers.',
  },
  {
    id: 'i5',
    level: 'intermediate',
    topic: 'SFTP',
    prompt: 'SFTP differs from FTP mainly because SFTP…',
    options: [
      'uses UDP for faster transfers',
      'runs inside an SSH session on TCP 22 and encrypts everything',
      'does not support directory listings',
      'uses port 21 with TLS',
    ],
    answer: 1,
    explanation:
      'SFTP is a subsystem of SSH on TCP 22: authentication, commands and data are all encrypted. FTP uses TCP 21 for control plus a separate data channel and is cleartext unless wrapped in FTPS.',
  },
  {
    id: 'i6',
    level: 'intermediate',
    topic: 'Email',
    prompt: 'A user wants the same mailbox on a laptop and a phone. Which protocol fits best?',
    options: ['POP3 with delete-after-download', 'IMAP with server-side storage', 'SMTP submission only', 'SNMP polling'],
    answer: 1,
    explanation:
      'IMAP keeps the mailbox on the server and synchronises folders and flags, so both devices see the same state. POP3 download-and-delete is a single-device model.',
  },
  {
    id: 'i7',
    level: 'intermediate',
    topic: 'HTTP headers',
    prompt: 'Which response header tells the client how to interpret the body?',
    options: ['Host', 'Content-Type', 'User-Agent', 'Referer'],
    answer: 1,
    explanation:
      'Content-Type declares the media type of the body (for example application/json or text/html). Host and User-Agent are request headers.',
  },
  {
    id: 'i8',
    level: 'intermediate',
    topic: 'DHCP fields',
    prompt: 'In a DHCPOFFER, which field carries the IP address being offered to the client?',
    options: ['ciaddr', 'yiaddr', 'giaddr', 'siaddr'],
    answer: 1,
    explanation:
      'yiaddr ("your IP address") holds the address offered to the client. ciaddr is the client’s current address, giaddr the relay agent address, and siaddr the next server (for example a PXE host).',
  },

  /* ---------------- advanced ---------------- */
  {
    id: 'a1',
    level: 'advanced',
    topic: 'DNS',
    prompt: 'A dig query returns a response with the TC flag set. What should the resolver do next?',
    options: [
      'Retry the query over TCP because the UDP answer was truncated',
      'Ignore the answer and query a root server directly',
      'Flush the local cache and wait for the TTL to expire',
      'Switch to DNS over HTTPS automatically',
    ],
    answer: 0,
    explanation:
      'TC=1 means the response exceeded the UDP payload limit. The resolver must retry over TCP 53 to receive the complete answer set — a firewall blocking TCP 53 causes intermittent resolution failures.',
  },
  {
    id: 'a2',
    level: 'advanced',
    topic: 'Status codes',
    prompt: 'What is the difference between HTTP 502 and 504?',
    options: [
      '502 means the client timed out; 504 means authentication failed',
      '502 means a gateway received an invalid response from upstream; 504 means the upstream did not respond in time',
      'They are identical and only differ by HTTP version',
      '502 is a redirect; 504 is a permanent failure',
    ],
    answer: 1,
    explanation:
      'Both are gateway errors. 502 Bad Gateway = the proxy/load balancer got an invalid or refused response from the upstream. 504 Gateway Timeout = the upstream accepted the request but did not answer before the deadline.',
  },
  {
    id: 'a3',
    level: 'advanced',
    topic: 'Email',
    prompt: 'A message is rejected with "550 5.7.1 SPF policy violation". What is the most likely cause?',
    options: [
      'The recipient mailbox is full',
      'The sending IP is not authorised by the domain’s SPF record',
      'The message body contains a virus',
      'The IMAP session expired',
    ],
    answer: 1,
    explanation:
      '5.7.1 is a policy rejection. SPF lists the IPs allowed to send for a domain; a relay that is missing from that list fails the check. Fix the SPF record (or send through an authorised relay), then verify DKIM/DMARC alignment.',
  },
  {
    id: 'a4',
    level: 'advanced',
    topic: 'DHCP options',
    prompt: 'Which DHCP option supplies the default gateway?',
    options: ['Option 1', 'Option 3', 'Option 6', 'Option 51'],
    answer: 1,
    explanation:
      'Option 3 is the router (default gateway). Option 1 is the subnet mask, option 6 is DNS servers, and option 51 is the lease time in seconds.',
  },
  {
    id: 'a5',
    level: 'advanced',
    topic: 'HTTP/1.1',
    prompt: 'Why is the Host header mandatory in HTTP/1.1?',
    options: [
      'It carries the client’s IP address for logging',
      'Many virtual hosts can share one IP and port, so the server needs the requested hostname',
      'It is used to encrypt the request body',
      'It tells the server which HTTP method to use',
    ],
    answer: 1,
    explanation:
      'Name-based virtual hosting allows one IP:port to serve many sites. Host selects the correct site (and drives TLS SNI selection at the handshake level). A missing Host must be rejected with 400.',
  },
  {
    id: 'a6',
    level: 'advanced',
    topic: 'TLS',
    prompt: 'What is the purpose of TLS SNI?',
    options: [
      'It compresses the HTTP body before encryption',
      'It lets the client send the requested hostname during the handshake so the server can choose the right certificate',
      'It authenticates the client with a password',
      'It pins the server’s public key',
    ],
    answer: 1,
    explanation:
      'SNI (Server Name Indication) is sent in the ClientHello so a server hosting many sites can select the matching certificate before the HTTP request exists. It is not client authentication or pinning.',
  },
  {
    id: 'a7',
    level: 'advanced',
    topic: 'REST',
    prompt: 'Which statement about idempotency is correct?',
    options: [
      'POST and PUT are both idempotent',
      'PUT and DELETE are idempotent; repeating them yields the same server state',
      'GET is unsafe because it changes state',
      'Only DELETE is idempotent',
    ],
    answer: 1,
    explanation:
      'Idempotent methods can be repeated without changing the resulting state beyond the first application. PUT and DELETE are idempotent; POST is not, which is why retries of POST need an idempotency key.',
  },
  {
    id: 'a8',
    level: 'advanced',
    topic: 'SSH',
    prompt: 'SSH reports "WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED". What is the correct response?',
    options: [
      'Delete known_hosts immediately and reconnect',
      'Disable host key checking in the client config',
      'Verify the new fingerprint out of band before trusting it; the key may have changed legitimately or traffic may be intercepted',
      'Restart the SSH agent and retry',
    ],
    answer: 2,
    explanation:
      'A changed host key can mean a rebuilt server — or a man-in-the-middle. Verify the fingerprint through a trusted channel (console, provider console, inventory) before removing the old entry. Never disable host key checking to silence it.',
  },
];

export const QUIZ_LEVELS: { id: QuizLevel; name: string; blurb: string }[] = [
  { id: 'beginner', name: 'Beginner', blurb: 'Layer 7 basics, ports, core protocols' },
  { id: 'intermediate', name: 'Intermediate', blurb: 'Transport choices, records, status semantics' },
  { id: 'advanced', name: 'Advanced', blurb: 'Edge cases, policy failures, protocol internals' },
];

export function questionsFor(level: QuizLevel): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((q) => q.level === level);
}
