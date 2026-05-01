import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const sectionPath = path.join(repoRoot, 'kpi-runtime', 'sections', 'KPI.sections.production-report.js');
const sectionRegistryPath = path.join(repoRoot, 'kpi-runtime', 'sections', 'KPI.section.registry.js');
const popupPath = path.join(repoRoot, 'kpi-runtime', 'sections', 'monthly-performance-report-popup.html');
const sectionSource = await fs.readFile(sectionPath, 'utf8');
const sectionRegistrySource = await fs.readFile(sectionRegistryPath, 'utf8');
const popupSource = await fs.readFile(popupPath, 'utf8');
const kpiHtml = await fs.readFile(path.join(repoRoot, 'KPI.html'), 'utf8');

function loadProductionReportSection() {
  const context = {
    window: {},
  };
  vm.runInNewContext(sectionSource, context, {
    filename: sectionPath,
  });
  return context.window.KpiSectionFactories.productionReport();
}

test('monthly performance report section is separate from work-history reports', () => {
  const section = loadProductionReportSection();

  assert.equal(section.id, 'productionReport');
  assert.equal(section.name, '월간 실적보고');
  assert.equal(section.icon, 'fa-chart-line');
  assert.equal(section.accent, '#0b477b');
  assert.equal(section.directLaunch, true);
  assert.equal(section.launchUrl, '/kpi-runtime/sections/monthly-performance-report-popup.html');
  assert.equal(section.launchTarget, 'popup');
  assert.equal(section.launchWindowName, 'kpi-monthly-performance-report');
  assert.equal(section.launchWindowWidth, 1480);
  assert.equal(section.launchWindowHeight, 920);
  assert.equal(Array.isArray(section.categories), true);
  assert.equal(section.categories.length, 0);

  assert.doesNotMatch(sectionSource, /preview\.html/i);
  assert.doesNotMatch(sectionSource, /work_history_records/);
  assert.doesNotMatch(sectionSource, /history_tool/);
});

test('monthly performance popup contains team selectors and metric placeholders', () => {
  assert.match(popupSource, /월간 실적보고/);
  assert.match(popupSource, /data-team-tab="team1part1"/);
  assert.match(popupSource, /data-team-tab="team1part2"/);
  assert.match(popupSource, /data-team-tab="team2"/);
  assert.match(popupSource, /data-team-tab="team3"/);
  assert.match(popupSource, /data-team-tab="team4"/);
  assert.match(popupSource, /생산량/);
  assert.match(popupSource, /수율/);
  assert.match(popupSource, /노무비/);
  assert.match(popupSource, /작업이력의 작업내역\/보고서 기록은 이 화면의 원천 데이터로 사용하지 않습니다/);
});

test('kpi html and registry wire the production report section before the section registry bootstraps', () => {
  const sectionIndex = kpiHtml.indexOf('kpi-runtime/sections/KPI.sections.production-report.js?v=1');
  const registryIndex = kpiHtml.indexOf('kpi-runtime/sections/KPI.section.registry.js?v=1');

  assert.ok(sectionIndex >= 0, 'production report section loader is missing');
  assert.ok(registryIndex > sectionIndex, 'section registry must load after the production report section');
  assert.match(sectionRegistrySource, /'work', 'util', 'audit', 'data', 'productionReport', 'owner'/);
});
