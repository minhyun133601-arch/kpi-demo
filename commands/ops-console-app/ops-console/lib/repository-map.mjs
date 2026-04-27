import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { repoRoot } from './paths.mjs';

const MAX_DEPTH = 7;
const RECENT_LIMIT = 24;
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ALWAYS_EXCLUDED_NAMES = new Set([
  '.git',
  '.claude',
  '.codex',
  'node_modules',
  'var',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '__pycache__'
]);
const EXCLUDED_RELATIVE_PREFIXES = [
  'commands/var',
  'commands/internal/var',
  'kpi-runtime/internal-server/var',
  'kpi-runtime/internal-server/node_modules'
];
const EXCLUDED_EXTENSIONS = new Set([
  '.db',
  '.log',
  '.pid',
  '.sqlite',
  '.sqlite3'
]);
const TOP_LEVEL_META = new Map([
  ['KPI.html', { tone: 'blue', label: 'main shell', labelKo: '메인 셸', desc: 'main dashboard entry', descKo: '메인 대시보드 실행 파일' }],
  [
    'commands/ops-console-app/ops-console/public/repository-map.html',
    { tone: 'violet', label: 'console map', labelKo: '콘솔 지도', desc: 'owner-console repository map page', descKo: '오너 콘솔 안의 저장소 지도 화면' }
  ],
  ['README.md', { tone: 'slate', label: 'docs', labelKo: '안내', desc: 'run and demo guide', descKo: '실행과 데모 모드 안내' }],
  ['AGENTS.md', { tone: 'slate', label: 'rules', labelKo: '규칙', desc: 'AI work authority', descKo: 'AI 작업 기준 문서' }],
  ['kpi-runtime', { tone: 'blue', label: 'dashboard shell', labelKo: '대시보드 셸', desc: 'shared shell and optional runtime', descKo: '공통 화면과 선택형 런타임' }],
  ['utility', { tone: 'amber', label: 'utility tools', labelKo: '유틸리티', desc: 'metering, reports, production helpers', descKo: '계량, 리포트, 생산 보조 도구' }],
  ['team-report', { tone: 'rose', label: 'work reporting', labelKo: '업무 리포트', desc: 'team work and history UI', descKo: '팀 작업과 이력 화면' }],
  ['work-log', { tone: 'rose', label: 'work storage', labelKo: '업무 저장소', desc: 'shared work-log placeholder', descKo: '업무 기록 저장 영역' }],
  ['audit', { tone: 'cyan', label: 'audit', labelKo: '점검', desc: 'inspection and audit UI', descKo: '점검과 감사 화면' }],
  ['data-entry', { tone: 'cyan', label: 'entry', labelKo: '입력', desc: 'manual data-entry sections', descKo: '수기 데이터 입력 화면' }],
  ['commands', { tone: 'violet', label: 'local ops', labelKo: '로컬 운영', desc: 'demo launchers and owner console', descKo: '데모 실행 명령과 오너 콘솔' }],
  ['shared-assets', { tone: 'slate', label: 'assets', labelKo: '자산', desc: 'public-safe demo assets', descKo: '공개 가능한 데모 자산' }]
]);

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function normalizeRelativePath(value = '') {
  return String(value || '').replaceAll('\\', '/').replace(/^\/+/, '');
}

function isEnvLikeName(name = '') {
  return /^\.env(?:\.|$)/i.test(String(name || ''));
}

