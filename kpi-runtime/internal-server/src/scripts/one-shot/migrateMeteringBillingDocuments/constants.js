import path from 'node:path';

import { config } from '../../../config.js';

export const METERING_SHARED_STORE_PERMISSION_KEY = 'util.metering.app';
export const METERING_BILLING_DOCUMENT_OWNER_DOMAIN = 'metering.billing_document';
export const METERING_BILLING_DOCUMENT_FILE_CATEGORY = 'billing_document';
export const DEFAULT_SCOPE_KEY = 'default';

export const backupDir = path.join(config.storageRoot, 'migration-backups');
export const meteringAppRoot = path.join(
  config.repoRoot,
  'utility',
  'apps',
  'metering'
);
