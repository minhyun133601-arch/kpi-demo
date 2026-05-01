const actionHeader = {
  'X-KPI-Ops-Request': 'true',
  'Content-Type': 'application/json'
};
const TAB_SERVER = 'server';
const TAB_DATA = 'data';
const TAB_PREVIEW = 'preview';
const TAB_REFERENCE = 'reference';
const LANGUAGE_STORAGE_KEY = 'kpi.opsConsole.language';
let overviewCache = null;
let commandRegistryCache = new Map();
const iconMap = { monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="12" rx="2"></rect><path d="M8 19.5h8"></path><path d="M12 16.5v3"></path></svg>', server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="6" rx="2"></rect><rect x="4" y="14" width="16" height="6" rx="2"></rect><path d="M8 7h.01M8 17h.01M16 7h2M16 17h2"></path></svg>', database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7" ry="3.5"></ellipse><path d="M5 5.5v6c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-6"></path><path d="M5 11.5v6c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-6"></path></svg>', clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><path d="M12 7.5v5l3 2"></path></svg>', power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v8"></path><path d="M6.5 6.5a8 8 0 1 0 11 0"></path></svg>', stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>', refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 5v5h-5"></path><path d="M4 19v-5h5"></path><path d="M18 10a6.5 6.5 0 0 0-11-2L4 10"></path><path d="M6 14a6.5 6.5 0 0 0 11 2l3-2"></path></svg>', user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"></circle><path d="M5.5 19a6.5 6.5 0 0 1 13 0"></path></svg>', key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="3"></circle><path d="M10.5 13.5 19 5l2 2-1.5 1.5 1 1L18 12l-1-1-1.5 1.5"></path></svg>', trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15"></path><path d="M9 4.5h6"></path><path d="M7 7l1 12h8l1-12"></path></svg>', folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5h6l2 2h9v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"></path></svg>', terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2"></rect><path d="m7.5 9 3 3-3 3"></path><path d="M12.5 15h4"></path></svg>', tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 7 3-3 3 3-3 3"></path><path d="M17 7 8 16"></path><path d="m5 13 6 6"></path><path d="M4 20h4"></path></svg>', list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11"></path><path d="M9 12h11"></path><path d="M9 18h11"></path><circle cx="5" cy="6" r="1"></circle><circle cx="5" cy="12" r="1"></circle><circle cx="5" cy="18" r="1"></circle></svg>', table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="M4 10h16M10 5v14"></path></svg>', spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8Z"></path><path d="m19 15 .8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8Z"></path></svg>' };
const commandIconMap = { 'server.start': 'power', 'server.stop': 'stop', 'server.recover': 'refresh', 'startup.register': 'clock', 'startup.unregister': 'clock', 'system.scheduleShutdown': 'clock', 'account.bootstrapOwner': 'user', 'account.createEmployee': 'user', 'account.resetPassword': 'key', 'account.deleteUser': 'trash', 'db.listTables': 'table', 'db.openConsole': 'terminal', 'filesystem.openCommandsFolder': 'folder', 'filesystem.openLogsFolder': 'folder' };
const commandLabelMap = {
  'server.start': '실행',
  'server.stop': '중지',
  'server.recover': '복구',
  'startup.register': '등록',
  'startup.unregister': '해제',
  'system.scheduleShutdown': '예약',
  'account.bootstrapOwner': '생성',
  'account.createEmployee': '생성',
  'account.resetPassword': '변경',
  'account.deleteUser': '삭제',
  'db.listTables': '불러오기',
  'db.openConsole': '열기',
  'filesystem.openCommandsFolder': '열기',
  'filesystem.openLogsFolder': '열기'
};
const compactDescriptionMap = {
  'server.start': '현재 서버 스택을 올립니다.',
  'server.stop': '서버와 PostgreSQL을 순서대로 종료합니다.',
  'server.recover': '실행 중인 흔적을 정리하고 다시 올립니다.',
  'startup.register': '현재 사용자 로그인 시 자동으로 서버를 올립니다.',
  'startup.unregister': '현재 사용자 자동실행을 해제합니다.',
  'system.scheduleShutdown': '시작 또는 종료 시간을 예약합니다.',
  'db.listTables': '테이블 이름만 바로 확인합니다.',
  'db.openConsole': 'psql 콘솔 창을 엽니다.',
  'filesystem.openCommandsFolder': 'commands 폴더를 엽니다.',
  'filesystem.openLogsFolder': '로그 폴더를 엽니다.'
};
const i18n = {
  ko: {
    documentTitle: 'KPI 운영 콘솔',
    heroEyebrow: 'KPI OPERATIONS COMMANDS',
    heroTitle: 'KPI 운영 콘솔',
    heroSummary: 'KPI 서버, DB, 계정 작업을 현재 저장소 포트 기준으로 관리합니다.',
    metaRuntime: 'KPI 런타임 3104',
    metaDb: 'DB 5400',
    metaConsole: '운영 콘솔',
    refreshButton: '상태 새로고침',
    openKpiButton: 'KPI 로그인 열기',
    scheduleLabel: '컴퓨터 예약',
    kpiLabel: 'KPI 런타임 3104',
    postgresLabel: 'PostgreSQL 5400',
    startupLabel: '부팅 자동실행',
    resultLabel: '최근 결과',
    checking: '확인 중',
    scheduleInitialSummary: '시작 / 종료 예약 상태',
    startupSummary: '현재 사용자 시작프로그램',
    resultIdle: '대기 중',
    resultIdleMeta: '아직 실행한 작업이 없습니다.',
    tabAriaLabel: '운영 콘솔 분류',
    serverTab: '서버 관리',
    accountTab: '계정 관리',
    dataReferenceTab: '데이터 참조 경로',
    logsTitle: '로그 보기',
    logsSummary: '최근 로그 60줄을 바로 확인합니다.',
    serverActionsLog: '서버 액션',
    logOutputIdle: '로그를 선택해 주세요.',
    toolsTitle: 'DB / 도구',
    toolsSummary: 'DB 콘솔과 운영 보조 작업을 처리합니다.',
    tablesTitle: 'DB 테이블',
    tablesSummary: '테이블 목록을 이 화면에서 바로 확인합니다.',
    loadButton: '불러오기',
    tablesOutputIdle: '아직 불러오지 않았습니다.',
    accountTitle: '계정 관리',
    accountSummary: '오너, 직원 계정과 비밀번호 작업을 처리합니다.',
    usersTitle: '사용자 현황',
    usersSummary: '현재 DB에 등록된 계정 상태를 확인합니다.',
    userCountLabel: '총 사용자',
    sessionCountLabel: '활성 세션',
    reloadUsersButton: '사용자 목록 새로고침',
    userIdHeader: '아이디',
    displayNameHeader: '표시 이름',
    roleHeader: '역할',
    lastAccessHeader: '최근 접속',
    sessionHeader: '세션',
    loading: '불러오는 중...',
    previewSummary: '현재 저장소 폴더 지도, 포트 경계, 변경 기록을 콘솔 안에서 확인합니다.',
    dataReferenceTitle: '데이터 참조 경로',
    dataReferenceSummary: '현재 입력 화면별 데이터가 어느 API, DB 레코드, 파일 저장소, 권한키를 거치는지 확인합니다.',
    openNewWindow: '새 창',
    scheduleModalEyebrow: 'COMPUTER SCHEDULE',
    closeButton: '닫기',
    done: '완료',
    none: '없음',
    active: '활성',
    noSchedule: '예약 없음',
    bothSchedule: '시작·종료 예약',
    scheduleStatus: '{kind} 예약',
    scheduleNoneSummary: '시작 / 종료 예약 없음',
    scheduleSummary: '{kind} {time}',
    startKind: '시작',
    shutdownKind: '종료',
    running: '실행 중',
    stopped: '중지',
    actionInProgress: '{action} 중',
    portLogin: '{port} 포트 / 로그인 필요',
    serverPreparing: '서버 준비 상태를 확인하는 중입니다.',
    healthFailed: '헬스 체크 실패',
    postgresReady: '연결 가능',
    postgresDown: '중지 또는 미설치',
    startupRegistered: '등록됨',
    startupUnregistered: '미등록',
    userUnit: '{count}명',
    sessionUnit: '{count}개',
    noUsers: '사용자가 없습니다.',
    commandRunning: '{title} 실행 중...',
    commandDone: '{title} 완료',
    scriptFailed: '{title} 실패',
    scriptAbnormalExit: '{title} 스크립트가 비정상 종료되었습니다. 서버 액션 로그를 확인해 주세요.',
    kpiReadyTimeout: '{title} 후 서버 준비 상태를 아직 확인하지 못했습니다. 서버 액션 로그를 확인해 주세요.',
    recoveryDone: '복구 재시작이 완료되었습니다.',
    kpiReady: 'KPI 서버가 준비되었습니다.',
    scheduleNotLoaded: '예약 설정을 아직 불러오지 못했습니다.',
    closeLabel: '닫기',
    openLabel: '열기',
    scheduleSettings: '예약 설정',
    serverClose: '서버 닫기',
    serverOpen: '서버 열기',
    recover: '복구',
    startupRegister: '자동실행 등록',
    startupUnregister: '자동실행 해제',
    serverStartAction: '시작',
    recoverAction: '복구',
    tablesLoading: '불러오는 중...',
    noOutput: '출력 없음',
    logEmpty: '로그 파일이 비어 있습니다.',
    usersReloaded: '사용자 목록을 새로고침했습니다.',
    usersReloadFailed: '사용자 목록 새로고침 실패',
    tablesLoaded: 'DB 테이블 목록을 불러왔습니다.',
    tablesFailed: 'DB 테이블 목록 조회 실패',
    statusRefreshed: '상태를 새로고침했습니다.',
    loginUrlUnknown: 'KPI 로그인 URL을 아직 알 수 없습니다.',
    initialLoadFailed: '초기 로드 실패'
  },
  en: {
    documentTitle: 'KPI Operations Console',
    heroEyebrow: 'KPI OPERATIONS COMMANDS',
    heroTitle: 'KPI Operations Console',
    heroSummary: 'Manage KPI runtime, database, and account tasks using this repository port contract.',
    metaRuntime: 'KPI runtime 3104',
    metaDb: 'DB 5400',
    metaConsole: 'Ops console',
    refreshButton: 'Refresh status',
    openKpiButton: 'Open KPI login',
    scheduleLabel: 'Computer schedule',
    kpiLabel: 'KPI runtime 3104',
    postgresLabel: 'PostgreSQL 5400',
    startupLabel: 'Startup autorun',
    resultLabel: 'Latest result',
    checking: 'Checking',
    scheduleInitialSummary: 'Start / shutdown schedule status',
    startupSummary: 'Current user Startup folder',
    resultIdle: 'Waiting',
    resultIdleMeta: 'No task has run yet.',
    tabAriaLabel: 'Operations console sections',
    serverTab: 'Server',
    accountTab: 'Accounts',
    dataReferenceTab: 'Data Paths',
    logsTitle: 'Logs',
    logsSummary: 'Read the latest 60 log lines directly.',
    serverActionsLog: 'Server actions',
    logOutputIdle: 'Select a log.',
    toolsTitle: 'DB / Tools',
    toolsSummary: 'Run DB console and local operations helpers.',
    tablesTitle: 'DB tables',
    tablesSummary: 'View table names directly in this console.',
    loadButton: 'Load',
    tablesOutputIdle: 'Not loaded yet.',
    accountTitle: 'Account management',
    accountSummary: 'Handle owner, staff account, and password tasks.',
    usersTitle: 'Users',
    usersSummary: 'Check account state currently registered in the DB.',
    userCountLabel: 'Users',
    sessionCountLabel: 'Active sessions',
    reloadUsersButton: 'Reload users',
    userIdHeader: 'ID',
    displayNameHeader: 'Display name',
    roleHeader: 'Role',
    lastAccessHeader: 'Last access',
    sessionHeader: 'Session',
    loading: 'Loading...',
    previewSummary: 'Review the current repository folder map, port boundaries, and change history inside this console.',
    dataReferenceTitle: 'Data Reference Paths',
    dataReferenceSummary: 'Review which API, DB record, file store, and permission key each current input screen uses.',
    openNewWindow: 'New window',
    scheduleModalEyebrow: 'COMPUTER SCHEDULE',
    closeButton: 'Close',
    done: 'Done',
    none: 'None',
    active: 'Active',
    noSchedule: 'No schedule',
    bothSchedule: 'Start and shutdown scheduled',
    scheduleStatus: '{kind} scheduled',
    scheduleNoneSummary: 'No start / shutdown schedule',
    scheduleSummary: '{kind} {time}',
    startKind: 'Start',
    shutdownKind: 'Shutdown',
    running: 'Running',
    stopped: 'Stopped',
    actionInProgress: '{action} in progress',
    portLogin: 'Port {port} / login required',
    serverPreparing: 'Checking server readiness.',
    healthFailed: 'Health check failed',
    postgresReady: 'Available',
    postgresDown: 'Stopped or not installed',
    startupRegistered: 'Registered',
    startupUnregistered: 'Not registered',
    userUnit: '{count}',
    sessionUnit: '{count}',
    noUsers: 'No users.',
    commandRunning: 'Running {title}...',
    commandDone: '{title} complete',
    scriptFailed: '{title} failed',
    scriptAbnormalExit: '{title} script exited abnormally. Check the server action log.',
    kpiReadyTimeout: 'Server readiness was not confirmed after {title}. Check the server action log.',
    recoveryDone: 'Recovery restart is complete.',
    kpiReady: 'KPI Demo runtime is ready.',
    scheduleNotLoaded: 'Schedule settings are not loaded yet.',
    closeLabel: 'Close',
    openLabel: 'Open',
    scheduleSettings: 'Schedule',
    serverClose: 'Stop server',
    serverOpen: 'Start server',
    recover: 'Recover',
    startupRegister: 'Register autorun',
    startupUnregister: 'Remove autorun',
    serverStartAction: 'Start',
    recoverAction: 'Recover',
    tablesLoading: 'Loading...',
    noOutput: 'No output',
    logEmpty: 'Log file is empty.',
    usersReloaded: 'Users reloaded.',
    usersReloadFailed: 'User reload failed',
    tablesLoaded: 'DB table list loaded.',
    tablesFailed: 'DB table list failed',
    statusRefreshed: 'Status refreshed.',
    loginUrlUnknown: 'KPI login URL is not available yet.',
    initialLoadFailed: 'Initial load failed'
  }
};
const commandText = {
  en: {
    labels: {
      'server.start': 'Run',
      'server.stop': 'Stop',
      'server.recover': 'Recover',
      'startup.register': 'Register',
      'startup.unregister': 'Remove',
      'system.scheduleShutdown': 'Schedule',
      'account.bootstrapOwner': 'Create',
      'account.createEmployee': 'Create',
      'account.resetPassword': 'Change',
      'account.deleteUser': 'Delete',
      'db.listTables': 'Load',
      'db.openConsole': 'Open',
      'filesystem.openCommandsFolder': 'Open',
      'filesystem.openLogsFolder': 'Open'
    },
    titles: {
      'server.start': 'Start KPI Demo runtime',
      'server.stop': 'Stop KPI Demo runtime',
      'server.recover': 'Recover KPI Demo runtime',
      'startup.register': 'Register KPI autorun',
      'startup.unregister': 'Remove KPI autorun',
      'account.bootstrapOwner': 'Create owner',
      'account.createEmployee': 'Create staff account',
      'account.resetPassword': 'Reset password',
      'account.deleteUser': 'Delete user',
      'db.listTables': 'View DB tables',
      'db.openConsole': 'Open DB console',
      'filesystem.openCommandsFolder': 'Open commands folder',
      'filesystem.openLogsFolder': 'Open logs folder',
      'system.scheduleShutdown': 'Schedule computer start / shutdown'
    },
    descriptions: {
      'server.start': 'Start the 3104 KPI runtime and 5400 PostgreSQL for this repository.',
      'server.stop': 'Stop the KPI Demo runtime and PostgreSQL in order.',
      'server.recover': 'Clean stale runtime state under safe conditions, then start it again.',
      'startup.register': 'Start the KPI Demo runtime when the current user logs in.',
      'startup.unregister': 'Remove the current user autorun entry.',
      'account.bootstrapOwner': 'Create the first owner account locally.',
      'account.createEmployee': 'Create a new account with viewer as the default role.',
      'account.resetPassword': 'Set a new password for the selected user.',
      'account.deleteUser': 'Delete a non-owner account.',
      'db.listTables': 'Show table names in this screen.',
      'db.openConsole': 'Open a psql console in a new PowerShell window.',
      'filesystem.openCommandsFolder': 'Open the existing commands folder in Explorer.',
      'filesystem.openLogsFolder': 'Open the internal-server log folder in Explorer.',
      'system.scheduleShutdown': 'Schedule a start or shutdown time. Start uses sleep/hibernate wake behavior.'
    },
    fields: {
      'account.bootstrapOwner.username': { label: 'Owner ID', placeholder: 'owner' },
      'account.bootstrapOwner.displayName': { label: 'Owner display name', placeholder: 'KPI Owner' },
      'account.bootstrapOwner.password': { label: 'Password' },
      'account.createEmployee.username': { label: 'Staff ID', placeholder: 'staff-01' },
      'account.createEmployee.displayName': { label: 'Staff display name', placeholder: 'Staff name' },
      'account.createEmployee.password': { label: 'Password' },
      'account.createEmployee.roles': { label: 'Role' },
      'account.resetPassword.username': { label: 'Target ID' },
      'account.resetPassword.password': { label: 'New password' },
      'account.deleteUser.username': { label: 'User ID to delete' },
      'account.deleteUser.confirmText': { label: 'Confirmation text', placeholder: 'DELETE' },
      'system.scheduleShutdown.actionType': { label: 'Schedule type' },
      'system.scheduleShutdown.timeText': { label: 'Scheduled time', placeholder: '22:00' }
    },
    options: {
      'system.scheduleShutdown.actionType.start': 'Start',
      'system.scheduleShutdown.actionType.shutdown': 'Shutdown'
    },
    confirmMessages: {
      'server.stop': 'Stop the KPI Demo runtime and local PostgreSQL.',
      'server.recover': 'Recover and restart the KPI Demo runtime.',
      'account.deleteUser': 'Delete this user account.'
    }
  }
};
const serverSummaryTranslations = {
  en: {
    '이미 서버 작업이 진행 중입니다.': 'A server task is already running.',
    'KPI 서버 시작 요청을 보냈습니다.': 'KPI Demo runtime start was requested.',
    'KPI 서버와 로컬 PostgreSQL 종료 요청이 완료되었습니다.': 'KPI Demo runtime and local PostgreSQL stop request completed.',
    '복구 재시작 요청을 보냈습니다.': 'Recovery restart was requested.',
    '복구 재시작이 완료되었습니다.': 'Recovery restart is complete.',
    'KPI 서버가 준비되었습니다.': 'KPI Demo runtime is ready.',
    '로그인 자동실행 등록이 완료되었습니다.': 'Login autorun registration is complete.',
    '로그인 자동실행 해제가 완료되었습니다.': 'Login autorun removal is complete.',
    '오너 생성이 완료되었습니다.': 'Owner creation is complete.',
    '직원 계정 생성이 완료되었습니다.': 'Staff account creation is complete.',
    '비밀번호 재설정이 완료되었습니다.': 'Password reset is complete.',
    '사용자 삭제가 완료되었습니다.': 'User deletion is complete.',
    'DB 콘솔 창을 열었습니다.': 'DB console window was opened.',
    'commands 폴더를 열었습니다.': 'Commands folder was opened.',
    '로그 폴더를 열었습니다.': 'Logs folder was opened.',
    '컴퓨터 시작 예약이 완료되었습니다.': 'Computer start schedule is complete.',
    '컴퓨터 종료 예약이 완료되었습니다.': 'Computer shutdown schedule is complete.'
  }
};
let currentLanguage = readInitialLanguage();
function $(id) {
  return document.getElementById(id);
}
function readInitialLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'ko';
  } catch {
    return 'ko';
  }
}
function t(key, values = {}) {
  const dictionary = i18n[currentLanguage] || i18n.ko;
  const fallback = i18n.ko[key] || key;
  const template = dictionary[key] || fallback;
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => values[name] ?? '');
}
function setLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'ko';
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  } catch {
    // Ignore storage failures in locked-down browser contexts.
  }
  applyLanguage();
}
function getCommandLanguageMap(section) {
  return commandText[currentLanguage]?.[section] || {};
}
function commandTitle(command) {
  return getCommandLanguageMap('titles')[command.key] || command.title;
}
function commandDescription(command) {
  return getCommandLanguageMap('descriptions')[command.key] || compactDescriptionMap[command.key] || command.description;
}
function commandConfirmMessage(command) {
  return getCommandLanguageMap('confirmMessages')[command.key] || command.confirmMessage;
}
function localizeField(command, field) {
  const fieldText = getCommandLanguageMap('fields')[`${command.key}.${field.name}`] || {};
  const options = Array.isArray(field.options)
    ? field.options.map((option) => ({
      ...option,
      label: getCommandLanguageMap('options')[`${command.key}.${field.name}.${option.value}`] || option.label
    }))
    : field.options;
  return {
    ...field,
    label: fieldText.label || field.label,
    placeholder: fieldText.placeholder || field.placeholder || '',
    options
  };
}
function localizeServerSummary(value) {
  if (!value) {
    return value;
  }
  return serverSummaryTranslations[currentLanguage]?.[value] || value;
}
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
function nowLabel() {
  return new Intl.DateTimeFormat(currentLanguage === 'en' ? 'en-US' : 'ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
}
function iconSvg(name) {
  return iconMap[name] || iconMap.spark;
}
function createIcon(name, className = '') {
  const icon = document.createElement('span');
  icon.className = ['ui-icon', className].filter(Boolean).join(' ');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = iconSvg(name);
  return icon;
}
function compactDescription(command) { return commandDescription(command); }
function commandLabel(command) { return getCommandLanguageMap('labels')[command.key] || commandLabelMap[command.key] || commandTitle(command); }
function setTileTone(id, tone) {
  const element = $(id);
  element.classList.remove('status-tone-ok', 'status-tone-warn', 'status-tone-down');
  if (tone) element.classList.add(`status-tone-${tone}`);
}
async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || payload.summary || `request_failed:${response.status}`);
  }
  return payload;
}
function setStatusTone(element, tone) {
  element.classList.remove('status-up', 'status-down', 'status-warn');
  if (tone) {
    element.classList.add(tone);
  }
}
function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
function serverActionLabel(actionKey = '') {
  return actionKey === 'server.recover' ? t('recoverAction') : t('serverStartAction');
}
function isServerLifecycleCommand(commandKey = '') {
  return commandKey === 'server.start' || commandKey === 'server.recover';
}
function getCommand(commandKey) {
  return commandRegistryCache.get(commandKey) || null;
}
function setResult(summary, output = '-') {
  const timeLabel = nowLabel();
  const resultText = summary || t('done');
  $('resultTileSummary').textContent = resultText;
  $('resultTileMeta').textContent = timeLabel;
}
function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const parts = new Intl.DateTimeFormat(currentLanguage === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${map.year || '0000'}-${map.month || '00'}-${map.day || '00'} ${map.hour || '00'}:${map.minute || '00'}:${map.second || '00'}`;
}
function scheduleKindLabel(kind) {
  return kind === 'start' ? t('startKind') : t('shutdownKind');
}
function getActiveScheduleItems(schedule = {}) {
  return ['start', 'shutdown']
    .map((kind) => schedule[kind])
    .filter((item) => item?.active);
}
function renderScheduleStatus(schedule = {}) {
  const activeItems = getActiveScheduleItems(schedule);
  const statusText = activeItems.length === 0
    ? t('noSchedule')
    : activeItems.length === 2
      ? t('bothSchedule')
      : t('scheduleStatus', { kind: scheduleKindLabel(activeItems[0].kind) });
  const summaryText = activeItems.length === 0
    ? t('scheduleNoneSummary')
    : activeItems.map((item) => t('scheduleSummary', { kind: scheduleKindLabel(item.kind), time: item.timeLabel || '-' })).join(' / ');
  $('scheduleStatus').textContent = statusText;
  $('scheduleSummary').textContent = summaryText;
  setStatusTone($('scheduleStatus'), activeItems.length ? 'status-up' : 'status-warn');
  setTileTone('scheduleTile', activeItems.length ? 'ok' : 'warn');
}
function renderStatus(overview) {
  overviewCache = overview;
  $('opsHeaderUrl').textContent = overview.app.localUrl;
  $('opsHeaderUrl').title = overview.app.localUrl;
  $('opsHeaderRoot').textContent = overview.app.commandsRoot;
  $('opsHeaderRoot').title = overview.app.commandsRoot;
  renderScheduleStatus(overview.computerSchedule);

  const serverAction = overview.serverAction || {};
  const serverActionActive = Boolean(serverAction.active);
  const kpiOk = Boolean(overview.kpi.health?.ok);
  $('kpiStatus').textContent = kpiOk
    ? t('running')
    : serverActionActive
      ? t('actionInProgress', { action: serverActionLabel(serverAction.key) })
      : t('stopped');
  $('kpiSummary').textContent = kpiOk
    ? t('portLogin', { port: overview.kpi.port })
    : serverActionActive
      ? (localizeServerSummary(serverAction.summary) || t('serverPreparing'))
      : (overview.kpi.health?.error || t('healthFailed'));
  setStatusTone($('kpiStatus'), kpiOk ? 'status-up' : (serverActionActive ? 'status-warn' : 'status-down'));
  setTileTone('kpiTile', kpiOk ? 'ok' : (serverActionActive ? 'warn' : 'down'));

  const postgresOk = Boolean(overview.postgres?.ok);
  $('postgresStatus').textContent = postgresOk ? t('postgresReady') : t('postgresDown');
  $('postgresSummary').textContent = overview.postgres?.message || '-';
  setStatusTone($('postgresStatus'), postgresOk ? 'status-up' : 'status-down');
  setTileTone('postgresTile', postgresOk ? 'ok' : 'down');

  const startupRegistered = Boolean(overview.startupTaskRegistered);
  $('startupStatus').textContent = startupRegistered ? t('startupRegistered') : t('startupUnregistered');
  setStatusTone($('startupStatus'), startupRegistered ? 'status-up' : 'status-down');
  setTileTone('startupTile', startupRegistered ? 'ok' : 'down');
  setTileTone('resultTile', 'ok');
  renderCardActions(overview);
}
function renderUserStats(users = []) {
  const total = Array.isArray(users) ? users.length : 0;
  const activeSessions = Array.isArray(users)
    ? users.filter((user) => user.session_active).length
    : 0;
  $('userCountStat').textContent = t('userUnit', { count: total });
  $('sessionCountStat').textContent = t('sessionUnit', { count: activeSessions });
}
function renderUsers(users, errorMessage = '') {
  const tbody = $('usersTableBody');
  if (errorMessage) {
    renderUserStats([]);
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(errorMessage)}</td></tr>`;
    return;
  }
  if (!Array.isArray(users) || users.length === 0) {
    renderUserStats([]);
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(t('noUsers'))}</td></tr>`;
    return;
  }
  renderUserStats(users);
  tbody.innerHTML = users.map((user) => {
    const roles = Array.isArray(user.roles) && user.roles.length ? user.roles.join(', ') : '-';
    const lastAccess = formatDateTime(user.last_access_at);
    const sessionClass = user.session_active ? 'is-active' : 'is-inactive';
    const sessionLabel = user.session_active ? t('active') : t('none');
    return `
      <tr>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.display_name || '')}</td>
        <td>${escapeHtml(roles)}</td>
        <td>${escapeHtml(lastAccess)}</td>
        <td class="session-cell">
          <span class="session-toggle ${sessionClass}" role="img" aria-label="${sessionLabel}" title="${sessionLabel}"></span>
        </td>
      </tr>
    `;
  }).join('');
}
function applyOverview(overview) {
  renderStatus(overview);
  renderUsers(overview.users, overview.usersError);
  renderCommands(overview.commandRegistry || []);
  return overview;
}
async function waitForKpiReady(command, options = {}) {
  const timeoutMs = options.timeoutMs ?? 180000;
  const pollMs = options.pollMs ?? 2000;
  const expectedStartedAt = String(options.expectedStartedAt || '').trim();
  const deadline = Date.now() + timeoutMs;
  let lastOverview = null;

  while (Date.now() < deadline) {
    await sleep(pollMs);
    try {
      const overview = applyOverview(await fetchJson('/api/overview'));
      lastOverview = overview;
      const serverAction = overview.serverAction || {};
      const isExpectedAction = Boolean(expectedStartedAt)
        && serverAction.key === command.key
        && serverAction.startedAt === expectedStartedAt;

      if (isExpectedAction && !serverAction.active && serverAction.lastExitCode === 0 && overview.kpi?.health?.ok) {
        return {
          ok: true,
          overview
        };
      }

      if (isExpectedAction && !serverAction.active && serverAction.lastExitCode !== null && serverAction.lastExitCode !== 0) {
        return {
          ok: false,
          overview,
          error: t('scriptAbnormalExit', { title: commandTitle(command) })
        };
      }
    } catch {
      // Ignore transient polling failures while the server is starting.
    }
  }

  return {
    ok: false,
    overview: lastOverview,
    error: t('kpiReadyTimeout', { title: commandTitle(command) })
  };
}
async function executeCommand(command, payload = {}, options = {}) {
  const confirmMessage = commandConfirmMessage(command);
  if (confirmMessage && !window.confirm(confirmMessage)) {
    return null;
  }
  const shouldWaitForKpiReady = options.waitForKpiReady === true;
  setResult(t('commandRunning', { title: commandTitle(command) }));
  const result = await fetchJson(`/api/actions/${command.key}`, {
    method: 'POST',
    headers: actionHeader,
    body: JSON.stringify(payload)
  });
  if (command.key === 'db.listTables') {
    $('tablesOutput').textContent = result.output || t('noOutput');
  }
  setResult(localizeServerSummary(result.summary) || t('commandDone', { title: commandTitle(command) }), result.output || '-');
  if (shouldWaitForKpiReady) {
    const waitResult = await waitForKpiReady(command, {
      timeoutMs: options.timeoutMs,
      expectedStartedAt: result?.data?.serverAction?.startedAt
    });
    if (!waitResult.ok) {
      setResult(waitResult.error || t('scriptFailed', { title: commandTitle(command) }));
    } else {
      setResult(
        command.key === 'server.recover'
          ? t('recoveryDone')
          : t('kpiReady')
      );
    }
  } else {
    await reloadOverview();
  }
  if (typeof options.onSuccess === 'function') {
    options.onSuccess(result);
  }
  return result;
}
function buildInlineButton({ label, iconName, variant = 'secondary', onClick, disabled = false }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = variant === 'primary' ? 'primary-button' : 'secondary-button';
  button.disabled = disabled;
  button.appendChild(createIcon(iconName, 'button-icon'));
  button.append(label);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await onClick();
    } finally {
      button.disabled = false;
    }
  });
  return button;
}
function buildActionItem(command) {
  const wrapper = document.createElement('div');
  wrapper.className = 'action-row';
  const copy = document.createElement('div');
  copy.className = 'action-copy';
  const copyHead = document.createElement('div');
  copyHead.className = 'action-copy-head';
  const actionIcon = createIcon(commandIconMap[command.key] || 'spark', 'action-icon');
  copyHead.appendChild(actionIcon);
  const titleWrap = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = commandTitle(command);
  titleWrap.appendChild(title);
  copyHead.appendChild(titleWrap);
  copy.appendChild(copyHead);
  const description = document.createElement('p');
  description.textContent = compactDescription(command);
  copy.appendChild(description);
  const action = document.createElement('div');
  action.className = 'action-cta';
  action.appendChild(buildInlineButton({
    label: commandLabel(command),
    iconName: commandIconMap[command.key] || 'spark',
    variant: command.key.includes('stop') || command.key.includes('delete') ? 'secondary' : 'primary',
    onClick: async () => {
      try {
        await executeCommand(command);
      } catch (error) {
        setResult(t('scriptFailed', { title: commandTitle(command) }), error.message);
      }
    }
  }));
  wrapper.appendChild(copy);
  wrapper.appendChild(action);
  return wrapper;
}
function buildField(controlConfig) {
  let control;
  if (controlConfig.type === 'select') {
    control = document.createElement('select');
    for (const option of controlConfig.options || []) {
      const optionNode = document.createElement('option');
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      if (option.value === controlConfig.defaultValue) {
        optionNode.selected = true;
      }
      control.appendChild(optionNode);
    }
  } else {
    control = document.createElement('input');
    control.type = controlConfig.type || 'text';
    control.placeholder = controlConfig.placeholder || '';
    control.autocomplete = controlConfig.type === 'password' ? 'new-password' : 'off';
  }
  control.name = controlConfig.name;
  control.required = controlConfig.required !== false;
  return control;
}
function renderStaticIcons() {
  document.querySelectorAll('[data-icon]').forEach((node) => {
    node.innerHTML = iconSvg(node.dataset.icon);
  });
}
function syncRepositoryMapLanguage() {
  const frames = [
    { id: 'repositoryMapFrame', path: '/repository-map.html' },
    { id: 'dataReferenceFrame', path: '/data-reference-map.html' }
  ];
  for (const { id, path } of frames) {
    const frame = $(id);
    if (!frame) {
      continue;
    }
    const nextSrc = `${path}?lang=${currentLanguage}`;
    if (frame.getAttribute('src') !== nextSrc) {
      frame.setAttribute('src', nextSrc);
    }
    try {
      frame.contentWindow?.postMessage({ type: 'kpi-ops-language', language: currentLanguage }, window.location.origin);
    } catch {
      // The frame is same-origin, but ignore transient reload timing.
    }
  }
}
function applyLanguage() {
  document.documentElement.lang = currentLanguage === 'en' ? 'en' : 'ko';
  document.title = t('documentTitle');
  document.querySelectorAll('[data-i18n-key]').forEach((element) => {
    element.textContent = t(element.dataset.i18nKey);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll('[data-language]').forEach((button) => {
    const isActive = button.dataset.language === currentLanguage;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  syncRepositoryMapLanguage();
  if (overviewCache) {
    renderStatus(overviewCache);
    renderUsers(overviewCache.users, overviewCache.usersError);
    renderCommands(overviewCache.commandRegistry || []);
  }
}
function closeScheduleModal() {
  $('scheduleModal').hidden = true;
  document.body.classList.remove('modal-open');
}
function openScheduleModal() {
  const command = getCommand('system.scheduleShutdown');
  if (!command) {
    setResult(t('scheduleNotLoaded'));
    return;
  }
  $('scheduleModalTitle').textContent = commandTitle(command);
  $('scheduleModalDescription').textContent = compactDescription(command);
  const form = $('scheduleModalForm');
  form.innerHTML = '';
  const groupedFields = [];
  const localizedFields = (command.fields || []).map((field) => localizeField(command, field));
  for (let index = 0; index < localizedFields.length; index += 2) {
    groupedFields.push(localizedFields.slice(index, index + 2));
  }
  for (const group of groupedFields) {
    const row = document.createElement('div');
    row.className = 'field-row';
    if (group.length === 1) {
      row.classList.add('field-row-single');
    }
    for (const field of group) {
      const label = document.createElement('label');
      const labelText = document.createElement('span');
      labelText.textContent = field.label;
      label.appendChild(labelText);
      label.appendChild(buildField(field));
      row.appendChild(label);
    }
    form.appendChild(row);
  }
  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'secondary-button';
  closeButton.textContent = t('closeLabel');
  closeButton.addEventListener('click', closeScheduleModal);
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'primary-button';
  submitButton.textContent = commandLabel(command);
  actions.append(closeButton, submitButton);
  form.appendChild(actions);
  form.onsubmit = async (event) => {
    event.preventDefault();
    const payload = {};
    for (const field of localizedFields) {
      const value = form.elements[field.name]?.value ?? '';
      payload[field.name] = String(value).trim();
    }
    submitButton.disabled = true;
    closeButton.disabled = true;
    try {
      const result = await executeCommand(command, payload, {
        onSuccess: () => {
          closeScheduleModal();
        }
      });
      if (result) {
        form.reset();
      }
    } catch (error) {
      setResult(t('scriptFailed', { title: commandTitle(command) }), error.message);
    } finally {
      submitButton.disabled = false;
      closeButton.disabled = false;
    }
  };
  $('scheduleModal').hidden = false;
  document.body.classList.add('modal-open');
}
function buildFormItem(command) {
  const wrapper = document.createElement('details');
  wrapper.className = 'form-disclosure';
  const summary = document.createElement('summary');
  const summaryText = document.createElement('div');
  summaryText.className = 'form-summary-text';
  const summaryHead = document.createElement('div');
  summaryHead.className = 'action-copy-head';
  summaryHead.appendChild(createIcon(commandIconMap[command.key] || 'spark', 'action-icon'));
  const title = document.createElement('strong');
  title.textContent = commandTitle(command);
  summaryHead.appendChild(title);
  summaryText.appendChild(summaryHead);
  const description = document.createElement('span');
  description.textContent = compactDescription(command);
  summaryText.appendChild(description);
  const toggle = document.createElement('span');
  toggle.className = 'form-summary-toggle';
  toggle.textContent = t('openLabel');
  summary.appendChild(summaryText);
  summary.appendChild(toggle);
  wrapper.appendChild(summary);
  const body = document.createElement('div');
  body.className = 'form-body';
  const form = document.createElement('form');
  form.className = 'field-grid';
  const groupedFields = [];
  const localizedFields = (command.fields || []).map((field) => localizeField(command, field));
  for (let index = 0; index < localizedFields.length; index += 2) {
    groupedFields.push(localizedFields.slice(index, index + 2));
  }
  for (const group of groupedFields) {
    const row = document.createElement('div');
    row.className = 'field-row';
    if (group.length === 1) {
      row.classList.add('field-row-single');
    }
    for (const field of group) {
      const label = document.createElement('label');
      const labelText = document.createElement('span');
      labelText.textContent = field.label;
      label.appendChild(labelText);
      label.appendChild(buildField(field));
      row.appendChild(label);
    }
    form.appendChild(row);
  }
  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = command.key.includes('delete') ? 'secondary-button' : 'primary-button';
  button.textContent = commandLabel(command);
  actions.appendChild(button);
  form.appendChild(actions);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    const payload = {};
    for (const field of localizedFields) {
      const value = form.elements[field.name]?.value ?? '';
      payload[field.name] = String(value).trim();
    }
    try {
      const result = await executeCommand(command, payload, {
        onSuccess: () => {
          form.reset();
          wrapper.open = false;
        }
      });
      if (!result) {
        return;
      }
    } catch (error) {
      setResult(t('scriptFailed', { title: commandTitle(command) }), error.message);
    } finally {
      button.disabled = false;
    }
  });
  body.appendChild(form);
  wrapper.appendChild(body);
  const syncToggleLabel = () => {
    toggle.textContent = wrapper.open ? t('closeLabel') : t('openLabel');
  };
  wrapper.addEventListener('toggle', syncToggleLabel);
  syncToggleLabel();
  return wrapper;
}
function renderCommands(commands) {
  const accountActions = $('accountActions');
  const toolActions = $('toolActions');
  accountActions.innerHTML = '';
  toolActions.innerHTML = '';
  commandRegistryCache = new Map(commands.map((command) => [command.key, command]));
  renderCardActions(overviewCache);

  for (const command of commands) {
    if ([
      'server.start',
      'server.stop',
      'server.recover',
      'startup.register',
      'startup.unregister',
      'system.scheduleShutdown'
    ].includes(command.key)) {
      continue;
    }
    if (command.category === 'account') {
      accountActions.appendChild(buildFormItem(command));
      continue;
    }
    if (command.category === 'db' || command.category === 'tools') {
      toolActions.appendChild(buildActionItem(command));
    }
  }
}
function renderCardActions(overview = null) {
  const nextOverview = overview || overviewCache;
  const scheduleActions = $('scheduleActions');
  const kpiActions = $('kpiActions');
  const startupActions = $('startupActions');
  if (!scheduleActions || !kpiActions || !startupActions) {
    return;
  }

  scheduleActions.innerHTML = '';
  kpiActions.innerHTML = '';
  startupActions.innerHTML = '';

  const scheduleCommand = getCommand('system.scheduleShutdown');
  if (scheduleCommand) {
    scheduleActions.appendChild(buildInlineButton({
      label: t('scheduleSettings'),
      iconName: 'clock',
      variant: 'secondary',
      onClick: async () => {
        openScheduleModal();
      }
    }));
  }

  const serverRunning = Boolean(nextOverview?.kpi?.health?.ok);
  const serverAction = nextOverview?.serverAction || {};
  const serverActionActive = Boolean(serverAction.active);
  const serverCommand = getCommand(serverRunning ? 'server.stop' : 'server.start');
  if (serverCommand) {
    kpiActions.appendChild(buildInlineButton({
      label: serverActionActive
        ? t('actionInProgress', { action: serverActionLabel(serverAction.key) })
        : (serverRunning ? t('serverClose') : t('serverOpen')),
      iconName: commandIconMap[serverCommand.key] || 'server',
      variant: serverRunning ? 'secondary' : 'primary',
      disabled: serverActionActive,
      onClick: async () => {
        try {
          await executeCommand(
            serverCommand,
            {},
            isServerLifecycleCommand(serverCommand.key)
              ? { waitForKpiReady: true, timeoutMs: 180000 }
              : {}
          );
        } catch (error) {
          setResult(t('scriptFailed', { title: commandTitle(serverCommand) }), error.message);
        }
      }
    }));
  }

  const recoverCommand = getCommand('server.recover');
  if (recoverCommand) {
    kpiActions.appendChild(buildInlineButton({
      label: t('recover'),
      iconName: 'refresh',
      variant: 'secondary',
      disabled: serverActionActive,
      onClick: async () => {
        try {
          await executeCommand(recoverCommand, {}, {
            waitForKpiReady: true,
            timeoutMs: 240000
          });
        } catch (error) {
          setResult(t('scriptFailed', { title: commandTitle(recoverCommand) }), error.message);
        }
      }
    }));
  }

  const startupRegistered = Boolean(nextOverview?.startupTaskRegistered);
  const startupCommand = getCommand(startupRegistered ? 'startup.unregister' : 'startup.register');
  if (startupCommand) {
    startupActions.appendChild(buildInlineButton({
      label: startupRegistered ? t('startupUnregister') : t('startupRegister'),
      iconName: commandIconMap[startupCommand.key] || 'clock',
      variant: startupRegistered ? 'secondary' : 'primary',
      onClick: async () => {
        try {
          await executeCommand(startupCommand);
        } catch (error) {
          setResult(t('scriptFailed', { title: commandTitle(startupCommand) }), error.message);
        }
      }
    }));
  }
}
function normalizeTabName(tabName = '') {
  const normalized = String(tabName || '').trim().toLowerCase();
  if (normalized === TAB_DATA || normalized === TAB_PREVIEW || normalized === TAB_REFERENCE) {
    return normalized;
  }
  return TAB_SERVER;
}
function getRequestedTab() {
  const hash = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
  return normalizeTabName(hash);
}
function syncTabHash(tabName) {
  const normalized = normalizeTabName(tabName);
  if (window.location.hash === `#${normalized}`) {
    return;
  }
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${normalized}`);
}
async function hydrateTab(tabName) {
  const normalized = normalizeTabName(tabName);
  if (normalized === TAB_SERVER) {
    await loadLog('serverStdout');
    return;
  }
  if (normalized === TAB_PREVIEW) {
    return;
  }
  if (normalized === TAB_REFERENCE) {
    return;
  }
  await loadTables();
}
function activateTab(tabName, options = {}) {
  const normalized = normalizeTabName(tabName);
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === normalized);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.tabPanel === normalized);
  });
  if (options.syncHash !== false) {
    syncTabHash(normalized);
  }
  if (options.hydrate !== false) {
    void hydrateTab(normalized);
  }
}
function bindDragScroll(element) {
  if (element.dataset.dragBound === 'true') {
    return;
  }
  element.dataset.dragBound = 'true';
  const dragThreshold = 4;
  const dragSpeed = 1.45;
  const edgeZone = 28;
  const edgeBoostMax = 18;
  let active = false;
  let dragging = false;
  let pointerId = null;
  let activePointerType = 'mouse';
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;
  let lastClientX = 0;
  let lastClientY = 0;
  let edgeFrame = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const edgeDelta = (position, min, max) => {
    if (position < min + edgeZone) {
      const ratio = (min + edgeZone - position) / edgeZone;
      return -Math.ceil(clamp(ratio, 0, 1) * edgeBoostMax);
    }
    if (position > max - edgeZone) {
      const ratio = (position - (max - edgeZone)) / edgeZone;
      return Math.ceil(clamp(ratio, 0, 1) * edgeBoostMax);
    }
    return 0;
  };
  const stopEdgeScroll = () => {
    if (!edgeFrame) {
      return;
    }
    cancelAnimationFrame(edgeFrame);
    edgeFrame = 0;
  };
  const runEdgeScroll = () => {
    if (!(active && dragging)) {
      edgeFrame = 0;
      return;
    }
    const rect = element.getBoundingClientRect();
    const extraX = edgeDelta(lastClientX, rect.left, rect.right);
    const extraY = edgeDelta(lastClientY, rect.top, rect.bottom);
    if (extraX || extraY) {
      scrollLeft += extraX;
      scrollTop += extraY;
      element.scrollLeft += extraX;
      element.scrollTop += extraY;
    }
    edgeFrame = requestAnimationFrame(runEdgeScroll);
  };
  const ensureEdgeScroll = () => {
    if (!edgeFrame) {
      edgeFrame = requestAnimationFrame(runEdgeScroll);
    }
  };
  const stop = () => {
    if (!active) {
      return;
    }
    active = false;
    dragging = false;
    pointerId = null;
    stopEdgeScroll();
    element.classList.remove('is-dragging');
  };
  const start = (clientX, clientY, nextPointerId = null, nextPointerType = 'mouse') => {
    active = true;
    dragging = false;
    pointerId = nextPointerId;
    activePointerType = nextPointerType || 'mouse';
    startX = clientX;
    startY = clientY;
    scrollLeft = element.scrollLeft;
    scrollTop = element.scrollTop;
    lastClientX = clientX;
    lastClientY = clientY;
  };
  const move = (clientX, clientY, event) => {
    if (!active) {
      return;
    }
    lastClientX = clientX;
    lastClientY = clientY;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (!dragging && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
      dragging = true;
      element.classList.add('is-dragging');
    }

    if (!dragging) {
      return;
    }

    event.preventDefault();
    const direction = activePointerType === 'touch' ? -1 : 1;
    element.scrollLeft = scrollLeft + (deltaX * dragSpeed * direction);
    element.scrollTop = scrollTop + (deltaY * dragSpeed * direction);
    ensureEdgeScroll();
  };
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }
    start(event.clientX, event.clientY, event.pointerId, event.pointerType);
    if (typeof element.setPointerCapture === 'function') {
      element.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  });
  element.addEventListener('pointermove', (event) => {
    if (pointerId !== null && event.pointerId !== pointerId) {
      return;
    }
    move(event.clientX, event.clientY, event);
  });
  const finishPointer = (event) => {
    if (pointerId !== null && event.pointerId !== pointerId) {
      return;
    }
    stop();
  };
  element.addEventListener('pointerup', finishPointer);
  element.addEventListener('pointercancel', finishPointer);
  element.addEventListener('lostpointercapture', stop);
  element.addEventListener('dragstart', (event) => {
    event.preventDefault();
  });
}
function bindDragScrollTargets() {
  document.querySelectorAll('.drag-scroll').forEach(bindDragScroll);
}
async function reloadOverview() {
  return applyOverview(await fetchJson('/api/overview'));
}
async function reloadUsers() {
  try {
    const payload = await fetchJson('/api/users');
    renderUsers(payload.users, payload.error || '');
    setResult(t('usersReloaded'));
  } catch (error) {
    renderUsers([], error.message);
    setResult(t('usersReloadFailed'), error.message);
  }
}
async function loadTables() {
  $('tablesOutput').textContent = t('tablesLoading');
  try {
    const payload = await fetchJson('/api/db/tables');
    $('tablesOutput').textContent = payload.output || t('noOutput');
    setResult(t('tablesLoaded'), payload.output || '-');
  } catch (error) {
    $('tablesOutput').textContent = error.message;
    setResult(t('tablesFailed'), error.message);
  }
}
async function loadLog(logKey) {
  document.querySelectorAll('.log-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.logKey === logKey);
  });
  $('logOutput').textContent = t('tablesLoading');
  try {
    const payload = await fetchJson(`/api/logs/${logKey}`);
    $('logOutput').textContent = payload.text || t('logEmpty');
  } catch (error) {
    $('logOutput').textContent = error.message;
  }
}
function bindStaticEvents() {
  $('refreshButton').addEventListener('click', async () => {
    await reloadOverview();
    setResult(t('statusRefreshed'));
  });
  $('reloadUsersButton').addEventListener('click', async () => {
    await reloadUsers();
  });
  $('loadTablesButton').addEventListener('click', async () => {
    await loadTables();
  });
  $('openKpiButton').addEventListener('click', () => {
    const url = overviewCache?.kpi?.loginUrl;
    if (!url) {
      setResult(t('loginUrlUnknown'));
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  document.querySelectorAll('[data-language]').forEach((button) => {
    button.addEventListener('click', () => {
      setLanguage(button.dataset.language);
    });
  });
  document.querySelectorAll('.log-button').forEach((button) => {
    button.addEventListener('click', async () => {
      await loadLog(button.dataset.logKey);
    });
  });
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      activateTab(button.dataset.tab);
    });
  });
  $('scheduleModalClose').addEventListener('click', closeScheduleModal);
  $('scheduleModal').addEventListener('click', (event) => {
    if (event.target?.dataset?.modalClose === 'true') {
      closeScheduleModal();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('scheduleModal').hidden) {
      closeScheduleModal();
    }
  });
  window.addEventListener('hashchange', () => {
    activateTab(getRequestedTab(), { syncHash: false });
  });
}
async function bootstrap() {
  renderStaticIcons();
  bindDragScrollTargets();
  bindStaticEvents();
  applyLanguage();
  const initialTab = getRequestedTab();
  activateTab(initialTab, { hydrate: false });
  await reloadOverview();
  await hydrateTab(initialTab);
}
bootstrap().catch((error) => {
  setResult(t('initialLoadFailed'), error.message);
});

