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
const billingDocumentPreviewSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/billing/document-preview.js', import.meta.url),
  'utf8'
);

function createClassList(initialNames = []) {
  const names = new Set(initialNames);
  return {
    add(...nextNames) {
      nextNames.forEach((name) => names.add(name));
    },
    remove(...nextNames) {
      nextNames.forEach((name) => names.delete(name));
    },
    contains(name) {
      return names.has(name);
    },
  };
}

function createBillingPreviewContext() {
  const alerts = [];
  const appendedNodes = [];
  let focusedCount = 0;

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
    BILLING_DOCUMENT_ACCEPT: ".pdf",
    state: {
      currentMonth: "2026-04",
    },
    billingDocumentPreviewState: {
      monthValue: "",
      resourceType: "",
      billingDocument: null,
    },
    elements: {
      billingDocumentPreviewModal: {
        classList: createClassList(["is-hidden"]),
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
      },
      billingDocumentPreviewBody: {
        innerHTML: "",
        clientWidth: 320,
        clientHeight: 180,
        children: [],
        appendChild(node) {
          this.children.push(node);
        },
      },
      billingDocumentPreviewTitle: {
        textContent: "",
      },
      billingDocumentPreviewMeta: {
        textContent: "",
      },
      teamSettlementPreviewBtn: {
        focus() {
          focusedCount += 1;
        },
      },
    },
    document: {
      body: {
        appendChild(node) {
          appendedNodes.push(node);
        },
      },
    },
    window: {
      alert(message) {
        alerts.push(String(message));
      },
      open() {
        return null;
      },
      setTimeout(callback) {
        callback();
        return 1;
      },
    },
    normalizeText(value) {
      return String(value ?? "").trim();
    },
    normalizeMonthValue(value) {
      return String(value ?? "").trim();
    },
    normalizeResourceType(value) {
      return String(value ?? "").trim();
    },
    getCurrentResourceType() {
      return "electric";
    },
    getBillingDocumentDirectoryName(resourceType = "electric") {
      return `${resourceType}-billing-documents`;
    },
    getAcceptedBillingDocumentDirectoryNames(resourceType = "electric") {
      return [`${resourceType}-billing-documents`, "billing-documents"];
    },
    resolveRuntimeAssetUrl(relativePath) {
      return `https://runtime.local/${relativePath}`;
    },
    formatMonthTitle(monthValue) {
      return `${monthValue} 청구서`;
    },
    isGasLpgBillingSettlementScope(scopeKey) {
      return scopeKey === "gas_lpg";
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    },
    createDetachedElement(tagName) {
      const element = {
        tagName: String(tagName).toUpperCase(),
        className: "",
        attributes: {},
        style: {},
        removed: false,
        clicked: false,
        remove() {
          this.removed = true;
        },
        click() {
          this.clicked = true;
        },
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
      };
      return element;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(billingDocumentPathsSource, context, {
    filename: "billing/document-paths.js",
  });
  vm.runInContext(billingDocumentsSource, context, {
    filename: "billing/documents.js",
  });
  vm.runInContext(billingDocumentPreviewSource, context, {
    filename: "billing/document-preview.js",
  });

  return {
    context,
    alerts,
    appendedNodes,
    getFocusedCount() {
      return focusedCount;
    },
  };
}

test("billing preview runtime resolves inline data URL for unsynced local documents", () => {
  const { context } = createBillingPreviewContext();

  const url = context.resolveBillingDocumentUrl(
    {
      fileName: "2026-04.pdf",
      mimeType: "application/pdf",
      base64Data: "QUJDRA==",
      savedToLocalDirectory: false,
    },
    "electric"
  );

  assert.equal(url, "data:application/pdf;base64,QUJDRA==");
});

test("billing preview runtime builds descriptor and infers image preview metadata", () => {
  const { context } = createBillingPreviewContext();

  const descriptor = context.resolveBillingDocumentDescriptor(
    {
      fileName: "2026-04.png",
      relativePath: "electric-billing-documents/2026-04.png",
      mimeType: "image/png",
    },
    "2026-04",
    "electric"
  );

  assert.ok(descriptor);
  assert.equal(descriptor.fileName, "2026-04.png");
  assert.equal(descriptor.folderName, "electric-billing-documents");
  assert.equal(descriptor.mimeType, "image/png");
  assert.equal(descriptor.isImage, true);
  assert.equal(
    descriptor.url,
    "https://runtime.local/electric-billing-documents/2026-04.png"
  );
});

test("billing preview runtime opens and closes preview modal with populated metadata", () => {
  const { context, getFocusedCount } = createBillingPreviewContext();

  context.openBillingDocumentPreview(
    "2026-04",
    {
      fileName: "2026-04.pdf",
      relativePath: "electric-billing-documents/2026-04.pdf",
      mimeType: "application/pdf",
    },
    "electric",
    ""
  );

  assert.equal(
    context.elements.billingDocumentPreviewModal.classList.contains("is-hidden"),
    false
  );
  assert.equal(context.elements.billingDocumentPreviewTitle.textContent, "2026-04 청구서 미리보기");
  assert.equal(
    context.elements.billingDocumentPreviewMeta.textContent,
    "electric-billing-documents · 2026-04.pdf"
  );
  assert.equal(context.elements.billingDocumentPreviewBody.children.length, 1);
  assert.equal(context.elements.billingDocumentPreviewBody.children[0].tagName, "IFRAME");

  context.closeBillingDocumentPreview({
    focusTarget: context.elements.teamSettlementPreviewBtn,
  });

  assert.equal(
    context.elements.billingDocumentPreviewModal.classList.contains("is-hidden"),
    true
  );
  assert.equal(context.elements.billingDocumentPreviewTitle.textContent, "청구서 미리보기");
  assert.equal(context.elements.billingDocumentPreviewMeta.textContent, "");
  assert.equal(context.billingDocumentPreviewState.billingDocument, null);
  assert.equal(getFocusedCount(), 1);
});

test("billing preview runtime downloads document through a temporary anchor", () => {
  const { context, appendedNodes, alerts } = createBillingPreviewContext();

  const downloaded = context.downloadBillingDocument(
    "2026-04",
    {
      fileName: "2026-04.pdf",
      downloadUrl: "https://files.local/2026-04.pdf",
      mimeType: "application/pdf",
    },
    "electric"
  );

  assert.equal(downloaded, true);
  assert.equal(alerts.length, 0);
  assert.equal(appendedNodes.length, 1);
  assert.equal(appendedNodes[0].tagName, "A");
  assert.equal(appendedNodes[0].href, "https://files.local/2026-04.pdf");
  assert.equal(appendedNodes[0].download, "2026-04.pdf");
  assert.equal(appendedNodes[0].clicked, true);
  assert.equal(appendedNodes[0].removed, true);
});
