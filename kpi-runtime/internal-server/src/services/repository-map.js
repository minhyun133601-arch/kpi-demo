import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { config } from '../config.js';
const DEFAULT_MAX_DEPTH = 50;
const MAX_DEPTH_LIMIT = 60;
const RECENT_LIMIT = 30;
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LINE_COUNT_BYTES = 2 * 1024 * 1024;
const ALLOWED_DOTFILES = new Set(['.github', '.gitignore', '.gitattributes']);
const LINE_COUNT_EXTENSIONS = new Set(['.cmd', '.css', '.html', '.js', '.json', '.md', '.mjs', '.ps1', '.txt', '.yml', '.yaml']);
const EXCLUDED_NAMES = new Set([
  '.git',
  '.claude',
  '.codex',
  '.next',
  '.turbo',
  '__pycache__',
  'build',
  'coverage',
  'dist',
  'repository-map-handoff',
  'node_modules',
  'patch.md',
  'var',
  'private-notes.md',
]);
const EXCLUDED_PREFIXES = ['reference-clone', 'commands/ops-console-app/var', 'commands/var', 'repository-map-handoff', 'kpi-runtime/internal-server/node_modules', 'kpi-runtime/internal-server/var'];

const PRIVATE_CONTENT_PREFIXES = ['work-log/', 'team-report/work-log/teams/'];
const EXCLUDED_EXTENSIONS = new Set([
  '.7z', '.bak', '.backup', '.bmp', '.cer', '.crt', '.csv', '.db', '.doc', '.docx', '.dump', '.gif', '.heic', '.jpeg', '.jpg', '.key', '.log',
  '.p12', '.pdf', '.pem', '.pfx', '.pid', '.png', '.ppt', '.pptx', '.rar', '.sqlite', '.sqlite3', '.tsv', '.webp', '.xls', '.xlsm', '.xlsx', '.zip',
]);
const TOP_LEVEL_META = new Map([
  ['AGENTS.md', { tone: 'slate', label: 'rules', desc: 'AI work authority' }],
  ['KPI.html', { tone: 'blue', label: 'main shell', desc: 'dashboard entry point' }],
  ['audit', { tone: 'cyan', label: 'audit', desc: 'audit runtime' }],
  ['commands', { tone: 'violet', label: 'local ops', desc: 'local command tools' }],
  ['data-entry', { tone: 'cyan', label: 'entry', desc: 'manual data-entry runtime' }],
  ['kpi-runtime', { tone: 'blue', label: 'runtime', desc: 'shared app and server runtime' }],
  ['shared-assets', { tone: 'slate', label: 'assets', desc: 'shared images and assets' }],
  ['team-report', { tone: 'rose', label: 'work', desc: 'team work reporting' }],
  ['utility', { tone: 'amber', label: 'utility', desc: 'metering and utility tools' }],
]);
function normalizeRelativePath(value = '') {
  return String(value || '').replaceAll('\\', '/').replace(/^\/+/, '');
}
function isEnvLikeName(name = '') {
  return /^\.env(?:\.|$)/i.test(String(name || ''));
}
function isPrivateContentPath(relativePath = '', basename = '') {
  if (basename === '.gitkeep') return false;
  return PRIVATE_CONTENT_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}
