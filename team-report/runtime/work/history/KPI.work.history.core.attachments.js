(function initKpiWorkHistoryCoreAttachments() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const {
        ATTACHMENT_SLOT_KEYS
    } = history;

    function createEmptyAttachmentSlots() {
        return Object.fromEntries(ATTACHMENT_SLOT_KEYS.map(slotKey => [slotKey, null]));
    }

    function normalizeAttachment(item, fallbackType = '') {
        if (!item) return null;
        const normalizedType = ATTACHMENT_SLOT_KEYS.includes(String(item?.attachmentType || item?.type || fallbackType).trim())
            ? String(item.attachmentType || item.type || fallbackType).trim()
            : '';
        if (typeof item === 'string') {
            const storedName = item.split('/').pop();
            return {
                originalName: storedName || '첨부파일',
                storedName: storedName || '',
                url: item.startsWith('/') ? item : `/attachments/${storedName}`,
                previewUrl: item.startsWith('/') ? item : `/attachments/${storedName}`,
                downloadUrl: item.startsWith('/') ? item : `/attachments/${storedName}`,
                size: 0,
                mimeType: '',
                documentId: '',
                attachmentType: normalizedType
            };
        }

        const storedName = String(item.storedName || '').trim() || (item.url ? String(item.url).split('/').pop() : '');
        const documentId = String(item.documentId || item.fileId || '').trim();
        const url = String(item.url || item.previewUrl || item.viewUrl || (documentId ? `/api/files/${documentId}/view` : '')).trim();
        const downloadUrl = String(item.downloadUrl || (documentId ? `/api/files/${documentId}/download` : url)).trim();
        if (!storedName && !documentId && !url) return null;

        return {
            originalName: String(item.originalName || item.name || storedName || documentId || '첨부파일').trim(),
            storedName,
            url,
            previewUrl: String(item.previewUrl || item.viewUrl || url).trim(),
            downloadUrl,
            size: Number(item.size) || 0,
            mimeType: String(item.mimeType || '').trim(),
            documentId,
            attachmentType: normalizedType,
            storageRelPath: String(item.storageRelPath || item.storage_rel_path || '').trim(),
            fileCategory: String(item.fileCategory || item.file_category || '').trim()
        };
    }

    function flattenAttachmentSlots(slots) {
        const source = slots && typeof slots === 'object' ? slots : {};
        return ATTACHMENT_SLOT_KEYS
            .map(slotKey => normalizeAttachment(source[slotKey], slotKey))
            .filter(Boolean);
    }

    function normalizeAttachmentSlots(input, legacyAttachments = []) {
        const slots = createEmptyAttachmentSlots();
        const source = input && typeof input === 'object' && !Array.isArray(input)
            ? input
            : {};
        ATTACHMENT_SLOT_KEYS.forEach(slotKey => {
            const normalized = normalizeAttachment(source[slotKey], slotKey);
            if (normalized) {
                normalized.attachmentType = slotKey;
                slots[slotKey] = normalized;
            }
        });

        const legacy = Array.isArray(legacyAttachments)
            ? legacyAttachments.map(item => normalizeAttachment(item)).filter(Boolean)
            : [];
        legacy.forEach((attachment) => {
            const explicitType = ATTACHMENT_SLOT_KEYS.includes(String(attachment.attachmentType || '').trim())
                ? String(attachment.attachmentType).trim()
                : '';
            const slotKey = explicitType || (!slots.report ? 'report' : (!slots.billing ? 'billing' : ''));
            if (!slotKey || slots[slotKey]) return;
            slots[slotKey] = {
                ...attachment,
                attachmentType: slotKey
            };
        });

        return slots;
    }

    function getRecordAttachments(record) {
        const slotSource = record?.attachmentSlots && typeof record.attachmentSlots === 'object'
            ? record.attachmentSlots
            : null;
        if (slotSource) {
            return flattenAttachmentSlots(slotSource);
        }
        return Array.isArray(record?.attachments)
            ? record.attachments.map(item => normalizeAttachment(item)).filter(Boolean)
            : [];
    }

    function getRecordAttachment(record, slotKey) {
        const normalizedSlotKey = ATTACHMENT_SLOT_KEYS.includes(String(slotKey || '').trim())
            ? String(slotKey).trim()
            : '';
        if (!normalizedSlotKey) return null;
        const slots = normalizeAttachmentSlots(record?.attachmentSlots, record?.attachments);
        const attachment = slots[normalizedSlotKey];
        return attachment ? { ...attachment, attachmentType: normalizedSlotKey } : null;
    }

    Object.assign(history, {
        normalizeAttachment,
        normalizeAttachmentSlots,
        flattenAttachmentSlots,
        getRecordAttachments,
        getRecordAttachment
    });

    window.KpiWorkHistory = history;
})();
