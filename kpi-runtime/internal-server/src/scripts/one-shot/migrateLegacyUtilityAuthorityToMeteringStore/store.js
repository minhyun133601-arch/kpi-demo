import {
  BILLING_SCOPE_KEYS,
} from './constants.js';
import {
  cloneJson,
  formatNumberString,
  isPlainObject,
  normalizeMonthValue,
  normalizeText,
  parseMonthLabel,
  roundWholeNumber,
  toFiniteNumber,
} from './normalizers.js';

export function hasMeaningfulSettlementEntry(entry) {
  if (!isPlainObject(entry)) {
    return false;
  }
  const fields = isPlainObject(entry.fields) ? entry.fields : {};
  return Object.values(fields).some((value) => normalizeText(value) !== '');
}

export function extractScopeMap(rawMonthRecord) {
  if (!isPlainObject(rawMonthRecord)) {
    return {};
  }
  const source = isPlainObject(rawMonthRecord.scopes) ? rawMonthRecord.scopes : rawMonthRecord;
  return Object.fromEntries(
    BILLING_SCOPE_KEYS
      .filter((scopeKey) => isPlainObject(source[scopeKey]))
      .map((scopeKey) => [scopeKey, source[scopeKey]])
  );
}

export function buildScopedMonthRecord(monthValue, scopeMap) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(scopeMap)) {
    return null;
  }
  const validScopes = Object.fromEntries(
    Object.entries(scopeMap).filter(([, entry]) => isPlainObject(entry))
  );
  const scopeKeys = Object.keys(validScopes);
  if (!scopeKeys.length) {
    return null;
  }
  const latestUpdatedAt =
    scopeKeys
      .map((scopeKey) => normalizeText(validScopes[scopeKey]?.updatedAt))
      .filter(Boolean)
      .sort()
      .at(-1) || '';
  return {
    monthValue: normalizedMonth,
    scopes: validScopes,
    updatedAt: latestUpdatedAt,
  };
}

export function ensureDataset(store, resourceType) {
  if (!isPlainObject(store.resourceDatasets)) {
    store.resourceDatasets = {};
  }
  if (!isPlainObject(store.resourceDatasets[resourceType])) {
    store.resourceDatasets[resourceType] = {};
  }
  const dataset = store.resourceDatasets[resourceType];
  if (!Array.isArray(dataset.equipmentItems)) dataset.equipmentItems = [];
  if (!isPlainObject(dataset.equipmentEntries)) dataset.equipmentEntries = {};
  if (!isPlainObject(dataset.teamAssignments)) dataset.teamAssignments = {};
  if (!isPlainObject(dataset.teamMonthlyEntries)) dataset.teamMonthlyEntries = {};
  if (!isPlainObject(dataset.teamMonthlyAmountEntries)) dataset.teamMonthlyAmountEntries = {};
  if (!isPlainObject(dataset.billingDocuments)) dataset.billingDocuments = {};
  if (!isPlainObject(dataset.billingSettlementEntries)) dataset.billingSettlementEntries = {};
  if (!normalizeText(dataset.mode)) {
    dataset.mode = resourceType === 'waste' ? 'team' : 'equipment';
  }
  return dataset;
}

export function ensureSharedStore(rawStore) {
  const store = isPlainObject(rawStore) ? cloneJson(rawStore) : {};
  if (!normalizeText(store.resourceType)) {
    store.resourceType = 'electric';
  }
  ensureDataset(store, 'electric');
  ensureDataset(store, 'gas');
  ensureDataset(store, 'waste');
  ensureDataset(store, 'production');
  return store;
}

export function extractLegacyMonthlyRows(record) {
  const rowsByTeam = new Map();
  const teams = Array.isArray(record?.payload?.teams) ? record.payload.teams : [];
  teams.forEach((team) => {
    const teamName = normalizeText(team?.name);
    if (!teamName) {
      return;
    }
    const monthMap = new Map();
    const years = Array.isArray(team?.years) ? team.years : [];
    years.forEach((year) => {
      const yearValue = Number(normalizeText(year?.label));
      if (!Number.isFinite(yearValue)) {
        return;
      }
      const yearRows = Array.isArray(year?.rows) ? year.rows : [];
      yearRows.forEach((row) => {
        const monthNumber = parseMonthLabel(row?.label);
        if (!monthNumber) {
          return;
        }
        const monthValue = `${yearValue}-${String(monthNumber).padStart(2, '0')}`;
        const usage = roundWholeNumber(row?.usage);
        const cost = roundWholeNumber(row?.cost);
        const costs = isPlainObject(row?.costs)
          ? Object.fromEntries(
              Object.entries(row.costs)
                .map(([key, value]) => [normalizeText(key), roundWholeNumber(value)])
                .filter(([key, value]) => key && Number.isFinite(value))
            )
          : {};
        if (!Number.isFinite(usage) && !Number.isFinite(cost) && !Object.keys(costs).length) {
          return;
        }
        monthMap.set(monthValue, {
          usage,
          cost,
          costs,
        });
      });
    });
    rowsByTeam.set(teamName, monthMap);
  });
  return rowsByTeam;
}

