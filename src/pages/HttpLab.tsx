import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Badge, Callout, CodeBlock, PageHead, Panel, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Scheme = 'https' | 'http';

type MethodSpec = {
  path: string;
  purpose: string;
  safe: string;
  idempotent: string;
  status: number;
  statusText: string;
  meaning: string;
  body?: string;
  responseType: string;
  responseBody?: string;
  cache: string;
  handler: string;
  handlerDetail: string;
  outcome: string;
};

const METHODS: Record<Method, MethodSpec> = {
  GET: {
    path: '/catalog/headphones',
    purpose: 'Retrieve a representation of a resource without changing server state.',
    safe: 'Yes',
    idempotent: 'Yes',
    status: 200,
    statusText: 'OK',
    meaning: 'The request succeeded and the body contains the current representation.',
    responseType: 'application/json; charset=utf-8',
    responseBody:
      '{\n  "sku": "HP-2200",\n  "name": "Studio Headphones",\n  "price": { "amount": 24900, "currency": "EUR" },\n  "stock": 18,\n  "etag": "\\"8f31a\\""\n}',
    cache: 'public, max-age=60, stale-while-revalidate=30',
    handler: 'catalogController.show',
    handlerDetail: 'Reads from the Redis catalogue cache, falls back to PostgreSQL, then serialises the resource with its ETag.',
    outcome: 'Representation returned with a validator, so the next request can be conditional.',
  },
  POST: {
    path: '/orders',
    purpose: 'Create a subordinate resource; the server assigns the identifier.',
    safe: 'No',
    idempotent: 'No',
    status: 201,
    statusText: 'Created',
    meaning: 'A new resource was created; the Location header identifies it.',
    body: '{\n  "items": [{ "sku": "HP-2200", "quantity": 1 }],\n  "paymentMethod": "card_9f21"\n}',
    responseType: 'application/json; charset=utf-8',
    responseBody:
      '{\n  "id": "ord_8842",\n  "status": "awaiting_payment",\n  "total": { "amount": 24900, "currency": "EUR" },\n  "createdAt": "2025-03-04T09:12:44Z"\n}',
    cache: 'no-store',
    handler: 'orderController.create',
    handlerDetail: 'Validates the payload, reserves stock in a transaction, writes the order row and publishes an order.created event.',
    outcome: 'New order persisted; the client receives the identifier and a Location header.',
  },
  PUT: {
    path: '/orders/8842',
    purpose: 'Replace the target resource with the supplied representation.',
    safe: 'No',
    idempotent: 'Yes',
    status: 200,
    statusText: 'OK',
    meaning: 'The representation was replaced; repeating the same request leaves the same state.',
    body: '{\n  "status": "confirmed",\n  "shipping": { "method": "express", "country": "PT" }\n}',
    responseType: 'application/json; charset=utf-8',
    responseBody:
      '{\n  "id": "ord_8842",\n  "status": "confirmed",\n  "shipping": { "method": "express", "country": "PT" },\n  "updatedAt": "2025-03-04T09:14:02Z"\n}',
    cache: 'no-store',
    handler: 'orderController.replace',
    handlerDetail: 'Locks the order row, validates the new representation, applies it wholesale and bumps the version column.',
    outcome: 'Resource replaced; repeating PUT with the same body produces no further change.',
  },
  DELETE: {
    path: '/orders/8842',
    purpose: 'Remove the target resource.',
    safe: 'No',
    idempotent: 'Yes',
    status: 204,
    statusText: 'No Content',
    meaning: 'The resource was removed and there is deliberately no response body.',
    responseType: '(none)',
    cache: 'no-store',
    handler: 'orderController.destroy',
    handlerDetail: 'Checks authorisation on the order, releases the stock reservation, soft-deletes the row and emits order.deleted.',
    outcome: 'Resource removed. A repeated DELETE returns 404, which is still an idempotent end state.',
  },
};

const METHOD_IDS: Method[] = ['GET', 'POST', 'PUT', 'DELETE'];

