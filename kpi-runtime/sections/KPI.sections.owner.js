(function () {
    const OPS_CONSOLE_BASE_URL = 'http://127.0.0.1:3215';
    const OWNER_POPUP_WINDOW_NAME = 'kpi-owner-ops-console';
    const LOCAL_OPS_CONSOLE_COMMAND_PATH = '%EB%AA%85%EB%A0%B9%EC%96%B4/01-%EC%9A%B4%EC%98%81-%EC%BD%98%EC%86%94-%EC%97%B4%EA%B8%B0.cmd';

    function getOwnerLaunchConfig() {
        const protocol = String(window.location.protocol || '').trim().toLowerCase();
        if (protocol === 'file:') {
            try {
                return {
                    launchUrl: new URL(LOCAL_OPS_CONSOLE_COMMAND_PATH, window.location.href).href,
                    launchTarget: 'system'
                };
            } catch (error) {
                // Fall back to the live ops console URL when the local launcher path cannot be resolved.
            }
        }
        return {
            launchUrl: OPS_CONSOLE_BASE_URL,
            launchTarget: 'popup'
        };
    }

    window.KpiSectionFactories = window.KpiSectionFactories || {};
    window.KpiSectionFactories.owner = function buildOwnerSection() {
        const launchConfig = getOwnerLaunchConfig();
        return {
            id: 'owner',
            name: '\uC624\uB108 \uC804\uC6A9',
            icon: 'fa-shield-halved',
            color: 'violet',
            accent: '#7c3aed',
            ownerOnly: true,
            directLaunch: true,
            desc: '\uC624\uB108 \uC804\uC6A9 \uC6B4\uC601 \uCF58\uC194\uC744 \uBCC4\uB3C4 \uCC3D\uC73C\uB85C \uC5FD\uB2C8\uB2E4.',
            launchUrl: launchConfig.launchUrl,
            launchTarget: launchConfig.launchTarget,
            launchWindowName: OWNER_POPUP_WINDOW_NAME,
            launchWindowWidth: 1540,
            launchWindowHeight: 980,
            categories: []
        };
    };
})();
