(function () {
    const OPS_CONSOLE_HOST = '127.0.0.1';
    const OPS_CONSOLE_DEFAULT_PORT = 3215;

    function getOwnerConsoleUrl(port = OPS_CONSOLE_DEFAULT_PORT) {
        const normalizedPort = Number.parseInt(String(port || ''), 10);
        const selectedPort = Number.isFinite(normalizedPort) ? normalizedPort : OPS_CONSOLE_DEFAULT_PORT;
        return `http://${OPS_CONSOLE_HOST}:${selectedPort}/#server`;
    }

    window.KpiSectionFactories = window.KpiSectionFactories || {};
    window.KpiSectionFactories.owner = function buildOwnerSection() {
        const consoleUrl = getOwnerConsoleUrl();
        return {
            id: 'owner',
            name: '\uC624\uB108 \uC804\uC6A9',
            icon: 'fa-shield-halved',
            color: 'violet',
            accent: '#7c3aed',
            ownerOnly: true,
            directLaunch: true,
            launchUrl: consoleUrl,
            launchTarget: 'popup',
            launchWindowName: 'kpi-owner-ops-console',
            launchWindowWidth: 1540,
            launchWindowHeight: 980,
            desc: '\uC624\uB108 \uC804\uC6A9 \uC6B4\uC601 \uCF58\uC194\uC744 \uC0C8 \uCC3D\uC73C\uB85C \uC5FD\uB2C8\uB2E4.',
            categories: []
        };
    };

    window.KpiOwnerConsoleBridge = {
        getUrl: getOwnerConsoleUrl,
        open() {
            return window.KpiOpenOwnerToolWindow?.(
                getOwnerConsoleUrl(),
                'KPI Demo operations console',
                'kpi-owner-ops-console'
            );
        }
    };
})();
