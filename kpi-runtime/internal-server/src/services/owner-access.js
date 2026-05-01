import { listRecentLoginAuditEntries } from '../repositories/audit-log.js';
import { listRecentUserDataChanges } from '../repositories/user-activity.js';
import { listUsers } from '../repositories/users.js';

const DEFAULT_LOGIN_HISTORY_LIMIT = 100;
const MAX_LOGIN_HISTORY_LIMIT = 200;
const USER_RECENT_CHANGE_LIMIT = 3;
const OWNER_ACCESS_USER_ORDER = Object.freeze([
  'jeff',
  'andryu',
  'mike',
  'felix',
  'bogus',
  'shine',
  'danny'
]);
const MODULE_RECORD_LABELS = Object.freeze({
  'portal_data:util_electric_data': '\uC804\uAE30 \uC0AC\uC6A9\uB7C9',
  'portal_data:util_gas_data': '\uAC00\uC2A4 \uC0AC\uC6A9\uB7C9',
  'portal_data:util_wastewater_data': '\uD3D0\uC218 \uC0AC\uC6A9\uB7C9',
  'util_production:daily_state_v1': '\uC77C\uC77C \uC0DD\uC0B0 \uAD8C\uC704\uBCF8',
  'portal_data:audit_lux': '\uC870\uB3C4 \uC810\uAC80',
  'portal_data:audit_regulation': '\uBC95\uC815 \uC810\uAC80',
  'portal_data:work_operator_b': '\uAE40\uBBFC\uADDC \uC791\uC5C5 \uAE30\uB85D',
  'portal_data:work_operator_c': '\uC2E0\uD0DC\uC12D \uC791\uC5C5 \uAE30\uB85D',
  'portal_data:work_operator_d': '\uC548\uC900\uC218 \uC791\uC5C5 \uAE30\uB85D',
  'portal_data:work_operator_e': '\uC2E0\uC815\uB798 \uC791\uC5C5 \uAE30\uB85D',
  'portal_data:work_operator_f': '\uC774\uD6A8\uC11D \uC791\uC5C5 \uAE30\uB85D',
  'portal_data:work_operator_g': '\uAE40\uBBFC\uD604 \uC791\uC5C5 \uAE30\uB85D',
  'portal_data:work_monthly_plan': '\uC6D4\uAC04 \uACC4\uD68D',
  'portal_data:work_history_records': '\uD300 \uC791\uC5C5 \uAE30\uB85D',
  'work_runtime:work_team_calendar_team1_part1': '\uD3001 \uC791\uC5C5 \uCE98\uB9B0\uB354 1',
  'work_runtime:work_team_calendar_team1_part2': '\uD3001 \uC791\uC5C5 \uCE98\uB9B0\uB354 2',
  'work_runtime:work_team_calendar_team2': '\uD3002 \uC791\uC5C5 \uCE98\uB9B0\uB354',
  'work_runtime:work_team_calendar_team3': '\uD3003 \uC791\uC5C5 \uCE98\uB9B0\uB354',
  'util_metering:shared_store_v1': '\uAC80\uCE68 \uD1B5\uD569 \uC800\uC7A5 (\uB808\uAC70\uC2DC)',
  'util_metering:ui_state_v1': '\uAC80\uCE68 \uC571 \uC0C1\uD0DC',
  'util_metering:electric_v1': '\uAC80\uCE68 \uC804\uAE30 \uAD8C\uC704\uBCF8',
  'util_metering:gas_v1': '\uAC80\uCE68 \uAC00\uC2A4 \uAD8C\uC704\uBCF8',
  'util_metering:waste_v1': '\uAC80\uCE68 \uD3D0\uC218 \uAD8C\uC704\uBCF8',
  'util_metering:production_v1': '\uAC80\uCE68 \uC0DD\uC0B0\uB7C9 \uAD8C\uC704\uBCF8'
});

