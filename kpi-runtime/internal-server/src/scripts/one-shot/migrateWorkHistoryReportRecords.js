import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { config } from '../../config.js';
import { closePool } from '../../db/pool.js';
import { ensureDir } from '../../lib/fs.js';
import { findModuleRecord, upsertModuleRecord } from '../../repositories/modules.js';

const MODULE_KEY = 'portal_data';
const RECORD_KEY = 'work_history_records';
const REPORT_TEAM_KEY = 'team4';
const REPORT_CATEGORY_GROUP = 'report';
const SEED_FILE_PATH = path.join(
  config.repoRoot,
  '서버 이식 - 보고서 관리',
  'seed',
  'team-report',
  'data',
  'current',
  'data_work_history_records.js'
);
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

async function loadSeedPayload() {
  const source = await fs.readFile(SEED_FILE_PATH, 'utf8');
  const sandbox = { window: { PortalData: {} } };
  vm.createContext(sandbox);
  new vm.Script(source, { filename: SEED_FILE_PATH }).runInContext(sandbox);

  const payload = sandbox.window?.PortalData?.work_history_records;
  if (!isPlainObject(payload)) {
    throw new Error('invalid_seed_payload');
  }
  return payload;
}

function isReportRecordCandidate(record) {
  if (!isPlainObject(record)) return false;
  if (normalizeText(record.team) !== REPORT_TEAM_KEY) return false;
  if (normalizeText(record.categoryGroup) !== REPORT_CATEGORY_GROUP) return false;

  const reportAttachment = record.attachmentSlots?.report;
  return isPlainObject(reportAttachment)
    && Boolean(
      normalizeText(reportAttachment.originalName)
      || normalizeText(reportAttachment.url)
      || normalizeText(reportAttachment.downloadUrl)
    );
}

function buildRecordIdentity(record) {
  const reportAttachment = record?.attachmentSlots?.report;
  const reportName = normalizeText(
    reportAttachment?.originalName
    || reportAttachment?.downloadUrl
    || reportAttachment?.url
    || record?.workContent
  );
  return [
    normalizeText(record?.team),
    normalizeText(record?.startDate),
    normalizeText(record?.endDate),
    reportName
  ].join('::').toLowerCase();
}

function summarizeRecord(record) {
  return {
    team: normalizeText(record?.team),
    startDate: normalizeText(record?.startDate),
    endDate: normalizeText(record?.endDate),
    workContent: normalizeText(record?.workContent),
    reportName: normalizeText(record?.attachmentSlots?.report?.originalName)
  };
}

function compareRecordsDesc(left, right) {
  const endDiff = normalizeText(right?.endDate).localeCompare(normalizeText(left?.endDate));
  if (endDiff !== 0) return endDiff;

  const startDiff = normalizeText(right?.startDate).localeCompare(normalizeText(left?.startDate));
  if (startDiff !== 0) return startDiff;

  return normalizeText(left?.workContent).localeCompare(normalizeText(right?.workContent), 'ko');
}

function getSeedReportRecords(seedPayload) {
  const teamRecords = Array.isArray(seedPayload?.teams?.[REPORT_TEAM_KEY])
    ? seedPayload.teams[REPORT_TEAM_KEY]
    : [];
  return teamRecords
    .filter(isReportRecordCandidate)
    .map((record) => cloneJson(record));
}

function mergeReportRecords(currentPayload, seedReportRecords) {
  const nextPayload = cloneJson(currentPayload);
  nextPayload.meta = isPlainObject(nextPayload.meta) ? nextPayload.meta : {};
  nextPayload.teams = isPlainObject(nextPayload.teams) ? nextPayload.teams : {};

  const existingTeamRecords = Array.isArray(nextPayload.teams[REPORT_TEAM_KEY])
    ? nextPayload.teams[REPORT_TEAM_KEY].map((record) => cloneJson(record))
    : [];
  const existingKeys = new Set(existingTeamRecords.map(buildRecordIdentity).filter(Boolean));
  const added = [];
  const skipped = [];

  for (const record of seedReportRecords) {
    const identity = buildRecordIdentity(record);
    if (!identity || existingKeys.has(identity)) {
      skipped.push(summarizeRecord(record));
      continue;
    }

    existingTeamRecords.push(record);
    existingKeys.add(identity);
    added.push(summarizeRecord(record));
  }

  nextPayload.teams[REPORT_TEAM_KEY] = existingTeamRecords.sort(compareRecordsDesc);
  nextPayload.meta.updatedAt = new Date().toISOString();

  return {
    nextPayload,
    added,
    skipped,
    finalTeamRecordCount: nextPayload.teams[REPORT_TEAM_KEY].length
  };
}

async function writeBackupSnapshot(record) {
  await ensureDir(backupDir);
  const filePath = path.join(
    backupDir,
    `work-history-report-records-v${record.version}-${Date.now()}.json`
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const record = await findModuleRecord(MODULE_KEY, RECORD_KEY);
  if (!record) {
    throw new Error('work_history_record_not_found');
  }

  const seedPayload = await loadSeedPayload();
  const seedReportRecords = getSeedReportRecords(seedPayload);
  if (!seedReportRecords.length) {
    throw new Error('work_history_report_seed_empty');
  }

  const payload = isPlainObject(record.payload) ? record.payload : {};
  const preview = mergeReportRecords(payload, seedReportRecords);

  let backupPath = '';
  let nextVersion = record.version;
  if (options.write && preview.added.length > 0) {
    backupPath = await writeBackupSnapshot(record);
    const nextRecord = await upsertModuleRecord({
      moduleKey: record.module_key,
      recordKey: record.record_key,
      permissionKey: normalizeText(record.permission_key),
      payload: preview.nextPayload,
      updatedByUserId: null,
      expectedVersion: record.version
    });
    nextVersion = nextRecord.version;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: options.write ? 'write' : 'preview',
        seedFilePath: SEED_FILE_PATH,
        seedReportCount: seedReportRecords.length,
        addedCount: preview.added.length,
        skippedCount: preview.skipped.length,
        finalTeam4RecordCount: preview.finalTeamRecordCount,
        added: preview.added,
        skipped: preview.skipped,
        backupPath,
        nextVersion
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
