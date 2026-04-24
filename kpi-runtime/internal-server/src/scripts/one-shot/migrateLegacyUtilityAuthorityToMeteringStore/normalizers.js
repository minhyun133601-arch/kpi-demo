export function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
    overwrite: argv.includes('--overwrite'),
  };
}

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function normalizeMonthValue(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(normalizeText(value));
  return match ? `${match[1]}-${match[2]}` : '';
}

export function parseMonthLabel(label) {
  const match = /^(\d{1,2})월$/.exec(normalizeText(label));
  if (!match) {
    return null;
  }
  const monthNumber = Number(match[1]);
  return Number.isFinite(monthNumber) && monthNumber >= 1 && monthNumber <= 12
    ? monthNumber
    : null;
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numericValue =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return numericValue;
}

export function roundWholeNumber(value) {
  const numericValue = toFiniteNumber(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : null;
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export function formatNumberString(value) {
  const numericValue = roundWholeNumber(value);
  return Number.isFinite(numericValue) ? String(numericValue) : '';
}
