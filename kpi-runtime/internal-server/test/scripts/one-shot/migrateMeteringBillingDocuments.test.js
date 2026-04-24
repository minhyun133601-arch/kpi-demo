import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_SCOPE_KEY } from '../../../src/scripts/one-shot/migrateMeteringBillingDocuments/constants.js';
import { buildBillingOwnerKey, buildMigratedDocument } from '../../../src/scripts/one-shot/migrateMeteringBillingDocuments/metadata.js';
import {
  buildBillingDocumentMonthRecord,
  getBillingDocumentScopeMap,
  syncRootBillingDocumentsFromActiveDataset,
} from '../../../src/scripts/one-shot/migrateMeteringBillingDocuments/store.js';

test('getBillingDocumentScopeMap wraps leaf records into the default scope', () => {
  const scopeMap = getBillingDocumentScopeMap({
    fileName: 'bill.pdf',
    relativePath: 'docs/bill.pdf',
  });

  assert.equal(Object.keys(scopeMap).length, 1);
  assert.equal(scopeMap[DEFAULT_SCOPE_KEY].fileName, 'bill.pdf');
});

test('buildBillingDocumentMonthRecord preserves multi-scope entries and collapses default-only entries', () => {
  const multiScopeRecord = buildBillingDocumentMonthRecord('2026-04', {
    default: { fileName: 'a.pdf' },
    plantB: { fileName: 'b.pdf' },
  });
  const defaultOnlyRecord = buildBillingDocumentMonthRecord('2026-04', {
    default: { fileName: 'a.pdf' },
  });

  assert.equal(multiScopeRecord.monthValue, '2026-04');
  assert.equal(defaultOnlyRecord.fileName, 'a.pdf');
});

test('metadata helpers build stable owner keys and migrated documents', () => {
  const ownerKey = buildBillingOwnerKey('gas', '2026-04', 'plantB');
  const migratedDocument = buildMigratedDocument(
    '2026-04',
    { fileName: 'bill.pdf', relativePath: 'legacy/bill.pdf', mimeType: 'application/pdf', base64Data: 'abc' },
    { id: 'doc-1', original_name: 'bill.pdf', mime_type: 'application/pdf', created_at: '2026-04-18T00:00:00.000Z' },
    false
  );

  assert.equal(ownerKey, 'gas:2026-04:plantB');
  assert.equal(migratedDocument.base64Data, '');
  assert.equal(migratedDocument.previewUrl, '/api/files/doc-1/view');
});

test('syncRootBillingDocumentsFromActiveDataset mirrors active resource dataset', () => {
  const store = {
    resourceType: 'gas',
    resourceDatasets: {
      gas: {
        billingDocuments: {
          '2026-04': { fileName: 'gas.pdf' },
        },
      },
    },
    billingDocuments: {},
  };

  syncRootBillingDocumentsFromActiveDataset(store);

  assert.deepEqual(store.billingDocuments, {
    '2026-04': { fileName: 'gas.pdf' },
  });
});
