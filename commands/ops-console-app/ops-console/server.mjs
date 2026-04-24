import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { appPidFile, publicDir } from './lib/paths.mjs';
import {
  getDbTableList,
  getLogContent,
  getOverview,
  getUsersSnapshot,
  runAction
} from './lib/ops-service.mjs';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.KPI_OPS_CONSOLE_PORT || '3215', 10);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendJson(res, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    req.on('data', (chunk) => {
      chunks.push(chunk);
      totalBytes += chunk.length;
      if (totalBytes > 512 * 1024) {
        reject(new Error('body_too_large'));
      }
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function assertLocalActionRequest(req) {
  if (req.headers['x-kpi-ops-request'] !== 'true') {
    throw new Error('invalid_local_action_header');
  }
}

function serveStaticFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { ok: false, error: 'not_found' });
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);

    if (req.method === 'GET' && url.pathname === '/api/app/health') {
      sendJson(res, 200, {
        ok: true,
        app: 'kpi-ops-console',
        port
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/overview') {
      sendJson(res, 200, await getOverview());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/users') {
      sendJson(res, 200, await getUsersSnapshot());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/db/tables') {
      sendJson(res, 200, await getDbTableList());
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/logs/')) {
      const logKey = url.pathname.slice('/api/logs/'.length);
      const payload = await getLogContent(logKey);
      sendJson(res, payload.ok ? 200 : 404, payload);
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/actions/')) {
      assertLocalActionRequest(req);
      const actionKey = url.pathname.slice('/api/actions/'.length);
      const payload = await readBody(req);
      const result = await runAction(actionKey, payload);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      serveStaticFile(res, path.join(publicDir, 'index.html'));
      return;
    }

    if (req.method === 'GET') {
      serveStaticFile(res, path.join(publicDir, url.pathname.replace(/^\/+/, '')));
      return;
    }

    sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message || 'internal_error'
    });
  }
});

server.listen(port, host, () => {
  fs.writeFileSync(appPidFile, String(process.pid), 'utf8');
  console.log(`[kpi-ops-console] listening on http://${host}:${port}`);
});
