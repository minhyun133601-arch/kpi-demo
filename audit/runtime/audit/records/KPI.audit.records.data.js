        // ----------------------------------------------------------------
        // [Audit Lux]
        // ----------------------------------------------------------------
        const AuditState = { filters: {}, printCache: {}, entryForm: {}, standardForm: {}, standardsOpen: {}, evidenceOpen: {}, evidenceSelected: {}, evidenceApplied: {}, evidenceCache: {}, luxPreviewRotation: {} };
        const AUDIT_LUX_BASE_YEAR = 2023;
        const AUDIT_LUX_EVIDENCE_MAX_BYTES = 25 * 1024 * 1024;
        const AUDIT_LUX_EVIDENCE_OWNER_DOMAIN = 'audit.lux.evidence';
        const AUDIT_LUX_EVIDENCE_STORAGE_FOLDER = ['Audit', '조도 스캔본'];
        const AuditServerWriteQueue = {};
        const AUDIT_PORTAL_DATA_ALIAS = Object.freeze({});

        function cloneAuditDataPayload(value) {
            return JSON.parse(JSON.stringify(value || {}));
        }

        function getAuditServerRuntimeConfig(dataKey) {
            const runtime = window.__KPI_SERVER_RUNTIME_CONFIG__?.audit;
            const records = runtime?.records;
            const record = records && typeof records === 'object' ? records[dataKey] : null;
            if (!runtime || runtime.enabled !== true || !record) return null;
            return {
                apiBase: runtime.apiBase || '/api',
                moduleKey: runtime.moduleKey || 'portal_data',
                recordKey: record.recordKey || dataKey,
                permissionKey: record.permissionKey || '',
                readEnabled: record.readEnabled === true,
                writeEnabled: record.writeEnabled === true
            };
        }

        function getAuditPortalPayload(dataKey) {
            if (!window.PortalData) return null;
            if (Object.prototype.hasOwnProperty.call(window.PortalData, dataKey)) {
                return window.PortalData[dataKey];
            }
            const aliasKey = AUDIT_PORTAL_DATA_ALIAS[dataKey];
            if (aliasKey && Object.prototype.hasOwnProperty.call(window.PortalData, aliasKey)) {
                return window.PortalData[aliasKey];
            }
            return null;
        }

        function syncAuditPortalDataCache(dataKey, data) {
            window.PortalData = window.PortalData || {};
            const snapshot = cloneAuditDataPayload(data);
            window.PortalData[dataKey] = snapshot;
            const aliasKey = AUDIT_PORTAL_DATA_ALIAS[dataKey];
            if (aliasKey) {
                window.PortalData[aliasKey] = cloneAuditDataPayload(snapshot);
            }
        }

        function queueAuditServerWrite(dataKey, data) {
            const runtime = getAuditServerRuntimeConfig(dataKey);
            if (!(window.KpiRuntime?.canUseServerWrite?.(runtime?.writeEnabled === true))) return Promise.resolve(false);

            const queueState = AuditServerWriteQueue[dataKey] || (AuditServerWriteQueue[dataKey] = {
                timer: null,
                payload: null,
                flushPromise: Promise.resolve(true),
                writeChain: Promise.resolve(true)
            });
            queueState.payload = cloneAuditDataPayload(data);

            if (queueState.timer) {
                clearTimeout(queueState.timer);
            }

            queueState.flushPromise = new Promise((resolve) => {
                queueState.timer = setTimeout(() => {
                    const payload = cloneAuditDataPayload(queueState.payload);
                    queueState.timer = null;
                    queueState.writeChain = Promise.resolve(queueState.writeChain)
                        .catch(() => false)
                        .then(async () => {
                            try {
                                const response = await fetch(`${runtime.apiBase}/modules/${encodeURIComponent(runtime.moduleKey)}/records/${encodeURIComponent(runtime.recordKey)}`, {
                                    method: 'PUT',
                                    credentials: 'same-origin',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        permissionKey: runtime.permissionKey,
                                        payload
                                    })
                                });

                                if (!response.ok) {
                                    throw new Error(`http_${response.status}`);
                                }

                                const result = await response.json();
                                if (result?.record?.payload) {
                                    syncAuditPortalDataCache(dataKey, result.record.payload);
                                }
                                return true;
                            } catch (error) {
                                console.warn('[kpi] audit server write failed', dataKey, error);
                                return false;
                            }
                        });
                    queueState.writeChain.then(resolve);
                }, 250);
            });

            return queueState.flushPromise;
        }

        function waitForAuditServerWrite(dataKey) {
            const queueState = AuditServerWriteQueue[dataKey];
            if (!queueState) return Promise.resolve(true);
            if (queueState.timer) return queueState.flushPromise || Promise.resolve(true);
            return queueState.writeChain || Promise.resolve(true);
        }

        function getAuditData(dataKey, moduleName) {
            let data = null;
            const serverRuntime = getAuditServerRuntimeConfig(dataKey);
            const serverReadBlocked = !!(serverRuntime && serverRuntime.readEnabled !== true);
            const portalPayload = getAuditPortalPayload(dataKey);
            const hasServerPayload = !!(serverRuntime && serverRuntime.readEnabled === true && portalPayload);

            if (hasServerPayload) {
                data = cloneAuditDataPayload(portalPayload);
            }
            if (!data && !serverReadBlocked && portalPayload) {
                data = cloneAuditDataPayload(portalPayload);
            }
            if (!data) {
                data = {
                    meta: {
                        moduleKey: dataKey,
                        moduleName: moduleName || dataKey,
                        version: 1,
                        updatedAt: new Date().toISOString()
                    },
                    entries: []
                };
            }
            data.entries = Array.isArray(data.entries) ? data.entries : [];
            if (!data.entries.length && Array.isArray(portalPayload?.entries)) {
                data.entries = cloneAuditDataPayload(portalPayload.entries);
            }
            data.standards = Array.isArray(data.standards) ? data.standards : [];
            if (!data.standards.length && Array.isArray(portalPayload?.standards)) {
                data.standards = cloneAuditDataPayload(portalPayload.standards);
            }
            data.evidence = Array.isArray(data.evidence) ? data.evidence : [];
            if (!data.evidence.length && Array.isArray(portalPayload?.evidence)) {
                data.evidence = cloneAuditDataPayload(portalPayload.evidence);
            }
            return data;
        }

        function normalizeAuditZone(text) {
            return (text || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
        }

        function getAuditStandardInfo(standards, team, room, type) {
            const t = (team || '').trim();
            const r = (room || '').trim();
            const k = (type || '').trim();
            const normalizedTeam = normalizeAuditZone(t);
            const normalizedRoom = normalizeAuditZone(r);
            const normalizedType = normalizeAuditZone(k);

            const matchStandard = (item) => {
                const itemTeam = normalizeAuditZone(item.team || '');
                const itemRoom = normalizeAuditZone(item.room || '');
                const itemType = normalizeAuditZone(item.type || '');
                if (normalizedTeam && itemTeam && itemTeam !== normalizedTeam) return false;
                if (normalizedRoom && itemRoom && itemRoom !== normalizedRoom) return false;
                if (normalizedType && itemType && itemType !== normalizedType) return false;
                if (normalizedTeam && !itemTeam && normalizedRoom && !itemRoom && normalizedType && !itemType) return false;
                return true;
            };

            const sorted = (standards || []).slice();
            // Try most specific first: team+room+type, then room+type, then type-only
            const candidates = [
                item => normalizedTeam && normalizedRoom && normalizedType && normalizeAuditZone(item.team || '') === normalizedTeam && normalizeAuditZone(item.room || '') === normalizedRoom && normalizeAuditZone(item.type || '') === normalizedType,
                item => normalizedRoom && normalizedType && normalizeAuditZone(item.room || '') === normalizedRoom && normalizeAuditZone(item.type || '') === normalizedType,
                item => normalizedType && normalizeAuditZone(item.type || '') === normalizedType
            ];
            for (const predicate of candidates) {
                const found = sorted.find(item => (item.team || item.room || item.type) && predicate(item));
                if (found) {
                    const value = parseFloat(found.standard);
                    if (!Number.isNaN(value)) {
                        return { value, label: String(found.standard || value) };
                    }
                }
            }

            for (const item of sorted) {
                if (item.team || item.room || item.type) continue;
                const zone = normalizeAuditZone(item.zone || '');
                if (!zone) continue;
                const candidatesLegacy = new Set([normalizedRoom, normalizedType].filter(Boolean));
                if (candidatesLegacy.has(zone)) {
                    const value = parseFloat(item.standard);
                    if (!Number.isNaN(value)) {
                        return { value, label: String(item.standard || value) };
                    }
                }
            }
            return null;
        }

        function getAuditTypeOptions(standards, team, room) {
            const normalizedTeam = normalizeAuditZone(team || '');
            const normalizedRoom = normalizeAuditZone(room || '');
            if (!normalizedRoom) return [];
            const list = (standards || []).filter(item => {
                const itemTeam = normalizeAuditZone(item.team || '');
                const itemRoom = normalizeAuditZone(item.room || '');
                if (normalizedTeam && itemTeam && itemTeam !== normalizedTeam) return false;
                if (normalizedRoom && itemRoom && itemRoom !== normalizedRoom) return false;
                return true;
            }).map(item => item.type || '').filter(Boolean);
            return Array.from(new Set(list));
        }

        function renderAuditTeamChip(team) {
            const info = getEquipIconInfo(team);
            const color = info.color || '#94a3b8';
            const icon = info.icon || 'fa-folder';
            const safeTeam = escapeHtml(team || '');
            const label = safeTeam || '미지정';
            const chipStyle = `background:${color}14;border-color:${color}55;color:${color};`;
            return `<span class="audit-team-chip" style="${chipStyle}"><i class="fas ${icon}"></i>${label}</span>`;
        }

        function getAuditValueStatus(value, standardInfo) {
            const numeric = parseFloat(value);
            const standardValue = standardInfo?.value;
            const standardLabel = standardInfo?.label || (standardValue ?? '');
            if (standardValue === null || standardValue === undefined || Number.isNaN(standardValue)) {
                return { state: 'none', label: '기준 없음' };
            }
            if (Number.isNaN(numeric)) {
                return { state: 'none', label: `기준 ${standardLabel}` };
            }
            if (numeric < standardValue) {
                return { state: 'fail', label: `미달 (${standardLabel})` };
            }
            return { state: 'pass', label: `충족 (${standardLabel})` };
        }

        function renderAuditStatusBadge(status) {
            if (!status) return '';
            return `
                <span class="audit-status-badge ${status.state}">
                    <span class="audit-status-dot"></span>
                    ${escapeHtml(status.label)}
                </span>
            `;
        }

        function saveAuditData(dataKey, data) {
            const serverRuntime = getAuditServerRuntimeConfig(dataKey);
            if (!(window.KpiRuntime?.canUseServerWrite?.(serverRuntime?.writeEnabled === true))) {
                return false;
            }
            data.meta = data.meta || {};
            data.meta.updatedAt = new Date().toISOString();
            syncAuditPortalDataCache(dataKey, data);
            return queueAuditServerWrite(dataKey, data);
        }

        function getAuditEvidenceList(dataKey) {
            const data = getAuditData(dataKey);
            return Array.isArray(data.evidence) ? data.evidence : [];
        }

        function getAuditEvidenceViewUrl(item) {
            const previewUrl = String(item?.previewUrl || item?.viewUrl || '').trim();
            if (previewUrl) return previewUrl;
            const documentId = String(item?.documentId || item?.fileId || '').trim();
            if (documentId) return `/api/files/${encodeURIComponent(documentId)}/view`;
            return resolveAuditEvidenceFileUrl(item?.file || item?.path || '');
        }

        function getAuditEvidenceDownloadUrl(item) {
            const downloadUrl = String(item?.downloadUrl || '').trim();
            if (downloadUrl) return downloadUrl;
            const documentId = String(item?.documentId || item?.fileId || '').trim();
            if (documentId) return `/api/files/${encodeURIComponent(documentId)}/download`;
            return resolveAuditEvidenceFileUrl(item?.file || item?.path || '');
        }

        function getAuditEvidenceFileLabel(item) {
            const explicit = String(item?.fileName || item?.name || item?.originalName || '').trim();
            if (explicit) return explicit;
            const file = String(item?.file || item?.path || '').trim();
            if (!file) return '';
            return file.split('/').pop() || file.split('\\').pop() || file;
        }

        function isAuditEvidencePdf(item) {
            const mimeType = String(item?.mimeType || item?.mime_type || '').trim().toLowerCase();
            if (mimeType === 'application/pdf') return true;
            const fileLabel = getAuditEvidenceFileLabel(item).toLowerCase();
            return fileLabel.endsWith('.pdf');
        }

        function resolveAuditEvidenceFileUrl(file) {
            const rawFile = String(file || '').trim();
            if (!rawFile) return '';
            const normalizedFile = rawFile
                .replace(/^03_★★★_Audit\//, 'audit/')
                .replace(/^03_\*\*\*_Audit\//, 'audit/');
            try {
                return new URL(normalizedFile, window.location.href).toString();
            } catch (err) {
                return encodeURI(normalizedFile);
            }
        }

        function normalizeAuditRotation(angle) {
            const numeric = Number(angle);
            if (!Number.isFinite(numeric)) return 0;
            const normalized = numeric % 360;
            return normalized < 0 ? normalized + 360 : normalized;
        }

        function normalizeAuditLuxStandardHistory(history) {
            return (Array.isArray(history) ? history : [])
                .map((item) => {
                    const effectiveFromYear = Number(item?.effectiveFromYear ?? item?.year);
                    const standard = String(item?.standard || item?.value || '').trim();
                    if (!Number.isFinite(effectiveFromYear) || !standard) return null;
                    return {
                        effectiveFromYear,
                        standard
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.effectiveFromYear - b.effectiveFromYear);
        }

        function resolveAuditLuxStandardForYear(item, year) {
            let standard = String(item?.standard || '').trim();
            const targetYear = Number(year);
            if (!Number.isFinite(targetYear)) return standard;
            normalizeAuditLuxStandardHistory(item?.standardHistory).forEach((entry) => {
                if (entry.effectiveFromYear <= targetYear) {
                    standard = entry.standard;
                }
            });
            return standard;
        }

        function setAuditLuxStandardForYear(item, year, nextStandard) {
            if (!item || typeof item !== 'object') return;
            const targetYear = Number(year);
            const normalizedStandard = String(nextStandard || '').trim();
            if (!Number.isFinite(targetYear) || !normalizedStandard) return;
            if (targetYear <= AUDIT_LUX_BASE_YEAR) {
                item.standard = normalizedStandard;
                item.standardHistory = normalizeAuditLuxStandardHistory(item?.standardHistory)
                    .filter((entry) => entry.effectiveFromYear > AUDIT_LUX_BASE_YEAR);
                if (!item.standardHistory.length) delete item.standardHistory;
                return;
            }
            const nextHistory = normalizeAuditLuxStandardHistory(item?.standardHistory)
                .filter((entry) => entry.effectiveFromYear !== targetYear);
            nextHistory.push({
                effectiveFromYear: targetYear,
                standard: normalizedStandard
            });
            item.standardHistory = nextHistory.sort((a, b) => a.effectiveFromYear - b.effectiveFromYear);
        }

        function makeAuditLuxEvidenceId(year, team) {
            const safeYear = Number(year);
            const safeTeam = normalizeAuditZone(team || '').replace(/[^a-z0-9]+/g, '-') || 'team';
            return `audit-lux-${safeYear}-${safeTeam}`;
        }

        function getAuditLuxYearEvidenceItem(dataKey, year, team) {
            if (String(dataKey || '').trim() !== 'audit_lux') return null;
            const normalizedTeam = normalizeAuditZone(team || '');
            if (!normalizedTeam) return null;
            const targetYear = Number(year);
            return getAuditEvidenceList(dataKey).find((item) => (
                normalizeAuditZone(item?.team || '') === normalizedTeam
                && Number(item?.year) === targetYear
            )) || null;
        }

        function makeAuditLuxSheetRowKey(team, room, type) {
            return [
                normalizeAuditZone(team || ''),
                normalizeAuditZone(room || ''),
                normalizeAuditZone(type || '')
            ].join('::');
        }

        function getAuditLuxWorkspaceRows(dataKey, year, team) {
            if (String(dataKey || '').trim() !== 'audit_lux') return [];
            const normalizedTeam = normalizeAuditZone(team || '');
            const targetYear = Number(year);
            if (!normalizedTeam || !Number.isFinite(targetYear)) return [];
            const data = getAuditData(dataKey, dataKey);
            const entryMap = new Map();
            (Array.isArray(data.entries) ? data.entries : []).forEach((item) => {
                if (Number(item?.year) !== targetYear) return;
                if (normalizeAuditZone(item?.team || '') !== normalizedTeam) return;
                const quarter = Number(item?.quarter);
                if (!Number.isFinite(quarter) || quarter < 1 || quarter > 4) return;
                const rowKey = makeAuditLuxSheetRowKey(item?.team, item?.room, item?.type);
                const bucket = entryMap.get(rowKey) || {};
                bucket[quarter] = String(item?.value ?? '').trim();
                entryMap.set(rowKey, bucket);
            });
            return (Array.isArray(data.standards) ? data.standards : [])
                .filter((item) => normalizeAuditZone(item?.team || '') === normalizedTeam)
                .map((item, index) => {
                    const rowKey = makeAuditLuxSheetRowKey(item?.team, item?.room, item?.type);
                    const savedValues = entryMap.get(rowKey) || {};
                    return {
                        order: index + 1,
                        rowKey,
                        team: String(item?.team || '').trim(),
                        room: String(item?.room || '').trim(),
                        type: String(item?.type || item?.zone || '').trim(),
                        standard: resolveAuditLuxStandardForYear(item, targetYear) || String(item?.standard || '').trim(),
                        baseStandard: String(item?.standard || '').trim(),
                        values: {
                            1: String(savedValues[1] ?? '').trim(),
                            2: String(savedValues[2] ?? '').trim(),
                            3: String(savedValues[3] ?? '').trim(),
                            4: String(savedValues[4] ?? '').trim()
                        }
                    };
                });
        }

        function getAuditLuxYearNote(dataKey, year, team) {
            if (String(dataKey || '').trim() !== 'audit_lux') return '';
            const targetYear = Number(year);
            const normalizedTeam = normalizeAuditZone(team || '');
            if (!Number.isFinite(targetYear) || !normalizedTeam) return '';
            const data = getAuditData(dataKey, dataKey);
            const explicitNote = (Array.isArray(data.yearNotes) ? data.yearNotes : []).find((item) => (
                Number(item?.year) === targetYear
                && normalizeAuditZone(item?.team || '') === normalizedTeam
            ));
            if (explicitNote) {
                return String(explicitNote.note || '').trim();
            }
            const entryNote = (Array.isArray(data.entries) ? data.entries : []).find((item) => (
                Number(item?.year) === targetYear
                && normalizeAuditZone(item?.team || '') === normalizedTeam
                && String(item?.note || '').trim()
            ));
            return String(entryNote?.note || '').trim();
        }

        function setAuditLuxYearNote(data, year, team, note) {
            if (!data || typeof data !== 'object') return;
            const targetYear = Number(year);
            const normalizedTeam = normalizeAuditZone(team || '');
            if (!Number.isFinite(targetYear) || !normalizedTeam) return;
            const nextNote = String(note || '').trim();
            const nextNotes = (Array.isArray(data.yearNotes) ? data.yearNotes : [])
                .filter((item) => !(
                    Number(item?.year) === targetYear
                    && normalizeAuditZone(item?.team || '') === normalizedTeam
                ));
            if (nextNote) {
                nextNotes.push({
                    year: targetYear,
                    team: String(team || '').trim(),
                    note: nextNote
                });
            }
            if (nextNotes.length) data.yearNotes = nextNotes;
            else delete data.yearNotes;
        }

        function validateAuditLuxEvidenceFile(file) {
            if (!(file instanceof File)) {
                throw new Error('invalid_file');
            }
            const mimeType = String(file.type || '').trim().toLowerCase();
            const fileName = String(file.name || '').trim().toLowerCase();
            const isSupportedImage = mimeType.startsWith('image/');
            const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf');
            if (!isSupportedImage && !isPdf) {
                throw new Error('unsupported_type');
            }
            if (Number(file.size || 0) > AUDIT_LUX_EVIDENCE_MAX_BYTES) {
                throw new Error('file_too_large');
            }
        }

        function readAuditLuxEvidenceAsBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = String(reader.result || '');
                    const commaIndex = result.indexOf(',');
                    resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
                };
                reader.onerror = () => reject(reader.error || new Error('audit_lux_evidence_read_failed'));
                reader.readAsDataURL(file);
            });
        }

        function getAuditLuxEvidenceUploadName(file, year, team) {
            const sourceName = String(file?.name || '').trim();
            const sourceMimeType = String(file?.type || '').trim().toLowerCase();
            const nameMatch = sourceName.match(/(\.[A-Za-z0-9]{1,16})$/);
            const ext = nameMatch?.[1]
                || (sourceMimeType === 'application/pdf' ? '.pdf' : '')
                || (sourceMimeType === 'image/png' ? '.png' : '')
                || (sourceMimeType === 'image/webp' ? '.webp' : '')
                || (sourceMimeType === 'image/gif' ? '.gif' : '')
                || (sourceMimeType.startsWith('image/') ? '.jpg' : '');
            return `${Number(year)} ${String(team || '').trim()} 조도${ext}`;
        }

        async function uploadAuditLuxEvidenceToServer(dataKey, year, team, file) {
            const runtime = getAuditServerRuntimeConfig(dataKey);
            if (!(window.KpiRuntime?.canUseServerWrite?.(runtime?.writeEnabled === true)) || typeof fetch !== 'function') {
                throw new Error('server_write_unavailable');
            }
            validateAuditLuxEvidenceFile(file);
            const originalName = getAuditLuxEvidenceUploadName(file, year, team);
            const mimeType = String(file?.type || '').trim() || 'application/octet-stream';
            const base64Data = await readAuditLuxEvidenceAsBase64(file);
            const response = await fetch(`${runtime.apiBase.replace(/\/+$/, '')}/files/base64`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    permissionKey: runtime.permissionKey,
                    ownerDomain: AUDIT_LUX_EVIDENCE_OWNER_DOMAIN,
                    ownerKey: `${String(dataKey || '').trim()}:${Number(year)}:${String(team || '').trim()}`,
                    fileCategory: 'evidence',
                    originalName,
                    mimeType,
                    base64Data,
                    metadata: {
                        dataKey: String(dataKey || '').trim(),
                        year: Number(year),
                        team: String(team || '').trim(),
                        originalName,
                        storageFolder: AUDIT_LUX_EVIDENCE_STORAGE_FOLDER
                    }
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.ok || !payload?.document?.id) {
                throw new Error(payload?.error || `http_${response.status}`);
            }
            const document = payload.document;
            return {
                id: makeAuditLuxEvidenceId(year, team),
                team: String(team || '').trim(),
                year: Number(year),
                documentId: String(document.id || '').trim(),
                fileName: String(document.original_name || originalName).trim(),
                originalName: String(document.original_name || originalName).trim(),
                mimeType: String(document.mime_type || mimeType).trim(),
                previewUrl: String(document.preview_url || `/api/files/${document.id}/view`).trim(),
                downloadUrl: String(document.download_url || `/api/files/${document.id}/download`).trim(),
                rotate: 0
            };
        }

        async function deleteAuditEvidenceFromServer(item) {
            const documentId = String(item?.documentId || item?.fileId || '').trim();
            if (!documentId || typeof fetch !== 'function') return true;
            const response = await fetch(`/api/files/${encodeURIComponent(documentId)}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (response.status === 404) return true;
            if (!response.ok) {
                throw new Error(`http_${response.status}`);
            }
            return true;
        }

        async function replaceAuditLuxEvidenceForYear(dataKey, year, team, file) {
            if (String(dataKey || '').trim() !== 'audit_lux') {
                throw new Error('invalid_data_key');
            }
            const normalizedTeam = String(team || '').trim();
            const targetYear = Number(year);
            if (!normalizedTeam || !Number.isFinite(targetYear)) {
                throw new Error('invalid_target');
            }
            const data = getAuditData(dataKey, dataKey);
            const currentEvidence = getAuditLuxYearEvidenceItem(dataKey, targetYear, normalizedTeam);
            const uploaded = await uploadAuditLuxEvidenceToServer(dataKey, targetYear, normalizedTeam, file);
            const nextEvidence = (Array.isArray(data.evidence) ? data.evidence : [])
                .filter((item) => !(Number(item?.year) === targetYear && normalizeAuditZone(item?.team || '') === normalizeAuditZone(normalizedTeam)));
            nextEvidence.push(uploaded);
            data.evidence = nextEvidence.sort((a, b) => {
                const yearDiff = Number(b?.year || 0) - Number(a?.year || 0);
                if (yearDiff !== 0) return yearDiff;
                return String(a?.team || '').localeCompare(String(b?.team || ''), 'ko');
            });
            await saveAuditData(dataKey, data);
            if (currentEvidence?.documentId && currentEvidence.documentId !== uploaded.documentId) {
                try {
                    await deleteAuditEvidenceFromServer(currentEvidence);
                } catch (error) {
                    console.warn('[kpi] audit evidence delete failed', dataKey, currentEvidence.documentId, error);
                }
            }
            return uploaded;
        }

        function getAuditLuxEntryPreviewItem(dataKey, year, team) {
            if (String(dataKey || '').trim() !== 'audit_lux') return null;
            const normalizedTeam = normalizeAuditZone(team || '');
            if (!normalizedTeam) return null;
            const targetYear = Number(year);
            const teamMatches = getAuditEvidenceList(dataKey)
                .filter(item => normalizeAuditZone(item?.team || '') === normalizedTeam)
                .sort((a, b) => Number(b?.year || 0) - Number(a?.year || 0));
            if (!teamMatches.length) return null;
            const exact = teamMatches.find(item => Number(item?.year) === targetYear);
            if (exact) return { ...exact, previewFallback: false };
            return { ...teamMatches[0], previewFallback: true };
        }

        function getAuditLuxEntryPreviewRotation(dataKey, item) {
            const baseRotation = Number.isFinite(parseFloat(item?.rotate)) ? parseFloat(item.rotate) : 0;
            const offset = Number(AuditState?.luxPreviewRotation?.[dataKey]?.[String(item?.id || '').trim()] || 0);
            return normalizeAuditRotation(baseRotation + offset);
        }

        function setAuditLuxEntryPreviewRotationOffset(dataKey, evidenceId, offset) {
            const normalizedDataKey = String(dataKey || '').trim();
            const normalizedId = String(evidenceId || '').trim();
            if (!normalizedDataKey || !normalizedId) return;
            if (!AuditState.luxPreviewRotation[normalizedDataKey]) {
                AuditState.luxPreviewRotation[normalizedDataKey] = {};
            }
            AuditState.luxPreviewRotation[normalizedDataKey][normalizedId] = normalizeAuditRotation(offset);
        }

        function renderAuditLuxEntryPreviewHtml(dataKey, year, team) {
            const previewItem = getAuditLuxEntryPreviewItem(dataKey, year, team);
            if (!String(team || '').trim()) {
                return `
                    <div class="audit-lux-preview-card" data-audit-lux-preview="${escapeHtml(dataKey)}">
                        <div class="audit-lux-preview-empty">팀을 먼저 선택하면 스캔본 미리보기가 표시됩니다.</div>
                    </div>
                `;
            }
            if (!previewItem) {
                return `
                    <div class="audit-lux-preview-card" data-audit-lux-preview="${escapeHtml(dataKey)}">
                        <div class="audit-lux-preview-empty">등록된 스캔본이 없습니다.</div>
                    </div>
                `;
            }
            const title = `${String(previewItem.team || team).trim()} ${String(previewItem.year || year).trim()}년 스캔본`;
            const fileUrl = resolveAuditEvidenceFileUrl(previewItem.file || previewItem.path || '');
            if (!fileUrl) {
                return `
                    <div class="audit-lux-preview-card" data-audit-lux-preview="${escapeHtml(dataKey)}">
                        <div class="audit-lux-preview-empty">스캔본 파일 경로가 없습니다.</div>
                    </div>
                `;
            }
            const rotation = getAuditLuxEntryPreviewRotation(dataKey, previewItem);
            const encodedId = encodeURIComponent(String(previewItem.id || '').trim());
            const sourceText = previewItem.previewFallback
                ? `선택 연도 스캔본이 없어 ${previewItem.year}년 최신 등록본을 표시 중입니다.`
                : `${previewItem.year}년 스캔본을 표시 중입니다.`;
            return `
                <div class="audit-lux-preview-card" data-audit-lux-preview="${escapeHtml(dataKey)}">
                    <div class="audit-lux-preview-head">
                        <div class="audit-lux-preview-copy">
                            <div class="audit-lux-preview-title">스캔본 미리보기</div>
                            <div class="audit-lux-preview-meta">${escapeHtml(title)}</div>
                        </div>
                        <div class="audit-filter-actions">
                            <button type="button" class="work-btn" onclick="rotateAuditLuxEntryPreview('${escapeJs(dataKey)}', -90)">왼쪽 회전</button>
                            <button type="button" class="work-btn" onclick="rotateAuditLuxEntryPreview('${escapeJs(dataKey)}', 90)">오른쪽 회전</button>
                            <button type="button" class="work-btn audit-ref-open" onclick="openAuditEvidence('${escapeJs(dataKey)}', '${encodedId}')">원본 열기</button>
                        </div>
                    </div>
                    <div class="audit-lux-preview-stage">
                        <img
                            class="audit-lux-preview-image"
                            data-audit-lux-preview-image
                            src="${fileUrl}"
                            alt="${escapeHtml(title)}"
                            loading="lazy"
                            decoding="async"
                            style="transform: rotate(${rotation}deg);"
                        />
                    </div>
                    <div class="audit-lux-preview-foot">
                        <span class="audit-lux-preview-angle" data-audit-lux-preview-angle>회전 ${rotation}°</span>
                        <span class="audit-lux-preview-origin">${escapeHtml(sourceText)}</span>
                    </div>
                </div>
            `;
        }

        function rotateAuditLuxEntryPreview(dataKey, delta) {
            const entryForm = typeof getAuditEntryFormState === 'function' ? getAuditEntryFormState(dataKey) : null;
            if (!entryForm) return;
            const previewItem = getAuditLuxEntryPreviewItem(dataKey, entryForm.year, entryForm.team);
            if (!previewItem?.id) return;
            const baseRotation = Number.isFinite(parseFloat(previewItem.rotate)) ? parseFloat(previewItem.rotate) : 0;
            const currentRotation = getAuditLuxEntryPreviewRotation(dataKey, previewItem);
            const currentOffset = normalizeAuditRotation(currentRotation - baseRotation);
            setAuditLuxEntryPreviewRotationOffset(dataKey, previewItem.id, currentOffset + Number(delta || 0));
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function initAuditEvidenceState(dataKey, evidenceList) {
            if (!AuditState.evidenceOpen[dataKey]) AuditState.evidenceOpen[dataKey] = {};
            const openState = AuditState.evidenceOpen[dataKey];
            const teams = Array.from(new Set((evidenceList || []).map(item => item.team).filter(Boolean)));
            teams.forEach((team, idx) => {
                if (openState[team] === undefined) openState[team] = idx === 0;
            });
        }

        function toggleAuditEvidenceGroup(dataKey, teamKey, groupId) {
            const team = decodeURIComponent(teamKey || '');
            if (!AuditState.evidenceOpen[dataKey]) AuditState.evidenceOpen[dataKey] = {};
            const current = !!AuditState.evidenceOpen[dataKey][team];
            AuditState.evidenceOpen[dataKey][team] = !current;
            const groupEl = document.getElementById(groupId);
            if (groupEl) groupEl.classList.toggle('is-collapsed', current);
        }

        function filterAuditEvidence(evidenceList, filter) {
            let filtered = (evidenceList || []).slice();
            if (filter?.team) {
                const teamKey = normalizeAuditZone(filter.team);
                filtered = filtered.filter(item => normalizeAuditZone(item.team || '') === teamKey);
            }
            if (filter?.startQuarter && filter?.endQuarter) {
                const range = normalizeQuarterRange(filter.startQuarter, filter.endQuarter);
                const startYear = parseQuarterKey(range.start)?.year;
                const endYear = parseQuarterKey(range.end)?.year;
                if (startYear && endYear) {
                    filtered = filtered.filter(item => {
                        const year = parseInt(item.year, 10);
                        if (Number.isNaN(year)) return false;
                        return year >= startYear && year <= endYear;
                    });
                }
            }
            return filtered;
        }

        function renderAuditEvidencePreviewHtml(dataKey, item) {
            if (!item) {
                return `<div class="audit-ref-empty">좌측에서 항목을 선택하세요.</div>`;
            }
            const titleParts = [];
            if (item.team) titleParts.push(item.team);
            if (item.year) titleParts.push(String(item.year) + '년');
            const title = titleParts.join(' ') || '조도 스캔본';
            const file = item.file || item.path || '';
            if (!file) {
                return `<div class="audit-ref-empty">파일 경로가 없습니다.</div>`;
            }
            const rotate = Number.isFinite(parseFloat(item.rotate)) ? parseFloat(item.rotate) : 0;
            const rotateStyle = rotate ? ` style="transform: rotate(${rotate}deg);"` : '';
            const imagePath = resolveAuditEvidenceFileUrl(file);
            const encodedId = encodeURIComponent(item.id || '');
            return `
                <div class="audit-ref-preview">
                    <img class="audit-ref-image" src="${imagePath}" alt="${escapeHtml(title)}" loading="lazy" decoding="async"${rotateStyle} />
                    <div class="audit-ref-meta">
                        <div>
                            <div class="audit-ref-meta-title">${escapeHtml(title)}</div>
                        </div>
                        <button class="work-btn audit-ref-open" onclick="openAuditEvidence('${dataKey}', '${encodedId}')">원본 열기</button>
                    </div>
                </div>
            `;
        }

        function selectAuditEvidence(dataKey, evidenceKey) {
            const id = decodeURIComponent(evidenceKey || '');
            AuditState.evidenceSelected[dataKey] = id;
            const wrap = document.querySelector(`[data-audit-evidence="${dataKey}"]`);
            if (!wrap) return;
            wrap.querySelectorAll('[data-evidence-item]').forEach(el => {
                el.classList.toggle('is-selected', el.dataset.evidenceId === id);
            });
            const preview = wrap.querySelector('[data-evidence-preview]');
            if (!preview) return;
            const list = getAuditEvidenceList(dataKey);
            const selected = list.find(item => item.id === id);
            preview.innerHTML = renderAuditEvidencePreviewHtml(dataKey, selected);
            preview.classList.toggle('has-image', !!selected?.file || !!selected?.path);
        }

        function openAuditEvidence(dataKey, evidenceKey) {
            const id = decodeURIComponent(evidenceKey || '');
            const list = getAuditEvidenceList(dataKey);
            const item = list.find(entry => entry.id === id);
            if (!item) return;
            const file = item.file || item.path || '';
            if (!file) return;
            let url = '';
            try {
                url = new URL(file, window.location.href).toString();
            } catch (err) {
                url = encodeURI(file);
            }
            window.open(url, '_blank');
        }

        function printAuditEvidence(dataKey) {
            const list = AuditState.evidenceCache?.[dataKey] || [];
            if (!list.length) {
                alert('검색 결과가 없습니다.');
                return;
            }
            const selectedId = AuditState.evidenceSelected?.[dataKey];
            let items = [];
            if (selectedId) {
                const found = list.find(entry => entry.id === selectedId);
                if (found) items = [found];
            }
            if (!items.length) items = list;

            const pages = items.map(item => {
                const file = item.file || item.path || '';
                if (!file) return '';
                const rotate = Number.isFinite(parseFloat(item.rotate)) ? parseFloat(item.rotate) : 0;
                const rotateStyle = rotate ? ` style="transform: rotate(${rotate}deg);"` : '';
                let imagePath = '';
                try {
                    imagePath = new URL(file, window.location.href).toString();
                } catch (err) {
                    imagePath = encodeURI(file);
                }
                const titleParts = [];
                if (item.team) titleParts.push(item.team);
                if (item.year) titleParts.push(String(item.year) + '년');
                const title = titleParts.join(' ') || '조도 스캔본';
                return `
                    <div class="print-page">
                        <div class="print-title">${escapeHtml(title)}</div>
                        <img class="print-image" src="${imagePath}" alt="${escapeHtml(title)}"${rotateStyle} />
                    </div>
                `;
            }).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8" />
                    <title>조도 스캔본 인쇄</title>
                    <style>
                        @page { margin: 12mm; }
                        body { margin: 0; font-family: 'Noto Sans KR', sans-serif; color: #0f172a; }
                        .print-page { page-break-after: always; display: flex; flex-direction: column; align-items: center; gap: 10px; }
                        .print-title { font-size: 14px; font-weight: 700; }
                        .print-image { max-width: 100%; max-height: 92vh; object-fit: contain; image-orientation: from-image; border: 1px solid #e2e8f0; }
                        .print-page:last-child { page-break-after: auto; }
                    </style>
                </head>
                <body>
                    ${pages}
                </body>
                </html>
            `;
            const win = window.open('', '_blank');
            if (!win) return;
            win.document.open();
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 250);
        }

        function getQuarterInfo(date) {
            const month = date.getMonth(); // 0-11
            const quarter = Math.floor(month / 3) + 1;
            return { year: date.getFullYear(), quarter };
        }

        function makeQuarterKey(year, quarter) {
            return `${year}-Q${quarter}`;
        }

        function parseQuarterKey(key) {
            const match = /^(\d{4})-Q([1-4])$/.exec(key || '');
            if (!match) return null;
            return { year: parseInt(match[1], 10), quarter: parseInt(match[2], 10) };
        }

        function quarterIndex(key) {
            const parsed = parseQuarterKey(key);
            if (!parsed) return null;
            return parsed.year * 4 + (parsed.quarter - 1);
        }

        function normalizeQuarterRange(startKey, endKey) {
            const now = getQuarterInfo(new Date());
            const fallback = makeQuarterKey(now.year, now.quarter);
            let start = startKey || fallback;
            let end = endKey || fallback;
            const startIdx = quarterIndex(start);
            const endIdx = quarterIndex(end);
            if (startIdx === null || endIdx === null) {
                start = fallback;
                end = fallback;
            } else if (startIdx > endIdx) {
                const tmp = start;
                start = end;
                end = tmp;
            }
            return { start, end };
        }
