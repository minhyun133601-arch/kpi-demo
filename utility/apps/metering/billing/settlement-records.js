function isBillingSettlementLeafRecord(rawEntry) {
  if (!isPlainObject(rawEntry)) {
    return false;
  }

  if (
    isPlainObject(rawEntry.scopes) ||
    BILLING_SETTLEMENT_SCOPE_KEYS.some((scopeKey) => isPlainObject(rawEntry[scopeKey]))
  ) {
    return false;
  }

  return Boolean(
    isPlainObject(rawEntry.fields) ||
      normalizeText(rawEntry.monthValue) ||
      normalizeText(rawEntry.updatedAt) ||
      typeof rawEntry.completed === "boolean" ||
      BILLING_SETTLEMENT_FIELD_KEYS.has(Object.keys(rawEntry)[0] || "")
  );
}

function getBillingSettlementScopeRawMap(rawEntry) {
  if (!isPlainObject(rawEntry)) {
    return {};
  }

  const scopeSource = isPlainObject(rawEntry.scopes) ? rawEntry.scopes : rawEntry;
  const scopeMap = {};
  BILLING_SETTLEMENT_SCOPE_KEYS.forEach((scopeKey) => {
    if (isPlainObject(scopeSource[scopeKey])) {
      scopeMap[scopeKey] = scopeSource[scopeKey];
    }
  });

  if (countPlainObjectKeys(scopeMap)) {
    return scopeMap;
  }

  if (isBillingSettlementLeafRecord(rawEntry)) {
    return {
      [DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY]: rawEntry,
    };
  }

  return {};
}

function normalizeBillingSettlementLeafEntry(monthValue, rawEntry, scopeKey = "") {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(rawEntry)) {
    return null;
  }

  const sourceFields = isPlainObject(rawEntry.fields) ? rawEntry.fields : rawEntry;
  const fields = resolveBillingSettlementFields(sourceFields, normalizedMonth, scopeKey);

  if (!Object.keys(fields).length) {
    return null;
  }

  return {
    monthValue: normalizedMonth,
    fields,
    completed: rawEntry.completed === true,
    updatedAt: normalizeText(rawEntry.updatedAt),
  };
}

function buildBillingSettlementMonthRecord(monthValue, scopeEntries) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(scopeEntries)) {
    return null;
  }

  const validScopes = Object.fromEntries(
    Object.entries(scopeEntries).filter(([, entry]) => isPlainObject(entry))
  );
  const scopeKeys = Object.keys(validScopes);
  if (!scopeKeys.length) {
    return null;
  }

  if (scopeKeys.length === 1 && scopeKeys[0] === DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY) {
    return validScopes[scopeKeys[0]];
  }

  const latestUpdatedAt =
    scopeKeys
      .map((scopeKey) => normalizeText(validScopes[scopeKey]?.updatedAt))
      .filter(Boolean)
      .sort()
      .at(-1) || "";

  return {
    monthValue: normalizedMonth,
    scopes: validScopes,
    updatedAt: latestUpdatedAt,
  };
}

function normalizeBillingSettlementEntry(monthValue, rawEntry) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(rawEntry)) {
    return null;
  }

  const scopeEntries = getBillingSettlementScopeRawMap(rawEntry);
  const normalizedScopeEntries = Object.entries(scopeEntries).reduce(
    (scopeNormalized, [scopeKey, scopeEntry]) => {
      const entry = normalizeBillingSettlementLeafEntry(normalizedMonth, scopeEntry, scopeKey);
      if (entry) {
        scopeNormalized[scopeKey] = entry;
      }
      return scopeNormalized;
    },
    {}
  );

  return buildBillingSettlementMonthRecord(normalizedMonth, normalizedScopeEntries);
}

function normalizeBillingSettlementEntries(rawEntries) {
  if (!isPlainObject(rawEntries)) {
    return {};
  }

  return Object.entries(rawEntries).reduce((normalized, [monthValue, rawEntry]) => {
    const entry = normalizeBillingSettlementEntry(monthValue, rawEntry);
    if (entry) {
      normalized[entry.monthValue] = entry;
    }

    return normalized;
  }, {});
}

