(function () {
    window.KpiSectionFactories = window.KpiSectionFactories || {};

    window.KpiSectionFactories.audit = function buildAuditSection() {
        const AppData = {};
        AppData['audit'] = {
            id: 'audit', name: '오디트', icon: 'fa-file-circle-check', color: 'red', accent: '#dc2626',
            categories: [
                {
                    title: '조도 (Lux)',
                    icon: 'fa-sun',
                    color: '#f59e0b',
                    viewerMode: 'full-bleed',
                    desc: '조도 점검 및 기록 (분기별)',
                    dataKey: 'audit_lux',
                    fileName: '중앙 서버 DB / Audit Lux',
                    content: `
                        <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
                            <h3 class="text-slate-800 font-semibold text-base">조도 점검 데이터 입력 안내</h3>
                            <p class="mt-2 text-sm text-slate-600">
                                분기별 조도(Lux) 측정 결과를 기준값 대비로 기록하여 점검 이력을 체계적으로 관리합니다.
                            </p>
                            <ul class="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
                                <li>측정 연도/분기, 팀, 구역·설비(장비명)</li>
                                <li>실측값(Lux) 및 기준값 대비 결과</li>
                                <li>미달 시 개선 조치, 완료 일자 및 확인 결과</li>
                                <li>측정자, 측정 장비/교정 정보(가능 시)</li>
                            </ul>
                            <div class="mt-3 text-xs text-slate-500">입력 위치: 중앙 서버 DB / Audit Lux</div>
                        </div>
                    `
                },
                {
                    title: '법정 설비',
                    icon: 'fa-scale-balanced',
                    color: '#e11d48',
                    desc: '추후 추가예정',
                    dataKey: 'audit_legal_facility',
                    fileName: '추후 추가예정',
                    isPlaceholder: true,
                    content: `
                        <div class="p-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                            <div class="flex items-center gap-3">
                                <span class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                    <i class="fa-solid fa-scale-balanced"></i>
                                </span>
                                <div>
                                    <h3 class="text-slate-800 font-semibold text-base">법정 설비</h3>
                                    <p class="mt-1 text-sm text-slate-600">추후 추가예정입니다.</p>
                                </div>
                            </div>
                            <p class="mt-4 text-sm text-slate-600">
                                현재 오디트에서 완성된 항목은 조도만 제공되며, 법정 설비 화면은 이후 내용을 추가할 예정입니다.
                            </p>
                        </div>
                    `
                },
                {
                    title: '안전 관리',
                    icon: 'fa-shield-halved',
                    color: '#0f766e',
                    desc: '추후 추가예정',
                    dataKey: 'audit_safety_management',
                    fileName: '추후 추가예정',
                    isPlaceholder: true,
                    content: `
                        <div class="p-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                            <div class="flex items-center gap-3">
                                <span class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                                    <i class="fa-solid fa-shield-halved"></i>
                                </span>
                                <div>
                                    <h3 class="text-slate-800 font-semibold text-base">안전 관리</h3>
                                    <p class="mt-1 text-sm text-slate-600">추후 추가예정입니다.</p>
                                </div>
                            </div>
                            <p class="mt-4 text-sm text-slate-600">
                                안전 관리 목차만 먼저 열어두었고, 세부 점검 항목과 기록 화면은 이후 추가할 예정입니다.
                            </p>
                        </div>
                    `
                }
            ]
        };
        return AppData['audit'];
    };
})();
