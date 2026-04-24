import fs from 'node:fs/promises';
import path from 'node:path';
import { closePool } from '../../db/pool.js';
import { runtimePaths } from '../../config.js';
import { resolveDocumentStorage } from '../../lib/document-storage.js';
import { ensureDir } from '../../lib/fs.js';
import { query } from '../../db/pool.js';
import { updateDocumentStorageLocation } from '../../repositories/documents.js';

const METERING_OWNER_DOMAIN = 'metering.billing_document';

function normalizeText(value) {
  return String(value || '').trim();
}

function sanitizeStorageFolderSegments(raw) {
  const joined = Array.isArray(raw)
    ? raw.map((segment) => String(segment || '').trim()).join('/')
    : String(raw || '').trim();
  if (!joined) return [];
  return joined
    .split(/[\\/]+/)
    .map((segment) => normalizeText(segment).replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_'))
    .filter((segment) => segment && segment !== '.' && segment !== '..');
}

function getResourceType(record) {
  const metadataResourceType = normalizeText(record?.metadata?.resourceType);
  if (metadataResourceType) {
    return metadataResourceType;
  }
  const ownerKeyPrefix = normalizeText(record?.owner_key).split(':')[0];
  return ownerKeyPrefix || 'electric';
}

function getStorageFolder(resourceType) {
  const storageFolder = resolveDocumentStorage({
    ownerDomain: METERING_OWNER_DOMAIN,
    ownerKey: `${normalizeText(resourceType) || 'electric'}::default`,
    fileCategory: 'billing_document',
    metadata: {
      resourceType: normalizeText(resourceType)
    }
  }).storageFolder;
  if (!storageFolder) {
    throw new Error(`unsupported_resource_type:${resourceType}`);
  }
  return storageFolder;
}

async function moveFileIfNeeded(sourcePath, targetPath) {
  if (sourcePath === targetPath) {
    return false;
  }
  await ensureDir(path.dirname(targetPath));
  await fs.rename(sourcePath, targetPath);
  return true;
}

async function main() {
  const result = await query(
    `select id, owner_key, stored_name, storage_rel_path, metadata
       from app_documents
      where owner_domain = $1
      order by created_at asc`,
    [METERING_OWNER_DOMAIN]
  );

  const summary = {
    totalCount: result.rows.length,
    movedCount: 0,
    alreadyNormalizedCount: 0,
    skippedMissingFileCount: 0
  };

  for (const record of result.rows) {
    const resourceType = getResourceType(record);
    const storageFolder = getStorageFolder(resourceType);
    const folderParts = sanitizeStorageFolderSegments(storageFolder);
    const nextStorageRelPath = path.posix.join(...folderParts, normalizeText(record.stored_name));
    const currentStorageRelPath = normalizeText(record.storage_rel_path).replace(/[\\/]+/g, '/');
    if (currentStorageRelPath === nextStorageRelPath) {
      summary.alreadyNormalizedCount += 1;
      continue;
    }

    const sourcePath = path.join(runtimePaths.filesRoot, ...currentStorageRelPath.split('/'));
    const targetPath = path.join(runtimePaths.filesRoot, ...nextStorageRelPath.split('/'));
    try {
      await fs.stat(sourcePath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        summary.skippedMissingFileCount += 1;
        continue;
      }
      throw error;
    }

    await moveFileIfNeeded(sourcePath, targetPath);
    const resolvedStorage = resolveDocumentStorage({
      ownerDomain: METERING_OWNER_DOMAIN,
      ownerKey: normalizeText(record.owner_key),
      fileCategory: 'billing_document',
      metadata: record.metadata || {}
    });
    await updateDocumentStorageLocation({
      documentId: record.id,
      storageRelPath: nextStorageRelPath,
      metadata: resolvedStorage.metadata
    });
    summary.movedCount += 1;
  }

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await closePool().catch(() => {});
});