function normalizeLimit(limit) {
  const parsed = Number.parseInt(String(limit || ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_LOGIN_HISTORY_LIMIT;
  }
  return Math.min(parsed, MAX_LOGIN_HISTORY_LIMIT);
}

function normalizeChangeType(changeType) {
  if (String(changeType || '').trim() === 'create') {
    return '\uC0DD\uC131';
  }
  if (String(changeType || '').trim() === 'delete') {
    return '\uC0AD\uC81C';
  }
  return '\uC218\uC815';
}

function resolveModuleRecordLabel(moduleKey, recordKey) {
  const normalizedModuleKey = String(moduleKey || '').trim();
  const normalizedRecordKey = String(recordKey || '').trim();
  if (!normalizedModuleKey && !normalizedRecordKey) {
    return '';
  }

  const mappedLabel = MODULE_RECORD_LABELS[`${normalizedModuleKey}:${normalizedRecordKey}`];
  if (mappedLabel) {
    return mappedLabel;
  }

  if (normalizedRecordKey) {
    return `${normalizedModuleKey || 'record'} / ${normalizedRecordKey}`;
  }
  return normalizedModuleKey;
}

function resolveDocumentLabel(entry) {
  const originalName = String(entry.original_name || '').trim();
  const fileCategory = String(entry.file_category || '').trim();
  const ownerDomain = String(entry.owner_domain || '').trim();

  if (fileCategory === 'billing_document') {
    return originalName
      ? `\uCCAD\uAD6C\uC11C / ${originalName}`
      : '\uCCAD\uAD6C\uC11C';
  }

  if (originalName) {
    return originalName;
  }

  if (fileCategory) {
    return fileCategory;
  }

  return ownerDomain || '-';
}

function mapRecentUserChange(entry) {
  const hasModuleRecord = String(entry.module_key || '').trim() || String(entry.record_key || '').trim();
  return {
    changedAt: entry.changed_at || null,
    changeType: normalizeChangeType(entry.change_type),
    itemLabel: hasModuleRecord
      ? resolveModuleRecordLabel(entry.module_key, entry.record_key)
      : resolveDocumentLabel(entry)
  };
}

function buildRecentUserChangeMap(entries) {
  const changeMap = new Map();
  for (const entry of entries) {
    const userId = String(entry.user_id || '').trim();
    if (!userId) continue;
    const bucket = changeMap.get(userId) || [];
    bucket.push(mapRecentUserChange(entry));
    changeMap.set(userId, bucket);
  }
  return changeMap;
}

function normalizeUserOrderKey(username) {
  return String(username || '').trim().toLowerCase();
}

function compareOwnerAccessUsers(left, right) {
  const leftRoles = Array.isArray(left?.roles) ? left.roles : [];
  const rightRoles = Array.isArray(right?.roles) ? right.roles : [];
  const leftIsOwner = leftRoles.includes('owner');
  const rightIsOwner = rightRoles.includes('owner');

  if (leftIsOwner !== rightIsOwner) {
    return leftIsOwner ? -1 : 1;
  }

  const leftIndex = OWNER_ACCESS_USER_ORDER.indexOf(normalizeUserOrderKey(left?.username));
  const rightIndex = OWNER_ACCESS_USER_ORDER.indexOf(normalizeUserOrderKey(right?.username));
  const leftRank = leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER;
  const rightRank = rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return normalizeUserOrderKey(left?.username).localeCompare(normalizeUserOrderKey(right?.username), 'en');
}

function mapLoginHistoryEntry(entry) {
  return {
    id: entry.id,
    userId: entry.user_id,
    username: String(entry.username || '').trim(),
    displayName: String(entry.display_name || '').trim(),
    roles: Array.isArray(entry.roles) ? entry.roles : [],
    isActive: entry.is_active === true,
    ipAddress: String(entry.ip_address || '').trim(),
    userAgent: String(entry.user_agent || '').trim(),
    loggedInAt: entry.logged_in_at || null,
    lastSeenAt: entry.last_seen_at || null,
    expiresAt: entry.expires_at || null,
    sessionActive: entry.session_active === true
  };
}

function mapUserEntry(user, recentChangeMap) {
  const userId = String(user.id || '').trim();
  return {
    id: user.id,
    username: String(user.username || '').trim(),
    displayName: String(user.display_name || '').trim(),
    roles: Array.isArray(user.roles) ? user.roles : [],
    isActive: user.is_active === true,
    sessionActive: user.session_active === true,
    lastAccessAt: user.last_access_at || null,
    recentChanges: recentChangeMap.get(userId) || [],
    createdAt: user.created_at || null,
    updatedAt: user.updated_at || null
  };
}

export async function getOwnerAccessOverview(options = {}) {
  const loginHistoryLimit = normalizeLimit(options.limit);
  const [loginHistory, users] = await Promise.all([
    listRecentLoginAuditEntries(loginHistoryLimit),
    listUsers()
  ]);
  const recentUserChangeMap = buildRecentUserChangeMap(
    await listRecentUserDataChanges(
      users.map((user) => user.id),
      USER_RECENT_CHANGE_LIMIT
    )
  );
  const orderedUsers = [...users].sort(compareOwnerAccessUsers);

  return {
    loginHistory: loginHistory.map(mapLoginHistoryEntry),
    users: orderedUsers.map((user) => mapUserEntry(user, recentUserChangeMap))
  };
}
