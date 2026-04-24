import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSharedStoreReadPayload } from '../../src/routes/shared-store-routes.js';

test('shared-store read payload succeeds with an empty store when no authority state exists', () => {
  assert.deepEqual(buildSharedStoreReadPayload(null), {
    ok: true,
    store: {},
    meta: null,
  });
});

test('shared-store read payload preserves authority store and meta when records exist', () => {
  const store = {
    resourceType: 'waste',
    resourceDatasets: {
      waste: {
        mode: 'settlement',
      },
    },
  };
  const meta = {
    version: 7,
    recordVersions: {
      waste_v1: 7,
    },
  };

  assert.deepEqual(buildSharedStoreReadPayload({ store, meta }), {
    ok: true,
    store,
    meta,
  });
});
