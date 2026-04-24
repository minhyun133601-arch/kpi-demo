import { MODULE_KEY, MODULE_NAME, PERMISSION_KEY, RECORD_KEY } from './constants.js';
import {
  clampStartDay,
  isPlainObject,
  normalizeArchiveMeta,
  normalizeArchiveTeams,
  normalizeArchiveYearMonths,
  normalizeArchiveYears,
  normalizeDateKey,
  normalizeEntry,
  normalizeNumber,
  normalizeText,
  normalizeTimestamp,
} from './normalizers.js';

function buildArchiveSummaryMap(entries, archives) {
  const summaryByArchiveId = new Map();
  const archiveIdByFingerprint = new Map();
  const archiveIdByFileName = new Map();

  (Array.isArray(archives) ? archives : []).forEach((archive) => {
    const archiveId = normalizeText(archive?.id);
    if (!archiveId) {
      return;
    }
    summaryByArchiveId.set(archiveId, {
      years: new Set(),
      yearMonths: new Set(),
      teams: new Set(),
    });
    const fingerprint = normalizeText(archive?.fingerprint);
    const fileNameKey = normalizeText(archive?.fileName).toLowerCase();
    if (fingerprint && !archiveIdByFingerprint.has(fingerprint)) {
      archiveIdByFingerprint.set(fingerprint, archiveId);
    }
    if (fileNameKey && !archiveIdByFileName.has(fileNameKey)) {
      archiveIdByFileName.set(fileNameKey, archiveId);
    }
  });

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const sourceArchiveId = normalizeText(entry?.sourceArchiveId);
    const sourceFingerprint = normalizeText(entry?.sourceFingerprint);
    const sourceFileNameKey = normalizeText(entry?.sourceFileName).toLowerCase();
    const archiveId =
      (sourceArchiveId && summaryByArchiveId.has(sourceArchiveId) && sourceArchiveId) ||
      (sourceFingerprint ? archiveIdByFingerprint.get(sourceFingerprint) : '') ||
      (sourceFileNameKey ? archiveIdByFileName.get(sourceFileNameKey) : '');
    if (!archiveId || !summaryByArchiveId.has(archiveId)) {
      return;
    }

    const summary = summaryByArchiveId.get(archiveId);
    const date = normalizeDateKey(entry?.date);
    if (date) {
      summary.years.add(Number(date.slice(0, 4)));
      summary.yearMonths.add(date.slice(0, 7));
    }
    const teamName = normalizeText(entry?.teamName);
    if (teamName) {
      summary.teams.add(teamName);
    }
  });

  return summaryByArchiveId;
}

function groupEntriesByTeam(entries) {
  const teamMap = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const teamName = normalizeText(entry?.teamName);
    if (!teamName) {
      return;
    }
    if (!teamMap.has(teamName)) {
      teamMap.set(teamName, []);
    }
    teamMap.get(teamName).push({
      date: entry.date,
      amount: entry.amount,
      lineName: entry.lineName,
      productName: entry.productName,
      moistureExcludedYield: entry.moistureExcludedYield,
      equipmentCapa: entry.equipmentCapa,
      equipmentUtilization: entry.equipmentUtilization,
      team: teamName,
      sourceArchiveId: entry.sourceArchiveId,
      sourceFingerprint: entry.sourceFingerprint,
      sourceFileName: entry.sourceFileName,
    });
  });

  return [...teamMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], 'ko'))
    .map(([teamName, teamEntries]) => ({
      name: teamName,
      entries: teamEntries.sort((left, right) => {
        const dateDiff = normalizeText(left.date).localeCompare(normalizeText(right.date), 'ko');
        if (dateDiff !== 0) {
          return dateDiff;
        }
        const lineDiff = normalizeText(left.lineName).localeCompare(normalizeText(right.lineName), 'ko');
        if (lineDiff !== 0) {
          return lineDiff;
        }
        const productDiff = normalizeText(left.productName).localeCompare(normalizeText(right.productName), 'ko');
        if (productDiff !== 0) {
          return productDiff;
        }
        return Number(left.amount) - Number(right.amount);
      }),
    }));
}

export function buildStateMeta(stateRow) {
  return {
    moduleKey: MODULE_KEY,
    recordKey: RECORD_KEY,
    permissionKey: PERMISSION_KEY,
    moduleName: MODULE_NAME,
    version: Number.isInteger(stateRow?.version) ? stateRow.version : 1,
    updatedAt: normalizeTimestamp(stateRow?.updated_at) || new Date().toISOString(),
  };
}

