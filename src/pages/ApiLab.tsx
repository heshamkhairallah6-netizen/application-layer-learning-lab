import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Badge, Callout, CodeBlock, Disclosure, PageHead, Panel, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type Scenario = 'get' | 'post' | 'conflict' | 'unauth';

const NODES: FlowNode[] = [
  {
    id: 'client',
    label: 'API client',
    sub: 'browser / mobile',
    tag: 'CLIENT',
    address: 'app.example.com',
    kind: 'client',
    detail:
      'The consumer of the API. It sends an HTTP request with a method, path, headers and optional body, then parses the JSON response according to its status code.',
  },
  {
    id: 'gateway',
    label: 'API gateway',
    sub: 'TLS · routing',
    tag: 'GATEWAY',
    address: 'api.example.com:443',
    kind: 'network',
    detail:
      'Terminates TLS, matches the route, applies rate limits and request IDs, and forwards the request to the correct service. It does not own business logic.',
  },
  {
    id: 'auth',
    label: 'Auth service',
    sub: 'token validation',
    tag: 'AUTH',
    address: '/oauth/introspect',
    kind: 'service',
    detail:
      'Validates the bearer token: signature, issuer, expiry and scope. A failed check ends the request before any data is touched.',
  },
  {
    id: 'api',
    label: 'Orders service',
    sub: 'REST handler',
    tag: 'API',
    address: '/v2/orders',
    kind: 'server',
    detail:
      'The application server. It validates the request, applies business rules, queries the data store and serialises the result into JSON with the correct status code.',
  },
  {
    id: 'db',
    label: 'Data store',
    sub: 'orders table',
    tag: 'DATA',
    address: 'postgres:5432',
    kind: 'server',
    detail:
      'The persistent store. It returns rows to the handler; the API decides how those rows become a JSON representation.',
  },
];

const SCENARIO_LABEL: Record<Scenario, string> = {
  get: 'GET · 200 OK',
  post: 'POST · 201 Created',
  conflict: 'PATCH · 409 Conflict',
  unauth: 'GET · 401 Unauthorized',
};

const RESPONSE_JSON: Record<Scenario, string> = {
  get: '{\n  "data": [\n    { "id": 1042, "status": "shipped", "total": "148.00" },\n    { "id": 1043, "status": "pending", "total": "62.40" },\n    { "id": 1044, "status": "cancelled", "total": "19.99" }\n  ],\n  "pagination": { "limit": 20, "next": null },\n  "meta": { "requestId": "req_8f21c4a9" }\n}',
  post: '{\n  "id": 1045,\n  "status": "pending",\n  "total": "99.00",\n  "createdAt": "2025-03-04T09:15:22Z",\n  "links": { "self": "/v2/orders/1045" }\n}',
  conflict:
    '{\n  "type": "https://api.example.com/errors/version-conflict",\n  "title": "Version conflict",\n  "status": 409,\n  "detail": "Order 1042 was modified after the supplied ETag.",\n  "requestId": "req_5b77de02"\n}',
  unauth:
    '{\n  "type": "https://api.example.com/errors/unauthorized",\n  "title": "Invalid access token",\n  "status": 401,\n  "detail": "Token signature validation failed.",\n  "requestId": "req_c41a9d77"\n}',
};

