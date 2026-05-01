import assert from 'node:assert/strict';
import test from 'node:test';

import { CURRENT_PORTAL_DATA_RECORDS, WORK_RUNTIME_BOOTSTRAP_RECORDS } from '../../src/lib/portal-data-registry.js';
import { buildPortalDataBootstrapPayload } from '../../src/lib/portal-bootstrap/payload.js';
import { injectPortalDataBootstrap } from '../../src/lib/portal-bootstrap/static.js';

test('injectPortalDataBootstrap inserts bootstrap tag once before xlsx script', () => {
  const html = [
    '<html>',
    '<body>',
    '    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>',
    '</body>',
    '</html>',
  ].join('\n');

  const rendered = injectPortalDataBootstrap(html);
  assert.equal(rendered.inserted, true);
  assert.match(rendered.html, /src="\/bootstrap\/portal-data\.js"/);

  const renderedAgain = injectPortalDataBootstrap(rendered.html);
  assert.equal(renderedAgain.inserted, false);
});

test('buildPortalDataBootstrapPayload copies known records and mirrors audit regulation fallback', () => {
  const payload = buildPortalDataBootstrapPayload(
    [
      {
        module_key: 'portal_data',
        record_key: 'audit_regulation',
        permission_key: 'audit_regulation',
        version: 2,
        updated_at: '2026-04-18T00:00:00.000Z',
        payload: { version: 2 },
      },
      {
        module_key: 'portal_data',
        record_key: 'data_equipment_history_card',
        permission_key: 'data.equipment_history',
        version: 1,
        updated_at: '2026-04-29T00:00:00.000Z',
        payload: { equipmentList: [] },
      },
    ],
    [],
    {
      knownPortalRecordKeys: new Set(CURRENT_PORTAL_DATA_RECORDS.map((record) => record.recordKey)),
      knownWorkRuntimeRecordKeys: new Set(WORK_RUNTIME_BOOTSTRAP_RECORDS.map((record) => record.recordKey)),
    }
  );

  assert.deepEqual(payload.portalData.audit_regulation, { version: 2 });
  assert.deepEqual(payload.portalData.audit_legal_facility, { version: 2 });
  assert.deepEqual(payload.portalData.data_equipment_history_card, { equipmentList: [] });
  assert.equal(payload.importedMeta.length, 2);
  assert.equal(payload.missing.length, 0);
});
