import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const runtimeDirName = 'kpi-runtime';
const runtimeDirEntries = await fs.readdir(path.join(repoRoot, runtimeDirName), { withFileTypes: true });

assert.ok(runtimeDirEntries.length > 0, 'kpi-runtime directory must exist');

const appRoot = path.join(repoRoot, runtimeDirName, 'app');
const stylesRoot = path.join(appRoot, 'styles');
const kpiHtmlPath = path.join(repoRoot, 'KPI.html');
const shellManifestPath = path.join(appRoot, 'KPI.app.shell.css');

const styleEntries = [
  {
    href: `${runtimeDirName}/app/styles/shell/dashboard.css?v=057`,
    manifestHref: './styles/shell/dashboard.css?v=057',
    fileName: 'dashboard.css',
    relativeSegments: ['shell', 'dashboard.css'],
  },
  {
    href: `${runtimeDirName}/app/styles/shell/shell-chrome.css?v=057`,
    manifestHref: './styles/shell/shell-chrome.css?v=057',
    fileName: 'shell-chrome.css',
    relativeSegments: ['shell', 'shell-chrome.css'],
  },
  {
    href: `${runtimeDirName}/app/styles/work/work.css?v=057`,
    manifestHref: './styles/work/work.css?v=057',
    fileName: 'work.css',
    relativeSegments: ['work', 'work.css'],
  },
  {
    href: `${runtimeDirName}/app/styles/metering/metering.css?v=060`,
    manifestHref: './styles/metering/metering.css?v=060',
    fileName: 'metering.css',
    relativeSegments: ['metering', 'metering.css'],
  },
  {
    href: `${runtimeDirName}/app/styles/data/data.css?v=002`,
    manifestHref: './styles/data/data.css?v=002',
    fileName: 'data.css',
    relativeSegments: ['data', 'data.css'],
  },
  {
    href: `${runtimeDirName}/app/styles/audit/audit.css?v=058`,
    manifestHref: './styles/audit/audit.css?v=058',
    fileName: 'audit.css',
    relativeSegments: ['audit', 'audit.css'],
  },
];

const kpiHtml = await fs.readFile(kpiHtmlPath, 'utf8');
const shellManifest = await fs.readFile(shellManifestPath, 'utf8');
const styleContents = Object.fromEntries(
    await Promise.all(
    styleEntries.map(async ({ fileName, relativeSegments }) => [
      fileName,
      await fs.readFile(path.join(stylesRoot, ...relativeSegments), 'utf8'),
    ])
  )
);

test('kpi html loads split shell css links instead of inline style block', () => {
  let previousIndex = -1;
  for (const { href } of styleEntries) {
    const linkTag = `<link rel="stylesheet" href="${href}">`;
    const linkIndex = kpiHtml.indexOf(linkTag);
    assert.notEqual(linkIndex, -1, `${href} link must exist in KPI.html`);
    assert.ok(linkIndex > previousIndex, `${href} must keep the documented load order`);
    previousIndex = linkIndex;
  }

  assert.equal(
    /app\/KPI\.app\.shell\.css\?v=\d+/.test(kpiHtml),
    false,
    'KPI.html should no longer load the legacy single-file shell css path'
  );
  assert.doesNotMatch(kpiHtml, /<style>/, 'KPI.html inline shell style block should remain removed');
});

test('shell css compatibility manifest imports split files', () => {
  for (const { fileName, manifestHref } of styleEntries) {
    assert.match(
      shellManifest,
      new RegExp(`@import url\\(\"${manifestHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\"\\);`),
      `${fileName} must remain in the compatibility manifest`
    );
  }
});

test('split shell css keeps key selectors in the expected files', () => {
  assert.match(styleContents['dashboard.css'], /#dashboard\s*\{/);
  assert.match(styleContents['dashboard.css'], /\.dashboard-version-badge\s*\{/);

  assert.match(styleContents['shell-chrome.css'], /#viewer\s*\{/);
  assert.match(styleContents['shell-chrome.css'], /\.viewer-header\s*\{/);
  assert.match(styleContents['shell-chrome.css'], /\.global-save-dock\s*\{/);
  assert.match(styleContents['shell-chrome.css'], /\.runtime-auth-bar\s*\{/);

  assert.match(styleContents['work.css'], /\.work-panel\s*\{/);
  assert.match(styleContents['work.css'], /\.work-chooser-shell\s*\{/);

  assert.match(styleContents['metering.css'], /\.util-tabs-wrap\s*\{/);
  assert.match(styleContents['metering.css'], /\.month-panel\s*\{/);

  assert.match(styleContents['data.css'], /\.data-equipment-launcher\s*\{/);
  assert.match(styleContents['data.css'], /\.data-equipment-popup\s*\{/);

  assert.match(styleContents['audit.css'], /\.audit-panel\s*\{/);
  assert.match(styleContents['audit.css'], /\.print-sheet\s*\{/);
});

test('utility sheet report modal stays above the viewer layer', () => {
  const viewerZIndexMatch = styleContents['shell-chrome.css'].match(/#viewer\s*\{[^}]*z-index:\s*(\d+)/s);
  const modalZIndexMatch = styleContents['metering.css'].match(/\.util-sheet-report-modal\s*\{[^}]*z-index:\s*(\d+)/s);

  assert.ok(viewerZIndexMatch, '#viewer z-index must stay explicit');
  assert.ok(modalZIndexMatch, 'utility sheet report modal z-index must stay explicit');
  assert.ok(Number(modalZIndexMatch[1]) > Number(viewerZIndexMatch[1]), 'utility sheet modal must render above #viewer');
  assert.match(styleContents['metering.css'], /\.util-sheet-report-modal\.is-open\s*\{\s*display:\s*flex;/);
  assert.match(styleContents['metering.css'], /\.util-sheet-report-modal\s*\{[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*padding:\s*16px;/s);
  assert.match(styleContents['metering.css'], /\.util-sheet-report-card\s*\{[^}]*width:\s*min\(1120px,\s*96vw\);[^}]*border-radius:\s*8px;/s);
  assert.match(styleContents['metering.css'], /\.util-sheet-report-modal\.is-expanded\s+\.util-sheet-report-card\s*\{[^}]*width:\s*100vw;[^}]*height:\s*100dvh;/s);
  assert.match(styleContents['metering.css'], /\.util-sheet-meter-summary-toolbar\s*\{/);
  assert.match(styleContents['metering.css'], /\.util-sheet-inline-help\s*\{/);
});
