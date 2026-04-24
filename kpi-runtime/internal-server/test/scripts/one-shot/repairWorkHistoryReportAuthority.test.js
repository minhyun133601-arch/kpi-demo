import assert from 'node:assert/strict';
import test from 'node:test';

import { getAuditEntries, parseDateKey } from '../../../src/scripts/one-shot/repairWorkHistoryReportAuthority/normalizers.js';
import {
  buildManagedAttachment,
  buildNextReportRecord,
  findMatchingReportRecordIndex,
  getExistingReportIdentity,
} from '../../../src/scripts/one-shot/repairWorkHistoryReportAuthority/records.js';

test('parseDateKey accepts direct and embedded YYYYMMDD values', () => {
  assert.equal(parseDateKey('2026-04-22'), '2026-04-22');
  assert.equal(parseDateKey('report_20260421.pdf'), '2026-04-21');
  assert.equal(parseDateKey('invalid-value'), '');
});

test('getAuditEntries normalizes valid entries and sorts descending by date', () => {
  const entries = getAuditEntries({
    payload: {
      entries: [
        { originalName: 'older.pdf', documentId: 'doc-1', dateKey: '2026-04-01' },
        { originalName: 'newer.pdf', documentId: 'doc-2', dateLabel: '20260422' },
        { originalName: '', documentId: 'missing-name' },
      ],
    },
  });

  assert.equal(entries.length, 2);
  assert.equal(entries[0].originalName, 'newer.pdf');
  assert.equal(entries[0].dateKey, '2026-04-22');
  assert.equal(entries[1].originalName, 'older.pdf');
});

test('report record helpers match existing work report entries by date and file name', () => {
  const records = [
    {
      team: 'team4',
      categoryGroup: 'report',
      startDate: '2026-04-22',
      attachmentSlots: {
        report: {
          originalName: 'safety-report.pdf',
        },
      },
    },
  ];

  const index = findMatchingReportRecordIndex(records, {
    originalName: 'safety-report.pdf',
    dateKey: '2026-04-22',
  });

  assert.equal(index, 0);
  assert.deepEqual(getExistingReportIdentity(records[0]), {
    fileName: 'safety-report.pdf',
    dateKey: '2026-04-22',
  });
});

test('buildNextReportRecord preserves billing attachment and mirrors managed report attachment', () => {
  const reportAttachment = buildManagedAttachment({
    id: 'doc-22',
    original_name: 'repair-report.pdf',
    stored_name: 'stored.pdf',
    byte_size: 512,
    mime_type: 'application/pdf',
    storage_rel_path: 'reports/stored.pdf',
    file_category: 'report_pdf',
  });
  const nextRecord = buildNextReportRecord(
    {
      billingAttachment: {
        originalName: 'billing.pdf',
      },
      assignees: ['담당자'],
    },
    {
      dateKey: '2026-04-22',
      originalName: 'repair-report.pdf',
      workContent: '월간 보고서',
    },
    reportAttachment
  );

  assert.equal(nextRecord.team, 'team4');
  assert.equal(nextRecord.categoryGroup, 'report');
  assert.equal(nextRecord.startDate, '2026-04-22');
  assert.equal(nextRecord.attachmentSlots.report.documentId, 'doc-22');
  assert.equal(nextRecord.billingAttachment.originalName, 'billing.pdf');
  assert.equal(nextRecord.attachments.length, 2);
});
