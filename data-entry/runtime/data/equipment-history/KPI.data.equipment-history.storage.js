(function () {
    const api = window.KpiDataEquipmentHistory || (window.KpiDataEquipmentHistory = {});
    const DATA_KEY = 'data_equipment_history_card';
    const OWNER_DOMAIN = 'data.equipment_history';
    const PHOTO_CATEGORY = 'photo';
    const ATTACHMENT_CATEGORY = 'attachment';

    function cloneJson(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function getRuntimeConfig() {
        const dataRuntime = window.__KPI_SERVER_RUNTIME_CONFIG__?.data;
        const record = dataRuntime?.records?.[DATA_KEY];
        const assets = dataRuntime?.assets?.equipmentHistory || {};
        if (!dataRuntime || dataRuntime.enabled !== true || !record) return null;
        return {
            apiBase: String(dataRuntime.apiBase || '/api').trim() || '/api',
            moduleKey: String(dataRuntime.moduleKey || 'portal_data').trim() || 'portal_data',
            recordKey: String(record.recordKey || DATA_KEY).trim() || DATA_KEY,
            permissionKey: String(record.permissionKey || assets.permissionKey || '').trim(),
            readEnabled: record.readEnabled === true,
            writeEnabled: record.writeEnabled === true,
            assetPermissionKey: String(assets.permissionKey || record.permissionKey || '').trim(),
            assetWriteEnabled: assets.writeEnabled === true || record.writeEnabled === true,
            ownerDomain: String(assets.ownerDomain || OWNER_DOMAIN).trim() || OWNER_DOMAIN,
            imageFileCategory: String(assets.imageFileCategory || PHOTO_CATEGORY).trim() || PHOTO_CATEGORY,
            attachmentFileCategory: String(assets.attachmentFileCategory || ATTACHMENT_CATEGORY).trim() || ATTACHMENT_CATEGORY,
        };
    }

    function canSaveEquipmentHistoryToServer() {
        const runtime = getRuntimeConfig();
        return window.KpiRuntime?.canUseServerWrite?.(runtime?.writeEnabled === true) === true
            && runtime?.assetWriteEnabled === true
            && typeof fetch === 'function';
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const commaIndex = result.indexOf(',');
                resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
            };
            reader.onerror = () => reject(reader.error || new Error('equipment_history_file_read_failed'));
            reader.readAsDataURL(file);
        });
    }

    function getExtension(file) {
        const name = String(file?.name || '').trim();
        const match = name.match(/(\.[A-Za-z0-9]{1,16})$/);
        return match?.[1] || '';
    }

    function getEquipmentName(draft) {
        return api.normalizeText(draft?.name || draft?.equipmentCode || draft?.id || 'unassigned');
    }

    function buildOwnerKey(draft, rowId = '') {
        const equipmentId = api.normalizeText(draft?.id || draft?.equipmentCode || draft?.name || 'unassigned');
        return [equipmentId, api.normalizeText(rowId)].filter(Boolean).join(':');
    }

    function buildUploadName(file, draft, label) {
        const equipmentName = getEquipmentName(draft);
        const ext = getExtension(file);
        return `${equipmentName} ${label}${ext}`.trim();
    }

    async function uploadEquipmentHistoryFile(file, draft, options = {}) {
        const runtime = getRuntimeConfig();
        if (!runtime || !canSaveEquipmentHistoryToServer()) {
            throw new Error('server_write_unavailable');
        }
        if (!file) return null;

        const fileCategory = options.fileCategory || runtime.attachmentFileCategory;
        const originalName = options.originalName || buildUploadName(file, draft, fileCategory);
        const mimeType = String(file.type || 'application/octet-stream').trim() || 'application/octet-stream';
        const base64Data = await readFileAsBase64(file);
        const equipmentName = getEquipmentName(draft);
        const response = await fetch(`${runtime.apiBase.replace(/\/+$/, '')}/files/base64`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                permissionKey: runtime.assetPermissionKey || runtime.permissionKey,
                ownerDomain: runtime.ownerDomain,
                ownerKey: buildOwnerKey(draft, options.rowId),
                fileCategory,
                originalName,
                mimeType,
                base64Data,
                metadata: {
                    dataKey: DATA_KEY,
                    equipmentId: api.normalizeText(draft?.id || draft?.equipmentCode),
                    equipmentName,
                    sourceFileName: String(file.name || originalName).trim(),
                    originalName,
                    rowId: api.normalizeText(options.rowId),
                },
            }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok || !payload?.document?.id) {
            throw new Error(payload?.error || `http_${response.status}`);
        }
        return payload.document;
    }

    function documentRecordToPayload(document, fallbackName = '') {
        if (!document?.id) return {};
        const documentId = String(document.id || '').trim();
        return {
            documentId,
            fileName: String(document.original_name || fallbackName || '').trim(),
            originalName: String(document.original_name || fallbackName || '').trim(),
            mimeType: String(document.mime_type || '').trim(),
            storageRelPath: String(document.storage_rel_path || '').trim(),
            previewUrl: `/api/files/${encodeURIComponent(documentId)}/view`,
            downloadUrl: `/api/files/${encodeURIComponent(documentId)}/download`,
        };
    }

    async function uploadEquipmentHistoryDraftAssets(draft) {
        if (!draft) return draft;
        if (draft.photoFile) {
            const document = await uploadEquipmentHistoryFile(draft.photoFile, draft, {
                fileCategory: PHOTO_CATEGORY,
                originalName: buildUploadName(draft.photoFile, draft, 'photo'),
            });
            const uploaded = documentRecordToPayload(document, draft.photoName);
            draft.photoDocumentId = uploaded.documentId;
            draft.photoPreviewUrl = uploaded.previewUrl;
            draft.photoDownloadUrl = uploaded.downloadUrl;
            draft.photoStorageRelPath = uploaded.storageRelPath;
            draft.photoName = uploaded.fileName || draft.photoName;
            draft.photoDataUrl = '';
            delete draft.photoFile;
        }

        api.asList(draft.documents).forEach((row) => {
            if (!row.clientRowId) row.clientRowId = `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        });
        for (const row of api.asList(draft.documents)) {
            if (!row?.pendingFile) continue;
            const document = await uploadEquipmentHistoryFile(row.pendingFile, draft, {
                rowId: row.clientRowId,
                fileCategory: ATTACHMENT_CATEGORY,
                originalName: row.fileName || row.pendingFile.name || buildUploadName(row.pendingFile, draft, 'attachment'),
            });
            Object.assign(row, documentRecordToPayload(document, row.fileName));
            delete row.pendingFile;
        }
        return draft;
    }

    function collectEquipmentHistoryDraftDocumentIds(draft) {
        const documentIds = [];
        const photoDocumentId = String(draft?.photoDocumentId || '').trim();
        if (photoDocumentId) documentIds.push(photoDocumentId);
        api.asList(draft?.documents).forEach((row) => {
            const documentId = String(row?.documentId || '').trim();
            if (documentId) documentIds.push(documentId);
        });
        return Array.from(new Set(documentIds));
    }

    async function deleteEquipmentHistoryDocument(documentId) {
        const normalizedDocumentId = String(documentId || '').trim();
        if (!normalizedDocumentId || typeof fetch !== 'function') return true;
        const response = await fetch(`/api/files/${encodeURIComponent(normalizedDocumentId)}`, {
            method: 'DELETE',
            credentials: 'same-origin',
        });
        if (response.status === 404) return true;
        if (!response.ok) throw new Error(`http_${response.status}`);
        return true;
    }

    function clearDeletedEquipmentHistoryDraftReferences(draft, deletedDocumentIds) {
        const deletedSet = new Set(deletedDocumentIds);
        if (deletedSet.has(String(draft?.photoDocumentId || '').trim())) {
            draft.photoDocumentId = '';
            draft.photoPreviewUrl = '';
            draft.photoDownloadUrl = '';
            draft.photoStorageRelPath = '';
            draft.photoName = '';
        }
        api.asList(draft?.documents).forEach((row) => {
            if (!deletedSet.has(String(row?.documentId || '').trim())) return;
            row.documentId = '';
            row.fileName = '';
            row.originalName = '';
            row.mimeType = '';
            row.storageRelPath = '';
            row.previewUrl = '';
            row.downloadUrl = '';
        });
    }

    async function deleteEquipmentHistoryUploadedDraftAssets(draft, previousDocumentIds = []) {
        const previousSet = new Set((previousDocumentIds || []).map((item) => String(item || '').trim()).filter(Boolean));
        const nextDocumentIds = collectEquipmentHistoryDraftDocumentIds(draft)
            .filter((documentId) => !previousSet.has(documentId));
        const deletedDocumentIds = [];
        for (const documentId of nextDocumentIds) {
            await deleteEquipmentHistoryDocument(documentId);
            deletedDocumentIds.push(documentId);
        }
        clearDeletedEquipmentHistoryDraftReferences(draft, deletedDocumentIds);
        return true;
    }

    async function saveEquipmentHistoryPayload(payload) {
        const runtime = getRuntimeConfig();
        if (!runtime || !canSaveEquipmentHistoryToServer()) return false;
        const nextPayload = cloneJson(payload);
        nextPayload.meta = nextPayload.meta || {};
        nextPayload.meta.updatedAt = new Date().toISOString();
        window.PortalData = window.PortalData || {};
        window.PortalData[DATA_KEY] = cloneJson(nextPayload);

        const response = await fetch(`${runtime.apiBase.replace(/\/+$/, '')}/modules/${encodeURIComponent(runtime.moduleKey)}/records/${encodeURIComponent(runtime.recordKey)}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                permissionKey: runtime.permissionKey,
                payload: nextPayload,
            }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.ok) {
            throw new Error(result?.error || `http_${response.status}`);
        }
        if (result?.record?.payload) {
            window.PortalData[DATA_KEY] = cloneJson(result.record.payload);
            return result.record.payload;
        }
        return nextPayload;
    }

    function getEquipmentPhotoPreviewUrl(draft) {
        return api.normalizeText(draft?.photoPreviewUrl || draft?.photoDataUrl);
    }

    Object.assign(api, {
        getEquipmentHistoryRuntimeConfig: getRuntimeConfig,
        canSaveEquipmentHistoryToServer,
        uploadEquipmentHistoryDraftAssets,
        collectEquipmentHistoryDraftDocumentIds,
        deleteEquipmentHistoryUploadedDraftAssets,
        saveEquipmentHistoryPayload,
        getEquipmentPhotoPreviewUrl,
    });
})();
