(function registerUtilReportSheetElectricTableRender(globalScope) {
    if (globalScope.KPIUtilReportSheetElectricTableRender) {
        return;
    }

    const utilReportSheetOptions = globalScope.KPIUtilReportSheetOptions;
    if (!utilReportSheetOptions) {
        throw new Error('KPIUtilReportSheetOptions must load before KPI.util.report.sheet.electric.table-render.js');
    }

    const {
        UTIL_ELECTRIC_TEAM_COLOR_META
    } = utilReportSheetOptions;

    const runtime = {
        escapeUtilSheetHtml: null,
        formatUtilSheetDecimal: null,
        formatUtilSheetInteger: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetElectricTableRender;
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function formatDecimal(value, digits = 0, fallback = '-') {
        if (typeof runtime.formatUtilSheetDecimal === 'function') {
            return runtime.formatUtilSheetDecimal(value, digits, fallback);
        }
        return Number.isFinite(value) ? Number(value).toFixed(digits) : fallback;
    }

    function formatInteger(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetInteger === 'function') {
            return runtime.formatUtilSheetInteger(value, fallback);
        }
        return Number.isFinite(value) ? String(Math.round(Number(value))) : fallback;
    }

    function formatUtilElectricMeterFactorValue(value) {
        return Number.isFinite(value) ? formatDecimal(value, 2) : '-';
    }

    function formatUtilElectricMeterReadingValue(value) {
        return Number.isFinite(value) ? formatDecimal(value, 2) : '-';
    }

    function formatUtilElectricMeterUsageValue(value) {
        return Number.isFinite(value) ? formatInteger(value) : '-';
    }

    function getUtilElectricTeamColorMeta(teamKey = '') {
        const normalizedTeamKey = String(teamKey || '').trim();
        return UTIL_ELECTRIC_TEAM_COLOR_META[normalizedTeamKey] || UTIL_ELECTRIC_TEAM_COLOR_META.combined;
    }

    function buildUtilElectricTeamColumnFlags(columns = [], index = -1) {
        const currentTeamKey = String(columns?.[index]?.teamKey || '').trim();
        if (!currentTeamKey) {
            return {
                isGroupStart: false,
                isGroupEnd: false
            };
        }
        const previousTeamKey = String(columns?.[index - 1]?.teamKey || '').trim();
        const nextTeamKey = String(columns?.[index + 1]?.teamKey || '').trim();
        return {
            isGroupStart: currentTeamKey !== previousTeamKey,
            isGroupEnd: currentTeamKey !== nextTeamKey
        };
    }

    function buildUtilElectricTeamCellAttributeString(teamKey = '', flags = null) {
        const normalizedTeamKey = String(teamKey || '').trim();
        if (!normalizedTeamKey) return '';
        const colorMeta = getUtilElectricTeamColorMeta(normalizedTeamKey);
        const boundaryAttrs = [];
        if (flags?.isGroupStart) boundaryAttrs.push(' data-team-group-start="true"');
        if (flags?.isGroupEnd) boundaryAttrs.push(' data-team-group-end="true"');
        return ` data-team-key="${escapeHtml(normalizedTeamKey)}"${boundaryAttrs.join('')} style="--util-team-color:${colorMeta.color}; --util-team-soft:${colorMeta.soft};"`;
    }

    function buildUtilElectricTableHeaderCellHtml(column = {}, index = -1, columns = []) {
        const attrs = buildUtilElectricTeamCellAttributeString(column?.teamKey, buildUtilElectricTeamColumnFlags(columns, index));
        return `
            <th${attrs}>
                <div class="util-head-cell">
                    <span class="util-head-label-wrap">
                        ${column?.teamKey ? '<span class="util-sheet-meter-team-chip" aria-hidden="true"></span>' : ''}
                        <span class="util-head-label">${escapeHtml(column?.label || '')}</span>
                    </span>
                    ${column?.caption ? `<span class="util-head-sub">${escapeHtml(column.caption)}</span>` : ''}
                </div>
            </th>
        `;
    }

    function buildUtilElectricTableValueCellHtml(column = {}, renderedValue = '', index = -1, columns = []) {
        const attrs = buildUtilElectricTeamCellAttributeString(column?.teamKey, buildUtilElectricTeamColumnFlags(columns, index));
        return `<td${attrs}>${escapeHtml(renderedValue)}</td>`;
    }

    function buildUtilElectricMeterTableHtml(table, title, options = {}) {
        const columns = Array.isArray(table?.columns) ? table.columns : [];
        const headerCells = columns.map((column, index) => buildUtilElectricTableHeaderCellHtml(column, index, columns)).join('');
        const rows = [
            {
                label: '승률',
                formatter: formatUtilElectricMeterFactorValue,
                key: 'factor'
            },
            {
                label: String(options.startReadingLabel || '선택월 지침'),
                formatter: formatUtilElectricMeterReadingValue,
                key: 'startReading'
            },
            {
                label: String(options.endReadingLabel || '익월 지침'),
                formatter: formatUtilElectricMeterReadingValue,
                key: 'endReading'
            },
            {
                label: '사용량(kWh)',
                formatter: formatUtilElectricMeterUsageValue,
                key: 'usage'
            }
        ];
        const rowHtml = rows.map(row => `
            <tr>
                <th>${escapeHtml(row.label)}</th>
                ${columns.map((column, index) => buildUtilElectricTableValueCellHtml(column, row.formatter(column?.[row.key]), index, columns)).join('')}
            </tr>
        `).join('');
        return `
            <article class="util-sheet-meter-table-card is-current">
                <div class="util-sheet-meter-table-head">
                    <div class="util-sheet-meter-table-title">${escapeHtml(title)}</div>
                </div>
                <div class="util-sheet-table-wrap">
                    <table class="util-sheet-table util-sheet-meter-table util-sheet-meter-table-electric">
                        <thead>
                            <tr>
                                <th>구분</th>
                                ${headerCells}
                            </tr>
                        </thead>
                        <tbody>${rowHtml}</tbody>
                    </table>
                </div>
            </article>
        `;
    }

    function buildUtilElectricMeterDetailRowsTableHtml(columns = [], rows = []) {
        const headerCells = columns.map((column, index) => buildUtilElectricTableHeaderCellHtml(column, index, columns)).join('');
        const bodyRows = rows.map(row => {
            const formatter = typeof row.formatter === 'function' ? row.formatter : value => value;
            const sourceColumns = Array.isArray(row.columns) ? row.columns : columns;
            const valueCells = columns.map((column, index) => {
                const sourceColumn = sourceColumns[index] || column;
                return buildUtilElectricTableValueCellHtml(column, formatter(sourceColumn?.value), index, columns);
            }).join('');
            return `
                <tr>
                    <th>${escapeHtml(row.label || '')}</th>
                    ${valueCells}
                </tr>
            `;
        }).join('');
        return `
            <div class="util-sheet-table-wrap">
                <table class="util-sheet-table util-sheet-meter-table util-sheet-meter-table-electric is-condensed">
                    <thead>
                        <tr>
                            <th>구분</th>
                            ${headerCells}
                        </tr>
                    </thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </div>
        `;
    }

    function buildUtilElectricMeterDetailDisclosureHtml(title, caption, tableHtml) {
        return `
            <details class="util-sheet-disclosure">
                <summary>${escapeHtml(title)}</summary>
                <div class="util-sheet-disclosure-body">
                    ${caption ? `<div class="util-sheet-disclosure-caption">${escapeHtml(caption)}</div>` : ''}
                    <div class="util-sheet-disclosure-table-stack">${tableHtml}</div>
                </div>
            </details>
        `;
    }

    function buildUtilElectricSummaryTableHtml(columns = [], rows = [], options = {}) {
        const headerCells = columns.map((column, index) => buildUtilElectricTableHeaderCellHtml(column, index, columns)).join('');
        const bodyRows = rows.map(row => `
            <tr>
                <th>${escapeHtml(row.label)}</th>
                ${columns.map((column, index) => buildUtilElectricTableValueCellHtml(column, row.formatter(column?.[row.key], column), index, columns)).join('')}
            </tr>
        `).join('');
        return `
            <article class="util-sheet-meter-table-card">
                <div class="util-sheet-meter-table-head">
                    <div>
                        <div class="util-sheet-meter-table-title">${escapeHtml(options.title || '')}</div>
                        ${options.subText ? `<div class="util-sheet-meter-table-sub">${escapeHtml(options.subText)}</div>` : ''}
                    </div>
                    ${options.actionsHtml ? `<div class="util-sheet-gas-summary-actions">${options.actionsHtml}</div>` : ''}
                </div>
                <div class="util-sheet-table-wrap">
                    <table class="util-sheet-table util-sheet-meter-table util-sheet-meter-table-electric">
                        <thead>
                            <tr>
                                <th>구분</th>
                                ${headerCells}
                            </tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>
                ${options.note ? `<div class="util-sheet-electric-summary-note">${escapeHtml(options.note)}</div>` : ''}
            </article>
        `;
    }


    globalScope.KPIUtilReportSheetElectricTableRender = Object.freeze({
        setRuntimeAdapters,
        getUtilElectricTeamColorMeta,
        buildUtilElectricTeamColumnFlags,
        buildUtilElectricTeamCellAttributeString,
        buildUtilElectricTableHeaderCellHtml,
        buildUtilElectricTableValueCellHtml,
        buildUtilElectricMeterTableHtml,
        buildUtilElectricMeterDetailRowsTableHtml,
        buildUtilElectricMeterDetailDisclosureHtml,
        buildUtilElectricSummaryTableHtml
    });
})(typeof window !== 'undefined' ? window : globalThis);
