import { isOwnerRole } from '../../services/auth.js';
import {
  CURRENT_PORTAL_DATA_RECORDS,
  PORTAL_DATA_MODULE_KEY,
  WORK_RUNTIME_BOOTSTRAP_RECORDS,
  WORK_RUNTIME_MODULE_KEY,
} from '../portal-data-registry.js';
import { PERMISSION_KEYS, getWorkPermissionKey } from '../permission-registry.js';

function buildCurrentUser(auth) {
  if (!auth?.user) {
    return null;
  }

  return {
    id: auth.user.id,
    username: String(auth.user.username || '').trim(),
    displayName: String(auth.user.display_name || '').trim(),
    roles: Array.isArray(auth.user.roles) ? auth.user.roles : [],
    isOwner: isOwnerRole(auth.user),
  };
}

async function buildWorkRecordConfigs(auth, permissionProbe) {
  const workRecordConfigs = {};

  for (const recordDef of CURRENT_PORTAL_DATA_RECORDS) {
    if (!String(recordDef.recordKey || '').startsWith('work_')) {
      continue;
    }

    workRecordConfigs[recordDef.sourceKey] = {
      moduleKey: PORTAL_DATA_MODULE_KEY,
      recordKey: recordDef.recordKey,
      permissionKey: recordDef.permissionKey,
      readEnabled: await permissionProbe(auth?.user, recordDef.permissionKey, 'read'),
      writeEnabled: await permissionProbe(auth?.user, recordDef.permissionKey, 'write'),
    };
  }

  for (const recordDef of WORK_RUNTIME_BOOTSTRAP_RECORDS) {
    const permissionKey = getWorkPermissionKey(recordDef.recordKey);
    workRecordConfigs[recordDef.sourceKey] = {
      moduleKey: WORK_RUNTIME_MODULE_KEY,
      recordKey: recordDef.recordKey,
      permissionKey,
      readEnabled: await permissionProbe(auth?.user, permissionKey, 'read'),
      writeEnabled: await permissionProbe(auth?.user, permissionKey, 'write'),
    };
  }

  return workRecordConfigs;
}

export async function buildPortalRuntimeConfig(auth, permissionProbe) {
  const workRecordConfigs = await buildWorkRecordConfigs(auth, permissionProbe);

  return {
    source: 'internal_server',
    enabled: true,
    apiBase: '/api',
    auth: {
      currentUser: buildCurrentUser(auth),
    },
    metering: {
      enabled: true,
      apiBase: '/api',
      readEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.UTIL_METERING_APP, 'read'),
      writeEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.UTIL_METERING_APP, 'write'),
    },
    utilProduction: {
      enabled: true,
      apiBase: '/api',
      endpoint: '/api/util-production/daily',
      moduleKey: 'util_production',
      recordKey: 'daily_state_v1',
      permissionKey: PERMISSION_KEYS.UTIL_PRODUCTION_DAILY,
      readEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.UTIL_PRODUCTION_DAILY, 'read'),
      writeEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.UTIL_PRODUCTION_DAILY, 'write'),
      archive: {
        enabled: true,
        apiBase: '/api',
        permissionKey: PERMISSION_KEYS.UTIL_PRODUCTION_ARCHIVE,
        readEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.UTIL_PRODUCTION_ARCHIVE, 'read'),
        writeEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.UTIL_PRODUCTION_ARCHIVE, 'write'),
        ownerDomain: 'util.production.archive',
        fileCategory: 'source_archive',
      },
    },
    audit: {
      enabled: true,
      apiBase: '/api',
      moduleKey: PORTAL_DATA_MODULE_KEY,
      records: {
        audit_lux: {
          recordKey: 'audit_lux',
          permissionKey: PERMISSION_KEYS.AUDIT_LUX,
          readEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.AUDIT_LUX, 'read'),
          writeEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.AUDIT_LUX, 'write'),
        },
        audit_legal_facility: {
          recordKey: 'audit_regulation',
          permissionKey: PERMISSION_KEYS.AUDIT_REGULATION,
          readEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.AUDIT_REGULATION, 'read'),
          writeEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.AUDIT_REGULATION, 'write'),
        },
        audit_regulation: {
          recordKey: 'audit_regulation',
          permissionKey: PERMISSION_KEYS.AUDIT_REGULATION,
          readEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.AUDIT_REGULATION, 'read'),
          writeEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.AUDIT_REGULATION, 'write'),
        },
      },
    },
    work: {
      enabled: true,
      apiBase: '/api',
      moduleKey: WORK_RUNTIME_MODULE_KEY,
      defaultPermissionKey: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
      records: workRecordConfigs,
      permissionKeyByDataKey: Object.fromEntries(
        WORK_RUNTIME_BOOTSTRAP_RECORDS.map((record) => [record.recordKey, getWorkPermissionKey(record.recordKey)])
      ),
      readEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.WORK_TEAM_CALENDAR, 'read'),
      writeEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.WORK_TEAM_CALENDAR, 'write'),
      assets: {
        permissionKey: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
        readEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.WORK_TEAM_CALENDAR, 'read'),
        writeEnabled: await permissionProbe(auth?.user, PERMISSION_KEYS.WORK_TEAM_CALENDAR, 'write'),
        ownerDomain: 'work',
        fileCategory: 'attachment',
      },
    },
  };
}
