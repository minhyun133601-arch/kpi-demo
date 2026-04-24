(function initKpiWorkHistoryViewActionRecord() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        TEAM_KEYS,
        TeamInfo,
        state,
        cloneJson,
        normalizeCost,
        normalizeAssignees,
        normalizePayload,
        isAllowedRecordCategory,
        normalizeRecordCategory,
        normalizeRecordCategoryGroup,
        isKpiRecord,
        ATTACHMENT_SLOT_KEYS,
        getElement,
        getPayload,
        getRecordAttachment,
        flattenAttachmentSlots,
        uploadPendingAttachments,
        deleteAttachmentsFromServer,
        savePayload
    } = history;

    function openRecordModal(team, index = null) {
        const form = getElement('recordForm');
        form?.reset();
        const sourceTeamInput = getElement('formSourceTeam');
        const formIndexInput = getElement('formIndex');
        const recordStartDate = getElement('recordStartDate');
        const recordEndDate = getElement('recordEndDate');
        const minDate = typeof view.minInputValue === 'function' ? view.minInputValue() : '2024-01-01';
        const today = view.todayInputValue();
        if (sourceTeamInput) sourceTeamInput.value = team;
        if (formIndexInput) formIndexInput.value = index !== null ? String(index) : '';
        if (recordStartDate) {
            recordStartDate.min = minDate;
            recordStartDate.max = today;
        }
        if (recordEndDate) {
            recordEndDate.min = minDate;
            recordEndDate.max = today;
        }

        state.formState = {
            sourceTeam: team,
            existingAttachments: {
                billing: null,
                report: null
            },
            pendingFiles: {
                billing: null,
                report: null
            },
            removedAttachments: []
        };

        const defaultTeam = TeamInfo[team] ? team : 'team1part1';
        const recordTeam = getElement('recordTeam');
        if (recordTeam) recordTeam.value = defaultTeam;

        if (index !== null && Number.isFinite(index)) {
            const record = getPayload().teams?.[team]?.[index];
            if (record) {
                const editCategory = normalizeRecordCategory(record.category, { preserveLegacy: true }) || String(record.category || '').trim();
                const editCategoryGroup = normalizeRecordCategoryGroup(record.categoryGroup, {
                    category: editCategory,
                    kpi: isKpiRecord(record)
                });
                getElement('modalTitle').textContent = '작업내역 수정';
                getElement('recordStartDate').value = record.startDate || '';
                getElement('recordEndDate').value = record.endDate || '';
                getElement('recordTeam').value = record.team || defaultTeam;
                getElement('recordAssignee').value = (record.assignees || normalizeAssignees(record.assignee || '')).join('\n');
                view.syncRecordCategoryInputs?.(editCategoryGroup, editCategory);
                getElement('recordWorkContent').value = record.workContent || '';
                getElement('recordRemarks').value = record.remarks || '';
                getElement('recordCost').value = view.formatCostInputValue(record.cost);
                state.formState.existingAttachments = {
                    billing: getRecordAttachment(record, 'billing'),
                    report: getRecordAttachment(record, 'report')
                };
            }
        } else {
            getElement('modalTitle').textContent = '작업내역 추가';
            getElement('recordStartDate').value = view.todayInputValue();
            getElement('recordEndDate').value = view.todayInputValue();
            view.syncRecordCategoryInputs?.('', '');
            getElement('recordCost').value = '';
        }

        ATTACHMENT_SLOT_KEYS.forEach((slotKey) => {
            const input = getElement(slotKey === 'billing' ? 'recordBillingAttachment' : 'recordReportAttachment');
            if (input) input.value = '';
        });
        const legacyAttachmentInput = getElement('recordAttachments');
        if (legacyAttachmentInput) legacyAttachmentInput.value = '';
        updateAssigneePreview(getElement('recordAssignee')?.value || '');
        view.renderAttachmentList?.();
        getElement('recordModal')?.classList.add('show');
    }

    function closeRecordModal() {
        getElement('recordModal')?.classList.remove('show');
    }

    function isRecordModalOpen() {
        return getElement('recordModal')?.classList.contains('show') === true;
    }

    function openDeleteModal(team, index) {
        state.pendingDelete = { team, index };
        getElement('deleteModal')?.classList.add('show');
    }

    function closeDeleteModal() {
        getElement('deleteModal')?.classList.remove('show');
        state.pendingDelete = { team: null, index: null };
    }

    function isDeleteModalOpen() {
        return getElement('deleteModal')?.classList.contains('show') === true;
    }

    function updateAssigneePreview(value) {
        const container = getElement('assigneePreview');
        if (!container) return;
        const assignees = normalizeAssignees(value);
        container.innerHTML = assignees.length
            ? assignees.map(name => `<span class="assignee-pill">${history.escapeHtml(name)}</span>`).join('')
            : '<span class="assignee-preview-empty">아직 입력된 작업자가 없습니다.</span>';
    }

    async function saveRecord(options = {}) {
        const sourceTeam = String(getElement('formSourceTeam')?.value || '').trim();
        const indexValue = String(getElement('formIndex')?.value || '').trim();
        const targetTeam = String(getElement('recordTeam')?.value || '').trim();
        const startDate = String(getElement('recordStartDate')?.value || '').trim();
        const endDate = String(getElement('recordEndDate')?.value || '').trim();
        const assignees = normalizeAssignees(getElement('recordAssignee')?.value || '');
        const categoryGroup = String(getElement('recordCategoryGroup')?.value || '').trim();
        const category = String(getElement('recordCategory')?.value || '').trim();
        const kpi = false;
        const workContent = String(getElement('recordWorkContent')?.value || '').trim();
        const remarks = String(getElement('recordRemarks')?.value || '').trim();
        const cost = normalizeCost(getElement('recordCost')?.value || '');
        const minDate = typeof view.minInputValue === 'function' ? view.minInputValue() : '2024-01-01';
        const today = view.todayInputValue();
        const normalizedCategory = normalizeRecordCategory(category, { preserveLegacy: true }) || category;
        const normalizedCategoryGroup = normalizeRecordCategoryGroup(categoryGroup, {
            category: normalizedCategory,
            kpi
        });
        const requiresCategory = normalizedCategoryGroup !== 'report';
        const categoryOptionValues = Array.from(getElement('recordCategory')?.options || [])
            .map(option => String(option.value || '').trim())
            .filter(Boolean);

        if (!startDate || !endDate) {
            window.alert('작업 기간을 입력해 주세요.');
            return false;
        }
        if (startDate < minDate || endDate < minDate) {
            window.alert('작업내역 검색필터의 날짜는 2024-01-01부터 선택할 수 있습니다.');
            return false;
        }
        if (startDate > today || endDate > today) {
            window.alert('작업내역 검색필터의 날짜는 오늘까지만 선택할 수 있습니다.');
            return false;
        }
        if (endDate > view.todayInputValue()) {
            window.alert('작업 종료일은 오늘 날짜까지만 입력할 수 있습니다.');
            return false;
        }
        if (endDate < startDate) {
            window.alert('작업 종료일이 시작일보다 빠를 수는 없습니다.');
            return false;
        }
        if (!TeamInfo[targetTeam]) {
            window.alert('작업 팀을 선택해 주세요.');
            return false;
        }
        if (!assignees.length) {
            window.alert('작업자를 입력해 주세요.');
            return false;
        }
        if (!normalizedCategoryGroup) {
            window.alert('구분을 선택해 주세요.');
            return false;
        }
        if (requiresCategory && (!normalizedCategory || !categoryOptionValues.includes(normalizedCategory) || (!isAllowedRecordCategory(normalizedCategory) && normalizedCategory !== category))) {
            window.alert('세부 카테고리를 선택해 주세요.');
            return false;
        }
        if (!workContent) {
            window.alert('업무내용을 입력해 주세요.');
            return false;
        }

        const nextAttachmentSlots = {
            billing: state.formState.existingAttachments?.billing || null,
            report: state.formState.existingAttachments?.report || null
        };
        for (const slotKey of ATTACHMENT_SLOT_KEYS) {
            const pendingFile = state.formState.pendingFiles?.[slotKey] || null;
            if (!pendingFile) continue;
            try {
                const uploadedAttachments = await uploadPendingAttachments([pendingFile], {
                    team: targetTeam,
                    startDate,
                    endDate,
                    attachmentType: slotKey
                });
                nextAttachmentSlots[slotKey] = uploadedAttachments[0] || null;
            } catch (error) {
                console.error('[kpi] work history attachment upload failed', error);
                const errorKey = String(error?.message || '').trim();
                if (errorKey === 'attachment_pdf_only' || errorKey === 'unsupported_type' || errorKey === 'file_too_large') {
                    window.alert(view.getAttachmentValidationMessage?.(errorKey) || '첨부 파일을 다시 선택해 주세요.');
                } else {
                    window.alert('첨부 파일 업로드 중 오류가 발생했습니다.');
                }
                return false;
            }
        }

        const nextRecord = {
            team: targetTeam,
            startDate,
            endDate,
            categoryGroup: normalizedCategoryGroup,
            category: requiresCategory ? normalizedCategory : '',
            kpi,
            assignees,
            assignee: assignees.join(', '),
            workContent,
            remarks,
            attachmentSlots: nextAttachmentSlots,
            billingAttachment: nextAttachmentSlots.billing,
            reportAttachment: nextAttachmentSlots.report,
            attachments: flattenAttachmentSlots(nextAttachmentSlots),
            cost
        };

        const payload = normalizePayload(cloneJson(getPayload()));
        payload.teams = payload.teams || {};
        TEAM_KEYS.forEach(team => {
            if (!Array.isArray(payload.teams[team])) payload.teams[team] = [];
        });

        if (indexValue !== '') {
            const index = Number(indexValue);
            if (sourceTeam === targetTeam) {
                payload.teams[sourceTeam][index] = nextRecord;
            } else {
                payload.teams[sourceTeam].splice(index, 1);
                payload.teams[targetTeam].unshift(nextRecord);
            }
        } else {
            payload.teams[targetTeam].unshift(nextRecord);
        }

        const saved = await savePayload(payload);
        if (saved && state.formState.removedAttachments.length) {
            await deleteAttachmentsFromServer(state.formState.removedAttachments);
        }

        closeRecordModal();
        view.renderCurrentView?.();
        if (state.currentTeam !== view.OVERVIEW_KEY) {
            view.switchTab?.(targetTeam);
        }

        if (saved && typeof setLastModified === 'function') {
            setLastModified(state.activeCategory?.title || '팀별내역서');
        }

        if (saved) {
            view.showToast?.(indexValue !== '' ? '작업내역이 수정되었습니다.' : '작업내역이 저장되었습니다.');
        } else if (!options.invokedByShortcut) {
            view.showToast?.('브라우저에는 반영됐지만 서버 저장은 실패했습니다.');
        }
        return saved;
    }

    async function confirmDelete() {
        const team = String(state.pendingDelete?.team || '').trim();
        const index = Number(state.pendingDelete?.index);
        if (!TeamInfo[team] || !Number.isInteger(index) || index < 0) return false;

        const payload = normalizePayload(cloneJson(getPayload()));
        const teamRecords = payload.teams?.[team];
        if (!Array.isArray(teamRecords) || !teamRecords[index]) return false;

        const deletedRecord = teamRecords[index];
        teamRecords.splice(index, 1);
        const saved = await savePayload(payload);

        if (saved && deletedRecord.attachments?.length) {
            await deleteAttachmentsFromServer(deletedRecord.attachments);
        }

        closeDeleteModal();
        view.renderCurrentView?.();
        if (saved && typeof setLastModified === 'function') {
            setLastModified(state.activeCategory?.title || '팀별내역서');
        }
        view.showToast?.(saved ? '작업내역이 삭제되었습니다.' : '브라우저에서만 삭제됐지만 서버 저장은 실패했습니다.');
        return saved;
    }

    Object.assign(view, {
        openRecordModal,
        closeRecordModal,
        isRecordModalOpen,
        openDeleteModal,
        closeDeleteModal,
        isDeleteModalOpen,
        updateAssigneePreview,
        saveRecord,
        confirmDelete
    });
})();
