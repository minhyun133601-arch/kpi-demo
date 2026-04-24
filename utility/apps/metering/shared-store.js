function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeApiBase(value) {
  const apiBase = String(value || "/api").trim() || "/api";
  return apiBase.startsWith("/") ? apiBase : `/${apiBase.replace(/^\/+/, "")}`;
}

function normalizeSharedStoreText(value) {
  return String(value ?? "").trim();
}

const existingSharedAppConfig = isPlainObject(window.__SHARED_APP_CONFIG__)
  ? window.__SHARED_APP_CONFIG__
  : isPlainObject(window.__SHARED_APP_CONFIG)
    ? window.__SHARED_APP_CONFIG
    : {};
const isHttpContext = /^(http:|https:)$/.test(window.location.protocol || "");
const hasExplicitEnabled = Object.prototype.hasOwnProperty.call(existingSharedAppConfig, "enabled");

window.__SHARED_APP_CONFIG__ = {
  enabled: hasExplicitEnabled ? existingSharedAppConfig.enabled === true : isHttpContext,
  apiBase: normalizeApiBase(existingSharedAppConfig.apiBase),
};
window.__SHARED_APP_CONFIG = window.__SHARED_APP_CONFIG__;

if (typeof window.__LOCAL_APP_STORE__ === "undefined") {
  window.__LOCAL_APP_STORE__ = null;
}

if (typeof window.__SHARED_APP_STORE_META__ === "undefined") {
  window.__SHARED_APP_STORE_META__ = null;
}

if (typeof window.__PRESET_ELECTRIC_ENTRIES__ === "undefined") {
  window.__PRESET_ELECTRIC_ENTRIES__ = {};
}

if (!window.__SHARED_APP_STORE_PRELOAD__) {
  window.__SHARED_APP_STORE_PRELOAD__ = (async () => {
    const config = window.__SHARED_APP_CONFIG__ || { enabled: false, apiBase: "/api" };
    if (!config.enabled || !isHttpContext || typeof window.fetch !== "function") {
      return null;
    }

    try {
      const response = await window.fetch(
        `${normalizeApiBase(config.apiBase).replace(/\/+$/, "")}/shared-store`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        return null;
      }

      const payload = await response.json().catch(() => null);
      if (!payload?.ok || !isPlainObject(payload.store)) {
        return null;
      }

      window.__LOCAL_APP_STORE__ = payload.store;
      window.__SHARED_APP_STORE_META__ = isPlainObject(payload.meta) ? payload.meta : null;
      return payload.store;
    } catch (error) {
      console.warn("Shared metering store preload skipped.", error);
      return null;
    }
  })();
}

function resolveSharedAppConfig() {
  if (typeof window === "undefined" || !isPlainObject(window.__SHARED_APP_CONFIG__)) {
    return {
      enabled: false,
      apiBase: "/api",
    };
  }

  return {
    enabled: window.__SHARED_APP_CONFIG__.enabled === true,
    apiBase: normalizeApiBase(window.__SHARED_APP_CONFIG__.apiBase),
  };
}

function supportsSharedServerPersistence() {
  if (typeof window === "undefined") {
    return false;
  }

  const sharedAppConfig = resolveSharedAppConfig();
  return Boolean(sharedAppConfig.enabled) && /^(http:|https:)$/.test(window.location.protocol);
}

function shouldUseSharedServerAsAuthority() {
  return supportsSharedServerPersistence();
}

function normalizeSharedStoreMeta(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const version = Number.parseInt(String(value.version ?? ""), 10);
  if (!Number.isInteger(version) || version < 0) {
    return null;
  }

  const recordVersions = isPlainObject(value.recordVersions)
    ? Object.fromEntries(
        Object.entries(value.recordVersions)
          .map(([recordKey, rawVersion]) => {
            const normalizedRecordKey = normalizeSharedStoreText(recordKey);
            const normalizedVersion = Number.parseInt(String(rawVersion ?? ""), 10);
            if (!normalizedRecordKey || !Number.isInteger(normalizedVersion) || normalizedVersion < 0) {
              return null;
            }
            return [normalizedRecordKey, normalizedVersion];
          })
          .filter(Boolean)
      )
    : null;

  return {
    moduleKey: normalizeSharedStoreText(value.moduleKey),
    recordKey: normalizeSharedStoreText(value.recordKey),
    permissionKey: normalizeSharedStoreText(value.permissionKey),
    version,
    updatedAt: normalizeSharedStoreText(value.updatedAt),
    recordVersions,
  };
}

function getPresetSharedStoreMeta() {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeSharedStoreMeta(window.__SHARED_APP_STORE_META__);
}

function rememberSharedStoreMeta(value) {
  const meta = normalizeSharedStoreMeta(value);
  if (typeof window !== "undefined") {
    window.__SHARED_APP_STORE_META__ = meta;
  }
  if (typeof sharedServerPersistenceState !== "undefined" && isPlainObject(sharedServerPersistenceState)) {
    sharedServerPersistenceState.meta = meta;
  }
  return meta;
}

function getSharedStoreEndpoint() {
  return `${resolveSharedAppConfig().apiBase.replace(/\/+$/, "")}/shared-store`;
}

function getBillingDocumentEndpoint() {
  return `${resolveSharedAppConfig().apiBase.replace(/\/+$/, "")}/billing-document`;
}

function getPresetBillingSettlementEntries() {
  if (
    typeof window !== "undefined" &&
    isPlainObject(window.__LOCAL_APP_STORE__) &&
    isPlainObject(window.__LOCAL_APP_STORE__.billingSettlementEntries)
  ) {
    return window.__LOCAL_APP_STORE__.billingSettlementEntries;
  }

  return {};
}

function getPresetLocalStore() {
  if (typeof window === "undefined" || !isPlainObject(window.__LOCAL_APP_STORE__)) {
    return null;
  }

  const presetStore = window.__LOCAL_APP_STORE__;
  const presetBillingSettlementEntries = getPresetBillingSettlementEntries();
  const existingBillingSettlementEntries = isPlainObject(presetStore.billingSettlementEntries)
    ? presetStore.billingSettlementEntries
    : {};

  if (Object.keys(presetBillingSettlementEntries).length > Object.keys(existingBillingSettlementEntries).length) {
    return {
      ...presetStore,
      billingSettlementEntries: presetBillingSettlementEntries,
    };
  }

  return presetStore;
}

function loadStore() {
  try {
    const presetLocalStore = getPresetLocalStore();
    if (isPlainObject(presetLocalStore)) {
      return normalizeStore(presetLocalStore);
    }

    return createDefaultStore();
  } catch (error) {
    return createDefaultStore();
  }
}

function getPresetEquipmentEntries() {
  if (typeof window === "undefined" || !isPlainObject(window.__PRESET_ELECTRIC_ENTRIES__)) {
    return {};
  }

  return normalizeEquipmentEntries(window.__PRESET_ELECTRIC_ENTRIES__);
}

function getPresetGasEntries() {
  if (typeof window === "undefined" || !isPlainObject(window.__PRESET_GAS_ENTRIES__)) {
    return {};
  }

  return normalizeEquipmentEntries(window.__PRESET_GAS_ENTRIES__);
}

function mergePresetEquipmentEntries(entries) {
  return mergeEquipmentEntriesWithPresetLocalStore(entries, getPresetEquipmentEntries());
}
