(function () {
    const api = window.KpiDataEquipmentHistory || (window.KpiDataEquipmentHistory = {});

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function asList(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeText(value) {
        return String(value ?? '').trim();
    }

    function parseRate(value) {
        const match = String(value ?? '').match(/(\d+(?:\.\d+)?)/);
        if (!match) return 0;
        return Math.max(0, Math.min(Number(match[1]) || 0, 100));
    }

    function getInfoValue(items, labels, fallback = '') {
        const labelSet = new Set(asList(labels).map((label) => normalizeText(label)));
        const found = asList(items).find((item) => labelSet.has(normalizeText(item?.label)));
        return normalizeText(found?.value || fallback);
    }

    function getEquipmentStatus(status) {
        const value = normalizeText(status) || '운영중';
        if (value === '정지') {
            return { label: value, powerLabel: 'OFF', tone: 'stop', dotClassName: 'is-stop', isRunning: false };
        }
        if (value === '점검중' || value === '점검예정') {
            return { label: value, powerLabel: 'CHECK', tone: 'check', dotClassName: 'is-check', isRunning: false };
        }
        return { label: value, powerLabel: 'ON', tone: 'running', dotClassName: '', isRunning: true };
    }

    function normalizeDocuments(rows) {
        return asList(rows).map((row) => ({
            title: normalizeText(row?.title || row?.name || row?.file || row?.fileName || row?.originalName || row?.attachmentKey || row?.key),
            clientRowId: normalizeText(row?.clientRowId || row?.rowId),
            documentId: normalizeText(row?.documentId || row?.fileId),
            fileName: normalizeText(row?.fileName || row?.originalName),
            originalName: normalizeText(row?.originalName || row?.fileName),
            mimeType: normalizeText(row?.mimeType),
            storageRelPath: normalizeText(row?.storageRelPath),
            previewUrl: normalizeText(row?.previewUrl || row?.viewUrl),
            downloadUrl: normalizeText(row?.downloadUrl),
        }));
    }

    function normalizeEquipmentItem(item, index) {
        const operationInfo = asList(item?.operationInfo);
        const detailInfo = asList(item?.detailInfo);
        const statusMeta = getEquipmentStatus(item?.status);
        return {
            id: normalizeText(item?.id || item?.equipmentCode || `equipment-${index + 1}`),
            equipmentCode: normalizeText(item?.equipmentCode || item?.code || getInfoValue(detailInfo, ['설비코드', '코드']) || item?.id),
            team: normalizeText(item?.team || item?.department || getInfoValue(detailInfo, ['관리팀', '관리부서', '부서'])),
            group: normalizeText(item?.group || item?.section || getInfoValue(detailInfo, ['공정', '설비구분', '공정 구분', '공정구분']) || item?.process || getInfoValue(operationInfo, ['공정', '공정 단계'])),
            name: normalizeText(item?.name || item?.equipmentName || getInfoValue(detailInfo, ['설비명'])),
            line: normalizeText(item?.line || getInfoValue(detailInfo, ['생산라인']) || getInfoValue(operationInfo, ['생산라인'])),
            process: normalizeText(item?.process || getInfoValue(detailInfo, ['공정']) || getInfoValue(operationInfo, ['공정', '공정 단계']) || item?.group),
            status: statusMeta.label,
            statusMeta,
            rate: parseRate(item?.rate ?? item?.utilization ?? getInfoValue(operationInfo, ['가동률', '핵심 KPI'], 0)),
            production: normalizeText(item?.production || getInfoValue(operationInfo, ['현재 실적', '최근 24H 생산량'])),
            plan: normalizeText(item?.plan || getInfoValue(operationInfo, ['목표 기준', '목표 생산량'])),
            lastCheck: normalizeText(item?.lastCheck || getInfoValue(operationInfo, ['최근 점검'])),
            nextCheck: normalizeText(item?.nextCheck || getInfoValue(operationInfo, ['다음 점검'])),
            owner: normalizeText(item?.owner || getInfoValue(detailInfo, ['담당', '책임자'])),
            note: normalizeText(item?.note),
            photoDataUrl: normalizeText(item?.photoDataUrl),
            photoDocumentId: normalizeText(item?.photoDocumentId || item?.photoFileId),
            photoPreviewUrl: normalizeText(item?.photoPreviewUrl || item?.photoViewUrl),
            photoDownloadUrl: normalizeText(item?.photoDownloadUrl),
            photoStorageRelPath: normalizeText(item?.photoStorageRelPath),
            photoName: normalizeText(item?.photoName),
            operationInfo,
            detailInfo,
            maintenanceHistory: asList(item?.maintenanceHistory),
            documents: normalizeDocuments(item?.documents),
        };
    }

    function normalizeEquipmentItems(data) {
        return asList(data?.equipmentList)
            .map(normalizeEquipmentItem)
            .filter((item) => item.id && item.name);
    }

    function groupEquipmentItems(items) {
        const groups = new Map();

        asList(items).forEach((item) => {
            const teamKey = item.team || '미분류 설비';
            const sectionKey = item.group || '공정 미지정';
            if (!groups.has(teamKey)) groups.set(teamKey, new Map());
            const sections = groups.get(teamKey);
            if (!sections.has(sectionKey)) sections.set(sectionKey, []);
            sections.get(sectionKey).push(item);
        });

        return [...groups.entries()].map(([team, sections]) => ({
            team,
            sections: [...sections.entries()].map(([title, equipment]) => ({ title, equipment })),
        }));
    }

    function getSelectedEquipment(items, selectedId) {
        return asList(items).find((item) => item.id === selectedId) || asList(items)[0] || null;
    }

    function buildOperationInfo(equipment) {
        return [
            { label: '설비명', value: equipment?.name || '' },
            { label: '관리팀', value: equipment?.team || '' },
            { label: '공정', value: equipment?.process || equipment?.group || '' },
            { label: '가동률', value: equipment?.rate ? `${equipment.rate}%` : '' },
        ];
    }

    function buildDetailInfo(equipment) {
        return [
            { label: '설비명', value: equipment?.name || '' },
            { label: '관리팀', value: equipment?.team || '' },
            { label: '공정', value: equipment?.process || equipment?.group || '' },
            { label: '가동률', value: equipment?.rate ? `${equipment.rate}%` : '' },
        ];
    }

    Object.assign(api, {
        escapeHtml,
        asList,
        normalizeText,
        parseRate,
        getInfoValue,
        getEquipmentStatus,
        normalizeEquipmentItems,
        groupEquipmentItems,
        getSelectedEquipment,
        buildOperationInfo,
        buildDetailInfo,
    });
})();
