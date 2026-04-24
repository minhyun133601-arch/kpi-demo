import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const internalServerRoot = path.resolve(__dirname, '..');
const execFileAsync = promisify(execFile);

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createTempCredentialSet() {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    username: `codex.e2e.${token}`,
    password: `Codex!${token}!Aa1`,
  };
}

async function runLocalUserScript(scriptName, args) {
  const scriptPath = path.join(internalServerRoot, 'src', 'scripts', scriptName);
  const result = await execFileAsync(process.execPath, [scriptPath, ...args], {
    cwd: internalServerRoot,
    env: process.env,
  });
  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '').trim();
  const raw = stdout || stderr;
  return {
    stdout,
    stderr,
    parsed: raw ? JSON.parse(raw) : null,
  };
}

async function createTempAdminUser() {
  const credentials = createTempCredentialSet();
  const { parsed } = await runLocalUserScript('createManagedUserLocal.js', [
    `--username=${credentials.username}`,
    '--displayName=Codex E2E',
    `--password=${credentials.password}`,
    '--roles=admin',
  ]);
  if (!parsed?.ok) {
    throw new Error(parsed?.error || 'temp_admin_create_failed');
  }
  return credentials;
}

async function deleteTempUser(username) {
  const { parsed } = await runLocalUserScript('deleteUser.js', [`--username=${username}`]);
  if (!parsed?.ok && parsed?.error !== 'user_not_found') {
    throw new Error(parsed?.error || 'temp_user_delete_failed');
  }
}

async function resolveBootstrapStatus(page, baseURL) {
  const response = await page.request.get(new URL('/api/bootstrap/status', baseURL).toString());
  expect(response.ok(), 'bootstrap status should be reachable').toBeTruthy();
  const payload = await response.json();
  expect(payload?.ok, 'bootstrap status payload should be ok').toBeTruthy();
  return payload;
}

function isLoginRequired(bootstrapStatus) {
  return Boolean(bootstrapStatus?.authEnabled && bootstrapStatus?.loginEnabled);
}

async function clickSidebarButton(page, label) {
  const matcher = new RegExp(`^\\s*${escapeRegex(label)}\\s*$`);
  const button = page.locator('#sidebar button').filter({ hasText: matcher }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click();
  } else {
    const clicked = await page.evaluate((targetLabel) => {
      const candidate = Array.from(document.querySelectorAll('#sidebar button')).find(
        (node) => node.textContent?.trim() === targetLabel
      );
      if (!candidate) return false;
      candidate.click();
      return true;
    }, label);
    expect(clicked, `sidebar button "${label}" should exist`).toBeTruthy();
  }
  await page.waitForTimeout(500);
}

async function expectIntegratedMeteringTitle(page, titlePattern) {
  await expect(page.locator('[data-kpi-metering-root]')).toBeVisible();
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const host = document.querySelector('[data-kpi-metering-root]');
        return host?.shadowRoot?.getElementById('appTitle')?.textContent?.trim() || '';
      });
    })
    .toMatch(titlePattern);
}

async function openWorkTeamCalendar(page, dataKey, titlePattern) {
  const clicked = await page.evaluate((targetDataKey) => {
    const button = Array.from(document.querySelectorAll('#sidebar button')).find((node) =>
      String(node.getAttribute('onclick') || '').includes(`'${targetDataKey}'`)
    );
    if (!button) {
      return { ok: false, via: 'missing_button' };
    }
    button.click();
    return {
      ok: true,
      via: 'sidebar_button',
      id: button.id || '',
    };
  }, dataKey);
  expect(clicked?.ok, `work sidebar button "${dataKey}" should exist`).toBeTruthy();

  const dialog = page
    .locator(
      '#work-team-calendar-modal .work-team-calendar-dialog[role="region"], #work-team-calendar-modal .work-team-calendar-dialog[role="dialog"]'
    )
    .first();
  const appearedAfterClick = await expect(dialog)
    .toBeVisible({ timeout: 3000 })
    .then(() => true)
    .catch(() => false);

  if (!appearedAfterClick) {
    const forced = await page.evaluate((targetDataKey) => {
      if (typeof window.openSidebarTeamCategory === 'function') {
        window.openSidebarTeamCategory('work', 0, targetDataKey);
        return 'openSidebarTeamCategory';
      }
      if (typeof window.selectCategory === 'function') {
        window.selectCategory('work', 0, { teamDataKey: targetDataKey });
        return 'selectCategory';
      }
      return '';
    }, dataKey);
    expect(forced, `work calendar fallback for "${dataKey}" should exist`).not.toEqual('');
  }

  await expect(dialog).toBeVisible({ timeout: 15000 });
  await expect(dialog.locator('.work-team-calendar-brand-title')).toContainText(titlePattern);
  return dialog;
}

