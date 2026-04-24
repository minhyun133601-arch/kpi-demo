import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFrontendFile,
  frontendTrackedFiles,
  FRONTEND_LOGIC_HARD_FILE_LIMIT,
  SERVER_HARD_FILE_LIMIT,
} from '../../src/scripts/verifyServerStructure.js';

test('verifyServerStructure tracks the expanded work runtime files', () => {
  const trackedRelativeSuffixes = frontendTrackedFiles.map((entry) => entry.replaceAll('\\', '/'));

  assert.equal(frontendTrackedFiles.length, 29);
  assert.ok(
    trackedRelativeSuffixes.some((entry) => entry.endsWith('/runtime/work/KPI.work.team-calendar.js'))
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) => entry.endsWith('/runtime/work/KPI.work.team-calendar.render.js'))
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/history/KPI.work.history.view.actions.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.production.history.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.production.overview.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.production.draft.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.shared.team-calendar.categories.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.shared.team-calendar.state.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.shared.team-calendar.summary.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.renderers.weekly-actions.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.renderers.print.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/KPI.work.renderers.monthly-plan.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/history/KPI.work.history.core.records.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/history/KPI.work.history.core.storage.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/history/KPI.work.history.view.actions.search.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/history/KPI.work.history.view.actions.record.js')
    )
  );
  assert.ok(
    trackedRelativeSuffixes.some((entry) =>
      entry.endsWith('/runtime/work/history/KPI.work.history.view.actions.document.js')
    )
  );
});

test('verifyServerStructure restores hard failures for resolved production overages', () => {
  const relativePath = 'team-report/runtime/work/KPI.work.production.js';
  const result = evaluateFrontendFile(relativePath, FRONTEND_LOGIC_HARD_FILE_LIMIT + 25);

  assert.equal(result.warnings.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /A-42 hard limit/);
});

test('verifyServerStructure applies server limits to tracked render helper files', () => {
  const relativePath = 'team-report/runtime/work/KPI.work.renderers.js';
  const result = evaluateFrontendFile(relativePath, SERVER_HARD_FILE_LIMIT + 10);

  assert.equal(result.warnings.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /A-41 hard limit/);
});

test('verifyServerStructure restores hard failures for resolved history core overages', () => {
  const relativePath = 'team-report/runtime/work/history/KPI.work.history.core.js';
  const result = evaluateFrontendFile(relativePath, SERVER_HARD_FILE_LIMIT + 10);

  assert.equal(result.warnings.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /A-41 hard limit/);
});

test('verifyServerStructure keeps ordinary tracked frontend files on hard failures', () => {
  const relativePath = 'utility/apps/metering/app.js';
  const result = evaluateFrontendFile(relativePath, FRONTEND_LOGIC_HARD_FILE_LIMIT + 10);

  assert.equal(result.warnings.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /A-42 hard limit/);
});

test('verifyServerStructure restores hard failures for resolved shared overages', () => {
  const relativePath = 'team-report/runtime/work/KPI.work.shared.js';
  const result = evaluateFrontendFile(relativePath, FRONTEND_LOGIC_HARD_FILE_LIMIT + 10);

  assert.equal(result.warnings.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /A-42 hard limit/);
});
