import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';
const ROOT = resolve(process.cwd(), 'dist');
const startedAt = Date.now();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const PROTOCOLS = [
  { id: 'http', name: 'HTTP', transport: 'TCP', port: '80', purpose: 'Request/response transfer of hypermedia documents' },
  { id: 'https', name: 'HTTPS', transport: 'TCP', port: '443', purpose: 'HTTP carried inside a TLS session' },
  { id: 'dns', name: 'DNS', transport: 'UDP / TCP', port: '53', purpose: 'Name resolution and service discovery' },
  { id: 'dhcp', name: 'DHCP', transport: 'UDP', port: '67 / 68', purpose: 'Dynamic IPv4 configuration (DORA)' },
  { id: 'smtp', name: 'SMTP', transport: 'TCP', port: '25 / 587 / 465', purpose: 'Mail submission and relay' },
  { id: 'imap', name: 'IMAP', transport: 'TCP', port: '143 / 993', purpose: 'Synchronised mailbox access' },
  { id: 'pop3', name: 'POP3', transport: 'TCP', port: '110 / 995', purpose: 'Mailbox download' },
  { id: 'ftp', name: 'FTP', transport: 'TCP', port: '20 / 21', purpose: 'Legacy file transfer (cleartext)' },
  { id: 'sftp', name: 'SFTP', transport: 'TCP', port: '22', purpose: 'File transfer over SSH' },
  { id: 'ssh', name: 'SSH', transport: 'TCP', port: '22', purpose: 'Encrypted remote shell and tunnelling' },
  { id: 'snmp', name: 'SNMP', transport: 'UDP', port: '161 / 162', purpose: 'Device monitoring and traps' },
  { id: 'ntp', name: 'NTP', transport: 'UDP', port: '123', purpose: 'Clock synchronisation' },
];

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        rejectBody(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rejectBody);
  });
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') {
    json(res, 200, {
      status: 'ok',
      service: 'layer7-lab-api',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      runtime: `node ${process.versions.node}`,
      time: new Date().toISOString(),
    });
    return true;
  }

  if (url.pathname === '/api/protocols') {
    json(res, 200, { count: PROTOCOLS.length, protocols: PROTOCOLS });
    return true;
  }

  if (url.pathname === '/api/echo') {
    const method = req.method ?? 'GET';
    let body = null;
    let parseError = null;
    if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
      const raw = await readBody(req);
      if (raw.trim().length > 0) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
          parseError = 'Request body was not valid JSON; returned as text.';
        }
      }
    }
    const requestedStatus = Number(url.searchParams.get('status') ?? 200);
    const status = Number.isInteger(requestedStatus) && requestedStatus >= 200 && requestedStatus <= 599 ? requestedStatus : 200;
    json(res, status, {
      requestId: randomUUID(),
      method,
      path: url.pathname,
      receivedAt: new Date().toISOString(),
      query: Object.fromEntries(url.searchParams.entries()),
      headers: {
        'content-type': req.headers['content-type'] ?? null,
        'user-agent': req.headers['user-agent'] ?? null,
        accept: req.headers.accept ?? null,
      },
      body,
      ...(parseError ? { warning: parseError } : {}),
      note: 'Response produced by the lab API server (/api/echo).',
    });
    return true;
  }

  return false;
}

function safePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = normalize(decoded).replace(/^([/\\])+/, '');
  const target = join(ROOT, relative);
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  return target;
}

async function serveStatic(req, res, url) {
  let filePath = safePath(url.pathname === '/' ? '/index.html' : url.pathname);
  if (!filePath) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  let info = await stat(filePath).catch(() => null);
  if (info?.isDirectory()) {
    filePath = join(filePath, 'index.html');
    info = await stat(filePath).catch(() => null);
  }
  if (!info) {
    // SPA fallback: every client route is served by the app shell.
    filePath = join(ROOT, 'index.html');
    info = await stat(filePath).catch(() => null);
    if (!info) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Application build not found. Run "npm run build" first.');
      return;
    }
  }

  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'content-length': info.size,
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, url);
      if (!handled) json(res, 404, { error: 'Unknown API endpoint', path: url.pathname });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    json(res, 500, { error: 'Internal server error', detail: String(error?.message ?? error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Layer 7 Lab server listening on http://${HOST}:${PORT}`);
});
