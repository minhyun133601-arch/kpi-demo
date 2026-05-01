(function () {
    const { buildWorkDataEntryContent } = window.KpiSectionBuilders || {};

    window.KpiSectionFactories = window.KpiSectionFactories || {};
    window.KpiSectionFactories.util = function buildUtilSection() {
        const AppData = {};

        AppData.util = {
            id: 'util',
            name: '유틸리티',
            icon: 'fa-sliders',
            color: 'yellow',
            accent: '#eab308',
            categories: [
                {
                    title: '전기',
                    icon: 'fa-bolt',
                    color: '#f59e0b',
                    reportShortcutKey: 'electric',
                    desc: '전기 사용량과 비용',
                    content: `
                        <div class="util-dual" data-util-dual="electric">
                            <div class="util-team-tabs" data-util-dual-tabs></div>
                            <div class="util-dual-section" data-util-dual-section="combined">
                                <div class="util-dual-header">
                                    <div class="util-dual-title">데이터</div>
                                    <div class="util-dual-controls" data-util-dual-controls></div>
                                </div>
                                <div class="util-team-content" data-util-dual-content="combined"></div>
                            </div>
                        </div>
                    `
                },
                {
                    title: '가스',
                    icon: 'fa-fire-flame-curved',
                    color: '#f97316',
                    reportShortcutKey: 'gas',
                    desc: '가스 사용량과 비용',
                    content: `
                        <div class="util-dual" data-util-dual="gas">
                            <div class="util-team-tabs" data-util-dual-tabs></div>
                            <div class="util-dual-section" data-util-dual-section="combined">
                                <div class="util-dual-header">
                                    <div class="util-dual-title">데이터</div>
                                    <div class="util-dual-controls" data-util-dual-controls></div>
                                </div>
                                <div class="util-team-content" data-util-dual-content="combined"></div>
                            </div>
                        </div>
                    `
                },
                {
                    title: '폐수',
                    icon: 'fa-water',
                    color: '#14b8a6',
                    reportShortcutKey: 'waste',
                    desc: '폐수 사용량과 비용',
                    content: `
                        <div class="util-dual" data-util-dual="waste">
                            <div class="util-team-tabs" data-util-dual-tabs></div>
                            <div class="util-dual-section" data-util-dual-section="combined">
                                <div class="util-dual-header">
                                    <div class="util-dual-title">데이터</div>
                                    <div class="util-dual-controls" data-util-dual-controls></div>
                                </div>
                                <div class="util-team-content" data-util-dual-content="combined"></div>
                            </div>
                        </div>
                    `
                },
                {
                    title: '유틸리티 기입',
                    icon: 'fa-pen-to-square',
                    color: '#0f766e',
                    desc: '유틸리티 기입 화면',
                    navHidden: true,
                    viewerMode: 'full-bleed',
                    content: buildWorkDataEntryContent()
                },
                {
                    title: '분석',
                    icon: 'fa-chart-column',
                    color: '#0ea5e9',
                    desc: '총괄 비율과 가스/전기 검침표·분석표',
                    content: `
                        <div class="util-sheet-stack">
                            <div class="util-sheet-panel is-overview" data-role="util-report-panel">
                                <div class="util-sheet-header">
                                    <div class="util-sheet-title-block">
                                        <div class="util-sheet-kicker">유틸리티 요약</div>
                                        <div class="util-sheet-title-row">
                                            <span class="util-sheet-title-icon is-overview" aria-hidden="true"><i class="fa-solid fa-chart-pie"></i></span>
                                            <div class="util-report-title">총괄 비율</div>
                                        </div>
                                        <div class="util-report-desc">기존 총괄 리포트 모달로 바로 이동할 수 있습니다.</div>
                                    </div>
                                    <div class="util-sheet-actions">
                                        <button type="button" class="work-btn primary" data-role="util-report-open-modal"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>이동</span></button>
                                    </div>
                                </div>
                                <div class="util-report-kpi-grid" hidden>
                                    <div class="util-report-kpi">
                                        <span class="util-report-kpi-label">총액</span>
                                        <strong class="util-report-kpi-value" data-role="util-report-total-cost">-</strong>
                                        <span class="util-report-kpi-sub" data-role="util-report-total-share">-</span>
                                    </div>
                                    <div class="util-report-kpi">
                                        <span class="util-report-kpi-label">전기</span>
                                        <strong class="util-report-kpi-value" data-role="util-report-electric-cost">-</strong>
                                        <span class="util-report-kpi-sub" data-role="util-report-electric-share">-</span>
                                    </div>
                                    <div class="util-report-kpi">
                                        <span class="util-report-kpi-label">가스</span>
                                        <strong class="util-report-kpi-value" data-role="util-report-gas-cost">-</strong>
                                        <span class="util-report-kpi-sub" data-role="util-report-gas-share">-</span>
                                    </div>
                                    <div class="util-report-kpi">
                                        <span class="util-report-kpi-label">폐수</span>
                                        <strong class="util-report-kpi-value" data-role="util-report-waste-cost">-</strong>
                                        <span class="util-report-kpi-sub" data-role="util-report-waste-share">-</span>
                                    </div>
                                </div>
                                <div class="util-report-preview-note" data-role="util-report-note">총액 대비 구성비를 먼저 보고 기존 총괄 리포트로 이동합니다.</div>
                            </div>
                            <div class="util-sheet-panel is-meter is-combined" data-role="util-sheet-panel" data-sheet-type="meter" data-dataset-key="gas">
                                <div class="util-sheet-header">
                                    <div class="util-sheet-title-block">
                                        <div class="util-sheet-kicker">가스 통합 리포트</div>
                                        <div class="util-sheet-title-row">
                                            <span class="util-sheet-title-icon is-meter" data-role="util-sheet-panel-icon" aria-hidden="true"><i class="fa-solid fa-file-lines"></i></span>
                                            <div class="util-report-title" data-role="util-sheet-panel-title">가스 검침표</div>
                                        </div>
                                        <div class="util-report-desc" data-role="util-sheet-panel-desc">가스 검침표와 분석표를 같은 모달 안에서 전환합니다.</div>
                                    </div>
                                    <div class="util-sheet-actions">
                                        <div class="util-sheet-toggle" data-role="util-sheet-type-toggle">
                                            <button type="button" class="util-sheet-toggle-btn" data-role="util-sheet-type-select" data-sheet-type="meter" aria-label="리포트 유형 전환">
                                                <i class="fa-solid fa-file-lines" aria-hidden="true"></i>
                                                <span>검침표</span>
                                            </button>
                                        </div>
                                        <div class="util-sheet-toggle" data-role="util-sheet-dataset-toggle">
                                            <button type="button" class="util-sheet-toggle-btn" data-role="util-sheet-select" data-dataset-key="gas" aria-label="리포트 항목 전환">
                                                <i class="fa-solid fa-fire-flame-curved" aria-hidden="true"></i>
                                                <span>가스비</span>
                                            </button>
                                        </div>
                                        <div class="util-sheet-month-field">
                                            <select class="util-sheet-month-select" data-role="util-sheet-month" aria-label="리포트 기준월"></select>
                                        </div>
                                        <button type="button" class="work-btn primary" data-role="util-sheet-open"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>이동</span></button>
                                    </div>
                                </div>
                                <div class="util-report-kpi-grid" data-role="util-sheet-preview" hidden></div>
                                <div class="util-report-preview-note" data-role="util-sheet-note" hidden></div>
                            </div>
                            <div class="util-sheet-panel is-meter is-combined" data-role="util-sheet-panel" data-sheet-type="meter" data-dataset-key="electric">
                                <div class="util-sheet-header">
                                    <div class="util-sheet-title-block">
                                        <div class="util-sheet-kicker">전기 통합 리포트</div>
                                        <div class="util-sheet-title-row">
                                            <span class="util-sheet-title-icon is-meter" data-role="util-sheet-panel-icon" aria-hidden="true"><i class="fa-solid fa-file-lines"></i></span>
                                            <div class="util-report-title" data-role="util-sheet-panel-title">전기 검침표</div>
                                        </div>
                                        <div class="util-report-desc" data-role="util-sheet-panel-desc">전기 검침표와 분석표를 같은 모달 안에서 전환합니다.</div>
                                    </div>
                                    <div class="util-sheet-actions">
                                        <div class="util-sheet-toggle" data-role="util-sheet-type-toggle">
                                            <button type="button" class="util-sheet-toggle-btn" data-role="util-sheet-type-select" data-sheet-type="meter" aria-label="리포트 유형 전환">
                                                <i class="fa-solid fa-file-lines" aria-hidden="true"></i>
                                                <span>검침표</span>
                                            </button>
                                        </div>
                                        <div class="util-sheet-toggle" data-role="util-sheet-dataset-toggle">
                                            <button type="button" class="util-sheet-toggle-btn" data-role="util-sheet-select" data-dataset-key="electric" aria-label="리포트 항목 전환">
                                                <i class="fa-solid fa-bolt" aria-hidden="true"></i>
                                                <span>전기비</span>
                                            </button>
                                        </div>
                                        <div class="util-sheet-month-field">
                                            <select class="util-sheet-month-select" data-role="util-sheet-month" aria-label="리포트 기준월"></select>
                                        </div>
                                        <button type="button" class="work-btn primary" data-role="util-sheet-open"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>이동</span></button>
                                    </div>
                                </div>
                                <div class="util-report-kpi-grid" data-role="util-sheet-preview" hidden></div>
                                <div class="util-report-preview-note" data-role="util-sheet-note" hidden></div>
                            </div>
                        </div>
                    `
                }
            ]
        };

        return AppData.util;
    };
})();
