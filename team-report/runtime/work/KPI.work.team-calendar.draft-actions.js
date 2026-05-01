        function cloneWorkTeamCalendarPayload(value) {
            if (typeof cloneWorkDataPayload === 'function') return cloneWorkDataPayload(value);
            return JSON.parse(JSON.stringify(value || {}));
        }

        function restoreWorkTeamCalendarPayload(dataKey, data, snapshot) {
            const restored = cloneWorkTeamCalendarPayload(snapshot);
            Object.keys(data || {}).forEach((key) => delete data[key]);
            Object.assign(data, restored);
            if (typeof WorkCache !== 'undefined') WorkCache[dataKey] = data;
            if (typeof syncWorkPortalDataCache === 'function') {
                syncWorkPortalDataCache(dataKey, data);
            } else if (window.PortalData) {
                window.PortalData[dataKey] = cloneWorkTeamCalendarPayload(data);
            }
        }

        async function confirmWorkTeamCalendarSave(dataKey, data, message = 'work_team_calendar_save_failed') {
            if (typeof saveWorkDataConfirmed === 'function') {
                return saveWorkDataConfirmed(dataKey, data, { message });
            }
            const saved = await Promise.resolve(saveWorkData(dataKey, data));
            if (saved !== true) throw new Error(message);
            return true;
        }

        async function cleanupWorkTeamCalendarUploadedAttachments(uploadedAttachments, folderHandle, dataKey) {
            const targets = Array.isArray(uploadedAttachments) ? uploadedAttachments.slice().reverse() : [];
            for (const target of targets) {
                try {
                    await deleteWorkTeamCalendarAttachmentStorage(target, folderHandle, dataKey);
                } catch (error) {
                    console.warn('[kpi] work team calendar attachment cleanup failed', target?.documentId || target?.fileName, error);
                }
            }
        }

        async function updateWorkTeamCalendarAttachments(dataKey, dateKey, attachments, options = {}) {
            if (!dataKey || !dateKey || isWorkTeamCalendarDateLocked(dateKey)) return false;
            const nextAttachments = normalizeWorkTeamCalendarAttachments(attachments);
            const currentDraft = getWorkTeamCalendarDraftSnapshot(dataKey, dateKey);
            if (JSON.stringify(currentDraft.attachments) === JSON.stringify(nextAttachments)) return false;
            const data = getWorkTeamCalendarData(dataKey);
            const previousData = cloneWorkTeamCalendarPayload(data);
            const draft = ensureWorkTeamCalendarDraft(dataKey, dateKey);
            draft.attachments = nextAttachments;
            cleanupWorkTeamCalendarDraft(dataKey, dateKey);
            try {
                await confirmWorkTeamCalendarSave(dataKey, data, 'work_team_calendar_attachment_save_failed');
            } catch (error) {
                restoreWorkTeamCalendarPayload(dataKey, data, previousData);
                syncWorkTeamCalendarDraftUi(dataKey, dateKey);
                throw error;
            }
            syncWorkTeamCalendarDraftUi(dataKey, dateKey);
            if (options.markModified !== false) {
                const category = getWorkTeamCalendarCategory(dataKey);
                setLastModified(category?.title || AppData?.work?.name || 'Work Calendar');
            }
            if (options.render === true) {
                renderWorkTeamCalendarModal();
            }
            return true;
        }

        async function handleWorkTeamCalendarAttachmentInput(input) {
            const files = Array.from(input?.files || []);
            if (input) input.value = '';
            if (!files.length) return;
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const dateKeys = getWorkTeamCalendarEditorDateKeys(dataKey, monthKey);
            if (!dateKeys.length) {
                alert('날짜를 먼저 선택해 주세요.');
                return;
            }
            let folderHandleForCleanup = null;
            const uploadedAttachmentsForCleanup = [];
            try {
                const serverRuntime = getWorkAttachmentServerRuntimeConfig(dataKey);
                const useServerStorage = !!(serverRuntime && serverRuntime.writeEnabled === true);
                const folderHandle = useServerStorage ? null : await getWorkEntryFolderHandle({ prompt: true });
                folderHandleForCleanup = folderHandle;
                if (!useServerStorage && !folderHandle) {
                    throw new Error('작업내역 폴더를 찾을 수 없습니다.');
                }
                const data = getWorkTeamCalendarData(dataKey);
                const previousData = cloneWorkTeamCalendarPayload(data);
                const uploadedAttachments = uploadedAttachmentsForCleanup;
                const nextAttachmentByDate = new Map();
                for (const dateKey of dateKeys) {
                    if (isWorkTeamCalendarDateLocked(dateKey)) continue;
                    const currentDraft = getWorkTeamCalendarDraftSnapshot(dataKey, dateKey);
                    const nextAttachments = currentDraft.attachments.slice();
                    for (const file of files) {
                        const extensionMatch = /(\.[^.]+)$/.exec(file.name || '');
                        const requestedName = `${buildWorkTeamCalendarAttachmentBaseName(dateKey, currentDraft.title, file.name || '')}${extensionMatch ? extensionMatch[1] : ''}`;
                        if (useServerStorage) {
                            const uploaded = await uploadWorkAttachmentToServer(dataKey, dateKey, file, {
                                fileName: requestedName
                            });
                            if (!uploaded) {
                                throw new Error('work_attachment_server_upload_failed');
                            }
                            nextAttachments.push(uploaded);
                            uploadedAttachments.push(uploaded);
                        } else {
                            const finalName = await ensureUniqueWorkEntryFileName(folderHandle, requestedName);
                            const fileHandle = await folderHandle.getFileHandle(finalName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(file);
                            await writable.close();
                            const directoryAttachment = {
                                fileName: finalName,
                                name: finalName,
                                type: normalizeAreaAssetType(file.type, finalName),
                                relativePath: `${WORK_ENTRY_FOLDER_NAME}/${finalName}`,
                                storage: 'directory',
                                originalName: file.name || finalName
                            };
                            nextAttachments.push(directoryAttachment);
                            uploadedAttachments.push(directoryAttachment);
                        }
                    }
                    nextAttachmentByDate.set(dateKey, nextAttachments);
                }
                nextAttachmentByDate.forEach((nextAttachments, dateKey) => {
                    const draft = ensureWorkTeamCalendarDraft(dataKey, dateKey);
                    draft.attachments = normalizeWorkTeamCalendarAttachments(nextAttachments);
                    cleanupWorkTeamCalendarDraft(dataKey, dateKey);
                });
                try {
                    await confirmWorkTeamCalendarSave(dataKey, data, 'work_team_calendar_attachment_save_failed');
                } catch (saveError) {
                    restoreWorkTeamCalendarPayload(dataKey, data, previousData);
                    await cleanupWorkTeamCalendarUploadedAttachments(uploadedAttachments, folderHandle, dataKey);
                    uploadedAttachments.length = 0;
                    throw saveError;
                }
                const category = getWorkTeamCalendarCategory(dataKey);
                setLastModified(category?.title || AppData?.work?.name || 'Work Calendar');
                renderWorkTeamCalendarModal();
            } catch (error) {
                await cleanupWorkTeamCalendarUploadedAttachments(uploadedAttachmentsForCleanup, folderHandleForCleanup, dataKey);
                alert(`첨부 저장 실패: ${error?.message || '알 수 없는 오류'}`);
            }
        }

        function isLegacyWorkTeamCalendarDirectoryAttachment(target) {
            if (!target) return false;
            if (target.documentId || target.assetId || target.storage === 'server') return false;
            return !!String(target.fileName || '').trim();
        }

        function assertWorkTeamCalendarLegacyAttachmentAllowed(dataKey, target) {
            const serverRuntime = getWorkAttachmentServerRuntimeConfig(dataKey);
            const serverAuthorityEnabled = !!(serverRuntime && (serverRuntime.readEnabled === true || serverRuntime.writeEnabled === true));
            if (!serverAuthorityEnabled || !isLegacyWorkTeamCalendarDirectoryAttachment(target)) return;
            throw new Error('서버화 이전 로컬 폴더 첨부입니다. 현재 서버 모드에서는 로컬 폴더 fallback을 다시 열지 않습니다. 원본 파일을 서버 첨부로 다시 올려 주세요.');
        }

        async function deleteWorkTeamCalendarAttachmentStorage(target, folderHandle = null, dataKey = WorkState.teamCalendarModal) {
            if (!target) return;
            assertWorkTeamCalendarLegacyAttachmentAllowed(dataKey, target);
            if (target.documentId || target.storage === 'server') {
                await deleteWorkAttachmentFromServer(target);
                return;
            }
            if (target.assetId) {
                await deleteAreaAssetRecord(target.assetId);
                return;
            }
            if (!target.fileName) return;
            const resolvedFolderHandle = folderHandle || await getWorkEntryFolderHandle({ prompt: true });
            if (!resolvedFolderHandle) {
                throw new Error('작업내역 폴더를 찾을 수 없습니다.');
            }
            try {
                await resolvedFolderHandle.removeEntry(target.fileName);
            } catch (error) {
                const message = String(error?.message || '').toLowerCase();
                if (error?.name === 'NotFoundError' || message.includes('not found')) {
                    return;
                }
                throw error;
            }
        }

        async function deleteWorkTeamCalendarSelectedEntries() {
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const selectedDateKeys = getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
            if (!selectedDateKeys.length) return;
            const deletableDateKeys = selectedDateKeys.filter(dateKey => !isWorkTeamCalendarDateLocked(dateKey));
            if (!deletableDateKeys.length) {
                alert('삭제할 수 있는 작업내역이 없습니다.');
                return;
            }
            const entries = deletableDateKeys.map(dateKey => ({
                dateKey,
                draft: getWorkTeamCalendarDraftSnapshot(dataKey, dateKey)
            })).filter(item => hasWorkTeamCalendarDraftContent(item.draft));
            if (!entries.length) {
                alert('삭제할 작업내역이 없습니다.');
                return;
            }
            const isBatch = entries.length > 1;
            const message = isBatch
                ? `${entries.length}개 날짜의 작업내역을 삭제할까요? 첨부파일도 함께 삭제됩니다.`
                : `${formatWorkTeamCalendarDateLabel(entries[0].dateKey)} 작업내역을 삭제할까요? 첨부파일도 함께 삭제됩니다.`;
            if (!confirm(message)) return;
            let folderHandle = null;
            try {
                const hasLegacyDirectoryAttachment = entries.some(item => normalizeWorkTeamCalendarAttachments(item.draft.attachments).some(att => {
                    try {
                        assertWorkTeamCalendarLegacyAttachmentAllowed(dataKey, att);
                        return false;
                    } catch (error) {
                        return true;
                    }
                }));
                if (hasLegacyDirectoryAttachment) {
                    throw new Error('서버화 이전 로컬 폴더 첨부가 포함되어 있습니다. 이 첨부는 먼저 서버 첨부로 다시 올린 뒤 정리해 주세요.');
                }
                const needsFolderAccess = entries.some(item => normalizeWorkTeamCalendarAttachments(item.draft.attachments).some(att => !att.documentId && !att.assetId && att.fileName));
                if (needsFolderAccess) {
                    folderHandle = await getWorkEntryFolderHandle({ prompt: true });
                }
                const data = getWorkTeamCalendarData(dataKey);
                const previousData = cloneWorkTeamCalendarPayload(data);
                const workEntries = ensureWorkTeamCalendarEntries(dataKey);
                entries.forEach((entry) => {
                    delete workEntries[entry.dateKey];
                });
                try {
                    await confirmWorkTeamCalendarSave(dataKey, data, 'work_team_calendar_delete_save_failed');
                } catch (saveError) {
                    restoreWorkTeamCalendarPayload(dataKey, data, previousData);
                    throw saveError;
                }
                let cleanupFailed = false;
                for (const entry of entries) {
                    const attachments = normalizeWorkTeamCalendarAttachments(entry.draft.attachments);
                    for (const attachment of attachments) {
                        try {
                            await deleteWorkTeamCalendarAttachmentStorage(attachment, folderHandle, dataKey);
                        } catch (cleanupError) {
                            cleanupFailed = true;
                            console.warn('[kpi] work team calendar attachment delete failed', attachment?.documentId || attachment?.fileName, cleanupError);
                        }
                    }
                }
                closeWorkTeamCalendarEditor(dataKey, { render: false });
                const category = getWorkTeamCalendarCategory(dataKey);
                setLastModified(category?.title || AppData?.work?.name || 'Work Calendar');
                renderWorkTeamCalendarModal();
                if (cleanupFailed) {
                    alert('작업내역은 삭제됐지만 첨부 파일 일부를 삭제하지 못했습니다.');
                }
            } catch (error) {
                alert(`저장 실패: ${error?.message || '알 수 없는 오류'}`);
            }
        }

        async function removeWorkTeamCalendarAttachment(refKey) {
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const selectedDateKeys = getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
            if (selectedDateKeys.length !== 1) {
                alert('첨부 삭제는 날짜를 하나만 선택했을 때 가능합니다.');
                return;
            }
            const dateKey = selectedDateKeys[0];
            const currentDraft = getWorkTeamCalendarDraftSnapshot(dataKey, dateKey);
            const target = findWorkTeamCalendarAttachment(currentDraft, refKey);
            if (!target) return;
            const targetKey = target.documentId || target.assetId || target.fileName || target.relativePath;
            const nextAttachments = currentDraft.attachments.filter(item => (item.documentId || item.assetId || item.fileName || item.relativePath) !== targetKey);
            try {
                await updateWorkTeamCalendarAttachments(dataKey, dateKey, nextAttachments, { render: false });
            } catch (error) {
                alert(`첨부 기록 저장 실패: ${error?.message || '알 수 없는 오류'}`);
                return;
            }
            try {
                await deleteWorkTeamCalendarAttachmentStorage(target, null, dataKey);
            } catch (error) {
                console.warn('[kpi] work team calendar attachment file delete failed', target?.documentId || target?.fileName, error);
                alert(`첨부 기록에서는 제거했지만 파일 삭제는 실패했습니다: ${error?.message || '알 수 없는 오류'}`);
            }
            renderWorkTeamCalendarModal();
        }

        async function openWorkTeamCalendarAttachment(refKey) {
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const selectedDateKeys = getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
            if (selectedDateKeys.length !== 1) {
                alert('첨부 열기는 날짜를 하나만 선택했을 때 가능합니다.');
                return;
            }
            const dateKey = selectedDateKeys[0];
            const currentDraft = getWorkTeamCalendarDraftSnapshot(dataKey, dateKey);
            const target = findWorkTeamCalendarAttachment(currentDraft, refKey);
            if (!target) {
                alert('첨부 파일을 찾을 수 없습니다.');
                return;
            }
            let url = '';
            try {
                assertWorkTeamCalendarLegacyAttachmentAllowed(dataKey, target);
                if (target.documentId || target.storage === 'server') {
                    url = getWorkAttachmentViewUrl(target);
                } else if (target.assetId) {
                    url = await getAreaAssetObjectUrl(target.assetId);
                } else {
                    const folderHandle = await getWorkEntryFolderHandle({ prompt: true });
                    if (folderHandle && target.fileName) {
                        const fileHandle = await folderHandle.getFileHandle(target.fileName);
                        const file = await fileHandle.getFile();
                        url = URL.createObjectURL(file);
                    }
                }
            } catch (error) {
                alert(`Attachment preview failed: ${error?.message || 'Unknown error'}`);
                return;
            }
            if (!url) {
                alert('첨부 파일을 열 수 없습니다.');
                return;
            }
            const opened = window.open(url, '_blank', 'noopener,noreferrer');
            if (!opened) {
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.click();
            }
            if (!target.assetId && !target.documentId && target.storage !== 'server') {
                window.setTimeout(() => URL.revokeObjectURL(url), 30000);
            }
        }
