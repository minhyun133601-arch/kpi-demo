(function () {
    window.KpiSectionFactories = window.KpiSectionFactories || {};
    window.KpiSectionFactories.data = function buildDataSection() {
        const AppData = {};
        AppData['data'] = {
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
                        options: {
                            keepSidebarCollapsed: true
                        }
                    }
                },
                {
                    title: '작업 내역 기입',
                    icon: 'fa-clipboard-list',
                    color: '#2563eb',
                    desc: '팀별내역서 작업내역 입력 및 문서 첨부 화면 바로가기',
                    shortcutTarget: {
                        sectionId: 'work',
                        title: '작업내역',
                        options: {
                            keepSidebarCollapsed: true
                        }
                    }
                },
                {
                    title: '설비 이력 카드',
                    icon: 'fa-screwdriver-wrench',
                    color: '#475569',
                    desc: '설비 이력 카드 연결 준비',
                    content: `
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
                            설비 이력 카드 연결은 준비 중입니다.
                        </div>
                    `
                }
            ]
        };
        return AppData['data'];
    };
})();
