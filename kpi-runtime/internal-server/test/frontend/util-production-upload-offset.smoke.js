import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const dataSyncSource = await fs.readFile(
  new URL('../../../../utility/runtime/util/KPI.util.data-sync.js', import.meta.url),
  'utf8'
);
const productionImportSource = await fs.readFile(
  new URL('../../../../utility/runtime/util/KPI.util.production-import.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(new URL('../../../../KPI.html', import.meta.url), 'utf8');

test('util production upload shared date offset is zero-day', () => {
  assert.match(dataSyncSource, /const UTIL_PRODUCTION_UPLOAD_DATE_OFFSET_DAYS = 0;/);
  assert.match(
    productionImportSource,
    /const dateObj = applyUtilDateOffset\(parsedDate, UTIL_PRODUCTION_UPLOAD_DATE_OFFSET_DAYS\);/
  );
});

test('util production import does not load or expose source sheet archive storage', () => {
  assert.doesNotMatch(kpiHtml, /KPI\.util\.production\.archive\.js/);
  assert.match(dataSyncSource, /archive: \{ enabled: false, apiBase, permissionKey: '', readEnabled: false, writeEnabled: false \}/);
  assert.match(dataSyncSource, /function supportsUtilProductionArchiveServerPersistence\(\) \{\s*return false;\s*\}/);
  assert.doesNotMatch(dataSyncSource, /ownerDomain: String\(archive\.ownerDomain \|\| 'util\.production\.archive'/);
  assert.doesNotMatch(dataSyncSource, /fileCategory: String\(archive\.fileCategory \|\| 'source_archive'/);
});

test('util production source archive runtime file is not part of the app surface', async () => {
  await assert.rejects(
    fs.access(new URL('../../../../utility/runtime/util/production/KPI.util.production.archive.js', import.meta.url)),
    /ENOENT/
  );
});
