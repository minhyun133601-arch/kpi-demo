import { config, runtimePaths } from '../config.js';
import { checkDatabaseHealth } from '../db/pool.js';
import { sendJson } from '../lib/http.js';
import { buildPortalDataBootstrapScript as buildPortalDataBootstrapScriptFromLib } from '../lib/portal-bootstrap.js';
import { getBootstrapStatus } from '../services/auth.js';
import { canAccessPermission, requireAuth } from './route-context.js';

async function buildPortalDataBootstrapScript(auth) {
  return buildPortalDataBootstrapScriptFromLib(auth, canAccessPermission);
}

function serializeJsonForScript(value) {
  return JSON.stringify(value ?? {})
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildOpenPortalDataBootstrapFallbackScript(error) {
  const runtimeConfig = {
    source: 'open_verification_fallback',
    enabled: false,
    apiBase: '/api',
    auth: { currentUser: null },
    metering: { enabled: false, apiBase: '/api', readEnabled: false, writeEnabled: false },
    utilProduction: { enabled: false, apiBase: '/api', readEnabled: false, writeEnabled: false },
    audit: { enabled: false, apiBase: '/api', records: {}, assets: {} },
    data: { enabled: false, apiBase: '/api', records: {}, assets: {} },
    work: { enabled: false, apiBase: '/api', records: {}, assets: {} }
  };
  const meta = {
    moduleKey: 'portal_data',
    importedCount: 0,
    importedMeta: [],
    missing: ['portal_data'],
    blocked: [],
    generatedAt: new Date().toISOString(),
    fallback: 'open_verification',
    error: error?.message || 'portal_data_unavailable'
  };

  return [
    `window.__KPI_SERVER_RUNTIME_CONFIG__ = ${serializeJsonForScript(runtimeConfig)};`,
    'window.PortalData = window.PortalData || {};',
    `window.__KPI_PORTAL_DATA_BOOTSTRAP__ = ${serializeJsonForScript(meta)};`,
    "console.warn('[kpi] portal_data bootstrap fallback: open verification mode without DB data.');",
    ''
  ].join('\n');
}

export async function handlePortalDataBootstrap(context) {
  const { req, res, auth } = context;
  void req;
  requireAuth(auth);
  let script;
  try {
    script = await buildPortalDataBootstrapScript(auth);
  } catch (error) {
    if (config.authEnabled) {
      throw error;
    }
    script = buildOpenPortalDataBootstrapFallbackScript(error);
  }
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
  const bootstrapStatus = config.authEnabled ? await getBootstrapStatus() : { ownerExists: false };
  sendJson(res, 200, {
    ok: true,
    authEnabled: config.authEnabled,
    loginEnabled: config.authEnabled && config.loginEnabled,
    ownerBootstrapEnabled: config.authEnabled && !bootstrapStatus.ownerExists,
    ownerExists: bootstrapStatus.ownerExists,
    accessMode: config.authEnabled ? 'login_required' : 'open_internal'
  });
}
