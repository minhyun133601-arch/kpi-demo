import fs from 'node:fs/promises';

export async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}