function requestRaw(method: Method, scheme: Scheme): string {
  const spec = METHODS[method];
  const lines = [
    `${method} ${spec.path} HTTP/2`,
    'Host: shop.example.com',
    `:scheme: ${scheme}`,
    'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36',
    'accept: application/json, text/html;q=0.9',
    'accept-encoding: gzip, br',
    'accept-language: en-GB,en;q=0.8',
    'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6…redacted',
    'cookie: session=8f21c0d4; cart=19',
  ];
  if (spec.body) {
    lines.push('content-type: application/json', `content-length: ${spec.body.length}`, '', spec.body);
  }
  return lines.join('\n');
}

function responseRaw(method: Method, scheme: Scheme): string {
  const spec = METHODS[method];
  const lines = [
    `HTTP/2 ${spec.status} ${spec.statusText}`,
    'server: nginx',
    `content-type: ${spec.responseType}`,
    `cache-control: ${spec.cache}`,
    'x-request-id: 7f3c1a9e42',
    'x-cache: MISS',
  ];
  if (scheme === 'https') lines.push('strict-transport-security: max-age=31536000; includeSubDomains');
  if (method === 'POST') lines.push('location: /orders/ord_8842');
  if (spec.responseBody) lines.push(`content-length: ${spec.responseBody.length}`, '', spec.responseBody);
  return lines.join('\n');
}

function nodesFor(scheme: Scheme): FlowNode[] {
  const port = scheme === 'https' ? '443' : '80';
  return [
    {
      id: 'browser',
      label: 'Browser',
      sub: 'user agent · HTTP/2',
      tag: 'CLIENT',
      address: '10.10.4.87:51422',
      kind: 'client',
      detail:
        'Owns the request, the cookie jar, the HTTP cache and the renderer. It decides the method, builds the header block and reuses an existing connection when possible.',
    },
    {
      id: 'transport',
      label: scheme === 'https' ? 'TCP + TLS 1.3' : 'TCP stack',
      sub: scheme === 'https' ? 'kernel + TLS library' : 'kernel socket',
      tag: 'L4 / L5',
      address: 'ephemeral socket',
      kind: 'client',
      detail: scheme === 'https'
        ? 'Segments the HTTP/2 frames, guarantees ordered delivery and encrypts each TLS record. TLS also authenticates the server through its certificate chain.'
        : 'Segments and retransmits the HTTP/2 frames. With no TLS layer, headers, cookies and tokens travel in cleartext and can be read or modified in transit.',
    },
    {
      id: 'edge',
      label: 'Edge web server',
      sub: `nginx · port ${port}`,
      tag: 'SERVER',
      address: `203.0.113.10:${port}`,
      kind: 'server',
      detail:
        'Terminates TCP and (for HTTPS) TLS, matches server_name and location, applies cache policy and request limits, then proxies to the upstream application.',
    },
    {
      id: 'service',
      label: 'Catalogue service',
      sub: 'Node.js · handler',
      tag: 'UPSTREAM',
      address: 'unix:/run/app.sock',
      kind: 'service',
      detail:
        'Executes the route handler: authorisation, validation, business rules and persistence. It serialises the response body and chooses the status code.',
    },
  ];
}

