import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const METERING_APP_RELATIVE_DIRECTORY = 'utility/apps/metering';
const METERING_APP_DIRECTORY_URL = new URL(
  '../../../../utility/apps/metering/',
  import.meta.url
);

export const METERING_BUNDLE_DRAFT_SOURCE_ORDER = Object.freeze([
  'shared-store.js',
  'template.js',
  'runtime/formatting.js',
  'runtime/mount-dom.js',
  'billing/document-paths.js',
  'billing/documents.js',
  'billing/directory-persistence.js',
  'billing/document-storage.js',
  'billing/settlement-calculations.js',
  'billing/settlement.js',
  'billing/settlement-records.js',
  'billing/store-normalization.js',
  'runtime/resource-meta.js',
  'runtime/resource-summary.js',
  'runtime/resource-state.js',
  'equipment/rules.js',
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
  'app.js',
  'equipment/reading-window.js',
  'equipment/reading-adjacency.js',
  'equipment/gas-boundary-reading.js',
  'equipment/usage-calculation.js',
  'equipment/usage-display.js',
  'runtime/team-usage-support.js',
  'runtime/monthly-summary-support.js',
  'runtime/icon-labels.js',
  'equipment/display-meta.js',
  'runtime/utility-snapshot-core.js',
  'runtime/utility-snapshots.js',
  'team-overview/summary.js',
  'team-overview/total-power-card.js',
  'team-overview/plantB-card.js',
  'team-overview/picker-support.js',
  'team-overview/charge-support.js',
  'team-overview/amount-support.js',
  'team-overview/assigned-list.js',
  'team-overview/selection-support.js',
  'team-overview/selection-actions.js',
  'team-overview/board-interactions.js',
  'team-overview/board-support.js',
  'team-overview/render.js',
  'team-settlement/render.js',
  'billing/document-preview.js',
  'equipment/render.js',
  'equipment/drag.js',
  'equipment/interactions.js',
  'equipment/item-editing.js',
  'equipment/quick-entry-ui.js',
  'equipment/quick-entry.js',
  'equipment/menus.js',
  'save/persistence.js',
  'save/store-sync.js',
  'save/shortcuts.js',
  'fullscreen/popup.js',
  'calendar/runtime.js',
  'runtime/bootstrap.js',
  'runtime/mount.js',
]);

export const METERING_BUNDLE_DRAFT_EXTERNAL_PRELOAD_STEP =
  'applyIntegratedMeteringServerRuntime() remains outside the draft bundle between shared-store.js and template.js.';

function countLines(text) {
  const normalizedText = String(text).replace(/\r\n/g, '\n');
  if (!normalizedText) {
    return 0;
  }

  return normalizedText.endsWith('\n')
    ? normalizedText.slice(0, -1).split('\n').length
    : normalizedText.split('\n').length;
}

function toRelativeOutputPath(outputPath) {
  return path.relative(process.cwd(), outputPath).replaceAll('\\', '/');
}

export function toMeteringBundleRelativePath(fileName) {
  return `${METERING_APP_RELATIVE_DIRECTORY}/${fileName}`;
}

export function resolveMeteringBundleSourceUrl(fileName) {
  return new URL(fileName, METERING_APP_DIRECTORY_URL);
}

export async function loadMeteringBundleDraftSources() {
  return Promise.all(
    METERING_BUNDLE_DRAFT_SOURCE_ORDER.map(async (fileName) => {
      const sourceUrl = resolveMeteringBundleSourceUrl(fileName);
      const sourceText = await fs.readFile(sourceUrl, 'utf8');
      return {
        fileName,
        relativePath: toMeteringBundleRelativePath(fileName),
        sourceText,
        lineCount: countLines(sourceText),
        byteLength: Buffer.byteLength(sourceText),
      };
    })
  );
}

export function buildMeteringBundleDraftText(sources) {
  return sources
    .map(
      ({ relativePath, sourceText }) =>
        [
          ';',
          `// metering bundle draft: ${relativePath}`,
          sourceText.trimEnd(),
          '',
        ].join('\n')
    )
    .join('\n');
}

export async function createMeteringBundleDraft() {
  const sources = await loadMeteringBundleDraftSources();
  return {
    sources,
    bundleText: buildMeteringBundleDraftText(sources),
    fileCount: sources.length,
    totalLines: sources.reduce((sum, source) => sum + source.lineCount, 0),
    totalBytes: sources.reduce((sum, source) => sum + source.byteLength, 0),
  };
}

export function verifyMeteringBundleDraftSyntax(bundleText) {
  return new vm.Script(bundleText, {
    filename: 'metering.bundle.draft.js',
  });
}

export function createMeteringBundleDraftSummary(draft, options = {}) {
  const outputPath = options.outputPath ? toRelativeOutputPath(options.outputPath) : null;
  return {
    ok: true,
    kind: 'metering-bundle-draft',
    fileCount: draft.fileCount,
    totalLines: draft.totalLines,
    totalBytes: draft.totalBytes,
    sourceOrder: draft.sources.map(({ relativePath }) => relativePath),
    externalPreloadStep: METERING_BUNDLE_DRAFT_EXTERNAL_PRELOAD_STEP,
    outputPath,
  };
}
