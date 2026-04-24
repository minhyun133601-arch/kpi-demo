import { closePool } from '../../db/pool.js';
import { findModuleRecord } from '../../repositories/modules.js';
import {
  loadMeteringAuthorityStore,
  saveMeteringAuthorityStore,
} from '../../services/metering-authority.js';
import { LEGACY_PORTAL_MODULE_KEY } from './migrateLegacyUtilityAuthorityToMeteringStore/constants.js';
import { writeBackupSnapshot } from './migrateLegacyUtilityAuthorityToMeteringStore/backup.js';
import { migrateElectricDirectMonthlyValues, migrateGasAuthorityValues, migrateWasteAuthorityValues } from './migrateLegacyUtilityAuthorityToMeteringStore/migrators.js';
import { parseArgs } from './migrateLegacyUtilityAuthorityToMeteringStore/normalizers.js';
import { buildSummary, ensureSharedStore, extractLegacyMonthlyRows } from './migrateLegacyUtilityAuthorityToMeteringStore/store.js';

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [authorityState, legacyElectricRecord, legacyGasRecord, legacyWasteRecord] = await Promise.all([
    loadMeteringAuthorityStore(),
    findModuleRecord(LEGACY_PORTAL_MODULE_KEY, 'util_electric_data'),
    findModuleRecord(LEGACY_PORTAL_MODULE_KEY, 'util_gas_data'),
    findModuleRecord(LEGACY_PORTAL_MODULE_KEY, 'util_wastewater_data'),
  ]);

  if (!legacyGasRecord && !legacyWasteRecord && !legacyElectricRecord) {
    throw new Error('legacy_util_records_not_found');
  }

  const nextStore = ensureSharedStore(authorityState?.store || {});
  const summary = buildSummary();
  migrateElectricDirectMonthlyValues(nextStore, extractLegacyMonthlyRows(legacyElectricRecord), summary, options);
  migrateGasAuthorityValues(nextStore, extractLegacyMonthlyRows(legacyGasRecord), summary, options);
  migrateWasteAuthorityValues(nextStore, extractLegacyMonthlyRows(legacyWasteRecord), summary, options);

  const hasChanges = Object.entries(summary).some(([key, value]) => key.endsWith('Written') && value > 0);
  const report = {
    write: options.write,
    overwrite: options.overwrite,
    hasChanges,
    authorityVersion: Number(authorityState?.meta?.version || 0),
    summary,
  };

  if (!options.write || !hasChanges) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const backupPath = authorityState?.records?.length ? await writeBackupSnapshot(authorityState.records) : '';
  const savedState = await saveMeteringAuthorityStore({
    store: nextStore,
    updatedByUserId: null,
    expectedRecordVersions: authorityState?.meta?.recordVersions,
  });

  console.log(
    JSON.stringify(
      {
        ...report,
        backupPath,
        savedVersion: savedState?.meta?.version || 0,
      },
      null,
      2
    )
  );
}

try {
  await main();
} finally {
  await closePool();
}
