import { closePool } from '../../db/pool.js';
import { initializeFileStorage } from '../../services/files.js';
import { loadMeteringAuthorityStore, saveMeteringAuthorityStore } from '../../services/metering-authority.js';
import { writeBackupSnapshot } from './migrateMeteringBillingDocuments/backup.js';
import { migrateBillingDocuments } from './migrateMeteringBillingDocuments/migrate.js';
import { isPlainObject, parseArgs } from './migrateMeteringBillingDocuments/normalizers.js';

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const authorityState = await loadMeteringAuthorityStore();
  if (!authorityState) {
    throw new Error('metering_shared_store_not_found');
  }

  const payload = isPlainObject(authorityState.store) ? authorityState.store : {};
  const preview = await migrateBillingDocuments(payload, {
    ...options,
    write: false
  });

  if (!options.write) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: 'dry-run',
          keepBase64: options.keepBase64,
          summary: preview.summary,
          backupPath: '',
          nextVersion: authorityState.meta?.version || 0
        },
        null,
        2
      )
    );
    return;
  }

  if (preview.summary.migratableCount < 1) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: 'write',
          keepBase64: options.keepBase64,
          summary: preview.summary,
          backupPath: '',
          nextVersion: authorityState.meta?.version || 0
        },
        null,
        2
      )
    );
    return;
  }

  await initializeFileStorage();
  const backupPath = await writeBackupSnapshot(authorityState.records);
  const result = await migrateBillingDocuments(payload, options);
  let nextState = null;
  if (result.summary.migratedCount > 0) {
    nextState = await saveMeteringAuthorityStore({
      store: result.nextStore,
      updatedByUserId: null,
      expectedRecordVersions: authorityState.meta?.recordVersions,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: options.write ? 'write' : 'dry-run',
        keepBase64: options.keepBase64,
        summary: result.summary,
        backupPath,
        nextVersion: nextState?.meta?.version || authorityState.meta?.version || 0
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}).finally(async () => {
  await closePool().catch(() => {});
});