function getSteps(): SimStep[] {
  return [
    {
      id: 'build',
      title: 'Client builds the request',
      phase: 'REQUEST',
      node: 0,
      status: 'info',
      detail:
        'The client chooses the method and path, then adds representation metadata: what it accepts, who it is, and how the response should be compressed.',
      payloadTitle: 'GET /v2/orders',
      rows: [
        ['Method', 'GET'],
        ['Path', '/v2/orders?limit=20&status=shipped'],
        ['Authorization', 'Bearer eyJhbGciOi…'],
        ['Accept', 'application/json'],
        ['X-Request-ID', 'req_8f21c4a9'],
      ],
      raw: 'GET /v2/orders?limit=20&status=shipped HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs…\nAccept: application/json\nAccept-Encoding: gzip\nX-Request-ID: req_8f21c4a9',
      packetLabel: 'GET',
    },
    {
      id: 'tls',
      title: 'TLS handshake and HTTP/2 negotiation',
      phase: 'TRANSPORT',
      node: 1,
      detail:
        'The client verifies the certificate chain for api.example.com, agrees on TLS 1.3 and negotiates HTTP/2 through ALPN. In HTTP/2 the method and path travel as pseudo-headers.',
      payloadTitle: 'Connection',
      rows: [
        ['TCP', 'api.example.com:443'],
        ['TLS', '1.3 · TLS_AES_128_GCM_SHA256'],
        ['ALPN', 'h2'],
        ['Certificate', 'valid · SAN api.example.com'],
        ['Pseudo-headers', ':method GET, :path /v2/orders'],
      ],
    },
    {
      id: 'route',
      title: 'Gateway matches the route and applies policy',
      phase: 'GATEWAY',
      node: 1,
      detail:
        'The gateway terminates TLS, attaches a request ID, checks the rate-limit bucket and routes by path prefix to the orders service. Nothing is executed yet.',
      payloadTitle: 'Routing',
      rows: [
        ['Route', '/v2/orders → orders-service'],
        ['Rate limit', '600 req/min · 412 remaining'],
        ['Body limit', '1 MB'],
        ['Upstream', 'orders-service:8080'],
        ['Timeout', '5 s'],
      ],
    },
    {
      id: 'auth',
      title: 'Token is validated',
      phase: 'AUTH',
      node: 2,
      status: 'ok',
      detail:
        'The signature is verified against the issuer\'s public key, then expiry, audience and scope are checked. Authorization is a separate decision from authentication.',
      payloadTitle: 'JWT claims',
      rows: [
        ['iss', 'https://auth.example.com'],
        ['sub', 'user_4821'],
        ['scope', 'orders:read'],
        ['exp', 'in 47 min'],
        ['aud', 'api.example.com'],
        ['Result', 'valid → continue'],
      ],
      raw: '{\n  "iss": "https://auth.example.com",\n  "sub": "user_4821",\n  "scope": "orders:read",\n  "aud": "api.example.com",\n  "exp": 1741082400\n}',
      packetLabel: 'JWT',
    },
    {
      id: 'query',
      title: 'Handler queries the data store',
      phase: 'HANDLER',
      node: 3,
      detail:
        'The handler validates the query parameters, applies the tenant filter and issues a parameterised query with a bound limit. Pagination protects both the database and the client.',
      payloadTitle: 'Validation + query',
      rows: [
        ['limit', '20 (max 100)'],
        ['status', 'shipped (allowed enum)'],
        ['Tenant filter', 'tenant_id = 4821'],
        ['Query', 'SELECT … WHERE tenant_id = $1 LIMIT $2'],
        ['Injection risk', 'parameters bound, not concatenated'],
      ],
      raw: 'SELECT id, status, total_cents\nFROM orders\nWHERE tenant_id = $1 AND status = $2\nORDER BY id DESC\nLIMIT $3',
      packetLabel: 'Query',
    },
    {
      id: 'rows',
      title: 'Rows return from the store',
      phase: 'DATA',
      node: 4,
      status: 'ok',
      detail:
        'The database returns three matching rows. The handler maps them to the API representation — database column names are not the public contract.',
      payloadTitle: 'Result set',
      rows: [
        ['Rows', '3'],
        ['Query time', '4.2 ms'],
        ['total_cents', 'converted to "148.00"'],
        ['Cache', 'ETag computed from the payload'],
      ],
    },
    {
      id: 'serialize',
      title: 'Response is serialised',
      phase: 'RESPONSE',
      node: 3,
      detail:
        'A 200 status, JSON content type, cache directives and an ETag are attached. The ETag lets the client revalidate later with If-None-Match and receive a cheap 304.',
      payloadTitle: '200 OK',
      rows: [
        ['Content-Type', 'application/json; charset=utf-8'],
        ['Cache-Control', 'private, max-age=30'],
        ['ETag', '"a91f2c"'],
        ['X-Request-ID', 'req_8f21c4a9'],
        ['Body', 'see response JSON'],
      ],
      raw: 'HTTP/2 200 OK\ncontent-type: application/json; charset=utf-8\ncache-control: private, max-age=30\netag: "a91f2c"\nx-request-id: req_8f21c4a9\n\n{"data":[…],"pagination":{…}}',
      packetLabel: '200 OK',
    },
    {
      id: 'parse',
      title: 'Client parses and renders',
      phase: 'CLIENT',
      node: 0,
      status: 'ok',
      detail:
        'The client checks the status code before parsing, validates the shape, stores the ETag and renders the list. Error handling belongs on the status code, not on the body.',
      payloadTitle: 'Client handling',
      rows: [
        ['Status', '200'],
        ['Parse', 'JSON → typed model'],
        ['ETag stored', '"a91f2c"'],
        ['Next request', 'If-None-Match → 304 possible'],
        ['Retry', 'not needed'],
      ],
    },
  ];
}