async function getWorkSidebarSnapshot(page) {
  return await page.evaluate(() => {
    const modeButton = document.querySelector('#cat-btn-work-0-mode-toggle');
    const teamButtons = Array.from(document.querySelectorAll('[id^="cat-btn-work-0-team-"]'));
    return {
      modeLabel: (modeButton?.textContent || '').replace(/\s+/g, ' ').trim(),
      teamLabels: teamButtons.map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
    };
  });
}

async function toggleWorkSidebarMode(page) {
  const clicked = await page.evaluate(() => {
    const button = document.querySelector('#cat-btn-work-0-mode-toggle');
    if (!button) return false;
    button.click();
    return true;
  });
  expect(clicked, 'work sidebar mode toggle should exist').toBeTruthy();
  await page.waitForTimeout(500);
}

test.describe('KPI browser smoke', () => {
  test('app navigation and modal interactions complete without browser/runtime errors', async ({ page, baseURL }) => {
    const bootstrapStatus = await resolveBootstrapStatus(page, baseURL);
    const loginRequired = isLoginRequired(bootstrapStatus);
    const credentials = loginRequired ? await createTempAdminUser() : null;
    const consoleErrors = [];
    const pageErrors = [];
    const responseFailures = [];
    const baseOrigin = new URL(baseURL).origin;

    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const location = message.location();
      const suffix = location?.url ? ` @ ${location.url}` : '';
      consoleErrors.push(`${message.text()}${suffix}`);
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error?.stack || error?.message || String(error));
    });
    page.on('response', (response) => {
      const url = response.url();
      if (!url.startsWith(baseOrigin)) return;
      if (response.status() >= 400) {
        responseFailures.push(`${response.status()} ${url}`);
      }
    });

    try {
      await page.goto('/');
      if (loginRequired) {
        await expect(page.getByRole('heading', { name: 'KPI Login' })).toBeVisible();
        await page.getByLabel('Username').fill(credentials.username);
        await page.getByLabel('Password').fill(credentials.password);
        await page.getByRole('button', { name: 'Login' }).click();
      }

      await expect(page.locator('#sidebar')).toBeVisible();
      if (loginRequired) {
        await expect(page.locator('#viewer-auth-identity')).toHaveText('Codex E2E');
      }

      const viewerSidebarToggle = page.locator('#viewer-sidebar-toggle');
      await expect(viewerSidebarToggle).toHaveAttribute('aria-label', '닫기');
      await viewerSidebarToggle.click();
      await expect(page.locator('#sidebar')).toHaveClass(/is-collapsed/);
      await expect(page.locator('#viewer-body')).toHaveClass(/is-sidebar-collapsed/);
      await expect(viewerSidebarToggle).toHaveAttribute('aria-label', '열기');
      await viewerSidebarToggle.click();
      await expect(page.locator('#sidebar')).not.toHaveClass(/is-collapsed/);
      await expect(page.locator('#viewer-body')).not.toHaveClass(/is-sidebar-collapsed/);
      await expect(viewerSidebarToggle).toHaveAttribute('aria-label', '닫기');

      const initialWorkSidebarSnapshot = await getWorkSidebarSnapshot(page);
      expect(initialWorkSidebarSnapshot.modeLabel).not.toEqual('');
      expect(initialWorkSidebarSnapshot.teamLabels.length).toBeGreaterThanOrEqual(4);
      await toggleWorkSidebarMode(page);
      const changedWorkSidebarSnapshot = await getWorkSidebarSnapshot(page);
      expect(changedWorkSidebarSnapshot.modeLabel).not.toEqual(initialWorkSidebarSnapshot.modeLabel);
      expect(changedWorkSidebarSnapshot.teamLabels).not.toEqual(initialWorkSidebarSnapshot.teamLabels);
      await toggleWorkSidebarMode(page);
      const cycledWorkSidebarSnapshot = await getWorkSidebarSnapshot(page);
      expect(cycledWorkSidebarSnapshot.modeLabel).not.toEqual(changedWorkSidebarSnapshot.modeLabel);

      const workCalendar = await openWorkTeamCalendar(page, 'work_team_calendar_overview', /통합 현황 캘린더/);
      await workCalendar.locator('button').filter({ hasText: /오늘/ }).first().click();
      await expect(page.getByRole('button', { name: /선택 닫기/ })).toBeVisible();
      await page.getByRole('button', { name: /전기 사용량/ }).click();
      const utilityPopupCloseButton = page.getByRole('button', { name: /유틸리티 팝업 닫기/ }).last();
      await expect(utilityPopupCloseButton).toBeVisible();
      await utilityPopupCloseButton.click();
      await expect(page.getByRole('button', { name: /유틸리티 팝업 닫기/ })).toHaveCount(0);

      await clickSidebarButton(page, '전기');
      await expect(page.locator('#content-container')).toContainText('전기 사용량과 비용');

      await clickSidebarButton(page, '가스');
      await expect(page.locator('#content-container')).toContainText('가스 사용량과 비용');

      await clickSidebarButton(page, '폐수');
      await expect(page.locator('#content-container')).toContainText('폐수 사용량과 비용');

      await clickSidebarButton(page, '분석');
      await expect(page.locator('#content-container')).toContainText('총괄 비율');
      const analysisToggleButton = page
        .locator('#content-container button')
        .filter({ hasText: /검침표|분석표/ })
        .first();
      await expect(analysisToggleButton).toBeVisible();
      const analysisToggleLabel = String(await analysisToggleButton.textContent()).trim();
      const toggledAnalysisLabel = analysisToggleLabel === '검침표' ? '분석표' : '검침표';
      await expect(page.locator('#content-container')).toContainText(
        analysisToggleLabel === '검침표' ? '가스비 검침표' : '가스비 분석표'
      );
      await analysisToggleButton.click();
      await expect(
        page
          .locator('#content-container button')
          .filter({ hasText: new RegExp(toggledAnalysisLabel) })
          .first()
      ).toBeVisible();
      await expect(page.locator('#content-container')).toContainText(
        toggledAnalysisLabel === '검침표' ? '가스비 검침표' : '가스비 분석표'
      );

      await clickSidebarButton(page, '조도 (Lux)');
      await expect(page.locator('#content-container')).toContainText('조도 입력');

      await clickSidebarButton(page, '법정 설비');
      await expect(page.locator('#content-container')).toContainText('법정 설비');
      await expect(page.locator('#content-container')).toContainText('추후 추가예정');

      await clickSidebarButton(page, '안전 관리');
      await expect(page.locator('#content-container')).toContainText('안전 관리');
      await expect(page.locator('#content-container')).toContainText('추후 추가예정');

      await clickSidebarButton(page, '유틸리티 기입');
      await expectIntegratedMeteringTitle(page, /월간 (전기|가스 검침|폐수|생산량) .* 시트/);
      await page.waitForTimeout(1000);

      await clickSidebarButton(page, '작업 내역 기입');
      await expect(page.locator('#content-container')).toContainText('2026 KPI 작업내역');
      await expect(page.locator('.kpi-work-history-host')).toBeVisible();
      await page.waitForTimeout(1000);

      await clickSidebarButton(page, '설비 이력 카드');
      await expect(page.locator('#content-container')).toContainText('설비 이력 카드 연결은 준비 중입니다.');
      await clickSidebarButton(page, '목차 초기화');
      await expect(page.locator('.viewer-home-shell')).toBeVisible();

      if (loginRequired) {
        await page.locator('#viewer-auth-logout').click();
        await expect(page.getByRole('heading', { name: 'KPI Login' })).toBeVisible();
      }
    } finally {
      if (credentials?.username) {
        await deleteTempUser(credentials.username);
      }
    }

    expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
    expect(pageErrors, `page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(responseFailures, `response failures:\n${responseFailures.join('\n')}`).toEqual([]);
  });
});
