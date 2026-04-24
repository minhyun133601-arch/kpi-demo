import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const sharedStoreSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('shared-store.js'),
  'utf8'
);

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSharedStoreContext(options = {}) {
  const windowStub = {
    location: {
      protocol: options.protocol || 'http:',
    },
    __SHARED_APP_CONFIG__: options.sharedAppConfig || {
      enabled: true,
      apiBase: 'api',
    },
    __SHARED_APP_STORE_PRELOAD__: Promise.resolve(null),
    __LOCAL_APP_STORE__: options.localStore ?? null,
    __SHARED_APP_STORE_META__: options.sharedStoreMeta ?? null,
    __PRESET_ELECTRIC_ENTRIES__: options.presetElectricEntries || {},
    __PRESET_GAS_ENTRIES__: options.presetGasEntries || {},
    fetch: async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }),
  };

  const context = {
    console,
    Date,
    JSON,
    Math,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    window: windowStub,
    sharedServerPersistenceState: {
      meta: null,
    },
    normalizeStore(value) {
      return {
        kind: 'normalized-store',
        value,
      };
    },
    createDefaultStore() {
      return {
        kind: 'default-store',
      };
    },
    normalizeEquipmentEntries(value) {
      return {
        kind: 'normalized-entries',
        value,
      };
    },
    mergeEquipmentEntriesWithPresetLocalStore(entries, presetEntries) {
      return {
        entries,
        presetEntries,
      };
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(sharedStoreSource, context, {
    filename: 'metering/shared-store.js',
  });
  return context;
}

function evaluate(context, expression) {
  return vm.runInContext(expression, context);
}

test('metering shared-store helpers normalize shared server config and endpoints', () => {
  const context = createSharedStoreContext({
    sharedAppConfig: {
      enabled: true,
      apiBase: 'api',
    },
  });

  assert.deepEqual(
    toPlainJson(evaluate(context, 'resolveSharedAppConfig()')),
    {
      enabled: true,
      apiBase: '/api',
    }
  );
  assert.equal(evaluate(context, 'supportsSharedServerPersistence()'), true);
  assert.equal(evaluate(context, 'shouldUseSharedServerAsAuthority()'), true);
  assert.equal(evaluate(context, 'getSharedStoreEndpoint()'), '/api/shared-store');
  assert.equal(evaluate(context, 'getBillingDocumentEndpoint()'), '/api/billing-document');
});

test('metering shared-store helpers normalize and remember shared store meta', () => {
  const context = createSharedStoreContext();
  context.__metaInput = {
    moduleKey: ' metering ',
    recordKey: ' store ',
    permissionKey: ' write ',
    version: '7',
    updatedAt: ' 2026-04-21T12:34:56.000Z ',
    recordVersions: {
      alpha: '3',
      ' beta ': '4',
      invalid: 'x',
    },
  };

  assert.deepEqual(
    toPlainJson(evaluate(context, 'normalizeSharedStoreMeta(__metaInput)')),
    {
      moduleKey: 'metering',
      recordKey: 'store',
      permissionKey: 'write',
      version: 7,
      updatedAt: '2026-04-21T12:34:56.000Z',
      recordVersions: {
        alpha: 3,
        beta: 4,
      },
    }
  );

  evaluate(context, 'rememberSharedStoreMeta(__metaInput)');
  assert.deepEqual(
    toPlainJson(context.sharedServerPersistenceState.meta),
    {
      moduleKey: 'metering',
      recordKey: 'store',
      permissionKey: 'write',
      version: 7,
      updatedAt: '2026-04-21T12:34:56.000Z',
      recordVersions: {
        alpha: 3,
        beta: 4,
      },
    }
  );
  assert.deepEqual(
    toPlainJson(context.window.__SHARED_APP_STORE_META__),
    toPlainJson(context.sharedServerPersistenceState.meta)
  );
});

test('metering shared-store helpers load preset store and preset entries', () => {
  const localStore = {
    resourceType: 'electric',
    billingSettlementEntries: {
      '2026-04': {
        amount: 123,
      },
    },
  };
  const context = createSharedStoreContext({
    localStore,
    presetElectricEntries: {
      '2026-04-01': {
        values: {
          field_01: '10',
        },
      },
    },
    presetGasEntries: {
      '2026-04-02': {
        values: {
          field_02: '20',
        },
      },
    },
  });

  assert.deepEqual(
    toPlainJson(evaluate(context, 'getPresetLocalStore()')),
    localStore
  );
  assert.deepEqual(
    toPlainJson(evaluate(context, 'loadStore()')),
    {
      kind: 'normalized-store',
      value: localStore,
    }
  );
  assert.deepEqual(
    toPlainJson(evaluate(context, 'getPresetEquipmentEntries()')),
    {
      kind: 'normalized-entries',
      value: {
        '2026-04-01': {
          values: {
            field_01: '10',
          },
        },
      },
    }
  );
  assert.deepEqual(
    toPlainJson(evaluate(context, 'getPresetGasEntries()')),
    {
      kind: 'normalized-entries',
      value: {
        '2026-04-02': {
          values: {
            field_02: '20',
          },
        },
      },
    }
  );

  context.__entriesInput = {
    '2026-04-03': {
      values: {
        field_03: '30',
      },
    },
  };
  assert.deepEqual(
    toPlainJson(evaluate(context, 'mergePresetEquipmentEntries(__entriesInput)')),
    {
      entries: {
        '2026-04-03': {
          values: {
            field_03: '30',
          },
        },
      },
      presetEntries: {
        kind: 'normalized-entries',
        value: {
          '2026-04-01': {
            values: {
              field_01: '10',
            },
          },
        },
      },
    }
  );

  const emptyContext = createSharedStoreContext({
    localStore: null,
  });
  assert.deepEqual(
    toPlainJson(evaluate(emptyContext, 'loadStore()')),
    {
      kind: 'default-store',
    }
  );
});
