const actionHeader = {
  'X-KPI-Ops-Request': 'true',
  'Content-Type': 'application/json'
};
const TAB_SERVER = 'server';
const TAB_DATA = 'data';
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
  'server.start': '3100 런타임과 5434 DB를 올립니다. 로그인은 1234 / 1234입니다.',
  'server.stop': '3100 런타임과 5434 DB를 순서대로 종료합니다.',
  'server.recover': '3100 런타임 흔적을 정리하고 다시 올립니다.',
  'startup.register': '현재 사용자 로그인 시 자동으로 서버를 올립니다.',
  'startup.unregister': '현재 사용자 자동실행을 해제합니다.',
  'system.scheduleShutdown': '시작 또는 종료 시간을 예약합니다.',
  'db.listTables': '테이블 이름만 바로 확인합니다.',
  'db.openConsole': 'psql 콘솔 창을 엽니다.',
  'filesystem.openCommandsFolder': 'commands 폴더를 엽니다.',
  'filesystem.openLogsFolder': '로그 폴더를 엽니다.'
};
function $(id) {
  return document.getElementById(id);
}
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
function nowLabel() {
  return new Intl.DateTimeFormat('ko-KR', {
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
function compactDescription(command) { return compactDescriptionMap[command.key] || command.description; }
function commandLabel(command) { return commandLabelMap[command.key] || command.title; }
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
  return actionKey === 'server.recover' ? '복구' : '시작';
}
function isServerLifecycleCommand(commandKey = '') {
  return commandKey === 'server.start' || commandKey === 'server.recover';
}
function getCommand(commandKey) {
  return commandRegistryCache.get(commandKey) || null;
}
function setResult(summary, output = '-') {
  const timeLabel = nowLabel();
  const resultText = summary || '완료';
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
  const parts = new Intl.DateTimeFormat('ko-KR', {
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
  return kind === 'start' ? '시작' : '종료';
}
function getActiveScheduleItems(schedule = {}) {
  return ['start', 'shutdown']
    .map((kind) => schedule[kind])
    .filter((item) => item?.active);
}
function renderScheduleStatus(schedule = {}) {
  const activeItems = getActiveScheduleItems(schedule);
  const statusText = activeItems.length === 0
    ? '예약 없음'
    : activeItems.length === 2
      ? '시작·종료 예약'
      : `${scheduleKindLabel(activeItems[0].kind)} 예약`;
  const summaryText = activeItems.length === 0
    ? '시작 / 종료 예약 없음'
    : activeItems.map((item) => `${scheduleKindLabel(item.kind)} ${item.timeLabel || '-'}`).join(' / ');
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
    ? '실행 중'
    : serverActionActive
      ? `${serverActionLabel(serverAction.key)} 중`
      : '중지';
  $('kpiSummary').textContent = kpiOk
    ? `${overview.kpi.port} 포트 / 예시 로그인 1234 / 1234`
    : serverActionActive
      ? (serverAction.summary || '서버 준비 상태를 확인하는 중입니다.')
      : (overview.kpi.health?.error || '헬스 체크 실패');
  setStatusTone($('kpiStatus'), kpiOk ? 'status-up' : (serverActionActive ? 'status-warn' : 'status-down'));
  setTileTone('kpiTile', kpiOk ? 'ok' : (serverActionActive ? 'warn' : 'down'));

  const postgresOk = Boolean(overview.postgres?.ok);
  $('postgresStatus').textContent = postgresOk ? '연결 가능' : '중지 또는 미설치';
  $('postgresSummary').textContent = overview.postgres?.message || '-';
  setStatusTone($('postgresStatus'), postgresOk ? 'status-up' : 'status-down');
  setTileTone('postgresTile', postgresOk ? 'ok' : 'down');

  const startupRegistered = Boolean(overview.startupTaskRegistered);
  $('startupStatus').textContent = startupRegistered ? '등록됨' : '미등록';
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
  $('userCountStat').textContent = `${total}명`;
  $('sessionCountStat').textContent = `${activeSessions}개`;
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
    tbody.innerHTML = '<tr><td colspan="5">사용자가 없습니다.</td></tr>';
    return;
  }
  renderUserStats(users);
  tbody.innerHTML = users.map((user) => {
    const roles = Array.isArray(user.roles) && user.roles.length ? user.roles.join(', ') : '-';
    const lastAccess = formatDateTime(user.last_access_at);
    const sessionClass = user.session_active ? 'is-active' : 'is-inactive';
    const sessionLabel = user.session_active ? '활성' : '없음';
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
          error: `${command.title} 스크립트가 비정상 종료되었습니다. 서버 액션 로그를 확인해 주세요.`
        };
      }
    } catch {
      // Ignore transient polling failures while the server is starting.
    }
  }

  return {
    ok: false,
    overview: lastOverview,
    error: `${command.title} 후 서버 준비 상태를 아직 확인하지 못했습니다. 서버 액션 로그를 확인해 주세요.`
  };
}
async function executeCommand(command, payload = {}, options = {}) {
  if (command.confirmMessage && !window.confirm(command.confirmMessage)) {
    return null;
  }
  const shouldWaitForKpiReady = options.waitForKpiReady === true;
  setResult(`${command.title} 실행 중...`);
  const result = await fetchJson(`/api/actions/${command.key}`, {
    method: 'POST',
    headers: actionHeader,
    body: JSON.stringify(payload)
  });
  if (command.key === 'db.listTables') {
    $('tablesOutput').textContent = result.output || '출력 없음';
  }
  setResult(result.summary || `${command.title} 완료`, result.output || '-');
  if (shouldWaitForKpiReady) {
    const waitResult = await waitForKpiReady(command, {
      timeoutMs: options.timeoutMs,
      expectedStartedAt: result?.data?.serverAction?.startedAt
    });
    if (!waitResult.ok) {
      setResult(waitResult.error || `${command.title} 상태 확인 실패`);
    } else {
      setResult(
        command.key === 'server.recover'
          ? '복구 재시작이 완료되었습니다.'
          : 'KPI 서버가 준비되었습니다.'
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
  title.textContent = command.title;
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
        setResult(`${command.title} 실패`, error.message);
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
    control.value = controlConfig.defaultValue || '';
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
function closeScheduleModal() {
  $('scheduleModal').hidden = true;
  document.body.classList.remove('modal-open');
}
function openScheduleModal() {
  const command = getCommand('system.scheduleShutdown');
  if (!command) {
    setResult('예약 설정을 아직 불러오지 못했습니다.');
    return;
  }
  $('scheduleModalDescription').textContent = compactDescription(command);
  const form = $('scheduleModalForm');
  form.innerHTML = '';
  const groupedFields = [];
  for (let index = 0; index < (command.fields || []).length; index += 2) {
    groupedFields.push(command.fields.slice(index, index + 2));
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
  closeButton.textContent = '닫기';
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
    for (const field of command.fields || []) {
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
      setResult(`${command.title} 실패`, error.message);
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
  title.textContent = command.title;
  summaryHead.appendChild(title);
  summaryText.appendChild(summaryHead);
  const description = document.createElement('span');
  description.textContent = compactDescription(command);
  summaryText.appendChild(description);
  const toggle = document.createElement('span');
  toggle.className = 'form-summary-toggle';
  toggle.textContent = '열기';
  summary.appendChild(summaryText);
  summary.appendChild(toggle);
  wrapper.appendChild(summary);
  const body = document.createElement('div');
  body.className = 'form-body';
  const form = document.createElement('form');
  form.className = 'field-grid';
  const groupedFields = [];
  for (let index = 0; index < (command.fields || []).length; index += 2) {
    groupedFields.push(command.fields.slice(index, index + 2));
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
    for (const field of command.fields || []) {
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
      setResult(`${command.title} 실패`, error.message);
    } finally {
      button.disabled = false;
    }
  });
  body.appendChild(form);
  wrapper.appendChild(body);
  const syncToggleLabel = () => {
    toggle.textContent = wrapper.open ? '닫기' : '열기';
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
      label: '예약 설정',
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
        ? `${serverActionLabel(serverAction.key)} 진행 중`
        : (serverRunning ? '서버 닫기' : '서버 열기'),
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
          setResult(`${serverCommand.title} 실패`, error.message);
        }
      }
    }));
  }

  const recoverCommand = getCommand('server.recover');
  if (recoverCommand) {
    kpiActions.appendChild(buildInlineButton({
      label: '복구',
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
          setResult(`${recoverCommand.title} 실패`, error.message);
        }
      }
    }));
  }

  const startupRegistered = Boolean(nextOverview?.startupTaskRegistered);
  const startupCommand = getCommand(startupRegistered ? 'startup.unregister' : 'startup.register');
  if (startupCommand) {
    startupActions.appendChild(buildInlineButton({
      label: startupRegistered ? '자동실행 해제' : '자동실행 등록',
      iconName: commandIconMap[startupCommand.key] || 'clock',
      variant: startupRegistered ? 'secondary' : 'primary',
      onClick: async () => {
        try {
          await executeCommand(startupCommand);
        } catch (error) {
          setResult(`${startupCommand.title} 실패`, error.message);
        }
      }
    }));
  }
}
function normalizeTabName(tabName = '') {
  return String(tabName || '').trim().toLowerCase() === TAB_DATA ? TAB_DATA : TAB_SERVER;
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
    setResult('사용자 목록을 새로고침했습니다.');
  } catch (error) {
    renderUsers([], error.message);
    setResult('사용자 목록 새로고침 실패', error.message);
  }
}
async function loadTables() {
  $('tablesOutput').textContent = '불러오는 중...';
  try {
    const payload = await fetchJson('/api/db/tables');
    $('tablesOutput').textContent = payload.output || '출력 없음';
    setResult('DB 테이블 목록을 불러왔습니다.', payload.output || '-');
  } catch (error) {
    $('tablesOutput').textContent = error.message;
    setResult('DB 테이블 목록 조회 실패', error.message);
  }
}
async function loadLog(logKey) {
  document.querySelectorAll('.log-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.logKey === logKey);
  });
  $('logOutput').textContent = '불러오는 중...';
  try {
    const payload = await fetchJson(`/api/logs/${logKey}`);
    $('logOutput').textContent = payload.text || '로그 파일이 비어 있습니다.';
  } catch (error) {
    $('logOutput').textContent = error.message;
  }
}
function bindStaticEvents() {
  $('refreshButton').addEventListener('click', async () => {
    await reloadOverview();
    setResult('상태를 새로고침했습니다.');
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
      setResult('KPI 로그인 URL을 아직 알 수 없습니다.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
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
  const initialTab = getRequestedTab();
  activateTab(initialTab, { hydrate: false });
  await reloadOverview();
  await hydrateTab(initialTab);
}
bootstrap().catch((error) => {
  setResult('초기 로드 실패', error.message);
});