function postSteps(): SimStep[] {
  return [
    {
      id: 'build',
      title: 'Client sends a JSON body',
      phase: 'REQUEST',
      node: 0,
      status: 'info',
      detail:
        'POST creates a subordinate resource. The client declares the body format and includes an idempotency key so a retried request cannot create a duplicate order.',
      payloadTitle: 'POST /v2/orders',
      rows: [
        ['Method', 'POST'],
        ['Content-Type', 'application/json'],
        ['Idempotency-Key', '7c1e4f80-…'],
        ['Body size', '84 bytes'],
        ['Authorization', 'Bearer … scope orders:write'],
      ],
      raw: 'POST /v2/orders HTTP/2\ncontent-type: application/json\nidempotency-key: 7c1e4f80-3b2a-4c11-9f0d-2a8b6c1d4e55\nauthorization: Bearer …\n\n{"items":[{"sku":"CBL-2M","qty":2}],"currency":"EUR"}',
      packetLabel: 'POST',
    },
    {
      id: 'route',
      title: 'Gateway accepts the write route',
      phase: 'GATEWAY',
      node: 1,
      detail:
        'The same gateway policy applies, but write routes usually carry a smaller rate limit and a stricter body-size cap.',
      payloadTitle: 'Routing',
      rows: [
        ['Route', 'POST /v2/orders → orders-service'],
        ['Rate limit', '60 writes/min'],
        ['Body limit', '256 KB'],
        ['Idempotency store', 'checked for the supplied key'],
      ],
    },
    {
      id: 'auth',
      title: 'Scope check for a write operation',
      phase: 'AUTH',
      node: 2,
      status: 'ok',
      detail:
        'A read-only token is rejected here with 403, not 401. The token is valid; it simply does not carry the required scope. The distinction matters when you debug.',
      payloadTitle: 'Authorisation',
      rows: [
        ['Token', 'valid'],
        ['Required scope', 'orders:write'],
        ['Granted', 'orders:read orders:write'],
        ['Result', 'allowed'],
        ['Insufficient scope', '403 Forbidden'],
      ],
    },
    {
      id: 'validate',
      title: 'Handler validates the representation',
      phase: 'HANDLER',
      node: 3,
      status: 'warn',
      detail:
        'The body is parsed and validated against a schema: required fields, types, ranges, currency codes. A violation returns 422 with field-level detail rather than a generic failure.',
      payloadTitle: 'Validation',
      rows: [
        ['items[].sku', 'required, string, exists in catalogue'],
        ['items[].qty', 'integer 1–99'],
        ['currency', 'ISO 4217 enum'],
        ['Unknown fields', 'rejected'],
        ['On failure', '422 with error list'],
      ],
    },
    {
      id: 'write',
      title: 'Insert inside a transaction',
      phase: 'DATA',
      node: 4,
      status: 'ok',
      detail:
        'The order and its line items are written in one transaction so a partial order can never exist. The generated id is returned to the handler.',
      payloadTitle: 'INSERT',
      rows: [
        ['Transaction', 'BEGIN … COMMIT'],
        ['order id', '1045 (sequence)'],
        ['Line items', '1 row'],
        ['Stock check', '2 available'],
        ['Result', 'committed in 6.1 ms'],
      ],
      raw: 'BEGIN;\nINSERT INTO orders (tenant_id, status, total_cents)\nVALUES ($1, $2, $3) RETURNING id;\nINSERT INTO order_items (order_id, sku, qty) VALUES ($1, $2, $3);\nCOMMIT;',
      packetLabel: 'INSERT',
    },
    {
      id: 'created',
      title: '201 Created with a Location header',
      phase: 'RESPONSE',
      node: 3,
      status: 'ok',
      detail:
        'A successful creation returns 201, the new representation and a Location header pointing at the new resource. Returning 200 would leave the client guessing whether anything was created.',
      payloadTitle: '201 Created',
      rows: [
        ['Status', '201'],
        ['Location', '/v2/orders/1045'],
        ['Idempotency', 'key stored with the response'],
        ['Cache-Control', 'no-store'],
        ['Body', 'created representation'],
      ],
      raw: 'HTTP/2 201 Created\nlocation: /v2/orders/1045\ncontent-type: application/json\nidempotency-key: 7c1e4f80-…\n\n{"id":1045,"status":"pending",…}',
      packetLabel: '201',
    },
    {
      id: 'retry',
      title: 'Retry semantics',
      phase: 'CLIENT',
      node: 0,
      detail:
        'If the connection drops after the write, the client retries with the same idempotency key and receives the stored response instead of creating a second order. Without the key, the retry duplicates data.',
      payloadTitle: 'Client outcome',
      rows: [
        ['First attempt', 'timed out after commit'],
        ['Retry', 'same Idempotency-Key'],
        ['Server', 'replays stored 201'],
        ['Duplicates', '0'],
        ['Client state', 'order 1045 confirmed'],
      ],
    },
  ];
}