function buildSteps(method: Method, scheme: Scheme): SimStep[] {
  const spec = METHODS[method];
  const tls = scheme === 'https';
  const port = tls ? '443' : '80';
  const steps: SimStep[] = [];

  steps.push({
    id: 'resolve',
    title: 'Resolve the name and open a socket',
    phase: 'Pre-flight',
    node: 0,
    status: 'info',
    detail: `The browser checks its DNS cache for shop.example.com, finds a cached A record (TTL 300 s) and opens a TCP connection to 203.0.113.10:${port} from ephemeral port 51422. No new DNS query leaves the host.`,
    payloadTitle: 'Connection parameters',
    rows: [
      ['Host', 'shop.example.com'],
      ['A record', '203.0.113.10'],
      ['Destination port', port],
      ['Source port', '51422 (ephemeral)'],
      ['DNS cache', 'HIT · 271 s remaining'],
    ],
  });

  steps.push({
    id: 'handshake',
    title: 'TCP three-way handshake',
    phase: 'Transport',
    node: 1,
    detail: `Client sends SYN, server answers SYN-ACK, client completes with ACK. That is one full round trip before any HTTP byte can be sent. Sequence numbers shown are illustrative.`,
    payloadTitle: 'Handshake summary',
    rows: [
      ['Flags', 'SYN → SYN-ACK → ACK'],
      ['Round trips', '1'],
      ['Client MSS', '1460 bytes'],
      ['Window scale', '7'],
      ['Socket state', 'ESTABLISHED'],
    ],
    raw: 'SYN   seq=0        win=64240  mss=1460  ws=7\nSYN,ACK seq=0 ack=1 win=65160  mss=1460  ws=7\nACK   seq=1 ack=1   win=64240',
    packetLabel: 'SYN',
  });

  if (tls) {
    steps.push({
      id: 'client-hello',
      title: 'TLS ClientHello',
      phase: 'TLS 1.3',
      node: 1,
      detail:
        'The client offers TLS 1.3, a key share for X25519, supported cipher suites and the server name (SNI) in cleartext — the only part of the handshake an observer can read.',
      payloadTitle: 'ClientHello',
      rows: [
        ['SNI', 'shop.example.com'],
        ['Supported versions', 'TLS 1.3, TLS 1.2'],
        ['Key share', 'x25519'],
        ['Cipher suites', 'TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384'],
        ['ALPN', 'h2, http/1.1'],
      ],
      packetLabel: 'ClientHello',
    });

    steps.push({
      id: 'server-hello',
      title: 'ServerHello and certificate',
      phase: 'TLS 1.3',
      node: 2,
      status: 'ok',
      detail:
        'The server selects TLS_AES_128_GCM_SHA256, returns its key share and presents the certificate chain. The browser validates chain trust, expiry and that a SAN matches shop.example.com.',
      payloadTitle: 'ServerHello',
      rows: [
        ['Selected version', 'TLS 1.3'],
        ['Cipher suite', 'TLS_AES_128_GCM_SHA256'],
        ['Certificate SAN', 'shop.example.com'],
        ['Valid until', '2026-01-18'],
        ['Chain', 'leaf ← intermediate ← root (trusted)'],
        ['ALPN selected', 'h2'],
      ],
      raw: 'TLSv1.3 (IN), Certificate\n  Subject: CN=shop.example.com\n  SAN: DNS:shop.example.com, DNS:www.shop.example.com\n  Issuer: CN=R11\n  Not After: 2026-01-18\nVerify return code: 0 (ok)',
      packetLabel: 'Certificate',
    });

    steps.push({
      id: 'tls-established',
      title: 'Handshake complete, keys derived',
      phase: 'TLS 1.3',
      node: 1,
      status: 'ok',
      detail:
        'Both peers derive the same traffic keys. From here every HTTP/2 frame is encrypted; a proxy can see the destination address and SNI, but not the path, headers or body.',
      payloadTitle: 'Session',
      rows: [
        ['Protocol', 'TLS 1.3'],
        ['Application protocol', 'HTTP/2'],
        ['Handshake cost', '1 RTT (0-RTT on resumption)'],
        ['Certificate status', 'Valid'],
        ['Encryption', 'AEAD, per-record nonce'],
      ],
      packetLabel: 'Finished',
    });
  } else {
    steps.push({
      id: 'cleartext',
      title: 'No TLS: the exchange is cleartext',
      phase: 'Security',
      node: 1,
      status: 'warn',
      detail:
        'Because the scheme is http, no certificate is presented and no keys are derived. Cookies, bearer tokens and the response body are readable and modifiable by anything on the path.',
      payloadTitle: 'Exposure',
      rows: [
        ['Encryption', 'None'],
        ['Authentication', 'None'],
        ['Visible on path', 'Method, path, headers, body'],
        ['Typical use', 'Local development only'],
      ],
      raw: 'Warning: scheme is http — the authorisation header below would be visible to every hop.',
    });
  }

  steps.push({
    id: 'request',
    title: `${method} request sent to the edge`,
    phase: 'HTTP/2',
    node: 2,
    detail: `The browser sends ${method} ${spec.path} on stream 1. HTTP/2 compresses headers with HPACK, so repeated fields cost a few bytes. ${spec.body ? 'A JSON body follows the header block.' : 'No request body is sent.'}`,
    payloadTitle: `${method} ${spec.path}`,
    rows: [
      ['Method', method],
      ['Path', spec.path],
      ['Authority', 'shop.example.com'],
      ['Protocol', 'HTTP/2'],
      ['Body', spec.body ? `${spec.body.length} bytes JSON` : 'none'],
      ['Conditional', method === 'GET' ? 'If-None-Match: "8f31a"' : 'n/a'],
    ],
    raw: requestRaw(method, scheme),
    packetLabel: method,
  });

  steps.push({
    id: 'route',
    title: 'Edge server routes and checks cache',
    phase: 'Server',
    node: 2,
    detail:
      method === 'GET'
        ? 'nginx matches the location block, looks up the cache key and misses, applies rate limiting, then proxies the request to the application over a Unix socket.'
        : 'nginx matches the location block, rejects a body larger than the configured limit if present, bypasses the cache for unsafe methods and proxies to the application.',
    payloadTitle: 'Routing decision',
    rows: [
      ['Matched location', spec.path.startsWith('/catalog') ? 'location /catalog/' : 'location /orders/'],
      ['Upstream', 'unix:/run/app.sock'],
      ['Cache', method === 'GET' ? 'MISS → forward' : 'BYPASS (unsafe method)'],
      ['Rate limit', '120 r/m per token · 3 remaining'],
      ['Proxy headers', 'x-forwarded-for, x-request-id'],
    ],
  });

  steps.push({
    id: 'handler',
    title: 'Application handler executes',
    phase: 'Application',
    node: 3,
    status: 'info',
    detail: spec.handlerDetail,
    payloadTitle: 'Handler',
    rows: [
      ['Handler', spec.handler],
      ['Authorisation', 'Bearer token valid · scope orders:write'],
      ['Validation', spec.body ? 'JSON schema: 2 fields, 0 errors' : 'No body to validate'],
      ['Data store', method === 'GET' ? 'Redis HIT → no SQL' : 'PostgreSQL · 1 transaction'],
      ['Latency budget', '38 ms of 300 ms'],
    ],
  });

  steps.push({
    id: 'response',
    title: `Response ${spec.status} ${spec.statusText}`,
    phase: 'HTTP/2',
    node: 0,
    status: spec.status < 400 ? 'ok' : 'bad',
    detail: `${spec.meaning} The response carries cache policy, a request identifier and ${spec.responseBody ? 'a JSON representation' : 'no body at all'}.`,
    payloadTitle: `HTTP/2 ${spec.status}`,
    rows: [
      ['Status', `${spec.status} ${spec.statusText}`],
      ['Content-Type', spec.responseType],
      ['Cache-Control', spec.cache],
      ['Server-Timing', 'db;dur=6, app;dur=21, total;dur=27'],
      ['Body bytes', spec.responseBody ? String(spec.responseBody.length) : '0'],
    ],
    raw: responseRaw(method, scheme),
    packetLabel: `${spec.status}`,
  });

  steps.push({
    id: 'consume',
    title: method === 'DELETE' ? 'Client confirms deletion' : 'Browser consumes the response',
    phase: 'Presentation',
    node: 0,
    detail:
      method === 'DELETE'
        ? 'With 204 there is nothing to render. The client removes the order from its local state and treats a later 404 on the same resource as an already-satisfied outcome.'
        : method === 'GET'
          ? 'The renderer parses JSON, updates the catalogue view and stores the ETag so the next request can be conditional and may return 304 Not Modified.'
          : method === 'POST'
            ? 'The client follows the Location header to the new order and navigates to its representation. The 201 is the authoritative confirmation of creation.'
            : 'The client replaces its cached representation with the returned body and records the new version for later conditional requests.',
    payloadTitle: 'Client outcome',
    rows: [
      ['Status handled', `${spec.status} ${spec.statusText}`],
      ['Body parsed', spec.responseBody ? 'application/json' : 'none'],
      ['Cache updated', spec.cache],
      ['Next action', method === 'DELETE' ? 'Remove local resource' : 'Render and store validator'],
    ],
  });

  return steps;
}

