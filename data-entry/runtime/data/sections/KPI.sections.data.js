(function () {
    window.KpiSectionFactories = window.KpiSectionFactories || {};
    window.KpiSectionFactories.data = function buildDataSection() {
        const AppData = {};
        AppData.data = {
            id: 'data',
            name: '데이터 관리',
            icon: 'fa-database',
            color: 'slate',
            accent: '#64748b',
            categories: [
                {
                    title: '유틸리티 기입',
                    icon: 'fa-pen-to-square',
                    color: '#0f766e',
                    desc: '유틸리티 기입 화면 바로가기',
                    shortcutTarget: {
                        sectionId: 'util',
                        title: '유틸리티 기입',
                        options: { keepSidebarCollapsed: true }
                    }
                },
                {
                    title: '작업 이력 기입',
                    icon: 'fa-clipboard-list',
                    color: '#2563eb',
                    desc: '팀별 작업 이력 입력 및 문서 첨부 화면 바로가기',
                    shortcutTarget: {
                        sectionId: 'work',
                        dataKey: 'work_history_records',
                        options: { keepSidebarCollapsed: true }
                    }
                },
                {
                    title: '설비 이력 카드',
                    icon: 'fa-screwdriver-wrench',
                    color: '#475569',
                    viewerMode: 'full-bleed',
                    desc: '설비 현황 보드와 이력 카드 작성 폼에서 설비 정보, 정비 이력, 첨부 키를 함께 관리합니다.',
                    dataKey: 'data_equipment_history_card',
                    fileName: 'Central Server DB / Equipment History Card',
                    readOnly: false,
                    content: `
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
                            설비 현황 보드와 설비 이력 카드 작성 폼을 불러오는 중입니다.
                        </div>
                    `
                }
            ]
        };
        return AppData.data;
    };
})();