function conflictSteps(): SimStep[] {
  return [
    {
      id: 'read',
      title: 'Client reads the current representation',
      phase: 'READ',
      node: 0,
      status: 'info',
      detail:
        'The client fetched order 1042 earlier and kept the ETag. Optimistic concurrency uses that validator to detect a conflicting write.',
      payloadTitle: 'Prior GET',
      rows: [
        ['Resource', '/v2/orders/1042'],
        ['ETag', '"v7-9c1a"'],
        ['Status', 'shipped'],
        ['Cached at', '09:14:02'],
      ],
    },
    {
      id: 'patch',
      title: 'Conditional PATCH with If-Match',
      phase: 'REQUEST',
      node: 0,
      detail:
        'The update is sent with If-Match so the server can refuse it if the resource changed. This is how a REST API avoids lost updates without holding a lock.',
      payloadTitle: 'PATCH /v2/orders/1042',
      rows: [
        ['Method', 'PATCH'],
        ['If-Match', '"v7-9c1a"'],
        ['Body', '{"status":"delivered"}'],
        ['Content-Type', 'application/merge-patch+json'],
      ],
      raw: 'PATCH /v2/orders/1042 HTTP/2\nif-match: "v7-9c1a"\ncontent-type: application/merge-patch+json\n\n{"status":"delivered"}',
      packetLabel: 'PATCH',
    },
    {
      id: 'compare',
      title: 'Server compares the validator',
      phase: 'HANDLER',
      node: 3,
      status: 'warn',
      detail:
        'Another client changed the order at 09:14:31, so the stored ETag is now "v8-2f77". The precondition fails and the write must not be applied.',
      payloadTitle: 'Precondition check',
      rows: [
        ['Supplied ETag', '"v7-9c1a"'],
        ['Current ETag', '"v8-2f77"'],
        ['Match', 'no'],
        ['Action', 'reject write, no data change'],
      ],
    },
    {
      id: 'conflict',
      title: '409 Conflict with a problem document',
      phase: 'RESPONSE',
      node: 3,
      status: 'bad',
      detail:
        'The response explains the conflict in a machine-readable problem document. 412 Precondition Failed is also valid for a failed If-Match; the body is what makes the failure actionable.',
      payloadTitle: '409 Conflict',
      rows: [
        ['Status', '409'],
        ['Type', 'version-conflict'],
        ['Request-ID', 'req_5b77de02'],
        ['Server state', 'unchanged'],
        ['Client action', 'refetch, merge, retry'],
      ],
      raw: 'HTTP/2 409 Conflict\ncontent-type: application/problem+json\n\n{"title":"Version conflict","status":409,"detail":"Order 1042 was modified after the supplied ETag."}',
      packetLabel: '409',
    },
    {
      id: 'resolve',
      title: 'Client reconciles and retries',
      phase: 'CLIENT',
      node: 0,
      status: 'ok',
      detail:
        'The client refetches the current representation, reapplies the intended change and retries with the new ETag. Blind retries with a stale ETag would fail forever.',
      payloadTitle: 'Recovery',
      rows: [
        ['Step 1', 'GET /v2/orders/1042 → ETag "v8-2f77"'],
        ['Step 2', 'reapply {"status":"delivered"}'],
        ['Step 3', 'PATCH with If-Match "v8-2f77"'],
        ['Result', '200 OK · ETag "v9-3a10"'],
        ['Data lost', 'none'],
      ],
    },
  ];
}

