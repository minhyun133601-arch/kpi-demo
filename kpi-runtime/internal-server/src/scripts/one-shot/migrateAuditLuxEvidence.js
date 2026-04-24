import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config.js';
import { closePool } from '../../db/pool.js';
import { ensureDir } from '../../lib/fs.js';
import { findModuleRecord, upsertModuleRecord } from '../../repositories/modules.js';
import { findLatestDocumentByOwner } from '../../repositories/documents.js';
import { initializeFileStorage, saveBase64Document } from '../../services/files.js';

const MODULE_KEY = 'portal_data';
const RECORD_KEY = 'audit_lux';
const OWNER_DOMAIN = 'audit.lux.evidence';
const FILE_CATEGORY = 'evidence';
const STORAGE_FOLDER = ['Audit', '조도 스캔본'];
const LEGACY_AUDIT_LUX_DIR = path.join(config.localSourceRoot, 'audit', '조도');
const backupDir = path.join(config.storageRoot, 'migration-backups');

function normalizeText(value) {
  return String(value || '').trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function parseArgs(argv) {
  return {
    write: argv.includes('--write')
  };
}

function buildOwnerKey(year, team) {
  return ['audit_lux', String(Number(year) || ''), normalizeText(team)].filter(Boolean).join(':');
}

function resolveMimeType(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function buildUploadName(year, team, filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase() || '.jpg';
  return `${Number(year)} ${normalizeText(team)} 조도${ext}`;
}

function buildPreviewUrl(documentId) {
  return `/api/files/${documentId}/view`;
}

function buildDownloadUrl(documentId) {
  return `/api/files/${documentId}/download`;
}

async function resolveLegacyFile(item) {
  const rawPath = normalizeText(item?.file || item?.path);
  if (!rawPath) {
    return null;
  }

  const fullPath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(config.localSourceRoot, rawPath.replace(/[\\/]+/g, path.sep));
  const stat = await fs.stat(fullPath).catch(() => null);
  if (!stat?.isFile()) {
    return null;
  }

  return {
    rawPath,
    fullPath
  };
}

function buildMigratedEvidenceItem(item, documentRecord, fallbackName) {
  const nextItem = {
    ...item,
    documentId: normalizeText(documentRecord.id),
    fileName: normalizeText(item?.fileName || item?.originalName || documentRecord.original_name || fallbackName),
    originalName: normalizeText(documentRecord.original_name || fallbackName),
    mimeType: normalizeText(documentRecord.mime_type),
    previewUrl: buildPreviewUrl(documentRecord.id),
    downloadUrl: buildDownloadUrl(documentRecord.id)
  };

  delete nextItem.file;
  delete nextItem.path;
  delete nextItem.previewFile;
  delete nextItem.preview;
  delete nextItem.pdf;
  delete nextItem.pdfFile;
  return nextItem;
}

async function writeBackupSnapshot(record) {
  await ensureDir(backupDir);
  const filePath = path.join(
    backupDir,
    `audit-lux-evidence-v${record.version}-${Date.now()}.json`
  );
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        moduleKey: record.module_key,
        recordKey: record.record_key,
        version: record.version,
        updatedAt: record.updated_at,
        payload: record.payload
      },
      null,
      2
    ),
    'utf8'
  );
  return filePath;
}

function createSummary() {
  return {
    totalEvidenceCount: 0,
    alreadyManagedCount: 0,
    migratableCount: 0,
    migratedCount: 0,
    reusedExistingDocumentCount: 0,
    unresolvedCount: 0,
    unresolvedItems: [],
    migratedItems: [],
    backupPath: '',
    legacySourceDir: LEGACY_AUDIT_LUX_DIR
  };
}

