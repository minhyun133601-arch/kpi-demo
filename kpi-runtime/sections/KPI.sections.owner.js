(function () {
    const OPS_CONSOLE_HOST = '127.0.0.1';
    const OPS_CONSOLE_DEFAULT_PORT = 3215;

    function getOpsConsoleServerUrl() {
        return `http://${OPS_CONSOLE_HOST}:${OPS_CONSOLE_DEFAULT_PORT}/#server`;
    }

    window.KpiSectionFactories = window.KpiSectionFactories || {};
    window.KpiSectionFactories.owner = function buildOwnerSection() {
        return {
            id: 'owner',
            name: '운영 콘솔',
            icon: 'fa-user-shield',
            color: 'emerald',
            accent: '#176347',
            ownerOnly: true,
            directLaunch: true,
            launchUrl: getOpsConsoleServerUrl(),
            launchTarget: 'popup',
            launchWindowName: 'kpi-owner-ops-console',
            launchWindowWidth: 1540,
            launchWindowHeight: 980,
            categories: []
        };
    };
})();