function unauthSteps(): SimStep[] {
  return [
    {
      id: 'request',
      title: 'Request arrives without a valid token',
      phase: 'REQUEST',
      node: 0,
      status: 'warn',
      detail:
        'The client sends the request with an expired access token — a very common failure after a long-idle tab. Authentication happens before routing to any business logic.',
      payloadTitle: 'GET /v2/orders',
      rows: [
        ['Authorization', 'Bearer eyJhbGciOi… (expired)'],
        ['Accept', 'application/json'],
        ['X-Request-ID', 'req_c41a9d77'],
        ['Body', 'none'],
      ],
      raw: 'GET /v2/orders HTTP/2\nhost: api.example.com\nauthorization: Bearer eyJhbGciOiJSUzI1NiIs…\naccept: application/json',
      packetLabel: 'GET',
    },
    {
      id: 'reject',
      title: 'Auth service rejects the token',
      phase: 'AUTH',
      node: 2,
      status: 'bad',
      detail:
        'Signature verification succeeds but the expiry claim is in the past. The request is terminated here — the orders service never sees it.',
      payloadTitle: 'Validation failure',
      rows: [
        ['Signature', 'valid'],
        ['exp', 'expired 12 min ago'],
        ['aud', 'api.example.com'],
        ['Result', 'invalid_token'],
        ['Reached handler', 'no'],
      ],
    },
    {
      id: 'response',
      title: '401 with WWW-Authenticate',
      phase: 'RESPONSE',
      node: 1,
      status: 'bad',
      detail:
        'A 401 means the credentials were missing or invalid; 403 means they were valid but insufficient. The WWW-Authenticate header tells the client how to recover.',
      payloadTitle: '401 Unauthorized',
      rows: [
        ['Status', '401'],
        ['WWW-Authenticate', 'Bearer error="invalid_token"'],
        ['Cache-Control', 'no-store'],
        ['Body', 'application/problem+json'],
        ['Request-ID', 'req_c41a9d77'],
      ],
      raw: 'HTTP/2 401 Unauthorized\nwww-authenticate: Bearer realm="api", error="invalid_token"\ncontent-type: application/problem+json\n\n{"title":"Invalid access token","status":401}',
      packetLabel: '401',
    },
    {
      id: 'refresh',
      title: 'Client refreshes and retries once',
      phase: 'CLIENT',
      node: 0,
      status: 'ok',
      detail:
        'The client exchanges its refresh token for a new access token and retries the original request exactly once. Retrying without refreshing produces a loop of identical 401s.',
      payloadTitle: 'Recovery',
      rows: [
        ['Refresh call', 'POST /oauth/token'],
        ['New access token', 'expires in 60 min'],
        ['Retry', 'original request + new token'],
        ['Expected', '200 OK'],
        ['Loop guard', 'single retry only'],
      ],
    },
  ];
}

const STATUS = [
  ['200 OK', 'Request succeeded; body carries the representation'],
  ['201 Created', 'A new resource exists; Location points to it'],
  ['204 No Content', 'Succeeded, nothing to return (typical DELETE)'],
  ['304 Not Modified', 'Conditional GET matched; reuse the cached body'],
  ['400 Bad Request', 'Malformed syntax or invalid parameter'],
  ['401 Unauthorized', 'Missing or invalid credentials'],
  ['403 Forbidden', 'Authenticated but not permitted'],
  ['404 Not Found', 'No resource at that path'],
  ['409 Conflict', 'State conflict, e.g. concurrent edit'],
  ['422 Unprocessable', 'Syntactically valid but semantically invalid'],
  ['429 Too Many Requests', 'Rate limited; honour Retry-After'],
  ['500 Internal Server Error', 'Unhandled server fault'],
  ['502 Bad Gateway', 'Upstream returned an invalid response'],
  ['503 Service Unavailable', 'Overload or maintenance; Retry-After'],
  ['504 Gateway Timeout', 'Upstream did not answer in time'],
];

