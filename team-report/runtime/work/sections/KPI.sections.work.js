(function () {
    window.KpiSectionFactories = window.KpiSectionFactories || {};
    window.KpiSectionFactories.work = function buildWorkSection() {
        const AppData = {};
        const teamCategories = [
            {
                title: 'Line Alpha',
                icon: 'fa-cheese',
                color: '#2563eb',
                secondaryColor: '#1d4ed8',
                tint: '#eff6ff',
                desc: 'Process Alpha 공정 라인별 이력',
                dataKey: 'work_team_calendar_team1_part1',
                view: 'team_calendar',
                viewerMode: 'full-bleed',
                productVisual: 'dry',
                processLabel: 'Process Alpha',
                processTag: '분말',
                processDesc: '분말류 작업 제품 흐름에 맞춘 Line Alpha 주간 이력입니다.',
                emptyProductionLabel: '품목 미입력',
                emptyWorkLabel: '작업 내역 미입력'
            },
            {
                title: 'Line Beta',
                icon: 'fa-cheese',
                color: '#f59e0b',
                secondaryColor: '#d97706',
                tint: '#fff7ed',
                desc: 'Process Alpha 공정 라인별 이력',
                dataKey: 'work_team_calendar_team1_part2',
                view: 'team_calendar',
                viewerMode: 'full-bleed',
                productVisual: 'dry',
                processLabel: 'Process Alpha',
                processTag: '분말',
                processDesc: '분말류 작업 제품 흐름에 맞춘 Line Beta 주간 이력입니다.',
                emptyProductionLabel: '품목 미입력',
                emptyWorkLabel: '작업 내역 미입력'
            },
            {
                title: 'Line Gamma',
                icon: 'fa-box-open',
                color: '#059669',
                secondaryColor: '#047857',
                tint: '#ecfdf5',
                desc: 'Process Beta 라인별 이력',
                dataKey: 'work_team_calendar_team2',
                view: 'team_calendar',
                viewerMode: 'full-bleed',
                productVisual: 'stick',
                processLabel: 'Process Beta',
                processTag: '포장',
                processDesc: 'Process Beta 제품 흐름에 맞춘 Line Gamma 주간 이력입니다.',
                emptyProductionLabel: '품목 미입력',
                emptyWorkLabel: '작업 내역 미입력'
            },
            {
                title: 'Line Delta',
                icon: 'fa-bottle-water',
                color: '#7c3aed',
                secondaryColor: '#5b21b6',
                tint: '#f5f3ff',
                desc: 'Process Gamma 공정 라인별 이력',
                dataKey: 'work_team_calendar_team3',
                view: 'team_calendar',
                viewerMode: 'full-bleed',
                productVisual: 'liquid',
                processLabel: 'Process Gamma',
                processTag: 'Process Gamma',
                processDesc: 'Process Gamma 제품 흐름에 맞춘 Line Delta 주간 이력입니다.',
                emptyProductionLabel: '품목 미입력',
                emptyWorkLabel: '작업 내역 미입력'
            },
            {
                title: '시설팀',
                icon: 'fa-screwdriver-wrench',
                color: '#dc2626',
                secondaryColor: '#b91c1c',
                tint: '#fef2f2',
                desc: '폐수 · 전체 · 기타 작업 이력',
                dataKey: 'work_team_calendar_team4',
                view: 'team_calendar',
                viewerMode: 'full-bleed',
                productVisual: 'maintenance',
                processLabel: '공무환경',
                processTag: '폐수 · 기타',
                processDesc: '폐수, 전체, 기타 작업 중심의 시설팀 주간 이력입니다.',
                emptyProductionLabel: '생산량 없음',
                emptyWorkLabel: '작업 내역 미입력'
            },
            {
                title: '통합현황',
                icon: 'fa-chart-column',
                color: '#0f766e',
                secondaryColor: '#0f172a',
                tint: '#ecfeff',
                desc: '가스, 전기, 폐수, 생산량, 작업내역을 한 번에 보는 통합 캘린더',
                dataKey: 'work_team_calendar_overview',
                view: 'team_calendar',
                viewerMode: 'full-bleed',
                productVisual: 'dry',
                processLabel: '통합현황',
                processTag: '전체 집계',
                processDesc: '전체 팀의 유틸리티, 생산, 작업내역을 월 합계와 일자 상세로 함께 확인하는 통합 현황입니다.',
                emptyProductionLabel: '생산량 없음',
                emptyWorkLabel: '작업 내역 미기입'
            }
        ];

        AppData['work'] = {
            id: 'work',
            name: '팀별내역서',
            icon: 'fa-clipboard-list',
            color: 'green',
            accent: '#16a34a',
            teamCategories,
            categories: [
                {
                    title: '팀별내역',
                    icon: 'fa-calendar-days',
                    color: '#2563eb',
                    secondaryColor: '#1d4ed8',
                    tint: '#eff6ff',
                    desc: 'Line Alpha부터 시설팀까지 통합 팀별내역',
                    dataKey: 'work_team_calendar_team1_part1',
                    view: 'team_calendar',
                    viewerMode: 'full-bleed',
                    productVisual: 'dry',
                    processLabel: '통합 보기',
                    processTag: '팀별',
                    processDesc: '모달 상단의 팀 전환 버튼으로 Line Alpha부터 시설팀까지 한 화면에서 전환합니다.',
                    emptyProductionLabel: '품목 미입력',
                    emptyWorkLabel: '작업 내역 미입력'
                },
                {
                    title: '작업내역',
                    icon: 'fa-clipboard-list',
                    color: '#0f766e',
                    secondaryColor: '#14b8a6',
                    tint: '#ecfeff',
                    desc: '기간별 작업자, 구분, 비용과 문서 첨부까지 기록하는 통합 작업내역 도구',
                    navHidden: true,
                    dataKey: 'work_history_records',
                    view: 'history_tool',
                    viewerMode: 'full-bleed'
                }
            ]
        };
        return AppData['work'];
    };
})();
