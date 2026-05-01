import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

const REPOSITORY_MAP_PUBLIC_DIR = path.join(
  config.repoRoot,
  'commands',
  'ops-console-app',
  'ops-console',
  'public'
);
const REPOSITORY_MAP_HTML_PATH = path.join(REPOSITORY_MAP_PUBLIC_DIR, 'repository-map.html');
const REPOSITORY_MAP_SCRIPT_PATH = path.join(REPOSITORY_MAP_PUBLIC_DIR, 'repository-map.js');

function sendText(res, contentType, bodyText) {
  const body = Buffer.from(bodyText, 'utf8');
  res.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Length': body.length,
    'Content-Type': contentType,
  });
  res.end(body);
}

function rewriteOwnerScriptSource(html) {
  return String(html || '').replace(
    '<script src="/repository-map.js" defer></script>',
    '<script src="/owner/repository-map.js" defer></script>'
  );
}

export async function sendOwnerRepositoryMapPage(res) {
  const html = await fs.readFile(REPOSITORY_MAP_HTML_PATH, 'utf8');
  sendText(res, 'text/html; charset=utf-8', rewriteOwnerScriptSource(html));
}

export async function sendOwnerRepositoryMapScript(res) {
  let script = '';
  try {
    script = await fs.readFile(REPOSITORY_MAP_SCRIPT_PATH, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  sendText(res, 'application/javascript; charset=utf-8', script);
}