export function isRepositoryMapExcluded(relativePath = '', name = '') {
  const normalized = normalizeRelativePath(relativePath);
  const segments = normalized.split('/').filter(Boolean);
  const basename = String(name || segments.at(-1) || '').trim();
  if (!basename) return false;
  if (isEnvLikeName(basename)) return true;
  if (EXCLUDED_NAMES.has(basename)) return true;
  if (basename.startsWith('.') && !ALLOWED_DOTFILES.has(basename)) return true;
  if (EXCLUDED_EXTENSIONS.has(path.extname(basename).toLowerCase())) return true;
  if (isPrivateContentPath(normalized, basename)) return true;

  return EXCLUDED_PREFIXES.some((prefix) => {
    const normalizedPrefix = normalizeRelativePath(prefix);
    return normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}/`);
  });
}

function toScanRelative(rootDir, filePath) {
  return normalizeRelativePath(path.relative(rootDir, filePath));
}

function isDirectory(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function resolveRootDir(options = {}) {
  const requestedRoot = path.resolve(options.rootDir || config.localSourceRoot || config.repoRoot);
  if (isDirectory(requestedRoot)) return { rootDir: requestedRoot, requestedRoot, fallback: false };
  const fallbackRoot = path.resolve(config.repoRoot);
  if (isDirectory(fallbackRoot)) return { rootDir: fallbackRoot, requestedRoot, fallback: true };
  return { rootDir: fallbackRoot, requestedRoot, fallback: true };
}

function resolveMaxDepth(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_MAX_DEPTH;
  return Math.min(parsed, MAX_DEPTH_LIMIT);
}

function resolveGitStatus(code = '') {
  if (code === '??') return 'untracked';
  if (code.includes('A')) return 'added';
  if (code.includes('M')) return 'modified';
  if (code.includes('R')) return 'renamed';
  if (code.includes('D')) return 'deleted';
  return code.trim() ? 'changed' : '';
}

function parseGitStatus(rootDir) {
  try {
    const output = execFileSync('git', ['-C', rootDir, 'status', '--porcelain=v1'], {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    const statusMap = new Map();
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const rawCode = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const filePath = normalizeRelativePath(rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath);
      if (!filePath || isRepositoryMapExcluded(filePath)) continue;
      const status = resolveGitStatus(rawCode);
      if (status) statusMap.set(filePath, { code: rawCode.trim() || '??', status });
    }
    return { available: true, statusMap };
  } catch (error) {
    return { available: false, error: error.message, statusMap: new Map() };
  }
}

function getRecentLabel(mtimeMs = 0, now = Date.now()) {
  if (!mtimeMs) return '';
  const ageMs = now - mtimeMs;
  if (ageMs < 60 * 60 * 1000) return 'last hour';
  if (ageMs < 24 * 60 * 60 * 1000) return 'today';
  if (ageMs < RECENT_WINDOW_MS) return 'this week';
  return '';
}

function readLineCount(filePath, size = 0) {
  const basename = path.basename(filePath).toLowerCase();
  if (!LINE_COUNT_EXTENSIONS.has(path.extname(basename)) && basename !== '.gitattributes' && basename !== '.gitignore') return null;
  if (size > MAX_LINE_COUNT_BYTES) return null;
  try {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
  } catch {
    return null;
  }
}

function classifyNode(relativePath = '', type = 'file') {
  const topSegment = normalizeRelativePath(relativePath).split('/').filter(Boolean)[0] || '';
  const meta = TOP_LEVEL_META.get(relativePath) || TOP_LEVEL_META.get(topSegment) || {};
  return {
    tone: meta.tone || (type === 'directory' ? 'slate' : 'plain'),
    label: meta.label || '',
    desc: meta.desc || '',
  };
}

function createNode(rootDir, filePath, context) {
  const relativePath = toScanRelative(rootDir, filePath);
  const stat = fs.statSync(filePath);
  const type = stat.isDirectory() ? 'directory' : 'file';
  const size = type === 'file' ? stat.size : 0;
  const git = context.gitStatus.get(relativePath) || null;
  const classification = classifyNode(relativePath, type);
  const recentLabel = type === 'file' ? getRecentLabel(stat.mtimeMs, context.now) : '';

  return {
    name: relativePath ? path.basename(filePath) : path.basename(rootDir),
    path: relativePath,
    type,
    tone: classification.tone,
    label: classification.label,
    desc: classification.desc,
    size,
    lines: type === 'file' ? readLineCount(filePath, size) : null,
    updatedAt: stat.mtime.toISOString(),
    recentLabel,
    status: git?.status || '',
    statusCode: git?.code || '',
    children: [],
  };
}

function walkDirectory(rootDir, filePath, context, depth = 0) {
  const node = createNode(rootDir, filePath, context);
  if (node.type === 'file') {
    context.files.push(node);
    context.totals.files += 1;
    return node;
  }

  if (node.path) context.totals.directories += 1;
  if (depth >= context.maxDepth) {
    node.truncated = true;
    return node;
  }

  let dirEntries;
  try {
    dirEntries = fs.readdirSync(filePath, { withFileTypes: true });
  } catch (error) {
    node.error = error.message || 'directory_read_failed';
    return node;
  }

  const entries = dirEntries
    .filter((entry) => !entry.isSymbolicLink())
    .map((entry) => {
      const childPath = path.join(filePath, entry.name);
      return { childPath, childRelative: toScanRelative(rootDir, childPath), entry };
    })
    .filter(({ childRelative, entry }) => !isRepositoryMapExcluded(childRelative, entry.name))
    .sort((left, right) => {
      if (left.entry.isDirectory() !== right.entry.isDirectory()) return left.entry.isDirectory() ? -1 : 1;
      return left.entry.name.localeCompare(right.entry.name, 'en');
    });

  node.children = entries.map(({ childPath }) => walkDirectory(rootDir, childPath, context, depth + 1));
  return node;
}

function summarizeStatus(statusMap) {
  const counts = { added: 0, changed: 0, deleted: 0, modified: 0, renamed: 0, untracked: 0 };
  for (const value of statusMap.values()) {
    if (Object.prototype.hasOwnProperty.call(counts, value.status)) counts[value.status] += 1;
    else counts.changed += 1;
  }
  return counts;
}

export function getRepositoryMap(options = {}) {
  const rootResolution = resolveRootDir(options);
  const rootDir = rootResolution.rootDir;
  const maxDepth = resolveMaxDepth(options.maxDepth);
  const git = options.includeGitStatus === false ? { available: false, disabled: true, statusMap: new Map() } : parseGitStatus(rootDir);
  const context = {
    now: Date.now(),
    gitStatus: git.statusMap,
    files: [],
    maxDepth,
    totals: { directories: 0, files: 0 },
  };
  const tree = walkDirectory(rootDir, rootDir, context);
  const recent = context.files
    .filter((node) => node.recentLabel || node.status)
    .sort((left, right) => {
      const leftStatus = left.status ? 1 : 0;
      const rightStatus = right.status ? 1 : 0;
      if (leftStatus !== rightStatus) return rightStatus - leftStatus;
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    })
    .slice(0, RECENT_LIMIT);

  return {
    ok: true,
    generatedAt: new Date(context.now).toISOString(),
    repoRoot: path.basename(rootDir),
    rootPath: rootDir,
    requestedRoot: rootResolution.requestedRoot,
    rootFallback: rootResolution.fallback,
    maxDepth,
    tree,
    recent,
    totals: {
      ...context.totals,
      ...summarizeStatus(git.statusMap),
      recent: recent.length,
      dirty: git.statusMap.size,
    },
    git: { available: git.available, disabled: git.disabled === true, error: git.error || '', dirtyCount: git.statusMap.size },
    exclusions: { env: true, runtime: true, attachments: true, workLogContents: true, handoffFolders: true },
  };
}
