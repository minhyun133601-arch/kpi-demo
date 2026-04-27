(function () {
    const runtime = window.KpiRuntime;
    if (!runtime) return;

    const EQUIPMENT_HISTORY_DATA_KEY = 'data_equipment_history_card';

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getEquipmentHistoryData() {
        const payload = window.PortalData?.[EQUIPMENT_HISTORY_DATA_KEY];
        return payload && typeof payload === 'object' ? payload : {};
    }

    function asList(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeFileExt(value) {
        const ext = String(value || 'file').trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'file';
        return ext.slice(0, 5);
    }

    function renderInfoTable(items, pairCount, className) {
        const list = asList(items);
        const rows = [];
        for (let index = 0; index < list.length; index += pairCount) {
            const rowItems = list.slice(index, index + pairCount);
            while (rowItems.length < pairCount) {
                rowItems.push({ label: '', value: '' });
            }
            rows.push(`
                <tr>
                    ${rowItems.map((item) => `
                        <th>${escapeHtml(item?.label || '')}</th>
                        <td>${escapeHtml(item?.value || '')}</td>
                    `).join('')}
                </tr>
            `);
        }
        return `
            <table class="${className}">
                <tbody>${rows.join('')}</tbody>
            </table>
        `;
    }

    function renderMaintenanceRows(rows) {
        const list = asList(rows);
        if (!list.length) {
            return '<tr><td colspan="5" class="data-equipment-empty">등록된 정비 이력이 없습니다.</td></tr>';
        }
        return list.map((row) => `
            <tr>
                <td>${escapeHtml(row?.date || '-')}</td>
                <td>${escapeHtml(row?.type || '-')}</td>
                <td>${escapeHtml(row?.content || '-')}</td>
                <td>${escapeHtml(row?.worker || '-')}</td>
                <td>${escapeHtml(row?.note || '-')}</td>
            </tr>
        `).join('');
    }

    function renderDocumentRows(rows) {
        const list = asList(rows);
        if (!list.length) {
            return '<tr><td colspan="3" class="data-equipment-empty">등록된 관련 문서가 없습니다.</td></tr>';
        }
        return list.map((row) => {
            const ext = normalizeFileExt(row?.ext);
            return `
                <tr>
                    <td>${escapeHtml(row?.title || '-')}</td>
                    <td>
                        <span class="data-equipment-file">
                            <span class="data-equipment-file-icon ${escapeHtml(ext)}">${escapeHtml(ext.toUpperCase())}</span>
                            ${escapeHtml(row?.file || '-')}
                        </span>
                    </td>
                    <td>${escapeHtml(row?.modified || '-')}</td>
                </tr>
            `;
        }).join('');
    }

    function getEquipmentHistoryMetrics(data) {
        return [
            { label: '상세 항목', value: `${asList(data.detailInfo).length}개` },
            { label: '정비 이력', value: `${asList(data.maintenanceHistory).length}건` },
            { label: '관련 문서', value: `${asList(data.documents).length}개` }
        ];
    }

    function renderEquipmentHistoryLauncher(category, data) {
        const header = data.header || {};
        const metrics = getEquipmentHistoryMetrics(data);
        return `
            <section class="data-equipment-launcher">
                <div class="data-equipment-launcher-head">
                    <div>
                        <p class="data-equipment-launcher-eyebrow">Portfolio popup preview</p>
                        <h2>${escapeHtml(category.title || '설비 이력 카드')}</h2>
                        <p>${escapeHtml(category.desc || '설비 기본정보, 정비 이력, 문서 현황을 팝업 카드로 확인합니다.')}</p>
                    </div>
                    <button type="button" class="data-equipment-launcher-button" data-equipment-history-open>
                        <i class="fas fa-up-right-from-square"></i>
                        <span>이력카드 팝업 열기</span>
                    </button>
                </div>
                <div class="data-equipment-launcher-grid">
                    ${metrics.map((metric) => `
                        <article class="data-equipment-launcher-metric">
                            <span>${escapeHtml(metric.label)}</span>
                            <strong>${escapeHtml(metric.value)}</strong>
                        </article>
                    `).join('')}
                    <article class="data-equipment-launcher-metric is-wide">
                        <span>대상 설비</span>
                        <strong>${escapeHtml(header.equipmentName || 'Sample Mixer A')}</strong>
                    </article>
                </div>
            </section>
        `;
    }

    function renderEquipmentHistoryCardMarkup(category, data) {
        const header = data.header || {};
        const cardTitle = header.title || category.title || '설비 이력 카드';
        const cardSubtitle = header.subtitle || 'EQUIPMENT HISTORY CARD';
        return `
            <section class="data-equipment-page">
                <header class="data-equipment-topbar">
                    <div class="data-equipment-brand" aria-label="KPI Demo">
                        <span class="data-equipment-brand-mark"><i class="fas fa-cube"></i></span>
                        <span>
                            <strong>${escapeHtml(header.brandName || 'KPI Demo')}</strong>
                            <small>${escapeHtml(header.brandSub || 'Synthetic portfolio record')}</small>
                        </span>
                    </div>
                    <div class="data-equipment-title-block">
                        <h2>${escapeHtml(cardTitle)}</h2>
                        <p>${escapeHtml(cardSubtitle)}</p>
                    </div>
                    <div class="data-equipment-actions">
                        <button type="button" class="data-equipment-print-btn" data-equipment-history-print>
                            <i class="fas fa-print"></i>
                            <span>PDF 출력</span>
                        </button>
                    </div>
                </header>

                <div class="data-equipment-layout" aria-label="설비 이력카드 본문">
                    <div class="data-equipment-top-grid">
                        <label class="data-equipment-photo-card">
                            <input type="file" accept="image/*" hidden data-equipment-history-photo-input>
                            <img class="data-equipment-photo-preview" alt="설비 사진 미리보기" hidden data-equipment-history-photo-preview>
                            <span class="data-equipment-photo-placeholder" data-equipment-history-photo-placeholder>
                                <i class="fas fa-camera"></i>
                                <strong>설비 사진 첨부</strong>
                                <small>선택한 이미지는 현재 브라우저에서만 미리보기됩니다.</small>
                            </span>
                        </label>

                        <article class="data-equipment-card data-equipment-card-pad">
                            <h3 class="data-equipment-section-title">
                                설비 가동정보
                                <span class="data-equipment-status">${escapeHtml(header.status || '운영중')}</span>
                            </h3>
                            ${renderInfoTable(data.operationInfo, 2, 'data-equipment-info-table')}
                        </article>
                    </div>

                    <article class="data-equipment-card data-equipment-detail-card">
                        <h3 class="data-equipment-section-title">설비 기본 및 상세 정보</h3>
                        ${renderInfoTable(data.detailInfo, 3, 'data-equipment-detail-table')}
                    </article>

                    <div class="data-equipment-bottom-grid">
                        <article class="data-equipment-card data-equipment-history-card">
                            <h3 class="data-equipment-section-title">정비 이력</h3>
                            <div class="data-equipment-table-scroll">
                                <table class="data-equipment-history-table">
                                    <thead>
                                        <tr>
                                            <th>일자</th>
                                            <th>구분</th>
                                            <th>내용</th>
                                            <th>작업자</th>
                                            <th>비고</th>
                                        </tr>
                                    </thead>
                                    <tbody>${renderMaintenanceRows(data.maintenanceHistory)}</tbody>
                                </table>
                            </div>
                        </article>

                        <article class="data-equipment-card data-equipment-doc-card">
                            <h3 class="data-equipment-section-title">관련 문서</h3>
                            <div class="data-equipment-table-scroll">
                                <table class="data-equipment-doc-table">
                                    <thead>
                                        <tr>
                                            <th>문서명</th>
                                            <th>파일명</th>
                                            <th>최종 수정일</th>
                                        </tr>
                                    </thead>
                                    <tbody>${renderDocumentRows(data.documents)}</tbody>
                                </table>
                            </div>
                        </article>
                    </div>
                </div>

                <footer class="data-equipment-footer">
                    <span>${escapeHtml(header.note || '공개 포트폴리오용 합성 설비 이력카드입니다.')}</span>
                    <span>
                        <strong>마지막 업데이트</strong>
                        ${escapeHtml(header.updatedAt || data.meta?.updatedAt || '-')}
                        <strong>담당</strong>
                        ${escapeHtml(header.owner || '-')}
                    </span>
                </footer>
            </section>
        `;
    }

    function setEquipmentHistoryModalOpen(root, isOpen) {
        const modal = root.querySelector('[data-equipment-history-modal]');
        if (!modal) return;
        modal.classList.toggle('is-open', isOpen);
        modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        if (isOpen) {
            modal.querySelector('[data-equipment-history-close]')?.focus();
        }
    }

    function bindEquipmentHistoryCard(root) {
        root.querySelectorAll('[data-equipment-history-print]').forEach((printButton) => {
            printButton.addEventListener('click', () => window.print());
        });

        root.querySelectorAll('[data-equipment-history-open]').forEach((button) => {
            button.addEventListener('click', () => setEquipmentHistoryModalOpen(root, true));
        });
        root.querySelectorAll('[data-equipment-history-close]').forEach((button) => {
            button.addEventListener('click', () => setEquipmentHistoryModalOpen(root, false));
        });

        const modal = root.querySelector('[data-equipment-history-modal]');
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target?.matches?.('[data-equipment-history-backdrop]')) {
                    setEquipmentHistoryModalOpen(root, false);
                }
            });
        }

        const photoInput = root.querySelector('[data-equipment-history-photo-input]');
        const photoPreview = root.querySelector('[data-equipment-history-photo-preview]');
        const photoPlaceholder = root.querySelector('[data-equipment-history-photo-placeholder]');
        if (photoInput && photoPreview && photoPlaceholder) {
            photoInput.addEventListener('change', (event) => {
                const [file] = event.target.files || [];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    photoPreview.src = String(reader.result || '');
                    photoPreview.hidden = false;
                    photoPlaceholder.hidden = true;
                };
                reader.readAsDataURL(file);
            });
        }
    }

    function renderEquipmentHistoryCard(category, context = {}) {
        const container = context.container || document.getElementById('content-container');
        if (!container) return;
        const data = getEquipmentHistoryData();
        const header = data.header || {};
        const cardTitle = header.title || category.title || '설비 이력 카드';
        container.innerHTML = `
            ${renderEquipmentHistoryLauncher(category, data)}
            <div class="data-equipment-popup is-open" data-equipment-history-modal aria-hidden="false">
                <button type="button" class="data-equipment-popup-backdrop" data-equipment-history-backdrop aria-label="설비 이력카드 닫기"></button>
                <div class="data-equipment-popup-dialog" role="dialog" aria-modal="true" aria-labelledby="data-equipment-popup-title">
                    <div class="data-equipment-popup-header">
                        <div>
                            <span class="data-equipment-popup-kicker">Equipment history popup</span>
                            <strong id="data-equipment-popup-title">${escapeHtml(cardTitle)}</strong>
                        </div>
                        <button type="button" class="data-equipment-popup-close" data-equipment-history-close aria-label="설비 이력카드 닫기">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>
                    <div class="data-equipment-popup-body">
                        ${renderEquipmentHistoryCardMarkup(category, data)}
                    </div>
                </div>
            </div>
        `;
        bindEquipmentHistoryCard(container);
    }

    runtime.registerSectionRenderer('data', (category, context = {}) => {
        if (String(category?.dataKey || '').trim() === EQUIPMENT_HISTORY_DATA_KEY) {
            renderEquipmentHistoryCard(category, context);
            return;
        }
        const container = context.container || document.getElementById('content-container');
        if (container) container.innerHTML = category?.content || '';
    });
})();
