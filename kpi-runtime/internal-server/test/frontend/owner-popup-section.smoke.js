import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const ownerSectionPath = path.join(repoRoot, 'kpi-runtime', 'sections', 'KPI.sections.owner.js');
const ownerSectionSource = await fs.readFile(ownerSectionPath, 'utf8');

function loadOwnerSection() {
  const context = {
    window: {},
  };
  vm.runInNewContext(ownerSectionSource, context, {
    filename: ownerSectionPath,
  });
  return context.window.KpiSectionFactories.owner();
}

test('owner section stays as a thin ops-console popup launcher', () => {
  const section = loadOwnerSection();

  assert.equal(section.id, 'owner');
  assert.equal(section.name, '운영 콘솔');
  assert.equal(section.icon, 'fa-user-shield');
  assert.equal(section.accent, '#176347');
  assert.equal(section.ownerOnly, true);
  assert.equal(section.directLaunch, true);
  assert.equal(section.launchUrl, 'http://127.0.0.1:3215/#server');
  assert.equal(section.launchTarget, 'popup');
  assert.equal(section.launchWindowName, 'kpi-owner-ops-console');
  assert.equal(section.launchWindowWidth, 1540);
  assert.equal(section.launchWindowHeight, 980);
  assert.equal(Array.isArray(section.categories), true);
  assert.equal(section.categories.length, 0);

  assert.doesNotMatch(ownerSectionSource, /owner-demo-/);
  assert.doesNotMatch(ownerSectionSource, /data-owner-/);
  assert.doesNotMatch(ownerSectionSource, /<iframe/i);
});
