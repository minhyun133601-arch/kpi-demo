(function initKpiWorkHistoryViewActionDocument() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        DATA_KEY,
        state,
        ATTACHMENT_SLOT_KEYS,
        ATTACHMENT_SLOT_META,
        WORK_HISTORY_ATTACHMENT_MAX_BYTES,
        getElement,
        getPayload,
        isProductionReportWorkspace,
        validateWorkHistoryAttachment,
        saveNow,
        getRecordRuntimeConfig,
        buildExportScript
    } = history;

    function isProductionWorkspace() {
        return typeof isProductionReportWorkspace === 'function' && isProductionReportWorkspace();
    }

    function getVisibleAttachmentSlotKeys() {
        return isProductionWorkspace() ? ['report'] : ATTACHMENT_SLOT_KEYS;
    }

    function getAttachmentValidationMessage(errorKey) {
        if (errorKey === 'unsupported_type' || errorKey === 'attachment_pdf_only') {
            return 'PDF, 엑셀, PPT, 워드, 한글 파일만 첨부할 수 있습니다.';
        }
        if (errorKey === 'file_too_large') {
            const maxMb = Math.max(1, Math.round((Number(WORK_HISTORY_ATTACHMENT_MAX_BYTES) || 0) / (1024 * 1024)));
            return `첨부 파일은 ${maxMb}MB 이하만 업로드할 수 있습니다.`;
        }
        return '첨부 파일을 다시 선택해 주세요.';
    }

    function getAttachmentInputId(slotKey) {
        return String(slotKey || '').trim() === 'billing'
            ? 'recordBillingAttachment'
            : 'recordReportAttachment';
    }

    function openAttachmentPicker(slotKey) {
        const normalizedSlotKey = ATTACHMENT_SLOT_KEYS.includes(String(slotKey || '').trim())
            ? String(slotKey).trim()
            : '';
        if (!normalizedSlotKey) return;
        const input = getElement(getAttachmentInputId(normalizedSlotKey));
        input?.click?.();
    }

    function handleAttachmentSelection(slotKey, fileList) {
        const normalizedSlotKey = ATTACHMENT_SLOT_KEYS.includes(String(slotKey || '').trim())
            ? String(slotKey).trim()
            : '';
        const files = Array.from(fileList || []);
        if (!normalizedSlotKey || !files.length) return;

        const file = files[0];
        const errorKey = typeof validateWorkHistoryAttachment === 'function'
            ? validateWorkHistoryAttachment(file)
            : '';
        if (errorKey) {
            window.alert(getAttachmentValidationMessage(errorKey));
            const input = getElement(getAttachmentInputId(normalizedSlotKey));
            if (input) input.value = '';
            return;
        }

        state.formState.pendingFiles[normalizedSlotKey] = file;
        const input = getElement(getAttachmentInputId(normalizedSlotKey));
        if (input) input.value = '';
        renderAttachmentList();
    }

    function renderAttachmentList() {
        const container = getElement('attachmentList');
        if (!container) return;
        const groups = getVisibleAttachmentSlotKeys().map((slotKey) => {
            const meta = ATTACHMENT_SLOT_META[slotKey];
            const existing = state.formState.existingAttachments?.[slotKey] || null;
            const pending = state.formState.pendingFiles?.[slotKey] || null;
            const pickerButtonHtml = `
                <button type="button" class="attachment-pick-btn" data-action="pick-attachment" data-slot="${slotKey}">파일 선택</button>
            `;
            const itemHtml = pending
                ? `
                    <div class="attachment-item pending">
                        <div class="attachment-meta">
                            <span class="attachment-name">${history.escapeHtml(pending.name)}</span>
                            <span class="attachment-size">${history.escapeHtml(view.formatFileSize(pending.size))}</span>
                        </div>
                        <div class="attachment-actions">
                            <button type="button" class="btn btn-secondary btn-sm" data-action="remove-pending-attachment" data-slot="${slotKey}">취소</button>
                        </div>
                    </div>
                `
                : existing
                    ? `
                        <div class="attachment-item">
                            <div class="attachment-meta">
                                <span class="attachment-name">${history.escapeHtml(existing.originalName)}</span>
                                <span class="attachment-size">${history.escapeHtml(view.formatFileSize(existing.size))}</span>
                            </div>
                            <div class="attachment-actions">
                                <a class="btn btn-secondary btn-sm" href="${history.escapeAttribute(existing.downloadUrl || existing.url || existing.previewUrl || '#')}" download="${history.escapeAttribute(existing.originalName || 'attachment')}" target="_blank" rel="noopener">다운로드</a>
                                <button type="button" class="btn btn-secondary btn-sm" data-action="remove-existing-attachment" data-slot="${slotKey}">제거</button>
                            </div>
                        </div>
                    `
                    : '<div class="attachment-empty">첨부된 파일이 없습니다.</div>';

            return `
                <div class="attachment-slot-group">
                    <div class="attachment-slot-head">
                        <div class="attachment-slot-title">${history.escapeHtml(meta.label)}</div>
                        ${pickerButtonHtml}
                    </div>
                    <div class="attachment-slot-hint">PDF, 엑셀, PPT, 워드, 한글 문서 중 1건</div>
                    <div class="attachment-slot-body">${itemHtml}</div>
                </div>
            `;
        });

        container.innerHTML = groups.join('');
    }

    function removeExistingAttachment(slotKey) {
        const normalizedSlotKey = ATTACHMENT_SLOT_KEYS.includes(String(slotKey || '').trim())
            ? String(slotKey).trim()
            : '';
        if (!normalizedSlotKey) return;
        const removed = state.formState.existingAttachments?.[normalizedSlotKey] || null;
        if (removed) {
            state.formState.removedAttachments.push(removed);
        }
        state.formState.existingAttachments[normalizedSlotKey] = null;
        renderAttachmentList();
    }

    function removePendingAttachment(slotKey) {
        const normalizedSlotKey = ATTACHMENT_SLOT_KEYS.includes(String(slotKey || '').trim())
            ? String(slotKey).trim()
            : '';
        if (!normalizedSlotKey) return;
        state.formState.pendingFiles[normalizedSlotKey] = null;
        renderAttachmentList();
    }

    async function exportAllData() {
        const runtimeConfig = getRecordRuntimeConfig();
        const serverWritable = window.KpiRuntime?.canUseServerWrite?.(runtimeConfig?.writeEnabled === true) === true;

        if (!serverWritable) {
            showToast(isProductionWorkspace()
                ? '서버 기록이 가능한 환경에서만 실적 보고서를 저장할 수 있습니다.'
                : '서버 기록이 가능한 환경에서만 저장할 수 있습니다.');
            return false;
        }

        const saved = await saveNow();
        if (saved) {
            if (typeof setLastModified === 'function') {
                setLastModified(state.activeCategory?.title || (isProductionWorkspace() ? '생산 본부 실적보고' : '팀별내역서'));
            }
            showToast(isProductionWorkspace() ? '전체 실적 보고서가 저장되었습니다.' : '전체 작업내역이 저장되었습니다.');
            return true;
        }
        showToast(isProductionWorkspace()
            ? '실적 보고서 서버 저장에 실패했습니다. 잠시 뒤 다시 시도해 주세요.'
            : '서버 저장에 실패했습니다. 잠시 뒤 다시 시도해 주세요.');
        return false;
    }

    async function performPrimarySave() {
        if (view.isRecordModalOpen?.()) {
            return view.saveRecord?.();
        }
        return exportAllData();
    }

    function downloadBackupSnapshot() {
        const fileName = `data_${DATA_KEY}_${view.buildTimestampLabel()}.js`;
        const content = buildExportScript(getPayload());
        const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        return true;
    }

    function showToast(message) {
        const toast = getElement('saveToast');
        if (!toast) return;
        const messageEl = toast.querySelector('.toast-message');
        if (messageEl) messageEl.textContent = message;
        toast.classList.add('show');
        if (state.toastTimer) {
            clearTimeout(state.toastTimer);
        }
        state.toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            state.toastTimer = null;
        }, 2400);
    }

    function closeOverlays() {
        view.closeRecordModal?.();
        view.closeDeleteModal?.();
    }

    Object.assign(view, {
        getAttachmentValidationMessage,
        getAttachmentInputId,
        openAttachmentPicker,
        handleAttachmentSelection,
        getVisibleAttachmentSlotKeys,
        renderAttachmentList,
        removeExistingAttachment,
        removePendingAttachment,
        exportAllData,
        performPrimarySave,
        downloadBackupSnapshot,
        showToast,
        closeOverlays
    });
})();
