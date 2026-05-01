(function () {
    const api = window.KpiDataEquipmentHistory || (window.KpiDataEquipmentHistory = {});

    function renderMaintenanceRows(rows) {
        const list = api.asList(rows);
        if (!list.length) {
            return '<tr><td colspan="5" class="data-equipment-empty">등록된 정비 이력이 없습니다.</td></tr>';
        }
        return list.map((row) => `
            <tr>
                <td>${api.escapeHtml(row?.date || '-')}</td>
                <td>${api.escapeHtml(row?.type || '-')}</td>
                <td>${api.escapeHtml(row?.content || '-')}</td>
                <td>${api.escapeHtml(row?.worker || '-')}</td>
                <td>${api.escapeHtml(row?.note || '-')}</td>
            </tr>
        `).join('');
    }

    function renderDocumentRows(rows) {
        const list = api.asList(rows);
        if (!list.length) {
            return '<tr><td colspan="2" class="data-equipment-empty">등록된 관련 문서가 없습니다.</td></tr>';
        }
        return list.map((row) => `
            <tr>
                <td>${api.escapeHtml(row?.title || row?.fileName || row?.originalName || '-')}</td>
                <td>${row?.downloadUrl
                    ? `<a href="${api.escapeHtml(row.downloadUrl)}" target="_blank" rel="noopener">${api.escapeHtml(row.fileName || row.originalName || '다운로드')}</a>`
                    : api.escapeHtml(row?.fileName || row?.originalName || '-')}</td>
            </tr>
        `).join('');
    }

    function renderBoardMetric(label, value) {
        return `
            <div class="data-equipment-board-metric">
                <span>${api.escapeHtml(label)}</span>
                <strong>${api.escapeHtml(value)}</strong>
            </div>
        `;
    }

    function renderBoardCard(item) {
        const statusMeta = item.statusMeta || api.getEquipmentStatus(item.status);
        const rate = Math.max(0, Math.min(Number(item.rate) || 0, 100));
        const toneClassName = statusMeta.tone === 'check' ? 'is-check' : statusMeta.tone === 'stop' ? 'is-stop' : '';
        return `
            <article class="data-equipment-board-card ${toneClassName}" style="--rate:${rate}%">
                <div class="data-equipment-board-card-head">
                    <strong>
                        <span class="data-equipment-live-dot ${statusMeta.dotClassName}"></span>
                        ${api.escapeHtml(item.name)}
                    </strong>
                    <div class="data-equipment-board-state">
                        <span class="data-equipment-board-chip is-${statusMeta.tone}">${api.escapeHtml(statusMeta.label)}</span>
                        <span class="data-equipment-board-chip is-power">${api.escapeHtml(statusMeta.powerLabel)}</span>
                    </div>
                </div>
                <p>${api.escapeHtml([item.team, item.group].filter(Boolean).join(' / ') || item.line || '관리 구분 미지정')}</p>
                ${renderBoardMetric('설비코드', item.equipmentCode || '-')}
                ${renderBoardMetric('현재 실적', item.production || '-')}
                ${renderBoardMetric('목표 기준', item.plan || '-')}
                ${renderBoardMetric('다음 점검', item.nextCheck || '-')}
                <div class="data-equipment-board-rate"><span>가동률 ${rate}%</span></div>
                <div class="data-equipment-board-progress"><span></span></div>
                <button type="button" data-equipment-open-card="${api.escapeHtml(item.id)}">이력 카드 작성</button>
            </article>
        `;
    }

    function renderBoard(groups, items) {
        const activeCount = items.filter((item) => item.statusMeta?.isRunning).length;
        const pausedCount = items.length - activeCount;
        const boardBody = groups.length
            ? groups.map((group) => `
                <section class="data-equipment-board-column">
                    <header>
                        <strong>${api.escapeHtml(group.team)}</strong>
                        <span>${group.sections.reduce((sum, section) => sum + section.equipment.length, 0)} 설비</span>
                    </header>
                    ${group.sections.map((section) => `
                        <div class="data-equipment-board-section">
                            <h3>${api.escapeHtml(section.title)}</h3>
                            ${section.equipment.map(renderBoardCard).join('')}
                        </div>
                    `).join('')}
                </section>
            `).join('')
            : `
                <article class="data-equipment-board-empty">
                    <strong>등록된 설비 카드가 없습니다.</strong>
                    <p>상단의 설비 이력 카드 작성 버튼을 눌러 설비명, 관리팀, 공정, 가동률과 관련 문서를 입력하면 보드 카드가 바로 생성됩니다.</p>
                </article>
            `;

        return `
            <section class="data-equipment-dashboard" data-equipment-view="board">
                <div class="data-equipment-dashboard-summary">
                    <span>전체 설비 <strong>${items.length}</strong></span>
                    <span>운영중 <strong>${activeCount}</strong></span>
                    <span>점검/정지 <strong>${pausedCount}</strong></span>
                </div>
                <div class="data-equipment-board ${groups.length ? '' : 'is-empty'}">
                    ${boardBody}
                </div>
            </section>
        `;
    }

    function renderPhotoCard(draft) {
        const photoSrc = api.getEquipmentPhotoPreviewUrl?.(draft) || draft.photoDataUrl;
        const hasPhoto = Boolean(photoSrc);
        const caption = draft.photoName ? `현재 첨부: ${draft.photoName}` : '선택한 이미지는 이 카드에 미리보기로 저장됩니다.';
        return `
            <label class="data-equipment-photo-card">
                <input type="file" accept="image/*" hidden data-equipment-history-photo-input>
                <img class="data-equipment-photo-preview" alt="설비 사진 미리보기" ${hasPhoto ? `src="${api.escapeHtml(photoSrc)}"` : 'hidden'} data-equipment-history-photo-preview>
                <span class="data-equipment-photo-placeholder" ${hasPhoto ? 'hidden' : ''} data-equipment-history-photo-placeholder>
                    <i class="fas fa-camera"></i>
                    <strong>설비 사진 첨부</strong>
                    <small>${api.escapeHtml(caption)}</small>
                </span>
            </label>
        `;
    }

    function renderHistoryCard(category, data, state) {
        const header = data.header || {};
        const draft = state.draft || api.createDraft();
        const cardTitle = header.title || category.title || '설비 이력 카드';
        return `
            <section class="data-equipment-card-view" data-equipment-view="card">
                <form class="data-equipment-layout data-equipment-edit-form" aria-label="설비 이력 카드 작성" data-equipment-form>
                    <div class="data-equipment-top-grid">
                        ${renderPhotoCard(draft)}
                        <article class="data-equipment-card data-equipment-card-pad">
                            <div class="data-equipment-identity-stack">
                                <section>
                                    <h3 class="data-equipment-section-title">
                                        설비 기본 정보
                                    </h3>
                                    ${api.renderFieldGrid(api.BASIC_FIELDS, draft, 'data-equipment-edit-grid data-equipment-basic-grid')}
                                </section>
                            </div>
                        </article>
                    </div>
                    <article class="data-equipment-card data-equipment-detail-card">
                        <h3 class="data-equipment-section-title">
                            ${api.escapeHtml(cardTitle)} 상세 정보
                            <button type="button" class="data-equipment-add-row" data-equipment-add-row="detailInfo">
                                <i class="fas fa-plus"></i><span>항목 추가</span>
                            </button>
                        </h3>
                        ${api.renderDetailItems(draft.detailInfo)}
                    </article>
                    <div class="data-equipment-bottom-grid">
                        <article class="data-equipment-card data-equipment-history-card">
                            <h3 class="data-equipment-section-title">
                                정비 이력
                                <button type="button" class="data-equipment-add-row" data-equipment-add-row="maintenanceHistory">
                                    <i class="fas fa-plus"></i><span>행 추가</span>
                                </button>
                            </h3>
                            <div class="data-equipment-table-scroll">
                                ${api.renderEditableTable(api.MAINTENANCE_FIELDS, draft.maintenanceHistory, 'maintenanceHistory')}
                            </div>
                        </article>
                        <article class="data-equipment-card data-equipment-doc-card">
                            <h3 class="data-equipment-section-title">
                                관련 문서
                                <button type="button" class="data-equipment-add-row" data-equipment-add-row="documents">
                                    <i class="fas fa-plus"></i><span>행 추가</span>
                                </button>
                            </h3>
                            <div class="data-equipment-table-scroll">
                                ${api.renderDocumentEditableTable(draft.documents)}
                            </div>
                        </article>
                    </div>
                    <label class="data-equipment-note-field">
                        <span>비고</span>
                        <textarea data-equipment-field="note" placeholder="설비 이력 카드 비고를 입력하세요.">${api.escapeHtml(draft.note || '')}</textarea>
                    </label>
                    <div class="data-equipment-form-actions">
                        <button type="submit" class="data-equipment-primary-action">
                            <i class="fas fa-save"></i><span>설비 카드 저장</span>
                        </button>
                        <button type="button" data-equipment-clear-form>
                            <i class="fas fa-eraser"></i><span>작성 폼 비우기</span>
                        </button>
                    </div>
                </form>
                ${renderFooter(header, data, draft, state)}
            </section>
        `;
    }

    function renderFooter(header, data, draft, state) {
        return `
            <footer class="data-equipment-footer">
                <span>${api.escapeHtml(state.message || '작성 후 설비 카드 저장을 누르면 설비 현황 보드에 즉시 반영됩니다.')}</span>
                <span>
                    <strong>마지막 업데이트</strong>
                    ${api.escapeHtml(header.updatedAt || data.meta?.updatedAt || '-')}
                    <strong>담당</strong>
                    ${api.escapeHtml(draft?.owner || header.owner || '-')}
                </span>
            </footer>
        `;
    }

    function renderTopbar(category, data, items, selected, isCard, state) {
        const header = data.header || {};
        return `
            <header class="data-equipment-topbar data-equipment-topbar-dashboard">
                <div class="data-equipment-brand" aria-label="KPI">
                    <span class="data-equipment-brand-mark"><i class="fas fa-cube"></i></span>
                    <span><strong>${api.escapeHtml(header.brandName || 'KPI')}</strong><small>${api.escapeHtml(header.brandSub || '설비 이력 관리 기록')}</small></span>
                </div>
                <div class="data-equipment-title-block">
                    <h2>${api.escapeHtml(header.title || category.title || '설비 이력 카드')}</h2>
                    <p>${api.escapeHtml(isCard ? (state.draft?.name || selected?.name || '설비 이력 카드 작성') : '설비 현황')}</p>
                </div>
                <div class="data-equipment-actions data-equipment-view-actions">
                    <button type="button" class="${isCard ? '' : 'active'}" data-equipment-view-action="board">설비 현황</button>
                    <button type="button" class="${isCard ? 'active' : ''}" data-equipment-view-action="card">설비 이력 카드 작성</button>
                    ${isCard ? '<button type="button" data-equipment-history-print><i class="fas fa-print"></i><span>PDF 출력</span></button>' : ''}
                    ${items.length ? `
                        <select data-equipment-select aria-label="설비 선택">
                            ${items.map((item) => `<option value="${api.escapeHtml(item.id)}"${item.id === selected?.id ? ' selected' : ''}>${api.escapeHtml(item.name)}</option>`).join('')}
                        </select>
                    ` : ''}
                </div>
            </header>
        `;
    }

    function renderShell(category, data, state) {
        const items = api.normalizeEquipmentItems(data);
        const selected = api.getSelectedEquipment(items, state.selectedId);
        const groups = api.groupEquipmentItems(items);
        const isCard = state.view === 'card';
        return `
            <section class="data-equipment-page">
                ${renderTopbar(category, data, items, selected, isCard, state)}
                ${isCard ? renderHistoryCard(category, data, state) : renderBoard(groups, items)}
            </section>
        `;
    }

    function ensureDraft(data, state) {
        const items = api.normalizeEquipmentItems(data);
        const selected = api.getSelectedEquipment(items, state.selectedId);
        state.draft = api.createDraft(selected);
    }

    function syncMirroredFields(root, field, value, source) {
        root.querySelectorAll(`[data-equipment-field="${field}"]:not([data-equipment-row-section])`).forEach((input) => {
            if (input !== source) input.value = value;
        });
    }

    function updateDraftFromInput(root, state, event) {
        const input = event.target;
        const field = input.dataset.equipmentField;
        if (!field || !state.draft) return;
        const value = input.value;
        const section = input.dataset.equipmentRowSection;
        if (section) {
            const index = Number(input.dataset.equipmentRowIndex);
            const rows = state.draft[section];
            if (Array.isArray(rows) && Number.isInteger(index) && rows[index]) {
                rows[index][field] = value;
            }
            return;
        }
        state.draft[field] = value;
        syncMirroredFields(root, field, value, input);
    }

    function addDraftRow(state, section) {
        if (!state.draft) state.draft = api.createDraft();
        if (section === 'detailInfo') {
            state.draft.detailInfo.push(api.createBlankDetailRow());
            return;
        }
        if (section === 'documents') {
            state.draft.documents.push(api.createBlankDocumentRow());
            return;
        }
        state.draft.maintenanceHistory.push(api.createBlankMaintenanceRow());
    }

    function removeDraftRow(state, section, index) {
        const rows = state.draft?.[section];
        if (!Array.isArray(rows) || !Number.isInteger(index)) return;
        rows.splice(index, 1);
        if (section === 'detailInfo') return;
        if (!rows.length) addDraftRow(state, section);
    }

    async function saveDraft(data, state) {
        const draft = state.draft || api.createDraft();
        const recordForValidation = api.buildRecordFromDraft(draft);
        if (!recordForValidation.name) {
            window.alert('설비명을 입력해 주세요.');
            return false;
        }
        const canSaveToServer = api.canSaveEquipmentHistoryToServer?.() === true;
        const hasPendingAssets = Boolean(draft.photoFile) || api.asList(draft.documents).some((row) => row?.pendingFile);
        if (!canSaveToServer && hasPendingAssets) {
            window.alert('서버 저장 권한이 있어야 첨부 파일을 저장할 수 있습니다.');
            return false;
        }

        const previousPayload = JSON.parse(JSON.stringify(data || {}));
        const previousDocumentIds = api.collectEquipmentHistoryDraftDocumentIds?.(draft) || [];
        let record = null;
        let nextPayload = null;
        try {
            if (canSaveToServer) await api.uploadEquipmentHistoryDraftAssets?.(draft);
            record = api.buildRecordFromDraft(draft);
            if (!record.name) {
                window.alert('설비명을 입력해 주세요.');
                return false;
            }

            const existingItems = api.normalizeEquipmentItems(data).filter((item) => item.id !== record.id);
            nextPayload = {
                ...JSON.parse(JSON.stringify(data || {})),
                equipmentList: [record, ...existingItems],
            };
            if (canSaveToServer) {
                const savedPayload = await api.saveEquipmentHistoryPayload?.(nextPayload);
                if (!savedPayload) throw new Error('equipment_history_payload_save_failed');
                nextPayload = savedPayload;
            }
        } catch (error) {
            if (canSaveToServer) {
                try {
                    await api.deleteEquipmentHistoryUploadedDraftAssets?.(draft, previousDocumentIds);
                } catch (cleanupError) {
                    console.warn('[kpi] equipment history uploaded asset cleanup failed', cleanupError);
                }
            }
            if (window.PortalData) window.PortalData.data_equipment_history_card = previousPayload;
            throw error;
        }

        Object.keys(data || {}).forEach((key) => delete data[key]);
        Object.assign(data, nextPayload);
        if (window.PortalData) window.PortalData.data_equipment_history_card = nextPayload;

        state.selectedId = record.id;
        state.draft = api.createDraft(record);
        state.message = '작성 내용이 설비 현황 보드에 반영되었습니다.';
        return true;
    }

    function bindPhotoPreview(root, state) {
        const input = root.querySelector('[data-equipment-history-photo-input]');
        const preview = root.querySelector('[data-equipment-history-photo-preview]');
        const placeholder = root.querySelector('[data-equipment-history-photo-placeholder]');
        if (!input || !preview || !placeholder) return;

        input.addEventListener('change', (event) => {
            const [file] = event.target.files || [];
            if (!file || !state.draft) return;
            const reader = new FileReader();
            reader.onload = () => {
                state.draft.photoDataUrl = String(reader.result || '');
                state.draft.photoFile = file;
                state.draft.photoName = file.name || '';
                preview.src = state.draft.photoDataUrl;
                preview.hidden = false;
                placeholder.hidden = true;
            };
            reader.readAsDataURL(file);
        });
    }

    function bindEvents(root, redraw, state, data) {
        root.querySelectorAll('[data-equipment-history-print]').forEach((button) => {
            button.addEventListener('click', () => window.print());
        });

        root.querySelectorAll('[data-equipment-view-action]').forEach((button) => {
            button.addEventListener('click', () => {
                state.view = button.dataset.equipmentViewAction === 'card' ? 'card' : 'board';
                if (state.view === 'card' && !state.draft) ensureDraft(data, state);
                redraw();
            });
        });

        root.querySelectorAll('[data-equipment-open-card]').forEach((button) => {
            button.addEventListener('click', () => {
                state.selectedId = button.dataset.equipmentOpenCard || state.selectedId;
                state.view = 'card';
                ensureDraft(data, state);
                redraw();
            });
        });

        root.querySelector('[data-equipment-select]')?.addEventListener('change', (event) => {
            state.selectedId = event.target.value;
            state.view = 'card';
            ensureDraft(data, state);
            redraw();
        });

        root.querySelector('[data-equipment-form]')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                if (await saveDraft(data, state)) redraw();
            } catch (error) {
                console.warn('[kpi] equipment history save failed', error);
                window.alert('저장에 실패했습니다.');
            }
        });

        root.querySelector('[data-equipment-clear-form]')?.addEventListener('click', () => {
            state.selectedId = '';
            state.draft = api.createDraft();
            state.message = '';
            redraw();
        });

        root.querySelectorAll('[data-equipment-add-row]').forEach((button) => {
            button.addEventListener('click', () => {
                addDraftRow(state, button.dataset.equipmentAddRow);
                redraw();
            });
        });

        root.querySelectorAll('[data-equipment-remove-row]').forEach((button) => {
            button.addEventListener('click', () => {
                removeDraftRow(state, button.dataset.equipmentRemoveRow, Number(button.dataset.equipmentRowIndex));
                redraw();
            });
        });

        root.querySelectorAll('[data-equipment-field]').forEach((input) => {
            input.addEventListener('input', (event) => updateDraftFromInput(root, state, event));
            input.addEventListener('change', (event) => updateDraftFromInput(root, state, event));
        });

        root.querySelectorAll('[data-equipment-document-pick]').forEach((button) => {
            button.addEventListener('click', () => {
                root.querySelector(`[data-equipment-document-file-input][data-equipment-row-index="${button.dataset.equipmentDocumentPick}"]`)?.click();
            });
        });

        root.querySelectorAll('[data-equipment-document-file-input]').forEach((input) => {
            input.addEventListener('change', (event) => {
                const [file] = event.target.files || [];
                const index = Number(input.dataset.equipmentRowIndex);
                const row = state.draft?.documents?.[index];
                if (!file || !row) return;
                row.pendingFile = file;
                row.fileName = file.name || '';
                redraw();
            });
        });

        bindPhotoPreview(root, state);
    }

    function render(category, context = {}, data = {}) {
        const container = context.container || document.getElementById('content-container');
        if (!container) return;
        const workingData = data;
        const items = api.normalizeEquipmentItems(workingData);
        const state = { view: 'board', selectedId: items[0]?.id || '', draft: null, message: '' };
        const redraw = () => {
            container.innerHTML = renderShell(category, workingData, state);
            bindEvents(container, redraw, state, workingData);
        };
        redraw();
    }

    api.render = render;
})();
