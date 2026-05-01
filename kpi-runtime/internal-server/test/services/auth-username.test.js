import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeUsername } from '../../src/services/auth.js';

test('normalizeUsername accepts Korean owner usernames', () => {
  assert.equal(normalizeUsername(' 운영자A '), '운영자A');
});

test('normalizeUsername rejects separators and spaces', () => {
  assert.throws(() => normalizeUsername('운영자A/1347'), /invalid_username_format/);
  assert.throws(() => normalizeUsername('운영자 A'), /invalid_username_format/);
});
