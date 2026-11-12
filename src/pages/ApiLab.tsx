import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Disclosure, LessonHead, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type ScenarioId = 'get' | 'post' | 'unauthorized';

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'get', label: 'GET list' },
  { id: 'post', label: 'POST create' },
  { id: 'unauthorized', label: 'No token' },
];

const NODES: FlowNode[] = [
  {
    id: 'client',
    label: 'Client app',
    sub: 'fetch()',
    tag: 'CLIENT',
    address: 'app.example.com',
    kind: 'client',
    detail: 'Sends the HTTP request with a JSON body and reads the JSON that comes back.',
  },
  {
    id: 'gateway',
    label: 'API gateway',
    sub: 'api.example.com :443',
    tag: 'GATEWAY',
    address: '198.51.100.7',
    kind: 'server',
    detail: 'Checks the token and the rate limit before any application code runs.',
  },
  {
    id: 'service',
    label: 'Orders service',
    sub: 'orders-api',
    tag: 'SERVICE',
    address: '10.0.3.21:8080',
    kind: 'service',
    detail: 'Runs the route handler and builds the JSON response.',
  },
  {
    id: 'db',
    label: 'Database',
    sub: 'PostgreSQL',
    tag: 'DATA',
    address: 'postgres:5432',
    kind: 'service',
    detail: 'Stores the orders the API reads and writes.',
  },
];

function buildSteps(scenario: ScenarioId): SimStep[] {
  if (scenario === 'unauthorized') {
    return [
      {
        id: 'request',
        title: 'Client sends a request with no token',
        phase: 'REQUEST',
        node: 0,
        packetLabel: 'GET',
        detail: 'The request is well formed, but the Authorization header is missing.',
        raw: 'GET /v1/orders HTTP/1.1\nHost: api.example.com\nAccept: application/json\n;; no Authorization header',
        payloadTitle: 'Request',
        rows: [
          ['Method', 'GET'],
          ['Path', '/v1/orders'],
          ['Authorization', 'missing'],
        ],
      },
      {
        id: 'reject',
        title: 'Gateway rejects it',
        phase: '401',
        node: 1,
        status: 'bad',
        packetLabel: '401',
        detail: 'The gateway answers before the service is ever contacted.',
        raw: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer realm="api"\nContent-Type: application/json\n\n{"error":"missing_token","message":"Authorization header required"}',
        payloadTitle: 'Response',
        rows: [
          ['Status', '401 Unauthorized'],
          ['Header', 'WWW-Authenticate: Bearer'],
          ['Service called', 'no'],
        ],
      },
      {
        id: 'refresh',
        title: 'Client gets a valid token',
        phase: 'AUTH',
        node: 0,
        detail: 'The client refreshes its access token and prepares to retry the same request.',
        payloadTitle: 'Retry plan',
        rows: [
          ['New token', 'expires in 3600 s'],
          ['Retry', 'same request'],
        ],
      },
      {
        id: 'retry',
        title: 'Retry succeeds',
        phase: '200',
        node: 1,
        status: 'ok',
        packetLabel: '200',
        detail: 'With the header present the gateway forwards the request and the data comes back.',
        raw: 'GET /v1/orders HTTP/1.1\nAuthorization: Bearer eyJhbGciOiJIUzI1NiJ9...\n\nHTTP/1.1 200 OK\n\n{"data":[]}',
        payloadTitle: 'Result',
        rows: [
          ['First attempt', '401'],
          ['Second attempt', '200'],
        ],
      },
    ];
  }

  if (scenario === 'post') {
    return [
      {
        id: 'request',
        title: 'Client posts JSON',
        phase: 'REQUEST',
        node: 0,
        packetLabel: 'POST',
        detail: 'The body is JSON, so Content-Type says so and Content-Length counts the bytes.',
        raw: 'POST /v1/orders HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer eyJhbGciOiJIUzI1NiJ9...\nContent-Type: application/json\nContent-Length: 58\n\n{"sku":"HP-2200","quantity":1,"customer":"c_5521"}',
        payloadTitle: 'Request',
        rows: [
          ['Method', 'POST'],
          ['Content-Type', 'application/json'],
          ['Body', '58 bytes'],
        ],
      },
      {
        id: 'gateway',
        title: 'Gateway checks token and limits',
        phase: 'GATEWAY',
        node: 1,
        detail: 'The token is valid and the client is under its rate limit, so the request is forwarded.',
        payloadTitle: 'Checks',
        rows: [
          ['Token', 'valid, scope orders:write'],
          ['Rate limit', '42 / 1000 per minute'],
          ['Route', 'orders-api'],
        ],
      },
      {
        id: 'create',
        title: 'Service creates the order',
        phase: 'SERVICE',
        node: 2,
        detail: 'The handler validates the fields and writes one new row.',
        payloadTitle: 'Handler',
        rows: [
          ['Handler', 'createOrder'],
          ['Validation', 'sku exists, quantity > 0'],
        ],
      },
      {
        id: 'db',
        title: 'Row is inserted',
        phase: 'DATA',
        node: 3,
        detail: 'The database returns the new id, which becomes part of the response.',
        raw: 'INSERT INTO orders (sku, quantity, customer)\nVALUES (\'HP-2200\', 1, \'c_5521\')\nRETURNING id;\n-- id = ord_8842',
        payloadTitle: 'Write',
        rows: [
          ['Table', 'orders'],
          ['New id', 'ord_8842'],
        ],
      },
      {
        id: 'response',
        title: 'Server answers 201 Created',
        phase: '201',
        node: 2,
        status: 'ok',
        packetLabel: '201',
        detail: '201 means something new now exists, and Location says where to find it.',
        raw: 'HTTP/1.1 201 Created\nLocation: /v1/orders/ord_8842\nContent-Type: application/json\n\n{"id":"ord_8842","status":"awaiting_payment","total":129.00}',
        payloadTitle: 'Response',
        rows: [
          ['Status', '201 Created'],
          ['Location', '/v1/orders/ord_8842'],
        ],
      },
      {
        id: 'done',
        title: 'Client adds the order to the list',
        phase: 'DONE',
        node: 0,
        status: 'ok',
        detail: 'The app uses the returned JSON directly, so no reload is needed.',
        payloadTitle: 'Result',
        rows: [
          ['New row', 'ord_8842'],
          ['Page reload', 'not needed'],
        ],
      },
    ];
  }

  return [
    {
      id: 'request',
      title: 'Client calls the endpoint',
      phase: 'REQUEST',
      node: 0,
      packetLabel: 'GET',
      detail: 'A GET request asks for data and never changes anything on the server.',
      raw: 'GET /v1/orders?page=1 HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer eyJhbGciOiJIUzI1NiJ9...\nAccept: application/json',
      payloadTitle: 'Request',
      rows: [
        ['Method', 'GET'],
        ['Path', '/v1/orders?page=1'],
        ['Accept', 'application/json'],
      ],
    },
    {
      id: 'gateway',
      title: 'Gateway validates the token',
      phase: 'GATEWAY',
      node: 1,
      detail: 'Authentication and rate limiting happen here, before the service runs.',
      payloadTitle: 'Checks',
      rows: [
        ['Token', 'valid, scope orders:read'],
        ['Rate limit', '41 / 1000 per minute'],
        ['Forwarded to', 'orders-api'],
      ],
    },
    {
      id: 'query',
      title: 'Service queries the database',
      phase: 'SERVICE',
      node: 2,
      detail: 'The handler runs one query and shapes the rows into JSON.',
      raw: 'SELECT id, total, status\nFROM orders\nWHERE customer = \'c_5521\'\nORDER BY created_at DESC\nLIMIT 20;',
      payloadTitle: 'Query',
      rows: [
        ['Handler', 'listOrders'],
        ['Rows', '3'],
      ],
    },
    {
      id: 'response',
      title: 'Server returns JSON',
      phase: '200',
      node: 2,
      status: 'ok',
      packetLabel: '200',
      detail: 'The response body is JSON, and the status code says the call succeeded.',
      raw: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n{"data":[{"id":"ord_8842","total":129.00,"status":"paid"}],"page":1}',
      payloadTitle: 'Response',
      rows: [
        ['Status', '200 OK'],
        ['Content-Type', 'application/json'],
        ['Body', '3 orders'],
      ],
    },
    {
      id: 'done',
      title: 'Client renders the data',
      phase: 'DONE',
      node: 0,
      status: 'ok',
      detail: 'The app parses the JSON and draws the list without reloading the page.',
      payloadTitle: 'Result',
      rows: [
        ['Orders shown', '3'],
        ['Page reload', 'not needed'],
      ],
    },
  ];
}

