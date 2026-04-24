import { config } from '../config.js';
import { sendJson } from '../lib/http.js';
import { handleKpiRootHtml, handleKpiStaticFile, isAllowedKpiStaticPath } from '../lib/kpi-static.js';
import { sendRedirect } from './route-context.js';

const KPI_ROOT_PATHS = new Set(['/', '/KPI.html', '/kpi', '/kpi/']);
const KPI_PUBLIC_STATIC_PATHS = new Set(['/shared-assets/kpi-demo-logo.svg']);

export async function handleKpiRoute(context) {
  const { req, res, url, pathName, method, auth } = context;
  if (method !== 'GET') return false;

  if (KPI_ROOT_PATHS.has(pathName)) {
    if (config.authEnabled && config.loginEnabled && !auth?.user) {
      sendRedirect(res, `/login?next=${encodeURIComponent(pathName + url.search)}`);
      return true;
    }
    await handleKpiRootHtml(req, res);
    return true;
  }

  if (KPI_PUBLIC_STATIC_PATHS.has(pathName)) {
    await handleKpiStaticFile(req, res, pathName);
    return true;
  }

  if (config.authEnabled && !auth?.user && isAllowedKpiStaticPath(pathName)) {
    sendJson(res, 401, {
      ok: false,
      error: 'unauthorized'
    });
    return true;
  }

  await handleKpiStaticFile(req, res, pathName);
  return true;
}
