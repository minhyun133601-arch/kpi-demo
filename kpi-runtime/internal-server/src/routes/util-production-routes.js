import { sendJson } from '../lib/http.js';
import { PERMISSION_KEYS } from '../lib/permission-registry.js';
import { loadUtilProductionDailyState, saveUtilProductionDailyState } from '../services/util-production-daily.js';
import { assertOpenPermission, parseBody } from './route-context.js';

const UTIL_PRODUCTION_PERMISSION_KEY = PERMISSION_KEYS.UTIL_PRODUCTION_DAILY;

export async function handleUtilProductionDailyGet(context) {
  const { res, auth } = context;
  await assertOpenPermission(UTIL_PRODUCTION_PERMISSION_KEY, auth, 'read');

  const loaded = await loadUtilProductionDailyState();
  if (!loaded) {
    sendJson(res, 404, {
      ok: false,
      error: 'not_found',
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    state: loaded.state,
    meta: loaded.meta,
    source: loaded.source,
  });
}

export async function handleUtilProductionDailyPut(context) {
  const { req, res, auth } = context;
  await assertOpenPermission(UTIL_PRODUCTION_PERMISSION_KEY, auth, 'write');

  const body = await parseBody(req);
  const saved = await saveUtilProductionDailyState({
    state: body.state ?? body.payload ?? {},
    updatedByUserId: auth?.user?.id || null,
  });

  sendJson(res, 200, {
    ok: true,
    meta: saved.meta,
    source: saved.source,
  });
}