function getBillingSettlementSourceFields(entry) {
  if (!isPlainObject(entry)) {
    return {};
  }

  return isPlainObject(entry.fields) ? entry.fields : entry;
}

function mergeBillingSettlementFieldValues(presetEntry, currentEntry) {
  const mergedFields = {
    ...getBillingSettlementSourceFields(presetEntry),
  };
  const currentFields = getBillingSettlementSourceFields(currentEntry);

  Object.entries(currentFields).forEach(([fieldKey, fieldValue]) => {
    const normalizedValue = normalizeBillingSettlementInputValue(fieldValue);
    if (!normalizedValue) {
      return;
    }

    mergedFields[fieldKey] = fieldValue;
  });

  return mergedFields;
}

function mergeBillingSettlementEntriesWithPresetLocalStore(currentEntries, presetEntries) {
  const currentMap = isPlainObject(currentEntries)
    ? Object.entries(currentEntries).reduce((normalized, [rawMonthValue, rawEntry]) => {
        const monthValue = normalizeMonthValue(rawMonthValue);
        if (monthValue && isPlainObject(rawEntry)) {
          normalized[monthValue] = rawEntry;
        }
        return normalized;
      }, {})
    : {};
  const presetMap = isPlainObject(presetEntries)
    ? Object.entries(presetEntries).reduce((normalized, [rawMonthValue, rawEntry]) => {
        const monthValue = normalizeMonthValue(rawMonthValue);
        if (monthValue && isPlainObject(rawEntry)) {
          normalized[monthValue] = rawEntry;
        }
        return normalized;
      }, {})
    : {};

  const mergedEntries = {};
  const allMonths = new Set([...Object.keys(presetMap), ...Object.keys(currentMap)]);
  allMonths.forEach((monthValue) => {
    const currentScopeMap = getBillingSettlementScopeRawMap(currentMap[monthValue]);
    const presetScopeMap = getBillingSettlementScopeRawMap(presetMap[monthValue]);
    const nextScopeEntries = {};
    const allScopeKeys = new Set([
      ...Object.keys(presetScopeMap),
      ...Object.keys(currentScopeMap),
    ]);

    allScopeKeys.forEach((scopeKey) => {
      const currentEntry = currentScopeMap[scopeKey];
      const presetEntry = presetScopeMap[scopeKey];

      if (!isPlainObject(currentEntry)) {
        if (isPlainObject(presetEntry)) {
          nextScopeEntries[scopeKey] = presetEntry;
        }
        return;
      }

      if (!isPlainObject(presetEntry)) {
        nextScopeEntries[scopeKey] = currentEntry;
        return;
      }

      const currentUpdatedAt = Date.parse(normalizeText(currentEntry.updatedAt));
      const presetUpdatedAt = Date.parse(normalizeText(presetEntry.updatedAt));
      const shouldPreferCurrentUpdatedAt =
        Number.isFinite(currentUpdatedAt) &&
        (!Number.isFinite(presetUpdatedAt) || currentUpdatedAt >= presetUpdatedAt);

      nextScopeEntries[scopeKey] = {
        ...presetEntry,
        ...currentEntry,
        monthValue:
          normalizeText(currentEntry.monthValue) ||
          normalizeText(presetEntry.monthValue) ||
          monthValue,
        fields: mergeBillingSettlementFieldValues(presetEntry, currentEntry),
        completed:
          typeof currentEntry.completed === "boolean"
            ? currentEntry.completed
            : presetEntry.completed === true,
        updatedAt: shouldPreferCurrentUpdatedAt
          ? normalizeText(currentEntry.updatedAt) || normalizeText(presetEntry.updatedAt)
          : normalizeText(presetEntry.updatedAt) || normalizeText(currentEntry.updatedAt),
      };
    });

    const nextRecord = buildBillingSettlementMonthRecord(monthValue, nextScopeEntries);
    if (nextRecord) {
      mergedEntries[monthValue] = nextRecord;
    }
  });

  return mergedEntries;
}

