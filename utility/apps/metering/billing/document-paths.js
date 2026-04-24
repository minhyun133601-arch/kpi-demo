function getBillingDocumentExtension(fileName, mimeType) {
  const normalizedExtension = String(fileName || "")
    .trim()
    .match(/\.[a-z0-9]{1,8}$/i)?.[0]
    ?.toLowerCase();
  if (normalizedExtension) {
    return normalizedExtension;
  }

  const normalizedMimeType = normalizeText(mimeType).toLowerCase();
  const mimeTypeExtensions = {
    "application/pdf": ".pdf",
    "image/bmp": ".bmp",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/tif": ".tif",
    "image/tiff": ".tif",
    "image/webp": ".webp",
  };

  return mimeTypeExtensions[normalizedMimeType] || ".pdf";
}

function getBillingDocumentMimeTypeFromFileName(fileName) {
  const extension = String(fileName || "")
    .trim()
    .match(/\.[a-z0-9]{1,8}$/i)?.[0]
    ?.toLowerCase();
  const extensionMimeTypes = {
    ".bmp": "image/bmp",
    ".gif": "image/gif",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp",
  };
  return extension ? extensionMimeTypes[extension] || "" : "";
}

function getBillingDocumentMimeType(billingDocument) {
  return (
    normalizeText(billingDocument?.mimeType) ||
    getBillingDocumentMimeTypeFromFileName(billingDocument?.fileName) ||
    "application/pdf"
  );
}

function normalizeRelativeFilePath(relativePath) {
  return normalizeText(relativePath)
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("/");
}

function getBillingDocumentFileNameFromPath(relativePath) {
  const normalizedPath = normalizeRelativeFilePath(relativePath);
  if (!normalizedPath) {
    return "";
  }

  const rawFileName = normalizedPath.split("/").pop() || "";
  try {
    return decodeURIComponent(rawFileName);
  } catch (error) {
    void error;
    return rawFileName;
  }
}

function buildBillingDocumentRelativePath(fileName, resourceType = getCurrentResourceType()) {
  return `${getBillingDocumentDirectoryName(resourceType)}/${fileName}`;
}

function normalizeBillingDocumentRelativePath(
  relativePath,
  fileName,
  resourceType = getCurrentResourceType()
) {
  const normalizedPath = normalizeRelativeFilePath(relativePath);
  if (normalizedPath) {
    return normalizedPath;
  }

  const normalizedFileName = normalizeText(fileName) || getBillingDocumentFileNameFromPath(relativePath);
  if (!normalizedFileName) {
    return "";
  }

  return buildBillingDocumentRelativePath(normalizedFileName, resourceType);
}

function getBillingDocumentRelativePathCandidates(
  billingDocument,
  resourceType = getCurrentResourceType()
) {
  const fileName =
    normalizeText(billingDocument?.fileName) ||
    getBillingDocumentFileNameFromPath(billingDocument?.relativePath);
  const candidates = [];
  const normalizedPath = normalizeRelativeFilePath(billingDocument?.relativePath);
  if (normalizedPath) {
    candidates.push(normalizedPath);
  }

  if (fileName) {
    getAcceptedBillingDocumentDirectoryNames(resourceType).forEach((directoryName) => {
      candidates.push(`${directoryName}/${fileName}`);
    });
  }

  return candidates.filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);
}

function encodeBillingDocumentRelativePath(relativePath) {
  const normalizedPath = normalizeRelativeFilePath(relativePath);
  if (!normalizedPath) {
    return "";
  }

  return normalizedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

if (typeof globalThis.getBillingDocumentResourceLabel !== "function") {
  globalThis.getBillingDocumentResourceLabel = function getBillingDocumentResourceLabel(
    resourceType = getCurrentResourceType()
  ) {
    if (isGasResourceType(resourceType)) {
      return "가스";
    }

    if (isProductionResourceType(resourceType)) {
      return "생산량";
    }

    return "전기";
  };
}

if (typeof globalThis.getBillingDocumentLabel !== "function") {
  globalThis.getBillingDocumentLabel = function getBillingDocumentLabel(
    monthValue = state.currentMonth,
    resourceType = getCurrentResourceType(),
    scopeKey = ""
  ) {
    const monthLabel = formatBillingDocumentMonthLabel(monthValue);
    const resourceLabel = getBillingDocumentResourceLabel(resourceType);
    const normalizedScopeKey = normalizeText(scopeKey);
    const hasScopedElectricLabel =
      normalizedScopeKey &&
      getBillingSettlementScopeDefinitions(resourceType).some(
        (item) => item.key === normalizedScopeKey
      );
    const scopeLabel = hasScopedElectricLabel
      ? getBillingSettlementScopeLabel(normalizedScopeKey, resourceType)
      : "";
    const label = hasScopedElectricLabel
      ? [monthLabel, scopeLabel].filter(Boolean).join(" ")
      : [monthLabel, resourceLabel, scopeLabel].filter(Boolean).join(" ");
    return label || resourceLabel;
  };
}

function buildBillingDocumentFileName(
  monthValue,
  sourceFileName = "",
  mimeType = "",
  resourceType = getCurrentResourceType(),
  scopeKey = ""
) {
  const extension = getBillingDocumentExtension(sourceFileName, mimeType);
  return `${getBillingDocumentLabel(monthValue, resourceType, scopeKey)}${extension}`;
}
