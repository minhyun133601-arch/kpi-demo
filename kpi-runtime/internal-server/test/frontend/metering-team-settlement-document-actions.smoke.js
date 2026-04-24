import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const teamSettlementDocumentActionsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('team-settlement/document-actions.js'),
  'utf8'
);

function createTeamSettlementDocumentActionsContext(options = {}) {
  const calls = {
    alerts: [],
    previews: [],
    downloads: [],
  };
  const documentsByScope = {
    ...(options.documentsByScope || {}),
  };
  const context = {
    console,
    Date,
    JSON,
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    RegExp,
    state: {
      currentMonth: options.currentMonth ?? '2026-04',
    },
    normalizeMonthValue(value) {
      return options.normalizedMonthValue ?? (value ? String(value) : '');
    },
    getCurrentBillingSettlementScope() {
      return options.scopeKey || 'scope:gas';
    },
    getBillingDocumentForMonth(monthValue, scopeKey) {
      return documentsByScope[`${monthValue}:${scopeKey}`] || null;
    },
    getCurrentResourceType() {
      return options.resourceType || 'gas';
    },
    openBillingDocumentPreview(monthValue, billingDocument, resourceType, scopeKey) {
      calls.previews.push({ monthValue, billingDocument, resourceType, scopeKey });
    },
    downloadBillingDocument(monthValue, billingDocument, resourceType) {
      calls.downloads.push({ monthValue, billingDocument, resourceType });
    },
    window: {
      alert(message) {
        calls.alerts.push(String(message));
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamSettlementDocumentActionsSource, context, {
    filename: 'team-settlement/document-actions.js',
  });

  return {
    context,
    calls,
  };
}

test('team settlement document actions resolve the current month billing document by scope', () => {
  const { context } = createTeamSettlementDocumentActionsContext({
    documentsByScope: {
      '2026-04:scope:gas': { fileName: 'gas.pdf' },
    },
  });

  assert.deepEqual(context.getCurrentMonthBillingDocument(), { fileName: 'gas.pdf' });
});

test('team settlement document actions alert when no preview document exists', () => {
  const { context, calls } = createTeamSettlementDocumentActionsContext({
    documentsByScope: {},
  });

  context.handleTeamSettlementPreviewClick();

  assert.deepEqual(calls.alerts, ['미리볼 청구서가 없습니다.']);
  assert.deepEqual(calls.previews, []);
});

test('team settlement document actions open the billing preview with current scope context', () => {
  const { context, calls } = createTeamSettlementDocumentActionsContext({
    scopeKey: 'scope:electric',
    resourceType: 'electric',
    documentsByScope: {
      '2026-04:scope:electric': { fileName: 'electric.pdf' },
    },
  });

  context.handleTeamSettlementPreviewClick();

  assert.deepEqual(calls.alerts, []);
  assert.deepEqual(calls.previews, [
    {
      monthValue: '2026-04',
      billingDocument: { fileName: 'electric.pdf' },
      resourceType: 'electric',
      scopeKey: 'scope:electric',
    },
  ]);
});

test('team settlement document actions alert when no downloadable document exists', () => {
  const { context, calls } = createTeamSettlementDocumentActionsContext({
    documentsByScope: {},
  });

  context.handleTeamSettlementOpenClick();

  assert.deepEqual(calls.alerts, ['다운할 청구서가 없습니다.']);
  assert.deepEqual(calls.downloads, []);
});

test('team settlement document actions download the current month billing document', () => {
  const { context, calls } = createTeamSettlementDocumentActionsContext({
    resourceType: 'gas',
    documentsByScope: {
      '2026-04:scope:gas': { fileName: 'gas.pdf' },
    },
  });

  context.handleTeamSettlementOpenClick();

  assert.deepEqual(calls.alerts, []);
  assert.deepEqual(calls.downloads, [
    {
      monthValue: '2026-04',
      billingDocument: { fileName: 'gas.pdf' },
      resourceType: 'gas',
    },
  ]);
});