export function buildStatePayload(stateRow, entryRows, archiveRows) {
  const normalizedEntries = (Array.isArray(entryRows) ? entryRows : [])
    .map((row) => ({
      date: normalizeDateKey(row.production_date),
      teamName: normalizeText(row.team_name),
      lineName: normalizeText(row.line_name),
      productName: normalizeText(row.product_name),
      amount: normalizeNumber(row.amount),
      moistureExcludedYield: normalizeNumber(row.moisture_excluded_yield),
      equipmentCapa: normalizeNumber(row.equipment_capa),
      equipmentUtilization: normalizeNumber(row.equipment_utilization),
      sourceArchiveId: normalizeText(row.source_archive_id),
      sourceFingerprint: normalizeText(row.source_fingerprint),
      sourceFileName: normalizeText(row.source_file_name),
    }))
    .filter((entry) => entry.date && entry.teamName && Number.isFinite(entry.amount));

  const normalizedArchives = (Array.isArray(archiveRows) ? archiveRows : [])
    .map((row) =>
      normalizeArchiveMeta({
        id: row.id,
        fileName: row.file_name,
        size: row.byte_size,
        type: row.mime_type,
        lastModified: row.last_modified,
        savedAt: row.saved_at,
        folder: row.folder_name,
        fingerprint: row.fingerprint,
        documentId: row.document_id,
        storage: row.storage,
        previewUrl: row.preview_url,
        downloadUrl: row.download_url,
      })
    )
    .filter(Boolean);

  const archiveSummaryMap = buildArchiveSummaryMap(normalizedEntries, normalizedArchives);
  const archives = normalizedArchives.map((archive) => {
    const summary = archiveSummaryMap.get(archive.id);
    const savedAtYearMonth = normalizeText(archive.savedAt).slice(0, 7);
    const yearMonths = summary?.yearMonths?.size
      ? normalizeArchiveYearMonths([...summary.yearMonths])
      : normalizeArchiveYearMonths(archive.yearMonths.length ? archive.yearMonths : savedAtYearMonth ? [savedAtYearMonth] : []);
    const years = summary?.years?.size
      ? normalizeArchiveYears([...summary.years])
      : normalizeArchiveYears(
          archive.years.length
            ? archive.years
            : yearMonths.map((value) => Number(value.slice(0, 4)))
        );
    const teams = summary?.teams?.size
      ? normalizeArchiveTeams([...summary.teams])
      : normalizeArchiveTeams(archive.teams);

    return {
      id: archive.id,
      fileName: archive.fileName,
      size: archive.size,
      type: archive.mimeType,
      lastModified: archive.lastModified,
      savedAt: archive.savedAt,
      folder: archive.folderName,
      fingerprint: archive.fingerprint,
      documentId: archive.documentId,
      storage: archive.storage,
      previewUrl: archive.previewUrl,
      downloadUrl: archive.downloadUrl,
      years,
      yearMonths,
      teams,
    };
  });

  return {
    meta: buildStateMeta(stateRow),
    periodDefault: {
      startDay: clampStartDay(stateRow?.period_start_day),
    },
    teams: groupEntriesByTeam(normalizedEntries),
    archives,
  };
}

export function normalizeStateSnapshot(rawState) {
  const state = isPlainObject(rawState) ? rawState : {};
  const periodDefault = isPlainObject(state.periodDefault) ? state.periodDefault : {};
  const teamRecords = Array.isArray(state.teams) ? state.teams : [];
  const archiveRecords = Array.isArray(state.archives) ? state.archives : [];

  const entryMap = new Map();
  teamRecords.forEach((teamRecord) => {
    const fallbackTeamName = normalizeText(teamRecord?.name);
    const entries = Array.isArray(teamRecord?.entries) ? teamRecord.entries : [];
    entries.forEach((entry) => {
      const normalizedEntry = normalizeEntry(entry, fallbackTeamName);
      if (!normalizedEntry || entryMap.has(normalizedEntry.dedupeKey)) {
        return;
      }
      entryMap.set(normalizedEntry.dedupeKey, normalizedEntry);
    });
  });

  const archiveMap = new Map();
  archiveRecords.forEach((archive) => {
    const normalizedArchive = normalizeArchiveMeta(archive);
    if (!normalizedArchive || archiveMap.has(normalizedArchive.id)) {
      return;
    }
    archiveMap.set(normalizedArchive.id, normalizedArchive);
  });

  return {
    periodStartDay: clampStartDay(periodDefault.startDay),
    entries: [...entryMap.values()],
    archives: [...archiveMap.values()].sort((left, right) =>
      normalizeText(right.savedAt).localeCompare(normalizeText(left.savedAt), 'ko')
    ),
  };
}
