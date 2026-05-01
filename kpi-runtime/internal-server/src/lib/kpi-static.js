import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { sendJson } from './http.js';
import { injectPortalDataBootstrap } from './portal-bootstrap.js';

const KPI_HTML_PATH = path.join(config.repoRoot, 'KPI.html');
const KPI_FAVICON_PATH = path.join(config.repoRoot, 'shared-assets', 'kpi-demo-logo.svg');
const KPI_STATIC_ALLOWED_ROOT_FILES = new Set([
  'KPI.html',
  'style.css',
  'favicon.ico'
]);
const KPI_STATIC_ALLOWED_TOP_LEVEL = new Set([
  'team-report',
  'utility',
  'audit',
  'data-entry',
  'kpi-runtime',
  'shared-assets',
  'work-log'
]);
const KPI_STATIC_FORBIDDEN_TOP_LEVEL = new Set([
  '.git',
  '.claude',
  '.codex',
  'node_modules',
  'skills',
  'private-workspace'
]);
const CONTENT_TYPE_BY_EXTENSION = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.hwp', 'application/x-hwp'],
  ['.hwpx', 'application/x-hwp+zip'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.pdf', 'application/pdf'],
  ['.ppt', 'application/vnd.ms-powerpoint'],
  ['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.tif', 'image/tiff'],
  ['.tiff', 'image/tiff'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.xls', 'application/vnd.ms-excel'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

function getContentType(filePath) {
  return CONTENT_TYPE_BY_EXTENSION.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

function decodePathname(pathname) {
  try {
    return decodeURIComponent(String(pathname || '/'));
  } catch {
    return String(pathname || '/');
  }
}

async function sendFile(res, filePath) {
  const body = await fs.readFile(filePath);
  res.writeHead(200, {
    'Content-Type': getContentType(filePath),
    'Content-Length': body.length
  });
  res.end(body);
}

export function isAllowedKpiStaticPath(pathname) {
  const normalizedPath = decodePathname(pathname)
    .split('/')
    .filter(Boolean);

  if (!normalizedPath.length) {
    return true;
  }

  if (normalizedPath.length === 1 && KPI_STATIC_ALLOWED_ROOT_FILES.has(normalizedPath[0])) {
    return true;
  }

  const [firstSegment] = normalizedPath;
  if (!firstSegment || firstSegment.startsWith('.') || KPI_STATIC_FORBIDDEN_TOP_LEVEL.has(firstSegment)) {
    return false;
  }

  if (KPI_STATIC_ALLOWED_TOP_LEVEL.has(firstSegment)) {
    return true;
  }

  return false;
}

function isAllowedKpiStaticTarget(targetFilePath, pathname) {
  const normalizedPath = decodePathname(pathname)
    .split('/')
    .filter(Boolean);

  const [firstSegment] = normalizedPath;
  if (firstSegment && (firstSegment.startsWith('.') || KPI_STATIC_FORBIDDEN_TOP_LEVEL.has(firstSegment))) {
    return false;
  }

  const resolvedProjectRoot = path.resolve(config.projectRoot);
  if (targetFilePath === resolvedProjectRoot || targetFilePath.startsWith(`${resolvedProjectRoot}${path.sep}`)) {
    return false;
  }

  return CONTENT_TYPE_BY_EXTENSION.has(path.extname(targetFilePath).toLowerCase());
}

export async function handleKpiRootHtml(req, res) {
  void req;
  const html = await fs.readFile(KPI_HTML_PATH, 'utf8');
  const rendered = injectPortalDataBootstrap(html);
  const body = Buffer.from(rendered.html, 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length
  });
  res.end(body);
}

export async function handleKpiStaticFile(req, res, pathname) {
  void req;
  if (pathname === '/favicon.ico') {
    await sendFile(res, KPI_FAVICON_PATH);
    return;
  }

  const relativePath = decodePathname(pathname).replace(/^\/+/, '');
  const targetFilePath = path.resolve(config.repoRoot, relativePath);
  if (!isAllowedKpiStaticTarget(targetFilePath, pathname)) {
    sendJson(res, 404, {
      ok: false,
      error: 'not_found'
    });
    return;
  }

  const normalizedRepoRoot = path.resolve(config.repoRoot) + path.sep;
  if (!targetFilePath.startsWith(normalizedRepoRoot) && targetFilePath !== path.resolve(config.repoRoot)) {
    sendJson(res, 404, {
      ok: false,
      error: 'not_found'
    });
    return;
  }

  try {
    const stat = await fs.stat(targetFilePath);
    if (!stat.isFile()) {
      sendJson(res, 404, {
        ok: false,
        error: 'not_found'
      });
      return;
    }

    await sendFile(res, targetFilePath);
  } catch {
    sendJson(res, 404, {
      ok: false,
      error: 'not_found'
    });
  }
}
