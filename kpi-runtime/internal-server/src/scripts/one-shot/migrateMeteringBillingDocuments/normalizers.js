import { DEFAULT_SCOPE_KEY } from './constants.js';

export function normalizeText(value) {
  return String(value || '').trim();
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
    keepBase64: argv.includes('--keep-base64'),
  };
}

export function normalizeMonthValue(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(normalizeText(value));
  return match ? `${match[1]}-${match[2]}` : '';
}

export function normalizeScopeKey(value) {
  return normalizeText(value) || DEFAULT_SCOPE_KEY;
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}
