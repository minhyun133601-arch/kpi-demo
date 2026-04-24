import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLoginPageHtml } from '../../src/routes/auth-routes.js';

test('login page shows the public demo credentials in the input fields', () => {
  const html = buildLoginPageHtml('/KPI.html');

  assert.match(html, /Demo account: ID <strong>1234<\/strong> \/ password <strong>1234<\/strong>/);
  assert.match(html, /<input id="username"[^>]*placeholder="1234"[^>]*value="1234"[^>]*required \/>/);
  assert.match(html, /<input id="password"[^>]*placeholder="1234"[^>]*value="1234"[^>]*required \/>/);
});
