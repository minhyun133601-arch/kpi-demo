import { config } from './config.js';
import { getRequestUrl, sendJson } from './lib/http.js';
import { PORTAL_DATA_BOOTSTRAP_PATH } from './lib/portal-bootstrap.js';
import { getAuthContext } from './services/auth.js';
import { handleBootstrapOwner, handleCreateUser, handleCurrentUser, handleListUsers, handleLogin, handleLoginPage, handleLogout, handleUpsertUserPermission } from './routes/auth-routes.js';
import { handleBootstrapStatus, handleHealth, handlePortalDataBootstrap } from './routes/base-routes.js';
import { handleDocumentDelete, handleDocumentDownload, handleDocumentMeta, handleDocumentView, handleUploadBase64File } from './routes/file-routes.js';
import { handleKpiRoute } from './routes/kpi-routes.js';
import { handleGetModuleRecord, handleUpsertModuleRecord } from './routes/module-routes.js';
import { handleOwnerAccessOverview, handleOwnerRepositoryMap, handleOwnerRepositoryMapPage, handleOwnerRepositoryMapScript } from './routes/owner-routes.js';
import { getRouteErrorStatusCode } from './routes/route-errors.js';
import { handleBillingDocumentUpload, handleSharedStoreGet, handleSharedStorePut } from './routes/shared-store-routes.js';
import { handleUtilProductionDailyGet, handleUtilProductionDailyPut } from './routes/util-production-routes.js';

function createRouteKey(method, pathName) {
  return `${method} ${pathName}`;
}

async function createRouteContext(req, res) {
  const url = getRequestUrl(req);
  return {
    req,
    res,
    url,
    pathName: url.pathname,
    method: String(req.method || 'GET').toUpperCase(),
    auth: config.authEnabled ? await getAuthContext(req) : null
  };
}

const EXACT_ROUTE_HANDLERS = new Map([
  ['GET /login', handleLoginPage],
  ['GET /login/', handleLoginPage],
  ['GET /api/health', handleHealth],
  ['GET /api/bootstrap/status', handleBootstrapStatus],
  ['POST /api/bootstrap/owner', handleBootstrapOwner],
  ['POST /api/auth/login', handleLogin],
  ['POST /api/auth/logout', handleLogout],
  ['GET /api/auth/me', handleCurrentUser],
  ['GET /api/owner/access-overview', handleOwnerAccessOverview],
  ['GET /api/owner/repository-map', handleOwnerRepositoryMap],
  ['GET /owner/repository-map', handleOwnerRepositoryMapPage],
  ['GET /owner/repository-map/', handleOwnerRepositoryMapPage],
  ['GET /owner/repository-map.js', handleOwnerRepositoryMapScript],
  ['GET /api/admin/users', handleListUsers],
  ['POST /api/admin/users', handleCreateUser],
  [`GET ${PORTAL_DATA_BOOTSTRAP_PATH}`, handlePortalDataBootstrap],
  ['GET /api/util-production/daily', handleUtilProductionDailyGet],
  ['PUT /api/util-production/daily', handleUtilProductionDailyPut],
  ['POST /api/billing-document', handleBillingDocumentUpload],
  ['GET /api/shared-store', handleSharedStoreGet],
  ['PUT /api/shared-store', handleSharedStorePut],
  ['POST /api/files/base64', handleUploadBase64File]
]);

const DYNAMIC_ROUTE_MATCHERS = [
  {
    method: 'POST',
    pattern: /^\/api\/admin\/users\/([0-9a-f-]+)\/permissions$/,
    handle: (context, match) => handleUpsertUserPermission(context, match[1])
  },
  {
    method: 'GET',
    pattern: /^\/api\/modules\/([^/]+)\/records\/([^/]+)$/,
    handle: (context, match) => handleGetModuleRecord(context, match[1], match[2])
  },
  {
    method: 'PUT',
    pattern: /^\/api\/modules\/([^/]+)\/records\/([^/]+)$/,
    handle: (context, match) => handleUpsertModuleRecord(context, match[1], match[2])
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/files\/([0-9a-f-]+)$/,
    handle: (context, match) => handleDocumentDelete(context, match[1])
  },
  {
    method: 'GET',
    pattern: /^\/api\/files\/([0-9a-f-]+)$/,
    handle: (context, match) => handleDocumentMeta(context, match[1])
  },
  {
    method: 'GET',
    pattern: /^\/api\/files\/([0-9a-f-]+)\/download$/,
    handle: (context, match) => handleDocumentDownload(context, match[1])
  },
  {
    method: 'GET',
    pattern: /^\/api\/files\/([0-9a-f-]+)\/view$/,
    handle: (context, match) => handleDocumentView(context, match[1])
  }
];

function matchDynamicRoute(context) {
  for (const route of DYNAMIC_ROUTE_MATCHERS) {
    if (context.method !== route.method) continue;
    const match = context.pathName.match(route.pattern);
    if (match) {
      return () => route.handle(context, match);
    }
  }
  return null;
}

export { getRouteErrorStatusCode };

export async function routeRequest(req, res) {
  const context = await createRouteContext(req, res);
  const exactHandler = EXACT_ROUTE_HANDLERS.get(createRouteKey(context.method, context.pathName));
  if (exactHandler) {
    return exactHandler(context);
  }

  const dynamicHandler = matchDynamicRoute(context);
  if (dynamicHandler) {
    return dynamicHandler();
  }

  if (await handleKpiRoute(context)) {
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: 'not_found',
    method: context.method,
    path: context.pathName
  });
}
