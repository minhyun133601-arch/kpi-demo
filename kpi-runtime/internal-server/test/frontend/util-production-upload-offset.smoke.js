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

test('util production upload shared date offset is zero-day', () => {
  assert.match(dataSyncSource, /const UTIL_PRODUCTION_UPLOAD_DATE_OFFSET_DAYS = 0;/);
  assert.match(
    productionImportSource,
    /const dateObj = applyUtilDateOffset\(parsedDate, UTIL_PRODUCTION_UPLOAD_DATE_OFFSET_DAYS\);/
  );
});
