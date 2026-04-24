(function registerUtilReportSheetBilling(globalScope) {
    if (globalScope.KPIUtilReportSheetBilling) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.billing.js');
    }

    const {
        UTIL_GAS_BILLING_SCOPE_KEYS,
        UTIL_ELECTRIC_BILLING_DOCUMENT_DIRECTORY,
        UTIL_GAS_BILLING_DOCUMENT_DIRECTORY,
        UTIL_GAS_BILLING_ASSET_BASE_DIRECTORY,
        UTIL_ELECTRIC_BILLING_SCOPE_LABELS,
        UTIL_GAS_BILLING_SCOPE_LABELS
    } = utilReportSheetConfig;

    const runtime = {
        getGasMeteringStore: null,
        getElectricMeteringStore: null,
        getLocalAppStore: null,
        isPlainObject: null,
        formatMonthLabel: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetBilling;
    }

    function isPlainObject(value) {
        if (typeof runtime.isPlainObject === 'function') {
            return Boolean(runtime.isPlainObject(value));
        }
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function getLocalAppStore() {
        if (typeof runtime.getLocalAppStore === 'function') {
            return runtime.getLocalAppStore() || null;
        }
        return globalScope.__LOCAL_APP_STORE__ || null;
    }

    function getUtilGasBillingSettlementEntries() {
        const store = typeof runtime.getGasMeteringStore === 'function'
            ? runtime.getGasMeteringStore()
            : null;
        return isPlainObject(store?.billingSettlementEntries) ? store.billingSettlementEntries : {};
    }

    function getUtilGasBillingScopeFields(monthKey, scopeKey) {
        const monthEntry = getUtilGasBillingSettlementEntries()?.[monthKey];
        const scopeEntry = isPlainObject(monthEntry?.scopes?.[scopeKey])
            ? monthEntry.scopes[scopeKey]
            : null;
        return isPlainObject(scopeEntry?.fields) ? scopeEntry.fields : {};
    }

    function getUtilGasBillingDocuments() {
        const store = typeof runtime.getGasMeteringStore === 'function'
            ? runtime.getGasMeteringStore()
            : null;
        if (isPlainObject(store?.billingDocuments)) return store.billingDocuments;
        return isPlainObject(getLocalAppStore()?.billingDocuments)
            ? getLocalAppStore().billingDocuments
            : {};
    }

    function getUtilElectricBillingDocuments() {
        const store = typeof runtime.getElectricMeteringStore === 'function'
            ? runtime.getElectricMeteringStore()
            : null;
        if (isPlainObject(store?.billingDocuments)) return store.billingDocuments;
        return isPlainObject(getLocalAppStore()?.billingDocuments)
            ? getLocalAppStore().billingDocuments
            : {};
    }

    function isUtilGasBillingDocumentLeafRecord(rawDocument) {
        if (!isPlainObject(rawDocument)) return false;
        if (isPlainObject(rawDocument.scopes)) return false;
        return Boolean(
            String(rawDocument.fileName || '').trim()
            || String(rawDocument.relativePath || '').trim()
            || String(rawDocument.previewUrl || '').trim()
            || String(rawDocument.downloadUrl || '').trim()
            || String(rawDocument.base64Data || '').trim()
        );
    }

    function getUtilGasBillingDocument(monthKey, scopeKey = '') {
        const normalizedMonthKey = String(monthKey || '').trim();
        const normalizedScopeKey = String(scopeKey || '').trim();
        if (!normalizedMonthKey) return null;
        const monthEntry = getUtilGasBillingDocuments()?.[normalizedMonthKey];
        if (!isPlainObject(monthEntry)) return null;

        const scopeSource = isPlainObject(monthEntry.scopes)
            ? monthEntry.scopes
            : monthEntry;
        const scopedDocument = normalizedScopeKey && isPlainObject(scopeSource?.[normalizedScopeKey])
            ? scopeSource[normalizedScopeKey]
            : null;
        if (scopedDocument) return scopedDocument;

        if (!normalizedScopeKey && isUtilGasBillingDocumentLeafRecord(monthEntry)) {
            return monthEntry;
        }
        return null;
    }

    function getUtilElectricBillingDocument(monthKey, scopeKey = '') {
        const normalizedMonthKey = String(monthKey || '').trim();
        const normalizedScopeKey = String(scopeKey || '').trim();
        if (!normalizedMonthKey) return null;
        const monthEntry = getUtilElectricBillingDocuments()?.[normalizedMonthKey];
        if (!isPlainObject(monthEntry)) return null;

        const scopeSource = isPlainObject(monthEntry.scopes)
            ? monthEntry.scopes
            : monthEntry;
        const scopedDocument = normalizedScopeKey && isPlainObject(scopeSource?.[normalizedScopeKey])
            ? scopeSource[normalizedScopeKey]
            : null;
        if (scopedDocument) return scopedDocument;

        if (!normalizedScopeKey && isUtilGasBillingDocumentLeafRecord(monthEntry)) {
            return monthEntry;
        }
        return null;
    }

    function normalizeUtilGasBillingDocumentRelativePath(relativePath = '') {
        return String(relativePath || '')
            .trim()
            .replace(/\\/g, '/')
            .split('/')
            .filter(Boolean)
            .join('/');
    }

    function getUtilGasBillingDocumentFileNameFromPath(relativePath = '') {
        const normalizedPath = normalizeUtilGasBillingDocumentRelativePath(relativePath);
        if (!normalizedPath) return '';
        const rawFileName = normalizedPath.split('/').pop() || '';
        try {
            return decodeURIComponent(rawFileName);
        } catch (error) {
            void error;
            return rawFileName;
        }
    }

    function buildUtilGasBillingDocumentRelativePath(fileName = '') {
        const normalizedFileName = String(fileName || '').trim();
        if (!normalizedFileName) return '';
        return `${UTIL_GAS_BILLING_DOCUMENT_DIRECTORY}/${normalizedFileName}`;
    }

    function normalizeUtilGasBillingDocumentAssetRelativePath(relativePath = '', fileName = '') {
        const normalizedPath = normalizeUtilGasBillingDocumentRelativePath(relativePath)
            || buildUtilGasBillingDocumentRelativePath(
                String(fileName || '').trim() || getUtilGasBillingDocumentFileNameFromPath(relativePath)
            );
        if (!normalizedPath) return '';
        if (normalizedPath.startsWith(`${UTIL_GAS_BILLING_ASSET_BASE_DIRECTORY}/`)) {
            return normalizedPath;
        }
        return `${UTIL_GAS_BILLING_ASSET_BASE_DIRECTORY}/${normalizedPath}`;
    }

    function getUtilGasBillingDocumentMimeTypeFromFileName(fileName = '') {
        const extension = String(fileName || '')
            .trim()
            .match(/\.[a-z0-9]{1,8}$/i)?.[0]
            ?.toLowerCase();
        const extensionMimeTypes = {
            '.bmp': 'image/bmp',
            '.gif': 'image/gif',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.tif': 'image/tiff',
            '.tiff': 'image/tiff',
            '.webp': 'image/webp'
        };
        return extension ? extensionMimeTypes[extension] || '' : '';
    }

    function getUtilGasBillingDocumentMimeType(billingDocument) {
        return String(billingDocument?.mimeType || '').trim()
            || getUtilGasBillingDocumentMimeTypeFromFileName(
                String(billingDocument?.fileName || '').trim()
                || getUtilGasBillingDocumentFileNameFromPath(billingDocument?.relativePath)
            )
            || 'application/pdf';
    }

    function isUtilGasBillingImageDocument(billingDocument) {
        const mimeType = getUtilGasBillingDocumentMimeType(billingDocument);
        if (mimeType.startsWith('image/')) return true;
        return /\.(bmp|gif|jpe?g|png|tiff?|webp)$/i.test(
            String(billingDocument?.fileName || '').trim()
                || getUtilGasBillingDocumentFileNameFromPath(billingDocument?.relativePath)
        );
    }

    function buildUtilGasBillingDocumentDataUrl(billingDocument) {
        const base64Data = String(billingDocument?.base64Data || '').trim();
        if (!base64Data) return '';
        return `data:${getUtilGasBillingDocumentMimeType(billingDocument)};base64,${base64Data}`;
    }

    function encodeUtilGasBillingDocumentRelativePath(relativePath = '') {
        const normalizedPath = normalizeUtilGasBillingDocumentRelativePath(relativePath);
        if (!normalizedPath) return '';
        return normalizedPath
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');
    }

    function resolveUtilSheetAssetUrl(relativePath = '') {
        const normalizedPath = String(relativePath || '').trim();
        if (!normalizedPath) return '';
        try {
            return new URL(normalizedPath, globalScope.location?.href || '').href;
        } catch (error) {
            void error;
            return normalizedPath;
        }
    }

    function resolveUtilGasBillingDocumentUrl(billingDocument) {
        if (!billingDocument) return '';
        const previewUrl = String(billingDocument?.previewUrl || '').trim();
        const downloadUrl = String(billingDocument?.downloadUrl || '').trim();
        const hasServerDocument = Boolean(
            String(billingDocument?.documentId || '').trim() || previewUrl || downloadUrl
        );
        const dataUrl = buildUtilGasBillingDocumentDataUrl(billingDocument);
        if (!hasServerDocument && billingDocument?.savedToLocalDirectory === false && dataUrl) {
            return dataUrl;
        }
        if (previewUrl) return previewUrl;
        if (downloadUrl) return downloadUrl;
        const relativeUrl = encodeUtilGasBillingDocumentRelativePath(
            normalizeUtilGasBillingDocumentAssetRelativePath(
                billingDocument?.relativePath,
                billingDocument?.fileName
            )
        );
        if (relativeUrl) return resolveUtilSheetAssetUrl(relativeUrl);
        return dataUrl;
    }

    function resolveUtilGasBillingDocumentDownloadUrl(billingDocument) {
        const dataUrl = buildUtilGasBillingDocumentDataUrl(billingDocument);
        if (dataUrl) return dataUrl;
        const downloadUrl = String(billingDocument?.downloadUrl || '').trim();
        if (downloadUrl) return downloadUrl;
        return resolveUtilGasBillingDocumentUrl(billingDocument);
    }

    function resolveUtilGasBillingDocumentDescriptor(monthKey, scopeKey = '') {
        const normalizedMonthKey = String(monthKey || '').trim();
        const normalizedScopeKey = String(scopeKey || '').trim();
        const billingDocument = getUtilGasBillingDocument(normalizedMonthKey, normalizedScopeKey);
        if (!billingDocument) return null;
        const fileName = String(billingDocument?.fileName || '').trim()
            || getUtilGasBillingDocumentFileNameFromPath(billingDocument?.relativePath);
        const url = resolveUtilGasBillingDocumentUrl(billingDocument);
        if (!fileName || !url) return null;
        return {
            monthKey: normalizedMonthKey,
            scopeKey: normalizedScopeKey,
            scopeLabel: UTIL_GAS_BILLING_SCOPE_LABELS[normalizedScopeKey] || '청구서',
            fileName,
            folderName: UTIL_GAS_BILLING_DOCUMENT_DIRECTORY,
            mimeType: getUtilGasBillingDocumentMimeType(billingDocument),
            isImage: isUtilGasBillingImageDocument(billingDocument),
            url,
            billingDocument
        };
    }

    function resolveUtilElectricBillingDocumentDescriptor(monthKey, scopeKey = 'plantA') {
        const normalizedMonthKey = String(monthKey || '').trim();
        const normalizedScopeKey = String(scopeKey || '').trim() || 'plantA';
        const billingDocument = getUtilElectricBillingDocument(normalizedMonthKey, normalizedScopeKey);
        if (!billingDocument) return null;
        const fileName = String(billingDocument?.fileName || '').trim()
            || getUtilGasBillingDocumentFileNameFromPath(billingDocument?.relativePath);
        const url = resolveUtilGasBillingDocumentUrl(billingDocument);
        if (!fileName || !url) return null;
        return {
            datasetKey: 'electric',
            monthKey: normalizedMonthKey,
            scopeKey: normalizedScopeKey,
            scopeLabel: UTIL_ELECTRIC_BILLING_SCOPE_LABELS[normalizedScopeKey] || '청구서',
            fileName,
            folderName: UTIL_ELECTRIC_BILLING_DOCUMENT_DIRECTORY,
            mimeType: getUtilGasBillingDocumentMimeType(billingDocument),
            isImage: isUtilGasBillingImageDocument(billingDocument),
            url,
            billingDocument
        };
    }

    function resolveUtilSheetBillingDocumentDescriptor(datasetKey = 'gas', monthKey = '', scopeKey = '') {
        if (String(datasetKey || '').trim() === 'electric') {
            return resolveUtilElectricBillingDocumentDescriptor(monthKey, scopeKey || 'plantA');
        }
        return resolveUtilGasBillingDocumentDescriptor(monthKey, scopeKey);
    }

    function buildUtilSheetBillingPreviewModalHtml() {
        return `
            <div class="billing-preview-modal is-hidden" data-role="util-sheet-billing-preview-modal" aria-hidden="true">
                <div class="billing-preview-backdrop" data-close-billing-preview="true"></div>
                <section class="billing-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="utilSheetBillingPreviewTitle">
                    <div class="billing-preview-head">
                        <div class="billing-preview-copy">
                            <p id="utilSheetBillingPreviewTitle" class="billing-preview-title" data-role="util-sheet-billing-preview-title">청구서 미리보기</p>
                            <p class="billing-preview-meta" data-role="util-sheet-billing-preview-meta"></p>
                        </div>
                        <div class="billing-preview-actions">
                            <button type="button" class="billing-preview-btn" data-role="util-sheet-billing-preview-download">다운</button>
                            <button type="button" class="billing-preview-btn is-primary" data-role="util-sheet-billing-preview-close">닫기</button>
                        </div>
                    </div>
                    <div class="billing-preview-body" data-role="util-sheet-billing-preview-body"></div>
                </section>
            </div>
        `;
    }

    function resetUtilSheetBillingPreviewModal(modal) {
        if (!modal) return;
        const bodyEl = modal.querySelector('[data-role="util-sheet-billing-preview-body"]');
        const titleEl = modal.querySelector('[data-role="util-sheet-billing-preview-title"]');
        const metaEl = modal.querySelector('[data-role="util-sheet-billing-preview-meta"]');
        if (bodyEl) bodyEl.innerHTML = '';
        if (titleEl) titleEl.textContent = '청구서 미리보기';
        if (metaEl) metaEl.textContent = '';
        modal._billingPreviewDescriptor = null;
    }

    function closeUtilSheetBillingPreview(rootDoc = globalScope.document, options = {}) {
        const modal = rootDoc?.querySelector?.('[data-role="util-sheet-billing-preview-modal"]');
        if (!modal) return;
        const focusTarget = options.focusTarget || modal._billingPreviewFocusTarget || null;
        modal.classList.add('is-hidden');
        modal.setAttribute('aria-hidden', 'true');
        resetUtilSheetBillingPreviewModal(modal);
        modal._billingPreviewFocusTarget = null;
        if (focusTarget?.focus) {
            (globalScope.setTimeout || setTimeout)(() => focusTarget.focus(), 0);
        }
    }

    function ensureUtilSheetBillingPreviewModal(rootDoc = globalScope.document) {
        if (!rootDoc?.body) return null;
        let modal = rootDoc.querySelector('[data-role="util-sheet-billing-preview-modal"]');
        if (modal) return modal;
        rootDoc.body.insertAdjacentHTML('beforeend', buildUtilSheetBillingPreviewModalHtml());
        modal = rootDoc.querySelector('[data-role="util-sheet-billing-preview-modal"]');
        if (!modal || modal.dataset.bound === 'true') return modal;
        modal.dataset.bound = 'true';
        modal.addEventListener('click', event => {
            const closeButton = event.target.closest('[data-role="util-sheet-billing-preview-close"], [data-close-billing-preview="true"]');
            if (closeButton) {
                closeUtilSheetBillingPreview(rootDoc);
                return;
            }
            const downloadButton = event.target.closest('[data-role="util-sheet-billing-preview-download"]');
            if (!downloadButton) return;
            const descriptor = modal._billingPreviewDescriptor || null;
            if (!descriptor?.billingDocument) {
                globalScope.alert?.('다운할 청구서가 없습니다.');
                return;
            }
            const downloadUrl = resolveUtilGasBillingDocumentDownloadUrl(descriptor.billingDocument);
            if (!downloadUrl || !descriptor.fileName) {
                globalScope.alert?.('다운할 청구서가 없습니다.');
                return;
            }
            const link = rootDoc.createElement('a');
            link.href = downloadUrl;
            link.download = descriptor.fileName;
            link.rel = 'noopener noreferrer';
            link.className = 'is-hidden';
            rootDoc.body.appendChild(link);
            link.click();
            link.remove();
        });
        modal.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            closeUtilSheetBillingPreview(rootDoc);
        });
        return modal;
    }

    function openUtilSheetBillingPreview(monthKey, scopeKey = '', options = {}) {
        const descriptor = resolveUtilSheetBillingDocumentDescriptor(
            options.datasetKey || 'gas',
            monthKey,
            scopeKey
        );
        if (!descriptor) {
            globalScope.alert?.('미리볼 청구서가 없습니다.');
            return false;
        }
        const rootDoc = options.rootDoc || globalScope.document;
        const modal = ensureUtilSheetBillingPreviewModal(rootDoc);
        if (!modal) return false;

        resetUtilSheetBillingPreviewModal(modal);
        modal._billingPreviewDescriptor = descriptor;
        modal._billingPreviewFocusTarget = options.focusTarget || null;

        const titleEl = modal.querySelector('[data-role="util-sheet-billing-preview-title"]');
        const metaEl = modal.querySelector('[data-role="util-sheet-billing-preview-meta"]');
        const bodyEl = modal.querySelector('[data-role="util-sheet-billing-preview-body"]');
        if (!bodyEl) return false;

        const monthLabel = typeof runtime.formatMonthLabel === 'function'
            ? runtime.formatMonthLabel(descriptor.monthKey || '')
            : String(descriptor.monthKey || '');
        if (titleEl) titleEl.textContent = `${monthLabel} ${descriptor.scopeLabel} 청구서`;
        if (metaEl) metaEl.textContent = `${descriptor.folderName} · ${descriptor.fileName}`;

        const previewNode = descriptor.isImage
            ? rootDoc.createElement('img')
            : rootDoc.createElement('iframe');
        previewNode.className = descriptor.isImage ? 'billing-preview-image' : 'billing-preview-frame';
        previewNode.src = descriptor.url;
        if (descriptor.isImage) {
            previewNode.alt = descriptor.fileName;
        } else {
            previewNode.title = descriptor.fileName;
        }
        bodyEl.appendChild(previewNode);

        modal.classList.remove('is-hidden');
        modal.setAttribute('aria-hidden', 'false');

        if (descriptor.scopeKey === UTIL_GAS_BILLING_SCOPE_KEYS.plantALpg && !descriptor.isImage) {
            const scheduleFrameResize = globalScope.requestAnimationFrame || ((callback) => (globalScope.setTimeout || setTimeout)(callback, 0));
            scheduleFrameResize(() => {
                const bw = bodyEl.clientWidth;
                const bh = bodyEl.clientHeight;
                if (bw <= 0 || bh <= 0) return;
                previewNode.style.width = `${bh}px`;
                previewNode.style.height = `${bw}px`;
                previewNode.style.transform = 'rotate(90deg)';
                previewNode.style.transformOrigin = 'center center';
            });
        }

        const closeButton = modal.querySelector('[data-role="util-sheet-billing-preview-close"]');
        if (closeButton?.focus) {
            (globalScope.setTimeout || setTimeout)(() => closeButton.focus(), 0);
        }
        return true;
    }

    globalScope.KPIUtilReportSheetBilling = {
        setRuntimeAdapters,
        getUtilGasBillingSettlementEntries,
        getUtilGasBillingScopeFields,
        getUtilGasBillingDocuments,
        getUtilElectricBillingDocuments,
        isUtilGasBillingDocumentLeafRecord,
        getUtilGasBillingDocument,
        getUtilElectricBillingDocument,
        normalizeUtilGasBillingDocumentRelativePath,
        getUtilGasBillingDocumentFileNameFromPath,
        buildUtilGasBillingDocumentRelativePath,
        normalizeUtilGasBillingDocumentAssetRelativePath,
        getUtilGasBillingDocumentMimeTypeFromFileName,
        getUtilGasBillingDocumentMimeType,
        isUtilGasBillingImageDocument,
        buildUtilGasBillingDocumentDataUrl,
        encodeUtilGasBillingDocumentRelativePath,
        resolveUtilSheetAssetUrl,
        resolveUtilGasBillingDocumentUrl,
        resolveUtilGasBillingDocumentDownloadUrl,
        resolveUtilGasBillingDocumentDescriptor,
        resolveUtilElectricBillingDocumentDescriptor,
        resolveUtilSheetBillingDocumentDescriptor,
        buildUtilSheetBillingPreviewModalHtml,
        resetUtilSheetBillingPreviewModal,
        closeUtilSheetBillingPreview,
        ensureUtilSheetBillingPreviewModal,
        openUtilSheetBillingPreview
    };
})(typeof window !== 'undefined' ? window : globalThis);