export default function ApiLab() {
  const [scenario, setScenario] = useState<ScenarioId>('get');
  const steps = useMemo(() => buildSteps(scenario), [scenario]);

  return (
    <>
      <LessonHead
        eyebrow="07 · API laboratory"
        title="One request, one JSON answer"
        sentence="An API is just HTTP with a predictable URL, method and JSON body."
      />

      <SimulationShell
        simId="api"
        title="Call an endpoint"
        sub="api.example.com/v1/orders · HTTPS 443"
        nodes={NODES}
        steps={steps}
        resetKey={scenario}
        playLabel="Call API"
        controls={
          <Tabs
            items={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))}
            active={scenario}
            onChange={setScenario}
            pill
            label="API scenario"
          />
        }
        caption="Click a component to see what it checks."
      />

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>

        <Disclosure title="REST in four lines" meta="GET · POST · PUT · DELETE">
          <table className="table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Meaning</th>
                <th>Success</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">GET /v1/orders</td>
                <td>List orders</td>
                <td className="mono">200</td>
              </tr>
              <tr>
                <td className="mono">POST /v1/orders</td>
                <td>Create an order</td>
                <td className="mono">201</td>
              </tr>
              <tr>
                <td className="mono">PUT /v1/orders/8842</td>
                <td>Replace an order</td>
                <td className="mono">200</td>
              </tr>
              <tr>
                <td className="mono">DELETE /v1/orders/8842</td>
                <td>Remove an order</td>
                <td className="mono">204</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="What a JSON body looks like" meta="objects · arrays">
          <pre className="sim__wire">{`{
  "data": [
    { "id": "ord_8842", "total": 129.00, "status": "paid" }
  ],
  "page": 1
}`}</pre>
          <p className="disclosure__note">
            Keys are strings, numbers are unquoted, and an array is wrapped in square brackets.
          </p>
        </Disclosure>

        <Disclosure title="Common API status codes" meta="401 · 403 · 404 · 429 · 500">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Means</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">401</td>
                <td>No token, or the token is invalid</td>
              </tr>
              <tr>
                <td className="mono">403</td>
                <td>Token is valid but lacks the scope</td>
              </tr>
              <tr>
                <td className="mono">404</td>
                <td>No resource at that path</td>
              </tr>
              <tr>
                <td className="mono">429</td>
                <td>Rate limit exceeded</td>
              </tr>
              <tr>
                <td className="mono">500</td>
                <td>The service itself failed</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
