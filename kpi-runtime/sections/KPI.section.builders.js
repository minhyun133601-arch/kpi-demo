(function () {
    function buildWorkDataEntryContent() {
        return `
            <div class="work-metering-embed-shell">
                <div class="work-metering-embed-host" data-kpi-metering-root>
                    <div class="work-metering-loading">검침 화면을 준비하고 있습니다.</div>
                </div>
            </div>
        `;
    }

    window.KpiSectionBuilders = Object.freeze({
        buildWorkDataEntryContent
    });
})();
