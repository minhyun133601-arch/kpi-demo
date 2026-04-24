function isImageBillingDocument(billingDocument) {
  const mimeType = getBillingDocumentMimeType(billingDocument);
  if (mimeType.startsWith("image/")) {
    return true;
  }

  return /\.(bmp|gif|jpe?g|png|tiff?|webp)$/i.test(normalizeText(billingDocument?.fileName));
}

function buildBillingDocumentDataUrl(billingDocument) {
  const base64Data = normalizeText(billingDocument?.base64Data);
  if (!base64Data) {
    return "";
  }

  return `data:${getBillingDocumentMimeType(billingDocument)};base64,${base64Data}`;
}

function resolveBillingDocumentUrl(billingDocument, resourceType = getCurrentResourceType()) {
  if (!billingDocument) {
    return "";
  }

  const previewUrl = normalizeText(billingDocument?.previewUrl);
  const downloadUrl = normalizeText(billingDocument?.downloadUrl);
  const hasServerDocument = Boolean(
    normalizeText(billingDocument?.documentId) || previewUrl || downloadUrl
  );
  const dataUrl = buildBillingDocumentDataUrl(billingDocument);
  if (!hasServerDocument && billingDocument.savedToLocalDirectory === false && dataUrl) {
    return dataUrl;
  }

  if (previewUrl) {
    return previewUrl;
  }

  if (downloadUrl) {
    return downloadUrl;
  }

  const relativeUrl = getBillingDocumentRelativePathCandidates(billingDocument, resourceType)
    .map((relativePath) => encodeBillingDocumentRelativePath(relativePath))
    .find(Boolean);
  if (relativeUrl) {
    return resolveRuntimeAssetUrl(relativeUrl);
  }

  return dataUrl;
}

function resolveBillingDocumentDescriptor(
  billingDocument,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (!billingDocument) {
    return null;
  }

  const fileName =
    normalizeText(billingDocument.fileName) || getBillingDocumentFileNameFromPath(billingDocument.relativePath);
  const url = resolveBillingDocumentUrl(billingDocument, resourceType);
  if (!fileName || !url) {
    return null;
  }

  return {
    monthValue: normalizeMonthValue(monthValue),
    resourceType: normalizeResourceType(resourceType),
    fileName,
    folderName: getBillingDocumentDirectoryName(resourceType),
    mimeType: getBillingDocumentMimeType(billingDocument),
    isImage: isImageBillingDocument(billingDocument),
    url,
  };
}

function resolveBillingDocumentDownloadUrl(
  billingDocument,
  resourceType = getCurrentResourceType()
) {
  const dataUrl = buildBillingDocumentDataUrl(billingDocument);
  if (dataUrl) {
    return dataUrl;
  }

  const downloadUrl = normalizeText(billingDocument?.downloadUrl);
  if (downloadUrl) {
    return downloadUrl;
  }

  return resolveBillingDocumentUrl(billingDocument, resourceType);
}

