import fs from 'node:fs/promises';
import path from 'node:path';

import {
  createMeteringBundleDraft,
  createMeteringBundleDraftSummary,
  verifyMeteringBundleDraftSyntax,
} from '../lib/metering-bundle-draft.js';

function parseArgs(argv) {
  const options = {
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--out') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('missing_out_path');
      }
      options.outputPath = path.resolve(process.cwd(), nextValue);
      index += 1;
      continue;
    }

    throw new Error(`unknown_argument:${token}`);
  }

  return options;
}

async function writeBundleDraft(outputPath, bundleText) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, bundleText, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const draft = await createMeteringBundleDraft();
  verifyMeteringBundleDraftSyntax(draft.bundleText);

  if (options.outputPath) {
    await writeBundleDraft(options.outputPath, draft.bundleText);
  }

  console.log(JSON.stringify(createMeteringBundleDraftSummary(draft, options), null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
