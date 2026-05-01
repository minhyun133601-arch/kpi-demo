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
  ['.github', { tone: 'slate', label: 'ci', labelKo: 'CI', desc: 'GitHub workflow definitions', descKo: 'GitHub Actions 검증 설정' }],
  ['.gitattributes', { tone: 'slate', label: 'git', labelKo: 'Git', desc: 'line-ending normalization rules', descKo: '줄바꿈 정규화 규칙' }],
  ['.gitignore', { tone: 'slate', label: 'privacy', labelKo: '공개 제외', desc: 'ignored local state and generated artifacts', descKo: '로컬 상태와 생성 산출물 공개 제외 규칙' }],
  ['AGENTS.md', { tone: 'slate', label: 'rules', labelKo: '규칙', desc: 'AI work authority', descKo: 'AI 작업 기준 문서' }],
  ['KPI.html', { tone: 'blue', label: 'main shell', labelKo: '메인 화면', desc: 'dashboard entry point', descKo: 'KPI Demo 정적 대시보드 진입점' }],
  ['README.md', { tone: 'slate', label: 'portfolio guide', labelKo: '포트폴리오 안내', desc: 'run and demo-mode guide', descKo: '실행 방법과 데모 범위 안내' }],
  ['audit', { tone: 'cyan', label: 'audit', labelKo: '점검', desc: 'audit runtime', descKo: '법정 설비와 점검 기록 화면' }],
  ['audit/runtime/audit', { tone: 'cyan', label: 'audit runtime', labelKo: '점검 런타임', desc: 'audit record UI and runtime modules', descKo: '점검 기록 UI와 런타임 모듈' }],
  ['commands', { tone: 'violet', label: 'local ops', labelKo: '로컬 운영', desc: 'local command tools', descKo: '서버 관리 콘솔 실행 명령' }],
  ['commands/open-ops-console.cmd', { tone: 'violet', label: 'open console', labelKo: '콘솔 열기', desc: 'opens the server management console', descKo: '서버 관리 콘솔을 엽니다' }],
  ['commands/close-ops-console.cmd', { tone: 'violet', label: 'close console', labelKo: '콘솔 닫기', desc: 'closes the server management console', descKo: '서버 관리 콘솔을 닫습니다' }],
  ['commands/ops-console-app', { tone: 'violet', label: 'owner console', labelKo: '오너 콘솔', desc: 'owner-side local control surface', descKo: '오너용 로컬 제어 화면' }],
  ['commands/ops-console-app/ops-console', { tone: 'violet', label: 'console server', labelKo: '콘솔 서버', desc: 'console API and UI assets', descKo: '콘솔 API와 화면 자산' }],
  ['commands/ops-console-app/ops-console/public', { tone: 'violet', label: 'console UI', labelKo: '콘솔 화면', desc: 'console UI assets, repository-map.html, and data-reference-map.html', descKo: '콘솔 UI 자산, Repository Map, 데이터 참조 지도' }],
  ['commands/ops-console-app/ops-console/public/repository-map.html', { tone: 'violet', label: 'repository map', labelKo: '저장소 지도', desc: 'owner-console repository map UI', descKo: '오너 콘솔 저장소 지도 화면' }],
  ['commands/ops-console-app/ops-console/public/data-reference-map.html', { tone: 'violet', label: 'data reference', labelKo: '데이터 참조', desc: 'owner-console data reference UI', descKo: '오너 콘솔 데이터 참조 화면' }],
  ['commands/ops-console-app/scripts', { tone: 'violet', label: 'console scripts', labelKo: '콘솔 스크립트', desc: 'internal owner-console start and stop scripts', descKo: '내부 오너 콘솔 시작/종료 스크립트' }],
  ['data-entry', { tone: 'cyan', label: 'entry', labelKo: '데이터 입력', desc: 'manual data-entry runtime', descKo: '수기 데이터 입력 화면' }],
  ['data-entry/runtime/data', { tone: 'cyan', label: 'entry runtime', labelKo: '입력 런타임', desc: 'manual data-entry section modules', descKo: '수기 데이터 입력 섹션 모듈' }],
  ['kpi-runtime', { tone: 'blue', label: 'runtime', labelKo: '런타임', desc: 'shared app and server runtime', descKo: '공통 앱 화면과 선택형 서버 런타임' }],
  ['kpi-runtime/app', { tone: 'blue', label: 'app shell', labelKo: '앱 셸', desc: 'navigation, viewer, auth, and shell JS', descKo: '내비게이션, 뷰어, 인증, 화면 셸 JS' }],
  ['kpi-runtime/app/styles', { tone: 'blue', label: 'styles', labelKo: '스타일', desc: 'shell, work, metering, and audit CSS', descKo: '셸, 작업, 검침, 점검 CSS' }],
  ['kpi-runtime/core', { tone: 'blue', label: 'core', labelKo: '공통 코어', desc: 'shared browser runtime logic', descKo: '브라우저 공통 런타임 로직' }],
  ['kpi-runtime/demo', { tone: 'blue', label: 'demo data', labelKo: '더미 데이터', desc: 'synthetic static fixtures', descKo: '정적 화면용 합성 더미 데이터' }],
  ['kpi-runtime/internal-server', { tone: 'green', label: 'optional backend', labelKo: '선택형 서버', desc: 'optional Node and PostgreSQL runtime', descKo: '선택형 Node 및 PostgreSQL 런타임' }],
  ['kpi-runtime/internal-server/deploy', { tone: 'green', label: 'deploy examples', labelKo: '배포 예시', desc: 'Windows local and Ubuntu reference deployment examples', descKo: 'Windows 로컬과 Ubuntu 참조 배포 예시' }],
  ['kpi-runtime/internal-server/e2e', { tone: 'green', label: 'browser smoke', labelKo: '브라우저 스모크', desc: 'Playwright browser smoke checks', descKo: 'Playwright 브라우저 스모크 확인' }],
  ['kpi-runtime/internal-server/scripts', { tone: 'green', label: 'server scripts', labelKo: '서버 스크립트', desc: 'start, stop, backup, restore, account, and DB helpers', descKo: '시작, 종료, 백업, 복원, 계정, DB 보조 스크립트' }],
  ['kpi-runtime/internal-server/src', { tone: 'green', label: 'server source', labelKo: '서버 구현', desc: 'server implementation', descKo: '서버 구현 코드' }],
  ['kpi-runtime/internal-server/src/db', { tone: 'green', label: 'database', labelKo: '데이터베이스', desc: 'PostgreSQL schema migrations', descKo: 'PostgreSQL 스키마와 마이그레이션' }],
  ['kpi-runtime/internal-server/src/repositories', { tone: 'green', label: 'repositories', labelKo: '저장소 계층', desc: 'database access layer', descKo: '데이터베이스 접근 계층' }],
  ['kpi-runtime/internal-server/src/routes', { tone: 'green', label: 'routes', labelKo: '라우트', desc: 'HTTP route handlers', descKo: 'HTTP 라우트 처리' }],
  ['kpi-runtime/internal-server/src/services', { tone: 'green', label: 'services', labelKo: '서비스', desc: 'business rules and state assembly', descKo: '업무 규칙과 상태 조립' }],
  ['kpi-runtime/internal-server/test', { tone: 'green', label: 'tests', labelKo: '테스트', desc: 'frontend, route, service, database, and script tests', descKo: '프런트엔드, 라우트, 서비스, DB, 스크립트 테스트' }],
  ['kpi-runtime/sections', { tone: 'blue', label: 'sections', labelKo: '섹션', desc: 'dashboard section registry and builders', descKo: '대시보드 섹션 등록부와 빌더' }],
  ['shared-assets', { tone: 'slate', label: 'assets', labelKo: '공개 자산', desc: 'shared images and assets', descKo: '공유 이미지와 공개 자산' }],
  ['team-report', { tone: 'rose', label: 'work', labelKo: '업무 리포트', desc: 'team work reporting', descKo: '팀별 작업 보고 화면' }],
  ['team-report/runtime/work', { tone: 'rose', label: 'work runtime', labelKo: '작업 런타임', desc: 'work-log UI and history runtime', descKo: '작업 로그 UI와 이력 런타임' }],
  ['utility', { tone: 'amber', label: 'utility', labelKo: '유틸리티', desc: 'metering and utility tools', descKo: '검침과 유틸리티 도구' }],
  ['utility/apps', { tone: 'amber', label: 'utility apps', labelKo: '유틸 앱', desc: 'standalone utility applications', descKo: '독립 실행형 유틸리티 앱' }],
  ['utility/apps/metering', { tone: 'amber', label: 'metering', labelKo: '검침', desc: 'billing, calendar, equipment, save, team monthly, overview, and settlement UI', descKo: '청구, 캘린더, 설비, 저장, 팀 월간, 현황, 정산 UI' }],
  ['utility/runtime/util', { tone: 'amber', label: 'utility runtime', labelKo: '유틸 런타임', desc: 'dashboard-integrated utility runtime', descKo: '대시보드 통합 유틸리티 런타임' }],
]);
const STATUS_LABELS = {
  added: 'Added',
  changed: 'Changed',
  deleted: 'Deleted',
  modified: 'Modified',
  renamed: 'Renamed',
  untracked: 'Untracked',
};
const STATUS_LABELS_KO = {
  added: '추가',
  changed: '변경',
  deleted: '삭제',
  modified: '수정',
  renamed: '이름 변경',
  untracked: '미추적',
};
const RECENT_LABELS_KO = {
  'last hour': '최근 1시간',
  today: '오늘',
  'this week': '이번 주',
};
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
    labelKo: meta.labelKo || '',
    desc: meta.desc || '',
    descKo: meta.descKo || '',
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
    labelKo: classification.labelKo,
    desc: classification.desc,
    descKo: classification.descKo,
    size,
    lines: type === 'file' ? readLineCount(filePath, size) : null,
    updatedAt: stat.mtime.toISOString(),
    recentLabel,
    recentLabelKo: RECENT_LABELS_KO[recentLabel] || '',
    status: git?.status || '',
    statusLabel: STATUS_LABELS[git?.status || ''] || '',
    statusLabelKo: STATUS_LABELS_KO[git?.status || ''] || '',
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
