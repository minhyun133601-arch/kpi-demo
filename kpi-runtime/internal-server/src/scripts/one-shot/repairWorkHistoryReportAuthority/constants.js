import path from 'node:path';

import { config } from '../../../config.js';

export const MODULE_KEY = 'portal_data';
export const WORK_RECORD_KEY = 'work_history_records';
export const AUDIT_RECORD_KEY = 'audit_monthly_report';
export const REPORT_TEAM_KEY = 'team4';
export const REPORT_CATEGORY_GROUP = 'report';
export const WORK_ATTACHMENT_TYPE = 'report';
export const WORK_OWNER_DOMAIN = 'work.history';
export const WORK_FILE_CATEGORY = 'report_pdf';
export const backupDir = path.join(config.storageRoot, 'migration-backups');