function isExcludedPath(relativePath = '', name = '') {
  const normalized = normalizeRelativePath(relativePath);
  const segments = normalized.split('/').filter(Boolean);
  const basename = name || segments.at(-1) || '';

  if (!basename) return false;
  if (isEnvLikeName(basename)) return true;
  if (ALWAYS_EXCLUDED_NAMES.has(basename)) return true;
  if (basename.startsWith('.') && !['.github', '.gitignore', '.gitattributes'].includes(basename)) {
    return true;
  }

  if (EXCLUDED_EXTENSIONS.has(path.extname(basename).toLowerCase())) {
    return true;
  }

  return EXCLUDED_RELATIVE_PREFIXES.some((prefix) => {
    const normalizedPrefix = normalizeRelativePath(prefix);
    return normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}/`);
  });
}

function parseGitStatus() {
  try {
    const output = execFileSync('git', ['-C', repoRoot, 'status', '--porcelain=v1'], {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024
    });
    const statusMap = new Map();
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const rawCode = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const filePath = normalizeRelativePath(rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath);
      if (!filePath || isExcludedPath(filePath)) continue;
      const status = resolveGitStatus(rawCode);
      if (status) {
        statusMap.set(filePath, {
          code: rawCode.trim() || '??',
          status,
          label: getStatusLabel(status)
        });
      }
    }
    return {
      available: true,
      statusMap
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      statusMap: new Map()
    };
  }
}

function resolveGitStatus(code = '') {
  if (code === '??') return 'untracked';
  if (code.includes('A')) return 'added';
  if (code.includes('M')) return 'modified';
  if (code.includes('R')) return 'renamed';
  if (code.includes('D')) return 'deleted';
  return code.trim() ? 'changed' : '';
}

function getStatusLabel(status = '') {
  return {
    added: 'added',
    changed: 'changed',
    deleted: 'deleted',
    modified: 'modified',
    renamed: 'renamed',
    untracked: 'untracked'
  }[status] || '';
}

function getStatusLabelKo(status = '') {
  return {
    added: '추가',
    changed: '변경',
    deleted: '삭제',
    modified: '수정',
    renamed: '이름 변경',
    untracked: '미추적'
  }[status] || '';
}

function getRecentLabel(mtimeMs = 0, now = Date.now()) {
  if (!mtimeMs) return '';
  const ageMs = now - mtimeMs;
  if (ageMs < 60 * 60 * 1000) return 'last hour';
  if (ageMs < 24 * 60 * 60 * 1000) return 'today';
  if (ageMs < RECENT_WINDOW_MS) return 'this week';
  return '';
}

function getRecentLabelKo(mtimeMs = 0, now = Date.now()) {
  if (!mtimeMs) return '';
  const ageMs = now - mtimeMs;
  if (ageMs < 60 * 60 * 1000) return '최근 1시간';
  if (ageMs < 24 * 60 * 60 * 1000) return '오늘';
  if (ageMs < RECENT_WINDOW_MS) return '이번 주';
  return '';
}

function classifyNode(relativePath = '', type = 'file') {
  const topSegment = normalizeRelativePath(relativePath).split('/').filter(Boolean)[0] || '';
  const meta = TOP_LEVEL_META.get(relativePath) || TOP_LEVEL_META.get(topSegment) || {};
  return {
    tone: meta.tone || (type === 'directory' ? 'slate' : 'plain'),
    label: meta.label || '',
    labelKo: meta.labelKo || '',
    desc: meta.desc || '',
    descKo: meta.descKo || ''
  };
}

function walkDirectory(currentPath, context, depth = 0) {
  const relativePath = toRepoRelative(currentPath);
  const name = relativePath ? path.basename(currentPath) : 'KPI-Demo';
  const stat = fs.statSync(currentPath);
  const type = stat.isDirectory() ? 'directory' : 'file';
  const git = context.gitStatus.get(relativePath) || null;
  const recentLabel = type === 'file' ? getRecentLabel(stat.mtimeMs, context.now) : '';
  const recentLabelKo = type === 'file' ? getRecentLabelKo(stat.mtimeMs, context.now) : '';
  const classification = classifyNode(relativePath || name, type);
  const node = {
    name,
    path: relativePath,
    type,
    tone: classification.tone,
    label: classification.label,
    labelKo: classification.labelKo,
    desc: classification.desc,
    descKo: classification.descKo,
    size: type === 'file' ? stat.size : 0,
    updatedAt: stat.mtime.toISOString(),
    recentLabel,
    recentLabelKo,
    status: git?.status || '',
    statusCode: git?.code || '',
    statusLabel: git?.label || '',
    statusLabelKo: git?.status ? getStatusLabelKo(git.status) : '',
    children: []
  };

  if (type === 'file') {
    context.totals.files += 1;
    if (recentLabel) context.totals.recent += 1;
    context.files.push(node);
    if (node.status) {
      context.totals[node.status] = (context.totals[node.status] || 0) + 1;
    }
    return node;
  }

  context.totals.directories += relativePath ? 1 : 0;
  if (depth >= MAX_DEPTH) {
    node.truncated = true;
    return node;
  }

  const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    .map((entry) => {
      const childPath = path.join(currentPath, entry.name);
      const childRelative = toRepoRelative(childPath);
      return {
        entry,
        childPath,
        childRelative
      };
    })
    .filter(({ entry, childRelative }) => {
      if (entry.isSymbolicLink()) return false;
      return !isExcludedPath(childRelative, entry.name);
    })
    .sort((left, right) => {
      if (left.entry.isDirectory() !== right.entry.isDirectory()) {
        return left.entry.isDirectory() ? -1 : 1;
      }
      return left.entry.name.localeCompare(right.entry.name, 'en');
    });

  node.children = entries.map(({ childPath }) => walkDirectory(childPath, context, depth + 1));
  return node;
}

function summarizeStatus(git) {
  const counts = {
    added: 0,
    changed: 0,
    deleted: 0,
    modified: 0,
    renamed: 0,
    untracked: 0
  };
  for (const value of git.statusMap.values()) {
    if (Object.prototype.hasOwnProperty.call(counts, value.status)) {
      counts[value.status] += 1;
    } else {
      counts.changed += 1;
    }
  }
  return counts;
}

export function getRepositoryMap() {
  const git = parseGitStatus();
  const context = {
    now: Date.now(),
    gitStatus: git.statusMap,
    files: [],
    totals: {
      directories: 0,
      files: 0,
      recent: 0,
      added: 0,
      changed: 0,
      deleted: 0,
      modified: 0,
      renamed: 0,
      untracked: 0
    }
  };
  const tree = walkDirectory(repoRoot, context);
  const statusSummary = summarizeStatus(git);
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
    repoRoot: path.basename(repoRoot),
    maxDepth: MAX_DEPTH,
    tree,
    recent,
    totals: {
      ...context.totals,
      ...statusSummary,
      recent: recent.length,
      dirty: Array.from(git.statusMap.values()).filter((entry) => entry.status !== 'deleted').length
    },
    git: {
      available: git.available,
      error: git.error || '',
      dirtyCount: git.statusMap.size
    },
    exclusions: {
      hidden: true,
      localRuntime: true,
      generated: true,
      env: true
    }
  };
}
