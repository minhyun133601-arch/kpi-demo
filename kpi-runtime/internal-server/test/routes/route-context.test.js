import assert from 'node:assert/strict';
import test from 'node:test';

import { config } from '../../src/config.js';
import { requireAdmin, requireOwner } from '../../src/routes/route-context.js';

test('admin and owner guards allow open verification mode without auth context', () => {
  const previousAuthEnabled = config.authEnabled;
  try {
    config.authEnabled = false;

    assert.equal(requireAdmin(null), true);
    assert.equal(requireOwner(null), true);
  } finally {
    config.authEnabled = previousAuthEnabled;
  }
});
