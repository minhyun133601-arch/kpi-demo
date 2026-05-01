import { sendJson } from '../lib/http.js';
import { sendOwnerRepositoryMapPage, sendOwnerRepositoryMapScript } from '../lib/owner-repository-map-page.js';
import { getOwnerAccessOverview } from '../services/owner-access.js';
import { getRepositoryMap } from '../services/repository-map.js';
import { requireOwner } from './route-context.js';

function readLimit(searchParams) {
  const raw = String(searchParams?.get('limit') || '').trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readRepositoryMapDepth(searchParams) {
  const raw = String(searchParams?.get('maxDepth') || '50').trim();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 60);
}

export async function handleOwnerAccessOverview(context) {
  const { res, auth, url } = context;
  requireOwner(auth);
  const overview = await getOwnerAccessOverview({
    limit: readLimit(url.searchParams)
  });
  sendJson(res, 200, {
    ok: true,
    loginHistory: overview.loginHistory,
    users: overview.users
  });
}

export async function handleOwnerRepositoryMap(context) {
  const { res, auth, url } = context;
  requireOwner(auth);
  sendJson(res, 200, getRepositoryMap({ maxDepth: readRepositoryMapDepth(url.searchParams) }));
}

export async function handleOwnerRepositoryMapPage(context) {
  const { res, auth } = context;
  requireOwner(auth);
  await sendOwnerRepositoryMapPage(res);
}

export async function handleOwnerRepositoryMapScript(context) {
  const { res, auth } = context;
  requireOwner(auth);
  await sendOwnerRepositoryMapScript(res);
}