function downloadBillingDocument(
  monthValue,
  billingDocument,
  resourceType = getCurrentResourceType()
) {
  const descriptor = resolveBillingDocumentDescriptor(billingDocument, monthValue, resourceType);
  const downloadUrl = resolveBillingDocumentDownloadUrl(billingDocument, resourceType);
  if (!descriptor?.fileName || !downloadUrl) {
    window.alert("다운할 청구서가 없습니다.");
    return false;
  }

  const link = createDetachedElement("a");
  link.href = downloadUrl;
  link.download = descriptor.fileName;
  link.rel = "noopener noreferrer";
  link.className = "is-hidden";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function openBillingDocumentInNewTab(billingDocument, resourceType = getCurrentResourceType()) {
  const descriptor = resolveBillingDocumentDescriptor(
    billingDocument,
    state.currentMonth,
    resourceType
  );
  if (!descriptor?.url) {
    window.alert("열 청구서가 없습니다.");
    return false;
  }

  const popup = window.open(descriptor.url, "_blank", "noopener,noreferrer");
  if (popup) {
    return true;
  }

  const link = createDetachedElement("a");
  link.href = descriptor.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
  return true;
}

function isBillingDocumentPreviewOpen() {
  return Boolean(
    elements.billingDocumentPreviewModal &&
      !elements.billingDocumentPreviewModal.classList.contains("is-hidden")
  );
}

function closeBillingDocumentPreview(options = {}) {
  const { focusTarget = null } = options;
  if (!elements.billingDocumentPreviewModal) {
    return;
  }

  elements.billingDocumentPreviewModal.classList.add("is-hidden");
  elements.billingDocumentPreviewModal.setAttribute("aria-hidden", "true");
  if (elements.billingDocumentPreviewBody) {
    elements.billingDocumentPreviewBody.innerHTML = "";
  }
  if (elements.billingDocumentPreviewTitle) {
    elements.billingDocumentPreviewTitle.textContent = "청구서 미리보기";
  }
  if (elements.billingDocumentPreviewMeta) {
    elements.billingDocumentPreviewMeta.textContent = "";
  }
  billingDocumentPreviewState.monthValue = "";
  billingDocumentPreviewState.resourceType = "";
  billingDocumentPreviewState.billingDocument = null;

  if (focusTarget?.focus) {
    window.setTimeout(() => focusTarget.focus(), 0);
  }
}

function openBillingDocumentPreview(
  monthValue,
  billingDocument,
  resourceType = getCurrentResourceType(),
  scopeKey = ""
) {
  const descriptor = resolveBillingDocumentDescriptor(billingDocument, monthValue, resourceType);
  if (!descriptor || !elements.billingDocumentPreviewModal || !elements.billingDocumentPreviewBody) {
    window.alert("미리볼 청구서가 없습니다.");
    return;
  }

  closeBillingDocumentPreview();
  billingDocumentPreviewState.monthValue = descriptor.monthValue || "";
  billingDocumentPreviewState.resourceType = descriptor.resourceType || "";
  billingDocumentPreviewState.billingDocument = billingDocument;

  if (elements.billingDocumentPreviewTitle) {
    const monthTitle = descriptor.monthValue ? formatMonthTitle(descriptor.monthValue) : "청구서";
    elements.billingDocumentPreviewTitle.textContent = `${monthTitle} 미리보기`;
  }
  if (elements.billingDocumentPreviewMeta) {
    elements.billingDocumentPreviewMeta.textContent = `${descriptor.folderName} · ${descriptor.fileName}`;
  }

  const previewNode = descriptor.isImage ? createDetachedElement("img") : createDetachedElement("iframe");
  previewNode.className = descriptor.isImage ? "billing-preview-image" : "billing-preview-frame";
  previewNode.src = descriptor.url;
  if (descriptor.isImage) {
    previewNode.alt = descriptor.fileName;
  } else {
    previewNode.title = descriptor.fileName;
  }
  elements.billingDocumentPreviewBody.appendChild(previewNode);
  elements.billingDocumentPreviewModal.classList.remove("is-hidden");
  elements.billingDocumentPreviewModal.setAttribute("aria-hidden", "false");

  if (isGasLpgBillingSettlementScope(scopeKey) && !descriptor.isImage) {
    const bodyEl = elements.billingDocumentPreviewBody;
    const bw = bodyEl.clientWidth;
    const bh = bodyEl.clientHeight;
    if (bw > 0 && bh > 0) {
      previewNode.style.width = bh + "px";
      previewNode.style.height = bw + "px";
      previewNode.style.transform = "rotate(90deg)";
    }
  }
}

function handleBillingDocumentPreviewOpenClick(event) {
  event?.preventDefault();

  if (!billingDocumentPreviewState.billingDocument) {
    return;
  }

  downloadBillingDocument(
    billingDocumentPreviewState.monthValue || state.currentMonth,
    billingDocumentPreviewState.billingDocument,
    billingDocumentPreviewState.resourceType || getCurrentResourceType()
  );
}

function handleBillingDocumentPreviewCloseClick(event) {
  event?.preventDefault();
  closeBillingDocumentPreview({ focusTarget: elements.teamSettlementPreviewBtn });
}

function handleBillingDocumentPreviewModalClick(event) {
  if (!event.target.closest("[data-close-billing-preview]")) {
    return;
  }

  closeBillingDocumentPreview({ focusTarget: elements.teamSettlementPreviewBtn });
}
