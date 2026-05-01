(function () {
    window.KpiSectionFactories = window.KpiSectionFactories || {};
    window.KpiSectionFactories.productionReport = function buildProductionReportSection() {
        return {
            id: 'productionReport',
            name: '월간 실적보고',
            icon: 'fa-chart-line',
            color: 'blue',
            accent: '#0b477b',
            directLaunch: true,
            launchUrl: '/kpi-runtime/sections/monthly-performance-report-popup.html',
            launchTarget: 'popup',
            launchWindowName: 'kpi-monthly-performance-report',
            launchWindowWidth: 1480,
            launchWindowHeight: 920,
            categories: []
        };
    };
})();