export default function ApiLab() {
  const [scenario, setScenario] = useState<Scenario>('get');
  const steps = useMemo(
    () =>
      scenario === 'get'
        ? getSteps()
        : scenario === 'post'
          ? postSteps()
          : scenario === 'conflict'
            ? conflictSteps()
            : unauthSteps(),
    [scenario],
  );

  return (
    <>
      <PageHead
        eyebrow="07 · Laboratory"
        title="API Communication Laboratory"
        lede="Trace a REST request through TLS, routing, authorisation, validation and storage — then inspect how the status code and JSON body change for creation, conflict and authentication failures."
        actions={
          <>
            <Badge tone={scenario === 'get' || scenario === 'post' ? 'teal' : 'amber'}>{SCENARIO_LABEL[scenario]}</Badge>
            <Badge tone="blue">JSON</Badge>
          </>
        }
      />

      <SimulationShell
        simId="api"
        title="Request lifecycle"
        sub={SCENARIO_LABEL[scenario]}
        nodes={NODES}
        steps={steps}
        resetKey={scenario}
        controls={
          <Tabs
            items={[
              { id: 'get', label: 'GET 200' },
              { id: 'post', label: 'POST 201' },
              { id: 'conflict', label: 'PATCH 409' },
              { id: 'unauth', label: 'GET 401' },
            ]}
            active={scenario}
            onChange={setScenario}
            pill
            label="API scenario"
          />
        }
        extra={
          <Panel title="Response body" sub={`application/json · ${SCENARIO_LABEL[scenario]}`}>
            <CodeBlock title="JSON" code={RESPONSE_JSON[scenario]} />
          </Panel>
        }
        caption="The status code is part of the contract. A client must branch on it before it parses anything in the body."
      />

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Status codes that matter" sub="what the client should do">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {STATUS.map(([code, meaning]) => (
                  <tr key={code}>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                      {code}
                    </td>
                    <td style={{ fontSize: 11.8 }}>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="REST and JSON fundamentals" sub="constraints, not decoration">
          <div className="stack">
            <ul className="checklist">
              <li>
                <strong>Client–server</strong> — the API owns the data, the client owns presentation. Neither depends on the other's internals.
              </li>
              <li>
                <strong>Statelessness</strong> — every request carries its own authentication and parameters; the server keeps no session between
                calls.
              </li>
              <li>
                <strong>Uniform interface</strong> — resources are identified by URLs and manipulated with standard methods: GET reads, POST
                creates, PUT replaces, PATCH modifies, DELETE removes.
              </li>
              <li>
                <strong>Cacheability</strong> — responses declare whether they may be cached and for how long, which is what makes CDNs possible.
              </li>
            </ul>
            <Callout tone="teal">
              <span>
                Idempotency matters more than method names: GET, PUT and DELETE can be repeated safely, POST cannot. That is why retrying a POST
                needs an idempotency key.
              </span>
            </Callout>
            <CodeBlock
              title="curl equivalents"
              code={
                'curl -s https://api.example.com/v2/orders \\\n  -H "Authorization: Bearer $TOKEN" \\\n  -H "Accept: application/json"\n\ncurl -s -X POST https://api.example.com/v2/orders \\\n  -H "Authorization: Bearer $TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: 7c1e4f80" \\\n  -d \'{"items":[{"sku":"CBL-2M","qty":2}]}\''
              }
            />
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 24 }}>
        <Disclosure title="Going deeper: status codes, safety and versioning" meta="Advanced reference">
          <div className="stack" style={{ gap: 14 }}>
            <ul style={{ margin: 0 }}>
              <li>
                <span className="mono">GET</span> and <span className="mono">HEAD</span> are safe, because they never change server
                state. <span className="mono">PUT</span> and <span className="mono">DELETE</span> are idempotent, so repeating them is
                harmless. <span className="mono">POST</span> is neither, so a retry can create a duplicate record.
              </li>
              <li>
                <span className="mono">201</span> means created and should include a <span className="mono">Location</span> header.
                <span className="mono">204</span> means success with no body.
              </li>
              <li>
                <span className="mono">400</span> is a malformed request, <span className="mono">401</span> means not authenticated,
                <span className="mono">403</span> means authenticated but not permitted, <span className="mono">404</span> means the
                resource is absent and <span className="mono">409</span> means a conflict with current state.
              </li>
              <li>
                <span className="mono">429</span> means rate limited and usually carries <span className="mono">Retry-After</span>.
                <span className="mono">503</span> means the service is temporarily unavailable, not that the request was wrong.
              </li>
              <li>
                JSON bodies are declared with <span className="mono">Content-Type: application/json</span>. Collections are paged with
                limit and offset or an opaque cursor, and APIs are versioned in the path or through the{' '}
                <span className="mono">Accept</span> header.
              </li>
            </ul>
          </div>
        </Disclosure>
      </div>

      <PageNav />
    </>
  );
}
