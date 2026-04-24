import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const billingDocumentPathsSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/billing/document-paths.js', import.meta.url),
  'utf8'
);
const billingDocumentsSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/billing/documents.js', import.meta.url),
  'utf8'
);
const billingDirectoryPersistenceSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/billing/directory-persistence.js',
    import.meta.url
  ),
  'utf8'
);
const billingDocumentStorageSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/billing/document-storage.js', import.meta.url),
  'utf8'
);

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFetchResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function createBillingDocumentContext(options = {}) {
  const alerts = [];
  const sharedStorePayloads = [];
  const fetchCalls = [];
  const resourceType = options.resourceType || 'electric';
  const currentScopeKey = options.currentScopeKey || 'default';
  const supportsScopedBilling = Boolean(options.supportsScopedBilling);

  const context = {
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    RegExp,
    BILLING_DOCUMENT_ACCEPT: '.pdf',
    DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY: 'default',
    BILLING_SETTLEMENT_SCOPE_KEYS: ['default', 'gas_lpg'],
    state: {
      currentMonth: '2026-04',
      store: {
        billingDocuments: toPlain(options.initialBillingDocuments || {}),
      },
    },
    window: {
      alert(message) {
        alerts.push(String(message));
      },
      addEventListener() {},
      removeEventListener() {},
      setTimeout(callback) {
        if (typeof callback === 'function') {
          callback();
        }
        return 1;
      },
    },
    document: {
      body: {
        appendChild() {},
      },
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeMonthValue(value) {
      return String(value ?? '').trim();
    },
    normalizeBillingSettlementScope(value) {
      return String(value || 'default').trim() || 'default';
    },
    getCurrentBillingSettlementScope() {
      return currentScopeKey;
    },
    getCurrentResourceType() {
      return resourceType;
    },
    getBillingDocumentDirectoryName(nextResourceType = resourceType) {
      return `${nextResourceType}-billing-documents`;
    },
    getAcceptedBillingDocumentDirectoryNames(nextResourceType = resourceType) {
      return [`${nextResourceType}-billing-documents`, 'billing-documents'];
    },
    getBillingDocumentLabel(monthValue, nextResourceType = resourceType, scopeKey = '') {
      const normalizedScopeKey = String(scopeKey || '').trim();
      return normalizedScopeKey && normalizedScopeKey !== 'default'
        ? `${monthValue}-${nextResourceType}-${normalizedScopeKey}`
        : `${monthValue}-${nextResourceType}`;
    },
    supportsScopedBillingSettlement() {
      return supportsScopedBilling;
    },
    supportsBillingDocumentDirectoryPersistence() {
      return Boolean(options.supportsLocalDirectoryPersistence);
    },
    supportsSharedServerPersistence() {
      return Boolean(options.supportsSharedServerPersistence);
    },
    getBillingDocumentEndpoint() {
      return '/api/metering/billing-documents';
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    countPlainObjectKeys(value) {
      return context.isPlainObject(value) ? Object.keys(value).length : 0;
    },
    normalizeStore(store) {
      return store;
    },
    writeStorePayloadToSharedServer(store) {
      sharedStorePayloads.push(toPlain(store));
      return Promise.resolve({ ok: true });
    },
    writeBillingDocumentToLocalDirectory() {
      return Promise.resolve(
        options.localDirectoryDocument
          ? toPlain(options.localDirectoryDocument)
          : null
      );
    },
    createDetachedElement() {
      return {
        type: '',
        accept: '',
        tabIndex: -1,
        className: '',
        files: [],
        remove() {},
        click() {},
        setAttribute() {},
        addEventListener() {},
      };
    },
    fetch(url, init = {}) {
      fetchCalls.push({
        url,
        init: {
          ...init,
          headers: toPlain(init.headers || {}),
        },
      });
      const nextResponse =
        options.fetchResponse || createFetchResponse(200, { ok: true, document: {} });
      return Promise.resolve(nextResponse);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(billingDocumentPathsSource, context, {
    filename: 'billing/document-paths.js',
  });
  vm.runInContext(billingDocumentsSource, context, {
    filename: 'billing/documents.js',
  });
  vm.runInContext(billingDocumentStorageSource, context, {
    filename: 'billing/document-storage.js',
  });

  return {
    context,
    alerts,
    sharedStorePayloads,
    fetchCalls,
  };
}

function createBillingDirectoryPersistenceContext(options = {}) {
  const alerts = [];
  const resourceType = options.resourceType || 'electric';
  const currentScopeKey = options.currentScopeKey || 'default';

  const context = {
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    RegExp,
    Error,
    LOCAL_FILE_HANDLE_DB_NAME: 'monthly-electric-local-file',
    LOCAL_FILE_HANDLE_STORE_NAME: 'handles',
    LOCAL_BILLING_DOCUMENT_DIRECTORY_HANDLE_KEY: 'billing-document-directory',
    localFilePersistenceState: {
      billingDocumentDirectoryHandle: options.initialDirectoryHandle || null,
    },
    window: {
      location: {
        protocol: options.protocol || 'file:',
      },
      indexedDB: options.indexedDB || {},
      alert(message) {
        alerts.push(String(message));
      },
      showDirectoryPicker:
        options.showDirectoryPicker ||
        (async () => ({
          name: `${resourceType}-billing-documents`,
          requestPermission: async () => 'granted',
          getDirectoryHandle() {
            return Promise.reject(new Error('unused'));
          },
        })),
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    getCurrentResourceType() {
      return resourceType;
    },
    getCurrentBillingSettlementScope() {
      return currentScopeKey;
    },
    getBillingDocumentDirectoryName(nextResourceType = resourceType) {
      return `${nextResourceType}-billing-documents`;
    },
    getAcceptedBillingDocumentDirectoryNames(nextResourceType = resourceType) {
      return [`${nextResourceType}-billing-documents`, 'billing-documents'];
    },
    buildBillingDocumentFileName(
      monthValue,
      sourceFileName = '',
      _mimeType = '',
      nextResourceType = resourceType,
      scopeKey = currentScopeKey
    ) {
      const scopeSuffix =
        scopeKey && scopeKey !== 'default' ? `-${String(scopeKey).trim()}` : '';
      const extension =
        String(sourceFileName || '')
          .trim()
          .match(/\.[a-z0-9]{1,8}$/i)?.[0]
          ?.toLowerCase() || '.pdf';
      return `${monthValue}-${nextResourceType}${scopeSuffix}${extension}`;
    },
    buildBillingDocumentRelativePath(fileName, nextResourceType = resourceType) {
      return `${nextResourceType}-billing-documents/${fileName}`;
    },
    normalizeRelativeFilePath(relativePath) {
      return String(relativePath || '')
        .trim()
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .join('/');
    },
    getBillingDocumentRelativePathCandidates(billingDocument, nextResourceType = resourceType) {
      const normalizedPath = String(billingDocument?.relativePath || '')
        .trim()
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .join('/');
      const fileName =
        String(billingDocument?.fileName || '').trim() ||
        normalizedPath.split('/').pop() ||
        '';
      const candidates = [];
      if (normalizedPath) {
        candidates.push(normalizedPath);
      }
      if (fileName) {
        [`${nextResourceType}-billing-documents`, 'billing-documents'].forEach(
          (directoryName) => {
            candidates.push(`${directoryName}/${fileName}`);
          }
        );
      }
      return candidates.filter(
        (candidate, index, list) => candidate && list.indexOf(candidate) === index
      );
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(billingDirectoryPersistenceSource, context, {
    filename: 'billing/directory-persistence.js',
  });

  return {
    context,
    alerts,
  };
}

test('billing document path helpers keep stable file names and relative path candidates', () => {
  const harness = createBillingDocumentContext();

  assert.equal(harness.context.getBillingDocumentExtension('invoice.PDF', ''), '.pdf');
  assert.equal(
    harness.context.getBillingDocumentMimeType({ fileName: 'invoice.png' }),
    'image/png'
  );
  assert.equal(
    harness.context.normalizeBillingDocumentRelativePath('', 'invoice.pdf', 'electric'),
    'electric-billing-documents/invoice.pdf'
  );
  assert.deepEqual(
    toPlain(
      harness.context.getBillingDocumentRelativePathCandidates(
        { fileName: 'invoice.pdf' },
        'electric'
      )
    ),
    ['electric-billing-documents/invoice.pdf', 'billing-documents/invoice.pdf']
  );
});

test('billing document normalization keeps scoped month records addressable by scope', () => {
  const harness = createBillingDocumentContext({
    resourceType: 'gas',
    currentScopeKey: 'gas_lpg',
    supportsScopedBilling: true,
    initialBillingDocuments: {
      '2026-04': {
        monthValue: '2026-04',
        scopes: {
          default: {
            fileName: 'default.pdf',
            relativePath: 'gas-billing-documents/default.pdf',
            mimeType: 'application/pdf',
          },
          gas_lpg: {
            fileName: 'lpg.pdf',
            relativePath: 'gas-billing-documents/lpg.pdf',
            mimeType: 'application/pdf',
          },
        },
      },
    },
  });

  const normalized = harness.context.normalizeBillingDocuments(
    harness.context.state.store.billingDocuments,
    'gas'
  );
  const scopedMonth = normalized['2026-04'];

  assert.ok(scopedMonth?.scopes);
  assert.equal(
    harness.context.getBillingDocumentForMonth('2026-04', 'gas_lpg')?.fileName,
    '2026-04-gas-gas_lpg.pdf'
  );
  assert.equal(scopedMonth.scopes.default.fileName, '2026-04-gas.pdf');
});

test('billing directory persistence restores accepted child directories from stored handles', async () => {
  const harness = createBillingDirectoryPersistenceContext();
  const billingDirectoryHandle = {
    name: 'electric-billing-documents',
    async requestPermission() {
      return 'granted';
    },
  };
  const persistedHandle = {
    name: 'downloads',
    async getDirectoryHandle(directoryName) {
      if (directoryName === 'electric-billing-documents') {
        return billingDirectoryHandle;
      }
      throw Object.assign(new Error('missing_directory'), { name: 'NotFoundError' });
    },
  };
  let cleared = 0;

  harness.context.loadPersistedBillingDocumentDirectoryHandle = () =>
    Promise.resolve(persistedHandle);
  harness.context.clearPersistedBillingDocumentDirectoryHandle = () => {
    cleared += 1;
    return Promise.resolve(true);
  };

  const restored = await harness.context.restorePersistedBillingDocumentDirectoryHandle();

  assert.equal(restored, billingDirectoryHandle);
  assert.equal(
    harness.context.localFilePersistenceState.billingDocumentDirectoryHandle,
    billingDirectoryHandle
  );
  assert.equal(cleared, 0);
});

test('billing directory persistence alerts when the selected folder is outside billing storage', async () => {
  const harness = createBillingDirectoryPersistenceContext({
    resourceType: 'gas',
    showDirectoryPicker: async () => ({
      name: 'downloads',
      async getDirectoryHandle() {
        throw Object.assign(new Error('missing_directory'), { name: 'NotFoundError' });
      },
    }),
  });
  let persisted = 0;

  harness.context.persistBillingDocumentDirectoryHandle = () => {
    persisted += 1;
    return Promise.resolve(true);
  };

  const selected = await harness.context.promptBillingDocumentDirectoryHandle();

  assert.equal(selected, null);
  assert.deepEqual(harness.alerts, ['gas-billing-documents 폴더를 선택해 주세요.']);
  assert.equal(persisted, 0);
});

test('billing directory persistence deletes deduplicated candidate file names from the restored folder', async () => {
  const harness = createBillingDirectoryPersistenceContext();
  const removedFileNames = [];

  harness.context.restorePersistedBillingDocumentDirectoryHandle = () =>
    Promise.resolve({
      async removeEntry(fileName) {
        removedFileNames.push(fileName);
      },
    });

  const deleted = await harness.context.deleteBillingDocumentFromLocalDirectory({
    fileName: 'invoice.pdf',
    relativePath: 'billing-documents/invoice.pdf',
  });

  assert.equal(deleted, true);
  assert.deepEqual(removedFileNames, ['invoice.pdf']);
});

test('billing document shared-store upload writes a scoped month record once', async () => {
  const harness = createBillingDocumentContext({
    resourceType: 'gas',
    currentScopeKey: 'gas_lpg',
    supportsScopedBilling: true,
    initialBillingDocuments: {
      '2026-03': {
        fileName: '2026-03-gas.pdf',
        relativePath: 'gas-billing-documents/2026-03-gas.pdf',
        mimeType: 'application/pdf',
      },
    },
  });

  const document = await harness.context.uploadBillingDocumentViaSharedStore(
    {
      name: 'source.pdf',
      type: 'application/pdf',
    },
    '2026-04',
    'QUJD',
    'gas_lpg'
  );

  assert.equal(document.fileName, '2026-04-gas-gas_lpg.pdf');
  assert.equal(document.relativePath, 'gas-billing-documents/2026-04-gas-gas_lpg.pdf');
  assert.equal(harness.sharedStorePayloads.length, 1);
  assert.equal(
    harness.sharedStorePayloads[0].billingDocuments['2026-04'].scopes.gas_lpg.fileName,
    '2026-04-gas-gas_lpg.pdf'
  );
});

test('billing document upload rejects non-pdf files before persistence work starts', async () => {
  const harness = createBillingDocumentContext();

  await assert.rejects(
    harness.context.uploadBillingDocument(
      {
        name: 'invoice.txt',
        type: 'text/plain',
      },
      '2026-04'
    ),
    /billing_document_pdf_only/
  );
});

test('billing document upload falls back to local store when shared persistence is disabled', async () => {
  const harness = createBillingDocumentContext();
  harness.context.readFileAsBase64 = () => Promise.resolve('QUJD');

  const document = await harness.context.uploadBillingDocument(
    {
      name: 'invoice.pdf',
      type: 'application/pdf',
    },
    '2026-04'
  );

  assert.equal(document.fileName, '2026-04-electric.pdf');
  assert.equal(document.relativePath, 'electric-billing-documents/2026-04-electric.pdf');
  assert.equal(document.base64Data, 'QUJD');
  assert.equal(document.savedToLocalDirectory, false);
  assert.deepEqual(harness.fetchCalls, []);
});

test('billing document upload posts to the server when shared persistence is enabled', async () => {
  const harness = createBillingDocumentContext({
    supportsSharedServerPersistence: true,
    fetchResponse: createFetchResponse(200, {
      ok: true,
      document: {
        fileName: 'server.pdf',
        relativePath: 'electric-billing-documents/server.pdf',
        mimeType: 'application/pdf',
        documentId: 'doc-1',
        downloadUrl: 'https://files.local/server.pdf',
      },
    }),
  });
  harness.context.readFileAsBase64 = () => Promise.resolve('QUJD');

  const document = await harness.context.uploadBillingDocument(
    {
      name: 'invoice.pdf',
      type: 'application/pdf',
    },
    '2026-04'
  );

  assert.equal(document.documentId, 'doc-1');
  assert.equal(harness.fetchCalls.length, 1);
  assert.equal(harness.fetchCalls[0].url, '/api/metering/billing-documents');
  assert.deepEqual(JSON.parse(harness.fetchCalls[0].init.body), {
    monthValue: '2026-04',
    resourceType: 'electric',
    scopeKey: 'default',
    fileName: 'invoice.pdf',
    mimeType: 'application/pdf',
    base64Data: 'QUJD',
  });
});
