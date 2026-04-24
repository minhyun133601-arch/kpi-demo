import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  METERING_BUNDLE_DRAFT_EXTERNAL_PRELOAD_STEP,
  METERING_BUNDLE_DRAFT_SOURCE_ORDER,
  createMeteringBundleDraft,
  toMeteringBundleRelativePath,
  verifyMeteringBundleDraftSyntax,
} from '../../src/lib/metering-bundle-draft.js';

const REPO_ROOT_PATH = fileURLToPath(new URL('../../../../', import.meta.url));

async function findRepoFileUrl(fileName) {
  const entries = await fs.readdir(REPO_ROOT_PATH, {
    recursive: true,
    withFileTypes: true,
  });
  const match = entries.find((entry) => entry.isFile() && entry.name === fileName);
  if (!match) {
    throw new Error(`missing_repo_file:${fileName}`);
  }

  return pathToFileURL(path.join(match.parentPath, match.name));
}

function extractBridgeSourceOrder(sourceText) {
  return Array.from(
    sourceText.matchAll(
      /loadIntegratedMeteringScriptOnce\(getIntegratedMeteringAssetPath\('([^']+)', \{ cacheBust: true \}\)\)/g
    ),
    ([, fileName]) => fileName
  );
}

function assertBootHelperLoadOrder(sourceOrder) {
  const appIndex = sourceOrder.indexOf('app.js');
  assert.ok(appIndex >= 0, 'app.js must exist in metering source order');

  [
    'runtime/formatting.js',
    'runtime/mount-dom.js',
    'equipment/reading-timeline.js',
    'equipment/reading-config.js',
    'equipment/input-formatting.js',
    'equipment/input-state.js',
    'runtime/team-assignment-state.js',
    'equipment/visibility-scope.js',
    'equipment/normalization.js',
    'calendar/day-status.js',
    'runtime/entry-selection-support.js',
    'calendar/month-controls.js',
    'team-monthly/runtime.js',
    'runtime/monthly-usage-core.js',
    'runtime/store-presets.js',
    'runtime/store-merge.js',
    'runtime/store-normalization.js',
    'runtime/resource-ui.js',
    'runtime/entry-ui.js',
    'runtime/entry-actions.js',
    'runtime/selection-ui.js',
    'runtime/selection-display-ui.js',
    'team-settlement/actions.js',
    'team-settlement/document-actions.js',
    'team-settlement/attach-actions.js',
    'team-settlement/form-actions.js',
    'billing/directory-persistence.js',
    'billing/settlement-records.js',
    'billing/store-normalization.js',
  ].forEach((fileName) => {
    const sourceIndex = sourceOrder.indexOf(fileName);
    assert.ok(sourceIndex >= 0, `${fileName} must exist in metering source order`);
    assert.ok(sourceIndex < appIndex, `${fileName} must load before app.js boot`);
  });
}

function assertRuntimeMountDomLoadOrder(sourceOrder) {
  const mountDomIndex = sourceOrder.indexOf('runtime/mount-dom.js');
  const billingDocumentStorageIndex = sourceOrder.indexOf('billing/document-storage.js');
  const billingDocumentPreviewIndex = sourceOrder.indexOf('billing/document-preview.js');
  const appIndex = sourceOrder.indexOf('app.js');

  assert.ok(mountDomIndex >= 0, 'runtime/mount-dom.js must exist in metering source order');
  assert.ok(
    billingDocumentStorageIndex >= 0,
    'billing/document-storage.js must exist in metering source order'
  );
  assert.ok(
    billingDocumentPreviewIndex >= 0,
    'billing/document-preview.js must exist in metering source order'
  );
  assert.ok(appIndex >= 0, 'app.js must exist in metering source order');
  assert.ok(
    mountDomIndex < billingDocumentStorageIndex,
    'runtime/mount-dom.js must load before billing/document-storage.js'
  );
  assert.ok(
    mountDomIndex < billingDocumentPreviewIndex,
    'runtime/mount-dom.js must load before billing/document-preview.js'
  );
  assert.ok(mountDomIndex < appIndex, 'runtime/mount-dom.js must load before app.js');
}

function assertRuntimeBootstrapLoadOrder(sourceOrder) {
  const bootstrapIndex = sourceOrder.indexOf('runtime/bootstrap.js');
  const mountIndex = sourceOrder.indexOf('runtime/mount.js');

  assert.ok(bootstrapIndex >= 0, 'runtime/bootstrap.js must exist in metering source order');
  assert.ok(mountIndex >= 0, 'runtime/mount.js must exist in metering source order');
  assert.ok(bootstrapIndex < mountIndex, 'runtime/bootstrap.js must load before runtime/mount.js');
}

