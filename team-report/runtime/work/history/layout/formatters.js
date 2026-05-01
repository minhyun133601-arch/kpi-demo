(function initKpiWorkHistoryViewLayoutFormatters() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});

    function todayInputValue() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const date = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    }

    function formatAssigneeText(record, separator = ', ') {
        const assignees = Array.isArray(record?.assignees)
            ? record.assignees.filter(Boolean)
            : history.normalizeAssignees(record?.assignee || record?.worker || '');
        return assignees.join(separator);
    }

    function formatDateRange(startDate, endDate) {
        if (!startDate && !endDate) return '기간 미입력';
        if (startDate && endDate && startDate === endDate) return formatDateKorean(startDate);
        return `${formatDateKorean(startDate)} ~ ${formatDateKorean(endDate)}`;
    }

    function formatDateKorean(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '-';
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatCurrency(cost) {
        if (cost === null || cost === undefined || cost === '') return '자체처리';
        return `${Number(cost).toLocaleString('ko-KR')}원`;
    }

    function formatFileSize(bytes) {
        if (!bytes) return '용량없음';
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }

    function formatCostInputValue(value) {
        if (value === null || value === undefined || value === '') return '';
        const digits = String(value).replace(/[^\d]/g, '');
        if (!digits) return '';
        return Number(digits).toLocaleString('ko-KR');
    }

    function buildTimestampLabel() {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            '_',
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0')
        ].join('');
    }

    function escapeRegExp(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    Object.assign(view, {
        todayInputValue,
        formatAssigneeText,
        formatDateRange,
        formatDateKorean,
        formatCurrency,
        formatFileSize,
        formatCostInputValue,
        buildTimestampLabel,
        escapeRegExp
    });
})();
