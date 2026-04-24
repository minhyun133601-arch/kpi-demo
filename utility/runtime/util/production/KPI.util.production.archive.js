        function openUtilProductionArchiveDb() {
            if (utilProductionArchiveDbPromise) return utilProductionArchiveDbPromise;
            if (!('indexedDB' in window)) {
                utilProductionArchiveDbPromise = Promise.resolve(null);
                return utilProductionArchiveDbPromise;
            }
            utilProductionArchiveDbPromise = new Promise(resolve => {
                const request = indexedDB.open(UTIL_PRODUCTION_ARCHIVE_DB_NAME, 1);
                request.onupgradeneeded = event => {
                    const db = event.target?.result;
                    if (!db) return;
                    if (!db.objectStoreNames.contains(UTIL_PRODUCTION_ARCHIVE_STORE)) {
                        db.createObjectStore(UTIL_PRODUCTION_ARCHIVE_STORE, { keyPath: 'id' });
                    }
                };
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
                request.onblocked = () => resolve(null);
            });
            return utilProductionArchiveDbPromise;
        }

        function putUtilProductionArchiveRecord(db, record) {
            return new Promise(resolve => {
                if (!db || !record?.id) {
                    resolve(false);
                    return;
                }
                let finished = false;
                const done = result => {
                    if (finished) return;
                    finished = true;
                    resolve(result);
                };
                try {
                    const tx = db.transaction(UTIL_PRODUCTION_ARCHIVE_STORE, 'readwrite');
                    const store = tx.objectStore(UTIL_PRODUCTION_ARCHIVE_STORE);
                    const request = store.put(record);
                    request.onsuccess = () => done(true);
                    request.onerror = () => done(false);
                    tx.onabort = () => done(false);
                    tx.onerror = () => done(false);
                } catch (error) {
                    done(false);
                }
            });
        }

        function getUtilProductionArchiveRecord(db, id) {
            return new Promise(resolve => {
                if (!db || !id) {
                    resolve(null);
                    return;
                }
                try {
                    const tx = db.transaction(UTIL_PRODUCTION_ARCHIVE_STORE, 'readonly');
                    const store = tx.objectStore(UTIL_PRODUCTION_ARCHIVE_STORE);
                    const request = store.get(id);
                    request.onsuccess = () => resolve(request.result || null);
                    request.onerror = () => resolve(null);
                } catch (error) {
                    resolve(null);
                }
            });
        }

        function deleteUtilProductionArchiveRecord(db, id) {
            return new Promise(resolve => {
                if (!db || !id) {
                    resolve(false);
                    return;
                }
                let finished = false;
                const done = result => {
                    if (finished) return;
                    finished = true;
                    resolve(result);
                };
                try {
                    const tx = db.transaction(UTIL_PRODUCTION_ARCHIVE_STORE, 'readwrite');
                    const store = tx.objectStore(UTIL_PRODUCTION_ARCHIVE_STORE);
                    const request = store.delete(id);
                    request.onsuccess = () => done(true);
                    request.onerror = () => done(false);
                    tx.onabort = () => done(false);
                    tx.onerror = () => done(false);
                } catch (error) {
                    done(false);
                }
            });
        }

        function clearUtilProductionArchiveStore(db) {
            return new Promise(resolve => {
                if (!db) {
                    resolve(false);
                    return;
                }
                let finished = false;
                const done = result => {
                    if (finished) return;
                    finished = true;
                    resolve(result);
                };
                try {
                    const tx = db.transaction(UTIL_PRODUCTION_ARCHIVE_STORE, 'readwrite');
                    const store = tx.objectStore(UTIL_PRODUCTION_ARCHIVE_STORE);
                    const request = store.clear();
                    request.onsuccess = () => done(true);
                    request.onerror = () => done(false);
                    tx.onabort = () => done(false);
                    tx.onerror = () => done(false);
                } catch (error) {
                    done(false);
                }
            });
        }

        function getUtilProductionArchiveServerRuntimeConfig() {
            return window.KpiUtilityServerRuntime && typeof window.KpiUtilityServerRuntime.getUtilProductionArchiveServerRuntimeConfig === 'function'
                ? window.KpiUtilityServerRuntime.getUtilProductionArchiveServerRuntimeConfig()
                : null;
        }

        function supportsUtilProductionArchiveServerPersistence() {
            return Boolean(
                window.KpiUtilityServerRuntime
                && typeof window.KpiUtilityServerRuntime.supportsUtilProductionArchiveServerPersistence === 'function'
                && window.KpiUtilityServerRuntime.supportsUtilProductionArchiveServerPersistence()
            );
        }

        function getUtilProductionArchiveDocumentId(item) {
            return String(item?.documentId || item?.id || '').trim();
        }

        function buildUtilProductionArchiveViewUrl(item) {
            const explicit = String(item?.previewUrl || '').trim();
            if (explicit) return explicit;
            const runtime = getUtilProductionArchiveServerRuntimeConfig();
            const documentId = getUtilProductionArchiveDocumentId(item);
            if (!runtime || !documentId) return '';
            return `${String(runtime.apiBase || '/api').replace(/\/+$/, '')}/files/${encodeURIComponent(documentId)}/view`;
        }

        function buildUtilProductionArchiveDownloadUrl(item) {
            const explicit = String(item?.downloadUrl || '').trim();
            if (explicit) return explicit;
            const runtime = getUtilProductionArchiveServerRuntimeConfig();
            const documentId = getUtilProductionArchiveDocumentId(item);
            if (!runtime || !documentId) return '';
            return `${String(runtime.apiBase || '/api').replace(/\/+$/, '')}/files/${encodeURIComponent(documentId)}/download`;
        }

        async function readUtilProductionArchiveBlobAsBase64(blob) {
            return new Promise((resolve, reject) => {
                if (!(blob instanceof Blob)) {
                    reject(new Error('invalid_archive_blob'));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    const result = String(reader.result || '');
                    const commaIndex = result.indexOf(',');
                    resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
                };
                reader.onerror = () => reject(reader.error || new Error('archive_blob_read_failed'));
                reader.readAsDataURL(blob);
            });
        }

        async function uploadUtilProductionArchiveToServer(source, summary) {
            const runtime = getUtilProductionArchiveServerRuntimeConfig();
            if (!runtime || typeof fetch !== 'function') {
                throw new Error('util_production_archive_server_unavailable');
            }
            const base64Data = await readUtilProductionArchiveBlobAsBase64(source.blob);
            const ownerKey = [
                String(source.folder || '').trim(),
                String(source.fingerprint || '').trim() || String(source.fileName || '').trim()
            ].filter(Boolean).join(':') || 'source_archive';
            const response = await fetch(`${String(runtime.apiBase || '/api').replace(/\/+$/, '')}/files/base64`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    permissionKey: runtime.permissionKey,
                    ownerDomain: runtime.ownerDomain,
                    ownerKey,
                    fileCategory: runtime.fileCategory,
                    originalName: source.fileName,
                    mimeType: source.type || 'application/octet-stream',
                    base64Data,
                    metadata: {
                        folder: source.folder,
                        fingerprint: source.fingerprint,
                        years: Array.isArray(summary?.years) ? summary.years : [],
                        yearMonths: Array.isArray(summary?.yearMonths) ? summary.yearMonths : [],
                        teams: Array.isArray(summary?.teams) ? summary.teams : []
                    }
                })
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.ok || !payload?.document?.id) {
                throw new Error(payload?.error || `util_production_archive_upload_failed:${response.status}`);
            }
            const documentId = String(payload.document.id || '').trim();
            return {
                id: documentId,
                documentId,
                storage: 'server',
                savedAt: String(payload.document.created_at || new Date().toISOString()),
                previewUrl: buildUtilProductionArchiveViewUrl({ documentId }),
                downloadUrl: buildUtilProductionArchiveDownloadUrl({ documentId })
            };
        }

        async function deleteUtilProductionArchiveStorage(meta, db) {
            const target = meta && typeof meta === 'object' ? meta : {};
            const storage = String(target.storage || '').trim();
            const documentId = getUtilProductionArchiveDocumentId(target);
            if (storage === 'server' || documentId) {
                const runtime = getUtilProductionArchiveServerRuntimeConfig();
                if (!runtime || typeof fetch !== 'function' || !documentId) {
                    return false;
                }
                const response = await fetch(`${String(runtime.apiBase || '/api').replace(/\/+$/, '')}/files/${encodeURIComponent(documentId)}`, {
                    method: 'DELETE',
                    credentials: 'same-origin'
                });
                if (!response.ok && response.status !== 404) {
                    throw new Error(`util_production_archive_delete_failed:${response.status}`);
                }
                return true;
            }
            return deleteUtilProductionArchiveRecord(db, String(target.id || '').trim());
        }

        async function applyUtilProductionHardResetIfNeeded() {
            if (!utilProductionResetPending) return;
            utilProductionResetPending = false;
            if (window.KpiUtilityServerRuntime && typeof window.KpiUtilityServerRuntime.isUtilProductionServerMode === 'function' && window.KpiUtilityServerRuntime.isUtilProductionServerMode()) {
                return;
            }
            (UTIL_PRODUCTION_DAILY_DATA || []).forEach(team => {
                if (!Array.isArray(team?.entries)) {
                    team.entries = [];
                    return;
                }
                team.entries.length = 0;
            });
            UTIL_PRODUCTION_ARCHIVE_META.length = 0;
            refreshUtilProductionDailyIndex();
            persistUtilProductionDailyState();
            const db = await openUtilProductionArchiveDb();
            await clearUtilProductionArchiveStore(db);
            refreshUtilProductionArchiveCountBadges();
            window.dispatchEvent(new CustomEvent('util-production-data-updated', {
                detail: { resetApplied: true }
            }));
        }

        function normalizeUtilProductionArchiveSource(item, folderName = UTIL_PRODUCTION_ARCHIVE_SOURCE_LABEL_DEFAULT) {
            if (!item) return null;
            let blob = null;
            let fileName = '';
            let type = '';
            let size = 0;
            let lastModified = 0;

            if (item instanceof File || item instanceof Blob) {
                blob = item;
                fileName = String(item.name || '').trim();
                type = String(item.type || '').trim();
                size = Number(item.size) || 0;
                lastModified = Number(item.lastModified) || 0;
            } else if (typeof item === 'object') {
                if (item.blob instanceof File || item.blob instanceof Blob) {
                    blob = item.blob;
                } else if (item.file instanceof File || item.file instanceof Blob) {
                    blob = item.file;
                }
                fileName = String(item.fileName || item.name || item?.blob?.name || item?.file?.name || '').trim();
                type = String(item.type || item?.blob?.type || item?.file?.type || '').trim();
                size = Number(item.size ?? item?.blob?.size ?? item?.file?.size ?? 0) || 0;
                lastModified = Number(item.lastModified ?? item?.blob?.lastModified ?? item?.file?.lastModified ?? 0) || 0;
            }

            if (!(blob instanceof Blob) || !fileName) return null;
            if (!type && blob.type) type = blob.type;
            if (!size && Number.isFinite(Number(blob.size))) size = Number(blob.size);
            const fingerprint = buildUtilProductionArchiveFingerprint(fileName, size, lastModified);
            return {
                blob,
                fileName,
                type: type || 'application/octet-stream',
                size: Number.isFinite(size) ? size : 0,
                lastModified: Number.isFinite(lastModified) ? lastModified : 0,
                folder: normalizeUtilProductionArchiveSourceLabel(folderName),
                fingerprint
            };
        }

        async function trimUtilProductionArchiveOverflow(db) {
            if (UTIL_PRODUCTION_ARCHIVE_META.length <= UTIL_PRODUCTION_ARCHIVE_MAX_COUNT) return 0;
            sortUtilProductionArchiveMeta();
            const overflow = UTIL_PRODUCTION_ARCHIVE_META.splice(UTIL_PRODUCTION_ARCHIVE_MAX_COUNT);
            let removedCount = 0;
            for (const item of overflow) {
                if (item?.id) {
                    await deleteUtilProductionArchiveStorage(item, db);
                }
                removedCount += 1;
            }
            return removedCount;
        }

        async function archiveUtilProductionSourceFiles(sourceFiles, options = {}) {
            await applyUtilProductionHardResetIfNeeded();
            const files = Array.isArray(sourceFiles) ? sourceFiles : [];
            const summaryMap = options?.summaryMap || buildUtilProductionArchiveRowSummaryMap(options?.rows || []);
            const useServerStorage = supportsUtilProductionArchiveServerPersistence();
            const buildResult = (overrides = {}) => ({
                savedCount: 0,
                skippedCount: 0,
                failedCount: 0,
                removedCount: 0,
                unsupported: false,
                lookup: buildUtilProductionArchiveLookupMap(),
                ...overrides
            });
            if (!files.length) {
                return buildResult();
            }
            const db = await openUtilProductionArchiveDb();
            if (!useServerStorage && !db) {
                return buildResult({
                    savedCount: 0,
                    skippedCount: 0,
                    failedCount: files.length,
                    removedCount: 0,
                    unsupported: true
                });
            }

            const folderName = normalizeUtilProductionArchiveSourceLabel(options.folderName || UtilProductionArchiveState.folderName);
            UtilProductionArchiveState.folderName = folderName;
            const fingerprintSet = new Set(
                (UTIL_PRODUCTION_ARCHIVE_META || [])
                    .map(item => String(item?.fingerprint || '').trim())
                    .filter(Boolean)
            );

            let savedCount = 0;
            let skippedCount = 0;
            let failedCount = 0;
            let summaryUpdatedCount = 0;
            for (const source of files) {
                const normalized = normalizeUtilProductionArchiveSource(source, folderName);
                if (!normalized) {
                    skippedCount += 1;
                    continue;
                }
                const summary = getUtilProductionArchiveSummaryForSource(normalized, summaryMap);
                if (normalized.fingerprint && fingerprintSet.has(normalized.fingerprint)) {
                    const existing = UTIL_PRODUCTION_ARCHIVE_META.find(item => String(item?.fingerprint || '').trim() === normalized.fingerprint);
                    if (existing && mergeUtilProductionArchiveMetaSummary(existing, summary)) {
                        summaryUpdatedCount += 1;
                    }
                    skippedCount += 1;
                    continue;
                }
                const id = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
                const savedAt = new Date().toISOString();
                const meta = normalizeUtilProductionArchiveMeta({
                    id,
                    fileName: normalized.fileName,
                    size: normalized.size,
                    type: normalized.type,
                    lastModified: normalized.lastModified,
                    savedAt,
                    folder: normalized.folder,
                    fingerprint: normalized.fingerprint,
                    years: summary.years,
                    yearMonths: summary.yearMonths,
                    teams: summary.teams
                });
                if (!meta) {
                    failedCount += 1;
                    continue;
                }
                if (useServerStorage) {
                    try {
                        const uploaded = await uploadUtilProductionArchiveToServer(normalized, summary);
                        meta.id = String(uploaded.id || meta.id).trim() || meta.id;
                        meta.documentId = String(uploaded.documentId || meta.documentId || meta.id).trim();
                        meta.storage = 'server';
                        meta.savedAt = String(uploaded.savedAt || meta.savedAt).trim() || meta.savedAt;
                        meta.previewUrl = String(uploaded.previewUrl || '').trim();
                        meta.downloadUrl = String(uploaded.downloadUrl || '').trim();
                    } catch (error) {
                        console.error('util production archive server upload failed.', error);
                        failedCount += 1;
                        continue;
                    }
                } else {
                    const ok = await putUtilProductionArchiveRecord(db, {
                        ...meta,
                        blob: normalized.blob
                    });
                    if (!ok) {
                        failedCount += 1;
                        continue;
                    }
                }
                UTIL_PRODUCTION_ARCHIVE_META.push(meta);
                if (meta.fingerprint) fingerprintSet.add(meta.fingerprint);
                savedCount += 1;
            }

            sortUtilProductionArchiveMeta();
            const removedCount = await trimUtilProductionArchiveOverflow(db);
            const lookup = buildUtilProductionArchiveLookupMap();
            if (savedCount > 0 || removedCount > 0 || summaryUpdatedCount > 0) persistUtilProductionDailyState();
            refreshUtilProductionArchiveCountBadges();
            return buildResult({
                savedCount,
                skippedCount,
                failedCount,
                removedCount,
                unsupported: false,
                lookup
            });
        }

        async function downloadUtilProductionArchiveFile(archiveId) {
            const id = String(archiveId || '').trim();
            if (!id) return false;
            const meta = (UTIL_PRODUCTION_ARCHIVE_META || []).find(item => String(item?.id || '').trim() === id) || null;
            if (meta && (String(meta.storage || '').trim() === 'server' || getUtilProductionArchiveDocumentId(meta))) {
                const downloadUrl = buildUtilProductionArchiveDownloadUrl(meta);
                if (!downloadUrl) {
                    alert('보관 파일 다운로드 경로를 찾지 못했습니다.');
                    return false;
                }
                const anchor = document.createElement('a');
                anchor.href = downloadUrl;
                anchor.download = String(meta.fileName || 'production.xlsx').trim() || 'production.xlsx';
                anchor.target = '_blank';
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                return true;
            }
            const db = await openUtilProductionArchiveDb();
            const record = await getUtilProductionArchiveRecord(db, id);
            if (!record || !(record.blob instanceof Blob)) {
                alert('보관 파일을 찾지 못했습니다. 다시 등록해 주세요.');
                return false;
            }
            const fileName = String(record.fileName || 'production.xlsx').trim() || 'production.xlsx';
            const url = URL.createObjectURL(record.blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            return true;
        }

        function removeUtilProductionEntriesByArchiveMeta(meta) {
            if (!meta || typeof meta !== 'object') return 0;
            const archiveId = String(meta.id || '').trim();
            const fingerprint = String(meta.fingerprint || '').trim();
            const fileNameKey = normalizeUtilArchiveLookupByFileName(meta.fileName);
            let removedCount = 0;
            (UTIL_PRODUCTION_DAILY_DATA || []).forEach(team => {
                if (!Array.isArray(team?.entries) || !team.entries.length) return;
                const nextEntries = [];
                team.entries.forEach(entry => {
                    const sourceArchiveId = String(entry?.sourceArchiveId || '').trim();
                    const sourceFingerprint = String(entry?.sourceFingerprint || '').trim();
                    const sourceFileNameKey = normalizeUtilArchiveLookupByFileName(entry?.sourceFileName || entry?.fileName);
                    const shouldRemove = (
                        (archiveId && sourceArchiveId && sourceArchiveId === archiveId)
                        || (fingerprint && sourceFingerprint && sourceFingerprint === fingerprint)
                        || (!sourceArchiveId && !sourceFingerprint && fileNameKey && sourceFileNameKey === fileNameKey)
                    );
                    if (shouldRemove) {
                        removedCount += 1;
                        return;
                    }
                    nextEntries.push(entry);
                });
                team.entries = nextEntries;
            });
            if (removedCount > 0) {
                refreshUtilProductionDailyIndex();
                persistUtilProductionDailyState();
            }
            return removedCount;
        }

        function buildUtilProductionDailyKeySetFromRows(rows) {
            const keySet = new Set();
            (Array.isArray(rows) ? rows : []).forEach(row => {
                const rawDate = row?.date ?? row?.values?.[0] ?? '';
                const parsedDate = parseUtilDateKey(rawDate);
                const amount = parseUtilAmount(row?.amount ?? row?.production ?? row?.value ?? row?.values?.[4]);
                const lineName = String(row?.lineName ?? row?.line ?? row?.values?.[2] ?? '').trim();
                const productName = String(row?.productName ?? row?.product ?? row?.itemName ?? row?.values?.[3] ?? '').trim();
                const teamName = String(row?.team ?? row?.teamName ?? row?.values?.[1] ?? '').trim();
                if (!parsedDate || !Number.isFinite(amount) || !teamName) return;
                const key = buildUtilProductionDailyEntryKey({
                    date: formatUtilDailyDateKey(parsedDate),
                    amount,
                    lineName,
                    productName,
                    team: teamName
                });
                if (!key) return;
                keySet.add(key);
            });
            return keySet;
        }

        function removeUtilProductionEntriesByKeySet(keySet) {
            if (!(keySet instanceof Set) || !keySet.size) return 0;
            let removedCount = 0;
            (UTIL_PRODUCTION_DAILY_DATA || []).forEach(team => {
                if (!Array.isArray(team?.entries) || !team.entries.length) return;
                const nextEntries = [];
                team.entries.forEach(entry => {
                    const normalizedEntry = {
                        ...entry,
                        team: String(entry?.team ?? team?.name ?? '').trim()
                    };
                    const key = buildUtilProductionDailyEntryKey(normalizedEntry);
                    if (key && keySet.has(key)) {
                        removedCount += 1;
                        return;
                    }
                    nextEntries.push(entry);
                });
                team.entries = nextEntries;
            });
            if (removedCount > 0) {
                refreshUtilProductionDailyIndex();
                persistUtilProductionDailyState();
                window.dispatchEvent(new CustomEvent('util-production-data-updated', {
                    detail: { removedEntryCount: removedCount, keySetDelete: true }
                }));
            }
            return removedCount;
        }

        function buildUtilProductionArchivePseudoFile(record, fallbackMeta) {
            const blob = record?.blob instanceof Blob ? record.blob : null;
            if (!blob) return null;
            const fileName = String(record?.fileName || fallbackMeta?.fileName || 'production.xlsx').trim() || 'production.xlsx';
            const size = Number(record?.size ?? blob?.size ?? fallbackMeta?.size ?? 0) || Number(blob?.size || 0);
            const lastModified = Number(record?.lastModified ?? fallbackMeta?.lastModified ?? 0) || Date.now();
            return {
                name: fileName,
                size,
                lastModified,
                async arrayBuffer() {
                    return blob.arrayBuffer();
                }
            };
        }

        function buildUtilProductionArchiveReferenceSets() {
            const idSet = new Set();
            const fingerprintSet = new Set();
            const fileNameSet = new Set();
            (UTIL_PRODUCTION_ARCHIVE_META || []).forEach(item => {
                const id = String(item?.id || '').trim();
                const fingerprint = String(item?.fingerprint || '').trim();
                const fileNameKey = normalizeUtilArchiveLookupByFileName(item?.fileName);
                if (id) idSet.add(id);
                if (fingerprint) fingerprintSet.add(fingerprint);
                if (fileNameKey) fileNameSet.add(fileNameKey);
            });
            return { idSet, fingerprintSet, fileNameSet };
        }

        function isUtilProductionEntryLinkedToArchive(entry, refs) {
            const sourceArchiveId = String(entry?.sourceArchiveId || '').trim();
            const sourceFingerprint = String(entry?.sourceFingerprint || '').trim();
            const sourceFileNameKey = normalizeUtilArchiveLookupByFileName(entry?.sourceFileName || entry?.fileName);
            if (sourceArchiveId && refs.idSet.has(sourceArchiveId)) return true;
            if (sourceFingerprint && refs.fingerprintSet.has(sourceFingerprint)) return true;
            if (sourceFileNameKey && refs.fileNameSet.has(sourceFileNameKey)) return true;
            return false;
        }

        function countUtilProductionOrphanEntries() {
            const refs = buildUtilProductionArchiveReferenceSets();
            let count = 0;
            (UTIL_PRODUCTION_DAILY_DATA || []).forEach(team => {
                (team?.entries || []).forEach(entry => {
                    if (isUtilProductionEntryLinkedToArchive(entry, refs)) return;
                    count += 1;
                });
            });
            return count;
        }

        function removeUtilProductionOrphanEntries() {
            const refs = buildUtilProductionArchiveReferenceSets();
            let removedCount = 0;
            (UTIL_PRODUCTION_DAILY_DATA || []).forEach(team => {
                if (!Array.isArray(team?.entries) || !team.entries.length) return;
                const nextEntries = [];
                team.entries.forEach(entry => {
                    if (isUtilProductionEntryLinkedToArchive(entry, refs)) {
                        nextEntries.push(entry);
                        return;
                    }
                    removedCount += 1;
                });
                team.entries = nextEntries;
            });
            if (removedCount > 0) {
                refreshUtilProductionDailyIndex();
                persistUtilProductionDailyState();
                window.dispatchEvent(new CustomEvent('util-production-data-updated', {
                    detail: { removedEntryCount: removedCount, orphanCleanup: true }
                }));
            }
            return removedCount;
        }

        async function removeUtilProductionArchiveFile(archiveId) {
            const id = String(archiveId || '').trim();
            if (!id) return { ok: false, removedEntryCount: 0 };
            const index = UTIL_PRODUCTION_ARCHIVE_META.findIndex(item => String(item?.id || '') === id);
            if (index < 0) return { ok: false, removedEntryCount: 0 };
            const targetMeta = UTIL_PRODUCTION_ARCHIVE_META[index];
            const db = await openUtilProductionArchiveDb();
            const record = String(targetMeta?.storage || '').trim() === 'server'
                ? null
                : await getUtilProductionArchiveRecord(db, id);
            let removedEntryCount = removeUtilProductionEntriesByArchiveMeta(targetMeta);
            if (removedEntryCount === 0) {
                const pseudoFile = buildUtilProductionArchivePseudoFile(record, targetMeta);
                if (pseudoFile) {
                    try {
                        const parsedRows = await parseUtilProductionExcelFile(pseudoFile, '');
                        const keySet = buildUtilProductionDailyKeySetFromRows(parsedRows);
                        removedEntryCount = removeUtilProductionEntriesByKeySet(keySet);
                    } catch (error) {
                        // 원본 재파싱 실패 시 source metadata 기준 결과만 사용
                    }
                }
            }
            await deleteUtilProductionArchiveStorage(targetMeta, db);
            UTIL_PRODUCTION_ARCHIVE_META.splice(index, 1);
            if (removedEntryCount === 0) persistUtilProductionDailyState();
            refreshUtilProductionArchiveCountBadges();
            renderUtilProductionArchiveModal();
            window.dispatchEvent(new CustomEvent('util-production-data-updated', {
                detail: { removedEntryCount }
            }));
            return { ok: true, removedEntryCount };
        }

        function ensureUtilProductionArchiveModal() {
            let modal = document.getElementById('util-production-archive-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'util-production-archive-modal';
            modal.className = 'util-production-modal';
            modal.innerHTML = `
                <div class="util-production-modal-card" role="dialog" aria-modal="true" aria-label="원본 엑셀 보관함">
                    <div class="util-production-modal-header">
                        <div class="util-production-modal-title">원본 엑셀 보관함</div>
                        <div class="util-production-modal-header-actions">
                            <button type="button" class="util-production-modal-close" data-role="close">닫기</button>
                        </div>
                    </div>
                    <div class="util-production-modal-body">
                        <div class="util-production-modal-meta">
                            <span data-role="folder"></span>
                            <span data-role="count"></span>
                        </div>
                        <div data-role="body"></div>
                    </div>
                </div>
            `;
            modal.addEventListener('click', event => {
                if (event.target === modal) closeUtilProductionArchiveModal();
            });
            const closeBtn = modal.querySelector('[data-role="close"]');
            if (closeBtn) closeBtn.addEventListener('click', () => closeUtilProductionArchiveModal());
            const body = modal.querySelector('[data-role="body"]');
            if (body) {
                body.addEventListener('click', async event => {
                    const navButton = event.target?.closest?.('[data-archive-nav]');
                    if (navButton) {
                        const nav = String(navButton.dataset.archiveNav || '').trim();
                        if (nav === 'select-year') {
                            UtilProductionArchiveState.view = 'month';
                            UtilProductionArchiveState.selectedYear = String(navButton.dataset.archiveYear || '').trim();
                            UtilProductionArchiveState.selectedMonth = '';
                            UtilProductionArchiveState.selectedTeam = '';
                            renderUtilProductionArchiveModal();
                            return;
                        }
                        if (nav === 'select-month') {
                            UtilProductionArchiveState.view = 'team';
                            UtilProductionArchiveState.selectedMonth = String(navButton.dataset.archiveMonth || '').trim();
                            UtilProductionArchiveState.selectedTeam = '';
                            renderUtilProductionArchiveModal();
                            return;
                        }
                        if (nav === 'select-team') {
                            UtilProductionArchiveState.view = 'file';
                            UtilProductionArchiveState.selectedTeam = String(navButton.dataset.archiveTeam || '').trim();
                            renderUtilProductionArchiveModal();
                            return;
                        }
                        if (nav === 'back-year') {
                            UtilProductionArchiveState.view = 'year';
                            UtilProductionArchiveState.selectedYear = '';
                            UtilProductionArchiveState.selectedMonth = '';
                            UtilProductionArchiveState.selectedTeam = '';
                            renderUtilProductionArchiveModal();
                            return;
                        }
                        if (nav === 'back-month') {
                            UtilProductionArchiveState.view = 'month';
                            UtilProductionArchiveState.selectedMonth = '';
                            UtilProductionArchiveState.selectedTeam = '';
                            renderUtilProductionArchiveModal();
                            return;
                        }
                        if (nav === 'back-team') {
                            UtilProductionArchiveState.view = 'team';
                            UtilProductionArchiveState.selectedTeam = '';
                            renderUtilProductionArchiveModal();
                            return;
                        }
                    }

                    const actionButton = event.target?.closest?.('[data-archive-action]');
                    if (!actionButton) return;
                    const action = String(actionButton.dataset.archiveAction || '').trim();
                    if (action === 'clean-orphans') {
                        const ok = confirm('원본 파일과 연결되지 않은 생산량 데이터를 정리할까요?');
                        if (!ok) return;
                        actionButton.disabled = true;
                        const removedCount = removeUtilProductionOrphanEntries();
                        if (removedCount > 0 && typeof setLastModified === 'function') {
                            setLastModified('유틸리티 관리');
                        }
                        alert(removedCount > 0
                            ? `원본 미연결 데이터 ${removedCount.toLocaleString('ko-KR')}건을 삭제했습니다.`
                            : '정리할 원본 미연결 데이터가 없습니다.');
                        renderUtilProductionArchiveModal();
                        return;
                    }
                    const archiveId = String(actionButton.dataset.archiveId || '').trim();
                    if (!archiveId) return;
                    if (action === 'download') {
                        actionButton.disabled = true;
                        await downloadUtilProductionArchiveFile(archiveId);
                        actionButton.disabled = false;
                        return;
                    }
                    if (action === 'delete') {
                        const ok = confirm('선택한 원본 파일을 삭제하면 해당 파일로 기입된 생산량 데이터도 함께 삭제됩니다. 진행할까요?');
                        if (!ok) return;
                        actionButton.disabled = true;
                        const removed = await removeUtilProductionArchiveFile(archiveId);
                        if (removed.ok && typeof setLastModified === 'function') {
                            setLastModified('유틸리티 관리');
                        }
                        if (removed.ok && removed.removedEntryCount > 0) {
                            alert(`연결된 생산량 ${removed.removedEntryCount.toLocaleString('ko-KR')}건을 함께 삭제했습니다.`);
                        }
                    }
                });
            }
            if (!window.__utilProductionArchiveEscBound) {
                window.__utilProductionArchiveEscBound = true;
                document.addEventListener('keydown', event => {
                    if (event.key !== 'Escape') return;
                    closeUtilProductionArchiveModal();
                });
            }
            document.body.appendChild(modal);
            return modal;
        }

        function getUtilProductionArchiveYears(meta) {
            const yearMonths = normalizeUtilProductionArchiveYearMonths(meta?.yearMonths);
            if (yearMonths.length) {
                const yearsFromYearMonths = normalizeUtilProductionArchiveYears(
                    yearMonths.map(value => Number(String(value).slice(0, 4)))
                );
                if (yearsFromYearMonths.length) {
                    return yearsFromYearMonths.map(value => String(value));
                }
            }
            const normalized = normalizeUtilProductionArchiveYears(meta?.years);
            if (normalized.length) return normalized.map(value => String(value));
            const savedYearMonth = buildUtilProductionArchiveYearMonthFromSavedAt(meta?.savedAt);
            if (savedYearMonth) {
                return [String(savedYearMonth).slice(0, 4)];
            }
            return ['미분류'];
        }

        function getUtilProductionArchiveYearMonthPairs(meta) {
            const pairMap = new Map();
            const addPair = (yearKey, monthKey) => {
                const safeYearKey = String(yearKey || '').trim() || '미분류';
                const safeMonthKey = String(monthKey || '').trim() || '미분류';
                const pairKey = `${safeYearKey}|${safeMonthKey}`;
                if (pairMap.has(pairKey)) return;
                pairMap.set(pairKey, { yearKey: safeYearKey, monthKey: safeMonthKey });
            };

            const yearMonths = normalizeUtilProductionArchiveYearMonths(meta?.yearMonths);
            if (yearMonths.length) {
                yearMonths.forEach(value => {
                    const match = /^(\d{4})-(\d{2})$/.exec(String(value));
                    if (!match) return;
                    addPair(match[1], match[2]);
                });
                return Array.from(pairMap.values());
            }

            const years = normalizeUtilProductionArchiveYears(meta?.years);
            const savedYearMonth = buildUtilProductionArchiveYearMonthFromSavedAt(meta?.savedAt);
            if (savedYearMonth && years.length <= 1) {
                const match = /^(\d{4})-(\d{2})$/.exec(savedYearMonth);
                if (match) {
                    if (years.length === 1) {
                        addPair(String(years[0]), match[2]);
                    } else {
                        addPair(match[1], match[2]);
                    }
                }
                return Array.from(pairMap.values());
            }
            if (years.length) {
                years.forEach(year => addPair(String(year), '미분류'));
                return Array.from(pairMap.values());
            }
            if (savedYearMonth) {
                const match = /^(\d{4})-(\d{2})$/.exec(savedYearMonth);
                if (match) {
                    addPair(match[1], match[2]);
                    return Array.from(pairMap.values());
                }
            }
            addPair('미분류', '미분류');
            return Array.from(pairMap.values());
        }

        function formatUtilProductionArchiveMonthLabel(monthKey) {
            const text = String(monthKey || '').trim();
            const month = Number(text);
            if (Number.isFinite(month) && month >= 1 && month <= 12) {
                return `${String(month).padStart(2, '0')}월`;
            }
            return text || '미분류';
        }

        function getUtilProductionArchiveTeams(meta) {
            const normalized = normalizeUtilProductionArchiveTeams(meta?.teams);
            if (normalized.length) return normalized;
            return ['미분류'];
        }

        function buildUtilProductionArchiveTree() {
            const yearMap = new Map();
            (UTIL_PRODUCTION_ARCHIVE_META || []).forEach(item => {
                const yearMonthPairs = getUtilProductionArchiveYearMonthPairs(item);
                const teams = getUtilProductionArchiveTeams(item);
                yearMonthPairs.forEach(pair => {
                    const yearKey = String(pair?.yearKey || '').trim() || '미분류';
                    const monthKey = String(pair?.monthKey || '').trim() || '미분류';
                    if (!yearMap.has(yearKey)) {
                        yearMap.set(yearKey, { yearKey, months: new Map() });
                    }
                    const yearNode = yearMap.get(yearKey);
                    if (!yearNode.months.has(monthKey)) {
                        yearNode.months.set(monthKey, { monthKey, teams: new Map() });
                    }
                    const monthNode = yearNode.months.get(monthKey);
                    teams.forEach(teamKey => {
                        if (!monthNode.teams.has(teamKey)) {
                            monthNode.teams.set(teamKey, { teamKey, items: [] });
                        }
                        monthNode.teams.get(teamKey).items.push(item);
                    });
                });
            });

            const years = Array.from(yearMap.values());
            years.forEach(yearNode => {
                yearNode.monthList = Array.from(yearNode.months.values());
                yearNode.monthList.forEach(monthNode => {
                    monthNode.teamList = Array.from(monthNode.teams.values()).sort((a, b) => a.teamKey.localeCompare(b.teamKey, 'ko'));
                    monthNode.fileCount = monthNode.teamList.reduce((sum, teamNode) => sum + teamNode.items.length, 0);
                    monthNode.teamCount = monthNode.teamList.length;
                });
                yearNode.monthList.sort((a, b) => {
                    const monthA = Number(a.monthKey);
                    const monthB = Number(b.monthKey);
                    const hasNumA = Number.isFinite(monthA) && monthA >= 1 && monthA <= 12;
                    const hasNumB = Number.isFinite(monthB) && monthB >= 1 && monthB <= 12;
                    if (hasNumA && hasNumB) return monthB - monthA;
                    if (hasNumA) return -1;
                    if (hasNumB) return 1;
                    return String(a.monthKey).localeCompare(String(b.monthKey), 'ko');
                });
                const teamSet = new Set();
                yearNode.monthList.forEach(monthNode => {
                    monthNode.teamList.forEach(teamNode => {
                        teamSet.add(teamNode.teamKey);
                    });
                });
                yearNode.teamCount = teamSet.size;
                yearNode.monthCount = yearNode.monthList.length;
                yearNode.fileCount = yearNode.monthList.reduce((sum, monthNode) => sum + monthNode.fileCount, 0);
            });
            years.sort((a, b) => {
                const ay = Number(a.yearKey);
                const by = Number(b.yearKey);
                const aNum = Number.isFinite(ay);
                const bNum = Number.isFinite(by);
                if (aNum && bNum) return by - ay;
                if (aNum) return -1;
                if (bNum) return 1;
                return String(a.yearKey).localeCompare(String(b.yearKey), 'ko');
            });
            return years;
        }

function renderUtilProductionArchiveModal() {
            const modal = document.getElementById('util-production-archive-modal');
            if (!modal) return;
            const folder = modal.querySelector('[data-role="folder"]');
            const count = modal.querySelector('[data-role="count"]');
            const body = modal.querySelector('[data-role="body"]');
            if (!body) return;
            sortUtilProductionArchiveMeta();
            if (folder) folder.textContent = `원본 구분: ${normalizeUtilProductionArchiveSourceLabel(UtilProductionArchiveState.folderName)}`;
            if (count) count.textContent = `보관 ${UTIL_PRODUCTION_ARCHIVE_META.length.toLocaleString('ko-KR')}개`;
            if (!UTIL_PRODUCTION_ARCHIVE_META.length) {
                const orphanCount = countUtilProductionOrphanEntries();
                const orphanAction = orphanCount > 0
                    ? `<div style="margin-top:8px;"><button type="button" class="util-detail-btn" data-archive-action="clean-orphans">원본 미연결 데이터 정리 (${orphanCount.toLocaleString('ko-KR')}건)</button></div>`
                    : '';
                body.innerHTML = `
                    <div class="util-production-modal-empty">
                        보관된 원본 파일이 없습니다.
                        ${orphanCount > 0 ? `<div style="margin-top:6px;color:#b91c1c;font-weight:700;">원본 미연결 생산량 데이터 ${orphanCount.toLocaleString('ko-KR')}건</div>` : ''}
                        ${orphanAction}
                    </div>
                `;
                return;
            }
            const tree = buildUtilProductionArchiveTree();
            const selectedYearNode = tree.find(item => item.yearKey === UtilProductionArchiveState.selectedYear) || null;
            if (UtilProductionArchiveState.view === 'year') {
                const rows = tree.map(yearNode => `
                    <tr>
                        <td>${escapeHtml(yearNode.yearKey)}</td>
                        <td>${escapeHtml(String(yearNode.monthCount))}</td>
                        <td>${escapeHtml(String(yearNode.teamCount))}</td>
                        <td>${escapeHtml(String(yearNode.fileCount))}</td>
                        <td><button type="button" class="util-detail-btn" data-archive-nav="select-year" data-archive-year="${escapeHtml(yearNode.yearKey)}">월 보기</button></td>
                    </tr>
                `).join('');
                body.innerHTML = `
                    <table class="util-production-modal-table">
                        <thead>
                            <tr>
                                <th>년도</th>
                                <th>월 수</th>
                                <th>팀 수</th>
                                <th>파일 수</th>
                                <th>열기</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
                return;
            }

            if (!selectedYearNode) {
                UtilProductionArchiveState.view = 'year';
                UtilProductionArchiveState.selectedYear = '';
                UtilProductionArchiveState.selectedMonth = '';
                UtilProductionArchiveState.selectedTeam = '';
                renderUtilProductionArchiveModal();
                return;
            }

            if (UtilProductionArchiveState.view === 'month') {
                const rows = selectedYearNode.monthList.map(monthNode => `
                    <tr>
                        <td>${escapeHtml(formatUtilProductionArchiveMonthLabel(monthNode.monthKey))}</td>
                        <td>${escapeHtml(String(monthNode.teamCount))}</td>
                        <td>${escapeHtml(String(monthNode.fileCount))}</td>
                        <td><button type="button" class="util-detail-btn" data-archive-nav="select-month" data-archive-month="${escapeHtml(monthNode.monthKey)}">팀 보기</button></td>
                    </tr>
                `).join('');
                body.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <button type="button" class="util-detail-btn" data-archive-nav="back-year">년도 목록</button>
                        <strong>${escapeHtml(selectedYearNode.yearKey)}년 월 목록</strong>
                    </div>
                    <table class="util-production-modal-table">
                        <thead>
                            <tr>
                                <th>월</th>
                                <th>팀 수</th>
                                <th>파일 수</th>
                                <th>열기</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
                return;
            }

            const selectedMonthNode = selectedYearNode.monthList.find(item => item.monthKey === UtilProductionArchiveState.selectedMonth) || null;
            if (!selectedMonthNode) {
                UtilProductionArchiveState.view = 'month';
                UtilProductionArchiveState.selectedMonth = '';
                UtilProductionArchiveState.selectedTeam = '';
                renderUtilProductionArchiveModal();
                return;
            }
            const selectedMonthLabel = formatUtilProductionArchiveMonthLabel(selectedMonthNode.monthKey);

            if (UtilProductionArchiveState.view === 'team') {
                const rows = selectedMonthNode.teamList.map(teamNode => `
                    <tr>
                        <td>${escapeHtml(teamNode.teamKey)}</td>
                        <td>${escapeHtml(String(teamNode.items.length))}</td>
                        <td><button type="button" class="util-detail-btn" data-archive-nav="select-team" data-archive-team="${escapeHtml(teamNode.teamKey)}">파일 보기</button></td>
                    </tr>
                `).join('');
                body.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <button type="button" class="util-detail-btn" data-archive-nav="back-month">월 목록</button>
                        <strong>${escapeHtml(selectedYearNode.yearKey)}년 / ${escapeHtml(selectedMonthLabel)} 팀 목록</strong>
                    </div>
                    <table class="util-production-modal-table">
                        <thead>
                            <tr>
                                <th>팀</th>
                                <th>파일 수</th>
                                <th>열기</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
                return;
            }

            const selectedTeamNode = selectedMonthNode.teamList.find(item => item.teamKey === UtilProductionArchiveState.selectedTeam) || null;
            if (!selectedTeamNode) {
                UtilProductionArchiveState.view = 'team';
                UtilProductionArchiveState.selectedTeam = '';
                renderUtilProductionArchiveModal();
                return;
            }
            const fileRows = selectedTeamNode.items.map(item => `
                <tr>
                    <td>${escapeHtml(item.fileName || '-')}</td>
                    <td>${escapeHtml(formatUtilArchiveDateTime(item.savedAt))}</td>
                    <td>${escapeHtml(formatUtilArchiveFileSize(item.size))}</td>
                    <td>
                        <button type="button" class="util-detail-btn" data-archive-action="download" data-archive-id="${escapeHtml(item.id)}">다운로드</button>
                        <button type="button" class="util-detail-btn" data-archive-action="delete" data-archive-id="${escapeHtml(item.id)}">삭제</button>
                    </td>
                </tr>
            `).join('');
            body.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <button type="button" class="util-detail-btn" data-archive-nav="back-team">팀 목록</button>
                    <strong>${escapeHtml(selectedYearNode.yearKey)}년 / ${escapeHtml(selectedMonthLabel)} / ${escapeHtml(selectedTeamNode.teamKey)}</strong>
                </div>
                <table class="util-production-modal-table">
                    <thead>
                        <tr>
                            <th>파일명</th>
                            <th>보관 일시</th>
                            <th>크기</th>
                            <th>작업</th>
                        </tr>
                    </thead>
                    <tbody>${fileRows}</tbody>
                </table>
            `;
        }

        function openUtilProductionArchiveModal() {
            applyUtilProductionHardResetIfNeeded();
            const modal = ensureUtilProductionArchiveModal();
            UtilProductionArchiveState.view = 'year';
            UtilProductionArchiveState.selectedYear = '';
            UtilProductionArchiveState.selectedMonth = '';
            UtilProductionArchiveState.selectedTeam = '';
            renderUtilProductionArchiveModal();
            modal.classList.add('is-open');
        }

        function closeUtilProductionArchiveModal() {
            const modal = document.getElementById('util-production-archive-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
        }