export default function HttpLab() {
  const [method, setMethod] = useState<Method>('GET');
  const [scheme, setScheme] = useState<Scheme>('https');

  const steps = useMemo(() => buildSteps(method, scheme), [method, scheme]);
  const nodes = useMemo(() => nodesFor(scheme), [scheme]);
  const spec = METHODS[method];

  return (
    <>
      <PageHead
        eyebrow="03 · Laboratory"
        title="HTTP / HTTPS Laboratory"
        lede="Drive a real request lifecycle: name resolution, TCP, TLS 1.3, HTTP/2 framing, routing, application logic and the response the browser renders. Change the method and watch the semantics change."
        actions={
          <>
            <Badge tone={scheme === 'https' ? 'teal' : 'amber'}>{scheme.toUpperCase()}</Badge>
            <Badge tone="blue">{steps.length} STEPS</Badge>
          </>
        }
      />

      <SimulationShell
        simId="http"
        title="Client–server exchange"
        sub={`${method} shop.example.com${spec.path} · HTTP/2`}
        nodes={nodes}
        steps={steps}
        resetKey={`${method}-${scheme}`}
        controls={
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Tabs
              items={METHOD_IDS.map((id) => ({ id, label: id }))}
              active={method}
              onChange={setMethod}
              pill
              label="HTTP method"
            />
            <Tabs
              items={[
                { id: 'https', label: 'HTTPS 443' },
                { id: 'http', label: 'HTTP 80' },
              ]}
              active={scheme}
              onChange={setScheme}
              pill
              label="Scheme"
            />
          </div>
        }
        caption="The diagram is the same four components for every method. The message content, status code and TLS steps change with your selection."
      />

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Method semantics" sub={`selected: ${method}`}>
          <table className="table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Purpose</td>
                <td>{spec.purpose}</td>
              </tr>
              <tr>
                <td>Safe</td>
                <td>{spec.safe}</td>
              </tr>
              <tr>
                <td>Idempotent</td>
                <td>{spec.idempotent}</td>
              </tr>
              <tr>
                <td>Expected status</td>
                <td className="mono">
                  {spec.status} {spec.statusText}
                </td>
              </tr>
              <tr>
                <td>Cacheable</td>
                <td>{method === 'GET' ? 'Yes, by default' : 'No'}</td>
              </tr>
            </tbody>
          </table>
          <Callout tone="info">
            <span>
              <strong>Safe</strong> means no intended state change; <strong>idempotent</strong> means repeating the request leaves the same
              server state. POST is neither, which is why retries need an idempotency key.
            </span>
          </Callout>
        </Panel>

        <Panel title="Status code classes" sub="what the first digit promises">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Meaning</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">2xx</td>
                  <td>Success — the request was understood and completed</td>
                  <td className="mono">200, 201, 204, 206</td>
                </tr>
                <tr>
                  <td className="mono">3xx</td>
                  <td>Redirection — a different representation or location applies</td>
                  <td className="mono">301, 304, 307, 308</td>
                </tr>
                <tr>
                  <td className="mono">4xx</td>
                  <td>Client error — the request itself is wrong or unauthorised</td>
                  <td className="mono">400, 401, 403, 404, 409, 429</td>
                </tr>
                <tr>
                  <td className="mono">5xx</td>
                  <td>Server error — a valid request could not be fulfilled</td>
                  <td className="mono">500, 502, 503, 504</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Callout tone="warn">
            <span>
              <strong>401 vs 403.</strong> 401 means credentials are missing or invalid and the client may retry with new ones. 403 means the
              identity is known but not permitted — retrying with the same credentials will not help.
            </span>
          </Callout>
        </Panel>
      </div>

      <Panel title="Raw exchange on the wire" sub={`${method} · ${scheme.toUpperCase()}`}>
        <div className="grid grid--2" style={{ gap: 12 }}>
          <CodeBlock title="→ request" code={requestRaw(method, scheme)} />
          <CodeBlock title="← response" code={responseRaw(method, scheme)} />
        </div>
        <Callout tone="teal">
          <span>
            Header names are case-insensitive; HTTP/2 transmits them lowercased. The pseudo-headers (<span className="mono">:method</span>,{' '}
            <span className="mono">:path</span>, <span className="mono">:authority</span>, <span className="mono">:scheme</span>) replace the
            HTTP/1.1 request line.
          </span>
        </Callout>
      </Panel>

      <Panel title="Header fields worth memorising" sub="inspection reference" flush>
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Header</th>
                <th>Direction</th>
                <th>What it controls</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Host / :authority', 'Request', 'Selects the virtual host when many sites share one address.'],
                ['Authorization', 'Request', 'Carries credentials: Bearer token or Basic base64 pair. Never logged.'],
                ['Content-Type', 'Both', 'Media type of the body, including charset. Mismatches cause 415 or silent parse failures.'],
                ['Accept', 'Request', 'Content negotiation: which representations the client can handle.'],
                ['Cache-Control', 'Both', 'Freshness and revalidation rules; no-store forbids caching entirely.'],
                ['ETag / If-None-Match', 'Both', 'Validator pair enabling 304 responses instead of full bodies.'],
                ['Location', 'Response', 'Target of a redirect, or the URI of a newly created resource.'],
                ['Set-Cookie', 'Response', 'Issues session state; Secure, HttpOnly and SameSite decide its safety.'],
              ].map(([header, direction, description]) => (
                <tr key={header}>
                  <td className="mono">{header}</td>
                  <td>{direction}</td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="What HTTPS actually adds" sub="TLS 1.3 in one page">
          <ul className="checklist checklist--teal">
            <li>
              <strong>Confidentiality</strong> — headers, cookies and bodies are encrypted after the handshake.
            </li>
            <li>
              <strong>Integrity</strong> — AEAD records detect tampering; a modified request fails rather than silently applying.
            </li>
            <li>
              <strong>Authentication</strong> — the certificate proves the server controls the private key for that name.
            </li>
            <li>
              <strong>Not anonymity</strong> — destination IP, port and SNI remain visible, and encrypted SNI is not universal.
            </li>
            <li>
              <strong>Not authorisation</strong> — TLS proves who the server is, not what the caller may do.
            </li>
          </ul>
          <Callout tone="info">
            <span>
              A certificate error is a Layer 5/6 symptom surfacing in a Layer 7 client: check expiry, SAN coverage, chain completeness and
              the client's trust store before touching application code.
            </span>
          </Callout>
        </Panel>

        <Panel title="Cache behaviour by method" sub="why GET is different">
          <div className="stack">
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7 }}>
              A shared cache may store a GET response only when the response permits it. Responses to POST are stored only with an explicit
              freshness policy and a matching Content-Location; PUT and DELETE invalidate the stored representation instead of caching it.
            </p>
            <div className="kv">
              <div className="kv__row">
                <div className="kv__key">Revalidation</div>
                <div className="kv__val">If-None-Match → 304 with no body</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Freshness</div>
                <div className="kv__val">max-age, s-maxage, Expires</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Never stored</div>
                <div className="kv__val">no-store, or authenticated responses without public</div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Stale serving</div>
                <div className="kv__val">stale-while-revalidate, stale-if-error</div>
              </div>
            </div>
            <Callout tone="warn">
              <span>
                A 304 is not a failure and has no body by design. Clients that log it as "empty response" are misreading the protocol.
              </span>
            </Callout>
          </div>
        </Panel>
      </div>

      <PageNav />
    </>
  );
}
