import { sendJson } from '../lib/http.js';
import { getOwnerAccessOverview } from '../services/owner-access.js';
import { requireOwner } from './route-context.js';

function readLimit(searchParams) {
  const raw = String(searchParams?.get('limit') || '').trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
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
