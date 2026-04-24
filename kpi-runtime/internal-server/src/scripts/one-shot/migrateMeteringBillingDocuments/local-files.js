import fs from 'node:fs/promises';
import path from 'node:path';

import { meteringAppRoot } from './constants.js';
import { normalizeText } from './normalizers.js';

export async function buildMeteringFileNameIndex(rootDir) {
  const index = new Map();

  async function walk(targetDir) {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      const bucket = index.get(entry.name) || [];
      bucket.push(fullPath);
      index.set(entry.name, bucket);
    }
  }

  await walk(rootDir);
  return index;
}

export async function resolveLocalBillingDocumentFile(rawDocument, fileNameIndex) {
  const relativePath = normalizeText(rawDocument.relativePath).replace(/[\\/]+/g, path.sep);
  if (relativePath) {
    const directPath = path.resolve(meteringAppRoot, relativePath);
    try {
      const stat = await fs.stat(directPath);
      if (stat.isFile()) {
        return {
          fullPath: directPath,
          resolvedBy: 'relativePath',
        };
      }
    } catch {
      // Fall through to file-name search.
    }
  }

  const fileName = normalizeText(rawDocument.fileName);
  if (!fileName) {
    return null;
  }

  const matches = fileNameIndex.get(fileName) || [];
  if (!matches.length) {
    return null;
  }

  return {
    fullPath: matches[0],
    resolvedBy: 'fileName',
  };
}
