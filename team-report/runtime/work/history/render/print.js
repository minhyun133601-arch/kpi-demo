(function initKpiWorkHistoryViewRenderPrint() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        TeamInfo,
        state,
        getElement,
        ATTACHMENT_SLOT_KEYS,
        ATTACHMENT_SLOT_META,
        getRecordAttachment,
        escapeHtml
    } = history;

    function printCurrentView() {
        const records = state.currentTeam === view.OVERVIEW_KEY
            ? view.getFilteredOverviewRecords()
            : view.getFilteredTeamRecords(state.currentTeam);

        if (!records.length) {
            view.showToast?.('인쇄할 작업내역이 없습니다.');
            return;
        }

        const title = state.currentTeam === view.OVERVIEW_KEY
            ? '전체 팀 작업내역'
            : `${TeamInfo[state.currentTeam].name} 작업내역`;
        const dateLabel = buildPrintFilterLabel(state.currentTeam === view.OVERVIEW_KEY ? view.OVERVIEW_KEY : state.currentTeam);
        const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
        if (!printWindow) {
            window.alert('팝업 허용 후 다시 시도해주세요.');
            return;
        }

        printWindow.document.write(buildPrintDocument(records, title, dateLabel));
        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    }

    function buildPrintFilterLabel(prefix) {
        const start = getElement(`${prefix}FilterStart`)?.value || '';
        const end = getElement(`${prefix}FilterEnd`)?.value || '';
        if (!start && !end) return '전체 기간';
        return `${start || '시작 미지정'} ~ ${end || '종료 미지정'}`;
    }

    function buildPrintDocument(records, title, dateLabel) {
        const rows = records.map(record => `
            <tr>
                <td>${escapeHtml(view.formatDateRange(record.startDate, record.endDate)).replace(/\n/g, '<br>')}${record.plannedEndDate ? `<br>예정 ${escapeHtml(view.formatDateKorean(record.plannedEndDate))}` : ''}</td>
                <td>${escapeHtml(TeamInfo[record.team]?.name || '')}</td>
                <td>${escapeHtml(view.formatAssigneeText(record))}</td>
                <td>${escapeHtml(record.workContent || '').replace(/\n/g, '<br>')}</td>
                <td>${escapeHtml(view.formatCurrency(record.cost))}</td>
                <td>${escapeHtml(view.buildRecordRemarkText(record)).replace(/\n/g, '<br>')}</td>
                <td>${escapeHtml(
                    ATTACHMENT_SLOT_KEYS
                        .map((slotKey) => {
                            const meta = ATTACHMENT_SLOT_META[slotKey];
                            const attachment = getRecordAttachment(record, slotKey);
                            return attachment ? `${meta.label}: ${attachment.originalName}` : '';
                        })
                        .filter(Boolean)
                        .join(', ') || '첨부 없음'
                )}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <title>${escapeHtml(title)}</title>
                <style>
                    body { font-family: 'Noto Sans KR', Arial, sans-serif; margin: 24px; color: #111827; }
                    h1 { margin: 0 0 8px; font-size: 24px; }
                    .meta { margin-bottom: 20px; color: #4b5563; font-size: 13px; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    th, td { border: 1px solid #d1d5db; padding: 10px; vertical-align: top; }
                    th { background: #f3f4f6; text-align: left; }
                </style>
            </head>
            <body>
                <h1>${escapeHtml(title)}</h1>
                <div class="meta">출력 범위: ${escapeHtml(dateLabel)} / 출력 시각: ${escapeHtml(new Date().toLocaleString('ko-KR'))}</div>
                <table>
                    <thead>
                        <tr>
                            <th>기간</th>
                            <th>팀</th>
                            <th>작업자</th>
                            <th>업무내용</th>
                            <th>비용</th>
                            <th>비고</th>
                            <th>첨부</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </body>
            </html>
        `;
    }

    Object.assign(view, {
        printCurrentView,
        buildPrintFilterLabel,
        buildPrintDocument
    });
})();
