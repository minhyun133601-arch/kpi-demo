import { config, runtimePaths } from '../config.js';
import { checkDatabaseHealth } from '../db/pool.js';
import { sendJson } from '../lib/http.js';
import { buildPortalDataBootstrapScript as buildPortalDataBootstrapScriptFromLib } from '../lib/portal-bootstrap.js';
import { getBootstrapStatus } from '../services/auth.js';
import { canAccessPermission, requireAuth } from './route-context.js';

async function buildPortalDataBootstrapScript(auth) {
  return buildPortalDataBootstrapScriptFromLib(auth, canAccessPermission);
}

export async function handlePortalDataBootstrap(context) {
  const { req, res, auth } = context;
  void req;
  requireAuth(auth);
  const script = await buildPortalDataBootstrapScript(auth);
  res.writeHead(200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(script)
  });
  res.end(script);
}

export async function handleHealth(context) {
  const { req, res } = context;
  void req;
  const db = await checkDatabaseHealth();
  sendJson(res, 200, {
    ok: true,
    service: 'kpi-demo-runtime',
    phase: config.authEnabled ? 'authenticated_server' : 'open_server',
    accessMode: config.authEnabled ? 'login_required' : 'open_internal',
    now: new Date().toISOString(),
    db,
    storage: runtimePaths
  });
}

export async function handleBootstrapStatus(context) {
  const { req, res } = context;
  void req;
  const bootstrapStatus = await getBootstrapStatus();
  sendJson(res, 200, {
    ok: true,
    authEnabled: config.authEnabled,
    loginEnabled: config.authEnabled && config.loginEnabled,
    ownerBootstrapEnabled: config.authEnabled && !bootstrapStatus.ownerExists,
    ownerExists: bootstrapStatus.ownerExists,
    accessMode: config.authEnabled ? 'login_required' : 'open_internal'
  });
}
