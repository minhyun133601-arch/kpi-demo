function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeStorageFolderInput(raw) {
  const joined = Array.isArray(raw)
    ? raw.map((segment) => normalizeText(segment)).join('/')
    : normalizeText(raw);
  if (!joined) return [];
  return joined
    .split(/[\\/]+/)
    .map((segment) => normalizeText(segment))
    .filter(Boolean);
}

function cloneStorageFolder(folder) {
  return Array.isArray(folder) ? [...folder] : null;
}

const ATTACHMENT_ROOT_FOLDER = '첨부파일';
const WORK_HISTORY_FALLBACK_STORAGE_FOLDER = Object.freeze([ATTACHMENT_ROOT_FOLDER, '작업내역', '기타']);
const EQUIPMENT_ASSET_ROOT_FOLDER = 'equipment-assets';
const STORAGE_FOLDER_BY_OWNER_DOMAIN = Object.freeze({
  'audit.lux.evidence': Object.freeze([ATTACHMENT_ROOT_FOLDER, 'Audit', '조도 스캔본']),
  'work.team_calendar': Object.freeze([ATTACHMENT_ROOT_FOLDER, '작업내역', '캘린더 첨부'])
});
const WORK_HISTORY_STORAGE_FOLDER_BY_CATEGORY = Object.freeze({
  billing_pdf: Object.freeze([ATTACHMENT_ROOT_FOLDER, '작업내역', '청구서']),
  report_pdf: Object.freeze([ATTACHMENT_ROOT_FOLDER, '작업내역', '보고서'])
});
const METERING_BILLING_STORAGE_FOLDER_BY_RESOURCE = Object.freeze({
  electric: Object.freeze([ATTACHMENT_ROOT_FOLDER, '유틸리티', '전기 청구서']),
  gas: Object.freeze([ATTACHMENT_ROOT_FOLDER, '유틸리티', '가스 청구서'])
});

function resolveMeteringBillingStorageFolder({ ownerKey, metadata }) {
  const resourceType =
    normalizeText(metadata?.resourceType)
    || normalizeText(ownerKey).split(':')[0]
    || 'electric';
  return cloneStorageFolder(METERING_BILLING_STORAGE_FOLDER_BY_RESOURCE[resourceType]);
}

function resolveWorkHistoryStorageFolder({ fileCategory }) {
  const normalizedFileCategory = normalizeText(fileCategory);
  return cloneStorageFolder(
    WORK_HISTORY_STORAGE_FOLDER_BY_CATEGORY[normalizedFileCategory]
    || WORK_HISTORY_FALLBACK_STORAGE_FOLDER
  );
}

function resolveEquipmentAssetStorageFolder({ ownerDomain, ownerKey, fileCategory, metadata }) {
  const domainFolder = ownerDomain === 'audit.legal_facility' ? 'legal-facility' : 'equipment-history';
  const equipmentName = normalizeText(metadata?.equipmentName)
    || normalizeText(metadata?.facilityName)
    || normalizeText(metadata?.facility)
    || normalizeText(metadata?.name)
    || normalizeText(ownerKey).split(':')[0]
    || 'unassigned';
  const normalizedFileCategory = normalizeText(fileCategory).toLowerCase();
  const categoryFolder = /^(photo|image|images?)$/.test(normalizedFileCategory)
    ? 'images'
    : 'attachments';
  return [EQUIPMENT_ASSET_ROOT_FOLDER, domainFolder, equipmentName, categoryFolder];
}

export function resolveManagedDocumentStorageFolder(input = {}) {
  const normalizedOwnerDomain = normalizeText(input.ownerDomain);
  if (!normalizedOwnerDomain) {
    return null;
  }

  if (normalizedOwnerDomain === 'metering.billing_document') {
    return resolveMeteringBillingStorageFolder(input);
  }

  if (normalizedOwnerDomain === 'work.history') {
    return resolveWorkHistoryStorageFolder(input);
  }

  if (normalizedOwnerDomain === 'data.equipment_history' || normalizedOwnerDomain === 'audit.legal_facility') {
    return resolveEquipmentAssetStorageFolder({
      ownerDomain: normalizedOwnerDomain,
      ownerKey: input.ownerKey,
      fileCategory: input.fileCategory,
      metadata: input.metadata
    });
  }

  return cloneStorageFolder(STORAGE_FOLDER_BY_OWNER_DOMAIN[normalizedOwnerDomain]);
}

export function resolveDocumentStorage(input = {}) {
  const normalizedMetadata =
    input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? { ...input.metadata }
      : {};
  const managedStorageFolder = resolveManagedDocumentStorageFolder({
    ownerDomain: input.ownerDomain,
    ownerKey: input.ownerKey,
    fileCategory: input.fileCategory,
    metadata: normalizedMetadata
  });
  const explicitStorageFolder = normalizeStorageFolderInput(normalizedMetadata.storageFolder);
  const storageFolder = managedStorageFolder || (explicitStorageFolder.length ? explicitStorageFolder : null);

  if (storageFolder?.length) {
    normalizedMetadata.storageFolder = storageFolder.join('/');
  } else {
    delete normalizedMetadata.storageFolder;
  }

  return {
    metadata: normalizedMetadata,
    storageFolder
  };
}