export function assignMonthlyNumericValue(
  monthEntries,
  monthValue,
  teamKey,
  nextValue,
  summary,
  summaryKey,
  overwrite
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  const normalizedTeamKey = normalizeText(teamKey);
  if (!normalizedMonth || !normalizedTeamKey || !Number.isFinite(nextValue)) {
    return false;
  }
  if (!isPlainObject(monthEntries[normalizedMonth])) {
    monthEntries[normalizedMonth] = {};
  }
  const currentValue = toFiniteNumber(monthEntries[normalizedMonth][normalizedTeamKey]);
  if (!overwrite && Number.isFinite(currentValue)) {
    summary[`${summaryKey}Skipped`] += 1;
    return false;
  }
  if (currentValue === nextValue) {
    return false;
  }
  monthEntries[normalizedMonth][normalizedTeamKey] = nextValue;
  summary[`${summaryKey}Written`] += 1;
  return true;
}

export function assignSettlementScopeEntry(
  billingSettlementEntries,
  monthValue,
  scopeKey,
  fields,
  updatedAt,
  summary,
  summaryKey,
  overwrite
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  const normalizedScopeKey = normalizeText(scopeKey);
  if (!normalizedMonth || !normalizedScopeKey || !isPlainObject(fields) || !Object.keys(fields).length) {
    return false;
  }
  const currentMonthRecord = isPlainObject(billingSettlementEntries[normalizedMonth])
    ? billingSettlementEntries[normalizedMonth]
    : {};
  const scopeMap = extractScopeMap(currentMonthRecord);
  const currentScopeEntry = scopeMap[normalizedScopeKey];
  if (!overwrite && hasMeaningfulSettlementEntry(currentScopeEntry)) {
    summary[`${summaryKey}Skipped`] += 1;
    return false;
  }
  const nextFields = Object.fromEntries(
    Object.entries(fields)
      .map(([fieldKey, value]) => [normalizeText(fieldKey), formatNumberString(value)])
      .filter(([fieldKey, value]) => fieldKey && value !== '')
  );
  if (!Object.keys(nextFields).length) {
    return false;
  }
  scopeMap[normalizedScopeKey] = {
    monthValue: normalizedMonth,
    fields: nextFields,
    completed: true,
    updatedAt,
  };
  const nextMonthRecord = buildScopedMonthRecord(normalizedMonth, scopeMap);
  if (!nextMonthRecord) {
    return false;
  }
  billingSettlementEntries[normalizedMonth] = nextMonthRecord;
  summary[`${summaryKey}Written`] += 1;
  return true;
}

export function sumLegacyCosts(legacyTeamMaps, monthValue, teamNames) {
  const values = teamNames
    .map((teamName) => legacyTeamMaps.get(teamName)?.get(monthValue)?.cost ?? null)
    .map((value) => roundWholeNumber(value))
    .filter((value) => Number.isFinite(value));
  if (!values.length) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0);
}

export function writeWasteLegacyFields(costs, configByTeam, fallbackCost) {
  const fields = {};
  configByTeam.allowedCostKeys.forEach((fieldKey) => {
    const numericValue = roundWholeNumber(costs?.[fieldKey]);
    if (Number.isFinite(numericValue)) {
      fields[fieldKey] = numericValue;
    }
  });
  if (!Object.keys(fields).length && Number.isFinite(fallbackCost)) {
    fields.billing_amount = fallbackCost;
  }
  return fields;
}

export function buildSummary() {
  return {
    electricDirectUsageWritten: 0,
    electricDirectUsageSkipped: 0,
    electricDirectAmountWritten: 0,
    electricDirectAmountSkipped: 0,
    gasDirectUsageWritten: 0,
    gasDirectUsageSkipped: 0,
    gasSettlementWritten: 0,
    gasSettlementSkipped: 0,
    wasteUsageWritten: 0,
    wasteUsageSkipped: 0,
    wasteSettlementWritten: 0,
    wasteSettlementSkipped: 0,
  };
}
