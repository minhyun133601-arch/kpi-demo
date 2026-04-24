        function getUtilReportDetachedTableStyles() {
            return `
                :root { color-scheme: dark; }
                * { box-sizing: border-box; }
                body { margin: 0; font-family: 'Noto Sans KR', sans-serif; background: #020617; color: #e2e8f0; }
                .util-report-detached-shell { min-height: 100vh; display: grid; grid-template-rows: auto minmax(0, 1fr); }
                .util-report-detached-head { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; padding: 12px 14px; border-bottom: 1px solid #1e293b; background: rgba(2, 6, 23, 0.95); backdrop-filter: blur(6px); }
                .util-report-detached-meta { display: grid; gap: 0.14rem; min-width: 0; }
                .util-report-detached-title { font-size: 0.94rem; font-weight: 900; color: #f8fafc; }
                .util-report-detached-sub { font-size: 0.74rem; color: #94a3b8; font-weight: 700; }
                .util-report-detached-status { font-size: 0.7rem; color: #cbd5e1; font-weight: 700; }
                .util-report-detached-close { border: 1px solid #475569; background: #0b1220; color: #f8fafc; border-radius: 999px; padding: 6px 12px; font-size: 0.74rem; font-weight: 800; cursor: pointer; }
                .util-report-detached-close:hover { border-color: #93c5fd; color: #dbeafe; }
                .util-report-detached-body { min-height: 0; overflow: auto; padding: 12px 14px 16px; }
                .util-report-detached-table-wrap { border: 1px solid #1e293b; border-radius: 14px; overflow: auto; background: #0b1220; }
                .util-report-detached-empty { border: 1px dashed #334155; border-radius: 12px; padding: 20px; text-align: center; font-size: 0.78rem; color: #94a3b8; }
                .util-report-yoy-table { width: 100%; min-width: 740px; border-collapse: separate; border-spacing: 0; font-size: 0.74rem; color: #e2e8f0; font-variant-numeric: tabular-nums; }
                .util-report-yoy-table.is-timeline { min-width: 360px; }
                .util-report-yoy-table.is-timeline th:first-child, .util-report-yoy-table.is-timeline td:first-child { min-width: 94px; }
                .util-report-yoy-table.is-timeline th:nth-child(2), .util-report-yoy-table.is-timeline td:nth-child(2) { min-width: 180px; }
                .util-report-yoy-table th, .util-report-yoy-table td { border-bottom: 1px solid rgba(148, 163, 184, 0.22); padding: 8px 10px; white-space: nowrap; text-align: right; background: rgba(8, 18, 34, 0.96); }
                .util-report-yoy-table tbody tr:nth-child(even) td { background: rgba(15, 23, 42, 0.78); }
                .util-report-yoy-table th:first-child, .util-report-yoy-table td:first-child { text-align: left; position: sticky; left: 0; background: #0b1220; z-index: 1; }
                .util-report-yoy-table th { position: sticky; top: 0; background: #111827; color: #cbd5e1; font-weight: 800; z-index: 2; vertical-align: top; }
                .util-report-yoy-table tfoot td { background: rgba(15, 23, 42, 0.96); font-weight: 900; }
                .util-report-yoy-table tbody tr.is-focused td { background: rgba(254, 249, 195, 0.9); color: #111827; box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.72); }
                .util-report-yoy-table tbody tr.is-focused td:first-child { background: rgba(253, 230, 138, 0.95); }
                .util-report-yoy-table td.is-cell-focused { background: rgba(250, 204, 21, 0.96); color: #111827; box-shadow: inset 0 0 0 2px rgba(180, 83, 9, 0.9), 0 0 0 1px rgba(254, 240, 138, 0.35); }
                .util-report-yoy-table.is-structured th .util-head-cell { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
                .util-report-yoy-table.is-structured th:first-child .util-head-cell { align-items: flex-start; text-align: left; }
                .util-report-yoy-table.is-structured th:not(:first-child) .util-head-cell { align-items: flex-end; text-align: right; }
                .util-report-yoy-table.is-structured th .util-head-label { font-size: 0.76rem; font-weight: 900; line-height: 1.08; letter-spacing: 0.01em; color: #f8fafc; }
                .util-report-yoy-table.is-structured th .util-head-sub { font-size: 0.64rem; font-weight: 800; line-height: 1.14; color: #cbd5e1; }
                .util-report-yoy-table.is-structured th.is-primary,
                .util-report-yoy-table.is-structured th.is-current { color: #bfdbfe; background: rgba(37, 99, 235, 0.18); box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18); }
                .util-report-yoy-table.is-structured th.is-primary .util-head-label,
                .util-report-yoy-table.is-structured th.is-current .util-head-label { color: #eff6ff; }
                .util-report-yoy-table.is-structured th.is-primary .util-head-sub,
                .util-report-yoy-table.is-structured th.is-current .util-head-sub { color: #dbeafe; }
                .util-report-yoy-table.is-structured th.is-prev { color: #fdba74; background: rgba(249, 115, 22, 0.18); box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.18); }
                .util-report-yoy-table.is-structured th.is-prev .util-head-label { color: #fff7ed; }
                .util-report-yoy-table.is-structured th.is-prev .util-head-sub { color: #ffedd5; }
                .util-report-yoy-table.is-structured th.is-delta,
                .util-report-yoy-table.is-structured th.is-rate { color: #e2e8f0; background: rgba(71, 85, 105, 0.28); box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16); }
                .util-report-yoy-table.is-structured th.is-delta .util-head-label,
                .util-report-yoy-table.is-structured th.is-rate .util-head-label { color: #f8fafc; }
                .util-report-yoy-table.is-structured th.is-delta .util-head-sub,
                .util-report-yoy-table.is-structured th.is-rate .util-head-sub { color: #e2e8f0; }
                .util-report-yoy-table.is-structured td.is-primary,
                .util-report-yoy-table.is-structured td.is-current { color: #eff6ff; font-weight: 800; }
                .util-report-yoy-table.is-structured td.is-prev { color: #ffedd5; }
                .util-report-yoy-table.is-structured tbody td:first-child,
                .util-report-yoy-table.is-structured tfoot td:first-child { color: #f8fafc; font-weight: 800; }
                .util-report-yoy-table.is-structured .util-report-yoy-row-label { display: inline-flex; align-items: center; min-height: 22px; font-weight: 800; }
                .util-report-yoy-table.is-structured .util-report-yoy-value { display: inline-flex; align-items: center; justify-content: flex-end; min-height: 22px; font-weight: 800; letter-spacing: -0.01em; }
                .util-report-yoy-table.is-structured .util-report-yoy-pill { display: inline-flex; align-items: center; justify-content: flex-end; min-height: 28px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(148, 163, 184, 0.18); background: rgba(148, 163, 184, 0.1); font-size: 0.76rem; font-weight: 900; line-height: 1.15; }
                .util-report-yoy-table.is-structured .util-report-yoy-pill.is-rate { min-width: 88px; }
                .util-report-yoy-table.is-structured .util-report-yoy-pill.is-up { color: #fecaca; border-color: rgba(248, 113, 113, 0.34); background: rgba(127, 29, 29, 0.18); }
                .util-report-yoy-table.is-structured .util-report-yoy-pill.is-down { color: #bae6fd; border-color: rgba(56, 189, 248, 0.34); background: rgba(8, 47, 73, 0.24); }
                .util-report-yoy-table.is-structured .util-report-yoy-pill.is-flat { color: #cbd5e1; border-color: rgba(148, 163, 184, 0.18); background: rgba(15, 23, 42, 0.46); }
                .util-report-yoy-table.is-structured .util-report-yoy-delta-stack { display: inline-grid; justify-items: end; gap: 4px; padding: 4px 10px; border-radius: 14px; border: 1px solid rgba(148, 163, 184, 0.18); background: rgba(148, 163, 184, 0.1); min-width: 132px; }
                .util-report-yoy-table.is-structured .util-report-yoy-delta-value { font-size: 0.8rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.01em; }
                .util-report-yoy-table.is-structured .util-report-yoy-delta-rate { font-size: 0.66rem; font-weight: 800; line-height: 1.05; color: #cbd5e1; }
                .util-report-yoy-table.is-structured .util-report-yoy-delta-stack.is-up { color: #fecaca; border-color: rgba(248, 113, 113, 0.34); background: rgba(127, 29, 29, 0.18); }
                .util-report-yoy-table.is-structured .util-report-yoy-delta-stack.is-up .util-report-yoy-delta-rate { color: #fecaca; }
                .util-report-yoy-table.is-structured .util-report-yoy-delta-stack.is-down { color: #bae6fd; border-color: rgba(56, 189, 248, 0.34); background: rgba(8, 47, 73, 0.24); }
                .util-report-yoy-table.is-structured .util-report-yoy-delta-stack.is-down .util-report-yoy-delta-rate { color: #bae6fd; }
                .util-report-yoy-table.is-structured .util-report-yoy-delta-stack.is-flat { color: #cbd5e1; border-color: rgba(148, 163, 184, 0.18); background: rgba(15, 23, 42, 0.46); }
                .util-report-yoy-table.is-structured .util-report-yoy-summary { display: grid; gap: 2px; }
                .util-report-yoy-table.is-structured .util-report-yoy-summary-title { font-size: 0.72rem; font-weight: 900; color: #f8fafc; line-height: 1.08; }
                .util-report-yoy-table.is-structured .util-report-yoy-summary-sub { font-size: 0.6rem; font-weight: 800; color: #94a3b8; line-height: 1.08; }
                .util-report-yoy-table.is-structured tfoot tr.util-report-yoy-total td { background: rgba(15, 23, 42, 0.96) !important; }
                .util-report-yoy-table.is-structured tfoot tr.util-report-yoy-total td.is-primary,
                .util-report-yoy-table.is-structured tfoot tr.util-report-yoy-total td.is-current { color: #bfdbfe; }
                .util-report-yoy-table.is-structured tfoot tr.util-report-yoy-total td.is-prev { color: #fdba74; }
                .util-report-inline-table-wrap { min-height: 100%; padding-top: 2px; display: grid; gap: 10px; align-content: start; }
                .util-report-yoy-compare-block { display: grid; gap: 10px; align-content: start; }
                .util-report-yoy-compare-block .util-report-builder-viz-compare-meta { grid-template-columns: repeat(auto-fit, minmax(176px, 1fr)); justify-content: stretch; padding: 0; }
                .util-report-yoy-compare-block .util-report-builder-viz-compare-chip { min-height: 64px; }
                .util-report-builder-viz-timeline-table tbody tr.is-row-focused td { background: rgba(254, 249, 195, 0.82); color: #111827; box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.62); }
                .util-report-builder-viz-timeline-table tbody tr.is-row-focused td:first-child { background: rgba(253, 230, 138, 0.94); }
                .util-report-builder-viz-timeline-table td.is-cell-focused { position: relative; background: rgba(250, 204, 21, 0.96); color: #111827; box-shadow: inset 0 0 0 2px rgba(180, 83, 9, 0.9), 0 0 0 1px rgba(254, 240, 138, 0.35); z-index: 1; }
                .util-report-builder-viz-timeline-table td.is-cell-focused:first-child { box-shadow: inset 0 0 0 2px rgba(180, 83, 9, 0.9), 0 0 0 1px rgba(254, 240, 138, 0.35); }
                .util-report-yoy-table, .util-report-yoy-table * { user-select: text; }
                .util-report-builder-viz-detail-block { display: grid; gap: 10px; padding: 10px; }
                .util-report-builder-viz-detail-title { font-size: 0.82rem; font-weight: 900; color: #dbeafe; }
                .util-report-builder-viz-compare-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(154px, 1fr)); gap: 8px; padding: 0 0 4px; }
                .util-report-builder-viz-compare-chip { border: 1px solid rgba(71, 85, 105, 0.44); border-radius: 14px; padding: 9px 11px; background: rgba(15, 23, 42, 0.5); display: grid; gap: 3px; min-height: 68px; align-content: start; }
                .util-report-builder-viz-compare-chip .label { font-size: 0.64rem; color: #94a3b8; font-weight: 800; letter-spacing: 0.01em; }
                .util-report-builder-viz-compare-chip .value { font-size: 0.94rem; color: #f8fafc; font-weight: 900; letter-spacing: -0.02em; }
                .util-report-builder-viz-compare-chip .meta { font-size: 0.68rem; color: #cbd5e1; font-weight: 800; }
                .util-report-builder-viz-compare-chip.is-actual { border-color: rgba(59, 130, 246, 0.38); background: rgba(30, 64, 175, 0.12); }
                .util-report-builder-viz-compare-chip.is-applied { border-color: rgba(249, 115, 22, 0.38); background: rgba(154, 52, 18, 0.12); }
                .util-report-builder-viz-compare-chip.is-delta { border-color: rgba(148, 163, 184, 0.3); box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.04); }
                .util-report-builder-viz-compare-chip.is-delta .label { color: #e2e8f0; }
                .util-report-builder-viz-compare-chip.is-delta .value { font-size: 1.08rem; }
                .util-report-builder-viz-compare-chip.is-peak { border-color: rgba(125, 211, 252, 0.3); background: rgba(15, 23, 42, 0.72); }
                .util-report-builder-viz-compare-chip.is-delta.util-report-builder-viz-detail-delta-up,
                .util-report-builder-viz-compare-chip.is-peak.util-report-builder-viz-detail-delta-up { border-color: rgba(248, 113, 113, 0.42); background: rgba(127, 29, 29, 0.16); }
                .util-report-builder-viz-compare-chip.is-delta.util-report-builder-viz-detail-delta-down,
                .util-report-builder-viz-compare-chip.is-peak.util-report-builder-viz-detail-delta-down { border-color: rgba(56, 189, 248, 0.42); background: rgba(8, 47, 73, 0.2); }
                .util-report-builder-viz-compare-table th .util-head-cell { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
                .util-report-builder-viz-compare-table th:first-child .util-head-cell { align-items: flex-start; text-align: left; }
                .util-report-builder-viz-compare-table th:not(:first-child) .util-head-cell { align-items: flex-end; text-align: right; }
                .util-report-builder-viz-compare-table th .util-head-label { font-size: 0.76rem; font-weight: 900; line-height: 1.08; letter-spacing: 0.01em; color: #f8fafc; }
                .util-report-builder-viz-compare-table th .util-head-sub { font-size: 0.64rem; font-weight: 800; line-height: 1.14; color: #cbd5e1; }
                .util-report-builder-viz-compare-table th.is-actual { color: #bfdbfe; background: rgba(37, 99, 235, 0.18); box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18); }
                .util-report-builder-viz-compare-table th.is-actual .util-head-label { color: #eff6ff; }
                .util-report-builder-viz-compare-table th.is-actual .util-head-sub { color: #dbeafe; }
                .util-report-builder-viz-compare-table th.is-applied { color: #fdba74; background: rgba(249, 115, 22, 0.18); box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.18); }
                .util-report-builder-viz-compare-table th.is-applied .util-head-label { color: #fff7ed; }
                .util-report-builder-viz-compare-table th.is-applied .util-head-sub { color: #ffedd5; }
                .util-report-builder-viz-compare-table th.is-delta { color: #e2e8f0; background: rgba(71, 85, 105, 0.28); box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16); }
                .util-report-builder-viz-compare-table th.is-delta .util-head-label { color: #f8fafc; }
                .util-report-builder-viz-compare-table th.is-delta .util-head-sub { color: #e2e8f0; }
                .util-report-builder-viz-compare-table td.is-actual { color: #eff6ff; font-weight: 800; background: transparent; }
                .util-report-builder-viz-compare-table td.is-applied { color: #ffedd5; background: transparent; }
                .util-report-builder-viz-compare-table tbody td:first-child,
                .util-report-builder-viz-compare-table tfoot td:first-child { color: #f8fafc; font-weight: 800; }
                .util-report-builder-viz-compare-delta-cell { min-width: 140px; }
                .util-report-builder-viz-compare-delta-value { display: inline-flex; align-items: center; justify-content: flex-end; padding: 4px 10px; border-radius: 999px; font-size: 0.79rem; font-weight: 900; background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.16); }
                .util-report-builder-viz-compare-delta-cell.util-report-builder-viz-detail-delta-up .util-report-builder-viz-compare-delta-value { background: rgba(127, 29, 29, 0.18); border-color: rgba(248, 113, 113, 0.34); }
                .util-report-builder-viz-compare-delta-cell.util-report-builder-viz-detail-delta-down .util-report-builder-viz-compare-delta-value { background: rgba(8, 47, 73, 0.22); border-color: rgba(56, 189, 248, 0.34); }
                .util-report-builder-viz-compare-delta-rate { margin-top: 4px; font-size: 0.68rem; font-weight: 800; }
                .util-report-builder-viz-compare-total td { background: rgba(15, 23, 42, 0.86) !important; font-weight: 900; }
                .util-report-builder-viz-compare-total td.is-actual { color: #bfdbfe; }
                .util-report-builder-viz-compare-total td.is-applied { color: #fdba74; }
                .util-report-builder-viz-detail-delta-up { color: #fca5a5; font-weight: 900; }
                .util-report-builder-viz-detail-delta-down { color: #7dd3fc; font-weight: 900; }
                .util-report-delta.is-up { color: #ef4444; }
                .util-report-delta.is-down { color: #38bdf8; }
                .util-report-delta.is-flat { color: #94a3b8; }
                @media (max-width: 920px) {
                    .util-report-builder-viz-compare-meta { grid-template-columns: 1fr; }
                }
            `;
        }

        function buildUtilReportDetachedTableShellHtml() {
            return `
                <!doctype html>
                <html lang="ko">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>유틸리티 통합 보고서 상세표</title>
                    <style>${getUtilReportDetachedTableStyles()}</style>
                </head>
                <body>
                    <div class="util-report-detached-shell">
                        <div class="util-report-detached-head">
                            <div class="util-report-detached-meta">
                                <div class="util-report-detached-title" data-role="util-report-detached-title">유틸리티 통합 보고서 상세표</div>
                                <div class="util-report-detached-sub" data-role="util-report-detached-sub">기간: -</div>
                                <div class="util-report-detached-status" data-role="util-report-detached-status">지표: -</div>
                            </div>
                            <button type="button" class="util-report-detached-close" data-role="util-report-detached-close">닫기</button>
                        </div>
                        <div class="util-report-detached-body" data-role="util-report-detached-body">
                            <div class="util-report-detached-empty">표를 준비 중입니다.</div>
                        </div>
                    </div>
                    <script>
                        document.addEventListener('click', function(event) {
                            if (event.target && event.target.closest('[data-role="util-report-detached-close"]')) {
                                window.close();
                            }
                        });
                    <\/script>
                </body>
                </html>
            `;
        }

        function renderUtilReportDetachedPlaceholder(result) {
            const metricKey = resolveUtilReportDetailMetricKey();
            const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
            const rangeLabel = result?.rangeLabel ? `기간: ${result.rangeLabel}` : '기간: 데이터 없음';
            return `
                <div class="util-report-detached-placeholder">
                    <div class="util-report-detached-placeholder-title">상세표가 별도 창으로 분리되어 있습니다.</div>
                    <div class="util-report-detached-placeholder-sub">${escapeHtml(rangeLabel)} / 지표: ${escapeHtml(metricLabel)}</div>
                    <div class="util-report-detached-placeholder-note">그래프 클릭 포커스와 기준 변경은 분리창 표에만 반영됩니다. 하단 복귀는 상단의 표 복귀 버튼을 사용하면 됩니다.</div>
                </div>
            `;
        }

        function renderUtilReportInlineDetailContent(result) {
            if (UtilReportDetachedTableState.detached) {
                return renderUtilReportDetachedPlaceholder(result);
            }
            return `
                <div class="util-report-inline-table-wrap">
                    ${renderUtilReportYoYTable(result, resolveUtilReportDetailMetricKey(), UtilReportState.compareYear)}
                </div>
            `;
        }

        function buildUtilEnergyDetachedTableShellHtml() {
            return `
                <!doctype html>
                <html lang="ko">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>유틸리티 열량 보고서 상세표</title>
                    <style>${getUtilReportDetachedTableStyles()}</style>
                </head>
                <body>
                    <div class="util-report-detached-shell">
                        <div class="util-report-detached-head">
                            <div class="util-report-detached-meta">
                                <div class="util-report-detached-title" data-role="util-report-detached-title">유틸리티 열량 보고서 상세표</div>
                                <div class="util-report-detached-sub" data-role="util-report-detached-sub">기간: -</div>
                                <div class="util-report-detached-status" data-role="util-report-detached-status">지표: -</div>
                            </div>
                            <button type="button" class="util-report-detached-close" data-role="util-report-detached-close">닫기</button>
                        </div>
                        <div class="util-report-detached-body" data-role="util-report-detached-body">
                            <div class="util-report-detached-empty">표를 준비 중입니다.</div>
                        </div>
                    </div>
                    <script>
                        document.addEventListener('click', function(event) {
                            if (event.target && event.target.closest('[data-role="util-report-detached-close"]')) {
                                window.close();
                            }
                        });
                    <\/script>
                </body>
                </html>
            `;
        }

        function renderUtilEnergyDetachedPlaceholder(result, descriptor) {
            const rangeLabel = result?.rangeLabel ? `기간: ${result.rangeLabel}` : '기간: 데이터 없음';
            const compareLabel = UtilEnergyReportState.compareYear
                ? `${UtilEnergyReportState.compareYear} 기준 비교표`
                : '기간 순 상세표';
            return `
                <div class="util-report-detached-placeholder">
                    <div class="util-report-detached-placeholder-title">상세표가 별도 창으로 분리되어 있습니다.</div>
                    <div class="util-report-detached-placeholder-sub">${escapeHtml(rangeLabel)} / 보기: ${escapeHtml(compareLabel)} / 선택: ${escapeHtml(descriptor?.label || '전체 열량')}</div>
                    <div class="util-report-detached-placeholder-note">그래프 클릭 포커스와 기준 변경은 분리창 표에만 반영됩니다. 상단 버튼으로 표를 복귀할 수 있습니다.</div>
                </div>
            `;
        }

        function getUtilReportBuilderVizDetachedTableWindow() {
            const popup = UtilReportBuilderVizDetachedTableState.win;
            if (!popup) return null;
            try {
                if (popup.closed) {
                    UtilReportBuilderVizDetachedTableState.win = null;
                    return null;
                }
            } catch (error) {
                UtilReportBuilderVizDetachedTableState.win = null;
                return null;
            }
            return popup;
        }

        function buildUtilReportBuilderVizDetachedTableShellHtml() {
            return `
                <!doctype html>
                <html lang="ko">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>유틸리티 개별 보고서 상세표</title>
                    <style>${getUtilReportDetachedTableStyles()}</style>
                </head>
                <body>
                    <div class="util-report-detached-shell">
                        <div class="util-report-detached-head">
                            <div class="util-report-detached-meta">
                                <div class="util-report-detached-title" data-role="util-report-detached-title">유틸리티 개별 보고서 상세표</div>
                                <div class="util-report-detached-sub" data-role="util-report-detached-sub">기간: -</div>
                                <div class="util-report-detached-status" data-role="util-report-detached-status">보기: -</div>
                            </div>
                            <button type="button" class="util-report-detached-close" data-role="util-report-detached-close">닫기</button>
                        </div>
                        <div class="util-report-detached-body" data-role="util-report-detached-body">
                            <div class="util-report-detached-empty">표를 준비 중입니다.</div>
                        </div>
                    </div>
                    <script>
                        document.addEventListener('click', function(event) {
                            if (event.target && event.target.closest('[data-role="util-report-detached-close"]')) {
                                window.close();
                            }
                        });
                    <\/script>
                </body>
                </html>
            `;
        }

        function getUtilReportBuilderVizCurrentDetailDescriptor(data = null) {
            const panelKey = normalizeUtilReportBuilderVizChartView(UtilReportBuilderVizState.chartViewKey);
            const itemKey = normalizeUtilReportBuilderItemKey(data?.itemKey || UtilReportBuilderVizState.itemKey);
            const itemLabel = String(data?.itemLabel || getUtilReportBuilderVizItemLabel(itemKey) || '개별 보고서');
            const teamLabel = normalizeUtilReportBuilderTeam(data?.team || UtilReportBuilderVizState.team, itemKey);
            const ratioConfig = resolveUtilReportBuilderVizRatioConfig(itemKey);
            const ratioNumeratorMetric = String(data?.ratioNumeratorMetric || ratioConfig.numeratorMetric || '').trim();
            const ratioDenominatorMetric = String(data?.ratioDenominatorMetric || ratioConfig.denominatorMetric || '').trim();
            const ratioUseDenominator = typeof data?.ratioUseDenominator === 'boolean'
                ? data.ratioUseDenominator
                : ratioConfig.useDenominator;
            const range = normalizeMonthRange(
                data?.range?.start || UtilReportBuilderVizState.from,
                data?.range?.end || UtilReportBuilderVizState.to
            );
            const rangeLabel = data?.result?.rangeLabel
                ? `기간: ${data.result.rangeLabel}`
                : `기간: ${range.start} ~ ${range.end}`;
            const ratioTitle = String(
                data?.ratioTitle
                || getUtilReportBuilderVizRatioTitle(itemKey, ratioNumeratorMetric, ratioDenominatorMetric, ratioUseDenominator)
                || '비율'
            );
            const panelLabel = panelKey === 'ratio'
                ? (data?.appliedModeEnabled === true ? `${ratioTitle} 적용 분석` : ratioTitle)
                : '사용량 · 비용 · 생산량';
            return {
                panelKey,
                itemKey,
                itemLabel,
                teamLabel,
                rangeLabel,
                panelLabel
            };
        }

        function renderUtilReportBuilderVizDetachedPlaceholder(data = null) {
            const descriptor = getUtilReportBuilderVizCurrentDetailDescriptor(data);
            return `
                <div class="util-report-detached-placeholder">
                    <div class="util-report-detached-placeholder-title">상세표가 별도 창으로 분리되어 있습니다.</div>
                    <div class="util-report-detached-placeholder-sub">${escapeHtml(descriptor.rangeLabel)} / 항목: ${escapeHtml(descriptor.itemLabel)} / 팀: ${escapeHtml(descriptor.teamLabel)} / 보기: ${escapeHtml(descriptor.panelLabel)}</div>
                    <div class="util-report-detached-placeholder-note">그래프 클릭 포커스와 기준 변경은 분리창 표에만 반영됩니다. 상단 버튼으로 표를 복귀할 수 있습니다.</div>
                </div>
            `;
        }

        function renderUtilReportBuilderVizCurrentDetailContent(data = null) {
            if (!data) {
                return '<div class="util-report-builder-viz-detail-empty">표시할 데이터가 없습니다.</div>';
            }
            const panelKey = normalizeUtilReportBuilderVizChartView(UtilReportBuilderVizState.chartViewKey);
            const focusMonthKey = normalizeUtilReportMonthKey(UtilReportBuilderVizState.focusMonthKey);
            if (panelKey === 'ratio') {
                return data?.appliedModeEnabled === true
                    ? (renderUtilReportBuilderVizAppliedComparisonDetailNext(data, focusMonthKey)
                        || '<div class="util-report-detached-empty">원단위 기준과 적용 대상을 선택하면 적용 분석 상세표가 표시됩니다.</div>')
                    : renderUtilReportBuilderVizRatioDetailTable(data, focusMonthKey);
            }
            const focusSeriesKey = normalizeUtilReportBuilderVizSeriesKey(
                UtilReportBuilderVizState.detailFocusSeriesKey
                || UtilReportBuilderVizState.isolatedSeriesKey
                || UtilReportBuilderVizState.focusSeriesKey
            );
            return renderUtilReportBuilderVizSeriesDetailTable(data, focusSeriesKey, focusMonthKey);
        }

        function syncUtilReportBuilderVizActionState(modal, data = null) {
            if (!modal) return;
            const descriptor = getUtilReportBuilderVizCurrentDetailDescriptor(data);
            modal.classList.toggle('is-chart-fullscreen', UtilReportBuilderVizState.chartFullscreen === true);
            const detachButtons = Array.from(modal.querySelectorAll('[data-role="util-report-builder-viz-inline-detach"]'));
            detachButtons.forEach(button => {
                button.textContent = UtilReportBuilderVizDetachedTableState.detached ? '표 복귀' : '표 분리';
                button.setAttribute('aria-label', `${descriptor.panelLabel} ${UtilReportBuilderVizDetachedTableState.detached ? '표 복귀' : '표 분리'}`);
                button.setAttribute('title', `${descriptor.panelLabel} ${UtilReportBuilderVizDetachedTableState.detached ? '표 복귀' : '표 분리'}`);
            });
            const fullscreenButtons = Array.from(modal.querySelectorAll('[data-role="util-report-builder-viz-chart-fullscreen-toggle"]'));
            fullscreenButtons.forEach(button => {
                const actionLabel = UtilReportBuilderVizState.chartFullscreen === true ? '차트 복원' : '차트 확대';
                syncUtilReportChartFullscreenToggleButton(button, UtilReportBuilderVizState.chartFullscreen === true);
                button.setAttribute('aria-label', `${descriptor.panelLabel} ${actionLabel}`);
                button.setAttribute('title', `${descriptor.panelLabel} ${actionLabel}`);
            });
        }

        function refreshUtilReportBuilderVizModalAfterDetach() {
            const modal = document.getElementById('util-report-builder-viz-modal');
            if (modal && modal.classList.contains('is-open')) {
                renderUtilReportBuilderVizHost(modal);
            }
            renderUtilReportBuilderVizPopupWindow();
        }

        function syncUtilReportBuilderVizDetachedTableWindow(data = null) {
            const popup = getUtilReportBuilderVizDetachedTableWindow();
            if (!popup) return;
            try {
                const descriptor = getUtilReportBuilderVizCurrentDetailDescriptor(data);
                const doc = popup.document;
                const titleEl = doc.querySelector('[data-role="util-report-detached-title"]');
                const subEl = doc.querySelector('[data-role="util-report-detached-sub"]');
                const statusEl = doc.querySelector('[data-role="util-report-detached-status"]');
                const bodyEl = doc.querySelector('[data-role="util-report-detached-body"]');
                if (titleEl) titleEl.textContent = `${descriptor.itemLabel} 보고서 상세표`;
                if (subEl) subEl.textContent = descriptor.rangeLabel;
                if (statusEl) statusEl.textContent = `팀: ${descriptor.teamLabel} / 보기: ${descriptor.panelLabel}`;
                if (bodyEl) {
                    bodyEl.innerHTML = data
                        ? `<div class="util-report-detached-table-wrap">${renderUtilReportBuilderVizCurrentDetailContent(data)}</div>`
                        : '<div class="util-report-detached-empty">표시할 데이터가 없습니다.</div>';
                    scrollUtilReportFocusedElementIntoView(bodyEl, { behavior: 'auto' });
                }
                doc.title = `${descriptor.itemLabel} 상세표 - ${descriptor.panelLabel}`;
            } catch (error) {
                closeUtilReportBuilderVizDetachedTableWindow();
            }
        }

        function closeUtilReportBuilderVizDetachedTableWindow() {
            const popup = getUtilReportBuilderVizDetachedTableWindow();
            UtilReportBuilderVizDetachedTableState.win = null;
            UtilReportBuilderVizDetachedTableState.detached = false;
            if (popup) {
                try { popup.close(); } catch (error) {}
            }
            refreshUtilReportBuilderVizModalAfterDetach();
        }

        function openUtilReportBuilderVizDetachedTableWindow(data = null) {
            if (!window.__utilReportBuilderVizDetachedUnloadBound) {
                window.__utilReportBuilderVizDetachedUnloadBound = true;
                window.addEventListener('beforeunload', () => {
                    closeUtilReportBuilderVizDetachedTableWindow();
                });
                window.addEventListener('pagehide', () => {
                    closeUtilReportBuilderVizDetachedTableWindow();
                });
            }

            let popup = getUtilReportBuilderVizDetachedTableWindow();
            const wasDetached = UtilReportBuilderVizDetachedTableState.detached === true;
            if (!popup) {
                popup = window.open('', 'util-report-builder-viz-detached-table', 'popup=yes,width=1180,height=780,left=96,top=96,resizable=yes,scrollbars=yes');
                if (!popup) {
                    alert('표 분리창을 열 수 없습니다. 브라우저 팝업 차단을 확인해 주세요.');
                    return null;
                }
                UtilReportBuilderVizDetachedTableState.win = popup;
                popup.document.open();
                popup.document.write(buildUtilReportBuilderVizDetachedTableShellHtml());
                popup.document.close();
                popup.onbeforeunload = () => {
                    if (UtilReportBuilderVizDetachedTableState.win === popup) {
                        UtilReportBuilderVizDetachedTableState.win = null;
                        if (UtilReportBuilderVizDetachedTableState.detached) {
                            UtilReportBuilderVizDetachedTableState.detached = false;
                            refreshUtilReportBuilderVizModalAfterDetach();
                        }
                    }
                };
            }

            UtilReportBuilderVizDetachedTableState.detached = true;
            syncUtilReportBuilderVizDetachedTableWindow(data);
            if (!wasDetached) {
                refreshUtilReportBuilderVizModalAfterDetach();
            }
            try {
                popup.focus();
            } catch (error) {}
            return popup;
        }

        function getUtilReportBuilderVizPopupWindow() {
            const popup = UtilReportBuilderVizPopupState.win;
            if (!popup) return null;
            try {
                if (popup.closed) {
                    UtilReportBuilderVizPopupState.win = null;
                    return null;
                }
            } catch (error) {
                UtilReportBuilderVizPopupState.win = null;
                return null;
            }
            return popup;
        }

        function buildUtilReportBuilderVizPopupHeadAssetsHtml() {
            return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(node => node.outerHTML)
                .join('\n');
        }

        function buildUtilReportBuilderVizPopupShellHtml() {
            return `
                <!doctype html>
                <html lang="ko">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>유틸리티 그래프</title>
                    ${buildUtilReportBuilderVizPopupHeadAssetsHtml()}
                    <style>
                        html, body {
                            margin: 0;
                            width: 100%;
                            height: 100%;
                            background: #020617;
                            overflow: hidden;
                        }
                        body {
                            color-scheme: dark;
                        }
                        #util-report-builder-viz-popup-modal.util-report-builder-viz-modal {
                            position: static;
                            inset: auto;
                            display: flex;
                            min-height: 100vh;
                            background: transparent;
                        }
                        #util-report-builder-viz-popup-modal .util-report-builder-viz-card {
                            width: 100%;
                            height: 100vh;
                        }
                        #util-report-builder-viz-popup-modal .util-report-builder-viz-head {
                            padding-top: 12px;
                        }
                        #util-report-builder-viz-popup-modal .util-report-builder-viz-panel-note {
                            margin-top: 2px;
                        }
                    </style>
                </head>
                <body>
                    <div id="util-report-builder-viz-popup-modal" class="util-report-builder-viz-modal is-open">
                        <div class="util-report-builder-viz-card">
                            <div class="util-report-builder-viz-head">
                                <div>
                                    <div class="util-report-builder-viz-title">유틸리티 그래프</div>
                                    <div class="util-report-builder-viz-sub" data-role="util-report-builder-viz-sub">기간: -</div>
                                </div>
                                <div class="util-report-builder-viz-actions">
                                    <button type="button" class="util-report-builder-viz-btn" data-role="util-report-builder-viz-inline-detach">표 분리</button>
                                    <button type="button" class="util-report-builder-viz-btn util-report-builder-viz-icon-btn" data-role="util-report-builder-viz-chart-fullscreen-toggle" aria-label="차트 확대" title="차트 확대"><i class="fas fa-expand" aria-hidden="true"></i></button>
                                    <button type="button" class="util-report-builder-viz-btn" data-role="util-report-builder-viz-chart-view-toggle">비율</button>
                                    <button type="button" class="util-report-builder-viz-btn primary" data-role="util-report-builder-viz-close">닫기</button>
                                </div>
                            </div>
                            <div class="util-report-builder-viz-controls">
                                <div class="util-report-builder-viz-control-row">
                                    <div class="util-report-builder-viz-group">
                                        <div class="util-report-builder-viz-fields">
                                            <div class="util-report-builder-viz-field is-lg">
                                                <label>시작</label>
                                                <select data-role="util-report-builder-viz-from"></select>
                                            </div>
                                            <div class="util-report-builder-viz-field is-lg">
                                                <label>끝</label>
                                                <select data-role="util-report-builder-viz-to"></select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="util-report-builder-viz-group">
                                        <div class="util-report-builder-viz-unit-shell" data-role="util-report-builder-viz-unit-shell">
                                            <button type="button" class="util-report-builder-viz-unit-toggle" data-role="util-report-builder-viz-unit-toggle" aria-expanded="false">단위</button>
                                            <div class="util-report-builder-viz-unit-popover" data-role="util-report-builder-viz-unit-popover" hidden>
                                                <div class="util-report-builder-viz-unit-grid">
                                                    <div class="util-report-builder-viz-unit-row">
                                                        <span class="name">사용량</span>
                                                        <select data-role="util-report-builder-viz-usage-unit"></select>
                                                        <select data-role="util-report-builder-viz-usage-decimals"></select>
                                                    </div>
                                                    <div class="util-report-builder-viz-unit-row">
                                                        <span class="name">비용</span>
                                                        <select data-role="util-report-builder-viz-cost-unit"></select>
                                                        <select data-role="util-report-builder-viz-cost-decimals"></select>
                                                    </div>
                                                    <div class="util-report-builder-viz-unit-row">
                                                        <span class="name">생산량</span>
                                                        <select data-role="util-report-builder-viz-production-unit"></select>
                                                        <select data-role="util-report-builder-viz-production-decimals"></select>
                                                    </div>
                                                    <div class="util-report-builder-viz-unit-row is-ratio">
                                                        <span class="name">분수</span>
                                                        <select data-role="util-report-builder-viz-ratio-numerator"></select>
                                                        <span class="slash">/</span>
                                                        <select data-role="util-report-builder-viz-ratio-denominator"></select>
                                                    </div>
                                                    <div class="util-report-builder-viz-unit-row is-ratio-decimals">
                                                        <span class="name">분수소수</span>
                                                        <select data-role="util-report-builder-viz-ratio-decimals"></select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="util-report-builder-viz-body">
                                <div class="util-report-builder-viz-kpis" data-role="util-report-builder-viz-kpis"></div>
                                <div class="util-report-builder-viz-panel" data-role="util-report-builder-viz-main-panel">
                                    <div class="util-report-builder-viz-panel-head">
                                        <div class="util-report-builder-viz-panel-title">사용량 · 비용 · 생산량</div>
                                        <div class="util-report-builder-viz-panel-tools">
                                            <div class="util-report-builder-viz-field is-sm">
                                                <label>사용량</label>
                                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-usage-type-toggle" data-chart-type="bar">막대</button>
                                            </div>
                                            <div class="util-report-builder-viz-field is-sm">
                                                <label>비용</label>
                                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-cost-type-toggle" data-chart-type="line">선</button>
                                            </div>
                                            <div class="util-report-builder-viz-field is-sm">
                                                <label>생산량</label>
                                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-production-type-toggle" data-chart-type="line">선</button>
                                            </div>
                                            <div class="util-report-builder-viz-field is-label">
                                                <label>레이블</label>
                                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-label-toggle" aria-pressed="false">레이블</button>
                                            </div>
                                        </div>
                                        <div class="util-report-builder-viz-panel-note" data-role="util-report-builder-viz-main-note">목차를 바꾸면 이 창이 자동으로 갱신됩니다.</div>
                                    </div>
                                    <div class="util-report-builder-viz-scroll" data-role="util-report-builder-viz-main-chart"></div>
                                    <div class="util-report-builder-viz-detail" data-role="util-report-builder-viz-main-detail"></div>
                                </div>
                                <div class="util-report-builder-viz-panel" data-role="util-report-builder-viz-ratio-panel">
                                    <div class="util-report-builder-viz-panel-head">
                                        <div class="util-report-builder-viz-panel-title" data-role="util-report-builder-viz-ratio-title">비율</div>
                                        <div class="util-report-builder-viz-panel-tools">
                                            <div class="util-report-builder-viz-field is-sm">
                                                <label>원단위 기준</label>
                                                <select data-role="util-report-builder-viz-applied-base-year"></select>
                                            </div>
                                            <div class="util-report-builder-viz-field is-sm">
                                                <label>적용 대상</label>
                                                <select data-role="util-report-builder-viz-applied-compare-year"></select>
                                            </div>
                                            <div class="util-report-builder-viz-field is-sm" data-role="util-report-builder-viz-ratio-type-field">
                                                <label>비율</label>
                                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-ratio-type-toggle" data-chart-type="line">선</button>
                                            </div>
                                            <div class="util-report-builder-viz-field is-sm" data-role="util-report-builder-viz-ratio-actual-type-field" hidden>
                                                <label>실제값</label>
                                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-ratio-actual-type-toggle" data-chart-type="line">선</button>
                                            </div>
                                            <div class="util-report-builder-viz-field is-sm" data-role="util-report-builder-viz-ratio-applied-type-field" hidden>
                                                <label>적용값</label>
                                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-ratio-applied-type-toggle" data-chart-type="line">선</button>
                                            </div>
                                            <div class="util-report-builder-viz-field is-label">
                                                <label>레이블</label>
                                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-label-toggle" aria-pressed="false">레이블</button>
                                            </div>
                                        </div>
                                        <div class="util-report-builder-viz-panel-note">목차 선택과 현재 조건이 자동 반영됩니다.</div>
                                    </div>
                                    <div class="util-report-builder-viz-scroll is-ratio" data-role="util-report-builder-viz-ratio-chart"></div>
                                    <div class="util-report-builder-viz-detail" data-role="util-report-builder-viz-ratio-detail"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;
        }

        function bindUtilReportBuilderVizPopupWindow(popup) {
            if (!popup) return null;
            const modal = popup.document.getElementById('util-report-builder-viz-popup-modal');
            if (!modal) return null;
            ensureUtilReportBuilderVizRatioAppliedControls(modal);
            if (modal.__utilReportBuilderVizPopupBound) return modal;
            modal.__utilReportBuilderVizPopupBound = true;

            popup.document.addEventListener('click', event => {
                const unitToggleButton = event.target.closest('[data-role="util-report-builder-viz-unit-toggle"]');
                if (unitToggleButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleUtilReportBuilderVizUnitPopover(modal);
                    return;
                }
                const unitShell = modal.querySelector('[data-role="util-report-builder-viz-unit-shell"]');
                if (unitShell && !unitShell.contains(event.target)) {
                    closeUtilReportBuilderVizUnitPopover(modal);
                }
                if (event.target.closest('[data-role="util-report-builder-viz-close"]')) {
                    closeUtilReportBuilderVizPopupWindow();
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-viz-inline-detach"]')) {
                    if (UtilReportBuilderVizDetachedTableState.detached) {
                        closeUtilReportBuilderVizDetachedTableWindow();
                    } else {
                        openUtilReportBuilderVizDetachedTableWindow(modal._builderVizData || (UtilReportBuilderVizState.hasGenerated === true ? buildUtilReportBuilderVizData() : null));
                    }
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-viz-chart-fullscreen-toggle"]')) {
                    UtilReportBuilderVizState.chartFullscreen = !(UtilReportBuilderVizState.chartFullscreen === true);
                    renderUtilReportBuilderVizPopupWindow();
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-viz-chart-view-toggle"]')) {
                    toggleUtilReportBuilderVizChartView(modal);
                    renderUtilReportBuilderVizPopupWindow();
                    return;
                }
                const labelToggleBtn = event.target.closest('[data-role="util-report-builder-viz-label-toggle"]');
                if (labelToggleBtn) {
                    UtilReportBuilderVizState.showLabels = !(UtilReportBuilderVizState.showLabels === true);
                    UtilReportState.showChartLabels = UtilReportBuilderVizState.showLabels === true;
                    modal.querySelectorAll('[data-role="util-report-builder-viz-label-toggle"]').forEach(button => {
                        syncUtilReportBuilderVizLabelToggleButton(button, UtilReportBuilderVizState.showLabels === true);
                    });
                    syncUtilDualSectionFromReportBuilderViz(UtilReportBuilderVizState.itemKey);
                    renderUtilReportBuilderVizPopupWindow();
                    return;
                }
                const appliedToggleBtn = event.target.closest('[data-role="util-report-builder-viz-applied-toggle"]');
                if (appliedToggleBtn) {
                    UtilReportBuilderVizState.appliedModeEnabled = !(UtilReportBuilderVizState.appliedModeEnabled === true);
                    if (UtilReportBuilderVizState.appliedModeEnabled === true) {
                        const defaultYears = resolveUtilReportBuilderVizDefaultAppliedYears();
                        if (!UtilReportBuilderVizState.appliedBaseYear) {
                            UtilReportBuilderVizState.appliedBaseYear = defaultYears.baseYear;
                        }
                        if (!UtilReportBuilderVizState.appliedCompareYear) {
                            UtilReportBuilderVizState.appliedCompareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                                defaultYears.compareYear,
                                UtilReportBuilderVizState.appliedBaseYear
                            );
                        }
                    }
                    syncUtilReportBuilderVizControls(modal);
                    UtilReportBuilderVizState.hasGenerated = true;
                    UtilReportBuilderVizState.isDirty = false;
                    renderUtilReportBuilderVizPopupWindow();
                    return;
                }
                const monthHitTarget = event.target.closest('[data-role="util-chart-month-hit"]');
                if (monthHitTarget) {
                    const monthKey = normalizeUtilReportMonthKey(monthHitTarget.getAttribute('data-month-key') || '');
                    const seriesKey = normalizeUtilReportBuilderVizSeriesKey(
                        monthHitTarget.getAttribute('data-series-key')
                        || UtilReportBuilderVizState.isolatedSeriesKey
                    );
                    if (monthKey) {
                        UtilReportBuilderVizState.focusMonthKey = monthKey;
                        UtilReportBuilderVizState.pendingDetailScroll = true;
                    }
                    if (seriesKey) {
                        UtilReportBuilderVizState.focusSeriesKey = seriesKey;
                        UtilReportBuilderVizState.detailFocusSeriesKey = seriesKey;
                    } else {
                        UtilReportBuilderVizState.detailFocusSeriesKey = '';
                    }
                    renderUtilReportBuilderVizPopupWindow();
                    return;
                }
                const seriesBtn = event.target.closest('[data-role="util-report-builder-viz-series-item"]');
                if (seriesBtn) {
                    const seriesKey = normalizeUtilReportBuilderVizSeriesKey(seriesBtn.dataset.seriesKey);
                    if (!seriesKey) return;
                    if (popup.__utilReportBuilderVizSeriesClickTimer) {
                        clearTimeout(popup.__utilReportBuilderVizSeriesClickTimer);
                        popup.__utilReportBuilderVizSeriesClickTimer = null;
                    }
                if (event.detail > 1) return;
                popup.__utilReportBuilderVizSeriesClickTimer = popup.setTimeout(() => {
                    const isolated = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.isolatedSeriesKey);
                    if (isolated && isolated === seriesKey) {
                        UtilReportBuilderVizState.focusSeriesKey = seriesKey;
                            UtilReportBuilderVizState.detailFocusSeriesKey = seriesKey;
                        } else {
                            UtilReportBuilderVizState.isolatedSeriesKey = '';
                            UtilReportBuilderVizState.focusSeriesKey = UtilReportBuilderVizState.focusSeriesKey === seriesKey ? '' : seriesKey;
                            UtilReportBuilderVizState.detailFocusSeriesKey = UtilReportBuilderVizState.focusSeriesKey;
                        }
                        UtilReportBuilderVizState.pendingDetailScroll = false;
                        renderUtilReportBuilderVizPopupWindow();
                    }, 180);
                    return;
                }
                const typeToggleBtn = event.target.closest('[data-role="util-report-builder-viz-usage-type-toggle"], [data-role="util-report-builder-viz-cost-type-toggle"], [data-role="util-report-builder-viz-production-type-toggle"], [data-role="util-report-builder-viz-ratio-type-toggle"], [data-role="util-report-builder-viz-ratio-actual-type-toggle"], [data-role="util-report-builder-viz-ratio-applied-type-toggle"]');
                if (typeToggleBtn) {
                    const role = typeToggleBtn.getAttribute('data-role') || '';
                    const currentType = role === 'util-report-builder-viz-usage-type-toggle'
                        ? normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.usageChartType || 'bar')
                        : (role === 'util-report-builder-viz-cost-type-toggle'
                            ? normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.costChartType || 'line')
                            : (role === 'util-report-builder-viz-production-type-toggle'
                                ? normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.productionChartType || 'line')
                                : (role === 'util-report-builder-viz-ratio-actual-type-toggle'
                                    ? normalizeUtilReportBuilderVizChartType(
                                        normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioActualChartType)
                                        || UtilReportBuilderVizState.ratioChartType
                                        || 'line'
                                    )
                                    : (role === 'util-report-builder-viz-ratio-applied-type-toggle'
                                        ? normalizeUtilReportBuilderVizChartType(
                                            normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioAppliedChartType)
                                            || UtilReportBuilderVizState.ratioChartType
                                            || 'line'
                                        )
                                        : normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.ratioChartType || 'line')))));
                    const allowNone = role === 'util-report-builder-viz-usage-type-toggle'
                        || role === 'util-report-builder-viz-cost-type-toggle'
                        || role === 'util-report-builder-viz-production-type-toggle';
                    const nextType = getUtilReportBuilderVizNextChartType(currentType, allowNone);
                    if (role === 'util-report-builder-viz-usage-type-toggle') {
                        UtilReportBuilderVizState.usageChartType = nextType;
                    } else if (role === 'util-report-builder-viz-cost-type-toggle') {
                        UtilReportBuilderVizState.costChartType = nextType;
                    } else if (role === 'util-report-builder-viz-production-type-toggle') {
                        UtilReportBuilderVizState.productionChartType = nextType;
                    } else if (role === 'util-report-builder-viz-ratio-actual-type-toggle') {
                        UtilReportBuilderVizState.ratioActualChartType = nextType;
                    } else if (role === 'util-report-builder-viz-ratio-applied-type-toggle') {
                        UtilReportBuilderVizState.ratioAppliedChartType = nextType;
                    } else if (role === 'util-report-builder-viz-ratio-type-toggle') {
                        UtilReportBuilderVizState.ratioChartType = nextType;
                    }
                    syncUtilReportChartTypeToggleButton(typeToggleBtn, nextType);
                    UtilReportBuilderVizState.hasGenerated = true;
                    UtilReportBuilderVizState.isDirty = false;
                    renderUtilReportBuilderVizPopupWindow();
                    return;
                }
            });

            popup.document.addEventListener('dblclick', event => {
                const seriesBtn = event.target.closest('[data-role="util-report-builder-viz-series-item"]');
                if (!seriesBtn) return;
                if (popup.__utilReportBuilderVizSeriesClickTimer) {
                    clearTimeout(popup.__utilReportBuilderVizSeriesClickTimer);
                    popup.__utilReportBuilderVizSeriesClickTimer = null;
                }
                const seriesKey = normalizeUtilReportBuilderVizSeriesKey(seriesBtn.dataset.seriesKey);
                if (!seriesKey) return;
                const nextIsolatedKey = UtilReportBuilderVizState.isolatedSeriesKey === seriesKey ? '' : seriesKey;
                UtilReportBuilderVizState.isolatedSeriesKey = nextIsolatedKey;
                UtilReportBuilderVizState.focusSeriesKey = nextIsolatedKey || seriesKey;
                UtilReportBuilderVizState.detailFocusSeriesKey = nextIsolatedKey || seriesKey;
                UtilReportBuilderVizState.pendingDetailScroll = false;
                renderUtilReportBuilderVizPopupWindow();
                event.preventDefault();
            });

            popup.document.addEventListener('change', event => {
                const role = event.target?.getAttribute?.('data-role') || '';
                if (!role.startsWith('util-report-builder-viz-')) return;
                if (role === 'util-report-builder-viz-ratio-numerator' || role === 'util-report-builder-viz-ratio-denominator') {
                    syncUtilReportBuilderVizRatioSelects(modal);
                }
                if (
                    role === 'util-report-builder-viz-from'
                    || role === 'util-report-builder-viz-to'
                    || role === 'util-report-builder-viz-applied-base-year'
                    || role === 'util-report-builder-viz-applied-compare-year'
                ) {
                    syncUtilReportBuilderVizAppliedYearSelects(modal);
                }
                collectUtilReportBuilderVizStateFromModal(modal);
                syncUtilDualSectionFromReportBuilderViz(UtilReportBuilderVizState.itemKey);
                UtilReportBuilderVizState.hasGenerated = true;
                UtilReportBuilderVizState.isDirty = false;
                renderUtilReportBuilderVizPopupWindow();
            });

            popup.document.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeUtilReportBuilderVizPopupWindow();
                    return;
                }
                if (event.key !== 'Backspace') return;
                if (event.defaultPrevented) return;
                if (isEditableTarget(event.target)) return;
                event.preventDefault();
                closeUtilReportBuilderVizPopupWindow();
            }, true);

            popup.addEventListener('resize', () => {
                if (UtilReportBuilderVizState.hasGenerated !== true) return;
                renderUtilReportBuilderVizPopupWindow();
            });

            return modal;
        }

        function renderUtilReportBuilderVizPopupWindow() {
            const popup = getUtilReportBuilderVizPopupWindow();
            if (!popup) return null;
            const modal = bindUtilReportBuilderVizPopupWindow(popup);
            if (!modal) return null;
            renderUtilReportBuilderVizHost(modal);
            return popup;
        }

        function closeUtilReportBuilderVizPopupWindow() {
            const popup = getUtilReportBuilderVizPopupWindow();
            UtilReportBuilderVizPopupState.win = null;
            closeUtilReportBuilderVizDetachedTableWindow();
            if (popup) {
                try { popup.close(); } catch (error) {}
            }
        }

        function openUtilReportBuilderVizPopupWindow() {
            if (!window.__utilReportBuilderVizPopupUnloadBound) {
                window.__utilReportBuilderVizPopupUnloadBound = true;
                window.addEventListener('beforeunload', () => {
                    closeUtilReportBuilderVizPopupWindow();
                });
                window.addEventListener('pagehide', () => {
                    closeUtilReportBuilderVizPopupWindow();
                });
            }

            let popup = getUtilReportBuilderVizPopupWindow();
            if (!popup) {
                popup = window.open('', 'util-report-builder-viz-window', 'popup=yes,width=1420,height=920,left=72,top=48,resizable=yes,scrollbars=yes');
                if (!popup) {
                    return null;
                }
                UtilReportBuilderVizPopupState.win = popup;
                popup.document.open();
                popup.document.write(buildUtilReportBuilderVizPopupShellHtml());
                popup.document.close();
                popup.onbeforeunload = () => {
                    if (UtilReportBuilderVizPopupState.win === popup) {
                        UtilReportBuilderVizPopupState.win = null;
                        closeUtilReportBuilderVizDetachedTableWindow();
                    }
                };
            }

            renderUtilReportBuilderVizPopupWindow();
            try {
                popup.focus();
            } catch (error) {}
            return popup;
        }

        function syncUtilReportBuilderVizPopupFromSelection(itemKey = '') {
            const popup = getUtilReportBuilderVizPopupWindow();
            const normalizedItemKey = normalizeUtilDualDatasetKey(itemKey || '');
            if (!popup || !['electric', 'gas', 'waste'].includes(normalizedItemKey)) return false;
            const section = typeof getUtilDualCombinedSection === 'function'
                ? getUtilDualCombinedSection(normalizedItemKey)
                : null;
            if (!section) return false;
            syncUtilReportBuilderVizStateFromDualSection(section, normalizedItemKey);
            UtilReportBuilderVizState.hasGenerated = true;
            UtilReportBuilderVizState.isDirty = false;
            renderUtilReportBuilderVizPopupWindow();
            return true;
        }

        window.getUtilReportBuilderVizPopupWindow = getUtilReportBuilderVizPopupWindow;
        window.openUtilReportBuilderVizPopupWindow = openUtilReportBuilderVizPopupWindow;
        window.closeUtilReportBuilderVizPopupWindow = closeUtilReportBuilderVizPopupWindow;
        window.renderUtilReportBuilderVizPopupWindow = renderUtilReportBuilderVizPopupWindow;
        window.syncUtilReportBuilderVizPopupFromSelection = syncUtilReportBuilderVizPopupFromSelection;

        function syncUtilReportInlineInsightState(modal) {
            if (modal) {
                modal.classList.toggle('is-inline-table-detached', UtilReportDetachedTableState.detached === true);
            }
            const inlineInsightEl = modal?.querySelector?.('[data-role="util-report-inline-insight"]');
            const noteEl = inlineInsightEl?.querySelector?.('.util-report-inline-insight-note');
            const detachButtons = Array.from(modal?.querySelectorAll?.('[data-role="util-report-inline-detach"]') || []);
            if (!inlineInsightEl) return;
            inlineInsightEl.classList.toggle('is-detached', UtilReportDetachedTableState.detached === true);
            detachButtons.forEach(button => {
                button.textContent = UtilReportDetachedTableState.detached ? '표 복귀' : '표 분리';
            });
            if (noteEl) {
                noteEl.textContent = UtilReportDetachedTableState.detached
                    ? '상세표는 별도 창에서 보고 있습니다. 그래프 클릭 포커스도 분리창으로만 이동합니다.'
                    : '차트/원형그래프를 눌러 기준을 바꾸고, 상단 표 분리 버튼으로 별도 창을 켜고 끕니다.';
            }
        }

        function refreshUtilReportModalAfterDetach(result = null) {
            const modal = document.getElementById('util-report-modal');
            if (!modal || !modal.classList.contains('is-open')) return;
            const nextResult = result || UtilReportState.lastResult || runUtilReportFromState({ renderModal: false });
            renderUtilReportModal(nextResult);
        }

        function syncUtilReportDetachedTableWindow(result) {
            const popup = getUtilReportDetachedTableWindow();
            if (!popup) return;
            try {
                const doc = popup.document;
                const titleEl = doc.querySelector('[data-role="util-report-detached-title"]');
                const subEl = doc.querySelector('[data-role="util-report-detached-sub"]');
                const statusEl = doc.querySelector('[data-role="util-report-detached-status"]');
                const bodyEl = doc.querySelector('[data-role="util-report-detached-body"]');
                const metricKey = resolveUtilReportDetailMetricKey();
                const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
                const rangeLabel = result?.rangeLabel ? `기간: ${result.rangeLabel}` : '기간: 데이터 없음';
                const compareLabel = UtilReportState.compareYear
                    ? `${UtilReportState.compareYear} 기준 비교표`
                    : '기간 순 상세표';
                if (titleEl) titleEl.textContent = '유틸리티 통합 보고서 상세표';
                if (subEl) subEl.textContent = rangeLabel;
                if (statusEl) statusEl.textContent = `지표: ${metricLabel} / 보기: ${compareLabel}`;
                if (bodyEl) {
                    if (result && Array.isArray(result.rows) && result.rows.length) {
                        bodyEl.innerHTML = `
                            <div class="util-report-detached-table-wrap">
                                ${renderUtilReportYoYTable(result, metricKey, UtilReportState.compareYear)}
                            </div>
                        `;
                    } else {
                        bodyEl.innerHTML = '<div class="util-report-detached-empty">표시할 데이터가 없습니다.</div>';
                    }
                }
                doc.title = `유틸리티 상세표 - ${metricLabel}`;
                if (UtilReportDetachedTableState.focusMonthKey || UtilReportDetachedTableState.focusMonthToken) {
                    focusUtilReportDetachedTableByMonth({
                        monthToken: UtilReportDetachedTableState.focusMonthToken,
                        monthKey: UtilReportDetachedTableState.focusMonthKey,
                        seriesKey: UtilReportDetachedTableState.focusSeriesKey
                    }, { scroll: false });
                }
            } catch (error) {
                closeUtilReportDetachedTableWindow();
            }
        }

        function closeUtilReportDetachedTableWindow() {
            const popup = getUtilReportDetachedTableWindow();
            UtilReportDetachedTableState.win = null;
            UtilReportDetachedTableState.detached = false;
            if (!popup) {
                refreshUtilReportModalAfterDetach();
                return;
            }
            try {
                popup.close();
            } catch (error) {}
            refreshUtilReportModalAfterDetach();
        }

        function openUtilReportDetachedTableWindow() {
            if (!window.__utilReportDetachedTableUnloadBound) {
                window.__utilReportDetachedTableUnloadBound = true;
                window.addEventListener('beforeunload', () => {
                    closeUtilReportDetachedTableWindow();
                });
                window.addEventListener('pagehide', () => {
                    closeUtilReportDetachedTableWindow();
                });
            }

            let popup = getUtilReportDetachedTableWindow();
            const wasDetached = UtilReportDetachedTableState.detached === true;
            if (!popup) {
                popup = window.open('', 'util-report-detached-table', 'popup=yes,width=1100,height=760,left=80,top=80,resizable=yes,scrollbars=yes');
                if (!popup) {
                    alert('표 분리창을 열 수 없습니다. 브라우저 팝업 차단을 확인해 주세요.');
                    return null;
                }
                UtilReportDetachedTableState.win = popup;
                popup.document.open();
                popup.document.write(buildUtilReportDetachedTableShellHtml());
                popup.document.close();
                popup.onbeforeunload = () => {
                    if (UtilReportDetachedTableState.win === popup) {
                        UtilReportDetachedTableState.win = null;
                        if (UtilReportDetachedTableState.detached) {
                            UtilReportDetachedTableState.detached = false;
                            refreshUtilReportModalAfterDetach();
                        }
                    }
                };
            }

            UtilReportDetachedTableState.detached = true;
            syncUtilReportDetachedTableWindow(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
            if (!wasDetached) {
                refreshUtilReportModalAfterDetach();
            }
            try {
                popup.focus();
            } catch (error) {}
            return popup;
        }

        function syncUtilEnergyInlineInsightState(modal) {
            const inlineInsightEl = modal?.querySelector?.('[data-role="util-energy-report-inline-insight"]');
            const noteEl = modal?.querySelector?.('[data-role="util-energy-report-detail-note"]');
            const detachButtons = Array.from(modal?.querySelectorAll?.('[data-role="util-energy-report-inline-detach"]') || []);
            if (!inlineInsightEl) return;
            inlineInsightEl.classList.toggle('is-detached', UtilEnergyDetachedTableState.detached === true);
            detachButtons.forEach(button => {
                button.textContent = UtilEnergyDetachedTableState.detached ? '표 복귀' : '표 분리';
            });
            const baseNote = String(noteEl?.dataset?.baseNote || '').trim();
            if (noteEl) {
                noteEl.textContent = UtilEnergyDetachedTableState.detached
                    ? '상세표는 별도 창에서 보고 있습니다. 그래프 클릭 포커스도 분리창으로만 이동합니다.'
                    : (baseNote || '차트/원형그래프를 눌러 기준을 바꾸고, 상단 표 분리 버튼으로 별도 창을 켜고 끕니다.');
            }
        }

        function refreshUtilEnergyModalAfterDetach(result = null) {
            const modal = document.getElementById('util-energy-modal');
            if (!modal || !modal.classList.contains('is-open')) return;
            const nextResult = result || UtilEnergyReportState.lastResult || buildUtilEnergyReportResult(UtilEnergyReportState);
            renderUtilEnergyModal(nextResult);
        }

        function syncUtilEnergyDetachedTableWindow(result, descriptor) {
            const popup = getUtilEnergyDetachedTableWindow();
            if (!popup) return;
            try {
                const doc = popup.document;
                const titleEl = doc.querySelector('[data-role="util-report-detached-title"]');
                const subEl = doc.querySelector('[data-role="util-report-detached-sub"]');
                const statusEl = doc.querySelector('[data-role="util-report-detached-status"]');
                const bodyEl = doc.querySelector('[data-role="util-report-detached-body"]');
                const rangeLabel = result?.rangeLabel ? `기간: ${result.rangeLabel}` : '기간: 데이터 없음';
                const compareLabel = UtilEnergyReportState.compareYear
                    ? `${UtilEnergyReportState.compareYear} 기준 비교표`
                    : '기간 순 상세표';
                if (titleEl) titleEl.textContent = '유틸리티 열량 보고서 상세표';
                if (subEl) subEl.textContent = rangeLabel;
                if (statusEl) statusEl.textContent = `선택: ${descriptor?.label || '전체 열량'} / 보기: ${compareLabel}`;
                if (bodyEl) {
                    if (result && Array.isArray(result.rows) && result.rows.length) {
                        bodyEl.innerHTML = `
                            <div class="util-report-detached-table-wrap">
                                ${renderUtilEnergyReportDetailTable(result, descriptor)}
                            </div>
                        `;
                    } else {
                        bodyEl.innerHTML = '<div class="util-report-detached-empty">표시할 데이터가 없습니다.</div>';
                    }
                }
                doc.title = `열량 상세표 - ${descriptor?.label || '전체 열량'}`;
                if (UtilEnergyDetachedTableState.focusMonthKey || UtilEnergyDetachedTableState.focusMonthToken) {
                    focusUtilEnergyDetachedTableByMonth({
                        monthToken: UtilEnergyDetachedTableState.focusMonthToken,
                        monthKey: UtilEnergyDetachedTableState.focusMonthKey,
                        seriesKey: UtilEnergyDetachedTableState.focusSeriesKey
                    }, { scroll: false });
                }
            } catch (error) {
                closeUtilEnergyDetachedTableWindow();
            }
        }

        function closeUtilEnergyDetachedTableWindow() {
            const popup = getUtilEnergyDetachedTableWindow();
            UtilEnergyDetachedTableState.win = null;
            UtilEnergyDetachedTableState.detached = false;
            if (popup) {
                try { popup.close(); } catch (error) {}
            }
            refreshUtilEnergyModalAfterDetach();
        }

        function openUtilEnergyDetachedTableWindow(result, descriptor) {
            if (!window.__utilEnergyDetachedTableUnloadBound) {
                window.__utilEnergyDetachedTableUnloadBound = true;
                window.addEventListener('beforeunload', () => {
                    closeUtilEnergyDetachedTableWindow();
                });
                window.addEventListener('pagehide', () => {
                    closeUtilEnergyDetachedTableWindow();
                });
            }

            let popup = getUtilEnergyDetachedTableWindow();
            const wasDetached = UtilEnergyDetachedTableState.detached === true;
            if (!popup) {
                popup = window.open('', 'util-energy-detached-table', 'popup=yes,width=1180,height=780,left=100,top=100,resizable=yes,scrollbars=yes');
                if (!popup) {
                    alert('표 분리창을 열 수 없습니다. 브라우저 팝업 차단을 확인해 주세요.');
                    return null;
                }
                UtilEnergyDetachedTableState.win = popup;
                popup.document.open();
                popup.document.write(buildUtilEnergyDetachedTableShellHtml());
                popup.document.close();
                popup.onbeforeunload = () => {
                    if (UtilEnergyDetachedTableState.win === popup) {
                        UtilEnergyDetachedTableState.win = null;
                        if (UtilEnergyDetachedTableState.detached) {
                            UtilEnergyDetachedTableState.detached = false;
                            refreshUtilEnergyModalAfterDetach();
                        }
                    }
                };
            }

            UtilEnergyDetachedTableState.detached = true;
            syncUtilEnergyDetachedTableWindow(result || UtilEnergyReportState.lastResult || buildUtilEnergyReportResult(UtilEnergyReportState), descriptor || resolveUtilEnergyReportSelectionDescriptor(UtilEnergyReportState.lastResult || buildUtilEnergyReportResult(UtilEnergyReportState)));
            if (!wasDetached) {
                refreshUtilEnergyModalAfterDetach(result);
            }
            try {
                popup.focus();
            } catch (error) {}
            return popup;
        }

        function bindUtilEnergyInlineInsightControls(modal) {
            if (!modal) return;
            const detachButtons = modal.querySelectorAll('[data-role="util-energy-report-inline-detach"]');
            detachButtons.forEach(detachBtn => {
                if (detachBtn.dataset.bound === 'true') return;
                detachBtn.dataset.bound = 'true';
                detachBtn.addEventListener('click', () => {
                    if (UtilEnergyDetachedTableState.detached) {
                        closeUtilEnergyDetachedTableWindow();
                    } else {
                        openUtilEnergyDetachedTableWindow(UtilEnergyReportState.lastResult, resolveUtilEnergyReportSelectionDescriptor(UtilEnergyReportState.lastResult || buildUtilEnergyReportResult(UtilEnergyReportState)));
                    }
                });
            });
        }

        function bindUtilReportInlineInsightControls(modal) {
            if (!modal) return;
            const detachButtons = modal.querySelectorAll('[data-role="util-report-inline-detach"]');
            detachButtons.forEach(detachBtn => {
                if (detachBtn.dataset.bound === 'true') return;
                detachBtn.dataset.bound = 'true';
                detachBtn.addEventListener('click', () => {
                    if (UtilReportDetachedTableState.detached) {
                        closeUtilReportDetachedTableWindow();
                    } else {
                        openUtilReportDetachedTableWindow();
                    }
                });
            });
        }
