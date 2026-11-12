import { useMemo, useState } from 'react';
import SimulationShell, { type SimStep } from '../components/sim/SimulationShell';
import type { FlowNode } from '../components/sim/FlowCanvas';
import { Disclosure, LessonHead, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Scheme = 'https' | 'http';

type Spec = {
  path: string;
  requestBody?: string;
  status: number;
  statusText: string;
  responseType: string | null;
  responseBody?: string;
  cache: string;
  location?: string;
  handlerName: string;
  handler: string;
  store: string;
  storeName: string;
  render: string;
};

const METHODS: Record<Method, Spec> = {
  GET: {
    path: '/index.html',
    status: 200,
    statusText: 'OK',
    responseType: 'text/html; charset=utf-8',
    responseBody: '<!doctype html>\n<html lang="en">\n  <head><title>Storefront</title></head>\n  <body><h1>Headphones</h1></body>\n</html>',
    cache: 'public, max-age=60',
    handlerName: 'pageController.show',
    handler: 'The handler returns the stored HTML page for that path.',
    store: 'The page is read from the static cache, so no database query runs.',
    storeName: 'static cache',
    render: 'The browser parses the HTML and paints the page.',
  },
  POST: {
    path: '/api/orders',
    requestBody: '{"sku":"HP-2200","quantity":1}',
    status: 201,
    statusText: 'Created',
    responseType: 'application/json',
    responseBody: '{"id":"ord_8842","status":"awaiting_payment"}',
    cache: 'no-store',
    location: '/api/orders/ord_8842',
    handlerName: 'orderController.create',
    handler: 'The handler validates the JSON body and creates a new order.',
    store: 'One new row is inserted into PostgreSQL.',
    storeName: 'PostgreSQL',
    render: 'The page follows the Location header and shows the new order.',
  },
  PUT: {
    path: '/api/orders/8842',
    requestBody: '{"status":"confirmed"}',
    status: 200,
    statusText: 'OK',
    responseType: 'application/json',
    responseBody: '{"id":"ord_8842","status":"confirmed"}',
    cache: 'no-store',
    handlerName: 'orderController.replace',
    handler: 'The handler replaces the stored order with the new representation.',
    store: 'The order row is updated in place.',
    storeName: 'PostgreSQL',
    render: 'The client replaces its cached copy with the returned body.',
  },
  DELETE: {
    path: '/api/orders/8842',
    status: 204,
    statusText: 'No Content',
    responseType: null,
    cache: 'no-store',
    handlerName: 'orderController.destroy',
    handler: 'The handler deletes the order and releases its stock reservation.',
    store: 'The order row is removed from PostgreSQL.',
    storeName: 'PostgreSQL',
    render: 'There is nothing to draw: 204 carries no body.',
  },
};

const METHOD_IDS: Method[] = ['GET', 'POST', 'PUT', 'DELETE'];

function requestRaw(method: Method): string {
  const spec = METHODS[method];
  const lines = [
    `${method} ${spec.path} HTTP/1.1`,
    'Host: shop.example.com',
    'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)',
    `Accept: ${method === 'GET' ? 'text/html,application/xhtml+xml' : 'application/json'}`,
    'Accept-Encoding: gzip, br',
    'Cookie: session=8f21c0d4',
    'Connection: keep-alive',
  ];
  if (spec.requestBody) {
    lines.push('Content-Type: application/json', `Content-Length: ${spec.requestBody.length}`, '', spec.requestBody);
  }
  return lines.join('\n');
}

function responseRaw(method: Method, scheme: Scheme): string {
  const spec = METHODS[method];
  const lines = [`HTTP/1.1 ${spec.status} ${spec.statusText}`, 'Server: nginx'];
  if (spec.responseType) lines.push(`Content-Type: ${spec.responseType}`);
  if (spec.responseBody) lines.push(`Content-Length: ${spec.responseBody.length}`);
  lines.push(`Cache-Control: ${spec.cache}`, 'ETag: "8f31a"');
  if (spec.location) lines.push(`Location: ${spec.location}`);
  if (scheme === 'https') lines.push('Strict-Transport-Security: max-age=31536000');
  if (spec.responseBody) lines.push('', spec.responseBody);
  return lines.join('\n');
}

function nodesFor(scheme: Scheme): FlowNode[] {
  const port = scheme === 'https' ? '443' : '80';
  return [
    {
      id: 'browser',
      label: 'Browser',
      sub: 'client',
      tag: 'YOU',
      address: '10.10.4.87:51422',
      kind: 'client',
      detail: 'Builds the request, keeps the cookies and renders whatever comes back.',
    },
    {
      id: 'server',
      label: 'Web server',
      sub: `nginx :${port}`,
      tag: 'SERVER',
      address: `203.0.113.10:${port}`,
      kind: 'server',
      detail: `Accepts the connection on port ${port}, picks the site by Host header and forwards the request to the application.`,
    },
    {
      id: 'app',
      label: 'Application',
      sub: 'route handler',
      tag: 'LOGIC',
      address: 'unix:/run/app.sock',
      kind: 'service',
      detail: 'Runs the code for this path and decides the status code and the body.',
    },
    {
      id: 'db',
      label: 'Database',
      sub: 'data store',
      tag: 'DATA',
      address: 'postgres:5432',
      kind: 'service',
      detail: 'Holds the data the handler reads or writes.',
    },
  ];
}

function buildSteps(method: Method, scheme: Scheme): SimStep[] {
  const spec = METHODS[method];
  const port = scheme === 'https' ? '443' : '80';

  return [
    {
      id: 'send',
      title: 'Browser sends the request',
      phase: 'REQUEST',
      node: 0,
      packetLabel: method,
      detail: `The browser writes one request line, ${method} ${spec.path} HTTP/1.1, then the headers.`,
      raw: requestRaw(method),
      payloadTitle: 'Request line',
      rows: [
        ['Method', method],
        ['Path', spec.path],
        ['Destination', `shop.example.com:${port}`],
        ['Body', spec.requestBody ? `${spec.requestBody.length} bytes` : 'none'],
      ],
    },
    {
      id: 'server',
      title: 'Web server reads it',
      phase: 'SERVER',
      node: 1,
      detail: `nginx matches the Host header and sends the request to the route ${spec.path}.`,
      payloadTitle: 'What the server sees',
      rows: [
        ['Virtual host', 'shop.example.com'],
        ['Route', spec.path],
        ['Port', port],
        ['Encryption', scheme === 'https' ? 'TLS 1.3' : 'none (cleartext)'],
      ],
    },
    {
      id: 'handler',
      title: 'Application handles the route',
      phase: 'APP',
      node: 2,
      detail: spec.handler,
      payloadTitle: 'Handler',
      rows: [
        ['Handler', spec.handlerName],
        ['Method', method],
        ['Auth', 'session cookie valid'],
      ],
    },
    {
      id: 'store',
      title: 'Data is read or written',
      phase: 'DATA',
      node: 3,
      detail: spec.store,
      payloadTitle: 'Data store',
      rows: [
        ['Store', spec.storeName],
        ['Operation', method === 'GET' ? 'SELECT' : method === 'DELETE' ? 'DELETE' : method === 'PUT' ? 'UPDATE' : 'INSERT'],
      ],
    },
    {
      id: 'response',
      title: 'Server sends the response',
      phase: 'RESPONSE',
      node: 1,
      status: spec.status < 400 ? 'ok' : 'bad',
      packetLabel: String(spec.status),
      detail: `${spec.status} ${spec.statusText} travels back with ${spec.responseBody ? 'the body below' : 'no body at all'}.`,
      raw: responseRaw(method, scheme),
      payloadTitle: 'Response',
      rows: [
        ['Status', `${spec.status} ${spec.statusText}`],
        ['Content-Type', spec.responseType ?? '(none)'],
        ['Cache-Control', spec.cache],
      ],
    },
    {
      id: 'render',
      title: 'Browser reacts',
      phase: 'BROWSER',
      node: 0,
      detail: spec.render,
      payloadTitle: 'Outcome',
      rows: [
        ['Status handled', `${spec.status} ${spec.statusText}`],
        ['Body parsed', spec.responseType ?? 'none'],
      ],
    },
  ];
}

export default function HttpLab() {
  const [method, setMethod] = useState<Method>('GET');
  const [scheme, setScheme] = useState<Scheme>('https');

  const steps = useMemo(() => buildSteps(method, scheme), [method, scheme]);
  const nodes = useMemo(() => nodesFor(scheme), [scheme]);
  const spec = METHODS[method];
  const port = scheme === 'https' ? '443' : '80';

  return (
    <>
      <LessonHead
        eyebrow="03 · HTTP laboratory"
        title="HTTP in one request"
        sentence="A browser asks for a page, and the web server answers with a status code and a body."
      />

      <SimulationShell
        simId="http"
        title="Send a request"
        sub={`${method} shop.example.com${spec.path} · port ${port}`}
        nodes={nodes}
        steps={steps}
        resetKey={`${method}-${scheme}`}
        playLabel="Send request"
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
      />

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>

        <Disclosure title="The four methods" meta="GET · POST · PUT · DELETE">
          <table className="table">
            <thead>
              <tr>
                <th>Method</th>
                <th>What it means</th>
                <th>Typical status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">GET</td>
                <td>Read a resource. Never changes the server.</td>
                <td className="mono">200</td>
              </tr>
              <tr>
                <td className="mono">POST</td>
                <td>Create something new. Not safe to repeat.</td>
                <td className="mono">201</td>
              </tr>
              <tr>
                <td className="mono">PUT</td>
                <td>Replace a resource. Repeating it changes nothing extra.</td>
                <td className="mono">200</td>
              </tr>
              <tr>
                <td className="mono">DELETE</td>
                <td>Remove a resource. No body comes back.</td>
                <td className="mono">204</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="Status codes" meta="2xx · 3xx · 4xx · 5xx">
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
                <td>It worked</td>
                <td className="mono">200, 201, 204</td>
              </tr>
              <tr>
                <td className="mono">3xx</td>
                <td>Look somewhere else</td>
                <td className="mono">301, 304</td>
              </tr>
              <tr>
                <td className="mono">4xx</td>
                <td>The request is wrong</td>
                <td className="mono">400, 401, 403, 404, 429</td>
              </tr>
              <tr>
                <td className="mono">5xx</td>
                <td>The server failed</td>
                <td className="mono">500, 502, 503, 504</td>
              </tr>
            </tbody>
          </table>
          <p className="disclosure__note">
            <strong>401</strong> means the credentials are missing or wrong. <strong>403</strong> means they are fine but not allowed.
          </p>
        </Disclosure>

        <Disclosure title="Headers you will meet" meta="6 fields">
          <table className="table">
            <thead>
              <tr>
                <th>Header</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">Host</td>
                <td>Which site on this address is wanted.</td>
              </tr>
              <tr>
                <td className="mono">Content-Type</td>
                <td>What kind of body follows.</td>
              </tr>
              <tr>
                <td className="mono">Accept</td>
                <td>What the client can understand.</td>
              </tr>
              <tr>
                <td className="mono">Cache-Control</td>
                <td>How long a copy may be reused.</td>
              </tr>
              <tr>
                <td className="mono">ETag</td>
                <td>A version tag for conditional requests.</td>
              </tr>
              <tr>
                <td className="mono">Location</td>
                <td>Where the new or moved resource lives.</td>
              </tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="What HTTPS adds" meta="TLS 1.3">
          <ul className="checklist checklist--teal">
            <li>
              <strong>Privacy</strong> — headers, cookies and bodies are encrypted.
            </li>
            <li>
              <strong>Integrity</strong> — a modified packet fails instead of applying silently.
            </li>
            <li>
              <strong>Proof of identity</strong> — the certificate proves the server owns that name.
            </li>
            <li>
              <strong>Not authorisation</strong> — it says who the server is, not what you may do.
            </li>
          </ul>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
