(function bootstrapKpiDemoData() {
    const UPDATED_AT = '2026-04-26T06:00:00.000Z';
    function isPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function setPortalDataDefault(key, payload) {
        window.PortalData = isPlainObject(window.PortalData) ? window.PortalData : {};
        if (!Object.prototype.hasOwnProperty.call(window.PortalData, key)) window.PortalData[key] = clone(payload);
    }

    setPortalDataDefault('audit_legal_facility', {
        meta: { moduleKey: 'audit_legal_facility', moduleName: 'Demo Audit Legal Facility', version: 2, updatedAt: UPDATED_AT },
        facilities: [
            { id: 'legal-boiler-a', plant: '공장 A', facility: '데모 보일러 A', itemType: 'gasboiler', statutoryItem: '보일러 안전검사', responsible: '운영팀', agency: '점검기관 A', cycle: '6개월', lastDate: '2026-02-14', nextDate: '2026-08-14', documentStatus: '필증 준비 완료', previewTitle: '보일러 검사 필증', note: '법정 설비 점검 기록입니다.' },
            { id: 'legal-boiler-b', plant: '공장 A', facility: '데모 보일러 B', itemType: 'gasboiler', statutoryItem: '연소 안전검사', responsible: '유틸리티팀', agency: '점검기관 A', cycle: '6개월', lastDate: '2025-12-02', nextDate: '2026-06-02', documentStatus: '체크리스트 준비', previewTitle: '연소 안전 점검표', note: '임박 점검 상태를 보여주는 합성 예시입니다.' },
            { id: 'legal-hoist-a', plant: '공장 A', facility: '샘플 호이스트 A', itemType: 'other', statutoryItem: '양중기 정기검사', responsible: '보전팀', agency: '점검기관 B', cycle: '12개월', lastDate: '2025-05-20', nextDate: '2026-05-20', documentStatus: '갱신 일정 등록', previewTitle: '양중기 정기검사표', note: '예정 검사 마감일을 추적하는 합성 기록입니다.' },
            { id: 'legal-pressure-a', plant: '공장 B', facility: '샘플 압력용기 A', itemType: 'other', statutoryItem: '압력용기 정기검사', responsible: '보전팀', agency: '점검기관 B', cycle: '12개월', lastDate: '2025-05-15', nextDate: '2026-05-15', documentStatus: '기관 예약 완료', previewTitle: '압력용기 검사 예약서', note: '압력용기 정기검사 기록입니다.' },
            { id: 'legal-fire-panel-b', plant: '공장 B', facility: '샘플 소방수신반 B', itemType: 'fire', statutoryItem: '소방설비 작동점검', responsible: '안전팀', agency: '점검기관 C', cycle: '12개월', lastDate: '2025-04-10', nextDate: '2026-04-10', documentStatus: '조치 필요', previewTitle: '소방 점검 조치 메모', note: '기한 초과 상태를 보여주는 합성 예시입니다.' },
            { id: 'legal-fire-pump-a', plant: '공장 A', facility: '샘플 소방펌프 A', itemType: 'fire', statutoryItem: '소방펌프 성능점검', responsible: '안전팀', agency: '점검기관 C', cycle: '12개월', lastDate: '2025-07-12', nextDate: '2026-07-12', documentStatus: '모니터링', previewTitle: '소방펌프 시험 성적서', note: '연간 소방설비 합성 기록입니다.' },
            { id: 'legal-environment-a', plant: '공장 B', facility: '폐수 샘플 지점', itemType: 'environment', statutoryItem: '환경 준수 점검', responsible: '유틸리티팀', agency: '점검기관 D', cycle: '분기', lastDate: '2026-03-28', nextDate: '2026-06-28', documentStatus: '모니터링', previewTitle: '환경 준수 점검 요약', note: '분기 후속관리 항목을 합성 날짜로 구성했습니다.' },
            { id: 'legal-air-emission-a', plant: '공장 A', facility: '샘플 배출구 A', itemType: 'environment', statutoryItem: '대기 배출 측정', responsible: '유틸리티팀', agency: '점검기관 D', cycle: '분기', lastDate: '2026-02-28', nextDate: '2026-05-28', documentStatus: '측정 일정 예약', previewTitle: '대기 배출 측정 계획서', note: '환경 모니터링 합성 항목입니다.' },
            { id: 'legal-electric-panel-a', plant: '공장 A', facility: '메인 분전반 A', itemType: 'electric', statutoryItem: '전기 안전검사', responsible: '보전팀', agency: '점검기관 E', cycle: '12개월', lastDate: '2025-11-18', nextDate: '2026-11-18', documentStatus: '필증 준비 완료', previewTitle: '전기 안전검사 필증', note: '전기 점검 기록입니다.' },
            { id: 'legal-cooling-a', plant: '공장 B', facility: '냉각 유닛 A', itemType: 'cooling', statutoryItem: '냉매 설비 점검', responsible: '시설지원팀', agency: '점검기관 F', cycle: '12개월', lastDate: '2025-09-06', nextDate: '2026-09-06', documentStatus: '정상', previewTitle: '냉각 유닛 점검 요약', note: '합성 냉각설비 기록입니다.' }
        ],
        calendar: { year: 2026, month: 5, label: '2026년 5월' },
        equipment: [
            { id: 'legal-equipment-boiler', title: '보일러 그룹', itemType: 'gasboiler', icon: 'fa-fire-flame-simple', metrics: [{ label: '대상 설비', value: 2 }, { label: '예정', value: 1 }, { label: '준비 완료', value: 1 }], statuses: [{ key: 'safe', label: '준비 완료', count: 1 }, { key: 'warning', label: '임박', count: 1 }] },
            { id: 'legal-equipment-hoist', title: '호이스트·압력용기', itemType: 'other', icon: 'fa-up-down-left-right', metrics: [{ label: '대상 설비', value: 2 }, { label: '예정', value: 2 }, { label: '준비 완료', value: 0 }], statuses: [{ key: 'warning', label: '임박', count: 2 }] },
            { id: 'legal-equipment-fire', title: '소방 설비', itemType: 'fire', icon: 'fa-fire-extinguisher', metrics: [{ label: '대상 설비', value: 2 }, { label: '기한 초과', value: 1 }, { label: '정상', value: 1 }], statuses: [{ key: 'danger', label: '조치 필요', count: 1 }, { key: 'safe', label: '정상', count: 1 }] },
            { id: 'legal-equipment-environment', title: '환경 설비', itemType: 'environment', icon: 'fa-seedling', metrics: [{ label: '대상 설비', value: 2 }, { label: '예정', value: 1 }, { label: '관리 중', value: 2 }], statuses: [{ key: 'warning', label: '예약됨', count: 1 }, { key: 'safe', label: '정상', count: 1 }] },
            { id: 'legal-equipment-electric', title: '전기 안전', itemType: 'electric', icon: 'fa-bolt', metrics: [{ label: '대상 설비', value: 1 }, { label: '예정', value: 0 }, { label: '준비 완료', value: 1 }], statuses: [{ key: 'safe', label: '준비 완료', count: 1 }] },
            { id: 'legal-equipment-cooling', title: '냉각 설비', itemType: 'cooling', icon: 'fa-snowflake', metrics: [{ label: '대상 설비', value: 1 }, { label: '예정', value: 0 }, { label: '정상', value: 1 }], statuses: [{ key: 'safe', label: '정상', count: 1 }] }
        ],
        alerts: [
            { id: 'legal-alert-review', title: '검토 필요', countKey: 'needsReview', unit: '건', icon: 'fa-triangle-exclamation', severity: 'danger' },
            { id: 'legal-alert-near', title: '45일 이내 도래', countKey: 'near', unit: '건', icon: 'fa-calendar-day', severity: 'warning' },
            { id: 'legal-alert-doc', title: '문서 후속관리', countKey: 'needsReview', unit: '건', icon: 'fa-file-circle-check', severity: 'info' }
        ],
        docs: [
            { id: 'legal-doc-cert', title: '검사 필증', icon: 'fa-file-lines', uploaded: 8, missing: 2, rate: 80 },
            { id: 'legal-doc-training', title: '교육 기록', icon: 'fa-graduation-cap', uploaded: 6, missing: 1, rate: 86 },
            { id: 'legal-doc-action', title: '개선 조치서', icon: 'fa-clipboard-check', uploaded: 4, missing: 2, rate: 67 },
            { id: 'legal-doc-agency', title: '기관 예약서', icon: 'fa-calendar-check', uploaded: 5, missing: 1, rate: 83 }
        ],
        events: [
            { id: 'legal-event-fire', date: '2026-04-10', title: '소방수신반 B 조치 마감', type: 'deadline' },
            { id: 'legal-event-pressure', date: '2026-05-15', title: '압력용기 A 정기검사', type: 'inspection' },
            { id: 'legal-event-hoist', date: '2026-05-20', title: '호이스트 A 정기검사', type: 'inspection' },
            { id: 'legal-event-emission', date: '2026-05-28', title: '대기 배출 측정 계획', type: 'document' },
            { id: 'legal-event-boiler-b', date: '2026-06-02', title: '보일러 B 연소 안전검사', type: 'inspection' },
            { id: 'legal-event-env', date: '2026-06-28', title: '폐수 준수 점검', type: 'inspection' },
            { id: 'legal-event-fire-pump', date: '2026-07-12', title: '소방펌프 A 성능점검', type: 'inspection' }
        ]
    });

    setPortalDataDefault('data_equipment_history_card', {
        meta: { moduleKey: 'data_equipment_history_card', moduleName: 'Demo Equipment History Card', version: 2, updatedAt: UPDATED_AT },
        header: { brandName: 'KPI', brandSub: '설비 이력 관리 기록', title: '설비 이력 카드', subtitle: 'EQUIPMENT HISTORY CARD', status: '', updatedAt: '2026.04.26 10:30', owner: '', equipmentName: '', note: '설비 현황 보드에서 설비 상태를 보고, 같은 화면에서 카드 작성과 첨부 키 입력을 이어서 처리합니다.' },
        equipmentList: [],
        operationInfo: [],
        detailInfo: [],
        maintenanceHistory: [],
        documents: []
    });

    window.__KPI_DEMO_DATA__ = Object.freeze({ enabled: true, scope: ['audit_legal_facility', 'data_equipment_history_card'], updatedAt: UPDATED_AT, note: 'Local screen defaults only. No company records are included.' });
})();
