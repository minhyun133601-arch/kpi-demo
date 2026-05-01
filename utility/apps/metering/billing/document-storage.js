function requestBillingDocumentFile() {
  return new Promise((resolve) => {
    const input = createDetachedElement("input");
    input.type = "file";
    input.accept = BILLING_DOCUMENT_ACCEPT;
    input.tabIndex = -1;
    input.className = "is-hidden";
    input.setAttribute("aria-hidden", "true");

    let settled = false;

    const cleanup = () => {
      window.removeEventListener("focus", handleWindowFocus);
      input.remove();
    };

    const finish = (file) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      if (file && !isPdfBillingFile(file)) {
        window.alert("PDF 파일만 첨부할 수 있습니다.");
        resolve(null);
        return;
      }
      resolve(file || null);
    };

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        finish(input.files?.[0] || null);
      }, 300);
    };

    input.addEventListener(
      "change",
      () => {
        finish(input.files?.[0] || null);
      },
      { once: true }
    );

    document.body.appendChild(input);
    window.addEventListener("focus", handleWindowFocus, { once: true });
    input.click();
  });
}

function isPdfBillingFile(file) {
  if (!file) return false;
  const name = String(file.name || "").trim();
  const type = String(file.type || "").trim().toLowerCase();
  return /\.pdf$/i.test(name) || type === "application/pdf";
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      if (commaIndex < 0) {
        reject(new Error("invalid_billing_document_result"));
        return;
      }

      resolve(result.slice(commaIndex + 1));
    });

    reader.addEventListener("error", () => {
      reject(reader.error || new Error("billing_document_read_failed"));
    });

    reader.readAsDataURL(file);
  });
}

function uploadBillingDocumentViaSharedStore(
  file,
  monthValue,
  base64Data,
  scopeKey = getCurrentBillingSettlementScope()
) {
  const resourceType = getCurrentResourceType();
  const fileName = buildBillingDocumentFileName(
    monthValue,
    file?.name,
    file?.type,
    resourceType,
    scopeKey
  );
  const relativePath = buildBillingDocumentRelativePath(fileName, resourceType);
  const savedAt = new Date().toISOString();
  const document = {
    monthValue,
    fileName,
    relativePath,
    mimeType: file?.type || "",
    savedAt,
    base64Data,
  };
  const sharedStore = normalizeStore({
    ...state.store,
    billingDocuments: {
      ...state.store.billingDocuments,
      [monthValue]: buildBillingDocumentMonthRecord(
        monthValue,
        {
          ...getBillingDocumentScopeRawMap(state.store.billingDocuments?.[monthValue]),
          [scopeKey]: document,
        },
        resourceType
      ),
    },
  });

  return writeStorePayloadToSharedServer(sharedStore).then(() => document);
}

function uploadBillingDocumentToLocalStore(
  file,
  monthValue,
  base64Data,
  scopeKey = getCurrentBillingSettlementScope()
) {
  const resourceType = getCurrentResourceType();
  const fileName = buildBillingDocumentFileName(
    monthValue,
    file?.name,
    file?.type,
    resourceType,
    scopeKey
  );
  const relativePath = buildBillingDocumentRelativePath(fileName, resourceType);
  const savedAt = new Date().toISOString();
  const fallbackDocument = {
    monthValue,
    fileName,
    relativePath,
    mimeType: file?.type || "",
    savedAt,
    base64Data,
    savedToLocalDirectory: false,
  };

  if (!supportsBillingDocumentDirectoryPersistence()) {
    return Promise.resolve(fallbackDocument);
  }

  return writeBillingDocumentToLocalDirectory(
    file,
    monthValue,
    resourceType,
    scopeKey
  )
    .then((localDirectoryDocument) => {
      if (!localDirectoryDocument) {
        return fallbackDocument;
      }

      return {
        monthValue,
        ...localDirectoryDocument,
        base64Data,
        savedToLocalDirectory: true,
      };
    })
    .catch((error) => {
      console.error("Billing document local directory write failed.", error);
      return fallbackDocument;
    });
}

function uploadBillingDocument(
  file,
  monthValue,
  scopeKey = getCurrentBillingSettlementScope()
) {
  if (!isPdfBillingFile(file)) {
    return Promise.reject(new Error("billing_document_pdf_only"));
  }

  return readFileAsBase64(file).then((base64Data) => {
    const resourceType = getCurrentResourceType();
    if (!supportsSharedServerPersistence()) {
      return uploadBillingDocumentToLocalStore(file, monthValue, base64Data, scopeKey);
    }

    return fetch(getBillingDocumentEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        monthValue,
        resourceType,
        scopeKey,
        fileName: file?.name || "",
        mimeType: file?.type || "",
        base64Data,
      }),
    })
      .then((response) =>
        response.json().catch(() => null).then((payload) => ({ response, payload }))
      )
      .then(({ response, payload }) => {
        if (response.status === 404 || payload?.error === "not_found") {
          throw new Error("billing_document_server_route_missing");
        }

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "billing_document_upload_failed");
        }

        return payload.document || {};
      });
  });
}

async function deleteBillingDocumentFromSharedServer(billingDocument) {
  const documentId = normalizeText(billingDocument?.documentId);
  if (!supportsSharedServerPersistence() || !documentId) {
    return false;
  }

  const sharedAppConfig = resolveSharedAppConfig();
  const response = await window.fetch(
    `${sharedAppConfig.apiBase.replace(/\/+$/, "")}/files/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      cache: "no-store",
      credentials: "same-origin",
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`billing_document_delete_failed:${response.status}`);
  }

  return true;
}

async function deleteBillingDocumentStorage(
  billingDocument,
  resourceType = getCurrentResourceType()
) {
  const documentId = normalizeText(billingDocument?.documentId);
  if (documentId) {
    return deleteBillingDocumentFromSharedServer(billingDocument);
  }

  return deleteBillingDocumentFromLocalDirectory(billingDocument, resourceType);
}
