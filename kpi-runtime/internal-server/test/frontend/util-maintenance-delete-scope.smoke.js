import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const maintenanceSource = await fs.readFile(
  new URL('../../../../utility/runtime/util/KPI.util.maintenance.js', import.meta.url),
  'utf8'
);

test('utility data-management delete is pinned to production only while export keeps all metric toggles', () => {
  assert.doesNotMatch(
    maintenanceSource,
    /buildUtilMetricToggleButtonsHtml\(\['all'\], 'delete-item-toggle'\)/
  );
  assert.match(
    maintenanceSource,
    /class="util-production-toggle-btn is-active" aria-pressed="true" disabled>생산량<\/button>/
  );
  assert.match(maintenanceSource, /const selectedItemKeys = \['production'\];/);
  assert.match(maintenanceSource, /const metricKeys = \['production'\];/);
  assert.match(
    maintenanceSource,
    /buildUtilMetricToggleButtonsHtml\(\['all'\], 'export-item-toggle'\)/
  );
});
