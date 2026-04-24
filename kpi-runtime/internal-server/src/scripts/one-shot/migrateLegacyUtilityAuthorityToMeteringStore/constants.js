import path from 'node:path';

import { config } from '../../../config.js';

export const LEGACY_PORTAL_MODULE_KEY = 'portal_data';

export const TEAM_01_01_KEY = 'team_01_01';
export const WASTE_PLANT_B_TEAM_KEY = 'waste_plantB';
export const WASTE_PLANT_A_TEAM_KEY = 'waste_plantA';

export const GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY = 'gas_plantB';
export const GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY = 'plantA_lng';
export const GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY = 'plantA_lpg';
export const WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY = 'waste_plantB';
export const WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY = 'waste_plantA';

export const BILLING_SCOPE_KEYS = Object.freeze([
  GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
  GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
  GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY,
  WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
  WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY,
  'plantB',
  'plantA',
]);

export const GAS_DIRECT_LEGACY_TEAM_NAME = 'Line Alpha (LNG)';
export const GAS_PLANT_A_LNG_LEGACY_TEAM_NAMES = Object.freeze(['Line Beta (LNG)', 'Line Delta (LNG)']);
export const GAS_PLANT_A_LPG_LEGACY_TEAM_NAME = 'Line Beta (LPG)';
export const ELECTRIC_DIRECT_LEGACY_TEAM_NAME = 'Line Alpha';

export const WASTE_TEAM_CONFIG = Object.freeze({
  'Plant A': Object.freeze({
    teamKey: WASTE_PLANT_A_TEAM_KEY,
    scopeKey: WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY,
    allowedCostKeys: Object.freeze(['water', 'share', 'sludge', 'resin', 'outsourcing']),
  }),
  'Plant B': Object.freeze({
    teamKey: WASTE_PLANT_B_TEAM_KEY,
    scopeKey: WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
    allowedCostKeys: Object.freeze(['water', 'share', 'sludge', 'resin', 'labor']),
  }),
});

export const backupDir = path.join(config.storageRoot, 'migration-backups');
