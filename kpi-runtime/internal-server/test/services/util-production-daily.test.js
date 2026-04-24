import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStatePayload, normalizeStateSnapshot } from '../../src/services/util-production-daily/state.js';

test('normalizeStateSnapshot clamps period and dedupes entries', () => {
  const snapshot = normalizeStateSnapshot({
    periodDefault: { startDay: 99 },
    teams: [
      {
        name: '유틸팀',
        entries: [
          {
            date: '2026-04-01',
            amount: '12.5',
            lineName: '1호기',
            productName: '슬러리',
          },
          {
            date: '2026-04-01',
            amount: 12.5,
            lineName: '1호기',
            productName: '슬러리',
            teamName: '유틸팀',
          },
        ],
      },
    ],
    archives: [
      {
        id: 'archive-a',
        fileName: 'daily.xlsx',
        size: '1024',
        lastModified: '10',
        savedAt: '2026-04-02T00:00:00.000Z',
      },
      {
        id: 'archive-a',
        fileName: 'daily.xlsx',
        size: '1024',
        lastModified: '10',
        savedAt: '2026-04-02T00:00:00.000Z',
      },
    ],
  });

  assert.equal(snapshot.periodStartDay, 31);
  assert.equal(snapshot.entries.length, 1);
  assert.equal(snapshot.entries[0].teamName, '유틸팀');
  assert.equal(snapshot.archives.length, 1);
  assert.equal(snapshot.archives[0].folderName, 'default');
});

test('buildStatePayload groups rows by team and derives archive summary', () => {
  const payload = buildStatePayload(
    {
      period_start_day: 5,
      version: 2,
      updated_at: '2026-04-05T10:00:00.000Z',
    },
    [
      {
        production_date: '2026-04-01',
        team_name: 'A조',
        line_name: '1호기',
        product_name: '제품A',
        amount: '10',
        moisture_excluded_yield: '9.5',
        equipment_capa: '15',
        equipment_utilization: '66.7',
        source_archive_id: 'archive-a',
        source_fingerprint: 'archive-a-fingerprint',
        source_file_name: 'daily-a.xlsx',
      },
      {
        production_date: '2026-04-02',
        team_name: 'B조',
        line_name: '2호기',
        product_name: '제품B',
        amount: '20',
        moisture_excluded_yield: '18',
        equipment_capa: '30',
        equipment_utilization: '70',
        source_archive_id: 'archive-a',
        source_fingerprint: 'archive-a-fingerprint',
        source_file_name: 'daily-a.xlsx',
      },
    ],
    [
      {
        id: 'archive-a',
        file_name: 'daily-a.xlsx',
        byte_size: 4096,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        last_modified: 100,
        saved_at: '2026-04-03T00:00:00.000Z',
        folder_name: 'imports',
        fingerprint: 'archive-a-fingerprint',
        document_id: 'doc-1',
        storage: 'server',
        preview_url: '/preview/archive-a',
        download_url: '/download/archive-a',
      },
    ]
  );

  assert.equal(payload.periodDefault.startDay, 5);
  assert.equal(payload.meta.version, 2);
  assert.deepEqual(payload.teams.map((team) => team.name), ['A조', 'B조']);
  assert.equal(payload.archives.length, 1);
  assert.deepEqual(payload.archives[0].teams, ['A조', 'B조']);
  assert.deepEqual(payload.archives[0].yearMonths, ['2026-04']);
});
