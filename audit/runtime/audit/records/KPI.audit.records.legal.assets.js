(function () {
    const api = window.KpiAuditLegalAssets || (window.KpiAuditLegalAssets = {});
    const OWNER_DOMAIN = 'audit.legal_facility';
    const IMAGE_CATEGORY = 'photo';
    const ATTACHMENT_CATEGORY = 'attachment';

    function normalizeText(value) {
        return String(value || '').trim();
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getRuntimeConfig() {
        const auditRuntime = window.__KPI_SERVER_RUNTIME_CONFIG__?.audit;
        const record = auditRuntime?.records?.audit_legal_facility;
        const assets = auditRuntime?.assets?.legalFacility || {};
        if (!auditRuntime || auditRuntime.enabled !== true || !record) return null;
        return {
            apiBase: normalizeText(auditRuntime.apiBase || '/api') || '/api',
            permissionKey: normalizeText(assets.permissionKey || record.permissionKey),
            writeEnabled: assets.writeEnabled === true || record.writeEnabled === true,
            ownerDomain: normalizeText(assets.ownerDomain || OWNER_DOMAIN) || OWNER_DOMAIN,
            imageFileCategory: normalizeText(assets.imageFileCategory || IMAGE_CATEGORY) || IMAGE_CATEGORY,
            attachmentFileCategory: normalizeText(assets.attachmentFileCategory || ATTACHMENT_CATEGORY) || ATTACHMENT_CATEGORY,
        };
    }

    function canWrite() {
        const runtime = getRuntimeConfig();
        return window.KpiRuntime?.canUseServerWrite?.(runtime?.writeEnabled === true) === true
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
            reader.onerror = () => reject(reader.error || new Error('audit_legal_file_read_failed'));
            reader.readAsDataURL(file);
        });
    }

    function getExtension(file) {
        const match = normalizeText(file?.name).match(/(\.[A-Za-z0-9]{1,16})$/);
        return match?.[1] || '';
    }

    function buildUploadName(file, facilityName, label) {
        return `${facilityName || 'legal-facility'} ${label}${getExtension(file)}`.trim();
    }

    function documentRecordToPayload(document, fallbackName) {
        if (!document?.id) return {};
        const documentId = normalizeText(document.id);
        return {
            documentId,
            fileName: normalizeText(document.original_name || fallbackName),
            originalName: normalizeText(document.original_name || fallbackName),
            mimeType: normalizeText(document.mime_type),
            storageRelPath: normalizeText(document.storage_rel_path),
            previewUrl: `/api/files/${encodeURIComponent(documentId)}/view`,
            downloadUrl: `/api/files/${encodeURIComponent(documentId)}/download`,
        };
    }

    async function uploadLegalFacilityFile(record, file, fileCategory, label) {
        const runtime = getRuntimeConfig();
        if (!runtime || !canWrite()) throw new Error('server_write_unavailable');
        const facilityName = normalizeText(record?.facility || record?.managementNo || 'legal-facility');
        const originalName = buildUploadName(file, facilityName, label);
        const mimeType = normalizeText(file?.type || 'application/octet-stream') || 'application/octet-stream';
        const base64Data = await readFileAsBase64(file);
        const response = await fetch(`${runtime.apiBase.replace(/\/+$/, '')}/files/base64`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                permissionKey: runtime.permissionKey,
                ownerDomain: runtime.ownerDomain,
                ownerKey: normalizeText(record?.id || record?.managementNo || facilityName),
                fileCategory,
                originalName,
                mimeType,
                base64Data,
                metadata: {
                    dataKey: 'audit_legal_facility',
                    facilityId: normalizeText(record?.id),
                    facilityName,
                    equipmentName: facilityName,
                    managementNo: normalizeText(record?.managementNo),
                    sourceFileName: normalizeText(file?.name || originalName),
                    originalName,
                },
            }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok || !payload?.document?.id) {
            throw new Error(payload?.error || `http_${response.status}`);
        }
        return documentRecordToPayload(payload.document, originalName);
    }

    async function deleteLegalFacilityDocument(documentId) {
        const normalizedDocumentId = normalizeText(documentId);
        if (!normalizedDocumentId || typeof fetch !== 'function') return true;
        const response = await fetch(`/api/files/${encodeURIComponent(normalizedDocumentId)}`, {
            method: 'DELETE',
            credentials: 'same-origin',
        });
        if (response.status === 404) return true;
        if (!response.ok) throw new Error(`http_${response.status}`);
        return true;
    }

    async function deleteUploadedFilesFromRecord(record) {
        const documentIds = [
            normalizeText(record?.imageDocumentId),
            normalizeText(record?.documentId),
        ].filter(Boolean);
        for (const documentId of Array.from(new Set(documentIds))) {
            await deleteLegalFacilityDocument(documentId);
        }
        return true;
    }

    function renderEntryAssetFields() {
        return `
            <div class="audit-legal-entry-assets">
                <label class="audit-legal-entry-field">
                    <span>Image</span>
                    <input type="file" accept="image/*" data-audit-legal-file="image">
                </label>
                <label class="audit-legal-entry-field">
                    <span>Attachment</span>
                    <input type="file" accept=".pdf,.xls,.xlsx,.ppt,.pptx,.doc,.docx,.hwp,.hwpx" data-audit-legal-file="attachment">
                </label>
            </div>
        `;
    }

    async function attachFilesToRecord(record, form) {
        const imageFile = form?.querySelector('[data-audit-legal-file="image"]')?.files?.[0] || null;
        const attachmentFile = form?.querySelector('[data-audit-legal-file="attachment"]')?.files?.[0] || null;
        if (!imageFile && !attachmentFile) return record;
        const nextRecord = { ...record };
        if (imageFile) {
            const uploaded = await uploadLegalFacilityFile(nextRecord, imageFile, IMAGE_CATEGORY, 'image');
            nextRecord.imageDocumentId = uploaded.documentId;
            nextRecord.imageFileName = uploaded.fileName;
            nextRecord.imagePreviewUrl = uploaded.previewUrl;
            nextRecord.imageDownloadUrl = uploaded.downloadUrl;
            nextRecord.imageStorageRelPath = uploaded.storageRelPath;
        }
        if (attachmentFile) {
            const uploaded = await uploadLegalFacilityFile(nextRecord, attachmentFile, ATTACHMENT_CATEGORY, 'attachment');
            nextRecord.documentId = uploaded.documentId;
            nextRecord.fileName = uploaded.fileName;
            nextRecord.previewUrl = uploaded.previewUrl;
            nextRecord.downloadUrl = uploaded.downloadUrl;
            nextRecord.storageRelPath = uploaded.storageRelPath;
            nextRecord.attachmentKey = uploaded.documentId || nextRecord.attachmentKey;
            nextRecord.documentStatus = 'server attachment';
            nextRecord.previewTitle = uploaded.fileName || nextRecord.previewTitle;
        }
        return nextRecord;
    }

    Object.assign(api, {
        canWrite,
        renderEntryAssetFields,
        attachFilesToRecord,
        deleteUploadedFilesFromRecord,
        escapeHtml,
    });
})();
