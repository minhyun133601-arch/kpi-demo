(function () {
    const api = window.KpiDataEquipmentHistory || (window.KpiDataEquipmentHistory = {});

    const BASIC_FIELDS = [
        { key: 'name', label: '설비명', placeholder: '설비명을 입력하세요.' },
        { key: 'team', label: '관리팀', placeholder: '예: 생산1팀' },
        { key: 'process', label: '공정', placeholder: '공정을 입력하세요.' },
        { key: 'rate', label: '가동률', placeholder: '숫자만 입력' },
    ];

    const OPERATION_FIELDS = BASIC_FIELDS;

    const DETAIL_ITEM_FIELDS = [
        { key: 'label', label: '항목명', placeholder: '예: 제조사' },
        { key: 'value', label: '내용', placeholder: '내용을 입력하세요.' },
    ];

    const MAINTENANCE_FIELDS = [
        { key: 'date', label: '일자', placeholder: 'YYYY.MM.DD' },
        { key: 'type', label: '구분', placeholder: '정기점검' },
        { key: 'content', label: '내용', placeholder: '작업 내용을 입력하세요.' },
        { key: 'worker', label: '작업자', placeholder: '작업자' },
        { key: 'note', label: '비고', placeholder: '비고' },
    ];

    const DOCUMENT_FIELDS = [
        { key: 'title', label: '문서명', placeholder: '예: 점검 보고서' },
    ];

    const DOCUMENT_SAVE_FIELDS = [
        ...DOCUMENT_FIELDS,
        { key: 'documentId' },
        { key: 'fileName' },
        { key: 'originalName' },
        { key: 'mimeType' },
        { key: 'storageRelPath' },
        { key: 'previewUrl' },
        { key: 'downloadUrl' },
    ];

    function createBlankMaintenanceRow() {
        return { date: '', type: '', content: '', worker: '', note: '' };
    }

    function createBlankDocumentRow() {
        return { clientRowId: `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}`, title: '' };
    }

    function createBlankDetailRow() {
        return { label: '', value: '' };
    }

    function normalizeRows(rows, factory) {
        const list = api.asList(rows).map((row) => ({ ...factory(), ...(row || {}) }));
        return list.length ? list : [factory()];
    }

    function normalizeOptionalRows(rows, factory) {
        return api.asList(rows).map((row) => ({ ...factory(), ...(row || {}) }));
    }

    function createDraft(equipment = null) {
        const source = equipment || {};
        return {
            id: api.normalizeText(source.id),
            equipmentCode: api.normalizeText(source.equipmentCode || source.id),
            name: api.normalizeText(source.name),
            line: api.normalizeText(source.line),
            process: api.normalizeText(source.process || source.group),
            status: api.normalizeText(source.status || '운영중'),
            production: api.normalizeText(source.production),
            plan: api.normalizeText(source.plan),
            rate: source.rate ? String(source.rate) : '',
            lastCheck: api.normalizeText(source.lastCheck),
            nextCheck: api.normalizeText(source.nextCheck),
            team: api.normalizeText(source.team),
            group: api.normalizeText(source.group),
            owner: api.normalizeText(source.owner),
            note: api.normalizeText(source.note),
            photoDataUrl: api.normalizeText(source.photoDataUrl),
            photoDocumentId: api.normalizeText(source.photoDocumentId || source.photoFileId),
            photoPreviewUrl: api.normalizeText(source.photoPreviewUrl || source.photoViewUrl),
            photoDownloadUrl: api.normalizeText(source.photoDownloadUrl),
            photoStorageRelPath: api.normalizeText(source.photoStorageRelPath),
            photoName: api.normalizeText(source.photoName),
            detailInfo: normalizeOptionalRows(source.detailInfo, createBlankDetailRow),
            maintenanceHistory: normalizeRows(source.maintenanceHistory, createBlankMaintenanceRow),
            documents: normalizeRows(source.documents, createBlankDocumentRow),
        };
    }

    function makeEquipmentId(draft) {
        const seed = api.normalizeText(draft.equipmentCode || draft.name || `equipment-${Date.now()}`);
        return seed.toLowerCase().replace(/[^a-z0-9가-힣-]+/gi, '-').replace(/^-+|-+$/g, '') || `equipment-${Date.now()}`;
    }

    function removeBlankRows(rows, fields) {
        return api.asList(rows).filter((row) => fields.some((field) => api.normalizeText(row?.[field.key])));
    }

    function buildInfo(items) {
        return items.map((item) => ({ label: item.label, value: api.normalizeText(item.value) }));
    }

    function mergeDetailInfoRows(normalized) {
        const systemRows = [
            { label: '설비명', value: normalized.name },
            { label: '관리팀', value: normalized.team },
            { label: '공정', value: normalized.process },
            { label: '가동률', value: normalized.rate ? `${normalized.rate}%` : '' },
        ].filter((row) => row.value);

        const customRows = removeBlankRows(normalized.detailInfo, DETAIL_ITEM_FIELDS);
        const usedLabels = new Set(systemRows.map((row) => api.normalizeText(row.label)));
        const dedupedCustomRows = customRows.filter((row) => {
            const label = api.normalizeText(row.label);
            if (!label || usedLabels.has(label)) return false;
            usedLabels.add(label);
            return true;
        });

        return [...systemRows, ...dedupedCustomRows];
    }

    function buildRecordFromDraft(draft) {
        const normalized = createDraft(draft);
        const id = normalized.id || makeEquipmentId(normalized);
        const rate = Math.max(0, Math.min(Number(normalized.rate) || 0, 100));
        const detailInfo = mergeDetailInfoRows(normalized);
        const documents = removeBlankRows(normalized.documents, DOCUMENT_SAVE_FIELDS)
            .map(({ pendingFile, attachmentKey, ...row }) => row);
        return {
            id,
            equipmentCode: normalized.equipmentCode || id.toUpperCase(),
            name: normalized.name,
            line: normalized.line,
            process: normalized.process,
            status: normalized.status || '운영중',
            rate,
            production: normalized.production,
            plan: normalized.plan,
            lastCheck: normalized.lastCheck,
            nextCheck: normalized.nextCheck,
            team: normalized.team,
            group: normalized.process,
            owner: normalized.owner,
            note: normalized.note,
            photoDataUrl: normalized.photoDocumentId ? '' : normalized.photoDataUrl,
            photoDocumentId: normalized.photoDocumentId,
            photoPreviewUrl: normalized.photoPreviewUrl,
            photoDownloadUrl: normalized.photoDownloadUrl,
            photoStorageRelPath: normalized.photoStorageRelPath,
            photoName: normalized.photoName,
            operationInfo: buildInfo(OPERATION_FIELDS.map((field) => ({ label: field.label, value: normalized[field.key] }))),
            detailInfo,
            maintenanceHistory: removeBlankRows(normalized.maintenanceHistory, MAINTENANCE_FIELDS),
            documents,
        };
    }

    function renderInput(field, value, attrs = '') {
        return `<input type="text" value="${api.escapeHtml(value)}" placeholder="${api.escapeHtml(field.placeholder || '')}" data-equipment-field="${api.escapeHtml(field.key)}" ${attrs}>`;
    }

    function renderFieldGrid(fields, draft, className) {
        return `
            <div class="${className}">
                ${fields.map((field) => `
                    <label>
                        <span>${api.escapeHtml(field.label)}</span>
                        ${renderInput(field, draft[field.key] || '')}
                    </label>
                `).join('')}
            </div>
        `;
    }

    function renderDetailItems(rows) {
        const list = api.asList(rows);
        if (!list.length) {
            return '<div class="data-equipment-detail-empty">상세 정보 항목은 직접 추가해서 현재 설비 형식에 맞춰 적을 수 있습니다.</div>';
        }

        return `
            <div class="data-equipment-detail-items">
                ${list.map((row, rowIndex) => `
                    <div class="data-equipment-detail-item">
                        ${DETAIL_ITEM_FIELDS.map((field) => `
                            <label>
                                <span>${api.escapeHtml(field.label)}</span>
                                ${renderInput(field, row?.[field.key] || '', `data-equipment-row-section="detailInfo" data-equipment-row-index="${rowIndex}"`)}
                            </label>
                        `).join('')}
                        <button type="button" class="data-equipment-row-remove" data-equipment-remove-row="detailInfo" data-equipment-row-index="${rowIndex}" aria-label="항목 제거">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderEditableTable(fields, rows, sectionKey) {
        return `
            <table class="data-equipment-edit-table">
                <thead>
                    <tr>
                        ${fields.map((field) => `<th>${api.escapeHtml(field.label)}</th>`).join('')}
                        <th>제거</th>
                    </tr>
                </thead>
                <tbody>
                    ${api.asList(rows).map((row, rowIndex) => `
                        <tr>
                            ${fields.map((field) => `
                                <td>
                                    ${renderInput(field, row?.[field.key] || '', `data-equipment-row-section="${sectionKey}" data-equipment-row-index="${rowIndex}"`)}
                                </td>
                            `).join('')}
                            <td>
                                <button type="button" class="data-equipment-row-remove" data-equipment-remove-row="${sectionKey}" data-equipment-row-index="${rowIndex}" aria-label="행 제거">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderDocumentEditableTable(rows) {
        return `
            <table class="data-equipment-edit-table">
                <thead>
                    <tr>
                        <th>문서명</th>
                        <th>파일 첨부</th>
                        <th>제거</th>
                    </tr>
                </thead>
                <tbody>
                    ${api.asList(rows).map((row, rowIndex) => {
                        const label = row?.pendingFile?.name || row?.fileName || row?.originalName || '';
                        return `
                            <tr>
                                <td>${renderInput(DOCUMENT_FIELDS[0], row?.title || '', `data-equipment-row-section="documents" data-equipment-row-index="${rowIndex}"`)}</td>
                                <td>
                                    <div class="data-equipment-document-picker">
                                        <input type="file" hidden data-equipment-document-file-input data-equipment-row-index="${rowIndex}">
                                        <button type="button" class="data-equipment-document-pick" data-equipment-document-pick="${rowIndex}" aria-label="문서 파일 첨부" title="파일 첨부">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                        <span>${api.escapeHtml(label || '선택된 파일 없음')}</span>
                                    </div>
                                </td>
                                <td>
                                    <button type="button" class="data-equipment-row-remove" data-equipment-remove-row="documents" data-equipment-row-index="${rowIndex}" aria-label="문서 행 제거">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    Object.assign(api, {
        BASIC_FIELDS,
        OPERATION_FIELDS,
        DETAIL_ITEM_FIELDS,
        MAINTENANCE_FIELDS,
        DOCUMENT_FIELDS,
        DOCUMENT_SAVE_FIELDS,
        createBlankMaintenanceRow,
        createBlankDocumentRow,
        createBlankDetailRow,
        createDraft,
        buildRecordFromDraft,
        renderFieldGrid,
        renderDetailItems,
        renderEditableTable,
        renderDocumentEditableTable,
    });
})();
