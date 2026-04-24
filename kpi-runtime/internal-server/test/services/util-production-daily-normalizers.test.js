import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDateKey } from '../../src/services/util-production-daily/normalizers.js';
import { buildStatePayload } from '../../src/services/util-production-daily/state.js';

function formatLocalDate(date) {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

test('normalizeDateKey preserves the local calendar day for Date values', () => {
  const localMidnight = new Date(2024, 0, 2);

  assert.equal(normalizeDateKey(localMidnight), formatLocalDate(localMidnight));
});

test('buildStatePayload keeps database date rows on the same local calendar day', () => {
  const localMidnight = new Date(2024, 0, 2);
  const payload = buildStatePayload(
    {
      period_start_day: 1,
      version: 1,
      updated_at: '2026-04-24T00:00:00.000Z',
    },
    [
      {
        production_date: localMidnight,
        team_name: 'Team A',
        line_name: 'Line 1',
        product_name: 'Item 1',
        amount: '10',
        source_archive_id: '',
        source_fingerprint: '',
        source_file_name: '',
      },
    ],
    []
  );

  assert.equal(payload.teams.length, 1);
  assert.equal(payload.teams[0].entries.length, 1);
  assert.equal(payload.teams[0].entries[0].date, formatLocalDate(localMidnight));
});