test('metering bundle draft keeps the current bridge source order', async () => {
  const draft = await createMeteringBundleDraft();
  const bridgeScriptUrl = await findRepoFileUrl('KPI.util.metering.bridge.js');
  const bridgeSourceText = await fs.readFile(bridgeScriptUrl, 'utf8');
  const bridgeSourceOrder = extractBridgeSourceOrder(bridgeSourceText);

  assert.deepEqual(
    draft.sources.map(({ fileName }) => fileName),
    [...METERING_BUNDLE_DRAFT_SOURCE_ORDER]
  );
  assert.deepEqual(bridgeSourceOrder, [...METERING_BUNDLE_DRAFT_SOURCE_ORDER]);
  assert.equal(
    draft.sources[0].relativePath,
    toMeteringBundleRelativePath(METERING_BUNDLE_DRAFT_SOURCE_ORDER[0])
  );
  assert.equal(
    draft.sources.at(-1).relativePath,
    toMeteringBundleRelativePath(METERING_BUNDLE_DRAFT_SOURCE_ORDER.at(-1))
  );
  assert.match(
    METERING_BUNDLE_DRAFT_EXTERNAL_PRELOAD_STEP,
    /shared-store\.js.+template\.js/
  );
  assertBootHelperLoadOrder(METERING_BUNDLE_DRAFT_SOURCE_ORDER);
  assertRuntimeMountDomLoadOrder(METERING_BUNDLE_DRAFT_SOURCE_ORDER);
  assertRuntimeBootstrapLoadOrder(METERING_BUNDLE_DRAFT_SOURCE_ORDER);
});

test('metering bundle draft compiles as one script without runtime rewiring', async () => {
  const draft = await createMeteringBundleDraft();
  const compiledBundle = verifyMeteringBundleDraftSyntax(draft.bundleText);

  assert.ok(compiledBundle);
  assert.equal(draft.fileCount, METERING_BUNDLE_DRAFT_SOURCE_ORDER.length);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/shared-store\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/mount-dom\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/entry-ui\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/entry-actions\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/selection-ui\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/selection-display-ui\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/equipment\/reading-timeline\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/equipment\/input-formatting\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/equipment\/input-state\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/monthly-usage-core\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/store-normalization\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/team-settlement\/actions\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/team-settlement\/document-actions\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/team-settlement\/attach-actions\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/team-settlement\/form-actions\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/bootstrap\.js/);
  assert.match(draft.bundleText, /metering bundle draft: .*apps\/metering\/runtime\/mount\.js/);
});

test('metering bundle draft includes billing settlement records before app boot', async () => {
  const appIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf('app.js');
  const recordsIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf('billing/settlement-records.js');

  assert.ok(recordsIndex >= 0);
  assert.ok(recordsIndex < appIndex);

  const draft = await createMeteringBundleDraft();
  assert.match(draft.bundleText, /billing\/settlement-records\.js/);
});

test('metering bundle draft includes billing store normalization before app boot', async () => {
  const appIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf('app.js');
  const storeNormalizationIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf(
    'billing/store-normalization.js'
  );

  assert.ok(storeNormalizationIndex >= 0);
  assert.ok(storeNormalizationIndex < appIndex);

  const draft = await createMeteringBundleDraft();
  assert.match(draft.bundleText, /billing\/store-normalization\.js/);
});

test('metering bundle draft includes runtime store merge before app boot', async () => {
  const appIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf('app.js');
  const monthlyUsageCoreIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf(
    'runtime/monthly-usage-core.js'
  );
  const storePresetsIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf(
    'runtime/store-presets.js'
  );
  const storeMergeIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf(
    'runtime/store-merge.js'
  );
  const storeNormalizationIndex = METERING_BUNDLE_DRAFT_SOURCE_ORDER.indexOf(
    'runtime/store-normalization.js'
  );

  assert.ok(monthlyUsageCoreIndex >= 0);
  assert.ok(storePresetsIndex >= 0);
  assert.ok(monthlyUsageCoreIndex < storePresetsIndex);
  assert.ok(storeMergeIndex >= 0);
  assert.ok(storePresetsIndex < storeMergeIndex);
  assert.ok(storeNormalizationIndex >= 0);
  assert.ok(storeMergeIndex < storeNormalizationIndex);
  assert.ok(storeNormalizationIndex < appIndex);

  const draft = await createMeteringBundleDraft();
  assert.match(draft.bundleText, /runtime\/monthly-usage-core\.js/);
  assert.match(draft.bundleText, /runtime\/store-presets\.js/);
  assert.match(draft.bundleText, /runtime\/store-merge\.js/);
  assert.match(draft.bundleText, /runtime\/store-normalization\.js/);
});