function getBillingSettlementEntry(
  monthValue = state.currentMonth,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(state.store.billingSettlementEntries)) {
    return null;
  }

  const resolvedScopeKey = normalizeBillingSettlementScope(
    scopeKey,
    getBillingSettlementResourceType(scopeKey, getCurrentResourceType())
  );
  const resolvedResourceType = getBillingSettlementResourceType(
    resolvedScopeKey,
    getCurrentResourceType()
  );
  const entry = normalizeBillingSettlementEntry(
    normalizedMonth,
    state.store.billingSettlementEntries[normalizedMonth] || null
  );
  if (!entry) {
    return resolvedResourceType === RESOURCE_TYPES.WASTE
      ? buildWasteBillingSettlementFallbackEntry(normalizedMonth, resolvedScopeKey)
      : null;
  }

  if (isBillingSettlementLeafRecord(entry)) {
    if (resolvedScopeKey !== DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY) {
      return null;
    }

    return {
      ...entry,
      fields: resolveBillingSettlementFields(
        entry.fields,
        normalizedMonth,
        DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
      ),
    };
  }

  const scopedEntry = isPlainObject(entry.scopes) ? entry.scopes[resolvedScopeKey] || null : null;
  if (!scopedEntry) {
    return resolvedResourceType === RESOURCE_TYPES.WASTE
      ? buildWasteBillingSettlementFallbackEntry(normalizedMonth, resolvedScopeKey)
      : null;
  }

  return {
    ...scopedEntry,
    fields: resolveBillingSettlementFields(scopedEntry.fields, normalizedMonth, resolvedScopeKey),
  };
}

function setBillingSettlementEntryForScope(
  monthValue,
  entry,
  scopeKey = getCurrentBillingSettlementScope()
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(entry)) {
    return;
  }

  const resolvedScopeKey = normalizeBillingSettlementScope(scopeKey);
  const currentScopeMap = getBillingSettlementScopeRawMap(
    state.store.billingSettlementEntries?.[normalizedMonth]
  );
  const nextScopeMap = {
    ...currentScopeMap,
    [resolvedScopeKey]: entry,
  };
  const nextRecord = buildBillingSettlementMonthRecord(normalizedMonth, nextScopeMap);
  if (nextRecord) {
    state.store.billingSettlementEntries[normalizedMonth] = nextRecord;
  }
}

function deleteBillingSettlementEntryForScope(
  monthValue,
  scopeKey = getCurrentBillingSettlementScope()
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(state.store.billingSettlementEntries)) {
    return;
  }

  const resolvedScopeKey = normalizeBillingSettlementScope(scopeKey);
  const currentScopeMap = {
    ...getBillingSettlementScopeRawMap(state.store.billingSettlementEntries[normalizedMonth]),
  };
  delete currentScopeMap[resolvedScopeKey];

  const nextRecord = buildBillingSettlementMonthRecord(normalizedMonth, currentScopeMap);
  if (nextRecord) {
    state.store.billingSettlementEntries[normalizedMonth] = nextRecord;
    return;
  }

  delete state.store.billingSettlementEntries[normalizedMonth];
}

function getBillingSettlementAvailableMonthRangeText() {
  if (!isPlainObject(state.store.billingSettlementEntries)) {
    return "";
  }

  const monthValues = Object.keys(state.store.billingSettlementEntries)
    .map((monthValue) => normalizeMonthValue(monthValue))
    .filter(Boolean)
    .sort();
  if (!monthValues.length) {
    return "";
  }

  const firstMonth = monthValues[0];
  const lastMonth = monthValues[monthValues.length - 1];
  return firstMonth === lastMonth ? firstMonth : `${firstMonth}~${lastMonth}`;
}
