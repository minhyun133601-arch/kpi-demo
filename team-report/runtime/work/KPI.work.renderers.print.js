        function triggerWorkPrintPreview(mode, html) {
            const sheet = document.getElementById('print-sheet');
            if (!sheet) return false;
            sheet.setAttribute('data-mode', mode);
            sheet.innerHTML = html;
            document.documentElement.classList.add('printing');
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.documentElement.classList.remove('printing');
                }, 500);
            }, 100);
            return true;
        }

        function printMonthlyReport(dataKey) {
            const report = WorkState.monthReportCache[dataKey];
            if (!report) return;
            const { rangeLabel, totalCount, filters, entries } = report;
            const filterText = [
                filters?.team ? `팀: ${filters.team}` : '팀: 전체',
                filters?.owner ? `팀원: ${filters.owner}` : '팀원: 전체',
                filters?.room ? `실: ${filters.room}` : '실: 전체',
                filters?.keyword ? `검색: ${filters.keyword}` : '검색: 전체'
            ];
            const tableRows = entries.length ? entries.map(item => {
                return `
                    <tr>
                        <td>${escapeHtml(item.dateKey)}</td>
                        <td>${escapeHtml(item.team || '')}</td>
                        <td>${escapeHtml(item.room || '')}</td>
                        <td>${escapeHtml(item.owner || '')}</td>
                        <td>${escapeHtml(item.task || '')}</td>
                    </tr>
                `;
            }).join('') : `
                <tr>
                    <td colspan="5">해당 기간에 표시할 데이터가 없습니다.</td>
                </tr>
            `;
            triggerWorkPrintPreview('monthly', `
                <div class="print-title">월간 실적 보고서</div>
                <div class="print-meta">기간: ${rangeLabel} · 총 ${totalCount}건</div>
                <div class="print-summary">
                    ${filterText.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
                </div>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th class="print-col-date">날짜</th>
                            <th class="print-col-team">팀</th>
                            <th class="print-col-room">실</th>
                            <th class="print-col-owner">작성자</th>
                            <th class="print-col-task">작업 내용</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `);
        }

        function printUtilAnalytics(result) {
            if (!result || !result.entries) return;
            const scale = result.scale || 1;
            const decimals = Number.isFinite(result.decimals) ? result.decimals : null;
            const scaledSum = scale ? result.sum / scale : result.sum;
            const scaledAvg = scale ? result.avg / scale : result.avg;
            const rows = result.entries.length ? result.entries.map(entry => {
                const value = entry[result.metricKey];
                const scaled = scale ? value / scale : value;
                const period = `${entry.year}-${String(entry.month).padStart(2, '0')}`;
                return `
                    <tr>
                        <td class="print-col-date">${period}</td>
                        <td class="print-col-team">${entry.team || '-'}</td>
                        <td class="print-col-task">${formatUtilNumber(scaled, decimals)}</td>
                    </tr>
                `;
            }).join('') : `
                <tr>
                    <td colspan="3">해당 기간에 표시할 데이터가 없습니다.</td>
                </tr>
            `;

            triggerWorkPrintPreview('util', `
                <div class="print-header">
                    <div>
                        <div class="print-title">유틸리티 분석 (${result.datasetLabel})</div>
                        <div class="print-meta">기간: ${result.from} ~ ${result.to} · ${result.metricLabel} · ${result.team} · ${result.count}건</div>
                    </div>
                    <div class="print-meta">${new Date().toISOString().slice(0, 10)}</div>
                </div>
                <div class="print-summary">
                    <span>단위 변환: ÷ ${scale}</span>
                    <span>합계: ${formatUtilNumber(scaledSum, decimals)}</span>
                    <span>평균: ${formatUtilNumber(scaledAvg, decimals)}</span>
                </div>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th class="print-col-date">기간</th>
                            <th class="print-col-team">팀</th>
                            <th class="print-col-task">값</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `);
        }