async function migrateAuditLuxEvidence(record, options) {
  const payload = cloneJson(record.payload ?? {});
  const evidenceList = Array.isArray(payload.evidence) ? payload.evidence : [];
  const summary = createSummary();
  summary.totalEvidenceCount = evidenceList.length;

  if (options.write) {
    await initializeFileStorage();
  }

  const nextEvidence = [];
  for (const item of evidenceList) {
    if (!isPlainObject(item)) {
      nextEvidence.push(item);
      continue;
    }

    const year = Number(item.year);
    const team = normalizeText(item.team);
    const ownerKey = buildOwnerKey(year, team);

    if (normalizeText(item.documentId)) {
      summary.alreadyManagedCount += 1;
      nextEvidence.push({
        ...item,
        previewUrl: normalizeText(item.previewUrl) || buildPreviewUrl(item.documentId),
        downloadUrl: normalizeText(item.downloadUrl) || buildDownloadUrl(item.documentId)
      });
      continue;
    }

    const resolvedLegacyFile = await resolveLegacyFile(item);
    if (!resolvedLegacyFile || !Number.isFinite(year) || !team) {
      summary.unresolvedCount += 1;
      summary.unresolvedItems.push({
        id: normalizeText(item.id),
        year,
        team,
        file: normalizeText(item.file || item.path)
      });
      nextEvidence.push(item);
      continue;
    }

    const fallbackName = buildUploadName(year, team, resolvedLegacyFile.fullPath);
    let documentRecord = await findLatestDocumentByOwner({
      ownerDomain: OWNER_DOMAIN,
      ownerKey,
      fileCategory: FILE_CATEGORY
    });

    if (documentRecord) {
      summary.reusedExistingDocumentCount += 1;
      summary.migratableCount += 1;
    } else if (options.write) {
      const binary = await fs.readFile(resolvedLegacyFile.fullPath);
      documentRecord = await saveBase64Document({
        actorUserId: null,
        permissionKey: normalizeText(record.permission_key),
        ownerDomain: OWNER_DOMAIN,
        ownerKey,
        fileCategory: FILE_CATEGORY,
        originalName: fallbackName,
        mimeType: resolveMimeType(resolvedLegacyFile.fullPath),
        base64Data: binary.toString('base64'),
        metadata: {
          dataKey: RECORD_KEY,
          year,
          team,
          originalName: fallbackName,
          storageFolder: STORAGE_FOLDER
        }
      });
      summary.migratableCount += 1;
      summary.migratedCount += 1;
    } else {
      summary.migratableCount += 1;
      summary.migratedItems.push({
        id: normalizeText(item.id),
        team,
        year,
        documentId: '',
        fileName: fallbackName
      });
      nextEvidence.push(item);
      continue;
    }

    if (!documentRecord) {
      summary.unresolvedCount += 1;
      summary.unresolvedItems.push({
        id: normalizeText(item.id),
        year,
        team,
        file: resolvedLegacyFile.rawPath
      });
      nextEvidence.push(item);
      continue;
    }

    const migratedItem = buildMigratedEvidenceItem(item, documentRecord, fallbackName);
    nextEvidence.push(migratedItem);
    summary.migratedItems.push({
      id: normalizeText(migratedItem.id),
      team,
      year,
      documentId: normalizeText(migratedItem.documentId),
      fileName: normalizeText(migratedItem.fileName)
    });
  }

  payload.evidence = nextEvidence;
  return {
    nextPayload: payload,
    summary
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const record = await findModuleRecord(MODULE_KEY, RECORD_KEY);
  if (!record) {
    throw new Error('audit_lux_record_not_found');
  }

  const { nextPayload, summary } = await migrateAuditLuxEvidence(record, options);
  if (options.write) {
    summary.backupPath = await writeBackupSnapshot(record);
    await upsertModuleRecord({
      moduleKey: MODULE_KEY,
      recordKey: RECORD_KEY,
      permissionKey: normalizeText(record.permission_key),
      payload: nextPayload,
      updatedByUserId: null,
      expectedVersion: record.version
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: options.write ? 'write' : 'preview',
        summary
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}).finally(async () => {
  await closePool().catch(() => {});
});
