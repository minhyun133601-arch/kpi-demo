(function initKpiWorkHistoryCoreStorageAttachments() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const {
        DATA_KEY,
        TeamInfo,
        ATTACHMENT_SLOT_KEYS,
        ATTACHMENT_SLOT_META,
        WORK_HISTORY_ATTACHMENT_MAX_BYTES,
        normalizeAttachment,
        flattenAttachmentSlots
    } = history;

    history.WORK_HISTORY_ATTACHMENT_EXTENSION_BY_MIME = history.WORK_HISTORY_ATTACHMENT_EXTENSION_BY_MIME || Object.freeze(
        Object.fromEntries(
            String(history.WORK_HISTORY_ATTACHMENT_ACCEPT || '')
                .split(',')
                .map((entry) => String(entry || '').trim())
                .filter(Boolean)
                .flatMap((ext) => {
                    if (ext === '.pdf') return [['application/pdf', ext]];
                    if (ext === '.xls') return [['application/vnd.ms-excel', ext]];
                    if (ext === '.xlsx') return [['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext]];
                    if (ext === '.ppt') return [['application/vnd.ms-powerpoint', ext]];
                    if (ext === '.pptx') return [['application/vnd.openxmlformats-officedocument.presentationml.presentation', ext]];
                    if (ext === '.doc') return [['application/msword', ext]];
                    if (ext === '.docx') return [['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext]];
                    if (ext === '.hwp') return [['application/x-hwp', ext], ['application/haansofthwp', ext]];
                    if (ext === '.hwpx') return [['application/x-hwp+zip', ext], ['application/haansofthwpx', ext]];
                    return [];
                })
        )
    );

    function getWorkHistoryAttachmentExtension(fileName, mimeType = '') {
        const normalizedName = String(fileName || '').trim().toLowerCase();
        const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
        const nameMatch = normalizedName.match(/(\.[a-z0-9]{1,16})$/);
        const extFromName = String(nameMatch?.[1] || '').trim();
        if (history.WORK_HISTORY_ATTACHMENT_ACCEPT?.split(',').includes(extFromName)) {
            return extFromName;
        }
        return history.WORK_HISTORY_ATTACHMENT_EXTENSION_BY_MIME?.[normalizedMimeType] || '';
    }

    function validateWorkHistoryAttachment(file) {
        if (!(file instanceof File)) {
            return 'invalid_file';
        }
        if (Number(file.size || 0) > WORK_HISTORY_ATTACHMENT_MAX_BYTES) {
            return 'file_too_large';
        }
        return getWorkHistoryAttachmentExtension(file.name, file.type) ? '' : 'unsupported_type';
    }

    function getRecordRuntimeConfig() {
        const workRuntime = window.__KPI_SERVER_RUNTIME_CONFIG__?.work;
        const record = workRuntime?.records?.[DATA_KEY];
        if (!record) return null;
        return {
            enabled: workRuntime?.enabled === true,
            apiBase: String(record.apiBase || workRuntime.apiBase || '/api').trim() || '/api',
            moduleKey: String(record.moduleKey || workRuntime.moduleKey || 'portal_data').trim() || 'portal_data',
            recordKey: String(record.recordKey || DATA_KEY).trim() || DATA_KEY,
            permissionKey: String(record.permissionKey || workRuntime.defaultPermissionKey || '').trim(),
            readEnabled: record.readEnabled === true,
            writeEnabled: record.writeEnabled === true
        };
    }

    function getAssetRuntimeConfig() {
        const workRuntime = window.__KPI_SERVER_RUNTIME_CONFIG__?.work;
        const assets = workRuntime?.assets;
        const record = getRecordRuntimeConfig();
        return {
            enabled: workRuntime?.enabled === true,
            apiBase: String(workRuntime?.apiBase || record?.apiBase || '/api').trim() || '/api',
            permissionKey: String(assets?.permissionKey || record?.permissionKey || workRuntime?.defaultPermissionKey || '').trim(),
            readEnabled: assets?.readEnabled === true || record?.readEnabled === true,
            writeEnabled: assets?.writeEnabled === true || record?.writeEnabled === true,
            ownerDomain: String(assets?.ownerDomain || 'work.history').trim() || 'work.history',
            fileCategory: String(assets?.fileCategory || 'attachment').trim() || 'attachment'
        };
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const commaIndex = result.indexOf(',');
                resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
            };
            reader.onerror = () => reject(reader.error || new Error('work_history_attachment_read_failed'));
            reader.readAsDataURL(file);
        });
    }

    function buildAttachmentOwnerKey(team, startDate, attachmentType) {
        const teamKey = String(team || 'unassigned').trim() || 'unassigned';
        const dateKey = String(startDate || '').trim() || 'undated';
        const slotKey = ATTACHMENT_SLOT_KEYS.includes(String(attachmentType || '').trim())
            ? String(attachmentType).trim()
            : 'report';
        const nonce = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        return `${DATA_KEY}:${teamKey}:${slotKey}:${dateKey}:${nonce}`;
    }

    function formatAttachmentFileName(context, slotMeta, fallbackName, mimeType = '') {
        const teamKey = String(context?.team || '').trim();
        const teamLabel = TeamInfo[teamKey]?.name || teamKey || '팀';
        const startDate = String(context?.startDate || '').trim();
        const endDate = String(context?.endDate || '').trim();
        const dateLabel = startDate && endDate
            ? `${startDate}~${endDate}`
            : (startDate || endDate || '날짜미정');
        const slotLabel = String(slotMeta?.label || '').trim() || '첨부';
        const nameBody = `${teamLabel} ${dateLabel} ${slotLabel}`.trim();
        const safeBody = nameBody.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
        const ext = getWorkHistoryAttachmentExtension(fallbackName, mimeType);
        return `${safeBody}${ext || ''}`;
    }

    async function uploadPendingAttachments(files, context = {}) {
        const assetRuntime = getAssetRuntimeConfig();
        if (!Array.isArray(files) || !files.length) return [];
        if (!assetRuntime || assetRuntime.writeEnabled !== true || typeof fetch !== 'function') {
            throw new Error('attachment_upload_unavailable');
        }

        const attachmentType = ATTACHMENT_SLOT_KEYS.includes(String(context.attachmentType || '').trim())
            ? String(context.attachmentType).trim()
            : 'report';
        const slotMeta = ATTACHMENT_SLOT_META[attachmentType] || ATTACHMENT_SLOT_META.report;
        const uploaded = [];
        for (const file of files) {
            const errorKey = validateWorkHistoryAttachment(file);
            if (errorKey) {
                throw new Error(errorKey);
            }
            const originalName = formatAttachmentFileName(context, slotMeta, file?.name, file?.type);
            const mimeType = String(file?.type || '').trim() || 'application/octet-stream';
            const base64Data = await readFileAsBase64(file);
            const response = await fetch(`${assetRuntime.apiBase.replace(/\/+$/, '')}/files/base64`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    permissionKey: assetRuntime.permissionKey,
                    ownerDomain: 'work.history',
                    ownerKey: buildAttachmentOwnerKey(context.team, context.startDate, attachmentType),
                    fileCategory: slotMeta.fileCategory || assetRuntime.fileCategory,
                    originalName,
                    mimeType,
                    base64Data,
                    metadata: {
                        dataKey: DATA_KEY,
                        team: String(context.team || '').trim(),
                        startDate: String(context.startDate || '').trim(),
                        endDate: String(context.endDate || '').trim(),
                        sourceFileName: String(file?.name || '').trim(),
                        originalName,
                        attachmentType,
                        folder: `${String(context.team || 'unassigned').trim() || 'unassigned'}/${attachmentType}`
                    }
                })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result?.ok || !result.document?.id) {
                throw new Error(result?.error || `http_${response.status}`);
            }

            const documentRecord = result.document;
            uploaded.push(normalizeAttachment({
                originalName: documentRecord.original_name || originalName,
                storedName: documentRecord.stored_name || '',
                url: documentRecord.preview_url || `/api/files/${documentRecord.id}/view`,
                previewUrl: documentRecord.preview_url || `/api/files/${documentRecord.id}/view`,
                downloadUrl: documentRecord.download_url || `/api/files/${documentRecord.id}/download`,
                size: Number(documentRecord.file_size_bytes) || file.size || 0,
                mimeType: documentRecord.mime_type || mimeType,
                documentId: String(documentRecord.id || '').trim(),
                attachmentType,
                storageRelPath: String(documentRecord.storage_rel_path || ''),
                fileCategory: String(documentRecord.file_category || slotMeta.fileCategory || '')
            }));
        }
        return uploaded;
    }

    async function deleteAttachmentsFromServer(attachments) {
        const documents = Array.isArray(attachments)
            ? attachments.map(normalizeAttachment).filter(Boolean)
            : flattenAttachmentSlots(attachments);
        if (!documents.length || typeof fetch !== 'function') return;

        for (const attachment of documents) {
            const documentId = String(attachment.documentId || '').trim();
            if (!documentId) continue;
            try {
                const response = await fetch(`/api/files/${encodeURIComponent(documentId)}`, {
                    method: 'DELETE',
                    credentials: 'same-origin'
                });
                if (!response.ok && response.status !== 404) {
                    throw new Error(`http_${response.status}`);
                }
            } catch (error) {
                console.warn('[kpi] work history attachment delete failed', documentId, error);
            }
        }
    }

    Object.assign(history, {
        getWorkHistoryAttachmentExtension,
        validateWorkHistoryAttachment,
        getRecordRuntimeConfig,
        getAssetRuntimeConfig,
        uploadPendingAttachments,
        deleteAttachmentsFromServer
    });

    window.KpiWorkHistory = history;
})();
